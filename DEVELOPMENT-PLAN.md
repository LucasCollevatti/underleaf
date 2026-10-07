# Underleaf — Plano de desenvolvimento

> Status geral: baseline M0–M23 registrado; sequência de coesão do produto implementada
>
> Última revisão: 2026-10-05

Este é o plano operacional do Underleaf. Ele deve ser mantido como Markdown,
com checkboxes atualizados conforme cada entrega for validada.

## Fechamento da sequência de coesão do produto

| Commit | Entrega                                                                       |
| ------ | ----------------------------------------------------------------------------- |
| 1      | Shell compartilhado, identidade visual e aparência                            |
| 2      | Welcome, bootstrap atômico persistente e login automático                     |
| 3      | Identidade exclusivamente por username, migração e recuperação administrativa |
| 4      | Settings e compartilhamento direto por username                               |
| 5      | Projects, estado vazio e administração de usuários no mesmo dashboard         |
| 6      | Status, erros, sessão expirada e remoção das superfícies SaaS do produto      |
| 7      | Cobertura das invariantes, fluxo E2E e documentação permanente                |

- [x] Implementar a sequência na branch `refactor/underleaf-product-cohesion`.
- [x] Escrever o fluxo E2E com serviços reais, instalação vazia e credenciais aleatórias.
- [x] Cobrir shell, temas, identidade pública, administração, compartilhamento e telas de sistema.
- [x] Atualizar as regras permanentes em `AGENTS.md` e os procedimentos operacionais.
- [x] Corrigir o status `201` do E2E e serializar a proteção do último administrador, incluindo exclusão e recuperação de limpeza pendente.
- [ ] Executar a cobertura unitária, frontend, acceptance e E2E desta revisão.
- [ ] Executar build e validar reinstalação, reinicialização e upgrade com dados persistentes.

