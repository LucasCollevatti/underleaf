# Scripts

Scripts operacionais do Underleaf devem ser adicionados aqui. Os scripts
importados permanecem próximos aos serviços até que cada migração possa ser
validada sem alterar o comportamento.

`underleaf-health.sh` imprime o estado dos serviços e métricas operacionais em
uma linha JSON sem dados sensíveis.

`underleaf-backup.sh` e `underleaf-backup.ps1` criam um manifest, um archive do
MongoDB e um archive dos dados da aplicação fora do checkout por padrão.
`underleaf-restore.sh` e `underleaf-restore.ps1` validam o manifest, os hashes,
os archives e a conectividade antes de substituir o MongoDB e os dados da
aplicação após um `--yes`/`-Yes` explícito.
