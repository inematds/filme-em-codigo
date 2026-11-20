# Handoff — 2026-11-19 — 43 motores conferidos (51/51 com mesmos quadros); falta revisor, polimento, medida, guia, Release e push

## Projeto e escopo
Kit filme-em-codigo, na raiz `~/projetos/filme-em-codigo`. Pedido do Nei: um motor de exemplo para cada estilo dos 55 vídeos da fonte, um anexo com todo o conteúdo da fonte (liberada pelo autor, com crédito), e no guia os exemplos, as referências e uma página da fonte. Os 55 vídeos viraram 43 motores para 51 filmes; os 4 do Seedance ficam só no anexo.

## Objetivo atual
Fechar a entrega. O critério de pronto está em `longrun/2026-11-19-motores-biblioteca/goal.md`; os passos 2–7 estão em `longrun/2026-11-19-motores-biblioteca/state.md`.

## Estado aceito
- [confirmed] 43 motores em `exemplos/biblioteca/` e o anexo em `anexo-fonte/` — evidência: commit d6bc9c6
- [confirmed] Passo 1: as 51 histórias saem idênticas com 1 e com 3 navegadores no filme inteiro (360 px) — evidência: `longrun/2026-11-19-motores-biblioteca/progress.md` (linha "PASSO 1 OK"); script em `longrun/2026-11-19-motores-biblioteca/conferir-tudo.sh`
- [confirmed] `bash tests/rodar.sh` deu 224 ok e 2 FALHA. As falhas eram do teste: os motores de 24 qps eram contados como 30. O teste foi corrigido para usar `med.fps` — evidência: commit 271a6f9

## Proposto / tentado, não confirmado
- [?] As 51 folhas de contato estavam no scratchpad da sessão, que não existe mais. O revisor vai precisar delas: refaça com `conferir-tudo.sh <pasta nova>` (32 min).
- [unverified] Os `medida.json` foram tirados com a máquina disputada, e o retro-futuro foi medido em 360x640.
- [?] A suíte inteira ainda não rodou depois da correção do fps.

## Decisões
- Um motor por estilo e uma `historia-*.json` por filme — fonte: `longrun/2026-11-19-motores-biblioteca/mapa.md`
- Sem voz, só legenda; estilos "parecidos com" obras reais viram versões genéricas; Gêngis Khan usa gorro de pele mongol
- Crédito ao autor no anexo e na página da fonte; os vídeos vão para GitHub Release — fonte: `longrun/2026-11-19-motores-biblioteca/decisions.md`
- O MP4 pesado por causa do grão não muda no motor; só é recomprimido para o Release

## Não fazer (restrições e travas)
- Não commitar MP4, PNG nem WAV — fonte: `CLAUDE.md`
- Motor sem rede, modelo, API nem TTS, e sem a história dentro — fonte: `CLAUDE.md`
- Push só depois de o Nei responder sobre os nomes de estúdios e canais no texto literal da fonte — fonte: `longrun/2026-11-19-motores-biblioteca/state.md` (passo 6)
- Não cutucar o Vercel; perguntar em texto, nunca com AskUserQuestion — fonte: `~/.claude/CLAUDE.md`
- README e guia em PT/EN/ES pelo `inema-traduz` — fonte: `CLAUDE.md`

## Arquivos alterados
- `exemplos/biblioteca/`, `anexo-fonte/`, `tests/testes.mjs`, `CLAUDE.md`, `LESSONS.md`, `FALHAS.md`, `longrun/2026-11-19-motores-biblioteca/` (inclui `conferir-tudo.sh`)
- Fora do projeto: nenhum durável (o scratchpad sumiu)

## Memória e regras duráveis tocadas
- `CLAUDE.md` (exceção de crédito) e `LESSONS.md` (cerca de 40 lições novas)

## Verificação
- Rodado: `conferir-tudo.sh` → 51/51 iguais com 1 e 3 navegadores, 1917 s
- Rodado: `bash tests/rodar.sh` → 224 ok, 2 FALHA (do teste, corrigido em 271a6f9)
- Não rodado: a suíte depois da correção, o revisor independente, a medida limpa

