// menina.js — a personagem e a bicicleta, desenhadas como acetato (cel) de anime:
// contorno fino marrom-escuro de grossura um pouco irregular, cor base chapada, UM tom de sombra
// de borda dura e um brilho pequeno. Cabelo, laço, gola e saia são formas separadas, que continuam
// o movimento depois que o corpo para.
// Três vistas: de lado na bicicleta, de costas, de frente (o close dos olhos é a vista de frente
// com a câmera bem perto). As cores vêm do historia.json; a pose vem do motor.
(function () {
  'use strict';
  const { cor, limita } = Filme;
  const TAU = Math.PI * 2, mix = (a, b, k) => a + (b - a) * k;
  let LINHA = '#4a2e25', ESP = 2.6, SEM = 1;

  // grossura do traço levemente irregular (cada peça tem a sua, sempre a mesma)
  const esp = (id) => ESP * (0.82 + 0.36 * ((Math.sin(id * 12.9898 + SEM) * 43758.5453) % 1 + 1) % 1);
  // peça de acetato: base chapada, sombra e brilho recortados dentro dela, contorno por cima
  function peca(c, forma, base, o = {}) {
    c.beginPath(); forma(c); c.fillStyle = base; c.fill();
    if (o.sombra || o.luz) {
      c.save(); c.clip();
      if (o.sombra) { c.beginPath(); o.sombra(c); c.fillStyle = o.corSombra; c.fill(); }
      if (o.luz) { c.beginPath(); o.luz(c); c.fillStyle = o.corLuz; c.fill(); }
      c.restore();
    }
    if (o.linha !== false) { c.beginPath(); forma(c); c.strokeStyle = LINHA; c.lineWidth = o.esp || esp(o.id || 1); c.lineJoin = 'round'; c.stroke(); }
  }
  const poli = (pts) => (c) => { pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  // mecha de cabelo afinando: raiz (a), meio (m), ponta (p), grossura na raiz
  function mecha(c, ax, ay, mx, my, px, py, larg) {
    const dx = mx - ax, dy = my - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * larg, ny = dx / l * larg;
    c.moveTo(ax + nx, ay + ny); c.quadraticCurveTo(mx + nx * 0.7, my + ny * 0.7, px, py); c.quadraticCurveTo(mx - nx * 0.7, my - ny * 0.7, ax - nx, ay - ny); c.closePath();
  }
  // osso duplo (coxa+canela, braço+antebraço): onde fica a junta do meio
  function junta(ax, ay, bx, by, l1, l2, lado) {
    const dx = bx - ax, dy = by - ay, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5);
    const a = Math.atan2(dy, dx), k = limita((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const g = a + lado * Math.acos(k);
    return [ax + l1 * Math.cos(g), ay + l1 * Math.sin(g)];
  }
  // membro: traço grosso com contorno (o contorno é um traço mais largo por baixo)
  function membro(c, pts, larg, tinta, id) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = LINHA; c.lineWidth = larg + 2 * esp(id); c.stroke();
    c.strokeStyle = tinta; c.lineWidth = larg; c.stroke();
  }
  const rot = (x, y, a, ox = 0, oy = 0) => [ox + x * Math.cos(a) - y * Math.sin(a), oy + x * Math.sin(a) + y * Math.cos(a)];
  function tons(P) {
    LINHA = P.linha || LINHA; SEM = P.semente || 1;
    return {
      pele: P.pele, peleS: P.peleSombra, cab: P.cabelo, cabS: P.cabeloSombra, cabL: P.cabeloLuz,
      blusa: P.blusa, blusaS: P.blusaSombra, gola: P.gola, golaS: P.golaSombra, saia: P.saia, saiaS: P.saiaSombra,
      laco: P.laco, lacoS: cor(P.laco, '#5a0a10', 0.35), meia: P.meia, sapato: P.sapato, olho: P.olho, rubor: P.rubor,
    };
  }

  // =====================================================================================
  // DE LADO, NA BICICLETA (olhando para a direita). Origem: eixo da roda de trás. Chão em y = 70.
  // q = { t, dist (px andados: gira a roda), rapido (0 a 1), cabelo (-1 voando para trás, 0 caído,
  //       1 jogado para a frente), inclina (rad), pe (0 no pedal, 1 no chão), vento (0 a 1), olho (0 a 1) }
  // =====================================================================================
  function lado(c, P, B, q) {
    const T = tons(P); ESP = 2.4;
    const R = 70, FA = [232, 0], BB = [100, 6], ST = [74, -118], HT = [200, -116], HB = [210, -74];
    const quadro = B.quadro, quadroS = cor(B.quadro, '#6a4a00', 0.35);
    const t = q.t, V = q.vento ?? 0;
    const HIP = [72, -140];
    const inc = 0.36 + (q.inclina || 0);
    const tr = (x, y) => rot(x, y, inc, HIP[0], HIP[1]);
    const pedal = [[BB[0] + 28, BB[1] + 4], [BB[0] - 28, BB[1] - 4]];
    const peNoChao = [124, 66];

    // ---- perna de trás (mais escura) ----
    {
      const pe = pedal[1], k = junta(HIP[0], HIP[1], pe[0], pe[1], 72, 74, -1);
      membro(c, [HIP, k, pe], 22, cor(T.pele, T.peleS, 0.7), 3);
      membro(c, [[mix(k[0], pe[0], 0.55), mix(k[1], pe[1], 0.55)], pe], 20, cor(T.meia, '#9aa0bc', 0.6), 4);
      c.save(); c.translate(pe[0], pe[1]); peca(c, poli([[-12, -8], [22, -6], [24, 6], [-12, 6]]), cor(T.sapato, '#000000', 0.3), { id: 5 }); c.restore();
    }
    // ---- rodas ----
    for (const [cx, cy] of [[0, 0], FA]) {
      c.save(); c.translate(cx, cy);
      c.lineWidth = 11; c.strokeStyle = LINHA; c.beginPath(); c.arc(0, 0, R - 4, 0, TAU); c.stroke();
      c.lineWidth = 7; c.strokeStyle = B.pneu; c.stroke();
      c.lineWidth = 2.2; c.strokeStyle = B.aro; c.beginPath(); c.arc(0, 0, R - 12, 0, TAU); c.stroke();
      const giro = (q.dist || 0) / R, rap = q.rapido ?? 0;
      c.globalAlpha = 1 - 0.65 * rap; c.lineWidth = 1.3;
      for (let i = 0; i < 16; i++) { const a = giro + i * TAU / 16; c.beginPath(); c.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); c.lineTo(Math.cos(a) * (R - 12), Math.sin(a) * (R - 12)); c.stroke(); }
      if (rap > 0.05) { c.globalAlpha = 0.35 * rap; c.strokeStyle = B.aro; for (let j = 0; j < 3; j++) { c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 18 + j * 15, giro + j, giro + j + 1.4); c.stroke(); } }
      c.globalAlpha = 1;
      c.fillStyle = B.aro; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill(); c.strokeStyle = LINHA; c.lineWidth = 1.6; c.stroke();
      // para-lama
      c.lineWidth = 9; c.strokeStyle = LINHA; c.beginPath(); c.arc(0, 0, R + 6, -2.9, -0.25); c.stroke();
      c.lineWidth = 6; c.strokeStyle = quadro; c.stroke();
      c.restore();
    }
    // ---- quadro (de moça, com o tubo baixo) ----
    membro(c, [[0, 0], BB], 9, quadroS, 6);
    membro(c, [[0, 0], [ST[0] + 2, ST[1] + 16]], 8, quadroS, 7);
    membro(c, [BB, ST], 11, quadro, 8);
    c.lineCap = 'round';
    for (const [w, tinta] of [[12 + 2 * ESP, LINHA], [12, quadro]]) { c.lineWidth = w; c.strokeStyle = tinta; c.beginPath(); c.moveTo(BB[0], BB[1]); c.quadraticCurveTo(150, -20, HB[0], HB[1]); c.stroke(); }
    membro(c, [HT, HB, FA], 10, quadro, 9);
    membro(c, [HT, [194, -146], [172, -148]], 7, '#b9b9c0', 10); // guidão
    peca(c, poli([[80, -10], [128, -6], [124, 18], [78, 12]]), quadroS, { id: 11 }); // capa da corrente
    peca(c, (c) => c.ellipse(ST[0] - 2, ST[1] - 8, 24, 7, -0.08, 0, TAU), '#5a3d2e', { id: 12 }); // selim
    // cesta na frente do guidão
    {
      const cesta = poli([[208, -150], [276, -152], [266, -100], [214, -98]]);
      peca(c, cesta, B.cesta, { id: 13, sombra: poli([[208, -122], [276, -122], [266, -98], [214, -98]]), corSombra: cor(B.cesta, '#5a3010', 0.3) });
      c.save(); c.beginPath(); cesta(c); c.clip(); c.strokeStyle = cor(B.cesta, '#5a3010', 0.45); c.lineWidth = 1.5;
      for (let x = 200; x < 290; x += 9) { c.beginPath(); c.moveTo(x, -155); c.lineTo(x - 6, -95); c.stroke(); }
      for (let y = -146; y < -96; y += 9) { c.beginPath(); c.moveTo(200, y); c.lineTo(290, y); c.stroke(); }
      c.restore();
    }

    // ---- perna da frente ----
    const peAlvo = [mix(pedal[0][0], peNoChao[0], q.pe || 0), mix(pedal[0][1], peNoChao[1], q.pe || 0)];
    const joelho = junta(HIP[0], HIP[1], peAlvo[0], peAlvo[1], 72, 74, -1);
    membro(c, [HIP, joelho, peAlvo], 24, T.pele, 14);
    membro(c, [[mix(joelho[0], peAlvo[0], 0.55), mix(joelho[1], peAlvo[1], 0.55)], peAlvo], 21, T.meia, 15);
    c.save(); c.translate(peAlvo[0], peAlvo[1]); peca(c, poli([[-12, -9], [22, -7], [25, 6], [-12, 6]]), T.sapato, { id: 16 }); c.restore();

    // ---- tronco (blusa branca) ----
    const tronco = poli([tr(-18, -6), tr(20, -6), tr(26, -64), tr(20, -96), tr(6, -110), tr(-14, -102), tr(-24, -60)]);
    peca(c, tronco, T.blusa, { id: 17, sombra: poli([tr(4, -2), tr(30, -2), tr(30, -60), tr(10, -50)]), corSombra: T.blusaS });
    // saia pregueada (o vento levanta a barra de trás)
    {
      const tremor = Math.sin(t * 15) * 5 * V, hemF = [joelho[0] - 8, joelho[1] + 18];
      const hemT = [HIP[0] - 30 - 22 * V + tremor, HIP[1] + 34 - 14 * V];
      const saia = poli([tr(-20, -8), tr(20, -8), hemF, [mix(hemT[0], hemF[0], 0.5), mix(hemT[1], hemF[1], 0.5) + 6], hemT]);
      peca(c, saia, T.saia, { id: 18, sombra: poli([[mix(hemT[0], hemF[0], 0.45), HIP[1] - 30], hemF, [mix(hemT[0], hemF[0], 0.5), mix(hemT[1], hemF[1], 0.5) + 6]]), corSombra: T.saiaS });
      c.strokeStyle = T.saiaS; c.lineWidth = 2;
      for (let i = 1; i < 4; i++) { const k = i / 4; const w = tr(mix(-20, 20, k), -8), h = [mix(hemT[0], hemF[0], k), mix(hemT[1], hemF[1], k) + 6 * Math.sin(Math.PI * k)]; c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(h[0], h[1]); c.stroke(); }
    }
    // gola de marinheiro nas costas (levanta com o vento)
    {
      const levanta = (0.25 + 0.25 * Math.sin(t * 13)) * V + 0.05;
      const raiz = tr(-4, -106), g = (x, y) => rot(x, y, inc - levanta, raiz[0], raiz[1]);
      const gola = poli([g(0, 0), g(-20, 4), g(-26, 40), g(4, 36)]);
      peca(c, gola, T.gola, { id: 19, sombra: poli([g(-6, 22), g(-26, 22), g(-26, 40), g(4, 36)]), corSombra: T.golaS });
      c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.beginPath(); const [a1, a2, a3] = [g(-16, 6), g(-21, 33), g(0, 30)]; c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]); c.lineTo(a3[0], a3[1]); c.stroke();
      // lenço da gola na frente
      const lf = tr(18, -92);
      peca(c, poli([lf, [lf[0] + 14, lf[1] + 10 + 4 * Math.sin(t * 11) * V], [lf[0] + 2, lf[1] + 22]]), T.laco, { id: 20 });
    }

    // ---- cabeça ----
    const pesc = tr(4, -112), HC = [pesc[0] + 14, pesc[1] - 40], hr = inc * 0.25 - 0.12, r = 42;
    const cabDir = (q.cabelo ?? 0) < 0 ? mix(1.75, 3.2, -(q.cabelo)) : mix(1.75, 0.95, q.cabelo); // ângulo para onde o cabelo vai
    // massa de cabelo atrás (une as mechas) e mechas compridas por cima
    { const bx = HC[0] - r * 0.55, by = HC[1] + 6, cmp = 120; c.beginPath(); mecha(c, bx, by, bx + Math.cos(cabDir) * cmp * 0.5, by + Math.sin(cabDir) * cmp * 0.5 + 8, bx + Math.cos(cabDir) * cmp, by + Math.sin(cabDir) * cmp, 34); c.fillStyle = T.cabS; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(29); c.stroke(); }
    for (let i = 0; i < 8; i++) {
      const a0 = 2.9 + i * 0.13 - (q.cabelo > 0 ? 0.9 * q.cabelo : 0), rx = HC[0] + Math.cos(a0 + hr) * r * 0.9, ry = HC[1] + Math.sin(a0 + hr) * r * 0.9;
      const comp = 150 + 22 * Math.sin(i * 2.1) + (i % 3) * 12, dir = cabDir + (i - 3.5) * 0.045 + 0.06 * Math.sin(t * 9 + i * 0.8) * (0.3 + V);
      const onda = (6 + 14 * V) * Math.sin(t * 10.5 - i * 0.9), nx = -Math.sin(dir), ny = Math.cos(dir);
      const px = rx + Math.cos(dir) * comp + nx * onda * 0.6, py = ry + Math.sin(dir) * comp + ny * onda * 0.6;
      const mx = rx + Math.cos(dir) * comp * 0.5 + nx * (onda + 10), my = ry + Math.sin(dir) * comp * 0.5 + ny * (onda + 10);
      c.beginPath(); mecha(c, rx, ry, mx, my, px, py, 21 - i * 0.8); c.fillStyle = i % 2 ? T.cab : T.cabS; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(30 + i); c.stroke();
    }
    // pescoço
    membro(c, [pesc, [HC[0] - 4, HC[1] + 22]], 18, T.peleS, 21);
    c.save(); c.translate(HC[0], HC[1]); c.rotate(hr);
    // rosto de perfil
    const rosto = (c) => { c.moveTo(-6, 38); c.lineTo(22, 41); c.quadraticCurveTo(34, 38, 38, 27); c.lineTo(41, 20); c.lineTo(44, 14); c.quadraticCurveTo(51, 9, 48, 4); c.quadraticCurveTo(42, -4, 42, -10); c.quadraticCurveTo(42, -20, 38, -26); c.arc(0, 0, r, -0.6, 1.73, true); c.closePath(); };
    peca(c, rosto, T.pele, { id: 22, sombra: (c) => { c.rect(-r, 18, 2 * r, 40); }, corSombra: T.peleS });
    c.fillStyle = cor(T.rubor, T.rubor, 0, 0.55); c.beginPath(); c.ellipse(27, 15, 9, 4, 0, 0, TAU); c.fill();
    // olho de perfil
    if ((q.olho ?? 1) > 0.15) {
      const ab = q.olho ?? 1;
      c.save(); c.beginPath(); c.ellipse(29, 2, 6.5, 12 * ab, 0.08, 0, TAU); c.fillStyle = T.olho[0]; c.fill();
      c.clip(); c.fillStyle = T.olho[1]; c.fillRect(20, 4, 20, 14); c.restore();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(27, -3 * ab, 2.6, 0, TAU); c.fill();
      c.strokeStyle = LINHA; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(17, -10 * ab); c.quadraticCurveTo(28, -15 * ab, 37, -10 * ab); c.lineTo(40, -6 * ab); c.stroke();
    } else { c.strokeStyle = LINHA; c.lineWidth = 3.4; c.beginPath(); c.moveTo(18, 3); c.quadraticCurveTo(28, 8, 37, 2); c.stroke(); }
    c.strokeStyle = LINHA; c.lineWidth = 1.8; c.beginPath(); c.moveTo(35, 25); c.lineTo(41, 25); c.stroke(); // boca
    // cabelo de cima e franja
    const capa = (c) => { c.moveTo(40, -24); c.quadraticCurveTo(30, -50, 0, -47); c.arc(0, 0, r + 5, -1.6, 2.2, true); c.lineTo(-2, 22); c.lineTo(8, -6); c.lineTo(14, -22); c.lineTo(20, -2); c.lineTo(26, -24); c.lineTo(33, -6); c.lineTo(36, -24); c.lineTo(44, -12); c.closePath(); };
    peca(c, capa, T.cab, { id: 23, sombra: (c) => { c.rect(-r - 8, 4, 2 * r + 16, 40); }, corSombra: T.cabS, luz: (c) => { c.ellipse(4, -30, 20, 5, -0.15, 0, TAU); }, corLuz: T.cabL });
    // mecha da frente (perto da orelha), segue o cabelo
    { const d = cabDir < 1.75 ? cabDir : mix(1.75, cabDir, 0.35); c.beginPath(); mecha(c, 4, -8, 4 + Math.cos(d) * 30, -8 + Math.sin(d) * 30 + 6, 4 + Math.cos(d) * 62, -8 + Math.sin(d) * 62, 8); c.fillStyle = T.cab; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(24); c.stroke(); }
    // laço vermelho atrás da cabeça, com as pontas no vento
    {
      const lx = -28, ly = -30, d = cabDir;
      for (let j = 0; j < 2; j++) {
        const comp = 50 + j * 12, dd = d + (j ? 0.2 : -0.1) + 0.12 * Math.sin(t * 13 + j * 2) * (0.3 + V);
        c.beginPath(); mecha(c, lx, ly, lx + Math.cos(dd) * comp * 0.5, ly + Math.sin(dd) * comp * 0.5 + 6 * Math.sin(t * 12 + j), lx + Math.cos(dd) * comp, ly + Math.sin(dd) * comp, 7);
        c.fillStyle = j ? T.lacoS : T.laco; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(40 + j); c.stroke();
      }
      peca(c, (c) => c.ellipse(lx - 4, ly - 14, 10, 16, -0.6, 0, TAU), T.laco, { id: 42 });
      peca(c, (c) => c.ellipse(lx + 10, ly - 12, 9, 14, 0.5, 0, TAU), T.lacoS, { id: 43 });
      peca(c, (c) => c.arc(lx + 2, ly - 4, 6, 0, TAU), T.laco, { id: 44 });
    }
    c.restore();

    // ---- braço da frente ----
    const omb = tr(4, -94), mao = [174, -150];
    const cot = junta(omb[0], omb[1], mao[0], mao[1], 60, 58, 1);
    membro(c, [omb, cot, mao], 15, T.pele, 25);
    peca(c, (c) => c.ellipse(mix(omb[0], cot[0], 0.3), mix(omb[1], cot[1], 0.3), 16, 13, Math.atan2(cot[1] - omb[1], cot[0] - omb[0]), 0, TAU), T.blusa, { id: 26 });
    peca(c, (c) => c.arc(mao[0] + 2, mao[1] + 2, 9, 0, TAU), T.pele, { id: 27 });
  }

  // =====================================================================================
  // DE COSTAS, NA BICICLETA. Origem: alto do selim. A cabeça fica em y ≈ -540.
  // q = { t, vento (0 a 1: força do vento do trem), lado (-1: o vento leva para a esquerda) }
  // =====================================================================================
  function costas(c, P, B, q) {
    const T = tons(P); ESP = 3.2;
    const t = q.t, V = q.vento ?? 0, s = q.lado ?? -1, ond = (f, ph) => Math.sin(t * f + ph);
    // roda de trás e para-lama (embaixo, no meio)
    peca(c, poli([[-22, 60], [22, 60], [26, 420], [-26, 420]]), B.pneu, { id: 50 });
    peca(c, poli([[-30, 40], [30, 40], [34, 400], [-34, 400]]), B.quadro, { id: 51, sombra: poli([[6, 40], [30, 40], [34, 400], [10, 400]]), corSombra: cor(B.quadro, '#6a4a00', 0.35) });
    peca(c, (c) => c.rect(-14, 130, 28, 22), '#d8322a', { id: 52 }); // refletor
    // guidão (atrás do corpo; só as pontas aparecem)
    membro(c, [[-350, -150], [-255, -78], [255, -78], [350, -150]], 23, '#456783', 53);
    for (const x of [-350, 350]) peca(c, (c) => c.ellipse(x, -150, 22, 14, 0, 0, TAU), '#4a4040', { id: 54 });
    // pernas
    for (const lado of [-1, 1]) membro(c, [[lado * 60, 20], [lado * 92, 220], [lado * 80, 420]], 46, T.pele, 55 + lado);
    for (const lado of [-1, 1]) membro(c, [[lado * 90, 250], [lado * 80, 420]], 44, T.meia, 57 + lado);
    peca(c, (c) => c.ellipse(0, 20, 70, 26, 0, 0, TAU), '#5a3d2e', { id: 59 }); // selim
    // cabelo de trás da cabeça, que vai por baixo de tudo (as pontas voam)
    const cabelo = (frente) => {
      for (let i = 0; i < 11; i++) {
        const u = (i - 5) / 5, rx = u * 105, ry = -500 + Math.abs(u) * 40;
        const comp = 330 + 40 * Math.cos(i * 1.7), leva = V * (0.8 + 0.2 * ond(9, i));
        const ang = Math.PI / 2 + u * 0.18 - s * leva * (1.05 - 0.05 * u * s);
        const onda = (8 + 30 * V) * ond(11, -i * 0.7);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const px = rx + Math.cos(ang) * comp + nx * onda, py = ry + Math.sin(ang) * comp + ny * onda - leva * 60;
        const mx = rx + Math.cos(ang) * comp * 0.45 + nx * onda * 0.5 + s * leva * 30, my = ry + Math.sin(ang) * comp * 0.45 + ny * onda * 0.5;
        if (frente !== (i % 2 === 0)) continue;
        c.beginPath(); mecha(c, rx, ry, mx, my, px, py, 44); c.fillStyle = frente ? T.cab : T.cabS; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(60 + i); c.stroke();
      }
    };
    cabelo(false);
    { // massa de cabelo da nuca até o meio das costas, empurrada pelo vento
      const d = s * V * 130, bal = 10 * ond(9, 0.4) * (0.3 + V);
      peca(c, (c) => { c.moveTo(-120, -560); c.bezierCurveTo(-130, -420, -150 + d, -320, -140 + d * 1.6 + bal, -200); c.lineTo(-60 + d * 1.3, -230); c.lineTo(0 + d * 1.2 + bal, -190); c.lineTo(60 + d * 1.1, -230); c.lineTo(135 + d * 0.9 + bal, -200); c.bezierCurveTo(150 + d * 0.5, -320, 130, -420, 120, -560); c.closePath(); }, T.cabS, { id: 78 });
    }
    // saia pregueada
    {
      const bate = (k) => (8 + 22 * V) * ond(14, k * 3) * (k === 0 || k === 1 ? 0.3 : 1);
      const saia = poli([[-118, -130], [118, -130], [196 + s * -20 * V, 40 + bate(2)], [60, 58 + bate(3)], [-60, 58 + bate(4)], [-196 + s * 30 * V, 40 + bate(5)]]);
      peca(c, saia, T.saia, { id: 61, sombra: poli([[20, -130], [118, -130], [196, 40], [80, 58]]), corSombra: T.saiaS });
      c.strokeStyle = T.saiaS; c.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 32, -128); c.lineTo(i * 58, 50 + bate(i + 3) * 0.5); c.stroke(); }
    }
    // tronco (blusa)
    peca(c, poli([[-118, -130], [118, -130], [150, -420], [-150, -420]]), T.blusa, { id: 62, sombra: poli([[40, -130], [118, -130], [150, -420], [90, -420]]), corSombra: T.blusaS });
    // braços até o guidão
    for (const lado of [-1, 1]) {
      const omb = [lado * 140, -390], mao = [lado * 330, -165], cot = junta(omb[0], omb[1], mao[0], mao[1], 150, 150, -lado);
      membro(c, [omb, cot, mao], 54, lado > 0 ? T.peleS : T.pele, 63 + lado);
      peca(c, poli([[lado * 120, -425], [lado * 175, -410], [lado * 205, -330], [lado * 140, -315]]), T.blusa, { id: 66 + lado, sombra: lado > 0 ? poli([[lado * 150, -425], [lado * 175, -410], [lado * 205, -330], [lado * 160, -320]]) : null, corSombra: T.blusaS });
      peca(c, (c) => c.ellipse(mao[0], mao[1] + 4, 24, 20, 0, 0, TAU), T.pele, { id: 68 + lado });
    }
    // gola de marinheiro (quadrado nas costas, levanta no vento)
    {
      const lev = V * (40 + 20 * ond(13, 0)), lev2 = V * (30 + 25 * ond(13, 1.3));
      const g = [[-150, -420], [150, -420], [140 + s * lev2 * 0.4, -250 - (s > 0 ? lev : lev2)], [-140 + s * lev * 0.4, -250 - (s > 0 ? lev2 : lev)]];
      peca(c, poli(g), T.gola, { id: 70, sombra: poli([[-150, -420], [150, -420], [146, -380], [-146, -380]]), corSombra: T.golaS });
      c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.beginPath();
      const ins = (p, k) => [mix(p[0], 0, k * 0.1), mix(p[1], -420, k * 0.12)];
      const [a, b] = [ins(g[3], 1), ins(g[2], 1)]; c.moveTo(-128, -410); c.lineTo(a[0] + 14, a[1] - 14); c.lineTo(b[0] - 14, b[1] - 14); c.lineTo(128, -410); c.stroke();
    }
    membro(c, [[0, -420], [0, -460]], 70, T.peleS, 71); // nuca
    // cabeça (só cabelo, por trás)
    peca(c, (c) => c.ellipse(0, -545, 118, 128, 0, 0, TAU), T.cab, { id: 72, luz: (c) => { c.ellipse(-30, -610, 60, 14, -0.25, 0, TAU); }, corLuz: T.cabL });
    cabelo(true);
    // laço no alto da cabeça
    {
      const lx = 0, ly = -600;
      for (let j = 0; j < 2; j++) {
        const comp = 120 + j * 20, dd = Math.PI / 2 + 0.25 * (j ? 1 : -1) - s * V * (1.0 + 0.2 * ond(15, j * 2)) + 0.1 * ond(12, j);
        c.beginPath(); mecha(c, lx + (j ? 12 : -12), ly + 10, lx + Math.cos(dd) * comp * 0.5, ly + Math.sin(dd) * comp * 0.5 + 10 * ond(13, j), lx + Math.cos(dd) * comp, ly + Math.sin(dd) * comp, 16);
        c.fillStyle = j ? T.lacoS : T.laco; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(73 + j); c.stroke();
      }
      peca(c, (c) => c.ellipse(lx - 46, ly - 6, 46, 26, 0.25 + 0.15 * V * ond(16, 0), 0, TAU), T.laco, { id: 75, sombra: (c) => c.rect(lx - 100, ly + 4, 100, 40), corSombra: T.lacoS });
      peca(c, (c) => c.ellipse(lx + 46, ly - 6, 46, 26, -0.25 - 0.15 * V * ond(16, 1), 0, TAU), T.laco, { id: 76, sombra: (c) => c.rect(lx, ly + 4, 100, 40), corSombra: T.lacoS });
      peca(c, (c) => c.ellipse(lx, ly, 16, 20, 0, 0, TAU), T.lacoS, { id: 77 });
    }
  }

  // =====================================================================================
  // DE FRENTE (busto). Origem: entre os olhos. Queixo em y ≈ 185.
  // q = { t, olhar [gx, gy], abre (pálpebra: 0 fechada, 1 aberta, 1,2 arregalada), aperta (0 a 1: aperta os olhos),
  //       boca (0 fechada a 1 sorriso aberto), mar (0 a 1: o mar refletido no olho), vento (0 a 1), cabeca (rad) }
  // =====================================================================================
  function frente(c, P, q) {
    const T = tons(P); ESP = 2.8;
    const t = q.t, V = q.vento ?? 0.3, ond = (f, ph) => Math.sin(t * f + ph);
    // cabelo de trás (massa comprida atrás dos ombros)
    peca(c, poli([[-200, -150], [200, -150], [250 + 14 * ond(5, 1) * V, 470], [-250 + 14 * ond(5, 0) * V, 470]]), T.cabS, { id: 80 });
    // pescoço e ombros, blusa e gola
    peca(c, poli([[-52, 120], [52, 120], [58, 270], [-58, 270]]), T.pele, { id: 81, sombra: poli([[-60, 120], [60, 120], [60, 215], [-60, 190]]), corSombra: T.peleS });
    peca(c, poli([[-70, 255], [70, 255], [300, 330], [330, 520], [-330, 520], [-300, 330]]), T.blusa, { id: 82, sombra: poli([[120, 290], [300, 330], [330, 520], [180, 520]]), corSombra: T.blusaS });
    const golaE = poli([[-70, 252], [-300, 326], [-320, 430], [-150, 445], [0, 400]]), golaD = poli([[70, 252], [300, 326], [320, 430], [150, 445], [0, 400]]);
    peca(c, golaE, T.gola, { id: 83, sombra: poli([[-320, 400], [-150, 420], [-150, 445], [-320, 440]]), corSombra: T.golaS });
    peca(c, golaD, T.gola, { id: 84, sombra: poli([[70, 252], [300, 326], [320, 430], [200, 440]]), corSombra: T.golaS });
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 80, 275); c.lineTo(sx * 280, 340); c.lineTo(sx * 295, 418); c.lineTo(sx * 150, 428); c.stroke(); }
    peca(c, poli([[-30, 395], [30, 395], [48, 470 + 8 * ond(9, 0) * V], [0, 440], [-48, 470 + 8 * ond(9, 1) * V]]), T.laco, { id: 85 }); // lenço
    // cabeça
    c.save(); c.rotate(q.cabeca || 0);
    const rosto = poli([[-150, -80], [-148, 40], [-110, 120], [-40, 178], [0, 186], [40, 178], [110, 120], [148, 40], [150, -80], [130, -160], [0, -200], [-130, -160]]);
    peca(c, rosto, T.pele, { id: 86, sombra: poli([[90, -80], [150, -80], [148, 40], [110, 120], [60, 160], [95, 60]]), corSombra: T.peleS });
    // rubor riscado
    for (const sx of [-1, 1]) {
      c.fillStyle = cor(T.rubor, T.rubor, 0, 0.45); c.beginPath(); c.ellipse(sx * 98, 62, 34, 15, 0, 0, TAU); c.fill();
      c.strokeStyle = cor(T.rubor, '#a03030', 0.4, 0.8); c.lineWidth = 2.4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(sx * 98 + i * 14 - 5, 70); c.lineTo(sx * 98 + i * 14 + 5, 54); c.stroke(); }
    }
    // olhos
    const [gx, gy] = q.olhar || [0, 0], abre = q.abre ?? 1, aperta = q.aperta || 0;
    for (const sx of [-1, 1]) {
      // cada olho é desenhado do lado direito e espelhado: o canto de fora fica em +x
      c.save(); c.translate(sx * 74, 0); c.scale(sx, 1);
      const ey = 6, topo = ey - 44 * abre + 18 * aperta, baixo = ey + 40 - 10 * aperta, ergue = abre > 1 ? 10 : 0;
      const palpebra = (c) => { c.moveTo(-42, ey - 2); c.quadraticCurveTo(-2, topo - 24, 44, topo + 4); };
      if (abre > 0.08 && topo < baixo - 4) {
        c.save();
        c.beginPath(); palpebra(c); c.lineTo(42, baixo - 10); c.quadraticCurveTo(4, baixo + 6, -40, baixo - 6); c.closePath();
        c.fillStyle = '#fbfaf6'; c.fill(); c.clip();
        // íris em dois tons, pupila, e o mar refletido
        const ix = gx * sx, iy = ey + gy + 4;
        c.fillStyle = T.olho[0]; c.beginPath(); c.ellipse(ix, iy, 30, 40, 0, 0, TAU); c.fill();
        c.fillStyle = T.olho[1]; c.beginPath(); c.ellipse(ix, iy + 14, 26, 24, 0, 0, TAU); c.fill();
        if ((q.mar || 0) > 0) {
          const m = q.mar;
          c.save(); c.beginPath(); c.ellipse(ix, iy, 30, 40, 0, 0, TAU); c.clip();
          c.globalAlpha = m; c.fillStyle = P.ceuNoOlho || '#9fd2f6'; c.fillRect(ix - 32, iy - 42, 64, 46);
          c.fillStyle = T.olho[1]; c.fillRect(ix - 32, iy + 4, 64, 40);
          c.fillStyle = '#ffffff'; c.fillRect(ix - 32, iy + 2, 64, 3);
          for (let k = 0; k < 7; k++) { const bx = ix - 24 + k * 8, by = iy + 10 + (k % 3) * 6, a = 0.5 + 0.5 * Math.sin(t * 20 + k * 2.1); c.globalAlpha = m * a; c.fillRect(bx, by, 5, 2); }
          c.restore();
        }
        c.fillStyle = cor(T.olho[0], '#000000', 0.55); c.beginPath(); c.ellipse(ix, iy - 2, 12, 17, 0, 0, TAU); c.fill();
        c.fillStyle = cor(T.olho[0], '#000000', 0.4, 0.55); c.beginPath(); palpebra(c); c.lineTo(44, topo + 24); c.quadraticCurveTo(-6, topo + 2, -42, ey + 20); c.closePath(); c.fill(); // sombra da pálpebra
        c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(ix + 10, iy - 16, 9, 11, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(ix - 12, iy + 18, 4.5, 0, TAU); c.fill();
        c.restore();
        // cílios de cima (traço grosso com ponta para fora) e linha de baixo
        c.strokeStyle = LINHA; c.lineCap = 'round'; c.lineWidth = 8;
        c.beginPath(); palpebra(c); c.lineTo(58, topo + 2); c.stroke();
        c.lineWidth = 2.6; c.beginPath(); c.moveTo(-26, baixo - 4); c.quadraticCurveTo(10, baixo + 4, 40, baixo - 10); c.stroke();
      } else {
        c.strokeStyle = LINHA; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-42, ey + 10); c.quadraticCurveTo(0, ey + 24, 42, ey + 8); c.lineTo(54, ey + 2); c.stroke();
      }
      // sobrancelha fina (sobe quando ela arregala os olhos)
      c.strokeStyle = cor(T.cab, LINHA, 0.4); c.lineWidth = 2.6; c.beginPath(); c.moveTo(-34, ey - 76 + aperta * 12 - ergue); c.quadraticCurveTo(4, ey - 88 + aperta * 10 - ergue * 1.2, 40, ey - 76 + aperta * 6 - ergue); c.stroke();
      c.restore();
    }
    // nariz e boca
    c.strokeStyle = cor(T.peleS, LINHA, 0.5); c.lineWidth = 2.6; c.beginPath(); c.moveTo(6, 74); c.lineTo(0, 86); c.stroke();
    const b = q.boca || 0;
    if (b < 0.15) { c.strokeStyle = LINHA; c.lineWidth = 3; c.beginPath(); c.moveTo(-18, 128); c.quadraticCurveTo(0, 132 + 6 * b, 18, 128); c.stroke(); }
    else {
      const w = 22 + 14 * b, h = 10 + 26 * b;
      peca(c, (c) => { c.moveTo(-w, 122); c.quadraticCurveTo(0, 128, w, 122); c.quadraticCurveTo(w * 0.6, 122 + h, 0, 124 + h); c.quadraticCurveTo(-w * 0.6, 122 + h, -w, 122); c.closePath(); }, '#9a2f3a', { id: 87, sombra: (c) => c.ellipse(0, 124 + h, w * 0.6, h * 0.5, 0, 0, TAU), corSombra: '#e98a8a' });
    }
    // franja e mechas da frente (por cima da testa e do rosto)
    const franja = poli([[-168, -110], [-150, -190], [-60, -230], [60, -230], [150, -190], [168, -110], [150, -40],
      [128, -110], [108, -30], [80, -120], [52, -50], [26, -126], [0, -60], [-30, -130], [-58, -46], [-86, -120], [-112, -34], [-130, -110], [-152, -40]]);
    peca(c, (c) => c.ellipse(0, -150, 200, 150, 0, Math.PI, TAU), T.cab, { id: 88 });
    peca(c, franja, T.cab, { id: 89, sombra: poli([[-170, -100], [170, -100], [170, -20], [-170, -20]]), corSombra: T.cabS, luz: (c) => { c.ellipse(-30, -190, 120, 16, -0.05, 0, TAU); }, corLuz: T.cabL });
    // mechas laterais compridas, na frente dos ombros
    for (const sx of [-1, 1]) {
      const bal = (6 + 16 * V) * ond(4.2, sx);
      c.beginPath(); mecha(c, sx * 160, -120, sx * 190 + bal * 0.5, 120, sx * 175 + bal, 360, 34); c.fillStyle = T.cab; c.fill(); c.strokeStyle = LINHA; c.lineWidth = esp(90 + sx); c.stroke();
    }
    // laço do lado da cabeça
    {
      const lx = -170, ly = -170, b2 = (4 + 10 * V) * ond(7, 0.5);
      peca(c, (c) => c.ellipse(lx - 10, ly - 46 + b2 * 0.4, 26, 50, -0.3, 0, TAU), T.laco, { id: 91, sombra: (c) => c.rect(lx - 50, ly - 30, 30, 60), corSombra: T.lacoS });
      peca(c, (c) => { c.moveTo(lx - 6, ly + 4); c.quadraticCurveTo(lx - 40 + b2, ly + 90, lx - 30 + b2 * 1.4, ly + 170); c.lineTo(lx - 6 + b2, ly + 150); c.quadraticCurveTo(lx - 10, ly + 80, lx + 10, ly + 6); c.closePath(); }, T.laco, { id: 92 });
      peca(c, (c) => c.ellipse(lx, ly, 16, 18, 0, 0, TAU), T.lacoS, { id: 93 });
    }
    c.restore();
  }

  window.Menina = { lado, costas, frente, peca, mecha, membro };
})();
