# Atualização do Underleaf

O Underleaf está em **beta**. Ainda não há migração automática garantida entre várias versões nem rollback de banco entre schemas diferentes. Faça atualizações controladas e preserve backups antes de alterar imagens ou código.

## Antes de atualizar

1. Identifique a versão/revisão Git instalada e leia as notas da revisão de destino.
2. Verifique se `app`, `compiler`, `mongo` e `redis` estão saudáveis.
3. Crie um backup completo e confira seu manifest e hashes.
4. Preserve o `.env` separadamente em armazenamento seguro: **o backup não inclui o segredo de sessão**.
5. Se houver mudança de schema, teste a atualização e o restore em uma instalação Docker realmente isolada.

Os volumes possuem nomes fixos: alterar apenas o nome do projeto Compose **não isola os dados**.

## Backup e atualização

No Linux:

```bash
bash ./scripts/underleaf.sh health
bash ./scripts/underleaf.sh backup
```

No Windows PowerShell:

```powershell
.\scripts\underleaf.ps1 health
.\scripts\underleaf.ps1 backup
```

Escolha deliberadamente a revisão que deseja implantar. A `main` é de desenvolvimento; um `git pull` não equivale a receber uma release estável. Para avançar na branch atual, após salvar seu trabalho local:

```bash
git status --short
git pull --ff-only
```

Confira mudanças em `.env.example`, Compose e migrações. **Não substitua o `.env` existente por `.env.example`.** Suba a revisão selecionada:

Linux:

```bash
bash ./scripts/underleaf.sh up
bash ./scripts/underleaf.sh health
```

Windows:

```powershell
.\scripts\underleaf.ps1 up
.\scripts\underleaf.ps1 health
```

O comando `up` pode reconstruir imagens. Se for importante reproduzir a distribuição LaTeX instalada, fixe `UNDERLEAF_TEXLIVE_IMAGE` a uma referência imutável verificada; veja [TEXLIVE.md](TEXLIVE.md).

## Depois de atualizar

Verifique login, projetos, compilação PDF, colaboração, compartilhamento e histórico. Preserve logs de falhas e consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md) antes de alterar a instalação.

## Restore e rollback

O `down` mantém os volumes; **não utilize `docker compose down --volumes`** durante uma atualização. O restore substitui o banco e os dados persistentes e exige confirmação. Voltar o código Git ou as imagens não reverte automaticamente uma migração de MongoDB. Só restaure backups compatíveis com o schema da revisão escolhida.

Consulte [BACKUP.md](BACKUP.md) e [PERSISTENCE.md](PERSISTENCE.md) para o procedimento detalhado. Sempre que houver dúvida sobre compatibilidade, ensaie em uma cópia isolada antes de tocar nos dados principais.
