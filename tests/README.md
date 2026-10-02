# Tests

Destino para testes de integração do Underleaf. Os testes importados continuam
em seus domínios (`services/*/test` e `libraries/*/test`) para preservar o
runner e as configurações existentes.

O smoke test do dashboard pode ser executado contra uma instalação em execução:

```bash
UNDERLEAF_BASE_URL=http://localhost:18080 \
UNDERLEAF_USERNAME=m7admin \
UNDERLEAF_PASSWORD='sua-senha' \
node tests/underleaf-project-dashboard-smoke.mjs
```

O smoke test do editor valida a página do IDE, a árvore de entidades, a
compilação e os artefatos PDF, log e SyncTeX:

```bash
UNDERLEAF_BASE_URL=http://localhost:18080 \
UNDERLEAF_USERNAME=m7admin \
UNDERLEAF_PASSWORD='sua-senha' \
node tests/underleaf-editor-smoke.mjs
```

O smoke test de compartilhamento valida busca autenticada por username,
permissões editor/viewer, remoção e erros de usuário inexistente:

```bash
UNDERLEAF_BASE_URL=http://localhost:18080 \
UNDERLEAF_USERNAME=m7admin \
UNDERLEAF_PASSWORD='sua-senha' \
UNDERLEAF_TARGET_USERNAME=outro-usuario \
node tests/underleaf-sharing-smoke.mjs
```

O smoke test de colaboração executa dentro do container web porque usa o
`socket.io-client` do serviço real-time. Ele valida edição concorrente,
ordenação, presença, reconexão e recuperação do documento:

```bash
docker exec -w /overleaf/services/real-time \
  -e UNDERLEAF_WEB_URL=http://127.0.0.1:4000 \
  -e UNDERLEAF_REALTIME_URL=http://127.0.0.1:3026 \
  -e UNDERLEAF_USERNAME=m7admin \
  -e UNDERLEAF_PASSWORD='sua-senha' \
  -e UNDERLEAF_TARGET_USERNAME=outro-usuario \
  underleaf-app node test/acceptance/underleaf-collaboration-smoke.mjs
```

O smoke test de histórico também executa dentro do container web. Ele cria
uma revisão, verifica timestamp e usuário responsável, restaura a versão
inicial e confirma que a restauração cria uma nova revisão:

```bash
docker exec -w /overleaf/services/real-time \
  -e UNDERLEAF_WEB_URL=http://127.0.0.1:4000 \
  -e UNDERLEAF_REALTIME_URL=http://127.0.0.1:3026 \
  -e UNDERLEAF_USERNAME=m7admin \
  -e UNDERLEAF_PASSWORD='sua-senha' \
  underleaf-app node test/acceptance/underleaf-history-smoke.mjs
```
