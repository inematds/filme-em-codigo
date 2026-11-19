<!-- Anexo da fonte (filme-em-codigo). Texto original em inglês, completo; só foi tirado o ruído da página (botões "Copy", menu de navegação). Tradução: ../biblioteca-pt/01-como-usar.md. Crédito e licença: ../LEIA.md. -->

[← index](../biblioteca-original.md) · [português](../biblioteca-pt/01-como-usar.md) · [credit and licence](../LEIA.md)

# Claude video prompt library

Every film here was made by Claude writing code, with no image or video model. Copy a prompt, swap in your own idea, and paste it into a new Claude chat.

## How to use this library

Every film below comes with the prompt that made it. Copy one, add your own idea, and Claude builds the film in code and hands you an MP4. You do not need a graphics card, a video subscription or any coding.

*Make a film*

### Five steps

Scroll down, pick a style you like and play its film.

Press Copy on Same style, your idea. To remake the film exactly as shown, open Copy this exact film instead.

Open a new chat in Claude, choose the Fable 5.2 model and paste the prompt.

Replace [YOUR IDEA HERE] with your idea, then send. For example: We are on Lake Como in northern Italy. A small character in a red head scarf rides a boat that moves slowly across the scene.

Wait while Claude writes the animation, checks a few test frames, fixes them, renders every frame and adds sound. A detailed style can take up to an hour. Download the MP4 when it is done.

*Before you start*

### What you need

Claude with code execution and file creation turned on in Settings, so it can run code and give you the video file.

Fable 5.2 gave the best films in my tests. Other models work too.

One idea in a sentence or two: who is there, where, and what happens.

### Tips

One new chat per film. Claude rereads the whole chat each time, so a fresh chat keeps the cost down.

Change it with words. In the same chat, ask for "slower", "warmer light" or "add rain". Claude edits the code, so the rest of the film stays the same.

Start at 5 to 10 seconds. Longer films are possible but take longer to render.

Your own art: use the Animate your own reference image prompt in Start here.

More detail: run a finished film through Seedance 2.5, see With Seedance 2.5.

## Start here

Three prompts to use with any film below. Words in [BRACKETS] are the parts you fill in.

*Step 1*

### Put this in front of any prompt

**Prefix**

```text
Take the following prompt and then change it to this idea: [your idea]
```

*Your own art*

### Animate your own reference image

Attach an image you made, then paste this.

**Prompt**

```text
I have attached a reference image that I made. Turn it into a [LENGTH, for example 8] second [ASPECT RATIO: 16:9 or 9:16] animated film in which [WHAT HAPPENS]. Build it entirely in code and render it to an MP4. Do not use any image or video model.

Copy the image as closely as you can. The first frame of the film should be a near match for it: the same character with the same proportions, face, hair, clothes and expression, the same composition, the same colours and the same background.

First, study the image closely and tell me what you see: the medium (for example gouache, marker, crayon, flat vector, cel), the edge quality, the grain and texture, the line weight, the palette as hex colours, and how light and shadow are simplified. Zoom into the face, the hands and the edges before you draw anything.

How to build it: redraw the artwork as flat 2D layers on canvases, with the character split into parts that can move (head, eyes, brows, mouth, hair, arms, cloth). Then pass the layers through one shader that recreates the medium (paper tooth, pigment grain, ink or brush edges, small imperfections). Animate it the way that medium is animated by hand, on twos or threes, with the texture and lines redrawn slightly on each new drawing. Add a secondary motion such as hair or cloth. Every frame must be a pure function of the frame number.

If my image does not match that aspect ratio, extend the background in the same style to fill the frame and keep the character exactly as drawn.

Before the full render, show me your first frame side by side with my image, say honestly what does not match yet, and fix it. Repeat that up to three times. Then render at 1080p (1920x1080 for 16:9, 1080x1920 for 9:16) at 30 fps and add a quiet synthesised music bed with small sounds on the visible actions.
```

*Storyboard*

### Grid prompt for an image model

Make a four-frame storyboard of your character, then give the grid to Claude and ask it to animate between the frames in order.

**Prompt**

```text
Create a two by two grid of this character showcasing them. Go through a story. We are looking to see her first in a close up, then a medium shot of her [ACTION], then a close up of her hands on [OBJECT], and finish with [FINAL BEAT].
```
