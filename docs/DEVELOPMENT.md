# Desenvolvimento e cobertura do produto

Leia [`AGENTS.md`](../AGENTS.md) antes de alterar o Underleaf. O
[`DEVELOPMENT-PLAN.md`](../DEVELOPMENT-PLAN.md) distingue implementação,
evidências históricas e validação pendente da revisão atual.

## Ambiente

Use o Node.js exigido em `package.json` (atualmente `>=24.18.1`) e a versão
de Yarn fixada em `packageManager` (atualmente `4.18.0`). Na raiz do checkout:

```bash
corepack enable
yarn install --immutable
```

O runtime web permanece em `services/web`, com os pacotes importados em
`libraries`. O shell compartilhado fica em
`services/web/frontend/js/shared/components/underleaf`; Welcome, autenticação,
administração e páginas de sistema ficam nas respectivas features `underleaf-*`.
Reutilize os componentes, contextos e tokens do design system importado.
O editor mantém seus contextos maduros de edição, colaboração e compilação.

Para levantar a aplicação, siga [`INSTALLATION.md`](INSTALLATION.md). O fluxo
normal de uma instalação vazia é Welcome → criar administrador → login
automático → Projects. A CLI é apenas fallback de recuperação ou automação.

## Contratos permanentes

- Usuários, sessões, busca e APIs públicas usam username; não expõem
  `email`, `emails`, domínio técnico, senhas ou hashes. A recuperação de senha
  passa pelo administrador.
- Welcome, Login, Projects, Settings, Admin e telas HTML de sistema usam o
  mesmo shell, com navegação, marca e controles acessíveis.
- System acompanha `prefers-color-scheme`; Light e Dark persistem na conta.
  Os valores do backend são `system`, `light-` e `''`, respectivamente.
  A preferência salva da conta prevalece sobre a preferência local do visitante.
- Visitantes podem trocar a aparência sem gravar configurações de uma conta.
  Marca, wordmark, lockup e favicons de compilação acompanham o tema.
- Não apresentar billing, planos, submissão SaaS, cadastro público ou
  recuperação por email. Preservar licenças, copyright e atribuição de origem.
- Erros mantêm os códigos HTTP e não divulgam detalhes internos de falhas 5xx.
  O fallback HTML de sessão/erro funciona sem consultar banco ou outros serviços.
- `/status` em HTML exige administrador. Respostas públicas de monitoramento
  continuam compatíveis. A página informa o processo web e flags de acesso;
  não substitui os probes de MongoDB, Redis ou compilador.
- Uma sessão expirada no editor exige uma ação explícita de login/reload.
  Cancelar logout preserva backups locais de edição.

## Cobertura por camada

| Camada     | Fontes                                                                            | Contrato                                                                                            |
| ---------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Unitária   | `services/web/test/unit/src/Underleaf`                                            | Bootstrap, identidade, temas e renderização de sistema                                              |
| Acceptance | `services/web/test/acceptance/src/Underleaf*Tests.mjs`                            | APIs reais, autorização, transações, migração e inicialização                                       |
| Frontend   | `services/web/test/frontend/features/underleaf-*` e `shared/components/underleaf` | Shell, formulários, administração, erros e preferências                                             |
| Editor     | `services/web/test/frontend/features/ide-react/unit/use-status-favicon.test.ts`   | Marca Underleaf em cada estado de compilação e compatibilidade do código importado                  |
| E2E        | `services/web/test/e2e/underleaf/product-journey.cy.js`                           | Instalação vazia, administrador, Projects, editor, usuários, compartilhamento, temas e login/logout |

Quando autorizado, execute as suites com as dependências do checkout instaladas:

```bash
yarn workspace @overleaf/web run test:unit test/unit/src/Underleaf
TEST_NAME_PATTERN='Underleaf|useStatusFavicon' yarn workspace @overleaf/web run test:frontend
```

