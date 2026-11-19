// pinturas.js — os cenários em AQUARELA: aguadas transparentes molhadas (a mesma mancha passada 15 a 30
// vezes, cada vez um pouco mexida, bem fraquinha), borda mais escura onde o pigmento junta, flores de
// pigmento (o centro clareia e a borda escurece), grânulos, pinceladas secas e respingos de carmim.
// Cada pintor recebe (c, peça, sorteio) e desenha em medidas de 1080x1920 (o motor cuida da escala).
// Nada aqui sabe da história: o que vai em cada pintura, e onde, vem do historia.json.
// O motor pinta cada camada UMA vez ao montar; no filme só move as camadas (paralaxe).
(function () {
  'use strict';
  const { limita, ruido } = Filme;
  const TAU = Math.PI * 2;
  const escalaDe = (c) => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
  const escuro = (cr, k = 0.35) => Filme.hex(cr, '#24140a', k);
  const caminho = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };

  // contorno de mancha: elipse torta (o raio anda com ruído macio)
  function bolha(cx, cy, rx, ry, sem = 1, torto = 0.16, n = 44, giro = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, r = 1 + torto * ruido(i * 0.42, sem) + torto * 0.45 * ruido(i * 1.3, sem + 7);
      const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
      pts.push([cx + x * Math.cos(giro) - y * Math.sin(giro), cy + x * Math.sin(giro) + y * Math.cos(giro)]);
    }
    return pts;
  }
  // pontos extras ao longo do contorno (para a borda tremer por igual)
  function adensa(pts, passo = 18) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / passo));
      for (let j = 0; j < n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]);
    }
    return out;
  }

  // ---------- AGUADA: a mancha de tinta molhada ----------
  // o = { passes, molhado (px que a borda anda), alfa, borda (força da borda escura), bordaW, flores, graos, borra (desfoque px) }
  function aguada(c, pts0, tinta, ac, o = {}) {
    const pts = adensa(pts0, o.passo || 16), n = o.passes ?? 18, j = o.molhado ?? 12, a = o.alfa ?? 0.075, s = escalaDe(c);
    const sem = Math.floor(ac() * 9999);
    c.save();
    if (o.borra) c.filter = `blur(${o.borra * s}px)`;
    c.fillStyle = tinta;
    for (let i = 0; i < n; i++) {
      c.globalAlpha = a * (0.6 + 0.8 * ac());
      c.beginPath();
      pts.forEach(([x, y], q) => {
        const px = x + ruido(q * 0.31 + i * 5.7, sem) * j, py = y + ruido(q * 0.31 + i * 5.7, sem + 3) * j;
        if (q) c.lineTo(px, py); else c.moveTo(px, py);
      });
      c.closePath(); c.fill();
    }
    c.filter = 'none';
    // grânulos e flores só dentro da mancha
    if (o.graos || o.flores) {
      c.save(); caminho(c, pts); c.clip();
      if (o.graos) {
        const [xa, ya, xb, yb] = caixa(pts), q = Math.round((xb - xa) * (yb - ya) / 900 * o.graos);
        c.fillStyle = escuro(tinta, 0.3);
        for (let i = 0; i < q; i++) { c.globalAlpha = 0.05 + ac() * 0.12; c.beginPath(); c.arc(xa + ac() * (xb - xa), ya + ac() * (yb - ya), 0.8 + ac() * 2.2, 0, TAU); c.fill(); }
      }
      if (o.flores) {
        const [xa, ya, xb, yb] = caixa(pts);
        for (let i = 0; i < o.flores; i++) {
          const fx = xa + ac() * (xb - xa), fy = ya + ac() * (yb - ya), fr = (o.florR || 40) * (0.5 + ac());
          const g = c.createRadialGradient(fx, fy, 0, fx, fy, fr);
          g.addColorStop(0, 'rgba(246,239,226,0.32)'); g.addColorStop(0.7, 'rgba(246,239,226,0.12)');
          g.addColorStop(0.86, Filme.cor(escuro(tinta, 0.4), null, 0, 0.22)); g.addColorStop(1, Filme.cor(escuro(tinta, 0.4), null, 0, 0));
          c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(fx, fy, fr, 0, TAU); c.fill();
        }
      }
      c.restore();
    }
    // borda: o pigmento junta onde a água secou
    if ((o.borda ?? 0.2) > 0) {
      c.strokeStyle = escuro(tinta, 0.4); c.lineJoin = 'round'; c.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        c.globalAlpha = (o.borda ?? 0.2) * (i ? 0.5 : 1); c.lineWidth = (o.bordaW ?? 2.4) * (i ? 2.2 : 1);
        c.beginPath();
        pts.forEach(([x, y], q) => { const px = x + ruido(q * 0.5 + i * 3, sem + 9) * j * 0.35, py = y + ruido(q * 0.5 + i * 3, sem + 11) * j * 0.35; if (q) c.lineTo(px, py); else c.moveTo(px, py); });
        c.closePath(); c.stroke();
      }
    }
    c.restore();
  }
  function caixa(pts) { let xa = Infinity, ya = Infinity, xb = -Infinity, yb = -Infinity; for (const [x, y] of pts) { xa = Math.min(xa, x); ya = Math.min(ya, y); xb = Math.max(xb, x); yb = Math.max(yb, y); } return [xa, ya, xb, yb]; }

  // pincelada seca (falha): risco com buracos, para capim e terra
  function seca(c, x, y, comp, ang, grossura, tinta, alfa, ac) {
    c.strokeStyle = tinta; c.lineCap = 'round';
    const passos = 5, dx = Math.cos(ang) * comp / passos, dy = Math.sin(ang) * comp / passos;
    for (let i = 0; i < passos; i++) {
      if (ac() < 0.3) continue;
      c.globalAlpha = alfa * (0.5 + ac()); c.lineWidth = grossura * (0.4 + ac() * 0.8);
      c.beginPath(); c.moveTo(x + dx * i, y + dy * i); c.lineTo(x + dx * (i + 1) + (ac() - 0.5) * 3, y + dy * (i + 1) + (ac() - 0.5) * 3); c.stroke();
    }
    c.globalAlpha = 1;
  }

  // ---------- céu: faixas molhadas que se misturam (molhado sobre molhado), nuvens com flores ----------
  // p = { y0, y1, faixas: [[y, altura, '#cor', alfa]], nuvens: [[x, y, rx, ry, '#cor']], papel: [[x, y, rx, ry]] (sobra branca) }
  function ceu(c, p, ac) {
    const x0 = p.x0 ?? -320, w = p.largura ?? 1720;
    for (const [y, h, cr, a] of p.faixas || []) {
      const pts = [[x0, y - h / 2], [x0 + w, y - h / 2], [x0 + w, y + h / 2], [x0, y + h / 2]];
      aguada(c, pts, cr, ac, { passes: 14, molhado: h * 0.22, alfa: (a ?? 0.5) / 7, borda: 0, borra: 18, passo: 60 });
      aguada(c, bolha(x0 + ac() * w, y + (ac() - 0.5) * h * 0.4, h * (0.5 + ac()), h * 0.3, Math.floor(ac() * 99), 0.35), cr, ac, { passes: 10, molhado: h * 0.06, alfa: (a ?? 0.5) / 12, borda: 0.18, flores: 2, florR: h * 0.3, borra: 3 });
    }
    for (const [x, y, rx, ry, cr, a] of p.nuvens || []) {
      aguada(c, bolha(x, y, rx, ry, Math.floor(ac() * 99), 0.3), cr, ac, { passes: 16, molhado: Math.min(rx, ry) * 0.18, alfa: (a ?? 0.5) / 8, borda: 0.14, flores: 2, florR: Math.min(rx, ry) * 0.5, borra: 4 });
    }
    // sobra de papel: claro que a tinta não cobriu
    for (const [x, y, rx, ry] of p.papel || []) aguada(c, bolha(x, y, rx, ry, Math.floor(ac() * 99), 0.35), '#f8f1e4', ac, { passes: 10, molhado: ry * 0.3, alfa: 0.09, borda: 0, borra: 10 });
  }

  // ---------- serra ao longe: crista torta, a tinta junta na crista e lava para baixo ----------
  function serra(c, p, ac) {
    const x0 = p.x0 ?? -320, x1 = p.x1 ?? 1400, yb = p.y, alt = p.altura || 200, sem = p.semente || 3;
    const topo = (x) => yb - alt * (0.3 + 0.7 * Math.pow(1 - Math.abs(ruido(x / (p.largo || 240), sem)), 1.7) * (0.6 + 0.4 * ruido(x / 650, sem + 4)));
    const pts = []; for (let x = x0; x <= x1; x += 14) pts.push([x, topo(x)]);
    pts.push([x1, yb + (p.pe ?? 120)], [x0, yb + (p.pe ?? 120)]);
    aguada(c, pts, p.cor, ac, { passes: 20, molhado: 10, alfa: (p.alfa ?? 0.8) / 9, borda: 0.3, bordaW: 2.5, graos: 0.6, flores: 3, florR: 70 });
    // neve: papel que ficou (só no alto)
    if (p.neve) {
      c.save(); caminho(c, pts); c.clip();
      for (let x = x0; x < x1; x += 30 + ac() * 40) { const y = topo(x); aguada(c, bolha(x, y + 18, 26 + ac() * 30, 14 + ac() * 10, Math.floor(ac() * 99), 0.4), p.neve, ac, { passes: 6, molhado: 6, alfa: 0.12, borda: 0 }); }
      c.restore();
    }
    // sombra lavada no pé
    if (p.sombra) aguada(c, [[x0, yb - alt * 0.25], [x1, yb - alt * 0.2], [x1, yb + 40], [x0, yb + 40]], p.sombra, ac, { passes: 10, molhado: 30, alfa: 0.035, borda: 0, borra: 10, passo: 60 });
  }

  // ---------- campo: chão de aguadas em faixas, morros, pinceladas secas e respingos ----------
  function perfil(p) {
    return (x) => {
      let y = p.y + ruido(x / 110, p.semente || 2) * (p.ondula ?? 10);
      for (const [cx, alt, larg] of p.morros || []) y -= alt * Math.exp(-Math.pow((x - cx) / larg, 2));
      return y;
    };
  }
  function campo(c, p, ac) {
    const x0 = p.x0 ?? -320, x1 = p.x1 ?? 1400, yb = p.yb ?? 1960, topo = perfil(p);
    const pts = []; for (let x = x0; x <= x1; x += 14) pts.push([x, topo(x)]);
    pts.push([x1, yb], [x0, yb]);
    const [, ymin] = caixa(pts);
    // a base (cor do alto) e faixas mais escuras para baixo
    aguada(c, pts, p.cores[0], ac, { passes: 20, molhado: 9, alfa: 0.085, borda: 0.25, graos: 0.5, flores: 4, florR: 90 });
    c.save(); caminho(c, pts); c.clip();
    (p.cores.slice(1)).forEach((cr, i) => {
      const y = ymin + (yb - ymin) * (0.25 + 0.75 * (i + 1) / p.cores.length) - (yb - ymin) * 0.2;
      aguada(c, [[x0, y], [x1, y + (ac() - 0.5) * 80], [x1, yb + 40], [x0, yb + 40]], cr, ac, { passes: 12, molhado: 50, alfa: 0.06, borda: 0, borra: 14, passo: 50 });
    });
    // pinceladas secas na horizontal (capim, terra)
    const area = (x1 - x0) * (yb - ymin), n = Math.round(area / (p.densidade || 2400));
    for (let i = 0; i < n; i++) {
      const x = x0 + ac() * (x1 - x0), y = ymin + ac() * (yb - ymin);
      if (y < topo(x) + 6) continue;
      const perto = limita((y - ymin) / (yb - ymin));
      seca(c, x, y, 30 + perto * 90, (ac() - 0.5) * 0.25, 2 + perto * 6, p.tons[Math.floor(ac() * p.tons.length)], 0.35, ac);
    }
    c.restore();
    if (p.respingos) respingos(c, { ...p.respingos }, ac);
  }

  // respingos: gotas de tinta jogadas com o pincel
  function respingos(c, p, ac) {
    const n = p.n || 30, [xa, ya, xb, yb] = p.area;
    for (let i = 0; i < n; i++) {
      const x = xa + ac() * (xb - xa), y = ya + ac() * (yb - ya), r = (p.r || 4) * (0.3 + ac() * ac() * 2.4);
      c.globalAlpha = (p.alfa ?? 0.55) * (0.5 + ac() * 0.5); c.fillStyle = p.cor;
      c.beginPath(); c.ellipse(x, y, r, r * (0.7 + ac() * 0.4), ac() * 3, 0, TAU); c.fill();
      if (ac() < 0.3) { c.beginPath(); c.arc(x + (ac() - 0.5) * r * 5, y + (ac() - 0.5) * r * 5, r * 0.35, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  // ---------- formas soltas para interiores e objetos ----------
  // retângulo em aguada (parede, mesa, prateleira); vao = buracos onde fica a luz do papel
  function placa(c, p, ac) {
    const { x, y, w, h } = p;
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    if (p.vao) {
      c.save(); c.beginPath(); c.rect(x - 200, y - 200, w + 400, h + 400);
      for (const [vx, vy, vw, vh] of p.vao) c.rect(vx + vw, vy, -vw, vh);
      c.clip('evenodd');
    }
    aguada(c, pts, p.cor, ac, { passes: p.passes ?? 18, molhado: p.molhado ?? 10, alfa: (p.alfa ?? 0.85) / 9, borda: p.borda ?? 0.25, graos: p.graos ?? 0.5, flores: p.flores ?? 2, florR: p.florR ?? Math.min(w, h) * 0.3 });
    if (p.vao) c.restore();
    if (p.veios) for (let i = 0; i < (p.nVeios || 30); i++) seca(c, x + ac() * w, y + ac() * h, 60 + ac() * 140, p.ang ?? 0, 3, p.veios, 0.25, ac);
  }
  function poligono(c, p, ac) {
    aguada(c, p.pts, p.cor, ac, { passes: p.passes ?? 18, molhado: p.molhado ?? 8, alfa: (p.alfa ?? 0.85) / 9, borda: p.borda ?? 0.25, graos: p.graos ?? 0.4, flores: p.flores ?? 1, florR: p.florR ?? 40, borra: p.borra });
  }
  function mancha(c, p, ac) {
    aguada(c, bolha(p.x, p.y, p.rx, p.ry, p.semente ?? Math.floor(ac() * 99), p.torto ?? 0.18, 44, p.giro || 0), p.cor, ac,
      { passes: p.passes ?? 16, molhado: p.molhado ?? Math.min(p.rx, p.ry) * 0.15, alfa: (p.alfa ?? 0.8) / 8, borda: p.borda ?? 0.22, flores: p.flores ?? 1, florR: Math.min(p.rx, p.ry) * 0.6, borra: p.borra, graos: p.graos });
  }
  // linha a pincel (moldura, galho, haste): duas passadas tremidas
  function traco(c, p, ac) {
    c.strokeStyle = p.cor; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < (p.passes || 3); i++) {
      c.globalAlpha = (p.alfa ?? 0.7) / (i + 1); c.lineWidth = (p.w || 6) * (1 - i * 0.2);
      c.beginPath(); p.pts.forEach(([x, y], q) => { const px = x + (ac() - 0.5) * 4, py = y + (ac() - 0.5) * 4; if (q) c.lineTo(px, py); else c.moveTo(px, py); }); c.stroke();
    }
    c.globalAlpha = 1;
  }
  // luz: o papel clareando (lâmpada, sol baixo) — tela, não soma (aquarela não brilha, clareia)
  function luz(c, p) {
    const r = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    r.addColorStop(0, Filme.cor(p.cor, null, 0, p.alfa ?? 0.6)); r.addColorStop(0.4, Filme.cor(p.cor, null, 0, (p.alfa ?? 0.6) * 0.35)); r.addColorStop(1, Filme.cor(p.cor, null, 0, 0));
    c.save(); c.globalCompositeOperation = 'screen';
    if (p.ry) { c.translate(p.x, p.y); c.scale(1, p.ry / p.r); c.translate(-p.x, -p.y); }
    c.fillStyle = r; c.fillRect(p.x - p.r, p.y - p.r, 2 * p.r, 2 * p.r); c.restore();
  }

  // ---------- coluna de cavaleiros na estepe: manchas soltas, estandartes carmim, poeira lavada ----------
  function cavaleiros(c, p, ac) {
    const [xa, ya, xb, yb] = p.linha, n = p.n || 30;
    for (let i = 0; i < n; i++) { // poeira
      const u = ac(), x = xa + (xb - xa) * u, y = ya + (yb - ya) * u, e = p.e0 + (p.e1 - p.e0) * u;
      aguada(c, bolha(x, y - 20 * e, 90 * e, 40 * e, i, 0.35), p.poeira, ac, { passes: 8, molhado: 18 * e, alfa: 0.04, borda: 0, borra: 8 });
    }
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), e = p.e0 + (p.e1 - p.e0) * u, x = xa + (xb - xa) * u + (ac() - 0.5) * 22 * e, y = ya + (yb - ya) * u + (ac() - 0.5) * 8 * e;
      const cr = ac() < 0.25 ? p.carmim : p.cor;
      aguada(c, bolha(x, y - 24 * e, 26 * e, 12 * e, i * 3, 0.2), p.cor, ac, { passes: 6, molhado: 3 * e, alfa: 0.14, borda: 0.2, bordaW: 1.5 }); // cavalo
      aguada(c, bolha(x + 26 * e, y - 40 * e, 9 * e, 6 * e, i * 3 + 1, 0.2, 20, -0.6), p.cor, ac, { passes: 5, molhado: 2 * e, alfa: 0.16, borda: 0 }); // cabeça
      aguada(c, bolha(x - 2 * e, y - 46 * e, 8 * e, 15 * e, i * 3 + 2, 0.2, 20), cr, ac, { passes: 6, molhado: 2 * e, alfa: 0.17, borda: 0 }); // cavaleiro
      c.strokeStyle = p.cor; c.lineCap = 'round'; c.lineWidth = 3.5 * e; c.globalAlpha = 0.7;
      c.beginPath(); c.moveTo(x - 16 * e, y - 18 * e); c.lineTo(x - 20 * e, y); c.moveTo(x + 14 * e, y - 18 * e); c.lineTo(x + 18 * e, y); c.stroke();
      if (i % (p.estandarte || 4) === 0) { // estandarte
        c.lineWidth = 2 * e; c.beginPath(); c.moveTo(x - 4 * e, y - 46 * e); c.lineTo(x - 7 * e, y - 120 * e); c.stroke();
        aguada(c, [[x - 7 * e, y - 120 * e], [x - 40 * e, y - 112 * e], [x - 52 * e, y - 104 * e], [x - 7 * e, y - 96 * e]], p.carmim, ac, { passes: 6, molhado: 3 * e, alfa: 0.16, borda: 0.2, bordaW: 1.4 });
      }
      c.globalAlpha = 1;
    }
  }

  // ---------- árvore grande: tronco lavado, galhos a pincel, copas em manchas com flores ----------
  function arvoreGigante(c, p, ac) {
    const { x, y } = p, h = p.altura || 900, w = p.largura || 160;
    for (const [gx, gy, cx, cy, gw] of p.galhos || []) {
      c.strokeStyle = p.casca; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { c.globalAlpha = 0.35; c.lineWidth = gw * (1 - i * 0.25); c.beginPath(); c.moveTo(x + (gx - x) * 0.1 + (ac() - 0.5) * 6, gy + 60); c.quadraticCurveTo(cx + (ac() - 0.5) * 10, cy + 40, gx + (ac() - 0.5) * 6, gy); c.stroke(); }
      c.globalAlpha = 1;
    }
    const pts = [[x - w / 2, y - h], [x - w * 0.55, y - h * 0.5], [x - w * 0.75, y - 80], [x - w * 1.6, y + 10], [x - w * 0.4, y - 10], [x, y + 20],
      [x + w * 0.45, y - 10], [x + w * 1.7, y + 15], [x + w * 0.8, y - 80], [x + w * 0.55, y - h * 0.5], [x + w / 2, y - h]];
    aguada(c, pts, p.casca, ac, { passes: 20, molhado: 8, alfa: 0.1, borda: 0.35, graos: 1, flores: 3, florR: 50 });
    for (let i = 0; i < 40; i++) seca(c, x - w * 0.4 + ac() * w * 0.8, y - h + ac() * h, 80 + ac() * 120, Math.PI / 2 + (ac() - 0.5) * 0.2, 4, escuro(p.casca, 0.4), 0.3, ac);
    (p.copas || []).forEach(([cx, cy, r], i) => {
      aguada(c, bolha(cx, cy, r, r * 0.8, i * 5 + 3, 0.28), p.tons[i % p.tons.length], ac, { passes: 18, molhado: r * 0.14, alfa: 0.06, borda: 0.22, flores: 3, florR: r * 0.4, graos: 0.4 });
    });
  }

  window.Pinturas = { aguada, bolha, seca, respingos, ceu, serra, campo, placa, poligono, mancha, traco, luz, cavaleiros, arvoreGigante, perfil, escuro };
})();
