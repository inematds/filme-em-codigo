# Pedido ao Codex — rodada final + Releases (20/11/2026)

Projeto `~/projetos/filme-em-codigo` (leia `CLAUDE.md`, `LESSONS.md`, `longrun/2026-11-19-motores-biblioteca/polimento-2026-11-20.md`).
O Nei aprovou a biblioteca como está, com UMA rodada curta nos 4 filmes abaixo. Não faça outras correções.

## Parte 1 — 4 correções (mesmo método do polimento: veja o quadro real antes, corrija só o REAL)
Revisão: `~/projetos/output/filme-em-codigo/folhas-2026-11-20b/revisao-todas.json`; folhas em `.../folhas-2026-11-20b/folhas/`.
1. `desenho-3d` / `historia.json` (Gêngis Khan): o protagonista parece recorte chapado com contorno preto; o estilo é cartoon 3D. Dê volume (sombreamento/luz de forma, sem contorno preto grosso) ao personagem, sem mudar as outras 5 histórias do motor além do necessário (confira as 6 com 1×3).
2. `dados-3d`: contorno do mapa que some na grade escura e valor da barra "Romano" ilegível.
3. `caixa-sombra`: legenda dos corações atravessa os olhos do polvo e some no papel avermelhado.
4. `desenho-3d` / `historia-receita.json`: "mãos queimadas" — as mãos precisam mostrar a queimadura (cor/curativo/fumaça), sem gore.
Depois: 1×3 igual, folha nova em `~/projetos/output/filme-em-codigo/folhas-2026-11-20c/folhas/`, `quadro*.jpg` e `medida*.json` refeitos, `node ferramentas/galeria.mjs`, `bash tests/rodar.sh` → 0 FALHA.

## Parte 2 — GitHub Releases (API do GitHub liberada; use `gh`)
1. `fonte-v1`: os 55 vídeos da fonte em `~/projetos/output/explica-tPiEPzy2JKU/src/terceiros/biblioteca/v/`, com os nomes que `anexo-fonte/LEIA.md` e `anexo-fonte/biblioteca-*/*.md` usam nos links `releases/download/fonte-v1/<nome>.mp4`. Confira que todo link citado tem arquivo no Release (liste os que faltarem). Notas do release: crédito "Made by AI Samson. Films and prompts free to use as a starting point for your own work." + link para `anexo-fonte/LEIA.md`.
2. `exemplos-v1`: os 51 MP4 finais dos motores da biblioteca (render final na resolução da `medida*.json`; se os arquivos não estiverem mais em disco, renderize de novo pela `fila-vaga render`). Nome: `<motor>-<historia>.mp4` (historia sem `.json`). Se algum passar de 50 MB, recomprima com ffmpeg (H.264 CRF 23–26, sem mudar resolução); o motor não muda.
3. Teste: `curl -sIL` de 3 URLs de cada Release → 200, e um `<video src>` do Release tocando (pode ser só o `curl` do content-type video/mp4).
4. No guia (`ferramentas/galeria.mjs`), em cada cartão, acrescente um link "vídeo" para `https://github.com/inematds/filme-em-codigo/releases/download/exemplos-v1/<motor>-<historia>.mp4` (texto traduzido em `guia/biblioteca-i18n.json` → ui.video: PT "vídeo", EN "video", ES "video"); rode o gerador nas 3 línguas.

## Regras
Sem MP4/PNG/WAV no git. Não mexer nos 4 motores antigos. Commits autor `inematds <inematds@gmail.com>`, mensagem com `Co-Authored-By: Codex <noreply@openai.com>`. Push no fim com testes verdes. Atualize `longrun/2026-11-19-motores-biblioteca/state.md` (o que ficou pronto) e grave o relatório em `longrun/2026-11-19-motores-biblioteca/final-2026-11-20.md`.

## Relatório final
O que mudou nos 4 filmes (com 1×3), testes, URLs dos 2 Releases com a contagem de arquivos, links faltando, commits.
