# Underleaf

Underleaf é um editor colaborativo e self-hosted para projetos LaTeX. O
objetivo é oferecer uma instalação simples para laboratórios, universidades,
equipes de engenharia e servidores pessoais.

O código inicial foi importado de um snapshot do Overleaf Community Edition e
está sendo adaptado gradualmente para uma base independente. A origem, o SHA
importado e as obrigações legais estão registrados em
[`docs/ORIGIN.md`](docs/ORIGIN.md).

## Início rápido

Requisitos: Docker com Compose v2 e pelo menos 8 GB de RAM disponíveis durante
o primeiro build. Os helpers geram o segredo persistente localmente.

```bash
bash ./scripts/underleaf.sh up
```

No Windows, instale o Docker Desktop configurado para Linux containers e rode
o helper equivalente pelo PowerShell:

```powershell
.\scripts\underleaf.ps1 up
```

O helper também oferece `health`, `logs`, `down`, `create-admin` e `test`.
Não é necessário instalar TeX Live, Node ou `make` no host: essas dependências
ficam dentro dos containers.

Acesse <http://localhost:8080>. Em uma instalação nova, conclua o Welcome para
criar o primeiro administrador e entrar automaticamente em Projects.
Instalações já configuradas continuam usando `/login`. A CLI de criação de
administrador fica disponível para recuperação ou automação.
Para parar os containers, use `make down`.
Em Settings, usuários alteram o nome de exibição, a senha e a aparência
System/Light/Dark. O username é administrado pelo responsável pela instalação.
Projects usa o mesmo dashboard desde o primeiro projeto, com estado vazio,
criação/importação, filtros e lixeira. `/admin` reúne estatísticas da instalação;
`/admin/users` oferece busca, tabela somente para leitura e modais para criar,
editar, redefinir senha, ativar/desativar e excluir contas. A exclusão exige
digitar `DELETE` e escolher explicitamente excluir todos os projetos da conta.
Para preservá-los, cancele e transfira sua propriedade antes de excluir o usuário.
No editor, Share Project busca contas existentes por username e concede acesso
direto como editor ou viewer, sem convites por email nem limites de plano.
Volumes nomeados preservam projetos, histórico, cache, banco e saídas entre
reinicializações.

Operações úteis:

```bash
make health
make backup
make restore BACKUP=/path/to/backup
```

A instalação de produção usa o overlay em
`infra/compose/compose.production.yaml`; a configuração e as limitações estão
em [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
O passo a passo completo para instalar no PC está em
[`docs/INSTALLATION.md`](docs/INSTALLATION.md), incluindo HTTPS com Caddy.

## Estrutura atual

- `compose.yaml`: stack local do Underleaf;
- `server-ce/`: runtime importado usado pela distribuição atual;
- `services/` e `libraries/`: código de aplicação e pacotes compartilhados;
- `infra/`: Compose, proxy e configuração operacional;
- `scripts/`, `tests/` e `docs/`: automação, validação e documentação do sistema atual.

A identidade de produto e os assets visíveis são do Underleaf. Nomes internos
herdados, histórico Git, copyrights e atribuições de origem permanecem quando
necessários para compatibilidade e cumprimento da licença; os detalhes estão em
[`docs/ORIGIN.md`](docs/ORIGIN.md).

## Desenvolvimento

Leia [`AGENTS.md`](AGENTS.md) antes de alterar o projeto.
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) documenta o ambiente, as
invariantes de identidade/shell/temas e as suites unitária, frontend, acceptance
e E2E. A jornada E2E requer uma instalação descartável vazia e cria contas e
projetos reais; o documento registra quais validações ainda não foram executadas.
Para consultar o estado do stack:

```bash
docker compose ps
docker compose logs -f app
```

Informações sobre a licença e os avisos de terceiros estão em
[`LICENSE`](LICENSE) e [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