## Estado em execução
- Processos em segundo plano: nenhum
- Servidores / portas: nenhum
- Worktrees / branches abertos: nenhum (main, 3 commits à frente do origin, sem push)

## Perguntas abertas e adiados
- Aberta, ao Nei: deixar no anexo os nomes de estúdios e canais citados na fonte ("Ghibli-like", "Vox-style" etc.) ou trocar por descrições genéricas?
- Aberta, ao Nei: o pedido de /compact ficou sem resposta.

## Pela metade
- Fechamento — parou em: correção do teste — falta: passos 2–7 do `state.md`

## Próxima ação exata
Rodar `bash tests/rodar.sh` de novo (espera 0 FALHA). Depois refazer as folhas com `conferir-tudo.sh` e entregá-las a um revisor independente (`~/.claude/runbooks/revisor-independente.md`) para montar a lista de polimento. São ações locais e não precisam de aprovação.

## Mapa de retomada
- `longrun/2026-11-19-motores-biblioteca/state.md` — próximos passos e lista de polimento
- `longrun/2026-11-19-motores-biblioteca/progress.md` — o que cada motor deixou para polir
- `longrun/2026-11-19-motores-biblioteca/mapa.md` — 43 motores → 51 filmes
- `longrun/2026-11-19-motores-biblioteca/conferir-tudo.sh` — passada de determinismo e folhas
- `anexo-fonte/LEIA.md` — anexo e URLs do Release

## Perguntas-teste
1. Qual é a tarefa atual e o critério de pronto? → fechar os 43 motores (revisor, polimento, medida, guia, Release, push) — fonte: `longrun/2026-11-19-motores-biblioteca/goal.md` — chave: `43`
2. Qual foi a última decisão e por quê? → teste conta quadros pelo fps do motor (há motores de 24 qps) — fonte: commit 271a6f9 — chave: `fps`
3. O que não pode mudar? → nada de MP4/PNG/WAV no git; motor sem rede, modelo nem TTS — fonte: `CLAUDE.md` — chave: `MP4`
4. O que está pela metade? → passos 2–7 do fechamento — fonte: `longrun/2026-11-19-motores-biblioteca/state.md` — chave: `revisor`
5. Qual é a próxima ação, e precisa de aprovação? → rodar `tests/rodar.sh` de novo e refazer as folhas para o revisor; não precisa — fonte: `longrun/2026-11-19-motores-biblioteca/state.md` — chave: `rodar.sh`

## Checagem de compartilhamento
- Sem segredos, tokens, cookies, dados pessoais ou endpoints privados: sim


<!-- handoff-estado:inicio -->
## Estado gravado pelo script (não editar)

Gravado por handoff-grava.py no momento do handoff. `--conferir` compara com o projeto agora.

- commit: 271a6f91133ccdba18125d363ad9745aec844a7e · branch: main
- arquivos sujos fora de handoffs/: 0
- `longrun/2026-11-19-motores-biblioteca/goal.md` · sha256:740c200d2399 · citado
- `longrun/2026-11-19-motores-biblioteca/state.md` · sha256:20631b6d74f2 · citado
- `longrun/2026-11-19-motores-biblioteca/progress.md` · sha256:441c6c12485a · citado
- `longrun/2026-11-19-motores-biblioteca/conferir-tudo.sh` · sha256:e1e12ad0677f · citado
- `longrun/2026-11-19-motores-biblioteca/mapa.md` · sha256:16103476ee6a · citado
- `longrun/2026-11-19-motores-biblioteca/decisions.md` · sha256:e3fbd19b364a · citado
- `CLAUDE.md` · sha256:179f62a57e79 · citado
- `tests/testes.mjs` · sha256:ec39371593db · citado
- `LESSONS.md` · sha256:8a11b1e2a879 · citado
- `FALHAS.md` · sha256:51e0afc9a14a · citado
- `anexo-fonte/LEIA.md` · sha256:3b980c0a9ba5 · citado
- `tests/rodar.sh` · sha256:1e148d076430 · citado
<!-- handoff-estado:fim -->
