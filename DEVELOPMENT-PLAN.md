# Underleaf — Plano de desenvolvimento

> Status geral: M0–M14 concluídos; M15 é o próximo milestone
>
> Última revisão: 2026-10-02

Este é o plano operacional do Underleaf. Ele deve ser mantido como Markdown,
com checkboxes atualizados conforme cada entrega for validada.

## Estado atual

- [x] Direção do produto registrada em `AGENTS.md`.
- [x] Repositório Git local inicializado com histórico independente.
- [x] Snapshot do Overleaf Community Edition importado.
- [x] Revisão importada registrada em `docs/ORIGIN.md`.
- [x] Baseline funcional validado e marcado com uma tag permanente.
- [x] Infraestrutura Compose, documentação operacional e identidade Underleaf
  aplicadas.

O repositório contém o snapshot funcional importado e as primeiras camadas de
infraestrutura, documentação, organização, identidade, autenticação e
administração do Underleaf. O dashboard e a estabilização do editor permanecem
para os milestones seguintes.

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
- e-mail obrigatório para usuários;
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
  LaTeX Editor`, com `/underleaf-logo.svg` e `/underleaf-favicon.svg`.

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

**Evidência:** `UserSchema` possui os campos canônicos, índice único sparse e
os papéis/estados permitidos. `UnderleafUserManager` normaliza usernames,
valida duplicidade e grava somente hashes bcrypt. A migration
`20261002100000_underleaf_username_accounts` preenche contas importadas sem
username antes de criar o índice único.

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

- [x] Implementar `underleaf create-admin` ou `scripts/create-admin.sh`.
- [x] Solicitar username, senha e confirmação de senha de forma segura.
- [x] Impedir criação de credenciais padrão.
- [x] Tornar a operação idempotente ou retornar um erro claro quando já houver
  administrador.
- [x] Documentar o fluxo de instalação.

**Critério de aceite:** uma instalação nova consegue criar o primeiro admin
somente por uma operação administrativa explícita.

**Evidência:** `underleaf create-admin` e `scripts/create-admin.sh` executam o
bootstrap dentro do container. O CLI valida que ainda não existe administrador,
solicita username, senha e confirmação, oculta a senha em terminal interativo,
grava apenas o hash e retorna erro claro quando o bootstrap já foi realizado.
O fluxo está documentado em `docs/DEPLOYMENT.md`.

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

**Evidência:** `UnderleafCompilerGateway` é usado pelo endpoint web de
compilação e encapsula a implementação atual do CLSI. A interface e o destino
da migração estão documentados em `apps/compiler/README.md` e
`docs/ARCHITECTURE.md`; o Compose continua publicando somente a aplicação,
MongoDB e Redis.

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

**Evidência:** `server-ce/Dockerfile-compiler` e o serviço Compose com perfil
`compiler` criam uma imagem independente da aplicação. O build valida os três
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

**Evidência:** `compose.yaml` aplica usuário não-root, filesystem read-only,
capabilities removidas, `no-new-privileges`, tmpfs, limites de CPU/memória e
rede interna ao perfil `compiler`, sem socket ou secrets. O
`LocalCommandRunner` usa uma allowlist de ambiente, timeout de parede e limite
de memória/CPU por processo; `tests/underleaf-compiler-sandbox-smoke.sh` e os
testes unitários verificam a configuração e a terminação previsível.

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

- [ ] Validar edições simultâneas no mesmo arquivo.
- [ ] Validar ordenação e sincronização de operações.
- [ ] Validar reconnect e recuperação de conexão.
- [ ] Validar conflitos e comportamento offline/reconnect quando suportado.
- [ ] Validar presença e atualizações de cursor quando disponíveis.
- [ ] Extrair a responsabilidade para `apps/collaboration` quando isso reduzir
  acoplamento.
- [ ] Adicionar testes de concorrência e regressão antes de substituir a lógica
  herdada.

**Critério de aceite:** dois usuários conseguem editar o mesmo documento sem
perder alterações após sincronização ou reconexão.

### M16 — Histórico

**Objetivo:** manter versões recuperáveis dos projetos.

- [ ] Registrar timestamp e usuário responsável por cada revisão.
- [ ] Exibir histórico de documento ou projeto de forma compreensível.
- [ ] Permitir restaurar uma revisão anterior.
- [ ] Definir armazenamento e retenção do histórico.
- [ ] Incluir histórico nos fluxos de backup e restore.

**Critério de aceite:** uma revisão anterior pode ser identificada, restaurada
e validada sem apagar silenciosamente o estado atual.

### M17 — Persistência organizada

**Objetivo:** tornar explícito onde cada dado persistente vive e como ele é
protegido.

- [ ] Mapear banco, Redis, projetos, histórico, cache de compilação e backups.
- [ ] Preferir volumes Docker nomeados em produção.
- [ ] Documentar o layout de dados e suas responsabilidades.
- [ ] Garantir que recriar containers não apague projetos nem histórico.
- [ ] Definir permissões de filesystem e política de retenção.

**Critério de aceite:** os dados importantes sobrevivem ao ciclo de vida dos
containers e o operador sabe como localizá-los e protegê-los.

### M18 — Backup e restore

**Objetivo:** recuperar uma instalação completa, não apenas criar um arquivo.

- [ ] Implementar `make backup` ou comando equivalente.
- [ ] Incluir banco, projetos, histórico e metadata necessária.
- [ ] Implementar `make restore BACKUP=...` ou comando equivalente.
- [ ] Gerar manifest com versão, data e conteúdo do backup.
- [ ] Documentar formato, compatibilidade e limitações.
- [ ] Testar criação de usuário, projeto, edição e compilação antes do backup.
- [ ] Destruir os dados persistentes de teste e restaurar o backup.
- [ ] Verificar usuário, projeto, histórico e nova compilação após o restore.

**Critério de aceite:** um restore real recupera uma instalação utilizável e
permite compilar novamente o projeto restaurado.

### M19 — Observabilidade

**Objetivo:** tornar o estado da instalação visível para administradores.

- [ ] Implementar healthchecks ou endpoints de saúde.
- [ ] Exibir saúde da aplicação, compilador, MongoDB e Redis.
- [ ] Adicionar logs estruturados com timestamp, nível, serviço e request ID.
- [ ] Incluir user ID e project ID somente quando necessário e permitido.
- [ ] Não registrar senha, hash, session token, secrets ou conteúdo de
  documentos.
- [ ] Exibir métricas úteis, como disco, compilações ativas e fila, quando
  possível.

**Critério de aceite:** um administrador consegue distinguir falha de
aplicação, banco, cache e compilador sem expor dados sensíveis.

### M20 — Docker de produção

**Objetivo:** fechar o caminho de operação em desenvolvimento e produção.

- [ ] Manter configuração Compose base na raiz.
- [ ] Adicionar overlays para desenvolvimento e produção em `infra/compose/`.
- [ ] Documentar `make dev`, `make build`, `make test`, `make up`, `make down`,
  `make logs`, `make backup` e `make restore` quando existirem.
- [ ] Adicionar redes internas, volumes persistentes e restart policies.
- [ ] Validar configuração obrigatória na inicialização.
- [ ] Configurar limites de recursos sem transformá-los em planos comerciais.

**Critério de aceite:** os caminhos documentados de desenvolvimento e
produção funcionam sem passos ocultos.

### M21 — Reverse proxy e HTTPS

**Objetivo:** fornecer uma entrada suportada e segura para a instalação.

- [ ] Versionar configuração de Nginx, Caddy ou outra opção escolhida em
  `infra/proxy/`.
- [ ] Expor normalmente apenas as portas web necessárias, como 80 e 443.
- [ ] Manter MongoDB, Redis e compilador em redes internas sem portas públicas.
- [ ] Documentar certificados, headers e encaminhamento de WebSocket.
- [ ] Validar a configuração com a aplicação e colaboração em tempo real.

**Critério de aceite:** o operador consegue publicar o Underleaf atrás de um
proxy documentado sem expor serviços internos.

### M22 — Baseline de segurança

**Objetivo:** revisar a instalação completa antes da versão 1.0.

- [ ] Revisar autenticação, autorização, sessões e CSRF.
- [ ] Revisar hash de senha e rate limiting.
- [ ] Revisar privilégios de containers e permissões de filesystem.
- [ ] Confirmar ausência de Docker socket no compilador.
- [ ] Confirmar que o compilador não recebe secrets da aplicação.
- [ ] Revisar portas expostas e limites de rede.
- [ ] Validar secrets obrigatórios e defaults seguros.
- [ ] Executar scanning de dependências.
- [ ] Revisar confidencialidade dos backups e dos logs.

**Critério de aceite:** os riscos conhecidos estão documentados e não há
credenciais padrão, secrets hardcoded ou exposição desnecessária de serviços.

### M23 — Underleaf 1.0

**Objetivo:** declarar uma primeira versão coerente, self-hosted e mantível.

Para a versão 1.0, validar a matriz completa:

- [ ] usuários por username e senha, administrados sem cadastro público;
- [ ] papéis, contas desabilitadas e redefinição de senha;
- [ ] projetos com criação, rename, delete, archive, duplicate e ZIP;
- [ ] editor multi-arquivo com árvore, upload, imagens e BibTeX;
- [ ] syntax highlighting, autocomplete, preview, logs, erros e SyncTeX;
- [ ] colaboração em tempo real;
- [ ] pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX, Biber e TeX Live;
- [ ] compartilhamento por username com owner, editor e viewer;
- [ ] histórico, atribuição e restore;
- [ ] Docker Compose, volumes persistentes, healthchecks, backup, restore e
  HTTPS;
- [ ] documentação de instalação, desenvolvimento, deploy, backup, segurança
  e origem.

**Critério de aceite:** uma pessoa nova consegue instalar, administrar,
compartilhar, editar, compilar, fazer backup e restaurar uma instalação sem
procedimentos ocultos.

## Backlog pós-1.0

Ideias que não são requisitos da primeira versão:

- templates administráveis e pessoais;
- integração Git por projeto;
- temas, snippets, Vim bindings e command palette;
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

Iniciar o M4: remover funcionalidades SaaS desnecessárias, começando por
mapear cadastro público, recuperação de senha, billing, planos e integrações
cloud antes de apagar qualquer rota ou serviço.
