// MOTOR "pixel-diorama" — pixel art em maquete, com luz de cinema.
// Jeito de animar: camadas planas, como cenário de papelão numa maquete. Cada camada é um desenho
// em pixels grandes, feito ponto a ponto com uma paleta fixa de 32 cores (a da história), com
// trama de pontos no lugar do degradê. As camadas ficam em profundidades diferentes (z) e a câmera
// tem distância de verdade: quando ela se afasta, o fundo encolhe menos que a frente.
// Por cima vem a "luz de maquete": poças de luz dos postes, brilho que vaza das lâmpadas,
// fundo e frente desfocados (como lente de miniatura), névoa da tarde e reflexo na água.
// Não é 3D de verdade: luz, sombra e reflexo são desenhados, não calculados.
// O que muda de um filme para outro está em historia.json. Este arquivo não muda.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, ruido, rgb } = Filme;
  const L = 1920, A = 1080;
  const D0 = 100; // distância de referência: com a câmera a D0 da camada z=0, 1 unidade = "escala" pixels
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const limiar = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
  const empacota = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  const fracao = (v) => v - Math.floor(v);

  // ---------- letras em pixels (5x7, mais 2 linhas de acento em cima e 2 de cedilha embaixo) ----------
  const FONTE = {
    A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
    C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
    E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
    G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
    I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
    K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
    M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
    O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
    Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
    S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
    U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
    W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
    Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
    0: '01110 10011 10101 10101 10101 11001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
    2: '01110 10001 00001 00110 01000 10000 11111', 3: '11110 00001 00001 01110 00001 00001 11110',
    4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
    6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
    8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
    '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000',
    '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00110 00100 00000 00100',
    '-': '00000 00000 00000 01110 00000 00000 00000', ':': '00000 01100 01100 00000 01100 01100 00000',
    "'": '00100 00100 01000 00000 00000 00000 00000', ' ': '00000 00000 00000 00000 00000 00000 00000',
  };
  const MARCAS = { agudo: '00010 00100', grave: '01000 00100', circ: '00100 01010', til: '01101 10110', cedilha: '00100 01000' };
  const ACENTOS = { 'Á': ['A', 'agudo'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ã': ['A', 'til'], 'É': ['E', 'agudo'],
    'Ê': ['E', 'circ'], 'Í': ['I', 'agudo'], 'Ó': ['O', 'agudo'], 'Ô': ['O', 'circ'], 'Õ': ['O', 'til'], 'Ú': ['U', 'agudo'], 'Ç': ['C', 'cedilha'] };
  // devolve a letra como 11 linhas de 5 pontos (2 de acento + 7 + 2 de cedilha)
  function glifo(ch) {
    const vazio = '00000';
    let base = ch, marca = null;
    if (ACENTOS[ch]) [base, marca] = ACENTOS[ch];
    const corpo = (FONTE[base] || FONTE['?']).split(' ');
    const m = marca ? MARCAS[marca].split(' ') : [vazio, vazio];
    if (marca === 'cedilha') return [vazio, vazio, ...corpo, ...m];
    return [...m, ...corpo, vazio, vazio];
  }

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, altura, duracao }) {
      const k = largura / L; // a tela real pode ser menor (os testes usam 640x360)
      const c = tela.getContext('2d');

      // ---------- paleta: no máximo 32 cores, com nome ----------
      const nomes = Object.keys(H.paleta);
      if (nomes.length > 32) console.warn('a paleta tem ' + nomes.length + ' cores; o estilo pede no máximo 32');
      const COR = {};
      for (const n of nomes) { const [r, g, b] = rgb(H.paleta[n]); COR[n] = empacota(r, g, b); }
      const cor = (n) => { if (!(n in COR)) throw new Error('cor fora da paleta: ' + n); return COR[n]; };
      const hexDe = (n) => { if (!(n in H.paleta)) throw new Error('cor fora da paleta: ' + n); return H.paleta[n]; };

      // ---------- folha de pixels: onde cada camada é desenhada ponto a ponto ----------
      function folha(w, h) {
        const d = new Uint32Array(w * h), e = new Uint8Array(w * h);
        const F = {
          w, h, d, e,
          pon(x, y, v, brilha) { x = Math.round(x); y = Math.round(y); if (!v || x < 0 || y < 0 || x >= w || y >= h) return; d[y * w + x] = v; e[y * w + x] = brilha ? 1 : 0; },
          ret(x, y, ww, hh, v, brilha) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) F.pon(x + i, y + j, v, brilha); },
          // a cor v2 aparece numa fração q dos pontos, em trama regular (o "degradê" do pixel art)
          trama(x, y, ww, hh, v1, v2, q) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) F.pon(x + i, y + j, limiar(x + i, y + j) < q ? v2 : v1); },
          linha(x0, y0, x1, y1, v) {
            x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
            const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            for (;;) { F.pon(x0, y0, v); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
          },
          // cor de uma rampa (lista de cores) na posição q de 0 a 1, com trama entre os degraus
          rampa(x, y, cores, q) {
            const p = limita(q) * (cores.length - 1), i = Math.min(cores.length - 2, Math.floor(p));
            return limiar(x, y) < p - i ? cores[i + 1] : cores[i];
          },
        };
        return F;
      }

      // folha -> canvas, com a luz da hora (multiplica pela tinta e mistura com a névoa).
      // Ponto que brilha (janela, lâmpada) não recebe tinta nem névoa.
      function paraTela(F, tinta, nevoa, qNevoa, soBrilho) {
        const cv = document.createElement('canvas'); cv.width = F.w; cv.height = F.h;
        const x = cv.getContext('2d'), img = x.createImageData(F.w, F.h), out = new Uint32Array(img.data.buffer);
        const [tr, tg, tb] = rgb(tinta || '#ffffff'), [nr, ng, nb] = rgb(nevoa || '#000000');
        for (let i = 0; i < F.d.length; i++) {
          const v = F.d[i]; if (!v) continue;
          if (F.e[i]) { out[i] = v; continue; }
          if (soBrilho) continue;
          const r = (v & 255) * tr / 255, g = ((v >> 8) & 255) * tg / 255, b = ((v >> 16) & 255) * tb / 255;
          out[i] = empacota(Math.round(mistura(r, nr, qNevoa)), Math.round(mistura(g, ng, qNevoa)), Math.round(mistura(b, nb, qNevoa)));
        }
        x.putImageData(img, 0, 0);
        return cv;
      }

      // ---------- peças do cenário (coordenadas em pixels da camada) ----------
      const RAMPA_ARVORE = { outono: ['outonoEscuro', 'outono', 'outonoClaro'], verde: ['folhaEscura', 'folha', 'folhaClara'] };
      const GERA = {
        // caminho de pedra visto de cima + muro de pedra na frente (+ quina, se for a beira)
        chao(F, p, acaso) {
          const topo = p.y - p.fundo;
          for (let y = topo; y < p.y; y++) {
            const fileira = Math.floor((y - topo) / 3), desl = (fileira % 2) * 2;
            for (let x = p.x1; x < p.x2; x++) {
              const bx = (x + desl) % 4, by = (y - topo) % 3;
              let v = cor('pedraClara');                                         // pedra do caminho, vista de cima
              if (bx === 3 || by === 2) v = cor('pedra');
              else if (bx === 0 && by === 0) v = cor('nevoa');
              F.pon(x, y, v);
            }
          }
          for (let x = p.x1; x < p.x2; x++) F.pon(x, p.y, cor('pedraClara'));            // beirada iluminada
          for (let y = p.y + 1; y < p.y + p.parede; y++) {
            const fileira = Math.floor((y - p.y - 1) / 5), desl = (fileira % 2) * 4, q = (y - p.y) / p.parede;
            for (let x = p.x1; x < p.x2; x++) {
              const bx = (x + desl) % 8, by = (y - p.y - 1) % 5;
              let v = F.rampa(x, y, [cor('pedraEscura'), cor('pedraEscura'), cor('contorno')], q * 1.3);
              if (bx === 7 || by === 4 || y === p.y + 1) v = cor('contorno');          // junta e sombra embaixo da beirada
              else if (by === 0 && q < 0.4) v = cor('pedra');
              F.pon(x, y, v);
            }
          }
          if (p.borda) for (let y = topo; y < p.y + p.parede; y++) { F.pon(p.x2 - 1, y, cor(y <= p.y ? 'pedraClara' : 'pedra')); F.pon(p.x2 - 2, y, cor('pedraEscura')); }
          for (let x = p.x1; x < p.x2; x += 1 + Math.floor(acaso() * 3)) F.pon(x, topo - 1, cor(acaso() < 0.5 ? 'folha' : 'folhaEscura'));
        },
        // tufos de capim com florzinhas
        capim(F, p, acaso) {
          const alto = p.alto || 6, flores = (p.flores || ['outonoClaro', 'creme', 'rosaCeu']).map(cor);
          for (let i = 0; i < p.n; i++) {
            const x0 = Math.round(p.x1 + acaso() * (p.x2 - p.x1)), folhas = 3 + Math.floor(acaso() * 4);
            for (let f = 0; f < folhas; f++) {
              const x = x0 + f - Math.floor(folhas / 2), h = Math.round(alto * (0.4 + 0.6 * acaso())), torto = acaso() < 0.5 ? -1 : 1;
              for (let y = 0; y < h; y++) F.pon(x + (y > h * 0.6 ? torto : 0), p.y - y, cor(y > h * 0.7 ? 'folhaClara' : y > h * 0.3 ? 'folha' : 'folhaEscura'));
              if (acaso() < 0.3) { const fl = flores[Math.floor(acaso() * flores.length)]; F.pon(x + torto, p.y - h, fl); F.pon(x + torto, p.y - h - 1, fl); }
            }
          }
        },
        // casa de enxaimel: parede, madeira cruzada, janelas acesas, porta, telhado em degraus, chaminé
        casa(F, p, acaso, reg) {
          const x0 = p.x, y0 = p.base - p.h, w = p.w, h = p.h;
          F.ret(x0, y0, w, h, cor(p.parede));
          F.trama(x0 + w - 4, y0, 4, h, cor(p.parede), cor('pedraClara'), 0.5); // lado na sombra
          const mad = cor(p.madeira || 'madeira');
          const andares = Math.max(1, Math.round(h / 22)), alt = h / andares;
          for (let a = 0; a <= andares; a++) F.ret(x0, Math.round(y0 + a * alt) - (a === andares ? 1 : 0), w, 1, mad);
          for (const xx of [x0, x0 + w - 1]) F.ret(xx, y0, 1, h, mad);
          const vaos = Math.max(2, Math.round(w / 12));
          for (let a = 0; a < andares; a++) {
            const ya = Math.round(y0 + a * alt), yb = Math.round(y0 + (a + 1) * alt);
            for (let v = 0; v < vaos; v++) {
              const xa = Math.round(x0 + v * w / vaos), xb = Math.round(x0 + (v + 1) * w / vaos);
              if (v > 0) F.ret(xa, ya, 1, yb - ya, mad);
              const meio = (xa + xb) / 2;
              const terreo = a === andares - 1, porta = terreo && v === Math.floor(vaos / 2) && p.porta !== false;
              if (porta) { F.ret(Math.round(meio - 2), yb - 8, 5, 8, cor('madeira')); F.ret(Math.round(meio - 1), yb - 7, 3, 6, cor('madeiraClara')); continue; }
              if (acaso() < 0.25 && !terreo) { F.linha(xa + 1, yb - 1, xb - 1, ya + 1, mad); continue; } // mão-francesa
              // janela: moldura escura, vidro aceso que brilha
              const jx = Math.round(meio - 2), jy = Math.round(ya + (yb - ya) / 2 - 3);
              F.ret(jx - 1, jy - 1, 6, 7, cor('contorno'));
              const acesa = acaso() < 0.85;
              F.ret(jx, jy, 4, 5, cor(acesa ? 'lanterna' : 'roxo'), acesa);
              if (acesa) { F.pon(jx, jy, cor('luz'), true); F.pon(jx + 1, jy, cor('luz'), true); }
              F.ret(jx, jy + 2, 4, 1, cor('madeira'));
            }
          }
          // telhado em degraus, com beiral passando da parede
          const larg = w + 6, altT = Math.round(larg * 0.45), tel = cor(p.telhado), escuro = cor('capaEscura');
          for (let j = 0; j < altT; j++) {
            const q = j / altT, meia = Math.round(larg / 2 * (1 - q)), yy = y0 - 1 - j, xm = x0 + w / 2;
            for (let x = Math.round(xm - meia); x < Math.round(xm + meia); x++) {
              let v = (j % 3 === 0) ? escuro : tel;
              if (x > xm && limiar(x, yy) < 0.35) v = escuro;
              F.pon(x, yy, v);
            }
          }
          F.ret(x0 - 3, y0 - 1, w + 6, 1, cor('contorno'));
          F.ret(x0, y0, w, 1, cor('pedraEscura')); // sombra do beiral
          if (p.chamine) {
            const cx = Math.round(x0 + w * 0.72), cy = y0 - Math.round(altT * 0.75);
            F.ret(cx, cy - 4, 4, Math.round(altT * 0.5) + 4, cor('pedra')); F.ret(cx, cy - 4, 4, 1, cor('pedraClara'));
            reg.chamines.push({ x: cx + 2, y: cy - 5 });
          }
        },
        // árvore: tronco e copa feita de bolas, com luz vindo do alto à direita
        arvore(F, p, acaso) {
          const r = p.r, tronco = Math.round(r * 0.7), cx = p.x, cy = p.base - tronco - r * 0.8;
          F.ret(cx - 1, p.base - tronco - 2, 3, tronco + 2, cor('madeira')); F.ret(cx + 1, p.base - tronco, 1, tronco, cor('contorno'));
          const bolas = [{ x: 0, y: 0, r }];
          for (let i = 0; i < 6; i++) { const a = acaso() * 6.28; bolas.push({ x: Math.cos(a) * r * 0.55, y: Math.sin(a) * r * 0.45, r: r * (0.45 + acaso() * 0.25) }); }
          const ramp = (RAMPA_ARVORE[p.cores] || RAMPA_ARVORE.verde).map(cor);
          for (let y = Math.floor(cy - r * 1.5); y < cy + r * 1.4; y++) for (let x = Math.floor(cx - r * 1.6); x < cx + r * 1.6; x++) {
            let dentro = false;
            for (const b of bolas) { const dx = x - cx - b.x, dy = y - cy - b.y; if (dx * dx + dy * dy < b.r * b.r) { dentro = true; break; } }
            if (!dentro) continue;
            const luz = ((x - cx) * 0.5 - (y - cy)) / (r * 1.6) * 0.5 + 0.5 + (acaso() - 0.5) * 0.25;
            F.pon(x, y, F.rampa(x, y, ramp, luz));
          }
        },
        // poste com lanterna (a lanterna brilha e vira um ponto de luz da cena)
        poste(F, p, acaso, reg, camada) {
          const topo = p.base - p.h;
          F.ret(p.x, topo, 1, p.h, cor('contorno')); F.ret(p.x - 1, p.base - 2, 3, 2, cor('contorno'));
          F.ret(p.x - 2, topo - 1, 5, 1, cor('contorno'));
          F.ret(p.x - 1, topo, 3, 3, cor('lanterna'), true); F.pon(p.x, topo + 1, cor('luz'), true);
          F.ret(p.x - 1, topo + 3, 3, 1, cor('contorno'));
          reg.luzes.push({ x: camada.x + (p.x + 0.5) * camada.grao, y: camada.y + (topo + 1.5) * camada.grao, chao: camada.y + p.base * camada.grao });
        },
        // barraca de feira: toldo listrado, balcão e mercadoria
        barraca(F, p, acaso) {
          const x0 = p.x, b = p.base, w = p.w, toldo = p.toldo.map(cor);
          F.ret(x0, b - 22, 1, 22, cor('madeira')); F.ret(x0 + w - 1, b - 22, 1, 22, cor('madeira'));
          for (let j = 0; j < 5; j++) for (let x = x0 - 2; x < x0 + w + 2; x++) F.pon(x, b - 26 + j, toldo[Math.floor((x - x0 + 2) / 4) % 2]);
          for (let x = x0 - 2; x < x0 + w + 2; x++) if ((x - x0) % 4 < 2) F.pon(x, b - 21, toldo[Math.floor((x - x0 + 2) / 4) % 2]);
          F.ret(x0 + 1, b - 8, w - 2, 8, cor('madeira')); F.ret(x0 + 1, b - 8, w - 2, 1, cor('madeiraClara'));
          for (let x = x0 + 4; x < x0 + w - 3; x += 6) F.ret(x, b - 6, 1, 5, cor('contorno'));
          const merc = p.mercadoria.map(cor);
          for (let x = x0 + 3, i = 0; x < x0 + w - 4; x += 4, i++) { const hh = 2 + Math.floor(acaso() * 2); F.ret(x, b - 8 - hh, 3, hh, merc[i % merc.length]); }
        },
        // varal de bandeirinhas
        bandeirinhas(F, p) {
          const cores = p.cores.map(cor);
          for (let x = p.x1; x <= p.x2; x++) {
            const u = (x - p.x1) / (p.x2 - p.x1), y = Math.round(p.y + p.cai * 4 * u * (1 - u));
            F.pon(x, y, cor('contorno'));
            const i = x - p.x1;
            if (i % 6 === 3) { const v = cores[Math.floor(i / 6) % cores.length]; F.ret(x, y + 1, 3, 2, v); F.pon(x + 1, y + 3, v); }
          }
        },
        // cordilheira: crista quebrada, degradê em trama, neve nos picos
        montanhas(F, p, acaso) {
          const P = p.pontos, ramp = p.cores.map(cor);
          let topoMin = 1e9; for (const q of P) topoMin = Math.min(topoMin, q[1]);
          for (let x = 0; x < F.w; x++) {
            let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++;
            const a = P[i], b = P[i + 1], u = limita((x - a[0]) / (b[0] - a[0]));
            const crista = Math.round(mistura(a[1], b[1], u) + ruido(x * 0.15, 3) * 3 + ruido(x * 0.6, 5) * 1);
            for (let y = crista; y < p.base; y++) {
              let v = F.rampa(x, y, ramp, (y - crista) / Math.max(8, p.base - topoMin));
              if (p.neve && y - crista < 4 - (crista - topoMin) * 0.12 && limiar(x, y) < 0.8) v = cor(p.neve);
              F.pon(x, y, v);
            }
          }
        },
        // morro da encosta: massa escura com copas de árvore na crista
        morro(F, p, acaso) {
          const P = p.pontos, ramp = p.cores.map(cor), copa = RAMPA_ARVORE.verde.map(cor);
          const cristaEm = (x) => { let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++; const a = P[i], b = P[i + 1]; return mistura(a[1], b[1], limita((x - a[0]) / (b[0] - a[0]))); };
          for (let x = 0; x < Math.min(F.w, P[P.length - 1][0]); x++) {
            const crista = Math.round(cristaEm(x) + ruido(x * 0.2, 7) * 2);
            for (let y = crista; y < p.base; y++) F.pon(x, y, F.rampa(x, y, ramp, (y - crista) / 60));
          }
          for (let i = 0; i < p.copas; i++) {
            const x = Math.round(acaso() * P[P.length - 1][0]), y = Math.round(cristaEm(x)), r = 3 + acaso() * 4;
            for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy * 1.4 < r * r) F.pon(x + xx, y + yy - r * 0.6, F.rampa(x + xx, y + yy, copa, 0.5 + (xx - yy) / (r * 3)));
          }
        },
        // lago: degradê em trama e risquinhos de onda
        agua(F, p, acaso) {
          const ramp = p.cores.map(cor);
          for (let y = p.y; y < F.h; y++) for (let x = 0; x < F.w; x++) F.pon(x, y, F.rampa(x, y, ramp, (y - p.y) / (F.h - p.y)));
          for (let i = 0; i < F.w * 0.4; i++) { const x = Math.floor(acaso() * F.w), y = p.y + 2 + Math.floor(acaso() * (F.h - p.y - 2)); F.ret(x, y, 2 + Math.floor(acaso() * 3), 1, cor(p.cores[0])); }
        },
        // luzinhas da outra margem, com o reflexo riscado na água
        luzes(F, p, acaso) {
          for (let i = 0; i < p.n; i++) {
            const x = Math.round(p.x1 + acaso() * (p.x2 - p.x1)), y = p.y - Math.floor(acaso() * 3);
            F.pon(x, y, cor(p.cor), true);
            if (p.reflexo) for (let j = 3; j < 9; j += 2) if (acaso() < 0.7) F.pon(x + Math.round((acaso() - 0.5) * 2), p.y + j, cor(p.reflexo), true);
          }
        },
        // nuvem chapada, com a barriga mais escura
        nuvem(F, p) {
          for (let j = 0; j < p.h; j++) {
            const enc = Math.round((p.h - 1 - j) * 3 + (j === 0 ? 2 : 0));
            F.ret(p.x + enc, p.y - j, p.w - enc * 2, 1, cor(j === 0 ? (p.sombra || p.cor) : p.cor));
          }
        },
      };

      // ---------- montar as camadas (uma vez só: o cenário não muda) ----------
      const T = H.tarde || {}, N = H.noite || {};
      const reg = { luzes: [], chamines: [] };
      const camadas = H.camadas.map((cam, ci) => {
        const F = folha(cam.largura, cam.altura), acaso = sorteio((H.semente || 1) * 131 + ci * 17);
        const r = { luzes: [], chamines: [] };
        for (const p of cam.pecas) {
          const g = GERA[p.tipo]; if (!g) throw new Error('peça desconhecida: ' + p.tipo);
          g(F, p, acaso, r, cam);
        }
        const q = cam.nevoa || 0;
        const Lc = {
          ...cam, F,
          dia: paraTela(F, T.tinta, T.nevoa, q), noite: paraTela(F, N.tinta, N.nevoa, q * 0.8), brilho: paraTela(F, null, null, 0, true),
          luzes: r.luzes, chamines: r.chamines,
        };
        // telas de trabalho, refeitas a cada quadro a partir das de cima (não guardam nada entre quadros)
        Lc.tela = document.createElement('canvas'); Lc.tela.width = F.w; Lc.tela.height = F.h;
        Lc.telaB = document.createElement('canvas'); Lc.telaB.width = F.w; Lc.telaB.height = F.h;
        Lc.ct = Lc.tela.getContext('2d'); Lc.cb = Lc.telaB.getContext('2d');
        // os fogos ganham tela própria: ficam menos desfocados que as montanhas atrás deles
        Lc.fogo = document.createElement('canvas'); Lc.fogo.width = F.w; Lc.fogo.height = F.h; Lc.cf = Lc.fogo.getContext('2d');
        reg.luzes.push(...r.luzes.map((l) => ({ ...l, z: cam.z })));
        return Lc;
      });
      const camadaPor = (nome) => camadas.find((x) => x.nome === nome);

      // ---------- bonecos: cada quadro vira uma folha pequena (versão da tarde e da noite) ----------
      const SPR = {};
      for (const [nome, anims] of Object.entries(H.sprites)) {
        SPR[nome] = {};
        for (const [an, def] of Object.entries(anims)) {
          SPR[nome][an] = {
            ritmo: def.ritmo || 8, sobe: def.sobe || [0],
            quadros: def.quadros.map((linhas) => {
              const w = Math.max(...linhas.map((l) => l.length)), F = folha(w, linhas.length);
              linhas.forEach((l, y) => { for (let x = 0; x < l.length; x++) { const ch = l[x]; if (ch !== '.') F.pon(x, y, cor(H.chaves[ch])); } });
              return { w, h: linhas.length, dia: paraTela(F, T.tinta, null, 0), noite: paraTela(F, N.tinta, null, 0) };
            }),
          };
        }
      }

      // ---------- coisas sorteadas uma vez (semente fixa) ----------
      const acaso = sorteio((H.semente || 1) * 7 + 3);
      const estrelas = Array.from({ length: (H.ceu && H.ceu.estrelas) || 100 }, () => ({ x: acaso(), y: acaso() * 0.8, f: acaso() * 6.28, v: 1 + acaso() * 3, forte: acaso() < 0.15 }));
      const VG = H.vagalumes || { n: 0 };
      const vagalumes = Array.from({ length: VG.n || 0 }, () => ({ x: mistura(VG.x1, VG.x2, acaso()), y: mistura(VG.y1, VG.y2, acaso()), f: acaso() * 6.28, v: 0.5 + acaso() }));
      const longe = camadaPor('longe');
      const brilhos = longe ? Array.from({ length: 70 }, () => ({ x: Math.floor(acaso() * longe.largura), y: 0, dy: acaso(), f: acaso() * 6.28, v: 1 + acaso() * 2 })) : [];

      // ---------- tempo: tarde -> noite, caminho do herói, câmera ----------
      const noiteEm = (t) => suave(trecho(t, N.de ?? 99, N.ate ?? 100));
      function anda(C, t) {
        let i = 0; while (i < C.length - 2 && t > C[i + 1].t) i++;
        const a = C[i], b = C[i + 1]; return mistura(a.x, b.x, trecho(t, a.t, b.t));
      }
      const HE = H.heroi;
      const heroiX = (t) => anda(HE.caminho, t);
      function camera(t) {
        const C = H.camera; let i = 0;
        while (i < C.length - 2 && t > C[i + 1].t) i++;
        const a = C[i], b = C[i + 1], f = suave(trecho(t, a.t, b.t));
        const vx = (q) => (q.segue ? heroiX(t) + (q.dx || 0) : q.x);
        const g = (nome, pad) => mistura(a[nome] ?? pad, b[nome] ?? pad, f);
        return { x: mistura(vx(a), vx(b), f), y: g('y', 0), d: Math.exp(mistura(Math.log(a.d), Math.log(b.d), f)), foco: g('foco', 0), abertura: g('abertura', 12) };
      }
      const escala = (z, cam) => H.escala * k * D0 / (cam.d + z);
      // mundo -> tela, para uma profundidade z
      const naTela = (wx, wy, z, cam) => { const s = escala(z, cam); return [largura / 2 + (wx - cam.x) * s, altura / 2 + (wy - cam.y) * s, s]; };

      // ---------- céu: pixels grandes, trama entre as cores, tarde virando noite ponto a ponto ----------
      const PX = 6; // tamanho do pixel do céu (em pixels de 1920)
      const ceuL = Math.max(1, Math.round(largura / (PX * k))), ceuA = Math.max(1, Math.round(altura / (PX * k)));
      const cvCeu = document.createElement('canvas'); cvCeu.width = ceuL; cvCeu.height = ceuA;
      const ctxCeu = cvCeu.getContext('2d'), imgCeu = ctxCeu.createImageData(ceuL, ceuA), ceuBuf = new Uint32Array(imgCeu.data.buffer);
      // o céu é liso (pintado), como fundo de maquete; a trama fica para as peças de pixel
      const rampaTarde = H.ceu.tarde.map((n) => rgb(hexDe(n))), rampaNoite = H.ceu.noite.map((n) => rgb(hexDe(n)));
      const naRampa = (R, q) => { const p = limita(q) * (R.length - 1), i = Math.min(R.length - 2, Math.floor(p)), f = p - i; return [0, 1, 2].map((j) => mistura(R[i][j], R[i + 1][j], f)); };
      const ceuLiso = (q, n) => { const a = naRampa(rampaTarde, q), b = naRampa(rampaNoite, q); return empacota(...[0, 1, 2].map((j) => Math.round(mistura(a[j], b[j], n)))); };
      function ceu(t, n, cam) {
        const hy = naTela(0, H.horizonte ?? 0, longe ? longe.z : 400, cam)[1] / (PX * k);
        for (let y = 0; y < ceuA; y++) {
          const q = limita(y / Math.max(1, hy));
          for (let x = 0; x < ceuL; x++) {
            ceuBuf[y * ceuL + x] = ceuLiso(q, n);
          }
        }
        if (n > 0) for (const e of estrelas) {
          const x = Math.floor(e.x * ceuL), y = Math.floor(e.y * Math.max(1, hy));
          if (y >= ceuA) continue;
          const pisca = 0.55 + 0.45 * Math.sin(t * e.v + e.f);
          if (pisca * n > 0.45) ceuBuf[y * ceuL + x] = cor(e.forte ? 'luz' : 'lavanda');
        }
        ctxCeu.putImageData(imgCeu, 0, 0);
        c.drawImage(cvCeu, 0, 0, largura, altura);
      }

      // ---------- fogos de artifício (em pixels da camada "longe"; o reflexo vai na água) ----------
      function fogos(t, Lc, n) {
        const g = Lc.grao, hy = ((H.horizonte ?? 0) - Lc.y) / g;
        const pinta = (x, y, hexCor, alfa, w = 1, h = 1) => {
          x = Math.round(x); y = Math.round(y);
          Lc.cf.globalAlpha = limita(alfa); Lc.cf.fillStyle = hexCor; Lc.cf.fillRect(x, y, w, h);
          Lc.cb.globalAlpha = limita(alfa); Lc.cb.fillStyle = hexCor; Lc.cb.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
        };
        const reflete = (x, y, hexCor, alfa) => {
          const yr = 2 * hy - y; if (yr <= hy + 1 || yr >= Lc.altura) return;
          const onda = Math.round(Math.sin(yr * 0.9 + t * 5) * 1.5 + Math.sin(yr * 0.31 - t * 2) * 1);
          pinta(x + onda - 1, yr, hexCor, alfa * 0.45 * (1 - (yr - hy) / 60), 3, 1);
        };
        H.fogos.forEach((f, i) => {
          const fx = (f.x - Lc.x) / g, fy = (f.y - Lc.y) / g, sub = H.subida || 0.7;
          // o foguete subindo, com rastro de faísca
          if (t >= f.t - sub && t < f.t) {
            const u = (t - (f.t - sub)) / sub, y = mistura(hy, fy, saiDevagar(u));
            pinta(fx, y, hexDe('luz'), 1);
            for (let j = 1; j < 7; j++) { pinta(fx + (j % 2 ? 0 : (j % 4 ? 1 : -1)), y + j * 1.6, hexDe('lanterna'), 0.8 - j * 0.11); }
            reflete(fx, y, hexDe('luz'), 0.8);
          }
          const tau = t - f.t, vida = f.vida || 1.9;
          if (tau < 0 || tau > vida) return;
          const s = sorteio((H.semente || 1) * 977 + i * 131);
          // coluna de reflexo na água, embaixo do estouro (risquinhos que tremem)
          const forca = Math.exp(-tau * 1.6);
          for (let row = 1; row < 46; row++) {
            const yr = Math.round(hy + row); if (yr >= Lc.altura) break;
            const onda = Math.round(Math.sin(row * 1.7 + t * 6) * (1 + row * 0.08) + Math.sin(row * 0.5 - t * 3));
            const larg = 2 + Math.round(3 * (0.5 + 0.5 * Math.sin(row * 2.3 + t * 4)) + row * 0.06);
            pinta(fx + onda - larg / 2, yr, hexDe(f.cores[row % f.cores.length]), forca * 0.55 * (1 - row / 46));
          }
          const raio = f.raio / g, cai = 9 / g;
          for (let p = 0; p < f.n; p++) {
            const ang = 2 * Math.PI * p / f.n + (s() - 0.5) * 0.35, vel = raio * (p % 3 === 0 ? 0.25 + 0.5 * s() : 0.8 + 0.2 * s()), corP = hexDe(f.cores[p % f.cores.length]), fase = s();
            for (let j = 0; j < 3; j++) {
              const tj = tau - j * 0.06; if (tj < 0) continue;
              const e = (1 - Math.exp(-3.4 * tj)) / (1 - Math.exp(-3.4));
              const x = fx + Math.cos(ang) * vel * e, y = fy + Math.sin(ang) * vel * e + cai * tj * tj * 6;
              let alfa = Math.pow(1 - tau / vida, 1.4) * (1 - j * 0.33);
              if (tau > vida * 0.55 && fracao(t * 9 + fase) < 0.4) alfa *= 0.2; // faísca piscando no fim
              const hc = tau < 0.12 ? hexDe('luz') : corP;
              pinta(x, y, hc, alfa);
              if (j === 0) reflete(x, y, hc, alfa);
            }
          }
          for (const ctx of [Lc.cf, Lc.cb]) ctx.globalAlpha = 1;
        });
      }
      // clarão de cada estouro (some em meio segundo)
      function clarao(t) {
        let soma = 0, ultimo = null;
        for (const f of H.fogos) { const tau = t - f.t; if (tau >= 0 && tau < 1) { const q = Math.exp(-tau * 5); if (q > soma) { soma = q; ultimo = f; } } }
        return ultimo ? { q: soma, cor: hexDe(ultimo.cores[0]) } : null;
      }

      // ---------- fumaça das chaminés (pixels da camada, sem memória: a idade vem de t) ----------
      function fumaca(t, Lc, n) {
        Lc.chamines.forEach((ch, j) => {
          for (let i = 0; i < 6; i++) {
            const tau = fracao(t * 0.32 + i / 6 + j * 0.137);
            const x = Math.round(ch.x + tau * 7 + Math.sin(tau * 5 + j) * 1.5), y = Math.round(ch.y - tau * 26), tam = 1 + Math.floor(tau * 3);
            Lc.ct.globalAlpha = (1 - tau) * 0.55; Lc.ct.fillStyle = Filme.cor(hexDe('nevoa'), hexDe('lilas'), n);
            Lc.ct.fillRect(x - Math.floor(tam / 2), y, tam, tam);
          }
        });
        Lc.ct.globalAlpha = 1;
      }

      // ---------- brilho do lago (risquinhos que acendem e apagam) ----------
      function lago(t, Lc, n) {
        const hy = ((H.horizonte ?? 0) - Lc.y) / Lc.grao;
        for (const b of brilhos) {
          const y = Math.round(hy + 2 + b.dy * b.dy * (Lc.altura - hy - 4)), on = Math.sin(t * b.v * 2 + b.f);
          if (on < 0.55) continue;
          Lc.ct.globalAlpha = (on - 0.55) * 1.6; Lc.ct.fillStyle = Filme.cor(hexDe('lavanda'), hexDe('aguaClara'), n);
          Lc.ct.fillRect(b.x, y, 3, 1);
        }
        Lc.ct.globalAlpha = 1;
      }

      // ---------- telas de apoio: brilho (a 1/4 do tamanho) ----------
      const bl = Math.max(1, Math.round(largura / 4)), ba = Math.max(1, Math.round(altura / 4));
      const cvB = document.createElement('canvas'); cvB.width = bl; cvB.height = ba; const cB = cvB.getContext('2d');
      const cvB2 = document.createElement('canvas'); cvB2.width = bl; cvB2.height = ba; const cB2 = cvB2.getContext('2d');

      // desenha uma camada (já composta) na tela, com o desfoque da lente
      function poeCamada(Lc, cam, fonte, fator) {
        const s = escala(Lc.z, cam), g = s * Lc.grao;
        const ox = largura / 2 + (Lc.x - cam.x) * s, oy = altura / 2 + (Lc.y - cam.y) * s;
        const borda = 12;
        const tx0 = Math.max(0, Math.floor(-ox / g) - borda), tx1 = Math.min(Lc.largura, Math.ceil((largura - ox) / g) + borda);
        const ty0 = Math.max(0, Math.floor(-oy / g) - borda), ty1 = Math.min(Lc.altura, Math.ceil((altura - oy) / g) + borda);
        if (tx1 <= tx0 || ty1 <= ty0) return;
        // desfoque da lente: zero no plano em foco, cresce para a frente e para o fundo
        const desf = cam.abertura * k * Math.abs(1 - (cam.d + cam.foco) / (cam.d + Lc.z)) * (fator ?? 1);
        c.filter = desf > 0.4 ? `blur(${desf.toFixed(2)}px)` : 'none';
        c.drawImage(fonte || Lc.tela, tx0, ty0, tx1 - tx0, ty1 - ty0, ox + tx0 * g, oy + ty0 * g, (tx1 - tx0) * g, (ty1 - ty0) * g);
        c.filter = 'none';
        if (fonte) return;
        // o que brilha vai também para a tela de brilho
        const qx = bl / largura, qy = ba / altura;
        cB.drawImage(Lc.telaB, tx0, ty0, tx1 - tx0, ty1 - ty0, (ox + tx0 * g) * qx, (oy + ty0 * g) * qy, (tx1 - tx0) * g * qx, (ty1 - ty0) * g * qy);
      }

      // compõe a camada do instante: tarde + noite por cima + brilho
      function compoe(Lc, n, luzQ) {
        Lc.ct.globalAlpha = 1; Lc.ct.clearRect(0, 0, Lc.largura, Lc.altura); Lc.ct.drawImage(Lc.dia, 0, 0);
        if (n > 0) { Lc.ct.globalAlpha = n; Lc.ct.drawImage(Lc.noite, 0, 0); Lc.ct.globalAlpha = 1; }
        Lc.cb.globalAlpha = 1; Lc.cb.clearRect(0, 0, Lc.largura, Lc.altura);
        Lc.cb.globalAlpha = luzQ; Lc.cb.drawImage(Lc.brilho, 0, 0); Lc.cb.globalAlpha = 1;
      }

      // um boneco na tela (tarde + noite), com sombra no chão
      function boneco(nome, anim, t, wx, pe, z, cam, n, fase, luzPerto) {
        const an = SPR[nome][anim] || Object.values(SPR[nome])[0];
        const i = Math.floor((t + (fase || 0)) * an.ritmo) % an.quadros.length, Q = an.quadros[i];
        const sobe = an.sobe[i % an.sobe.length] || 0;
        const [sx, sy, s] = naTela(wx, pe, z, cam);
        // sombra de contato, empurrada para longe do poste mais perto
        const empurra = luzPerto ? limita((wx - luzPerto.x) / 40, -1, 1) * 4 : 0;
        c.fillStyle = 'rgba(20,14,30,0.38)';
        c.beginPath(); c.ellipse(sx + empurra * s, sy, Q.w * 0.42 * s, 1.6 * s, 0, 0, 7); c.fill();
        const x = sx - Q.w / 2 * s, y = sy - (Q.h + sobe) * s;
        c.drawImage(Q.dia, x, y, Q.w * s, Q.h * s);
        if (n > 0) { c.globalAlpha = n; c.drawImage(Q.noite, x, y, Q.w * s, Q.h * s); c.globalAlpha = 1; }
      }

      // título em pixels, embaixo, sobre faixa escura
      function titulo(t) {
        const de = H.titulo_de ?? 0.3, ate = H.titulo_ate ?? 2.5;
        if (!H.titulo || t < de || t > ate) return;
        const a = Math.min(trecho(t, de, de + 0.35), 1 - trecho(t, ate - 0.4, ate));
        const texto = H.titulo.toUpperCase(), px = 8 * k, passo = 6;
        const larg = texto.length * passo * px, x0 = (largura - larg) / 2, y0 = altura * 0.84;
        const fx = c.createLinearGradient(0, y0 - 40 * k, 0, altura);
        fx.addColorStop(0, 'rgba(20,14,30,0)'); fx.addColorStop(0.35, `rgba(20,14,30,${0.55 * a})`); fx.addColorStop(1, `rgba(20,14,30,${0.7 * a})`);
        c.fillStyle = fx; c.fillRect(0, y0 - 40 * k, largura, altura - y0 + 40 * k);
        c.globalAlpha = a;
        for (const [camada, dx, dy] of [[hexDe('contorno'), 1, 1], [hexDe('creme'), 0, 0]]) {
          c.fillStyle = camada;
          [...texto].forEach((ch, i) => {
            glifo(ch).forEach((linha, y) => { for (let x = 0; x < 5; x++) if (linha[x] === '1') c.fillRect(Math.round(x0 + (i * passo + x + dx) * px), Math.round(y0 + (y - 2 + dy) * px), Math.ceil(px), Math.ceil(px)); });
          });
        }
        c.globalAlpha = 1;
      }

      // ---------- desenhar(t): conta pura do instante t ----------
      function desenhar(t) {
        const cam = camera(t), n = noiteEm(t);
        const luzQ = 0.65 + 0.35 * n;
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
        c.imageSmoothingEnabled = false;
        cB.globalCompositeOperation = 'source-over'; cB.imageSmoothingEnabled = false; cB.clearRect(0, 0, bl, ba);

        // 1) céu
        ceu(t, n, cam);

        // 2) camadas de trás para a frente
        const terraco = camadaPor('terraco');
        for (const Lc of camadas) {
          compoe(Lc, n, luzQ);
          if (Lc.nome === 'longe') { Lc.cf.clearRect(0, 0, Lc.largura, Lc.altura); lago(t, Lc, n); fogos(t, Lc, n); }
          if (Lc.chamines.length) fumaca(t, Lc, n);
          poeCamada(Lc, cam);
          if (Lc.nome === 'longe') { c.globalCompositeOperation = 'lighter'; poeCamada(Lc, cam, Lc.fogo, 0.3); c.globalCompositeOperation = 'source-over'; }

          if (Lc === terraco) {
            // poças de luz no chão (luz dos postes, mais forte de noite)
            c.globalCompositeOperation = 'lighter';
            reg.luzes.filter((l) => l.z === Lc.z).forEach((l, i) => {
              const q = luzQ * (1 + 0.08 * ruido(t * 6, i + 2));
              const [x, y, s] = naTela(l.x, l.chao + 3, Lc.z, cam);
              c.save(); c.translate(x, y); c.scale(1, 0.32);
              const gr = c.createRadialGradient(0, 0, 0, 0, 0, 46 * s);
              gr.addColorStop(0, Filme.cor(hexDe('lanterna'), null, 0, 0.32 * q)); gr.addColorStop(1, 'rgba(0,0,0,0)');
              c.fillStyle = gr; c.fillRect(-46 * s, -46 * s, 92 * s, 92 * s); c.restore();
            });
            c.globalCompositeOperation = 'source-over';
            // bonecos: aldeões parados, depois o herói
            const perto = (x) => { let m = null, dm = 1e9; for (const l of reg.luzes) if (l.z === Lc.z && Math.abs(l.x - x) < dm) { dm = Math.abs(l.x - x); m = l; } return m; };
            for (const a of H.atores || []) boneco(a.sprite, a.anima || 'parado', t, a.x, a.pe, Lc.z, cam, n, a.fase, perto(a.x));
            const hx = heroiX(t), correndo = Math.abs(heroiX(t + 0.03) - heroiX(t - 0.03)) > 0.5;
            boneco(HE.sprite, correndo ? 'corre' : 'parado', t, hx, HE.pe, Lc.z, cam, n, 0, perto(hx));
            // halo das lanternas (clareia também quem passa perto)
            c.globalCompositeOperation = 'lighter';
            reg.luzes.forEach((l, i) => {
              const q = luzQ * (1 + 0.08 * ruido(t * 6, i + 2));
              const [x, y, s] = naTela(l.x, l.y, l.z, cam), r = 22 * s;
              if (x < -r || x > largura + r) return;
              const gr = c.createRadialGradient(x, y, 0, x, y, r);
              gr.addColorStop(0, Filme.cor(hexDe('lanterna'), null, 0, 0.28 * q)); gr.addColorStop(1, 'rgba(0,0,0,0)');
              c.fillStyle = gr; c.fillRect(x - r, y - r, 2 * r, 2 * r);
            });
            c.globalCompositeOperation = 'source-over';
          }
        }

        // 3) vaga-lumes (só na tarde e no começo da noite)
        c.globalCompositeOperation = 'lighter';
        for (const v of vagalumes) {
          const a = Math.max(0, Math.sin(t * 2.2 * v.v + v.f)) * (0.4 + 0.6 * n);
          if (a < 0.05) continue;
          const [x, y, s] = naTela(v.x + Math.sin(t * 0.7 * v.v + v.f) * 10, v.y + Math.sin(t * 1.3 + v.f) * 5, 0, cam);
          c.fillStyle = Filme.cor(hexDe('folhaClara'), hexDe('luz'), 0.5, a); c.fillRect(x, y, 1.2 * s, 1.2 * s);
          cB.fillStyle = Filme.cor(hexDe('folhaClara'), null, 0, a); cB.fillRect(x * bl / largura, y * ba / altura, 1.4 * s * bl / largura + 0.5, 1.4 * s * ba / altura + 0.5);
        }
        c.globalCompositeOperation = 'source-over';

        // 4) brilho que vaza das luzes (bloom): a tela de brilho desfocada e somada
        cB2.globalCompositeOperation = 'source-over'; cB2.clearRect(0, 0, bl, ba);
        cB2.filter = `blur(${Math.max(1, 2 * k).toFixed(2)}px)`; cB2.drawImage(cvB, 0, 0); cB2.filter = 'none';
        c.imageSmoothingEnabled = true; c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.9; c.drawImage(cvB2, 0, 0, largura, altura);
        cB2.clearRect(0, 0, bl, ba); cB2.filter = `blur(${Math.max(2, 9 * k).toFixed(2)}px)`; cB2.drawImage(cvB, 0, 0); cB2.filter = 'none';
        c.globalAlpha = 0.85; c.drawImage(cvB2, 0, 0, largura, altura);
        c.globalAlpha = 1;

        // 5) clarão dos fogos
        const cl = clarao(t);
        if (cl) { c.fillStyle = Filme.cor(cl.cor, null, 0, 0.09 * cl.q); c.fillRect(0, 0, largura, altura); }

        // 6) raios de sol da tarde (luz em volume, entrando pela direita)
        const sol = 1 - n;
        if (sol > 0.01 && H.raios) {
          c.globalCompositeOperation = 'screen';
          for (const r of H.raios) {
            const x0 = r.x * largura, w = r.largura * largura, inc = -0.55 * altura;
            const gr = c.createLinearGradient(x0, 0, x0 + inc, altura);
            gr.addColorStop(0, Filme.cor(hexDe('laranjaCeu'), null, 0, 0.1 * sol)); gr.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = gr; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + w, 0); c.lineTo(x0 + w + inc, altura); c.lineTo(x0 + inc, altura); c.closePath(); c.fill();
          }
          c.globalCompositeOperation = 'source-over';
        }

        // 7) cantos mais escuros (vinheta) e título
        const vg = c.createRadialGradient(largura / 2, altura / 2, altura * 0.35, largura / 2, altura / 2, altura * 0.95);
        vg.addColorStop(0, 'rgba(20,14,30,0)'); vg.addColorStop(1, 'rgba(20,14,30,0.5)');
        c.fillStyle = vg; c.fillRect(0, 0, largura, altura);
        c.imageSmoothingEnabled = false;
        titulo(t);
      }

      // ---------- som: chiptune, passos e fogos nas mesmas marcas de tempo da imagem ----------
      function som() {
        const s = Som.criar(duracao, H.semente || 1), M = H.musica, P = M.passo;
        s.vento(0, duracao, { vol: 0.035, corte: 500, onda: 0.15 });                       // brisa da vila
        M.melodia.forEach((nota, i) => { if (nota && i * P < duracao - 0.6) s.nota(nota, 0.3 + i * P, P * 0.8, { forma: 'quad', vol: 0.045, ataque: 0.005, solta: 0.12, pan: 0.15 }); });
        M.baixo.forEach((nota, i) => { const t0 = 0.3 + i * P * 4; if (t0 < duracao - 0.5) s.nota(nota, t0, P * 3.6, { forma: 'tri', vol: 0.11, ataque: 0.01, solta: 0.2 }); });
        // arpejo rapidinho, bem baixo (o "acorde" dos videogames antigos)
        for (let t = 0.3, i = 0; t < duracao - 0.6; t += P / 2, i++) {
          const ac = M.arpejos[Math.floor((t - 0.3) / (P * 8)) % M.arpejos.length];
          s.nota(ac[i % ac.length], t, P / 2 * 0.7, { forma: 'quad', vol: 0.016, ataque: 0.003, solta: 0.05, pan: -0.3 });
        }
        // passos do herói: um toque em cada pisada do ciclo de corrida
        const corre = SPR[HE.sprite].corre;
        for (let q = 0; q < duracao * 60; q++) {
          const t = q / 60, i = Math.floor(t * corre.ritmo);
          if (Math.floor((t - 1 / 60) * corre.ritmo) !== i && i % 2 === 0 && Math.abs(heroiX(t + 0.03) - heroiX(t - 0.03)) > 0.5) s.toque(t, { vol: 0.045, corte: 1400, dur: 0.05, pan: 0.1 });
        }
        // grilos quando escurece
        for (let t = N.de ?? 6; t < duracao - 0.5; t += 0.9) s.pio(t, { freq: 4300, vol: 0.012, repete: 3, intervalo: 0.06, pan: -0.5 });
        // fogos: assobio subindo, estouro grave, estalinhos e brilho
        const ac = sorteio((H.semente || 1) * 53);
        H.fogos.forEach((f, i) => {
          const sub = H.subida || 0.7, pan = limita((f.x - 1300) / 600, -0.8, 0.8);
          s.pio(f.t - sub, { freq: 900, sobe: 1.6, dur: sub * 0.9, repete: 1, vol: 0.018, pan });
          s.batida(f.t, { freq: 60, vol: 0.35, dur: 0.5, pan });
          s.toque(f.t, { vol: 0.2, corte: 2400, dur: 0.18, pan });
          for (let j = 0; j < 14; j++) s.toque(f.t + 0.35 + ac() * 0.9, { vol: 0.03 + ac() * 0.03, corte: 5000, dur: 0.02, pan: pan + (ac() - 0.5) * 0.6 });
          s.sino(['C6', 'E6', 'G6', 'A6', 'D6'][i % 5], f.t + 0.05, 1.2, { vol: 0.03, brilho: 2.5, pan });
        });
        s.sala(0.5);
        return s.fim({ entra: 0.3, sai: 1.0 });
      }

      return { desenhar, som };
    },
  });
})();
