# Arquitetura atual

## Topologia executável

```text
compose.yaml
├── app       aplicação web e serviços internos sem execução LaTeX
├── compiler  CLSI e toolchain TeX em sandbox dedicado
├── mongo     persistência MongoDB com replica set
└── redis     filas, sessões e colaboração em tempo real
```

O container `app` ainda usa o runtime importado em `server-ce/`, com os
workspaces de aplicação em `services/` e as bibliotecas em `libraries/`. Essa
separação é mantida nesta etapa porque os caminhos são usados pelo Yarn PnP,
pelo build Webpack, pelos scripts de inicialização e por vários serviços.

## Fronteira do compilador

A compilação é solicitada por
`services/web/app/src/Features/Compile/UnderleafCompilerGateway.mjs`. O
gateway é uma interface interna: recebe uma solicitação estruturada e devolve
o resultado do CLSI com status, build, logs, erros e artefatos. O
`compose.yaml` não publica uma porta do compilador no host.

O CLSI roda exclusivamente no serviço `compiler`. O `app` não inicia mais o
runit `clsi-overleaf`; solicitações chegam ao compiler pela rede interna
`compiler_net`. O compiler pode alcançar apenas o filestore do app nessa rede
e não participa da rede de MongoDB/Redis. A API do compiler não publica portas
no host.

Os arquivos gerados ficam no volume `underleaf_compiler_work`. O compiler
monta esse volume para escrita e o app o monta somente para leitura, permitindo
que o nginx interno entregue PDFs, logs e auxiliares sem executar ferramentas
TeX.

## Shell compartilhado da aplicação

`services/web/frontend/js/shared/components/underleaf/` contém o
`UnderleafAppShell`, a `UnderleafSidebar` e o `UnderleafBrand`. O shell reutiliza
os estilos e tokens do dashboard Overleaf. A sidebar possui variantes
`authenticated`, `unauthenticated` e `setup`, navegação administrativa conforme
o acesso informado pelo servidor e menu expansível em telas pequenas.

Páginas React novas devem usar `UnderleafAppProviders` e `UnderleafAppShell`.
Páginas que já possuem `SplitTestProvider`, `UserSettingsProvider` e
`DsNavStyleProvider` usam o shell diretamente para manter um único estado.
Cada página fornece seu próprio landmark `main` e destino `#main-content`.
Os slots `navigation`, `footer` e `resizeHandle` preservam os filtros, tags,
lixeira e redimensionamento existentes de Projects; `header` acomoda a navbar
existente em telas pequenas.

O seletor original `ThemeToggle` agora vive em `shared/components/sidebar/` e
continua usando `useSetOverallTheme`, `UserSettingsProvider` e `useThemedPage`.
Os valores permanecem `system`, `light-` e `''` (escuro), sem um segundo estado
de tema. Contas autenticadas usam a preferência do servidor e o endpoint
`/user/settings`. Visitantes persistem a mesma preferência no navegador sem
chamar esse endpoint. Seletores adicionais compartilham o mesmo provider.

Os SVGs públicos `underleaf-mark`, `underleaf-wordmark` e `underleaf-lockup`
possuem variantes claras e escuras. `UnderleafBrand` seleciona a variante
usando o tema ativo, incluindo mudanças no tema do sistema operacional.

Projects, incluindo o estado vazio, Login, Welcome, Settings, Administration e
Users usam o shell. Projects vazio mantém filtros, tags, lixeira e criação ou
importação no dashboard normal, sem abrir uma página de marketing. Status, erros,
manutenção, sessão expirada e confirmação de logout também usam o shell; o
editor mantém seu layout próprio com a marca Underleaf e o wordmark no loading.

`pages/underleaf-system` substitui o HTML inicial apenas após carregar as
traduções. O servidor mantém navegação, mensagens e formulário de logout
utilizáveis quando o JavaScript falha. Erros anteriores aos metadados da página
usam `system-static`, sem consultas ao banco durante a renderização do erro.
Mensagens internas de erros 5xx não são expostas. O logout continua sendo POST
com CSRF; cancelar não encerra a sessão.

`GET /status` com preferência por HTML exige administrador e informa o processo
web e as configurações de acesso do site/editor. Não é um diagnóstico de Mongo,
Redis ou do compilador. Health checks com Accept curinga, JSON ou texto mantêm
as respostas públicas anteriores, inclusive o 503 durante encerramento;
`/status` da API privada também permanece inalterado.

Uma sessão expirada no editor oferece login em outra aba e atualização manual.
A aba não é recarregada automaticamente sobre alterações não salvas. Navbar e
footer no Underleaf não mostram planos, afiliações, marketing ou suporte SaaS.
Os avisos de origem, copyright e licença permanecem preservados. Os favicons
SVG distinguem compilação em andamento, sucesso e erro, com cores claras/escuras;
o manifest abre Projects. Os textos novos têm versões em inglês e português,
com fallback inglês no frontend para outros idiomas.

