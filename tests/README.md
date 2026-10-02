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
