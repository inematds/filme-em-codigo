// mundo.js — as peças 3D do explicativo luminoso, desenhadas em canvas 2D com uma câmera de verdade
// (ponto no mundo -> ponto na tela, com perspectiva). Nada aqui sabe da história: o motor diz onde
// a câmera está e onde cada peça fica, e estas funções só desenham.
//   planeta de pontos (nuvens que giram, luz de um lado, borda azul), anel e marcador em volta dele,
//   sol que brilha, órbita, chão de pontos, montanhas pretas, caixas (jipe e bloco que derrete).
// O brilho é feito somando luz (modo 'lighter') com borrões prontos, sem placa de vídeo.
(function () {
  'use strict';
  const { limita, mistura, sorteio } = Filme;

  // ---------- vetores ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const vez = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const pe = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norma = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  // giro em volta do eixo y e inclinação em volta do eixo z (o eixo do planeta)
  const giraY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]; };
  const giraZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; };

  // ---------- câmera: pos, alvo e campo de visão vertical (graus), tela de L x A ----------
  function camera(pos, alvo, fov, L, A) {
    const f = norma(sub(alvo, pos)), r = norma(cruz(f, [0, 1, 0])), u = cruz(r, f);
    const F = (A / 2) / Math.tan(fov * Math.PI / 360);
    function proj(X) {
      const d = sub(X, pos), z = pe(d, f);
      return { x: L / 2 + pe(d, r) / z * F, y: A / 2 - pe(d, u) / z * F, z, s: F / z };
    }
    return { pos, f, r, u, F, L, A, proj };
  }

  // ---------- cor ----------
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${limita(a)})`; };

  // ---------- brilho pronto: um borrão redondo por cor, feito uma vez ----------
  const BORROES = new Map();
  function borrao(cor) {
    if (BORROES.has(cor)) return BORROES.get(cor);
    const t = document.createElement('canvas'); t.width = t.height = 128;
    const g = t.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64), [r, gg, b] = rgb(cor);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.25, `rgba(${r},${gg},${b},0.45)`);
    gr.addColorStop(0.6, `rgba(${r},${gg},${b},0.1)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    BORROES.set(cor, t); return t;
  }
  function brilho(c, x, y, raio, cor, forca = 1) {
    if (forca <= 0 || raio <= 0) return;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = limita(forca);
    c.drawImage(borrao(cor), x - raio, y - raio, raio * 2, raio * 2); c.restore();
  }
  // linha que brilha: três passadas somando luz, da mais larga e fraca à fina e forte
  function linhaBrilho(c, pts, cor, larg, forca = 1, fechada = false) {
    if (pts.length < 2 || forca <= 0) return;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (fechada) c.closePath();
    for (const [w, a] of [[larg * 7, 0.07], [larg * 3, 0.2], [larg, 0.95]]) { c.strokeStyle = rgba(cor, a * forca); c.lineWidth = w; c.stroke(); }
    c.restore();
  }

  // ---------- ruído 3D com semente (conta pura, sem seno) ----------
  function criarRuido(semente) {
    const r = sorteio(semente), N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
    for (let i = 0; i < N; i++) { perm[i] = i; val[i] = r(); }
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp; }
    for (let i = 0; i < N; i++) perm[i + N] = perm[i];
    const v = (x, y, z) => val[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
    const s = (k) => k * k * (3 - 2 * k);
    function ruido(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = s(x - xi), fy = s(y - yi), fz = s(z - zi);
      const m = (a, b, k) => a + (b - a) * k;
      return m(m(m(v(xi, yi, zi), v(xi + 1, yi, zi), fx), m(v(xi, yi + 1, zi), v(xi + 1, yi + 1, zi), fx), fy),
               m(m(v(xi, yi, zi + 1), v(xi + 1, yi, zi + 1), fx), m(v(xi, yi + 1, zi + 1), v(xi + 1, yi + 1, zi + 1), fx), fy), fz);
    }
    return (x, y, z) => 0.55 * ruido(x, y, z) + 0.3 * ruido(x * 2.1 + 5.3, y * 2.1, z * 2.1) + 0.15 * ruido(x * 4.3, y * 4.3 + 9.1, z * 4.3);
  }

  // ---------- o planeta ----------
  // P = { centro, raio, inclina (graus), cores: { escuro, claro, borda, ponto } }
  function criarPlaneta(P, semente) {
    const fbm = criarRuido(semente);
    const folha = document.createElement('canvas'), fg = folha.getContext('2d');
    // pontos da casca (espiral de Fibonacci: espalhados por igual)
    const NP = P.pontos || 2600, pontos = [];
    for (let i = 0; i < NP; i++) {
      const y = 1 - 2 * (i + 0.5) / NP, rr = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
      pontos.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
    }
    const ESC = rgb(P.cores.escuro), CLA = rgb(P.cores.claro), BOR = rgb(P.cores.borda);
    // nuvem no ponto (do planeta, já sem giro): faixas tortas que rodam em volta do eixo
    const nuvem = (q) => {
      const w = fbm(q[0] * 1.3 + 3, q[1] * 1.3, q[2] * 1.3);
      return fbm(q[0] * 1.8 + w * 1.6, q[1] * 4.2 + w * 2.2, q[2] * 1.8 - w * 1.2);
    };
    const eixo = (P.inclina || 0) * Math.PI / 180;
    const paraPlaneta = (n, giro) => giraY(giraZ(n, -eixo), -giro);   // do mundo para o planeta
    const doPlaneta = (q, giro) => giraZ(giraY(q, giro), eixo);         // do planeta para o mundo

    // desenha o planeta: cam = câmera, giro = ângulo (rad), luz = direção da luz no mundo, forca = 0..1
    function desenhar(c, cam, giro, luz, forca, k) {
      const C = cam.proj(P.centro);
      if (C.z <= 0.1 || forca <= 0) return null;
      const R = P.raio * C.s;                                    // raio na tela (aproximado)
      const S = Math.max(16, Math.min(420, Math.ceil(2 * R * k)));
      if (folha.width !== S) { folha.width = S; folha.height = S; }
      const img = fg.createImageData(S, S), d = img.data, Lz = norma(luz);
      const vista = norma(sub(cam.pos, P.centro)), ri = norma(cruz([0, 1, 0], vista)), ui = cruz(vista, ri);
      for (let j = 0; j < S; j++) {
        const ny = 1 - 2 * (j + 0.5) / S;
        for (let i = 0; i < S; i++) {
          const nx = 2 * (i + 0.5) / S - 1, q = nx * nx + ny * ny, o = (j * S + i) * 4;
          if (q >= 1) { d[o + 3] = 0; continue; }
          const nz = Math.sqrt(1 - q);
          const n = [ri[0] * nx + ui[0] * ny + vista[0] * nz, ri[1] * nx + ui[1] * ny + vista[1] * nz, ri[2] * nx + ui[2] * ny + vista[2] * nz];
          const nv = nuvem(paraPlaneta(n, giro));
          const lam = Math.max(0, pe(n, Lz)), luzk = 0.22 + 0.78 * Math.pow(lam, 0.7);
          const cl = limita((nv - 0.22) * 1.9);
          const aro = Math.pow(1 - nz, 3);
          for (let ch = 0; ch < 3; ch++) d[o + ch] = Math.min(255, (ESC[ch] + (CLA[ch] - ESC[ch]) * cl) * luzk + BOR[ch] * aro * 0.9);
          d[o + 3] = Math.round(255 * Math.min(1, (1 - q) * S * 0.25) * forca); // borda lisa
        }
      }
      fg.putImageData(img, 0, 0);
      c.save(); c.globalAlpha = 1; c.imageSmoothingEnabled = true;
      c.drawImage(folha, C.x - R, C.y - R, 2 * R, 2 * R); c.restore();
      // pontos da casca: amarelos, mais fortes do lado da luz e onde a nuvem é clara
      c.save(); c.globalCompositeOperation = 'lighter';
      const [pr, pg, pb] = rgb(P.cores.ponto), tam = Math.max(1.3 / k, R * 0.014);
      for (const p of pontos) {
        const w = doPlaneta(p, giro), X = soma(P.centro, vez(w, P.raio));
        const fr = pe(w, vista); if (fr < 0.08) continue;
        const sp = cam.proj(X), lam = Math.max(0, pe(w, Lz));
        const nv = nuvem(p);
        const a = (0.35 + 0.65 * lam) * (0.5 + 0.5 * limita((nv - 0.2) * 2)) * limita(fr * 3) * forca;
        c.fillStyle = `rgba(${pr},${pg},${pb},${a.toFixed(3)})`;
        c.fillRect(sp.x - tam / 2, sp.y - tam / 2, tam, tam);
      }
      c.restore();
      // borda azul (luz que contorna) e um halo leve
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [w, a] of [[R * 0.16, 0.08], [R * 0.06, 0.25], [R * 0.018, 0.9]]) {
        c.strokeStyle = rgba(P.cores.borda, a * forca); c.lineWidth = w; c.beginPath(); c.arc(C.x, C.y, R * 1.005, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      return { x: C.x, y: C.y, r: R, z: C.z };
    }
    return { desenhar, doPlaneta, eixo };
  }

  // ---------- círculo 3D (anel, órbita): centro, raio, normal; devolve pontos com profundidade ----------
  function circulo(centro, raio, normal, n = 96, a0 = 0, a1 = Math.PI * 2) {
    const nn = norma(normal), t1 = norma(Math.abs(nn[1]) > 0.9 ? cruz(nn, [1, 0, 0]) : cruz(nn, [0, 1, 0])), t2 = cruz(nn, t1);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      pts.push(soma(centro, soma(vez(t1, raio * Math.cos(a)), vez(t2, raio * Math.sin(a)))));
    }
    return { pts, t1, t2, nn };
  }
  const noCirculo = (centro, raio, t1, t2, a) => soma(centro, soma(vez(t1, raio * Math.cos(a)), vez(t2, raio * Math.sin(a))));

  // desenha um caminho 3D; os pedaços escondidos atrás do planeta (disco na tela) ficam fracos
  function caminho(c, cam, pts3, cor, larg, forca, esconde, tracejado) {
    let trecho = [], fraco = null;
    const solta = () => { if (trecho.length > 1) linhaBrilho(c, trecho, cor, larg, forca * (fraco ? 0.15 : 1)); trecho = []; };
    pts3.forEach((X, i) => {
      const p = cam.proj(X); if (p.z <= 0.1) { solta(); return; }
      let atras = false;
      if (esconde) { const dz = p.z - esconde.z; atras = dz > 0 && Math.hypot(p.x - esconde.x, p.y - esconde.y) < esconde.r; }
      if (fraco !== null && atras !== fraco) { const ult = trecho[trecho.length - 1]; solta(); if (ult) trecho.push(ult); }
      fraco = atras;
      if (tracejado && Math.floor(i / tracejado) % 2) { solta(); return; }
      trecho.push([p.x, p.y]);
    });
    solta();
  }

  // ---------- caixa 3D (jipe, bloco): faces escuras, arestas que brilham ----------
  // centro da base, tamanho [w, h, d], giro (rad), cores { face, aresta }, forcaAresta
  function caixa(c, cam, base, tam, giro, cores, forca = 1, larg = 2.5) {
    const [w, h, d] = tam, v = [];
    for (const [sx, sy, sz] of [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]]) {
      v.push(soma(base, giraY([sx * w / 2, sy * h, sz * d / 2], giro)));
    }
    const faces = [[0, 1, 2, 3, -1], [4, 7, 6, 5, 1], [0, 4, 5, 1, 2], [2, 6, 7, 3, 2], [1, 5, 6, 2, 3], [0, 3, 7, 4, 3]];
    const centro = soma(base, [0, h / 2, 0]);
    const vis = [];
    for (const f of faces) {
      const m = vez(soma(soma(v[f[0]], v[f[1]]), soma(v[f[2]], v[f[3]])), 0.25), nrm = norma(sub(m, centro));
      if (pe(nrm, sub(cam.pos, m)) <= 0) continue;
      vis.push({ f, m, sombra: f[4] === 1 ? 1.0 : f[4] === 2 ? 0.7 : 0.5 });
    }
    vis.sort((a, b) => pe(sub(b.m, cam.pos), sub(b.m, cam.pos)) - pe(sub(a.m, cam.pos), sub(a.m, cam.pos)));
    for (const { f, sombra } of vis) {
      const pts = f.slice(0, 4).map((i) => { const p = cam.proj(v[i]); return [p.x, p.y]; });
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
      const [r, g, b] = rgb(cores.face); c.fillStyle = `rgb(${Math.round(r * sombra)},${Math.round(g * sombra)},${Math.round(b * sombra)})`; c.fill();
      linhaBrilho(c, pts, cores.aresta, larg, forca, true);
    }
  }

  window.Mundo = { camera, criarPlaneta, circulo, noCirculo, caminho, caixa, brilho, linhaBrilho, criarRuido, rgb, rgba,
    vet: { sub, soma, vez, pe, cruz, norma, giraY, giraZ } };
})();
