# Pedido ao Codex — polimento dos motores da biblioteca (20/11/2026)

Projeto: `~/projetos/filme-em-codigo` (leia `CLAUDE.md`, `LESSONS.md` e `longrun/2026-11-19-motores-biblioteca/state.md` antes).
O Nei aprovou seguir com as correções apontadas por uma revisão independente das folhas de contato.

## Entrada
- Revisão (JSON, 51 filmes, nota + defeitos + sugestões por filme): `~/projetos/output/filme-em-codigo/folhas-2026-11-20/revisao-todas.json`
- Folhas de contato que o revisor viu: `~/projetos/output/filme-em-codigo/folhas-2026-11-20/folhas/<motor>-<historia>.jpg`
  Cada folha = 12 quadros do filme inteiro em 360 px; "quadro N" (1–12) do revisor ≈ tempo `(N-1)/11 × duração` (script: `longrun/2026-11-19-motores-biblioteca/conferir-tudo.sh`).

## Método (por filme, do de menor nota para o de maior)
1. Para cada defeito, renderize o quadro real naquele tempo (`node ferramentas/render.mjs exemplos/biblioteca/<m> --historia <h>.json --quadros <n>` em tamanho pequeno) e OLHE.
2. Classifique: **REAL** (o espectador veria como erro) ou **AMOSTRAGEM** (a folha pegou um instante de transição normal: contador ainda contando, legenda sendo escrita letra a letra, fusão no meio). AMOSTRAGEM não se corrige; só anote.
   Exceção: legenda que já mostra o número final enquanto o contador ainda conta é REAL só se durar mais de ~1 s; então sincronize (legenda entra quando o contador chega).
3. Corrija os REAIS na história (`historia*.json`) quando for dado/tempo/texto, ou no `motor.js` quando for desenho. A mesma história do Gêngis Khan aparece em 14 motores: "1 EM 12" deve MOSTRAR a proporção (12 figuras, 1 destacada, nenhuma cortada pela borda) em todos eles.
4. Prioridade: (a) números que contradizem a legenda; (b) "1 em 12" sem proporção; (c) texto/carimbo cortado pela borda ou palavra pela metade parada; (d) contraste baixo de dado, mapa ou personagem; (e) personagem ilegível (rosto/silhueta). Sugestões dos filmes com nota ≥ 8 só se forem triviais.
5. Depois de corrigir um motor: rode o filme inteiro em 360 px com 1 e com 3 trabalhadores e confira que os `quadros.sha256` são iguais (como em `conferir-tudo.sh`); refaça a folha dele em `~/projetos/output/filme-em-codigo/folhas-2026-11-20b/folhas/` (mesmo nome); refaça `quadro*.jpg` e `medida*.json` do jeito que os outros foram feitos (veja `progress.md` e um `medida.json` existente; render final na resolução da medida). Renders pesados SEMPRE por `~/projetos/wifi/scripts/fila-vaga render filme-em-codigo-polimento -- <cmd>`, um de cada vez.

## Regras (não negociáveis)
- Motor sem rede, modelo, API nem TTS; a história fica no JSON, não no motor. Não commitar MP4, PNG nem WAV.
- Não mexer nos 4 motores antigos (`exemplos/camadas-planas`, `fundo-pintado`, `cena-3d`, `marionete`).
- `bash tests/rodar.sh` → 0 FALHA no fim (hoje: 227 ok).
- Commits pequenos (um por grupo de motores), autor `inematds <inematds@gmail.com>`, mensagem terminando com `Co-Authored-By: Codex <noreply@openai.com>`. Push para origin/main no fim, só com os testes verdes.
- Se mudar algum `quadro*.jpg`, rode `node ferramentas/galeria.mjs` e commite o guia junto.
- Lição nova no TOPO do `LESSONS.md`; falha corrigida em uma linha no `FALHAS.md`.

## Relatório (grave em `longrun/2026-11-19-motores-biblioteca/polimento-2026-11-20.md` e repita no fim da resposta)
Tabela: filme | defeito do revisor | REAL/AMOSTRAGEM | o que foi feito | hash 1×3 igual?
Mais: resultado de `bash tests/rodar.sh`, hashes dos commits, o que ficou de fora e por quê.
