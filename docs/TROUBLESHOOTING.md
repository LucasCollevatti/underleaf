# Troubleshooting do Underleaf

Diagnóstico da instalação Docker suportada: Linux amd64 ou Windows com Docker Desktop em Linux containers. Execute os comandos na raiz do repositório.

## Diagnóstico inicial

```bash
docker info
docker compose version
docker compose --env-file .env ps --all
docker compose --env-file .env logs --tail=200 app compiler mongo redis
```

Os helpers oferecem os comandos equivalentes:

| Operação | Linux | Windows PowerShell |
| --- | --- | --- |
| Saúde | `bash ./scripts/underleaf.sh health` | `.\scripts\underleaf.ps1 health` |
| Validar Compose | `bash ./scripts/underleaf.sh config` | `.\scripts\underleaf.ps1 config` |
| Logs do app | `bash ./scripts/underleaf.sh logs` | `.\scripts\underleaf.ps1 logs` |

Quando uma instalação falhar, identifique o serviço e a etapa exata antes de reconstruir imagens ou alterar volumes.

## Primeiro build lento, erro de download ou pouco disco

O TeX Live completo torna a imagem do compilador grande e pode consumir espaço adicional com camadas e cache de build. Confirme o espaço do Docker:

```bash
docker system df
```

No Windows, confira os recursos disponíveis para Docker Desktop/WSL2. **Não execute `docker compose down --volumes` ou `docker volume prune` como tentativa de limpeza**: os volumes contêm dados permanentes de usuários, projetos e histórico.

## Acesso pela porta 8080

O modo local serve HTTP em `UNDERLEAF_HTTP_PORT` (padrão `8080`). Se a porta estiver ocupada, ajuste no `.env`:

```dotenv
UNDERLEAF_HTTP_PORT=8081
UNDERLEAF_SITE_URL=http://localhost:8081
```

Reinicie usando `up`. Para acesso por outro dispositivo da LAN, use o IP/hostname do servidor em `UNDERLEAF_SITE_URL`; `localhost` no computador cliente se refere ao próprio cliente. Restrinja a porta no firewall e não encaminhe HTTP diretamente à Internet.

## Containers unhealthy

O `app` depende de MongoDB, Redis e compiler saudáveis. Inspecione os serviços individualmente:

```bash
docker compose --env-file .env logs --tail=200 mongo
docker compose --env-file .env logs --tail=200 redis
docker compose --env-file .env logs --tail=200 compiler
docker compose --env-file .env logs --tail=200 app
```

MongoDB usa um **replica set**, necessário para criar o primeiro administrador em uma transação. Não apague volumes do banco para tentar corrigir um erro de inicialização.

## Erro de compilação LaTeX

Leia primeiro o log do documento no editor. Para verificar o compilador:

```bash
docker compose --env-file .env ps compiler
docker compose --env-file .env logs --tail=200 compiler
docker compose --env-file .env exec compiler pdflatex --version
docker compose --env-file .env exec compiler kpsewhich tcolorbox.sty
```

O TeX Live completo reduz problemas com pacotes ausentes, mas não inclui necessariamente programas externos ou fontes adicionais. Confira [TEXLIVE.md](TEXLIVE.md) para a diferença entre erro do documento e problema de imagem/recursos.

## Primeiro administrador ou login

Em uma instalação nova, acesse `/welcome` antes de disponibilizar o endereço a outras pessoas; o primeiro usuário que conclui o fluxo vira administrador. Não existem credenciais padrão. Instalações inicializadas não reabrem `/welcome` após a exclusão de contas.

Se houver falha no bootstrap, examine os logs `app`/`mongo` e o estado do replica set. `create-admin` é um fallback específico para automação/recuperação, **não** um reset genérico de senhas de contas existentes.

## HTTPS e Caddy

A instalação com proxy usa `infra/compose/compose.production.yaml` e requer domínio/DNS configurados. No Windows PowerShell, selecione o overlay antes de invocar os helpers:

```powershell
$env:UNDERLEAF_COMPOSE_FILES = '-f compose.yaml -f infra/compose/compose.production.yaml'
.\scripts\underleaf.ps1 config
```

Consulte [instalação com Caddy](INSTALLATION.md#instalação-atrás-de-https-com-caddy-opcional). HTTPS não dispensa firewall, atualizações e controle de acesso.

## Volumes, backup e coleta de logs

`down` não remove volumes. Faça backup antes de qualquer intervenção destrutiva. Restore substitui o banco MongoDB e dados persistentes; use somente com um backup verificado e compatível.

Veja [BACKUP.md](BACKUP.md), [PERSISTENCE.md](PERSISTENCE.md) e [UPGRADING.md](UPGRADING.md). Em issues, informe revisão Git, sistema operacional, versão Docker, comandos usados e reprodução mínima; remova senhas, cookies, IPs sensíveis e conteúdo de documentos. Vulnerabilidades devem ser comunicadas [em privado](../.github/SECURITY.md).
