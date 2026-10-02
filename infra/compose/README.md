# Compose

O stack local canônico permanece em [`../../compose.yaml`](../../compose.yaml).
Os arquivos deste diretório são overlays explícitos:

- `compose.development.yaml`: desliga restart automático e ativa logs `debug`;
- `compose.production.yaml`: aplica restart policies, limites de CPU/memória,
  `init`, rotação de logs, cookies seguros e adiciona o Caddy como única porta
  pública, mantendo o compiler como serviço sob demanda.

## Desenvolvimento

```bash
make dev
make health
make logs
make test
make down
```

Para aplicar o overlay de desenvolvimento manualmente:

```bash
docker compose -f compose.yaml \
  -f infra/compose/compose.development.yaml \
  --env-file .env up -d
```

## Produção

Valide primeiro as variáveis obrigatórias e o merge dos arquivos:

```bash
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make config
```

Suba a instalação com:

```bash
docker compose -f compose.yaml \
  -f infra/compose/compose.production.yaml \
  --env-file .env up -d
```

O Caddy publica somente 80 e 443 e encaminha também WebSocket para o app.
MongoDB e Redis não publicam portas; ambos compartilham apenas a rede interna
`underleaf_app_backend` com o app. Os dados ficam em volumes Docker nomeados e
as políticas de restart e limites do production overlay não alteram o produto
em planos comerciais. A revisão de segurança está em
[`../../docs/SECURITY.md`](../../docs/SECURITY.md).
