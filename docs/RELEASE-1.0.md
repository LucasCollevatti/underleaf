# Matriz de release do Underleaf 1.0

Esta matriz consolida as capacidades já validadas nos milestones M0–M22 e
aponta a evidência que deve ser repetida antes de publicar uma instalação.

Esta matriz é um checklist de release, não uma declaração de que todos os
testes já passaram. Cada item deve ser executado em uma instalação descartável
ou em um ambiente controlado e registrado com commit, imagem e resultado.

| Capacidade | Evidência principal |
| --- | --- |
| Usuários por username e senha, sem cadastro público | `scripts/create-admin.sh`; as rotas de cadastro e reset são bloqueadas quando `settings.underleaf` está ativo. |
| Papéis, contas desabilitadas e administração | `/admin/users` e `services/web/app/views/underleaf/admin-users.pug`. |
| Projetos e operações de arquivos | `tests/underleaf-project-dashboard-smoke.mjs` e `tests/underleaf-editor-smoke.mjs`. |
| Editor multi-arquivo, upload, imagens e BibTeX | `tests/underleaf-editor-smoke.mjs`. |
| Preview, logs, erros e SyncTeX | `tests/underleaf-editor-smoke.mjs` e `tests/underleaf-compiler-smoke.sh`. |
| Colaboração em tempo real | `services/real-time/test/acceptance/underleaf-collaboration-smoke.mjs`. |
| Engines e pacotes TeX suportados | `tests/underleaf-compiler-smoke.sh`. |
| Compartilhamento owner/editor/viewer | `tests/underleaf-sharing-smoke.mjs`. |
| Histórico, atribuição e restore | `services/real-time/test/acceptance/underleaf-history-smoke.mjs`. |
| Persistência, healthcheck, backup e restore | `tests/underleaf-persistence-smoke.sh`, `make health`, `make backup` e `make restore`. |
| HTTPS e WebSocket | `infra/proxy/Caddyfile`, overlay de produção e `docs/INSTALLATION.md`. |
| Segurança da topologia | `tests/underleaf-security-smoke.sh` e `docs/SECURITY.md`. |

## Gate de publicação

Em uma instalação descartável, execute:

```bash
make config
make build
make up
./scripts/create-admin.sh
make health
tests/underleaf-security-smoke.sh
corepack yarn npm audit --all --recursive --severity moderate --json
```

Depois repita os smoke tests de dashboard, editor, compartilhamento,
colaboração, compilação, histórico, backup e restore documentados nos arquivos
acima. Não publique `.env`, backups ou logs em um repositório público.
