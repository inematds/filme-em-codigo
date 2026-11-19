// MOTOR "rolo-nanquim" — a história contada num rolo comprido de papel de arroz, pintado a nanquim:
// pinceladas que afinam nas pontas e se desenham sozinhas, aguadas transparentes, carimbos vermelhos
// salpicados, um sol vermelho e montanhas lavadas ao fundo. A câmera desliza de lado, painel por painel,
// e as montanhas andam a 1/4 da velocidade (profundidade).
// Jeito de animar: camadas-planas (desenho 2D em canvas), com letras em traços (letras.js) feitas a pincel.
// Este arquivo sabe DESENHAR as peças. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio, ruido } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); cada painel do rolo tem 1080 de largura
  const RAD = Math.PI / 180;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const SEM = H.semente || 32;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d)))); // nunca negativo
      const suave5 = (x) => { x = limita(x); return x * x * x * (x * (6 * x - 15) + 10); };
      const alfa = (a) => { c.globalAlpha = limita(a); };

      // ---------- pincel: uma fita que engrossa no começo, afina no fim e tem a borda irregular ----------
      function reamostra(pts, passo) {
        const out = [[pts[0][0], pts[0][1], 0]]; let tot = 0;
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
          if (d < 1e-6) continue;
          const n = Math.max(1, Math.ceil(d / passo));
          for (let j = 1; j <= n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n, tot + d * j / n]);
          tot += d;
        }
        return { q: out, tot };
      }
      // monta o caminho da pincelada (não pinta). o = { prog, sem, ponta, aperta, aspero }
      function caminhoPincel(pts, larg, o = {}) {
        const prog = o.prog ?? 1;
        if (prog <= 0 || pts.length < 1) return false;
        const R = reamostra(pts, Math.max(1.5, larg * 0.35));
        if (R.tot < larg * 0.3) { c.beginPath(); c.arc(pts[0][0], pts[0][1], larg * 0.55, 0, 7); return true; } // um pingo
        const ate = R.tot * limita(prog), sem = o.sem || 1, asp = o.aspero ?? 0.16, ponta = o.ponta ?? 0.35, aperta = o.aperta ?? 0.7;
        const vis = [];
        for (let i = 0; i < R.q.length; i++) {
          const p = R.q[i];
          if (p[2] <= ate) { vis.push(p); continue; }
          const a = R.q[i - 1], u = (ate - a[2]) / (p[2] - a[2] || 1);
          vis.push([mistura(a[0], p[0], u), mistura(a[1], p[1], u), ate]);
          break;
        }
        if (vis.length < 2) return false;
        const E = [], D = [];
        for (let i = 0; i < vis.length; i++) {
          const a = vis[Math.max(0, i - 1)], b = vis[Math.min(vis.length - 1, i + 1)];
          let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const u = vis[i][2] / R.tot;
          const perfil = u < 0.12 ? mistura(aperta, 1, u / 0.12) : u > 0.6 ? mistura(1, ponta, (u - 0.6) / 0.4) : 1;
          const w = larg / 2 * perfil, f = vis[i][2] / Math.max(6, larg * 0.9);
          const we = w * (1 + asp * ruido(f, sem)), wd = w * (1 + asp * ruido(f, sem + 17));
          E.push([vis[i][0] - ty * we, vis[i][1] + tx * we]); D.push([vis[i][0] + ty * wd, vis[i][1] - tx * wd]);
        }
        c.beginPath();
        E.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        for (let i = D.length - 1; i >= 0; i--) c.lineTo(D[i][0], D[i][1]);
        c.closePath();
        return true;
      }
      function pincel(pts, larg, cr, o = {}) { if (caminhoPincel(pts, larg, o)) { c.fillStyle = cr; c.fill(); } }
      // bolinha de tinta com a borda irregular
      function bolha(x, y, r, sem, n = 20) {
        c.beginPath();
        for (let i = 0; i <= n; i++) { const a = (i % n) / n * Math.PI * 2, rr = r * (1 + 0.12 * ruido((i % n) * 0.9, sem)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.closePath();
      }
      // aguada: a mesma forma pintada 3 vezes, cada vez um pouco torta, transparente, com a borda mais escura
      function aguada(pts, cr, a, sem, amp = 8) {
        const R = reamostra([...pts, pts[0]], 16).q, a0 = c.globalAlpha;
        for (let j = 0; j < 3; j++) {
          c.beginPath();
          R.forEach(([x, y], i) => { const ox = amp * ruido(i * 0.35 + j * 3.7, sem + j), oy = amp * ruido(i * 0.35 + j * 3.7 + 50, sem + j + 9); i ? c.lineTo(x + ox, y + oy) : c.moveTo(x + ox, y + oy); });
          c.closePath(); c.globalAlpha = a0 * a * (j === 0 ? 0.55 : 0.3); c.fillStyle = cr; c.fill();
          if (j === 2) { c.globalAlpha = a0 * a * 0.45; c.strokeStyle = cr; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke(); }
        }
        c.globalAlpha = a0;
      }
      function polilinha(pts, prog) {
        if (prog <= 0 || pts.length < 2) return;
        const R = reamostra(pts, 1e9), tot = R.tot; let falta = tot * limita(prog);
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length && falta > 0; i++) {
          const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), u = Math.min(1, falta / (d || 1)); falta -= d;
          c.lineTo(mistura(pts[i - 1][0], pts[i][0], u), mistura(pts[i - 1][1], pts[i][1], u));
        }
        c.stroke();
      }
      const curva = (x0, y0, cx, cy, x1, y1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]; });
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      const some = (p, t) => (p.some ? 1 - trecho(t, p.some, p.some + 0.3) : 1);

      // ---------- letras ----------
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
          out.push({ g, x: px + dx, palavra, ch });
          px += avanco(ch, tab) * tam;
        }
        return { letras: out, w };
      }
      // letra a pincel: cada traço da letra vira uma pincelada; prog escreve letra por letra
      // o = { cor, cores[palavra], italico, italicos[palavras], prog, peso, sem, alinha, tabular }
      function escreveTinta(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * (o.peso ?? 0.17), n = letras.length, prog = o.prog ?? 1;
        const corDe = (p) => cor(o.cores ? o.cores[Math.min(p, o.cores.length - 1)] : (o.cor || 'tinta'));
        letras.forEach((l, i) => {
          const pl = limita(prog * n - i);
          if (pl <= 0) return;
          const it = o.italico || (o.italicos && o.italicos.includes(l.palavra));
          c.save();
          if (it) { c.translate(0, y); c.transform(1, 0, -0.2, 1, 0, 0); c.translate(0, -y); }
          c.fillStyle = corDe(l.palavra);
          const nt = l.g.tracos.length;
          l.g.tracos.forEach((tr, j) => {
            const pj = limita(pl * nt - j);
            if (pj <= 0) return;
            const pts = tr.map(([a, b]) => [l.x + a * tam, y - tam + b * tam]);
            if (caminhoPincel(pts, lw, { prog: pj, sem: (o.sem || 7) + l.ch.charCodeAt(0) * 3 + j * 5, ponta: 0.5, aperta: 0.85, aspero: 0.1 })) c.fill();
          });
          c.restore();
        });
      }
      // letra limpa e redonda (só a legenda, como nos outros 13 estilos da série)
      function caminhoLetra(g, x, y, tam) {
        c.beginPath();
        for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      function escreveLimpo(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha);
        const lw = tam * 0.165;
        c.lineCap = 'round'; c.lineJoin = 'round';
        if (o.sombra) { c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = lw + (o.contorno || 0) * 2; for (const l of letras) { caminhoLetra(l.g, l.x + o.sombra, y + o.sombra, tam); c.stroke(); } }
        if (o.contorno) { c.strokeStyle = '#000'; c.lineWidth = lw + o.contorno * 2; for (const l of letras) { caminhoLetra(l.g, l.x, y, tam); c.stroke(); } }
        for (const l of letras) { c.strokeStyle = o.corDe(l.palavra); c.lineWidth = lw; caminhoLetra(l.g, l.x, y, tam); c.stroke(); }
      }

      // ---------- confere as letras ao montar: letra que falta dá erro ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confereLetras() {
        const textos = (H.legendas || []).map((l) => l.texto);
        for (const cn of H.cenas) for (const p of cn.pecas) {
          for (const ch of ['texto', 'titulo', 'unidade']) if (p[ch]) textos.push(...String(p[ch]).split('|'));
          if (p.tipo === 'contador') textos.push(milhar(p.valor));
          if (p.tipo === 'bandeiras') for (const it of p.itens) textos.push(it.nome, it.valor);
          if (p.tipo === 'helice') textos.push(p.esq.rotulo, p.dir.rotulo);
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- papel de arroz: cor, manchas, fibras e grão (feito uma vez) ----------
      const pele = 1 / k; // 1 pixel da tela em unidades de desenho
      const papel = novaTela(largura, altura), grao = novaTela(largura, altura);
      {
        const g = papel.getContext('2d'), r = sorteio(SEM + 11);
        g.setTransform(k, 0, 0, k, 0, 0);
        g.fillStyle = cor('papel'); g.fillRect(0, 0, L, A);
        const [mr, mg, mb] = Filme.rgb(cor('mancha'));
        for (let i = 0; i < 46; i++) { // manchas grandes e macias (repetidas nas bordas: o papel emenda sem costura)
          const x = r() * L, y = r() * A, rad = 120 + r() * 380, a = 0.018 + r() * 0.03, claro = r() < 0.45;
          for (const ox of [-L, 0, L]) for (const oy of [-A, 0, A]) {
            const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
            gr.addColorStop(0, claro ? `rgba(255,250,235,${a})` : `rgba(${mr},${mg},${mb},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
          }
        }
        g.lineCap = 'round';
        for (let i = 0; i < 520; i++) { // fibras
          const x = r() * L, y = r() * A, ang = r() * Math.PI, len = 8 + r() * 40;
          g.strokeStyle = `rgba(${mr},${mg},${mb},${0.05 + r() * 0.08})`; g.lineWidth = Math.max(pele, 0.8);
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 6, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
        }
        // grão por cima de tudo (pontinhos claros e escuros, nunca menores que 1 pixel)
        const q = grao.getContext('2d'); q.setTransform(k, 0, 0, k, 0, 0);
        for (let i = 0; i < 16000; i++) {
          const x = r() * L, y = r() * A, rad = Math.max(pele * 0.6, (0.5 + r() * 1.3)), claro = r() < 0.5;
          q.fillStyle = claro ? `rgba(250,244,228,${0.12 + r() * 0.2})` : `rgba(${mr},${mg},${mb},${0.06 + r() * 0.1})`;
          q.fillRect(x, y, rad, rad);
        }
      }
      // carimbo salpicado: falhas cor de papel por cima do vermelho
      const salpico = novaTela(400 * k, 400 * k);
      {
        const g = salpico.getContext('2d'), r = sorteio(SEM + 23); g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = cor('papel');
        for (let i = 0; i < 900; i++) { const x = r() * 400, y = r() * 400, rad = Math.max(pele * 0.7, 0.6 + r() * 2.6); g.globalAlpha = 0.35 + r() * 0.6; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
        for (let i = 0; i < 26; i++) { const x = r() * 400, y = r() * 400; g.globalAlpha = 0.25 + r() * 0.3; g.beginPath(); g.ellipse(x, y, 6 + r() * 16, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
      }
      // montanhas lavadas numa faixa comprida (andam a 1/4 da câmera)
      const MONTE = H.montanhas || {}, MY = MONTE.y ?? 300, MH = MONTE.altura ?? 440, MW = L + Math.ceil((H.cenas.length) * L * 0.25) + 600;
      const montes = novaTela(MW * k, MH * k);
      {
        const g = montes.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
        const [r0, g0, b0] = Filme.rgb(cor('montanha'));
        (MONTE.camadas || [{ base: 180, amp: 110, a: 0.2 }, { base: 250, amp: 80, a: 0.24 }, { base: 320, amp: 50, a: 0.28 }]).forEach((cm, n) => {
          for (const desvio of [0, 5]) {
            g.beginPath(); g.moveTo(0, MH);
            for (let x = 0; x <= MW; x += 6) {
              const f = x / (cm.largura || 260), y = cm.base + desvio - cm.amp * (0.55 * (ruido(f, SEM + n * 7) * 0.5 + 0.5) + 0.3 * (ruido(f * 2.7, SEM + n * 7 + 1) * 0.5 + 0.5) + 0.15 * (ruido(f * 9, SEM + n * 7 + 2) * 0.5 + 0.5));
              g.lineTo(x, y);
            }
            g.lineTo(MW, MH); g.closePath();
            const gr = g.createLinearGradient(0, cm.base - cm.amp, 0, MH);
            gr.addColorStop(0, `rgba(${r0},${g0},${b0},${cm.a * (desvio ? 0.5 : 1)})`); gr.addColorStop(0.55, `rgba(${r0},${g0},${b0},${cm.a * 0.55 * (desvio ? 0.5 : 1)})`); gr.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
            g.fillStyle = gr; g.fill();
          }
        });
      }
      // cantos marrons (vinheta)
      const vinheta = novaTela(largura, altura);
      {
        const g = vinheta.getContext('2d'), [r, gg, b] = Filme.rgb(cor('vinheta'));
        const gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.42, largura / 2, altura / 2, altura * 0.62);
        gr.addColorStop(0, `rgba(${r},${gg},${b},0)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0.3)`);
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura);
      }

      // ---------- câmera: desliza de lado até o painel de cada cena; tremor na virada ----------
      const CENAS = H.cenas;
      const DESL = CENAS.map((cn, i) => ({ de: cn.desliza?.de ?? cn.de - 0.4, dur: cn.desliza?.dur ?? 0.5, x: (cn.painel ?? i) * L }));
      function camera(t) {
        let x = DESL[0].x, bob = 0;
        for (let i = 1; i < DESL.length; i++) {
          const g = DESL[i];
          if (t < g.de) break;
          const u = trecho(t, g.de, g.de + g.dur);
          x = mistura(DESL[i - 1].x, g.x, suave5(u)); bob = Math.sin(Math.PI * u);
        }
        let dx = 4 * ruido(t * 0.2, 3), dy = -16 * bob + 5 * ruido(t * 0.17, 5);
        const z = 1 + 0.012 * bob;
        const q = Math.round(t * fps);
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) { const r = sorteio(SEM * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros); dx += (r() * 2 - 1) * f; dy += (r() * 2 - 1) * f; }
        }
        return { x, dx, dy, z };
      }

      // ---------- bonecos de pincel: cabeça de tinta e corpo de uma pincelada; o herói tem chapéu ----------
      // (x, y) = centro; tam = altura. o = { cor, chapeu, contorno (0 a 1), sem }
      function figura(x, y, tam, o = {}) {
        const r = tam * 0.15, hy = y - tam / 2 + r, sem = o.sem || 3;
        const corpo = [[x, hy + r * 1.5], [x + tam * 0.012, y + tam / 2 - tam * 0.05]];
        const forma = (modo) => {
          bolha(x, hy, r, sem); modo();
          if (caminhoPincel(corpo, tam * 0.34, { sem: sem + 5, ponta: 0.9, aperta: 0.72, aspero: 0.09 })) modo();
          if (o.chapeu) {
            c.beginPath(); c.moveTo(x - r * 2.4, hy - r * 0.3);
            c.quadraticCurveTo(x - r * 0.8, hy - r * 0.95, x, hy - r * 2.1);
            c.quadraticCurveTo(x + r * 0.8, hy - r * 0.95, x + r * 2.4, hy - r * 0.3);
            c.quadraticCurveTo(x, hy - r * 0.62, x - r * 2.4, hy - r * 0.3); c.closePath(); modo();
          }
        };
        const cont = limita(o.contorno || 0), a0 = c.globalAlpha;
        if (cont < 1) { c.globalAlpha = a0 * (1 - cont); c.fillStyle = o.cor; forma(() => c.fill()); }
        if (cont > 0) { c.globalAlpha = a0 * cont; c.strokeStyle = o.cor; c.lineWidth = Math.max(2.5, tam * 0.026); c.lineJoin = 'round'; forma(() => c.stroke()); }
        c.globalAlpha = a0;
      }
      // traço de nanquim grosso que corta (com respingos no fim)
      function golpe(x0, y0, x1, y1, larg, prog, sem, respingo) {
        if (prog <= 0) return;
        const pts = [[x0, y0], [mistura(x0, x1, 0.5), mistura(y0, y1, 0.5) + larg * 0.2], [x1, y1]];
        pincel(pts, larg, cor('tinta'), { prog, sem, ponta: 0.3, aperta: 1, aspero: 0.2 });
        if (prog > 0.55) { // pincel seco: riscos claros no fim da pincelada
          const R = reamostra(pts, 6).q, a0 = c.globalAlpha, ate = R[R.length - 1][2] * prog;
          c.strokeStyle = cor('papel'); c.lineCap = 'round';
          for (const [f, w] of [[-0.28, 0.05], [0.05, 0.035], [0.3, 0.06]]) {
            const tr = R.filter((p) => p[2] > R[R.length - 1][2] * 0.6 && p[2] <= ate);
            if (tr.length < 2) continue;
            const dx = x1 - x0, dy = y1 - y0, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
            c.globalAlpha = a0 * 0.6; c.lineWidth = larg * w;
            c.beginPath(); tr.forEach(([x, y], i) => { const px = x + nx * f * larg * 0.8, py = y + ny * f * larg * 0.8; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
          }
          c.globalAlpha = a0;
        }
        if (respingo && prog > 0.8) {
          const u = sai(trecho(prog, 0.8, 1)), r = sorteio(sem + 99);
          c.fillStyle = cor('tinta');
          for (let i = 0; i < 16; i++) {
            const ang = (r() - 0.5) * 2.4 + Math.atan2(y1 - y0, x1 - x0), dist = larg * (0.5 + r() * 1.5), rad = larg * (0.04 + r() * 0.14) * u;
            if (rad <= 0.2) continue;
            bolha(x1 + Math.cos(ang) * dist * u, y1 + Math.sin(ang) * dist * u, rad, sem + i, 10); c.fill();
          }
        }
      }
      // forma do carimbo: retângulo com a borda gasta
      function formaSelo(w, h, sem) {
        const pts = [], n = 10, j = Math.min(w, h) * 0.018;
        const lados = [[-w / 2, -h / 2, w / 2, -h / 2], [w / 2, -h / 2, w / 2, h / 2], [w / 2, h / 2, -w / 2, h / 2], [-w / 2, h / 2, -w / 2, -h / 2]];
        lados.forEach(([a, b, cc, d], li) => { for (let i = 0; i < n; i++) { const u = i / n; pts.push([mistura(a, cc, u) + j * ruido(li * 10 + i * 0.9, sem), mistura(b, d, u) + j * ruido(li * 10 + i * 0.9 + 40, sem)]); } });
        c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      }
      // marcas de carimbo inventadas (traços retos em grade): parecem escrita de selo sem ser palavra nenhuma
      function marcasSelo(w, h, sem) {
        const r = sorteio(sem), cw = w * 0.36;
        c.beginPath();
        for (const cx of [-w * 0.2, w * 0.2]) for (const cy of [-h * 0.2, h * 0.2]) {
          const n = 3 + Math.floor(r() * 3);
          for (let i = 0; i < n; i++) {
            const pos = (Math.floor(r() * 4) / 3 - 0.5) * cw * 0.75, a = cw * (0.15 + r() * 0.3), b = cw * (0.15 + r() * 0.3);
            if (r() < 0.55) { c.moveTo(cx - a, cy + pos); c.lineTo(cx + b, cy + pos); } else { c.moveTo(cx + pos, cy - a); c.lineTo(cx + pos, cy + b); }
          }
        }
        c.strokeStyle = cor('papel'); c.lineWidth = w * 0.05; c.lineCap = 'square'; c.stroke();
      }
      function desenhaSelo(w, h, sem, crSelo, conteudo) {
        formaSelo(w, h, sem); c.fillStyle = crSelo; c.fill();
        c.strokeStyle = cor('papel'); c.lineWidth = Math.min(w, h) * 0.03;
        c.strokeRect(-w / 2 + w * 0.07, -h / 2 + h * 0.07, w * 0.86, h * 0.86);
        conteudo();
        c.save(); formaSelo(w, h, sem); c.clip(); c.drawImage(salpico, -w / 2, -h / 2, w, h); c.restore();
      }

      // ---------- as peças ----------
      const PECAS = {
        texto(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + (p.dur ?? 0.35)), sb = trecho(t, p.t, p.t + 0.4);
          alfa((p.sobe ? sb : 1) * some(p, t));
          const dy = p.sobe ? (1 - sai(sb)) * 40 : 0;
          escreveTinta(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, italico: p.italico, italicos: p.italicos, prog: p.sobe ? 1 : u, sem: p.sem, alinha: p.alinha, tabular: p.tabular, peso: p.peso });
          if (p.risco && t >= p.risco.de) {
            const w = largTexto(p.texto, p.tam) / 2 + p.tam * 0.35, yc = p.y - p.tam * 0.45;
            golpe(p.x - w, yc + p.tam * 0.12, p.x + w, yc - p.tam * 0.12, p.tam * 0.2, sai(trecho(t, p.risco.de, p.risco.ate)), 61, false);
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(trecho(t, p.de, p.de + 0.2) * some(p, t));
          escreveTinta(milhar(u >= 1 ? p.valor : Math.floor(v)), p.x, p.y, p.tam, { cor: p.cor, tabular: true, sem: 5 });
        },
        multidao(p, t) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2, r = sorteio(SEM + 3);
          const pos = Array.from({ length: n }, (_, i) => { const col = i % p.colunas, lin = Math.floor(i / p.colunas); return [x0 + col * p.dx + (lin % 2 ? p.dx / 4 : -p.dx / 4) + (r() - 0.5) * 14, p.y + lin * p.dy + (r() - 0.5) * 10]; });
          const ap = p.apaga ? trecho(t, p.apaga, p.apaga + 0.5) : 0;
          if (p.liga && t >= p.liga.de) { // fios de tinta de cada boneco até um ponto
            alfa(0.8); c.strokeStyle = cor('tinta2'); c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round';
            const [px, py] = p.liga.para;
            pos.forEach(([x, y], i) => {
              const lin = Math.floor(i / p.colunas), atraso = lin * 0.05 + Math.abs(x - p.x) / 540 * 0.12;
              polilinha(curva(x, y - p.tam / 2, x, py + (y - py) * 0.18, px, py), sai(trecho(t, p.liga.de + atraso, p.liga.ate)));
            });
          }
          pos.forEach(([x, y], i) => {
            const s = pop(t, p.de + (p.ate - p.de) * (i / n), 0.3);
            alfa(1 - 0.72 * ap);
            emVolta(x, y + p.tam / 2, s, () => figura(x, y, p.tam, { cor: cor('tinta'), sem: 100 + i }));
          });
        },
        heroi(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.45), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.4)) : 0;
          if (p.halo) { // aguada vermelha atrás da raiz (o "brilho" da tinta)
            const [r, g, b] = Filme.rgb(cor('selo')), gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.tam * 0.95);
            gr.addColorStop(0, `rgba(${r},${g},${b},${0.3 * (1 - cont) * limita(s)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
            alfa(1); c.fillStyle = gr; c.fillRect(p.x - p.tam, p.y - p.tam, p.tam * 2, p.tam * 2);
          }
          alfa(1);
          emVolta(p.x, p.y + p.tam / 2, s, () => figura(p.x, p.y, p.tam, { cor: cor(p.cor || 'tinta'), chapeu: p.chapeu, contorno: cont, sem: 41 }));
          if (p.interroga && t >= p.interroga) {
            const si = pop(t, p.interroga + 0.1, 0.4), yq = p.y + p.tam * 0.34;
            emVolta(p.x, yq - p.tam * 0.18, si, () => escreveTinta('?', p.x, yq, p.tam * 0.36, { cor: 'selo', peso: 0.2 }));
          }
        },
        selo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.16), s = mistura(1.7, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.4)) : 0;
          alfa(limita(u * 2) * (1 - ap * 0.85));
          c.translate(p.x, p.y); c.rotate((p.giro || 0) * RAD); c.scale(s, s);
          const w = p.tam, h = p.tam;
          desenhaSelo(w, h, p.sem || 9, cor('selo'), () => {
            if (p.interroga) escreveTinta('?', 0, h * 0.3, h * 0.62, { cor: 'papel', peso: 0.17 });
            else marcasSelo(w, h, p.sem || 9);
          });
        },
        carimbo(p, t) { // carimbo vermelho com texto; apaga (fica cinza e gira) e leva um golpe de nanquim
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.18), s = mistura(1.8, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.3)) : 0;
          const linhas = p.texto.split('|'), tl = p.tam;
          const w = Math.max(...linhas.map((x) => largTexto(x, tl))) + tl * 1.2, h = linhas.length * tl * 1.45 + tl * 0.9;
          alfa(limita(u * 2));
          c.save();
          c.translate(p.x, p.y); c.rotate(mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD); c.scale(s, s);
          desenhaSelo(w, h, p.sem || 12, Filme.hex(cor('selo'), cor('apagado'), ap), () => {
            linhas.forEach((ln, i) => escreveTinta(ln, 0, -h / 2 + tl * 0.45 + tl * 1.05 + i * tl * 1.45, tl, { cor: 'papel', peso: 0.14 }));
          });
          c.restore();
          if (p.risco && t >= p.risco.de) { alfa(1); golpe(p.x - w * 0.62, p.y + h * 0.45, p.x + w * 0.6, p.y - h * 0.5, p.risco.larg || 70, sai(trecho(t, p.risco.de, p.risco.ate)), 77, true); }
        },
        cartao(p, t) { // folha clara entre dois rolos, que se abre de cima para baixo
          if (t < p.t) return;
          const u = sai(trecho(t, p.t, p.t + 0.3)), h = p.a * mistura(0.06, 1, u), x0 = p.x - p.l / 2, y0 = p.y - p.a / 2;
          alfa(1);
          c.fillStyle = cor('cartao'); c.fillRect(x0, y0, p.l, h);
          c.strokeStyle = cor('tinta2'); c.lineWidth = 2; alfa(0.35); c.strokeRect(x0 + 14, y0 + 14, p.l - 28, Math.max(0, h - 28)); alfa(1);
          const rolo = (y, sem) => {
            pincel([[x0 - 40, y], [x0 + p.l + 40, y]], 24, cor('tinta'), { sem, ponta: 0.85, aperta: 0.9, aspero: 0.06 });
            for (const x of [x0 - 44, x0 + p.l + 44]) { bolha(x, y, 15, sem + x, 12); c.fill(); }
          };
          if (p.titulo) { alfa(trecho(t, p.t + 0.15, p.t + 0.35)); escreveTinta(p.titulo, p.x, y0 + 86, 34, { cor: 'tinta2', italico: true, peso: 0.12 }); alfa(1); }
          if (p.linhas) { // linhas apagadas de texto (o arquivo)
            c.strokeStyle = cor('tinta2'); c.lineCap = 'round'; c.lineWidth = 6;
            for (let i = 0; i < p.linhas; i++) { const yy = y0 + 150 + i * 70; if (yy > y0 + h - 40) break; alfa(0.18); const w = p.l * (i % 3 === 1 ? 0.45 : 0.7); polilinha([[x0 + 70, yy], [x0 + 70 + w, yy]], sai(trecho(t, p.t + 0.15 + i * 0.05, p.t + 0.5 + i * 0.05))); }
            alfa(1);
          }
          rolo(y0, 3); rolo(y0 + h, 4);
        },
        tubos(p, t) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.52, h = p.tam;
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(trecho(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              const forma = () => { c.beginPath(); c.moveTo(x - w / 2, p.y - h / 2); c.lineTo(x - w / 2, p.y + h / 2 - w / 2); c.arc(x, p.y + h / 2 - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, p.y - h / 2); };
              if (cheio > 0) { c.save(); forma(); c.closePath(); c.clip(); c.fillStyle = cor('selo'); c.fillRect(x - w, mistura(p.y + h / 2, p.y - h * 0.12, cheio), 2 * w, h); c.restore(); }
              forma(); c.strokeStyle = cor('tinta'); c.lineWidth = 4.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
              pincel([[x - w / 2 - 9, p.y - h / 2], [x + w / 2 + 9, p.y - h / 2]], 7, cor('tinta'), { sem: 300 + i, ponta: 0.6 });
            });
          }
        },
        fila(p, t) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2;
          for (let i = 0; i < n; i++) {
            const x = x0 + (i % p.colunas) * p.dx, y = p.y + Math.floor(i / p.colunas) * p.dy;
            const s = pop(t, p.de + (p.ate - p.de) * i / n, 0.3);
            const ac = p.acende && i === p.acende.i ? trecho(t, p.acende.t, p.acende.t + 0.15) : 0;
            const sa = ac > 0 ? 1 + 0.1 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.35)) : 1;
            alfa(1);
            emVolta(x, y + p.tam / 2, s * sa, () => figura(x, y, p.tam, { cor: Filme.hex(cor('tinta'), cor('selo'), ac), sem: 200 + i }));
          }
        },
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r, ri) => reamostra(r.map(pj), 9).q.map(([x, y], i) => [x + 1.6 * ruido(i * 0.4, 500 + ri), y + 1.6 * ruido(i * 0.4, 600 + ri)]));
          // aguada clarinha na terra, depois que o contorno fecha
          alfa(0.6 * trecho(t, p.contorno.ate - 0.1, p.contorno.ate + 0.3));
          for (const [ri, r] of terras.entries()) aguada(r, cor('montanha'), 0.18, 700 + ri, 3);
          alfa(1); c.strokeStyle = cor('tinta'); c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          for (const r of terras) polilinha(r, pc);
          const forma = (pts) => pts.map(pj);
          if (p.regiao && t >= p.regiao.de) { // aguada escura que entra de leste (direita) para oeste
            const pr = forma(T.regiao), xs = pr.map((q) => q[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 20, xa - 20, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -3000, 6000, 8000); c.clip();
            alfa(1 - 0.55 * im); aguada(pr, cor('tinta2'), 0.75, 811, 5);
            if (p.aneis && t >= p.aneis.t) { // pingos vermelhos dentro da região
              const lo = T.regiao.map((q) => q[0]), la = T.regiao.map((q) => q[1]), pa = p.aneis.passo;
              c.save(); c.beginPath(); pr.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
              let i = 0;
              for (let lat = Math.min(...la) + pa / 2; lat < Math.max(...la); lat += pa * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? pa / 2 : 0); lon < Math.max(...lo); lon += pa) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                if (s <= 0) continue;
                c.fillStyle = cor('selo'); bolha(x, y, 5.5 * s, 900 + i + Math.round(lon * 3), 10); c.fill();
              }
              c.restore();
            }
            c.restore();
          }
          if (p.imperio && t >= p.imperio.pulsa) { // aguada vermelha que cresce de um ponto que pulsa
            const [px, py] = pj(p.imperio.ponto);
            if (t >= p.imperio.de) {
              const u = sai(trecho(t, p.imperio.de, p.imperio.ate));
              c.save(); c.beginPath(); c.arc(px, py, 20 + u * 700, 0, 7); c.clip();
              alfa(1); aguada(forma(T.imperio), cor('selo'), 0.85, 933, 7);
              c.restore();
            }
            alfa(1); c.fillStyle = cor('selo'); bolha(px, py, 11 * pop(t, p.imperio.pulsa, 0.3), 950); c.fill();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            alfa(0.8 * (1 - fase)); c.strokeStyle = cor('selo'); c.lineWidth = 3; c.beginPath(); c.arc(px, py, 11 + fase * 40, 0, 7); c.stroke();
          }
        },
        bandeiras(p, t) { // rolos pendurados que se desenrolam pelo tamanho (o gráfico de barras)
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * (p.passoT ?? 0.1);
            if (t < t0) return;
            const u = sai(trecho(t, t0, t0 + p.dur)), cx = p.x + i * p.passo, w = p.larg, top = p.y, h = p.altMax * it.v / p.maximo * u;
            const V = it.cor === 'selo';
            alfa(trecho(t, t0, t0 + 0.12));
            c.strokeStyle = cor('tinta2'); c.lineWidth = 2.5; c.lineJoin = 'round';
            c.beginPath(); c.moveTo(cx - w * 0.32, top); c.lineTo(cx, top - 30); c.lineTo(cx + w * 0.32, top); c.stroke();
            if (h > 2) {
              const a0 = c.globalAlpha;
              c.globalAlpha = a0 * (V ? 1 : 0.82); c.fillStyle = cor(it.cor);
              formaBanda(cx, top, w, h, 1300 + i); c.fill();
              c.globalAlpha = a0 * 0.4; c.strokeStyle = cor('papel'); c.lineWidth = 2; if (h > 24) c.strokeRect(cx - w / 2 + 9, top + 12, w - 18, h - 22);
              c.globalAlpha = a0;
            }
            const rolo = (y, ww, sem) => { pincel([[cx - ww / 2, y], [cx + ww / 2, y]], 15, cor('tinta'), { sem, ponta: 0.85, aperta: 0.9, aspero: 0.06 }); };
            rolo(top, w + 34, 1400 + i); rolo(top + h + 5, w + 22, 1500 + i);
            alfa(trecho(t, t0 + p.dur * 0.6, t0 + p.dur));
            escreveTinta(it.nome, cx, top + p.altMax + 66, 32, { cor: V ? 'selo' : 'tinta', peso: 0.14 });
            escreveTinta(it.valor, cx, top + p.altMax + 108, 28, { cor: V ? 'selo' : 'tinta2', italico: true, tabular: true, peso: 0.13 });
          });
        },
        tumulos(p, t) { // montes de terra lavados que ganham contorno de nanquim
          if (t < p.t) return;
          const pos = p.pos || [[-110, -40, 0.78], [120, -40, 0.78], [-310, 25, 1], [320, 25, 1]];
          pos.forEach(([dx, dy, sc], n) => {
            const x = p.x + dx, y = p.y + dy, w = p.tam * 1.6 * sc, h = p.tam * 0.8 * sc, s = pop(t, p.t + n * 0.06, 0.35);
            const domo = Array.from({ length: 17 }, (_, i) => { const a = Math.PI + Math.PI * i / 16; return [x + Math.cos(a) * w / 2, y + Math.sin(a) * h]; });
            alfa(1);
            emVolta(x, y, s, () => {
              aguada(domo, cor('tinta2'), 0.5, 1600 + n, 4);
              pincel([[x - w * 0.62, y + 2], [x + w * 0.62, y + 2]], 5, cor('tinta2'), { sem: 1650 + n, ponta: 0.3 });
              c.fillStyle = cor('tinta2'); bolha(x, y - h - 6, 9 * sc, 1680 + n, 10); c.fill();
            });
            if (p.borda) { alfa(1); pincel(domo, 6, cor('tinta'), { prog: sai(trecho(t, p.borda + n * 0.05, p.borda + 0.4 + n * 0.05)), sem: 1700 + n, ponta: 0.4, aperta: 0.6 }); }
          });
        },
        helice(p, t) {
          if (t < p.de) return;
          const n = 22, u = sai(trecho(t, p.de, p.ate)), giro = t * 2.4;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5);
            if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 68, frente = Math.cos(f);
            alfa(vis * 0.6); c.strokeStyle = cor('tinta2'); c.lineWidth = 2.5; c.beginPath(); c.moveTo(p.x - ax, y); c.lineTo(p.x + ax, y); c.stroke();
            for (const [sx, prof] of [[ax, frente], [-ax, -frente]]) {
              alfa(vis * (0.45 + 0.55 * (prof + 1) / 2)); c.fillStyle = cor('tinta');
              bolha(p.x + sx, y, 8 + 4 * (prof + 1) / 2, 1800 + i * 2 + (sx > 0 ? 1 : 0), 10); c.fill();
            }
          }
          if (p.divide && t >= p.divide) {
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const [ri, r] of [p.esq, p.dir].entries()) {
              const fraco = r.fraco ? 0.4 : 1, m = 11;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                alfa(fraco); c.fillStyle = cor(r.cor); bolha(x, y, 9, 1900 + ri * 20 + i, 10); c.fill();
              }
              if (v >= 1) {
                const s = pop(t, p.divide + p.durDivide, 0.25);
                alfa(fraco);
                emVolta(r.x, r.y - 50, s, () => { // o cromossomo Y a pincel
                  const cr = cor(r.cor);
                  pincel([[r.x - 26, r.y - 95], [r.x, r.y - 55]], 14, cr, { sem: 2000 + ri, ponta: 0.6 });
                  pincel([[r.x + 26, r.y - 95], [r.x, r.y - 55]], 14, cr, { sem: 2010 + ri, ponta: 0.6 });
                  pincel([[r.x, r.y - 58], [r.x, r.y - 18]], 14, cr, { sem: 2020 + ri, ponta: 0.5 });
                });
                alfa(fraco * trecho(t, p.divide + p.durDivide, p.divide + p.durDivide + 0.2));
                escreveTinta(r.rotulo, r.x, r.y - 128, 40, { cor: r.cor, italico: true, peso: 0.13 });
              }
            }
          }
        },
        arvore(p, t) {
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, tam: p.raizTam }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, tam: nv.tam }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(trecho(t, t0, t0 + passo * 0.8));
            const pais = nos[l - 1], filhos = nos[l], porPai = filhos.length / pais.length;
            alfa(1);
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = pai.y + pai.tam / 2 + 6;
              pincel(curva(pai.x, yb, f.x, yb + 10, f.x, f.y - f.tam / 2 - 8, 12), 5, cor('tinta2'), { prog: pr, sem: 2100 + l * 20 + j, ponta: 0.4, aperta: 0.8 });
            });
            filhos.forEach((f, j) => {
              const s = pop(t, t0 + passo * 0.55 + j * 0.02, 0.3);
              emVolta(f.x, f.y + f.tam / 2, s, () => figura(f.x, f.y, f.tam, { cor: cor('tinta'), sem: 2200 + l * 20 + j }));
            });
          }
        },
      };
      function formaBanda(cx, top, w, h, sem) {
        c.beginPath(); const j = 2.5;
        c.moveTo(cx - w / 2, top);
        for (let i = 1; i <= 8; i++) c.lineTo(cx - w / 2 + j * ruido(i * 0.9, sem), top + h * i / 8);
        for (let i = 8; i >= 0; i--) c.lineTo(cx + w / 2 + j * ruido(i * 0.9, sem + 5), top + h * i / 8);
        c.closePath();
      }

      // ---------- legendas: 2 a 4 palavras, branco com borda preta, a palavra falada em amarelo ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 64, palavras = lg.texto.split(/\s+/);
        const linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && largTexto(tenta, tam) > (LG.largura || 1000)) { linhas.push(atual); atual = [p]; } else atual.push(p); }
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
        const tam = lg.tam, passoL = tam * 1.5, n = lg.linhas.length, yb = LG.y || 1590;
        const s = 0.9 + 0.1 * passa(trecho(t, lg.de, lg.de + 0.2));
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        emVolta(L / 2, yb - tam / 2, s, () => {
          let idx = 0;
          lg.linhas.forEach((ln, li) => {
            const y = yb - (n - 1 - li) * passoL, base = idx;
            escreveLimpo(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : cor('branco')), contorno: 8, sombra: 3 });
            idx += ln.length;
          });
        });
      }

      // ---------- um quadro ----------
      const SOL = H.sol;
      function desenhar(t) {
        c.reset();
        const cam = camera(t), z = cam.z;
        const vista = (px) => c.setTransform(k * z, 0, 0, k * z, k * (L / 2 + cam.dx - z * (px + L / 2)), k * (A / 2 + cam.dy - z * A / 2));
        // o papel do rolo (anda com a câmera)
        vista(cam.x);
        for (let i = Math.floor((cam.x - 60) / L); i <= Math.floor((cam.x + L + 60) / L); i++) for (const j of [-1, 0, 1]) c.drawImage(papel, i * L, j * A, L, A);
        // o sol vermelho fica parado no quadro; as montanhas andam a 1/4
        vista(0);
        if (SOL) { const a = 1 - trecho(t, SOL.some[0], SOL.some[1]); if (a > 0) { alfa(0.88 * a); c.fillStyle = cor('selo'); bolha(SOL.x, SOL.y, SOL.r, 77, 36); c.fill(); alfa(1); } }
        vista(cam.x * 0.25 + 300); c.drawImage(montes, 0, MY, MW, MH);
        // as cenas, cada uma no seu painel
        CENAS.forEach((cn, i) => {
          const px = DESL[i].x;
          if (Math.abs(px - cam.x) > L + 80 || t < cn.de - 1.5) return;
          vista(cam.x); c.translate(px, 0);
          for (const p of cn.pecas) { c.save(); PECAS[p.tipo](p, t); c.restore(); }
        });
        // grão do papel por cima da tinta, e os cantos marrons
        vista(cam.x); c.globalAlpha = 1;
        for (let i = Math.floor((cam.x - 60) / L); i <= Math.floor((cam.x + L + 60) / L); i++) for (const j of [-1, 0, 1]) c.drawImage(grao, i * L, j * A, L, A);
        c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(vinheta, 0, 0);
        legenda(t);
        const fim = trecho(t, H.escurece?.[0] ?? duracao - 0.35, H.escurece?.[1] ?? duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = cor('tinta'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: flauta pentatônica sobre cítara grave, taikô e carimbos ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, SEM + 5), r = sorteio(SEM + 77);
        const corta = MU.corta || [];
        const proxCorte = (tt) => corta.reduce((m, [a]) => (a > tt && a < m ? a : m), Infinity);
        const calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // flauta de bambu: seno com vibrato, um harmônico fraco e o sopro (ruído agudo)
        for (const [tt, n, d] of MU.flauta || []) {
          if (calado(tt)) continue;
          const solta = 0.3, dur = Math.min(d, proxCorte(tt) - tt - solta - 0.05);
          if (dur <= 0.05) continue;
          const v = MU.volFlauta ?? 0.09;
          s.nota(n, tt, dur, { vol: v, forma: 'seno', ataque: 0.07, solta, vibrato: 0.006, vibratoHz: 5.2, pan: 0.15 });
          s.nota(n, tt, dur, { vol: v * 0.18, forma: 'tri', ataque: 0.09, solta, vibrato: 0.006, vibratoHz: 5.2, pan: 0.15 });
          s.vento(tt, Math.min(dur, 0.35), { vol: v * 0.35, corte: 4200, onda: 3, profundidade: 0.4, entra: 0.03, sai: 0.2 });
        }
        // cítara grave dedilhada devagar e um bordão bem baixo
        const CI = MU.citara || {};
        for (let i = 0, tt = CI.comeco ?? 0.1; tt < duracao - 0.6; i++, tt += CI.passo || 0.75) {
          if (calado(tt)) continue;
          const n = CI.notas[i % CI.notas.length], dur = Math.min(2.2, proxCorte(tt) - tt);
          if (dur > 0.1) s.corda(n, tt, dur, { vol: CI.vol ?? 0.3, maciez: 0.35, pan: (i % 2 ? -0.25 : 0.2) });
        }
        if (MU.bordao) {
          let ini = 0.1;
          for (const [a, b] of [...corta, [duracao - 0.3, duracao]]) { if (a - ini > 0.5) { s.nota(MU.bordao[0], ini, a - ini - 0.4, { vol: MU.bordao[1], forma: 'seno', ataque: 0.8, solta: 0.35 }); s.nota(MU.bordao[2] || MU.bordao[0], ini, a - ini - 0.4, { vol: MU.bordao[1] * 0.6, forma: 'seno', ataque: 1, solta: 0.35 }); } ini = b; }
        }
        // estalinhos de madeira quando as peças entram, papel deslizando a cada troca de painel
        const plic = (tt, f = 1100, v = 0.03) => s.pio(tt, { freq: f, vol: v, repete: 1, dur: 0.03, sobe: -0.3 });
        DESL.forEach((g, i) => { if (i) s.vento(g.de, g.dur + 0.1, { vol: 0.08, corte: 2600, onda: 1.5, entra: g.dur * 0.5, sai: 0.25 }); });
        for (const cn of H.cenas) for (const p of cn.pecas) {
          if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.08) plic(tt, 800 + r() * 700, 0.02);
          if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 5000, onda: 1, entra: 0.3, sai: 0.3 });
          if (p.tipo === 'bandeiras') p.itens.forEach((_, i) => s.vento(p.t + i * (p.passoT ?? 0.1), p.dur, { vol: 0.05, corte: 3500, onda: 2, entra: 0.05, sai: 0.3 }));
          if (p.tipo === 'texto' && !p.sobe) for (let tt = p.t; tt < p.t + (p.dur ?? 0.35); tt += 0.06) s.vento(tt, 0.06, { vol: 0.025, corte: 6000, onda: 1, entra: 0.01, sai: 0.04 });
          if (p.tipo === 'mapa') s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 3000, onda: 1, entra: 0.2, sai: 0.3 });
          if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.07) plic(tt, 1500 + r() * 600, 0.014);
          if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.06, { vol: 0.06, corte: 700, dur: 0.08 });
        }
        // bloco de madeira sob o contador
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.07) s.toque(tt, { vol: 0.06, corte: 2600, dur: 0.02, pan: (r() - 0.5) * 0.4 });
        // taikô grave
        for (const [tt, f] of (SO.taiko || []).map((x) => (Array.isArray(x) ? x : [x, 1]))) {
          s.batida(tt, { vol: 0.42 * f, freq: 58, dur: 0.9 }); s.batida(tt, { vol: 0.2 * f, freq: 125, dur: 0.18 }); s.toque(tt, { vol: 0.1 * f, corte: 450, dur: 0.14 });
        }
        // carimbo batendo no papel
        for (const tt of SO.carimbos || []) { s.toque(tt, { vol: 0.16, corte: 900, dur: 0.06 }); s.batida(tt, { vol: 0.22, freq: 150, dur: 0.09 }); }
        // brilhos (sinos curtos) e subidas (sopro que cresce)
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.3 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.12, corte: 2800, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 300, sobe: 2.2, dur: d, repete: 1, vol: 0.03 }); }
        // a virada: golpe de pincel (sopro rápido) e respingo
        if (SO.virada !== undefined) { const a = SO.virada; s.vento(a - 0.02, 0.22, { vol: 0.14, corte: 6000, onda: 4, profundidade: 0.5, entra: 0.02, sai: 0.12 }); s.toque(a + 0.2, { vol: 0.12, corte: 1500, dur: 0.1 }); }
        // galope macio (cavalos de tinta)
        if (SO.galope) for (let tt = SO.galope[0], i = 0; tt < SO.galope[1]; tt += 0.13, i++) s.toque(tt, { vol: i % 3 === 2 ? 0.03 : 0.05, corte: 500, dur: 0.05, pan: -0.2 });
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.3);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
