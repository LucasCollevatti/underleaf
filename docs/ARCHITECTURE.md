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
