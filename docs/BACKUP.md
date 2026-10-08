# Backup e restore do Underleaf

O backup do Underleaf é um diretório versionado por manifest, não um arquivo
solto. Ele contém:

- `manifest.json`: formato, data UTC, revisão Git e conteúdo;
- `mongo.archive.gz`: dump BSON comprimido do banco `sharelatex`;
- `app-data.tar.gz`: conteúdo persistente de `/var/lib/overleaf/data`, incluindo
  histórico e templates, mas excluindo `cache`, `compiles` e `output` derivados;
- `checksums.sha256`: hashes SHA-256 dos dois arquivos de dados.

O Redis não é restaurado: sessões, presença e filas são estado operacional
temporário. O cache do app e `underleaf_compiler_work` também são derivados e
não fazem parte do backup. MongoDB e os dados persistentes da aplicação são as
fontes necessárias para recuperar usuários, projetos, metadata e histórico.

## Criar um backup

Com o stack ativo e o arquivo `.env` configurado:

```bash
make backup
```

Sem `BACKUP_DIR`, o resultado fica em
`$HOME/underleaf-backups/underleaf-<UTC_TIMESTAMP>`, fora do checkout. O
backup é montado em um diretório temporário protegido e só recebe o nome final
quando os dois archives, hashes e manifest estão completos.

Para escolher o diretório:

```bash
BACKUP_DIR=/srv/backups/underleaf-2026-10-02 make backup
```

O comando falha se o diretório de destino já contiver arquivos. Armazene o
resultado fora dos volumes ativos e restrinja o acesso ao dump, pois ele pode
conter dados de projetos e usuários.
Os hashes confirmam integridade contra corrupção acidental; não autenticam a
origem do backup. Use apenas diretórios e arquivos de backup confiáveis.

## Restaurar um backup

O restore é deliberadamente explícito porque substitui o banco `sharelatex` e
os dados persistentes da aplicação:

```bash
make restore BACKUP=/srv/backups/underleaf-2026-10-02
```

O target passa `--yes` ao script depois de receber o caminho definido pelo
operador. Ele para o app, verifica o manifest e os hashes, restaura o MongoDB,
recoloca os dados persistentes nos volumes nomeados e sobe o app novamente. O
histórico é restaurado junto com os dados da aplicação; cache, compiles e output
derivados são descartados e recriados pelo runtime quando necessários. O Redis
volta vazio e reconstrói filas e sessões.

O formato atual é `1`. O restore continua aceitando backups antigos desse
formato; se eles contiverem `data/compiles`, `data/output` ou `data/cache`, esses
artefatos derivados são descartados após a extração. Backups são compatíveis
com instalações que usam o mesmo schema do MongoDB e os mesmos caminhos
persistentes. Antes de atualizar uma versão estrutural, crie um backup e execute
um restore de ensaio em uma cópia isolada.

No Windows, use os comandos nativos do PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 backup
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 restore -Backup C:\backups\underleaf-2026-10-02 -Yes
```

## Teste de round-trip

O procedimento de validação combina os smoke tests existentes:

1. criar usuário, projeto, editar e compilar com os testes de dashboard/editor;
2. executar `make backup BACKUP_DIR=...`;
3. confirmar `manifest.json`, hashes e os dois arquivos de dados;
4. restaurar com `make restore BACKUP=...` em uma instalação descartável;
5. repetir login, leitura do histórico e uma nova compilação.

Não execute o passo 4 em uma instalação com dados importantes sem preservar o
backup original e confirmar o destino.
