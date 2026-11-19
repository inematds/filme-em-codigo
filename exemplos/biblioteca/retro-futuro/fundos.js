// fundos.js — os "cartazes" pintados de cada cena do retro-futuro (anos 50–60, era atômica):
// céu em degradê de aerógrafo, planeta com anel, cidade de agulhas e discos no horizonte, laboratório,
// estepe com cavaleiros, mesa de detetive, escavação ao entardecer e céu noturno.
// Cada fundo é pintado UMA vez, ao montar, numa tela à parte; o motor só move essa tela (câmera).
// Nada aqui sabe da história: o motor pede o fundo pelo nome. Sorteio só com Filme.sorteio(semente).
(function () {
  'use strict';
  const { sorteio, mistura } = Filme;
  const X0 = -110, X1 = 1190, Y0 = -110, Y1 = 2030; // o desenho passa da borda (a câmera anda)

  const linear = (g, x0, y0, x1, y1, paradas) => { const gr = g.createLinearGradient(x0, y0, x1, y1); paradas.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  const radial = (g, x, y, r0, r1, paradas, x2, y2) => { const gr = g.createRadialGradient(x, y, r0, x2 ?? x, y2 ?? y, r1); paradas.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  const faixa = (g, y0, y1, paradas) => { g.fillStyle = linear(g, 0, y0, 0, y1, paradas); g.fillRect(X0, y0, X1 - X0, y1 - y0); };
  const poli = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const brilhoRedondo = (g, x, y, r, cor, a) => { g.fillStyle = radial(g, x, y, 0, r, [[0, cor + Math.round(a * 255).toString(16).padStart(2, '0')], [1, cor + '00']]); g.fillRect(x - r, y - r, 2 * r, 2 * r); };

  // retícula de impressão: pontinhos que encolhem de y0 até y1 (sombra do cartaz)
  function reticula(g, x0, y0, x1, y1, passo, rmax, cor, alfa) {
    g.fillStyle = cor; g.globalAlpha = alfa;
    let lin = 0;
    for (let y = y0; y < y1; y += passo * 0.87, lin++) {
      const r = rmax * (1 - (y - y0) / (y1 - y0));
      if (r < 0.6) continue;
      for (let x = x0 + (lin % 2 ? passo / 2 : 0); x < x1; x += passo) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
  }

  // planeta com anel: metade de trás do anel, a esfera, a metade da frente
  function planeta(g, x, y, r, o = {}) {
    const giro = o.giro ?? -0.32, rx = r * 1.95, ry = r * 0.4;
    const anel = (frente) => {
      g.save(); g.translate(x, y); g.rotate(giro);
      g.beginPath(); g.rect(-rx * 1.3, frente ? 0 : -ry * 2.5, rx * 2.6, ry * 2.5); g.clip();
      [[1, '#fff3dc', 0.9, r * 0.07], [0.88, '#ff8a1f', 0.75, r * 0.05], [0.77, '#f5e6c8', 0.55, r * 0.035]].forEach(([s, cor, a, w]) => {
        g.globalAlpha = a; g.strokeStyle = cor; g.lineWidth = w; g.beginPath(); g.ellipse(0, 0, rx * s, ry * s, 0, 0, 7); g.stroke();
      });
      g.restore(); g.globalAlpha = 1;
    };
    anel(false);
    g.fillStyle = radial(g, x - r * 0.4, y - r * 0.45, r * 0.05, r * 1.15, [[0, o.claro || '#ffe9c4'], [0.45, o.medio || '#f59a52'], [1, o.escuro || '#7a3320']], x, y);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
    g.translate(x, y); g.rotate(giro);
    [[-0.35, 0.09], [-0.05, 0.06], [0.28, 0.1]].forEach(([dy, h]) => { g.fillStyle = 'rgba(122,51,32,0.22)'; g.fillRect(-r, dy * r, 2 * r, h * r); });
    g.restore();
    anel(true);
  }
  function lua(g, x, y, r) {
    g.fillStyle = radial(g, x - r * 0.3, y - r * 0.3, 0, r * 1.1, [[0, '#fff8ea'], [1, '#d8c9a6']], x, y);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(150,130,100,0.35)';
    [[0.3, -0.2, 0.22], [-0.35, 0.25, 0.16], [0.1, 0.45, 0.12]].forEach(([a, b, s]) => { g.beginPath(); g.arc(x + a * r, y + b * r, s * r, 0, 7); g.fill(); });
  }

  // prédios da cidade do futuro (vistos de longe): agulha, domo e torre com disco
  function agulha(g, x, base, h, w, cor, luz) {
    g.fillStyle = cor;
    g.beginPath(); g.moveTo(x - w / 2, base); g.quadraticCurveTo(x - w * 0.1, base - h * 0.55, x, base - h); g.quadraticCurveTo(x + w * 0.1, base - h * 0.55, x + w / 2, base); g.closePath(); g.fill();
    g.fillStyle = luz; g.globalAlpha = 0.6;
    g.beginPath(); g.moveTo(x - w / 2, base); g.quadraticCurveTo(x - w * 0.1, base - h * 0.55, x, base - h); g.lineTo(x - w * 0.06, base); g.closePath(); g.fill();
    g.globalAlpha = 1;
    g.beginPath(); g.ellipse(x, base - h * 0.62, w * 0.55, w * 0.14, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(x, base - h, w * 0.12, 0, 7); g.fill();
  }
  function domo(g, x, base, w, h, cor, luz) {
    g.fillStyle = linear(g, x - w / 2, 0, x + w / 2, 0, [[0, luz], [0.45, cor], [1, cor]]);
    g.beginPath(); g.ellipse(x, base, w / 2, h, 0, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,243,220,0.55)';
    for (let i = -2; i <= 2; i++) g.fillRect(x + i * w * 0.14 - w * 0.025, base - h * 0.32, w * 0.05, h * 0.14);
  }
  function torreDisco(g, x, base, h, dw, cor, luz) {
    g.fillStyle = cor; poli(g, [[x - dw * 0.09, base], [x - dw * 0.04, base - h], [x + dw * 0.04, base - h], [x + dw * 0.09, base]]); g.fill();
    g.fillStyle = linear(g, 0, base - h - dw * 0.12, 0, base - h + dw * 0.12, [[0, luz], [0.5, cor], [1, cor]]);
    g.beginPath(); g.ellipse(x, base - h, dw / 2, dw * 0.12, 0, 0, 7); g.fill();
    g.fillStyle = luz; g.beginPath(); g.ellipse(x, base - h - dw * 0.08, dw * 0.18, dw * 0.13, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#ff8a1f'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(x + i * dw * 0.11, base - h + dw * 0.02, dw * 0.018, 0, 7); g.fill(); }
  }
  function cidade(g, base, esc, cor, luz, sem, x0 = X0, x1 = X1) {
    const r = sorteio(sem);
    for (let x = x0 + 20; x < x1; x += (40 + r() * 70) * esc) {
      const tipo = r(), h = (120 + r() * 260) * esc;
      if (tipo < 0.45) agulha(g, x, base, h, (26 + r() * 14) * esc, cor, luz);
      else if (tipo < 0.75) domo(g, x, base, (70 + r() * 70) * esc, (34 + r() * 30) * esc, cor, luz);
      else torreDisco(g, x, base, h * 0.75, (80 + r() * 50) * esc, cor, luz);
    }
    // monotrilho em arco
    g.strokeStyle = luz; g.globalAlpha = 0.7; g.lineWidth = 5 * esc;
    g.beginPath(); g.moveTo(x0, base - 70 * esc); g.quadraticCurveTo((x0 + x1) / 2, base - 210 * esc, x1, base - 60 * esc); g.stroke(); g.globalAlpha = 1;
  }
  function montanhas(g, base, alt, cor, sem, passo = 90) {
    const r = sorteio(sem); const pts = [[X0, Y1], [X0, base]];
    for (let x = X0; x <= X1 + passo; x += passo * (0.6 + r() * 0.8)) pts.push([x, base - alt * (0.25 + r() * 0.75)]);
    pts.push([X1, base], [X1, Y1]);
    g.fillStyle = cor; poli(g, pts); g.fill();
  }
  function nuvem(g, x, y, s, cor, a) {
    g.globalAlpha = a; g.fillStyle = cor;
    [[-1, 0.15, 0.55], [-0.45, -0.2, 0.75], [0.2, -0.3, 0.8], [0.85, 0.05, 0.6], [0, 0.25, 0.7]].forEach(([dx, dy, rr]) => { g.beginPath(); g.ellipse(x + dx * s, y + dy * s, rr * s, rr * s * 0.75, 0, 0, 7); g.fill(); });
    g.globalAlpha = 1;
  }

  // céu de dia com cidade (usado também na janela do laboratório e da mesa)
  function ceuCidade(g, horizonte, o = {}) {
    faixa(g, Y0, horizonte + 2, [[0, '#0b3540'], [0.35, '#1f6f73'], [0.68, '#8cc0b0'], [0.88, '#f3dfb8'], [1, '#f7c98a']]);
    reticula(g, X0, Y0, X1, Y0 + (horizonte - Y0) * 0.45, 16, 4.2, '#082a31', 0.45);
    brilhoRedondo(g, o.solX ?? 260, horizonte - 40, 520, '#ffb066', 0.35);
    planeta(g, o.px ?? 790, o.py ?? 300, o.pr ?? 160);
    lua(g, o.lx ?? 170, o.ly ?? 230, 38);
    nuvem(g, 300, horizonte - 330, 70, '#fff3dc', 0.55); nuvem(g, 860, horizonte - 250, 55, '#fff3dc', 0.45);
    montanhas(g, horizonte, 70, '#6fa49d', 11, 120);
    cidade(g, horizonte, 1, '#2c7f7d', '#d6e8dc', o.sem || 21);
  }

  // ---------- os fundos ----------
  const PINTORES = {
    // gancho: planície com a cidade do futuro no horizonte
    cidade(g) {
      const H = 900;
      ceuCidade(g, H);
      faixa(g, H, Y1, [[0, '#f0d7a4'], [0.12, '#dca463'], [0.4, '#a85f34'], [0.7, '#5a3020'], [1, '#2a1a12']]);
      g.strokeStyle = 'rgba(90,48,32,0.25)'; g.lineWidth = 3; // sulcos que fogem para o horizonte
      for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(540 + i * 12, H); g.lineTo(540 + i * 190, Y1); g.stroke(); }
      reticula(g, X0, H + 500, X1, Y1, 16, 4.5, '#1a0e08', 0.35);
    },
    // evidência: laboratório redondo de cromo, com uma janela-escotilha para a cidade
    laboratorio(g) {
      faixa(g, Y0, Y1, [[0, '#0e3238'], [0.4, '#1d5f63'], [0.75, '#123f46'], [1, '#08262b']]);
      g.strokeStyle = 'rgba(214,232,220,0.12)'; g.lineWidth = 4; // placas da parede
      for (let x = -60; x < 1180; x += 180) { g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, 1240); g.stroke(); }
      g.fillStyle = 'rgba(214,232,220,0.25)';
      for (let x = -60; x < 1180; x += 180) for (let y = 60; y < 1240; y += 160) { g.beginPath(); g.arc(x + 14, y, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x - 14, y, 4, 0, 7); g.fill(); }
      // escotilha com a cidade
      const ex = 540, ey = 300, er = 250;
      g.save(); g.beginPath(); g.arc(ex, ey, er, 0, 7); g.clip();
      g.translate(ex - 540 * 0.5, ey - 260); g.scale(0.5, 0.5); ceuCidade(g, 620, { px: 760, py: 240, pr: 150, lx: 260, ly: 160, sem: 33 });
      faixa(g, 620, 1400, [[0, '#dca463'], [1, '#7a4026']]);
      g.restore();
      g.lineWidth = 34; g.strokeStyle = linear(g, ex - er, ey - er, ex + er, ey + er, [[0, '#f4f7f2'], [0.35, '#8fb2ad'], [0.6, '#2f5a5c'], [1, '#c9dcd6']]);
      g.beginPath(); g.arc(ex, ey, er + 12, 0, 7); g.stroke();
      g.fillStyle = '#e6efe9'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.arc(ex + Math.cos(a) * (er + 12), ey + Math.sin(a) * (er + 12), 5, 0, 7); g.fill(); }
      // prateleira com frascos coloridos (esquerda) e microscópio (direita)
      g.fillStyle = '#c9dcd6'; g.fillRect(-40, 1150, 260, 14);
      [[20, '#ff8a1f'], [80, '#4fa3a0'], [140, '#e84830']].forEach(([x, cl]) => {
        g.fillStyle = 'rgba(230,240,235,0.35)'; g.beginPath(); g.moveTo(x - 10, 1060); g.lineTo(x - 10, 1090); g.lineTo(x - 30, 1150); g.lineTo(x + 30, 1150); g.lineTo(x + 10, 1090); g.lineTo(x + 10, 1060); g.closePath(); g.fill();
        g.fillStyle = cl; g.beginPath(); g.moveTo(x - 22, 1125); g.lineTo(x - 30, 1150); g.lineTo(x + 30, 1150); g.lineTo(x + 22, 1125); g.closePath(); g.fill();
      });
      g.fillStyle = linear(g, 900, 0, 1060, 0, [[0, '#f4f7f2'], [0.5, '#8fb2ad'], [1, '#2f5a5c']]);
      poli(g, [[930, 1240], [1090, 1240], [1080, 1200], [1010, 1190], [1000, 1080], [1040, 1000], [1015, 985], [965, 1060], [975, 1190], [940, 1200]]); g.fill();
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(1000, 1120, 12, 0, 7); g.fill();
      // bancada de cromo
      faixa(g, 1240, 1290, [[0, '#f4f7f2'], [0.4, '#a9c6c0'], [1, '#2f5a5c']]);
      faixa(g, 1290, Y1, [[0, '#123f46'], [0.5, '#0b2c32'], [1, '#061a1e']]);
      reticula(g, X0, 1290, X1, Y1, 16, 3.6, '#000', 0.3);
    },
    // mapa: a estepe com a coluna de cavaleiros (fica desfocada e escura atrás do painel)
    estepe(g) {
      const H = 860;
      faixa(g, Y0, H + 2, [[0, '#0e3b43'], [0.45, '#3f7f7a'], [0.8, '#e9c99a'], [1, '#f2b072']]);
      planeta(g, 250, 280, 130, { giro: 0.25 });
      montanhas(g, H, 260, '#4c7f86', 5, 140);
      montanhas(g, H + 40, 150, '#2f5f66', 6, 110);
      faixa(g, H, Y1, [[0, '#d9a463'], [0.25, '#b77440'], [0.6, '#6e3a22'], [1, '#2a160e']]);
      // coluna de cavaleiros que vem do fundo, com estandartes
      const r = sorteio(9);
      for (let i = 0; i < 26; i++) {
        const q = i / 25, x = mistura(940, 120, q) + 40 * Math.sin(q * 5), y = mistura(H + 40, 1450, q * q), s = mistura(0.35, 1.6, q * q);
        nuvem(g, x + 30 * s, y + 10 * s, 40 * s, '#f3d9aa', 0.35);
        g.fillStyle = '#2a160e';
        g.beginPath(); g.ellipse(x, y - 24 * s, 30 * s, 12 * s, 0, 0, 7); g.fill();          // corpo do cavalo
        g.beginPath(); g.ellipse(x + 30 * s, y - 38 * s, 8 * s, 16 * s, 0.6, 0, 7); g.fill(); // pescoço
        g.lineWidth = 4 * s; g.strokeStyle = '#2a160e';
        for (const dx of [-20, -10, 14, 24]) { g.beginPath(); g.moveTo(x + dx * s, y - 18 * s); g.lineTo(x + (dx + (r() - 0.5) * 8) * s, y); g.stroke(); }
        g.beginPath(); g.ellipse(x - 2 * s, y - 48 * s, 8 * s, 15 * s, 0, 0, 7); g.fill();  // cavaleiro
        g.beginPath(); g.arc(x - 2 * s, y - 68 * s, 7 * s, 0, 7); g.fill();
        if (i % 3 === 0) { // estandarte
          g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(x - 10 * s, y - 40 * s); g.lineTo(x - 14 * s, y - 120 * s); g.stroke();
          g.fillStyle = '#ff8a1f'; poli(g, [[x - 14 * s, y - 120 * s], [x + 22 * s, y - 108 * s], [x - 13 * s, y - 96 * s]]); g.fill();
        }
      }
      reticula(g, X0, 1450, X1, Y1, 16, 4, '#000', 0.3);
    },
    // virada: mesa de detetive com abajur, janela para a cidade, xícara e lupa
    mesa(g) {
      faixa(g, Y0, 900, [[0, '#0a2a30'], [1, '#143e44']]);
      g.save(); g.beginPath(); g.roundRect(120, 90, 840, 640, 40); g.clip();
      g.translate(120, 90); g.scale(0.78, 0.78); ceuCidade(g, 760, { px: 700, py: 260, pr: 150, lx: 180, ly: 170, sem: 44 });
      faixa(g, 760, 1200, [[0, '#dca463'], [1, '#7a4026']]);
      g.restore();
      g.lineWidth = 22; g.strokeStyle = linear(g, 120, 90, 960, 730, [[0, '#f4f7f2'], [0.5, '#5f8a88'], [1, '#c9dcd6']]);
      g.beginPath(); g.roundRect(120, 90, 840, 640, 40); g.stroke();
      // tampo de madeira
      faixa(g, 900, Y1, [[0, '#a5582c'], [0.3, '#7a3e1f'], [0.7, '#4a2414'], [1, '#22100a']]);
      g.strokeStyle = 'rgba(40,18,8,0.35)'; g.lineWidth = 3;
      const r = sorteio(4);
      for (let i = 0; i < 18; i++) { const y = 920 + i * 62 + r() * 20; g.beginPath(); g.moveTo(X0, y); g.bezierCurveTo(300, y + 14 * (r() - 0.5), 700, y + 18 * (r() - 0.5), X1, y + 6); g.stroke(); }
      g.fillStyle = '#e09a52'; g.globalAlpha = 0.8; poli(g, [[60, 1000], [600, 960], [640, 1240], [90, 1280]]); g.fill(); g.globalAlpha = 1; // mapa velho
      // luz do abajur na mesa
      brilhoRedondo(g, 360, 1020, 620, '#ffcf8a', 0.55);
      // abajur de cúpula (no alto, à esquerda)
      g.strokeStyle = '#c9dcd6'; g.lineWidth = 12; g.beginPath(); g.moveTo(-40, 980); g.quadraticCurveTo(40, 600, 190, 520); g.stroke();
      g.fillStyle = linear(g, 120, 400, 430, 600, [[0, '#ffb066'], [0.5, '#ff8a1f'], [1, '#a5401f']]);
      g.beginPath(); g.moveTo(130, 540); g.quadraticCurveTo(250, 380, 420, 560); g.closePath(); g.fill();
      g.fillStyle = '#fff3dc'; g.beginPath(); g.ellipse(275, 553, 140, 22, 0.08, 0, 7); g.fill();
      // xícara e lupa
      g.save(); g.translate(-10, 160); // xícara mais embaixo (fora do "AINDA NÃO")
      g.fillStyle = '#f5e6c8'; g.beginPath(); g.ellipse(930, 1300, 110, 30, 0, 0, 7); g.fill();
      g.fillStyle = linear(g, 870, 0, 990, 0, [[0, '#fff3dc'], [1, '#c9b48a']]); poli(g, [[860, 1210], [1000, 1210], [985, 1290], [875, 1290]]); g.fill();
      g.fillStyle = '#7a3e1f'; g.beginPath(); g.ellipse(930, 1210, 70, 14, 0, 0, 7); g.fill();
      g.strokeStyle = '#fff3dc'; g.lineWidth = 10; g.beginPath(); g.arc(1010, 1245, 26, -1.2, 1.2); g.stroke();
      g.restore();
      g.strokeStyle = '#c9dcd6'; g.lineWidth = 12; g.beginPath(); g.arc(190, 1390, 70, 0, 7); g.stroke();
      g.strokeStyle = '#3a2418'; g.lineWidth = 20; g.beginPath(); g.moveTo(240, 1440); g.lineTo(330, 1530); g.stroke();
      reticula(g, X0, 1450, X1, Y1, 16, 4.2, '#000', 0.35);
    },
    // túmulos: escavação ao entardecer, pedras em pé e a cidade ao longe
    escavacao(g) {
      const H = 840;
      faixa(g, Y0, H + 2, [[0, '#0e3b43'], [0.4, '#3f6d6a'], [0.78, '#e8955a'], [1, '#ffcf8a']]);
      reticula(g, X0, Y0, X1, 360, 16, 4, '#082a31', 0.45);
      planeta(g, 280, 250, 125, { giro: 0.3, medio: '#ffb066' });
      cidade(g, H, 0.7, '#3c5f63', '#f3c59a', 55, 600, X1);
      g.fillStyle = '#4a3a3a'; // pedras em pé
      [[90, 70, 150], [180, 55, 110], [470, 40, 90]].forEach(([x, w, h]) => { g.beginPath(); g.roundRect(x - w / 2, H - h + 10, w, h, 10); g.fill(); });
      faixa(g, H, Y1, [[0, '#c27a44'], [0.2, '#8e4f2c'], [0.55, '#5a2f1c'], [1, '#22120a']]);
      // cova aberta
      g.fillStyle = '#3a1e12'; g.beginPath(); g.ellipse(540, 1260, 430, 120, 0, 0, 7); g.fill();
      g.fillStyle = '#24130b'; g.beginPath(); g.ellipse(540, 1275, 360, 85, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,207,138,0.35)'; g.lineWidth = 6; g.beginPath(); g.ellipse(540, 1260, 430, 120, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      // pá e escova
      g.strokeStyle = '#c9dcd6'; g.lineWidth = 9; g.beginPath(); g.moveTo(930, 1360); g.lineTo(1010, 1470); g.stroke();
      g.fillStyle = '#c9dcd6'; poli(g, [[900, 1320], [950, 1345], [935, 1385], [890, 1370]]); g.fill();
      reticula(g, X0, 1440, X1, Y1, 16, 4.2, '#000', 0.35);
    },
    // pergunta: céu noturno com estrelas, a sombra de uma árvore enorme e um morro
    noite(g) {
      faixa(g, Y0, Y1, [[0, '#06191d'], [0.45, '#0e3b43'], [0.7, '#1f5f63'], [1, '#0a2226']]);
      const r = sorteio(12);
      g.fillStyle = '#fff3dc';
      for (let i = 0; i < 140; i++) { g.globalAlpha = 0.35 + r() * 0.6; g.beginPath(); g.arc(X0 + r() * (X1 - X0), Y0 + r() * 1300, 1.5 + r() * 2.5, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      planeta(g, 930, 190, 95, { giro: -0.2, medio: '#e07a3c', escuro: '#5a2618' });
      brilhoRedondo(g, 540, 1500, 700, '#ff8a1f', 0.25);
      // árvore enorme em sombra (galhos sorteados, sem memória)
      g.strokeStyle = '#082025'; g.lineCap = 'round';
      const galho = (x, y, ang, comp, larg, n) => {
        if (n === 0 || larg < 2) return;
        const x2 = x + Math.cos(ang) * comp, y2 = y + Math.sin(ang) * comp;
        g.lineWidth = larg; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * comp * 0.3, (y + y2) / 2, x2, y2); g.stroke();
        galho(x2, y2, ang - 0.35 - r() * 0.3, comp * 0.74, larg * 0.66, n - 1);
        galho(x2, y2, ang + 0.35 + r() * 0.3, comp * 0.74, larg * 0.66, n - 1);
      };
      galho(540, 1700, -Math.PI / 2, 420, 70, 7);
      g.fillStyle = '#071c20'; g.beginPath(); g.ellipse(540, 1820, 900, 260, 0, Math.PI, 0); g.closePath(); g.fill();
      faixa(g, 1800, Y1, [[0, '#071c20'], [1, '#03100f']]);
    },
  };

  window.Fundos = { pintar(nome, g) { if (!PINTORES[nome]) throw new Error('Fundo que não existe: ' + nome); PINTORES[nome](g); }, planeta, nuvem };
})();
