// letras.js — cópia do giz.js do motor quadro-negro (exemplos/biblioteca/quadro-negro/giz.js).
// O motor pastel-oleoso usa só as LETRAS desenhadas em traços (Letras.letra e Letras.largura), para o
// título não depender de fonte instalada. Cópia, e não link, para cada motor andar sozinho.
// Nada aqui sabe da história. Tudo é conta: o mesmo pedido dá sempre o mesmo traço.
(function () {
  'use strict';
  const { ruido } = Filme;
  const RAD = Math.PI / 180;

  // ---------- formas em pontos ----------
  // arco de elipse em graus (0 = direita, 90 = embaixo, porque o y da tela cresce para baixo)
  function arco(cx, cy, rx, ry, a0, a1, n) {
    n = n || Math.max(8, Math.ceil(Math.abs(a1 - a0) / 8));
    const p = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * RAD; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return p;
  }
  // elipse desenhada à mão: começa num ângulo qualquer e passa um pouco do ponto de partida
  const elipse = (cx, cy, rx, ry, comeco = -100) => arco(cx, cy, rx, ry, comeco, comeco + 372);

  // pontos a cada "passo" pixels (o tremor do giz precisa de pontos bem espalhados)
  function reamostra(pts, passo) {
    const xs = [pts[0][0]], ys = [pts[0][1]], cum = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const d = Math.hypot(bx - ax, by - ay);
      if (d < 1e-6) continue;
      const n = Math.max(1, Math.ceil(d / passo));
      for (let j = 1; j <= n; j++) { xs.push(ax + (bx - ax) * j / n); ys.push(ay + (by - ay) * j / n); cum.push(total + d * j / n); }
      total += d;
    }
    return { xs, ys, cum, total };
  }

  // ---------- o traço de giz ----------
  // o = { cor, larg, prog (0 a 1: quanto já foi desenhado), sem (semente), boil (muda de 3 em 3 quadros),
  //       tremor (px), tracejado, alfa }. Devolve a ponta do giz [x, y] (em pixels da tela) se o traço ainda está sendo feito.
  function traco(c, pts, o) {
    if (!pts || pts.length < 2) return null;
    const prog = o.prog ?? 1;
    if (prog <= 0) return null;
    const r = reamostra(pts, o.passo || 9);
    const lim = r.total * Math.min(1, prog);
    const tr = o.tremor ?? 1.6, sem = o.sem || 1, b = (o.boil || 0) * 7.31;
    const ptsV = [];
    for (let i = 0; i < r.xs.length; i++) {
      let x = r.xs[i], y = r.ys[i];
      if (r.cum[i] > lim) {
        const k = (lim - r.cum[i - 1]) / (r.cum[i] - r.cum[i - 1]);
        x = r.xs[i - 1] + (x - r.xs[i - 1]) * k; y = r.ys[i - 1] + (y - r.ys[i - 1]) * k;
      }
      ptsV.push([x + tr * ruido(i * 0.33 + b, sem), y + tr * ruido(i * 0.33 + b + 40, sem + 3)]);
      if (r.cum[i] > lim) break;
    }
    const larg = o.larg || 7, alfa = o.alfa ?? 1;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.setLineDash(o.tracejado ? [larg * 3, larg * 2.4] : []);
    const passe = (dx, dy, w, a) => {
      c.beginPath();
      ptsV.forEach(([x, y], i) => (i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)));
      c.globalAlpha = a * alfa; c.lineWidth = w; c.strokeStyle = o.cor; c.stroke();
    };
    passe(0, 0, larg, 0.92);
    passe(larg * 0.25, -larg * 0.2, larg * 0.45, 0.55); // a borda dupla do giz deitado
    c.globalAlpha = 1; c.setLineDash([]);
    if (prog >= 1) return null;
    // a ponta volta em pixels da tela (já com câmera e escala), para o motor desenhar o bastão de giz
    const [ux, uy] = ptsV[ptsV.length - 1], q = c.getTransform().transformPoint(new DOMPoint(ux, uy));
    return [q.x, q.y];
  }

  // preenchimento de giz: um véu da cor + riscos inclinados, preso dentro da forma
  function preenche(c, pts, o) {
    if ((o.prog ?? 1) <= 0) return;
    c.save();
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    c.globalAlpha = (o.veu ?? 0.3) * (o.prog ?? 1); c.fillStyle = o.cor; c.fill();
    c.clip();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const esp = o.espaco || 9, h = y1 - y0;
    c.globalAlpha = 0.5 * (o.prog ?? 1); c.strokeStyle = o.cor; c.lineWidth = o.larg || 3.5; c.lineCap = 'round';
    c.beginPath();
    for (let x = x0 - h, i = 0; x < x1; x += esp, i++) {
      const j = 2 * ruido(i * 0.7 + (o.boil || 0) * 3.1, o.sem || 5);
      c.moveTo(x + j, y1); c.lineTo(x + h + j, y0);
    }
    c.stroke();
    c.restore();
  }

  // ---------- letras de giz (maiúsculas desenhadas à mão, em traços) ----------
  // Cada letra: largura e traços numa grade em que 0 é o topo e 1 é a linha de base.
  const L = (w, ...tracos) => ({ w, tracos });
  const ponto = (x, y) => [[x, y], [x + 0.02, y + 0.03]];
  const LETRAS = {
    A: L(0.62, [[0, 1], [0.31, 0], [0.62, 1]], [[0.13, 0.62], [0.49, 0.62]]),
    B: L(0.55, [[0, 0], [0, 1]], [[0, 0], [0.3, 0], ...arco(0.3, 0.24, 0.22, 0.24, -90, 90), [0, 0.48]], [[0, 0.48], [0.32, 0.48], ...arco(0.32, 0.74, 0.24, 0.26, -90, 90), [0, 1]]),
    C: L(0.58, arco(0.32, 0.5, 0.3, 0.5, -40, -320)),
    D: L(0.6, [[0, 0], [0, 1]], [[0, 0], [0.24, 0], ...arco(0.24, 0.5, 0.34, 0.5, -90, 90), [0, 1]]),
    E: L(0.52, [[0.52, 0], [0, 0], [0, 1], [0.52, 1]], [[0, 0.5], [0.4, 0.5]]),
    F: L(0.5, [[0.5, 0], [0, 0], [0, 1]], [[0, 0.5], [0.4, 0.5]]),
    G: L(0.62, [...arco(0.32, 0.5, 0.3, 0.5, -40, -360), [0.36, 0.5]]),
    H: L(0.56, [[0, 0], [0, 1]], [[0.56, 0], [0.56, 1]], [[0, 0.5], [0.56, 0.5]]),
    I: L(0.1, [[0.05, 0], [0.05, 1]]),
    J: L(0.48, [[0.46, 0], [0.46, 0.7], ...arco(0.25, 0.7, 0.21, 0.3, 0, 180)]),
    K: L(0.55, [[0, 0], [0, 1]], [[0.52, 0], [0, 0.6]], [[0.17, 0.44], [0.55, 1]]),
    L: L(0.48, [[0, 0], [0, 1], [0.48, 1]]),
    M: L(0.7, [[0, 1], [0, 0], [0.35, 0.62], [0.7, 0], [0.7, 1]]),
    N: L(0.58, [[0, 1], [0, 0], [0.58, 1], [0.58, 0]]),
    O: L(0.66, arco(0.33, 0.5, 0.33, 0.5, -90, 275)),
    P: L(0.52, [[0, 1], [0, 0], [0.28, 0], ...arco(0.28, 0.25, 0.24, 0.25, -90, 90), [0, 0.5]]),
    Q: L(0.66, arco(0.33, 0.5, 0.33, 0.5, -90, 275), [[0.4, 0.7], [0.7, 1.05]]),
    R: L(0.55, [[0, 1], [0, 0], [0.28, 0], ...arco(0.28, 0.25, 0.24, 0.25, -90, 90), [0, 0.5]], [[0.24, 0.5], [0.56, 1]]),
    S: L(0.54, [...arco(0.27, 0.25, 0.25, 0.25, -15, -270), ...arco(0.27, 0.75, 0.27, 0.25, -90, 155)]),
    T: L(0.6, [[0, 0], [0.6, 0]], [[0.3, 0], [0.3, 1]]),
    U: L(0.56, [[0, 0], [0, 0.66], ...arco(0.28, 0.66, 0.28, 0.34, 180, 0), [0.56, 0]]),
    V: L(0.6, [[0, 0], [0.3, 1], [0.6, 0]]),
    W: L(0.84, [[0, 0], [0.2, 1], [0.42, 0.32], [0.64, 1], [0.84, 0]]),
    X: L(0.56, [[0, 0], [0.56, 1]], [[0.56, 0], [0, 1]]),
    Y: L(0.6, [[0, 0], [0.3, 0.5], [0.6, 0]], [[0.3, 0.5], [0.3, 1]]),
    Z: L(0.56, [[0, 0], [0.56, 0], [0, 1], [0.56, 1]]),
    0: L(0.5, arco(0.25, 0.5, 0.25, 0.5, -90, 275)),
    1: L(0.3, [[0, 0.22], [0.24, 0], [0.24, 1]]),
    2: L(0.52, [...arco(0.26, 0.27, 0.25, 0.27, -165, 35), [0, 1], [0.54, 1]]),
    3: L(0.5, [...arco(0.24, 0.25, 0.22, 0.25, -150, 90)], [...arco(0.24, 0.74, 0.26, 0.26, -90, 150)]),
    4: L(0.56, [[0.42, 1], [0.42, 0], [0, 0.7], [0.58, 0.7]]),
    5: L(0.52, [[0.5, 0], [0.08, 0], [0.04, 0.44], ...arco(0.27, 0.68, 0.26, 0.32, -125, 160)]),
    6: L(0.52, [[0.44, 0], [0.12, 0.34], [0.02, 0.66]], arco(0.27, 0.68, 0.25, 0.32, 180, 545)),
    7: L(0.54, [[0, 0], [0.54, 0], [0.18, 1]]),
    8: L(0.52, arco(0.26, 0.25, 0.21, 0.25, 90, 450), arco(0.26, 0.74, 0.26, 0.26, -90, 270)),
    9: L(0.52, arco(0.26, 0.3, 0.25, 0.3, 0, 365), [[0.51, 0.3], [0.44, 0.7], [0.18, 1]]),
    '.': L(0.08, ponto(0.02, 0.95)),
    ',': L(0.1, [[0.06, 0.9], [0, 1.1]]),
    ':': L(0.08, ponto(0.02, 0.35), ponto(0.02, 0.95)),
    '!': L(0.1, [[0.05, 0], [0.05, 0.7]], ponto(0.04, 0.95)),
    '?': L(0.48, [...arco(0.24, 0.23, 0.22, 0.23, -170, 90), [0.24, 0.68]], ponto(0.23, 0.95)),
    '-': L(0.34, [[0, 0.55], [0.34, 0.55]]),
    '+': L(0.5, [[0, 0.55], [0.5, 0.55]], [[0.25, 0.3], [0.25, 0.8]]),
    '/': L(0.4, [[0.4, 0], [0, 1]]),
    '"': L(0.2, [[0.03, 0], [0.03, 0.25]], [[0.17, 0], [0.17, 0.25]]),
    "'": L(0.06, [[0.03, 0], [0.03, 0.25]]),
  };
  // acentos do português: letra base + um traço em cima (ou embaixo, no Ç)
  const ACENTO = {
    agudo: (cx) => [[cx - 0.06, -0.1], [cx + 0.08, -0.24]],
    crase: (cx) => [[cx - 0.08, -0.24], [cx + 0.06, -0.1]],
    circ: (cx) => [[cx - 0.13, -0.09], [cx, -0.24], [cx + 0.13, -0.09]],
    til: (cx) => [[cx - 0.15, -0.12], [cx - 0.06, -0.21], [cx + 0.05, -0.13], [cx + 0.15, -0.22]],
    trema: (cx) => [[cx - 0.1, -0.16], [cx - 0.08, -0.13]],
    cedilha: (cx) => [[cx, 1], [cx + 0.05, 1.1], [cx - 0.06, 1.2]],
  };
  const COMPOSTAS = { Á: ['A', 'agudo'], À: ['A', 'crase'], Â: ['A', 'circ'], Ã: ['A', 'til'], É: ['E', 'agudo'], Ê: ['E', 'circ'],
    Í: ['I', 'agudo'], Ó: ['O', 'agudo'], Ô: ['O', 'circ'], Õ: ['O', 'til'], Ú: ['U', 'agudo'], Ü: ['U', 'trema'], Ç: ['C', 'cedilha'] };
  function letra(ch) {
    if (LETRAS[ch]) return LETRAS[ch];
    const comp = COMPOSTAS[ch];
    if (!comp) return null;
    const base = LETRAS[comp[0]], cx = base.w / 2 + (comp[0] === 'C' ? 0.02 : 0);
    const g = L(base.w, ...base.tracos, ACENTO[comp[1]](cx));
    LETRAS[ch] = g; return g;
  }
  const ESPACO = 0.42, ENTRE = 0.2;
  const largura = (txt, tam) => {
    let w = 0;
    for (const ch of txt.toUpperCase()) { const g = letra(ch); w += (g ? g.w + ENTRE : ESPACO); }
    return Math.max(0, w - ENTRE) * tam;
  };

  // escreve um texto de giz. o = { cor, corLetra(i) -> cor, prog, alinha ('centro'|'esquerda'), sem, boil, larg, inclina }
  // Devolve a ponta do giz se ainda está escrevendo.
  function texto(c, txt, x, y, tam, o) {
    txt = txt.toUpperCase();
    const w = largura(txt, tam);
    let px = (o.alinha === 'esquerda') ? x : x - w / 2;
    const larg = o.larg || Math.max(3, tam * 0.085);
    const chars = [...txt], n = chars.filter((ch) => ch !== ' ').length || 1;
    let feitas = 0, ponta = null;
    const prog = o.prog ?? 1;
    chars.forEach((ch, i) => {
      const g = letra(ch);
      if (!g) { px += ESPACO * tam; return; }
      const pl = Math.max(0, Math.min(1, prog * n - feitas)); feitas++;
      // cada letra treme um pouco diferente: escrita à mão
      const dy = tam * 0.03 * ruido(i * 1.7 + (o.boil || 0) * 0.9, 77), rot = 0.035 * ruido(i * 2.3 + (o.boil || 0) * 1.1, 78);
      const cor = o.corLetra ? o.corLetra(i) : o.cor;
      c.save(); c.translate(px, y - tam + dy); c.rotate(rot + (o.inclina || 0));
      g.tracos.forEach((t, j) => {
        const pts = t.map(([a, b]) => [a * tam, b * tam]);
        const r = traco(c, pts, { cor, larg, prog: Math.max(0, Math.min(1, pl * g.tracos.length - j)), sem: (o.sem || 1) + i * 13 + j, boil: o.boil, tremor: tam * 0.012, passo: Math.max(4, tam * 0.08) });
        if (r) ponta = r;
      });
      c.restore();
      px += (g.w + ENTRE) * tam;
    });
    return ponta;
  }

  window.Letras = { arco, elipse, traco, preenche, texto, largura, letra };
})();
