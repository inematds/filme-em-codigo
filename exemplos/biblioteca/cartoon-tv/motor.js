// MOTOR "cartoon-tv" — desenho animado de TV em horário nobre (versão genérica): contorno preto
// uniforme em toda forma, cores chapadas com uma sombra de célula (uma meia-lua mais escura), céu de
// sol forte e um fundo de cidade "do futuro" de brinquedo. Animação limitada de TV: o corpo quase não
// mexe; o que anda são os OLHOS (piscam, olham) e a BOCA (troca de forma de três em três quadros).
// Câmera: a cada corte um "soco" de zoom de 9% que assenta rápido, depois um avanço lento e um
// balanço; troca de plano com um clarão branco de 0,12 s (por baixo da legenda).
// Jeito de animar: camadas-planas (canvas 2D), com letras em traços (letras.js).
// Este arquivo sabe DESENHAR as peças. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180, DOISPI = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const TR = H.traco || {};
      const LW = TR.contorno ?? 7;               // contorno preto (px de desenho), igual em tudo
      const SOMBRA = TR.sombra || '#1b2050';     // cor que escurece a sombra de célula
      const QSOMBRA = TR.quantoSombra ?? 0.22;
      let LWC = LW;                               // contorno atual (bonecos pequenos usam um mais fino)
      let T = 0, Q = 0, T0 = 0;                   // tempo, quadro e começo do plano (para piscar e falar)
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const tr = (t, a, b) => (t < a ? 0 : trecho(t, a, b));
      const pop = (t, t0, d = 0.3) => (t < t0 ? 0 : Math.max(0, passa((t - t0) / d)));

      // ---------- sorteio fixo por peça (sem memória): número de -1 a 1 ----------
      const hs = (a, b, d) => {
        let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((d | 0) + 13, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
        return (h >>> 0) / 2147483648 - 1;
      };

      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const sombraDe = (h) => Filme.hex(h, SOMBRA, QSOMBRA);

      // ---------- caminhos (curvas de verdade) ----------
      const ell = (x, y, rx, ry = rx, rot = 0) => () => { c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, DOISPI); };
      const pol = (pts) => () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
      const suave = (pts) => () => { // curva fechada que passa pelo meio de cada lado
        const n = pts.length, m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
        c.beginPath(); const m0 = m(n - 1); c.moveTo(m0[0], m0[1]);
        for (let i = 0; i < n; i++) { const q = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
        c.closePath();
      };
      const rr = (x, y, w, h, r = 18) => () => { c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), Math.max(0, Math.min(r, w / 2, h / 2))); };
      // forma de célula: cor chapada, meia-lua de sombra (sh = deslocamento) e contorno preto
      function cel(path, cr, o = {}) {
        path(); c.fillStyle = cr; c.fill();
        if (o.sh) {
          c.save(); path(); c.clip(); c.fillStyle = sombraDe(cr); c.fill();
          c.translate(-o.sh, -o.sh * 0.8); path(); c.fillStyle = cr; c.fill(); c.restore();
        }
        if (o.borda !== false) { path(); c.strokeStyle = o.bordaCor || cor('tinta'); c.lineWidth = o.lw ?? LWC; c.lineJoin = 'round'; c.stroke(); }
      }
      // traço grosso com contorno (braço, galho, risco): passa o preto mais largo e a cor por cima
      function membro(pts, larg, cr, prog = 1, o = {}) {
        if (prog <= 0 || pts.length < 2) return;
        const caminho = () => {
          const seg = []; let tot = 0;
          for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
          let falta = tot * limita(prog);
          c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length && falta > 0; i++) { const u = Math.min(1, falta / (seg[i - 1] || 1)); falta -= seg[i - 1]; c.lineTo(mistura(pts[i - 1][0], pts[i][0], u), mistura(pts[i - 1][1], pts[i][1], u)); }
        };
        c.lineCap = o.ponta || 'round'; c.lineJoin = 'round';
        if (o.borda !== false) { caminho(); c.strokeStyle = cor('tinta'); c.lineWidth = larg + 2 * (o.lw ?? LWC); c.stroke(); }
        caminho(); c.strokeStyle = cr; c.lineWidth = larg; c.stroke();
      }
      function linha(x0, y0, x1, y1, prog) { if (prog <= 0) return; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mistura(x0, x1, prog), mistura(y0, y1, prog)); c.stroke(); }
      // estrela de raios (o "brilho" de desenho animado)
      function raios(x, y, r1, r2, n, cr, giro = 0, o = {}) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) { const a = giro + (i / (n * 2)) * DOISPI, r = i % 2 ? r2 : r1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        cel(pol(pts), cr, o);
      }
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      // nuvem: várias bolas com um contorno só (o preto largo por baixo, o branco por cima)
      function nuvemDe(bolas, cr) {
        c.fillStyle = cor('tinta');
        for (const [x, y, r] of bolas) { c.beginPath(); c.arc(x, y, r + LWC, 0, DOISPI); c.fill(); }
        c.fillStyle = cr;
        for (const [x, y, r] of bolas) { c.beginPath(); c.arc(x, y, r, 0, DOISPI); c.fill(); }
      }

      // ---------- letras grossas (traço largo de ponta redonda sobre letras.js) ----------
      const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
      const ESPACO = 0.46, ENTRE = 0.27, CELULA = 0.62;
      const digito = (ch) => ch >= '0' && ch <= '9';
      const avanco = (ch, tab) => { if (ch === ' ') return ESPACO; const g = glifo(ch); if (!g) return ESPACO; return (tab && digito(ch) ? CELULA : g.w) + ENTRE; };
      const largTexto = (txt, tam, tab) => { let w = 0; for (const ch of txt) w += avanco(ch, tab); return Math.max(0, w - ENTRE) * tam; };
      function arruma(txt, x, tam, alinha, tab) {
        const w = largTexto(txt, tam, tab);
        let px = alinha === 'esquerda' ? x : alinha === 'direita' ? x - w : x - w / 2;
        const out = []; let palavra = 0;
        for (const ch of txt) {
          if (ch === ' ') { palavra++; px += ESPACO * tam; continue; }
          const g = glifo(ch), dx = tab && digito(ch) ? (CELULA - g.w) / 2 * tam : 0;
          out.push({ g, x: px + dx, palavra }); px += avanco(ch, tab) * tam;
        }
        return { letras: out, w };
      }
      function caminhoLetra(g, x, y, tam) {
        c.beginPath();
        for (const t of g.tracos) t.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (px de borda preta), tabular }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.17;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
        if (o.contorno) { c.strokeStyle = cor('tinta'); c.lineWidth = lw + o.contorno * 2; for (const l of letras) { caminhoLetra(l.g, l.x, y, tam); c.stroke(); } }
        for (const l of letras) { c.strokeStyle = corDe(l.palavra); c.lineWidth = lw; caminhoLetra(l.g, l.x, y, tam); c.stroke(); }
      }
      // rótulo: amarelo (ou a cor pedida) com borda quase preta grossa, reto
      function rotulo(txt, x, y, tam, o = {}) {
        const giro = (o.giro ?? 0) * RAD, cx = o.alinha === 'esquerda' ? x + largTexto(txt, tam, o.tabular) / 2 : o.alinha === 'direita' ? x - largTexto(txt, tam, o.tabular) / 2 : x, cy = y - tam / 2;
        c.save(); c.translate(cx, cy); c.rotate(giro); c.translate(-cx, -cy);
        escreve(txt, x, y, tam, { ...o, contorno: o.contorno ?? Math.max(4, tam * 0.1) });
        c.restore();
      }

      // ---------- confere as letras ao montar: letra que falta dá erro ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confereLetras() {
        const textos = (H.legendas || []).map((l) => l.texto);
        for (const cn of H.cenas) for (const p of cn.pecas) {
          for (const ch of ['texto', 'titulo', 'unidade']) if (p[ch]) textos.push(p[ch]);
          if (p.tipo === 'contador') textos.push(milhar(p.valor));
          if (p.tipo === 'barras') for (const it of p.itens) textos.push(it.nome, it.valor);
          if (p.tipo === 'helice') textos.push(p.esq.rotulo, p.dir.rotulo);
        }
        textos.push('?');
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- cenas e câmera de TV: soco de zoom no corte, assenta, avança devagar e balança ----------
      const CENAS = H.cenas;
      const cenaEm = (t) => { let i = 0; CENAS.forEach((cn, j) => { if (t >= cn.de) i = j; }); return i; };
      const CAM = H.camera || {};
      function camera(t, q, i) {
        const dt = t - CENAS[i].de, f = i * 1.7;
        const z = 1 + (CAM.soco ?? 0.09) * Math.exp(-dt / (CAM.assenta ?? 0.09)) + (CAM.avanco ?? 0.008) * dt;
        let dx = Math.sin(dt * 1.1 + f) * (CAM.balanco ?? 5), dy = Math.cos(dt * 0.8 + f) * (CAM.balanco ?? 5) * 0.6;
        const giro = Math.sin(dt * 0.9 + f) * (CAM.giro ?? 0.25) * RAD;
        for (const tm of H.tremores || []) {
          const q0 = Math.round(tm.t * fps);
          if (q >= q0 && q < q0 + tm.quadros) { const s = sorteio((H.semente || 1) * 1000 + q), fo = tm.forca * (1 - (q - q0) / tm.quadros); dx += (s() * 2 - 1) * fo; dy += (s() * 2 - 1) * fo; }
        }
        return { dx, dy, z, giro };
      }

      // ---------- animação limitada: piscar e boca, contas puras de t (de dois em dois quadros) ----------
      function piscando(sem) {
        const per = 1.9 + (hs(sem, 1, 55) + 1) * 0.9, fase = (hs(sem, 2, 56) + 1) / 2 * per;
        const tq = Math.floor(Q / 2) * 2 / fps, ph = (((tq - T0 + fase) % per) + per) % per;
        return ph < 0.1;
      }
      const BOCAS = ['a', 'e', 'o', 'a', 'fecha', 'e'];
      function bocaDe(o, sem) {
        for (const [a, b] of o.fala || []) if (T >= a && T < b) return BOCAS[Math.floor((hs(sem, Math.floor(Q / 3), 77) + 1) / 2 * BOCAS.length) % BOCAS.length];
        return o.boca || 'sorri';
      }

      // ---------- bonecos (o motor só sorteia entre as listas da história) ----------
      const BO = H.bonecos;
      // (x, yp) = os pés; u = altura. o = { tipo: moderno | cientista | mongol | khan, sem, pele, roupa,
      // cabelo, chapeu, pelo, faixa, cinza (0 a 1), acesa (0 a 1), olha [dx, dy], boca, fala [[de, ate]], ergue (0 a 1) }
      function pessoa(x, yp, u, o = {}) {
        const sem = o.sem || 1, r = sorteio(sem * 31 + 7), pega = (lista) => lista[Math.floor(r() * lista.length)];
        const tipo = o.tipo || 'moderno', longo = tipo === 'mongol' || tipo === 'khan';
        const tg = (h) => (o.cinza ? Filme.hex(h, cor('cinza'), o.cinza * 0.85) : h);
        const pele = tg(o.pele || pega(BO.peles)), roupa0 = o.roupa || pega(longo ? BO.deels : BO.roupas), cabelo = tg(o.cabelo || pega(BO.cabelos));
        const calca = tg(pega(BO.calcas)), faixa = tg(o.faixa || pega(BO.faixas)), chapeu = tg(o.chapeu || pega(BO.chapeus)), pelo = tg(o.pelo || pega(BO.pelos));
        const estilo = Math.floor(r() * 4), oculos = r() < 0.22, bigode = r() < 0.15;
        let roupa = tg(tipo === 'cientista' ? cor('jaleco') : roupa0);
        if (o.acesa) roupa = Filme.hex(roupa, cor('destaque'), o.acesa);
        const tinta = cor('tinta'), lw0 = LWC; LWC = Math.min(LW, Math.max(1.6, 0.03 * u));
        const ys = yp - 0.56 * u, yb = yp - (longo ? 0.07 : 0.2) * u, yh = ys - 0.14 * u, rx = 0.15 * u, ry = 0.165 * u;

        // pernas e sapatos
        if (!longo) for (const s of [-1, 1]) cel(rr(x + s * 0.07 * u - 0.045 * u, yb - 0.04 * u, 0.09 * u, yp - yb, 0.02 * u), calca);
        for (const s of [-1, 1]) cel(ell(x + s * 0.08 * u, yp - 0.015 * u, 0.065 * u, 0.03 * u), longo ? tg(cor('bota')) : tg(cor('sapato')));
        // braços (atrás do corpo) e mãos
        for (const s of [-1, 1]) {
          const sobe = s === 1 ? limita(o.ergue || 0) : 0;
          const mao = [x + s * mistura(0.23, 0.3, sobe) * u, ys + mistura(0.29, -0.16, sobe) * u];
          const cot = [x + s * mistura(0.22, 0.29, sobe) * u, ys + mistura(0.16, 0.0, sobe) * u];
          membro([[x + s * 0.12 * u, ys + 0.04 * u], cot, mao], 0.075 * u, sombraDe(roupa));
          cel(ell(mao[0], mao[1], 0.042 * u, 0.042 * u), pele);
        }
        // corpo (camisa, jaleco ou deel)
        const wt = 0.17 * u, wb = (longo ? 0.25 : 0.16) * u;
        const corpo = suave([[x - wt, ys + 0.05 * u], [x - wt * 0.7, ys - 0.015 * u], [x + wt * 0.7, ys - 0.015 * u], [x + wt, ys + 0.05 * u], [x + wb, yb], [x - wb, yb]]);
        cel(corpo, roupa, { sh: 0.035 * u });
        // pescoço / gola
        if (tipo === 'moderno') cel(pol([[x - 0.06 * u, ys - 0.012 * u], [x + 0.06 * u, ys - 0.012 * u], [x, ys + 0.08 * u]]), pele);
        if (tipo === 'cientista') {
          cel(pol([[x - 0.07 * u, ys - 0.012 * u], [x + 0.07 * u, ys - 0.012 * u], [x, ys + 0.2 * u]]), tg(cor('camisa')));
          c.strokeStyle = tinta; c.lineWidth = LWC * 0.8; c.lineCap = 'round'; linha(x, ys + 0.2 * u, x, yb - 0.01 * u, 1);
          cel(rr(x + 0.05 * u, ys + 0.25 * u, 0.08 * u, 0.06 * u, 0.01 * u), tg(cor('jaleco')), { lw: LWC * 0.7 });
        }
        if (longo) {
          // o deel fecha do lado direito de quem veste (esquerda de quem olha): gola na diagonal e lateral
          const bd = tg(o.borda || (tipo === 'khan' ? cor('ouro') : Filme.hex(roupa0, '#000000', 0.3)));
          membro([[x + 0.05 * u, ys - 0.005 * u], [x - 0.15 * u, ys + 0.2 * u], [x - 0.2 * u, yb - 0.01 * u]], 0.04 * u, bd);
          cel(rr(x - wt - 0.03 * u, yp - 0.37 * u, 2 * wt + 0.06 * u, 0.06 * u, 0.02 * u), faixa);
        }
        // orelhas e cabeça (oval um pouco mais estreito no queixo)
        for (const s of [-1, 1]) cel(ell(x + s * rx, yh + 0.015 * u, 0.03 * u, 0.042 * u), pele);
        const cab = [];
        for (let i = 0; i < 20; i++) { const a = (i / 20) * DOISPI, sn = Math.sin(a); cab.push([x + Math.cos(a) * rx * (sn > 0 ? 1 - 0.14 * sn : 1), yh + sn * ry * (sn > 0 ? 1.04 : 1)]); }
        if (!longo && estilo === 3) nuvemDe(Array.from({ length: 5 }, (_, i) => [x + (i - 2) * 0.07 * u, yh - ry * 0.8 + Math.abs(i - 2) * 0.03 * u, 0.06 * u]), cabelo); // cabelo crespo (atrás)
        cel(suave(cab), pele, { sh: 0.025 * u });
        // cabelo por cima da testa
        if (!longo && estilo !== 2) {
          const pts = [];
          for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.0 + i / 10); pts.push([x + Math.cos(a) * rx * 1.06, yh + Math.sin(a) * ry * 1.07]); }
          pts.push([x + rx * 1.02, yh - 0.02 * u], [x + 0.07 * u, yh - (estilo === 1 ? 0.1 : 0.08) * u], [x - 0.02 * u, yh - 0.085 * u], [x - 0.1 * u, yh - 0.06 * u], [x - rx * 1.02, yh - 0.0 * u]);
          cel(suave(pts), cabelo);
          if (estilo === 1) cel(ell(x + 0.04 * u, yh - ry * 1.02, 0.07 * u, 0.04 * u, -0.3), cabelo); // topete
        }
        // rosto: olhos ovais (piscam e olham), sobrancelhas, nariz curto, boca
        const ey = yh - 0.005 * u, ex = 0.058 * u, erx = 0.032 * u, ery = 0.04 * u;
        const [ox, oy] = o.olha || [0, 0], fechado = piscando(sem);
        for (const s of [-1, 1]) {
          const cx = x + s * ex;
          if (fechado) { c.strokeStyle = tinta; c.lineWidth = LWC; c.lineCap = 'round'; c.beginPath(); c.ellipse(cx, ey, erx, ery * 0.35, 0, 0.1, Math.PI - 0.1); c.stroke(); }
          else {
            cel(ell(cx, ey, erx, ery), cor('branco'), { lw: LWC * 0.8 });
            c.fillStyle = tinta; c.beginPath(); c.arc(cx + ox * 0.012 * u, ey + 0.005 * u + oy * 0.012 * u, 0.017 * u, 0, DOISPI); c.fill();
            c.fillStyle = cor('branco'); c.beginPath(); c.arc(cx + ox * 0.012 * u - 0.006 * u, ey - 0.002 * u + oy * 0.012 * u, 0.0055 * u, 0, DOISPI); c.fill();
          }
          const tb = tipo === 'khan' ? 0.016 * u : 0.011 * u, inc = tipo === 'khan' ? 0.012 * u : -0.004 * u;
          membro([[cx - s * 0.03 * u, ey - 0.06 * u + inc], [cx + s * 0.028 * u, ey - 0.066 * u - inc]], tb, tinta, 1, { borda: false });
        }
        if (oculos || (tipo === 'cientista' && sem % 2 === 0)) { c.strokeStyle = tinta; c.lineWidth = LWC * 0.8; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * ex, ey, 0.05 * u, 0, DOISPI); c.stroke(); } linha(x - ex + 0.05 * u, ey, x + ex - 0.05 * u, ey, 1); }
        c.strokeStyle = tinta; c.lineWidth = LWC * 0.8; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x + 0.004 * u, ey + 0.035 * u); c.quadraticCurveTo(x + 0.03 * u, ey + 0.06 * u, x - 0.002 * u, ey + 0.068 * u); c.stroke();
        boca(x, yh + 0.095 * u, u, bocaDe(o, sem));
        if (tipo === 'khan') {
          // bigode fino e comprido que cai dos lados da boca, e barbicha
          for (const s of [-1, 1]) membro([[x + s * 0.008 * u, yh + 0.075 * u], [x + s * 0.06 * u, yh + 0.085 * u], [x + s * 0.08 * u, yh + 0.17 * u]], 0.014 * u, tinta, 1, { borda: false });
          cel(pol([[x - 0.022 * u, yh + 0.135 * u], [x + 0.022 * u, yh + 0.135 * u], [x, yh + 0.215 * u]]), tinta, { lw: LWC * 0.5 });
        } else if (bigode && tipo === 'moderno') membro([[x - 0.035 * u, yh + 0.08 * u], [x + 0.035 * u, yh + 0.08 * u]], 0.02 * u, cabelo, 1, { borda: false });
        // gorro mongol: copa de feltro com ponta curta e aba de pele dobrada para cima
        if (longo) {
          const ab = yh - ry * 0.42, at = yh - ry * 1.05, wa = rx * 1.15, alto = 0.19 * u;
          const copa = [];
          for (let i = 0; i <= 12; i++) { const an = Math.PI + Math.PI * i / 12, bico = i === 6 ? 1.3 : 1; copa.push([x + Math.cos(an) * wa * 0.8, at + 0.015 * u + Math.sin(an) * alto * bico]); }
          cel(pol(copa), chapeu, { sh: 0.03 * u });
          const pts = [[x - wa * 0.95, ab], [x + wa * 0.95, ab]];
          for (let i = 0; i <= 10; i++) pts.push([x + wa * 1.1 - (2 * wa * 1.1 * i) / 10, at + (i % 2 ? 0.012 : -0.022) * u]);
          cel(suave(pts), pelo, { sh: 0.02 * u });
          cel(ell(x, at + 0.015 * u - alto * 1.3, 0.028 * u), tipo === 'khan' ? tg(cor('ouro')) : tg(cor('vermelho')));
        }
        LWC = lw0;
      }
      function boca(x, y, u, f) {
        const tinta = cor('tinta');
        c.lineCap = 'round'; c.lineJoin = 'round';
        if (f === 'sorri' || f === 'fecha') {
          c.strokeStyle = tinta; c.lineWidth = LWC * 0.9; c.beginPath(); c.moveTo(x - 0.035 * u, y);
          c.quadraticCurveTo(x, y + (f === 'sorri' ? 0.025 : 0.004) * u, x + 0.035 * u, y - (f === 'sorri' ? 0.004 : 0) * u); c.stroke(); return;
        }
        const [bx, by] = f === 'a' ? [0.032, 0.03] : f === 'o' ? [0.018, 0.025] : [0.04, 0.014];
        const forma = ell(x, y + by * 0.4 * u, bx * u, by * u);
        forma(); c.fillStyle = cor('boca'); c.fill();
        if (f !== 'e') { c.save(); forma(); c.clip(); c.fillStyle = cor('lingua'); c.beginPath(); c.ellipse(x, y + by * 1.2 * u, bx * 0.75 * u, by * 0.55 * u, 0, 0, DOISPI); c.fill(); c.restore(); }
        forma(); c.strokeStyle = tinta; c.lineWidth = LWC * 0.8; c.stroke(); // refaz o contorno depois do clip
      }

      // ---------- as peças ----------
      const M = 110; // sobra fora da tela (a câmera balança e treme)
      const PECAS = {
        // ---- cenário ----
        fundo(p) { c.fillStyle = p.cor; c.fillRect(-M - 60, -M - 60, L + 2 * M + 120, A + 2 * M + 120); },
        ceu(p) { // degradê de céu de TV (azul forte em cima, claro no horizonte)
          const g = c.createLinearGradient(0, p.y0 ?? 0, 0, p.y1 ?? 900);
          g.addColorStop(0, p.alto); g.addColorStop(1, p.baixo);
          c.fillStyle = g; c.fillRect(-M - 60, -M - 60, L + 2 * M + 120, A + 2 * M + 120);
        },
        faixa(p) { // chão de lado a lado, de y0 até embaixo, com a borda de cima ondulada
          const pts = [], n = 16;
          for (let i = 0; i <= n; i++) { const x = -M - 40 + (L + 2 * M + 80) * i / n; pts.push([x, p.y0 + Math.sin(i * 1.7 + (p.fase || 0)) * (p.onda || 0)]); }
          pts.push([L + M + 40, (p.y1 ?? A) + M + 60], [-M - 40, (p.y1 ?? A) + M + 60]);
          cel(p.onda ? suave(pts) : pol(pts), p.cor, { borda: p.borda !== false });
        },
        morro(p, t) {
          if (p.t !== undefined && t < p.t) return;
          const s = p.t !== undefined ? pop(t, p.t, 0.3) : 1;
          emVolta(p.x, p.y + p.a, s, () => { // contorno só no arco de cima (os lados retos não aparecem)
            cel(() => { c.beginPath(); c.ellipse(p.x, p.y + p.a, p.l, p.a, 0, Math.PI, DOISPI); c.lineTo(p.x + p.l, p.y + p.a + (p.fundo || 600)); c.lineTo(p.x - p.l, p.y + p.a + (p.fundo || 600)); c.closePath(); }, p.cor, { sh: p.sombra === false ? 0 : 18, borda: false });
            c.beginPath(); c.ellipse(p.x, p.y + p.a, p.l, p.a, 0, Math.PI, DOISPI); c.strokeStyle = cor('tinta'); c.lineWidth = LWC; c.stroke();
          });
        },
        montanhas(p) {
          const pts = [[-M - 40, p.y + 60]];
          for (const [x, h] of p.picos) pts.push([x, p.y - h]);
          pts.push([L + M + 40, p.y + 60]);
          cel(pol(pts), p.cor, { lw: LW * 0.7 });
          if (p.neve) for (const [x, h] of p.picos) if (h > 100) cel(pol([[x - 34, p.y - h + 40], [x, p.y - h], [x + 34, p.y - h + 40], [x + 12, p.y - h + 30], [x - 8, p.y - h + 44]]), cor('branco'), { lw: LW * 0.5 });
        },
        cidade(p, t, sem) { // cidade "do futuro" de brinquedo ao longe: cúpulas, torres de bola e antenas
          const r = sorteio(sem + 5), lw0 = LWC; LWC = LW * 0.6;
          for (let i = 0; i < p.n; i++) {
            const x = p.x0 + i * p.dx + (r() - 0.5) * p.dx * 0.5, tipo = Math.floor(r() * 3), h = p.alto * (0.5 + r() * 0.7), cr = r() < 0.5 ? p.cor : p.cor2;
            if (tipo === 0) cel(() => { c.beginPath(); c.ellipse(x, p.y, h * 0.45, h * 0.4, 0, Math.PI, DOISPI); c.closePath(); }, cr);
            else if (tipo === 1) { cel(rr(x - 9, p.y - h, 18, h, 4), cr); cel(ell(x, p.y - h, 26), cr); membro([[x, p.y - h - 26], [x, p.y - h - 60]], 4, cr, 1, { lw: LWC * 0.6 }); }
            else { cel(pol([[x - 22, p.y], [x - 6, p.y - h], [x + 6, p.y - h], [x + 22, p.y]]), cr); cel(ell(x, p.y - h, 44, 12), cr); }
          }
          LWC = lw0;
        },
        disco(p, t) { // disco voador que passa devagar (as luzes trocam de dois em dois quadros)
          if (p.de !== undefined && (t < p.de || t > p.ate)) return;
          const x = p.x + p.vel * (t - (p.de || 0)), y = p.y + Math.sin(t * 2.2) * 8, s = p.tam, lw0 = LWC; LWC = LW * 0.7;
          cel(ell(x, y - 0.22 * s, 0.32 * s, 0.26 * s), cor('vidroDisco'));
          cel(ell(x, y, s, 0.24 * s), cor('disco'), { sh: 0.06 * s });
          const fase = Math.floor(Q / 4);
          for (let i = 0; i < 5; i++) cel(ell(x + (i - 2) * 0.36 * s, y + 0.04 * s, 0.07 * s), (i + fase) % 2 ? cor('destaque') : cor('acento'), { lw: LWC * 0.6 });
          LWC = lw0;
        },
        nuvem(p, t) {
          const x = p.x + (p.deriva || 0) * t, s = p.tam || 1;
          nuvemDe([[-90, 12, 58], [-30, -22, 74], [52, -8, 64], [104, 18, 44], [12, 26, 60]].map(([dx, dy, r]) => [x + dx * s, p.y + dy * s, r * s]), cor('nuvem'));
        },
        sol(p) { cel(ell(p.x, p.y, p.r), p.cor, { lw: LW * 0.8 }); },
        ger(p) { // tenda de feltro branco com faixas vermelha e azul e porta vermelha
          const s = p.tam, x = p.x, y = p.y, lw0 = LWC; LWC = LW * 0.7;
          cel(suave([[x - s, y], [x - s, y - 0.5 * s], [x - 0.6 * s, y - 0.86 * s], [x, y - 1.0 * s], [x + 0.6 * s, y - 0.86 * s], [x + s, y - 0.5 * s], [x + s, y]]), cor('feltro'), { sh: 0.12 * s });
          cel(rr(x - s * 0.98, y - 0.52 * s, 1.96 * s, 0.1 * s, 2), cor('vermelho'), { lw: LWC * 0.6 });
          cel(rr(x - 0.18 * s, y - 0.42 * s, 0.36 * s, 0.42 * s, 4), cor('vermelho'), { lw: LWC * 0.6 });
          LWC = lw0;
        },
        ret(p) { cel(rr(p.x, p.y, p.l, p.a, p.raio ?? 0), p.cor, { borda: p.borda !== false }); },
        luz(p) { // luminária com o cone de luz
          alfa(p.alfa ?? 0.2);
          pol([[p.x - 60, p.y], [p.x + 60, p.y], [p.x + p.l / 2, p.y1], [p.x - p.l / 2, p.y1]])(); c.fillStyle = p.cor; c.fill();
          alfa(1);
          cel(pol([[p.x - 120, p.y], [p.x - 50, p.y - 90], [p.x + 50, p.y - 90], [p.x + 120, p.y]]), cor('abajur'), { sh: 14 });
          cel(ell(p.x, p.y + 6, 34, 18), p.cor);
        },
        escurece(p) { alfa(p.alfa); c.fillStyle = p.cor; c.fillRect(-M - 60, -M - 60, L + 2 * M + 120, A + 2 * M + 120); alfa(1); },
        cavaleiros(p, t, sem) { // fila de cavaleiros a galope (pernas balançam, corpo sobe e desce)
          for (let i = 0; i < p.n; i++) {
            const x = ((p.x0 + i * p.dx + (p.vel || 0) * t) % (L + 2 * M + 300)) - M - 150, s = p.tam, f = t * 13 + i * 1.3;
            const y = p.y + (i % 2) * 18 - Math.abs(Math.sin(f / 2)) * 0.05 * s;
            cavalo(x, y, s, f, sem + i * 10);
            pessoa(x - 0.04 * s, y - 0.12 * s, 0.75 * s, { tipo: 'mongol', sem: sem + i * 10 + 3, olha: [1, 0] });
            if (i % 2 === 0) { membro([[x - 0.22 * s, y - 0.25 * s], [x - 0.22 * s, y - 1.3 * s]], 0.03 * s, cor('madeira')); cel(pol([[x - 0.22 * s, y - 1.3 * s], [x + 0.2 * s, y - 1.2 * s + Math.sin(f) * 0.02 * s], [x - 0.22 * s, y - 1.08 * s]]), cor('vermelho')); }
          }
        },

        // ---- peças da história ----
        texto(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.3), s = p.sobe ? 1 : pop(t, p.t), dy = p.sobe ? (1 - sai(u)) * 60 : 0;
          alfa((p.sobe ? Math.max(0.34, u) : 1) * some(p, t));
          emVolta(p.x, p.y - p.tam * 0.45, s, () => rotulo(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor || 'destaque', cores: p.cores, tabular: p.tabular, giro: p.giro }));
          if (p.risco && t >= p.risco.de) {
            const w = largTexto(p.texto, p.tam) + p.tam * 0.6, yc = p.y - p.tam * 0.45, pr = sai(tr(t, p.risco.de, p.risco.ate));
            alfa(1); membro([[p.x - w / 2, yc + p.tam * 0.12], [p.x + w / 2, yc - p.tam * 0.1]], p.tam * 0.14, cor(p.risco.cor || 'acento'), pr);
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = tr(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v)), s = u >= 1 ? 1 + 0.08 * (1 - tr(t, p.ate, p.ate + 0.3)) : 1;
          emVolta(p.x, p.y - p.tam / 2, s, () => rotulo(txt, p.x, p.y, p.tam, { cor: p.cor, tabular: true }));
        },
        multidao(p, t, sem) {
          if (t < p.de) return;
          const ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.5) : 0, nl = p.linhas.length, quem = [];
          p.linhas.forEach((ln, j) => { const x0 = p.x - (p.colunas - 1) * ln.dx / 2 + (j % 2 ? ln.dx * 0.3 : -ln.dx * 0.2); for (let i = 0; i < p.colunas; i++) quem.push({ x: x0 + i * ln.dx + hs(sem, j * 31 + i, 5) * 10, y: ln.y, u: ln.tam }); });
          const n = quem.length, liga = p.liga && t >= p.liga.de;
          quem.forEach((b, i) => {
            const t0 = p.de + (p.ate - p.de) * (i / n), s = pop(t, t0, 0.3);
            const olha = liga ? [limita((p.liga.para[0] - b.x) / 300, -1, 1), -1] : [hs(sem, i, 3) * 0.6, 0];
            alfa(1); emVolta(b.x, b.y, s, () => pessoa(b.x, b.y, b.u, { sem: sem * 100 + i, cinza: ap, olha, boca: liga ? 'o' : 'sorri' }));
          });
          if (liga) { // linhas pretas de cada cabeça até um ponto
            c.strokeStyle = cor('tinta'); c.lineWidth = 3; c.lineCap = 'round';
            quem.forEach((b, i) => {
              const atraso = (nl - 1 - Math.floor(i / p.colunas)) * 0.05;
              alfa(0.75); linha(b.x, b.y - b.u * 0.9, p.liga.para[0], p.liga.para[1], sai(tr(t, p.liga.de + atraso, p.liga.ate)));
            });
            alfa(1);
          }
        },
        heroi(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4);
          alfa(1);
          if (p.estrela) emVolta(p.x, p.y - p.tam * 0.55, s, () => raios(p.x, p.y - p.tam * 0.55, p.estrela, p.estrela * 0.62, 16, cor('destaque'), t * 0.25));
          emVolta(p.x, p.y, s, () => pessoa(p.x, p.y, p.tam, { tipo: 'khan', sem: 707, pele: cor('peleKhan'), roupa: cor('deelKhan'), chapeu: cor('chapeuKhan'), pelo: cor('peloKhan'), faixa: cor('faixaKhan'), fala: p.fala, ergue: p.ergue ? sai(tr(t, p.ergue, p.ergue + 0.3)) : 0 }));
        },
        janela(p, t, sem) { // painel de TV: tela creme com barra de título laranja
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            cel(rr(x, y, p.l, p.a, 30), cor(p.cor || 'folha'), { lw: LW * 1.2 });
            cel(() => { c.beginPath(); c.roundRect(x, y, p.l, 110, [30, 30, 0, 0]); }, cor('acento'), { lw: LW * 1.2 });
            for (let i = 0; i < 3; i++) cel(ell(x + 50 + i * 42, y + 55, 13), cor(['branco', 'destaque', 'branco'][i]), { lw: LW * 0.6 });
            rotulo(p.titulo, p.x + 60, y + 74, 36, { cor: 'branco' });
          });
        },
        cientista(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3);
          alfa(1); emVolta(p.x, p.y, s, () => pessoa(p.x, p.y, p.tam, { tipo: 'cientista', sem: p.sem || 1, fala: p.fala, olha: p.olha }));
        },
        tubos(p, t, sem) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.6, h = p.tam;
          cel(rr(x0 - p.dx * 0.6, p.y + h * 0.18, (p.n - 1) * p.dx + p.dx * 1.2, h * 0.22, 10), cor('suporte'), { sh: 8 });
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(tr(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              if (cheio > 0) raios(x, p.y, w * 1.7 * cheio, w * 1.1 * cheio, 10, cor('destaque'), t * 0.8);
              const tubo = () => { c.beginPath(); c.moveTo(x - w / 2, p.y - h / 2); c.lineTo(x - w / 2, p.y + h / 2 - w / 2); c.arc(x, p.y + h / 2 - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, p.y - h / 2); c.closePath(); };
              tubo(); c.fillStyle = cor('vidro'); c.fill();
              const nivel = mistura(0.3, 0.92, cheio), crL = cheio > 0 ? cor('destaque') : BO.liquidos[i % BO.liquidos.length];
              c.save(); tubo(); c.clip(); c.fillStyle = crL; c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h); c.restore();
              tubo(); c.strokeStyle = cor('tinta'); c.lineWidth = LW * 0.7; c.lineJoin = 'round'; c.stroke();
              cel(rr(x - w / 2 - 6, p.y - h / 2 - 10, w + 12, 16, 5), cor('acento'), { lw: LW * 0.6 });
            });
          }
        },
        fila(p, t, sem) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas.length;
          for (let i = 0; i < n; i++) {
            const ln = p.linhas[Math.floor(i / p.colunas)], x = p.x - (p.colunas - 1) * p.dx / 2 + (i % p.colunas) * p.dx;
            const s = pop(t, p.de + (p.ate - p.de) * i / n, 0.3);
            const eu = p.acende && i === p.acende.i, ac = eu ? tr(t, p.acende.t, p.acende.t + 0.1) : 0, depois = p.acende && t >= p.acende.t;
            const sa = ac > 0 ? 1 + 0.1 * Math.sin(Math.PI * tr(t, p.acende.t, p.acende.t + 0.4)) : 1;
            alfa(1);
            emVolta(x, ln.y, s * sa, () => {
              if (ac > 0) raios(x, ln.y - ln.tam * 0.55, ln.tam * 0.66, ln.tam * 0.46, 12, cor('destaque'), t * 0.5);
              pessoa(x, ln.y, ln.tam, { sem: sem * 50 + i, acesa: ac, cinza: ac > 0 ? 0 : (depois ? 0.35 : 0), boca: ac > 0 ? 'a' : 'sorri', ergue: ac > 0 ? sai(tr(t, p.acende.t, p.acende.t + 0.25)) : 0, olha: depois && !eu ? [((p.acende.i % p.colunas) - (i % p.colunas)) > 0 ? 1 : -1, 0] : [0, 0] });
            });
          }
        },
        mapa(p, t, sem) {
          if (t < p.contorno.de) return;
          const T_ = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(tr(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          const pa = p.painel, s0 = pop(t, p.contorno.de, 0.3);
          emVolta(p.x, p.y, s0, () => {
            cel(rr(pa.x, pa.y, pa.l, pa.a, 24), cor('mar'), { lw: LW * 1.2 });
            c.save(); rr(pa.x + 4, pa.y + 4, pa.l - 8, pa.a - 8, 20)(); c.clip();
            const terras = [T_.eurasia, ...(T_.ilhas || [])].map((r) => r.map(pj));
            const pc = sai(tr(t, p.contorno.de, p.contorno.ate));
            alfa(tr(t, p.contorno.de + 0.3, p.contorno.ate + 0.2));
            terras.forEach((r) => { pol(r)(); c.fillStyle = cor('terraMapa'); c.fill(); });
            alfa(1); c.strokeStyle = cor('tinta'); c.lineWidth = LW * 0.8; c.lineJoin = 'round'; c.lineCap = 'round';
            for (const r of terras) { // contorno que se desenha
              const pts = [...r, r[0]], seg = []; let tot = 0;
              for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
              let falta = tot * pc; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
              for (let i = 1; i < pts.length && falta > 0; i++) { const u = Math.min(1, falta / seg[i - 1]); falta -= seg[i - 1]; c.lineTo(mistura(pts[i - 1][0], pts[i][0], u), mistura(pts[i - 1][1], pts[i][1], u)); }
              c.stroke();
            }
            const forma = (pts) => suave(pts.map(pj));
            if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste
              const xs = T_.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
              const xc = mistura(xb + 10, xa - 10, sai(tr(t, p.regiao.de, p.regiao.ate)));
              const im = p.imperio ? tr(t, p.imperio.de, p.imperio.de + 0.4) : 0;
              c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
              alfa(1 - 0.75 * im); cel(forma(T_.regiao), cor('regiao'), { lw: LW * 0.8 });
              c.restore();
              if (p.aneis && t >= p.aneis.t) { // pontinhos pretos que pipocam dentro da região
                const ys = T_.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T_.regiao.map((q) => q[0]), passo = p.aneis.passo;
                c.save(); forma(T_.regiao)(); c.clip(); let i = 0;
                for (let lat = la + passo / 2; lat < lb; lat += passo * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? passo / 2 : 0); lon < Math.max(...lo); lon += passo) {
                  const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                  if (s <= 0) continue;
                  alfa(1 - 0.75 * im); c.beginPath(); c.arc(x, y, 7 * s, 0, DOISPI); c.fillStyle = cor('tinta'); c.fill();
                }
                c.restore(); alfa(1);
              }
            }
            if (p.imperio && t >= p.imperio.pulsa) { // o império cresce de um ponto que pulsa
              const [px, py] = pj(p.imperio.ponto);
              if (t >= p.imperio.de) {
                const u = sai(tr(t, p.imperio.de, p.imperio.ate));
                c.save(); ell(px, py, 20 + u * 700)(); c.clip();
                cel(forma(T_.imperio), cor('imperio'), { lw: LW * 0.9, sh: 10 });
                c.restore();
              }
              const fase = ((t - p.imperio.pulsa) / 0.6) % 1, sp = pop(t, p.imperio.pulsa, 0.3);
              c.strokeStyle = cor('tinta'); c.lineWidth = 5; alfa(1 - fase); c.beginPath(); c.arc(px, py, 12 + fase * 40, 0, DOISPI); c.stroke();
              alfa(1); cel(ell(px, py, 13 * sp), cor('tinta'), { borda: false }); cel(ell(px, py, 6 * sp), cor('branco'), { borda: false });
            }
            c.restore();
          });
          c.restore();
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo;
            if (t < t0) return;
            const u = passa(tr(t, t0, t0 + p.dur)), D = it.cor === 'destaque';
            alfa(1);
            rotulo(it.nome, p.x - 24, y + 17, 36, { cor: D ? 'destaque' : 'branco', alinha: 'direita' });
            const w = Math.max(14, p.larg * it.v / p.maximo * u);
            cel(rr(p.x, y - p.alt / 2, w, p.alt, 12), cor(D ? 'acento' : it.cor), { sh: 6 });
            if (tr(t, t0 + p.dur * 0.6, t0 + p.dur) > 0) rotulo(it.valor, p.x + w + 22, y + 16, 34, { cor: D ? 'destaque' : 'branco', alinha: 'esquerda', tabular: true });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; if (t >= t1) rotulo(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 14, 32, { cor: 'branco' }); }
        },
        pasta(p, t) { // pasta de arquivo parda com aba
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            cel(() => { c.beginPath(); c.roundRect(x + 20, y - 64, 380, 90, [20, 20, 0, 0]); }, cor('pastaEscura'));
            cel(rr(x, y, p.l, p.a, 22), cor('pasta'), { sh: 16, lw: LW * 1.2 });
            rotulo(p.titulo, x + 210, y - 14, 30, { cor: 'branco' });
            c.strokeStyle = cor('pastaEscura'); c.lineCap = 'round'; c.lineWidth = 14;
            for (let i = 0; i < (p.linhas || 0); i++) { const yy = y + 80 + i * 80, w = p.l * (i % 3 === 1 ? 0.45 : 0.7), pr = tr(t, p.t + 0.1 + i * 0.05, p.t + 0.4 + i * 0.05); linha(x + 70, yy, x + 70 + w, yy, pr); }
          });
        },
        carimbo(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.2), s = mistura(1.9, 1, sai(u)), ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.2) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD, cr = Filme.hex(cor('vermelho'), cor('cinza'), ap);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.8;
          alfa(limita(u * 2) * (1 - 0.35 * ap));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          c.strokeStyle = cr; c.lineJoin = 'round';
          rr(-w / 2, -h / 2, w, h, 16)(); c.lineWidth = 10; c.stroke();
          rr(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 8)(); c.lineWidth = 4; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr });
          c.restore();
          if (p.risco && t >= p.risco.de) { // um risco amarelo grosso atravessa o carimbo
            alfa(1); c.save(); c.translate(p.x, p.y); c.rotate(giro);
            membro([[-w / 2 - 30, 14], [w / 2 + 30, -14]], p.tam * 0.4, cor('destaque'), sai(tr(t, p.risco.de, p.risco.ate)), { ponta: 'butt' });
            c.restore();
          }
        },
        tumulos(p, t) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? tr(t, p.borda, p.borda + 0.3) : 1;
          alfa(1); cel(ell(p.x, p.y + s * 0.1, s * 2.5, s * 1.05), cor('buraco'), { lw: LW * 0.8 });
          [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([i, j], n) => {
            const x = p.x + i * s * 1.2, y = p.y + j * s * 0.55, sc = pop(t, p.t + n * 0.1, 0.3);
            alfa(1);
            emVolta(x, y, sc, () => {
              const monte = () => { c.beginPath(); c.ellipse(x, y, s, s * 0.45, 0, Math.PI, DOISPI); c.closePath(); };
              if (b > 0) { monte(); c.strokeStyle = cor('destaque'); c.lineWidth = LW + 14 * b; c.lineJoin = 'round'; c.stroke(); }
              cel(monte, cor('monte'), { sh: 0.08 * s });
              for (let q = 0; q < 4; q++) cel(ell(x + (q - 1.5) * s * 0.42, y - 6, s * 0.1, s * 0.07), cor('pedra'), { lw: LW * 0.6 });
            });
          });
        },
        helice(p, t, sem) {
          if (t < p.de) return;
          const n = 20, u = sai(tr(t, p.de, p.ate)), giro = t * 2.4;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5); if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 70, fr = Math.cos(f);
            alfa(vis); c.strokeStyle = cor('tinta'); c.lineWidth = 5; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof, cr] of [[ax, fr, 'acento'], [-ax, -fr, 'azul']]) cel(ell(p.x + sx, y, 12 + 5 * (prof + 1) / 2), cor(cr), { lw: 4 });
          }
          alfa(1);
          if (p.divide && t >= p.divide) {
            const v = tr(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'destaque', m = 12, crr = D ? cor('destaque') : cor('cinza');
              for (let i = 1; i <= m; i++) { const q = i / m; if (q > v) break; const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30; cel(ell(x, y, 12), crr, { lw: 4 }); }
              if (v >= 1) {
                const s = pop(t, p.divide + p.durDivide, 0.3);
                emVolta(r.x, r.y - 50, s, () => { // o cromossomo Y
                  membro([[r.x - 30, r.y - 100], [r.x, r.y - 55], [r.x + 30, r.y - 100]], 26, crr);
                  membro([[r.x, r.y - 58], [r.x, r.y - 14]], 26, crr);
                });
                rotulo(r.rotulo, r.x, r.y - 135, 42, { cor: D ? 'destaque' : 'cinza' });
              }
            }
          }
        },
        arvore(p, t, sem) { // árvore de família: a raiz em cima, os descendentes em medalhões embaixo
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, r: p.raizTam / 2 }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, r: nv.tam / 2 }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(tr(t, t0, t0 + passo * 0.8)), pais = nos[l - 1], filhos = nos[l], por = filhos.length / pais.length;
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / por)];
              alfa(1); membro([[pai.x, pai.y + pai.r * 0.6], [f.x, f.y - f.r * 0.6]], Math.max(12, 30 - l * 6), cor('galho'), pr);
              if (pr >= 1) { const mx = (pai.x + f.x) / 2, my = (pai.y + f.y) / 2; cel(ell(mx + 14, my - 4, 26 - l * 3, 16 - l * 2, 0.5), cor(j % 2 ? 'folha1' : 'folha2'), { lw: LW * 0.6 }); }
            });
            filhos.forEach((f, j) => {
              const s = pop(t, t0 + passo * 0.5 + j * 0.02, 0.3);
              emVolta(f.x, f.y, s, () => medalhao(f.x, f.y, f.r, sem * 10 + l * 37 + j, {}));
            });
          }
        },
        raiz(p, t, sem) { // o medalhão de cima: o khan, que vira contorno com "?"
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), cont = p.contorno ? tr(t, p.contorno, p.contorno + 0.3) : 0;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            if (cont < 1) { alfa(1 - cont); raios(p.x, p.y, p.tam * 0.88, p.tam * 0.66, 16, cor('destaque'), t * 0.3); alfa(1); }
            medalhao(p.x, p.y, p.tam / 2, sem, { khan: true, vazio: cont });
          });
          if (p.interroga && t >= p.interroga) emVolta(p.x, p.y, pop(t, p.interroga + 0.1, 0.3), () => rotulo('?', p.x, p.y + p.tam * 0.18, p.tam * 0.42, { cor: 'destaque' }));
        },
      };
      const some = (p, t) => (p.some ? 1 - tr(t, p.some, p.some + 0.2) : 1);
      for (const cn of H.cenas) for (const p of cn.pecas) if (!PECAS[p.tipo]) throw new Error('Peça sem desenho no motor: ' + p.tipo);

      // cavalo de desenho: corpo oval, pescoço, cabeça, crina, rabo e pernas que balançam (f = fase)
      function cavalo(x, y, s, f, sem) {
        const crv = cor('cavalo'), lw0 = LWC; LWC = Math.min(LW, 0.035 * s);
        const perna = (hx, fa) => { const a = Math.sin(f + fa) * 0.45; membro([[x + hx * s, y - 0.06 * s], [x + (hx + Math.sin(a) * 0.12) * s, y + 0.2 * s], [x + (hx + Math.sin(a) * 0.2) * s, y + 0.38 * s]], 0.075 * s, crv); };
        perna(-0.28, 0); perna(0.26, Math.PI);
        membro([[x - 0.42 * s, y - 0.2 * s], [x - 0.6 * s, y - 0.05 * s + Math.sin(f) * 0.04 * s], [x - 0.62 * s, y + 0.12 * s]], 0.08 * s, cor('crina'));
        cel(ell(x, y - 0.12 * s, 0.46 * s, 0.21 * s), crv, { sh: 0.03 * s });
        cel(pol([[x + 0.26 * s, y - 0.28 * s], [x + 0.5 * s, y - 0.58 * s], [x + 0.62 * s, y - 0.5 * s], [x + 0.42 * s, y - 0.06 * s]]), crv);
        cel(ell(x + 0.66 * s, y - 0.52 * s, 0.17 * s, 0.085 * s, 0.55), crv);
        membro([[x + 0.3 * s, y - 0.33 * s], [x + 0.52 * s, y - 0.62 * s]], 0.05 * s, cor('crina'), 1, { borda: false });
        c.fillStyle = cor('tinta'); c.beginPath(); c.arc(x + 0.66 * s, y - 0.57 * s, 0.018 * s, 0, DOISPI); c.fill();
        perna(-0.18, Math.PI); perna(0.36, 0);
        LWC = lw0;
      }

      // medalhão: moldura redonda com um busto dentro (recortado no círculo)
      function medalhao(x, y, r, sem, o) {
        cel(ell(x, y, r * 1.12), cor('acento'), { lw: LW * 0.8 });
        cel(ell(x, y, r), cor('moldura'), { lw: LW * 0.6 });
        c.save(); ell(x, y, r * 0.98)(); c.clip();
        const a0 = c.globalAlpha;
        if (o.khan) { // o Khan inteiro e opaco; o "sumir" é a moldura vazia pintada por cima (sem transparência de peça por peça)
          if ((o.vazio || 0) < 1) pessoa(x, y + r * 1.45, r * 2.0, { tipo: 'khan', sem: 707, pele: cor('peleKhan'), roupa: cor('deelKhan'), chapeu: cor('chapeuKhan'), pelo: cor('peloKhan'), faixa: cor('faixaKhan') });
          if (o.vazio > 0) { c.globalAlpha = a0 * limita(o.vazio); c.fillStyle = cor('moldura'); c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); c.globalAlpha = a0; }
        } else pessoa(x, y + r * 1.25, r * 2.3, { sem });
        c.restore();
        ell(x, y, r)(); c.strokeStyle = cor('tinta'); c.lineWidth = LW * 0.6; c.stroke();
      }

      // ---------- legendas: o cartão inteiro de uma vez, a palavra falada em amarelo ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 70, palavras = lg.texto.split(/\s+/);
        const linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && largTexto(tenta, tam) > (LG.largura || 960)) { linhas.push(atual); atual = [p]; } else atual.push(p); }
        if (atual.length) linhas.push(atual);
        const pesos = palavras.map((p) => p.length + 2), soma = pesos.slice(0, -1).reduce((a, b) => a + b, 0) || 1;
        const janela = Math.max(0.05, lg.ate - lg.de - (LG.segura ?? 0.55));
        let acum = lg.de; const inicio = pesos.map((w, i) => { const v = acum; if (i < pesos.length - 1) acum += janela * w / soma; return v; });
        if (Math.min(lg.ate, duracao - 0.35) - lg.de < 0.5) throw new Error(`Legenda "${lg.texto}" fica menos de 0,5 s na tela.`);
        return { ...lg, linhas, inicio, tam };
      });
      function legenda(t) {
        const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate);
        if (!lg) return;
        let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
        const tam = lg.tam, passoL = tam * 1.45, n = lg.linhas.length, yb = LG.y || 1590;
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yb - (n - 1 - li) * passoL, base = idx;
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : cor('branco')), contorno: 9 });
          idx += ln.length;
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        const q = Math.round(t * fps), i = cenaEm(t), cn = CENAS[i];
        T = t; Q = q; T0 = cn.de; LWC = LW;
        const cam = camera(t, q, i);
        c.setTransform(k, 0, 0, k, 0, 0);
        c.translate(L / 2 + cam.dx, A / 2 + cam.dy); c.rotate(cam.giro); c.scale(cam.z, cam.z); c.translate(-L / 2, -A / 2);
        GA = 1;
        cn.pecas.forEach((p, j) => { c.save(); PECAS[p.tipo](p, t, (i + 1) * 1000 + j * 17); c.restore(); });
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        // clarões (corte de plano e batidas): por baixo da legenda, nunca cobrem o texto
        const flashes = [...(H.claroes || [])];
        CENAS.forEach((cc) => { if (cc.de > 0) flashes.push({ t: cc.de, dur: CAM.clarao ?? 0.12, forca: CAM.claraoForca ?? 0.85 }); });
        for (const f of flashes) {
          const u = trecho(t, f.t, f.t + f.dur);
          if (t >= f.t && u < 1) { c.globalAlpha = (f.forca ?? 0.6) * (1 - u); c.fillStyle = cor('branco'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
        }
        legenda(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: banjo saltitante na pentatônica maior, bateria macia, galope e efeitos ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        const col = 60 / (MU.bpm || 120), oit = col / 2, vol = MU.vol ?? 0.22;
        // melodia dedilhada em colcheias, com o "quique" (a 2ª colcheia mais curta e mais fraca)
        for (let i = 0, tt = 0.1; tt < duracao - 0.5; i++, tt += oit) {
          if (calado(tt)) continue;
          const nota = MU.frase[i % MU.frase.length];
          if (nota) s.corda(nota, tt + (i % 2 ? oit * 0.12 : 0), oit * (i % 2 ? 1.1 : 1.8), { vol: vol * (i % 4 === 0 ? 1.1 : i % 2 ? 0.7 : 0.9), pan: (i % 2 ? 0.25 : -0.25), maciez: MU.maciez ?? 0.15 });
        }
        // baixo saltado (tônica e quinta) e bateria macia: bumbo no 1 e 3, caixa abafada no 2 e 4
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += col) {
          if (calado(tt)) continue;
          s.corda(MU.baixos[Math.floor(b / 2) % MU.baixos.length], tt, col * 0.9, { vol: MU.baixo ?? 0.3, maciez: 0.7 });
          if (b % 2 === 0) s.batida(tt, { vol: 0.22, freq: 75, dur: 0.3 });
          else { s.toque(tt, { vol: 0.07, corte: 2600, dur: 0.09 }); s.batida(tt, { vol: 0.06, freq: 190, dur: 0.08 }); }
          s.toque(tt + oit, { vol: 0.025, corte: 7000, dur: 0.03 });
        }
        // galope de casco (ta-ca-tum) em trechos
        for (const [a, d, v] of SO.galope || []) for (let tt = a; tt < a + d; tt += 0.36) [0, 0.09, 0.18].forEach((o, j) => s.toque(tt + o, { vol: v * (j === 2 ? 1.2 : 0.8), corte: 700, dur: 0.06, pan: (r() - 0.5) * 0.3 }));
        // "plop" de desenho quando as peças entram, e um assobio curto no corte (com o clarão)
        const plop = (tt, v = 0.05) => s.pio(tt, { freq: 380 + r() * 120, sobe: 1.4, dur: 0.07, repete: 1, vol: v });
        for (const cn of H.cenas) {
          if (cn.de > 0) s.vento(cn.de - 0.05, 0.22, { vol: 0.07, corte: 5000, onda: 2, entra: 0.12, sai: 0.08 });
          for (const p of cn.pecas) {
            if (p.t !== undefined && !['carimbo', 'morro'].includes(p.tipo)) plop(p.t);
            if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.1) plop(tt, 0.022);
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 4000, onda: 1, entra: 0.3, sai: 0.3 });
            if (p.tipo === 'barras') p.itens.forEach((_, i) => plop(p.t + i * 0.12, 0.04));
            if (p.tipo === 'mapa') { plop(p.contorno.de, 0.06); s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 3000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) s.pio(tt, { freq: 900, vol: 0.04, repete: 1, dur: 0.05 }); }
            if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.1) s.pio(tt, { freq: 1800 + r() * 600, vol: 0.015, repete: 1, dur: 0.03 });
            if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.1, { vol: 0.08, corte: 700, dur: 0.09 });
            if (p.tipo === 'arvore') for (let l = 0; l < p.niveis.length; l++) plop(p.de + l * (p.ate - p.de) / p.niveis.length + 0.4, 0.04);
            if (p.tipo === 'disco') s.pio(p.de ?? 0, { freq: 520, sobe: 0.25, dur: 1.4, repete: 1, vol: 0.012 });
          }
        }
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.1) s.toque(tt, { vol: 0.045, corte: 6500, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.5, freq: 58, dur: 0.5 }); s.toque(tt, { vol: 0.1, corte: 1500, dur: 0.1 }); }
        for (const tt of SO.brilhos || []) ['E6', 'G6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.3 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.12, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.035 }); }
        if (SO.arranhao !== undefined) {
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.4, freq: 70, dur: 0.3 });
        }
        if (SO.grave !== undefined) { s.batida(SO.grave, { vol: 0.4, freq: 48, dur: 0.8 }); s.batida(SO.grave + 0.02, { vol: 0.18, freq: 90, dur: 0.3 }); s.corda('C2', SO.grave, 1.2, { vol: 0.22, maciez: 0.8 }); }
        if (SO.brilhoLongo !== undefined) ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.18);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
