# Handoff — 2026-11-19 — 43 motores da biblioteca de prompts prontos; falta conferir, polir, guia, Release e push

## Projeto e escopo
Kit filme-em-codigo, raiz `~/projetos/filme-em-codigo`. Pedido do Nei: "faz motor de exemplo para os 55 estilos", um anexo com todo o conteúdo da fonte (liberada pelo autor) e, no guia, exemplos, referências e uma página com todo o conteúdo da fonte. Os 55 vídeos viraram 43 motores (um por estilo) para 51 filmes; os 4 vídeos do Seedance só entram no anexo.

## Objetivo atual
Fechar a entrega: conferir os 51 filmes, polir os fracos, medir limpo, publicar os vídeos em GitHub Release, fazer o guia (PT/EN/ES) e o push. O critério de pronto está em `longrun/2026-11-19-motores-biblioteca/goal.md`.

## Estado aceito
- [confirmed] 43 pastas em `exemplos/biblioteca/`, cada uma com motor, histórias, capa, medida e LEIA — evidência: commit d6bc9c6; `ls -d exemplos/biblioteca/*/ | wc -l` → 43
- [confirmed] Anexo da fonte (original EN e PT em 6 partes, 55 miniaturas, LEIA com crédito ao autor AI Samson) — arquivo: `anexo-fonte/LEIA.md` — evidência: commit d6bc9c6
- [confirmed] Bloco 6 da biblioteca em `tests/testes.mjs` — evidência: commit d6bc9c6 (o teste ainda não rodou)
- [confirmed] Exceção de crédito no `CLAUDE.md` — evidência: commit d6bc9c6

## Proposto / tentado, não confirmado
- [unverified] O determinismo de cada motor foi conferido pelo próprio agente que o fez. Os 10 primeiros conferiram só um trecho do filme, e o anime-3d-cel não reconferiu depois da última correção.
- [unverified] Os `medida.json` foram tirados com até 9 navegadores disputando a máquina, sem pico de memória. O retro-futuro foi medido em 360x640.

## Decisões
- Um motor por estilo e uma `historia-*.json` por filme — mapa em `longrun/2026-11-19-motores-biblioteca/mapa.md`
- Sem voz: a fala vira legenda, com som feito em código — TTS seria modelo local não aprovado
- Estilos "parecidos com" obras reais viram versões genéricas
- Crédito ao autor no anexo e na página da fonte — Nei, gravado em `longrun/2026-11-19-motores-biblioteca/decisions.md`
- Vídeos (fonte + os nossos) vão para GitHub Release, não para o repo — Nei, em `decisions.md`
- O MP4 pesado por causa do grão fica como está no motor; só é recomprimido para o Release
- Gêngis Khan usa gorro de pele mongol, nunca chapéu cônico

## Não fazer (restrições e travas)
- Não commitar MP4, PNG nem WAV — fonte: `CLAUDE.md`
- Nada de rede, modelo, API ou TTS nos motores — fonte: `CLAUDE.md`, `longrun/2026-11-19-motores-biblioteca/brief-motor.md`
- `desenhar(t)` é conta pura; o motor não guarda a história — fonte: `CLAUDE.md`
- Commits com autor inematds; push só ao fechar e depois de avisar o Nei sobre os nomes de estúdios e canais no texto da fonte — fonte: `longrun/2026-11-19-motores-biblioteca/state.md`
- Não cutucar o Vercel; não usar AskUserQuestion (perguntar em texto) — fonte: `~/.claude/CLAUDE.md`
- README e guia em PT/EN/ES pelo `inema-traduz` — fonte: `CLAUDE.md`

## Arquivos alterados
- `exemplos/biblioteca/` (43 motores) — novo
- `anexo-fonte/` — novo
- `tests/testes.mjs` — bloco 6 da biblioteca
- `CLAUDE.md` — exceção de crédito
- `LESSONS.md`, `FALHAS.md` — lições e falhas dos agentes
- `longrun/2026-11-19-motores-biblioteca/` — goal, mapa, brief-motor, prompt-14, roteiro-14-estilos, state, progress, decisions, canal
- Fora do projeto: scratchpad da sessão (12 GB de tiras e MP4; `rm` foi negado) e `~/projetos/output/explica-tPiEPzy2JKU/src/terceiros/biblioteca/` (a fonte, só leitura)

## Memória e regras duráveis tocadas
- `CLAUDE.md` (exceção de crédito) e `LESSONS.md` (cerca de 40 lições novas no topo)

