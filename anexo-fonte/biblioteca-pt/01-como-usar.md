<!-- Anexo da fonte (filme-em-codigo). Tradução para o português feita pelo tradutor central (inema-traduz). Original em inglês: ../biblioteca-original/01-como-usar.md. Crédito e licença: ../LEIA.md. -->

[← índice](../biblioteca-pt.md) · [original em inglês](../biblioteca-original/01-como-usar.md) · [crédito e licença](../LEIA.md)

> Tradução da biblioteca de prompts de **AI Samson**. Cada prompt vem traduzido e, logo abaixo, no original em inglês: o prompt em inglês costuma funcionar melhor no modelo.

# Biblioteca de prompts de vídeo do Claude

Todos os filmes aqui foram feitos pelo Claude escrevendo código, sem nenhum modelo de imagem ou vídeo. Copie um prompt, troque pela sua ideia e cole em um novo chat do Claude.

## Como usar esta biblioteca

Cada filme abaixo vem com o prompt que o criou. Copie um, acrescente sua própria ideia, e Claude cria o filme em código e entrega um MP4. Você não precisa de placa de vídeo, assinatura de vídeo nem saber programar.

*Crie um filme*

### Cinco etapas

Role para baixo, escolha o estilo de que mais gostar e reproduza o filme.

Clique em Copy em Same style, your idea. Para refazer o filme exatamente como está, abra Copy this exact film.

Abra uma nova conversa no Claude, escolha o modelo Fable 5.2 e cole o prompt.

Substitua [SUA IDEIA AQUI] pela sua ideia e envie. Por exemplo: Estamos no Lago de Como, no norte da Itália. Um personagem pequeno com um lenço vermelho na cabeça passeia de barco, que se move lentamente pela cena.

Aguarde enquanto Claude escreve a animação, confere alguns quadros de teste, faz ajustes, renderiza todos os quadros e adiciona o som. Um estilo detalhado pode levar até uma hora. Baixe o MP4 quando estiver pronto.

*Antes de começar*

### O que você precisa

Claude com execução de código e criação de arquivos ativadas em Configurações, para poder executar código e entregar o arquivo de vídeo.

Fable 5.2 gerou os melhores filmes nos meus testes. Outros modelos também funcionam.

Uma ideia em uma ou duas frases: quem está lá, onde e o que acontece.

### Dicas

Abra um novo chat para cada filme. Claude relê o chat inteiro a cada vez, então começar um chat novo reduz o custo.

Mude com palavras. No mesmo chat, peça “mais devagar”, “luz mais quente” ou “adicione chuva”. Claude edita o código, então o resto do filme continua igual.

Comece com 5 a 10 segundos. Filmes mais longos são possíveis, mas demoram mais para renderizar.

Sua própria arte: use o prompt Animate your own reference image em Start here.

Mais detalhes: passe um filme pronto pelo Seedance 2.5; veja With Seedance 2.5.

## Comece aqui

Três prompts para usar com qualquer filme abaixo. As palavras entre [COLCHETES] são as partes que você preenche.

*Etapa 1*

### Coloque isto antes de qualquer prompt

**Prefixo**

> Pegue o prompt a seguir e adapte-o para esta ideia: [SUA IDEIA]

<details><summary>Prompt original (inglês)</summary>

```text
Take the following prompt and then change it to this idea: [your idea]
```

</details>

*Sua própria arte*

### Anime sua própria imagem de referência

Anexe uma imagem que você criou e depois cole isto.

**Prompt**

