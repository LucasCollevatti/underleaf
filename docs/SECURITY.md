# Baseline de segurança

Este documento registra a revisão de segurança da instalação self-hosted do
Underleaf. Ele descreve as garantias do repositório e as responsabilidades do
operador; não substitui atualização do host, firewall ou revisão de exposição
da rede.

## Autenticação e sessão

- O primeiro usuário é criado explicitamente com `scripts/create-admin.sh`.
- O modo Underleaf desabilita cadastro público, reset de senha por e-mail e
  convites por e-mail. Contas adicionais são administradas por um usuário com
  privilégio administrativo.
- Senhas são armazenadas pelo fluxo herdado de autenticação com bcrypt; o
  padrão de produção usa 12 rounds.
- O app exige `UNDERLEAF_SESSION_SECRET` e
  `UNDERLEAF_INVITE_TOKEN_SECRET`; ambos devem ser aleatórios, estáveis e
  mantidos somente no `.env` ou no secret manager do operador.
- CSRF é aplicado pelo middleware da aplicação, e o login possui limites por
  IP e por identificador de conta.
- O overlay de produção habilita cookies `Secure`, mantém `SameSite=Lax`,
  habilita CSP e mantém o rate limiter de subnet ativo.

## Topologia de rede

- Em produção, somente o Caddy publica as portas 80 e 443.
- O app não publica uma porta no host; ele é acessível pelo proxy na rede
  Docker padrão.
- MongoDB e Redis ficam apenas na rede interna `underleaf_app_backend`.
- O compiler fica apenas na rede interna `underleaf_compiler_net` e não recebe
  portas, secrets da aplicação ou o Docker socket.
- O Caddy encaminha WebSocket automaticamente pelo `reverse_proxy`.

## Containers e filesystem

O compiler roda como `www-data`, com root filesystem somente leitura, todas as
capabilities removidas, `no-new-privileges`, `tmpfs` controlado, limites de
CPU/memória e limite de processos. O overlay de produção também aplica
`no-new-privileges` ao app e usa limites de CPU, memória e processos.

O app herdado ainda usa um init privilegiado para administrar seus processos
internos; essa é uma limitação conhecida documentada para uma migração futura.
O app não deve ser exposto diretamente à Internet, mesmo quando o proxy estiver
desabilitado.

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
tests/underleaf-compiler-sandbox-smoke.sh
corepack yarn npm audit --all
```

O primeiro comando valida a topologia efetiva do Compose de produção e a
ausência de portas ou secrets indevidos no compiler. O segundo inspeciona o
sandbox do container. O audit de dependências deve ser executado novamente
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
