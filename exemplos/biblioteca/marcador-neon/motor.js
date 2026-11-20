// MOTOR "marcador-neon" — desenho de marcador azul e giz de cera laranja neon, fotografado no papel.
// Jeito de animar: desenho quadro a quadro "em três" (cada desenho fica 3 quadros). Todo desenho é
// feito de novo: a linha do marcador treme (boil), o rabisco do giz muda e o dente do papel também.
// Quatro materiais só: marcador azul grosso de ponta redonda (escurece onde dois riscos se cruzam),
// giz de cera laranja neon (rabisco numa só diagonal, com pontinhos de papel aparecendo, sem contorno),
// marcador rosa pequeno e caneta preta fina. Quase tudo fica papel em branco. Câmera parada.
// O motor sabe desenhar uma pessoa sentada numa cadeira baixa, a cadeira, um vaso e o título;
// ONDE fica cada peça e QUANDO cada ação acontece vem de historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio, rgb } = Filme;
  const L = 1920, A = 1080;
  const TAU = Math.PI * 2;

  // ---------- sorteio sem memória: o mesmo par de números dá sempre o mesmo valor ----------
  function h2(a, b) {
    let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d); v = Math.imul(v ^ (v >>> 12), 0x297a2d39);
    return ((v ^ (v >>> 15)) >>> 0) / 4294967296;
  }
  // ruído macio em 2 dimensões (de 0 a 1)
  function vn(x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => h2(ix + i + s * 1013, iy + j - s * 7919);
    return mistura(mistura(g(0, 0), g(1, 0), ux), mistura(g(0, 1), g(1, 1), ux), uy);
  }
  // um "calombo" de 0 a 1 a 0 dentro de [a, a+d]
  const calombo = (t, a, d) => (t <= a || t >= a + d) ? 0 : Math.sin(Math.PI * (t - a) / d);
  const gira = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const soma = (p, q) => [p[0] + q[0], p[1] + q[1]];

  // ---------- formas em pontos ----------
  function elipse(cx, cy, rx, ry, n = 28, a0 = 0) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = a0 + TAU * i / n; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return p;
  }
  function arco(cx, cy, rx, ry, g0, g1, n = 12) {
    const p = [];
    for (let i = 0; i <= n; i++) { const a = (g0 + (g1 - g0) * i / n) * Math.PI / 180; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return p;
  }
  // tubo (perna, manga): linha do meio com largura que vai de w0 a w1 -> contorno fechado
  function tubo(meio, w0, w1) {
    const esq = [], dir = [], n = meio.length;
    for (let i = 0; i < n; i++) {
      const a = meio[Math.max(0, i - 1)], b = meio[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const w = mistura(w0, w1, i / (n - 1)) / 2;
      esq.push([meio[i][0] - dy * w, meio[i][1] + dx * w]); dir.push([meio[i][0] + dy * w, meio[i][1] - dx * w]);
    }
    return esq.concat(dir.reverse());
  }
  // braço de duas partes: acha o cotovelo (dobra para baixo)
  function cotovelo(S, M, l1, l2, lado = 1) {
    const dx = M[0] - S[0], dy = M[1] - S[1], d = limita(Math.hypot(dx, dy), 1, l1 + l2 - 0.5);
    const a = Math.atan2(dy, dx), b = Math.acos(limita((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    return [S[0] + l1 * Math.cos(a + lado * b), S[1] + l1 * Math.sin(a + lado * b)];
  }

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 6,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const k = largura / L;
      const C = Object.assign({ papel: '#efe9dc', azul: '#1d3fd6', laranja: '#ff6414', rosa: '#ff3fa4', preto: '#1d1b22' }, H.cores || {});
      const TR = Object.assign({ marcador: 10, caneta: 3.2, tremor: 2.6 }, H.traco || {});
      const SEM = H.semente || 1, SEG = H.segurar || 3;
      const pecas = H.pecas || [];
      const c = tela.getContext('2d');

      // ================= PAPEL (feito uma vez): dente do papel prensado a frio + luz de janela =================
      // Três folhas diferentes: cada desenho é fotografado numa folha nova, então o dente muda a cada pose.
      const W = largura, Hh = altura;
      const celula = Math.max(1.2, 3.4 * k), celula2 = Math.max(2.5, 11 * k);
      const P0 = rgb(C.papel);
      function fazPapel(s) {
        const alt = new Float32Array((W + 1) * (Hh + 1));
        for (let y = 0; y <= Hh; y++) for (let x = 0; x <= W; x++)
          alt[y * (W + 1) + x] = 0.62 * vn(x / celula, y / celula, s) + 0.38 * vn(x / celula2, y / celula2, s + 5);
        const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
        const dt = document.createElement('canvas'); dt.width = W; dt.height = Hh;
        const ip = cv.getContext('2d').createImageData(W, Hh), id = dt.getContext('2d').createImageData(W, Hh);
        for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
          const i = y * (W + 1) + x, h = alt[i], rel = h - alt[i + W + 2];          // luz vem de cima, à esquerda
          const u = x / W - 0.3, v = y / Hh - 0.25;
          const luz = 1.03 - 0.17 * Math.min(1, u * u * 1.1 + v * v * 1.4);       // a janela clareia o canto de cima
          const f = luz * (1 + 0.3 * rel + 0.04 * (h - 0.5));
          const o = (y * W + x) * 4;
          ip.data[o] = limita(P0[0] * f, 0, 255); ip.data[o + 1] = limita(P0[1] * f, 0, 255); ip.data[o + 2] = limita(P0[2] * f * 0.985, 0, 255); ip.data[o + 3] = 255;
          // onde o papel é mais alto, o giz não pega: vira pontinho de papel no meio do laranja
          id.data[o + 3] = 255 * limita((h - 0.63) / 0.14);
        }
        cv.getContext('2d').putImageData(ip, 0, 0); dt.getContext('2d').putImageData(id, 0, 0);
        return { papel: cv, dente: dt };
      }
      const FOLHAS = [fazPapel(SEM * 3 + 1), fazPapel(SEM * 3 + 2), fazPapel(SEM * 3 + 3)];
      const cam = document.createElement('canvas'); cam.width = W; cam.height = Hh;
      const g = cam.getContext('2d');

      // ---------- estado de UM quadro (refeito no começo de cada desenhar) ----------
      let P = 0, tq = 0, folha = FOLHAS[0], idTraco = 0, gizes = [];

      // arredonda os cantos (Chaikin): o marcador não faz quina de polígono
      function liso(pts, fechado, voltas = 2) {
        let p = pts;
        for (let v = 0; v < voltas; v++) {
          const q = [], n = p.length, m = fechado ? n : n - 1;
          if (!fechado) q.push(p[0]);
          for (let i = 0; i < m; i++) {
            const a = p[i], b = p[(i + 1) % n];
            q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
          }
          if (!fechado) q.push(p[n - 1]);
          p = q;
        }
        return p;
      }
      // a linha treme: pontos a cada 12 px, cada um empurrado por um ruído que muda a cada pose
      function treme(pts, id, amp, fechado) {
        const src = fechado ? pts.concat([pts[0]]) : pts, out = [];
        let dd = 0;
        for (let i = 0; i < src.length; i++) {
          const [x, y] = src[i];
          if (i > 0) {
            const [ax, ay] = src[i - 1], d = Math.hypot(x - ax, y - ay), n = Math.max(1, Math.ceil(d / 12));
            for (let j = 1; j <= n; j++) {
              const px = ax + (x - ax) * j / n, py = ay + (y - ay) * j / n, s = dd + d * j / n;
              out.push([px + amp * (2 * vn(s / 60, P, id * 7 + 1) - 1), py + amp * (2 * vn(s / 60, P, id * 7 + 2) - 1)]);
            }
            dd += d;
          } else out.push([x + amp * (2 * vn(0, P, id * 7 + 1) - 1), y + amp * (2 * vn(0, P, id * 7 + 2) - 1)]);
        }
        return out;
      }
      function caminho(ctx, p) {
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
        ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      }
      // ---------- marcador (e caneta): multiplica sobre o papel, então dois riscos que se cruzam escurecem ----------
      function marca(pts, o = {}) {
        const id = ++idTraco, cor = o.cor || C.azul, w = o.larg ?? TR.marcador;
        const base = (pts.length > 2 && o.liso !== false) ? liso(pts, o.fechado) : pts;
        const p = treme(base, id, o.amp ?? TR.tremor, o.fechado);
        c.save();
        c.globalCompositeOperation = 'multiply'; c.lineCap = 'round'; c.lineJoin = 'round';
        // por cima do giz o marcador continua azul (cera não deixa a tinta entrar); onde dois riscos
        // se cruzam, uma segunda passada multiplicada escurece
        c.strokeStyle = cor; c.lineWidth = w; caminho(c, p);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.86 * (o.alfa ?? 0.9) / 0.9; c.stroke();
        c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.3 * (o.alfa ?? 0.9) / 0.9; c.stroke();
        if (!o.fechado && o.pontas !== false) {            // a tinta junta na ponta onde o marcador parou
          c.fillStyle = cor; c.globalAlpha = 0.25;
          for (const q of [p[0], p[p.length - 1]]) { c.beginPath(); c.arc(q[0], q[1], w * 0.42, 0, TAU); c.fill(); }
        }
        c.restore();
      }
      const caneta = (pts, o = {}) => marca(pts, Object.assign({ cor: C.preto, larg: Math.max(TR.caneta, 1.1 / k), amp: 1.2, alfa: 0.92, pontas: false }, o));
      // tapa com papel o que está atrás (perna de trás, linha da cadeira): a peça da frente é papel em branco
      function tapa(pts) {
        pts = liso(pts, true);
        c.save(); c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.drawImage(folha.papel, 0, 0); c.restore();
      }
      // área cheia de marcador: voltas do marcador lado a lado, cada volta escurece onde encosta na outra
      function enche(pts, ang, o = {}) {
        const id = ++idTraco, w = o.larg ?? TR.marcador * 1.4, cor = o.cor || C.azul;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + w;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        c.save(); caminho(c, treme(pts, id, 2, true)); c.clip();
        c.globalCompositeOperation = 'multiply'; c.lineCap = 'round'; c.strokeStyle = cor; c.lineWidth = w;
        let i = 0;
        for (let s = -R; s <= R; s += w * 0.72, i++) {
          const j = 2.5 * (2 * h2(i + id * 31, P) - 1), px = cx - dy * (s + j), py = cy + dx * (s + j);
          c.globalAlpha = 0.62 + 0.2 * h2(i, P + id);
          c.beginPath(); c.moveTo(px - dx * R, py - dy * R); c.lineTo(px + dx * R, py + dy * R); c.stroke();
        }
        c.restore();
        marca(pts, { fechado: true, cor });
      }
      // giz de cera: só anota a forma agora; o rabisco é feito todo junto numa camada e colado depois
      function giz(pts, o = {}) { gizes.push({ pts, m: c.getTransform(), ang: o.ang ?? -0.95, id: ++idTraco, tapa: o.tapa !== false }); }
      function gizCola() {
        if (!gizes.length) return;
        for (const f of gizes) if (f.tapa) { c.save(); c.setTransform(f.m); tapa(f.pts); c.restore(); }
        g.reset();
        for (const f of gizes) {
          g.save(); g.setTransform(f.m);
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          for (const [x, y] of f.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
          const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 8;
          caminho(g, treme(f.pts, f.id, 5, true)); g.clip();
          g.fillStyle = C.laranja; g.globalAlpha = 0.3; g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
          const dx = Math.cos(f.ang), dy = Math.sin(f.ang);
          g.strokeStyle = C.laranja; g.lineCap = 'round';
          let i = 0;
          for (let s = -R; s <= R; s += 5.5, i++) {              // rabisco numa diagonal só
            const r1 = h2(i * 3 + f.id * 101, P), r2 = h2(i * 5 + 7, P + f.id * 13);
            const j = 3 * (2 * r1 - 1), px = cx - dy * (s + j), py = cy + dx * (s + j);
            const a = -R * (0.85 + 0.3 * r2), b = R * (0.85 + 0.3 * r1);
            g.globalAlpha = 0.55 + 0.45 * r2; g.lineWidth = 3.8 + 2.6 * r1;
            g.beginPath(); g.moveTo(px + dx * a, py + dy * a); g.lineTo(px + dx * b, py + dy * b); g.stroke();
          }
          g.restore();
        }
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.8; g.globalCompositeOperation = 'destination-out';
        g.drawImage(folha.dente, 0, 0);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 1; c.drawImage(cam, 0, 0); c.restore();
        gizes = [];
      }

      // ================= PEÇAS =================
      // ----- título: letras em traço de marcador, escritas no começo e tiradas depois -----
      function titulo(p) {
        if (!H.titulo || tq < (p.de || 0) || tq >= p.ate) return;
        const tam = p.tamanho || 60, txt = H.titulo.toUpperCase();
        const glifos = [...txt].map((ch) => Letras.letra(ch));
        const total = glifos.reduce((n, gl) => n + (gl ? gl.tracos.length : 0), 0);
        const feitos = Math.ceil(total * limita(trecho(tq, p.de || 0, p.escreve ?? 0.6) + 1e-6));
        let px = p.x, n = 0;
        for (const gl of glifos) {
          if (!gl) { px += 0.42 * tam; continue; }
          for (const tr of gl.tracos) {
            if (n++ >= feitos) return;
            marca(tr.map(([a, b]) => [px + a * tam, p.y - tam + b * tam]), { larg: TR.marcador * 0.95, amp: 1.6, liso: false });
          }
          px += (gl.w + 0.22) * tam;
        }
      }

      // ----- vaso com cacto e flor rosa -----
      function vaso(p) {
        c.save(); c.translate(p.x, p.y); c.scale(p.escala || 1, p.escala || 1);
        const corpo = [[-34, -128], [-36, -250], [-34, -340], [-22, -392], [0, -404], [22, -392], [34, -340], [36, -250], [34, -128]];
        marca(corpo);
        marca([[-34, -222], [-70, -222], [-86, -240], [-88, -292], [-76, -308], [-62, -294], [-60, -254], [-35, -252]]);
        marca([[35, -266], [66, -266], [80, -282], [82, -330], [70, -344], [57, -330], [55, -296], [36, -296]]);
        marca([[-8, -380], [-10, -250], [-8, -140]], { larg: TR.marcador * 0.6, alfa: 0.7 });
        marca([[12, -372], [13, -250], [12, -140]], { larg: TR.marcador * 0.6, alfa: 0.7 });
        // espinhos de caneta
        const r = sorteio(SEM + 77);
        for (let i = 0; i < 16; i++) {
          const lado = i % 2 ? 1 : -1, y = -150 - 230 * r(), x = lado * 36 + 6 * lado;
          caneta([[x, y], [x + lado * 13, y - 6]]);
        }
        tapa([[-62, -132], [62, -132], [44, 0], [-44, 0]]);
        marca([[-62, -132], [62, -132], [62, -110], [-62, -110]], { fechado: true });
        marca([[-55, -110], [-42, 0], [42, 0], [55, -110]]);
        if (p.flor) {
          // flor de marcador rosa: pétalas em voltinha e miolo de giz
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + TAU * i / 5 + 0.15 * Math.sin(P * 0.7);
            const cx = 16 * Math.cos(a), cy = -412 + 12 * Math.sin(a);
            marca(elipse(cx, cy, 11, 8, 12, a), { cor: C.rosa, larg: TR.marcador * 0.75, fechado: true });
          }
          giz(elipse(0, -412, 9, 8, 12), { tapa: false });
        }
        c.restore();
      }

      // ----- cadeira baixa de lona -----
      function cadeira(p) {
        c.save(); c.translate(p.x, p.y); c.scale(p.escala || 1, p.escala || 1);
        marca([[148, 168], [214, -292], [232, -304], [252, -292], [186, 162]]);
        marca([[-205, 168], [195, 158]]);
        marca([[-195, 186], [180, 178]], { larg: TR.marcador * 0.8 });
        marca([[-150, 186], [-188, 272]]); marca([[-138, 186], [-82, 270]]);
        marca([[118, 180], [78, 270]]); marca([[132, 180], [192, 270]]);
        c.restore();
      }

      // ----- a pessoa sentada -----
      function pessoa(p) {
        const cp = p.copo || {}, cb = p.cabeca || {}, pe = p.pe || {};
        const so = cp.sobe || [0.9, 1.5], de = cp.desce || [2.6, 3.1], fr = cb.frente || so, tr = cb.tras || [3.1, 3.45], vo = cb.volta || [3.9, 4.3];
        const golesT = cp.goles || [], durPe = pe.dur || 0.42;
        // ângulo da cabeça (negativo = vai para a frente)
        function angCab(t) {
          let a = -0.08 * suave(trecho(t, fr[0], fr[1])) * (1 - suave(trecho(t, de[0], de[1])));
          for (const gt of golesT) a -= 0.03 * calombo(t, gt, 0.3);
          a += 0.17 * suave(trecho(t, tr[0], tr[1])) * (1 - suave(trecho(t, vo[0], vo[1])));
          if (p.olha != null) a += 0.04 * suave(trecho(t, p.olha, p.olha + 0.2));
          return a;
        }
        const anguloPe = (t) => (pe.balancos || []).reduce((s, b) => s + 0.12 * calombo(t, b, durPe), 0);
        const N = [-30, -170], CAB = [-18, -128], BOCA = [-66, 48], EC = 1.3;   // EC: tamanho da cabeça
        const aC = angCab(tq);
        const posCab = soma(N, gira(CAB, aC));
        const boca = soma(posCab, gira([BOCA[0] * EC, BOCA[1] * EC], aC));
        // copo: no colo -> canudo encostado na boca
        const CANUDO = [46, -132];                               // da metade do copo até a ponta do canudo
        const repouso = [-232, -40], alvo = [boca[0] - CANUDO[0], boca[1] - CANUDO[1] + 4];
        let kc = suave(trecho(tq, so[0], so[1])) * (1 - suave(trecho(tq, de[0], de[1])));
        let copo = [mistura(repouso[0], alvo[0], kc), mistura(repouso[1], alvo[1], kc)];
        const naBoca = kc > 0.97;
        const mao = [copo[0] + 14, copo[1] + 18], OMBRO = [40, -112], pulso = [mao[0] + 32, mao[1] + 4];
        const cot = cotovelo(OMBRO, pulso, 155, 150, -1);

        c.save(); c.translate(p.x, p.y); c.scale(p.escala || 1, p.escala || 1);
        // --- pernas: a de baixo, o tênis dela, a de cima (cruzada) e o tênis dela ---
        const perna = (meio, aPe, flop) => {
          const forma = tubo(meio, 94, 80);
          tapa(forma); marca(forma, { fechado: true });
          const n = meio.length, A1 = meio[n - 1], A0 = meio[n - 2];
          const dir = Math.atan2(A1[1] - A0[1], A1[0] - A0[0]);
          // dobra da barra
          c.save(); c.translate(A1[0], A1[1]); c.rotate(dir);
          tapa([[-30, -45], [6, -46], [6, 46], [-30, 45]]);
          marca([[-30, -45], [6, -46], [6, 46], [-30, 45]], { fechado: true });
          c.restore();
          // vinco do joelho
          const K = meio[Math.floor(n / 2)];
          marca([[K[0] + 10, K[1] - 22], [K[0] - 18, K[1] - 6]], { larg: TR.marcador * 0.8 });
          tenis(A1, dir, aPe, flop);
        };
        const tenis = (A1, dir, aPe, flop) => {
          c.save(); c.translate(A1[0], A1[1]); c.rotate(dir - Math.PI + 0.1 + aPe); c.scale(1.15, 1.15);
          // o tênis com a sola virada para a esquerda e a ponta para cima
          const sapato = [[28, 22], [-10, 44], [-60, 40], [-96, 6], [-112, -50], [-104, -112], [-76, -142], [-44, -128], [-24, -80], [4, -40], [26, -12]];
          tapa(sapato); marca(sapato, { fechado: true });
          marca([[-50, 30], [-84, 2], [-98, -50], [-92, -110]], { larg: TR.marcador * 0.6, alfa: 0.75 });  // beira da sola
          marca([[-100, -96], [-80, -100], [-62, -128]], { larg: TR.marcador * 0.75 });                   // biqueira
          // cadarço rosa em zigue-zague e o laço que balança
          const z = []; for (let i = 0; i < 6; i++) z.push([-20 - 7 * i + (i % 2 ? 10 : -6), -36 - 13 * i]);
          marca(z, { cor: C.rosa, larg: TR.marcador * 0.55 });
          c.save(); c.translate(-14, -30); c.rotate(flop);
          marca(elipse(-14, -10, 14, 8, 12, -0.6), { cor: C.rosa, larg: TR.marcador * 0.6, fechado: true });
          marca(elipse(12, -12, 13, 8, 12, 0.5), { cor: C.rosa, larg: TR.marcador * 0.6, fechado: true });
          marca([[0, -2], [-12, 22]], { cor: C.rosa, larg: TR.marcador * 0.55 });
          marca([[0, -2], [10, 24]], { cor: C.rosa, larg: TR.marcador * 0.55 });
          c.restore();
          c.restore();
        };
        // laço: sacode atrasado em relação ao pé e assenta devagar
        const flopDe = (t) => {
          let f = 4 * (anguloPe(t - 0.12) - anguloPe(t));
          for (const b of (pe.balancos || [])) { const u = t - b - durPe; if (u > 0) f += 0.22 * Math.sin(TAU * u / 0.3) * Math.exp(-u / 0.22); }
          return limita(f, -0.7, 0.7);
        };
        perna([[-110, 135], [-270, 128], [-405, 85], [-495, 180], [-560, 270]], 0, 0.1);
        const aP = anguloPe(tq), JOELHO = [-400, 54];
        const canela = [[-400, 54], [-520, 52], [-640, 50]].map((q) => soma(JOELHO, gira([q[0] - JOELHO[0], q[1] - JOELHO[1]], aP)));
        perna([[-95, 82], [-260, 70], ...canela], aP * 1.4, flopDe(tq));

        // --- corpo: suéter grande de giz laranja sem contorno, só vincos azuis ---
        const tronco = [[-45, -172], [-118, -150], [-158, -82], [-166, 10], [-150, 92], [-112, 150], [-20, 172], [80, 168], [148, 128], [166, 40], [160, -50], [128, -130], [62, -176]];
        giz(tronco);
        const gola = elipse(-12, -170, 72, 30, 18);
        giz(gola);
        const manga = tubo([OMBRO, [mistura(OMBRO[0], cot[0], 0.5), mistura(OMBRO[1], cot[1], 0.5)], cot, [mistura(cot[0], pulso[0], 0.5), mistura(cot[1], pulso[1], 0.5)], pulso], 92, 70);
        giz(manga, { ang: -0.9 });
        gizCola();
        // vincos azuis do suéter
        marca([[-74, -186], [-10, -194], [50, -184]], { larg: TR.marcador * 0.85 });
        marca([[-70, -158], [-12, -150], [52, -160]], { larg: TR.marcador * 0.85 });
        marca([[-140, 70], [-60, 84]]);
        marca([[118, 50], [136, 128]]);
        marca([[-100, 150], [10, 160]]);
        // a manga: linha de baixo e o punho
        const ang = Math.atan2(pulso[1] - cot[1], pulso[0] - cot[0]);
        c.save(); c.translate(cot[0], cot[1]); c.rotate(ang);
        marca([[-30, 30], [40, 34], [100, 28]]);
        c.restore();
        c.save(); c.translate(pulso[0], pulso[1]); c.rotate(ang);
        marca([[-8, -32], [-4, 34]]);
        c.restore();

        // --- cabeça ---
        c.save(); c.translate(posCab[0], posCab[1]); c.rotate(aC); c.scale(EC, EC);
        marca([[-40, 76], [-36, 118]]); marca([[34, 64], [28, 112]]);        // pescoço
        tapa([[-58, -40], [-72, -10], [-74, 12], [-70, 40], [-60, 66], [-38, 84], [-4, 86], [30, 70], [60, 20], [40, -60]]);
        marca([[-58, -36], [-72, -12], [-74, 10], [-70, 38], [-60, 64], [-38, 82], [-5, 84], [28, 70], [46, 46]]);
        // nariz e orelha de giz
        giz([[-66, -14], [-100, 16], [-96, 32], [-64, 30]], { ang: -0.95 });
        giz(elipse(50, 14, 14, 21, 14), { ang: -0.95 });
        gizCola();
        marca(arco(50, 14, 7, 11, -60, 120, 8), { larg: TR.marcador * 0.55 });
        // brinco rosa que balança atrasado
        const brinco = limita(3 * (angCab(tq - 0.12) - aC), -0.6, 0.6);
        c.save(); c.translate(52, 36); c.rotate(brinco);
        marca([[0, 0], [0, 14]], { cor: C.rosa, larg: TR.marcador * 0.5 });
        marca(elipse(0, 24, 8, 8, 10), { cor: C.rosa, larg: TR.marcador * 0.6, fechado: true });
        c.restore();
        // cabelo: cachos de caneta preta (cada cachinho é uma voltinha)
        const tremeC = 1.4;
        for (let i = 0; i < CACHOS.length; i++) {
          const [x, y, r, a] = CACHOS[i];
          const jx = tremeC * (2 * h2(i, P * 3 + 1) - 1), jy = tremeC * (2 * h2(i + 999, P * 3 + 2) - 1);
          c.save(); c.globalCompositeOperation = 'multiply'; c.strokeStyle = C.preto; c.globalAlpha = 0.9;
          c.lineWidth = Math.max(TR.caneta, 1.1 / k); c.lineCap = 'round';
          c.beginPath(); c.ellipse(x + jx, y + jy, r, r * 0.8, a, 0.3, TAU + 0.1 + 0.6 * h2(i, P)); c.stroke();
          c.restore();
        }
        // faixa azul cheia no cabelo
        tapa([[-50, -60], [-36, -98], [4, -128], [48, -140], [62, -116], [20, -104], [-8, -84], [-26, -52]]);
        enche([[-50, -60], [-36, -98], [4, -128], [48, -140], [62, -116], [20, -104], [-8, -84], [-26, -52]], -0.65);
        // olhos: pontinho, piscada (arquinho) e olhada para o lado
        const fechado = (p.piscar || []).some((b) => tq >= b && tq < b + 0.2) || (p.engole != null && tq >= p.engole - 0.15 && tq < vo[0]);
        const olhada = p.olha != null ? 7 * suave(trecho(tq, p.olha, p.olha + 0.1)) : 0;
        for (const [ex, ey] of [[-54, -4], [-24, -2]]) {
          if (fechado) caneta(arco(ex, ey - 2, 9, 7, 20, 160, 8));
          else {
            c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = C.preto; c.globalAlpha = 0.92;
            c.beginPath(); c.arc(ex + olhada + 1.2 * (2 * h2(ex, P) - 1), ey, 6, 0, TAU); c.fill(); c.restore();
          }
          caneta([[ex - 11, ey - 22], [ex + 1, ey - 27], [ex + 11, ey - 22]]);       // sobrancelha
        }
        // boca: risquinho; no canudo vira um "o"; engolindo fica apertada
        if (naBoca) {
          marca(elipse(BOCA[0], BOCA[1], 7, 6, 10), { fechado: true, larg: TR.marcador * 0.6 });
          const sugando = golesT.some((gt) => tq >= gt && tq < gt + 0.3);
          if (sugando) marca(arco(-38, 36, 10, 12, 100, 200, 6), { larg: TR.marcador * 0.5 });   // bochecha chupada
        } else marca([[-64, 48], [-48, 50]], { larg: TR.marcador * 0.75 });
        c.restore();

        // gole descendo pela garganta (um calombinho que desce o pescoço)
        if (p.engole != null && tq >= p.engole && tq < p.engole + 0.3) {
          const u = trecho(tq, p.engole, p.engole + 0.3);
          c.save(); c.translate(posCab[0], posCab[1]); c.rotate(aC); c.scale(EC, EC);
          marca(arco(-42, 86 + 26 * u, 6, 6, 100, 260, 6), { larg: TR.marcador * 0.55 });
          c.restore();
        }

        // --- copo com tampa e canudo rosa, e a mão em volta ---
        c.save(); c.translate(copo[0], copo[1]);
        marca([[-4, -58], [CANUDO[0] * 0.55, -58 + (CANUDO[1] + 58) * 0.55], [CANUDO[0], CANUDO[1]]], { cor: C.rosa, larg: TR.marcador * 0.85 });
        const corpoCopo = [[-36, -54], [36, -54], [27, 56], [-27, 56]];
        tapa(corpoCopo); marca(corpoCopo, { fechado: true, liso: false });
        tapa([[-40, -54], [-32, -70], [32, -70], [40, -54]]);
        marca([[-42, -54], [-34, -70], [34, -70], [42, -54], [-42, -54]], { liso: false });
        // a mão: palma à direita e dedos que abraçam o copo
        const palma = [[26, -16], [48, -4], [52, 30], [30, 48], [-24, 46], [-30, 32], [-30, -14]];
        tapa(palma);
        marca([[24, -18], [46, -6], [52, 28], [30, 46]]);
        for (const y of [-8, 10, 28]) marca([[30, y], [-22, y - 2], [-30, y + 6], [-18, y + 14], [28, y + 14]], { larg: TR.marcador * 0.8 });
        c.restore();
        c.restore();
      }

      // cachos do cabelo: sorteados uma vez (mesma semente = mesmo cabelo), dentro de dois círculos
      const CACHOS = [];
      {
        const r = sorteio(SEM * 11 + 5);
        const dentro = (x, y) => (Math.hypot(x - 46, y + 52) < 78 || Math.hypot(x - 6, y + 124) < 44) && !(x < 14 && y > -34) && Math.hypot(x - 50, y - 16) > 28;
        let tent = 0;
        while (CACHOS.length < 210 && tent++ < 5000) {
          const x = -50 + 175 * r(), y = -172 + 210 * r();
          if (dentro(x, y)) CACHOS.push([x, y, 6 + 5 * r(), TAU * r()]);
        }
      }

      const DESENHA = { titulo, vaso, cadeira, pessoa };

      function desenhar(t) {
        c.reset();
        const q = Math.round(t * fps);
        P = Math.floor(q / SEG); tq = P * SEG / fps;        // "em três": a pose e o tempo andam juntos
        folha = FOLHAS[((P % 3) + 3) % 3]; idTraco = 0; gizes = [];
        c.drawImage(folha.papel, 0, 0);
        c.setTransform(k, 0, 0, k, 0, 0);
        // a folha mexe um fio a cada desenho (registro de papel na mesa de animação)
        c.translate(1.2 * (2 * h2(P, 5) - 1), 1.2 * (2 * h2(P, 6) - 1));
        for (const p of pecas) if (DESENHA[p.tipo]) DESENHA[p.tipo](p);
        c.setTransform(1, 0, 0, 1, 0, 0);
        // luz de janela caindo para os cantos (por cima de tudo, como na foto)
        const v = c.createRadialGradient(W * 0.32, Hh * 0.22, Math.min(W, Hh) * 0.2, W * 0.5, Hh * 0.5, Math.hypot(W, Hh) * 0.62);
        v.addColorStop(0, 'rgba(255,250,240,0)'); v.addColorStop(1, 'rgba(120,105,90,0.22)');
        c.globalCompositeOperation = 'multiply'; c.fillStyle = v; c.fillRect(0, 0, W, Hh);
        c.globalCompositeOperation = 'source-over';
      }

      // ---------- som: piano elétrico preguiçoso e baixo, e um som pequeno em cada ação ----------
      function som() {
        const s = Som.criar(duracao, SEM), M = H.musica || {};
        for (const [t0, notas, d] of (M.acordes || [])) notas.forEach((n, i) => {
          s.sino(n, t0 + i * 0.03, d * 1.6, { vol: 0.07, brilho: 0.9, pan: -0.2 + 0.13 * i });
          s.nota(n, t0 + i * 0.03, d * 0.7, { vol: 0.025, forma: 'tri', ataque: 0.01, solta: 0.5, vibrato: 0.004, vibratoHz: 4.5 });
        });
        for (const [n, t0, d] of (M.baixo || [])) s.nota(n, t0, d, { vol: 0.2, forma: 'seno', ataque: 0.02, solta: 0.25 });
        for (const p of pecas) {
          if (p.tipo === 'titulo') for (let t = (p.de || 0) + 0.05; t < (p.escreve ?? 0.6); t += 0.1) s.toque(t, { vol: 0.012, corte: 2600, dur: 0.05 });
          if (p.tipo !== 'pessoa') continue;
          const cp = p.copo || {};
          if (cp.sobe) s.vento(cp.sobe[0], cp.sobe[1] - cp.sobe[0], { vol: 0.02, corte: 1400, onda: 1, entra: 0.1, sai: 0.2 });
          for (const gt of (cp.goles || [])) {                  // canudinho: chiado com bolha
            s.vento(gt, 0.32, { vol: 0.07, corte: 2200, onda: 11, profundidade: 0.9, entra: 0.04, sai: 0.1 });
            s.pio(gt + 0.03, { freq: 700, sobe: 0.8, repete: 3, intervalo: 0.09, dur: 0.06, vol: 0.05 });
          }
          if (cp.desce) s.toque(cp.desce[1], { vol: 0.05, corte: 1200, dur: 0.05 });
          if (p.engole != null) { s.batida(p.engole, { vol: 0.32, freq: 230, dur: 0.14 }); s.batida(p.engole + 0.05, { vol: 0.18, freq: 140, dur: 0.1 }); }
          const pe = p.pe || {}, dur = pe.dur || 0.42;
          for (const b of (pe.balancos || [])) { s.batida(b + dur, { vol: 0.3, freq: 95, dur: 0.12 }); s.toque(b + dur, { vol: 0.05, corte: 900, dur: 0.05 }); }
          for (const b of (p.piscar || [])) s.toque(b, { vol: 0.01, corte: 6000, dur: 0.01 });
          if (p.olha != null) { s.toque(p.olha, { vol: 0.08, corte: 7000, dur: 0.012 }); s.sino('E7', p.olha, 0.25, { vol: 0.03, brilho: 0.5 }); }
        }
        s.sala(0.3);
        return s.fim({ entra: 0.15, sai: 0.4, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
