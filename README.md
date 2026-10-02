# Underleaf

Underleaf é um editor colaborativo e self-hosted para projetos LaTeX. O
objetivo é oferecer uma instalação simples para laboratórios, universidades,
equipes de engenharia e servidores pessoais.

O código inicial foi importado de um snapshot do Overleaf Community Edition e
está sendo adaptado gradualmente para uma base independente. A origem, o SHA
importado e as obrigações legais estão registrados em
[`docs/ORIGIN.md`](docs/ORIGIN.md).

## Início rápido

Requisitos: Docker com Compose v2, pelo menos 8 GB de RAM disponíveis durante
o build e `openssl`.

```bash
cp .env.example .env
sed -i "s/^UNDERLEAF_INVITE_TOKEN_SECRET=.*/UNDERLEAF_INVITE_TOKEN_SECRET=$(openssl rand -base64 32)/" .env
sed -i "s/^UNDERLEAF_SESSION_SECRET=.*/UNDERLEAF_SESSION_SECRET=$(openssl rand -base64 32)/" .env
make config
make build
make up
```

Acesse <http://localhost:8080>. Para parar os containers, use `make down`.
Volumes nomeados preservam projetos, histórico, cache, banco e saídas entre
reinicializações.

## Estrutura atual

- `compose.yaml`: stack local do Underleaf;
- `server-ce/`: runtime importado que ainda está sendo migrado;
- `services/` e `libraries/`: código de aplicação e pacotes do snapshot;
- `infra/`, `apps/`, `packages/`, `scripts/`, `tests/` e `docs/`: destinos da
  reorganização incremental;
- [`DEVELOPMENT-PLAN.md`](DEVELOPMENT-PLAN.md): plano operacional em Markdown.

A compilação ainda ocorre dentro do container da aplicação nesta fase. O
isolamento do compilador será tratado em milestones posteriores.

## Desenvolvimento

Leia [`AGENTS.md`](AGENTS.md) antes de alterar o projeto. Para consultar o
estado do stack:

```bash
docker compose ps
docker compose logs -f app
```

Informações sobre a licença e os avisos de terceiros estão em
[`LICENSE`](LICENSE) e [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