> Anexei uma imagem de referência que criei. Transforme-a em um filme animado de [DURAÇÃO, por exemplo 8] segundos, em [PROPORÇÃO: 16:9 ou 9:16], no qual [O QUE ACONTECE]. Crie tudo em código e renderize em MP4. Não use nenhum modelo de imagem ou vídeo.
>
> Reproduza a imagem com a maior fidelidade possível. O primeiro quadro do filme deve ser muito parecido com ela: o mesmo personagem, com as mesmas proporções, rosto, cabelo, roupas e expressão, a mesma composição, as mesmas cores e o mesmo fundo.
>
> Primeiro, estude a imagem atentamente e me diga o que vê: a técnica (por exemplo, guache, marcador, giz de cera, vetor chapado, cel), a qualidade das bordas, o granulado e a textura, a espessura dos traços, a paleta em cores hexadecimais e como luz e sombra são simplificadas. Amplie o rosto, as mãos e as bordas antes de desenhar qualquer coisa.
>
> Como criar: redesenhe a arte em camadas 2D chapadas sobre telas, separando o personagem em partes que possam se mover (cabeça, olhos, sobrancelhas, boca, cabelo, braços, roupa). Depois, passe as camadas por um único shader que recrie a técnica (textura do papel, granulado do pigmento, bordas de tinta ou pincel, pequenas imperfeições). Anime como essa técnica seria animada à mão, a cada dois ou três quadros, redesenhando levemente a textura e os traços em cada novo desenho. Acrescente um movimento secundário, como o do cabelo ou da roupa. Cada quadro deve ser uma função pura do número do quadro.
>
> Se minha imagem não corresponder a essa proporção, estenda o fundo no mesmo estilo para preencher o quadro e mantenha o personagem exatamente como foi desenhado.
>
> Antes da renderização completa, mostre o primeiro quadro ao lado da minha imagem, diga com sinceridade o que ainda não corresponde e corrija. Repita até três vezes. Depois, renderize em 1080p (1920x1080 para 16:9, 1080x1920 para 9:16), a 30 fps, e adicione uma trilha musical sintetizada discreta, com pequenos sons nas ações visíveis.

<details><summary>Prompt original (inglês)</summary>

```text
I have attached a reference image that I made. Turn it into a [LENGTH, for example 8] second [ASPECT RATIO: 16:9 or 9:16] animated film in which [WHAT HAPPENS]. Build it entirely in code and render it to an MP4. Do not use any image or video model.

Copy the image as closely as you can. The first frame of the film should be a near match for it: the same character with the same proportions, face, hair, clothes and expression, the same composition, the same colours and the same background.

First, study the image closely and tell me what you see: the medium (for example gouache, marker, crayon, flat vector, cel), the edge quality, the grain and texture, the line weight, the palette as hex colours, and how light and shadow are simplified. Zoom into the face, the hands and the edges before you draw anything.

How to build it: redraw the artwork as flat 2D layers on canvases, with the character split into parts that can move (head, eyes, brows, mouth, hair, arms, cloth). Then pass the layers through one shader that recreates the medium (paper tooth, pigment grain, ink or brush edges, small imperfections). Animate it the way that medium is animated by hand, on twos or threes, with the texture and lines redrawn slightly on each new drawing. Add a secondary motion such as hair or cloth. Every frame must be a pure function of the frame number.

If my image does not match that aspect ratio, extend the background in the same style to fill the frame and keep the character exactly as drawn.

Before the full render, show me your first frame side by side with my image, say honestly what does not match yet, and fix it. Repeat that up to three times. Then render at 1080p (1920x1080 for 16:9, 1080x1920 for 9:16) at 30 fps and add a quiet synthesised music bed with small sounds on the visible actions.
```

</details>

*Storyboard*

### Prompt de grade para um modelo de imagem

Crie um storyboard de quatro quadros do seu personagem, depois entregue a grade ao Claude e peça que anime os quadros na ordem.

**Prompt**

> Crie uma grade de dois por dois apresentando este personagem. Conte uma história. Queremos vê-la primeiro em um close, depois em um plano médio dela [AÇÃO], depois em um close das mãos dela em [OBJETO] e, para terminar, [MOMENTO FINAL].

<details><summary>Prompt original (inglês)</summary>

```text
Create a two by two grid of this character showcasing them. Go through a story. We are looking to see her first in a close up, then a medium shot of her [ACTION], then a close up of her hands on [OBJECT], and finish with [FINAL BEAT].
```

</details>
