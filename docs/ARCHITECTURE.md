# Arquitetura atual

## Topologia executável

```text
compose.yaml
├── app    aplicação web, serviços internos e compilação LaTeX
├── mongo  persistência MongoDB com replica set
└── redis  filas, sessões e colaboração em tempo real
```

O container `app` ainda usa o runtime importado em `server-ce/`, com os
workspaces de aplicação em `services/` e as bibliotecas em `libraries/`. Essa
separação é mantida nesta etapa porque os caminhos são usados pelo Yarn PnP,
pelo build Webpack, pelos scripts de inicialização e por vários serviços.

## Migração incremental

Os diretórios `apps/`, `packages/`, `infra/`, `scripts/` e `tests/` são os
destinos arquiteturais para código novo e para migrações futuras. A primeira
etapa de M2 cria esses limites, centraliza documentação operacional em `docs/`
e mantém os caminhos importados como compatibilidade.

Uma movimentação de domínio só deve acontecer quando incluir, na mesma mudança,
o ajuste de workspaces, imports, Docker, scripts de inicialização e testes do
domínio. Até lá, os READMEs dos diretórios de destino registram o plano sem
criar cópias divergentes do código.

## Fronteira do compilador

A compilação é solicitada por
`services/web/app/src/Features/Compile/UnderleafCompilerGateway.mjs`. O
gateway é uma interface interna: recebe uma solicitação estruturada e devolve
o resultado do CLSI com status, build, logs, erros e artefatos. O
`compose.yaml` não publica uma porta do compilador no host.

O processo CLSI atual permanece dentro da imagem da aplicação para preservar o
snapshot importado. `apps/compiler/` registra o destino de um serviço dedicado;
as rotas do editor e de download não precisarão mudar quando essa migração
acontecer.

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

O dashboard com projetos, Login e Welcome usam o shell. A migração do
dashboard vazio, de Admin/Users/Settings e de Status/erros ocorre nas fases
seguintes; o editor mantém seu layout próprio.

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
