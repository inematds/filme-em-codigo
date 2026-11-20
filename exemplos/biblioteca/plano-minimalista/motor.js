// MOTOR "plano-minimalista" — ilustração plana e minimalista, com ar de gravura japonesa.
// Jeito de animar: camadas planas. Um campo de cor enorme (do verde enevoado em cima ao verde-azulado
// fundo embaixo, sem linha do horizonte) ocupa quase tudo. Por cima, poucas formas chapadas, de borda
// limpa, sem contorno: folhas de lírio com a sombra deslocada, uma figura pequena vista de costas, o
// reflexo dela quebrado na água, anéis finos que abrem e somem, faixas longas e claras que deslizam.
// Paleta curta: o verde-azulado do campo, um coral, um creme e um quase-preto (cores na história).
// A figura, a libélula, a pétala e as folhas trocam de pose de dois em dois quadros; a câmera e a
// névoa andam lisas. Por fim, grão fino de impressão e papel por cima de tudo.
// O motor não sabe a história: tudo o que muda (cores, peças, tempos, notas) vem de historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, hex, cor, ruido } = Filme;
  const L = 1920, A = 1080, TAU = Math.PI * 2;

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
      const C = Object.assign({
        campo: [[0, '#86b79a'], [0.45, '#3f9c93'], [1, '#0f6668']], nevoa: '#d9e6c8', agua: '#23898a', sombra: '#0a4a4c',
        coral: '#e4604a', coral2: '#c9473a', vermelho: '#b8322c', creme: '#f1e6cc', pele: '#e9cdb0', escuro: '#1b2224',
      }, H.cores || {});
      const SEM = H.semente || 1;
      const SEGURA = H.segurar || 2;         // quadros por pose ("de dois em dois")
      const CAM = H.camadas || {};
      const pecas = H.pecas || [];
      const deTipo = (tipo) => pecas.filter((p) => p.tipo === tipo);
      const uma = (tipo) => pecas.find((p) => p.tipo === tipo);

      // escala atual (pixels de tela por unidade de desenho): linhas finas nunca ficam abaixo de 1 pixel
      let ESC = k;
      const fio = (w) => Math.max(w, 1 / ESC);

      // ---------- câmera: chegada muito lenta, lisa ----------
      function camera(t) {
        const K = H.camera && H.camera.length ? H.camera : [{ t: 0, x: 960, y: 540, zoom: 1 }];
        if (t <= K[0].t) return Object.assign({}, K[0]);
        for (let i = 0; i < K.length - 1; i++) {
          const a = K[i], b = K[i + 1];
          if (t <= b.t) { const e = suave(trecho(t, a.t, b.t)); return { x: mistura(a.x, b.x, e), y: mistura(a.y, b.y, e), zoom: mistura(a.zoom, b.zoom, e) }; }
        }
        return Object.assign({}, K[K.length - 1]);
      }
      let CAMQ = camera(0);
      // cada camada chega mais (perto) ou menos (água ao fundo) que a câmera: é a paralaxe
      function camada(nome) {
        const p = CAM[nome] ?? 1;
        const z = 1 + (CAMQ.zoom - 1) * p, cx = 960 + (CAMQ.x - 960) * p, cy = 540 + (CAMQ.y - 540) * p;
        ESC = z * k;
        c.setTransform(ESC, 0, 0, ESC, k * 960 - cx * ESC, k * 540 - cy * ESC);
      }
      // a pose: o tempo "parado" de dois em dois quadros
      const pose = (t) => { const idx = Math.floor(t * fps / SEGURA + 1e-6); return { idx, tq: idx * SEGURA / fps }; };

      // ================= O CAMPO (feito uma vez, no tamanho da tela) =================
      const campo = novaTela(largura, altura);
      { const x = campo.getContext('2d'), g = x.createLinearGradient(0, 0, 0, altura);
        for (const [p, cr] of C.campo) g.addColorStop(p, cr);
        x.fillStyle = g; x.fillRect(0, 0, largura, altura); }

      // névoa: manchas claras e largas no alto, que andam devagar de lado
      const NEV = uma('nevoa');
      const SOBRA = Math.ceil((NEV ? NEV.anda : 0) * duracao * k + 4);
      const nevoa = novaTela(largura + SOBRA, Math.round(altura * 0.62));
      if (NEV) {
        const x = nevoa.getContext('2d'), w = nevoa.width, h = nevoa.height, img = x.createImageData(w, h), d = img.data;
        const [r, g, b] = Filme.rgb(C.nevoa), f1 = 1 / (260 * k), f2 = 1 / (95 * k), forca = NEV.forca ?? 0.35;
        for (let j = 0; j < h; j++) {
          const desce = Math.pow(1 - j / h, 1.3);
          for (let i = 0; i < w; i++) {
            const n = 0.65 * vn(i * f1, j * f1 * 2.4, SEM + 3) + 0.35 * vn(i * f2, j * f2 * 2.4, SEM + 4);
            const a = limita((n - 0.38) * 1.7) * desce * forca, o = (j * w + i) * 4;
            d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(a * 255);
          }
        }
        x.putImageData(img, 0, 0);
      }

      // ================= ÁGUA: faixas longas e claras, quebradas =================
      const OND = uma('ondas');
      const ondas = [];
      if (OND) {
        const ac = sorteio(SEM * 31 + 7);
        for (let i = 0; i < (OND.quantas || 40); i++) {
          const fundo = Math.pow(ac(), 1.6);              // mais faixas perto da linha de cima da água
          const y = mistura(OND.de, OND.ate, fundo), perto = trecho(y, OND.de, OND.ate);
          const comp = mistura(260, 900, ac()) * (0.6 + perto);
          const pedacos = []; let px = 0;
          while (px < comp) { const l = mistura(30, 220, ac()); pedacos.push([px, Math.min(comp, px + l)]); px += l + mistura(12, 70, ac()); }
          ondas.push({ x: mistura(-300, 2200, ac()), y, perto, pedacos, v: mistura(OND.anda[0], OND.anda[1], perto) * (0.7 + 0.6 * ac()), alfa: mistura(0.07, 0.17, ac()) });
        }
      }

      // ================= FOLHAS DE LÍRIO =================
      const folhas = [];
      for (const p of deTipo('folha')) folhas.push({ x: p.x, y: p.y, r: p.raio, giro: p.giro || 0, camada: p.camada || 'meio', fase: h2(p.x, p.y) * TAU, empurra: p.empurra });
      for (const g of deTipo('folhas')) {
        // um aglomerado num canto: só aceita folhas abaixo da linha diagonal, sem uma em cima da outra
        const ac = sorteio(g.semente || SEM), [[ax, ay], [bx, by]] = g.linha, lista = [];
        let tent = 0;
        while (lista.length < g.quantas && tent++ < 6000) {
          const x = mistura(ax, g.ate[0], ac()), y = mistura(Math.min(ay, by), g.ate[1], ac());
          const yLinha = mistura(ay, by, (x - ax) / (bx - ax));
          if (y < yLinha) continue;
          const prof = trecho(y, Math.min(ay, by), g.ate[1]);
          const r = mistura(g.raio[0], g.raio[1], prof) * (0.8 + 0.35 * ac());
          if (lista.some((o) => Math.hypot((o.x - x) / 1.0, (o.y - y) / 0.42) < (o.r + r) * 1.02)) continue;
          lista.push({ x, y, r, giro: ac() * TAU, camada: g.camada || 'perto', fase: ac() * TAU });
        }
        folhas.push(...lista);
      }
      folhas.sort((a, b) => a.y - b.y);
      const ENTALHE = 0.2;                     // meia abertura do corte da folha (radianos)
      function caminhoFolha(x, y, r, giro) {
        const ry = r * 0.42;
        c.beginPath(); c.moveTo(x, y); c.ellipse(x, y, r, ry, 0, giro + ENTALHE, giro + TAU - ENTALHE); c.closePath();
      }
      function desenhaFolha(f, tq) {
        let x = f.x, y = f.y + 1.6 * Math.sin(tq * 1.3 + f.fase), giro = f.giro + 0.025 * Math.sin(tq * 0.9 + f.fase);
        if (f.empurra) { const e = saiDevagar(trecho(tq, f.empurra.de, f.empurra.ate)); x += f.empurra.dx * e; y += f.empurra.dy * e; giro += 0.35 * e; }
        const r = f.r;
        // sombra verde-escura deslocada, embaixo
        c.globalAlpha = 0.62; c.fillStyle = C.sombra;
        caminhoFolha(x - r * 0.16, y + r * 0.2, r, giro); c.fill();
        c.globalAlpha = 1; c.fillStyle = C.coral;
        caminhoFolha(x, y, r, giro); c.fill();
        // um segundo tom chapado: a meia-lua mais escura do lado de trás
        c.save(); caminhoFolha(x, y, r, giro); c.clip();
        c.fillStyle = C.coral2; c.beginPath(); c.ellipse(x + r * 0.1, y - r * 0.6, r * 1.05, r * 0.42, 0, 0, TAU); c.fill();
        c.restore();
        caminhoFolha(x, y, r, giro);           // refaz o caminho depois do clip (lição do canvas)
        // nervuras finas que saem do centro
        c.strokeStyle = cor(C.coral, C.creme, 0.3, 0.6); c.lineWidth = fio(r * 0.024); c.lineCap = 'round';
        const n = 9;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const a = giro + ENTALHE + 0.2 + (TAU - 2 * ENTALHE - 0.4) * i / (n - 1);
          c.moveTo(x + Math.cos(a) * r * 0.12, y + Math.sin(a) * r * 0.42 * 0.12);
          c.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.42 * 0.86);
        }
        c.stroke();
      }

      // ================= A MULHER, vista de costas =================
      const MU = uma('mulher');
      function posMulher(tq) {
        let x = MU.x, pe = [-9, 9], alto = [0, 0], fase = -1;
        for (const [t0, t1, dx] of (MU.passos || [])) {
          const f = trecho(tq, t0, t1);
          if (f > 0 && f < 1) {
            fase = f;
            const corpo = x + dx * suave(f);
            const frente = suave(trecho(f, 0, 0.6)), tras = suave(trecho(f, 0.4, 1));
            pe = [x - 9 + dx * frente - corpo, x + 9 + dx * tras - corpo];
            alto = [7 * Math.sin(Math.PI * trecho(f, 0, 0.6)), 7 * Math.sin(Math.PI * trecho(f, 0.4, 1))];
            x = corpo;
          } else if (f >= 1) x += dx;
        }
        return { x, y: MU.y, pe, alto, fase };
      }
      // flores creme do quimono: sorteadas uma vez, presas ao corpo
      const FLORES = [];
      { const ac = sorteio(SEM * 5 + 1);
        for (let i = 0; i < 70; i++) FLORES.push([mistura(-62, 62, ac()), mistura(-250, -30, ac()), mistura(3.2, 5.4, ac()), ac() * TAU]); }
      function flor(x, y, r, a) {
        for (let i = 0; i < 5; i++) { const b = a + i * TAU / 5; c.moveTo(x + Math.cos(b) * r * 0.75 + r * 0.55, y + Math.sin(b) * r * 0.75); c.arc(x + Math.cos(b) * r * 0.75, y + Math.sin(b) * r * 0.75, r * 0.55, 0, TAU); }
      }
      // P = paleta (a de verdade, ou a do reflexo); m = posMulher; lev = cabeça levantada (0 a 1); tq = tempo da pose
      function corpoMulher(P, m, lev, tq) {
        const bal = 2.5 * Math.sin(tq * 2.1) + (m.fase >= 0 ? 5 * Math.sin(Math.PI * m.fase) : 0);
        const manga = 0.035 * Math.sin(tq * 1.7 + 1) + (m.fase >= 0 ? 0.05 * Math.sin(Math.PI * m.fase) : 0);
        // pernas finas, da barra até a água
        c.fillStyle = P.pele;
        for (let i = 0; i < 2; i++) c.fillRect(m.pe[i] - 3.2, -40 - m.alto[i], 6.4, 40);
        // silhueta do quimono (corpo + as duas mangas compridas)
        const robe = () => {
          c.beginPath();
          c.moveTo(-11, -252); c.quadraticCurveTo(-34, -248, -37, -232);
          c.lineTo(-41 + bal * 0.4, -120); c.lineTo(-43 + bal, -34); c.quadraticCurveTo(0, -30 + bal * 0.2, 41 + bal, -36);
          c.lineTo(38, -120); c.lineTo(37, -232); c.quadraticCurveTo(34, -248, 11, -252); c.closePath();
        };
        const mangaE = () => { c.save(); c.translate(-34, -232); c.rotate(manga); c.beginPath(); c.moveTo(-4, 0); c.lineTo(-20, 102); c.quadraticCurveTo(-18, 118, -4, 116); c.lineTo(8, 96); c.lineTo(6, 0); c.closePath(); c.restore(); };
        const mangaD = () => { c.save(); c.translate(34, -232); c.rotate(-manga * 0.7); c.beginPath(); c.moveTo(4, 0); c.lineTo(18, 92); c.quadraticCurveTo(16, 106, 3, 104); c.lineTo(-6, 86); c.lineTo(-6, 0); c.closePath(); c.restore(); };
        c.fillStyle = P.coral; robe(); c.fill(); mangaE(); c.fill(); mangaD(); c.fill();
        // tom de sombra chapado do lado direito do corpo
        c.save(); robe(); c.clip();
        c.fillStyle = P.coral2; c.beginPath(); c.moveTo(22, -260); c.lineTo(60, -260); c.lineTo(60, 0); c.lineTo(28 + bal, 0); c.closePath(); c.fill();
        c.restore();
        // estampa de flores creme, presa ao tecido
        c.save(); robe(); c.clip();
        c.fillStyle = P.creme; c.beginPath();
        for (const [fx, fy, fr, fa] of FLORES) flor(fx + bal * trecho(fy, -120, -34) * 0.8, fy, fr, fa);
        c.fill();
        c.restore();
        for (const lado of [mangaE, mangaD]) {
          c.save(); lado(); c.clip(); c.fillStyle = P.creme; c.beginPath();
          for (const [fx, fy, fr, fa] of FLORES) flor(fx * 1.4 + (lado === mangaE ? -20 : 20), fy * 0.5 - 120, fr * 0.9, fa);
          c.fill(); c.restore();
        }
        // faixa vermelha na cintura e o laço quadrado nas costas
        c.fillStyle = P.vermelho;
        c.beginPath(); c.moveTo(-38, -202); c.lineTo(38, -204); c.lineTo(38, -176); c.lineTo(-39, -174); c.closePath(); c.fill();
        c.fillRect(-12, -222, 46, 58);
        c.fillStyle = P.vermelho2; c.fillRect(-12, -198, 46, 9);
        // bolsinha vermelha na mão direita (lado esquerdo da imagem)
        c.save(); c.translate(-50, -122); c.rotate(manga * 1.6);
        c.strokeStyle = P.escuro; c.lineWidth = fio(1.6); c.beginPath(); c.moveTo(-7, 12); c.quadraticCurveTo(0, -2, 7, 12); c.stroke();
        c.fillStyle = P.vermelho; c.fillRect(-13, 11, 26, 22);
        c.fillStyle = P.vermelho2; c.fillRect(-13, 11, 26, 5);
        c.restore();
        // pescoço, cabeça e lenço creme
        const hy = -270 - 6 * lev;
        c.fillStyle = P.pele; c.fillRect(-6, hy + 8, 12, -256 - hy);
        c.fillStyle = P.escuro;
        c.beginPath(); c.ellipse(0, hy, 15, 17, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(-1, hy + 13 - 3 * lev, 6 + 2 * lev, 0, TAU); c.fill();            // coque na nuca
        const borda = hy - 2 - 8 * lev;                                                            // cabeça baixa: o lenço cobre mais
        c.fillStyle = P.creme;
        c.save(); c.beginPath(); c.ellipse(0, hy, 16, 18, 0, 0, TAU); c.clip();
        c.beginPath(); c.moveTo(-20, borda + 3); c.quadraticCurveTo(0, borda - 2, 20, borda - 4); c.lineTo(20, hy - 22); c.lineTo(-20, hy - 22); c.closePath(); c.fill();
        c.restore();
        c.beginPath(); c.ellipse(14, borda - 6, 5.5, 4, 0.5, 0, TAU); c.fill();                     // nó do lenço
      }
      const PALM = { coral: C.coral, coral2: C.coral2, vermelho: C.vermelho, vermelho2: hex(C.vermelho, C.escuro, 0.25), creme: C.creme, pele: C.pele, escuro: C.escuro };
      // no reflexo, cada cor afunda na água
      const PALR = {}; for (const n in PALM) PALR[n] = cor(hex(PALM[n], C.agua, 0.5), C.sombra, 0.15);
      function desenhaMulher(tq) {
        const m = posMulher(tq), esc = MU.escala || 1, lev = MU.levanta ? suave(trecho(tq, MU.levanta[0], MU.levanta[1])) : 0;
        // sombra comprida na água, para a esquerda
        c.save(); c.translate(m.x, m.y); c.scale(esc, esc);
        c.globalAlpha = 0.55; c.fillStyle = C.sombra;
        c.beginPath(); c.moveTo(14, 2); c.lineTo(-22, 9); c.lineTo(-215, 8); c.quadraticCurveTo(-232, 4, -214, 0); c.lineTo(-30, -5); c.closePath(); c.fill();
        c.globalAlpha = 1;
        c.restore();
        // reflexo: a figura de cabeça para baixo, em fatias que tremem e deixam frestas de água
        const fatia = 7, nf = 40;
        for (let s = 0; s < nf; s++) {
          const fundo = s / nf, dx = (1.2 + 5 * fundo) * Math.sin(s * 1.3 + tq * 5.3) + (1 + 2 * fundo) * ruido(s * 0.5 + tq * 3, SEM + 9);
          c.save(); c.translate(m.x, m.y); c.scale(esc, esc);
          c.beginPath(); c.rect(-90, 2 + s * fatia, 180, fatia * (0.72 + 0.28 * h2(s, Math.floor(tq * 15)))); c.clip();
          c.translate(dx, 0); c.scale(1, -0.92);
          c.globalAlpha = 0.75 * Math.pow(1 - fundo, 1.3);
          corpoMulher(PALR, m, lev, tq);
          c.restore();
        }
        c.globalAlpha = 1;
        c.save(); c.translate(m.x, m.y); c.scale(esc, esc);
        corpoMulher(PALM, m, lev, tq);
        c.restore();
      }

      // ================= ANÉIS NA ÁGUA =================
      const aneis = [];
      if (MU) for (const [t0, t1] of (MU.passos || [])) {
        for (const [f, lado] of [[0.6, 0], [1, 1]]) {
          const t = t0 + (t1 - t0) * f, m = posMulher(t + 0.001);
          aneis.push({ t, x: m.x + m.pe[lado], y: m.y + 2, v: 70, vida: 2.4, n: 2, r0: 10, passo: true });
        }
      }
      const PET = uma('petala');
      if (PET) aneis.push({ t: PET.cai[1], x: PET.pousa[0], y: PET.pousa[1] + 2, v: 55, vida: 1.6, n: 3, r0: 6 });
      function desenhaAneis(tq) {
        c.strokeStyle = C.creme; c.lineCap = 'round';
        aneis.forEach((a, ai) => {
          for (let j = 0; j < a.n; j++) {
            const tj = tq - a.t - j * 0.38;
            if (tj <= 0 || tj >= a.vida) continue;
            const r = a.r0 + a.v * tj * (1 - 0.18 * tj / a.vida);
            c.globalAlpha = 0.5 * Math.pow(1 - tj / a.vida, 1.4);
            c.lineWidth = fio(1.7);
            c.beginPath();
            const pedacos = 9;
            for (let s = 0; s < pedacos; s++) {
              const a0 = (s + 0.12 * h2(ai * 7 + j, s)) * TAU / pedacos, a1 = a0 + TAU / pedacos * mistura(0.45, 0.8, h2(ai * 7 + j, s + 40));
              c.moveTo(a.x + Math.cos(a0) * r, a.y + Math.sin(a0) * r * 0.27);
              c.ellipse(a.x, a.y, r, r * 0.27, 0, a0, a1);
            }
            c.stroke();
          }
        });
        c.globalAlpha = 1;
      }

      // ================= A CARPA (só a sombra, passando embaixo das folhas) =================
      function desenhaCarpa(p, tq) {
        const f = trecho(tq, p.de, p.ate);
        if (f <= 0 || f >= 1) return;
        const e = mistura(f, suave(f), 0.4), x = mistura(p.x0, p.x1, e), y = mistura(p.y0, p.y1, e) + 8 * Math.sin(f * 5);
        const ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0), onda = Math.sin(tq * 7);
        c.save(); c.translate(x, y); c.rotate(ang); c.scale(p.tamanho || 1, (p.tamanho || 1) * 0.55);
        c.globalAlpha = 0.55 * Math.min(1, f * 6, (1 - f) * 6); c.fillStyle = C.sombra;
        c.beginPath(); c.moveTo(62, 0); c.quadraticCurveTo(40, -22, -10, -18); c.quadraticCurveTo(-40, -12, -58, onda * 4);
        c.quadraticCurveTo(-40, 12, -10, 18); c.quadraticCurveTo(40, 22, 62, 0); c.fill();
        c.beginPath(); c.moveTo(-54, onda * 4); c.lineTo(-92, -16 + onda * 10); c.lineTo(-84, onda * 6); c.lineTo(-92, 18 + onda * 10); c.closePath(); c.fill();
        c.restore(); c.globalAlpha = 1;
      }

      // ================= A LIBÉLULA (corre de um ponto ao outro aos pulos) =================
      function posLibelula(p, tq) {
        const K = p.pulos;
        if (tq <= K[0][0]) return { x: K[0][1], y: K[0][2] };
        for (let i = 0; i < K.length - 1; i++) {
          const [ta, xa, ya] = K[i], [tb, xb, yb] = K[i + 1];
          if (tq <= tb) {
            const f = trecho(tq, ta, tb), corre = limita(f / 0.32), e = saiDevagar(corre);
            const paira = corre >= 1 ? 1 : 0;
            return { x: mistura(xa, xb, e) + 3 * ruido(tq * 4, SEM + 21) * paira, y: mistura(ya, yb, e) - 22 * Math.sin(Math.PI * corre) + 4 * ruido(tq * 3.3, SEM + 22) * paira };
          }
        }
        const u = K[K.length - 1]; return { x: u[1], y: u[2] };
      }
      function desenhaLibelula(p, tq, idx) {
        const { x, y } = posLibelula(p, tq), esc = p.escala || 1, bate = idx % 2;
        c.save(); c.translate(x, y); c.scale(esc, esc);
        c.fillStyle = C.creme; c.globalAlpha = 0.9;
        for (const [ax, rot] of [[2, -0.22], [-3, 0.22]]) { c.beginPath(); c.ellipse(ax, 0, 2.6, bate ? 15 : 11, rot, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
        c.strokeStyle = C.vermelho; c.lineCap = 'round'; c.lineWidth = fio(3.2);
        c.beginPath(); c.moveTo(-18, 1.5); c.lineTo(12, 0); c.stroke();
        c.fillStyle = C.vermelho; c.beginPath(); c.arc(13, 0, 3.4, 0, TAU); c.fill();
        c.restore();
      }

      // ================= A PÉTALA =================
      function desenhaPetala(p, tq) {
        const [t0, t1] = p.cai;
        if (tq < t0) return;
        const f = trecho(tq, t0, t1), bal = p.balanco || 40;
        let x, y, rot, ry;
        if (f < 1) {
          x = mistura(p.de[0], p.pousa[0], f) + bal * Math.sin(f * TAU * 1.6);
          y = mistura(p.de[1], p.pousa[1], Math.pow(f, 1.08));
          rot = 0.9 * Math.sin(f * TAU * 1.6 + 0.8); ry = 3.5 + 2.5 * Math.abs(Math.cos(f * TAU * 1.6));
        } else {
          const d = tq - t1;
          x = p.pousa[0] + 6 * (1 - Math.exp(-d)); y = p.pousa[1]; rot = 0.15; ry = 2.6;
        }
        c.save(); c.translate(x, y); c.rotate(rot);
        c.fillStyle = C.creme; c.beginPath(); c.ellipse(0, 0, 17, ry * 1.6, 0, 0, TAU); c.fill();
        c.restore();
      }

      // ================= TÍTULO (letras em traços, sem fonte instalada) =================
      const TIT = uma('titulo');
      function desenhaTitulo(t) {
        if (!TIT || !H.titulo || t > TIT.ate) return;
        const a = Math.min(trecho(t, TIT.de, TIT.de + 0.6), 1 - trecho(t, TIT.ate - 0.6, TIT.ate));
        if (a <= 0) return;
        const tam = TIT.tamanho || 44, txt = H.titulo.toUpperCase();
        c.setTransform(k, 0, 0, k, 0, 0); ESC = k;
        c.globalAlpha = a; c.strokeStyle = C.creme; c.lineWidth = fio(tam * 0.085); c.lineCap = 'round'; c.lineJoin = 'round';
        let px = TIT.x; const y0 = TIT.y - tam;
        for (const ch of txt) {
          const g = Letras.letra(ch); if (!g) { px += 0.42 * tam; continue; }
          c.beginPath();
          for (const tr of g.tracos) tr.forEach(([u, v], i) => (i ? c.lineTo(px + u * tam, y0 + v * tam) : c.moveTo(px + u * tam, y0 + v * tam)));
          c.stroke();
          px += (g.w + 0.2) * tam;
        }
        c.globalAlpha = 1;
      }

      // ================= GRÃO DE IMPRESSÃO E PAPEL (feitos uma vez, no tamanho da tela) =================
      const graos = [0, 1].map((n) => {
        const cv = novaTela(largura, altura), x = cv.getContext('2d'), img = x.createImageData(largura, altura), d = img.data, ac = sorteio(SEM * 17 + n);
        const fp = 1 / (40 * k);
        for (let j = 0; j < altura; j++) for (let i = 0; i < largura; i++) {
          const papel = (vn(i * fp, j * fp, SEM + 50) - 0.5) * 26 + (vn(i * fp * 6, j * fp * 0.8, SEM + 51) - 0.5) * 14;
          const v = 128 + (ac() - 0.5) * 70 + papel, o = (j * largura + i) * 4;
          d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
        }
        x.putImageData(img, 0, 0); return cv;
      });

      // ---------- desenhar(t): monta o quadro do instante t. Não guarda nada entre quadros. ----------
      function desenhar(t) {
        const { idx, tq } = pose(t);
        CAMQ = camera(t);
        c.reset();                              // o canvas guarda o pincel de um quadro para o outro: começa limpo
        c.drawImage(campo, 0, 0);
        if (NEV) c.drawImage(nevoa, -NEV.anda * t * k, 0);
        // água: faixas claras que deslizam
        camada('agua');
        c.strokeStyle = C.creme; c.lineCap = 'butt';
        for (const o of ondas) {
          c.globalAlpha = o.alfa; c.lineWidth = fio(1.2 + 1.6 * o.perto);
          const x0 = o.x - o.v * t;
          c.beginPath(); for (const [a, b] of o.pedacos) { c.moveTo(x0 + a, o.y); c.lineTo(x0 + b, o.y); } c.stroke();
        }
        c.globalAlpha = 1;
        // meio: anéis, sombra e reflexo da mulher, folhas soltas, a mulher
        camada('meio');
        desenhaAneis(tq);
        // a carpa passa embaixo das folhas da frente
        for (const p of deTipo('carpa')) { camada(p.camada || 'perto'); desenhaCarpa(p, tq); }
        for (const f of folhas) { camada(f.camada); desenhaFolha(f, tq); }
        if (MU) { camada(MU.camada || 'meio'); desenhaMulher(tq); }
        for (const p of deTipo('petala')) { camada(p.camada || 'meio'); desenhaPetala(p, tq); }
        for (const p of deTipo('libelula')) { camada(p.camada || 'meio'); desenhaLibelula(p, tq, idx); }
        desenhaTitulo(t);
        // acabamento: grão fino de impressão e papel por cima de tudo
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.2; c.drawImage(graos[idx % 2], 0, 0);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      }

      // ---------- som: ar, água, passos na água e poucas cordas dedilhadas, nas MESMAS marcas da imagem ----------
      function som() {
        const S = H.som || {}, s = Som.criar(duracao, SEM);
        s.vento(0, duracao, { vol: S.ar ?? 0.1, corte: 900, onda: 0.12, profundidade: 0.5, entra: 1.2, sai: 1.5 });
        s.vento(0, duracao, { vol: S.agua ?? 0.06, corte: 260, onda: 0.3, profundidade: 0.6, entra: 1.0, sai: 1.5 });
        // cada pé que entra na água: um chuá curto e um toque grave e macio
        for (const a of aneis.filter((a) => a.passo)) {
          const pan = limita((a.x - 960) / 960, -1, 1) * 0.6;
          s.vento(a.t - 0.05, 0.45, { vol: 0.07, corte: 1500, onda: 3, entra: 0.04, sai: 0.3, profundidade: 0.2 });
          s.batida(a.t, { vol: 0.07, freq: 85, dur: 0.18, pan });
          s.toque(a.t + 0.02, { vol: 0.03, corte: 1800, dur: 0.08, pan });
        }
        // a libélula: um zumbido curto em cada corrida
        for (const p of deTipo('libelula')) for (const [t0, x] of p.pulos.slice(0, -1)) s.vento(t0, 0.3, { vol: 0.02, corte: 2800, onda: 22, entra: 0.03, sai: 0.15, profundidade: 0.8 });
        // a pétala que pousa: um sino bem baixinho
        if (PET) s.sino('A6', PET.cai[1], 1.4, { vol: 0.04, brilho: 1.2, pan: -0.2 });
        for (const [n, t, d] of (S.notas || [])) { s.corda(n, t, d, { vol: 0.2, maciez: 0.25, pan: -0.1 }); s.corda(n, t + 0.012, d * 0.7, { vol: 0.05, maciez: 0.6, pan: 0.2 }); }
        s.sala(0.35);
        return s.fim({ entra: 0.4, sai: 1.0 });
      }

      return { desenhar, som };
    },
  });
})();
