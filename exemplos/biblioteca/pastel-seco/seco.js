// seco.js — o "pincel" do motor pastel-seco: guache de giz e pastel seco, sem contorno.
// Nada aqui sabe da história. Tudo é conta com sorteio de semente: o mesmo pedido dá o mesmo traço.
//   Seco.forma(c, pts, cor, acaso, o)        mancha chapada e fosca, de borda quebrada e pontilhada
//   Seco.pincel(c, pts, cor, larg, acaso, o) pincelada seca: as cerdas falham e deixam buracos
//   Seco.fibras(c, pts, cor, acaso, o)       fiapos curtos saindo da borda (lã, pontas de cabelo)
//   Seco.pontilha(c, cx, cy, r, cor, n, acaso, o)  nuvem de pontinhos (blush, sardas)
//   Seco.grao(tam, semente)                   pigmento salpicado: pintinhas claras e escuras (em pixels da tela)
//   Seco.mancha(w, h, cor, semente)           fundo chapado com manchas largas e suaves (em pixels da tela)
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const novaTela = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; };

  // ---------- formas em pontos ----------
  function elipse(cx, cy, rx, ry, n = 72, giro = 0) {
    const p = [], cg = Math.cos(giro), sg = Math.sin(giro);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a);
      p.push([cx + x * cg - y * sg, cy + x * sg + y * cg]);
    }
    return p;
  }
  // retângulo de cantos redondos (lata, gola)
  function caixa(cx, cy, w, h, r, giro = 0) {
    const p = [], hw = w / 2 - r, hh = h / 2 - r, cg = Math.cos(giro), sg = Math.sin(giro);
    const cantos = [[hw, hh, 0], [-hw, hh, 90], [-hw, -hh, 180], [hw, -hh, 270]];
    for (const [ox, oy, a0] of cantos) for (let i = 0; i <= 8; i++) {
      const a = (a0 + i * 90 / 8) * Math.PI / 180, x = ox + r * Math.cos(a), y = oy + r * Math.sin(a);
      p.push([cx + x * cg - y * sg, cy + x * sg + y * cg]);
    }
    return p;
  }
  // curva que passa pelos pontos (Catmull-Rom), devolve pontos
  function curva(pts, n = 8) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // pontos a cada "passo" (contorno fechado ou linha aberta)
  function reamostra(pts, passo, fechado) {
    const lista = fechado ? pts.concat([pts[0]]) : pts, out = [];
    for (let i = 1; i < lista.length; i++) {
      const [ax, ay] = lista[i - 1], [bx, by] = lista[i], d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / passo));
      for (let j = 0; j < n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]);
    }
    if (!fechado) out.push(lista[lista.length - 1]);
    return out;
  }
  function caminho(c, pts, fecha) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (fecha) c.closePath();
  }
  // normal para fora de um contorno fechado (sentido dos pontos qualquer: o "sinal" acerta)
  function sinal(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; s += ax * by - bx * ay; } return s >= 0 ? 1 : -1; }

  // ---------- mancha chapada de borda quebrada ----------
  // o = { quebra (px que a borda entra e sai), passo, pontos (por amostra), alcance, px (1 pixel da tela em unidades do mundo), alfa }
  function forma(c, pts, cor, acaso, o) {
    o = o || {};
    const px = o.px || 1, passo = o.passo || 6, quebra = o.quebra ?? 3.5, alc = o.alcance ?? 7;
    const r = reamostra(pts, passo, true), n = r.length, sg = sinal(r);
    // borda que entra e sai um pouco (a forma não é um vetor liso)
    const borda = r.map(([x, y], i) => {
      const [ax, ay] = r[(i - 1 + n) % n], [bx, by] = r[(i + 1) % n], dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
      const nx = sg * dy / d, ny = -sg * dx / d, j = (acaso() - 0.55) * 2 * quebra;
      return [x + nx * j, y + ny * j, nx, ny];
    });
    c.globalAlpha = o.alfa ?? 1; c.fillStyle = cor;
    caminho(c, borda, true); c.fill();
    // pontinhos de pigmento em volta da borda (para fora e para dentro): a borda "esfarela"
    const pp = o.pontos ?? 1.4;
    c.beginPath();
    for (const [x, y, nx, ny] of borda) {
      const q = Math.floor(pp + acaso());
      for (let k = 0; k < q; k++) {
        const d = (acaso() * acaso()) * alc + px * 0.5, s = (acaso() - 0.5) * passo;
        const rr = Math.max(px * 0.8, (0.6 + acaso() * 1.6) * px * (o.ponto ?? 1.3));
        const qx = x + nx * d - ny * s, qy = y + ny * d + nx * s;
        c.moveTo(qx + rr, qy); c.arc(qx, qy, rr, 0, TAU);
      }
    }
    c.fill(); c.globalAlpha = 1;
    return borda;
  }

  // ---------- pincelada seca: várias cerdas, cada uma falha (tracejado sorteado) ----------
  // o = { cerdas, alfa, falha (0..1 quanto a cerda pula), px }
  function pincel(c, pts, cor, larg, acaso, o) {
    o = o || {};
    const px = o.px || 1, cerdas = o.cerdas ?? 5, falha = o.falha ?? 0.45, alfa = o.alfa ?? 0.7;
    const r = pts.length > 2 ? pts : reamostra(pts, 8, false);
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = cor;
    for (let k = 0; k < cerdas; k++) {
      const off = (cerdas === 1 ? 0 : (k / (cerdas - 1) - 0.5)) * larg + (acaso() - 0.5) * larg * 0.3;
      const tam = larg * (0.18 + acaso() * 0.22);
      const tr = [];
      for (let i = 0; i < 6; i++) { const a = 4 + acaso() * 26 * (1 - falha * 0.5), b = 1 + acaso() * 18 * falha; tr.push(a, b); }
      c.setLineDash(tr); c.lineDashOffset = acaso() * 40;
      c.globalAlpha = alfa * (0.5 + acaso() * 0.5); c.lineWidth = Math.max(px, tam);
      c.beginPath();
      for (let i = 0; i < r.length; i++) {
        const [x, y] = r[i], [ax, ay] = r[Math.max(0, i - 1)], [bx, by] = r[Math.min(r.length - 1, i + 1)];
        const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
        const afina = Math.sin(Math.PI * Math.min(1, Math.max(0, (i + 0.5) / r.length))) * 0.35 + 0.65;
        const qx = x + nx * off * afina, qy = y + ny * off * afina;
        if (i) c.lineTo(qx, qy); else c.moveTo(qx, qy);
      }
      c.stroke();
    }
    c.setLineDash([]); c.lineDashOffset = 0; c.globalAlpha = 1;
  }

  // ---------- fiapos: tracinhos curtos saindo da borda, quase na tangente ----------
  // o = { de, ate (fração do contorno), cada (px entre fiapos), passo (o mesmo da forma), comp, larg, abre, px }
  function fibras(c, borda, cor, acaso, o) {
    o = o || {};
    const px = o.px || 1, cada = o.cada ?? 9, comp = o.comp ?? 12, abre = o.abre ?? 0.55;
    const n = borda.length, i0 = Math.floor((o.de ?? 0) * n), i1 = Math.floor((o.ate ?? 1) * n);
    c.strokeStyle = cor; c.lineCap = 'round'; c.lineWidth = Math.max(px, (o.larg ?? 1.6));
    c.globalAlpha = o.alfa ?? 0.9;
    c.beginPath();
    const chance = (o.passo ?? 6) / cada;   // amostras da borda ficam a "passo" px uma da outra
    for (let i = i0; i < i1; i++) {
      const p = borda[i % n];
      if (acaso() > chance) continue;
      const [x, y, nx, ny] = p, tx = -ny, ty = nx, s = acaso() < 0.5 ? 1 : -1, l = comp * (0.4 + acaso() * 0.9);
      const dx = (tx * s * (1 - abre) + nx * abre), dy = (ty * s * (1 - abre) + ny * abre), d = Math.hypot(dx, dy) || 1;
      const ex = x + dx / d * l, ey = y + dy / d * l;
      c.moveTo(x - nx * 2, y - ny * 2); c.quadraticCurveTo(x + dx / d * l * 0.5 + (acaso() - 0.5) * 4, y + dy / d * l * 0.5 + (acaso() - 0.5) * 4, ex, ey);
    }
    c.stroke(); c.globalAlpha = 1;
  }

  // ---------- nuvem de pontinhos (blush pontilhado) ----------
  function pontilha(c, cx, cy, r, cor, n, acaso, o) {
    o = o || {};
    const px = o.px || 1, tam = o.tam ?? 2.2;
    c.fillStyle = cor; c.globalAlpha = o.alfa ?? 0.8;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = acaso() * TAU, d = Math.sqrt(acaso()) * r, rr = Math.max(px * 0.8, tam * (0.5 + acaso()));
      const x = cx + Math.cos(a) * d * (o.esticaX ?? 1), y = cy + Math.sin(a) * d;
      c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU);
    }
    c.fill(); c.globalAlpha = 1;
  }

  // ---------- pigmento salpicado (ladrilho em pixels da tela: a pinta nunca fica menor que 1 pixel) ----------
  function grao(tam, semente, forca = 1) {
    const cv = novaTela(tam, tam), x = cv.getContext('2d'), img = x.createImageData(cv.width, cv.height), d = img.data;
    let a = (semente >>> 0) || 1;
    const acaso = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = 0; i < cv.width * cv.height; i++) {
      const r = acaso(), o = i * 4;
      if (r < 0.035 * forca) { d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = 60 + acaso() * 110; }        // pinta clara
      else if (r > 1 - 0.03 * forca) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 40 + acaso() * 90; }  // pinta escura
      else { const v = acaso(); d[o] = d[o + 1] = d[o + 2] = v < 0.5 ? 0 : 255; d[o + 3] = 10 + acaso() * 16; } // pó fino
    }
    x.putImageData(img, 0, 0);
    // algumas pintas maiores (2 a 3 pixels)
    const n = Math.round(cv.width * cv.height * 0.0012 * forca);
    for (let i = 0; i < n; i++) {
      const px = acaso() * cv.width, py = acaso() * cv.height, r = 1 + acaso() * 1.2;
      x.globalAlpha = 0.25 + acaso() * 0.35; x.fillStyle = acaso() < 0.55 ? '#ffffff' : '#000000';
      x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
    return cv;
  }

  // ---------- fundo chapado, com manchas largas e suaves (o pigmento não cobre igual) ----------
  function mancha(w, h, cor, semente) {
    const cv = novaTela(w, h), x = cv.getContext('2d');
    let a = (semente >>> 0) || 1;
    const acaso = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    x.fillStyle = cor; x.fillRect(0, 0, w, h);
    const esc = Math.max(w, h);
    for (let i = 0; i < 34; i++) {
      const px = acaso() * w, py = acaso() * h, r = (0.06 + acaso() * 0.2) * esc, claro = acaso() < 0.5;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, claro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,40,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    return cv;
  }

  window.Seco = { novaTela, elipse, caixa, curva, reamostra, caminho, forma, pincel, fibras, pontilha, grao, mancha };
})();
