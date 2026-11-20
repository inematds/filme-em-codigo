# Estado · 20/11/2026

A biblioteca aprovada pelo Nei contém 43 motores e 51 filmes. A rodada final corrigiu os quatro filmes pedidos e conferiu as seis histórias de desenho-3d. Os oito pares de renders 1×3 foram idênticos. A suíte offline terminou com 227 passaram, 0 falharam.

Os Releases [fonte-v1](https://github.com/inematds/filme-em-codigo/releases/tag/fonte-v1) e [exemplos-v1](https://github.com/inematds/filme-em-codigo/releases/tag/exemplos-v1) contêm 55 e 51 MP4, respectivamente. Os três guias incluem o vídeo em cada cartão.

[Relatório, contagens por filme e testes de reprodução](final-2026-11-20.md)

## Histórico · plano de 19/11/2026

- FEITO: 43 motores em exemplos/biblioteca/ (51 filmes), todos com motor.js, historia*.json, quadro*.jpg, medida*.json, LEIA.md.
- FEITO: anexo-fonte/ (original EN + PT em 6 partes, 55 miniaturas, LEIA.md com crédito a AI Samson).
- FEITO: tests/testes.mjs bloco 6 (biblioteca) — AINDA NÃO RODOU.
- Decisões do Nei: crédito ao autor no anexo/página da fonte; vídeos (fonte + nossos) em GitHub Release.

### Plano registrado naquela data
1. Passada baixa: cada uma das 51 histórias, filme inteiro em 360x640 com 1 e 3 navegadores, comparar quadros.sha256 + folha de contato. Rodar `bash tests/rodar.sh`.
2. Revisor independente (runbook revisor-independente) sobre as folhas de contato → lista de polimento.
   Correções obrigatórias: tinta-na-agua (conta `ui`, grou), acetato-classico raposa.js:135 (scale(1/e,e) se estica<0),
   pastel-oleoso (lanterna sai do quadro 5,8–7 s), e-se-3d (visor +0,04 p/ frente, capa 540), rolo-nanquim (chapéu cônico → gorro mongol),
   retro-futuro (render final em 1080x1920), anime-3d-cel (determinismo após última correção), explicativo-luz (rótulos duplicados),
   retrato-ilustrado (rosto), voxel (rosto escuro), voo-raymarch (planeta escondido até sair do cânion).
3. Passada de medida limpa, sozinha na máquina (medir-tudo.sh cobrir biblioteca?), refazer medida/capa/linha do LEIA.md; MP4s para o Release.
   grep em cada motor.js por título/legendas da própria história (motor não pode ter história dentro).
4. Conferir .github/workflows (Pages publica raiz ou guia/?). Criar Release fonte-v1 (nomes = lista.txt) e exemplos-v1; testar <video src=release>.
5. Guia: exemplos.html (galeria 43/51), página da fonte, referências; PT/EN/ES (ES do anexo via anexo.py no scratchpad/anexo). README PT/EN/ES + "O processo". Revisor independente do guia.
6. Avisar o Nei antes do push: o texto literal da fonte cita estúdios/canais reais ("Ghibli-like", "Vox-style"…); ampliar a exceção no CLAUDE.md para o nome do filme nos LEIA.md.
7. LIMITES.md: rm negado no scratchpad (12 GB).
