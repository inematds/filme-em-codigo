// papel.js — o material do motor caixa-sombra: papel de cor chapada, recortado à mão, com grão.
// Cada peça é um caminho (Path2D). Pintar uma peça = sombra macia na folha de trás + cor + grão do papel
// + um fio claro na borda de cima (a luz de trás pegando no corte). Nada aqui sabe da história.
// Tudo é conta: o mesmo pedido dá sempre a mesma peça (sorteio só com semente).
(function () {
  'use strict';
  const { ruido, sorteio, rgb } = Filme;
  const TAU = Math.PI * 2;

  const rgba = (hex, a) => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  // ---------- grão do papel: textura feita uma vez, em pixels da tela ----------
  function textura(semente) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const x = cv.getContext('2d'), img = x.createImageData(N, N), d = img.data, ac = sorteio(semente);
    // ruído macio que se repete sem emenda (grade de 16 e de 64 pontos)
    const grade = (n, s) => { const g = []; const r = sorteio(s); for (let i = 0; i < n * n; i++) g.push(r()); return g; };
    const G1 = grade(16, semente + 1), G2 = grade(64, semente + 2);
    const amostra = (G, n, px, py) => {
      const fx = px * n / N, fy = py * n / N, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const v = (a, b) => G[((b % n + n) % n) * n + ((a % n + n) % n)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return (v(ix, iy) * (1 - sx) + v(ix + 1, iy) * sx) * (1 - sy) + (v(ix, iy + 1) * (1 - sx) + v(ix + 1, iy + 1) * sx) * sy;
    };
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const v = 0.5 + 0.18 * (amostra(G1, 16, px, py) - 0.5) + 0.3 * (amostra(G2, 64, px, py) - 0.5) + 0.42 * (ac() - 0.5);
      const i = (py * N + px) * 4;
      if (v > 0.5) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, (v - 0.5) * 300); }
      else { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = Math.min(255, (0.5 - v) * 330); }
    }
    x.putImageData(img, 0, 0);
    return cv;
  }

  // ---------- recorte à mão: pontos de um contorno fechado ganham um tremor fixo ----------
  // pts = [[x,y],...] (fechado). amp = quanto a tesoura foge da linha (unidades de desenho).
  function recorta(pts, amp, semente) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], p = pts[i];
      let nx = b[1] - a[1], ny = a[0] - b[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const o = amp * (0.7 * ruido(i * 0.23, semente) + 0.3 * ruido(i * 1.7, semente + 9));
      out.push([p[0] + nx * o, p[1] + ny * o]);
    }
    return out;
  }
  function caminho(pts) {
    const P = new Path2D(); pts.forEach(([x, y], i) => (i ? P.lineTo(x, y) : P.moveTo(x, y))); P.closePath(); return P;
  }
  // formas básicas em pontos
  function elipse(cx, cy, rx, ry, n = 72) { const p = []; for (let i = 0; i < n; i++) { const a = TAU * i / n; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; }
  // coração: ponta para baixo, tamanho = largura total
  function coracao(tam, n = 64) {
    const p = [], s = tam / 34;
    for (let i = 0; i < n; i++) { const a = TAU * i / n; p.push([16 * Math.pow(Math.sin(a), 3) * s, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s - 2 * s]); }
    return p;
  }
  // gota: ponta para cima, largura máxima = larg, altura = alt, centro da parte redonda em (0, 0)
  function gota(larg, alt, n = 90) {
    const r = larg / 2, p = [], topo = -(alt - r), m = Math.round(n / 2);
    // metade de baixo: meio círculo, da direita para a esquerda
    for (let i = 0; i <= m; i++) { const a = Math.PI * i / m; p.push([r * Math.cos(a), r * Math.sin(a)]); }
    // lado esquerdo sobe até a ponta, lado direito desce
    for (let i = 1; i < m; i++) { const u = i / m; p.push([-r * Math.pow(Math.cos(u * Math.PI / 2), 1.6), topo * u]); }
    p.push([0, topo]);
    for (let i = m - 1; i >= 1; i--) { const u = i / m; p.push([r * Math.pow(Math.cos(u * Math.PI / 2), 1.6), topo * u]); }
    return p;
  }

  // ---------- pintar uma peça ----------
  // o = { alto: altura da folha sobre a de trás (0 = colada), sombra: força, grao: força, fio: brilho da borda }
  function criar(semente) {
    const tex = textura(semente), pats = new Map();
    const padrao = (c) => { let p = pats.get(c); if (!p) { p = c.createPattern(tex, 'repeat'); pats.set(c, p); } return p; };

    function peca(c, P, cor, o = {}) {
      const m = c.getTransform(), s = Math.hypot(m.a, m.b) || 1;
      const alto = o.alto ?? 1, forca = o.sombra ?? 0.5;
      c.save();
      if (alto > 0 && forca > 0) {
        c.shadowColor = `rgba(4,10,26,${forca})`;
        c.shadowBlur = 16 * alto * s; c.shadowOffsetX = 3 * alto * s; c.shadowOffsetY = 8 * alto * s;
      }
      c.fillStyle = cor; c.fill(P);
      c.shadowColor = 'rgba(0,0,0,0)';
      // grão: um pixel de textura = 2 pixels da tela grande (nunca menos que 1 pixel da tela real)
      const g = o.grao ?? 0.4;
      if (g > 0) {
        const pt = padrao(c), dev = Math.max(1, 2 * (o.k || 1));
        pt.setTransform(new DOMMatrix([dev / s, 0, 0, dev / s, 0, 0]));
        c.globalAlpha *= g; c.fillStyle = pt; c.fill(P);
      }
      c.restore();
      // fio de luz na borda de cima: a mesma forma, um fio mais claro, só a parte de cima aparece
      // (medidas em pixels da tela real: k = tamanho da tela / tamanho de desenho)
      const fio = o.fio ?? 0.22;
      if (fio > 0) {
        const kd = o.k || 1;
        c.save(); c.clip(P);
        c.translate(0, Math.max(1, 2.4 * kd) / s);
        c.lineWidth = Math.max(1, 3.4 * kd) / s; c.strokeStyle = `rgba(255,248,230,${fio})`;
        c.stroke(P); c.restore();
      }
    }
    return { peca, padrao, tex };
  }

  window.Papel = { criar, recorta, caminho, elipse, coracao, gota, rgba };
})();