Os testes e o build desta sequência não foram executados nesta sessão, por
instrução do responsável pelo projeto. O commit 7 entrega as fontes de teste
e a documentação; não declara os gates de release aprovados. As evidências
de execução abaixo pertencem ao baseline histórico de 2026-10-02 e não
substituem a validação da branch atual. Os comandos, pré-requisitos e o
isolamento do E2E estão em [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Estado atual

- [x] Direção do produto registrada em `AGENTS.md`.
- [x] Repositório Git local inicializado com histórico independente.
- [x] Snapshot do Overleaf Community Edition importado.
- [x] Revisão importada registrada em `docs/ORIGIN.md`.
- [x] Baseline funcional validado e marcado com uma tag permanente.
- [x] Infraestrutura Compose, documentação operacional e identidade Underleaf
      aplicadas.

O repositório contém o snapshot funcional importado e as camadas operacionais
de infraestrutura, documentação, identidade, autenticação, administração,
histórico, persistência, backup, observabilidade e produção do Underleaf. Os
milestones seguintes continuam a evolução do produto sobre essa base.

## Direção do produto

Underleaf será uma plataforma colaborativa de edição LaTeX, self-hosted e
voltada para ambientes confiáveis, como laboratórios, universidades, equipes de
engenharia e servidores pessoais.

O produto deve preservar o que funciona bem no Overleaf Community Edition,
mas evoluir para uma base menor, mais clara e independente. A arquitetura do
Overleaf é um ponto de partida, não um contrato de compatibilidade.

### Decisões de base

- O código será importado como um snapshot, não como um fork de desenvolvimento.
- A história Git do Underleaf será nova e independente da história do Overleaf.
- O commit original, a data de importação, a licença e as modificações relevantes
  serão documentados em `docs/ORIGIN.md`.
- Avisos de copyright, licenças e atribuições aplicáveis serão preservados.
- O sistema deve permanecer executável depois de cada mudança arquitetural
  significativa.
- Comportamento maduro será preservado antes de qualquer substituição de
  implementação.

### O que o produto não precisa

- cadastro público;
- identidade por e-mail, campos sintéticos `email`/`emails` ou domínio técnico;
- confirmação ou recuperação de senha por e-mail;
- convites por e-mail;
- planos, billing ou subscriptions;
- páginas de marketing ou restrições de SaaS;
- compatibilidade arquitetural permanente com o upstream.

## Regras para cada milestone

Antes de marcar um milestone como concluído:

- registrar decisões arquiteturais relevantes;
- adicionar ou atualizar testes para mudanças de comportamento;
- executar os checks apropriados, como testes, typecheck, lint, build ou Docker;
- atualizar a documentação afetada;
- validar persistência quando a mudança envolver dados;
- verificar segurança quando a mudança envolver autenticação, compilação ou
  infraestrutura.

Evitar combinar em um único commit ou milestone uma mudança de estrutura, uma
reescrita completa e uma mudança de comportamento sem necessidade técnica.

## Milestones

### M0 — Baseline do snapshot do Overleaf

**Objetivo:** importar uma revisão conhecida e provar que o produto original
funciona antes de mudar sua arquitetura.

- [x] Importar um snapshot do Overleaf Community Edition.
- [x] Registrar repositório original, commit SHA, data de importação e licença em
      `docs/ORIGIN.md`.
- [x] Preservar `LICENSE`, headers de copyright e atribuições existentes.
- [x] Confirmar que o build original funciona.
- [x] Confirmar login, criação de projeto e edição de um arquivo `.tex`.
- [x] Confirmar compilação e visualização de um PDF.
- [x] Criar uma tag permanente, neste caso
      `v0.0.0-overleaf-import`.

**Critério de aceite:** uma instalação limpa consegue iniciar, autenticar,
criar um projeto, editar LaTeX, compilar e exibir o PDF.

**Evidência:** o snapshot `e039ad26c5bf5422eb57b89fc7e57c75055e631d` foi
importado do repositório local `overleaf-source`; o build da imagem e o fluxo
login → projeto → edição → compilação retornaram sucesso. O PDF gerado foi
validado como `PDF document, version 1.7`.

### M1 — Baseline Docker do Underleaf

**Objetivo:** executar o snapshot inteiro com infraestrutura versionada no
próprio repositório.

- [x] Criar `compose.yaml` na raiz.
- [x] Definir os serviços necessários para a aplicação, MongoDB e Redis.
- [x] Definir o serviço de compilação conforme a necessidade da revisão
      importada.
- [x] Configurar volumes persistentes para banco, projetos, histórico e saídas
      de compilação.
- [x] Adicionar healthchecks para os serviços essenciais.
- [x] Documentar variáveis em `.env.example`.
- [x] Validar build e subida reproduzível em Linux com Compose.

**Critério de aceite:** o produto sobe de forma reproduzível sem depender de
configuração manual fora do repositório.

**Evidência:** `compose.yaml`, `.env.example`, `Makefile` e os volumes
nomeados versionam a instalação. O app, MongoDB e Redis subiram saudáveis;
MongoDB 7 foi usado no perfil local porque o kernel 6.19 do host impede o
MongoDB 8. O motivo e a compatibilidade estão documentados em
`docs/DEPLOYMENT.md`.

### M2 — Reorganização do repositório

**Objetivo:** aproximar a estrutura do domínio do Underleaf sem mudar
intencionalmente o comportamento.

- [x] Criar a primeira estrutura de destino em `apps/`, `packages/`, `infra/`,
      `scripts/`, `docs/` e `tests/`.
- [x] Documentar responsabilidades e limites dos diretórios sem inventar
      novas abstrações.
- [x] Registrar que imports, builds e runtime permanecem nos caminhos herdados
      até cada migração poder ser feita atomicamente e validada.
- [x] Manter o produto executável durante esta primeira etapa da migração.
- [x] Evitar adicionar funcionalidades de usuário neste milestone.

**Critério de aceite:** a nova estrutura funciona com os mesmos fluxos
validados no M0 e a reorganização é revisável por partes.

**Evidência:** os READMEs de `apps/`, `packages/`, `infra/`, `scripts/` e
`tests/`, junto de `docs/ARCHITECTURE.md`, definem a migração incremental. O
runtime ativo continua nos diretórios importados e passou pelo mesmo smoke test
do M0.

### M3 — Identidade do produto

**Objetivo:** transformar a identidade visível em Underleaf.

- [x] Substituir referências visíveis a Overleaf e ShareLaTeX por Underleaf onde
      elas representarem a identidade do produto.
- [x] Adicionar nome, logo, favicon, títulos e metadata do Underleaf.
- [x] Atualizar README e informações de versão.
- [x] Remover referências visíveis a SaaS, pricing, planos e cloud quando não
      forem necessárias.
- [x] Manter avisos legais e atribuições de código originário.

**Critério de aceite:** a experiência visível apresenta o Underleaf sem apagar
informações de licença ou origem.

**Evidência:** login, favicon, logo, título, manifest, footer e telas de
convite exibem Underleaf. `README.md`, `docs/ABOUT.md` e `docs/ORIGIN.md`
mantêm a origem, a licença AGPL e as atribuições necessárias; identificadores
internos herdados não foram renomeados sem necessidade.

## Evidências de validação M0–M3

- `docker compose -f compose.yaml config --quiet`: configuração válida.
- Build do base image e da aplicação: concluído; os avisos restantes são
  depreciações do runtime herdado, sem falha de build.
- Containers `underleaf-app`, `underleaf-mongo` e `underleaf-redis`: saudáveis,
  sem restart após a inicialização.
- Smoke test funcional: login HTTP `302`, criação de projeto `200`, edição via
  API interna `200`, compilação `200` com status `success` e download do PDF
  `200` com assinatura `%PDF-`.
- Identidade: a página de login retornou o título `Login - Underleaf, Online
LaTeX Editor`, com `/underleaf-logo.png` e `/underleaf-favicon.png`.

### M4 — Remoção de funcionalidades desnecessárias

**Objetivo:** retirar do produto o que não faz parte do cenário self-hosted.

- [x] Remover cadastro público.
- [x] Remover confirmação e recuperação de senha por e-mail.
- [x] Remover billing, subscriptions, plans e pricing.
- [x] Remover fluxos de marketing e integrações cloud não utilizadas.
- [x] Remover OAuth, SAML e outros provedores de identidade que não tenham
      requisito no produto.
- [x] Remover rotas e serviços órfãos depois de verificar suas dependências.

**Critério de aceite:** as funcionalidades removidas não podem ser acessadas
por rotas, jobs, APIs ou componentes ainda ativos.

**Evidência:** o modo Underleaf desliga as features de registro, SaaS, OAuth e
SAML; remove o router de recuperação de senha e bloqueia as rotas de cadastro,
confirmação e preferências de e-mail. `plans` fica vazio e subscriptions
continua desabilitado. O Compose foi reconstruído e a aplicação permaneceu
saudável.

### M5 — Modelo de usuários por username

**Objetivo:** tornar o username o identificador canônico de login e
compartilhamento.

- [x] Definir usuário com `id`, `username`, `passwordHash`, `displayName`,
      `role`, `status`, `createdAt`, `updatedAt` e `lastLoginAt` quando aplicável.
- [x] Garantir username único e normalizado.
- [x] Permitir inicialmente os papéis `admin` e `user`.
- [x] Permitir os estados `active` e `disabled`.
- [x] Não exigir e-mail para criar uma conta.
- [x] Definir migração para usuários de desenvolvimento ou dados importados.
- [x] Nunca armazenar senhas em texto puro.

**Critério de aceite:** duas variações normalizadas do mesmo username não
podem criar contas distintas e a persistência mantém apenas hashes seguros.

**Implementação atual:** `UserSchema` usa `username`, `displayName`,
`passwordHash`, `role` e `status`, sem identidade por email. A migration
`20261005100000_underleaf_username_identity` completa a adaptação do baseline
`20261002100000_underleaf_username_accounts`, remove campos e índices de
identidade por email e estabelece o índice único de username sem `sparse`.
Sessões e respostas públicas usam a identidade canônica e omitem hashes.
A recuperação de senha é uma ação administrativa. A validação desta revisão
permanece pendente conforme o fechamento da sequência acima.

### M6 — Autenticação simples

**Objetivo:** oferecer autenticação direta por username e senha.

- [x] Implementar login, logout e consulta de sessão.
- [x] Remover dependência de `/register`, `/forgot-password` e
      `/confirm-email`.
- [x] Usar bcrypt com o mecanismo seguro já adotado pelo snapshot.
- [x] Configurar cookies `HttpOnly`, `Secure` e `SameSite` adequados.
- [x] Implementar proteção contra CSRF.
- [x] Adicionar rate limiting básico ao login.
- [x] Validar entrada e retornar erros consistentes.

**Critério de aceite:** o fluxo de autenticação funciona sem e-mail e rejeita
credenciais inválidas, contas desabilitadas e requisições sem proteção.

**Evidência:** Passport usa `username` no modo Underleaf, com bcrypt, status
`disabled`, rate limit de IP herdado, cookies de sessão `HttpOnly`/`SameSite`
e o middleware CSRF existente. O formulário não oferece recuperação por email;
redirecionamentos de visitantes não apontam mais para `/register`.

### M7 — Bootstrap do primeiro administrador

**Objetivo:** permitir a criação segura do primeiro administrador sem cadastro
público nem credenciais previsíveis.

- [x] Implementar `/welcome` como instalação normal e manter a CLI como fallback.
- [x] Persistir a inicialização e criar o primeiro administrador em uma transação.
- [x] Autenticar automaticamente e abrir `/project` após a criação.
- [x] Fechar o Welcome em instalações existentes, sem reabertura por exclusão de usuários.
- [x] Solicitar username, senha e confirmação de senha de forma segura.
- [x] Impedir criação de credenciais padrão.
- [x] Tornar a operação idempotente ou retornar um erro claro quando já houver
      administrador.
- [x] Documentar o fluxo de instalação.

**Critério de aceite:** uma instalação vazia abre Welcome e inicializa uma
única vez; uma instalação existente não aceita outro bootstrap web. A CLI
permite recuperação ou automação somente quando não existe administrador.

**Implementação atual:** Welcome e CLI compartilham o lock transacional e o
estado `underleafInstallations/installation`. A CLI recusa a operação se já
houver administrador, inclusive desabilitado, e não reabre o Welcome. Senhas
são fornecidas por entrada oculta ou stdin, e apenas hashes são persistidos.
O fluxo está documentado em `docs/DEPLOYMENT.md`; a execução da nova cobertura
de bootstrap e do fluxo completo permanece pendente.

### M8 — Painel administrativo

**Objetivo:** oferecer a administração mínima necessária para um ambiente
self-hosted.

- [x] Criar `/admin` e `/admin/users`.
- [x] Listar usuários, papéis, status e quantidade de projetos.
- [x] Criar usuários.
- [x] Alterar username e redefinir senha.
- [x] Habilitar e desabilitar usuários.
- [x] Promover e remover privilégios de administrador.
- [x] Excluir usuários com confirmação explícita.
- [x] Definir se os projetos serão transferidos, excluídos ou se a operação será
      cancelada ao excluir um usuário.
- [x] Exibir informações básicas de saúde do sistema quando disponíveis.

**Critério de aceite:** nenhuma ação administrativa destrói projetos sem uma
decisão explícita e todas as rotas exigem autorização de administrador.

**Evidência:** `/admin` exibe contadores de usuários, administradores e
projetos, enquanto `/admin/users` permite criar, editar, redefinir senha,
desabilitar, promover e excluir contas. A exclusão exige `DELETE` e uma escolha
explícita entre cancelar ou excluir os projetos próprios; não há transferência
automática. As rotas usam a autorização de administrador existente, protegem
formulários com CSRF e preservam sempre um administrador ativo.

### M9 — Dashboard de projetos

**Objetivo:** tornar a página inicial autenticada simples e centrada nos
projetos.

- [x] Listar projetos próprios e compartilhados.
- [x] Criar, abrir, renomear, arquivar, duplicar e excluir projetos.
- [x] Importar e exportar projetos em ZIP.
- [x] Adicionar busca por projeto.
- [x] Adicionar filtros úteis, como todos, próprios, compartilhados e arquivados.
- [x] Remover elementos de dashboard voltados para SaaS.

**Critério de aceite:** após o login, o usuário consegue encontrar e gerenciar
seus projetos sem navegar por páginas de produto irrelevantes.

**Evidência:** o dashboard React maduro continua sendo renderizado por
`ProjectListController` e `project/list-react`, com filtros `all`, `owned`,
`shared`, `archived` e `trashed`, busca local, criação, importação, duplicação,
rename, archive, delete e exportação ZIP. O teste
`tests/underleaf-project-dashboard-smoke.mjs` validou login, dashboard, criação,
listagem, abertura, rename, archive, filtro de arquivados, duplicação,
exportação ZIP e limpeza dos projetos. As features SaaS permanecem desligadas.

### M10 — Estabilização do editor

**Objetivo:** preservar e validar a experiência madura de edição antes de
considerar uma reescrita.

- [x] Validar árvore de arquivos, pastas e múltiplos arquivos.
- [x] Validar editor de texto, abas, syntax highlighting e autocomplete.
- [x] Validar upload, imagens e arquivos `.bib`.
- [x] Validar busca e substituição.
- [x] Validar seleção de compilador, logs e erros.
- [x] Validar preview de PDF e SyncTeX.
- [x] Validar colaboração em tempo real junto do M15.
- [x] Adicionar testes de comportamento antes de refatorar módulos complexos.

**Critério de aceite:** os fluxos principais do editor continuam funcionando
com uma base mais organizada e sem reescrita desnecessária.

**Evidência:** `tests/underleaf-editor-smoke.mjs` validou login, abertura do
IDE, metadados do projeto, árvore com `main.tex`, compilação bem-sucedida e
download dos artefatos `.pdf`, `.log` e `.synctex.gz`. A auditoria dos módulos
existentes confirmou árvore recursiva, upload, BibTeX, CodeMirror com Lezer,
autocomplete LaTeX, busca/substituição, preview/SyncTeX e conexão de
colaboração em tempo real. Nenhum módulo complexo do editor foi reescrito;
testes concorrentes aprofundados continuam planejados no M15.

### M11 — Compilador dedicado

**Objetivo:** dar ao compilador uma fronteira clara dentro da arquitetura do
Underleaf.

- [x] Criar o componente `apps/compiler` ou equivalente.
- [x] Definir uma interface interna explícita entre aplicação e compilador.
- [x] Mover gradualmente a responsabilidade de compilação para esse componente.
- [x] Manter logs, artefatos, erros e PDF acessíveis pela aplicação.
- [x] Evitar expor a API do compilador diretamente ao host.

**Critério de aceite:** a aplicação solicita uma compilação por uma interface
documentada e recebe resultado, logs e artefatos de forma previsível.

**Evidência:** `UnderleafCompilerGateway` concentra compile, stop, syncTeX,
word count, limpeza de auxiliares e submissions atrás de um contrato testado. O
CLSI roda no serviço `compiler` do Compose, sem porta publicada; o app depende
do health check desse serviço e não inicia mais CLSI no próprio runtime.
`apps/compiler/README.md`, `docs/ARCHITECTURE.md` e
`tests/underleaf-compiler-boundary-smoke.sh` registram e verificam a fronteira.

### M12 — Ambiente LaTeX completo

**Objetivo:** oferecer um ambiente confiável para documentos reais.

- [x] Criar uma imagem dedicada de compilação.
- [x] Disponibilizar pdfLaTeX, XeLaTeX e LuaLaTeX.
- [x] Disponibilizar latexmk, BibTeX, Biber e makeindex.
- [x] Disponibilizar TeX Live Full ou uma distribuição equivalente documentada.
- [x] Validar pacotes como TikZ, PGFPlots, Circuitikz, Minted, Fontspec,
      BibLaTeX e Chemfig.
- [x] Manter a atualização do ambiente LaTeX separada da atualização da
      aplicação.

**Critério de aceite:** documentos representativos compilam com os engines e
pacotes suportados, com testes reproduzíveis.

**Evidência:** `server-ce/Dockerfile-compiler` e o serviço `compiler` padrão
do Compose criam uma imagem independente da aplicação. O build valida os três
engines, ferramentas de bibliografia/índice e os pacotes representativos; o
fluxo está documentado em `docs/DEPLOYMENT.md` e pode ser repetido por
`scripts/build-compiler.sh`.

### M13 — Isolamento e limites de compilação

**Objetivo:** impedir que a compilação receba privilégios ou recursos da
aplicação sem necessidade.

- [x] Executar o compilador como usuário não-root quando possível.
- [x] Não montar Docker socket no compilador.
- [x] Não disponibilizar secrets da aplicação ao processo LaTeX.
- [x] Usar diretório temporário e filesystem de compilação controlado.
- [x] Manter a rede interna e limitar acessos externos.
- [x] Tornar timeout configurável, por exemplo
      `UNDERLEAF_COMPILE_TIMEOUT=3600`.
- [x] Tornar CPU e memória configuráveis, por exemplo
      `UNDERLEAF_COMPILE_CPUS=4` e `UNDERLEAF_COMPILE_MEMORY=8G`.
- [x] Permitir `UNDERLEAF_MAX_PROJECT_SIZE=0` quando não houver limite
      artificial de produto.
- [x] Documentar que esses limites são salvaguardas de infraestrutura, não
      planos comerciais.

**Critério de aceite:** uma compilação não consegue acessar secrets da
aplicação e é interrompida de forma previsível ao exceder os limites.

**Evidência:** `compose.yaml` aplica usuário `www-data:www-data`, filesystem
read-only, capabilities removidas, `no-new-privileges`, tmpfs, limites de
CPU/memória/PIDs e uma única rede interna, sem socket ou secrets. O único volume
gravável é `/var/lib/underleaf/compiler`; o app o enxerga somente para leitura.
`tests/underleaf-compiler-sandbox-smoke.sh` verifica a configuração e também
nega escrita no root filesystem, presença do Docker socket e resolução de
MongoDB/Redis.

### M14 — Compartilhamento por username

**Objetivo:** compartilhar projetos diretamente com usuários existentes.

- [x] Permitir busca de usuários por username.
- [x] Criar associação de projeto com usuário e permissão.
- [x] Suportar `owner`, `editor` e `viewer`.
- [x] Conceder acesso diretamente quando o usuário existir.
- [x] Retornar `User not found` ou erro equivalente quando não existir.
- [x] Não exigir convite, e-mail, magic link ou confirmação pendente.
- [x] Validar autorização em todas as operações do projeto.

**Critério de aceite:** o proprietário consegue adicionar e remover um usuário
existente por username e as permissões são aplicadas consistentemente.

**Evidência:** `UnderleafSharingRouter` expõe busca autenticada e associação
direta `editor`/`viewer` sem criar convite. A autorização de administração do
projeto é aplicada antes de adicionar, alterar ou remover; o smoke test cobre
busca, `User not found`, editor, viewer e remoção persistente.

### M15 — Colaboração em tempo real

**Objetivo:** preservar a colaboração concorrente sem simplificar o problema
de forma insegura.

- [x] Validar edições simultâneas no mesmo arquivo.
- [x] Validar ordenação e sincronização de operações.
- [x] Validar reconnect e recuperação de conexão.
- [x] Validar conflitos e comportamento offline/reconnect quando suportado.
- [x] Validar presença e atualizações de cursor quando disponíveis.
- [x] Avaliar extração para `apps/collaboration`; a responsabilidade permanece
      em `services/real-time` porque a extração não reduziria o acoplamento atual.
- [x] Adicionar testes de concorrência e regressão antes de substituir a lógica
      herdada.

**Critério de aceite:** dois usuários conseguem editar o mesmo documento sem
perder alterações após sincronização ou reconexão.

**Evidência:** `underleaf-collaboration-smoke.mjs` conecta dois usuários ao
Socket.IO real, confirma presença/cursor, envia duas operações na mesma versão,
desconecta um usuário, aplica outra operação durante a interrupção e valida os
três marcadores e a versão final após a reconexão. A lógica herdada permanece
no serviço real-time; o teste de concorrência foi adicionado antes de qualquer
extração.

### M16 — Histórico

**Objetivo:** manter versões recuperáveis dos projetos.

- [x] Registrar timestamp e usuário responsável por cada revisão.
- [x] Exibir histórico de documento ou projeto de forma compreensível.
- [x] Permitir restaurar uma revisão anterior.
- [x] Definir armazenamento e retenção do histórico.
- [x] Incluir histórico nos fluxos de backup e restore.

**Critério de aceite:** uma revisão anterior pode ser identificada, restaurada
e validada sem apagar silenciosamente o estado atual.

**Evidência:** as rotas autenticadas `/project/:id/updates` e
`/project/:id/latest/history` expõem revisões com intervalo de timestamp e
usuário responsável. A rota `/project/:id/revert-project` restaura uma versão
anterior como uma nova revisão; `underleaf-history-smoke.mjs` valida o fluxo
com uma edição real via Socket.IO, incluindo a preservação da revisão anterior
antes do restore. O arquivo `app-data.tar.gz` produzido pelos scripts de
backup inclui o volume de histórico, e o restore foi validado com esse
conteúdo.

### M17 — Persistência organizada

**Objetivo:** tornar explícito onde cada dado persistente vive e como ele é
protegido.

- [x] Mapear banco, Redis, projetos, histórico, cache de compilação e backups.
- [x] Preferir volumes Docker nomeados em produção.
- [x] Documentar o layout de dados e suas responsabilidades.
- [x] Garantir que recriar containers não apague projetos nem histórico.
- [x] Definir permissões de filesystem e política de retenção.

**Critério de aceite:** os dados importantes sobrevivem ao ciclo de vida dos
containers e o operador sabe como localizá-los e protegê-los.

**Evidência:** `compose.yaml` usa volumes nomeados estáveis para MongoDB,
Redis, dados gerais da aplicação, saídas, histórico, templates e trabalho do
compilador. `docs/PERSISTENCE.md` define a responsabilidade, permissões e
retenção de cada volume; `underleaf-persistence-smoke.sh` recria o container
`app` e valida a preservação do volume de histórico.

### M18 — Backup e restore

**Objetivo:** recuperar uma instalação completa, não apenas criar um arquivo.

- [x] Implementar `make backup` ou comando equivalente.
- [x] Incluir banco, projetos, histórico e metadata necessária.
- [x] Implementar `make restore BACKUP=...` ou comando equivalente.
- [x] Gerar manifest com versão, data e conteúdo do backup.
- [x] Documentar formato, compatibilidade e limitações.
- [x] Testar criação de usuário, projeto, edição e compilação antes do backup.
- [x] Destruir os dados persistentes de teste e restaurar o backup.
- [x] Verificar usuário, projeto, histórico e nova compilação após o restore.

**Critério de aceite:** um restore real recupera uma instalação utilizável e
permite compilar novamente o projeto restaurado.

**Evidência:** `make backup` produz `manifest.json`, hashes, dump MongoDB e
arquivo dos volumes da aplicação; `make restore BACKUP=...` verifica o formato,
para o app, restaura o banco e os dados de projetos/histórico e sobe o serviço
novamente. `docs/BACKUP.md` registra o formato, a limitação do Redis e o
procedimento de round-trip usando os smoke tests de dashboard, editor e
histórico.

### M19 — Observabilidade

**Objetivo:** tornar o estado da instalação visível para administradores.

- [x] Implementar healthchecks ou endpoints de saúde.
- [x] Exibir saúde da aplicação, compilador, MongoDB e Redis.
- [x] Adicionar logs estruturados com timestamp, nível, serviço e request ID.
- [x] Incluir user ID e project ID somente quando necessário e permitido.
- [x] Não registrar senha, hash, session token, secrets ou conteúdo de
      documentos.
- [x] Exibir métricas úteis, como disco, compilações ativas e fila, quando
      possível.

**Critério de aceite:** um administrador consegue distinguir falha de
aplicação, banco, cache e compilador sem expor dados sensíveis.

**Evidência:** `make health` retorna JSON com estado do app, MongoDB, Redis,
project-history, real-time, CLSI e compiler, além de disco disponível e fila de
histórico. O healthcheck do perfil `compiler` valida `pdflatex` e `/tmp`;
`libraries/metrics/http.js` adiciona request IDs aos logs estruturados, sem
alterar os serializers que filtram credenciais e conteúdo de documentos.

### M20 — Docker de produção

**Objetivo:** fechar o caminho de operação em desenvolvimento e produção.

- [x] Manter configuração Compose base na raiz.
- [x] Adicionar overlays para desenvolvimento e produção em `infra/compose/`.
- [x] Documentar `make dev`, `make build`, `make test`, `make up`, `make down`,
      `make logs`, `make backup` e `make restore` quando existirem.
- [x] Adicionar redes internas, volumes persistentes e restart policies.
- [x] Validar configuração obrigatória na inicialização.
- [x] Configurar limites de recursos sem transformá-los em planos comerciais.

**Critério de aceite:** os caminhos documentados de desenvolvimento e
produção funcionam sem passos ocultos.

**Evidência:** `compose.yaml` é a base única; os overlays em
`infra/compose/` separam desenvolvimento e produção. O Makefile expõe os
fluxos operacionais, a configuração falha sem os secrets obrigatórios,
`underleaf_app_backend` isola app, MongoDB e Redis sem portas internas
publicadas, e o production overlay aplica restart, logging e limites de
recursos. A identidade visual usa os assets PNG do Underleaf em
`services/web/public`, incluindo logo, favicon e ícone para dispositivos Apple.

### M21 — Reverse proxy e HTTPS

**Objetivo:** fornecer uma entrada suportada e segura para a instalação.

- [x] Versionar configuração de Nginx, Caddy ou outra opção escolhida em
      `infra/proxy/`.
- [x] Expor normalmente apenas as portas web necessárias, como 80 e 443.
- [x] Manter MongoDB, Redis e compilador em redes internas sem portas públicas.
- [x] Documentar certificados, headers e encaminhamento de WebSocket.
- [x] Validar a configuração com a aplicação e colaboração em tempo real.

**Critério de aceite:** o operador consegue publicar o Underleaf atrás de um
proxy documentado sem expor serviços internos.

**Evidência:** `infra/proxy/Caddyfile` configura HTTPS automático, headers de
segurança, compressão e `reverse_proxy` compatível com WebSocket. O overlay de
produção remove a porta do app e publica apenas 80/443 pelo Caddy, enquanto
MongoDB, Redis e compiler permanecem sem portas públicas. O Caddyfile foi
validado pelo binário Caddy e `tests/underleaf-security-smoke.sh` validou o
merge efetivo do Compose.

### M22 — Baseline de segurança

**Objetivo:** revisar a instalação completa antes da versão 1.0.

- [x] Revisar autenticação, autorização, sessões e CSRF.
- [x] Revisar hash de senha e rate limiting.
- [x] Revisar privilégios de containers e permissões de filesystem.
- [x] Confirmar ausência de Docker socket no compilador.
- [x] Confirmar que o compilador não recebe secrets da aplicação.
- [x] Revisar portas expostas e limites de rede.
- [x] Validar secrets obrigatórios e defaults seguros.
- [x] Executar scanning de dependências.
- [x] Revisar confidencialidade dos backups e dos logs.

**Critério de aceite:** os riscos conhecidos estão documentados e não há
credenciais padrão, secrets hardcoded ou exposição desnecessária de serviços.

**Evidência:** `docs/SECURITY.md` registra autenticação, CSRF, bcrypt,
rate limiting, cookies seguros, topologia, permissões do compiler, backups e
logs. O Compose exige os secrets de sessão e convite, e o audit executado em
2026-10-02 registrou os avisos conhecidos do snapshot para tratamento antes de
uma exposição pública.

### M23 — Underleaf 1.0

**Objetivo:** declarar uma primeira versão coerente, self-hosted e mantível.

Para a versão 1.0, validar a matriz completa:

- [x] usuários por username e senha, administrados sem cadastro público;
- [x] papéis, contas desabilitadas e redefinição de senha;
- [x] projetos com criação, rename, delete, archive, duplicate e ZIP;
- [x] editor multi-arquivo com árvore, upload, imagens e BibTeX;
- [x] syntax highlighting, autocomplete, preview, logs, erros e SyncTeX;
- [x] colaboração em tempo real;
- [x] pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX, Biber e TeX Live;
- [x] compartilhamento por username com owner, editor e viewer;
- [x] histórico, atribuição e restore;
- [x] Docker Compose, volumes persistentes, healthchecks, backup, restore e
      HTTPS;
- [x] documentação de instalação, desenvolvimento, deploy, backup, segurança
      e origem.

**Critério de aceite:** uma pessoa nova consegue instalar, administrar,
compartilhar, editar, compilar, fazer backup e restaurar uma instalação sem
procedimentos ocultos.

**Evidência:** `docs/INSTALLATION.md` descreve instalação local, criação do
primeiro administrador, deploy atrás de Caddy/HTTPS e operação diária. A matriz
`docs/RELEASE-1.0.md` relaciona cada capacidade aos smoke tests existentes e
ao gate de publicação; o audit de dependências permanece explicitamente
registrado em `docs/SECURITY.md`.

## Backlog pós-1.0

Ideias que não são requisitos da primeira versão:

- templates administráveis e pessoais;
- integração Git por projeto;
- snippets, Vim bindings e command palette;
- audit log administrativo;
- métricas mais detalhadas;
- perfis de compilação para agendamento de recursos.

Esses itens só devem entrar no escopo principal depois que a base self-hosted
estiver estável.

## Definição de pronto

Uma entrega não está pronta apenas porque compila. Conforme o tipo de mudança,
ela pode exigir:

- implementação;
- testes de comportamento;
- lint, typecheck e build;
- validação pelo caminho Docker suportado;
- migração e rollback quando houver dados persistentes;
- documentação;
- revisão de segurança;
- verificação manual do fluxo principal.

## Próximo passo recomendado

Quando a execução for autorizada, validar a sequência de coesão em uma
instalação descartável conforme `docs/DEVELOPMENT.md`, incluindo os temas,
bootstrap, identidade e fluxo completo. Validar separadamente o upgrade de
uma cópia dos dados existentes e a persistência após recriação dos containers.
Só atualizar a matriz de release com os resultados efetivamente obtidos.
