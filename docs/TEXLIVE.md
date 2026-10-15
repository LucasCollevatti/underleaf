# Por que o Underleaf usa o TeX Live completo?

O Underleaf utiliza a **distribuição TeX Live completa oferecida pela imagem de origem configurada**, em um container `compiler` separado da aplicação web. Isso prioriza compatibilidade com documentos LaTeX reais sem exigir a instalação manual de coleções de pacotes no host.

## Benefícios e contrapartidas

Documentos diferentes dependem de classes, estilos, fontes, bibliografias e idiomas distintos. Instalações mínimas podem falhar com mensagens como `File ... .sty not found`. A distribuição completa reduz esse problema e oferece pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX e Biber.

A contrapartida é **um download inicial maior**, mais uso de disco e um build mais pesado. Ainda assim, a distribuição completa **não garante** a presença de todos os programas externos ou fontes do sistema usados por projetos especiais.

## O que acontece no Docker?

O [Dockerfile do compilador](../server-ce/Dockerfile-compiler) usa um build multi-stage:

1. Seleciona a imagem `UNDERLEAF_TEXLIVE_IMAGE` (padrão: `texlive/texlive:latest`).
2. Copia `/usr/local/texlive` da imagem de origem para a imagem do compilador.
3. Instala as dependências de produção do CLSI e configura seu runtime.
4. Verifica a presença de `pdflatex`, `xelatex`, `lualatex`, `latexmk`, `bibtex`, `biber`, `makeindex` e arquivos TeX de exemplo.
5. Executa o CLSI como usuário não privilegiado, com limites definidos no [Compose](../compose.yaml).

Não existe uma allowlist local do `tlmgr` escolhendo um subconjunto arbitrário de pacotes. O Dockerfile também **não copia todo o sistema operacional** da imagem do TeX Live: só a árvore indicada. Executáveis externos precisam ser considerados separadamente.

**Não instale TeX Live no computador para usar o Underleaf.** O `up` padrão já constrói as imagens necessárias:

```bash
bash ./scripts/underleaf.sh up
```

No Windows PowerShell:

```powershell
.\scripts\underleaf.ps1 up
```

## Como atualizar ou reconstruir o compilador

Para reconstruir apenas a imagem do compilador:

| Linux | Windows (PowerShell) |
| --- | --- |
| `bash ./scripts/underleaf.sh build-compiler` | `.\scripts\underleaf.ps1 build-compiler` |

Após o build, atualize/inicie os containers com o helper `up`. O comando `up` atual usa `--build`, portanto também pode revalidar outros estágios de imagem. Para reconstruir **somente a aplicação web** sem reinstalar TeX Live, consulte `make web` em [DEPLOYMENT.md](DEPLOYMENT.md).

O runtime não instala pacotes TeX automaticamente após o build. Para mudar a distribuição, escolha uma nova imagem de origem, reconstrua e teste os documentos afetados.

## Versão e reprodutibilidade

O [`.env.example`](../.env.example) define:

```dotenv
UNDERLEAF_TEXLIVE_IMAGE=texlive/texlive:latest
```

`latest` significa a imagem resolvida no momento do build, **não necessariamente a mais recente instalada no container em execução**. Também não atualiza TeX Live em tempo real.

Para instalações reproduzíveis, use uma referência de imagem verificada e imutável (por exemplo, um digest `sha256` publicado pelo fornecedor) no `.env` e registre a revisão Git correspondente. A página administrativa mostra a versão do TeX Live detectada no runtime.

Verifique a versão do container em execução:

```bash
docker compose --env-file .env exec compiler pdflatex --version
docker compose --env-file .env exec compiler xelatex --version
docker compose --env-file .env exec compiler lualatex --version
```

Consulte se um arquivo `.sty` está presente:

```bash
docker compose --env-file .env exec compiler kpsewhich tcolorbox.sty
```

Esses comandos são apenas de consulta.

## Recursos e isolamento

| Variável no `.env` | Padrão | Finalidade |
| --- | --- | --- |
| `UNDERLEAF_TEXLIVE_IMAGE` | `texlive/texlive:latest` | Imagem de origem |
| `UNDERLEAF_COMPILE_CPUS` | `4` | Limite de CPUs |
| `UNDERLEAF_COMPILE_MEMORY` | `8G` | Limite de memória |
| `UNDERLEAF_COMPILE_TIMEOUT` | `3600` | Timeout em segundos |
| `UNDERLEAF_MAX_PROJECT_SIZE` | `0` | Sem limite de produto, mas sujeito aos limites de infraestrutura |

O limite de memória **não reserva** 8 GB continuamente. Para compilações pesadas ou concorrentes, monitore o consumo real e aumente a capacidade conforme necessário. O requisito de 30 GB livres é um ponto de partida, não um valor garantido para todos os caches, imagens, projetos e backups.

Por segurança, o `compiler` não publica uma porta no host, tem filesystem raiz somente leitura, executa sem capabilities extras e não recebe segredos nem Docker socket do `app`. Ele não participa da rede MongoDB/Redis.

## Diagnóstico

Se um PDF falhar, leia primeiro os erros LaTeX no editor. Em seguida:

```bash
docker compose --env-file .env ps compiler
docker compose --env-file .env logs --tail=200 compiler
docker compose --env-file .env exec compiler kpsewhich brazilian.ldf
```

Um pacote LaTeX ausente, uma ferramenta externa faltando, um erro do documento, falta de memória e timeout têm causas diferentes. Veja [Troubleshooting](TROUBLESHOOTING.md) antes de alterar o container ou apagar qualquer volume.
