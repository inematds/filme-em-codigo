# Handoff — 2026-11-20 — biblioteca no guia, polimento pelo Codex, 2ª revisão nota 7; aguarda decisão do Nei

## Projeto e escopo
Kit filme-em-codigo (`~/projetos/filme-em-codigo`): 43 motores / 51 filmes em `exemplos/biblioteca/`, anexo da fonte em `anexo-fonte/`. Nesta sessão também nasceu o projeto irmão `inematds/filmes-em-codigos-lib` (publicado, fechado).

## Estado aceito
- [confirmed] Seção #biblioteca no guia PT/EN/ES (43 motores, 51 filmes, ▶ assistir no navegador + receita, cartão da fonte AI Samson) — commit deb7459, gerada por `ferramentas/galeria.mjs` + `guia/biblioteca-i18n.json`.
- [confirmed] Nei decidiu: MANTER os nomes de estúdios/canais do texto literal da fonte no anexo.
- [confirmed] `bash tests/rodar.sh` → 227 ok, 0 falhas (antes e depois do polimento).
- [confirmed] Folhas refeitas: `~/projetos/output/filme-em-codigo/folhas-2026-11-20/` (51/51 iguais 1×3).
- [confirmed] 1ª revisão independente (Codex gpt-6.2-astra, read-only, 4 lotes, prompt `longrun/2026-11-19-motores-biblioteca/revisor-folhas.md`) → reprovado nota 7; registrada no revisor-nota.py e revisor-falhas.md.
- [confirmed] Polimento pelo Codex gpt-6.2-astra (pedido `longrun/2026-11-19-motores-biblioteca/pedido-polimento.md`): ~30 defeitos REAIS corrigidos, AMOSTRAGEM anotada; 12 commits, push até 33dae0d; relatório `longrun/2026-11-19-motores-biblioteca/polimento-2026-11-20.md`; folhas novas em `~/projetos/output/filme-em-codigo/folhas-2026-11-20b/`.
- [confirmed] 2ª revisão (Codex novo) nas 43 folhas polidas → reprovado nota 7; média 6,95 → 7,26 (21 subiram, 8 caíram); registrada. JSON: `~/projetos/output/filme-em-codigo/folhas-2026-11-20b/revisao-todas.json`.

## Decisões
- Biblioteca fica no mesmo repo (Nei sugeriu repo novo; recomendei manter por causa do `comum/`; ele seguiu).
- Testes = script fixo rodado por mim; Codex Astra = revisor das folhas e executor do polimento.
- Revisor repete falsos positivos de amostragem (contador em contagem: papiro-ouro 2.058→2.530); regra "defeito pequeno: deixa rodar" vale.

## Não fazer
- Não commitar MP4/PNG/WAV; motor sem rede/modelo/TTS; não mexer nos 4 motores antigos.
- Não perguntar com AskUserQuestion; não cutucar Vercel.

## Pergunta aberta ao Nei (sem resposta)
Fazer só uma rodada curta nos 4 piores com defeito real — desenho-3d (Gêngis) parece recorte e não 3D (nota 5); dados-3d contraste do mapa/barras; caixa-sombra legenda sobre o polvo; desenho-3d receita mãos queimadas iguais — e encerrar a revisão, ou outra rodada completa até aprovar?

## Pela metade / próximos
1. Resposta acima → rodada curta (Codex, mesmo método do pedido-polimento) + refazer folhas desses 4 + revisor novo só neles.
2. Releases `fonte-v1` e `exemplos-v1` (ainda NENHUM release; links do `anexo-fonte/LEIA.md` dão 404).
3. Perguntas abertas ao Nei: pôr no `REFERENCIAS.md` os repos novos (lemo-opuscar, claude-animated-shorts, golden-temple, napali, leviathan, athenaion, escapement, cook, infinigen, path tracers)? Testar motor "realista" (three.js + path tracing)?
4. README PT/EN/ES + "O processo" mencionando a biblioteca e `ferramentas/galeria.mjs`.

## Projeto irmão (fechado)
filmes-em-codigos-lib: repo inematds/filmes-em-codigos-lib ff9d21a, guia https://inematds.github.io/filmes-em-codigos-lib/guia/ PT/EN/ES; portal 76457f9 · inemabuscas b03bb6a · PRO 60e5d7c; INEMA.VIBE https://t.me/c/3650752323/4240 (MENU 4254). Memória: project_filmes_em_codigos_lib.md.

## Estado em execução
Nenhum processo em segundo plano. main = origin/main (33dae0d + este handoff).

## Próxima ação exata
Ler a resposta do Nei à pergunta aberta; se "rodada curta", mandar ao Codex um pedido no formato do `pedido-polimento.md` restrito aos 4 filmes.


<!-- handoff-estado:inicio -->
## Estado gravado pelo script (não editar)

Gravado por handoff-grava.py no momento do handoff. `--conferir` compara com o projeto agora.

- commit: 33dae0de1e1dbef3f9fef0c424b9b93d81a5a7f4 · branch: main
- arquivos sujos fora de handoffs/: 0
- `ferramentas/galeria.mjs` · sha256:f3f8c916fe9a · citado
- `guia/biblioteca-i18n.json` · sha256:c16a9221bed0 · citado
- `longrun/2026-11-19-motores-biblioteca/revisor-folhas.md` · sha256:e2a6ff768044 · citado
- `longrun/2026-11-19-motores-biblioteca/pedido-polimento.md` · sha256:564e2bd90444 · citado
- `longrun/2026-11-19-motores-biblioteca/polimento-2026-11-20.md` · sha256:14919c33087f · citado
- `anexo-fonte/LEIA.md` · sha256:3b980c0a9ba5 · citado
- `REFERENCIAS.md` · sha256:a9b6df7e3181 · citado
<!-- handoff-estado:fim -->
