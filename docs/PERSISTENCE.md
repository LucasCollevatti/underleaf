# Persistência do Underleaf

O Compose canônico usa volumes nomeados com nomes estáveis. `make down` apenas
remove os containers e as redes; não remove volumes. A remoção de dados deve
ser uma operação explícita e precedida por backup.

## Mapa de dados

| Dado | Serviço | Volume | Caminho no container | Responsabilidade |
| --- | --- | --- | --- | --- |
| Metadados, usuários e projetos | `mongo` | `underleaf_mongo_data` | `/data/db` | Fonte de verdade do banco MongoDB. |
| Sessões, filas e presença temporária | `redis` | `underleaf_redis_data` | `/data` | Estado operacional do Redis; não substitui o MongoDB nem o histórico. |
| Dados gerais do app | `app` | `underleaf_app_data` | `/var/lib/overleaf` | Dados persistentes que não têm um volume filho dedicado. |
| Histórico de revisões | `app` | `underleaf_app_history` | `/var/lib/overleaf/data/history` | Filas, snapshots e dados locais usados pelo histórico de projetos. |
| Cache da aplicação | `app` | `underleaf_app_cache` | `/var/lib/overleaf/data/cache` | Cache derivado; não é fonte de verdade e pode ser limpo conforme a política operacional. |
| Templates | `app` | `underleaf_app_templates` | `/var/lib/overleaf/data/template_files` | Arquivos de template usados pela aplicação. |
| Área de trabalho do compilador | `compiler` | `underleaf_compiler_work` | `/var/lib/underleaf/compiler` | Compiles, cache e artefatos de saída derivados. O app monta este volume somente para leitura para servir resultados; não contém a fonte canônica do projeto. |
| Estado e certificados do proxy | `proxy` | `underleaf_proxy_data` | `/data` | Certificados ACME, autoridade local e estado operacional do Caddy. |
| Configuração persistida do proxy | `proxy` | `underleaf_proxy_config` | `/config` | Configuração automática persistida pelo Caddy; não substitui o Caddyfile versionado. |

Os volumes `app_history`, `app_cache` e `app_templates` são montados como
subvolumes de `app_data`: o volume filho prevalece no subcaminho correspondente
sem esconder o restante dos dados gerais da aplicação. O compilador não grava
em `app_data`; todo o trabalho de LaTeX fica em `compiler_work`. Não altere
esses caminhos para bind mounts sem atualizar o backup e o restore.

Instalações atualizadas a partir da topologia anterior podem manter os volumes
Docker órfãos `underleaf_app_compiles` e `underleaf_app_output`. Eles não são
mais montados nem necessários para o runtime atual. Preserve-os durante a
janela de rollback e remova-os apenas depois de validar compilação e restore.

## Permissões e retenção

- O processo do compilador roda como `www-data`; o volume
  `underleaf_compiler_work` deve permitir escrita apenas para esse usuário.
- O app precisa escrever nos volumes `app_*`; o host não deve expor esses
  diretórios diretamente sem preservar proprietário e modo dos arquivos.
- MongoDB e Redis devem permanecer sem portas publicadas no host em produção.
- `underleaf_proxy_data` e `underleaf_proxy_config` devem ser preservados para
  evitar perda de certificados e estado do Caddy.
- O backup deve incluir MongoDB, os dados persistentes do app, `app_history`,
  `app_templates` e o manifest. `app_cache` e `compiler_work` são derivados e
  são recriados; `data/compiles` e `data/output` legados também são excluídos
  do backup.
- Reter backups em armazenamento separado dos volumes ativos, com pelo menos
  uma cópia protegida contra exclusão acidental. A duração exata é uma decisão
  operacional; o restore deve ser testado antes de reduzir a retenção.

## Verificação de recriação

O teste abaixo escreve um marcador temporário no volume de histórico, recria o
container `app` e confirma que o marcador continua disponível:

```bash
./tests/underleaf-persistence-smoke.sh
```

O teste remove apenas o marcador criado por ele. Ele não usa `docker compose
down --volumes`.
