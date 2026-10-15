# Instalação do Underleaf no PC

Este guia usa Docker Compose e os helpers oficiais, sem exigir instalação de TeX Live, Node.js, Yarn ou Make no host. Para entender o compilador e o custo da imagem completa, consulte [TEXLIVE.md](TEXLIVE.md).

## Requisitos

- Host x86_64/amd64; ARM64 e macOS não são plataformas suportadas nesta
  release;
- Docker Desktop ou Docker Engine com Compose v2;
- Git;
- pelo menos 8 GB de RAM disponíveis durante o build;
- pelo menos 30 GB livres para imagens, cache e volumes, além do espaço dos
  projetos e backups;
- uma rede local confiável ou VPN entre os usuários e o host.

## Instalação local simples

```bash
git clone https://github.com/LucasCollevatti/underleaf.git underleaf
cd underleaf
bash ./scripts/underleaf.sh up
```

## Windows

Use os comandos PowerShell do helper para todas as operações; `make` não é necessário no Windows.

Instale o Docker Desktop com Linux containers e, de preferência, a integração
com WSL2. No PowerShell, a instalação local é:

```powershell
git clone https://github.com/LucasCollevatti/underleaf.git underleaf
Set-Location underleaf
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 up
```

Para a operação diária, use `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 health`
e substitua `health` por `logs` ou `down`.
O script também expõe `create-admin` e `test`. Não é necessário instalar TeX
Live, Node ou `make` no Windows; o Docker Desktop executa o runtime Linux do
Underleaf dentro dos containers. Backup e restore também estão disponíveis no
script PowerShell.

Abra <http://localhost:8080>. Uma instalação nova abre `/welcome`: avance em
**Começar**, crie o administrador e aguarde o login automático em `/project`.
O Welcome e o Login usam a mesma sidebar e o seletor de tema. Não há credenciais
padrão nem cadastro público de contas adicionais.

O stack local usa a porta 8080 e preserva os dados em volumes
Docker nomeados. Para parar sem apagá-los, execute
`bash ./scripts/underleaf.sh down` no Linux ou `.\scripts\underleaf.ps1 down`
no Windows. O primeiro `up` também cria a imagem com TeX Live completo;
a transferência inicial pode ser grande. Consulte [TEXLIVE.md](TEXLIVE.md).

### Acesso na rede local

O stack local publica HTTP na porta 8080 e não criptografa o tráfego. Para
acesso de outros dispositivos, defina no `.env` o endereço LAN do host:

```dotenv
UNDERLEAF_SITE_URL=http://192.168.1.50:8080
UNDERLEAF_HTTP_PORT=8080
```

Troque o endereço pelo IP real do servidor e libere a porta somente no firewall
da rede confiável. Não encaminhe essa porta para a Internet; use uma VPN ou
um proxy HTTPS administrado pelo operador quando o acesso sair da LAN. O
projeto não promete hardening para exposição direta à Internet.

A inicialização e a conta do primeiro administrador são gravadas juntas no
MongoDB. O replica set do Compose é necessário para essa transação. Se o
processo falhar, repita o acesso ao Welcome; após a confirmação, ele não aceita
outro bootstrap. Instalações existentes com usuários são reconhecidas como
inicializadas. Excluir contas não reabre o Welcome.

## Contas e aparência

Login e compartilhamento usam exclusivamente **username**. Não cadastre email
nem endereço sintético para identificar contas. Em `/admin/users`, um
administrador cria contas, altera username e nome de exibição, redefine senhas
e administra papéis e status. Uma pessoa que perdeu a senha solicita a
redefinição ao administrador; não há recuperação por email.

Em Settings, cada usuário altera nome de exibição, senha e aparência.
System acompanha o tema do sistema operacional; Light e Dark fixam a aparência.
A preferência da conta persiste entre navegação, logout/login e reinicializações.
Visitantes podem escolher o tema na sidebar de Welcome e Login, com preferência
local no navegador.

