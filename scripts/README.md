# Scripts

Scripts operacionais do Underleaf devem ser adicionados aqui. Os scripts
importados permanecem próximos aos serviços até que cada migração possa ser
validada sem alterar o comportamento.

`underleaf-backup.sh` cria um manifest, um archive do MongoDB e um archive dos
dados da aplicação. `underleaf-restore.sh` verifica o manifest e os hashes
antes de substituir o MongoDB e os dados da aplicação após um `--yes` explícito.
