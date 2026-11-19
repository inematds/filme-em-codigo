# Goal — motores-biblioteca

- **Início:** 2026-11-19 15:11 · **Agente:** Claude (sessão do Nei + subagentes em lotes de 3)
- **Tetos:** 3 renders em paralelo · 8 GB por render · sem GPU · sem rede · sem TTS/modelo

## Resultado
43 motores novos em `exemplos/biblioteca/<motor>/` cobrindo os 51 filmes feitos em código da fonte
(mapa em `mapa.md`), mais o anexo com todo o conteúdo da fonte e o guia com galeria de exemplos,
referências e página da fonte (PT/EN/ES).

## Pedido do Nei (19/11/2026, citado)
- "faz motor de exemplo para os 55 estilos, tambem quero uma anaxo com todos os conteudo da fonte, pois foi liberado entao posos usar"
- "coloca no guia exem,plos e referencia e uma pagina apra todos coneudos da fonte"

## Critérios de pronto
**Função**
- [ ] `ls -d exemplos/biblioteca/*/ | wc -l` → 43
- [ ] `ls exemplos/biblioteca/*/historia*.json | wc -l` → ≥ 51, e cada pasta tem `motor.js`, `index.html`, `quadro*.jpg`, `medida*.json`
- [ ] `node tests/testes.mjs` → 0 FALHA, com uma linha "ok" de render para cada um dos 43 motores
- [ ] `guia/exemplos.html`, `guia/fonte.html` (e `en/`, `es/`) existem e linkam os 43 motores

**Regressão**
- [ ] os 4 motores antigos continuam com o mesmo `hash_quadros` da `medida.json`

**Limite**
- [ ] `grep -rE "https?://" exemplos/biblioteca` → vazio (sem rede)
- [ ] nenhum MP4/WAV/PNG no `git ls-files` (salvo o que o Nei aprovar para o anexo)
- [ ] nenhum TTS, modelo local ou API usado

**Teste rápido por motor:** `node ferramentas/render.mjs exemplos/biblioteca/<m> --quadros 1,90,180`
**Teste completo:** `bash tests/rodar.sh`