`/status` no navegador é uma página administrativa com estado do processo web
e flags de acesso. Para a saúde dos serviços, use `make health`, conforme
[`OBSERVABILITY.md`](OBSERVABILITY.md).

## Instalação atrás de HTTPS com Caddy (opcional)

Use um domínio que a máquina consiga resolver e aponte os registros DNS para o
host antes de subir o proxy. Edite `.env` com valores equivalentes a:

```dotenv
UNDERLEAF_SITE_DOMAIN=underleaf.example.com
UNDERLEAF_SITE_URL=https://underleaf.example.com
UNDERLEAF_PROXY_HTTP_PORT=80
UNDERLEAF_PROXY_HTTPS_PORT=443
```

Valide e suba o overlay de produção:

```bash
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make config
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make build
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make up
```

No Windows PowerShell, o mesmo overlay é selecionado pela variável
`UNDERLEAF_COMPOSE_FILES`, sem precisar instalar `make`:

```powershell
$env:UNDERLEAF_COMPOSE_FILES = '-f compose.yaml -f infra/compose/compose.production.yaml'
.\scripts\underleaf.ps1 config
.\scripts\underleaf.ps1 build
.\scripts\underleaf.ps1 up
```

Defina antes `UNDERLEAF_SITE_DOMAIN` e `UNDERLEAF_SITE_URL` no `.env`.
Mantenha a variável `UNDERLEAF_COMPOSE_FILES` nas sessões posteriores quando
operar esse deployment.

O Caddy pode solicitar e renovar certificados ACME quando DNS e portas públicas
estiverem corretamente configurados, e grava seu estado nos volumes
`underleaf_proxy_data` e
`underleaf_proxy_config`. Para testes com `localhost`, o Caddy usa um
certificado local e o navegador pode mostrar um aviso; não use esse modo como
certificado público.

O overlay não transforma uma instalação em um serviço público seguro: firewall,
DNS, atualização do host, VPN/HTTPS, controle de acesso e revisão de exposição
continuam sendo responsabilidade do operador. Para a maioria das instalações
domésticas ou de laboratório, prefira a LAN confiável ou uma VPN.

Abra o domínio configurado e conclua o Welcome. Em uma instalação existente,
o bootstrap permanece fechado e o acesso continua por `/login`.

A CLI fica disponível para automação ou recuperação quando não existe nenhum
administrador. Use os mesmos arquivos Compose:

```bash
UNDERLEAF_COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  ./scripts/create-admin.sh
```

A CLI recusa a criação se já existir administrador, inclusive desabilitado.
Ela não reabre o Welcome. Senhas são informadas pelo terminal (entrada oculta)
ou pelo stdin na automação, nunca por argumentos de processo.

## Operação diária

```bash
make health
make logs
make backup # padrão: $HOME/underleaf-backups/underleaf-<UTC>
# ou: BACKUP_DIR=/srv/backups/underleaf-$(date +%F) make backup
make down
```

Para restaurar, confirme o caminho e execute explicitamente:

```bash
make restore BACKUP=/srv/backups/underleaf-2026-10-02
```

No PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 backup
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 restore -Backup C:\caminho\underleaf-2026-10-02 -Yes
```

O backup nunca sobrescreve um destino existente. O restore valida os quatro
arquivos, os hashes, os archives e a conectividade antes de parar o app; ele
exige `--yes` ou `-Yes` porque substitui o MongoDB e os dados persistentes.

Consulte [`DEPLOYMENT.md`](DEPLOYMENT.md), [`BACKUP.md`](BACKUP.md),
[`PERSISTENCE.md`](PERSISTENCE.md) e [`SECURITY.md`](SECURITY.md) antes de
expor a instalação à Internet.

Para desenvolvimento e execução da cobertura em uma instalação descartável,
consulte [`DEVELOPMENT.md`](DEVELOPMENT.md). Instalação inicial e upgrade de dados existentes são procedimentos distintos;
preserve um backup completo e siga [UPGRADING.md](UPGRADING.md) antes de atualizar.
Se houver falhas, consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

