// moca.js — a personagem do retrato ilustrado: meio corpo, de três quartos para a direita da tela.
// Ilustração limpa: contorno fino marrom, cor chapada, UMA sombra chapada (o sol vem da direita:
// a sombra fica do lado esquerdo do pescoço, do braço e embaixo do queixo) e um brilho quente.
// O desenho é o mesmo em todo quadro; só as peças pequenas mexem, como numa marionete de imagem:
// pontas do cabelo (brisa), brincos (pêndulo), peito (respiração), pálpebras, íris, sobrancelhas
// e os cantos da boca. Coordenadas locais: (0,0) é o centro da cabeça; o rosto tem ~220 de altura.
// e = { t, brisa, pisca (0 aberto, 1 fechado), olhar (-1 esquerda, 1 direita), sobr, sorri,
//       resp, brinco: [ângulo perto, ângulo longe] }
(function () {
  'use strict';
  const { sorteio, cor, limita } = Filme;
  const TAU = Math.PI * 2, mix = (a, b, k) => a + (b - a) * k;
  let PX = 1, LINHA = '#5a2a1e', CB = 1.3, LX = 1.12;
  // PX = pixels da tela por unidade local (muda com o zoom); CB = o corpo é maior que a cabeça; LX = a cabeça é esticada em x

  // ---------- traço que nunca fica menor que 1 pixel ----------
  // grossura pedida em px de tela (com teto suave no close); abaixo de 1 px, segura 1 px e baixa o alfa
  function traco(c, px, corT, alfa = 1) {
    const g = px * Math.pow(Math.max(PX, 0.01), 0.55);   // no close, engrossa menos que o zoom
    const tela = Math.max(1, g);
    c.lineWidth = tela / PX; c.strokeStyle = corT;
    c.globalAlpha = alfa * Math.min(1, g);
  }
  const solta = (c) => { c.globalAlpha = 1; };

  // ---------- curva lisa que passa pelos pontos (Catmull-Rom) ----------
  function curva(c, pts, fechada) {
    const n = pts.length;
    const P = (i) => (fechada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    c.moveTo(pts[0][0], pts[0][1]);
    const fim = fechada ? n : n - 1;
    for (let i = 0; i < fim; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (fechada) c.closePath();
  }
  // peça chapada: base, sombra e luz recortadas dentro, contorno por cima
  function peca(c, pts, base, o = {}) {
    c.beginPath(); curva(c, pts, true); c.fillStyle = base; c.fill();
    if (o.sombra || o.luz || o.dentro) {
      c.save(); c.beginPath(); curva(c, pts, true); c.clip();
      if (o.sombra) { c.beginPath(); curva(c, o.sombra[0], true); c.fillStyle = o.sombra[1]; c.fill(); }
      if (o.luz) { c.beginPath(); curva(c, o.luz[0], true); c.fillStyle = o.luz[1]; c.fill(); }
      if (o.dentro) o.dentro();
      c.restore();
    }
    if (o.linha !== false) { c.beginPath(); curva(c, pts, true); traco(c, o.grossura ?? 1.1, o.corLinha || LINHA, o.alfaLinha ?? 1); c.lineJoin = 'round'; c.stroke(); solta(c); }
  }
  function risco(c, pts, px, corT, alfa = 1) {
    c.beginPath(); curva(c, pts, false); traco(c, px, corT, alfa); c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); solta(c);
  }

  // fita de largura fixa (em unidades do desenho) com contorno fino dos dois lados
  function faixa(c, pts, larg, corF) {
    c.beginPath(); curva(c, pts, false); c.lineCap = 'round';
    traco(c, 1.1, LINHA, 1); c.lineWidth += larg; c.stroke(); solta(c);
    c.beginPath(); curva(c, pts, false); c.lineWidth = larg; c.strokeStyle = corF; c.stroke();
  }

  // ---------- brisa: nada na raiz, quase tudo na ponta; a onda corre de cima para baixo ----------
  function brisa(e, x, y, raiz = 30, alcance = 420) {
    const k = Math.pow(limita((y - raiz) / alcance, 0, 1), 1.3), t = e.t;
    const onda = Math.sin(t * 2.3 - y * 0.012 + x * 0.004) + 0.45 * Math.sin(t * 3.9 - y * 0.021 + 1.3);
    return [x - k * e.brisa * (10 + 9 * onda), y - k * e.brisa * 3 * (1 + onda)];
  }
  const sopra = (e, pts, raiz, alcance) => pts.map(([x, y]) => brisa(e, x, y, raiz, alcance));
  // ponto do cabelo comprido: abaixo do pescoço, acompanha o corpo maior (a cabeça já está esticada em x)
  const noCorpo = ([x, y]) => (y <= 150 ? [x, y] : [x * mix(1, CB / LX, limita((y - 150) / 80, 0, 1)), 150 + (y - 150) * CB]);

  // ---------- fios de cabelo sorteados uma vez (o mesmo desenho em todo quadro) ----------
  const FIOS = {};
  function fios(chave, n, sem, gera) { return FIOS[chave] || (FIOS[chave] = Array.from({ length: n }, (_, i) => gera(sorteio(sem + i * 31), i))); }

  // ================= CABELO =================
  function cabeloAtrasLongo(c, M, e) {
    const massa = sopra(e, [[-104, -30], [-102, -112], [-44, -152], [40, -150], [102, -116], [126, -44], [136, 24], [154, 90], [140, 128], [166, 176], [132, 168], [118, 210],
      [0, 250], [-150, 300], [-172, 520], [-188, 470], [-200, 548], [-214, 500], [-232, 520], [-222, 440], [-214, 360], [-198, 280], [-178, 200], [-152, 120], [-126, 40]].map(noCorpo), 40);
    peca(c, massa, M.cabelo[0], { sombra: [[[-260, 100], [-120, 60], [-150, 300], [-170, 600], [-260, 600]], M.cabelo[1]], luz: [[[96, -130], [130, -70], [150, 40], [168, 170], [146, 150], [130, 40], [112, -60], [80, -128]], M.cabelo[2]] });
    // fios escuros e claros por dentro, seguindo a onda
    c.save(); c.beginPath(); curva(c, massa, true); c.clip();
    for (const f of fios('atras', 44, 11, (r) => ({ x: -200 + r() * 340, y: -140 + r() * 120, l: 160 + r() * 380, a: 8 + r() * 14, ph: r() * 6, claro: r() < 0.35 }))) {
      const pts = [];
      for (let j = 0; j <= 8; j++) { const u = j / 8, y = f.y + u * f.l, x = f.x - u * u * 60 + f.a * Math.sin(y * 0.03 + f.ph); pts.push(brisa(e, x, y, 40)); }
      risco(c, pts, 0.9, f.claro ? M.cabelo[2] : M.cabelo[3], 0.8);
    }
    c.restore();
  }

  function cabeloFrenteLongo(c, M, e) {
    // a mecha que cai por cima do ombro de perto (passa atrás da orelha)
    const mecha = sopra(e, [[-92, -20], [-74, 40], [-62, 110], [-80, 180], [-110, 250], [-128, 330], [-120, 400], [-138, 440], [-150, 380], [-166, 430], [-176, 360], [-160, 280], [-142, 200], [-118, 120], [-106, 40]].map(noCorpo), 20, 560);
    peca(c, mecha, M.cabelo[0], { sombra: [[[-100, -30], [-50, -30], [-56, 120], [-96, 240], [-120, 360], [-150, 520], [-160, 520], [-130, 300], [-100, 160]], M.cabelo[1]], luz: [[[-200, 150], [-158, 160], [-170, 420], [-200, 420]], M.cabelo[2]] });
    c.save(); c.beginPath(); curva(c, mecha, true); c.clip();
    for (const f of fios('mecha', 9, 21, (r, i) => ({ x: -96 + i * 3, ph: r() * 6, a: 6 + r() * 6, claro: i % 3 === 0 }))) {
      const pts = [];
      for (let j = 0; j <= 8; j++) { const u = j / 8, y = -10 + u * 440, x = f.x - 70 * Math.sin(u * 1.4) + 12 * Math.sin(u * 3) - u * 20 + f.a * Math.sin(y * 0.035 + f.ph); pts.push(brisa(e, x, y, 20, 440)); }
      risco(c, pts, 0.7, f.claro ? M.cabelo[2] : M.cabelo[3], 0.7);
    }
    c.restore();
  }

  function franjaLonga(c, M, e) {
    const f = [[34, -136], [-26, -128], [-78, -100], [-100, -52], [-102, 4], [-90, -22], [-72, -56], [-40, -78], [-6, -84], [26, -92], [58, -86], [84, -60], [96, -14], [102, 30], [110, -30], [104, -86], [74, -124]];
    peca(c, sopra(e, f, -20, 300), M.cabelo[0], { sombra: [[[-110, -70], [40, -88], [40, -70], [-110, 20]], M.cabelo[1]], luz: [[[30, -150], [110, -100], [112, -40], [70, -110]], M.cabelo[2]] });
    for (let i = 0; i < 6; i++) { const x0 = 30 - i * 14; risco(c, [[x0, -128], [x0 - 40, -112 + i * 4], [x0 - 70 - i * 3, -76 + i * 6]], 0.7, M.cabelo[3], 0.7); }
  }

  function cabeloAtrasCoque(c, M, e) {
    const cranio = [[-94, -30], [-90, -100], [-30, -136], [44, -132], [98, -96], [112, -30], [108, 30], [92, 70], [-70, 70], [-96, 20]];
    peca(c, cranio, M.cabelo[0], { sombra: [[[-120, -10], [30, -40], [130, 0], [130, 100], [-120, 100]], M.cabelo[1]] });
    // o coque no alto, um pouco para trás: gira devagar com a brisa (preso, quase não mexe)
    const g = 0.02 * e.brisa * Math.sin(e.t * 1.7);
    c.save(); c.translate(36, -146); c.rotate(g);
    peca(c, [[-56, 8], [-48, -34], [-8, -60], [40, -50], [60, -10], [46, 26], [0, 34], [-36, 30]], M.cabelo[0], { sombra: [[[-70, 0], [70, 0], [70, 50], [-70, 50]], M.cabelo[1]], luz: [[[-30, -56], [30, -58], [10, -36], [-30, -30]], M.cabelo[2]] });
    for (let i = 0; i < 4; i++) risco(c, [[-40 + i * 6, 10 - i * 8], [-20 + i * 10, -36 + i * 4], [30 - i * 4, -30 + i * 10]], 0.7, M.cabelo[3], 0.6);
    c.restore();
  }

  function cabeloFrenteCoque(c, M, e) {
    // duas mechas soltas emoldurando o rosto (essas balançam bastante)
    for (const [lado, larg, comp] of [[-1, 9, 170], [1, 7, 150]]) {
      const x0 = lado * 86, pts = [];
      for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x0 + lado * (10 * Math.sin(u * 2.6) + 6 * u), -40 + u * comp]); }
      const ida = pts.map(([x, y], j) => [x + lado * larg * (1 - j / 8), y]), volta = pts.map(([x, y], j) => [x - lado * larg * 0.4 * (1 - j / 8), y]).reverse();
      peca(c, sopra(e, ida.concat(volta), -20, 200), M.cabelo[0], { grossura: 0.8, luz: [[[x0 - 30, -40], [x0 + 30, -40], [x0 + 30, 20], [x0 - 30, 40]], M.cabelo[2]] });
    }
  }

  function franjaCoque(c, M, e) {
    const f = [[-6, -136], [-60, -120], [-96, -80], [-104, -26], [-90, -44], [-64, -70], [-30, -80], [10, -66], [44, -40], [64, 0], [70, 26], [80, -10], [94, -60], [70, -116], [30, -138]];
    peca(c, sopra(e, f, -20, 260), M.cabelo[0], { sombra: [[[-20, -70], [80, -20], [80, 40], [-20, -40]], M.cabelo[1]], luz: [[[-60, -126], [20, -138], [-10, -110], [-70, -90]], M.cabelo[2]] });
    for (let i = 0; i < 5; i++) risco(c, [[-4 + i * 10, -130], [30 + i * 8, -90 + i * 4], [52 + i * 5, -30 + i * 8]], 0.7, M.cabelo[3], 0.6);
  }

  // fios soltos: nascem na borda e correm rente a ela, para baixo, abrindo um pouco para fora
  function fiapos(c, M, e, lista) {
    for (const [x, y, lado, comp] of lista) {
      const pts = [];
      for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push(brisa(e, x + lado * (u * u * 34 + 8 * Math.sin(u * 5)), y + u * comp, y - 30, 360)); }
      risco(c, pts, 0.55, M.cabelo[2], 0.85);
    }
  }

  // ================= BRINCO (pêndulo preso no gancho) =================
  function brinco(c, M, x, y, ang, s) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    risco(c, [[0, 0], [0, 6]], 1.0, M.ouro[2]);
    const disco = (cy, r) => {
      c.beginPath(); c.arc(0, cy, r, 0, TAU); c.fillStyle = M.ouro[0]; c.fill();
      c.save(); c.clip(); c.beginPath(); c.arc(r * 0.35, cy + r * 0.3, r, 0, TAU); c.fillStyle = M.ouro[1]; c.fill();
      c.beginPath(); c.arc(-r * 0.25, cy - r * 0.25, r * 0.45, 0, TAU); c.fillStyle = M.ouro[3]; c.fill(); c.restore();
      c.beginPath(); c.arc(0, cy, r * 0.62, 0, TAU); traco(c, 0.6, M.ouro[2], 0.8); c.stroke(); solta(c);
      c.beginPath(); c.arc(0, cy, r, 0, TAU); traco(c, 0.9, M.ouro[2]); c.stroke(); solta(c);
    };
    disco(14, 9.5); disco(37, 12);
    c.beginPath(); c.arc(0, 53, 3, 0, TAU); c.fillStyle = M.ouro[0]; c.fill(); traco(c, 0.6, M.ouro[2]); c.stroke(); solta(c);
    c.restore();
  }

  // ================= CORPO =================
  function corpo(c, M, e) {
    const sobe = -2.2 * e.resp;
    c.save(); c.translate(0, sobe);
    // pele: pescoço, ombros e braços (os braços descem e vão para trás das costas)
    const pele = [[-50, 70], [-54, 146], [-108, 170], [-160, 198], [-184, 240], [-192, 330], [-190, 460], [-176, 620], [-150, 1010], [150, 1010], [168, 620], [176, 460], [174, 330], [164, 236], [140, 198], [104, 170], [52, 146], [48, 80]];
    peca(c, pele, M.pele[0], {
      sombra: [[[-60, 60], [70, 60], [56, 110], [10, 150], [-60, 158]], M.pele[1]],
      dentro() {
        // sombra fria do lado esquerdo (longe do sol) e no braço de perto
        c.beginPath(); curva(c, [[-240, 200], [-168, 210], [-160, 330], [-150, 1010], [-240, 1010]], true); c.fillStyle = M.pele[1]; c.fill();
        c.beginPath(); curva(c, [[120, 190], [176, 230], [190, 600], [150, 600], [160, 300]], true); c.fillStyle = M.pele[2]; c.fill();
        // clavículas
        risco(c, [[-96, 196], [-60, 204], [-20, 212]], 0.6, M.pele[1], 0.8);
        risco(c, [[20, 212], [56, 202], [92, 194]], 0.6, M.pele[1], 0.8);
      },
    });
    // linha do braço (separa braço e lado do corpo)
    risco(c, [[-150, 300], [-146, 420], [-138, 560]], 0.8, LINHA, 0.7);
    risco(c, [[140, 300], [136, 420], [130, 560]], 0.8, LINHA, 0.7);
    vestido(c, M, e);
    c.restore();
  }

  function vestido(c, M, e) {
    const V = M.vestido;
    // alças finas
    for (const [a, b] of [[[-98, 300], [-110, 182]], [[96, 298], [104, 180]]]) faixa(c, [a, b], 7, V[0]);
    const forma = [[-146, 336], [-104, 300], [-60, 296], [-10, 324], [40, 296], [100, 296], [142, 330], [118, 470], [150, 640], [168, 1010], [-168, 1010], [-152, 640], [-118, 470]];
    peca(c, forma, V[0], {
      dentro() {
        // bolinhas em grade desencontrada
        c.fillStyle = V[2];
        for (let j = 0; j < 27; j++) for (let i = 0; i < 18; i++) {
          const x = -190 + i * 24 + (j % 2) * 12, y = 290 + j * 28;
          c.beginPath(); c.arc(x, y, 3.6, 0, TAU); c.fill();
        }
        // sombra de cima (o sol vem da direita) e do lado esquerdo
        c.globalAlpha = 0.55; c.fillStyle = V[1];
        c.beginPath(); curva(c, [[-200, 300], [-120, 330], [-110, 470], [-140, 1010], [-200, 1010]], true); c.fill();
        c.beginPath(); curva(c, [[-120, 390], [-60, 420], [0, 400], [60, 418], [120, 392], [120, 440], [0, 450], [-120, 440]], true); c.fill();
        c.globalAlpha = 1;
      },
    });
    // contorno do busto e franzido no meio, com o laço (as fitas quase não mexem)
    risco(c, [[-128, 400], [-80, 424], [-30, 410]], 0.6, LINHA, 0.55);
    risco(c, [[20, 410], [70, 424], [120, 400]], 0.6, LINHA, 0.55);
    for (let i = -2; i <= 2; i++) risco(c, [[-8 + i * 6, 330], [-8 + i * 8, 400], [-8 + i * 10, 460]], 0.45, V[1], 0.7);
    const fita = 2 * Math.sin(e.t * 2.1) * e.brisa;
    c.save(); c.translate(-8, 338);
    peca(c, [[0, 0], [-16, -8], [-20, 4], [-4, 6]], V[0], { grossura: 0.7 });
    peca(c, [[0, 0], [16, -8], [20, 4], [4, 6]], V[0], { grossura: 0.7 });
    faixa(c, [[-2, 4], [-6 + fita, 40], [-10 + fita * 1.5, 70]], 4, V[0]);
    faixa(c, [[2, 4], [6 + fita, 44], [8 + fita * 1.5, 76]], 4, V[0]);
    c.restore();
  }

  // ================= ROSTO =================
  const FACE = [[-80, -56], [-86, -6], [-82, 32], [-70, 60], [-40, 92], [-6, 112], [12, 116], [32, 102], [58, 70], [76, 30], [82, -12], [80, -58], [40, -100], [-30, -104]];

  function olho(c, M, cx, cy, s, lado, e) {
    // lado -1 = olho da esquerda da tela; o canto de fora fica do lado "lado"
    const w = 23 * s, fora = [cx + lado * w, cy - 3 * s], dentro = [cx - lado * w, cy + 3 * s];
    const cimaAberta = [dentro, [cx - lado * w * 0.45, cy - 15 * s], [cx + lado * w * 0.3, cy - 16 * s], fora];
    const baixo = [fora, [cx + lado * w * 0.35, cy + 10 * s], [cx - lado * w * 0.35, cy + 10.5 * s], dentro];
    // a pálpebra desce entre a curva de cima e a de baixo (piscada)
    const p = e.pisca, baixoInv = baixo.slice().reverse();
    const cima = cimaAberta.map(([x, y], i) => [x, mix(y, baixoInv[i][1] - 0.6 * s, p)]);
    const branco = cima.concat(baixo.slice(1, 3));
    // pálpebra (pele) por cima do olho fechando
    c.save(); c.beginPath(); curva(c, cimaAberta.concat(baixo.slice(1, 3)), true); c.fillStyle = M.pele[0]; c.fill(); c.restore();
    c.save(); c.beginPath(); curva(c, branco, true); c.fillStyle = M.branco; c.fill(); c.clip();
    const ix = cx + e.olhar * 8 * s + 1.5 * s, iy = cy + 0.5 * s, ri = 12.5 * s;
    c.fillStyle = M.olho[0]; c.beginPath(); c.arc(ix, iy, ri, 0, TAU); c.fill();
    c.fillStyle = M.olho[2]; c.beginPath(); c.arc(ix + 1.5 * s, iy + 3 * s, ri * 0.62, 0.1 * Math.PI, 0.95 * Math.PI); c.fill();
    c.beginPath(); c.arc(ix, iy, ri, 0, TAU); traco(c, 0.7, M.olho[1]); c.stroke(); solta(c);
    c.fillStyle = M.olho[1]; c.beginPath(); c.arc(ix, iy, 5 * s, 0, TAU); c.fill();
    c.fillStyle = cor(M.olho[1], M.olho[1], 0, 0.35); c.beginPath(); curva(c, cima.concat([[cima[3][0], cima[3][1] + 6 * s], [cima[0][0], cima[0][1] + 6 * s]]), true); c.fill(); // sombra da pálpebra
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ix - 3 * s, iy - 3.5 * s, 2.3 * s, 0, TAU); c.fill();
    c.restore();
    // cílio de cima: faixa grossa que acompanha a pálpebra e abre numa asinha para fora
    const asa = [fora[0] + lado * 9 * s, mix(fora[1] - 8 * s, fora[1] + 3 * s, p)];
    c.beginPath(); curva(c, cima.concat([asa]), false); traco(c, 4.6, M.cilio); c.lineCap = 'round'; c.stroke(); solta(c);
    // dobra da pálpebra (desce um pouco junto) e o fio de baixo
    risco(c, [[cx - lado * w * 0.5, cy - 16 * s + 4 * p * s], [cx + lado * w * 0.2, cy - 18 * s + 4 * p * s], [cx + lado * w * 0.85, cy - 12 * s + 4 * p * s]], 0.6, M.pele[1], 0.9);
    risco(c, baixo.slice(0, 3), 0.55, LINHA, 0.55 * (1 - p));
  }

  function sobrancelha(c, M, cx, cy, s, lado, ergue) {
    const y = cy - 30 * s - ergue * 3.2 * s;
    const pts = [[cx - lado * 18 * s, y + 6 * s], [cx - lado * 4 * s, y - 1 * s], [cx + lado * 12 * s, y - 2 * s], [cx + lado * 24 * s, y + 4 * s]];
    risco(c, pts, 3, M.sobrancelha, 0.95);
  }

  function boca(c, M, e) {
    const s = e.sorri, cx = 20, cy = 68, w = 18 + 2 * s, canto = -3.4 * s;
    const esq = [cx - w, cy + 1 + canto], dir = [cx + w, cy - 1 + canto];
    const cima = [esq, [cx - w * 0.5, cy - 5], [cx - 2, cy - 7], [cx + 2, cy - 5], [cx + 7, cy - 7], [cx + w * 0.55, cy - 5], dir];
    const meio = [dir, [cx + w * 0.5, cy + 1 - s], [cx, cy + 1.5 - s], [cx - w * 0.5, cy + 1 - s], esq];
    const baixo = [esq, [cx - w * 0.45, cy + 9], [cx + 2, cy + 12], [cx + w * 0.5, cy + 8], dir];
    c.beginPath(); curva(c, cima.concat(meio.slice(1, -1)), true); c.fillStyle = M.boca[1]; c.fill();
    c.beginPath(); curva(c, baixo.concat(meio.slice(1, -1).reverse()), true); c.fillStyle = M.boca[0]; c.fill();
    c.fillStyle = cor(M.boca[0], '#ffffff', 0.4, 0.8); c.beginPath(); c.ellipse(cx + 4, cy + 7, 5, 1.6, 0, 0, TAU); c.fill();
    risco(c, meio, 0.9, M.boca[2], 0.9);
  }

  function rosto(c, M, e) {
    const sorri = e.sorri;
    peca(c, FACE, M.pele[0], {
      sombra: [[[-120, -10], [-80, -20], [-70, 40], [-44, 92], [-10, 140], [-140, 140]], M.pele[1]],
      luz: [[[56, -40], [96, -60], [100, 60], [62, 74], [74, 20]], M.pele[2]],
      dentro() {
        // sombra macia do lado de longe do sol (esquerda) e embaixo do queixo
        const gs = c.createLinearGradient(-90, 0, -34, 0); gs.addColorStop(0, cor(M.pele[1], M.pele[1], 0, 0.75)); gs.addColorStop(1, cor(M.pele[1], M.pele[1], 0, 0));
        c.fillStyle = gs; c.fillRect(-100, -110, 70, 240);
        // sombra da franja na testa
        c.beginPath(); curva(c, [[-110, -110], [110, -110], [110, -70], [40, -74], [-30, -66], [-110, -30]], true); c.fillStyle = M.pele[1]; c.globalAlpha = 0.7; c.fill(); c.globalAlpha = 1;
        // rubor (sobe 1 unidade no sorriso) e sardas
        c.fillStyle = cor(M.rubor, M.rubor, 0, 0.35 + 0.12 * sorri);
        c.beginPath(); c.ellipse(-42, 30 - sorri, 20, 10, 0, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(56, 28 - sorri, 14, 9, 0, 0, TAU); c.fill();
        const r = sorteio(77); c.fillStyle = cor(M.sarda, M.sarda, 0, 0.4);
        for (let i = 0; i < (M.sardas ?? 18); i++) { const x = -56 + r() * 124, y = 14 + r() * 20; c.beginPath(); c.arc(x, y - sorri, 0.8, 0, TAU); c.fill(); }
      },
    });
    // nariz: só um traço do lado e a sombra da ponta
    c.fillStyle = cor(M.pele[1], M.pele[1], 0, 0.7); c.beginPath(); curva(c, [[8, 8], [14, 34], [12, 44], [24, 46], [30, 40], [20, 38], [16, 20]], true); c.fill();
    risco(c, [[14, 44], [20, 47], [28, 44]], 0.8, M.pele[3], 0.9);
    c.fillStyle = cor(M.pele[2], '#ffffff', 0.4); c.beginPath(); c.ellipse(24, 37, 2.6, 1.8, 0, 0, TAU); c.fill();
    olho(c, M, -32, -2, 1, -1, e);
    olho(c, M, 44, -4, 0.84, 1, e);
    sobrancelha(c, M, -32, -2, 1, -1, e.sobr);
    sobrancelha(c, M, 44, -4, 0.86, 1, e.sobr);
    boca(c, M, e);
  }

  function orelha(c, M) {
    peca(c, [[-82, -12], [-94, -16], [-100, 0], [-96, 22], [-84, 30]], M.pele[0], { grossura: 0.8, sombra: [[[-90, -8], [-84, -6], [-86, 22], [-92, 20]], M.pele[1]] });
    risco(c, [[-93, -6], [-96, 6], [-91, 18]], 0.6, M.pele[3], 0.7);
  }

  // ================= a personagem inteira =================
  function desenha(c, M, e, pxPorUnidade) {
    PX = pxPorUnidade; LINHA = M.linha || '#5a2a1e';
    const longo = M.penteado !== 'coque';
    const cab = -1.0 * e.resp; LX = M.largura ?? 1.12; CB = M.corpo ?? 1.3;
    // a cabeça é desenhada um pouco mais larga (proporção de ilustração); os brincos não esticam
    const noRosto = ([x, y]) => [x * LX, y];
    c.save(); c.translate(0, cab); c.scale(LX, 1);
    if (longo) cabeloAtrasLongo(c, M, e); else cabeloAtrasCoque(c, M, e);
    c.restore();
    c.save(); c.translate(0, cab); brinco(c, M, ...noRosto([70, 50]), e.brinco[1], 0.85); c.restore();   // o de longe, atrás do queixo
    c.save(); c.translate(0, 150); c.scale(CB, CB); c.translate(0, -150); corpo(c, M, e); c.restore();
    c.save(); c.translate(0, cab); c.scale(LX, 1);
    rosto(c, M, e);
    orelha(c, M);
    if (longo) cabeloFrenteLongo(c, M, e); else cabeloFrenteCoque(c, M, e);
    c.restore();
    c.save(); c.translate(0, cab); brinco(c, M, ...noRosto([-90, 34]), e.brinco[0], 1); c.scale(LX, 1);
    if (longo) { franjaLonga(c, M, e); fiapos(c, M, e, [[-98, -50, -1, 200], [-104, 10, -1, 150], [110, -40, 1, 160], [96, -100, 1, 120]]); }
    else { franjaCoque(c, M, e); fiapos(c, M, e, [[-92, -60, -1, 120], [100, -50, 1, 140]]); }
    c.restore();
  }

  window.Moca = { desenha, curva, peca, risco, traco: (c, px, cr, a) => traco(c, px, cr, a), defineEscala: (px) => { PX = px; } };
})();
