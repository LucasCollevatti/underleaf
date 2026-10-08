# Baseline de segurança

Este documento registra a revisão de segurança da instalação self-hosted do
Underleaf. Ele descreve as garantias do repositório e as responsabilidades do
operador; não substitui atualização do host, firewall ou revisão de exposição
da rede.

## Autenticação e sessão

- Em uma instalação vazia, `/welcome` cria o primeiro administrador sem
  credenciais padrão. Conclua essa etapa antes de expor o serviço publicamente:
  a primeira pessoa que concluir o Welcome se torna administradora.
- O bootstrap exige CSRF e limita tentativas por IP. Criação do administrador
  e inicialização persistente usam uma única transação com confirmação majority
  no replica set do MongoDB. Tentativas concorrentes disputam o mesmo registro.
- Instalações com qualquer usuário existente são adotadas como inicializadas.
  O estado não depende de manter um administrador ativo e não reabre quando
  contas são removidas. GET `/welcome` redireciona depois da inicialização e
  POST rejeita novas criações.
- `scripts/create-admin.sh` fica como fallback de automação/recuperação com
  acesso ao servidor. Usa a mesma trava e recusa outro admin se já existir um,
  inclusive desabilitado. Não há rota web de recuperação do bootstrap.
- O login automático reutiliza o fluxo existente de auditoria e regeneração
  da sessão/CSRF. Se ele falhar após o commit, a conta permanece criada e o
  usuário pode entrar pelo Login; o bootstrap permanece fechado.
- O modo Underleaf desabilita cadastro público, reset de senha por e-mail e
  convites por e-mail. Contas adicionais são administradas por um usuário com
  privilégio administrativo.
- Senhas são armazenadas pelo fluxo herdado de autenticação com bcrypt; o
  padrão de produção usa 12 rounds.
- O app exige `UNDERLEAF_SESSION_SECRET`; ele deve ser aleatório, estável e
  mantido somente no `.env` ou no secret manager do operador.
- CSRF é aplicado pelo middleware da aplicação, e o login possui limites por
  IP e por identificador de conta.
- O overlay de produção habilita cookies `Secure`, mantém `SameSite=Lax`,
  habilita CSP e mantém o rate limiter de subnet ativo.

## Topologia de rede

- Em produção, somente o Caddy publica as portas 80 e 443.
- O app não publica uma porta no host; ele é acessível pelo proxy na rede
  Docker padrão.
- MongoDB e Redis ficam apenas na rede interna `underleaf_app_backend`.
- O compiler fica apenas na rede interna `underleaf_compiler_net`, sem acesso
  às redes de MongoDB/Redis e sem portas publicadas no host.
- O único acesso de aplicação necessário ao compiler é o filestore do `app`;
  o container não recebe secrets da aplicação nem o Docker socket.
- O Caddy encaminha WebSocket automaticamente pelo `reverse_proxy`.

## Containers e filesystem

O compiler roda como `www-data:www-data`, com root filesystem somente leitura,
todas as capabilities removidas, `no-new-privileges`, `tmpfs` controlado,
limites explícitos de CPU, memória e PIDs e somente um volume gravável:
`/var/lib/underleaf/compiler`. O overlay de produção também aplica
`no-new-privileges` ao app e usa limites de CPU, memória e processos.

O app herdado ainda usa um init privilegiado para administrar seus processos
internos; essa é uma limitação conhecida documentada para uma migração futura.
O app não deve ser exposto diretamente à Internet, mesmo quando o proxy estiver
desabilitado.

A instalação local foi desenhada para uma LAN confiável ou VPN. O HTTP direto
na porta 8080 não oferece criptografia e o projeto não promete hardening para
Internet pública; use firewall e, quando necessário, o overlay Caddy com HTTPS
sob responsabilidade do operador.

## Backups e logs

- Backups devem ser gravados fora dos volumes ativos, com permissões restritas
  ao operador e retenção definida por política local.
- `make backup` não inclui secrets do `.env`.
- Logs estruturados não devem conter senha, hash, cookie, token, secret ou
  conteúdo de documento. O request ID é limitado a caracteres seguros e não é
  uma credencial.
- Execute `make health` sem publicar a resposta em páginas públicas: ela
  informa estado operacional e espaço em disco.

## Verificações reproduzíveis

```bash
tests/underleaf-security-smoke.sh
tests/underleaf-compiler-boundary-smoke.sh
tests/underleaf-compiler-sandbox-smoke.sh
corepack yarn npm audit --all
```

O primeiro comando valida a topologia efetiva do Compose de produção. O teste
de boundary confirma que o app usa o serviço dedicado e que CLSI não volta a
ser iniciado no runtime principal. O sandbox smoke inspeciona limites,
capabilities, mounts, rede e secrets e executa verificações negativas de escrita
no root filesystem, Docker socket e resolução de MongoDB/Redis. O audit de
dependências deve ser executado novamente
quando o lockfile ou a imagem base mudar.

## Resultado do audit do snapshot

Em 2026-10-02, `corepack yarn npm audit --all` encontrou 22 avisos de alta
severidade, 29 moderados, 4 baixos e 6 entradas de dependências depreciadas.
Os itens vêm principalmente do snapshot importado e incluem versões antigas de
`axios`, `xmldom`, `multer`, `nodemailer` e `js-yaml`.

Esse resultado está documentado deliberadamente: o baseline de M22 não declara
que o lockfile está livre de vulnerabilidades. Antes de publicar uma instalação
na Internet, os avisos de alta severidade devem ser atualizados, mitigados ou
aceitos formalmente pelo operador, com novo audit registrado.
