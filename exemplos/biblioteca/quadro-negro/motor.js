// MOTOR "quadro-negro" — animação de linha de giz numa lousa verde-escura.
// Jeito de animar: camadas-planas (desenho 2D em canvas), com um "lápis" de giz próprio (giz.js).
// A lousa é uma só e comprida: a câmera desliza por ela, e o apagador limpa entre as partes.
// Este arquivo sabe DESENHAR peças de giz (bicho, cubo, bola, tubo, anel, setas, letras...).
// O QUE aparece, ONDE e QUANDO está em historia.json. Este arquivo não muda de filme para filme.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, entraDevagar, vaiVolta, sorteio, ruido } = Filme;
  const { arco, elipse, traco, preenche, texto, largura: larguraTexto } = Giz;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const G = 3600;           // gravidade (px/s²) das coisas que caem

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 15,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n || P.giz;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };

      // ---------- câmera: chaves {t, x, y, z} (x, y = centro da vista na lousa) ----------
      const CHAVES = (H.camera && H.camera.length ? H.camera : [{ t: 0, x: L / 2, y: A / 2 }]).map((q) => ({ z: 1, ...q }));
      function camera(t) {
        if (t <= CHAVES[0].t) return CHAVES[0];
        for (let i = 0; i < CHAVES.length - 1; i++) {
          const a = CHAVES[i], b = CHAVES[i + 1];
          if (t < b.t) { const u = suave(trecho(t, a.t, b.t)); return { x: mistura(a.x, b.x, u), y: mistura(a.y, b.y, u), z: mistura(a.z, b.z, u) }; }
        }
        return CHAVES[CHAVES.length - 1];
      }

      // ---------- elementos: a pilha vira cubos soltos; cada um ganha semente e apagador ----------
      const ELS = [];
      (H.elementos || []).forEach((e, i) => {
        if (e.tipo === 'pilha') {
          let n = 0;
          e.linhas.forEach((qtd, li) => {
            for (let j = 0; j < qtd; j++) {
              ELS.push({ tipo: 'cubo', cor: e.cor || 'amarelo', tam: e.tam, x: e.x + (j - (qtd - 1) / 2) * e.tam * 1.04, y: e.y - li * e.tam * 1.02,
                t: e.t + n * e.passo, queda: e.queda || 260, fica: e.fica, ate: e.ate });
              n++;
            }
          });
        } else ELS.push({ ...e });
      });
      ELS.forEach((e, i) => { e.sem = (H.semente || 1) * 101 + i * 17; e.dur = e.dur ?? 0; });
      const APAG = (H.apagadores || []).slice().sort((a, b) => a.t - b.t);
      ELS.forEach((e) => { e.apagador = e.fica ? null : APAG.find((ap) => ap.t > e.t) || null; });

      // ---------- a lousa: pintada uma vez, maior que a área que a câmera visita ----------
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const q of CHAVES) { bx0 = Math.min(bx0, q.x - L / 2 / q.z); bx1 = Math.max(bx1, q.x + L / 2 / q.z); by0 = Math.min(by0, q.y - A / 2 / q.z); by1 = Math.max(by1, q.y + A / 2 / q.z); }
      bx0 -= 120; by0 -= 120; bx1 += 120; by1 += 120;
      const lousa = novaTela((bx1 - bx0) * k, (by1 - by0) * k);
      (function pintaLousa() {
        const lc = lousa.getContext('2d'), r = sorteio((H.semente || 1) * 7 + 3);
        lc.scale(k, k); lc.translate(-bx0, -by0);
        const W = bx1 - bx0, Hh = by1 - by0;
        lc.fillStyle = cor('lousa'); lc.fillRect(bx0, by0, W, Hh);
        // manchas de pó: claras e escuras, grandes e macias
        const nManchas = Math.round(W * Hh / 90000);
        for (let i = 0; i < nManchas; i++) {
          const x = bx0 + r() * W, y = by0 + r() * Hh, raio = 120 + r() * 420, clara = r() < 0.6;
          const gr = lc.createRadialGradient(x, y, 0, x, y, raio);
          gr.addColorStop(0, clara ? Filme.cor(cor('lousaClara'), null, 0, 0.35 + r() * 0.3) : 'rgba(0,0,0,0.25)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          lc.fillStyle = gr; lc.fillRect(x - raio, y - raio, raio * 2, raio * 2);
        }
        // marcas antigas de apagador: arcos largos e quase invisíveis
        lc.lineCap = 'round';
        for (let i = 0; i < nManchas * 0.7; i++) {
          const x = bx0 + r() * W, y = by0 + r() * Hh, comp = 250 + r() * 600, ang = -0.4 + r() * 0.8;
          lc.strokeStyle = `rgba(230,240,230,${0.02 + r() * 0.035})`; lc.lineWidth = 50 + r() * 90;
          lc.beginPath(); lc.moveTo(x, y); lc.quadraticCurveTo(x + comp / 2, y + Math.sin(ang) * comp * 0.5 - 80 + r() * 160, x + comp * Math.cos(ang), y + comp * Math.sin(ang)); lc.stroke();
        }
        // riscos finos e pó solto
        for (let i = 0; i < nManchas * 3; i++) {
          const x = bx0 + r() * W, y = by0 + r() * Hh, comp = 30 + r() * 220, ang = r() * 6.28;
          lc.strokeStyle = `rgba(220,235,225,${0.03 + r() * 0.05})`; lc.lineWidth = 1 + r() * 1.5;
          lc.beginPath(); lc.moveTo(x, y); lc.lineTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp); lc.stroke();
        }
        for (let i = 0; i < nManchas * 60; i++) {
          lc.fillStyle = `rgba(230,240,230,${0.05 + r() * 0.12})`;
          lc.fillRect(bx0 + r() * W, by0 + r() * Hh, 1 + r() * 2, 1 + r() * 2);
        }
      })();

      // ---------- textura do giz: furinhos que tiram tinta do traço (borda quebrada) ----------
      const graos = novaTela(384, 384);
      (function () {
        const gc = graos.getContext('2d'), img = gc.createImageData(384, 384), d = img.data, r = sorteio(4242);
        for (let i = 0; i < d.length; i += 4) { const v = r(); d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = v < 0.55 ? 0 : Math.round((v - 0.55) / 0.45 * 230); }
        gc.putImageData(img, 0, 0);
      })();
      const camadaGiz = novaTela(tela.width, tela.height), g = camadaGiz.getContext('2d');
      const padrao = g.createPattern(graos, 'repeat');

      // vinheta: os cantos da lousa mais escuros (pintada uma vez)
      const vinheta = novaTela(tela.width, tela.height);
      (function () {
        const vc = vinheta.getContext('2d'), w = tela.width, h = tela.height;
        const gr = vc.createRadialGradient(w / 2, h * 0.45, h * 0.25, w / 2, h * 0.5, h * 0.75);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
        vc.fillStyle = gr; vc.fillRect(0, 0, w, h);
      })();

      // ---------- peças ----------
      const prog = (e, t) => (e.dur > 0 ? trecho(t, e.t, e.t + e.dur) : 1);
      const LARG = H.traco || 7;

      // cubo: frente quadrada + tampa e lado em perspectiva; o (0,0) é o centro da frente
      function desenhaCubo(gc, s, cr, pr, o) {
        const h = s / 2, d = s * 0.32;
        const frente = [[-h, -h], [h, -h], [h, h], [-h, h]];
        preenche(gc, frente, { cor: cr, prog: pr, sem: o.sem, boil: o.boil });
        preenche(gc, [[-h, -h], [-h + d, -h - d], [h + d, -h - d], [h, -h]], { cor: cr, prog: pr, veu: 0.15, sem: o.sem + 1, boil: o.boil });
        const lado = { cor: cr, larg: LARG * 0.9, prog: pr, sem: o.sem, boil: o.boil, tremor: 1.2 };
        let p = traco(gc, [...frente, [-h, -h]], lado);
        p = traco(gc, [[-h, -h], [-h + d, -h - d], [h + d, -h - d], [h + d, h - d], [h, h]], { ...lado, sem: o.sem + 2 }) || p;
        traco(gc, [[h, -h], [h + d, -h - d]], { ...lado, sem: o.sem + 3 });
        return p;
      }

      // queda com gravidade, quique curto e amassado na chegada; depois, rolar de lado (opcional)
      function movimentoQueda(e, t) {
        const q = e.queda || 0, T = e.tempo || (q > 0 ? Math.sqrt(2 * q / G) : 0), ts = t - e.t;
        const s = { x: e.x, y: e.y, giro: 0, sx: 1, sy: 1, pousou: ts >= T, chegada: e.t + T };
        if (ts < T) { const u = ts / T; s.y = e.y - q * (1 - u * u); s.giro = (e.giroNoAr || 0) * (1 - u); return s; }
        const t2 = ts - T, am = Math.exp(-t2 * 13) * Math.cos(t2 * 32) * Math.min(0.28, 0.06 + q / 2500);
        s.sy = 1 - am; s.sx = 1 + am * 0.6;
        if (t2 < 0.2) s.y -= Math.sin(Math.PI * t2 / 0.2) * Math.min(30, q * 0.05);
        if (e.depois) {
          const D = e.depois, u = trecho(t2, 0.12, 0.12 + (D.dur || 0.6)), giros = D.giros || 1;
          s.x += D.dx * saiDevagar(u);
          s.giro = Math.sign(D.dx) * 90 * giros * saiDevagar(u);
          s.y -= Math.abs(Math.sin(Math.PI * giros * saiDevagar(u))) * (e.tam || 80) * 0.22;
        }
        return s;
      }

      // poeira de giz que sobe quando algo bate
      function poeira(gc, x, y, t0, t, semente, larguraBase) {
        const u = (t - t0) / 0.55;
        if (u < 0 || u > 1) return;
        const r = sorteio(semente);
        for (let i = 0; i < 9; i++) {
          const lado = i % 2 ? 1 : -1, vx = lado * (40 + r() * 90), vy = -(20 + r() * 60), raio = 4 + r() * 7;
          const px = x + lado * larguraBase * 0.5 + vx * saiDevagar(u), py = y + vy * saiDevagar(u);
          gc.globalAlpha = 0.55 * (1 - u); gc.fillStyle = cor('giz');
          gc.beginPath(); gc.arc(px, py, raio * (0.6 + u), 0, 6.28); gc.fill();
        }
        gc.globalAlpha = 1;
      }

      // o bicho: um bichinho redondo e original, de giz (corpo, cabeça, orelhas, bochecha rosa)
      function estadoBicho(e, t) {
        let x = e.x, dir = e.dir || 1, sx = 1, sy = 1, pulo = 0, andando = false, dist = 0, raios = 0;
        for (const m of e.movimentos || []) {
          if (m.tipo === 'anda' && t >= m.de) {
            const u = trecho(t, m.de, m.ate), x0 = x;
            x = mistura(x0, m.para, u); dist += Math.abs(m.para - x0) * u; if (u > 0 && u < 1) andando = true;
          } else if (m.tipo === 'agacha') {
            const u = trecho(t, m.de, m.ate);
            if (u > 0 && u < 1) { const s = vaiVolta(u); sy *= 1 - 0.2 * s; sx *= 1 + 0.12 * s; }
          } else if (m.tipo === 'vira' && t >= m.em) {
            // encolhe de lado, troca de lado no meio e volta a abrir
            const u = trecho(t, m.em, m.em + 0.16);
            if (u >= 0.5) dir = -dir;
            sx *= Math.max(0.15, Math.abs(Math.cos(Math.PI * u)));
          } else if (m.tipo === 'orgulho' || m.tipo === 'pula') {
            const u = trecho(t, m.de, m.ate);
            if (u > 0 && u < 1) {
              const s = vaiVolta(u);
              if (m.tipo === 'orgulho') { sy *= 1 + 0.1 * s; sx *= 1 - 0.05 * s; raios = s; }
              pulo = Math.max(pulo, (m.altura || 30) * Math.abs(Math.sin(Math.PI * u * (m.vezes || 1))));
            } else if (m.tipo === 'orgulho' && t >= m.ate && m.ficaRaios) raios = 1;
          }
        }
        return { x, dir, sx, sy, pulo, andando, dist, raios };
      }
      function desenhaBicho(gc, e, t, tb, boil) {
        const s = estadoBicho(e, tb), esc = e.escala || 1, pr = prog(e, t);
        const fase = s.dist / 38 * Math.PI, balanco = s.andando ? Math.abs(Math.sin(fase)) * 7 : 0;
        gc.save();
        gc.translate(s.x, e.y - s.pulo);
        gc.scale(s.dir * esc * s.sx, esc * s.sy);
        const o = (n, extra = {}) => ({ cor: cor('giz'), larg: LARG / esc, prog: pr, sem: e.sem + n, boil, ...extra });
        let ponta = null;
        const risca = (pts, n, extra) => { const p = traco(gc, pts, o(n, extra)); if (p) ponta = p; };
        // pernas (de 2 em 2 quadros, como desenho à mão)
        [-108, -66, 26, 66].forEach((xp, i) => {
          const f = fase + (i % 2 ? Math.PI : 0), ergue = s.andando ? Math.max(0, Math.sin(f)) * 16 : 0, dx = s.andando ? Math.cos(f) * 9 : 0;
          risca([[xp - 13, -30], [xp - 13 + dx, -ergue], [xp + 13 + dx, -ergue], [xp + 13, -30]], 10 + i);
        });
        gc.translate(0, -balanco);
        risca(elipse(-22, -98, 126, 78, 150), 1);                 // corpo
        risca(arco(-150, -110, 12, 10, 100, 260), 2);             // rabinho
        if (e.intestino) {
          const pts = [];
          for (let i = 0; i <= 200; i++) { const u = i / 200; pts.push([-118 + 156 * u + 15 * Math.cos(2 * Math.PI * 5 * u + Math.PI), -98 + 20 * Math.sin(2 * Math.PI * 5 * u + Math.PI)]); }
          const pi = prog({ t: e.intestino.t ?? e.t, dur: e.intestino.dur ?? 0.6 }, t);
          traco(gc, pts, o(30, { cor: cor('rosa'), prog: pi, larg: LARG * 0.85 / esc }));
          traco(gc, elipse(52, -98, 20, 17), o(31, { cor: cor('rosa'), prog: pi }));
        }
        risca(elipse(92, -128, 64, 58, 200), 3);                  // cabeça
        risca(arco(60, -176, 15, 15, 175, 365), 4);               // orelhas
        risca(arco(120, -180, 15, 15, 175, 365), 5);
        risca(arco(76, -130, 10, 8, 200, 340), 6);                // olhos fechados de contente
        risca(arco(118, -130, 10, 8, 200, 340), 7);
        risca(arco(104, -108, 11, 8, 20, 160), 8);                // sorriso
        if (pr > 0.6) {
          const bo = { cor: cor('rosa'), prog: (pr - 0.6) / 0.4, sem: e.sem + 20, boil };
          preenche(gc, elipse(64, -104, 15, 10), { ...bo, veu: 0.7 });
          preenche(gc, elipse(150, -122, 11, 9), { ...bo, veu: 0.8 });   // nariz
        }
        if (s.raios > 0) {
          const rr = s.raios;
          for (let i = 0; i < 5; i++) {
            const a = (-150 + i * 30) * Math.PI / 180, r0 = 82, r1 = 82 + 34 * rr;
            traco(gc, [[92 + Math.cos(a) * r0, -150 + Math.sin(a) * r0], [92 + Math.cos(a) * r1, -150 + Math.sin(a) * r1]], o(40 + i, { prog: 1 }));
          }
        }
        gc.restore();
        return ponta;
      }

      // contorno de um caroço que vai de redondo a quadrado (superelipse: n = 2 é redondo, n alto é quadrado)
      function caroco(cx, cy, tam, quadrado) {
        const n = mistura(2.2, 9, quadrado), pts = [], a = tam / 2;
        for (let i = 0; i <= 64; i++) {
          const th = i / 64 * Math.PI * 2, co = Math.cos(th), si = Math.sin(th);
          pts.push([cx + a * Math.sign(co) * Math.pow(Math.abs(co), 2 / n), cy + a * Math.sign(si) * Math.pow(Math.abs(si), 2 / n)]);
        }
        return pts;
      }
      function desenhaCaroco(gc, C, cx, cy, t, boil, sem, pr) {
        const qd = C.quadra ? suave(trecho(t, C.quadra[0], C.quadra[1])) : 0;
        const pts = caroco(cx, cy, C.tam, qd);
        preenche(gc, pts, { cor: cor(C.cor || 'amarelo'), prog: pr, sem, boil });
        traco(gc, pts, { cor: cor(C.cor || 'amarelo'), larg: LARG, prog: pr, sem, boil });
        if (C.cantos && qd > 0.95) {
          const a = C.tam / 2 + 16, m = 22;
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => traco(gc, [[cx + sx * a, cy + sy * (a - m)], [cx + sx * a, cy + sy * a], [cx + sx * (a - m), cy + sy * a]], { cor: cor('giz'), larg: LARG * 0.8, sem: sem + i, boil }));
        }
      }

      function onda(x0, y0, x1, y1, amp, ciclos) {
        const pts = [], dx = x1 - x0, dy = y1 - y0, comp = Math.hypot(dx, dy), nx = -dy / comp, ny = dx / comp;
        for (let i = 0; i <= 80; i++) { const u = i / 80, w = amp * Math.sin(u * ciclos * 2 * Math.PI); pts.push([x0 + dx * u + nx * w, y0 + dy * u + ny * w]); }
        return pts;
      }

      // cada tipo de peça sabe se desenhar; devolve a ponta do giz se ainda está riscando
      const PECAS = {
        linha(gc, e, t, b) { return traco(gc, e.pontos, { cor: cor(e.cor), larg: e.larg || LARG, prog: prog(e, t), sem: e.sem, boil: b, tracejado: e.tracejado }); },
        chao(gc, e, t, b) {
          if (!e._tufos) { const r = sorteio(e.sem); e._tufos = Array.from({ length: e.tufos ?? 5 }, () => e.x1 + (e.x2 - e.x1) * (0.05 + 0.9 * r())); }
          const pr = prog(e, t);
          const p = traco(gc, [[e.x1, e.y], [e.x2, e.y]], { cor: cor(e.cor), larg: e.larg || LARG, prog: pr, sem: e.sem, boil: b, passo: 14 });
          e._tufos.forEach((x, i) => { if ((x - e.x1) / (e.x2 - e.x1) < pr) traco(gc, [[x - 9, e.y - 18], [x - 2, e.y], [x + 1, e.y - 24], [x + 4, e.y], [x + 11, e.y - 16]], { cor: cor(e.cor), larg: 3.5, sem: e.sem + i, boil: b }); });
          return p;
        },
        elipse(gc, e, t, b) { return traco(gc, elipse(e.x, e.y, e.rx, e.ry, e.comeco ?? -120), { cor: cor(e.cor), larg: e.larg || LARG, prog: prog(e, t), sem: e.sem, boil: b }); },
        texto(gc, e, t, b) { return texto(gc, e.texto, e.x, e.y, e.tam, { cor: cor(e.cor), prog: prog(e, t), sem: e.sem, boil: b, alinha: e.alinha, larg: e.larg }); },
        seta(gc, e, t, b) {
          const dx = e.x2 - e.x1, dy = e.y2 - e.y1, cmp = Math.hypot(dx, dy), ux = dx / cmp, uy = dy / cmp;
          const pulso = e.pulsa ? 12 * Math.sin(2 * Math.PI * 2 * (t - e.t)) : 0;
          const ox = ux * pulso, oy = uy * pulso, pr = prog(e, t), cab = e.cabeca || 26;
          const o = { cor: cor(e.cor), larg: e.larg || LARG, sem: e.sem, boil: b };
          const p = traco(gc, [[e.x1 + ox, e.y1 + oy], [e.x2 + ox, e.y2 + oy]], { ...o, prog: limita(pr / 0.75) });
          if (pr > 0.75) traco(gc, [[e.x2 + ox - ux * cab - uy * cab * 0.7, e.y2 + oy - uy * cab + ux * cab * 0.7], [e.x2 + ox, e.y2 + oy], [e.x2 + ox - ux * cab + uy * cab * 0.7, e.y2 + oy - uy * cab - ux * cab * 0.7]], { ...o, prog: (pr - 0.75) / 0.25, sem: e.sem + 1 });
          return p;
        },
        cubo(gc, e, t, b) {
          const s = e.queda ? movimentoQueda(e, t) : { x: e.x, y: e.y, giro: 0, sx: 1, sy: 1 };
          const tam = e.tam || 90;
          gc.save();
          gc.translate(s.x, s.y); gc.rotate((e.inclina || 0) * Math.PI / 180);
          gc.translate(0, -tam / 2 * s.sy); gc.rotate(s.giro * Math.PI / 180); gc.scale(s.sx, s.sy);
          const p = desenhaCubo(gc, tam, cor(e.cor || 'amarelo'), prog(e, t), { sem: e.sem, boil: b });
          gc.restore();
          if (e.queda && s.pousou && !e.semPoeira) poeira(gc, s.x, s.y, s.chegada, t, e.sem, tam);
          return p;
        },
        bola(gc, e, t, b) {
          const s = e.queda ? movimentoQueda(e, t) : { x: e.x, y: e.y, pousou: true };
          let x = s.x, y = s.y, giro = 0, andou = 0, vel = 0;
          const C = e.caminho;
          if (C && t > C.de) {
            const pts = C.pontos, u = entraDevagar(trecho(t, C.de, C.ate)) , cum = [0];
            for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
            const alvo = u * cum[cum.length - 1];
            let i = 1; while (i < pts.length - 1 && cum[i] < alvo) i++;
            const kk = (alvo - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
            x = mistura(pts[i - 1][0], pts[i][0], kk); y = mistura(pts[i - 1][1], pts[i][1], kk); andou = alvo; giro = alvo / e.r; vel = u > 0 && u < 1 ? 1 : 0;
          }
          const cy = y - e.r, cr = cor(e.cor || 'rosa'), pr = prog(e, t);
          const p = traco(gc, elipse(x, cy, e.r, e.r, -90), { cor: cr, larg: LARG, prog: pr, sem: e.sem, boil: b });
          const espiral = []; for (let i = 0; i <= 30; i++) { const a = giro + i / 30 * Math.PI * 3, rr = e.r * 0.6 * i / 30; espiral.push([x + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
          traco(gc, espiral, { cor: cr, larg: LARG * 0.6, prog: pr, sem: e.sem + 1, boil: b });
          if (vel) for (let i = 0; i < 3; i++) traco(gc, [[x - e.r * 1.4 - 40, cy - e.r * 0.5 + i * e.r * 0.5], [x - e.r * 1.3, cy - e.r * 0.5 + i * e.r * 0.5]], { cor: cor('giz'), larg: 3.5, sem: e.sem + 5 + i, boil: b, alfa: 0.7 });
          if (e.queda && s.pousou && andou < 1) poeira(gc, s.x, s.y, s.chegada, t, e.sem, e.r * 2);
          return p;
        },
        tubo(gc, e, t, b) {
          const pr = prog(e, t), x0 = e.x - e.comp / 2, x1 = e.x + e.comp / 2, h = e.alt / 2;
          const o = { cor: cor(e.cor), larg: e.larg || LARG, sem: e.sem, boil: b };
          let p = traco(gc, [[x0, e.y - h], [x1, e.y - h]], { ...o, prog: pr });
          traco(gc, [[x0, e.y + h], [x1, e.y + h]], { ...o, prog: pr, sem: e.sem + 1 });
          traco(gc, elipse(x0, e.y, e.alt * 0.16, h), { ...o, prog: pr, sem: e.sem + 2 });
          traco(gc, arco(x1, e.y, e.alt * 0.16, h, -90, 90), { ...o, prog: pr, sem: e.sem + 3 });
          const F = e.faixas || [], pf = prog({ t: e.faixasEm ?? e.t + e.dur, dur: 0.8 }, t);
          F.forEach((f, i) => {
            const fx = mistura(x0 + 70, x1 - 70, F.length > 1 ? i / (F.length - 1) : 0.5);
            const pts = f.onda ? onda(fx, e.y - h + 6, fx, e.y + h - 6, 9, 3) : [[fx, e.y - h + 6], [fx, e.y + h - 6]];
            const pp = traco(gc, pts, { ...o, cor: cor(f.cor), larg: LARG * 1.3, prog: limita(pf * F.length - i), sem: e.sem + 10 + i });
            if (pp) p = pp;
          });
          if (e.caroco && t >= (e.caroco.t ?? e.t)) {
            const C = e.caroco, u = suave(trecho(t, C.de, C.ate));
            desenhaCaroco(gc, C, mistura(C.x0, C.x1, u), e.y, t, b, e.sem + 30, prog({ t: C.t ?? e.t, dur: 0.4 }, t));
          }
          return p;
        },
        anel(gc, e, t, b) {
          const pr = prog(e, t), o = { larg: LARG, sem: e.sem, boil: b };
          let p = traco(gc, elipse(e.x, e.y, e.r, e.r), { ...o, cor: cor(e.cor), prog: pr });
          (e.arcos || []).forEach((a, i) => {
            const rr = e.r + 16, pts = [];
            for (let j = 0; j <= 60; j++) { const ang = (a.de + (a.ate - a.de) * j / 60) * Math.PI / 180, w = a.onda ? 9 * Math.sin(j / 60 * Math.PI * 2 * 5) : 0; pts.push([e.x + Math.cos(ang) * (rr + w), e.y + Math.sin(ang) * (rr + w)]); }
            const pp = traco(gc, pts, { ...o, cor: cor(a.cor), larg: LARG * 1.5, prog: limita(prog({ t: e.t + e.dur * 0.6, dur: e.dur }, t) * 2 - i * 0.3), sem: e.sem + 5 + i });
            if (pp) p = pp;
          });
          if (e.caroco) desenhaCaroco(gc, e.caroco, e.x, e.y, t, b, e.sem + 30, prog({ t: e.caroco.t ?? e.t, dur: 0.4 }, t));
          return p;
        },
        lua(gc, e, t, b) {
          const r = e.r, pts = [...arco(e.x, e.y, r, r, 50, 310), ...arco(e.x + 0.4 * r, e.y, 0.804 * r, 0.804 * r, 287.6, 72.4)];
          return traco(gc, pts, { cor: cor(e.cor), larg: e.larg || LARG, prog: prog(e, t), sem: e.sem, boil: b });
        },
        estrelas(gc, e, t, b) {
          const r = sorteio(e.sem), [ax, ay, aw, ah] = e.area;
          for (let i = 0; i < (e.n || 6); i++) {
            const x = ax + r() * aw, y = ay + r() * ah, tam = 9 + r() * 10, nasce = e.t + i * (e.dur || 0.6) / (e.n || 6), fase = r() * 6.28;
            if (t < nasce) continue;
            const s = tam * (0.75 + 0.25 * Math.sin(2 * Math.PI * 1.3 * t + fase)) * saiDevagar(trecho(t, nasce, nasce + 0.2));
            const o = { cor: cor(e.cor), larg: 4, sem: e.sem + i, boil: b };
            traco(gc, [[x - s, y], [x + s, y]], o); traco(gc, [[x, y - s], [x, y + s]], { ...o, sem: e.sem + i + 50 });
          }
          return null;
        },
        brilho(gc, e, t, b) {
          let p = null;
          for (let i = 0; i < (e.n || 3); i++) {
            const pp = traco(gc, arco(e.x, e.y, e.r + i * 20, (e.r + i * 20) * 0.6, 215, 325), { cor: cor(e.cor), larg: LARG * 0.8, prog: limita(prog(e, t) * (e.n || 3) - i), sem: e.sem + i, boil: b });
            if (pp) p = pp;
          }
          return p;
        },
        bicho(gc, e, t, b, tb) { return desenhaBicho(gc, e, t, tb, b); },
      };

      // ---------- apagador ----------
      // frente do apagador: a reta x + 0,3·y = s (na tela), que corre da esquerda para a direita
      const frente = (ap, t) => mistura(-500, L + 0.3 * A + 500, trecho(t, ap.t, ap.t + ap.dur));
      function recortaApagado(gc, ap, t) {
        // deixa desenhar só a parte da tela que o apagador ainda não passou
        const s = frente(ap, t);
        gc.save(); gc.setTransform(k, 0, 0, k, 0, 0);
        gc.beginPath(); gc.moveTo(s, 0); gc.lineTo(L + 2000, 0); gc.lineTo(L + 2000, A); gc.lineTo(s - 0.3 * A, A); gc.closePath();
        gc.restore(); gc.clip();
      }
      function borroes(ap, i) {
        if (!ap._borroes) {
          const r = sorteio((H.semente || 1) * 31 + i * 7);
          ap._borroes = Array.from({ length: 16 }, () => ({ y: r() * A, x0: -100 + r() * 400, comp: 500 + r() * 900, larg: 70 + r() * 110, a: 0.035 + r() * 0.05, inc: -0.15 + r() * 0.3 }));
        }
        return ap._borroes;
      }
      function desenhaApagadores(t) {
        // os borrões do último apagador ficam na lousa até o próximo
        const ativos = APAG.filter((ap) => t >= ap.t);
        if (!ativos.length) return;
        const ap = ativos[ativos.length - 1], i = APAG.indexOf(ap), s = frente(ap, t);
        c.save(); c.setTransform(k, 0, 0, k, 0, 0);
        c.save(); c.beginPath(); c.moveTo(-2000, 0); c.lineTo(s, 0); c.lineTo(s - 0.3 * A, A); c.lineTo(-2000, A); c.closePath(); c.clip();
        c.lineCap = 'round';
        for (const m of borroes(ap, i)) {
          c.strokeStyle = `rgba(225,235,228,${m.a})`; c.lineWidth = m.larg;
          c.beginPath(); c.moveTo(m.x0, m.y); c.quadraticCurveTo(m.x0 + m.comp / 2, m.y + m.inc * m.comp - 60, m.x0 + m.comp, m.y + m.inc * m.comp * 2); c.stroke();
        }
        c.restore();
        if (t < ap.t + ap.dur) {
          // o apagador de feltro sobe e desce enquanto anda
          const u = trecho(t, ap.t, ap.t + ap.dur), y = A * 0.5 + A * 0.42 * Math.sin(2 * Math.PI * 2.5 * u), x = s - 0.3 * y - 40;
          c.translate(x, y); c.rotate(-0.25 + 0.1 * Math.sin(2 * Math.PI * 5 * u));
          c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-140 + 10, -60 + 14, 280, 120);
          c.fillStyle = cor('madeira'); c.fillRect(-140, -60, 280, 78);
          c.fillStyle = cor('feltro'); c.fillRect(-140, 18, 280, 42);
          c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 3; c.strokeRect(-140, -60, 280, 120);
        }
        c.restore();
      }

      // ---------- legendas: maiúsculas de giz, a palavra falada em amarelo ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 100, maxL = LG.largura || 940, palavras = lg.texto.split(/\s+/);
        const linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && larguraTexto(tenta, tam) > maxL) { linhas.push(atual); atual = [p]; } else atual.push(p); }
        if (atual.length) linhas.push(atual);
        // tempo de cada palavra: proporcional ao tamanho dela (fala de mentira, mas no ritmo)
        const pesos = palavras.map((p) => p.length + 2), soma = pesos.reduce((a, b) => a + b, 0);
        let acum = lg.de; const inicio = pesos.map((w) => { const v = acum; acum += (lg.ate - lg.de) * 0.85 * w / soma; return v; });
        return { ...lg, linhas, inicio, tam };
      });
      function desenhaLegenda(t, boil) {
        const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate);
        if (!lg) return false;
        let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
        const passo = lg.tam * 1.3, y0 = (LG.y || 1600) - (lg.linhas.length - 1) * passo / 2 + lg.tam / 2;
        g.setTransform(k, 0, 0, k, 0, 0);
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const txt = ln.join(' '), base = idx;
          // índice da palavra de cada letra, para pintar só a palavra falada
          const mapa = []; ln.forEach((p, pi) => { for (const _ of p) mapa.push(base + pi); mapa.push(-1); });
          texto(g, txt, L / 2, y0 + li * passo, lg.tam, { corLetra: (i) => (mapa[i] === falada ? cor('amarelo') : cor('giz')), sem: 900 + li, boil, larg: lg.tam * 0.095 });
          idx += ln.length;
        });
        return true;
      }

      // o bastão de giz na ponta do traço que está sendo feito
      function bastao(p) {
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(p[0], p[1]); c.rotate(-0.75); c.scale(k, k);
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(6, -2, 92, 22);
        c.fillStyle = cor('giz'); c.fillRect(0, -10, 90, 20);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 4, 90, 6);
        c.restore();
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        const q = Math.round(t * fps), boil = Math.floor(q / 3), tb = Math.floor(q / 2) * 2 / fps; // traço treme de 3 em 3; bicho posa de 2 em 2
        const cam = camera(t), z = cam.z * k, ox = (L / 2 - cam.x * cam.z) * k, oy = (A / 2 - cam.y * cam.z) * k;
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.fillStyle = cor('lousa'); c.fillRect(0, 0, tela.width, tela.height);
        c.setTransform(z, 0, 0, z, ox, oy);
        c.drawImage(lousa, bx0, by0, bx1 - bx0, by1 - by0);

        // giz numa folha separada: depois os furinhos do grão são tirados de uma vez
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, camadaGiz.width, camadaGiz.height);
        let ponta = null, pontaT = -1;
        for (const e of ELS) {
          if (t < e.t || (e.ate != null && t >= e.ate)) continue;
          const ap = e.apagador;
          if (ap && t >= ap.t + ap.dur) continue;
          g.save(); g.setTransform(z, 0, 0, z, ox, oy);
          if (ap && t >= ap.t) recortaApagado(g, ap, t);
          const p = PECAS[e.tipo] ? PECAS[e.tipo](g, e, t, boil, tb) : null;
          g.restore();
          if (p && e.t >= pontaT && !e.semBastao) { ponta = p; pontaT = e.t; }
        }
        const tiraGrao = () => {
          g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1;
          g.fillStyle = padrao; g.fillRect(0, 0, camadaGiz.width, camadaGiz.height); g.globalCompositeOperation = 'source-over';
        };
        padrao.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(ox) % 384, Math.round(oy) % 384]));
        tiraGrao();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 0.22; c.filter = `blur(${Math.max(1, 3 * k)}px)`; c.drawImage(camadaGiz, 0, 0); // pó em volta do traço
        c.filter = 'none'; c.globalAlpha = 1; c.drawImage(camadaGiz, 0, 0);
        if (ponta) bastao(ponta);

        desenhaApagadores(t);

        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, camadaGiz.width, camadaGiz.height);
        if (desenhaLegenda(t, boil)) {
          padrao.setTransform(new DOMMatrix([1, 0, 0, 1, 0, 0])); tiraGrao();
          c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(camadaGiz, 0, 0);
        }
        c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(vinheta, 0, 0);
        const fade = Math.min(trecho(t, 0, 0.25), 1 - trecho(t, duracao - 0.35, duracao));
        if (fade < 1) { c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, tela.width, tela.height); }
      }

      // ---------- som: as mesmas marcas de tempo da imagem ----------
      function som() {
        const M = H.musica || {}, m = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const panDe = (x) => limita((x - camera(0).x) / 900, -0.6, 0.6);
        // música de cordas beliscadas (pizzicato)
        const passo = M.passo || 0.25, vol = M.vol ?? 0.16;
        for (let i = 0, tt = M.entra || 0.2; tt < duracao - 0.6; i++, tt += passo) {
          const n = M.notas[i % M.notas.length];
          if (n) m.corda(n, tt, 0.35, { vol, maciez: 0.15, pan: i % 2 ? 0.25 : -0.25 });
          if (i % 4 === 0 && M.baixo) m.corda(M.baixo[(i / 4) % M.baixo.length], tt, 0.6, { vol: vol * 1.3, maciez: 0.6 });
        }
        // giz riscando: grãozinhos de ruído agudo durante cada desenho
        const risca = (t0, dur, pan, forca = 1) => {
          for (let tt = t0; tt < t0 + dur; tt += 0.018 + r() * 0.03) m.toque(tt, { vol: (0.03 + r() * 0.03) * forca, dur: 0.025 + r() * 0.03, corte: 4500 + r() * 3000, pan });
        };
        for (const e of ELS) {
          const pan = panDe(e.x ?? e.x1 ?? (e.pontos ? e.pontos[0][0] : 540));
          if (e.dur > 0.05) risca(e.t, e.dur, pan, e.tipo === 'texto' ? 0.8 : 1);
          if ((e.tipo === 'cubo' || e.tipo === 'bola') && e.queda) {
            const ch = e.t + (e.tempo || Math.sqrt(2 * e.queda / G));
            if (e.queda > 600) { m.batida(ch, { vol: 0.55, freq: 70, dur: 0.4, pan }); m.toque(ch, { vol: 0.12, corte: 500, dur: 0.15, pan }); }
            else if (e.tipo === 'bola') m.batida(ch, { vol: 0.25, freq: 320, dur: 0.12, pan });
            else { m.batida(ch, { vol: 0.35, freq: e.queda > 200 ? 95 : 180, dur: 0.18, pan }); m.toque(ch, { vol: 0.07, corte: 900, dur: 0.08, pan }); }
            if (e.depois) for (let j = 1; j <= (e.depois.giros || 1); j++) m.batida(ch + 0.12 + (e.depois.dur || 0.6) * j / (e.depois.giros || 1) * 0.7, { vol: 0.18, freq: 200, dur: 0.1, pan });
          }
          if (e.tipo === 'bola' && e.caminho) for (let tt = e.caminho.de; tt < e.caminho.ate; tt += 0.07) m.toque(tt, { vol: 0.03, corte: 700, dur: 0.06, pan: 0.3 });
          if (e.tipo === 'bicho') {
            let antes = 0;
            for (let tt = e.t; tt < duracao; tt += 1 / 120) {
              const s = estadoBicho(e, tt), passos = Math.floor(s.dist / 38);
              if (passos > antes && s.andando) m.toque(tt, { vol: 0.05, corte: 900, dur: 0.05, pan: panDe(s.x) });
              antes = passos;
            }
            for (const mv of e.movimentos || []) if (mv.tipo === 'orgulho' || mv.tipo === 'pula') m.pio(mv.de, { freq: 1500, sobe: 0.6, repete: 2, intervalo: 0.12, dur: 0.08, vol: 0.05 });
          }
        }
        for (const ap of APAG) {
          m.vento(ap.t, ap.dur + 0.1, { vol: 0.16, corte: 1800, onda: 2.5 / ap.dur, profundidade: 0.8, entra: 0.08, sai: 0.15 });
          risca(ap.t, ap.dur, 0, 0.5);
        }
        for (const s of M.sinos || []) s.notas.forEach((n, i) => m.sino(n, s.t + i * 0.09, 1.6, { vol: 0.12 }));
        m.sala(0.22);
        return m.fim({ entra: 0.05, sai: 0.6 });
      }

      return { desenhar, som };
    },
  });
})();
