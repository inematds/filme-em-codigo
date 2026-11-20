// MOTOR "absurdo" — cartoon absurdo: linhas tremidas feitas à mão (a linha "ferve" 8 vezes por
// segundo), olhos esbugalhados em TUDO (nuvem, sol, morro, tubo de ensaio, xícara, túmulo, cavalo),
// cores pastel de bala, piadas visuais (peixe voando no céu, lupa com um olho gigante) e bonecos de
// cabeça enorme e corpo pequenino. Câmera de mola: a cada troca de cena o zoom quica e assenta, e o
// quadro balança devagar 1,2 grau. Troca de cena: um círculo que abre do meio em 0,35 s.
// Rótulos rosa com borda branca, tortos 4 graus e balançando; destaque em violeta.
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
      const LW = TR.contorno ?? 6;               // contorno (px de desenho)
      const BOIL = TR.tremido ?? 3.2;            // quanto a linha treme (px de desenho)
      const PASSOS = TR.passos ?? 8;             // trocas do tremido por segundo
      let LWC = LW;
      let T = 0, Q = 0, PASSO = 0;
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const tr = (t, a, b) => (t < a ? 0 : trecho(t, a, b));
      const pop = (t, t0, d = 0.3) => (t < t0 ? 0 : Math.max(0, passa((t - t0) / d)));

      // ---------- sorteio fixo (sem memória): número de -1 a 1 ----------
      const hs = (a, b, d) => {
        let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((d | 0) + 13, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
        return (h >>> 0) / 2147483648 - 1;
      };

      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const sombraDe = (h) => Filme.hex(h, TR.sombra || '#5a3a8a', TR.quantoSombra ?? 0.2);

      // ---------- linha tremida: cada ponto anda um pouco, e o sorteio troca 8 vezes por segundo ----------
      // O sorteio sai da posição do ponto (de desenho) e do passo: o mesmo quadro dá sempre o mesmo traço.
      function treme(x, y, i, amp) {
        const ax = Math.round(x * 0.35), ay = Math.round(y * 0.35);
        return [x + hs(ax * 31 + i, ay, PASSO) * amp, y + hs(ay * 17 + i, ax + 5, PASSO + 977) * amp];
      }
      // divide os lados longos (para o tremido entortar a linha, não só os cantos)
      function divide(pts, fechado, passo = 46) {
        const out = [], n = pts.length, m = fechado ? n : n - 1;
        for (let i = 0; i < m; i++) {
          const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), s = Math.max(1, Math.round(d / passo));
          for (let j = 0; j < s; j++) out.push([mistura(a[0], b[0], j / s), mistura(a[1], b[1], j / s)]);
        }
        if (!fechado) out.push(pts[n - 1]);
        return out;
      }
      const tremePts = (pts, amp = BOIL) => pts.map(([x, y], i) => treme(x, y, i, amp));
      // curva fechada suave pelos pontos (passa pelo meio de cada lado)
      function curvaFechada(pts) {
        const n = pts.length, m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
        c.beginPath(); const m0 = m(n - 1); c.moveTo(m0[0], m0[1]);
        for (let i = 0; i < n; i++) { const q = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
        c.closePath();
      }

      // ---------- caminhos (todos tremem) ----------
      const ell = (x, y, rx, ry = rx, rot = 0) => {
        rx = Math.max(0, rx); ry = Math.max(0, ry);
        const n = Math.max(10, Math.min(56, Math.round((rx + ry) * Math.PI / 22))), amp = Math.min(BOIL, 0.1 * Math.min(rx, ry));
        const cr = Math.cos(rot), sr = Math.sin(rot), pts = [];
        for (let i = 0; i < n; i++) { const a = (i / n) * DOISPI, px = Math.cos(a) * rx, py = Math.sin(a) * ry; pts.push(treme(x + px * cr - py * sr, y + px * sr + py * cr, i, amp)); }
        return () => curvaFechada(pts);
      };
      const pol = (pts0) => { const pts = tremePts(divide(pts0, true)); return () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }; };
      const suave = (pts0) => { const pts = tremePts(pts0); return () => curvaFechada(pts); };
      const rr = (x, y, w, h, r = 18) => {
        w = Math.max(0, w); h = Math.max(0, h); r = Math.max(0, Math.min(r, w / 2, h / 2));
        const pts = [];
        const canto = (cx, cy, a0) => { for (let j = 0; j <= 3; j++) { const a = a0 + (j / 3) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
        canto(x + w - r, y + r, -Math.PI / 2); canto(x + w - r, y + h - r, 0); canto(x + r, y + h - r, Math.PI / 2); canto(x + r, y + r, Math.PI);
        const tp = tremePts(divide(pts, true), Math.min(BOIL, 0.08 * Math.min(w, h)));
        return () => { c.beginPath(); tp.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); };
      };
      // forma de desenho: cor chapada, sombra de célula (sh) e contorno escuro
      function cel(path, cr, o = {}) {
        path(); c.fillStyle = cr; c.fill();
        if (o.sh) {
          c.save(); path(); c.clip(); c.fillStyle = sombraDe(cr); c.fill();
          c.translate(-o.sh, -o.sh * 0.8); path(); c.fillStyle = cr; c.fill(); c.restore();
        }
        if (o.borda !== false) { path(); c.strokeStyle = o.bordaCor || cor('tinta'); c.lineWidth = o.lw ?? LWC; c.lineJoin = 'round'; c.stroke(); }
      }
      // traço grosso com contorno (braço, galho, risco)
      function membro(pts0, larg, cr, prog = 1, o = {}) {
        if (prog <= 0 || pts0.length < 2) return;
        const pts = o.reto ? pts0 : tremePts(divide(pts0, false, 40), Math.min(BOIL, larg * 0.25 + 1));
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
      function linha(x0, y0, x1, y1, prog) {
        if (prog <= 0) return;
        const pts = tremePts(divide([[x0, y0], [mistura(x0, x1, prog), mistura(y0, y1, prog)]], false, 60), BOIL * 0.7);
        c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      }
      function raios(x, y, r1, r2, n, cr, giro = 0, o = {}) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) { const a = giro + (i / (n * 2)) * DOISPI, r = i % 2 ? r2 : r1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        cel(pol(pts), cr, o);
      }
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      function nuvemDe(bolas, cr) {
        const fs = bolas.map(([x, y, r]) => [ell(x, y, r + LWC), ell(x, y, r)]);
        c.fillStyle = cor('tinta'); for (const [a] of fs) { a(); c.fill(); }
        c.fillStyle = cr; for (const [, b] of fs) { b(); c.fill(); }
      }

      // ---------- olho esbugalhado: branco grande, pupila solta que balança (conta pura de t) ----------
      // o = { olha: [dx, dy] (-1 a 1), sem }
      function olho(x, y, r, o = {}) {
        if (r < 4) return;
        const sem = o.sem || 1, lw0 = LWC;
        cel(ell(x, y, r), cor('branco'), { lw: Math.max(1.6, Math.min(LW, r * 0.18)) });
        const pr = r * 0.5, folga = r - pr - r * 0.1;
        const [ox, oy] = o.olha || [0, 0.3];
        let px = ox * folga * 0.85 + Math.sin(T * 6.1 + sem * 1.7) * folga * 0.22;
        let py = oy * folga * 0.85 + Math.sin(T * 8.3 + sem * 2.9) * folga * 0.18;
        const d = Math.hypot(px, py); if (d > folga) { px *= folga / d; py *= folga / d; }
        c.fillStyle = cor('tinta'); c.beginPath(); c.arc(x + px, y + py, pr, 0, DOISPI); c.fill();
        if (pr > 4) { c.fillStyle = cor('branco'); c.beginPath(); c.arc(x + px - pr * 0.35, y + py - pr * 0.35, pr * 0.28, 0, DOISPI); c.fill(); }
        LWC = lw0;
      }
      function olhos(x, y, r, sep, o = {}) {
        olho(x - sep, y, r, { ...o, sem: (o.sem || 1) * 3 + 1 });
        olho(x + sep, y, r * (o.desigual ? 0.82 : 1), { ...o, sem: (o.sem || 1) * 3 + 2 });
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
      // o = { cor | cores[palavra] | corDe(palavra), alinha, bordas: [[cor, px], ...] de fora para dentro, tabular }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.18;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
        for (const [cb, px] of o.bordas || []) { c.strokeStyle = cor(cb); c.lineWidth = lw + px * 2; for (const l of letras) { caminhoLetra(l.g, l.x, y, tam); c.stroke(); } }
        for (const l of letras) { c.strokeStyle = corDe(l.palavra); c.lineWidth = lw; caminhoLetra(l.g, l.x, y, tam); c.stroke(); }
      }
      // rótulo: rosa com borda branca larga e um fio violeta escuro por fora; torto 4 graus e balançando
      function rotulo(txt, x, y, tam, o = {}) {
        const sem = o.sem || txt.length * 7 + Math.round(x + y);
        const giro = ((o.giro ?? -4) + Math.sin(T * 2.3 + sem) * 1.1) * RAD, esc = 1 + Math.sin(T * 3.1 + sem * 0.7) * 0.02;
        const w = largTexto(txt, tam, o.tabular);
        const cx = o.alinha === 'esquerda' ? x + w / 2 : o.alinha === 'direita' ? x - w / 2 : x, cy = y - tam / 2;
        const branca = Math.max(4, tam * 0.13);
        c.save(); c.translate(cx, cy); c.rotate(giro); c.scale(esc, esc); c.translate(-cx, -cy);
        escreve(txt, x, y, tam, { ...o, bordas: o.bordas || [['fio', branca + Math.max(2.5, tam * 0.05)], ['branco', branca]] });
        c.restore();
      }

      // ---------- confere ao montar: letra que falta e rótulo largo demais dão erro ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confere() {
        const textos = (H.legendas || []).map((l) => l.texto), largos = [];
        // conta a borda branca e o fio de fora (≈0,35 × tam) e os dígitos tabulares
        const mede = (tx, tam, max = 960, tab = false) => { textos.push(tx); const w = largTexto(tx, tam, tab) + tam * 0.35; if (w > max) largos.push(`${tx} (${Math.round(w)} px)`); };
        for (const cn of H.cenas) for (const p of cn.pecas) {
          if (p.tipo === 'texto' || p.tipo === 'carimbo') mede(p.texto, p.tam, 900);
          if (p.titulo) mede(p.titulo, p.tamTitulo || 36, (p.l || 900) - 220);
          if (p.unidade) mede(p.unidade, 32);
          if (p.tipo === 'contador') mede(milhar(p.valor), p.tam * 1.1, 900, true); // o pulso final cresce 10%
          if (p.tipo === 'barras') for (const it of p.itens) textos.push(it.nome, it.valor);
          if (p.tipo === 'helice') { mede(p.esq.rotulo, 44, 520); mede(p.dir.rotulo, 44, 520); }
        }
        textos.push('?');
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
        if (largos.length) throw new Error('Rótulo largo demais para o quadro: ' + largos.join('; '));
      })();

      // ---------- cenas e câmera de mola: o zoom quica a cada troca e o quadro balança 1,2 grau ----------
      const CENAS = H.cenas;
      const cenaEm = (t) => { let i = 0; CENAS.forEach((cn, j) => { if (t >= cn.de) i = j; }); return i; };
      const CAM = H.camera || {};
      function camera(t, q, i) {
        const dt = Math.max(0, t - CENAS[i].de), f = i * 1.7;
        const z = (CAM.base ?? 1.045) + (CAM.mola ?? 0.07) * Math.exp(-dt / (CAM.amortece ?? 0.3)) * Math.cos(dt * DOISPI * (CAM.freq ?? 2.4)) + (CAM.avanco ?? 0.006) * dt;
        let dx = Math.sin(dt * 1.1 + f) * 4, dy = Math.cos(dt * 0.8 + f) * 3;
        const giro = Math.sin(t * DOISPI / (CAM.periodo ?? 3.4) + f) * (CAM.giro ?? 1.2) * RAD;
        for (const tm of H.tremores || []) {
          const q0 = Math.round(tm.t * fps);
          if (q >= q0 && q < q0 + tm.quadros) { const s = sorteio((H.semente || 1) * 1000 + q), fo = tm.forca * (1 - (q - q0) / tm.quadros); dx += (s() * 2 - 1) * fo; dy += (s() * 2 - 1) * fo; }
        }
        return { dx, dy, z, giro };
      }

      // ---------- bonecos: cabeça enorme, corpo pequenino, olhos esbugalhados ----------
      const BO = H.bonecos;
      // (x, yp) = os pés; u = altura. o = { tipo: moderno | cientista | mongol | khan, sem, pele, roupa,
      // chapeu, pelo, faixa, cinza (0 a 1), acesa (0 a 1), olha [dx, dy], boca, fala [[de, ate]], ergue (0 a 1) }
      const BOCAS = ['a', 'e', 'o', 'a', 'fecha', 'e'];
      function bocaDe(o, sem) {
        for (const [a, b] of o.fala || []) if (T >= a && T < b) return BOCAS[Math.floor((hs(sem, Math.floor(Q / 3), 77) + 1) / 2 * BOCAS.length) % BOCAS.length];
        return o.boca || 'sorri';
      }
      function pessoa(x, yp, u, o = {}) {
        const sem = o.sem || 1, r = sorteio(sem * 31 + 7), pega = (lista) => lista[Math.floor(r() * lista.length)];
        const tipo = o.tipo || 'moderno', longo = tipo === 'mongol' || tipo === 'khan';
        const tg = (h) => (o.cinza ? Filme.hex(h, cor('cinza'), o.cinza * 0.85) : h);
        const pele = tg(o.pele || pega(BO.peles)), roupa0 = o.roupa || pega(longo ? BO.deels : BO.roupas), cabelo = tg(pega(BO.cabelos));
        const calca = tg(pega(BO.calcas)), faixa = tg(o.faixa || pega(BO.faixas)), chapeu = tg(o.chapeu || pega(BO.chapeus)), pelo = tg(o.pelo || pega(BO.pelos));
        const estilo = Math.floor(r() * 6), bigode = r() < 0.2, chapeuCor = tg(pega(BO.roupas));
        let roupa = tg(tipo === 'cientista' ? cor('jaleco') : roupa0);
        if (o.acesa) roupa = Filme.hex(roupa, cor('acento'), o.acesa);
        const tinta = cor('tinta'), lw0 = LWC; LWC = Math.min(LW, Math.max(1.5, 0.022 * u));
        const ys = yp - 0.3 * u, yb = yp - 0.07 * u, yh = yp - 0.56 * u, rx = 0.27 * u, ry = 0.25 * u;

        // perninhas e pés
        if (!longo) for (const s of [-1, 1]) cel(rr(x + s * 0.045 * u - 0.025 * u, yb - 0.06 * u, 0.05 * u, yp - yb + 0.04 * u, 0.015 * u), calca);
        for (const s of [-1, 1]) cel(ell(x + s * 0.055 * u, yp - 0.012 * u, 0.045 * u, 0.022 * u), longo ? tg(cor('bota')) : tg(cor('sapato')));
        // bracinhos e mãos
        for (const s of [-1, 1]) {
          const sobe = s === 1 ? limita(o.ergue || 0) : 0;
          const mao = [x + s * mistura(0.15, 0.2, sobe) * u, ys + mistura(0.17, -0.12, sobe) * u];
          membro([[x + s * 0.07 * u, ys + 0.03 * u], mao], 0.04 * u, sombraDe(roupa));
          cel(ell(mao[0], mao[1], 0.028 * u), pele);
        }
        // corpinho
        const wt = 0.09 * u, wb = (longo ? 0.15 : 0.11) * u;
        cel(suave([[x - wt, ys + 0.02 * u], [x, ys - 0.02 * u], [x + wt, ys + 0.02 * u], [x + wb, yb], [x - wb, yb]]), roupa, { sh: 0.02 * u });
        if (tipo === 'cientista') cel(pol([[x - 0.04 * u, ys], [x + 0.04 * u, ys], [x, ys + 0.1 * u]]), tg(cor('camisa')));
        if (longo) {
          const bd = tg(tipo === 'khan' ? cor('ouro') : Filme.hex(roupa0, '#000000', 0.3));
          membro([[x + 0.03 * u, ys - 0.005 * u], [x - 0.08 * u, ys + 0.12 * u], [x - 0.11 * u, yb - 0.01 * u]], 0.025 * u, bd);
          cel(rr(x - wb * 0.8, yp - 0.2 * u, wb * 1.6, 0.035 * u, 0.01 * u), faixa);
        }
        // orelhas e cabeça (um pouco de feijão: mais larga embaixo)
        for (const s of [-1, 1]) cel(ell(x + s * rx * 0.98, yh + 0.03 * u, 0.045 * u, 0.06 * u), pele);
        const cab = [];
        for (let i = 0; i < 18; i++) { const a = (i / 18) * DOISPI, sn = Math.sin(a); cab.push([x + Math.cos(a) * rx * (sn > 0 ? 1.04 : 0.96), yh + sn * ry]); }
        if (!longo && estilo === 2) nuvemDe(Array.from({ length: 7 }, (_, i) => [x + (i - 3) * 0.08 * u, yh - ry * 0.75 + Math.abs(i - 3) * 0.04 * u, 0.075 * u]), cabelo);
        cel(suave(cab), pele, { sh: 0.02 * u });
        // bochechas
        alfa(0.45); c.fillStyle = cor('bochecha');
        for (const s of [-1, 1]) { ell(x + s * 0.15 * u, yh + 0.06 * u, 0.05 * u, 0.03 * u)(); c.fill(); }
        alfa(1);
        // cabelo / chapéu (as variações da multidão)
        if (!longo) {
          if (estilo === 0 || estilo === 1) {
            const pts = [];
            for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.0 + i / 10); pts.push([x + Math.cos(a) * rx * 1.03, yh + Math.sin(a) * ry * 1.06]); }
            pts.push([x + rx * 0.95, yh - 0.08 * u], [x + 0.06 * u, yh - 0.13 * u], [x - 0.08 * u, yh - 0.12 * u], [x - rx * 0.95, yh - 0.06 * u]);
            cel(suave(pts), cabelo);
            if (estilo === 1) for (let i = -2; i <= 2; i++) cel(pol([[x + i * 0.07 * u - 0.035 * u, yh - ry * 0.9], [x + i * 0.07 * u + 0.01 * u, yh - ry * 1.3 - Math.abs(i) * -0.01 * u], [x + i * 0.07 * u + 0.035 * u, yh - ry * 0.9]]), cabelo);
          } else if (estilo === 3) { // careca com um fio só enrolado
            membro([[x, yh - ry * 0.98], [x + 0.03 * u, yh - ry * 1.25], [x - 0.03 * u, yh - ry * 1.32], [x - 0.01 * u, yh - ry * 1.2]], 0.012 * u, tinta, 1, { borda: false });
          } else if (estilo === 4) { // gorro de lã com pompom
            cel(() => { c.beginPath(); c.ellipse(x, yh - ry * 0.45, rx * 1.02, ry * 0.75, 0, Math.PI, DOISPI); c.closePath(); }, chapeuCor, { sh: 0.02 * u });
            cel(rr(x - rx * 1.05, yh - ry * 0.55, rx * 2.1, 0.07 * u, 0.03 * u), Filme.hex(chapeuCor, '#ffffff', 0.4));
            cel(ell(x, yh - ry * 1.22, 0.05 * u), cor('branco'));
          } else if (estilo === 5) { // chapéu de cozinheiro (alto e branco)
            cel(rr(x - rx * 0.6, yh - ry * 1.15, rx * 1.2, 0.12 * u, 0.02 * u), cor('branco'));
            nuvemDe([[x - 0.1 * u, yh - ry * 1.35, 0.1 * u], [x + 0.1 * u, yh - ry * 1.35, 0.1 * u], [x, yh - ry * 1.55, 0.12 * u]], cor('branco'));
          }
        }
        // rosto: olhos esbugalhados juntinhos, sobrancelhas, narigão, boca
        const ey = yh - 0.035 * u, er = 0.072 * u;
        const ol = o.olha || [hs(sem, 3, 9) * 0.8, 0.2];
        if (tipo === 'khan') { // sobrancelhas grossas e bravas
          for (const s of [-1, 1]) membro([[x + s * 0.13 * u, ey - er * 1.25], [x + s * 0.025 * u, ey - er * 0.9]], 0.022 * u, tinta, 1, { borda: false });
        } else for (const s of [-1, 1]) membro([[x + s * 0.12 * u, ey - er * 1.3], [x + s * 0.04 * u, ey - er * 1.45]], 0.012 * u, tinta, 1, { borda: false });
        olhos(x, ey, er, er * 0.95, { olha: ol, sem, desigual: sem % 3 === 0 });
        if (o.oculos || (tipo === 'cientista' && sem % 2 === 0)) { c.strokeStyle = tinta; c.lineWidth = LWC; for (const s of [-1, 1]) { ell(x + s * er * 0.95, ey, er * 1.25)(); c.stroke(); } }
        cel(ell(x + 0.01 * u, yh + 0.07 * u, 0.055 * u, 0.045 * u), Filme.hex(pele, cor('nariz'), 0.35), { sh: 0.01 * u });
        boca(x, yh + 0.15 * u, u * 1.5, bocaDe(o, sem));
        if (tipo === 'khan') { // bigode fino e comprido caindo dos lados, e barbicha
          for (const s of [-1, 1]) membro([[x + s * 0.01 * u, yh + 0.12 * u], [x + s * 0.09 * u, yh + 0.13 * u], [x + s * 0.12 * u, yh + 0.27 * u]], 0.012 * u, tinta, 1, { borda: false });
          cel(pol([[x - 0.022 * u, yh + 0.2 * u], [x + 0.022 * u, yh + 0.2 * u], [x, yh + 0.3 * u]]), tinta, { lw: LWC * 0.5 });
        } else if (bigode && tipo === 'moderno') membro([[x - 0.05 * u, yh + 0.12 * u], [x + 0.05 * u, yh + 0.12 * u]], 0.022 * u, cabelo, 1, { borda: false });
        // gorro mongol: copa de feltro com ponta, aba de pele dobrada para cima e borla
        if (longo) {
          const ab = yh - ry * 0.5, at = yh - ry * 0.95, wa = rx * 1.08, alto = 0.24 * u;
          const copa = [];
          for (let i = 0; i <= 12; i++) { const an = Math.PI + Math.PI * i / 12, bico = i === 6 ? 1.35 : 1; copa.push([x + Math.cos(an) * wa * 0.78, at + 0.02 * u + Math.sin(an) * alto * bico]); }
          cel(pol(copa), chapeu, { sh: 0.025 * u });
          const pts = [[x - wa * 0.98, ab], [x + wa * 0.98, ab]];
          for (let i = 0; i <= 12; i++) pts.push([x + wa * 1.12 - (2 * wa * 1.12 * i) / 12, at + (i % 2 ? 0.012 : -0.025) * u]);
          cel(suave(pts), pelo, { sh: 0.02 * u });
          const top = at + 0.02 * u - alto * 1.35;
          membro([[x, top], [x + 0.05 * u, top - 0.06 * u], [x + 0.1 * u, top - 0.04 * u]], 0.03 * u, tg(cor('vermelho')));
          cel(ell(x, top, 0.025 * u), tipo === 'khan' ? tg(cor('ouro')) : tg(cor('vermelho')));
        }
        LWC = lw0;
      }
      function boca(x, y, u, f) {
        const tinta = cor('tinta');
        c.lineCap = 'round'; c.lineJoin = 'round';
        if (f === 'sorri' || f === 'fecha') {
          c.strokeStyle = tinta; c.lineWidth = LWC; c.beginPath(); c.moveTo(x - 0.035 * u, y);
          c.quadraticCurveTo(x, y + (f === 'sorri' ? 0.03 : 0.004) * u, x + 0.035 * u, y - (f === 'sorri' ? 0.006 : 0) * u); c.stroke(); return;
        }
        const [bx, by] = f === 'a' ? [0.03, 0.03] : f === 'o' ? [0.018, 0.024] : [0.038, 0.014];
        const forma = ell(x, y + by * 0.4 * u, bx * u, by * u);
        forma(); c.fillStyle = cor('boca'); c.fill();
        if (f !== 'e') { c.save(); forma(); c.clip(); c.fillStyle = cor('lingua'); c.beginPath(); c.ellipse(x, y + by * 1.2 * u, bx * 0.75 * u, by * 0.55 * u, 0, 0, DOISPI); c.fill(); c.restore(); }
        forma(); c.strokeStyle = tinta; c.lineWidth = LWC * 0.8; c.stroke(); // refaz o contorno depois do clip
      }

      // cavalo de desenho com olho esbugalhado (f = fase do galope)
      function cavalo(x, y, s, f, sem, crv = cor('cavalo')) {
        const lw0 = LWC; LWC = Math.min(LW, Math.max(1.5, 0.03 * s));
        const perna = (hx, fa) => { const a = Math.sin(f + fa) * 0.45; membro([[x + hx * s, y - 0.06 * s], [x + (hx + Math.sin(a) * 0.12) * s, y + 0.2 * s], [x + (hx + Math.sin(a) * 0.2) * s, y + 0.38 * s]], 0.075 * s, crv); };
        perna(-0.28, 0); perna(0.26, Math.PI);
        membro([[x - 0.42 * s, y - 0.2 * s], [x - 0.6 * s, y - 0.05 * s + Math.sin(f) * 0.04 * s], [x - 0.62 * s, y + 0.12 * s]], 0.08 * s, cor('crina'));
        cel(ell(x, y - 0.12 * s, 0.46 * s, 0.21 * s), crv, { sh: 0.03 * s });
        cel(pol([[x + 0.26 * s, y - 0.28 * s], [x + 0.5 * s, y - 0.58 * s], [x + 0.62 * s, y - 0.5 * s], [x + 0.42 * s, y - 0.06 * s]]), crv);
        cel(ell(x + 0.68 * s, y - 0.5 * s, 0.19 * s, 0.1 * s, 0.55), crv);
        membro([[x + 0.3 * s, y - 0.33 * s], [x + 0.52 * s, y - 0.64 * s]], 0.05 * s, cor('crina'), 1, { borda: false });
        cel(ell(x + 0.8 * s, y - 0.43 * s, 0.06 * s, 0.05 * s), Filme.hex(crv, '#000000', 0.25), { lw: LWC * 0.7 }); // focinho
        olhos(x + 0.6 * s, y - 0.62 * s, 0.075 * s, 0.06 * s, { olha: [0.6, 0.3], sem });
        perna(-0.18, Math.PI); perna(0.36, 0);
        LWC = lw0;
      }

      // ---------- as peças ----------
      const M = 120; // sobra fora da tela (a câmera quica, balança e treme)
      const PECAS = {
        // ---- cenário ----
        fundo(p) { c.fillStyle = p.cor; c.fillRect(-M - 80, -M - 80, L + 2 * M + 160, A + 2 * M + 160); },
        ceu(p) {
          const g = c.createLinearGradient(0, p.y0 ?? 0, 0, p.y1 ?? 900);
          g.addColorStop(0, p.alto); g.addColorStop(1, p.baixo);
          c.fillStyle = g; c.fillRect(-M - 80, -M - 80, L + 2 * M + 160, A + 2 * M + 160);
        },
        faixa(p) { // chão de lado a lado, de y0 até embaixo, com a borda de cima ondulada
          const pts = [], n = 16;
          for (let i = 0; i <= n; i++) { const x = -M - 60 + (L + 2 * M + 120) * i / n; pts.push([x, p.y0 + Math.sin(i * 1.7 + (p.fase || 0)) * (p.onda || 0)]); }
          pts.push([L + M + 60, A + M + 80], [-M - 60, A + M + 80]);
          cel(p.onda ? suave(pts) : pol(pts), p.cor, { borda: p.borda !== false });
        },
        morro(p, t, sem) {
          if (p.t !== undefined && t < p.t) return;
          const s = p.t !== undefined ? pop(t, p.t, 0.3) : 1;
          emVolta(p.x, p.y + p.a, s, () => { // contorno só no arco de cima
            const fundo = p.y + p.a + (p.fundo || 700), arco = [];
            for (let i = 0; i <= 20; i++) { const a = Math.PI + Math.PI * i / 20; arco.push([p.x + Math.cos(a) * p.l, p.y + p.a + Math.sin(a) * p.a]); }
            const ta = tremePts(arco);
            c.beginPath(); ta.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.lineTo(p.x + p.l, fundo); c.lineTo(p.x - p.l, fundo); c.closePath();
            c.fillStyle = p.cor; c.fill();
            c.beginPath(); ta.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = cor('tinta'); c.lineWidth = LWC; c.lineJoin = 'round'; c.stroke();
            if (p.olhos) olhos(p.x + p.olhos[0], p.y + p.olhos[1], p.olhos[2], p.olhos[2] * 1.05, { sem: sem + 3, olha: [0, -0.4] });
          });
        },
        montanhas(p, t, sem) {
          const pts = [[-M - 60, p.y + 60]];
          for (const [x, h] of p.picos) pts.push([x, p.y - h]);
          pts.push([L + M + 60, p.y + 60]);
          cel(pol(pts), p.cor, { lw: LW * 0.8 });
          if (p.neve) for (const [x, h] of p.picos) if (h > 100) cel(pol([[x - 34, p.y - h + 40], [x, p.y - h], [x + 34, p.y - h + 40], [x + 12, p.y - h + 30], [x - 8, p.y - h + 44]]), cor('branco'), { lw: LW * 0.5 });
          if (p.olhos) p.picos.forEach(([x, h], i) => { if (h > 110) olhos(x, p.y - h + 80, 13, 12, { sem: sem + i, olha: [0.5 * Math.sign(540 - x), 0.4] }); });
        },
        nuvem(p, t, sem) {
          const x = p.x + (p.deriva || 0) * t, s = p.tam || 1;
          nuvemDe([[-90, 12, 58], [-30, -22, 74], [52, -8, 64], [104, 18, 44], [12, 26, 60]].map(([dx, dy, r]) => [x + dx * s, p.y + dy * s, r * s]), cor(p.cor || 'nuvem'));
          olhos(x + 5 * s, p.y + 4 * s, 20 * s, 21 * s, { sem, olha: [-0.4, 0.3] });
        },
        sol(p, t, sem) {
          raios(p.x, p.y, p.r * 1.45, p.r * 1.12, 12, Filme.hex(p.cor, '#ffffff', 0.3), t * 0.4, { lw: LW * 0.6 });
          cel(ell(p.x, p.y, p.r), p.cor, { lw: LW * 0.8 });
          olhos(p.x, p.y - p.r * 0.12, p.r * 0.26, p.r * 0.28, { sem, olha: [-0.6, 0.5] });
          c.strokeStyle = cor('tinta'); c.lineWidth = LW * 0.8; c.lineCap = 'round';
          c.beginPath(); c.arc(p.x, p.y + p.r * 0.2, p.r * 0.28, 0.2, Math.PI - 0.2); c.stroke();
        },
        peixe(p, t, sem) { // piada: um peixe nadando no céu
          if (p.de !== undefined && (t < p.de || t > p.ate)) return;
          const x = p.x + p.vel * (t - (p.de || 0)), y = p.y + Math.sin(t * 3) * 18, s = p.tam, d = Math.sign(p.vel) || 1;
          c.save(); c.translate(x, y); c.scale(d, 1); c.rotate(Math.sin(t * 3 + 1) * 0.12);
          cel(pol([[-0.7 * s, 0], [-1.1 * s, -0.35 * s + Math.sin(t * 12) * 0.08 * s], [-1.1 * s, 0.35 * s - Math.sin(t * 12) * 0.08 * s]]), cor(p.cor2 || 'acento'));
          cel(ell(0, 0, 0.8 * s, 0.42 * s), cor(p.cor || 'destaque'), { sh: 0.05 * s });
          cel(pol([[-0.1 * s, -0.38 * s], [0.25 * s, -0.62 * s], [0.3 * s, -0.36 * s]]), cor(p.cor2 || 'acento'));
          olho(0.42 * s, -0.08 * s, 0.17 * s, { sem, olha: [0.6, 0.2] });
          c.restore();
        },
        ger(p, t, sem) { // tenda de feltro branco com faixa e porta
          const s = p.tam, x = p.x, y = p.y, lw0 = LWC; LWC = LW * 0.75;
          cel(suave([[x - s, y], [x - s, y - 0.5 * s], [x - 0.6 * s, y - 0.86 * s], [x, y - 1.0 * s], [x + 0.6 * s, y - 0.86 * s], [x + s, y - 0.5 * s], [x + s, y]]), cor('feltro'), { sh: 0.12 * s });
          cel(rr(x - s * 0.98, y - 0.52 * s, 1.96 * s, 0.1 * s, 2), cor('destaque'), { lw: LWC * 0.6 });
          cel(rr(x - 0.18 * s, y - 0.42 * s, 0.36 * s, 0.42 * s, 4), cor('acento'), { lw: LWC * 0.6 });
          olhos(x, y - 0.7 * s, 0.13 * s, 0.14 * s, { sem, olha: [0, 0.4] });
          LWC = lw0;
        },
        ret(p) { cel(rr(p.x, p.y, p.l, p.a, p.raio ?? 0), p.cor, { borda: p.borda !== false }); },
        potes(p, t, sem) { // prateleira com potes de olhos esbugalhados
          cel(rr(p.x - p.l / 2, p.y, p.l, 26, 6), cor('madeira'), { sh: 6 });
          const n = p.n, d = p.l / n;
          for (let i = 0; i < n; i++) {
            const x = p.x - p.l / 2 + d * (i + 0.5), h = 90 + ((i * 37) % 3) * 22, w = d * 0.66, cr = BO.liquidos[(i + (p.fase || 0)) % BO.liquidos.length];
            cel(rr(x - w / 2, p.y - h, w, h, 14), Filme.hex(cr, '#ffffff', 0.35), { sh: 6 });
            cel(rr(x - w / 2 - 4, p.y - h - 16, w + 8, 20, 6), cor('acento'), { lw: LW * 0.6 });
            olhos(x, p.y - h * 0.55, Math.max(9, w * 0.17), w * 0.18, { sem: sem + i, olha: [hs(sem, i, 2) * 0.8, 0.3] });
          }
        },
        luz(p, t, sem) { // luminária de olhos esbugalhados, com o cone de luz
          alfa(p.alfa ?? 0.2);
          pol([[p.x - 60, p.y], [p.x + 60, p.y], [p.x + p.l / 2, p.y1], [p.x - p.l / 2, p.y1]])(); c.fillStyle = p.cor; c.fill();
          alfa(1);
          membro([[p.x, p.y - 90], [p.x - 40, p.y - 260]], 18, cor('abajur'));
          cel(pol([[p.x - 130, p.y], [p.x - 55, p.y - 100], [p.x + 55, p.y - 100], [p.x + 130, p.y]]), cor('abajur'), { sh: 14 });
          cel(ell(p.x, p.y + 6, 36, 18), p.cor);
          olhos(p.x, p.y - 48, 22, 24, { sem, olha: [0, 0.8] });
        },
        xicara(p, t, sem) {
          const s = p.tam;
          for (let i = 0; i < 3; i++) { c.strokeStyle = cor('branco'); c.lineWidth = 8; c.lineCap = 'round'; alfa(0.6); const x = p.x + (i - 1) * 0.3 * s; c.beginPath(); c.moveTo(x, p.y - 0.6 * s); c.bezierCurveTo(x + 20 + Math.sin(t * 4 + i) * 14, p.y - 0.9 * s, x - 20, p.y - 1.1 * s, x + Math.sin(t * 3 + i) * 10, p.y - 1.4 * s); c.stroke(); }
          alfa(1);
          membro([[p.x + 0.5 * s, p.y - 0.4 * s], [p.x + 0.8 * s, p.y - 0.3 * s], [p.x + 0.5 * s, p.y - 0.05 * s]], 0.1 * s, cor('xicara'));
          cel(ell(p.x, p.y + 0.12 * s, 0.85 * s, 0.16 * s), cor('pires'));
          cel(() => { c.beginPath(); c.moveTo(p.x - 0.6 * s, p.y - 0.55 * s); c.lineTo(p.x + 0.6 * s, p.y - 0.55 * s); c.quadraticCurveTo(p.x + 0.55 * s, p.y + 0.1 * s, p.x, p.y + 0.1 * s); c.quadraticCurveTo(p.x - 0.55 * s, p.y + 0.1 * s, p.x - 0.6 * s, p.y - 0.55 * s); c.closePath(); }, cor('xicara'), { sh: 0.06 * s });
          olhos(p.x, p.y - 0.25 * s, 0.16 * s, 0.17 * s, { sem, olha: [-0.7, -0.3] });
        },
        lupa(p, t, sem) { // lupa com UM olho gigante dentro da lente
          const s = p.tam;
          membro([[p.x + 0.6 * s, p.y + 0.6 * s], [p.x + 1.3 * s, p.y + 1.3 * s]], 0.22 * s, cor('madeira'));
          cel(ell(p.x, p.y, s), cor('aro'), { sh: 0.06 * s });
          cel(ell(p.x, p.y, 0.82 * s), cor('vidro'));
          olho(p.x, p.y, 0.62 * s, { sem, olha: [-0.4, -0.5] });
        },
        escurece(p) { alfa(p.alfa); c.fillStyle = p.cor; c.fillRect(-M - 80, -M - 80, L + 2 * M + 160, A + 2 * M + 160); alfa(1); },
        desfoca(p) { // borra tudo o que já foi desenhado (o fundo atrás do painel do mapa)
          const aux = AUX(); const ac = aux.getContext('2d');
          ac.setTransform(1, 0, 0, 1, 0, 0); ac.clearRect(0, 0, aux.width, aux.height); ac.drawImage(tela, 0, 0);
          c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
          c.filter = `blur(${Math.max(1, Math.round(p.raio * k))}px)`; c.drawImage(aux, 0, 0); c.filter = 'none';
          c.restore();
        },
        bandeiras(p, t, sem) { // estandartes de olhos esbugalhados, balançando
          p.xs.forEach((x0, i) => {
            const y = p.y + (i % 2) * 40, h = p.alto, onda = Math.sin(t * 5 + i) * 18;
            membro([[x0, y], [x0, y - h]], 12, cor('madeira'));
            cel(suave([[x0, y - h], [x0 + 150, y - h + 10 + onda], [x0 + 190, y - h + 60 + onda * 0.6], [x0 + 140, y - h + 120 + onda], [x0, y - h + 130]]), cor(i % 2 ? 'destaque' : 'acento'), { sh: 10 });
            olhos(x0 + 80, y - h + 62 + onda * 0.5, 18, 19, { sem: sem + i, olha: [0.6, 0.2] });
          });
        },
        cavaleiros(p, t, sem) { // fila de cavaleiros a galope
          for (let i = 0; i < p.n; i++) {
            const x = ((p.x0 + i * p.dx + (p.vel || 0) * t) % (L + 2 * M + 300)) - M - 150, s = p.tam, f = t * 13 + i * 1.3;
            const y = p.y + (i % 2) * 18 - Math.abs(Math.sin(f / 2)) * 0.05 * s;
            cavalo(x, y, s, f, sem + i * 10);
            pessoa(x - 0.04 * s, y - 0.22 * s, 0.85 * s, { tipo: 'mongol', sem: sem + i * 10 + 3, olha: [1, 0] });
          }
        },

        // ---- peças da história ----
        texto(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.2), s = p.sobe ? 1 : pop(t, p.t), dy = p.sobe ? (1 - sai(u)) * 50 : 0;
          alfa((p.sobe ? u : 1) * some(p, t));
          emVolta(p.x, p.y - p.tam * 0.45, s, () => rotulo(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor || 'destaque', cores: p.cores, tabular: p.tabular, giro: p.giro }));
          if (p.risco && t >= p.risco.de) {
            const w = largTexto(p.texto, p.tam) + p.tam * 0.6, yc = p.y - p.tam * 0.45, pr = sai(tr(t, p.risco.de, p.risco.ate));
            alfa(1); membro([[p.x - w / 2, yc + p.tam * 0.12], [p.x + w / 2, yc - p.tam * 0.1]], p.tam * 0.16, cor(p.risco.cor || 'acento'), pr);
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = tr(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v)), s = u >= 1 ? 1 + 0.1 * (1 - tr(t, p.ate, p.ate + 0.3)) : 1;
          emVolta(p.x, p.y - p.tam / 2, s, () => rotulo(txt, p.x, p.y, p.tam, { cor: p.cor, tabular: true }));
        },
        multidao(p, t, sem) {
          if (t < p.de) return;
          const ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.5) : 0, nl = p.linhas.length, quem = [];
          p.linhas.forEach((ln, j) => { const x0 = p.x - (p.colunas - 1) * ln.dx / 2 + (j % 2 ? ln.dx * 0.3 : -ln.dx * 0.2); for (let i = 0; i < p.colunas; i++) quem.push({ x: x0 + i * ln.dx + hs(sem, j * 31 + i, 5) * 10, y: ln.y, u: ln.tam }); });
          const n = quem.length, liga = p.liga && t >= p.liga.de;
          quem.forEach((b, i) => {
            const t0 = p.de + (p.ate - p.de) * (i / n), s = pop(t, t0, 0.3);
            const olha = liga ? [limita((p.liga.para[0] - b.x) / 300, -1, 1), -1] : [hs(sem, i, 3) * 0.8, 0.2];
            alfa(1); emVolta(b.x, b.y, s, () => pessoa(b.x, b.y, b.u, { sem: sem * 100 + i, cinza: ap, olha, boca: liga ? 'o' : 'sorri' }));
          });
          if (liga) {
            c.strokeStyle = cor('fio'); c.lineWidth = 4; c.lineCap = 'round';
            quem.forEach((b, i) => {
              const atraso = (nl - 1 - Math.floor(i / p.colunas)) * 0.05;
              alfa(0.7); linha(b.x, b.y - b.u * 0.85, p.liga.para[0], p.liga.para[1], sai(tr(t, p.liga.de + atraso, p.liga.ate)));
            });
            alfa(1);
          }
        },
        heroi(p, t, sem) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), cy = p.y - p.tam * 0.56;
          alfa(1);
          if (p.estrela) emVolta(p.x, cy, s, () => raios(p.x, cy, p.estrela, p.estrela * 0.66, 16, cor('acento'), t * 0.3, { lw: LW * 0.8 }));
          emVolta(p.x, p.y + (p.cavalo ? p.cavalo * 0.38 : 0), s, () => {
            if (p.cavalo) cavalo(p.x + p.cavalo * 0.05, p.y + p.cavalo * 0.02, p.cavalo, 0.5, sem + 4);
            pessoa(p.x, p.y, p.tam, { tipo: 'khan', sem: 707, pele: cor('peleKhan'), roupa: cor('deelKhan'), chapeu: cor('chapeuKhan'), pelo: cor('peloKhan'), faixa: cor('faixaKhan'), fala: p.fala, olha: [0, 0.1], ergue: p.ergue ? sai(tr(t, p.ergue, p.ergue + 0.3)) : 0 });
          });
        },
        janela(p, t, sem) { // painel pastel com barra de título rosa
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            cel(rr(x, y, p.l, p.a, 34), cor(p.cor || 'folha'), { lw: LW * 1.2, sh: 10 });
            cel(rr(x, y, p.l, 110, 34), cor('acento'), { lw: LW * 1.2 });
            for (let i = 0; i < 3; i++) olho(x + 52 + i * 46, y + 55, 17, { sem: sem + i, olha: [0.7, 0.3] });
            rotulo(p.titulo, p.x + 75, y + 76, p.tamTitulo || 36, { cor: 'branco', giro: 0, bordas: [['fio', 7]] });
          });
        },
        cientista(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3);
          alfa(1); emVolta(p.x, p.y, s, () => pessoa(p.x, p.y, p.tam, { tipo: 'cientista', sem: p.sem || 1, fala: p.fala, olha: p.olha, oculos: p.oculos }));
        },
        tubos(p, t, sem) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.62, h = p.tam;
          cel(rr(x0 - p.dx * 0.6, p.y + h * 0.18, (p.n - 1) * p.dx + p.dx * 1.2, h * 0.22, 12), cor('suporte'), { sh: 8 });
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(tr(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              if (cheio > 0) raios(x, p.y, w * 1.8 * cheio, w * 1.15 * cheio, 10, cor('acento'), t * 0.8, { lw: LW * 0.6 });
              const tubo = rr(x - w / 2, p.y - h / 2, w, h, w / 2);
              tubo(); c.fillStyle = cor('vidro'); c.fill();
              const nivel = mistura(0.35, 0.92, cheio), crL = cheio > 0 ? cor('acento') : BO.liquidos[i % BO.liquidos.length];
              c.save(); tubo(); c.clip(); c.fillStyle = crL; c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h); c.restore();
              tubo(); c.strokeStyle = cor('tinta'); c.lineWidth = LW * 0.7; c.lineJoin = 'round'; c.stroke();
              olhos(x, p.y - h * 0.18, Math.max(9, w * 0.3), w * 0.24, { sem: sem + i, olha: cheio > 0 ? [0, -0.8] : [hs(sem, i, 4) * 0.7, 0.3] });
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
            const sa = ac > 0 ? 1 + 0.12 * Math.sin(Math.PI * tr(t, p.acende.t, p.acende.t + 0.4)) : 1;
            alfa(1);
            emVolta(x, ln.y, s * sa, () => {
              if (ac > 0) raios(x, ln.y - ln.tam * 0.56, ln.tam * 0.5, ln.tam * 0.36, 12, cor('acento'), t * 0.5, { lw: LW * 0.6 });
              pessoa(x, ln.y, ln.tam, { sem: sem * 50 + i, acesa: ac, cinza: ac > 0 ? 0 : (depois ? 0.35 : 0), boca: ac > 0 ? 'a' : 'sorri', ergue: ac > 0 ? sai(tr(t, p.acende.t, p.acende.t + 0.25)) : 0, olha: depois && !eu ? [((p.acende.i % p.colunas) - (i % p.colunas)) > 0 ? 1 : -1, 0] : [0, 0.2] });
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
          const pa = p.painel, s0 = pop(t, p.contorno.de, 0.3), lm = 5;
          emVolta(p.x, p.y, s0, () => {
            cel(rr(pa.x, pa.y, pa.l, pa.a, 30), cor('mar'), { lw: LW * 1.2, bordaCor: cor('linhaMapa') });
            c.save(); c.beginPath(); c.roundRect(pa.x + 4, pa.y + 4, pa.l - 8, pa.a - 8, 26); c.clip();
            const terras = [T_.eurasia, ...(T_.ilhas || [])].map((r) => r.map(pj));
            const pc = sai(tr(t, p.contorno.de, p.contorno.ate));
            alfa(tr(t, p.contorno.de + 0.3, p.contorno.ate + 0.2));
            terras.forEach((r) => { pol(r)(); c.fillStyle = cor('terraMapa'); c.fill(); });
            alfa(1); c.strokeStyle = cor('linhaMapa'); c.lineWidth = lm; c.lineJoin = 'round'; c.lineCap = 'round';
            for (const r of terras) { // contorno que se desenha (tremido)
              const pts = tremePts(divide([...r, r[0]], false, 40), BOIL * 0.7), seg = []; let tot = 0;
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
              alfa(1 - 0.75 * im); cel(forma(T_.regiao), cor('regiao'), { lw: lm, bordaCor: cor('linhaMapa') });
              c.restore();
              if (p.aneis && t >= p.aneis.t) { // pontinhos roxos que pipocam dentro da região
                const ys = T_.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T_.regiao.map((q) => q[0]), passo = p.aneis.passo;
                c.save(); forma(T_.regiao)(); c.clip(); let i = 0;
                for (let lat = la + passo / 2; lat < lb; lat += passo * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? passo / 2 : 0); lon < Math.max(...lo); lon += passo) {
                  const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                  if (s <= 0) continue;
                  alfa(1 - 0.75 * im); c.beginPath(); c.arc(x, y, 7 * s, 0, DOISPI); c.fillStyle = cor('linhaMapa'); c.fill();
                }
                c.restore(); alfa(1);
              }
            }
            if (p.imperio && t >= p.imperio.pulsa) { // o império cresce de um ponto que pulsa
              const [px, py] = pj(p.imperio.ponto);
              if (t >= p.imperio.de) {
                const u = sai(tr(t, p.imperio.de, p.imperio.ate));
                c.save(); ell(px, py, 20 + u * 700)(); c.clip();
                cel(forma(T_.imperio), cor('imperio'), { lw: lm, bordaCor: cor('linhaMapa') });
                c.restore();
              }
              const fase = ((t - p.imperio.pulsa) / 0.6) % 1, sp = pop(t, p.imperio.pulsa, 0.3);
              c.strokeStyle = cor('linhaMapa'); c.lineWidth = 5; alfa(1 - fase); c.beginPath(); c.arc(px, py, 12 + fase * 40, 0, DOISPI); c.stroke();
              alfa(1); c.fillStyle = cor('linhaMapa'); c.beginPath(); c.arc(px, py, 14 * sp, 0, DOISPI); c.fill(); c.fillStyle = cor('branco'); c.beginPath(); c.arc(px, py, 6 * sp, 0, DOISPI); c.fill();
            }
            c.restore();
          });
          c.restore();
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * p.atraso, y = p.y + i * p.passo;
            if (t < t0) return;
            const u = passa(tr(t, t0, t0 + p.dur)), D = it.cor === 'destaque';
            alfa(1);
            rotulo(it.nome, p.x - 24, y + 17, 36, { cor: D ? 'destaque' : 'branco', alinha: 'direita', giro: 0, bordas: [['tinta', 7]] });
            const w = Math.max(14, p.larg * it.v / p.maximo * u);
            cel(rr(p.x, y - p.alt / 2, w, p.alt, 14), cor(D ? 'acento' : it.cor), { sh: 6 });
            if (tr(t, t0 + p.dur * 0.5, t0 + p.dur) > 0) rotulo(it.valor, p.x + w + 22, y + 16, 34, { cor: D ? 'destaque' : 'branco', alinha: 'esquerda', tabular: true, giro: 0, bordas: [['tinta', 7]] });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * p.atraso; if (t >= t1) rotulo(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 14, 32, { cor: 'branco', giro: 0, bordas: [['tinta', 7]] }); }
        },
        pasta(p, t, sem) { // pasta de arquivo com aba e olhos esbugalhados
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            cel(rr(x + 20, y - 70, 420, 110, 22), cor('pastaEscura'));
            cel(rr(x, y, p.l, p.a, 26), cor('pasta'), { sh: 16, lw: LW * 1.2 });
            rotulo(p.titulo, x + 230, y - 14, 30, { cor: 'branco', giro: 0, bordas: [['fio', 7]] });
            c.strokeStyle = cor('pastaEscura'); c.lineCap = 'round'; c.lineWidth = 14;
            for (let i = 0; i < (p.linhas || 0); i++) { const yy = y + 80 + i * 80, w = p.l * (i % 3 === 1 ? 0.45 : 0.7), pr = tr(t, p.t + 0.1 + i * 0.05, p.t + 0.4 + i * 0.05); linha(x + 70, yy, x + 70 + w, yy, pr); }
            olhos(p.x, y + p.a - 70, 30, 32, { sem, olha: [0, -0.8] });
          });
        },
        carimbo(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.2), s = mistura(1.9, 1, sai(u)), ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.2) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD, cr = Filme.hex(cor('destaque'), cor('cinza'), ap * 0.5);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.8;
          alfa(limita(u * 2) * (1 - 0.18 * ap));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          cel(rr(-w / 2, -h / 2, w, h, 20), cor('branco'), { lw: 10, bordaCor: cr });
          rr(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 10)(); c.strokeStyle = cr; c.lineWidth = 4; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr });
          c.restore();
          if (p.risco && t >= p.risco.de) { // a barra violeta atravessa o carimbo
            alfa(1); c.save(); c.translate(p.x, p.y); c.rotate(giro);
            membro([[-w / 2 - 30, 14], [w / 2 + 30, -14]], p.tam * 0.15, cor('acento'), sai(tr(t, p.risco.de, p.risco.ate)), { ponta: 'butt' });
            c.restore();
          }
        },
        tumulos(p, t, sem) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? tr(t, p.borda, p.borda + 0.3) : 1;
          alfa(1); cel(ell(p.x, p.y + s * 0.1, s * 2.5, s * 1.05), cor('buraco'), { lw: LW * 0.8 });
          [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([i, j], n) => {
            const x = p.x + i * s * 1.2, y = p.y + j * s * 0.55, sc = pop(t, p.t + n * 0.1, 0.3);
            alfa(1);
            emVolta(x, y, sc, () => {
              const monte = () => { c.beginPath(); c.ellipse(x, y, s, s * 0.5, 0, Math.PI, DOISPI); c.closePath(); };
              if (b > 0) { monte(); c.strokeStyle = cor('acento'); c.lineWidth = LW + 14 * b; c.lineJoin = 'round'; c.stroke(); }
              cel(monte, cor('monte'), { sh: 0.08 * s });
              olhos(x, y - s * 0.24, Math.max(9, s * 0.13), s * 0.14, { sem: sem + n, olha: [0, -0.7] });
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
            for (const [sx, prof, cr] of [[ax, fr, 'destaque'], [-ax, -fr, 'azul']]) cel(ell(p.x + sx, y, 13 + 5 * (prof + 1) / 2), cor(cr), { lw: 4 });
          }
          alfa(1);
          if (u >= 1 && !(p.divide && t >= p.divide)) olhos(p.x, p.y1 - 40, 16, 17, { sem, olha: [0, -0.6] });
          if (p.divide && t >= p.divide) {
            const v = tr(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor !== 'cinza', m = 12, crr = cor(r.cor);
              for (let i = 1; i <= m; i++) { const q = i / m; if (q > v) break; const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30; cel(ell(x, y, 13), crr, { lw: 4 }); }
              // o rótulo entra junto com a divisão (não espera ela terminar)
              alfa(tr(t, p.divide, p.divide + 0.2)); rotulo(r.rotulo, r.x, r.y - 150, 44, { cor: r.cor, giro: D ? 4 : -4 }); alfa(1);
              if (v >= 1) {
                const s = pop(t, p.divide + p.durDivide, 0.3);
                emVolta(r.x, r.y - 50, s, () => { // o cromossomo Y, de olhos esbugalhados
                  membro([[r.x - 30, r.y - 100], [r.x, r.y - 55], [r.x + 30, r.y - 100]], 26, crr);
                  membro([[r.x, r.y - 58], [r.x, r.y - 14]], 26, crr);
                  olhos(r.x, r.y - 62, 11, 11, { sem: sem + (D ? 2 : 1), olha: [0, 0.5] });
                });
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
              alfa(1); membro([[pai.x, pai.y + pai.r * 1.12], [(pai.x + f.x) / 2 + 12, (pai.y + f.y) / 2], [f.x, f.y - f.r * 1.12]], Math.max(12, 30 - l * 6), cor('galho'), pr);
              if (pr >= 1) { const mx = (pai.x + f.x) / 2, my = (pai.y + f.y) / 2; cel(ell(mx + 18, my - 4, 26 - l * 3, 16 - l * 2, 0.5), cor(j % 2 ? 'folha1' : 'folha2'), { lw: LW * 0.6 }); }
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
            if (cont < 1) { alfa(1 - cont); raios(p.x, p.y, p.tam * 0.88, p.tam * 0.66, 16, cor('acento'), t * 0.3, { lw: LW * 0.7 }); alfa(1); }
            medalhao(p.x, p.y, p.tam / 2, sem, { khan: true, vazio: cont });
          });
          if (p.interroga && t >= p.interroga) emVolta(p.x, p.y, pop(t, p.interroga + 0.1, 0.3), () => rotulo('?', p.x, p.y + p.tam * 0.2, p.tam * 0.46, { cor: 'acento' }));
        },
      };
      const some = (p, t) => (p.some ? 1 - tr(t, p.some, p.some + 0.2) : 1);
      for (const cn of H.cenas) for (const p of cn.pecas) if (!PECAS[p.tipo]) throw new Error('Peça sem desenho no motor: ' + p.tipo);
      let aux = null;
      const AUX = () => { if (!aux || aux.width !== tela.width || aux.height !== tela.height) { aux = document.createElement('canvas'); aux.width = tela.width; aux.height = tela.height; } return aux; };

      // medalhão: moldura redonda com um busto dentro (recortado no círculo)
      function medalhao(x, y, r, sem, o) {
        cel(ell(x, y, r * 1.12), cor('acento'), { lw: LW * 0.8 });
        cel(ell(x, y, r), cor('moldura'), { lw: LW * 0.6 });
        c.save(); c.beginPath(); c.arc(x, y, r * 0.98, 0, DOISPI); c.clip();
        const a0 = c.globalAlpha;
        if (o.khan) {
          if ((o.vazio || 0) < 1) pessoa(x, y + r * 1.22, r * 2.0, { tipo: 'khan', sem: 707, pele: cor('peleKhan'), roupa: cor('deelKhan'), chapeu: cor('chapeuKhan'), pelo: cor('peloKhan'), faixa: cor('faixaKhan'), olha: [0, 0.2] });
          if (o.vazio > 0) { c.globalAlpha = a0 * limita(o.vazio); c.fillStyle = cor('moldura'); c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); c.globalAlpha = a0; }
        } else pessoa(x, y + r * 1.33, r * 2.2, { sem });
        c.restore();
        ell(x, y, r)(); c.strokeStyle = cor('tinta'); c.lineWidth = LW * 0.6; c.stroke();
      }

      // ---------- legendas: o cartão inteiro de uma vez, a palavra falada em rosa (não treme) ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 68, palavras = lg.texto.split(/\s+/);
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
        const tam = lg.tam, passoL = tam * 1.45, n = lg.linhas.length, yb = LG.y || 1600;
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yb - (n - 1 - li) * passoL, base = idx;
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : cor('branco')), bordas: [['tinta', 9]] });
          idx += ln.length;
        });
      }

      // ---------- um quadro ----------
      const WIPE = CAM.circulo ?? 0.35;
      function cena(i, t, q) {
        const cn = CENAS[i], cam = camera(t, q, i);
        c.setTransform(k, 0, 0, k, 0, 0);
        c.translate(L / 2 + cam.dx, A / 2 + cam.dy); c.rotate(cam.giro); c.scale(cam.z, cam.z); c.translate(-L / 2, -A / 2);
        GA = 1;
        cn.pecas.forEach((p, j) => { c.save(); PECAS[p.tipo](p, t, (i + 1) * 1000 + j * 17); c.restore(); });
      }
      function desenhar(t) {
        c.reset();
        const q = Math.round(t * fps), i = cenaEm(t), cn = CENAS[i];
        T = t; Q = q; PASSO = Math.floor(q * PASSOS / fps); LWC = LW;
        const dw = t - cn.de;
        if (i > 0 && !cn.corte && dw < WIPE) {
          // troca de cena: a nova abre num círculo do meio; a que sai fica inteira (fundo e peças) por fora
          cena(i - 1, t, q);
          const R = sai(dw / WIPE) * 1130;
          c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
          c.save(); c.beginPath(); c.arc(L / 2, A / 2, R, 0, DOISPI); c.clip();
          cena(i, t, q);
          c.restore();
          c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1; c.strokeStyle = cor('acento'); c.lineWidth = 16; c.beginPath(); c.arc(L / 2, A / 2, R, 0, DOISPI); c.stroke();
        } else cena(i, t, q);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        // clarões das batidas: por baixo da legenda, nunca cobrem o texto
        for (const f of H.claroes || []) {
          const u = trecho(t, f.t, f.t + f.dur);
          if (t >= f.t && u < 1) { c.globalAlpha = (f.forca ?? 0.5) * (1 - u); c.fillStyle = cor('branco'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
        }
        legenda(t);
        const fim = trecho(t, H.escurece ?? duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: cítara dedilhada em lá menor pentatônica, baixo de cítara, taiko macio e efeitos ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // a nota que atravessa o corte acaba nele (senão a corda segue soando no silêncio)
        const ate = (tt, d) => { for (const [a] of corta) if (tt < a && tt + d > a) return Math.max(0.03, a - tt - 0.01); return d; };
        const col = 60 / (MU.bpm || 120), oit = col / 2, vol = MU.vol ?? 0.22;
        for (let i = 0, tt = 0.1; tt < duracao - 0.5; i++, tt += oit) {
          if (calado(tt)) continue;
          const nota = MU.frase[i % MU.frase.length];
          const t0 = tt + (i % 2 ? oit * 0.1 : 0);
          if (nota) s.corda(nota, t0, ate(t0, oit * (i % 2 ? 1.2 : 2.0)), { vol: vol * (i % 4 === 0 ? 1.1 : i % 2 ? 0.75 : 0.9), pan: (i % 2 ? 0.25 : -0.25), maciez: MU.maciez ?? 0.1 });
        }
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += col) {
          if (calado(tt)) continue;
          s.corda(MU.baixos[Math.floor(b / 2) % MU.baixos.length], tt, ate(tt, col * 0.95), { vol: MU.baixo ?? 0.3, maciez: 0.6 });
          if (b % 4 === 0 || b % 4 === 3) s.batida(tt, { vol: 0.18, freq: 68, dur: ate(tt, 0.35) }); // taiko macio
          if (b % 2 === 1) s.toque(tt, { vol: 0.05, corte: 1800, dur: 0.07 });
        }
        // galope de casco (ta-ca-tum) em trechos
        for (const [a, d, v] of SO.galope || []) for (let tt = a; tt < a + d; tt += 0.36) [0, 0.09, 0.18].forEach((o, j) => { if (!calado(tt + o)) s.toque(tt + o, { vol: v * (j === 2 ? 1.2 : 0.8), corte: 700, dur: 0.06, pan: (r() - 0.5) * 0.3 }); });
        // "boing" de desenho quando as peças saltam, e um "fup" na abertura do círculo
        const boing = (tt, v = 0.05) => s.pio(tt, { freq: 300 + r() * 160, sobe: 1.8, dur: 0.12, repete: 1, vol: v });
        for (const cn of H.cenas) {
          if (cn.de > 0) s.vento(cn.de, 0.3, { vol: 0.06, corte: 4000, onda: 3, entra: 0.08, sai: 0.2 });
          for (const p of cn.pecas) {
            if (p.t !== undefined && !['carimbo', 'morro'].includes(p.tipo)) boing(p.t);
            if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.1) boing(tt, 0.02);
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 4000, onda: 1, entra: 0.3, sai: 0.3 });
            if (p.tipo === 'barras') p.itens.forEach((_, i) => boing(p.t + i * p.atraso, 0.04));
            if (p.tipo === 'mapa') { boing(p.contorno.de, 0.05); s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 3000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) s.pio(tt, { freq: 900, vol: 0.04, repete: 1, dur: 0.05 }); }
            if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.1) s.pio(tt, { freq: 1800 + r() * 600, vol: 0.015, repete: 1, dur: 0.03 });
            if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.1, { vol: 0.08, corte: 700, dur: 0.09 });
            if (p.tipo === 'arvore') for (let l = 0; l < p.niveis.length; l++) boing(p.de + l * (p.ate - p.de) / p.niveis.length + 0.4, 0.04);
            if (p.tipo === 'peixe') s.pio(p.de ?? 0, { freq: 700, sobe: -0.4, dur: 0.5, repete: 3, intervalo: 0.6, vol: 0.012 });
          }
        }
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.1) s.toque(tt, { vol: 0.045, corte: 6500, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.4, freq: 60, dur: 0.45 }); s.toque(tt, { vol: 0.08, corte: 1500, dur: 0.1 }); }
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, tt + i * 0.04, 0.9, { vol: 0.045, pan: (i - 1.5) * 0.2, brilho: 1.3 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.11, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.03 }); }
        if (SO.arranhao !== undefined) { // arranhão de disco
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.3, freq: 70, dur: 0.3 });
        }
        if (SO.grave !== undefined) { s.batida(SO.grave, { vol: 0.32, freq: 48, dur: 0.7 }); s.batida(SO.grave + 0.02, { vol: 0.14, freq: 90, dur: 0.3 }); s.corda('A1', SO.grave, 1.1, { vol: 0.2, maciez: 0.8 }); }
        if (SO.brilhoLongo !== undefined) {
          ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.045, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
          s.batida(SO.brilhoLongo, { vol: 0.25, freq: 52, dur: 0.6 }); // tambor fundo no "outra pessoa"
        }
        s.sala(0.16);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
