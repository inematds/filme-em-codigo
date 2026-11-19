// MOTOR "guache-hachurado" — ilustração de guache e lápis de cor feita quase só de hachura.
// Jeito de animar: camadas planas. Formas enormes e simples (árvores, morros, faixas de chão, água e
// céu) enchem quase todo o quadro, em fileiras de profundidade; figuras pequenas agem numa tira embaixo.
// Cada forma grande é uma silhueta chapada, sem contorno, e o volume vem de milhares de traços curtos e
// um pouco curvos que descem seguindo a forma, como pelo escovado: claros do lado da luz, escuros do
// lado da sombra, mais fundos na base. Longe = mais chapado e mais azulado.
// Ritmo: a hachura é redesenhada de três em três quadros (tremeluz), as figuras mexem de dois em dois,
// o vento passa em ondas pelos traços e a câmera anda lisa, com paralaxe entre as fileiras.
// O motor não sabe a história: cores, peças, lugares, tempos e notas vêm do historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, hex, cor, ruido } = Filme;
  const L = 1920, A = 1080, TAU = Math.PI * 2;
  const NB = 10;                              // quantos tons de traço por forma (um caminho por tom)

  // sorteio sem memória: o mesmo par de números dá sempre o mesmo valor (de 0 a 1)
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
  function novaTela(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h)); return cv; }

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 9,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;                 // a tela real pode ser menor (os testes usam 640x360)
      const C = H.cores || {};
      // uma cor pode vir pelo nome (das cores da história) ou direto em '#rrggbb'
      const tom = (v) => (typeof v === 'string' && v[0] === '#') ? v : (C[v] || '#808080');
      const SEM = H.semente || 1;
      const SEG = Object.assign({ hachura: 3, figuras: 2 }, H.segurar || {});
      const CAMADAS = H.camadas || {};
      const VENTO = Object.assign({ forca: 1, onda: 700, velocidade: 0.35, balanco: 0.2 }, H.vento || {});
      const pecas = H.pecas || [];
      const deTipo = (tipo) => pecas.filter((p) => p.tipo === tipo);

      // escala atual (pixels de tela por unidade de desenho): linha nunca abaixo de 1 pixel
      let ESC = k;
      const fio = (w) => Math.max(w, 1 / ESC);

      // ---------- câmera: cada medida (x, y, zoom) anda entre as marcas que a definem ----------
      const MARCAS = H.camera && H.camera.length ? H.camera : [{ t: 0, x: 960, y: 540, zoom: 1 }];
      function medida(nome, t, padrao) {
        const K = MARCAS.filter((m) => m[nome] !== undefined);
        if (!K.length) return padrao;
        if (t <= K[0].t) return K[0][nome];
        for (let i = 0; i < K.length - 1; i++) {
          if (t <= K[i + 1].t) return mistura(K[i][nome], K[i + 1][nome], suave(trecho(t, K[i].t, K[i + 1].t)));
        }
        return K[K.length - 1][nome];
      }
      const camera = (t) => ({ x: medida('x', t, 960), y: medida('y', t, 540), zoom: medida('zoom', t, 1) });
      let CAMQ = camera(0);
      const fator = (p) => (typeof p === 'number' ? p : (CAMADAS[p] ?? 1));
      // cada fileira anda uma fração da câmera: é a paralaxe (1 = anda junto; 0,5 = metade)
      function camada(p) {
        p = fator(p);
        const z = 1 + (CAMQ.zoom - 1) * p, cx = 960 + (CAMQ.x - 960) * p, cy = 540 + (CAMQ.y - 540) * p;
        ESC = z * k;
        c.setTransform(ESC, 0, 0, ESC, k * 960 - cx * ESC, k * 540 - cy * ESC);
        return { z, cx, cy };
      }
      // onde um ponto da cena cai na tela (de -1 a 1 na largura), para o som saber de que lado vem
      function ladoNaTela(x, p, t) {
        const cam = camera(t); p = fator(p);
        const z = 1 + (cam.zoom - 1) * p, cx = 960 + (cam.x - 960) * p;
        return limita(((x - cx) * z) / 960, -1, 1);
      }
      const pose = (t, seg) => { const idx = Math.floor(t * fps / seg + 1e-6); return { idx, tq: idx * seg / fps }; };

      // ---------- vento ----------
      // balanço das copas (de -1 a 1): passa da esquerda para a direita
      const balanco = (t, x) => 0.75 * Math.sin(TAU * (VENTO.balanco * t - x / 2600)) + 0.35 * ruido(t * 0.6 + x * 0.0007, SEM + 5);
      // a onda que corre pelos traços
      const ondaVento = (t, x, y) => Math.sin(TAU * (VENTO.velocidade * t - (x + 0.35 * y) / VENTO.onda));

      // tons de traço de uma forma: a lista de cores (do escuro ao claro) vira NB tons;
      // "perto" < 1 puxa tudo para a cor de longe (mais chapado e mais azulado)
      function rampa(nomes, perto = 1, longe) {
        const cs = nomes.map(tom), out = [];
        for (let i = 0; i < NB; i++) {
          const pos = i / (NB - 1) * (cs.length - 1), j = Math.min(cs.length - 2, Math.floor(pos));
          let h = hex(cs[j], cs[j + 1], pos - j);
          if (perto < 1 && longe) h = hex(h, tom(longe), (1 - perto) * 0.7);
          out.push(h);
        }
        return out;
      }

      // ================= ÁRVORES (silhueta + hachura que segue a forma) =================
      let proxId = 1;
      // perfil da copa: u = 0 no topo, 1 na base; devolve a meia largura de 0 a 1
      function perfil(u, ponta) {
        const m = 0.74;
        return u <= m ? Math.pow(u / m, ponta) : Math.sqrt(Math.max(0, 1 - Math.pow((u - m) / (1 - m), 2)));
      }
      function novaArvore(P, x, alt, larg, base, ac) {
        const id = proxId++, sem = id * 31 + SEM;
        const tronco = alt * (P.tronco ?? 0.1), hc = alt - tronco, topo = base - alt, W = larg / 2;
        const ponta = P.ponta ?? 0.5, NL = 56, linhas = new Float32Array(NL + 1);
        for (let i = 0; i <= NL; i++) linhas[i] = W * perfil(i / NL, ponta) * (1 + 0.05 * ruido(i / NL * 7, sem));
        const meia = (u) => { const f = u * NL, i = Math.min(NL - 1, Math.floor(f)); return mistura(linhas[i], linhas[i + 1], f - i); };
        const perto = P.perto ?? 1;
        const ramp = rampa(P.rampa || ['funda', 'sombra', 'folha', 'clara', 'luz'], perto, P.longe || 'longe');
        // os traços: sorteados uma vez, dentro da silhueta (passam um pouco da borda: borda de pelo)
        const n = Math.round(hc * larg * 0.7 * (P.densidade ?? 0.04));
        const X = new Float32Array(n), Y = new Float32Array(n), U = new Float32Array(n), ANG = new Float32Array(n),
          LEN = new Float32Array(n), TOM = new Float32Array(n), CUR = new Float32Array(n);
        const comp = W * (P.traco ?? 0.09), contraste = P.contraste ?? 1;
        let i = 0, guarda = 0;
        while (i < n && guarda++ < n * 6) {
          const u = ac(), s = ac() * 2 - 1;
          const f = meia(u) / W;
          if (ac() > f + 0.02) continue;
          const px = s * meia(u) * 1.04, py = topo + u * hc;
          // luz da esquerda; topo um pouco mais claro; base da copa bem escura; manchas grandes
          const lado = 0.5 - 0.5 * s;
          let v = 0.12 + 0.78 * Math.pow(lado, 1.15) + 0.1 * (1 - u) - 0.55 * suave(trecho(u, 0.6, 1.0));
          v += 0.42 * (vn(px / (W * 0.55) + id * 3.1, py / (W * 0.5), sem) - 0.5);
          v += (ac() - 0.5) * 0.16;
          v = 0.5 + (v - 0.5) * contraste;
          X[i] = px; Y[i] = py; U[i] = u; TOM[i] = limita(v);
          ANG[i] = Math.PI / 2 - s * (0.35 + 0.55 * (1 - u)) + (ac() - 0.5) * 0.35;
          LEN[i] = comp * (0.7 + 0.6 * ac());
          CUR[i] = (ac() - 0.5) * 0.5;
          i++;
        }
        return { id, x, base, alt, hc, tronco, topo, W, linhas, NL, meia, ramp, n: i, X, Y, U, ANG, LEN, TOM, CUR,
          lw: comp * (P.largura ?? 0.17), corTronco: tom(P.corTronco || ramp[0]) };
      }

      function desenhaArvore(T, P, t, b) {
        const sw = balanco(t, T.x) * VENTO.forca * (P.balanca ?? 1);
        const desvio = (u) => sw * T.hc * 0.028 * Math.pow(1 - u, 2);
        // tronco fino e escuro
        c.fillStyle = T.corTronco;
        const tw = Math.max(T.W * 0.07, 3);
        c.fillRect(T.x - tw / 2 + desvio(1), T.base - T.tronco - 4, tw, T.tronco + 4);
        // silhueta chapada (um pouco para dentro: a borda é feita pelos traços)
        c.fillStyle = T.ramp[2];
        c.beginPath();
        for (let i = 0; i <= T.NL; i++) { const u = i / T.NL; c.lineTo(T.x + desvio(u) + T.linhas[i] * 0.95, T.topo + u * T.hc); }
        for (let i = T.NL; i >= 0; i--) { const u = i / T.NL; c.lineTo(T.x + desvio(u) - T.linhas[i] * 0.95, T.topo + u * T.hc); }
        c.closePath(); c.fill();
        // hachura: redesenhada de três em três quadros (b), o vento passa em onda
        const cam = [];
        for (let j = 0; j < NB; j++) cam.push(new Path2D());
        const f = VENTO.forca, base = T.id * 100003;
        for (let i = 0; i < T.n; i++) {
          const u = T.U[i], len = T.LEN[i];
          let x0 = T.x + T.X[i] + desvio(u), y0 = T.Y[i];
          const w = ondaVento(t, x0, y0) * f;
          const j1 = h2(base + i, b * 4 + 1), j2 = h2(base + i, b * 4 + 2), j3 = h2(base + i, b * 4 + 3);
          x0 += (j1 - 0.5) * len * 0.25; y0 += (j2 - 0.5) * len * 0.25;
          const a = T.ANG[i] + 0.3 * w * (1 - 0.5 * u) + (j3 - 0.5) * 0.16;
          const v = T.TOM[i] + 0.07 * w + (j1 - 0.5) * 0.1;
          const bk = Math.max(0, Math.min(NB - 1, Math.round(v * (NB - 1))));
          const ca = Math.cos(a), sa = Math.sin(a), cu = T.CUR[i] * len;
          const ex = x0 + ca * len, ey = y0 + sa * len;
          const pth = cam[bk];
          pth.moveTo(x0, y0); pth.quadraticCurveTo((x0 + ex) / 2 - sa * cu, (y0 + ey) / 2 + ca * cu, ex, ey);
        }
        c.lineWidth = fio(T.lw); c.lineCap = 'round';
        for (let j = 0; j < NB; j++) { c.strokeStyle = T.ramp[j]; c.stroke(cam[j]); }
      }

      // reflexo na água: a árvore de cabeça para baixo, em faixas quebradas que tremem
      function desenhaReflexo(T, R, t, b) {
        const passo = R.passo || 7, esc = R.escala ?? 0.75, total = T.alt * esc;
        c.fillStyle = cor(T.ramp[R.tom ?? 1], tom(R.cor || T.ramp[0]), R.mistura ?? 0.4);
        for (let d = 2, j = 0; d < total; d += passo, j++) {
          const y = T.base - d / esc;                // ponto da árvore que se reflete aqui
          const meia = y > T.base - T.tronco ? T.W * 0.07 : T.meia((y - T.topo) / T.hc);
          if (meia < 1) continue;
          const tremor = 3 * Math.sin(t * 2.2 + j * 0.9) + 2 * (h2(T.id * 97 + j, b) - 0.5);
          c.globalAlpha = (R.alfa ?? 0.55) * (1 - d / total);
          // a faixa se quebra em 2 ou 3 pedaços
          const nP = 2 + Math.floor(h2(T.id + j * 13, b + 7) * 2);
          for (let q = 0; q < nP; q++) {
            const a0 = -meia + 2 * meia * q / nP, a1 = a0 + 2 * meia / nP * mistura(0.55, 0.95, h2(T.id * 3 + j, b * 5 + q));
            c.fillRect(T.x + a0 + tremor, T.base + d, a1 - a0, passo * 0.6);
          }
        }
        c.globalAlpha = 1;
      }

      const ARV = new Map();
      for (const P of deTipo('arvores')) {
        const ac = sorteio((P.semente || 1) * 7919 + SEM);
        const lista = [];
        if (P.lista) for (const [x, alt, larg, base] of P.lista) lista.push(novaArvore(P, x, alt, larg, base ?? P.base, ac));
        if (P.gera) {
          const g = P.gera;
          for (let x = g.de; x <= g.ate; x += g.passo * (0.75 + 0.5 * ac())) {
            if (g.falha && ac() < g.falha) continue;
            lista.push(novaArvore(P, x + (ac() - 0.5) * g.passo * 0.3, mistura(g.altura[0], g.altura[1], ac()), mistura(g.largura[0], g.largura[1], ac()), (P.base || 0) + (ac() - 0.5) * (g.desnivel || 0), ac));
          }
        }
        ARV.set(P, lista);
      }

      // ================= FAIXAS (chão, água, céu): bandas chapadas + hachura deitada =================
      const FAI = new Map();
      for (const P of deTipo('faixas')) {
        const ac = sorteio((P.semente || 2) * 104729 + SEM);
        const [x0, x1] = P.x || [-200, 2200];
        const tr = Object.assign({ densidade: 0.006, comp: [14, 30], angulo: 0, abre: 0.25, largura: 2.2, contraste: 1 }, P.tracos || {});
        const bandas = (P.faixas || []).map(([y0, y1, nome]) => {
          const base = tom(nome), claro = tom(tr.claro || 'luz'), escuro = tom(tr.escuro || 'funda'), q = 0.2 * tr.contraste;
          const tons = [hex(base, escuro, q), hex(base, escuro, q * 0.45), base, hex(base, claro, q * 0.45), hex(base, claro, q)];
          const n = Math.round((x1 - x0) * (y1 - y0) * tr.densidade);
          const X = new Float32Array(n), Y = new Float32Array(n), ANG = new Float32Array(n), LEN = new Float32Array(n), B = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            X[i] = mistura(x0, x1, ac()); Y[i] = mistura(y0, y1, ac());
            ANG[i] = tr.angulo + (ac() - 0.5) * tr.abre; LEN[i] = mistura(tr.comp[0], tr.comp[1], ac());
            // manchas: uns trechos mais claros, outros mais escuros
            const v = 0.55 * vn(X[i] / 160, Y[i] / 40, SEM + 9) + 0.45 * ac();
            B[i] = Math.max(0, Math.min(4, Math.floor(v * 5)));
          }
          return { y0, y1, base, tons, n, X, Y, ANG, LEN, B };
        });
        const tufos = [];
        if (P.tufos) for (let i = 0; i < P.tufos.quantos; i++) tufos.push([mistura(x0, x1, ac()), mistura(P.tufos.y[0], P.tufos.y[1], ac()), 0.7 + 0.6 * ac()]);
        FAI.set(P, { x0, x1, tr, bandas, tufos });
      }
      function desenhaFaixas(P, t, b) {
        const F = FAI.get(P);
        for (const bd of F.bandas) { c.fillStyle = bd.base; c.fillRect(F.x0, bd.y0, F.x1 - F.x0, bd.y1 - bd.y0 + 0.6); }
        c.lineCap = 'round'; c.lineWidth = fio(F.tr.largura);
        F.bandas.forEach((bd, bi) => {
          const cam = [0, 1, 2, 3, 4].map(() => new Path2D());
          for (let i = 0; i < bd.n; i++) {
            const j1 = h2(bi * 1000003 + i, b * 3 + 1), j2 = h2(bi * 1000003 + i, b * 3 + 2);
            const x = bd.X[i] + (j1 - 0.5) * bd.LEN[i] * 0.6, y = bd.Y[i] + (j2 - 0.5) * 2;
            const a = bd.ANG[i] + (j2 - 0.5) * 0.12, len = bd.LEN[i];
            const pth = cam[Math.max(0, Math.min(4, bd.B[i] + (j1 > 0.85 ? 1 : j1 < 0.15 ? -1 : 0)))];
            pth.moveTo(x, y); pth.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 - len * 0.06, x + Math.cos(a) * len, y + Math.sin(a) * len);
          }
          for (let q = 0; q < 5; q++) { c.strokeStyle = bd.tons[q]; c.stroke(cam[q]); }
        });
        // tufinhos de capim
        if (F.tufos.length) {
          c.strokeStyle = tom(P.tufos.cor || 'luz'); c.lineWidth = fio(2);
          c.beginPath();
          F.tufos.forEach(([x, y, e], i) => {
            const m = (h2(i, b) - 0.5) * 1.5;
            for (const d of [-1, 0, 1]) { c.moveTo(x + d * 4 * e, y); c.lineTo(x + d * 8 * e + m, y - (12 - Math.abs(d) * 3) * e); }
          });
          c.stroke();
        }
        if (P.riscos) desenhaRiscos(P.riscos, F, t, b);
      }
      // riscos soltos de lápis branco (marolas, céu riscado): sorteados de novo a cada redesenho
      function desenhaRiscos(R, F, t, b) {
        c.strokeStyle = tom(R.cor || '#ffffff'); c.lineWidth = fio(R.largura || 2); c.lineCap = 'round';
        c.globalAlpha = R.alfa ?? 0.6;
        c.beginPath();
        const [ya, yb] = R.y, ofs = (R.anda || 0) * t;
        for (let i = 0; i < R.quantos; i++) {
          const x = mistura(F.x0, F.x1, h2(i, b * 2 + 11)) + ofs, y = mistura(ya, yb, Math.pow(h2(i, b * 2 + 12), R.junta ?? 1));
          const len = mistura(R.comp[0], R.comp[1], h2(i, b * 2 + 13)) * (R.cresce ? mistura(0.5, 1.4, trecho(y, ya, yb)) : 1);
          const inc = (R.inclina || 0) * len, ond = (h2(i, b + 99) - 0.5) * 6;
          c.moveTo(x, y); c.quadraticCurveTo(x + len * 0.5, y + ond - inc * 0.5, x + len, y - inc);
        }
        c.stroke(); c.globalAlpha = 1;
      }

      // ================= JUNCOS (taboas na margem) =================
      const JUN = new Map();
      for (const P of deTipo('juncos')) {
        const ac = sorteio((P.semente || 3) * 15485863 + SEM), hastes = [];
        for (const [x, quantos, larg, alt] of P.moitas) {
          for (let i = 0; i < quantos; i++) {
            hastes.push({ x: x + (ac() - 0.5) * larg, h: alt * (0.55 + 0.5 * ac()), pende: (ac() - 0.5) * 0.5, folha: ac() < 0.55, cabeca: ac() < 0.5, fase: ac() * TAU });
          }
        }
        JUN.set(P, hastes);
      }
      function desenhaJuncos(P, t, tq) {
        const base = P.base, verde = tom(P.cor || 'folha'), escuro = tom(P.corEscura || 'sombra'), marrom = tom(P.corPonta || 'escuro');
        c.lineCap = 'round';
        for (const s of JUN.get(P)) {
          const ventoTq = balanco(tq, s.x) * VENTO.forca;
          const dx = s.pende * s.h + ventoTq * s.h * 0.08 + 2 * Math.sin(tq * 2.3 + s.fase);
          const tx = s.x + dx, ty = base - s.h;
          c.strokeStyle = s.folha ? verde : escuro; c.lineWidth = fio(s.folha ? 4 : 2.8);
          c.beginPath(); c.moveTo(s.x, base); c.quadraticCurveTo(s.x + dx * 0.2, base - s.h * 0.55, tx, ty); c.stroke();
          if (s.cabeca && !s.folha) {
            // a espiga marrom perto da ponta, e um fiapo acima
            const k1 = 0.8, hx = mistura(s.x, tx, k1 * k1), hy = mistura(base, ty, k1);
            const ang = Math.atan2(ty - (base - s.h * 0.55), tx - (s.x + dx * 0.2));
            c.save(); c.translate(hx, hy); c.rotate(ang + Math.PI / 2);
            c.fillStyle = marrom; c.beginPath(); c.ellipse(0, 0, 5, 16, 0, 0, TAU); c.fill();
            c.restore();
          }
        }
      }

      // ================= CICLISTA (de lado, indo para a direita) =================
      function posTempo(K, t) {
        if (t <= K[0][0]) return K[0][1];
        for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) return mistura(K[i][1], K[i + 1][1], trecho(t, K[i][0], K[i + 1][0]));
        return K[K.length - 1][1];
      }
      // perna de dois ossos: do quadril ao pedal, com o joelho para a frente
      function joelho(hx, hy, px, py, l1, l2) {
        const dx = px - hx, dy = py - hy, d = Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy));
        const a = Math.atan2(dy, dx), b = Math.acos(limita((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
        return [hx + Math.cos(a - b) * l1, hy + Math.sin(a - b) * l1];
      }
      function desenhaCiclista(P, t, tq) {
        const x = posTempo(P.x, t), y = P.y, e = P.escala || 1, K = P.cores || {};
        const escuro = tom(K.bicicleta || 'escuro'), pele = tom(K.pele || '#e8c4a0');
        const giro = TAU * posTempo(P.x, tq) / 165;      // pedal gira conforme a distância andada (pose de dois em dois)
        c.save(); c.translate(x, y); c.scale(e, e);
        c.lineCap = 'round'; c.lineJoin = 'round';
        const R = 12, rodaT = [-22, -R], rodaF = [22, -R], eixo = [-1, -13], selim = [-9, -35], guidao = [16, -39];
        const pedal = (fase) => [eixo[0] + 6.5 * Math.cos(giro + fase), eixo[1] + 6.5 * Math.sin(giro + fase)];
        const quadril = [selim[0] + 1, selim[1] - 3];
        // perna de trás (mais escura)
        const perna = (fase, corP) => {
          const p = pedal(fase), j = joelho(quadril[0], quadril[1], p[0], p[1], 15, 15);
          c.strokeStyle = corP; c.lineWidth = fio(4.2);
          c.beginPath(); c.moveTo(quadril[0], quadril[1]); c.lineTo(j[0], j[1]); c.lineTo(p[0], p[1]); c.stroke();
        };
        perna(Math.PI, tom(K.pernaTras || K.calca || 'escuro'));
        // rodas e quadro
        c.strokeStyle = escuro; c.lineWidth = fio(1.8);
        for (const r of [rodaT, rodaF]) { c.beginPath(); c.arc(r[0], r[1], R, 0, TAU); c.stroke(); }
        c.lineWidth = fio(2.2);
        c.beginPath();
        c.moveTo(rodaT[0], rodaT[1]); c.lineTo(eixo[0], eixo[1]); c.lineTo(selim[0], selim[1] + 2); c.lineTo(rodaT[0], rodaT[1]);
        c.moveTo(eixo[0], eixo[1]); c.lineTo(guidao[0] - 2, guidao[1] + 6); c.lineTo(rodaF[0], rodaF[1]);
        c.moveTo(selim[0] + 1, selim[1] + 4); c.lineTo(guidao[0] - 3, guidao[1] + 5);
        c.moveTo(selim[0] - 4, selim[1]); c.lineTo(selim[0] + 4, selim[1]);
        c.moveTo(guidao[0] - 2, guidao[1] + 6); c.lineTo(guidao[0], guidao[1]); c.lineTo(guidao[0] + 4, guidao[1] + 1);
        c.stroke();
        if (P.cesta) { c.fillStyle = tom(P.cesta); c.fillRect(guidao[0] + 1, guidao[1] + 2, 9, 7); }
        // tronco inclinado para a frente, com balanço de pedalada
        const bal = 0.8 * Math.sin(giro * 2);
        const ombro = [quadril[0] + 9, quadril[1] - 21 + bal];
        // saia ou calça por cima da coxa da frente
        const pF = pedal(0), jF = joelho(quadril[0], quadril[1], pF[0], pF[1], 15, 15);
        if (K.saia) {
          c.fillStyle = tom(K.saia);
          c.beginPath(); c.moveTo(quadril[0] - 6, quadril[1] - 4); c.lineTo(jF[0] + 3, jF[1] - 1); c.lineTo(jF[0] - 2, jF[1] + 5); c.lineTo(quadril[0] - 7, quadril[1] + 5); c.closePath(); c.fill();
          c.strokeStyle = pele; c.lineWidth = fio(3.4);
          c.beginPath(); c.moveTo(jF[0], jF[1] + 1); c.lineTo(pF[0], pF[1]); c.stroke();
        } else perna(0, tom(K.calca || 'escuro'));
        // camisa
        c.strokeStyle = tom(K.camisa || '#9cc3e0'); c.lineWidth = fio(8.5);
        c.beginPath(); c.moveTo(quadril[0], quadril[1] - 2); c.lineTo(ombro[0], ombro[1]); c.stroke();
        // braço até o guidão
        c.strokeStyle = tom(K.manga || K.camisa || '#9cc3e0'); c.lineWidth = fio(3.4);
        c.beginPath(); c.moveTo(ombro[0], ombro[1] + 1); c.lineTo(ombro[0] + 7, ombro[1] + 9); c.stroke();
        c.strokeStyle = pele; c.lineWidth = fio(2.6);
        c.beginPath(); c.moveTo(ombro[0] + 7, ombro[1] + 9); c.lineTo(guidao[0] + 1, guidao[1] + 1); c.stroke();
        // cachecol que voa para trás
        if (K.cachecol) {
          c.strokeStyle = tom(K.cachecol); c.lineWidth = fio(3);
          const w1 = 3 * Math.sin(tq * 9), w2 = 4 * Math.sin(tq * 9 + 1.6);
          c.beginPath(); c.moveTo(ombro[0] + 1, ombro[1] - 2); c.quadraticCurveTo(ombro[0] - 10, ombro[1] - 4 + w1, ombro[0] - 22, ombro[1] + 1 + w2); c.stroke();
        }
        // cabeça, cabelo e chapéu
        const cab = [ombro[0] + 3, ombro[1] - 8];
        c.fillStyle = pele; c.beginPath(); c.arc(cab[0], cab[1], 5.6, 0, TAU); c.fill();
        c.fillStyle = tom(K.cabelo || 'escuro'); c.beginPath(); c.arc(cab[0] - 1.6, cab[1] - 0.6, 5, Math.PI * 0.55, Math.PI * 1.6); c.fill();
        if (P.chapeu === 'palheta') {
          c.fillStyle = tom(K.chapeu || '#efe2bf');
          c.fillRect(cab[0] - 9, cab[1] - 5.5, 18, 2.4); c.fillRect(cab[0] - 5, cab[1] - 10, 10, 5);
          c.fillStyle = tom(K.fita || 'escuro'); c.fillRect(cab[0] - 5, cab[1] - 6.6, 10, 1.4);
        } else {
          c.fillStyle = tom(K.chapeu || '#c8372d');
          c.beginPath(); c.arc(cab[0], cab[1] - 2, 5.8, Math.PI, TAU); c.fill();
          c.fillRect(cab[0], cab[1] - 3.2, 9, 2.2);
        }
        c.restore();
      }

      // ================= BARCO A REMO (vai para a direita; o remador olha para trás) =================
      function faseRemo(P, tq) { const ph = (tq / (P.remada || 1.6)) % 1; return ph < 0 ? ph + 1 : ph; }
      function corpoBarco(P, tq, K, soCasco) {
        const ph = faseRemo(P, tq), puxa = ph < 0.45;
        const k2 = puxa ? suave(ph / 0.45) : 1 - suave((ph - 0.45) / 0.55);   // 0 = mãos para trás (esquerda), 1 = mãos no peito
        const incl = mistura(-0.45, 0.3, k2);                                  // tronco: inclinado para a popa -> para a proa
        // casco creme com faixa vermelha
        c.fillStyle = tom(K.casco || '#f1e6cc');
        c.beginPath(); c.moveTo(-50, -15); c.lineTo(48, -18); c.quadraticCurveTo(40, -2, 26, 0); c.lineTo(-38, 0); c.quadraticCurveTo(-50, -4, -50, -15); c.closePath(); c.fill();
        c.fillStyle = tom(K.faixa || '#c8372d');
        c.beginPath(); c.moveTo(-50, -15); c.lineTo(48, -18); c.lineTo(46, -14); c.lineTo(-49, -11); c.closePath(); c.fill();
        if (soCasco) return null;
        // remador sentado no meio
        const quad = [2, -16], ombro = [quad[0] + Math.sin(incl) * 22, quad[1] - Math.cos(incl) * 22];
        c.lineCap = 'round';
        c.strokeStyle = tom(K.camisa || '#c8372d'); c.lineWidth = fio(9);
        c.beginPath(); c.moveTo(quad[0], quad[1]); c.lineTo(ombro[0], ombro[1]); c.stroke();
        const mao = [mistura(-18, 9, k2), -22 + (puxa ? 0 : -2)];
        c.strokeStyle = tom(K.pele || '#e8c4a0'); c.lineWidth = fio(2.8);
        c.beginPath(); c.moveTo(ombro[0], ombro[1] + 2); c.lineTo(mao[0], mao[1]); c.stroke();
        // remo: da mão, pela forqueta, até a pá (na água quando puxa)
        const forq = [0, -16], pa = [forq[0] - (mao[0] - forq[0]) * 1.6, puxa ? 4 : -9];
        c.strokeStyle = tom(K.remo || '#8a6a3c'); c.lineWidth = fio(2.2);
        c.beginPath(); c.moveTo(mao[0], mao[1]); c.lineTo(pa[0], pa[1]); c.stroke();
        c.fillStyle = tom(K.remo || '#8a6a3c'); c.beginPath(); c.ellipse(pa[0], pa[1], 6, 2.4, 0, 0, TAU); c.fill();
        // cabeça e chapéu de palha
        const cab = [ombro[0] + Math.sin(incl) * 7, ombro[1] - 7];
        c.fillStyle = tom(K.pele || '#e8c4a0'); c.beginPath(); c.arc(cab[0], cab[1], 5.5, 0, TAU); c.fill();
        c.fillStyle = tom(K.chapeu || '#e8d49a');
        c.fillRect(cab[0] - 9, cab[1] - 5, 18, 2.4); c.fillRect(cab[0] - 5, cab[1] - 9.5, 10, 5);
        c.fillStyle = tom(K.fita || '#c8372d'); c.fillRect(cab[0] - 5, cab[1] - 6.2, 10, 1.3);
        return { puxa, pa };
      }
      function desenhaBarco(P, t, tq, b) {
        const ph = faseRemo(P, tq);
        const x = posTempo(P.x, t) + 5 * Math.sin(TAU * ph), y = P.y, e = P.escala || 1, K = P.cores || {};
        // esteira: riscos brancos atrás
        c.save(); c.translate(x, y); c.scale(e, e);
        c.strokeStyle = tom(K.espuma || '#ffffff'); c.lineCap = 'round'; c.lineWidth = fio(1.6);
        c.globalAlpha = 0.6; c.beginPath();
        for (let i = 0; i < 6; i++) { const d = 40 + i * 22 + 10 * h2(i, b), yy = 3 + (i % 3) * 3; c.moveTo(-d, yy); c.lineTo(-d - 14 - 10 * h2(i + 9, b), yy + 1); }
        c.stroke(); c.globalAlpha = 1;
        // reflexo do barco, de cabeça para baixo e apagado
        c.save(); c.globalAlpha = 0.28; c.translate(0, 2); c.scale(1, -0.7); corpoBarco(P, tq, K, true); c.restore();
        c.globalAlpha = 1;
        const r = corpoBarco(P, tq, K);
        // marolas da pá
        if (r.puxa) {
          c.strokeStyle = tom(K.espuma || '#ffffff'); c.globalAlpha = 0.7; c.lineWidth = fio(1.6);
          c.beginPath(); c.ellipse(r.pa[0], r.pa[1] + 1, 10 + 6 * ph, 2.5, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
        }
        c.restore();
      }

      // ================= PÁSSAROS (revoada de uma copa, ou dois cruzando o céu) =================
      function desenhaPassaros(P, tq, idx) {
        const [t0, t1] = P.tempo, n = P.quantos || 2, tam = P.tamanho || 8;
        c.strokeStyle = tom(P.cor || 'escuro'); c.lineWidth = fio(tam * 0.28); c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const ini = t0 + i * (P.escalona || 0), fim = t1 + i * (P.escalona || 0) * 0.5;
          const f = trecho(tq, ini, fim);
          if (tq < ini || f >= 1) continue;
          const e = P.arranca ? saiDevagar(f) : f;
          const ex = (h2(i, 71) - 0.5) * (P.espalha || 0), ey = (h2(i, 72) - 0.5) * (P.espalha || 0) * 0.6;
          const x = mistura(P.saida[0], P.chegada[0] + ex, e) + 6 * Math.sin(tq * 3 + i);
          const y = mistura(P.saida[1], P.chegada[1] + ey, e) + 5 * Math.sin(tq * 4.1 + i * 1.7);
          const asa = ((idx + i) % 2 ? -0.55 : 0.45) * tam;
          c.moveTo(x - tam, y + asa); c.quadraticCurveTo(x - tam * 0.4, y - Math.abs(asa) * 0.2, x, y); c.quadraticCurveTo(x + tam * 0.4, y - Math.abs(asa) * 0.2, x + tam, y + asa);
        }
        c.stroke();
      }

      // ================= FOLHAS que caem =================
      function desenhaFolhas(P, tq) {
        const [t0, t1] = P.tempo, n = P.quantas || 10, queda = P.queda || 2.6;
        c.fillStyle = tom(P.cor || 'clara');
        for (let i = 0; i < n; i++) {
          const ini = mistura(t0, t1 - queda, h2(i, 31)), f = (tq - ini) / queda;
          if (f <= 0 || f >= 1) continue;
          const x = mistura(P.x[0], P.x[1], h2(i, 32)) + 28 * Math.sin(f * TAU * 1.3 + i) + 40 * f;
          const y = mistura(P.y[0], P.y[1], h2(i, 33)) + f * (P.cai || 380);
          c.save(); c.translate(x, y); c.rotate(Math.sin(f * TAU * 1.3 + i) * 1.1);
          c.globalAlpha = Math.min(1, f * 8, (1 - f) * 5);
          c.beginPath(); c.ellipse(0, 0, 5, 2.2, 0, 0, TAU); c.fill();
          c.restore();
        }
        c.globalAlpha = 1;
      }

      // ================= SOL, MORROS =================
      function desenhaSol(P) { c.fillStyle = tom(P.cor || 'creme'); c.beginPath(); c.arc(P.x, P.y, P.raio || 50, 0, TAU); c.fill(); }
      function desenhaMorros(P) {
        c.fillStyle = tom(P.cor || 'longe');
        c.beginPath(); c.moveTo(P.pontos[0][0], P.base);
        for (const [x, y] of P.pontos) c.lineTo(x, y);
        c.lineTo(P.pontos[P.pontos.length - 1][0], P.base); c.closePath(); c.fill();
      }

      // ================= SOMBRA DE NUVEM e LUZ QUE CHEGA =================
      function mancha(P, t, modo, forca) {
        const [t0, t1] = P.tempo;
        const f = trecho(t, t0, t1);
        if (t < t0 || t > t1) return;
        const x = mistura(P.x[0], P.x[1], f), y = Array.isArray(P.y) ? mistura(P.y[0], P.y[1], f) : P.y;
        c.save();
        c.globalCompositeOperation = modo; c.globalAlpha = forca;
        c.translate(x, y); c.scale(1, P.ry / P.rx);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, P.rx);
        g.addColorStop(0, tom(P.cor)); g.addColorStop(0.55, tom(P.cor)); g.addColorStop(1, cor(tom(P.cor), null, 0, 0));
        c.fillStyle = g; c.fillRect(-P.rx, -P.rx, 2 * P.rx, 2 * P.rx);
        c.restore();
      }

      // ================= TÍTULO (letras em traços, sobre uma faixa escurecida) =================
      function desenhaTitulo(P, t) {
        if (!H.titulo || t > P.ate) return;
        const a = Math.min(trecho(t, P.de || 0, (P.de || 0) + 0.5), 1 - trecho(t, P.ate - 0.6, P.ate));
        if (a <= 0) return;
        const tam = P.tamanho || 46, txt = H.titulo.toUpperCase(), w = Letras.largura(txt, tam);
        c.setTransform(k, 0, 0, k, 0, 0); ESC = k;
        c.globalAlpha = a * (P.faixa ?? 0.4); c.fillStyle = tom(P.corFaixa || 'funda');
        c.fillRect(P.x - tam * 0.6, P.y - tam * 1.45, w + tam * 1.2, tam * 1.95);
        c.globalAlpha = a; c.strokeStyle = tom(P.cor || 'creme'); c.lineWidth = fio(tam * 0.09); c.lineCap = 'round'; c.lineJoin = 'round';
        let px = P.x; const y0 = P.y - tam;
        for (const ch of txt) {
          const g = Letras.letra(ch); if (!g) { px += 0.42 * tam; continue; }
          c.beginPath();
          for (const tr of g.tracos) tr.forEach(([u, v], i) => (i ? c.lineTo(px + u * tam, y0 + v * tam) : c.moveTo(px + u * tam, y0 + v * tam)));
          c.stroke();
          px += (g.w + 0.2) * tam;
        }
        c.globalAlpha = 1;
      }

      // ================= PAPEL E GRÃO (feitos uma vez, no tamanho da tela) =================
      const graos = [0, 1, 2].map((n) => {
        const cv = novaTela(largura, altura), x = cv.getContext('2d'), img = x.createImageData(largura, altura), d = img.data, ac = sorteio(SEM * 17 + n);
        const fp = 1 / (30 * k);
        for (let j = 0; j < altura; j++) for (let i = 0; i < largura; i++) {
          // papel prensado a frio: manchas largas + fibra fina; e o grão miúdo do pigmento
          const papel = (vn(i * fp, j * fp, SEM + 50) - 0.5) * 30 + (vn(i * fp * 5, j * fp * 5, SEM + 51) - 0.5) * 18;
          const v = 128 + (ac() - 0.5) * 46 + papel, o = (j * largura + i) * 4;
          d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
        }
        x.putImageData(img, 0, 0); return cv;
      });

      // ---------- desenhar(t): monta o quadro do instante t. Não guarda nada entre quadros. ----------
      function desenhar(t) {
        const hach = pose(t, SEG.hachura), fig = pose(t, SEG.figuras), b = hach.idx;
        CAMQ = camera(t);
        c.reset();                              // o canvas guarda o pincel de um quadro para o outro: começa limpo
        c.fillStyle = tom(H.fundo || 'funda'); c.fillRect(0, 0, largura, altura);
        for (const P of pecas) {
          const cam = camada(P.camada ?? 1);
          switch (P.tipo) {
            case 'faixas': desenhaFaixas(P, t, b); break;
            case 'arvores': {
              const vis = 960 / cam.z + 40;
              const lista = ARV.get(P);
              if (P.chao) { c.fillStyle = tom(P.chao.cor); c.fillRect(cam.cx - vis, P.base - 12, 2 * vis, (P.chao.ate || 1200) - P.base + 12); }
              for (const T of lista) {
                if (Math.abs(T.x - cam.cx) > vis + T.W * 1.3) continue;
                if (P.sombra) {
                  const S = P.sombra; c.globalAlpha = S.alfa ?? 0.5; c.fillStyle = tom(S.cor || 'funda');
                  c.beginPath(); c.ellipse(T.x + (S.dx ?? 0.5) * T.W, T.base + 3, T.W * (S.rx ?? 1.1), S.ry ?? 12, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
                }
                if (P.reflexo) desenhaReflexo(T, P.reflexo, t, b);
              }
              for (const T of lista) if (Math.abs(T.x - cam.cx) <= vis + T.W * 1.3) desenhaArvore(T, P, t, b);
              break;
            }
            case 'juncos': desenhaJuncos(P, t, fig.tq); break;
            case 'ciclista': desenhaCiclista(P, t, fig.tq); break;
            case 'barco': desenhaBarco(P, t, fig.tq, b); break;
            case 'passaros': desenhaPassaros(P, fig.tq, fig.idx); break;
            case 'folhas': desenhaFolhas(P, fig.tq); break;
            case 'sol': desenhaSol(P); break;
            case 'morros': desenhaMorros(P); break;
            case 'sombra-nuvem': mancha(P, t, 'multiply', (P.forca ?? 0.35) * Math.min(1, trecho(t, P.tempo[0], P.tempo[0] + 1), 1 - trecho(t, P.tempo[1] - 1, P.tempo[1]))); break;
            case 'luz': mancha(Object.assign({}, P, { tempo: [P.tempo[0], duracao + 1] }), t, P.modo || 'overlay', (P.forca ?? 0.3) * suave(trecho(t, P.tempo[0], P.tempo[1]))); break;
            default: break;
          }
        }
        for (const P of deTipo('titulo')) desenhaTitulo(P, t);
        // acabamento: papel e grão por cima de tudo (trocam junto com a hachura)
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = H.grao ?? 0.22; c.drawImage(graos[b % 3], 0, 0);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      }

      // ---------- som: vento nas folhas, água, e um som pequeno para cada ação, nas MESMAS marcas da imagem ----------
      function som() {
        const S = H.som || {}, s = Som.criar(duracao, SEM);
        s.vento(0, duracao, { vol: S.folhas ?? 0.07, corte: 2200, onda: VENTO.balanco, profundidade: 0.6, entra: 1.0, sai: 1.5 });
        s.vento(0, duracao, { vol: S.ar ?? 0.05, corte: 420, onda: 0.13, profundidade: 0.5, entra: 1.2, sai: 1.5 });
        if (S.agua) s.vento(0, duracao, { vol: S.agua, corte: 280, onda: 0.4, profundidade: 0.5, entra: 1.0, sai: 1.5 });
        // bicicletas: catraca solta, tique-tique miúdo, do lado da tela onde estão
        for (const P of deTipo('ciclista')) {
          const [ta, tb] = [P.x[0][0], P.x[P.x.length - 1][0]];
          for (let tt = ta + 0.05; tt < Math.min(tb, duracao); tt += 1 / (P.catraca || 11)) {
            s.toque(tt, { vol: 0.012, corte: 6500, dur: 0.012, pan: ladoNaTela(posTempo(P.x, tt), P.camada ?? 1, tt) * 0.7 });
          }
        }
        // campainha
        for (const P of deTipo('sino')) {
          const pan = P.pan ?? 0;
          for (const d of [0, 0.17]) { s.sino(P.nota || 'E6', P.t + d, 0.9, { vol: 0.07, brilho: 3, pan }); s.sino(P.nota2 || 'G#6', P.t + d + 0.005, 0.7, { vol: 0.03, brilho: 2.5, pan }); }
        }
        // pássaros: bater de asas na saída e um canto curto
        for (const P of deTipo('passaros')) {
          const pan = ladoNaTela(P.saida[0], P.camada ?? 1, P.tempo[0]) * 0.6;
          if (P.asas) for (let i = 0; i < 10; i++) s.toque(P.tempo[0] + i * 0.045, { vol: 0.035, corte: 1400, dur: 0.05, pan });
          if (P.canto) for (let i = 0; i < P.canto; i++) s.pio(P.tempo[0] + 0.3 + i * 0.55, { freq: 3400 + 600 * h2(i, 5), repete: 3, intervalo: 0.08, vol: 0.03, sobe: 0.25, pan: pan + 0.2 });
        }
        // remadas: a pá entra na água no começo de cada puxada (mesma conta da imagem)
        for (const P of deTipo('barco')) {
          const per = P.remada || 1.6;
          for (let tc = 0; tc < duracao; tc += per) {
            const pan = ladoNaTela(posTempo(P.x, tc), P.camada ?? 1, tc) * 0.6;
            s.vento(tc, 0.5, { vol: 0.06, corte: 1300, onda: 3, entra: 0.04, sai: 0.35, profundidade: 0.2 });
            s.toque(tc + 0.01, { vol: 0.03, corte: 900, dur: 0.07, pan });
            s.toque(tc + per * 0.45, { vol: 0.02, corte: 500, dur: 0.06, pan });
          }
        }
        // a frase de piano (ou de corda dedilhada)
        for (const [n, t, d] of (S.notas || [])) {
          if (S.instrumento === 'corda') { s.corda(n, t, d, { vol: 0.2, maciez: 0.3, pan: -0.1 }); continue; }
          s.sino(n, t, d + 0.8, { vol: 0.13, brilho: 0.7, pan: -0.1 });
          s.nota(n, t, d, { vol: 0.05, forma: 'tri', ataque: 0.01, solta: 0.8, pan: 0.1 });
        }
        s.sala(0.35);
        return s.fim({ entra: 0.4, sai: 1.0, pico: S.pico ?? 0.85 });
      }

      return { desenhar, som };
    },
  });
})();
