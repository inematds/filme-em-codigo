# risografia

**O estilo.** Parece uma impressão em risografia: quatro tintas (rosa fluorescente, azul, amarelo e
preto) em retícula de pontos, linhas e grão, uma sobre a outra, em papel creme, com as cores um pouco
fora do lugar, faixas do rolo e furinhos. Cada folha fica 2 ou 3 quadros na tela, então o filme treme
como um maço de impressões sendo folheado.

**Como funciona.** O motor desenha a cena quatro vezes, uma por tinta, em tons de cinza (as
"chapas"). Depois um shader "imprime" as chapas: cada tinta passa pela sua retícula e as tintas se
multiplicam onde se cruzam. É assim que a baleia aparece: ela só existe onde a luz amarela do farol
cai sobre o mar azul.

**O filme.** Um faroleiro sobe a escada, acende a lâmpada, o feixe varre o mar e revela uma baleia.
10 s, 16:9 (1920x1080), sem voz: as falas são legendas e o som é feito em código.

**Trocar a história.** Tudo o que muda fica em `historia.json`: título, legendas (texto e segundos),
as 4 tintas e o papel, quanto tempo cada folha fica na tela (`segurar`), os tempos (subir, acender,
feixe, cauda, jato), a câmera (pontos com segundo, x, y e zoom), a posição do farol, da baleia, da
lua e das nuvens, e as notas da música. Copie o arquivo, mude e rode:

```bash
node ferramentas/render.mjs exemplos/biblioteca/risografia --historia minha-historia.json
```

**De onde saiu.** Do filme "The Lighthouse" (estilo "Risograph print") da biblioteca de estilos da
fonte. O faroleiro e a baleia daqui são desenhos novos e genéricos.

**Tempo de render medido** (`medida.json`): 51,5 s para 10 s de filme (300 quadros, 143 ms por
quadro, 3 navegadores, sem GPU). O MP4 sai grande (cerca de 90 MB), porque a retícula muda a cada
folha e o vídeo não consegue comprimir bem.
