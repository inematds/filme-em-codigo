// pinturas.js — os cenários pintados em "guache e aquarela": céu em degradê com sol baixo, nuvens
// cúmulo grandes e fofas acesas por luz dourada, serras azuladas de longe, campos de capim em
// pinceladas, bosques de bolhas em três tons, interiores (parede com janela, mesa, objetos).
// Cada pintor recebe (c, peça, sorteio) e desenha em medidas de 1080x1920 (o motor cuida da escala).
// Nada aqui sabe da história: o que vai em cada pintura, e onde, vem do historia.json.
// O motor pinta cada camada UMA vez ao montar; no filme só move as camadas (paralaxe).
(function () {
  'use strict';
  const { cor, limita, ruido } = Filme;
  const TAU = Math.PI * 2;
  const escalaDe = (c) => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };

  // cor num degradê de paradas [[0,'#..'],[0.5,'#..'],[1,'#..']] (k de 0 a 1) — devolve '#rrggbb'
  function corEm(paradas, k) {
    k = limita(k);
    for (let i = 1; i < paradas.length; i++) {
      const [ka, ca] = paradas[i - 1], [kb, cb] = paradas[i];
      if (k <= kb) return Filme.hex(ca, cb, (k - ka) / Math.max(1e-6, kb - ka));
    }
    return paradas[paradas.length - 1][1];
  }
  const degrade = (c, y0, y1, paradas) => { const g = c.createLinearGradient(0, y0, 0, y1); paradas.forEach(([k, cr]) => g.addColorStop(k, cr)); return g; };
  const caminho = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };

  // ---------- pincel: pinceladas curtas de guache (a tinta pode depender do lugar) ----------
  // tinta: '#cor' | ['#a','#b'] (sorteia) | (x, y) => '#cor'
  function manchas(c, x, y, w, h, tinta, n, ac, o = {}) {
    const comp = o.comp || 24, ang = o.ang ?? 0, abre = o.abre ?? 0.4, alfa = o.alfa ?? 0.12, gr = o.grossura || 6;
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = x + ac() * w, py = y + ac() * h, a = ang + (ac() - 0.5) * abre, l = comp * (0.5 + ac());
      const tt = typeof tinta === 'function' ? tinta(px, py) : Array.isArray(tinta) ? tinta[Math.floor(ac() * tinta.length)] : tinta;
      c.globalAlpha = alfa * (0.5 + ac()); c.strokeStyle = tt; c.lineWidth = gr * (0.5 + ac());
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke();
    }
    c.globalAlpha = 1;
  }

  // ---------- céu: degradê de cima para o horizonte, sol baixo com halo, pinceladas largas ----------
  function ceu(c, p, ac) {
    const y0 = p.y0 ?? 0, y1 = p.y1 ?? 1920, x0 = p.x0 ?? -300, w = p.largura ?? 1680;
    c.fillStyle = degrade(c, y0, y1, p.cores); c.fillRect(x0, y0, w, y1 - y0);
    if (p.sol) {
      const s = p.sol, r = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      r.addColorStop(0, cor(s.cor, s.cor, 0, 0.95)); r.addColorStop(0.12, cor(s.cor, s.cor, 0, 0.6)); r.addColorStop(0.45, cor(s.cor, s.cor, 0, 0.18)); r.addColorStop(1, cor(s.cor, s.cor, 0, 0));
      c.fillStyle = r; c.fillRect(x0, y0, w, y1 - y0);
    }
    manchas(c, x0, y0, w, y1 - y0, (x, y) => corEm(p.cores, (y - y0) / (y1 - y0)), Math.round(w * (y1 - y0) / 1800), ac, { comp: 80, abre: 0.12, alfa: 0.18, grossura: 18 });
  }

  // ---------- nuvem cúmulo: bolhas em três tons, a luz vem de um lado (luz = [dx, dy]) ----------
  function nuvem(c, p, ac) {
    const e = p.escala || 1, W = (p.largura || 600) * e, H = (p.altura || 380) * e, x0 = p.x, y0 = p.y; // (x, y) = meio da base
    const [lx, ly] = p.luz || [0.3, -0.35];
    const bolhas = [], n = Math.round(12 + 14 * (p.largura || 600) / 600);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), perfil = Math.pow(Math.max(0, 1 - Math.pow(2 * u - 1, 2)), p.torre ? 0.5 : 0.9);
      const r = (50 + ac() * 65) * e * (0.55 + 0.55 * perfil);
      bolhas.push({ x: (u - 0.5) * W, y: -H * perfil * (0.7 + 0.3 * ac()) + r * 0.6, r });
      if (perfil > 0.3) bolhas.push({ x: (u - 0.5) * W * 0.8 + (ac() - 0.5) * 40 * e, y: -H * perfil * (0.35 + 0.3 * ac()), r: r * 1.1 });
    }
    // folha própria: o véu e as pinceladas não podem cair no céu
    const destino = c, s = escalaDe(c), BX = 0.5; // BX: quanto a folha desce abaixo da base
    const folha = document.createElement('canvas'); folha.width = Math.ceil(2 * W * s); folha.height = Math.ceil((2.3 + BX) * H * s);
    c = folha.getContext('2d'); c.setTransform(s, 0, 0, s, W * s, 2.3 * H * s);
    c.save();
    const macio = (p.macio ?? 4) * e;
    const tons = p.tons; // [sombra, meio, luz, brilho]
    const desloc = [[0, 0, 1], [lx * 0.18, ly * 0.18, 0.9], [lx * 0.42, ly * 0.42, 0.66], [lx * 0.66, ly * 0.66, 0.3]];
    tons.forEach((tinta, k) => {
      c.filter = `blur(${macio * (k === 0 ? 1.6 : k === 3 ? 1.4 : 1) * s}px)`; // borda úmida: a sombra mais macia
      c.globalAlpha = k === 3 ? 0.6 : 1;
      c.fillStyle = tinta; c.beginPath();
      for (const b of bolhas) {
        if (k === 3 && ac() < 0.6) continue; // o brilho forte só pega em algumas bolhas
        const [dx, dy, kr] = desloc[k];
        c.moveTo(b.x + dx * b.r + b.r * kr, b.y + dy * b.r); c.arc(b.x + dx * b.r, b.y + dy * b.r, b.r * kr, 0, TAU);
      }
      c.fill();
    });
    c.filter = 'none'; c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(0, -H * 0.5, 0, H * 0.1); g.addColorStop(0, cor(tons[0], tons[0], 0, 0)); g.addColorStop(1, cor(tons[0], tons[0], 0, 0.55));
    c.fillStyle = g; c.fillRect(-W, -H * 0.5, W * 2, H * 0.9);
    manchas(c, -W / 2, -H * 1.1, W, H * 1.1, tons[2], Math.round(W * H / 2200), ac, { comp: 40 * e, ang: -0.4, abre: 1.0, alfa: 0.08, grossura: 10 * e });
    manchas(c, -W / 2, -H * 0.6, W, H * 0.7, tons[1], Math.round(W * H / 3000), ac, { comp: 40 * e, ang: 0.1, abre: 0.8, alfa: 0.08, grossura: 10 * e });
    // a base some em degradê (nada de corte reto)
    c.globalCompositeOperation = 'destination-out';
    const gb = c.createLinearGradient(0, -H * 0.12, 0, H * 0.18); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = gb; c.fillRect(-W, -H * 0.12, W * 2, H * (BX + 0.12));
    c.restore(); c.globalCompositeOperation = 'source-over';
    destino.globalAlpha = p.alfa ?? 1;
    destino.drawImage(folha, x0 - W, y0 - 2.3 * H, 2 * W, (2.3 + BX) * H);
    destino.globalAlpha = 1;
  }

  // ---------- serra ao longe: crista recortada, azul de longe, faces acesas do lado do sol ----------
  function serra(c, p, ac) {
    const x0 = p.x0 ?? -300, x1 = p.x1 ?? 1380, yb = p.y, alt = p.altura || 200, sem = p.semente || 3;
    const topo = (x) => yb - alt * (0.35 + 0.65 * Math.pow(1 - Math.abs(ruido(x / (p.largo || 260), sem)), 1.6) * (0.6 + 0.4 * ruido(x / 700, sem + 4)));
    const pts = [];
    for (let x = x0; x <= x1; x += 10) pts.push([x, topo(x) + ruido(x / 18, sem + 9) * 4]);
    pts.push([x1, yb + (p.pe ?? 160)], [x0, yb + (p.pe ?? 160)]);
    c.save(); caminho(c, pts);
    c.fillStyle = degrade(c, yb - alt, yb + (p.pe ?? 160), [[0, p.cor], [1, p.nevoa || p.cor]]); c.fill();
    c.clip();
    // faces acesas: pinceladas inclinadas na cor da luz, mais fortes no alto
    manchas(c, x0, yb - alt, x1 - x0, alt * 0.8, p.luz || p.cor, Math.round((x1 - x0) * alt / 260), ac, { comp: 40, ang: p.angLuz ?? 2.1, abre: 0.4, alfa: 0.22, grossura: 9 });
    manchas(c, x0, yb - alt * 0.6, x1 - x0, alt * 0.6 + 80, p.sombra || p.cor, Math.round((x1 - x0) * alt / 500), ac, { comp: 36, ang: 1.1, abre: 0.5, alfa: 0.14, grossura: 8 });
    if (p.neve) manchas(c, x0, yb - alt, x1 - x0, alt * 0.25, p.neve, Math.round((x1 - x0) * alt / 900), ac, { comp: 22, ang: 2.2, abre: 0.4, alfa: 0.4, grossura: 6 });
    c.restore();
  }

  // ---------- campo: chão com morros (perfil), degradê e capim em pinceladas ----------
  function perfil(p) {
    return (x) => {
      let y = p.y + ruido(x / 90, p.semente || 2) * (p.ondula ?? 8);
      for (const [cx, alt, larg] of p.morros || []) y -= alt * Math.exp(-Math.pow((x - cx) / larg, 2));
      return y;
    };
  }
  function campo(c, p, ac) {
    const x0 = p.x0 ?? -300, x1 = p.x1 ?? 1380, yb = p.yb ?? 1940, topo = perfil(p);
    const pts = []; for (let x = x0; x <= x1; x += 8) pts.push([x, topo(x)]);
    pts.push([x1, yb], [x0, yb]);
    let ymin = Infinity; for (const [, y] of pts) ymin = Math.min(ymin, y);
    c.save(); caminho(c, pts);
    c.fillStyle = degrade(c, ymin, yb, p.cores); c.fill(); c.clip();
    const area = (x1 - x0) * (yb - ymin), base = (x, y) => corEm(p.cores, (y - ymin) / (yb - ymin));
    // massas de cor (manchas largas na cor do lugar, um pouco mais clara ou escura)
    manchas(c, x0, ymin, x1 - x0, yb - ymin, base, Math.round(area / 1400), ac, { comp: 60, ang: 0, abre: 0.3, alfa: 0.35, grossura: 22 });
    // capim: riscos curtos para cima, maiores perto (embaixo)
    const n = Math.round(area / (p.densidade || 140));
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = x0 + ac() * (x1 - x0), y = ymin + ac() * (yb - ymin);
      if (y < topo(x) + 2) continue;
      const perto = limita((y - ymin) / (yb - ymin)), l = (6 + ac() * 10) * (0.5 + 2.2 * perto) * (p.capim ?? 1);
      c.globalAlpha = 0.35 + ac() * 0.5; c.strokeStyle = p.tons[Math.floor(ac() * p.tons.length)]; c.lineWidth = (1.2 + ac() * 2.2) * (0.6 + perto);
      const inclina = (ac() - 0.4) * l * 0.5;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + inclina * 0.3, y - l * 0.6, x + inclina, y - l); c.stroke();
    }
    // a borda de cima pega a luz dourada
    if (p.luz) {
      c.globalAlpha = 1;
      for (let x = x0; x < x1; x += 4 + ac() * 6) {
        const y = topo(x); c.globalAlpha = 0.25 + ac() * 0.45; c.strokeStyle = p.luz; c.lineWidth = 2 + ac() * 3;
        c.beginPath(); c.moveTo(x, y + 2 + ac() * 6); c.lineTo(x + (ac() - 0.5) * 6, y - 4 - ac() * 10); c.stroke();
      }
    }
    c.globalAlpha = 1; c.restore();
  }

  // ---------- bosque: copas de bolhas em três tons (sombra, meio, luz), luz de um lado ----------
  function copa(c, x, y, r, tons, luz, ac, nb = 7) {
    const [lx, ly] = luz;
    const bol = Array.from({ length: nb }, () => ({ x: x + (ac() - 0.5) * r * 1.7, y: y - ac() * r * 0.9, r: r * (0.42 + ac() * 0.42) }));
    const passa = (tinta, k, kr) => { c.fillStyle = tinta; c.beginPath(); for (const b of bol) { const bx = b.x + lx * k * b.r, by = b.y + ly * k * b.r; c.moveTo(bx + b.r * kr, by); c.arc(bx, by, b.r * kr, 0, TAU); } c.fill(); };
    passa(tons[0], 0, 1); passa(tons[1], 0.22, 0.78); if (tons[2]) passa(tons[2], 0.42, 0.45);
  }
  function bosque(c, p, ac) {
    const luz = p.luz || [0.4, -0.4];
    for (const it of p.itens || []) {
      const [x, y, r] = it;
      if (p.tronco) { c.fillStyle = p.tronco; c.fillRect(x - r * 0.08, y - r * 0.2, r * 0.16, r * 0.9); }
      copa(c, x, y, r, p.tons, luz, ac);
    }
    if (p.fileira) { // fileira de copas ao longo de uma linha (mata ao longe)
      const [xa, ya, xb, yb, r] = p.fileira;
      for (let x = xa; x <= xb; x += r * (0.7 + ac() * 0.6)) { const y = ya + (yb - ya) * (x - xa) / (xb - xa); copa(c, x, y + ac() * r * 0.3, r * (0.7 + ac() * 0.5), p.tons, luz, ac, 5); }
    }
  }

  // ---------- formas soltas para interiores e objetos ----------
  // retângulo pintado com degradê (cores de cima para baixo) e pinceladas
  function placa(c, p, ac) {
    const { x, y, w, h } = p, r = p.raio || 0;
    c.save(); c.beginPath();
    if (r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); } else c.rect(x, y, w, h);
    if (p.vao) for (const [vx, vy, vw, vh] of p.vao) c.rect(vx + vw, vy, -vw, vh); // buraco (janela) em sentido contrário
    c.fillStyle = degrade(c, y, y + h, p.cores); c.fill('evenodd'); c.clip('evenodd');
    manchas(c, x, y, w, h, (px, py) => corEm(p.cores, (py - y) / h), Math.round(w * h / (p.densidade || 900)), ac, { comp: p.comp || 40, ang: p.ang ?? 0, abre: 0.25, alfa: 0.3, grossura: p.grossura || 10 });
    if (p.veios) manchas(c, x, y, w, h, p.veios, Math.round(w * h / 1800), ac, { comp: 90, ang: p.ang ?? 0, abre: 0.05, alfa: 0.25, grossura: 3 });
    c.restore();
  }
  function poligono(c, p, ac) {
    let ya = Infinity, yb = -Infinity, xa = Infinity, xb = -Infinity;
    for (const [x, y] of p.pts) { ya = Math.min(ya, y); yb = Math.max(yb, y); xa = Math.min(xa, x); xb = Math.max(xb, x); }
    c.save(); caminho(c, p.pts);
    c.fillStyle = p.cores ? degrade(c, ya, yb, p.cores) : p.cor; c.fill(); c.clip();
    const base = p.cores ? (px, py) => corEm(p.cores, (py - ya) / (yb - ya)) : p.cor;
    manchas(c, xa, ya, xb - xa, yb - ya, base, Math.round((xb - xa) * (yb - ya) / (p.densidade || 900)), ac, { comp: p.comp || 40, ang: p.ang ?? 0, abre: 0.25, alfa: 0.3, grossura: p.grossura || 10 });
    if (p.veios) manchas(c, xa, ya, xb - xa, yb - ya, p.veios, Math.round((xb - xa) * (yb - ya) / 1600), ac, { comp: 110, ang: p.ang ?? 0, abre: 0.04, alfa: 0.3, grossura: 3 });
    c.restore();
    if (p.borda) { caminho(c, p.pts); c.strokeStyle = p.borda; c.lineWidth = p.bordaW || 3; c.lineJoin = 'round'; c.stroke(); }
  }
  function elipse(c, p) {
    c.beginPath(); c.ellipse(p.x, p.y, p.rx, p.ry, p.giro || 0, 0, TAU);
    if (p.cores) { const g = c.createLinearGradient(p.x - p.rx, p.y - p.ry, p.x + p.rx, p.y + p.ry); p.cores.forEach(([k, cr]) => g.addColorStop(k, cr)); c.fillStyle = g; } else c.fillStyle = p.cor;
    c.globalAlpha = p.alfa ?? 1; c.fill(); c.globalAlpha = 1;
    if (p.borda) { c.strokeStyle = p.borda; c.lineWidth = p.bordaW || 3; c.stroke(); }
  }
  // linha pintada (galho, haste, moldura fina)
  function traco(c, p) {
    c.strokeStyle = p.cor; c.lineWidth = p.w || 6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); p.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
  // luz: halo macio somado (lâmpada, sol entrando, brilho do DNA)
  function luz(c, p) {
    const r = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    r.addColorStop(0, cor(p.cor, p.cor, 0, p.alfa ?? 0.6)); r.addColorStop(0.35, cor(p.cor, p.cor, 0, (p.alfa ?? 0.6) * 0.35)); r.addColorStop(1, cor(p.cor, p.cor, 0, 0));
    c.save(); c.globalCompositeOperation = p.soma === false ? 'source-over' : 'lighter';
    if (p.ry) { c.translate(p.x, p.y); c.scale(1, p.ry / p.r); c.translate(-p.x, -p.y); }
    c.fillStyle = r; c.fillRect(p.x - p.r, p.y - p.r, 2 * p.r, 2 * p.r); c.restore();
  }
  // faixa de névoa / luz dourada no horizonte
  function neblina(c, p) {
    const g = c.createLinearGradient(0, p.y0, 0, p.y1), m = p.meio ?? 0.5;
    g.addColorStop(0, cor(p.cor, p.cor, 0, 0)); g.addColorStop(m, cor(p.cor, p.cor, 0, p.alfa ?? 0.5)); g.addColorStop(1, cor(p.cor, p.cor, 0, 0));
    c.fillStyle = g; c.fillRect(p.x0 ?? -300, p.y0, p.largura ?? 1680, p.y1 - p.y0);
  }

  // ---------- coluna de cavaleiros ao longe (estandartes e poeira) ----------
  function cavaleiros(c, p, ac) {
    const [xa, ya, xb, yb] = p.linha, n = p.n || 30;
    // poeira atrás
    for (let i = 0; i < n * 2; i++) {
      const u = ac(), x = xa + (xb - xa) * u, y = ya + (yb - ya) * u, e = (p.e0 + (p.e1 - p.e0) * u);
      luz(c, { x: x + (ac() - 0.5) * 60 * e, y: y - 18 * e, r: 70 * e * (0.6 + ac()), cor: p.poeira, alfa: 0.35, soma: false });
    }
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), e = p.e0 + (p.e1 - p.e0) * u, x = xa + (xb - xa) * u + (ac() - 0.5) * 18 * e, y = ya + (yb - ya) * u + (ac() - 0.5) * 6 * e;
      c.fillStyle = p.cor; c.strokeStyle = p.cor; c.lineCap = 'round';
      c.beginPath(); c.ellipse(x, y - 22 * e, 22 * e, 10 * e, 0, 0, TAU); c.fill(); // cavalo
      c.lineWidth = 4 * e; c.beginPath(); c.moveTo(x - 14 * e, y - 16 * e); c.lineTo(x - 17 * e, y); c.moveTo(x + 14 * e, y - 16 * e); c.lineTo(x + 18 * e, y); c.moveTo(x + 18 * e, y - 28 * e); c.lineTo(x + 30 * e, y - 40 * e); c.stroke();
      c.beginPath(); c.ellipse(x + 31 * e, y - 40 * e, 7 * e, 4 * e, -0.5, 0, TAU); c.fill(); // cabeça
      c.beginPath(); c.ellipse(x, y - 40 * e, 7 * e, 13 * e, 0, 0, TAU); c.fill(); // cavaleiro
      c.beginPath(); c.arc(x, y - 56 * e, 5.5 * e, 0, TAU); c.fill();
      if (p.luz) { c.fillStyle = p.luz; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(x + 4 * e, y - 42 * e, 3 * e, 10 * e, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
      if (i % (p.estandarte || 4) === 0) {
        c.lineWidth = 2 * e; c.beginPath(); c.moveTo(x - 4 * e, y - 40 * e); c.lineTo(x - 6 * e, y - 100 * e); c.stroke();
        c.fillStyle = p.bandeira; c.beginPath(); c.moveTo(x - 6 * e, y - 100 * e); c.quadraticCurveTo(x - 24 * e, y - 96 * e, x - 34 * e, y - 90 * e); c.lineTo(x - 6 * e, y - 82 * e); c.closePath(); c.fill();
      }
    }
  }

  // ---------- árvore gigante: tronco com raízes, galhos grossos e copas que cobrem o céu ----------
  function arvoreGigante(c, p, ac) {
    const { x, y } = p, h = p.altura || 900, w = p.largura || 160, tons = p.tons;
    // galhos (antes do tronco, para o tronco cobrir a junta)
    for (const g of p.galhos || []) {
      const [gx, gy, cx, cy, gw] = g;
      c.strokeStyle = p.casca[0]; c.lineCap = 'round'; c.lineWidth = gw;
      c.beginPath(); c.moveTo(x + (gx - x) * 0.1, gy + 60); c.quadraticCurveTo(cx, cy + 40, gx, gy); c.stroke();
      c.strokeStyle = p.casca[1]; c.lineWidth = gw * 0.35; c.globalAlpha = 0.7;
      c.beginPath(); c.moveTo(x + (gx - x) * 0.1 + gw * 0.2, gy + 60); c.quadraticCurveTo(cx + gw * 0.2, cy + 40, gx + gw * 0.15, gy); c.stroke(); c.globalAlpha = 1;
    }
    // tronco que abre em raízes
    const pts = [[x - w / 2, y - h], [x - w * 0.55, y - h * 0.5], [x - w * 0.75, y - 80], [x - w * 1.6, y + 10], [x - w * 0.4, y - 10], [x, y + 20],
      [x + w * 0.45, y - 10], [x + w * 1.7, y + 15], [x + w * 0.8, y - 80], [x + w * 0.55, y - h * 0.5], [x + w / 2, y - h]];
    poligono(c, { pts, cores: [[0, p.casca[0]], [1, p.casca[2] || p.casca[0]]], veios: [p.casca[1], p.casca[2] || p.casca[0]], ang: Math.PI / 2, densidade: 500, grossura: 8 }, ac);
    // lado aceso do tronco
    c.save(); caminho(c, pts); c.clip();
    manchas(c, x + w * 0.1, y - h, w * 0.6, h, p.casca[1], Math.round(h / 4), ac, { comp: 60, ang: Math.PI / 2, abre: 0.1, alfa: 0.35, grossura: 6 });
    c.restore();
    // copas (bolhas grandes), da de trás para a da frente
    for (const [cx, cy, r] of p.copas || []) copa(c, cx, cy, r, tons, p.luz || [0.45, -0.3], ac, 9);
    // pinceladas de luz sobre as copas
    for (const [cx, cy, r] of p.copas || []) manchas(c, cx - r * 0.2, cy - r, r, r, tons[3] || tons[2], Math.round(r / 5), ac, { comp: r * 0.12, ang: -0.6, abre: 1.4, alfa: 0.35, grossura: r * 0.05 });
  }

  window.Pinturas = { corEm, manchas, ceu, nuvem, serra, campo, bosque, placa, poligono, elipse, traco, luz, neblina, cavaleiros, arvoreGigante, perfil };
})();
