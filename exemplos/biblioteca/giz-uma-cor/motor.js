// MOTOR "giz-uma-cor" — desenho de giz de cera de UMA cor só, impresso em papel creme (como uma
// litografia de uma tinta), fotografado quadro a quadro.
// Jeito de animar: desenho quadro a quadro "em três" (cada desenho fica 3 quadros) e câmera parada.
// Só dois tipos de marca, e só uma cor:
//   - massa: sombra cheia de giz, com borda seca e quebrada, risco na direção do traço e fiozinhos
//     de papel aparecendo por dentro;
//   - linha: contorno fino que engrossa e afina (grosso no meio, fino nas pontas).
// Tudo o que é luz fica papel em branco. A tinta é desenhada numa camada à parte, sempre opaca
// (giz sobre giz não escurece), o dente do papel é apagado dela e só então ela vai para o papel.
// O motor sabe desenhar: título em traços, touceiras de capim e folhas largas, a moça de perfil e
// folhinhas que o vento leva. ONDE fica cada peça e QUANDO cada coisa acontece vem de historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio, rgb } = Filme;
  const L = 1920, A = 1080;
  const TAU = Math.PI * 2;

  // ---------- sorteio sem memória: o mesmo par de números dá sempre o mesmo valor ----------
  function h2(a, b) {
    let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d); v = Math.imul(v ^ (v >>> 12), 0x297a2d39);
    return ((v ^ (v >>> 15)) >>> 0) / 4294967296;
  }
  // ruído macio em 2 dimensões (de 0 a 1)
  function vn(x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => h2(ix + i + s * 1013, iy + j - s * 7919);
    return mistura(mistura(g(0, 0), g(1, 0), ux), mistura(g(0, 1), g(1, 1), ux), uy);
  }
  const calombo = (t, a, d) => (t <= a || t >= a + d) ? 0 : Math.sin(Math.PI * (t - a) / d);
  const lerp2 = (p, q, k) => [mistura(p[0], q[0], k), mistura(p[1], q[1], k)];

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 6,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const k = largura / L;
      const C = Object.assign({ papel: '#f0e8d8', tinta: '#4a76d4' }, H.cores || {});
      const TR = Object.assign({ linha: 3.2, tremor: 1.4, borda: 2.6 }, H.traco || {});
      const V = Object.assign({ de: 1.6, x0: -300, velocidade: 1500, forca: 1, assenta: [3.9, 5.3] }, H.vento || {});
      const SEM = H.semente || 1, SEG = H.segurar || 3;
      const pecas = H.pecas || [];
      const c = tela.getContext('2d');
      const W = largura, Hh = altura;

      // ================= PAPEL (feito uma vez): papel creme com dente =================
      // Três folhas: a cada desenho o dente que "pega" o giz muda (o giz brilha, como em desenho à mão).
      // A célula do dente nunca fica menor que 1 pixel (a 640x360 o papel não vira listra).
      const celula = Math.max(1.15, 2.8 * k), celula2 = Math.max(2.4, 9 * k);
      const P0 = rgb(C.papel);
      function fazPapel(s) {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
        const dt = document.createElement('canvas'); dt.width = W; dt.height = Hh;
        const ip = cv.getContext('2d').createImageData(W, Hh), id = dt.getContext('2d').createImageData(W, Hh);
        for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
          const h = 0.62 * vn(x / celula, y / celula, s) + 0.38 * vn(x / celula2, y / celula2, s + 5);
          const nuvem = vn(x / (260 * k), y / (260 * k), s + 11);           // papel um pouco desigual
          const f = 1 + 0.035 * (h - 0.5) + 0.03 * (nuvem - 0.5);
          const o = (y * W + x) * 4;
          ip.data[o] = limita(P0[0] * f, 0, 255); ip.data[o + 1] = limita(P0[1] * f, 0, 255); ip.data[o + 2] = limita(P0[2] * f, 0, 255); ip.data[o + 3] = 255;
          // onde o papel é alto o giz pula (pontinho de papel); onde a mão pesou menos, o giz fica ralo
          const fraco = vn(x / (150 * k), y / (150 * k), s + 9);
          id.data[o + 3] = 255 * limita(limita((h - 0.67) / 0.12) * 0.9 + 0.12 * limita((fraco - 0.5) * 2));
        }
        cv.getContext('2d').putImageData(ip, 0, 0); dt.getContext('2d').putImageData(id, 0, 0);
        return { papel: cv, dente: dt };
      }
      const FOLHAS = [fazPapel(SEM * 3 + 1), fazPapel(SEM * 3 + 2), fazPapel(SEM * 3 + 3)];
      // a camada da tinta: tudo é desenhado aqui, opaco, e colado no papel no fim do quadro
      const cam = document.createElement('canvas'); cam.width = W; cam.height = Hh;
      const g = cam.getContext('2d');

      // ---------- estado de UM quadro (refeito no começo de cada desenhar) ----------
      let P = 0, tq = 0, folha = FOLHAS[0], idT = 0;

      // ================= O VENTO: uma conta só manda no capim, na saia, no cabelo e nas folhinhas =================
      // A rajada entra pela esquerda e anda para a direita; cada ponto x sente o vento quando ela chega.
      function sopro(x, t) {
        const tx = V.de + (x - V.x0) / V.velocidade, tau = t - tx;
        if (tau <= 0) return 0;
        const sobe = suave(limita(tau / 0.35));
        const onda = 0.4 * calombo(tau, 0, 0.7);                             // a onda que passa
        const rajada = 0.12 * Math.sin(TAU * (1.5 * t - x / 520)) * sobe;     // o vento não é liso
        const [a0, a1] = V.assenta, fica = 1 - suave(trecho(t, a0, a1));
        const volta = -0.16 * Math.sin(TAU * 1.3 * (t - a0)) * calombo(t, a0 + 0.35, a1 - a0);  // passa um pouco do ponto e volta
        return V.forca * ((sobe + onda + rajada) * fica + volta * sobe);
      }

      // ================= PINCEL =================
      // arredonda os cantos (Chaikin)
      function liso(pts, fechado, voltas = 2) {
        let p = pts;
        for (let v = 0; v < voltas; v++) {
          const q = [], n = p.length, m = fechado ? n : n - 1;
          if (!fechado) q.push(p[0]);
          for (let i = 0; i < m; i++) {
            const a = p[i], b = p[(i + 1) % n];
            q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
          }
          if (!fechado) q.push(p[n - 1]);
          p = q;
        }
        return p;
      }
      // a linha treme: pontos a cada "passo" px, empurrados por um ruído que muda a cada desenho;
      // "aspero" junta um tremido miúdo, ponto a ponto (a borda seca do giz)
      function treme(pts, id, amp, fechado, passo = 12, aspero = 0) {
        const src = fechado ? pts.concat([pts[0]]) : pts, out = [];
        let dd = 0;
        const em = (x, y, s, j) => [
          x + amp * (2 * vn(s / 55, P, id * 7 + 1) - 1) + aspero * (2 * h2(j * 2 + id * 977, P) - 1),
          y + amp * (2 * vn(s / 55, P, id * 7 + 2) - 1) + aspero * (2 * h2(j * 2 + 1 + id * 977, P) - 1)];
        let j = 0;
        out.push(em(src[0][0], src[0][1], 0, j++));
        for (let i = 1; i < src.length; i++) {
          const [ax, ay] = src[i - 1], [x, y] = src[i], d = Math.hypot(x - ax, y - ay), n = Math.max(1, Math.ceil(d / passo));
          for (let q = 1; q <= n; q++) out.push(em(ax + (x - ax) * q / n, ay + (y - ay) * q / n, dd + d * q / n, j++));
          dd += d;
        }
        if (fechado) out.pop();
        return out;
      }
      function caminho(ctx, p, fechado) {
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
        if (fechado) ctx.closePath();
      }
      function caixa(pts) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, R: Math.hypot(x1 - x0, y1 - y0) / 2 };
      }

      // ---- MASSA: sombra cheia de giz. ang = direção do risco (radianos). ----
      function massa(pts, o = {}) {
        const id = ++idT;
        const base = o.liso === false ? pts : liso(pts, true);
        const amp = o.amp ?? TR.borda;
        const p = treme(base, id, amp * 0.8, true, 5, amp * 0.55);
        g.save();
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = C.tinta;
        caminho(g, p, true); g.fill();
        const B = caixa(p);
        if (o.riscos !== false && (B.x1 - B.x0) * (B.y1 - B.y0) > 500) {
          // fiozinhos de papel no meio da massa, todos na direção do risco do giz
          g.clip();
          g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.strokeStyle = '#000';
          const ang = o.ang ?? -Math.PI / 2, dx = Math.cos(ang), dy = Math.sin(ang), R = B.R + 4;
          const passo = o.passo ?? 9;
          let i = 0;
          for (let s = -R; s <= R; s += passo, i++) {
            const r1 = h2(i * 3 + id * 101, P), r2 = h2(i * 5 + 7, P + id * 13), r3 = h2(i * 7 + 3, P * 3 + id);
            if (r1 < 0.35) continue;
            const px = B.cx - dy * (s + passo * (r2 - 0.5)), py = B.cy + dx * (s + passo * (r2 - 0.5));
            const a = -R + 2 * R * r3 * 0.7, b = a + R * (0.3 + 0.9 * r2);
            g.globalAlpha = 0.25 + 0.5 * r2; g.lineWidth = 0.9 + 1.4 * r1;
            g.beginPath(); g.moveTo(px + dx * a, py + dy * a); g.lineTo(px + dx * b, py + dy * b); g.stroke();
          }
        }
        g.restore();
        // borda seca: o giz pula aqui e ali na beira da massa
        g.save();
        g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineCap = 'round';
        g.lineWidth = o.mordida ?? 2.4; g.globalAlpha = 0.8;
        g.setLineDash([2 + 5 * h2(id, P + 1), 3 + 8 * h2(id + 3, P + 2), 1 + 3 * h2(id + 5, P), 6 + 9 * h2(id + 7, P)]);
        g.lineDashOffset = 60 * h2(id, P + 9);
        caminho(g, p, true); g.stroke();
        g.restore();
      }

      // ---- LINHA: contorno fino que engrossa no meio e afina nas pontas ----
      function linha(pts, o = {}) {
        const id = ++idT, w = o.larg ?? TR.linha;
        const base = (pts.length > 2 && o.liso !== false) ? liso(pts, false) : pts;
        const p = treme(base, id, o.amp ?? TR.tremor, false, 8, 0.25);
        const n = p.length; if (n < 2) return;
        const esq = [], dir = [];
        for (let i = 0; i < n; i++) {
          const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
          let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
          const u = i / (n - 1);
          const ww = w * (0.18 + 0.82 * Math.pow(Math.sin(Math.PI * u), o.ponta ?? 0.55)) * (0.65 + 0.7 * vn(i * 0.3, P, id * 5 + 3)) / 2;
          esq.push([p[i][0] - dy * ww, p[i][1] + dx * ww]); dir.push([p[i][0] + dy * ww, p[i][1] - dx * ww]);
        }
        g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = C.tinta;
        caminho(g, esq.concat(dir.reverse()), true); g.fill(); g.restore();
      }

      // ---- APAGA: a peça da frente é papel em branco e tapa a tinta que está atrás dela ----
      function apaga(pts) {
        g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; g.fillStyle = '#000';
        caminho(g, liso(pts, true), true); g.fill(); g.restore();
      }

      // tubo com largura em cada ponto (folha, capim): linha do meio -> contorno fechado
      function tubo(meio, larguras) {
        const esq = [], dir = [], n = meio.length;
        for (let i = 0; i < n; i++) {
          const a = meio[Math.max(0, i - 1)], b = meio[Math.min(n - 1, i + 1)];
          let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
          const w = larguras[i] / 2;
          esq.push([meio[i][0] - dy * w, meio[i][1] + dx * w]); dir.push([meio[i][0] + dy * w, meio[i][1] - dx * w]);
        }
        return esq.concat(dir.reverse());
      }

      // ================= PEÇAS =================
      // ----- título: letras em traço fino de giz, escritas no começo e tiradas antes da rajada -----
      function titulo(p) {
        if (!H.titulo || tq < (p.de || 0) || tq >= p.ate) return;
        const tam = p.tamanho || 54, txt = H.titulo.toUpperCase();
        const glifos = [...txt].map((ch) => Letras.letra(ch));
        const total = glifos.reduce((n, gl) => n + (gl ? gl.tracos.length : 0), 0);
        const escritos = Math.ceil(total * limita(trecho(tq, p.de || 0, p.escreve ?? 0.7) + 1e-6));
        const tirados = Math.floor(total * trecho(tq, p.ate - (p.apaga ?? 0.25), p.ate));   // sai do começo para o fim
        let px = p.x, n = 0;
        for (const gl of glifos) {
          if (!gl) { px += 0.42 * tam; continue; }
          for (const tr of gl.tracos) {
            if (n >= escritos) return;
            if (n++ >= tirados) linha(tr.map(([a, b]) => [px + a * tam, p.y - tam + b * tam]), { larg: 5.2, amp: 1.1, liso: false, ponta: 0.35 });
          }
          px += (gl.w + 0.22) * tam;
        }
      }

      // ----- touceira: chão de giz, folhas largas e pontudas, capim espetado e hastes com sementes -----
      const TOUCEIRAS = new Map();
      function fazTouceira(p) {
        const r = sorteio(SEM * 100 + (p.semente || 1));
        const lg = p.largura || 300, al = p.altura || 260, esc = Math.min(1, al / 260);
        const folhas = [], capins = [], hastes = [];
        for (let i = 0; i < (p.folhas || 0); i++) {
          const bx = (r() - 0.5) * lg * 0.8, lado = bx / (lg * 0.5);
          folhas.push({ bx, comp: al * (0.5 + 0.5 * r()), a0: lado * 0.42 + (r() - 0.5) * 0.3, curv: (r() - 0.5) * 0.3 + lado * 0.22,
            w0: (28 + 24 * r()) * Math.max(0.45, esc), flex: 0.65 + 0.35 * r() });
        }
        for (let i = 0; i < (p.capins || 0); i++) {
          const bx = (r() - 0.5) * lg * 0.95, lado = bx / (lg * 0.5);
          capins.push({ bx, comp: al * (0.35 + 0.6 * r()), a0: lado * 0.6 + (r() - 0.5) * 0.5, curv: (r() - 0.5) * 0.5 + lado * 0.35,
            w0: (6 + 5 * r()) * Math.max(0.6, esc), flex: 0.8 + 0.4 * r() });
        }
        for (let i = 0; i < (p.sementes || 0); i++) {
          const bx = (r() - 0.5) * lg * 0.7, lado = bx / (lg * 0.5);
          hastes.push({ bx, comp: al * (0.85 + 0.35 * r()), a0: lado * 0.35 + (r() - 0.5) * 0.25, curv: (r() - 0.5) * 0.3, flex: 1.0 + 0.3 * r(), lado: r() < 0.5 ? -1 : 1 });
        }
        // o chão: uma poça de giz embaixo da touceira, com pedacinhos soltos
        const chao = [], nC = 14;
        for (let i = 0; i < nC; i++) {
          const u = i / (nC - 1), x = (u - 0.5) * lg * 0.92;
          chao.push([x, -4 - (5 + 5 * r()) * Math.sin(Math.PI * u) * Math.max(0.5, esc)]);
        }
        for (let i = nC - 1; i >= 0; i--) { const u = i / (nC - 1); chao.push([(u - 0.5) * lg * 0.86, 3 + 3 * r()]); }
        const pedacos = [];
        for (let i = 0; i < Math.round(lg / 90); i++) pedacos.push([(r() - 0.5) * lg * 1.2, 4 + 10 * r(), 6 + 12 * r()]);
        return { folhas, capins, hastes, chao, pedacos };
      }
      // linha do meio de uma folha que dobra com o vento (dobra mais na ponta)
      function meioFolha(f, x, y, vento, id, n = 9) {
        const pts = [[x + f.bx, y]];
        let px = x + f.bx, py = y;
        const treme = 0.05 * (2 * vn(P * 0.6, id, 31) - 1) * Math.min(1, Math.abs(vento) * 2);
        for (let i = 1; i <= n; i++) {
          const u = i / n;
          const a = f.a0 + f.curv * u + (vento * 0.85 * f.flex + treme) * Math.pow(u, 1.3);
          px += Math.sin(a) * f.comp / n; py -= Math.cos(a) * f.comp / n;
          pts.push([px, py]);
        }
        return pts;
      }
      function touceira(p, ip) {
        if (!TOUCEIRAS.has(ip)) TOUCEIRAS.set(ip, fazTouceira(p));
        const T = TOUCEIRAS.get(ip), x = p.x, y = p.y;
        for (let i = 0; i < T.hastes.length; i++) {
          const f = T.hastes[i], v = sopro(x + f.bx, tq);
          const m = meioFolha(f, x, y, v, 500 + i * 7 + ip * 31, 10);
          linha(m, { larg: 2.4, ponta: 0.3 });
          // sementes: grãozinhos alternados no terço de cima
          for (let j = 0; j < 7; j++) {
            const u = 0.6 + 0.4 * j / 7, q = Math.floor(u * 10), a = m[q], b = m[Math.min(10, q + 1)];
            const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (j % 2 ? 0.6 : -0.6) * f.lado;
            const L2 = 11 - 5 * (j / 7), cx = a[0] + Math.cos(ang) * L2 * 0.5, cy = a[1] + Math.sin(ang) * L2 * 0.5;
            const ca = Math.cos(ang), sa = Math.sin(ang);
            massa([[cx - ca * L2 * 0.5, cy - sa * L2 * 0.5], [cx - sa * 2.6, cy + ca * 2.6], [cx + ca * L2 * 0.5, cy + sa * L2 * 0.5], [cx + sa * 2.6, cy - ca * 2.6]],
              { riscos: false, amp: 0.6, liso: false, mordida: 0.8 });
          }
        }
        for (let i = 0; i < T.folhas.length; i++) {
          const f = T.folhas[i], v = sopro(x + f.bx, tq);
          const m = meioFolha(f, x, y, v, i * 7 + ip * 31);
          const ws = m.map((_, j) => f.w0 * Math.pow(Math.sin(Math.PI * (0.16 + 0.84 * j / (m.length - 1))), 0.75));
          const meio = m[Math.floor(m.length / 2)];
          massa(tubo(m, ws), { ang: Math.atan2(meio[1] - m[0][1], meio[0] - m[0][0]), passo: 8 });
        }
        for (let i = 0; i < T.capins.length; i++) {
          const f = T.capins[i], v = sopro(x + f.bx, tq);
          const m = meioFolha(f, x, y, v, 200 + i * 7 + ip * 31, 8);
          const ws = m.map((_, j) => f.w0 * (1 - j / (m.length - 1)) + 0.6);
          massa(tubo(m, ws), { riscos: false, amp: 1.0, mordida: 1.4 });
        }
        massa(T.chao.map(([a, b]) => [x + a, y + b]), { ang: 0.05, passo: 7 });
        for (const [a, b, w] of T.pedacos) massa([[x + a - w / 2, y + b], [x + a, y + b - 4], [x + a + w / 2, y + b + 1], [x + a, y + b + 3]], { riscos: false, amp: 0.8, liso: false, mordida: 1 });
      }

      // ----- folhinhas que o vento leva: nascem fora do quadro, à esquerda, e saem pela direita -----
      const FOLHINHAS = new Map();
      function folhinhas(p, ip) {
        if (!FOLHINHAS.has(ip)) {
          const r = sorteio(SEM * 50 + (p.semente || 1)), lista = [];
          const [y0, y1] = p.faixa || [150, 700], [v0, v1] = p.velocidade || [900, 1300];
          for (let i = 0; i < (p.quantas || 8); i++)
            lista.push({ t0: mistura(p.de, p.ate, r()), y: mistura(y0, y1, r()), v: mistura(v0, v1, r()), gira: 0.6 + 1.4 * r(), fase: TAU * r(), tam: 1.0 + 0.8 * r(), cai: 20 + 50 * r() });
          FOLHINHAS.set(ip, lista);
        }
        for (const f of FOLHINHAS.get(ip)) {
          const d = tq - f.t0;
          if (d < 0) continue;
          const x = -70 + f.v * d;
          if (x > L + 70) continue;
          const y = f.y + 28 * Math.sin(TAU * 0.9 * d + f.fase) + f.cai * d;
          const a = f.fase + TAU * f.gira * d, ca = Math.cos(a), sa = Math.sin(a);
          const achata = 0.35 + 0.65 * Math.abs(Math.cos(TAU * f.gira * 0.7 * d + f.fase));   // a folhinha vira no ar
          const forma = [[-16, 0], [-6, -4.6], [7, -4.2], [16, 0], [6, 4.2], [-7, 4]].map(([u, w]) => {
            u *= f.tam; w *= f.tam * achata;
            return [x + u * ca - w * sa, y + u * sa + w * ca];
          });
          massa(forma, { riscos: false, amp: 0.7, mordida: 0.9 });
        }
      }

      // ----- a moça de perfil, virada para a esquerda, mão no bolso -----
      // Origem nos pés (no chão); para cima é y negativo. Cabeça ~110 px, corpo de ilustração de moda.
      function mulher(p) {
        const wS = Math.max(-0.3, sopro(p.x + 90, tq));       // a saia sente o vento um pouco depois
        const wC = Math.max(-0.3, sopro(p.x + 30, tq));       // o cabelo e a faixa
        const [e0, e1] = p.ergue || [9, 9], [r0, r1] = p.respira || [9, 9];
        const ergue = suave(trecho(tq, e0, e1)) * (1 - 0.35 * suave(trecho(tq, V.assenta[0] + 0.5, V.assenta[1] + 0.3)));
        const resp = suave(trecho(tq, r0, r1)) * (1 - 0.6 * suave(trecho(tq, r1 + 0.5, r1 + 1.5)));
        const fechado = (p.fecha != null && tq >= p.fecha) || (p.piscar || []).some((b) => tq >= b && tq < b + 0.14);
        const fl = (j) => 2 * vn(P * 0.8, j, 77) - 1;          // tremidinha do pano a cada desenho

        g.save(); g.translate(p.x, p.y); g.scale(p.escala || 1, p.escala || 1);

        // ---- saia: borda da frente (lado -1) e de trás (lado +1); v = 0 na cintura, 1 na barra ----
        const yC = -452, yB = -40;
        const borda = (v, lado) => {
          let x, y = mistura(yC, yB, v);
          if (lado < 0) x = -29 - 88 * Math.pow(v, 0.85) + wS * 46 * Math.pow(v, 1.1) + 4 * wS * fl(1) * v;
          else {
            x = 19 + 108 * Math.pow(v, 0.85) + wS * (118 * Math.pow(v, 1.3) + 16 * v * Math.sin(TAU * (1.3 * v - 1.6 * tq))) + 6 * wS * fl(2) * v;
            y -= wS * 34 * v * v;
          }
          return [x, y];
        };
        const ponto = (u, v) => {
          const q = lerp2(borda(v, -1), borda(v, 1), u);
          if (v > 0.98) q[1] += 7 * Math.sin(u * TAU * 3.5 + 0.6) * (1 - 0.4 * u);  // barra ondulada
          return q;
        };
        const esq = [], dirB = [], barra = [];
        for (let i = 0; i <= 8; i++) { esq.push(borda(i / 8, -1)); dirB.push(borda(i / 8, 1)); }
        for (let i = 0; i <= 10; i++) barra.push(ponto(i / 10, 1));
        const contornoSaia = esq.concat(barra.slice(1, -1), dirB.slice().reverse());

        // ---- corpo de cima ----
        const sobe = -4 * resp, peito = -3 * resp;
        const frenteBlusa = [[-22, -578 + sobe], [-30, -566 + sobe], [-38 + peito, -540], [-41 + peito, -520], [-36, -498], [-31, -472], [-29, -454]];
        const ombro = [[-6, -585 + sobe], [12, -583 + sobe], [24, -570 + sobe]];
        const manga = [[24, -570 + sobe], [31, -550], [35, -524]];
        const costas = [[17, -526], [20, -492], [19, -456]];
        const bracoFora = [[33, -523], [36, -490], [37, -470], [31, -446], [23, -430]];
        const bracoDentro = [[17, -516], [21, -484], [22, -470], [19, -452]];
        const silhueta = frenteBlusa.concat([[19, -456]], [[37, -470], [36, -500], [36, -524], [26, -570 + sobe], [8, -587 + sobe]]);

        // tapa o que está atrás dela (o capim de trás não aparece através da saia e da blusa)
        apaga(contornoSaia);
        apaga(silhueta);

        // dobras da saia: cunhas compridas de giz, maiores do lado de trás (a sombra)
        const dobras = [[0.9, 0.2, 0.0], [0.72, 0.13, 0.05], [0.57, 0.09, 0.14], [0.43, 0.06, 0.26], [0.29, 0.045, 0.36], [0.15, 0.035, 0.48]];
        for (const [u, du, vs] of dobras) {
          const topo = ponto(u - du * 0.1, vs), b1 = ponto(Math.max(0, u - du / 2), 1), b2 = ponto(Math.min(1, u + du / 2), 1);
          const m1 = ponto(u - du * 0.32, 0.6), m2 = ponto(u + du * 0.3, 0.6), fundo = ponto(u, 1);
          fundo[1] += 2;
          massa([topo, m1, b1, fundo, b2, m2], { ang: Math.atan2(fundo[1] - topo[1], fundo[0] - topo[0]), passo: 7 });
        }
        // vincos finos na parte clara da saia
        for (const [u, vs] of [[0.1, 0.35], [0.23, 0.15], [0.39, 0.5], [0.54, 0.62]]) linha([ponto(u, vs), ponto(u + 0.01, (vs + 1) / 2), ponto(u + 0.02, 0.97)], { larg: 2.2 });
        linha(esq, { larg: 3.4 });
        linha(barra, { larg: 2.8, ponta: 0.3 });
        // pés: a pontinha do sapato aparece embaixo da barra
        massa([[-52, -6], [-36, -16], [-20, -14], [-18, -4], [-50, -1]], { riscos: false, amp: 1 });
        massa([[-8, -8], [8, -16], [20, -12], [20, -3], [-6, -2]], { riscos: false, amp: 1 });

        // blusa só em linha, faixa escura na cintura
        linha(frenteBlusa, { larg: 3.0 });
        linha(ombro, { larg: 2.4 });
        linha(manga, { larg: 2.8 });
        linha([[35, -524], [17, -516]], { larg: 2.2 });
        linha(costas, { larg: 2.4 });
        linha([[-24, -548], [-12, -508]], { larg: 1.8 });
        linha([[-2, -560], [4, -520]], { larg: 1.6 });
        linha(bracoFora, { larg: 2.8 });
        linha(bracoDentro, { larg: 2.0 });
        linha([[24, -440], [34, -426]], { larg: 1.8 });                     // a boca do bolso
        massa([[-31, -461], [20, -463], [21, -446], [-30, -444]], { ang: 0.02, liso: false, passo: 5 });
        // pontas da faixa: caem junto da saia; com o vento voam para trás
        for (const [j, comp, larg] of [[0, 62, 10], [1, 48, 8]]) {
          const ang = mistura(1.35 - 0.2 * j, 0.2 + 0.12 * j + 0.15 * fl(10 + j), limita(wC));
          const meio = [];
          for (let i = 0; i <= 6; i++) {
            const u = i / 6, a = ang + 0.25 * Math.sin(TAU * (u * 0.9 - 2 * tq) + j) * u * limita(wC);
            const ant = meio[i - 1] || [20, -455];
            meio.push(i ? [ant[0] + Math.cos(a) * comp / 6, ant[1] + Math.sin(a) * comp / 6] : ant);
          }
          massa(tubo(meio, meio.map((_, i) => larg * (1 - 0.6 * i / 6))), { ang, passo: 6, amp: 1.2 });
        }

        // ---- cabeça: gira no pescoço quando ela ergue o rosto para o vento ----
        linha([[-24, -612], [-22, -578 + sobe]], { larg: 2.6 });
        linha([[6, -618], [9, -586 + sobe]], { larg: 2.0 });
        g.save(); g.translate(-6, -612); g.rotate(0.2 * ergue); g.translate(6, 612);
        const rosto = [[-24, -714], [-35, -701], [-40, -684], [-38, -674], [-42, -664], [-48, -656], [-46, -651], [-41, -649], [-43, -643], [-40, -638], [-42, -632], [-37, -626], [-36, -618], [-29, -611], [-14, -615], [2, -628]];
        apaga(rosto.concat([[8, -660], [6, -700]]));
        linha(rosto.slice(0, 13), { larg: 2.6, ponta: 0.4 });
        linha(rosto.slice(12), { larg: 2.0 });
        // olho, sobrancelha e boca
        if (fechado) linha([[-35, -669], [-30, -665], [-24, -667]], { larg: 2.4, liso: false });
        else {
          linha([[-35, -672], [-29, -674], [-24, -671]], { larg: 2.6, liso: false });
          massa([[-31, -672], [-27, -673], [-27, -668], [-31, -668]], { riscos: false, amp: 0.4, liso: false, mordida: 0.5 });
        }
        linha([[-37, -684 - 2 * ergue], [-30, -687], [-22, -685]], { larg: 2.2 });
        massa([[-43, -636], [-38, -638], [-38, -634], [-42, -633]], { riscos: false, amp: 0.4, liso: false, mordida: 0.5 });
        // cabelo: uma massa só, até o ombro; o que cai atrás voa com o vento
        const cab = [[-31, -707], [-22, -723], [-8, -732], [8, -734], [26, -725], [38, -705], [43, -681], [45, -655], [47, -629], [50, -605], [56, -586],
          [42, -580], [28, -586], [16, -592], [8, -612], [4, -636], [-2, -656], [-10, -680], [-20, -697]];
        const cabV = cab.map(([x, y], i) => {
          const solto = limita((y + 690) / 100) * (x > 0 ? 1 : 0.4);       // mais solto quanto mais longe do alto da cabeça
          const f = 3 * fl(20 + i);
          return [x + wC * (52 * solto + 8 * Math.sin(TAU * (2.2 * tq + i * 0.3))) + f * solto, y - wC * 22 * solto * solto + 0.5 * f];
        });
        massa(cabV, { ang: 1.35 - 0.6 * limita(wC), passo: 6 });
        // fios soltos: nascem na borda de trás e correm rente a ela, para trás
        if (wC > 0.15) {
          for (const [i, comp] of [[6, 70], [8, 60], [4, 44]]) {
            const a = cabV[i], b = cabV[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
            const tx = dx / d, ty = dy / d, s = limita(wC) * comp;
            const o = [a[0] + 3, a[1]];
            linha([o, [o[0] + tx * s * 0.4 + s * 0.45, o[1] + ty * s * 0.4 - 4], [o[0] + tx * s * 0.5 + s * 0.95, o[1] + ty * s * 0.3 - 9 + 6 * fl(30 + i)]], { larg: 1.6, ponta: 0.3 });
          }
        }
        g.restore();
        g.restore();
      }

      const DESENHA = { titulo, touceira, mulher, folhinhas };

      function desenhar(t) {
        c.reset(); g.reset();
        const q = Math.round(t * fps);
        P = Math.floor(q / SEG); tq = P * SEG / fps;           // "em três": a pose e o tempo andam juntos
        folha = FOLHAS[((P % 3) + 3) % 3]; idT = 0;
        c.drawImage(folha.papel, 0, 0);
        g.setTransform(k, 0, 0, k, 0, 0);
        // o desenho mexe um fio a cada pose (registro da folha na mesa de animação)
        g.translate(1.2 * (2 * h2(P, 5) - 1), 1.2 * (2 * h2(P, 6) - 1));
        pecas.forEach((p, i) => { if (DESENHA[p.tipo]) DESENHA[p.tipo](p, i); });
        // o dente do papel: onde ele é alto, o giz não pega
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.92; g.globalCompositeOperation = 'destination-out';
        g.drawImage(folha.dente, 0, 0);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        c.drawImage(cam, 0, 0);
      }

      // ---------- som: vento que passa, capim chiando, pano batendo, fôlego e quatro notas de piano ----------
      function som() {
        const s = Som.criar(duracao, SEM), M = H.musica || {};
        const chega = (x) => V.de + (x - V.x0) / V.velocidade;
        const [a0, a1] = V.assenta;
        s.vento(0, duracao, { vol: M.vento_fundo ?? 0.035, corte: 380, onda: 0.2, entra: 0.8, sai: 1.0 });
        const ent = chega(0);
        s.vento(ent - 0.35, a1 - ent + 0.35, { vol: 0.15, corte: 520, onda: 0.6, profundidade: 0.5, entra: 0.55, sai: 1.3 });
        s.vento(ent, a1 - ent - 0.3, { vol: 0.04, corte: 3800, onda: 2.3, profundidade: 0.8, entra: 0.45, sai: 1.0 });   // capim
        for (const p of pecas) {
          if (p.tipo === 'titulo') for (let t = (p.de || 0) + 0.04; t < (p.escreve ?? 0.7); t += 0.09) s.toque(t, { vol: 0.01, corte: 2400, dur: 0.05 });
          if (p.tipo === 'touceira') {                                         // cada touceira chia quando a rajada chega
            const t = chega(p.x);
            s.toque(t, { vol: 0.05, corte: 4200, dur: 0.18, pan: limita((p.x - 960) / 960, -1, 1) * 0.7 });
          }
          if (p.tipo !== 'mulher') continue;
          const tw = chega(p.x + 90);                                         // a saia bate quando o vento chega nela
          for (const d of [0, 0.3, 0.62, 0.93, 1.3, 1.75]) if (tw + d < a1) {
            s.batida(tw + d, { vol: 0.09, freq: 150, dur: 0.08, pan: 0.15 });
            s.toque(tw + d + 0.01, { vol: 0.045, corte: 1600, dur: 0.08, pan: 0.15 });
          }
          for (const b of (p.piscar || [])) s.toque(b, { vol: 0.008, corte: 6000, dur: 0.01 });
          if (p.respira) s.vento(p.respira[0], p.respira[1] - p.respira[0], { vol: 0.03, corte: 1700, onda: 0.4, entra: 0.35, sai: 0.3 });
        }
        for (const [n, t] of (M.notas || [])) {
          s.sino(n, t, 2.4, { vol: 0.045, brilho: 0.55 });
          s.nota(n, t, 1.0, { vol: 0.015, forma: 'tri', ataque: 0.005, solta: 0.9 });
        }
        s.sala(0.35);
        return s.fim({ entra: 0.2, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
