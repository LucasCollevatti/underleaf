# Underleaf

**Underleaf** é um editor colaborativo e self-hosted de documentos LaTeX, derivado do [Overleaf Community Edition](https://github.com/overleaf/overleaf). Foi adaptado para instalações controladas pelo operador, com contas locais e compilação LaTeX isolada.

**Estado:** beta em desenvolvimento ativo. O código usa **AGPL-3.0** e preserva a origem e as atribuições do Overleaf.

## Funcionalidades

- Editor LaTeX no navegador, múltiplos arquivos, preview PDF e compilação com **TeX Live completo**.
- Engines pdfLaTeX, XeLaTeX e LuaLaTeX; bibliografias com BibTeX/Biber.
- Projetos, histórico, colaboração, compartilhamento e permissões por usuário.
- Administração de contas por **username**, sem cadastro público, e temas System/Light/Dark.
- Backups e persistência de dados por volumes Docker nomeados.

O Underleaf remove fluxos comerciais/SaaS do produto original. Confira a [arquitetura](docs/ARCHITECTURE.md) e a [origem do projeto](docs/ORIGIN.md).

## Requisitos

| Item | Requisito |
| --- | --- |
| Plataforma | Linux `x86_64/amd64` ou Windows com Docker Desktop em modo Linux containers (preferencialmente WSL2) |
| Docker | Docker Engine/Desktop com Compose v2 |
| Memória | Pelo menos **8 GB disponíveis durante o primeiro build** |
| Disco | Pelo menos **30 GB livres**, além do armazenamento para projetos e backups |
| Ferramentas no host | Git e Docker; não é necessário instalar TeX Live, Node.js, Yarn ou Make |

**ARM64 e macOS não são plataformas oficialmente suportadas nesta versão.** Os valores de RAM/disco são requisitos iniciais, não uma garantia para compilação concorrente ou projetos pesados. O TeX Live completo aumenta significativamente o download e o espaço ocupado pelas imagens.

## Instalação rápida com Docker

**Linux:**

```bash
git clone https://github.com/LucasCollevatti/underleaf.git
cd underleaf
bash ./scripts/underleaf.sh up
```

**Windows (PowerShell):**

Instale Docker Desktop com Linux containers e, preferencialmente, WSL2.

```powershell
git clone https://github.com/LucasCollevatti/underleaf.git
Set-Location underleaf
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 up
```

Os helpers criam `.env` com um segredo de sessão persistente, constroem as imagens necessárias e iniciam a stack. O primeiro build pode transferir imagens grandes.

Abra **http://localhost:8080** e crie o primeiro administrador no `/welcome`. Não existem credenciais padrão. As demais contas são criadas por administradores em `/admin/users`.

> **Por que TeX Live completo?** O compilador executa em um container separado e importa a árvore `/usr/local/texlive` de `texlive/texlive:latest` (ou da imagem configurada). Isso evita grande parte dos problemas com pacotes LaTeX ausentes, ao custo de uma imagem maior. Veja [TeX Live completo](docs/TEXLIVE.md).

## Operação diária

| Ação | Linux | Windows (PowerShell, na raiz do repo) |
| --- | --- | --- |
| Iniciar e atualizar containers | `bash ./scripts/underleaf.sh up` | `.\scripts\underleaf.ps1 up` |
| Verificar saúde | `bash ./scripts/underleaf.sh health` | `.\scripts\underleaf.ps1 health` |
| Ver logs | `bash ./scripts/underleaf.sh logs` | `.\scripts\underleaf.ps1 logs` |
| Parar sem apagar volumes | `bash ./scripts/underleaf.sh down` | `.\scripts\underleaf.ps1 down` |
| Criar backup | `bash ./scripts/underleaf.sh backup` | `.\scripts\underleaf.ps1 backup` |
| Rebuild do compilador TeX | `bash ./scripts/underleaf.sh build-compiler` | `.\scripts\underleaf.ps1 build-compiler` |

A configuração local expõe **HTTP na porta 8080** para uso em LAN confiável ou VPN. Não encaminhe essa porta diretamente para a Internet. Há um overlay opcional com Caddy/HTTPS, mas o projeto **não afirma estar endurecido para exposição pública direta**.

## Serviços Docker

| Serviço | Responsabilidade |
| --- | --- |
| `app` | Interface web, autenticação e serviços internos |
| `compiler` | CLSI e TeX Live completo em container isolado |
| `mongo` | Usuários, projetos e metadados |
| `redis` | Sessões, filas e colaboração em tempo real |

O compilador não publica portas no host, não recebe segredos do `app` e não participa da rede interna do MongoDB/Redis. Projetos, histórico e dados persistem em volumes Docker; `down` não os apaga.

## Documentação

- [Instalação passo a passo](docs/INSTALLATION.md) — Linux, Windows, primeiro administrador, LAN e HTTPS.
- [TeX Live completo](docs/TEXLIVE.md) — escolha da distribuição, engines, imagens, recursos e diagnósticos.
- [Deployment Docker](docs/DEPLOYMENT.md) — Compose, redes, rebuilds e configuração avançada.
- [Troubleshooting](docs/TROUBLESHOOTING.md) — problemas de build, portas, containers e compilação.
- [Atualizações](docs/UPGRADING.md) — backup, atualização controlada e rollback.
- [Backup](docs/BACKUP.md), [persistência](docs/PERSISTENCE.md) e [observabilidade](docs/OBSERVABILITY.md).
- [Segurança](docs/SECURITY.md), [desenvolvimento](docs/DEVELOPMENT.md) e [contribuição](CONTRIBUTING.md).

## Licença e créditos

Distribuído sob [AGPL-3.0](LICENSE). O snapshot de origem e suas modificações estão documentados em [ORIGIN.md](docs/ORIGIN.md), e as licenças de componentes em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Problemas podem ser relatados por issues com logs sanitizados; vulnerabilidades devem seguir a [política de divulgação privada](.github/SECURITY.md). Nunca publique arquivos `.env`, credenciais, backups ou conteúdo de documentos.
