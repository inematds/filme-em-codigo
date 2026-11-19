# xilogravura

**O estilo.** Parece uma gravura japonesa em madeira que ganhou vida: formas chapadas em
azul-da-prússia, anil, azul-acinzentado, creme e um vermelho, com contorno preto, veio da madeira
dentro das cores e papel de borda rasgada. Cada impressão fica 2 quadros na tela, como uma gravura
sendo reimpressa a cada passo, e nada finge ser 3D.

**Como funciona.** O motor desenha a cena quatro vezes, uma por tábua (tinta clara, tinta funda,
traço preto e vermelho), em tons de cinza: são as "chapas". Depois um shader "imprime" as chapas no
papel: põe o veio da madeira e a tinta desigual em cada cor, desencontra um pouco as tábuas e
desenha a fibra e a borda da folha. Espuma, cascos e nuvens são "vazados": nenhuma tábua imprime
ali, e aparece o papel. As letras do título são desenhadas em traços (`letras.js`, cópia das letras
do motor quadro-negro), e por isso não dependem de fonte instalada.

**O filme.** Três barcos de pesca enfrentam a tempestade. Uma onda gigante sobe, se enrola com
garras de espuma e desaba, e o céu abre num sol vermelho. São 9 s em 16:9 (1920x1080), sem fala:
na tela só aparece o título no começo. O som é todo feito em código: mar, chuva, taiko, madeira e
flauta.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, as 5 tintas, o papel e a
mesa, quanto tempo cada impressão fica (`segurar`), a câmera, a altura do horizonte, os tempos
(tempestade, céu abrindo, mar acalmando) e a lista de `pecas`, cada uma com lugar e tempo. As peças
são céu, sol (onde fica e quando sobe), nuvens, montanha (picos), pássaros, mar (faixas de onda com
altura, comprimento e velocidade), barcos (em qual faixa, tamanho e remadores), onda gigante (onde
fica e quando sobe, enrola, quebra e espuma), chuva e título. Também ficam lá as cores das roupas e
as notas da flauta. Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/xilogravura --historia minha-historia.json
```

**De onde saiu.** Do filme "Storm at Sea" (estilo "Animated woodblock print") da biblioteca de
estilos da fonte. A montanha, os barcos e a onda daqui são desenhos novos e genéricos.

**Tempo de render medido** (`medida.json`): 36,9 s para 9 s de filme (270 quadros, 117 ms por
quadro, 3 navegadores, sem GPU). O MP4 tem 13,4 MB.