## Verificação
- Rodado: `git commit` → d6bc9c6 (448 arquivos)
- Rodado: `ls -d exemplos/biblioteca/*/ | wc -l` → 43
- Não rodado: `bash tests/rodar.sh` (o bloco novo nunca rodou)
- Não rodado: passada de determinismo no filme inteiro dos 51 filmes
- Não rodado: revisor independente

## Estado em execução
- Processos em segundo plano: nenhum (os agentes de motor terminaram)
- Servidores / portas: nenhum
- Worktrees / branches abertos: nenhum (main, 1 commit à frente do origin)

## Perguntas abertas e adiados
- Aberta: o texto literal da fonte cita estúdios e canais reais ("Ghibli-like", "Vox-style", "Johnny Harris-style", "Kurzgesagt-like"). Publicar assim? Perguntar ao Nei antes do push.
- Adiado: polimento dos motores fracos — lista em `longrun/2026-11-19-motores-biblioteca/state.md`

## Pela metade
- Fechamento — parou em: commit de checkpoint — falta: passos 1–7 do `state.md`

## Próxima ação exata
Passo 1 do `state.md`. Renderizar cada uma das 51 histórias no filme inteiro em 360x640, com 1 e com 3 navegadores, comparar `quadros.sha256`, montar folhas de contato e rodar `bash tests/rodar.sh`. Não precisa de aprovação (é local).

## Mapa de retomada
- `longrun/2026-11-19-motores-biblioteca/state.md` — próximos passos e lista de polimento
- `longrun/2026-11-19-motores-biblioteca/mapa.md` — 43 motores → 51 filmes
- `longrun/2026-11-19-motores-biblioteca/progress.md` — o que cada motor deixou para polir
- `longrun/2026-11-19-motores-biblioteca/brief-motor.md` e `prompt-14.md` — como os motores foram feitos
- `anexo-fonte/LEIA.md` — anexo e URLs do Release

## Perguntas-teste
1. Qual é a tarefa atual e o critério de pronto? → fechar os 43 motores (conferir, polir, medir, guia, Release, push) — fonte: `longrun/2026-11-19-motores-biblioteca/goal.md` — chave: `43`
2. Qual foi a última decisão e por quê? → vídeos vão para GitHub Release, não para o repo — fonte: `longrun/2026-11-19-motores-biblioteca/decisions.md` — chave: `Release`
3. O que não pode mudar? → nada de MP4/PNG/WAV no git; motor sem rede, modelo nem TTS — fonte: `CLAUDE.md` — chave: `MP4`
4. O que está pela metade? → passos 1–7 do fechamento — fonte: `longrun/2026-11-19-motores-biblioteca/state.md` — chave: `determinismo`
5. Qual é a próxima ação, e precisa de aprovação? → passada de determinismo no filme inteiro dos 51 filmes + `tests/rodar.sh`; não precisa — fonte: `longrun/2026-11-19-motores-biblioteca/state.md` — chave: `360x640`

## Checagem de compartilhamento
- Sem segredos, tokens, cookies, dados pessoais ou endpoints privados: sim


<!-- handoff-estado:inicio -->
## Estado gravado pelo script (não editar)

Gravado por handoff-grava.py no momento do handoff. `--conferir` compara com o projeto agora.

- commit: d6bc9c6a1c20986050c65df4b4e60d8ee6ae5405 · branch: main
- arquivos sujos fora de handoffs/: 0
- `longrun/2026-11-19-motores-biblioteca/goal.md` · sha256:740c200d2399 · citado
- `anexo-fonte/LEIA.md` · sha256:3b980c0a9ba5 · citado
- `tests/testes.mjs` · sha256:db4bd1c394e0 · citado
- `CLAUDE.md` · sha256:179f62a57e79 · citado
- `longrun/2026-11-19-motores-biblioteca/mapa.md` · sha256:16103476ee6a · citado
- `longrun/2026-11-19-motores-biblioteca/decisions.md` · sha256:e3fbd19b364a · citado
- `longrun/2026-11-19-motores-biblioteca/brief-motor.md` · sha256:b5c9c800732b · citado
- `longrun/2026-11-19-motores-biblioteca/state.md` · sha256:20631b6d74f2 · citado
- `LESSONS.md` · sha256:8a11b1e2a879 · citado
- `FALHAS.md` · sha256:51e0afc9a14a · citado
- `longrun/2026-11-19-motores-biblioteca/progress.md` · sha256:279da1235690 · citado
- `tests/rodar.sh` · sha256:1e148d076430 · citado
<!-- handoff-estado:fim -->
