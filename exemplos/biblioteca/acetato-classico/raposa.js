// raposa.js — a personagem, desenhada como ACETATO pintado a cada pose: preenchimento chapado,
// linha de nanquim por fora, algumas linhas na cor do próprio pelo, sombra chapada embaixo.
// É uma raposinha original deste kit (cabeça grande, orelhas de ponta escura, peito creme, meias
// escuras). O corpo é feito de curvas que deformam (esticar e encolher) e de uma "folha de poses":
// cada ação da história (espreitar, agachar, pular, rolar, espirrar...) mistura essas poses.
// Nada aqui sabe da história: as ações, os tempos e as cores vêm de historia.json.
(function () {
  'use strict';
  const { mistura, limita, trecho, suave, ruido, hex } = Filme;
  const TAU = Math.PI * 2, GRAU = 180 / Math.PI;

  // ---------- folha de poses (números que o desenho entende) ----------
  const BASE = {
    x: 0, alto: 0, bx: 0, corpoY: 52, incl: 0, giro: 0, estica: 0, esticaAng: 0,
    cabX: 20, cabY: -26, cabAng: 0, orelha: 0, orelhaAbre: 0.12,
    cauda: -2.35, caudaCurva: 1.1, noAr: 0, pernaF: 0, pernaT: 0, passo: 0, senta: 0,
    olho: 1, tonto: 0, pupX: 2, pupY: 0, pupTam: 1, boca: 0, nariz: 0,
  };
  const POSES = {
    em_pe: {},
    espreita: { corpoY: 40, incl: 0.06, cabX: 26, cabY: -12, cabAng: 0.08, orelha: 0.28, cauda: -2.75, caudaCurva: 0.45, pupX: 3.5 },
    agacha: { corpoY: 30, incl: 0.16, cabX: 24, cabY: -6, cabAng: 0.06, orelha: 0.36, cauda: -2.9, caudaCurva: 0.3, pupX: 4, pupTam: 1.15 },
    pulo: { corpoY: 60, incl: -0.12, noAr: 1, pernaF: 1.35, pernaT: -1.35, estica: 0.32, orelha: -0.7, orelhaAbre: 0.05, cauda: -3.05, caudaCurva: 0.1, boca: 0.55, pupX: 4.5, cabX: 26, cabY: -18 },
    aterrissa: { corpoY: 30, incl: 0.12, cabX: 26, cabY: -8, olho: 0, orelha: 0.55, cauda: -1.7, caudaCurva: 1.4 },
    bola: { corpoY: 46, incl: 0.3, cabX: 4, cabY: -6, cabAng: 0.7, noAr: 1, pernaF: 0.9, pernaT: -0.5, olho: 0, orelha: -0.4, cauda: -0.9, caudaCurva: 2.2 },
    senta: { corpoY: 50, bx: -8, incl: -1.05, senta: 1, cabX: 16, cabY: -20, cauda: -2.75, caudaCurva: 1.5, pupX: 2 },
    prepara: { corpoY: 50, bx: -8, incl: -1.12, senta: 1, cabX: 12, cabY: -24, cabAng: -0.38, olho: 0.55, boca: 0.3, orelha: -0.2, cauda: -2.6, caudaCurva: 1.6 },
    espirro: { corpoY: 46, bx: -4, incl: -0.92, senta: 1, cabX: 24, cabY: -12, cabAng: 0.42, olho: 0, boca: 1, orelha: 0.7, orelhaAbre: 0.35, cauda: -2.2, caudaCurva: 2.0 },
    maravilha: { corpoY: 50, bx: -8, incl: -1.1, senta: 1, cabX: 12, cabY: -24, cabAng: -0.5, pupX: 2.5, pupY: -3.5, pupTam: 1.3, boca: 0.22, orelha: -0.12, orelhaAbre: 0.2, cauda: -2.8, caudaCurva: 1.6 },
  };
  const pose = (nome, extra) => Object.assign({}, BASE, POSES[nome] || {}, extra || {});
  function mix(a, b, k) { const o = {}; for (const c in a) o[c] = a[c] + (b[c] - a[c]) * k; return o; }
  const pulso = (k, c, l = 0.08) => Math.exp(-(((k - c) / l) ** 2));

  // ---------- linha do tempo: cada ação começa onde a anterior terminou ----------
  function linha(R) {
    let x = R.x; const acs = [];
    for (const a of R.acoes) { const ac = Object.assign({}, a, { x0: x }); ac.x1 = a.x1 != null ? a.x1 : x; x = ac.x1; acs.push(ac); }
    return acs;
  }
  function poseAcao(a, t) {
    const d = Math.max(0.001, a.ate - a.de), k = limita((t - a.de) / d), tl = Math.max(0, t - a.de);
    let p;
    switch (a.tipo) {
      case 'espreita': { // anda em arrancadas, pata por pata, baixinho
        const n = a.passos || 3, kk = Math.min(1, (Math.floor(k * n) + suave((k * n) % 1)) / n);
        p = pose('espreita', { x: mistura(a.x0, a.x1, kk), passo: kk * n });
        p.corpoY += 2.5 * Math.sin(kk * n * TAU * 2);
        p.cabAng += 0.04 * Math.sin(kk * n * TAU);
        break;
      }
      case 'agacha': { // abaixa e rebola o traseiro (antecipação do pulo)
        const w = Math.sin(tl * TAU * (a.rebola || 6)) * suave(trecho(tl, 0, 0.18));
        p = mix(pose('espreita', { x: a.x0 }), pose('agacha', { x: a.x0 }), suave(trecho(k, 0, 0.3)));
        p.incl += 0.05 * w; p.cauda += 0.4 * w; p.bx = 5 * w;
        break;
      }
      case 'pulo': { // arco esticado; perto do chão já prepara a chegada
        p = mix(pose('pulo'), pose('pulo', { estica: 0.08, incl: 0.22, pernaF: 0.5, pernaT: -0.3, orelha: 0.1, boca: 0.2 }), suave(trecho(k, 0.62, 1)));
        p.x = mistura(a.x0, a.x1, k); p.alto = -(a.altura || 100) * 4 * k * (1 - k);
        p.esticaAng = mistura(-0.38, 0.4, k);
        p.estica *= Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.4 + 0.6;
        break;
      }
      case 'aterrissa': { // achata no chão e volta com sobra
        p = pose('aterrissa', { x: a.x0 });
        p.estica = -0.42 * Math.exp(-k * 3.2) * Math.cos(k * 8);
        break;
      }
      case 'cambalhota': { // rola para a frente e termina sentada
        const kk = suave(k), v = a.voltas || 1;
        p = pose('bola', { x: mistura(a.x0, a.x1, kk), giro: TAU * v * kk, alto: -46 * Math.sin(Math.PI * kk) });
        p = mix(p, pose('senta', { x: a.x1, giro: TAU * v }), suave(trecho(k, 0.72, 1)));
        break;
      }
      case 'tonto': { // sentada, cabeça bambeando
        p = pose('senta', { x: a.x0, tonto: 1, orelha: 0.45, orelhaAbre: 0.45 });
        const w = Math.sin(tl * TAU * 1.5);
        p.cabAng = 0.2 * w; p.incl += 0.06 * Math.sin(tl * TAU * 1.5 + 1.2); p.cabX += 3 * w;
        break;
      }
      case 'espirro': { // nariz coça, "ah... ah..." (puxa o ar duas vezes) e espirra no tempo "em"
        const em = (a.em ?? a.ate) - a.de;
        if (tl < em) {
          const kp = tl / em;
          p = mix(pose('senta', { x: a.x0 }), pose('prepara', { x: a.x0 }), suave(trecho(kp, 0.1, 1)));
          const ah = pulso(kp, 0.42, 0.1) + pulso(kp, 0.82, 0.08);
          p.cabAng -= 0.14 * ah; p.boca += 0.3 * ah; p.olho = mistura(p.olho, 0.35, ah * 0.6);
          p.nariz = 2.6 * Math.sin(tl * TAU * 9) * suave(trecho(kp, 0.05, 0.25));
        } else {
          const ke = tl - em;
          if (ke < 0.07) p = mix(pose('prepara', { x: a.x0 }), pose('espirro', { x: a.x0 }), ke / 0.07);
          else p = mix(pose('espirro', { x: a.x0 }), pose('senta', { x: a.x0 }), suave(trecho(ke, 0.28, 0.7)));
          p.alto = -6 * Math.exp(-ke * 10) * Math.sin(ke * 30);
        }
        break;
      }
      case 'senta': { // olha em volta, vendo os vaga-lumes subirem
        p = pose('senta', { x: a.x0 });
        p.cabAng = -0.32 * suave(k) + 0.08 * Math.sin(tl * TAU * 0.8); p.pupY = -2.5 * suave(k); p.pupX = 2 + 2 * Math.sin(tl * TAU * 0.6);
        p.orelha = 0.15 * Math.sin(tl * TAU * 1.1);
        break;
      }
      case 'maravilha': {
        p = pose('maravilha', { x: a.x0 });
        p.cabAng += 0.05 * Math.sin(tl * TAU * 0.35);
        p.orelha += 0.12 * pulso(k, 0.3, 0.05);
        break;
      }
      default: p = pose('em_pe', { x: a.x0 });
    }
    return p;
  }
  function poseEm(acs, t) {
    let i = 0;
    while (i < acs.length - 1 && t >= acs[i + 1].de) i++;
    const a = acs[i];
    let p = poseAcao(a, Math.min(t, a.ate));
    const entra = a.entra ?? 0.12;
    if (i > 0 && t - a.de < entra) {
      const ant = poseAcao(acs[i - 1], acs[i - 1].ate);
      ant.giro = ant.giro - TAU * Math.round(ant.giro / TAU); // girar 360° é o mesmo que não girar
      p = mix(ant, p, suave(limita((t - a.de) / entra)));
    }
    return p;
  }

  // ---------- as matrizes do corpo (as mesmas para desenhar e para achar o nariz) ----------
  function matrizes(R, p) {
    const s = R.escala || 1, cy = -p.corpoY;
    let L = new DOMMatrix().translate(p.x, R.y + p.alto).scale(s);
    if (p.giro) L = L.translate(0, cy).rotate(p.giro * GRAU).translate(0, -cy);
    if (Math.abs(p.estica) > 1e-4) {
      const py = p.estica < 0 ? 0 : cy, e = 1 + p.estica;
      L = L.translate(0, py).rotate(p.esticaAng * GRAU).scale(e, 1 / e).rotate(-p.esticaAng * GRAU).translate(0, -py);
    }
    const B = new DOMMatrix().translate(p.bx, cy).rotate(p.incl * GRAU);
    const pesc = B.transformPoint({ x: 50, y: -20 });
    const Hm = new DOMMatrix().translate(pesc.x + p.cabX, pesc.y + p.cabY).rotate(p.cabAng * GRAU);
    return { L, B, Hm };
  }
  function pontos(R, p) {
    const { L, Hm } = matrizes(R, p), LH = L.multiply(Hm);
    const n = LH.transformPoint({ x: 63, y: -3 + p.nariz }), c = LH.transformPoint({ x: 8, y: -8 });
    return { nariz: [n.x, n.y], cabeca: [c.x, c.y] };
  }

  // ---------- desenho ----------
  const CORPO = [[64, 0], [52, -22], [14, -30], [-30, -29], [-60, -14], [-62, 12], [-36, 28], [18, 28], [50, 20]];
  const PEITO = [[66, -4], [62, 16], [44, 28], [30, 16], [40, -8]];
  const CABECA = [[-36, -2], [-30, -26], [-10, -38], [14, -34], [32, -20], [48, -8], [63, -4], [65, 5], [56, 13], [34, 20], [14, 30], [-4, 34], [-13, 25], [-27, 33], [-29, 20], [-41, 19]];
  const ROSTO = [[66, 5], [57, 13], [34, 20], [14, 30], [-4, 34], [-13, 25], [-24, 28], [-20, 14], [-4, 12], [16, 8], [38, 4], [56, 2]];

  function desenha(c, Mcam, R, p, cel) {
    const C = R.cores, tinta = C.tinta, { L, B, Hm } = matrizes(R, p);
    const peloEsc = hex(C.pelo, '#000000', 0.28), meiaEsc = hex(C.meia, '#000000', 0.25);
    const usa = (m) => c.setTransform(Mcam.multiply(L).multiply(m || new DOMMatrix()));
    const pt = (m, x, y) => { const q = m.transformPoint({ x, y }); return [q.x, q.y]; };
    // contorno de acetato: a linha "ferve" um tiquinho de uma pose para a outra (desenhada de novo à mão)
    const ferve = (pts, sem) => pts.map(([x, y], i) => [x + 0.7 * ruido(cel * 1.37 + i * 2.9, sem), y + 0.7 * ruido(cel * 1.11 + i * 3.7, sem + 1)]);
    function curva(pts) {
      const n = pts.length, meio = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
      c.beginPath(); const q = meio(n - 1); c.moveTo(q[0], q[1]);
      for (let i = 0; i < n; i++) { const m = meio(i); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      c.closePath();
    }
    const nanquim = (larg = 3) => { c.strokeStyle = tinta; c.lineWidth = larg; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); };

    // perna: tubo que afina, meia escura embaixo, patinha
    function perna(A, F, w0, w1, pelo, meia) {
      const dx = F[0] - A[0], dy = F[1] - A[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      const cx = (A[0] + F[0]) / 2 + nx * 3, cyy = (A[1] + F[1]) / 2 + ny * 3;
      const tubo = () => {
        c.beginPath();
        c.moveTo(A[0] + nx * w0 / 2, A[1] + ny * w0 / 2);
        c.quadraticCurveTo(cx + nx * (w0 + w1) / 4, cyy + ny * (w0 + w1) / 4, F[0] + nx * w1 / 2, F[1] + ny * w1 / 2);
        c.lineTo(F[0] - nx * w1 / 2, F[1] - ny * w1 / 2);
        c.quadraticCurveTo(cx - nx * (w0 + w1) / 4, cyy - ny * (w0 + w1) / 4, A[0] - nx * w0 / 2, A[1] - ny * w0 / 2);
        c.closePath();
      };
      tubo(); c.fillStyle = pelo; c.fill();
      c.save(); c.clip(); c.fillStyle = meia; c.beginPath(); c.arc(F[0], F[1], d * 0.45, 0, TAU); c.fill(); c.restore();
      tubo(); nanquim(2.6);
      c.beginPath(); c.ellipse(F[0] + 3, F[1] - 1, w1 * 0.75, w1 * 0.45, 0, 0, TAU); c.fillStyle = meia; c.fill(); nanquim(2.2);
    }
    function pernas(lista, pelo, meia) {
      for (const [ax, ay, fase, frente] of lista) {
        const A = pt(B, ax, ay);
        const ang = frente ? p.pernaF : p.pernaT, comp = 50;
        const sw = Math.sin(p.passo * TAU + fase);
        const chao = [A[0] + 14 * sw + (frente ? 4 : -2), -Math.max(0, Math.cos(p.passo * TAU + fase)) * 8 * Math.min(1, p.passo * 4)];
        const ar = [A[0] + Math.sin(ang) * comp, A[1] + Math.cos(ang) * comp];
        perna(A, [mistura(chao[0], ar[0], p.noAr), mistura(chao[1], ar[1], p.noAr)], 16, 12, pelo, meia);
      }
    }
    function pernaSentada(ax, ay, longe) { // coxa redonda no chão e o pé para a frente
      const A = pt(B, ax, ay);
      usa();
      c.beginPath(); c.ellipse(A[0] + 14, -6, 18, 7, 0, 0, TAU); c.fillStyle = longe ? meiaEsc : C.meia; c.fill(); nanquim(2.2);
      if (longe) return;
      c.beginPath(); c.ellipse(A[0], A[1] - 6, 26, 23, -0.4, 0, TAU); c.fillStyle = C.pelo; c.fill(); nanquim(2.8);
      c.beginPath(); c.arc(A[0] + 2, A[1] - 6, 15, -2.4, -0.6); c.strokeStyle = peloEsc; c.lineWidth = 2; c.stroke();
    }
    function orelha(bx, by, ang, longe) {
      usa(Hm); c.transform(1, 0, 0, 1, bx, by); c.rotate(ang);
      const comp = 56, w = 32;
      c.beginPath(); c.moveTo(0, -w / 2); c.quadraticCurveTo(comp * 0.55, -w * 0.6, comp, 0); c.quadraticCurveTo(comp * 0.55, w * 0.6, 0, w / 2); c.closePath();
      c.fillStyle = longe ? peloEsc : C.pelo; c.fill();
      c.save(); c.clip();
      c.fillStyle = longe ? meiaEsc : C.meia; c.fillRect(comp * 0.66, -w, comp, w * 2);
      c.restore();
      if (!longe) { c.beginPath(); c.moveTo(comp * 0.12, -w * 0.26); c.quadraticCurveTo(comp * 0.45, -w * 0.32, comp * 0.66, -w * 0.08); c.lineTo(comp * 0.66, w * 0.08); c.quadraticCurveTo(comp * 0.45, w * 0.32, comp * 0.12, w * 0.26); c.closePath(); c.fillStyle = C.orelhaDentro; c.fill(); }
      c.beginPath(); c.moveTo(0, -w / 2); c.quadraticCurveTo(comp * 0.55, -w * 0.6, comp, 0); c.quadraticCurveTo(comp * 0.55, w * 0.6, 0, w / 2);
      nanquim(2.8);
    }
    function cauda() {
      const raiz = pt(B, -58, -6), n = 12, passo = 9.5;
      let x = raiz[0], y = raiz[1];
      const meio = [[x, y]], ang = [];
      for (let i = 1; i <= n; i++) { const u = i / n, a = p.cauda + p.caudaCurva * u * u + 0.08 * Math.sin(cel * 0.7 + u * 3); ang.push(a); x += Math.cos(a) * passo; y += Math.sin(a) * passo; meio.push([x, y]); }
      ang.unshift(ang[0]);
      const lado = (sg) => meio.map(([mx, my], i) => { const u = i / n, w = 6 + 24 * Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.05)) * (u > 0.85 ? 1 - (u - 0.85) * 2.5 : 1); return [mx - Math.sin(ang[i]) * w * sg, my + Math.cos(ang[i]) * w * sg]; });
      const ponta = meio[n], a = ang[n];
      const pts = ferve(lado(1).concat([[ponta[0] + Math.cos(a) * 12, ponta[1] + Math.sin(a) * 12]], lado(-1).reverse()), 31);
      usa(); curva(pts); c.fillStyle = C.pelo; c.fill();
      c.save(); c.clip(); const pc = meio[Math.round(n * 0.72)]; const d = Math.hypot(ponta[0] - pc[0], ponta[1] - pc[1]) + 14;
      c.beginPath(); c.arc(ponta[0] + Math.cos(a) * 6, ponta[1] + Math.sin(a) * 6, d, 0, TAU); c.fillStyle = C.creme; c.fill();
      c.strokeStyle = peloEsc; c.lineWidth = 2; c.beginPath(); c.moveTo(meio[3][0], meio[3][1]); for (let i = 4; i < 9; i++) c.lineTo(meio[i][0] - Math.sin(ang[i]) * 6, meio[i][1] + Math.cos(ang[i]) * 6); c.stroke();
      c.restore(); curva(pts); nanquim(3);
    }

    const sentada = p.senta > 0.5;
    // 1) o que fica atrás do corpo
    usa();
    if (sentada) pernaSentada(-44, 6, true); else pernas([[-46, 8, 0, false]], peloEsc, meiaEsc);
    usa(); pernas([[30, 8, Math.PI, true]], peloEsc, meiaEsc);
    cauda();
    // 2) corpo
    usa(B);
    const corpo = ferve(CORPO, 11);
    curva(corpo); c.fillStyle = C.pelo; c.fill();
    c.save(); c.clip();
    c.fillStyle = C.sombra; c.beginPath(); c.ellipse(-4, 34, 84, 24, 0, 0, TAU); c.fill();                 // sombra chapada do acetato
    curva(ferve(PEITO, 13)); c.fillStyle = C.creme; c.fill();
    c.strokeStyle = peloEsc; c.lineWidth = 2; c.beginPath(); c.arc(-34, 2, 22, -1.9, 0.3); c.stroke();  // linha da coxa, na cor do pelo
    c.restore();
    curva(corpo); nanquim(3.2);
    // 3) pernas da frente (lado de cá)
    if (sentada) pernaSentada(-38, 10, false); else { usa(); pernas([[-38, 10, Math.PI, false]], C.pelo, C.meia); }
    usa(); pernas([[40, 10, 0, true]], C.pelo, C.meia);
    // 4) cabeça
    orelha(-12, -26, -1.98 + p.orelha - p.orelhaAbre, true);
    usa(Hm);
    const cab = ferve(CABECA, 21);
    curva(cab); c.fillStyle = C.pelo; c.fill();
    c.save(); c.clip(); curva(ferve(ROSTO, 23)); c.fillStyle = C.creme; c.fill(); c.restore();
    curva(cab); nanquim(3.2);
    orelha(6, -31, -1.42 + p.orelha + p.orelhaAbre, false);
    usa(Hm);
    // boca
    if (p.boca > 0.08) {
      const ab = p.boca;
      const bocaAberta = () => { c.beginPath(); c.moveTo(57, 6); c.lineTo(35, 10); c.quadraticCurveTo(42, 12 + 18 * ab, 55, 8 + 9 * ab); c.closePath(); };
      bocaAberta(); c.fillStyle = C.boca; c.fill();
      c.save(); c.clip(); c.fillStyle = C.lingua; c.beginPath(); c.ellipse(45, 12 + 12 * ab, 8, 4 * ab + 1.5, 0, 0, TAU); c.fill(); c.restore();
      bocaAberta(); nanquim(2.2);
    } else { c.beginPath(); c.moveTo(55, 11); c.quadraticCurveTo(46, 16, 37, 13); nanquim(2.2); }
    // bochecha
    c.fillStyle = 'rgba(232,120,96,0.35)'; c.beginPath(); c.ellipse(30, 6, 7, 5, 0, 0, TAU); c.fill();
    // nariz
    c.beginPath(); c.ellipse(63, -2 + p.nariz, 6.5, 5, 0.2, 0, TAU); c.fillStyle = C.nariz; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(61, -4 + p.nariz, 1.6, 0, TAU); c.fill();
    // olho
    const ox = 20, oy = -10;
    if (p.olho > 0.45) {
      const ab = p.olho;
      c.beginPath(); c.ellipse(ox, oy, 9.5, 12 * ab, 0.15, 0, TAU); c.fillStyle = C.olhoBranco; c.fill();
      c.save(); c.clip();
      if (p.tonto > 0.5) { // espiral de tontura
        c.strokeStyle = C.olho; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 2 + cel * 0.9, rr = i / 30 * 8; const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
      } else {
        const pt2 = p.pupTam;
        c.fillStyle = C.olho; c.beginPath(); c.ellipse(ox + p.pupX, oy + p.pupY + 1, 6 * pt2, 8 * pt2, 0.1, 0, TAU); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ox + p.pupX - 2, oy + p.pupY - 3, 2.4 * pt2, 0, TAU); c.fill();
        if (pt2 > 1.15) { c.beginPath(); c.arc(ox + p.pupX + 2.5, oy + p.pupY + 4, 1.3, 0, TAU); c.fill(); }
      }
      c.restore();
      c.beginPath(); c.ellipse(ox, oy, 9.5, 12 * ab, 0.15, 0, TAU); nanquim(2.4);
      c.beginPath(); c.moveTo(ox - 9, oy - 12 * ab - 3); c.quadraticCurveTo(ox, oy - 12 * ab - 7, ox + 9, oy - 12 * ab - 2); nanquim(2.2); // sobrancelha
    } else { // olho fechado com força
      c.beginPath(); c.moveTo(ox - 9, oy - 4); c.lineTo(ox + 6, oy); c.lineTo(ox - 8, oy + 5); nanquim(2.6);
    }
  }

  window.Raposa = { linha, poseEm, desenha, pontos };
})();
