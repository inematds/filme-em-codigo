// pastel.js — o "pincel" do motor pastel-oleoso: pastel oleoso e guache sobre papel escuro.
// Nada aqui sabe da história. Tudo é conta com sorteio de semente: o mesmo pedido dá o mesmo traço.
//   Pastel.preenche(ctx, forma, cor, opcoes, acaso)  enche uma forma com riscos curtos e direcionais
//   Pastel.guache(ctx, forma, cor, acaso)            área chapada e fosca, com o arrasto do pincel
//   Pastel.risco(ctx, pontos, cor, largura, acaso)   uma linha de pastel (contorno, varal, anel)
//   Pastel.raspa(ctx, pontos, cor, acaso)            sgraffito: risco fino raspado por cima
//   Pastel.dente(largura, altura, k, semente)        máscara do dente do papel (onde o pastel pula)
//   Pastel.grao(largura, altura, k, semente)         grão do papel, com luz vindo de cima à esquerda
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const teste = document.createElement('canvas').getContext('2d'); // só para perguntar "está dentro?"

  const novaTela = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; };

  // caixa de uma lista de pontos (para sortear riscos só onde a forma está)
  function caixaDe(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0, y0, x1, y1];
  }

  // forma = { caminho: Path2D, caixa: [x0,y0,x1,y1] }
  function poligono(pts) {
    const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath(); return { caminho: p, caixa: caixaDe(pts) };
  }
  function elipse(cx, cy, rx, ry, giro = 0) {
    const p = new Path2D(); p.ellipse(cx, cy, rx, ry, giro, 0, TAU);
    const r = Math.max(rx, ry); return { caminho: p, caixa: [cx - r, cy - r, cx + r, cy + r] };
  }
  function retangulo(x, y, w, h) { return poligono([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }

  // escolhe uma cor da lista (a primeira pesa mais: é a cor da peça; as outras são camadas por cima)
  function escolhe(cores, acaso) {
    if (typeof cores === 'string') return cores;
    return acaso() < 0.72 ? cores[0] : cores[1 + Math.floor(acaso() * (cores.length - 1))];
  }

  // ---------- pastel: riscos curtos na mesma direção, que passam um pouco da borda ----------
  // o = { ang (graus), dens, larg, comp, base (opacidade da cama de guache por baixo), sobra }
  function preenche(ctx, forma, cores, o, acaso) {
    o = o || {};
    const [x0, y0, x1, y1] = forma.caixa, cor0 = typeof cores === 'string' ? cores : cores[0];
    const base = o.base ?? 0.5;
    if (base > 0) { ctx.globalAlpha = base; ctx.fillStyle = cor0; ctx.fill(forma.caminho); }
    const larg = o.larg ?? 5, comp = o.comp ?? 22, a0 = (o.ang ?? -62) * Math.PI / 180;
    const area = Math.max(1, (x1 - x0) * (y1 - y0));
    const n = Math.ceil(area * (o.dens ?? 1) / (larg * comp * 0.45));
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = x0 + acaso() * (x1 - x0), py = y0 + acaso() * (y1 - y0);
      const c = escolhe(cores, acaso), a = a0 + (acaso() - 0.5) * 0.4, l = comp * (0.5 + acaso() * 0.8);
      const w = larg * (0.55 + acaso() * 0.7), al = 0.55 + acaso() * 0.45;
      if (!teste.isPointInPath(forma.caminho, px, py)) continue;
      const dx = Math.cos(a) * l * 0.5, dy = Math.sin(a) * l * 0.5, curva = (acaso() - 0.5) * l * 0.25;
      ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(px - dx, py - dy);
      ctx.quadraticCurveTo(px - dy * curva / l, py + dx * curva / l, px + dx, py + dy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- guache: área chapada, fosca, com faixas leves do arrasto do pincel ----------
  function guache(ctx, forma, cor, acaso, o) {
    o = o || {};
    ctx.globalAlpha = o.alfa ?? 0.94; ctx.fillStyle = cor; ctx.fill(forma.caminho);
    const [x0, y0, x1, y1] = forma.caixa, ang = (o.ang ?? 8) * Math.PI / 180;
    ctx.save(); ctx.clip(forma.caminho);
    const passo = o.passo ?? 9;
    for (let y = y0 - 20; y < y1 + 20; y += passo * (0.6 + acaso() * 0.8)) {
      ctx.globalAlpha = 0.05 + acaso() * 0.08;
      ctx.strokeStyle = acaso() < 0.5 ? '#ffffff' : '#000000'; ctx.lineWidth = 1 + acaso() * 3;
      const dy = Math.tan(ang) * (x1 - x0);
      ctx.beginPath(); ctx.moveTo(x0 - 10, y); ctx.lineTo(x1 + 10, y + dy + (acaso() - 0.5) * 6); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ---------- linha de pastel: vários fios tortos por cima um do outro ----------
  function risco(ctx, pts, cor, larg, acaso, o) {
    o = o || {};
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = cor;
    const fios = o.fios ?? 3;
    for (let f = 0; f < fios; f++) {
      ctx.globalAlpha = (o.alfa ?? 0.9) * (0.55 + acaso() * 0.45); ctx.lineWidth = larg * (0.45 + acaso() * 0.55);
      const ox = (acaso() - 0.5) * larg * 0.6, oy = (acaso() - 0.5) * larg * 0.6;
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const jx = x + ox + (acaso() - 0.5) * larg * 0.5, jy = y + oy + (acaso() - 0.5) * larg * 0.5; if (i) ctx.lineTo(jx, jy); else ctx.moveTo(jx, jy); });
      if (o.fecha) ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- sgraffito: risco fino raspado, claro, que falha no caminho ----------
  function raspa(ctx, pts, cor, acaso, larg = 1.6) {
    ctx.lineCap = 'round'; ctx.strokeStyle = cor;
    for (let i = 1; i < pts.length; i++) {
      if (acaso() < 0.18) continue;
      ctx.globalAlpha = 0.45 + acaso() * 0.45; ctx.lineWidth = larg * (0.6 + acaso() * 0.7);
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- ruído periódico (o ladrilho não mostra emenda) ----------
  function h3(a, b, s) {
    let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab + s * 977, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d); v = Math.imul(v ^ (v >>> 12), 0x297a2d39);
    return ((v ^ (v >>> 15)) >>> 0) / 4294967296;
  }
  function vnP(x, y, P, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => h3(((ix + i) % P + P) % P, ((iy + j) % P + P) % P, s);
    const a = g(0, 0) + (g(1, 0) - g(0, 0)) * ux, b = g(0, 1) + (g(1, 1) - g(0, 1)) * ux;
    return a + (b - a) * uy;
  }

  // ---------- dente do papel: onde o pastel não pega (para apagar com destination-out) ----------
  // a célula nunca fica menor que 1 pixel (a 640x360 o dente vira listra se ficar)
  function dente(tam, k, semente) {
    const cv = novaTela(tam, tam), x = cv.getContext('2d'), img = x.createImageData(cv.width, cv.height), d = img.data;
    const cel = Math.max(1.2, 3.2 * k), P = Math.max(4, Math.round(cv.width / cel)), esc = P / cv.width;
    for (let j = 0; j < cv.height; j++) for (let i = 0; i < cv.width; i++) {
      const n = 0.65 * vnP(i * esc, j * esc, P, semente) + 0.35 * vnP(i * esc * 2, j * esc * 2, P * 2, semente + 1);
      const a = Math.max(0, Math.min(1, (n - 0.5) / 0.2));
      const o = (j * cv.width + i) * 4; d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = Math.round(a * a * 235);
    }
    x.putImageData(img, 0, 0); return cv;
  }

  // ---------- grão do papel em relevo: luz de cima à esquerda (cinza 128 = sem mudança) ----------
  function grao(tam, k, semente) {
    const cv = novaTela(tam, tam), x = cv.getContext('2d'), img = x.createImageData(cv.width, cv.height), d = img.data;
    const cel = Math.max(1.5, 4 * k), P = Math.max(4, Math.round(cv.width / cel)), esc = P / cv.width;
    const n = (i, j) => 0.6 * vnP(i * esc, j * esc, P, semente) + 0.3 * vnP(i * esc * 2.0, j * esc * 2.0, P * 2, semente + 3) + 0.1 * vnP(i * esc * 0.25, j * esc * 0.25, Math.max(1, P >> 2), semente + 5);
    for (let j = 0; j < cv.height; j++) for (let i = 0; i < cv.width; i++) {
      const luz = n(i, j) - n(i + 1, j + 1);               // relevo: diferença com o vizinho de baixo-direita
      const v = 128 + luz * 330 + (n(i, j) - 0.5) * 30;
      const o = (j * cv.width + i) * 4; d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, v)); d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); return cv;
  }

  window.Pastel = { novaTela, poligono, elipse, retangulo, caixaDe, preenche, guache, risco, raspa, dente, grao };
})();
