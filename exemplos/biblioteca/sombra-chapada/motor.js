// motor.js — sombra-chapada: retrato de anime de moda feito só de formas chapadas de borda dura.
// Sem contorno e sem degradê. Fundo lilás vazio, sombra em ameixa quase preta, luz em coral, cabelo
// violeta com luz amarela que corta em labaredas. A luz ANDA durante o plano, e as sombras se
// recortam sozinhas, porque saem de uma cabeça 3D escondida (cabeca.js) pintada chapada.
// A personagem anda "de dois em dois" (12 desenhos por segundo); a câmera empurra lisa, quadro a
// quadro. Por cima: grão de filme bem leve e um tiquinho de maciez.
//
// O motor sabe DESENHAR. O filme (personagem, cores, pose a cada momento, caminho da luz, brilho,
// som) está todo no historia.json. desenhar(t) é conta pura: o mesmo t dá o mesmo quadro.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio } = Filme;
  const L = 1920, A = 1080, GRAU = Math.PI / 180;

  Filme.criar({
    largura: L, altura: A, fps: 24, duracao: 6,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c0 = tela.getContext('2d'), k = largura / L;
      const pal = H.cores, AT = H.atuacao, sem0 = H.semente || 1;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const quadro = novaTela(largura, altura), c = quadro.getContext('2d');
      const Cab = window.Cabeca.criar(H.personagem, sem0);

      // ---------- marcas de tempo com nome (o som usa as mesmas da imagem) ----------
      const marcas = { inicio: 0, ergue: AT.ergue, brilho: AT.brilho[0], sobrancelha: AT.sobrancelha[0], sorriso: AT.sorriso[0] };
      const quando = (v) => (typeof v === 'number' ? v : (marcas[v] ?? 0));

      // ---------- atuação: tudo conta de t ----------
      function chaves(lista, t) { // [[t, a, b, ...], ...] com chegada suave
        const n = lista[0].length - 1, de = (i) => lista[i].slice(1);
        if (t <= lista[0][0]) return de(0);
        for (let i = 1; i < lista.length; i++) if (t <= lista[i][0]) {
          const u = suave(trecho(t, lista[i - 1][0], lista[i][0]));
          return Array.from({ length: n }, (_, j) => mistura(lista[i - 1][j + 1], lista[i][j + 1], u));
        }
        return de(lista.length - 1);
      }
      const mola = (t, chutes, amortece, hz) => { // soma de balanços que morrem: brinco e gola
        let v = 0;
        for (const [t0, a] of chutes) { const d = t - t0; if (d > 0) v += a * Math.exp(-amortece * d) * Math.sin(2 * Math.PI * hz * d); }
        return v;
      };
      function luzEm(t) { // vetor que aponta da pele para a luz; azimute 0 = luz vinda da câmera
        const [az, el] = chaves(AT.luz, t).map((g) => g * GRAU);
        return [Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)];
      }
      function pose(t) {
        const [pitch, yaw, roll, x, y] = chaves(AT.cabeca, t);
        const resp = Math.sin(2 * Math.PI * t / AT.respira) * AT.respiraPx;
        const B = AT.brinco, G = AT.gola;
        return {
          pitch: pitch * GRAU, yaw: yaw * GRAU, roll: roll * GRAU, x, y: y + resp,
          corpoX: H.personagem.corpo[0], corpoY: H.personagem.corpo[1] + resp * 0.6,
          brinco: B.base * Math.sin(2 * Math.PI * B.hzBase * t) + mola(t, B.chutes, B.amortece, B.hz),
          golaX: mola(t, G.chutes.map(([t0, dx]) => [t0, dx]), G.amortece, G.hz),
          golaGiro: mola(t, G.chutes.map(([t0, , gi]) => [t0, gi * GRAU]), G.amortece, G.hz),
          brilho: trecho(t, AT.brilho[0], AT.brilho[1]),
          sobr: suave(trecho(t, AT.sobrancelha[0], AT.sobrancelha[1])),
          sorri: suave(trecho(t, AT.sorriso[0], AT.sorriso[1])),
        };
      }

      // ---------- câmera: empurrão lento e liso (de quadro em quadro) ----------
      function camera(t) {
        const Cm = H.camera, u = trecho(t, 0, duracao);
        return { zoom: mistura(Cm.zoom[0], Cm.zoom[1], u * (2 - u) * 0.35 + u * 0.65), cx: Cm.centro[0], cy: Cm.centro[1] };
      }

      // ---------- grão de filme: 3 telas sorteadas uma vez; cada quadro usa uma, deslocada ----------
      const GT = 192, graos = [0, 1, 2].map((q) => {
        const g = novaTela(GT, GT), gc = g.getContext('2d'), img = gc.createImageData(GT, GT), r = sorteio(sem0 * 7 + 900 + q);
        for (let j = 0; j < GT * GT; j++) {
          const v = 128 + (r() + r() + r() - 1.5) * 70;
          img.data[j * 4] = img.data[j * 4 + 1] = img.data[j * 4 + 2] = limita(v, 0, 255); img.data[j * 4 + 3] = 255;
        }
        gc.putImageData(img, 0, 0); return g;
      });
      const celula = Math.max(1, Math.round(2 * k)); // o grão nunca fica menor que 1 pixel
      const forcaGrao = (H.grao ?? 0.08) * (0.45 + 0.55 * Math.min(1, k)); // em tela pequena cada pixel vale mais: grão mais leve

      // ---------- título (só no começo; letras em traço, sem fonte instalada) ----------
      function titulo(t) {
        const TI = H.tituloNaTela; if (!TI) return;
        const a = Math.min(suave(trecho(t, TI.de, TI.de + 0.35)), 1 - suave(trecho(t, TI.ate - 0.45, TI.ate)));
        if (a <= 0) return;
        c.setTransform(k, 0, 0, k, 0, 0);
        window.Letras.texto(c, H.titulo, TI.x, TI.y, TI.tamanho, { cor: Filme.cor(pal.letra, pal.letra, 0, a), alinha: 'esquerda', prog: trecho(t, TI.escreve[0], TI.escreve[1]), sem: 5, boil: 0, larg: Math.max(TI.tamanho * 0.1, 1.2 / k) });
      }

      // ---------- desenhar(t) ----------
      function desenhar(t) {
        c.reset(); c0.reset(); // nada do pincel passa de um quadro para o outro
        const passo = H.desenhosPorSegundo || 12, td = Math.floor(t * passo + 1e-6) / passo; // personagem de 2 em 2
        const cam = camera(t), z = k * cam.zoom;
        const Q = pose(td), Lz = luzEm(td);
        for (const p of H.pecas) { // a cena é a lista de peças da história, de trás para a frente
          if (t < (p.de ?? 0) || t > (p.ate ?? duracao)) continue;
          c.setTransform(z, 0, 0, z, largura / 2 - cam.cx * z, altura / 2 - cam.cy * z);
          if (p.tipo === 'fundo') { c.fillStyle = pal[p.cor]; c.fillRect(-L, -A, 3 * L, 3 * A); }
          else if (p.tipo === 'personagem') Cab.desenha(c, Q, Lz, pal, z);
          else if (p.tipo === 'gola') Cab.gola(c, H.personagem.gola, Q, pal);
          else if (p.tipo === 'titulo') titulo(t);
          else throw new Error('peça desconhecida: ' + p.tipo);
        }

        // um tiquinho de maciez no quadro inteiro
        c0.fillStyle = pal.fundo; c0.fillRect(0, 0, largura, altura);
        const mac = (H.maciez ?? 0.8) * k;
        if (mac >= 0.15) c0.filter = `blur(${mac.toFixed(2)}px)`;
        c0.drawImage(quadro, 0, 0); c0.filter = 'none';

        // grão de filme (muda a cada quadro, sorteado pelo número do quadro)
        const nq = Math.round(t * fps), g = graos[nq % 3], r = sorteio(sem0 * 31 + nq);
        const pat = c0.createPattern(g, 'repeat');
        pat.setTransform(new DOMMatrix([celula, 0, 0, celula, Math.floor(r() * GT) * celula, Math.floor(r() * GT) * celula]));
        c0.imageSmoothingEnabled = false;
        c0.globalCompositeOperation = 'overlay'; c0.globalAlpha = forcaGrao;
        c0.fillStyle = pat; c0.fillRect(0, 0, largura, altura);
        c0.globalAlpha = 1; c0.globalCompositeOperation = 'source-over';
      }

      // ---------- som: eventos da história, nas mesmas marcas de tempo da imagem ----------
      function som() {
        const m = Som.criar(duracao, sem0 + 3);
        for (const ev of H.som.eventos) {
          const t0 = quando(ev.t) + (ev.mais || 0), o = ev;
          if (ev.f === 'nota') m.nota(ev.nota, t0, ev.dur, o);
          else if (ev.f === 'sino') m.sino(ev.nota, t0, ev.dur ?? 1.6, o);
          else if (ev.f === 'pano') m.vento(t0, ev.dur ?? 0.6, { vol: ev.vol, corte: ev.corte ?? 2600, onda: 2.2, profundidade: 0.5, entra: (ev.dur ?? 0.6) * 0.3, sai: (ev.dur ?? 0.6) * 0.6 });
          else if (ev.f === 'vento') m.vento(t0, ev.dur ?? duracao - t0, o);
          else if (ev.f === 'toque') m.toque(t0, o);
          else if (ev.f === 'ouro') { const r = sorteio(sem0 + 70 + Math.round(t0 * 100)); (ev.notas || ['E6', 'B6']).forEach((nt, i) => m.sino(nt, t0 + i * (0.07 + r() * 0.05), 0.9, { vol: ev.vol * (0.7 + 0.3 * r()), brilho: 3.2, pan: ev.pan ?? 0.35 })); }
          else throw new Error('som desconhecido: ' + ev.f);
        }
        m.sala(H.som.sala ?? 0.3);
        return m.fim({ entra: 0.3, sai: 0.8, pico: H.som.pico ?? 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
