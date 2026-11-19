// polvo.js — o boneco de papel do motor caixa-sombra: um polvo de juntas, inventado aqui.
// Cabeça de papel com uma janela recortada; atrás da janela, três corações-lanterna pendurados num fio.
// Oito braços feitos de tiras com 14 juntas cada, que enrolam e desenrolam com atraso de junta para junta
// (a ponta chega depois da raiz). As poses vêm de números entre 0 e 1 (nado, cansa, anda), misturados.
// Desenho em coordenadas do boneco: (0, 0) é onde os braços nascem; a cabeça fica para cima (y negativo).
(function () {
  'use strict';
  const { mistura, sorteio, cor: misturaCor, ruido } = Filme;
  const TAU = Math.PI * 2;

  // poses de um braço do lado direito (o esquerdo é o espelho). j = 0 é o de dentro, 3 o de fora.
  const POSES = {
    senta: { a0: [1.05, 0.72, 0.4, 0.12], curva: [-1.0, -1.5, -2.1, -2.6], onda: 0.1 },
    nado: { a0: [1.55, 1.45, 1.36, 1.27], curva: [0.2, 0.12, 0.04, -0.04], onda: 0.32 },
    caido: { a0: [1.42, 1.22, 0.98, 0.78], curva: [-0.25, -0.3, -0.4, -0.5], onda: 0.07 },
  };
  const COMPR = [310, 370, 420, 455], LARG = [46, 43, 39, 35], N = 14;

  // janela em arco (pontos no mesmo sentido da elipse da cabeça)
  function arcoJanela(cx, cy, larg, alt) {
    const r = larg / 2, p = [], base = cy + alt / 2, centro = cy - alt / 2 + r;
    for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; p.push([cx + r * Math.cos(a), centro + r * Math.sin(a)]); }
    for (let i = 1; i <= 6; i++) p.push([cx + r, centro + (base - centro) * i / 6]);
    for (let i = 1; i <= 8; i++) p.push([cx + r - 2 * r * i / 8, base]);
    for (let i = 1; i < 6; i++) p.push([cx - r, base - (base - centro) * i / 6]);
    return p;
  }

  function criar(PA, semente, papel, k) {
    const { recorta, caminho, elipse, coracao } = Papel;
    const peca = (c, P, cor, o = {}) => papel.peca(c, P, cor, { k, ...o });
    // ---------- peças fixas, recortadas uma vez ----------
    const JAN = { cx: 0, cy: -258, larg: 214, alt: 220 };
    const ptsCab = [];
    for (let i = 0; i < 120; i++) {
      const a = TAU * i / 120, s = Math.sin(a);
      const w = 1 - 0.2 * Math.max(0, s) * Math.max(0, s);       // a cabeça afina embaixo
      ptsCab.push([200 * Math.cos(a) * w, -215 + 242 * s]);
    }
    const cabRec = recorta(ptsCab, 3.2, semente + 1);
    const janRec = recorta(arcoJanela(JAN.cx, JAN.cy, JAN.larg, JAN.alt), 2.2, semente + 2);
    const cabeca = new Path2D();
    cabRec.forEach(([x, y], i) => (i ? cabeca.lineTo(x, y) : cabeca.moveTo(x, y))); cabeca.closePath();
    // a janela vai no sentido contrário: vira um furo na cabeça
    [...janRec].reverse().forEach(([x, y], i) => (i ? cabeca.lineTo(x, y) : cabeca.moveTo(x, y))); cabeca.closePath();
    const janela = caminho(janRec);
    const fundoJanela = caminho(recorta(arcoJanela(JAN.cx, JAN.cy + 4, JAN.larg + 30, JAN.alt + 30), 2, semente + 3));
    const olho = caminho(recorta(elipse(0, 0, 46, 46, 48), 1.6, semente + 4));
    const pupila = caminho(recorta(elipse(0, 0, 22, 23, 32), 1.2, semente + 5));
    const cor1 = caminho(recorta(coracao(64), 1.4, semente + 6));
    const cor2 = caminho(recorta(coracao(42), 1.2, semente + 7));
    // bolinhas da cabeça: sorteadas uma vez, fora da janela e dos olhos
    const pintas = new Path2D(), ac = sorteio(semente + 8);
    let feitas = 0;
    for (let tent = 0; tent < 400 && feitas < 16; tent++) {
      const x = (ac() * 2 - 1) * 180, y = -440 + ac() * 430, r = 6 + ac() * 7;
      const dentro = (x / 185) ** 2 + ((y + 215) / 228) ** 2 < 1;
      const naJanela = Math.abs(x) < JAN.larg / 2 + 22 && y > JAN.cy - JAN.alt / 2 - 22 && y < JAN.cy + JAN.alt / 2 + 22;
      const noOlho = Math.hypot(Math.abs(x) - 86, y + 45) < 66;
      if (!dentro || naJanela || noOlho) continue;
      pintas.moveTo(x + r, y); pintas.arc(x, y, r, 0, TAU); feitas++;
    }

    // ---------- lanterna em forma de coração ----------
    function lanterna(c, P, x, y, tam, cor, luz, pulso, fioDe) {
      c.save();
      c.strokeStyle = Papel.rgba(PA.creme, 0.75); c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, fioDe); c.lineTo(x, y - tam * 0.3); c.stroke();
      c.translate(x, y); const e = 1 + 0.12 * pulso; c.scale(e, e);
      if (luz > 0.01) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(0, 0, tam * 0.1, 0, 0, tam * 1.7);
        g.addColorStop(0, Papel.rgba(cor, 0.55 * luz)); g.addColorStop(1, Papel.rgba(cor, 0));
        c.fillStyle = g; c.fillRect(-tam * 1.8, -tam * 1.8, tam * 3.6, tam * 3.6); c.restore();
      }
      peca(c, P, misturaCor(PA.apagado, cor, luz), { alto: 0.6, sombra: 0.5, fio: 0.3 });
      // listras de lanterna (papel mais claro por dentro)
      c.save(); c.clip(P); c.fillStyle = Papel.rgba(PA.creme, 0.18 + 0.4 * luz);
      for (const f of [-0.18, 0.02, 0.22]) c.fillRect(-tam, f * tam, tam * 2, tam * 0.07);
      c.restore();
      c.restore();
    }

    // ---------- um braço ----------
    function braco(c, lado, j, st) {
      const tp = st.t, mix = (campo) => {
        let v = POSES.senta[campo][j] ?? POSES.senta[campo];
        if (Array.isArray(v)) v = v[j];
        const n = Array.isArray(POSES.nado[campo]) ? POSES.nado[campo][j] : POSES.nado[campo];
        const d = Array.isArray(POSES.caido[campo]) ? POSES.caido[campo][j] : POSES.caido[campo];
        v = mistura(v, n, st.nado); v = mistura(v, d, st.cansa); return v;
      };
      let a0 = mix('a0'), curva = mix('curva');
      const onda = mix('onda');
      // andar: cada braço puxa e solta numa hora diferente
      const ph = TAU * 0.85 * tp + j * 1.7 + (lado > 0 ? 0 : 2.4);
      a0 += st.anda * 0.2 * Math.sin(ph);
      curva *= 1 - st.anda * 0.45 * (0.5 + 0.5 * Math.sin(ph + 1.3));
      const comp = COMPR[j] * (1 - 0.08 * st.nado), w0 = LARG[j], seg = comp / N;
      let x = 40 + j * 36, y = -4 + j * 7, ang = a0;
      const cs = [[x, y]], ws = [w0];
      for (let i = 1; i <= N; i++) {
        const u = i / N;
        ang = a0 + curva * Math.pow(u, 2.2) + onda * Math.sin(TAU * 1.05 * tp - i * 0.55 + j * 1.3 + lado) * u;
        x += Math.cos(ang) * seg; y += Math.sin(ang) * seg;
        cs.push([x, y]);
        ws.push(w0 * (1 - 0.84 * Math.pow(u, 0.95)) * (1 + 0.05 * ruido(i * 0.9 + j * 7, 31 + lado)));
      }
      const E = [], D = [];
      for (let i = 0; i <= N; i++) {
        const a = cs[Math.max(0, i - 1)], b = cs[Math.min(N, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const h = ws[i] / 2;
        E.push([lado * (cs[i][0] - ty * h), cs[i][1] + tx * h]); D.push([lado * (cs[i][0] + ty * h), cs[i][1] - tx * h]);
      }
      // contorno único: esquerda até a ponta, volta pela direita
      const Q = new Path2D();
      E.forEach(([px, py], i) => (i ? Q.lineTo(px, py) : Q.moveTo(px, py)));
      for (let i = N; i >= 0; i--) Q.lineTo(D[i][0], D[i][1]);
      Q.closePath();
      peca(c, Q, j % 2 ? PA.coral : PA.coralEsc2 || PA.coral, { alto: 0.9, sombra: 0.45 });
      // ventosas: bolinhas creme ao longo do braço
      const V = new Path2D();
      for (let i = 2; i < N - 1; i += 2) {
        const r = ws[i] * 0.2, px = lado * cs[i][0], py = cs[i][1];
        V.moveTo(px + r, py); V.arc(px, py, r, 0, TAU);
      }
      c.fillStyle = Papel.rgba(PA.creme, 0.92); c.fill(V);
    }

    // a cabeça estica quando nada e amassa quando cansa
    function estica(c, st) {
      const sx = 1 - 0.08 * st.nado + 0.04 * st.cansa, sy = 1 + 0.1 * st.nado - 0.06 * st.cansa;
      c.translate(0, 30); c.scale(sx, sy); c.translate(0, -30);
    }
    // ---------- o polvo inteiro ----------
    // st = { t (tempo das poses, de 2 em 2 quadros), nado, cansa, anda, luz (coração principal), pulso, pulsoG }
    function desenha(c, st) {
      for (const j of [3, 2, 1, 0]) { braco(c, -1, j, st); braco(c, 1, j, st); }
      c.save(); estica(c, st);
      // atrás da janela: fundo escuro e as três lanternas
      c.fillStyle = PA.marinhoEsc; c.fill(fundoJanela);
      const topo = JAN.cy - JAN.alt / 2;
      lanterna(c, cor1, 0, -292, 64, PA.amarelo, st.luz, st.pulso, topo);
      lanterna(c, cor2, -52, -196, 42, PA.coralClaro, 1, st.pulsoG, topo);
      lanterna(c, cor2, 52, -196, 42, PA.coralClaro, 1, st.pulsoG, topo);
      peca(c, cabeca, PA.coral, { alto: 1.2, sombra: 0.6, fio: 0.28 });
      c.fillStyle = Papel.rgba(PA.creme, 0.9); c.fill(pintas);
      // olhos grandes; pálpebra desce quando cansa
      for (const lx of [-86, 86]) {
        c.save(); c.translate(lx, -46);
        peca(c, olho, PA.creme, { alto: 0.5, sombra: 0.4, fio: 0 });
        const py = mistura(0, 13, st.cansa) - 11 * st.nado;
        c.save(); c.translate(lx > 0 ? -4 : 4, py); peca(c, pupila, PA.marinhoEsc, { alto: 0, grao: 0.3, fio: 0 });
        c.fillStyle = PA.creme; c.beginPath(); c.arc(-6, -7, 6, 0, TAU); c.fill(); c.restore();
        if (st.cansa > 0.01) {
          c.save(); c.clip(olho);
          const yb = -46 + 92 * 0.56 * st.cansa;
          c.fillStyle = PA.coral; c.fillRect(-50, -50, 100, yb + 50);
          c.strokeStyle = PA.coralEsc; c.lineWidth = 4; c.beginPath(); c.moveTo(-50, yb); c.lineTo(50, yb); c.stroke();
          c.restore();
        }
        c.restore();
      }
      c.restore();
    }
    // onde fica a janela (para a câmera entrar por ela)
    const centroJanela = [JAN.cx, JAN.cy];
    return { desenha, janela, estica, centroJanela, JAN, lanterna, coracaoGrande: cor1 };
  }

  window.Polvo = { criar };
})();
