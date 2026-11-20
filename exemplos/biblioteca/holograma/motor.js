// MOTOR "holograma" — 3D futurista holográfico: escuridão azul funda, raios de luz que caem do alto,
// chão de grade em perspectiva, painéis de vidro flutuando, figuras de holograma ciano e magenta,
// rótulos finos entre colchetes, moldura de câmera (cantos, REC, linha que varre), brilho em tudo
// e troca de cena com falha de sinal (glitch).
// Jeito de animar: camadas-planas (canvas 2D) com uma conta de perspectiva própria para o chão e a multidão.
// Este arquivo sabe DESENHAR as peças. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio, ruido } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.5; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d))));
      const rgba = (n, a) => Filme.cor(cor(n), cor(n), 0, limita(a));

      // ---------- opacidade da peça ----------
      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };

      // ---------- letras em traços (letras.js): fino (rótulo) ou grosso (legenda) ----------
      const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
      const ESPACO = 0.5, CELULA = 0.62;
      const digito = (ch) => ch >= '0' && ch <= '9';
      const avanco = (ch, tab, entre) => { if (ch === ' ') return ESPACO; const g = glifo(ch); if (!g) return ESPACO; return (tab && digito(ch) ? CELULA : g.w) + entre; };
      const largTexto = (txt, tam, tab, entre = 0.27) => { let w = 0; for (const ch of txt) w += avanco(ch, tab, entre); return Math.max(0, w - entre) * tam; };
      function arruma(txt, x, tam, alinha, tab, entre) {
        const w = largTexto(txt, tam, tab, entre);
        let px = alinha === 'esquerda' ? x : alinha === 'direita' ? x - w : x - w / 2;
        const out = []; let palavra = 0;
        for (const ch of txt) {
          if (ch === ' ') { palavra++; px += ESPACO * tam; continue; }
          const g = glifo(ch);
          const dx = tab && digito(ch) ? (CELULA - g.w) / 2 * tam : 0;
          out.push({ g, x: px + dx, palavra });
          px += avanco(ch, tab, entre) * tam;
        }
        return { letras: out, w };
      }
      function caminho(g, x, y, tam) {
        for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { corDe(palavra), alinha, tabular, fino, contorno, sombra, halo (cor do halo) }
      function escreve(txt, x, y, tam, o = {}) {
        const entre = o.fino ? 0.27 + 0.12 : 0.24;
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular, entre);
        const lw = o.fino ? Math.max(3.5, tam * 0.07) : tam * 0.16;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = o.corDe || (() => cor(o.cor || 'gelo'));
        const passada = (cr, w) => { c.strokeStyle = cr; c.lineWidth = w; c.beginPath(); for (const l of letras) caminho(l.g, l.x, y, tam); c.stroke(); };
        if (o.sombra) { c.save(); c.translate(o.sombra, o.sombra); passada('rgba(0,0,0,0.7)', lw + (o.contorno || 0) * 2); c.restore(); }
        if (o.contorno) passada('#000', lw + o.contorno * 2);
        if (o.halo) { const a0 = c.globalAlpha; c.globalAlpha = a0 * 0.35; passada(o.halo, lw * 3.2); c.globalAlpha = a0; }
        // cor por palavra
        const grupos = new Map();
        for (const l of letras) { const cr = corDe(l.palavra); if (!grupos.has(cr)) grupos.set(cr, []); grupos.get(cr).push(l); }
        for (const [cr, ls] of grupos) { c.strokeStyle = cr; c.lineWidth = lw; c.beginPath(); for (const l of ls) caminho(l.g, l.x, y, tam); c.stroke(); }
        return letras;
      }
      // rótulo do estilo: letra fina gelo, halo ciano e colchetes ciano dos dois lados
      function rotulo(txt, x, y, tam, o = {}) {
        const cores = o.cores, cr0 = o.cor || 'gelo';
        escreve(txt, x, y, tam, { fino: true, tabular: o.tabular, halo: cor('ciano'), corDe: (p) => cor(cores ? cores[Math.min(p, cores.length - 1)] : cr0) });
        if (o.semColchete) return;
        const w = largTexto(txt, tam, o.tabular, 0.39), lw = Math.max(3.5, tam * 0.06);
        const yt = y - tam * 1.12, yb = y + tam * 0.16, ab = tam * 0.22;
        c.lineCap = 'butt'; c.lineJoin = 'miter';
        for (const s of [-1, 1]) {
          const bx = x + s * (w / 2 + tam * 0.45);
          for (const [wl, al, cr] of [[lw * 3, 0.3, cor('ciano')], [lw, 1, cor('ciano')]]) {
            const a0 = c.globalAlpha; c.globalAlpha = a0 * al; c.strokeStyle = cr; c.lineWidth = wl;
            c.beginPath(); c.moveTo(bx - s * ab, yt); c.lineTo(bx, yt); c.lineTo(bx, yb); c.lineTo(bx - s * ab, yb); c.stroke();
            c.globalAlpha = a0;
          }
        }
      }

      // ---------- confere as letras ao montar: letra que falta dá erro ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confereLetras() {
        const textos = (H.legendas || []).map((l) => l.texto);
        for (const cn of H.cenas) for (const p of cn.pecas) {
          for (const ch of ['texto', 'titulo', 'unidade']) if (p[ch]) textos.push(p[ch]);
          if (p.tipo === 'contador') textos.push(milhar(p.valor));
          if (p.tipo === 'barras') for (const it of p.itens) textos.push(it.nome, it.valor);
          if (p.tipo === 'helice' && p.esq) textos.push(p.esq.rotulo, p.dir.rotulo);
        }
        textos.push('REC 0123456789:?');
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- formas ----------
      function retRedondo(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
      }
      function linha(x0, y0, x1, y1, prog) {
        if (prog <= 0) return;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(mistura(x0, x1, prog), mistura(y0, y1, prog)); c.stroke();
      }
      function polilinha(pts, prog) {
        if (prog <= 0 || pts.length < 2) return;
        const seg = []; let tot = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
        let falta = tot * limita(prog);
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length && falta > 0; i++) {
          const u = Math.min(1, falta / seg[i - 1]); falta -= seg[i - 1];
          c.lineTo(mistura(pts[i - 1][0], pts[i][0], u), mistura(pts[i - 1][1], pts[i][1], u));
        }
        c.stroke();
      }
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      const some = (p, t) => (p.some ? 1 - trecho(t, p.some, p.some + 0.3) : 1);
      // traço de neon: um halo largo e fraco e um fio forte por cima (sem shadowBlur: o brilho geral vem depois)
      function neon(fazCaminho, cr, lw, forca = 1) {
        const a0 = c.globalAlpha;
        c.strokeStyle = cr;
        c.globalAlpha = a0 * 0.22 * forca; c.lineWidth = lw * 3.4; fazCaminho(); c.stroke();
        c.globalAlpha = a0; c.lineWidth = lw; fazCaminho(); c.stroke();
      }
      // vidro: recheio azul translúcido, reflexo na diagonal, borda ciano, fio de cromo no alto
      function vidro(x, y, w, h, r, o = {}) {
        retRedondo(x, y, w, h, r); c.fillStyle = Filme.cor(cor(o.fundo || 'vidro'), cor(o.fundo || 'vidro'), 0, o.opaco ?? 0.55); c.fill();
        const g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
        g.addColorStop(0, 'rgba(232,251,255,0.10)'); g.addColorStop(0.45, 'rgba(232,251,255,0.02)'); g.addColorStop(1, 'rgba(232,251,255,0)');
        retRedondo(x, y, w, h, r); c.fillStyle = g; c.fill();
        neon(() => retRedondo(x, y, w, h, r), cor(o.borda || 'ciano'), 2.5, 0.8);
        const a0 = c.globalAlpha; c.globalAlpha = a0 * 0.7; c.strokeStyle = cor('gelo'); c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + r + 10, y + 5); c.lineTo(x + w * 0.45, y + 5); c.stroke(); c.globalAlpha = a0;
        // cantos de mira (HUD) do painel
        c.strokeStyle = cor('ciano'); c.lineWidth = 4; const m = 22, d = -8;
        for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
          c.beginPath(); c.moveTo(cx + d * sx, cy + (d + m) * sy); c.lineTo(cx + d * sx, cy + d * sy); c.lineTo(cx + (d + m) * sx, cy + d * sy); c.stroke();
        }
      }

      // ---------- figuras de holograma ----------
      // corpo genérico (cabeça, ombros, cintura, pernas juntas). (x, pe) = chão; alt = altura em px.
      // v = variação { ombro, cabeca, cabelo (0 nada, 1 boné, 2 cabelo alto) }
      function corpo(x, pe, alt, v = {}) {
        const h = alt, om = h * 0.135 * (v.ombro || 1), cab = h * 0.075 * (v.cabeca || 1);
        const yc = pe - h + cab * 1.15, yp = pe - h * 0.82, yo = pe - h * 0.77, yci = pe - h * 0.45;
        c.beginPath();
        c.ellipse(x, yc, cab * 0.86, cab * 1.08, 0, 0, Math.PI * 2);
        c.moveTo(x - h * 0.03, yp); c.lineTo(x - om * 0.75, yo); c.quadraticCurveTo(x - om, yo + h * 0.01, x - om, yo + h * 0.06);
        c.lineTo(x - om * 0.72, yci); c.lineTo(x - h * 0.085, pe); c.lineTo(x + h * 0.085, pe); c.lineTo(x + om * 0.72, yci);
        c.lineTo(x + om, yo + h * 0.06); c.quadraticCurveTo(x + om, yo + h * 0.01, x + om * 0.75, yo); c.lineTo(x + h * 0.03, yp); c.closePath();
        if (v.cabelo === 1) { c.moveTo(x - cab * 0.95, yc - cab * 0.25); c.quadraticCurveTo(x, yc - cab * 1.7, x + cab * 0.95, yc - cab * 0.25); c.lineTo(x + cab * 1.35, yc - cab * 0.15); c.closePath(); }
        if (v.cabelo === 2) { c.moveTo(x - cab * 0.9, yc); c.quadraticCurveTo(x - cab * 1.1, yc - cab * 1.6, x, yc - cab * 1.45); c.quadraticCurveTo(x + cab * 1.1, yc - cab * 1.6, x + cab * 0.9, yc); c.closePath(); }
      }
      function holo(x, pe, alt, fazForma, o = {}) {
        const cr = o.cor || cor('ciano'), a0 = c.globalAlpha;
        const g = c.createLinearGradient(0, pe - alt, 0, pe);
        g.addColorStop(0, Filme.cor(cr, cr, 0, 0.55)); g.addColorStop(1, Filme.cor(cr, cr, 0, 0.08));
        if ((o.recheio ?? 1) > 0) { c.globalAlpha = a0 * (o.recheio ?? 1); fazForma(); c.fillStyle = g; c.fill(); c.globalAlpha = a0; }
        neon(fazForma, o.borda || cr, Math.max(1.6, alt * (o.fio || 0.012)), o.forca ?? 1);
      }
      // Gêngis Khan em holograma: gorro redondo de pele com aba larga e abas nas orelhas, bigode fino e
      // comprido, deel (túnica longa que fecha cruzada no peito) com faixa na cintura e botas.
      // det (0 a 1): quanto dos detalhes aparece; cont (0 a 1): vira só contorno.
      function khan(x, pe, alt, o = {}) {
        const h = alt, det = o.det ?? 1, cont = limita(o.contorno || 0);
        const cab = h * 0.08, yc = pe - h * 0.855;
        const silhueta = () => {
          c.beginPath();
          c.ellipse(x, yc, cab * 0.85, cab * 1.1, 0, 0, Math.PI * 2);
          const yo = pe - h * 0.76, om = h * 0.16;
          c.moveTo(x - h * 0.035, pe - h * 0.79); c.lineTo(x - om * 0.8, yo); c.quadraticCurveTo(x - om * 1.08, yo + h * 0.01, x - om * 1.1, yo + h * 0.08);
          c.lineTo(x - om * 1.2, pe - h * 0.42); c.lineTo(x - om * 1.02, pe - h * 0.41);            // manga larga
          c.lineTo(x - h * 0.2, pe - h * 0.05); c.lineTo(x - h * 0.1, pe - h * 0.05); c.lineTo(x - h * 0.1, pe);   // barra do deel e bota
          c.lineTo(x + h * 0.1, pe); c.lineTo(x + h * 0.1, pe - h * 0.05); c.lineTo(x + h * 0.2, pe - h * 0.05);
          c.lineTo(x + om * 1.02, pe - h * 0.41); c.lineTo(x + om * 1.2, pe - h * 0.42);
          c.lineTo(x + om * 1.1, yo + h * 0.08); c.quadraticCurveTo(x + om * 1.08, yo + h * 0.01, x + om * 0.8, yo); c.lineTo(x + h * 0.035, pe - h * 0.79); c.closePath();
          // gorro: copa redonda com botão no alto, aba de pele larga e as abas das orelhas
          const yb = yc - cab * 0.55;
          c.moveTo(x - cab * 1.05, yb); c.quadraticCurveTo(x - cab * 1.0, yc - cab * 1.75, x, yc - cab * 1.8); c.quadraticCurveTo(x + cab * 1.0, yc - cab * 1.75, x + cab * 1.05, yb); c.closePath();
          c.moveTo(x - cab * 1.25, yb); c.lineTo(x - cab * 1.15, yc + cab * 0.75); c.lineTo(x - cab * 0.75, yc + cab * 0.55); c.lineTo(x - cab * 0.85, yb); c.closePath();
          c.moveTo(x + cab * 1.25, yb); c.lineTo(x + cab * 1.15, yc + cab * 0.75); c.lineTo(x + cab * 0.75, yc + cab * 0.55); c.lineTo(x + cab * 0.85, yb); c.closePath();
        };
        const a0 = c.globalAlpha;
        holo(x, pe, h, silhueta, { cor: o.cor || cor('ciano'), recheio: (1 - cont), fio: 0.009, forca: o.forca ?? 1.3 });
        // detalhes (somem quando vira contorno)
        const d = det * (1 - cont);
        if (d > 0) {
          c.globalAlpha = a0 * d; c.lineCap = 'round'; c.lineJoin = 'round';
          const fio = Math.max(1.5, h * 0.007);
          // aba de pele: faixa larga com a borda de tufos
          const yb = yc - cab * 0.55;
          c.beginPath(); c.moveTo(x - cab * 1.35, yb + cab * 0.1);
          for (let i = 0; i <= 10; i++) { const xx = x - cab * 1.35 + i * cab * 2.7 / 10; c.lineTo(xx, yb - cab * (i % 2 ? 0.62 : 0.38)); }
          c.lineTo(x + cab * 1.35, yb + cab * 0.1); c.closePath(); c.fillStyle = 'rgba(232,251,255,0.35)'; c.fill();
          c.strokeStyle = cor('gelo'); c.lineWidth = fio; c.stroke();
          c.beginPath(); c.arc(x, yc - cab * 1.85, cab * 0.16, 0, 7); c.fillStyle = cor('magenta'); c.fill();   // botão do gorro
          c.strokeStyle = 'rgba(232,251,255,0.6)'; c.lineWidth = fio; c.beginPath(); c.moveTo(x, yc - cab * 1.7); c.lineTo(x, yb - cab * 0.7); c.stroke();
          // olhos, bigode fino e comprido, barbicha
          c.strokeStyle = cor('gelo'); c.lineWidth = fio;
          c.beginPath(); c.moveTo(x - cab * 0.5, yc - cab * 0.1); c.lineTo(x - cab * 0.15, yc - cab * 0.05);
          c.moveTo(x + cab * 0.5, yc - cab * 0.1); c.lineTo(x + cab * 0.15, yc - cab * 0.05); c.stroke();
          c.beginPath(); c.moveTo(x, yc + cab * 0.42); c.quadraticCurveTo(x - cab * 0.6, yc + cab * 0.35, x - cab * 0.7, yc + cab * 1.25);
          c.moveTo(x, yc + cab * 0.42); c.quadraticCurveTo(x + cab * 0.6, yc + cab * 0.35, x + cab * 0.7, yc + cab * 1.25);
          c.moveTo(x, yc + cab * 0.85); c.lineTo(x, yc + cab * 1.3); c.stroke();
          // deel: gola cruzada (da esquerda do pescoço até a axila direita), faixa na cintura, barra
          const yo = pe - h * 0.76;
          c.lineWidth = fio * 1.4;
          c.beginPath(); c.moveTo(x - h * 0.035, pe - h * 0.79); c.lineTo(x + h * 0.11, pe - h * 0.6); c.lineTo(x + h * 0.11, pe - h * 0.47);
          c.moveTo(x - h * 0.035, pe - h * 0.79); c.lineTo(x - h * 0.06, yo + h * 0.05); c.stroke();
          c.beginPath(); c.moveTo(x - h * 0.17, pe - h * 0.05); c.lineTo(x + h * 0.17, pe - h * 0.05); c.stroke();
          c.globalAlpha = a0 * d * 0.7; c.beginPath(); // braços ao lado do corpo (a manga separada da túnica)
          for (const sx of [-1, 1]) { c.moveTo(x + sx * h * 0.135, yo + h * 0.05); c.lineTo(x + sx * h * 0.14, pe - h * 0.42); }
          c.stroke(); c.globalAlpha = a0 * d;
          c.fillStyle = cor('magenta'); c.globalAlpha = a0 * d * 0.85;
          c.beginPath(); c.moveTo(x - h * 0.15, pe - h * 0.5); c.lineTo(x + h * 0.15, pe - h * 0.5); c.lineTo(x + h * 0.155, pe - h * 0.455); c.lineTo(x - h * 0.155, pe - h * 0.455); c.closePath(); c.fill();
          c.globalAlpha = a0;
        }
      }
      // pedestal de luz: elipses que giram e um cone de luz para cima
      function pedestal(x, y, r, forca) {
        const a0 = c.globalAlpha;
        c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, y, 0, y - r * 2.6);
        g.addColorStop(0, rgba('ciano', 0.28 * forca)); g.addColorStop(1, rgba('ciano', 0));
        c.fillStyle = g; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * 0.7, y - r * 2.6); c.lineTo(x + r * 0.7, y - r * 2.6); c.lineTo(x + r, y); c.closePath(); c.fill();
        c.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 3; i++) neon(() => { c.beginPath(); c.ellipse(x, y, r * (1 - i * 0.2), r * 0.24 * (1 - i * 0.2), 0, 0, Math.PI * 2); }, cor(i === 1 ? 'magenta' : 'ciano'), 3, forca);
        c.globalAlpha = a0;
      }
      // medalhão com busto (árvore e fichas)
      function busto(x, y, r) { c.beginPath(); c.arc(x, y - r * 0.28, r * 0.3, 0, Math.PI * 2); c.moveTo(x - r * 0.62, y + r * 0.62); c.quadraticCurveTo(x - r * 0.6, y + r * 0.05, x, y + r * 0.05); c.quadraticCurveTo(x + r * 0.6, y + r * 0.05, x + r * 0.62, y + r * 0.62); c.closePath(); }

      // ---------- fundo de cada cena (pintado uma vez ao montar) ----------
      const M = 140; // margem (a câmera anda e dá zoom)
      const LW = L + 2 * M, AW = A + 2 * M;
      function camadaFundo(fd, semente) {
        const r = sorteio(semente);
        const ch = fd.chao;
        // céu + chão de grade
        const ceu = novaTela(LW * k, AW * k), g = ceu.getContext('2d');
        g.scale(k, k); g.translate(M, M);
        const gr = g.createLinearGradient(0, -M, 0, A + M); gr.addColorStop(0, cor('fundoAlto')); gr.addColorStop(1, cor('fundoBaixo'));
        g.fillStyle = gr; g.fillRect(-M, -M, LW, AW);
        // estrelinhas / poeira distante
        for (let i = 0; i < 160; i++) { const x = -M + r() * LW, y = -M + r() * (ch.horizonte + M); g.fillStyle = `rgba(160,220,255,${0.15 + r() * 0.35})`; g.fillRect(x, y, 2 + r() * 2, 2 + r() * 2); }
        // brilho no horizonte
        const hz = g.createLinearGradient(0, ch.horizonte - 260, 0, ch.horizonte + 120);
        hz.addColorStop(0, 'rgba(41,227,255,0)'); hz.addColorStop(0.7, 'rgba(41,227,255,0.16)'); hz.addColorStop(1, 'rgba(41,227,255,0)');
        g.fillStyle = hz; g.fillRect(-M, ch.horizonte - 260, LW, 380);
        if (fd.montanhas) { // serra de arame no horizonte
          g.strokeStyle = 'rgba(41,227,255,0.35)'; g.lineWidth = 2; g.fillStyle = 'rgba(2,8,26,0.9)';
          const pts = []; for (let x = -M; x <= L + M; x += 70 + r() * 60) pts.push([x, ch.horizonte - 30 - r() * 170]);
          g.beginPath(); g.moveTo(-M, ch.horizonte); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(L + M, ch.horizonte); g.closePath(); g.fill(); g.stroke();
          g.globalAlpha = 0.5; pts.forEach(([x, y], i) => { if (i % 2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, ch.horizonte); g.stroke(); } }); g.globalAlpha = 1;
        }
        // chão escuro com grade em perspectiva
        g.fillStyle = 'rgba(1,4,14,0.75)'; g.fillRect(-M, ch.horizonte, LW, A + M - ch.horizonte);
        const proj = (x, z) => [L / 2 + x * ch.f / z, ch.horizonte + ch.h * ch.f / z];
        g.lineWidth = 1.6;
        for (let z = 1.5; z < 60; z *= 1.12) { const y = proj(0, z)[1]; if (y > A + M) continue; g.strokeStyle = `rgba(41,227,255,${0.5 * Math.min(1, 3 / z)})`; g.beginPath(); g.moveTo(-M, y); g.lineTo(L + M, y); g.stroke(); }
        for (let x = -30; x <= 30; x += 1) {
          const [x0, y0] = proj(x, 60), [x1, y1] = proj(x, 1.2);
          const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(41,227,255,0)'); lg.addColorStop(1, 'rgba(41,227,255,0.4)');
          g.strokeStyle = lg; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        }
        g.strokeStyle = 'rgba(120,240,255,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-M, ch.horizonte); g.lineTo(L + M, ch.horizonte); g.stroke();

        // painéis de dados flutuando dos lados (camada com parallax menor)
        const pn = novaTela(LW * k, AW * k), q = pn.getContext('2d');
        q.scale(k, k); q.translate(M, M);
        for (let i = 0; i < (fd.paineis || 0); i++) {
          const lado = i % 2 ? 1 : -1, w = 150 + r() * 110, h = 100 + r() * 90;
          const x = lado < 0 ? -60 + r() * 180 : L - w + 60 - r() * 180, y = 600 + (i >> 1) * (620 / Math.ceil((fd.paineis || 1) / 2)) + r() * 60;
          q.save(); q.translate(x + w / 2, y + h / 2); q.transform(1, lado * 0.12, 0, 1, 0, 0); q.translate(-w / 2, -h / 2);
          q.fillStyle = 'rgba(10,34,68,0.45)'; q.fillRect(0, 0, w, h);
          q.strokeStyle = i % 3 === 2 ? 'rgba(255,46,186,0.7)' : 'rgba(41,227,255,0.7)'; q.lineWidth = 2; q.strokeRect(0, 0, w, h);
          q.globalAlpha = 0.75; const tipo = i % 3;
          if (tipo === 0) for (let b = 0; b < 7; b++) { const bh = 10 + r() * (h - 40); q.fillStyle = b === 4 ? '#ff2eba' : '#29e3ff'; q.fillRect(12 + b * (w - 24) / 7, h - 12 - bh, (w - 24) / 7 - 6, bh); }
          if (tipo === 1) { q.beginPath(); for (let s = 0; s <= 20; s++) { const xx = 10 + s * (w - 20) / 20, yy = h / 2 + Math.sin(s * 0.7 + r()) * h * 0.3; s ? q.lineTo(xx, yy) : q.moveTo(xx, yy); } q.strokeStyle = '#29e3ff'; q.lineWidth = 2.5; q.stroke(); }
          if (tipo === 2) { q.beginPath(); q.arc(w / 2, h / 2, h * 0.32, 0, 7); q.strokeStyle = '#29e3ff'; q.lineWidth = 3; q.stroke(); q.beginPath(); q.arc(w / 2, h / 2, h * 0.32, -1.5, 1.5 + r() * 2.5); q.strokeStyle = '#ff2eba'; q.lineWidth = 6; q.stroke(); }
          for (let s = 0; s < 3; s++) { q.fillStyle = 'rgba(232,251,255,0.5)'; q.fillRect(10, 10 + s * 9, 30 + r() * (w * 0.4), 3); }
          q.restore();
        }
        // raios de luz volumétrica (cones que caem do alto)
        const ra = novaTela(LW * k, AW * k), u = ra.getContext('2d');
        u.scale(k, k); u.translate(M, M); u.globalCompositeOperation = 'lighter';
        const [cr, cg, cb] = Filme.rgb(cor(fd.raios.cor));
        for (let i = 0; i < 6; i++) {
          const ang = (-28 + i * 11 + r() * 6) * RAD, comp = 1500 + r() * 500, larg = 40 + r() * 90;
          const x0 = fd.raios.x + (r() - 0.5) * 120, y0 = -M;
          const x1 = x0 + Math.sin(ang) * comp, y1 = y0 + Math.cos(ang) * comp;
          const lg = u.createLinearGradient(x0, y0, x1, y1);
          lg.addColorStop(0, `rgba(${cr},${cg},${cb},${0.16 + r() * 0.08})`); lg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          u.fillStyle = lg; u.beginPath(); u.moveTo(x0 - 8, y0); u.lineTo(x0 + 8, y0); u.lineTo(x1 + larg, y1); u.lineTo(x1 - larg, y1); u.closePath(); u.fill();
        }
        const fonte = u.createRadialGradient(fd.raios.x, -M, 0, fd.raios.x, -M, 420);
        fonte.addColorStop(0, `rgba(${cr},${cg},${cb},0.45)`); fonte.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        u.fillStyle = fonte; u.fillRect(-M, -M, LW, 600);
        return { ceu, paineis: pn, raios: ra };
      }
      const CENAS = H.cenas.map((cn, i) => ({ ...cn, i, fd: camadaFundo(cn.fundo, (H.semente || 1) * 100 + i) }));

      // camada de linhas de varredura (em pixels da tela, período ≥ 3 px para não dar moiré a 360)
      const varre = novaTela(largura, altura);
      { const g = varre.getContext('2d'), per = Math.max(3, Math.round(6 * k)); g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < altura; y += per) g.fillRect(0, y, largura, Math.max(1, Math.round(per / 3))); }
      const vinheta = novaTela(largura, altura);
      { const g = vinheta.getContext('2d');
        const gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.4, largura / 2, altura / 2, altura * 0.62);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.8)');
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }
      // brilho geral (bloom): cópia pequena do quadro, desfocada, somada por cima
      const bw = Math.max(1, Math.round(largura / 4)), bh = Math.max(1, Math.round(altura / 4));
      const bloom = novaTela(bw, bh), bctx = bloom.getContext('2d');
      const bloom2 = novaTela(bw, bh), b2 = bloom2.getContext('2d');
      const copia = novaTela(largura, altura), cctx = copia.getContext('2d');

      // ---------- câmera ----------
      const CAM = H.camera || {};
      function tremor(t) {
        let dx = 0, dy = 0; const q = Math.round(t * fps);
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) { const r = sorteio((H.semente || 1) * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros); dx += (r() * 2 - 1) * f; dy += (r() * 2 - 1) * f; }
        }
        return [dx, dy];
      }
      // pan-e-zoom lento em cada cena: zoom de 1,02 a 1,12 e o lado do pan alterna de cena em cena
      function camCena(cn, t) {
        const u = trecho(t, cn.de, cn.ate), s = u * u * (3 - 2 * u);
        return { z: mistura(CAM.zoomDe ?? 1.02, CAM.zoomAte ?? 1.12, s), dx: (cn.i % 2 ? 1 : -1) * mistura(-1, 1, s) * (CAM.pan ?? 30) };
      }
      const poe = (z, dx, dy, f = 1) => { const zz = 1 + (z - 1) * f; c.setTransform(k * zz, 0, 0, k * zz, k * (L / 2 * (1 - zz) + dx * f), k * (A / 2 * (1 - zz) + dy * f)); };

      // ---------- as peças ----------
      const PECAS = {
        rotulo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.35), dy = p.sobe ? (1 - sai(u)) * 40 : 0;
          alfa(limita(u * 2) * some(p, t));
          // entra "ligando": pisca duas vezes nos primeiros quadros
          const q = Math.round((t - p.t) * fps); if (q === 1 || q === 3) alfa(0.35 * some(p, t));
          rotulo(p.texto, p.x, p.y + dy, p.tam, p);
          if (p.risco && t >= p.risco.de) {
            const w = largTexto(p.texto, p.tam, false, 0.39) + p.tam * 1.2, yc = p.y - p.tam * 0.45, pr = sai(trecho(t, p.risco.de, p.risco.ate));
            alfa(1); c.lineCap = 'round';
            neon(() => { c.beginPath(); c.moveTo(p.x - w / 2, yc + p.tam * 0.1); c.lineTo(mistura(p.x - w / 2, p.x + w / 2, pr), yc + p.tam * 0.1 - p.tam * 0.2 * pr); }, cor('magenta'), p.tam * 0.09);
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(trecho(t, p.de, p.de + 0.2) * some(p, t));
          rotulo(milhar(u >= 1 ? p.valor : Math.floor(v)), p.x, p.y, p.tam, { tabular: true });
        },
        multidao(p, t) {
          if (t < p.de) return;
          const S = p.palco, n = p.fileiras.length * p.colunas, r = sorteio((H.semente || 1) + 11);
          const ap = p.apaga ? trecho(t, p.apaga, p.apaga + 0.5) : 0;
          const gente = [];
          p.fileiras.forEach((z, fi) => {
            for (let j = 0; j < p.colunas; j++) {
              const xm = (j - (p.colunas - 1) / 2 + (fi % 2 ? 0.5 : 0) + (r() - 0.5) * 0.3) * p.passo * (1 + (z - 5) * 0.06);
              const zz = z + (r() - 0.5) * 0.6, e = S.f / zz;
              gente.push({ x: L / 2 + xm * e, pe: S.horizonte + S.h * e, alt: p.alt * (0.92 + r() * 0.16) * e,
                v: { ombro: 0.85 + r() * 0.3, cabeca: 0.9 + r() * 0.2, cabelo: Math.floor(r() * 3) }, ordem: fi * p.colunas + j });
            }
          });
          // surgem da frente para o fundo (a ordem de entrada é pela distância)
          const ordemEntra = (g) => { const fi = Math.floor(g.ordem / p.colunas); return (p.fileiras.length - 1 - fi) * p.colunas + (g.ordem % p.colunas); };
          if (p.liga && t >= p.liga.de) {
            c.globalCompositeOperation = 'lighter'; c.lineWidth = 1.8; c.strokeStyle = cor('ciano');
            const somem = p.someLiga ? 1 - trecho(t, p.someLiga, p.someLiga + 0.35) : 1;
            gente.forEach((g, i) => { alfa(0.45 * somem); linha(g.x, g.pe - g.alt * 0.9, p.liga.para[0], p.liga.para[1], sai(trecho(t, p.liga.de + (i % p.colunas) * 0.02, p.liga.ate))); });
            c.globalCompositeOperation = 'source-over';
          }
          for (const g of gente) {
            const t0 = p.de + (p.ate - p.de) * ordemEntra(g) / n, u = trecho(t, t0, t0 + 0.3);
            if (u <= 0) continue;
            alfa(u * (1 - 0.75 * ap));
            const sobe = (1 - sai(u)) * g.alt * 0.3; // sobe do chão ao ligar
            holo(g.x, g.pe + sobe, g.alt, () => corpo(g.x, g.pe + sobe, g.alt, g.v), { cor: Filme.hex(cor('ciano'), cor('cinza'), ap * 0.6), fio: 0.014 });
          }
        },
        heroi(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.45), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.4)) : 0;
          const brilho = 1 - trecho(t, p.t + 0.1, p.t + 0.7) * 0.5;
          alfa(1);
          pedestal(p.x, p.y, p.alt * 0.42 * Math.min(1, s), Math.min(1, s) * (1 - cont * 0.5));
          // clarão do "acende" atrás da figura (pequeno, não chega na legenda)
          if (t < p.t + 0.7) {
            const f = 1 - trecho(t, p.t, p.t + 0.7), gr = c.createRadialGradient(p.x, p.y - p.alt * 0.55, 0, p.x, p.y - p.alt * 0.55, p.alt * 0.7);
            gr.addColorStop(0, rgba('gelo', 0.5 * f)); gr.addColorStop(1, rgba('ciano', 0));
            c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(p.x - p.alt, p.y - p.alt * 1.3, p.alt * 2, p.alt * 1.5); c.globalCompositeOperation = 'source-over';
          }
          emVolta(p.x, p.y, s, () => khan(p.x, p.y, p.alt, { contorno: cont, forca: 1 + brilho * 0.6 }));
          if (p.interroga && t >= p.interroga) {
            const si = pop(t, p.interroga + 0.1, 0.4), yq = p.y - p.alt * 0.3;
            alfa(1);
            emVolta(p.x, yq - p.alt * 0.08, si, () => escreve('?', p.x, yq, p.alt * 0.4, { fino: true, cor: 'magenta', halo: cor('magenta') }));
          }
        },
        painel(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(limita(s));
          emVolta(p.x, p.y, 0.9 + 0.1 * s, () => {
            vidro(x, y, p.l, p.a, 18);
            rotulo(p.titulo, p.x, y + 80, 30, {});
            c.strokeStyle = rgba('ciano', 0.4); c.lineWidth = 2; c.beginPath(); c.moveTo(x + 30, y + 118); c.lineTo(x + p.l - 30, y + 118); c.stroke();
            if (p.linhas) { // linhas de dados do arquivo
              c.lineCap = 'round';
              for (let i = 0; i < p.linhas; i++) {
                const yy = y + 175 + i * 66, w = p.l * (i % 3 === 1 ? 0.42 : 0.66);
                c.strokeStyle = rgba(i === 2 ? 'magenta' : 'ciano', 0.35); c.lineWidth = 12;
                linha(x + 70, yy, x + 70 + w, yy, sai(trecho(t, p.t + 0.1 + i * 0.05, p.t + 0.45 + i * 0.05)));
              }
            }
          });
        },
        helice3d(p, t) { // hélice de DNA grande girando atrás do painel (pontos 3D projetados)
          if (t < p.de) return;
          const u = sai(trecho(t, p.de, p.ate)), n = 46, giro = t * 1.6;
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < n; i++) {
            const q = i / (n - 1); if (q > u) break;
            const y = mistura(p.y0, p.y1, q), f = giro + i * 0.42;
            for (const [lado, nome] of [[0, 'ciano'], [Math.PI, 'magenta']]) {
              const ang = f + lado, x = p.x + Math.sin(ang) * p.raio, prof = (Math.cos(ang) + 1) / 2;
              alfa(0.35 + 0.65 * prof);
              c.beginPath(); c.arc(x, y, 7 + 7 * prof, 0, 7); c.fillStyle = cor(nome); c.fill();
            }
            if (i % 2 === 0) { alfa(0.35); c.strokeStyle = cor('gelo'); c.lineWidth = 2.5; linha(p.x + Math.sin(f) * p.raio, y, p.x - Math.sin(f) * p.raio, y, 1); }
          }
          c.globalCompositeOperation = 'source-over';
        },
        tubos(p, t) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.55, h = p.tam;
          // suporte de cromo
          alfa(trecho(t, p.de, p.de + 0.2));
          const gr = c.createLinearGradient(0, p.y + h * 0.15, 0, p.y + h * 0.15 + 26); gr.addColorStop(0, '#cfe6f5'); gr.addColorStop(0.5, '#3b5570'); gr.addColorStop(1, '#0d1a2b');
          c.fillStyle = gr; retRedondo(x0 - p.dx * 0.6, p.y + h * 0.15, (p.n - 1) * p.dx + p.dx * 1.2, 26, 8); c.fill();
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(trecho(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              const forma = () => { c.beginPath(); c.moveTo(x - w / 2, p.y - h / 2); c.lineTo(x - w / 2, p.y + h / 2 - w / 2); c.arc(x, p.y + h / 2 - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, p.y - h / 2); };
              forma(); c.closePath(); c.fillStyle = 'rgba(160,220,255,0.10)'; c.fill();
              if (cheio > 0) {
                c.save(); forma(); c.closePath(); c.clip();
                const topo = mistura(p.y + h / 2, p.y - h * 0.2, cheio), lg = c.createLinearGradient(0, topo, 0, p.y + h / 2);
                lg.addColorStop(0, cor('gelo')); lg.addColorStop(0.15, cor('magenta')); lg.addColorStop(1, '#7a0b5a');
                c.fillStyle = lg; c.fillRect(x - w, topo, 2 * w, h); c.restore();
              }
              c.lineJoin = 'round';
              neon(forma, cheio > 0 ? cor('magenta') : 'rgba(170,235,255,0.85)', 3, cheio > 0 ? 1.5 : 0.6);
              // reflexo do vidro e tampa de cromo
              c.strokeStyle = 'rgba(232,251,255,0.55)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - w * 0.22, p.y - h * 0.4); c.lineTo(x - w * 0.22, p.y + h * 0.25); c.stroke();
              const tg = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); tg.addColorStop(0, '#4a6680'); tg.addColorStop(0.4, '#eaf6ff'); tg.addColorStop(1, '#2a3d52');
              c.fillStyle = tg; c.fillRect(x - w / 2 - 5, p.y - h / 2 - 14, w + 10, 16);
            });
          }
        },
        fichas(p, t) { // 12 fichas de vidro em pílula, cada uma com um busto; uma acende
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2;
          for (let i = 0; i < n; i++) {
            const x = x0 + (i % p.colunas) * p.dx, y = p.y + Math.floor(i / p.colunas) * p.dy;
            const s = pop(t, p.de + (p.ate - p.de) * i / n, 0.3);
            const ac = p.acende && i === p.acende.i ? trecho(t, p.acende.t, p.acende.t + 0.15) : 0;
            const sa = ac > 0 ? 1 + 0.1 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.35)) : 1;
            alfa(1);
            emVolta(x, y, s * sa, () => {
              const cr = Filme.hex('#7f93ad', cor('ciano'), ac);
              retRedondo(x - p.l / 2, y - p.a / 2, p.l, p.a, p.l / 2);
              c.fillStyle = ac > 0 ? Filme.cor(cor('ciano'), cor('ciano'), 0, 0.12 + 0.3 * ac) : 'rgba(127,147,173,0.12)'; c.fill();
              neon(() => retRedondo(x - p.l / 2, y - p.a / 2, p.l, p.a, p.l / 2), cr, 3, 0.5 + ac);
              busto(x, y + p.a * 0.08, p.l * 0.42);
              c.fillStyle = Filme.cor(cr, cr, 0, 0.35 + 0.5 * ac); c.fill(); c.strokeStyle = cr; c.lineWidth = 2.5; c.stroke();
            });
          }
        },
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          // moldura do mapa: azul-marinho com grade ciano de 30 px
          const ml = p.moldura, mx = p.x - ml.l / 2, my = p.y - ml.a / 2, ent = sai(trecho(t, p.contorno.de, p.contorno.de + 0.3));
          alfa(ent);
          retRedondo(mx, my, ml.l, ml.a, 22); c.fillStyle = Filme.cor(cor('painel'), cor('painel'), 0, 0.92); c.fill();
          c.save(); retRedondo(mx, my, ml.l, ml.a, 22); c.clip();
          c.strokeStyle = 'rgba(41,227,255,0.10)'; c.lineWidth = 1.5; c.beginPath();
          for (let x = mx; x <= mx + ml.l; x += 30) { c.moveTo(x, my); c.lineTo(x, my + ml.a); }
          for (let y = my; y <= my + ml.a; y += 30) { c.moveTo(mx, y); c.lineTo(mx + ml.l, y); }
          c.stroke(); c.restore();
          vidro(mx, my, ml.l, ml.a, 22, { opaco: 0 });
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          alfa(trecho(t, p.contorno.de + 0.3, p.contorno.ate + 0.2));
          c.fillStyle = 'rgba(41,227,255,0.08)';
          for (const r of terras) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
          alfa(1); c.lineJoin = 'round';
          for (const r of terras) neon(() => polilinha(r, pc), cor('ciano'), 2, 0.6);
          const forma = (pts) => { c.beginPath(); pts.map(pj).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
          // a região magenta entra varrendo de leste para oeste
          if (p.regiao && t >= p.regiao.de) {
            const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 10, xa - 10, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
            alfa(1 - 0.5 * im); forma(T.regiao); c.fillStyle = 'rgba(255,46,186,0.55)'; c.fill();
            neon(() => forma(T.regiao), cor('magenta'), 2.5);
            if (p.aneis && t >= p.aneis.t) { // pontos magenta dentro da região
              c.save(); forma(T.regiao); c.clip();
              const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]);
              const pa = p.aneis.passo; let i = 0;
              for (let lat = la + pa / 2; lat < lb; lat += pa * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? pa / 2 : 0); lon < Math.max(...lo); lon += pa) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                if (s <= 0) continue;
                c.beginPath(); c.arc(x, y, 5 * s, 0, 7); c.fillStyle = '#ffd0f0'; c.fill();
              }
              c.restore();
            }
            c.restore();
          }
          // o império ciano cresce de um ponto magenta que pulsa
          if (p.imperio && t >= p.imperio.pulsa) {
            const [px, py] = pj(p.imperio.ponto);
            if (t >= p.imperio.de) {
              const u = sai(trecho(t, p.imperio.de, p.imperio.ate));
              c.save(); c.beginPath(); c.arc(px, py, 20 + u * 700, 0, 7); c.clip();
              alfa(1); forma(T.imperio); c.fillStyle = 'rgba(41,227,255,0.35)'; c.fill();
              neon(() => forma(T.imperio), cor('ciano'), 3);
              c.restore();
            }
            alfa(1); c.fillStyle = cor('magenta'); c.beginPath(); c.arc(px, py, 10 * pop(t, p.imperio.pulsa, 0.3), 0, 7); c.fill();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            alfa(1 - fase); c.strokeStyle = cor('magenta'); c.lineWidth = 3; c.beginPath(); c.arc(px, py, 12 + fase * 40, 0, 7); c.stroke();
          }
          c.restore();
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo, u = passa(trecho(t, t0, t0 + p.dur));
            if (t < t0) return;
            alfa(trecho(t, t0, t0 + 0.15));
            const D = it.cor === 'ciano';
            escreve(it.nome, p.x - 24, y + 15, 39, { cor: 'gelo', alinha: 'direita', halo: D ? cor('ciano') : null });
            const w = Math.max(8, p.larg * it.v / p.maximo * u);
            retRedondo(p.x, y - p.alt / 2, w, p.alt, 6);
            const lg = c.createLinearGradient(0, y - p.alt / 2, 0, y + p.alt / 2);
            lg.addColorStop(0, Filme.cor(cor(it.cor), cor('gelo'), 0.5, D ? 0.9 : 0.55)); lg.addColorStop(1, Filme.cor(cor(it.cor), cor(it.cor), 0, D ? 0.45 : 0.2));
            c.fillStyle = lg; c.fill();
            neon(() => retRedondo(p.x, y - p.alt / 2, w, p.alt, 6), cor(it.cor), 2.5, D ? 1.2 : 0.4);
            alfa(trecho(t, t0 + p.dur * 0.6, t0 + p.dur));
            escreve(it.valor, p.x + w + 22, y + 15, 43, { cor: 'gelo', alinha: 'esquerda', tabular: true });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; alfa(trecho(t, t1, t1 + 0.3)); escreve(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 10, 28, { fino: true, cor: 'gelo' }); }
        },
        carimbo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.22), s = mistura(2.2, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.25)) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD;
          const cr = Filme.hex(cor('magenta'), '#4a3a5a', ap);
          const w = largTexto(p.texto, p.tam, false, 0.39) + p.tam * 0.9, h = p.tam * 1.8;
          alfa(limita(u * 1.6));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          retRedondo(-w / 2, -h / 2, w, h, 10); c.fillStyle = `rgba(40,4,30,${0.5 * (1 - ap)})`; c.fill();
          neon(() => retRedondo(-w / 2, -h / 2, w, h, 10), cr, 5, 1 - ap * 0.8);
          neon(() => retRedondo(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6), cr, 2, 1 - ap * 0.8);
          escreve(p.texto, 0, p.tam / 2, p.tam, { fino: true, corDe: () => cr, halo: ap < 0.5 ? cor('magenta') : null });
          if (p.risco && t >= p.risco.de) {
            c.lineCap = 'round'; const pr = sai(trecho(t, p.risco.de, p.risco.ate));
            neon(() => { c.beginPath(); c.moveTo(-w / 2 - 20, 10); c.lineTo(mistura(-w / 2 - 20, w / 2 + 20, pr), mistura(10, -10, pr)); }, cor('gelo'), 9);
          }
          c.restore();
        },
        tumulos(p, t) { // caixas de pedra em arame, em perspectiva no chão; a borda acende
          if (t < p.t) return;
          const S = p.palco, b = p.borda ? trecho(t, p.borda, p.borda + 0.4) : 1;
          const pj = (x, y, z) => [L / 2 + x * S.f / z, S.horizonte + (S.h - y) * S.f / z];
          p.caixas.forEach((cx, n) => {
            const s = sai(trecho(t, p.t + n * 0.06, p.t + n * 0.06 + 0.35));
            if (s <= 0) return;
            const hw = p.larg / 2, d = p.fundo / 2, ht = p.alt * s;
            const V = (sx, sy, sz) => pj(cx.x + sx * hw, sy * ht, cx.z + sz * d);
            const faces = [ // de trás para a frente: topo, frente, lados
              [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]],
              [[-1, 0, -1], [1, 0, -1], [1, 1, -1], [-1, 1, -1]],
              [[cx.x < 0 ? 1 : -1, 0, -1], [cx.x < 0 ? 1 : -1, 0, 1], [cx.x < 0 ? 1 : -1, 1, 1], [cx.x < 0 ? 1 : -1, 1, -1]],
            ];
            alfa(1);
            faces.forEach((f, fi) => {
              const pts = f.map(([a, bb, cc]) => V(a, bb, cc));
              const forma = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
              forma(); c.fillStyle = ['#0e2a44', '#081a30', '#0b2238'][fi]; c.fill();
              alfa(b); c.lineJoin = 'round'; neon(forma, cor('ciano'), 2.5, 0.9); alfa(1);
            });
            // luz no chão em volta
            alfa(0.5 * b); c.globalCompositeOperation = 'lighter';
            const [gx, gy] = pj(cx.x, 0, cx.z - d * 0.5), gr = c.createRadialGradient(gx, gy, 0, gx, gy, 140);
            gr.addColorStop(0, 'rgba(41,227,255,0.25)'); gr.addColorStop(1, 'rgba(41,227,255,0)');
            c.fillStyle = gr; c.fillRect(gx - 140, gy - 140, 280, 280); c.globalCompositeOperation = 'source-over';
          });
        },
        helice(p, t) {
          if (t < p.de) return;
          const n = 24, u = sai(trecho(t, p.de, p.ate)), giro = t * 2.4;
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5);
            if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 70, frente = Math.cos(f);
            alfa(vis * 0.5); c.strokeStyle = cor('gelo'); c.lineWidth = 2.5; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof, nome] of [[ax, frente, 'ciano'], [-ax, -frente, 'magenta']]) {
              alfa(vis * (0.45 + 0.55 * (prof + 1) / 2));
              c.beginPath(); c.arc(p.x + sx, y, 8 + 5 * (prof + 1) / 2, 0, 7); c.fillStyle = cor(nome); c.fill();
            }
          }
          c.globalCompositeOperation = 'source-over';
          if (p.divide && t >= p.divide) {
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'ciano', m = 12;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                alfa(D ? 1 : 0.6); c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = D ? cor('ciano') : '#55657a'; c.fill();
              }
              { // o Y e o rótulo já aparecem na ponta do ramo desde a divisão (a cena acaba logo depois)
                const s = pop(t, p.divide + 0.15, 0.35);
                alfa(D ? 1 : 0.6);
                emVolta(r.x, r.y - 50, s, () => {
                  c.lineCap = 'round';
                  neon(() => { c.beginPath(); c.moveTo(r.x - 26, r.y - 95); c.lineTo(r.x, r.y - 55); c.lineTo(r.x + 26, r.y - 95); c.moveTo(r.x, r.y - 55); c.lineTo(r.x, r.y - 20); }, D ? cor('ciano') : '#55657a', 12, D ? 1.4 : 0.3);
                });
                alfa(trecho(t, p.divide + 0.05, p.divide + 0.3) * (D ? 1 : 0.55));
                rotulo(r.rotulo, r.x, r.y - 130, 30, { cor: D ? 'ciano' : 'cinzaClaro', semColchete: !D });
              }
            }
          }
        },
        arvore(p, t) { // árvore de holograma: ramos de luz descem da raiz até medalhões com bustos
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, r: 30 }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, r: nv.r }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(trecho(t, t0, t0 + passo * 0.8));
            const pais = nos[l - 1], filhos = nos[l], porPai = filhos.length / pais.length;
            alfa(1); c.lineCap = 'round'; c.lineJoin = 'round';
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = l === 1 ? pai.y + 10 : pai.y + pai.r + 6, yf = f.y - f.r - 6;
              const pts = []; for (let s = 0; s <= 12; s++) { const q = s / 12, e = q * q * (3 - 2 * q); pts.push([mistura(pai.x, f.x, e), mistura(yb, yf, q)]); }
              neon(() => polilinha(pts, pr), cor(l % 2 ? 'ciano' : 'magenta'), 3, 0.8);
            });
            filhos.forEach((f, j) => {
              const s = pop(t, t0 + passo * 0.55 + j * 0.02, 0.3);
              emVolta(f.x, f.y, s, () => {
                c.beginPath(); c.arc(f.x, f.y, f.r, 0, 7); c.fillStyle = 'rgba(10,34,68,0.7)'; c.fill();
                neon(() => { c.beginPath(); c.arc(f.x, f.y, f.r, 0, 7); }, cor('ciano'), 2.5, 0.8);
                busto(f.x, f.y + f.r * 0.1, f.r * 0.8); c.fillStyle = 'rgba(41,227,255,0.5)'; c.fill();
              });
            });
          }
        },
      };

      // ---------- legendas: 2 a 4 palavras, branco com borda preta, a palavra falada em ciano ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 76, palavras = lg.texto.split(/\s+/);
        const linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && largTexto(tenta, tam, false, 0.24) > (LG.largura || 980)) { linhas.push(atual); atual = [p]; } else atual.push(p); }
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
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yb - (n - 1 - li) * passoL, base = idx;
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('ciano') : cor('branco')), contorno: 8, sombra: 3 });
          idx += ln.length;
        });
      }

      // ---------- moldura de câmera: cantos, REC com o tempo, linha que varre ----------
      const HUD = H.hud || {};
      function hud(t) {
        c.globalAlpha = 1; c.lineCap = 'butt';
        if (HUD.cantos) {
          const m = 46, b = 70;
          for (const [x, y, sx, sy] of [[m, m, 1, 1], [L - m, m, -1, 1], [m, A - m, 1, -1], [L - m, A - m, -1, -1]])
            neon(() => { c.beginPath(); c.moveTo(x, y + b * sy); c.lineTo(x, y); c.lineTo(x + b * sx, y); }, cor('ciano'), 4, 0.7);
        }
        if (HUD.rec) {
          const q = Math.round(t * fps), ss = Math.floor(q / fps), ff = q % fps, dd = (v) => String(v).padStart(2, '0');
          if (Math.floor(t * 2) % 2 === 0) { c.beginPath(); c.arc(92, 116, 9, 0, 7); c.fillStyle = cor('magenta'); c.fill(); }
          c.globalAlpha = 0.85;
          escreve(`REC ${dd(Math.floor(ss / 60))}:${dd(ss % 60)}:${dd(ff)}`, 114, 128, 26, { fino: true, alinha: 'esquerda', cor: 'gelo' });
          c.globalAlpha = 1;
        }
        if (HUD.varredura) { // faixa clara que desce pela tela
          const u = (t / HUD.varredura) % 1, y = -150 + u * (A + 300);
          const g = c.createLinearGradient(0, y - 90, 0, y + 6); g.addColorStop(0, 'rgba(41,227,255,0)'); g.addColorStop(1, 'rgba(41,227,255,0.10)');
          c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, y - 90, L, 96);
          c.fillStyle = 'rgba(160,240,255,0.25)'; c.fillRect(0, y + 4, L, 2); c.globalCompositeOperation = 'source-over';
        }
      }

      // ---------- falha de sinal (troca de cena): 8 passos, faixas que escorregam de lado e cor girada ----------
      function glitch(t) {
        const q = Math.round(t * fps);
        for (const g0 of H.glitches || []) {
          const passo = q - Math.round(g0 * fps) + ((H.glitchesNaBatida || []).includes(g0) ? 0 : 4);
          if (passo < 0 || passo >= 8) continue;
          const r = sorteio((H.semente || 1) * 7919 + q), forca = 1 - Math.abs(passo - 3.5) / 5;
          cctx.setTransform(1, 0, 0, 1, 0, 0); cctx.clearRect(0, 0, largura, altura); cctx.drawImage(tela, 0, 0);
          c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
          let y = 0;
          while (y < altura) {
            const h = Math.max(2, Math.round((10 + r() * 120) * k)), dx = r() < 0.55 ? Math.round((r() * 2 - 1) * 70 * k * forca) : 0;
            if (dx) { c.fillStyle = '#01030b'; c.fillRect(0, y, largura, h); c.drawImage(copia, 0, y, largura, h, dx, y, largura, h); }
            y += h;
          }
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45 * forca;
          c.filter = `hue-rotate(${Math.round(60 + r() * 200)}deg)`;
          c.drawImage(copia, Math.round((passo % 2 ? 14 : -14) * k), 0);
          c.filter = 'none'; c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
          if (passo % 2) { c.fillStyle = 'rgba(41,227,255,0.07)'; c.fillRect(0, 0, largura, altura); }
          return;
        }
      }

      // ---------- poeira de luz (pontinhos que sobem devagar) ----------
      const POEIRA = (() => { const r = sorteio((H.semente || 1) + 3); return Array.from({ length: 50 }, () => ({ x: r() * L, y: r() * A, v: 8 + r() * 25, s: 1.5 + r() * 3, f: r() * 6 })); })();

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        const cn = [...CENAS].reverse().find((x) => t >= x.de) || CENAS[0];
        const cam = camCena(cn, t), [tx, ty] = tremor(t);
        const dz = CAM.deriva ?? 6, ox = dz * ruido(t * 0.2, 3) + tx, oy = dz * ruido(t * 0.17, 5) + ty;
        // fundo: céu e chão (parallax 1), painéis (0,6), raios (0,3, balançando)
        c.fillStyle = cor('fundoAlto'); c.fillRect(0, 0, tela.width, tela.height);
        poe(cam.z, cam.dx + tx, ty, 1); c.drawImage(cn.fd.ceu, -M, -M, LW, AW);
        c.globalAlpha = 0.7; poe(cam.z, cam.dx + tx + 12 * ruido(t * 0.3, 9), ty + 8 * ruido(t * 0.25, 4), 0.6); c.drawImage(cn.fd.paineis, -M, -M, LW, AW); c.globalAlpha = 1;
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.75 + 0.25 * ruido(t * 0.8, 7);
        poe(cam.z, cam.dx * 0.3 + tx + 20 * ruido(t * 0.15, 2), ty, 0.3); c.drawImage(cn.fd.raios, -M, -M, LW, AW);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        const esc = cn.fundo.escurece || 0;
        if (esc) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(1,3,11,${esc})`; c.fillRect(0, 0, tela.width, tela.height); }
        // poeira de luz
        poe(cam.z, cam.dx + tx, ty, 0.8); c.globalCompositeOperation = 'lighter';
        for (const d of POEIRA) { const y = ((d.y - t * d.v) % A + A) % A; c.globalAlpha = 0.25 + 0.25 * Math.sin(t * 1.3 + d.f); c.fillStyle = cor('ciano'); c.fillRect(d.x, y, d.s, d.s); }
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        // peças: as do "mundo" andam com a câmera; painéis e rótulos só derivam e tremem
        GA = 1;
        for (const p of cn.pecas) {
          c.save();
          if (p.camada === 'mundo') poe(cam.z, cam.dx + tx, ty, 1); else c.setTransform(k, 0, 0, k, k * ox, k * oy);
          PECAS[p.tipo](p, t);
          c.restore();
        }
        // brilho geral
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'copy'; bctx.filter = 'none'; bctx.drawImage(tela, 0, 0, bw, bh);
        b2.setTransform(1, 0, 0, 1, 0, 0); b2.globalCompositeOperation = 'copy'; b2.filter = `blur(${Math.max(1, 6 * k * 4 / 4)}px)`; b2.drawImage(bloom, 0, 0); b2.filter = 'none';
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55; c.drawImage(bloom2, 0, 0, largura, altura);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        // linhas de varredura e vinheta; moldura de câmera (treme junto)
        c.drawImage(varre, 0, 0); c.drawImage(vinheta, 0, 0);
        c.setTransform(k, 0, 0, k, k * tx, k * ty); hud(t);
        glitch(t);
        legenda(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: as mesmas marcas de tempo da imagem ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [];
        const calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // nota da música que nunca atravessa o corte: encurta para acabar (com o fim do som) antes dele
        const notaM = (n, tt, dur, o) => {
          if (calado(tt)) return;
          const solta = o.solta ?? 0.3, prox = corta.reduce((m, [a]) => (a > tt && a < m ? a : m), Infinity);
          if (tt + dur + solta > prox) { const sobra = prox - tt - 0.01; if (sobra < 0.03) return; const so = Math.min(solta, sobra * 0.4); dur = sobra - so; o = { ...o, solta: so }; }
          s.nota(n, tt, dur, o);
        };
        // arpejo escuro de sintetizador a 116 bpm, um pad baixo e o baixo a cada compasso
        const sem = 60 / (MU.bpm || 116) / 2, compasso = sem * 8, vol = MU.vol ?? 0.05;
        for (let i = 0, tt = 0.1; tt < duracao - 0.4; i++, tt += sem) {
          const ac = MU.acordes[Math.floor((tt - 0.1) / compasso) % MU.acordes.length];
          const n = ac[MU.padrao[i % MU.padrao.length]], v = vol * (i % 4 === 0 ? 1.15 : 0.85);
          notaM(n, tt, sem * 0.55, { vol: v, forma: 'quad', ataque: 0.005, solta: 0.1, pan: (i % 2 ? 0.3 : -0.3) });
          notaM(n, tt + 0.006, sem * 0.55, { vol: v * 0.6, forma: 'serra', ataque: 0.005, solta: 0.1, pan: (i % 2 ? -0.3 : 0.3), vibrato: 0.004, vibratoHz: 0.7 });
        }
        for (let b = 0, t0 = 0.1; t0 < duracao - 0.5; b++, t0 += compasso) {
          const ac = MU.acordes[b % MU.acordes.length];
          // compasso que começa dentro do corte volta no fim do corte, com o que sobra dele
          const ct = corta.find(([a, bb]) => t0 >= a - 0.02 && t0 < bb), tt = ct ? ct[1] : t0, resto = compasso - (tt - t0);
          if (resto < 0.4) continue;
          notaM(ac[0], tt, resto - 0.2, { vol: MU.baixo ?? 0.11, forma: 'seno', ataque: 0.02, solta: 0.2 });
          notaM(ac[0], tt, resto - 0.2, { vol: (MU.baixo ?? 0.11) * 0.3, forma: 'serra', ataque: 0.02, solta: 0.2 });
          for (const nn of ac.slice(1)) notaM(nn, tt, resto - 0.3, { vol: MU.pad ?? 0.03, forma: 'tri', ataque: 0.4, solta: 0.3, vibrato: 0.003, vibratoHz: 0.4 });
          if (!calado(tt)) s.batida(tt, { vol: 0.22, freq: 58, dur: 0.3 });
        }
        // bipes digitais quando as peças entram
        const blip = (tt, f = 1500, v = 0.035) => s.pio(tt, { freq: f, vol: v, repete: 1, dur: 0.035, sobe: 0.4 });
        for (const cn of H.cenas) for (const p of cn.pecas) {
          if (p.t !== undefined && p.tipo !== 'carimbo' && p.tipo !== 'heroi') blip(p.t + 0.03, 1700 + r() * 500);
          if (p.tipo === 'multidao' || p.tipo === 'fichas' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.09) blip(tt, 1900 + r() * 900, 0.02);
          if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 5000, onda: 1, entra: 0.3, sai: 0.3 });
          if (p.tipo === 'barras') p.itens.forEach((_, i) => blip(p.t + i * 0.12, 900 + i * 120, 0.04));
          if (p.tipo === 'mapa') { s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 4000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) blip(tt, 800, 0.05); }
          if (p.tipo === 'helice' || p.tipo === 'helice3d') for (let tt = p.de; tt < p.ate; tt += 0.07) blip(tt, 2300 + r() * 600, 0.014);
          if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.06, { vol: 0.06, corte: 900, dur: 0.08 });
        }
        // chiado de falha de sinal em cada troca
        for (const g of H.glitches || []) if (g !== SO.arranhao) s.vento(g - 0.12, 0.25, { vol: 0.07, corte: 6000, onda: 30, profundidade: 0.9, entra: 0.01, sai: 0.08 });
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.05) s.toque(tt, { vol: 0.05, corte: 7000, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.5, freq: 55, dur: 0.45 }); s.toque(tt, { vol: 0.08, corte: 1200, dur: 0.1 }); }
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.4 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.13, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.04 }); }
        if (SO.arranhao !== undefined) {
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.45, freq: 70, dur: 0.3 });
        }
        if (SO.grave !== undefined) { ['A1', 'E2', 'A2'].forEach((n) => s.nota(n, SO.grave, 0.35, { vol: 0.13, forma: 'serra', ataque: 0.005, solta: 0.5 })); s.batida(SO.grave, { vol: 0.42, freq: 50, dur: 0.5 }); }
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.18);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
