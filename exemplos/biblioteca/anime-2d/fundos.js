// fundos.js — o cenário do anime 2D de cinema, pintado em "tinta-pôster": formas chapadas em
// dois ou três tons, borda firme, sombra azul-lilás e marca de pincel aparente.
// Cada pintor recebe (c, peça, paleta, sorteio) e desenha em medidas de 1920x1080.
// Nada aqui sabe da história: a lista de peças (o que, onde) vem do historia.json.
// O motor pinta as peças paradas UMA vez, em camadas, e só as que mexem a cada quadro.
(function () {
  'use strict';
  const { cor, hex, limita } = Filme;
  const TAU = Math.PI * 2;

  // ---------- ferramentas de pincel ----------
  // riscos curtos e transparentes dentro da forma atual (o "pincel aparente")
  function pincelada(c, x, y, w, h, tinta, n, acaso, o = {}) {
    const comp = o.comp || 26, ang = o.ang ?? 0, abre = o.abre ?? 0.35, alfa = o.alfa ?? 0.09;
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = x + acaso() * w, py = y + acaso() * h, a = ang + (acaso() - 0.5) * abre, l = comp * (0.5 + acaso());
      c.globalAlpha = alfa * (0.5 + acaso());
      c.strokeStyle = tinta; c.lineWidth = 1.5 + acaso() * (o.grossura || 4);
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke();
    }
    c.globalAlpha = 1;
  }
  const caminho = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };

  // ---------- céu ----------
  function ceu(c, p, pal, acaso) {
    const [x, y, w, h] = [p.x ?? 0, p.y ?? 0, p.largura ?? 1920, p.altura ?? 1080];
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, pal.ceu[0]); g.addColorStop(0.55, pal.ceu[1]); g.addColorStop(1, pal.ceu[2]);
    c.fillStyle = g; c.fillRect(x, y, w, h);
    pincelada(c, x, y, w, h, pal.ceu[0], Math.round(w * h / 2600), acaso, { comp: 60, abre: 0.12, alfa: 0.07, grossura: 6 });
    pincelada(c, x, y + h * 0.35, w, h * 0.65, '#ffffff', Math.round(w * h / 5200), acaso, { comp: 70, abre: 0.1, alfa: 0.05, grossura: 7 });
  }

  // ---------- nuvem de verão (cúmulo-nimbo): bolhas em três tons chapados ----------
  function nuvem(c, p, pal, acaso) {
    const e = p.escala || 1, W = (p.largura || 620) * e, H = (p.altura || 420) * e, x0 = p.x, y0 = p.y; // (x, y) = meio da base reta
    const bolhas = [];
    const n = Math.round(14 + 12 * (p.largura || 620) / 620);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), perfil = Math.pow(Math.max(0, 1 - Math.pow(2 * u - 1, 2)), p.torre ? 0.45 : 0.9);
      const r = (55 + acaso() * 70) * e * (0.6 + 0.5 * perfil);
      bolhas.push({ x: (u - 0.5) * W, y: -H * perfil * (0.72 + 0.28 * acaso()) + r * 0.6, r });
      if (perfil > 0.3) bolhas.push({ x: (u - 0.5) * W * 0.8 + (acaso() - 0.5) * 40 * e, y: -H * perfil * (0.35 + 0.3 * acaso()), r: r * 1.1 });
    }
    // a nuvem é pintada numa folha própria (o véu e os riscos não podem cair no céu) e depois colada
    const destino = c, s = Math.hypot(c.getTransform().a, c.getTransform().b);
    const folha = document.createElement('canvas'); folha.width = Math.ceil(2 * W * s); folha.height = Math.ceil(2.2 * H * s);
    c = folha.getContext('2d'); c.setTransform(s, 0, 0, s, W * s, 2.2 * H * s);
    c.save();
    c.beginPath(); c.rect(-W, -H * 2.2, W * 2, H * 2.2); c.clip(); // base reta
    c.filter = `blur(${(p.macio ?? 1.6) * s}px)`; // borda de pincel macio
    const tons = [pal.nuvem[2], pal.nuvem[1], pal.nuvem[0]];
    const desloc = [[0, 0, 1], [-0.16, -0.2, 0.86], [-0.3, -0.36, 0.62]];
    tons.forEach((tinta, k) => {
      c.fillStyle = tinta; c.beginPath();
      for (const b of bolhas) {
        if (k === 2 && b.y > -H * 0.35) continue; // a luz forte só pega no alto
        const [dx, dy, kr] = desloc[k];
        c.moveTo(b.x + dx * b.r + b.r * kr, b.y + dy * b.r); c.arc(b.x + dx * b.r, b.y + dy * b.r, b.r * kr, 0, TAU);
      }
      c.fill();
    });
    c.filter = 'none';
    // um véu de sombra na base (a nuvem é mais escura embaixo) e riscos de pincel
    const g = c.createLinearGradient(0, -H * 0.3, 0, 0); g.addColorStop(0, cor(pal.nuvem[2], pal.nuvem[2], 0, 0)); g.addColorStop(1, cor(pal.nuvem[2], pal.nuvem[2], 0, 0.55));
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(-W, -H * 0.3, W * 2, H * 0.3);
    pincelada(c, -W / 2, -H, W, H, '#ffffff', Math.round(W * H / 1800), acaso, { comp: 22 * e, ang: -0.6, abre: 0.8, alfa: 0.12, grossura: 3 });
    pincelada(c, -W / 2, -H * 0.5, W, H * 0.5, pal.sombra, Math.round(W * H / 3600), acaso, { comp: 18 * e, ang: 0.3, abre: 0.8, alfa: 0.08, grossura: 3 });
    c.restore(); c.globalCompositeOperation = 'source-over';
    destino.drawImage(folha, x0 - W, y0 - 2.2 * H, 2 * W, 2.2 * H);
  }

  // ---------- morro com mata: silhueta de copas em três verdes ----------
  function morro(c, p, pal, acaso) {
    const x0 = p.x ?? 0, x1 = x0 + (p.largura ?? 1920), yb = p.y, alt = p.altura ?? 200;
    const topo = (x) => yb - alt * (0.6 + 0.25 * Math.sin(x * 0.004 + (p.fase || 0)) + 0.15 * Math.sin(x * 0.011 + 2));
    const passo = 34;
    const copa = (tinta, dy, kr, chao) => {
      c.fillStyle = tinta; c.beginPath();
      for (let x = x0 - 40; x <= x1 + 40; x += passo) {
        const r = (36 + acaso() * 26) * kr, y = topo(x) + dy + acaso() * 18;
        c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
      }
      if (chao) c.rect(x0 - 60, Math.min(yb - alt * 0.4, yb - 30), x1 - x0 + 120, alt + 80);
      c.fill();
    };
    copa(pal.verde[0], 0, 1, true); copa(pal.verde[1], -10, 0.75); copa(pal.verde[2], -22, 0.42);
    for (let x = x0; x < x1; x += 70 + acaso() * 60) { // tufos mais claros soltos na mata
      const y = topo(x) + 40 + acaso() * alt * 0.4, r = 18 + acaso() * 22;
      c.fillStyle = acaso() < 0.5 ? pal.verde[1] : pal.verde[2]; c.beginPath(); c.arc(x, y, r, 0, TAU); c.arc(x + r * 0.9, y + 6, r * 0.7, 0, TAU); c.fill();
    }
    if (p.cor) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = p.cor; c.fillRect(x0 - 80, yb - alt * 1.2, x1 - x0 + 160, alt * 1.4); c.globalCompositeOperation = 'source-over'; }
  }

  // ---------- arbusto / copa de árvore ----------
  function arbusto(c, p, pal, acaso) {
    const r = p.raio || 50, x = p.x, y = p.y, n = p.bolhas || 7;
    const bol = Array.from({ length: n }, (_, i) => ({ x: x + (acaso() - 0.5) * r * 1.8, y: y - acaso() * r * 0.9, r: r * (0.45 + acaso() * 0.4) }));
    const passa = (tinta, dx, dy, kr) => { c.fillStyle = tinta; c.beginPath(); for (const b of bol) { c.moveTo(b.x + dx * b.r + b.r * kr, b.y + dy * b.r); c.arc(b.x + dx * b.r, b.y + dy * b.r, b.r * kr, 0, TAU); } c.fill(); };
    passa(pal.verde[0], 0, 0, 1); passa(pal.verde[1], -0.15, -0.2, 0.78); passa(pal.verde[2], -0.3, -0.38, 0.45);
  }

  // ---------- casa: parede, telhado de telha, janelas ----------
  function casa(c, p, pal, acaso) {
    const e = p.escala || 1, w = (p.largura || 300) * e, h = (p.altura || 160) * e, x = p.x, yb = p.y;
    const telha = p.telhado != null ? pal.telhados[p.telhado % pal.telhados.length] : pal.telhados[Math.floor(acaso() * pal.telhados.length)];
    const parede = pal.parede[Math.floor(acaso() * pal.parede.length)];
    // parede, com a sombra lilás do beiral
    c.fillStyle = parede; c.fillRect(x, yb - h, w, h);
    if (p.lado) { c.fillStyle = cor(parede, pal.sombra, 0.45); c.fillRect(x + w, yb - h, w * 0.18 * p.lado, h); }
    c.fillStyle = cor(parede, pal.sombra, 0.5); c.fillRect(x, yb - h, w, h * 0.13);
    // janelas
    const nj = Math.max(1, Math.round(w / (95 * e)));
    for (let i = 0; i < nj; i++) {
      if (acaso() < 0.25) continue;
      const jw = 34 * e, jh = 40 * e, jx = x + (i + 0.5) * w / nj - jw / 2, jy = yb - h * 0.62;
      c.fillStyle = '#f7f4ec'; c.fillRect(jx - 3 * e, jy - 3 * e, jw + 6 * e, jh + 6 * e);
      c.fillStyle = pal.janela; c.fillRect(jx, jy, jw, jh);
      c.fillStyle = cor(pal.janela, '#ffffff', 0.55); c.fillRect(jx, jy, jw * 0.4, jh);
      c.strokeStyle = '#f7f4ec'; c.lineWidth = 2 * e; c.beginPath(); c.moveTo(jx + jw / 2, jy); c.lineTo(jx + jw / 2, jy + jh); c.stroke();
    }
    // telhado de quatro águas visto de frente
    const th = (p.telhadoAlto || 62) * e, beiral = 16 * e;
    const T = [[x - beiral, yb - h + 4 * e], [x + w + beiral, yb - h + 4 * e], [x + w - w * 0.16, yb - h - th], [x + w * 0.16, yb - h - th]];
    caminho(c, T); c.fillStyle = telha; c.fill();
    c.save(); c.clip();
    c.fillStyle = cor(telha, '#ffffff', 0.18); c.fillRect(x - beiral, yb - h - th, w * 0.45, th); // luz da esquerda
    c.strokeStyle = cor(telha, '#1a1530', 0.3); c.lineWidth = 2 * e;
    for (let yy = yb - h - th + 9 * e; yy < yb - h; yy += 9 * e) { c.beginPath(); c.moveTo(x - beiral, yy); c.lineTo(x + w + beiral, yy); c.stroke(); }
    c.restore();
    c.fillStyle = cor(telha, '#1a1530', 0.35); c.fillRect(x - beiral, yb - h, w + beiral * 2, 6 * e);
    pincelada(c, x, yb - h, w, h, pal.sombra, Math.round(w * h / 700), acaso, { comp: 14 * e, ang: 1.5, abre: 0.2, alfa: 0.07, grossura: 2 });
  }

  // fileira de casas entre x0 e x1 (pés no y), com arbustos na frente
  function casas(c, p, pal, acaso) {
    const e = p.escala || 1;
    let x = p.x;
    while (x < p.x + p.largura) {
      const w = (190 + acaso() * 170) * e, h = (110 + acaso() * 70) * e;
      casa(c, { x, y: p.y - acaso() * 6 * e, largura: w / e, altura: h / e, escala: e, lado: 0, telhadoAlto: 45 + acaso() * 30 }, pal, acaso);
      x += w + (30 + acaso() * 90) * e;
    }
    if (p.arbustos) for (let xx = p.x; xx < p.x + p.largura; xx += (90 + acaso() * 140) * e) arbusto(c, { x: xx, y: p.y + 8 * e, raio: (30 + acaso() * 25) * e, bolhas: 5 }, pal, acaso);
  }

  // cidade vista do alto: fileiras de casas que diminuem para o fundo (perspectiva plana)
  function cidade(c, p, pal, acaso) {
    const linhas = p.linhas || 9;
    // o chão da cidade (ruas e quintais) por baixo das fileiras, para não aparecer o mar entre elas
    c.fillStyle = cor(pal.rua[1], pal.verde[1], 0.35); c.fillRect(p.x, p.yLonge - 6, p.largura, p.yPerto - p.yLonge + 200);
    pincelada(c, p.x, p.yLonge, p.largura, p.yPerto - p.yLonge, pal.verde[0], Math.round(p.largura * (p.yPerto - p.yLonge) / 900), acaso, { comp: 30, abre: 0.3, alfa: 0.12, grossura: 6 });
    for (let i = 0; i < linhas; i++) { // de trás para a frente
      const u = i / (linhas - 1), e = mistura(p.escalaLonge || 0.25, p.escalaPerto || 1.2, u * u);
      const y = mistura(p.yLonge, p.yPerto, Math.pow(u, 1.6));
      let x = p.x - acaso() * 200 * e;
      while (x < p.x + p.largura) {
        const w = (170 + acaso() * 120) * e;
        const vao = p.rua ? Math.abs(x + w / 2 - p.rua.x) < (p.rua.meia || 60) * (0.4 + u) + w / 2 : false;
        if (!vao) casa(c, { x, y, largura: w / e, altura: 70 + acaso() * 40, escala: e, telhadoAlto: 70 + acaso() * 30 }, pal, acaso);
        if (!vao && acaso() < 0.35) arbusto(c, { x: x + w + 10 * e, y: y + 4 * e, raio: 28 * e, bolhas: 4 }, pal, acaso);
        x += w + (18 + acaso() * 40) * e;
      }
    }
  }
  const mistura = (a, b, k) => a + (b - a) * k;

  // ---------- muro de blocos ----------
  function muro(c, p, pal, acaso) {
    const x0 = p.x, w = p.largura, y0 = p.y, h = p.altura || 80;
    c.fillStyle = pal.muro; c.fillRect(x0, y0, w, h);
    c.fillStyle = cor(pal.muro, '#ffffff', 0.35); c.fillRect(x0, y0, w, 8);
    c.strokeStyle = cor(pal.muro, pal.sombra, 0.4); c.lineWidth = 2;
    for (let y = y0 + 8 + 24; y < y0 + h; y += 24) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); }
    for (let r = 0, y = y0 + 8; y < y0 + h; y += 24, r++) for (let x = x0 + (r % 2) * 40; x < x0 + w; x += 80) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y + 24, y0 + h)); c.stroke(); }
    pincelada(c, x0, y0, w, h, pal.sombra, Math.round(w * h / 500), acaso, { comp: 18, abre: 0.4, alfa: 0.08 });
  }

  // ---------- rua ----------
  function rua(c, p, pal, acaso) {
    const x0 = p.x, w = p.largura, y0 = p.y, h = p.altura || 220;
    c.fillStyle = pal.rua[1]; c.fillRect(x0, y0, w, h);
    c.fillStyle = cor(pal.rua[0], pal.sombra, 0.3); c.fillRect(x0, y0, w, h * 0.28); // sombra do muro
    // manchas lilás de sombra (das árvores)
    c.fillStyle = cor(pal.sombra, pal.rua[0], 0.4, 0.55);
    for (let x = x0; x < x0 + w; x += 140 + acaso() * 260) { c.beginPath(); c.ellipse(x, y0 + h * (0.2 + acaso() * 0.4), 60 + acaso() * 120, 12 + acaso() * 14, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#f5f2ea'; c.fillRect(x0, y0 + h * 0.86, w, 5); // faixa branca da beira
    pincelada(c, x0, y0, w, h, '#ffffff', Math.round(w * h / 900), acaso, { comp: 30, abre: 0.15, alfa: 0.06 });
    pincelada(c, x0, y0, w, h, pal.sombra, Math.round(w * h / 900), acaso, { comp: 30, abre: 0.15, alfa: 0.07 });
  }

  // ---------- campo de capim parado (a base; as folhas da frente mexem no motor) ----------
  function campo(c, p, pal, acaso) {
    const x0 = p.x, w = p.largura, y0 = p.y, h = p.altura || 200;
    c.fillStyle = pal.verde[1]; c.fillRect(x0, y0, w, h);
    c.lineCap = 'round';
    for (let i = 0; i < w * h / 160; i++) {
      const x = x0 + acaso() * w, y = y0 + acaso() * h, l = 14 + acaso() * 36;
      c.strokeStyle = acaso() < 0.5 ? pal.verde[2] : pal.verde[0]; c.globalAlpha = 0.5 + acaso() * 0.5; c.lineWidth = 2 + acaso() * 2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - l * 0.5, x + 6 + acaso() * 8, y - l); c.stroke();
    }
    c.globalAlpha = 1;
  }

  // ---------- poste de luz e fios caídos ----------
  function poste(c, p, pal) {
    const e = p.escala || 1, x = p.x, yb = p.y, h = (p.altura || 520) * e, w = 16 * e;
    c.fillStyle = pal.poste; c.fillRect(x - w / 2, yb - h, w, h);
    c.fillStyle = cor(pal.poste, '#ffffff', 0.3); c.fillRect(x - w / 2, yb - h, w * 0.35, h);
    c.fillStyle = cor(pal.poste, '#000000', 0.2);
    c.fillRect(x - 46 * e, yb - h + 26 * e, 92 * e, 7 * e); c.fillRect(x - 34 * e, yb - h + 60 * e, 68 * e, 6 * e); // travessas
    for (const dx of [-40, -14, 14, 40]) { c.fillStyle = '#e9e6dc'; c.fillRect(x + dx * e - 3 * e, yb - h + 18 * e, 6 * e, 9 * e); }
    if (p.caixa) { c.fillStyle = '#9aa3a8'; c.fillRect(x + 8 * e, yb - h + 110 * e, 30 * e, 44 * e); c.fillStyle = '#6f777c'; c.fillRect(x + 8 * e, yb - h + 110 * e, 8 * e, 44 * e); }
    // faixas amarelas e pretas no pé (perto da passagem)
    if (p.faixas) for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? pal.preto : pal.amarelo; c.fillRect(x - w / 2, yb - (i + 1) * 22 * e, w, 22 * e); }
    return [x, yb - h + 22 * e];
  }
  function fios(c, pontos, p, pal) {
    const queda = p.queda ?? 40;
    c.strokeStyle = pal.fio; c.lineCap = 'round';
    for (const [dy, larg] of [[0, 2.2], [8, 1.8], [38, 2.6]]) {
      c.lineWidth = larg * (p.escala || 1);
      for (let i = 0; i + 1 < pontos.length; i++) {
        const [ax, ay] = pontos[i], [bx, by] = pontos[i + 1];
        c.beginPath(); c.moveTo(ax, ay + dy); c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + dy + queda * 2, bx, by + dy); c.stroke();
      }
    }
  }
  function postes(c, p, pal) {
    const pts = [];
    for (let x = p.x; x <= p.x + p.largura; x += p.passo || 700) pts.push(poste(c, { x, y: p.y, altura: p.altura, escala: p.escala, caixa: ((x / (p.passo || 700)) | 0) % 2 === 0 }, pal));
    fios(c, pts, p, pal);
  }

  // fios soltos (de um ponto a outro), para vistas de baixo para cima
  function fiacao(c, p, pal) { fios(c, p.pontos, p, pal); }

  // estrada em perspectiva (trapézio), com a sombra lilás de um lado
  function estrada(c, p, pal, acaso) {
    const [a, b] = p.longe, [d, e] = p.perto; // [x esquerdo, x direito] no y de longe e no de perto
    caminho(c, [[a, p.yLonge], [b, p.yLonge], [e, p.yPerto], [d, p.yPerto]]); c.fillStyle = pal.rua[1]; c.fill();
    c.save(); c.clip();
    caminho(c, [[a, p.yLonge], [mistura(a, b, 0.3), p.yLonge], [mistura(d, e, 0.3), p.yPerto], [d, p.yPerto]]); c.fillStyle = cor(pal.rua[0], pal.sombra, 0.3); c.fill();
    pincelada(c, d, p.yLonge, e - d, p.yPerto - p.yLonge, '#ffffff', 300, acaso, { comp: 20, ang: 1.5, abre: 0.3, alfa: 0.06 });
    c.restore();
    c.strokeStyle = '#f5f2ea'; c.lineWidth = 4;
    for (const [x0, x1] of [[a + 6, d + 20], [b - 6, e - 20]]) { c.beginPath(); c.moveTo(x0, p.yLonge); c.lineTo(x1, p.yPerto); c.stroke(); }
  }

  // ---------- mar: faixas de azul ----------
  function mar(c, p, pal, acaso) {
    const x0 = p.x ?? 0, w = p.largura ?? 1920, y0 = p.y, h = p.altura || 120;
    const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, pal.mar[1]); g.addColorStop(1, pal.mar[0]);
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    c.fillStyle = cor(pal.mar[2], pal.mar[1], 0.3, 0.6); c.fillRect(x0, y0, w, Math.max(2, h * 0.03));
    for (let i = 0; i < w * h / 600; i++) {
      const y = y0 + acaso() * h, l = 10 + acaso() * 40 * (y - y0) / h;
      c.fillStyle = acaso() < 0.6 ? cor(pal.mar[0], '#0a2a60', 0.3, 0.4) : cor(pal.mar[2], pal.mar[2], 0, 0.35);
      c.fillRect(x0 + acaso() * w, y, l, 1.5 + (y - y0) / h * 2);
    }
    if (p.ilha) { // um cabo de terra azulado no horizonte
      c.fillStyle = cor(pal.mar[1], pal.sombra, 0.5);
      c.beginPath(); c.moveTo(p.ilha.x, y0 + 1); c.quadraticCurveTo(p.ilha.x + p.ilha.largura * 0.3, y0 - p.ilha.altura, p.ilha.x + p.ilha.largura, y0 + 1); c.fill();
    }
  }

  // ---------- trilhos ----------
  function trilhos(c, p, pal) {
    const x0 = p.x ?? 0, w = p.largura ?? 1920, y = p.y, e = p.escala || 1;
    c.fillStyle = '#8c8577'; c.fillRect(x0, y - 18 * e, w, 40 * e); // brita
    c.fillStyle = '#6d5a4a'; for (let x = x0; x < x0 + w; x += 26 * e) c.fillRect(x, y - 12 * e, 12 * e, 30 * e); // dormentes
    c.fillStyle = '#c9cbd2'; c.fillRect(x0, y - 8 * e, w, 4 * e); c.fillRect(x0, y + 10 * e, w, 4 * e);
  }

  // ---------- sinal da passagem de nível (desenhado a cada quadro: as luzes piscam) ----------
  // acesa: -1 nenhuma, 0 esquerda, 1 direita
  function sinal(c, x, yb, e, pal, acesa, brilho = 1) {
    const h = 420 * e;
    c.fillStyle = pal.preto; c.fillRect(x - 9 * e, yb - h, 18 * e, h);
    for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? pal.amarelo : pal.preto; c.fillRect(x - 9 * e, yb - 40 * e - (i + 1) * 24 * e, 18 * e, 24 * e); }
    c.fillStyle = '#9aa3a8'; c.fillRect(x - 22 * e, yb - 120 * e, 44 * e, 70 * e); // caixinha
    c.fillStyle = '#6f777c'; c.fillRect(x - 22 * e, yb - 120 * e, 12 * e, 70 * e);
    // as duas luzes com a viseira
    for (const lado of [0, 1]) {
      const lx = x + (lado ? 52 : -52) * e, ly = yb - h + 150 * e, r = 26 * e;
      c.fillStyle = pal.preto; c.beginPath(); c.arc(lx, ly, r + 9 * e, 0, TAU); c.fill();
      c.fillStyle = pal.preto; c.fillRect(Math.min(x, lx), ly - 6 * e, Math.abs(lx - x), 12 * e);
      const liga = acesa === lado;
      c.fillStyle = liga ? cor(pal.luzSinal, '#ffffff', 0.25) : cor(pal.luzSinal, '#2a0a08', 0.65); c.beginPath(); c.arc(lx, ly, r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(lx - r * 0.35, ly - r * 0.35, r * 0.22, 0, TAU); c.fill();
      if (liga && brilho > 0) {
        const g = c.createRadialGradient(lx, ly, r * 0.5, lx, ly, r * 4.5);
        g.addColorStop(0, cor(pal.luzSinal, '#ffffff', 0.3, 0.55 * brilho)); g.addColorStop(1, cor(pal.luzSinal, pal.luzSinal, 0, 0));
        c.fillStyle = g; c.beginPath(); c.arc(lx, ly, r * 4.5, 0, TAU); c.fill();
      }
    }
    // a cruz (X) listrada, sem letra nenhuma
    c.save(); c.translate(x, yb - h + 48 * e);
    for (const a of [0.62, -0.62]) {
      c.save(); c.rotate(a);
      c.fillStyle = pal.preto; c.fillRect(-92 * e, -15 * e, 184 * e, 30 * e);
      c.fillStyle = pal.amarelo; c.fillRect(-88 * e, -11 * e, 176 * e, 22 * e);
      c.fillStyle = pal.preto; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 26 * e - 6 * e, -11 * e); c.lineTo(i * 26 * e + 6 * e, -11 * e); c.lineTo(i * 26 * e + 14 * e, 11 * e); c.lineTo(i * 26 * e + 2 * e, 11 * e); c.fill(); }
      c.restore();
    }
    c.restore();
  }

  // cancela listrada; ang = 0 deitada (fechada), ang = 90° em pé (aberta). dir = -1 aponta para a esquerda
  function cancela(c, x, y, comp, ang, e, pal, dir = -1) {
    c.save(); c.translate(x, y); c.rotate(dir * -ang);
    const h = 16 * e;
    c.fillStyle = pal.preto; c.fillRect(dir < 0 ? -comp : 0, -h / 2 - 2 * e, comp, h + 4 * e);
    for (let i = 0; i * 50 * e < comp; i++) { c.fillStyle = i % 2 ? pal.preto : pal.amarelo; c.fillRect((dir < 0 ? -comp : 0) + i * 50 * e, -h / 2, Math.min(50 * e, comp - i * 50 * e), h); }
    c.restore();
    c.fillStyle = '#9aa3a8'; c.fillRect(x - 20 * e, y - 22 * e, 40 * e, 60 * e);
  }

  window.Fundos = { pincelada, caminho, ceu, nuvem, morro, arbusto, casa, casas, cidade, muro, rua, campo, poste, postes, fios, fiacao, estrada, mar, trilhos, sinal, cancela };
})();
