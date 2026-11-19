// pincel.js — o pincel da arte de conceito: guache recortado com arestas vivas e pincel seco.
// curva()   : contorno liso por pontos de controle (Catmull-Rom).
// recorte() : vira o contorno liso num recorte de papel/guache: lados retos e cantos vivos.
// forma()   : pinta uma forma recortada (sem contorno, só a cor chapada).
// seco()    : uma pincelada seca, com as cerdas falhando.
// riscos()  : várias pinceladas secas numa área (quem chama faz o clip).
// Nada aqui sabe da história. Tudo é conta com semente: o mesmo pedido dá sempre o mesmo traço.
(function () {
  'use strict';
  const { sorteio } = Filme;
  const P = { minimo: 1 }; // 1 pixel da tela, em unidades do mundo (o motor acerta para o tamanho do render)

  // contorno liso por pontos de controle (fechado ou aberto), n pontos por trecho
  function curva(ctrl, fechada = true, n = 7) {
    const m = ctrl.length, out = [];
    const pt = (i) => fechada ? ctrl[(i + m) % m] : ctrl[Math.max(0, Math.min(m - 1, i))];
    const fim = fechada ? m : m - 1;
    for (let i = 0; i < fim; i++) {
      const p0 = pt(i - 1), p1 = pt(i), p2 = pt(i + 1), p3 = pt(i + 2);
      for (let j = 0; j < n; j++) {
        const u = j / n, u2 = u * u, u3 = u2 * u;
        out.push([0, 1].map((e) => 0.5 * (2 * p1[e] + (-p0[e] + p2[e]) * u + (2 * p0[e] - 5 * p1[e] + 4 * p2[e] - p3[e]) * u2 + (-p0[e] + 3 * p1[e] - 3 * p2[e] + p3[e]) * u3)));
      }
    }
    if (!fechada) out.push(ctrl[m - 1].slice());
    return out;
  }

  // recorte: anda pelo contorno e escolhe um vértice a cada "passo" (varia), empurrado um pouco
  // para fora ou para dentro. Ligando os vértices com retas, a borda fica cortada a faca.
  function recorte(pts, sem, passo = 26, tremor = 2.5, fechada = true) {
    const r = sorteio(sem), n = pts.length, cum = [0];
    const lista = fechada ? pts.concat([pts[0]]) : pts;
    for (let i = 1; i < lista.length; i++) cum.push(cum[i - 1] + Math.hypot(lista[i][0] - lista[i - 1][0], lista[i][1] - lista[i - 1][1]));
    const total = cum[cum.length - 1];
    if (!(total > 0) || n < 3) return pts;
    const out = [];
    let s = 0, i = 1;
    while (s < total - passo * 0.3) {
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = lista[i - 1], b = lista[i], seg = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / seg;
      const dx = (b[0] - a[0]) / seg, dy = (b[1] - a[1]) / seg, j = (r() * 2 - 1) * tremor;
      out.push([a[0] + (b[0] - a[0]) * u - dy * j, a[1] + (b[1] - a[1]) * u + dx * j]);
      s += passo * (0.55 + 0.9 * r());
    }
    if (!fechada) out.push(pts[n - 1].slice());
    return out;
  }

  function caminho(c, pts, fechada = true) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (fechada) c.closePath();
  }

  // pinta uma forma recortada; devolve o contorno (para fazer clip depois)
  function forma(c, ctrl, cor, sem, o = {}) {
    const p = o.reta ? recorte(ctrl.concat(), sem, o.passo ?? 30, o.tremor ?? 2) : recorte(curva(ctrl, true, o.n ?? 7), sem, o.passo ?? 26, o.tremor ?? 2.5);
    caminho(c, p); if (cor) { c.fillStyle = cor; c.fill(); }
    return p;
  }

  // pincelada seca de (x0,y0) a (x1,y1): cerdas paralelas que falham aqui e ali
  function seco(c, x0, y0, x1, y1, larg, cor, alfa, r, cerdas = 6, curva_ = 0) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    c.strokeStyle = cor; c.lineCap = 'butt';
    const alfa0 = c.globalAlpha;
    for (let i = 0; i < cerdas; i++) {
      const o = (cerdas > 1 ? i / (cerdas - 1) - 0.5 : 0) * larg + (r() - 0.5) * larg * 0.25;
      c.globalAlpha = alfa0 * alfa * (0.35 + 0.65 * r());
      c.lineWidth = Math.max(P.minimo, (larg / cerdas) * (0.5 + 0.9 * r()));
      c.beginPath();
      let u = r() * 0.12;
      while (u < 1) {
        const u1 = Math.min(1, u + 0.12 + 0.55 * r());
        const b0 = curva_ * Math.sin(Math.PI * u), b1 = curva_ * Math.sin(Math.PI * u1);
        c.moveTo(x0 + dx * u + nx * (o + b0), y0 + dy * u + ny * (o + b0));
        c.lineTo(x0 + dx * u1 + nx * (o + b1), y0 + dy * u1 + ny * (o + b1));
        u = u1 + 0.02 + 0.14 * r();
      }
      c.stroke();
    }
    c.globalAlpha = alfa0;
  }

  // n pinceladas secas numa caixa [x, y, w, h], todas mais ou menos na mesma direção (graus)
  function riscos(c, caixa, n, angulo, cor, alfa, sem, o = {}) {
    const r = sorteio(sem), [x, y, w, h] = caixa;
    const comp = o.comp ?? 120, larg = o.larg ?? 14, abre = o.abre ?? 10;
    for (let i = 0; i < n; i++) {
      const cx = x + r() * w, cy = y + r() * h, a = (angulo + (r() - 0.5) * abre) * Math.PI / 180;
      const l = comp * (0.5 + r()), hx = Math.cos(a) * l / 2, hy = Math.sin(a) * l / 2;
      seco(c, cx - hx, cy - hy, cx + hx, cy + hy, larg * (0.6 + 0.8 * r()), cor, alfa, r, o.cerdas ?? 5, (r() - 0.5) * (o.curva ?? 6));
    }
  }

  window.Pincel = Object.assign(P, { curva, recorte, caminho, forma, seco, riscos });
})();