Os testes acceptance usam o harness existente do serviço web e as
configurações de `services/web/test/acceptance/config`. Prepare MongoDB com
replica set, Redis e os serviços requeridos por esse harness em um ambiente
de teste separado; não aponte a configuração de acceptance para o banco da
instalação usada por pessoas. Os casos de instalação, Welcome e identidade
devem acompanhar a validação de upgrades e de concorrência de bootstrap.

## E2E em uma instalação descartável

A suite usa Cypress já presente nas dependências do web, com configuração
separada dos testes de componentes. Instale o navegador Chrome compatível
com Cypress. Chromium é necessário para emular a preferência do sistema.

Prepare uma instalação vazia com os mesmos serviços e imagens do deploy
suportado. O Compose fixa nomes de containers, volumes e redes: apenas mudar
`docker compose -p` não isola essa instalação. Use um host ou contexto Docker
dedicado, ou overrides que também substituam todos esses nomes e as portas.

Com a aplicação disponível, execute na raiz do checkout:

```bash
UNDERLEAF_E2E_ALLOW_BOOTSTRAP=1 \
UNDERLEAF_E2E_BASE_URL=http://localhost:8080 \
  yarn workspace @overleaf/web run test:product:e2e
```

O opt-in é obrigatório porque a suite cria um administrador, uma conta e um
projeto reais, concede acesso de editor e redefine a senha da conta de teste.
As credenciais são aleatórias. O preflight exige que `/welcome` esteja aberto
antes de criar contas. A suite não apaga bancos, não remove volumes e não
reabre uma instalação inicializada. Não há retries do bootstrap: uma nova
execução requer outra instalação descartável vazia. Os dados ficam disponíveis
para diagnóstico; a limpeza pertence ao operador desse ambiente.

O fluxo cobre o estado vazio de Projects, criação e abertura do editor,
administração, APIs sem campos de identidade por email, compartilhamento
direto, acesso de um colaborador, redefinição administrativa de senha,
autenticação e bloqueio posterior do Welcome. Também cobre System/Light/Dark,
reload e navegação, mudança do tema do sistema, sidebar em viewport móvel,
status, erro 404 e cancelamento de logout. Respostas bem-sucedidas não são
simuladas e exceções da aplicação não são suprimidas.

Este fluxo não substitui os testes de migração, concorrência, edição e
compilação, backup/restore ou persistência após reinicialização. Os smoke tests
em `tests/` e o harness de acceptance continuam responsáveis por suas camadas.

## Estado da validação em 2026-10-05

A revisão de fechamento corrige a criação de usuário no E2E para esperar
`201 Created`, conforme a API. A proteção do último administrador usa a mesma
transação e o mesmo lock persistente do bootstrap, serializando mudanças de
papel, status e reservas de exclusão. Os cenários concorrentes estão em
`services/web/test/acceptance/src/UnderleafAdminSafetyTests.mjs`.

Antes de limpar projetos e sessões, a exclusão reserva a conta em MongoDB,
desabilita seu acesso e invalida a identidade anterior. O campo interno opcional
`deletionPending` bloqueia alterações e reativação, inclusive pela CLI, durante
a limpeza. Contas existentes sem esse campo continuam funcionando; não há
migração de dados obrigatória. Se a limpeza falhar, a conta permanece
desabilitada e pendente: corrija o serviço que falhou e repita explicitamente
a exclusão em Users. A limpeza externa fica fora da transação para não repetir
efeitos em Redis, projetos ou arquivos durante retries do MongoDB.

Essas regressões foram adicionadas às fontes, sem execução nesta sessão.

O commit 7 entrega fontes de cobertura e documentação revisadas. Por instrução
do responsável, testes, lint, typecheck, build e execução Docker/browser não
foram realizados nesta sessão. Resultados históricos do baseline não
comprovam o funcionamento desta revisão. Registre resultados reais antes de
aprovar uma release; não marque uma suite como aprovada apenas por estar escrita.