## Administração de contas

`pages/underleaf-admin` renderiza `/admin` e `/admin/users`. O overview mostra
contas totais, usuários ativos, administradores ativos e projetos ativos. As
páginas hidratam o tema salvo do administrador e enviam somente os campos
públicos necessários; respostas administrativas usam `Cache-Control: no-store`.

Users apresenta uma tabela somente para leitura com busca por username ou
nome de exibição. Criação, edição de identidade/função, reset de senha,
ativação/desativação e exclusão usam modais. As operações POST de senha e
estado são independentes da edição de identidade para não sobrescrever campos
que o administrador não editou. As rotas continuam restritas a administradores
e protegidas por CSRF, e reutilizam `UnderleafUserManager` para validação,
hashing, invalidação de sessões e proteção do último administrador ativo.

Excluir uma conta exige escolher explicitamente a exclusão de todos os seus
projetos e digitar `DELETE`. A opção inicial mantém a conta e os projetos;
cancelar o modal não envia uma solicitação. A contagem de projetos pertencentes
ao usuário inclui projetos inativos, arquivados e na lixeira, correspondendo ao
alcance do `UserDeleter` existente. Para preservar projetos, o administrador
cancela e transfere a propriedade nos diálogos de compartilhamento antes de
excluir a conta. A interface impede desativar/excluir a própria conta ou remover
a própria função de administrador, com a mesma proteção no servidor.

## Inicialização da instalação

`UnderleafInstallationManager` mantém o singleton
`underleafInstallations/installation` no mesmo MongoClient do modelo User.
Todos os escritores de bootstrap (Welcome e CLI) incrementam sua revisão
antes de consultar usuários dentro de uma transação. Conflitos são repetidos
pelo driver; só uma criação inicial pode concluir. Senhas e nomes passam pelas
regras de `UnderleafUserManager`; senha e estado persistente nunca são gravados
em separado. Instalações anteriores com qualquer usuário são adotadas sem
reescrever dados. A inicialização é permanente mesmo se todas as contas forem
removidas; a recuperação exige a CLI com acesso ao servidor.

`UnderleafWelcomeRouter` é montado depois de sessão e CSRF, antes do login
obrigatório. Ele encaminha páginas de uma instalação vazia para `/welcome`.
Arquivos estáticos, healthchecks e APIs internas mantêm seus routers existentes.
Após o commit do administrador, o controller reutiliza `finishLogin`, incluindo
regeneração da sessão, auditoria e rotação do CSRF. Falha nessa etapa não
reverte a instalação e oferece acesso por `/login`.

`pages/underleaf-auth` renderiza Welcome e Login com o mesmo shell. Welcome
avança por Welcome, Administrator e Ready, depois abre `/project`
automaticamente. Login usa username/password e preserva os redirects seguros
do fluxo existente. Preferências de tema de visitantes continuam locais;
contas autenticadas continuam usando a preferência do servidor.

## Conta e colaboração local

Settings mostra username somente para leitura, nome de exibição editável,
troca de senha, sessões e aparência System/Light/Dark. O servidor fornece a
preferência salva através de `UserSettingsHelper`, compartilhada com Projects
e o editor. O endpoint de preferências continua aceitando as opções do editor,
mas no Underleaf rejeita instituição e temas fora dos três valores suportados.
Os metadados de conta da página não incluem email, afiliações, planos ou SSO.

O modal de compartilhamento do Underleaf usa contas existentes, sem convites
por email, CAPTCHA de convite ou limites de plano. A busca autenticada
`GET /underleaf/users/search?username=lu` retorna até 20 usuários ativos por
prefixo normalizado, ordenados por username, com apenas id, username e nome de
exibição. A busca e as concessões possuem rate limiting.

`PUT /project/:Project_id/users/by-username` concede ou atualiza acesso editor
ou viewer. `DELETE /project/:Project_id/users/by-username/:username` remove
acesso, inclusive de contas desativadas. Ambas exigem acesso administrativo ao
projeto e reutilizam os handlers de colaboração, auditoria e websocket. O
proprietário não pode ser rebaixado ou removido por esses caminhos; sua
transferência continua no fluxo explícito existente. Pedidos de acesso são
resolvidos dentro do modal sem notificações por email.

As rotas antigas de convite, aceitação por token de convite, links reutilizáveis
de grupos, subscriptions e afiliações ficam indisponíveis no Underleaf. Links
clássicos de compartilhamento por token continuam opcionais quando a instalação
os permite; conceder acesso por username não depende deles. O código histórico
de SaaS compartilhado e os dados persistentes antigos permanecem no repositório
e no banco; esta mudança não executa migração destrutiva.
