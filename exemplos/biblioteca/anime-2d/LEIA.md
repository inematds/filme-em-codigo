# anime-2d

**O estilo.** Anime japonês 2D de cinema: céu de verão saturado, nuvens enormes em três tons
chapados, cidade pintada em tinta-pôster com sombra azul-lilás e marca leve de pincel, e a personagem
em acetato (contorno fino marrom, cor chapada, um tom de sombra de borda dura e um brilho). Por
cima vem a "fotografia" do anime: brilho nas partes claras, reflexo de lente, luz quente vazando
de um canto, vinheta e grão fino.

**Como funciona.** Jeito fundo-pintado, com câmera multiplano. Cada cenário ("mundo") é pintado
UMA vez, em camadas de profundidade (`fundos.js`); a câmera anda e as camadas de longe andam
menos. A menina e a bicicleta (`menina.js`) são desenhadas a cada quadro, em três vistas: de lado
na bicicleta, de costas e de frente (o close dos olhos é a vista de frente com a câmera bem
perto). A personagem muda de pose de 2 em 2 quadros, os efeitos (pétalas, capim, linhas de
velocidade, pássaros) de 3 em 3, e a câmera é lisa. Cabelo, laço, gola e saia continuam o
movimento depois que o corpo para. As letras do título são traços (`letras.js`, cópia do motor
quadro-negro), sem fonte instalada.

**O filme.** Uma menina desce a ladeira de bicicleta, o sinal da passagem de nível começa a
piscar e a cancela desce, ela freia e põe o pé no chão, o trem passa rasgando na frente dela,
os olhos dela apertam, piscam e se abrem com o mar refletido, ela olha para o céu e sorri, e a
câmera sobe sobre a cidade, o mar e a nuvem gigante enquanto a cancela levanta. São 10 s em 16:9
(1920x1080), 7 planos, sem fala: na tela só o título no começo. O som é todo feito em código:
piano e pads, cigarras, o sino da passagem (na mesma conta da luz que pisca), o trem, o vento e
o mar.

**Trocar a história.** Tudo o que muda fica em `historia.json`:
- `planos`: a lista de cortes (de, até, tipo, mundo, câmera, ações do rosto, pétalas, sol);
- `mundos`: cada cenário, com as `camadas` (fator de profundidade, tamanho, desfoque) e a lista
  de `pecas`, cada uma com lugar (céu, nuvem, morro, casas, muro, rua, postes, mar, trilhos,
  cidade, estrada, sinal, cancela, trem, capim, aves, menina);
- `andar` (de onde a bicicleta sai, a velocidade e quando freia), `sinal` (quando pisca e o
  ritmo do sino), `cancela` (quando desce e sobe), `trem` (quando chega, velocidade, carros, cores);
- `cores`, `menina` (cabelo, laço, gola, saia, olhos), `bicicleta`, `titulo`, `tituloNaTela`, `musica`.

```bash
node ferramentas/render.mjs exemplos/biblioteca/anime-2d --historia minha-historia.json
```

**De onde saiu.** Do filme "Level Crossing, Summer" (estilo "2D anime film") da biblioteca de
estilos da fonte. A menina, a cidade e o trem daqui são desenhos novos e genéricos, sem letra nem
marca em placa, trem ou casa.

**Tempo de render medido** (`medida.json`): 44,43 s para 10 s de filme (300 quadros, 117,7 ms por
quadro, 3 navegadores, sem GPU). O MP4 tem 44,06 MB (o grão muda a cada 2 quadros e pesa).

**Falta polir** (achado depois da 3ª rodada, não corrigido):
- a textura de pincel é fraca: telhados, rua e muros parecem mais vetor chapado do que a tinta-pôster grossa do filme da fonte;
- no plano do sinal, a cancela já baixada fica rente à borda de baixo e aparece cortada;
- a cidade vista do alto sai em fileiras certinhas demais, quase uma grade;
- os braços na vista de costas são retos, como varetas, e a menina de lado fica pequena no quadro;
- no close dos olhos a sobrancelha fica pesada e dá um ar mais bravo que surpreso;
- a fonte tem 8 planos; aqui são 7 (o "trem sai e mostra o mar" acontece dentro do plano de costas);
- ficaram de fora o tremor de calor e a franja de cor da "fotografia"; o piano é um sino macio, não um piano de verdade.
