// mulher.js — a personagem da arte de conceito: meio corpo, guache recortado, sem contorno.
// Cada parte é cor de base + uma sombra chapada + uma luz chapada (o sol vem de trás, à esquerda:
// borda quente no cabelo e no ombro, sombra fria à direita). Olhos grandes com cílio forte e brilho.
// Coordenadas locais: (0,0) é o centro da cabeça parada; o pescoço gira em (0,170).
// e = { cab, olhar:[gx,gy], abre, sobr, boca, sorri, vento, resp, t, atraso }
//   cab: 0 parada, 1 olhando para cima | abre: 0 fechado, 1 aberto, >1 arregalado
//   boca: 0 fechada, 1 entreaberta | sorri: 0 a 1 | vento: brisa no cabelo e no cachecol
(function () {
  'use strict';
  const { sorteio, cor } = Filme;
  const TAU = Math.PI * 2;
  const P = () => window.Pincel;

  // forma com sombra e luz chapadas por dentro (clip na própria forma)
  function bloco(c, ctrl, base, sem, sombra, luz, o = {}) {
    const p = P().forma(c, ctrl, base, sem, o);
    if (sombra || luz || o.riscos) {
      c.save(); P().caminho(c, p); c.clip();
      if (sombra) { P().caminho(c, P().recorte(sombra[0], sem + 1, 34, 1.5)); c.fillStyle = sombra[1]; c.fill(); }
      if (luz) { P().caminho(c, P().recorte(luz[0], sem + 2, 30, 1.2)); c.fillStyle = luz[1]; c.fill(); }
      if (o.riscos) for (const [caixa, n, ang, corR, alfa, op] of o.riscos) P().riscos(c, caixa, n, ang, corR, alfa, sem + 3 + n, op || {});
      c.restore();
    }
    return p;
  }

  // ---------- o olho (lado -1 = olho da esquerda da tela) ----------
  function olho(c, M, cx, cy, s, lado, e, sem) {
    const ab = Math.max(0, e.abre), w = 35 * s, hT = 23 * s * ab, hB = 15 * s * Math.min(1, ab) * (1 - 0.35 * e.sorri);
    const ini = [cx - lado * w * 0.95, cy + 3 * s], fim = [cx + lado * w, cy - 4 * s]; // canto de dentro, canto de fora
    const cima = [ini, [cx - lado * w * 0.45, cy - hT * 0.95], [cx + lado * w * 0.25, cy - hT], fim];
    const baixo = [fim, [cx + lado * w * 0.35, cy + hB * 0.9], [cx - lado * w * 0.35, cy + hB], ini];
    const linha = (pts) => P().curva(pts, false, 6);
    if (ab > 0.08) {
      const branco = linha(cima).concat(linha(baixo).slice(1));
      c.save(); P().caminho(c, branco); c.fillStyle = M.branco; c.fill(); c.clip();
      // íris: base, faixa de sombra embaixo da pálpebra, meia-lua clara, pupila e brilho
      const ix = cx + e.olhar[0] * s, iy = cy + 2 * s + e.olhar[1] * s, ri = 20 * s;
      c.fillStyle = M.olho[0]; c.beginPath(); c.arc(ix, iy, ri, 0, TAU); c.fill();
      c.fillStyle = M.olho[2]; c.beginPath(); c.arc(ix + 2 * s, iy + 6 * s, ri * 0.62, 0.15 * Math.PI, 0.95 * Math.PI); c.fill();
      c.fillStyle = M.olho[1]; c.beginPath(); c.arc(ix, iy, 8.5 * s, 0, TAU); c.fill();
      c.fillStyle = cor(M.olho[1], M.cilio, 0.6); c.fillRect(ix - ri, cy - hT - 2, ri * 2, hT * 0.55 + 8 * s);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ix - 6 * s, iy - 7 * s, 5 * s, 0, TAU); c.fill();
      c.beginPath(); c.arc(ix + 7 * s, iy + 6 * s, 2 * s, 0, TAU); c.fill();
      c.restore();
      // pálpebra de baixo: um fio quente
      c.strokeStyle = cor(M.pele[1], M.cilio, 0.2); c.lineWidth = Math.max(P().minimo, 2.2 * s); c.lineCap = 'round';
      P().caminho(c, linha(baixo).slice(1, -2), false); c.stroke();
    }
    // cílio de cima: cunha grossa que engrossa para fora e termina numa ponta virada
    const topo = linha(cima), grossa = [], fina = [];
    topo.forEach(([x, y], i) => { const u = i / (topo.length - 1), g = (2 + 7 * Math.sin(Math.PI * Math.min(1, u * 1.15))) * s * (ab > 0.08 ? 1 : 0.8); grossa.push([x, y - g]); fina.push([x, y + 1]); });
    const ponta = [fim[0] + lado * 16 * s, fim[1] - 12 * s];
    P().caminho(c, grossa.concat([ponta], fina.reverse())); c.fillStyle = M.cilio; c.fill();
  }

  function sobrancelha(c, M, cx, cy, s, lado, ergue, sem) {
    const y = cy - 46 * s - ergue * 11 * s, w = 34 * s;
    const pts = [[cx - lado * w, y + 8 * s], [cx - lado * w * 0.2, y - 6 * s], [cx + lado * w * 1.05, y + 3 * s], [cx + lado * w * 1.05, y + 7 * s], [cx - lado * w * 0.2, y + 1 * s], [cx - lado * w, y + 13 * s]];
    P().caminho(c, P().recorte(pts, sem, 14, 0.5)); c.fillStyle = M.sobrancelha; c.fill();
  }

  // ---------- a boca ----------
  function boca(c, M, e, sem) {
    const s = e.sorri, ab = e.boca * (1 - 0.55 * s), cx = 6, cy = 106;
    const w = 25 + 9 * s, canto = cy - 8 * s, meio = cy + 3 * s;
    const esq = [cx - w, canto], dir = [cx + w + 2, canto - 1];
    // lábio de cima
    const cima = [esq, [cx - w * 0.5, cy - 7], [cx - 5, cy - 9], [cx + 2, cy - 6], [cx + 9, cy - 9], [cx + w * 0.55, cy - 7], dir];
    const linhaSup = [dir, [cx + w * 0.5, meio - ab * 5], [cx, meio + 2 - ab * 6], [cx - w * 0.5, meio - ab * 5], esq];
    const linhaInf = [esq, [cx - w * 0.5, meio + ab * 6], [cx, meio + 2 + ab * 9], [cx + w * 0.5, meio + ab * 6], dir];
    const baixo = [dir, [cx + w * 0.55, cy + 13 + ab * 8], [cx, cy + 18 + ab * 10], [cx - w * 0.5, cy + 13 + ab * 8], esq];
    const cv = (p) => P().curva(p, false, 5);
    if (ab > 0.05) { P().caminho(c, cv(linhaSup).concat(cv(linhaInf).slice(1))); c.fillStyle = M.boca[2]; c.fill(); }
    P().caminho(c, cv(cima).concat(cv(linhaSup).slice(1))); c.fillStyle = M.boca[1]; c.fill();
    P().caminho(c, cv(linhaInf).concat(cv(baixo).slice(1))); c.fillStyle = M.boca[0]; c.fill();
    c.fillStyle = cor(M.boca[0], '#ffffff', 0.35); c.beginPath(); c.ellipse(cx + 4, cy + 13 + ab * 9, 8, 2.5, 0, 0, TAU); c.fill(); // brilho no lábio de baixo
    if (s > 0.2) { // covinhas do sorriso
      c.strokeStyle = cor(M.pele[1], M.pele[1], 0, 0.6 * s); c.lineWidth = Math.max(P().minimo, 2.5); c.lineCap = 'round';
      c.beginPath(); c.arc(esq[0] - 2, esq[1] + 6, 8, -2.2, -0.9); c.stroke();
      c.beginPath(); c.arc(dir[0] + 2, dir[1] + 6, 8, -2.2, -0.9, false); c.stroke();
    }
  }

  // ---------- o cabelo (corte chanel com franja de lado) ----------
  const ponta = (pts, vento, t, lado) => pts.map(([x, y], i) => {
    const k = Math.max(0, (y - 20) / 140); // só as pontas mexem
    return [x + k * vento * (16 + 8 * Math.sin(t * 5 + i)) * lado, y - k * vento * (12 + 6 * Math.sin(t * 4.3 + i * 2))];
  });

  function cabeloAtras(c, M, e, sem) {
    const ctrl = ponta([[-150, -110], [-95, -186], [0, -206], [100, -190], [155, -118], [172, -10], [180, 92], [176, 166], [150, 138], [128, 160], [104, 130], [70, 118], [-60, 118], [-108, 136], [-128, 162], [-150, 140], [-178, 168], [-182, 40]], e.vento, e.t, -1);
    bloco(c, ctrl, M.cabelo[0], sem, [[[40, -230], [240, -230], [240, 200], [60, 200], [100, 40]], M.cabelo[1]], [[[-200, -200], [-60, -230], [-140, -60], [-190, 120], [-220, 120]], M.cabelo[2]],
      { riscos: [[[-180, -210, 360, 380], 22, 80, M.cabelo[2], 0.4, { comp: 140, larg: 10 }]] });
  }

  function cabeloFrente(c, M, e, sem) {
    // franja varrida para a direita da tela, cobrindo a testa
    const franja = [[-158, -96], [-125, -172], [-35, -204], [78, -194], [150, -128], [168, -40], [150, 30], [126, -24], [104, -80], [50, -102], [-12, -88], [-70, -62], [-112, -34], [-136, 10]];
    bloco(c, ponta(franja, e.vento * 0.4, e.t, 1), M.cabelo[0], sem,
      [[[30, -110], [200, -150], [200, 60], [130, 40], [100, -70]], M.cabelo[1]],
      [[[-170, -110], [-120, -186], [-30, -214], [-70, -176], [-118, -128], [-150, -60]], M.cabelo[2]],
      { riscos: [[[-160, -210, 330, 200], 18, 30, M.cabelo[2], 0.45, { comp: 120, larg: 9, curva: 14 }]] });
    // mechas dos lados emoldurando o rosto
    const esq = ponta([[-168, -70], [-118, -50], [-112, 30], [-100, 132], [-124, 156], [-162, 122], [-178, 30]], e.vento, e.t, -1);
    bloco(c, esq, M.cabelo[0], sem + 10, [[[-120, -80], [-60, -80], [-60, 200], [-112, 200]], M.cabelo[1]], [[[-200, -80], [-160, -80], [-170, 60], [-150, 150], [-200, 150]], M.cabeloBrilho]);
    const dir = ponta([[170, -70], [124, -36], [120, 52], [112, 132], [138, 152], [168, 112], [178, 20]], e.vento, e.t, 1);
    bloco(c, dir, M.cabelo[1], sem + 20, null, [[[118, -40], [140, -40], [128, 140], [112, 140]], M.cabelo[0]]);
    // borda quente do sol no alto da cabeça, à esquerda
    c.save(); P().caminho(c, P().recorte(P().curva([[-168, -60], [-150, -130], [-90, -190], [-10, -212], [-30, -198], [-104, -172], [-150, -110], [-160, -40]], true), sem + 30, 18, 1)); c.fillStyle = M.cabeloBrilho; c.fill(); c.restore();
  }

  // fios soltos que pegam a luz (finos, nunca menores que 1 pixel)
  function fiapos(c, M, e, sem) {
    const r = sorteio(sem), larg = Math.max(P().minimo, 1.6);
    c.strokeStyle = M.cabeloBrilho; c.lineWidth = larg; c.lineCap = 'round';
    // cada fio nasce na borda do cabelo e corre JUNTO à borda, para baixo, abrindo um pouco para fora
    const angulos = [-2.75, -2.45, -2.2, -1.95, -1.25, -0.85, 3.0, 2.75, 0.25];
    angulos.forEach((th, i) => {
      const n = [Math.cos(th), Math.sin(th)], sg = n[0] < 0 ? -1 : 1, tg = [-Math.sin(th) * sg, Math.cos(th) * sg];
      const x = 170 * n[0], y = -10 + 205 * n[1], L = 60 + r() * 70, fora = 14 + r() * 22 + 18 * e.vento;
      const onda = (5 + 12 * e.vento) * Math.sin(e.t * (3 + r() * 2) + i);
      const x3 = x + tg[0] * L + n[0] * fora, y3 = y + tg[1] * L + n[1] * fora - 22 * e.vento;
      c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x + tg[0] * L * 0.35 + n[0] * fora * 1.5, y + tg[1] * L * 0.35 + n[1] * fora * 1.5 - onda,
        x3 - tg[0] * L * 0.2 + onda, y3 - tg[1] * L * 0.2, x3 + onda * 0.5, y3 + 8);
      c.stroke();
    });
  }

  // ---------- rosto ----------
  function rosto(c, M, e, sem) {
    const sobe = -13 * e.cab; // olhando para cima, olhos, nariz e boca sobem um pouco no rosto
    const face = [[-112, -95], [-122, 0], [-108, 72], [-72, 128], [-16, 162], [20, 164], [64, 140], [104, 82], [120, 0], [112, -95], [50, -146], [-45, -150]];
    const p = bloco(c, face, M.pele[0], sem,
      [[[36, -170], [76, -70], [84, 20], [58, 108], [10, 176], [220, 220], [220, -200]], M.pele[1]],
      [[[-112, -70], [-126, 0], [-112, 74], [-86, 112], [-98, 60], [-108, 0], [-100, -70]], M.pele[2]]);
    c.save(); P().caminho(c, p); c.clip();
    // sombra da franja na testa
    P().caminho(c, P().recorte([[-140, -170], [140, -170], [140, -60], [70, -48], [10, -62], [-60, -44], [-140, -30]], sem + 5, 30, 1.5)); c.fillStyle = M.pele[1]; c.fill();
    c.translate(0, sobe);
    // rubor e sardas
    c.fillStyle = cor(M.rubor, M.rubor, 0, 0.5 + 0.15 * e.sorri);
    P().caminho(c, P().recorte(P().curva([[-92, 58], [-64, 44 - 4 * e.sorri], [-34, 56], [-60, 74]], true), sem + 6, 12, 1)); c.fill();
    P().caminho(c, P().recorte(P().curva([[40, 56], [68, 44 - 4 * e.sorri], [96, 54], [70, 72]], true), sem + 7, 12, 1)); c.fill();
    const r = sorteio(sem + 8); c.fillStyle = cor(M.sarda, M.sarda, 0, 0.7);
    for (let i = 0; i < 16; i++) { const lado = i % 2 ? 1 : -1, x = lado * (22 + r() * 46) + 4, y = 34 + r() * 26; c.beginPath(); c.arc(x, y, Math.max(P().minimo, 2 + r() * 1.5), 0, TAU); c.fill(); }
    // nariz: só a sombra de um lado, a narina e um brilho na ponta
    P().caminho(c, P().recorte([[12, 10], [24, 58], [20, 72], [4, 74], [16, 60]], sem + 9, 10, 0.6)); c.fillStyle = M.pele[1]; c.fill();
    c.fillStyle = cor(M.pele[1], M.boca[2], 0.3); c.beginPath(); c.ellipse(14, 72, 5, 2.6, 0.2, 0, TAU); c.fill();
    c.fillStyle = M.pele[2]; c.beginPath(); c.ellipse(-2, 62, 6, 4, 0, 0, TAU); c.fill();
    c.restore();
    c.save(); c.translate(0, sobe);
    olho(c, M, -50, 10, 1, -1, e, sem + 11);
    olho(c, M, 52, 8, 0.92, 1, e, sem + 12);
    sobrancelha(c, M, -50, 10, 1, -1, e.sobr, sem + 13);
    sobrancelha(c, M, 52, 8, 0.92, 1, e.sobr, sem + 14);
    boca(c, M, e, sem + 15);
    c.restore();
  }

  // ---------- corpo: casaco, gola da camisa, cachecol ----------
  function corpo(c, M, e, sem) {
    const sobe = -6 * e.resp;
    c.save(); c.translate(0, sobe);
    bloco(c, [[-62, 120], [62, 120], [58, 250], [-58, 250]], M.pele[1], sem, null, [[[-62, 120], [-30, 120], [-34, 250], [-62, 250]], M.pele[0]]); // pescoço
    const casaco = [[-70, 205], [-190, 236], [-292, 302], [-334, 424], [-350, 640], [334, 640], [322, 432], [286, 306], [190, 240], [70, 205]];
    bloco(c, casaco, M.casaco[0], sem + 1,
      [[[40, 200], [130, 320], [150, 660], [420, 660], [420, 200]], M.casaco[1]],
      [[[-72, 196], [-194, 226], [-300, 292], [-344, 418], [-362, 660], [-326, 660], [-310, 430], [-274, 322], [-186, 258], [-72, 222]], M.casaco[2]],
      { riscos: [[[-360, 220, 720, 440], 40, 100, M.casaco[2], 0.3, { comp: 150, larg: 12 }], [[0, 220, 360, 440], 26, 95, M.casaco[1], 0.35, { comp: 160, larg: 12 }]] });
    bloco(c, [[-60, 206], [60, 206], [40, 300], [0, 384], [-40, 300]], M.camisa[0], sem + 2, [[[8, 200], [80, 200], [40, 320], [4, 390]], M.camisa[1]]);
    // lapelas largas: a da esquerda pega luz, a da direita fica na sombra
    bloco(c, [[-66, 208], [-146, 252], [-112, 430], [-14, 472], [-40, 332]], cor(M.casaco[0], M.casaco[2], 0.35), sem + 3, null, [[[-66, 208], [-146, 252], [-136, 270], [-62, 228]], M.casaco[2]]);
    bloco(c, [[66, 208], [146, 252], [116, 430], [16, 472], [40, 332]], M.casaco[1], sem + 4);
    c.restore();
  }

  function cachecol(c, M, e, sem) {
    const sobe = -6 * e.resp, balanca = 14 * e.vento * Math.sin(e.t * 3.2) + 26 * e.atraso;
    c.save(); c.translate(0, sobe);
    // a ponta que cai no peito (mexe com a brisa e atrasa quando a cabeça mexe)
    bloco(c, [[28, 238], [92, 246], [118 + balanca, 470], [56 + balanca * 1.2, 486], [40, 330]], M.cachecol[0], sem, [[[70, 240], [140, 240], [150 + balanca, 500], [92 + balanca, 500]], M.cachecol[1]], null,
      { riscos: [[[20, 240, 140, 260], 10, 80, M.cachecol[2], 0.45, { comp: 70, larg: 8 }]] });
    // a volta no pescoço
    bloco(c, [[-104, 186], [-30, 214], [40, 210], [104, 184], [118, 236], [40, 282], [-40, 286], [-118, 240]], M.cachecol[0], sem + 1,
      [[[30, 170], [160, 170], [160, 300], [40, 300]], M.cachecol[1]], [[[-124, 180], [-80, 190], [-90, 250], [-130, 250]], M.cachecol[2]],
      { riscos: [[[-120, 180, 240, 110], 14, 10, M.cachecol[2], 0.5, { comp: 60, larg: 7 }], [[-120, 180, 240, 110], 10, 170, M.cachecol[1], 0.4, { comp: 50, larg: 7 }]] });
    c.restore();
  }

  // ---------- a mão com o copo e o vapor ----------
  function copo(c, M, e, sem) {
    const sobe = -6 * e.resp, cx = 132, cy = 400;
    c.save(); c.translate(0, sobe);
    bloco(c, [[330, 640], [250, 600], [176, 520], [168, 474], [214, 470], [300, 520], [360, 560]], M.casaco[1], sem, null, [[[176, 470], [214, 466], [240, 500], [190, 520]], M.casaco[0]]); // manga
    c.translate(cx, cy);
    bloco(c, [[-36, -56], [36, -56], [29, 62], [-29, 62]], M.copo[0], sem + 1, [[[12, -70], [50, -70], [40, 70], [8, 70]], M.copo[1]], null, { reta: true, passo: 40, tremor: 0.5 });
    bloco(c, [[-35, -18], [35, -18], [32, 24], [-32, 24]], M.copo[2], sem + 2, [[[14, -30], [50, -30], [40, 30], [10, 30]], M.copo[3]], null, { reta: true, passo: 40, tremor: 0.5 });
    bloco(c, [[-42, -74], [42, -74], [40, -56], [-40, -56]], M.copo[0], sem + 3, [[[14, -80], [50, -80], [50, -50], [16, -50]], M.copo[1]], null, { reta: true, passo: 40, tremor: 0.5 });
    // a mão: dedos dobrados em volta do copo
    bloco(c, [[-48, 10], [-8, -4], [24, 6], [38, 30], [30, 58], [-10, 66], [-50, 50]], M.pele[0], sem + 4, [[[0, 30], [50, 20], [40, 70], [0, 70]], M.pele[1]], [[[-50, 6], [-20, 0], [-30, 20], [-52, 26]], M.pele[2]]);
    c.strokeStyle = M.pele[1]; c.lineWidth = Math.max(P().minimo, 2.4); c.lineCap = 'round';
    for (const y of [22, 36, 50]) { c.beginPath(); c.moveTo(-6, y); c.lineTo(24, y + 2); c.stroke(); }
    // vapor: três fios que sobem ondulando (troca de 3 em 3 quadros, pelo t que chega)
    c.lineWidth = Math.max(P().minimo, 3);
    for (let i = 0; i < 3; i++) {
      const x0 = -14 + i * 14, fase = e.t * 2.2 + i * 2.1;
      c.strokeStyle = cor(M.vapor, M.vapor, 0, 0.55 - i * 0.1);
      c.beginPath();
      for (let k = 0; k <= 18; k++) {
        const u = k / 18, y = -80 - u * (150 + 20 * i), x = x0 + Math.sin(fase - u * 5) * (6 + 22 * u) - u * 24 * e.vento;
        k ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    c.restore();
  }

  // desenha a personagem inteira em coordenadas locais
  function desenha(c, M, e) {
    const sem = 500;
    const ang = (-9 * e.cab) * Math.PI / 180, sobe = -14 * e.cab;
    const cabeca = (f) => { c.save(); c.translate(0, sobe); c.translate(0, 170); c.rotate(ang); c.translate(0, -170); f(); c.restore(); };
    cabeca(() => cabeloAtras(c, M, e, sem));
    corpo(c, M, e, sem + 100);
    cabeca(() => { rosto(c, M, e, sem + 200); cabeloFrente(c, M, e, sem + 300); fiapos(c, M, e, sem + 400); });
    cachecol(c, M, e, sem + 600);
    copo(c, M, e, sem + 700);
  }

  window.Mulher = { desenha };
})();
