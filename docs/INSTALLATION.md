# Instalação do Underleaf no PC

## Requisitos

- Docker Desktop ou Docker Engine com Compose v2;
- Git;
- `openssl`;
- pelo menos 8 GB de RAM disponíveis durante o build;
- espaço livre suficiente para a imagem base, a imagem do app e o TeX Live.

## Instalação local simples

```bash
git clone <URL-DO-REPOSITORIO> underleaf
cd underleaf
cp .env.example .env
sed -i "s/^UNDERLEAF_INVITE_TOKEN_SECRET=.*/UNDERLEAF_INVITE_TOKEN_SECRET=$(openssl rand -base64 32)/" .env
sed -i "s/^UNDERLEAF_SESSION_SECRET=.*/UNDERLEAF_SESSION_SECRET=$(openssl rand -base64 32)/" .env
make config
make build
make up
```

Abra <http://localhost:8080>. Uma instalação nova abre `/welcome`: avance em
**Começar**, crie o administrador e aguarde o login automático em `/project`.
O Welcome e o Login usam a mesma sidebar e o seletor de tema. Não há credenciais
padrão nem cadastro público de contas adicionais.

O stack local usa a porta 8080 e preserva os dados
em volumes Docker nomeados. `make down` para os containers sem apagar esses
volumes.

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

## Instalação atrás de HTTPS

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

O Caddy solicita e renova certificados automaticamente para domínios públicos
e grava seu estado nos volumes `underleaf_proxy_data` e
`underleaf_proxy_config`. Para testes com `localhost`, o Caddy usa um
certificado local e o navegador pode mostrar um aviso; não use esse modo como
certificado público.

Abra o domínio configurado e conclua o Welcome. Em uma instalação existente,
o bootstrap permanece fechado e o acesso continua por `/login`.

A CLI fica disponível para automação ou recuperação quando não existe nenhum
administrador. Use os mesmos arquivos Compose:

```bash
UNDERLEAF_COMPOSE_FILES="compose.yaml -f infra/compose/compose.production.yaml" \
  ./scripts/create-admin.sh
```

A CLI recusa a criação se já existir administrador, inclusive desabilitado.
Ela não reabre o Welcome. Senhas são informadas pelo terminal (entrada oculta)
ou pelo stdin na automação, nunca por argumentos de processo.

## Operação diária

```bash
make health
make logs
BACKUP_DIR=/srv/backups/underleaf-$(date +%F) make backup
make down
```

Para restaurar, confirme o caminho e execute explicitamente:

```bash
make restore BACKUP=/srv/backups/underleaf-2026-10-02
```

Consulte [`DEPLOYMENT.md`](DEPLOYMENT.md), [`BACKUP.md`](BACKUP.md),
[`PERSISTENCE.md`](PERSISTENCE.md) e [`SECURITY.md`](SECURITY.md) antes de
expor a instalação à Internet.

Para desenvolvimento e execução da cobertura em uma instalação descartável,
consulte [`DEVELOPMENT.md`](DEVELOPMENT.md). Instalação inicial e upgrade de
dados existentes são procedimentos distintos; preserve um backup completo
antes de atualizar a instalação.
