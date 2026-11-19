// MOTOR "vetor-ciencia" — explicativo de ciência em vetor plano: cada cena é uma "ilustração" feita de
// formas geométricas de cantos redondos, sem contorno, cada objeto com cor base, um brilho plano e uma
// sombra longa e macia; céu em degradê noturno e paleta viva. Câmera de paralaxe (camadas de longe
// andam menos), zoom lento de 1,02 a 1,12 com o lado do pan trocando a cada cena, troca em círculo
// que abre do centro. Painéis, números, mapa e rótulos ficam por cima, na mesma paleta.
// Jeito de animar: camadas-planas (desenho 2D em canvas), com letras em traços (letras.js).
// Este arquivo sabe DESENHAR. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio, ruido } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180, B = 420; // B = sangria: fundo desenhado bem além do quadro

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const principal = tela.getContext('2d');
      let c = principal;               // o pincel atual (troca para a tela pequena do fundo borrado)
      const k = largura / L;
      let K = k;                       // escala atual (k, ou menor na tela borrada)
      const P = H.paleta;
      const cor = (n) => (typeof n === 'string' && P[n] !== undefined ? P[n] : n);
      const lista = (n) => P[n];
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.6; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d)))); // nunca negativo
      const alfa = (a) => { c.globalAlpha = limita(a); };
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      // brilho macio: shadowBlur é em pixels da TELA, multiplica pela escala atual
      const brilho = (raio, cr) => { c.shadowColor = cor(cr || 'destaque'); c.shadowBlur = raio * escalaAtual(); c.shadowOffsetX = 0; c.shadowOffsetY = 0; };
      const sombraMacia = (raio, dy, a = 0.55) => { const e = escalaAtual(); c.shadowColor = `rgba(4,2,20,${a})`; c.shadowBlur = raio * e; c.shadowOffsetX = 0; c.shadowOffsetY = dy * e; };
      const semBrilho = () => { c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- letras grossas e redondas (traço largo de ponta redonda sobre letras.js) ----------
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
      function caminho(g, x, y, tam) {
        c.beginPath();
        for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (borda preta), sombra (px, legenda), macia (sombra escura macia), brilho, tabular }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.165;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
        if (o.sombra) { c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = lw + (o.contorno || 0) * 2; for (const l of letras) { caminho(l.g, l.x + o.sombra, y + o.sombra, tam); c.stroke(); } }
        if (o.contorno) { c.strokeStyle = '#000'; c.lineWidth = lw + o.contorno * 2; for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); } }
        if (o.macia) { // sombra escura e macia por baixo (rótulos)
          sombraMacia(tam * 0.22, tam * 0.07, 0.7); c.strokeStyle = 'rgba(10,6,40,0.9)'; c.lineWidth = lw;
          for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); }
          semBrilho();
        }
        for (const l of letras) {
          const cr = corDe(l.palavra);
          if (o.brilho && cr === cor('destaque')) brilho(o.brilho, cr);
          c.strokeStyle = cr; c.lineWidth = lw; caminho(l.g, l.x, y, tam); c.stroke(); semBrilho();
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
          if (p.tipo === 'helice') textos.push(p.esq.rotulo, p.dir.rotulo);
          if (p.interroga) textos.push('?');
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- formas ----------
      function retRedondo(x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
      }
      function poli(pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
      function circulo(x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, 7); }
      const pontosCirculo = (x, y, r, n = 18) => Array.from({ length: n }, (_, i) => [x + r * Math.cos(i / n * 2 * Math.PI), y + r * Math.sin(i / n * 2 * Math.PI)]);
      const pontosRet = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      function casca(pts) { // fecho convexo (cadeia monótona)
        const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], hi = [];
        for (const q of p) { while (lo.length >= 2 && x(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
        for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && x(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
        return lo.slice(0, -1).concat(hi.slice(0, -1));
      }
      // sombra longa: a forma "arrastada" na diagonal (45° para baixo e direita), que some ao longe
      const ANG = (H.sombra && H.sombra.angulo || 45) * RAD;
      function sombraLonga(pts, comp, a = 0.4) {
        if (comp <= 0 || a <= 0) return;
        const dx = Math.cos(ANG) * comp, dy = Math.sin(ANG) * comp;
        const h = casca(pts.concat(pts.map(([x, y]) => [x + dx, y + dy])));
        let cx = 0, cy = 0; pts.forEach(([x, y]) => { cx += x; cy += y; }); cx /= pts.length; cy /= pts.length;
        const g = c.createLinearGradient(cx, cy, cx + dx, cy + dy);
        g.addColorStop(0, `rgba(4,2,24,${a})`); g.addColorStop(1, 'rgba(4,2,24,0)');
        poli(h); c.fillStyle = g; c.fill();
      }
      // brilho plano: a metade de cima/esquerda de uma forma, mais clara (recortada pela própria forma)
      function luzPlana(forma, x0, y0, x1, y1, cr, a = 0.22) {
        c.save(); forma(); c.clip(); poli([[x0, y0], [x1, y0], [x0, y1]]); c.fillStyle = cr || '#fff'; const g0 = c.globalAlpha; c.globalAlpha = g0 * a; c.fill(); c.globalAlpha = g0; c.restore();
      }
      function brilhoRedondo(x, y, r, cr, a = 0.5, sy = 1) {
        const [rr, gg, bb] = Filme.rgb(cor(cr));
        c.save(); c.translate(x, y); c.scale(1, sy);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`); g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
        c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore();
      }
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      function linha(x0, y0, x1, y1, prog) { if (prog <= 0) return; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mistura(x0, x1, prog), mistura(y0, y1, prog)); c.stroke(); }
      function polilinha(pts, prog) {
        if (prog <= 0 || pts.length < 2) return;
        const seg = []; let tot = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
        let falta = tot * limita(prog);
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length && falta > 0; i++) { const u = Math.min(1, falta / seg[i - 1]); falta -= seg[i - 1]; c.lineTo(mistura(pts[i - 1][0], pts[i][0], u), mistura(pts[i - 1][1], pts[i][1], u)); }
        c.stroke();
      }
      const some = (p, t) => (p.some ? 1 - trecho(t, p.some, p.some + 0.3) : 1);
      const escolhe = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

      // ---------- bonecos: cabeça redonda, olhos de ponto, corpo de cápsula, sem contorno ----------
      // (x, y) = centro; tam = altura. o = { pele, roupa, cabelo, chao (sombra no chão), apaga (0..1), luz }
      function boneco(x, y, tam, o = {}) {
        const r = tam * 0.17, topo = y - tam / 2, hy = topo + r, cy = topo + 2 * r + tam * 0.03, cb = y + tam / 2;
        const w = tam * 0.44, ap = o.apaga || 0;
        const tinge = (cr) => (ap > 0 ? Filme.hex(cor(cr), cor('apagado'), ap) : cor(cr));
        const pele = tinge(o.pele || '#f2c39b'), roupa = tinge(o.roupa || 'ciano');
        if (o.chao) { // sombra que deita no chão
          const cs = o.chao;
          c.beginPath(); c.moveTo(x - w * 0.45, cb); c.lineTo(x + w * 0.45, cb); c.lineTo(x + w * 0.45 + cs, cb + cs * 0.32); c.lineTo(x - w * 0.45 + cs * 0.7, cb + cs * 0.32); c.closePath();
          c.fillStyle = 'rgba(4,2,24,0.32)'; c.fill();
        }
        const corpo = () => retRedondo(x - w / 2, cy, w, cb - cy, w * 0.42);
        corpo(); c.fillStyle = roupa; c.fill();
        luzPlana(corpo, x - w, cy - 10, x + w * 0.1, cb + tam * 0.3, '#fff', 0.18);
        circulo(x, hy, r); c.fillStyle = pele; c.fill();
        if (o.cabelo) { c.beginPath(); c.arc(x, hy, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fillStyle = tinge(o.cabelo); c.fill(); }
        luzPlana(() => circulo(x, hy, r), x - r, hy - r, x + r * 0.6, hy + r * 0.8, '#fff', 0.16);
        c.fillStyle = tinge('#160f33');
        circulo(x - r * 0.36, hy + r * 0.12, r * 0.12); c.fill(); circulo(x + r * 0.36, hy + r * 0.12, r * 0.12); c.fill();
      }
      // Gêngis Khan: deel (roupão de abotoar de lado, faixa na cintura) e gorro de pele com copa e ponta
      // o = { contorno (0..1: o recheio some, fica a borda), brilho }
      function khan(x, y, tam, o = {}) {
        const K2 = H.khan || {};
        const r = tam * 0.15, topo = y - tam / 2 + tam * 0.14, hy = topo + r, cy = topo + 2 * r + tam * 0.01, cb = y + tam / 2;
        const w = tam * 0.5, cont = limita(o.contorno || 0), a0 = c.globalAlpha;
        const corpo = () => { c.beginPath(); c.moveTo(x - w * 0.36, cy); c.lineTo(x + w * 0.36, cy); c.quadraticCurveTo(x + w * 0.55, cy + 6, x + w * 0.58, cy + tam * 0.18); c.lineTo(x + w * 0.62, cb - 8); c.quadraticCurveTo(x + w * 0.62, cb, x + w * 0.5, cb); c.lineTo(x - w * 0.5, cb); c.quadraticCurveTo(x - w * 0.62, cb, x - w * 0.62, cb - 8); c.lineTo(x - w * 0.58, cy + tam * 0.18); c.quadraticCurveTo(x - w * 0.55, cy + 6, x - w * 0.36, cy); c.closePath(); };
        const copa = () => { c.beginPath(); c.moveTo(x - r * 1.0, hy - r * 0.6); c.bezierCurveTo(x - r * 1.05, hy - r * 1.75, x - r * 0.45, hy - r * 1.95, x, hy - r * 1.95); c.bezierCurveTo(x + r * 0.45, hy - r * 1.95, x + r * 1.05, hy - r * 1.75, x + r * 1.0, hy - r * 0.6); c.closePath(); }; // copa em domo (gorro mongol de pele, não cone)
        const abas = [() => retRedondo(x - r * 1.25, hy - r * 1.0, r * 2.5, r * 0.66, r * 0.33), () => retRedondo(x - r * 1.25, hy - r * 0.6, r * 0.5, r * 1.25, r * 0.25), () => retRedondo(x + r * 0.75, hy - r * 0.6, r * 0.5, r * 1.25, r * 0.25)]; // aba de pele e abas nas orelhas (cada retRedondo abre o próprio caminho)
        const partes = [corpo, () => circulo(x, hy, r), copa]; // cada forma começa o próprio caminho: risca uma por uma
        if (cont < 1) {
          c.globalAlpha = a0 * (1 - cont);
          if (o.brilho) brilho(o.brilho * (1 - cont));
          corpo(); c.fillStyle = cor(K2.deel || '#2f5fd0'); c.fill(); semBrilho();
          luzPlana(corpo, x - w, cy - 10, x + w * 0.15, cb + tam * 0.4, '#fff', 0.16);
          // gola cruzada do deel (abotoa do lado direito) e a faixa
          c.fillStyle = cor(K2.debrum || 'destaque');
          c.beginPath(); c.moveTo(x - w * 0.3, cy); c.lineTo(x - w * 0.16, cy); c.lineTo(x + w * 0.42, cy + tam * 0.24); c.lineTo(x + w * 0.42, cy + tam * 0.29); c.closePath(); c.fill();
          retRedondo(x - w * 0.6, cy + tam * 0.29, w * 1.2, tam * 0.07, 4); c.fillStyle = cor(K2.faixa || '#ff8a3d'); c.fill();
          retRedondo(x - w * 0.2, cb - tam * 0.1, w * 0.16, tam * 0.1, 4); c.fillStyle = '#160f33'; c.fill(); // botas
          retRedondo(x + w * 0.04, cb - tam * 0.1, w * 0.16, tam * 0.1, 4); c.fill();
          circulo(x, hy, r); c.fillStyle = cor(K2.pele || '#e0a878'); c.fill();
          luzPlana(() => circulo(x, hy, r), x - r, hy - r, x + r * 0.6, hy + r * 0.8, '#fff', 0.15);
          copa(); c.fillStyle = cor(K2.gorro || '#c8323c'); c.fill();
          luzPlana(copa, x - r, hy - r * 2.4, x + r * 0.3, hy, '#fff', 0.18);
          circulo(x, hy - r * 1.98, r * 0.14); c.fillStyle = cor(K2.debrum || 'destaque'); c.fill();
          for (const f of abas) { f(); c.fillStyle = cor(K2.pelo || '#8a5a3a'); c.fill(); luzPlana(f, x - r * 1.3, hy - r, x + r * 0.4, hy, '#fff', 0.2); }
          c.fillStyle = '#160f33';
          circulo(x - r * 0.36, hy + r * 0.05, r * 0.12); c.fill(); circulo(x + r * 0.36, hy + r * 0.05, r * 0.12); c.fill();
          c.strokeStyle = '#2a1a14'; c.lineWidth = Math.max(1, r * 0.08); c.lineCap = 'round'; // bigode fino caído
          c.beginPath(); c.moveTo(x - r * 0.08, hy + r * 0.45); c.quadraticCurveTo(x - r * 0.45, hy + r * 0.45, x - r * 0.5, hy + r * 0.85);
          c.moveTo(x + r * 0.08, hy + r * 0.45); c.quadraticCurveTo(x + r * 0.45, hy + r * 0.45, x + r * 0.5, hy + r * 0.85); c.stroke();
          c.globalAlpha = a0;
        }
        if (cont > 0) {
          c.globalAlpha = a0 * cont; brilho(14); c.strokeStyle = cor('destaque'); c.lineWidth = Math.max(2, tam * 0.045); c.lineJoin = 'round';
          for (const f of partes) { f(); c.fillStyle = 'rgba(10,6,40,0.55)'; c.fill(); c.stroke(); }
          semBrilho(); c.globalAlpha = a0;
        }
      }

      // ---------- fundos ilustrados, em camadas de paralaxe ----------
      // cam(f, dx, dy): põe o pincel na camada que anda f vezes o movimento da câmera (0 = parada, 1 = mundo)
      const R0 = sorteio((H.semente || 1) * 31 + 3);
      const ESTRELAS = Array.from({ length: 90 }, () => ({ x: -B + R0() * (L + 2 * B), y: -B + R0() * (B + 820), r: 1.2 + R0() * 2.6, f: R0() * 6.28, v: 0.8 + R0() * 2 }));
      const POEIRA = Array.from({ length: 26 }, () => ({ x: R0() * L, y: 820 + R0() * 800, r: 40 + R0() * 120 }));
      function ceu(stops, y1) { const g = c.createLinearGradient(0, -B, 0, y1); stops.forEach(([o, cr]) => g.addColorStop(o, cor(cr))); c.fillStyle = g; c.fillRect(-B, -B, L + 2 * B, A + 2 * B); }
      function estrelas(t, ymax, a = 1) {
        c.fillStyle = cor('branco');
        for (const s of ESTRELAS) { if (s.y > ymax) continue; alfa(a * (0.35 + 0.35 * Math.sin(t * s.v + s.f))); circulo(s.x, s.y, s.r); c.fill(); }
        alfa(1);
      }
      function chao(y0, c0, c1) { const g = c.createLinearGradient(0, y0, 0, A + 200); g.addColorStop(0, cor(c0)); g.addColorStop(1, cor(c1)); c.fillStyle = g; c.fillRect(-B, y0, L + 2 * B, A + B - y0 + 200); }
      function montes(base, picos, c0, c1) { // triângulos de topo um pouco redondo, com a face da esquerda mais clara
        for (const [x, h, w] of picos) {
          c.beginPath(); c.moveTo(x - w, base + 4); c.lineTo(x - w * 0.08, base - h + h * 0.04); c.quadraticCurveTo(x, base - h - h * 0.02, x + w * 0.08, base - h + h * 0.04); c.lineTo(x + w, base + 4); c.closePath();
          c.fillStyle = cor(c0); c.fill();
          c.beginPath(); c.moveTo(x - w, base + 4); c.lineTo(x - w * 0.08, base - h + h * 0.04); c.lineTo(x - w * 0.15, base + 4); c.closePath(); c.fillStyle = cor(c1); c.fill();
        }
      }
      function moita(x, y, r, cr) { const pts = pontosCirculo(x, y - r * 0.4, r); sombraLonga(pts, r * 2.2, 0.35); c.beginPath(); c.ellipse(x, y - r * 0.4, r * 1.2, r * 0.8, 0, 0, 7); c.fillStyle = cor(cr); c.fill(); luzPlana(() => { c.beginPath(); c.ellipse(x, y - r * 0.4, r * 1.2, r * 0.8, 0, 0, 7); }, x - r * 1.3, y - r * 1.3, x + r * 0.4, y + r * 0.2, '#fff', 0.18); }
      function capim(t, lado, cr) { // tufos da frente, que balançam
        const s = Math.sin(t * 1.6) * 8;
        c.fillStyle = cor(cr);
        for (let i = 0; i < 7; i++) {
          const x = lado < 0 ? -60 + i * 38 : L + 60 - i * 38, h = 150 + ((i * 53) % 90), base = A + 30;
          c.beginPath(); c.moveTo(x - 22, base); c.quadraticCurveTo(x + s * 0.5, base - h * 0.6, x + s + lado * -6, base - h); c.quadraticCurveTo(x + 4, base - h * 0.5, x + 22, base); c.closePath(); c.fill();
        }
      }
      function cavaleiro(x, y, s, cr) { // cavaleiro de formas simples, de frente para a câmera (para o fundo da estepe)
        c.fillStyle = cor('#3a1f2a');
        c.beginPath(); c.ellipse(x, y - 40 * s, 30 * s, 26 * s, 0, 0, 7); c.fill();                      // corpo do cavalo
        retRedondo(x - 22 * s, y - 30 * s, 9 * s, 34 * s, 4 * s); c.fill(); retRedondo(x + 13 * s, y - 30 * s, 9 * s, 34 * s, 4 * s); c.fill();
        retRedondo(x - 9 * s, y - 72 * s, 18 * s, 34 * s, 8 * s); c.fill();                             // cabeça do cavalo
        retRedondo(x - 17 * s, y - 108 * s, 34 * s, 46 * s, 14 * s); c.fillStyle = cor(cr); c.fill();    // cavaleiro
        circulo(x, y - 118 * s, 13 * s); c.fillStyle = '#e0a878'; c.fill();
        c.beginPath(); c.moveTo(x - 14 * s, y - 120 * s); c.quadraticCurveTo(x, y - 150 * s, x + 14 * s, y - 120 * s); c.closePath(); c.fillStyle = '#c8323c'; c.fill();
        retRedondo(x - 16 * s, y - 126 * s, 32 * s, 8 * s, 3 * s); c.fillStyle = '#8a5a3a'; c.fill();
      }
      const FUNDOS = {
        // planície noturna com o horizonte aceso (gancho e estatística)
        planicie(F, t, tl, cam) {
          cam(0.3, -tl * 10); ceu([[0, 'ceu0'], [0.6, 'ceu1'], [1, 'horizonte']], 680); estrelas(t, 520);
          brilhoRedondo(540, 680, 900, 'horizonteLuz', 0.45, 0.28);
          cam(0.55); montes(690, [[80, 150, 260], [330, 230, 300], [640, 170, 260], [930, 250, 320], [1220, 160, 260]], 'monte', 'monteLuz');
          cam(1);
          chao(670, 'chao0', 'chao1');
          c.fillStyle = cor('chaoLuz'); for (let i = 0; i < 5; i++) { const y = 760 + i * i * 34; c.globalAlpha = 0.08; c.fillRect(-B, y, L + 2 * B, 6 + i * 3); } alfa(1);
          moita(-30, 820, 60, 'moita'); moita(1110, 860, 70, 'moita');
          cam(1.3, Math.sin(t * 0.9) * 6); capim(t, -1, 'perto'); capim(t + 1, 1, 'perto');
        },
        // laboratório escuro: estantes com frascos acesos, luminária pendurada, bancada embaixo
        laboratorio(F, t, tl, cam) {
          cam(0.3, -tl * 8); ceu([[0, 'parede0'], [1, 'parede1']], A);
          for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) { // estantes
            const x0 = sx < 0 ? -120 : L - 160, y0 = 360 + j * 230;
            retRedondo(x0, y0, 280, 18, 6); c.fillStyle = cor('estante'); c.fill();
            for (let q = 0; q < 4; q++) { const fx = x0 + 30 + q * 62, h = 60 + ((q * 37 + j * 23) % 50), cr = escolhe(lista('vivas'), q + j * 2 + (sx > 0 ? 3 : 0));
              brilhoRedondo(fx + 14, y0 - h / 2, 60, cr, 0.25);
              retRedondo(fx, y0 - h, 28, h, 10); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill();
              retRedondo(fx, y0 - h * 0.55, 28, h * 0.55, 10); c.fillStyle = cor(cr); c.fill(); }
          }
          cam(0.6);
          c.fillStyle = cor('estante'); c.fillRect(536, -B, 8, B + 120);
          c.beginPath(); c.moveTo(470, 210); c.quadraticCurveTo(540, 90, 610, 210); c.closePath(); c.fill();
          brilhoRedondo(540, 215, 380, 'luzLampada', 0.5, 0.8);
          cam(1);
          c.fillStyle = cor('bancada'); retRedondo(-B, 1260, L + 2 * B, 60, 10); c.fill();
          c.fillStyle = cor('bancadaFrente'); c.fillRect(-B, 1310, L + 2 * B, A);
          brilhoRedondo(540, 1270, 600, 'ciano', 0.25, 0.25);
          // microscópio (esquerda) e estante de tubos (direita)
          const mx = 120, my = 1262;
          sombraLonga(pontosRet(mx - 50, my - 230, 110, 230), 120, 0.4);
          c.fillStyle = cor('lilas'); retRedondo(mx - 60, my - 26, 130, 26, 8); c.fill();
          retRedondo(mx + 20, my - 210, 30, 190, 12); c.fill();
          c.save(); c.translate(mx - 10, my - 190); c.rotate(-0.5); retRedondo(-18, -70, 36, 120, 14); c.fillStyle = cor('branco'); c.fill(); c.restore();
          for (let q = 0; q < 5; q++) { const fx = 820 + q * 40; retRedondo(fx, 1150, 26, 112, 12); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fill(); retRedondo(fx, 1205, 26, 57, 12); c.fillStyle = cor(escolhe(lista('vivas'), q + 1)); c.fill(); }
          c.fillStyle = cor('estante'); retRedondo(800, 1215, 230, 22, 6); c.fill();
          cam(1.3, Math.sin(t * 0.8) * 5);
          brilhoRedondo(-40, A - 120, 260, 'rosa', 0.35);
        },
        // estepe ao entardecer com a coluna de cavaleiros (vai borrada e escura atrás do mapa)
        estepe(F, t, tl, cam) {
          cam(0.3, -tl * 12); ceu([[0, 'ceu0'], [0.5, 'tarde1'], [1, 'tarde2']], 900);
          brilhoRedondo(700, 880, 260, 'destaque', 0.8);
          cam(0.55); montes(900, [[100, 200, 280], [420, 300, 340], [800, 230, 300], [1150, 280, 320]], 'monte', 'monteLuz');
          cam(1); chao(890, 'areia0', 'areia1');
          for (const p of POEIRA) { alfa(0.18); circulo(p.x, p.y, p.r); c.fillStyle = cor('poeira'); c.fill(); } alfa(1);
          for (let i = 9; i >= 0; i--) { const u = i / 9, s = mistura(1.9, 0.35, u); cavaleiro(mistura(560, 640, u) + (i % 2 ? -70 : 60) * s, mistura(1750, 960, Math.pow(u, 0.7)), s, escolhe(lista('vivas'), i)); }
        },
        // escrivaninha de detetive: quarto escuro, janela com lua, luminária, mesa de madeira
        escrivaninha(F, t, tl, cam) {
          cam(0.3, -tl * 8); ceu([[0, 'parede0'], [1, 'parede1']], A);
          retRedondo(700, 140, 300, 360, 30); c.fillStyle = cor('ceu1'); c.fill();
          brilhoRedondo(880, 250, 200, 'branco', 0.3); circulo(880, 250, 52); c.fillStyle = cor('lua'); c.fill();
          c.fillStyle = cor('parede1'); c.fillRect(845, 140, 12, 360); c.fillRect(700, 315, 300, 12);
          cam(0.6);
          c.fillStyle = cor('estante'); c.save(); c.translate(120, -40); c.rotate(0.45); retRedondo(-10, 0, 20, 330, 10); c.fill(); c.restore();
          c.beginPath(); c.moveTo(150, 250); c.lineTo(400, 250); c.lineTo(330, 120); c.lineTo(220, 120); c.closePath(); c.fillStyle = cor('lampada'); c.fill();
          luzPlana(() => { c.beginPath(); c.moveTo(150, 250); c.lineTo(400, 250); c.lineTo(330, 120); c.lineTo(220, 120); c.closePath(); }, 140, 110, 330, 260, '#fff', 0.2);
          c.beginPath(); c.moveTo(150, 250); c.lineTo(400, 250); c.lineTo(900, 1500); c.lineTo(-300, 1500); c.closePath();
          const g = c.createLinearGradient(0, 250, 0, 1400); g.addColorStop(0, 'rgba(255,214,120,0.32)'); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.fill();
          cam(1);
          chao(1180, 'madeira0', 'madeira1');
          brilhoRedondo(380, 1300, 700, 'luzLampada', 0.35, 0.4);
          c.save(); c.translate(560, 1420); c.rotate(-0.08); // mapa velho na mesa
          sombraLonga(pontosRet(-330, -110, 660, 260), 60, 0.35);
          retRedondo(-330, -110, 660, 260, 10); c.fillStyle = cor('papel'); c.fill();
          c.fillStyle = cor('papelTinta'); c.beginPath(); c.ellipse(-120, 0, 150, 60, 0.2, 0, 7); c.fill(); c.beginPath(); c.ellipse(140, 30, 120, 70, -0.3, 0, 7); c.fill(); c.restore();
          // xícara e lupa
          sombraLonga(pontosRet(860, 1230, 120, 110), 90, 0.4);
          c.beginPath(); c.ellipse(920, 1340, 110, 26, 0, 0, 7); c.fillStyle = cor('branco'); c.fill();
          retRedondo(860, 1230, 120, 110, 26); c.fill(); c.beginPath(); c.ellipse(920, 1232, 60, 14, 0, 0, 7); c.fillStyle = cor('cha'); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 6; c.lineCap = 'round';
          for (let q = 0; q < 2; q++) { const ox = 900 + q * 30, f = t * 2 + q; c.beginPath(); c.moveTo(ox, 1200); c.quadraticCurveTo(ox + 18 * Math.sin(f), 1150, ox, 1100); c.stroke(); }
          c.save(); c.translate(150, 1330); c.rotate(-0.6); c.fillStyle = cor('estante'); retRedondo(-14, 60, 28, 150, 12); c.fill();
          c.beginPath(); c.arc(0, 0, 80, 0, 7); c.lineWidth = 20; c.strokeStyle = cor('lampada'); c.stroke(); c.fillStyle = 'rgba(160,220,255,0.18)'; c.fill(); c.restore();
        },
        // escavação ao anoitecer: monte funerário, sol baixo, chão revirado, ferramentas na frente
        escavacao(F, t, tl, cam) {
          cam(0.3, -tl * 10); ceu([[0, 'ceu0'], [0.45, 'tarde0'], [0.8, 'tarde1'], [1, 'tarde2']], 820); estrelas(t, 300, 0.7);
          brilhoRedondo(820, 800, 300, 'destaque', 0.7); c.save(); c.beginPath(); c.rect(-B, -B, L + 2 * B, 820 + B); c.clip(); circulo(820, 815, 70); c.fillStyle = cor('sol'); c.fill(); c.restore();
          cam(0.55); montes(820, [[60, 160, 240], [350, 120, 220], [1000, 180, 260]], 'monte', 'monteLuz');
          cam(0.8);
          const mnt = () => { c.beginPath(); c.moveTo(150, 860); c.quadraticCurveTo(300, 560, 540, 545); c.quadraticCurveTo(780, 560, 930, 860); c.closePath(); };
          sombraLonga([[150, 860], [540, 545], [930, 860]], 160, 0.35);
          mnt(); c.fillStyle = cor('monteTerra'); c.fill(); luzPlana(mnt, 100, 520, 600, 520, '#fff', 0.14);
          c.fillStyle = 'rgba(0,0,0,0.12)'; for (let q = 0; q < 3; q++) { c.fillRect(180 + q * 40, 700 + q * 50, 720 - q * 80, 10); }
          cam(1); chao(820, 'terra0', 'terra1');
          for (let q = 0; q < 6; q++) { circulo(80 + q * 190, 980 + (q % 2) * 80, 30 + (q % 3) * 12); c.fillStyle = cor('pedra'); c.fill(); }
          cam(1.3, Math.sin(t * 0.8) * 5);
          // pá fincada (direita) e pincel (esquerda)
          c.save(); c.translate(1000, 1400); c.rotate(0.25); sombraLonga(pontosRet(-10, -380, 20, 380), 140, 0.35);
          c.fillStyle = cor('madeira0'); retRedondo(-10, -380, 20, 380, 8); c.fill(); c.fillStyle = cor('lilas'); retRedondo(-50, -10, 100, 120, 30); c.fill(); c.restore();
          c.save(); c.translate(70, 1460); c.rotate(-0.5); c.fillStyle = cor('faixa'); retRedondo(-12, -200, 24, 200, 10); c.fill(); c.fillStyle = cor('papel'); retRedondo(-22, -260, 44, 70, 14); c.fill(); c.restore();
        },
        // noite com a árvore enorme ao fundo (pergunta final)
        arvore(F, t, tl, cam) {
          cam(0.3, -tl * 10); ceu([[0, 'ceu0'], [1, 'ceu1']], A); estrelas(t, 1100);
          cam(0.6);
          const copa = [[540, 520, 330], [260, 620, 230], [820, 620, 230], [400, 380, 220], [690, 370, 230], [540, 260, 200]];
          sombraLonga([[210, 300], [870, 300], [870, 850], [210, 850]], 180, 0.3);
          c.fillStyle = cor('tronco'); c.beginPath(); c.moveTo(470, 1700); c.lineTo(500, 700); c.lineTo(580, 700); c.lineTo(610, 1700); c.closePath(); c.fill();
          for (const [x, y, r] of copa) { circulo(x, y, r); c.fillStyle = cor('copa0'); c.fill(); }
          for (const [x, y, r] of copa) luzPlana(() => circulo(x, y, r), x - r, y - r, x + r * 0.5, y + r * 0.2, '#fff', 0.1);
          for (let q = 0; q < 16; q++) { const x = 170 + (q * 137) % 740, y = 330 + (q * 97) % 500; c.fillStyle = cor(escolhe(lista('vivas'), q)); alfa(0.55); circulo(x, y, 14); c.fill(); } alfa(1);
          cam(1); chao(1500, 'chao0', 'chao1');
        },
      };

      // ---------- câmera por cena: zoom lento (1,02 a 1,12), pan que troca de lado a cada cena ----------
      const CAMX = H.camera || {};
      function camCena(i, t) {
        const cn = H.cenas[i], z = cn.fundo.zoom || CAMX.zoom || [1.02, 1.12];
        const u = (t - cn.de) / Math.max(0.5, cn.ate - cn.de);
        const lado = cn.lado ?? (i % 2 ? -1 : 1);
        return { z: mistura(z[0], z[1], u), px: lado * (CAMX.pan ?? 34) * (u - 0.5) * 2 };
      }
      function tremor(t) {
        const q = Math.round(t * fps); let x = 0, y = 0;
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) { const r = sorteio((H.semente || 1) * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros); x += (r() * 2 - 1) * f; y += (r() * 2 - 1) * f; }
        }
        return { x, y };
      }
      let TR = { x: 0, y: 0 };
      const tela0 = () => c.setTransform(K, 0, 0, K, K * TR.x, K * TR.y); // tela parada (só treme)

      // ---------- as peças ----------
      const PECAS = {
        texto(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.25), s = p.sobe ? 1 : pop(t, p.t), dy = p.sobe ? (1 - sai(u)) * 40 : 0;
          alfa((p.sobe ? u : 1) * some(p, t));
          const yc = p.y - p.tam * 0.45;
          emVolta(p.x, yc, s, () => escreve(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, brilho: p.brilho, tabular: p.tabular, alinha: p.alinha, macia: true }));
          if (p.risco && t >= p.risco.de) { // barra de destaque que atravessa
            const w = largTexto(p.texto, p.tam) + p.tam * 0.5, pr = sai(trecho(t, p.risco.de, p.risco.ate));
            alfa(some(p, t)); c.strokeStyle = cor(p.risco.cor || 'rosa'); c.lineWidth = p.tam * 0.16; c.lineCap = 'round'; brilho(12, p.risco.cor || 'rosa');
            linha(p.x - w / 2, yc + p.tam * 0.06, p.x + w / 2, yc - p.tam * 0.06, pr); semBrilho();
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(trecho(t, p.de, p.de + 0.2) * some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v));
          emVolta(p.x, p.y - p.tam / 2, 1 + 0.07 * (u >= 1 ? 1 - trecho(t, p.ate, p.ate + 0.3) : 0), () =>
            escreve(txt, p.x, p.y, p.tam, { cor: u >= 1 ? p.corFim || p.cor : p.cor, brilho: p.brilho, tabular: true, macia: true }));
        },
        multidao(p, t) {
          if (t < p.de) return;
          const R = sorteio((H.semente || 1) + 911), gente = [];
          for (let lin = 0; lin < p.linhas; lin++) {
            const s = 1 + (lin - (p.linhas - 1)) * (p.perspectiva || 0), y = p.y + lin * p.dy, dx = p.dx * s;
            for (let col = 0; col < p.colunas; col++) gente.push({ x: p.x + (col - (p.colunas - 1) / 2) * dx + (lin % 2 ? dx * 0.25 : -dx * 0.25), y, s, i: gente.length, pele: escolhe(lista('pele'), Math.floor(R() * 99)), roupa: escolhe(lista('vivas'), Math.floor(R() * 99)), cabelo: R() < 0.6 ? escolhe(lista('cabelo'), Math.floor(R() * 99)) : null });
          }
          const n = gente.length, ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.5)) : 0;
          for (const g of gente) { // quem entra primeiro: de trás para a frente, misturado
            const t0 = p.de + (p.ate - p.de) * ((g.i * 37) % n) / n, sc = pop(t, t0, 0.3), tam = p.tam * g.s;
            alfa(1);
            emVolta(g.x, g.y + tam / 2, sc, () => boneco(g.x, g.y, tam, { pele: g.pele, roupa: g.roupa, cabelo: g.cabelo, chao: tam * 0.55, apaga: ap }));
          }
          if (p.liga && t >= p.liga.de) { // linhas finas de cada um até o ponto
            c.strokeStyle = cor('destaque'); c.lineCap = 'round'; brilho(8);
            for (const g of gente) {
              const tam = p.tam * g.s, atraso = (g.y - p.y) / (p.dy * p.linhas) * 0.25;
              alfa(0.55 * (1 - trecho(t, p.liga.some || 99, (p.liga.some || 99) + 0.4))); c.lineWidth = 2.2;
              linha(g.x, g.y - tam * 0.3, p.liga.para[0], p.liga.para[1], sai(trecho(t, p.liga.de + atraso, p.liga.ate)));
            }
            semBrilho();
          }
        },
        heroi(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.45), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.4)) : 0;
          alfa(1);
          brilhoRedondo(p.x, p.y, p.tam * 1.1 * Math.max(0.01, s), 'destaque', 0.45 * (1 - cont * 0.7));
          if (p.chao) { alfa(limita(s)); c.beginPath(); c.ellipse(p.x + p.tam * 0.25, p.y + p.tam / 2, p.tam * 0.45, p.tam * 0.07, 0, 0, 7); c.fillStyle = 'rgba(4,2,24,0.35)'; c.fill(); alfa(1); }
          emVolta(p.x, p.y + p.tam / 2, s, () => khan(p.x, p.y, p.tam, { brilho: p.brilho || 30, contorno: cont }));
          if (p.interroga && t >= p.interroga) {
            const si = pop(t, p.interroga + 0.1, 0.4), yq = p.y + p.tam * 0.33;
            emVolta(p.x, yq - p.tam * 0.2, si, () => escreve('?', p.x, yq, p.tam * 0.4, { cor: 'destaque', brilho: 16 }));
          }
        },
        painel(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(limita(s * 1.5) * some(p, t));
          emVolta(p.x, p.y, 0.85 + 0.15 * s, () => {
            sombraLonga(pontosRet(x, y, p.l, p.a), 160, 0.45);
            retRedondo(x, y, p.l, p.a, 40); c.fillStyle = cor('painel'); c.fill();
            luzPlana(() => retRedondo(x, y, p.l, p.a, 40), x, y, x + p.l * 0.7, y + p.a * 0.5, '#fff', 0.05);
            c.strokeStyle = cor('borda'); c.lineWidth = 3; brilho(10, 'borda'); retRedondo(x, y, p.l, p.a, 40); c.stroke(); semBrilho();
            if (p.aba) { retRedondo(x + 50, y - 46, largTexto(p.titulo, 30) + 60, 70, 18); c.fillStyle = cor(p.aba); c.fill(); escreve(p.titulo, x + 80, y + 2, 30, { cor: 'painel', alinha: 'esquerda' }); }
            else if (p.titulo) escreve(p.titulo, p.x, y + 70, 32, { cor: 'cinzaClaro' });
            if (p.linhas) {
              c.strokeStyle = cor('linhaPainel'); c.lineWidth = 14; c.lineCap = 'round';
              for (let i = 0; i < p.linhas; i++) { const yy = y + 110 + i * 70, w = p.l * (i % 3 === 1 ? 0.42 : 0.66); linha(x + 70, yy, x + 70 + w, yy, sai(trecho(t, p.t + 0.1 + i * 0.05, p.t + 0.45 + i * 0.05))); }
            }
          });
        },
        tubos(p, t) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.6, h = p.tam;
          alfa(1); c.fillStyle = cor('estante'); retRedondo(x0 - p.dx * 0.6, p.y + h * 0.3, (p.n - 1) * p.dx + p.dx * 1.2, 20, 8); c.globalAlpha = limita(trecho(t, p.de, p.de + 0.2)); c.fill();
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(trecho(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              const forma = () => retRedondo(x - w / 2, p.y - h / 2, w, h, w / 2);
              sombraLonga(pontosRet(x - w / 2, p.y - h / 2, w, h), 50, 0.3);
              forma(); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fill();
              const nivel = mistura(0.3, 0.88, cheio), cr = cheio > 0 ? cor('destaque') : cor('liquido');
              c.save(); forma(); c.clip(); if (cheio > 0) brilho(24 * cheio);
              c.fillStyle = cr; c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h); semBrilho(); c.restore();
              luzPlana(forma, x - w / 2, p.y - h / 2, x + w * 0.1, p.y + h, '#fff', 0.25);
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
            const sa = ac > 0 ? 1 + 0.12 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.35)) : 1;
            const tw = p.dx * 0.82, th = p.tam * 1.25;
            alfa(1);
            emVolta(x, y, s * sa, () => {
              sombraLonga(pontosRet(x - tw / 2, y - th / 2, tw, th), 60, 0.35);
              if (ac > 0) brilho(34 * ac);
              retRedondo(x - tw / 2, y - th / 2, tw, th, tw / 2); c.fillStyle = Filme.hex(cor('painel'), cor('destaque'), ac); c.fill(); semBrilho();
              boneco(x, y + p.tam * 0.05, p.tam, { pele: escolhe(lista('pele'), i * 3), roupa: ac > 0 ? Filme.hex(cor('lilas'), '#ffffff', ac) : 'lilas', cabelo: i % 3 ? escolhe(lista('cabelo'), i) : null });
            });
          }
        },
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          // o painel do mapa
          const pa = pop(t, p.contorno.de, 0.4), q = p.painel;
          alfa(limita(pa * 1.5));
          emVolta(p.x, p.y, 0.9 + 0.1 * pa, () => {
            sombraLonga(pontosRet(q[0], q[1], q[2], q[3]), 160, 0.45);
            retRedondo(q[0], q[1], q[2], q[3], 40); c.fillStyle = cor('mapaFundo'); c.fill();
            c.strokeStyle = cor('borda'); c.lineWidth = 3; brilho(10, 'borda'); c.stroke(); semBrilho();
          });
          c.save(); retRedondo(q[0], q[1], q[2], q[3], 40); c.clip();
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          alfa(trecho(t, p.contorno.de + 0.3, p.contorno.ate + 0.2)); c.fillStyle = cor('terra');
          for (const r of terras) { poli(r); c.fill(); }
          alfa(1); c.strokeStyle = cor('borda'); c.lineWidth = 2.5; c.lineJoin = 'round';
          for (const r of terras) polilinha(r, pc);
          const forma = (pts) => poli(pts.map(pj));
          if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste
            const xs = T.regiao.map((g) => pj(g)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 10, xa - 10, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
            alfa(0.9 * (1 - 0.7 * im)); forma(T.regiao); c.fillStyle = cor('destaque'); c.fill();
            if (p.aneis && t >= p.aneis.t) { // pontinhos que estalam na região
              c.save(); forma(T.regiao); c.clip();
              const ys = T.regiao.map((g) => g[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((g) => g[0]), lmax = Math.max(...lo), lmin = Math.min(...lo);
              const ps = p.aneis.passo; let i = 0;
              for (let lat = la + ps / 2; lat < lb; lat += ps * 0.85) for (let lon = lmin + ((i++ % 2) ? ps / 2 : 0); lon < lmax; lon += ps) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (lmax - lon) * 0.004, 0.3);
                if (s <= 0) continue; alfa(1 - 0.7 * im); circulo(x, y, 6 * s); c.fillStyle = cor('pontoMapa'); c.fill();
              }
              c.restore();
            }
            c.restore();
          }
          if (p.imperio && t >= p.imperio.pulsa) { // o império transborda de um ponto que pulsa
            const [px, py] = pj(p.imperio.ponto);
            if (t >= p.imperio.de) {
              const u = sai(trecho(t, p.imperio.de, p.imperio.ate));
              c.save(); circulo(px, py, 20 + u * 700); c.clip();
              alfa(0.7); forma(T.imperio); c.fillStyle = cor('rosa'); c.fill();
              alfa(1); c.strokeStyle = cor('rosa'); c.lineWidth = 3; c.stroke(); c.restore();
            }
            alfa(1); brilho(18); c.fillStyle = cor('destaque'); circulo(px, py, 11 * pop(t, p.imperio.pulsa, 0.3)); c.fill(); semBrilho();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            alfa(1 - fase); c.strokeStyle = cor('destaque'); c.lineWidth = 3; circulo(px, py, 11 + fase * 42); c.stroke();
          }
          c.restore();
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo, u = passa(trecho(t, t0, t0 + p.dur));
            if (t < t0) return;
            alfa(trecho(t, t0, t0 + 0.15));
            const D = it.cor === 'destaque';
            escreve(it.nome, p.x - 24, y + 16, 34, { cor: D ? 'destaque' : 'branco', alinha: 'direita', macia: true });
            const w = Math.max(8, p.larg * it.v / p.maximo * u);
            sombraLonga(pontosRet(p.x, y - p.alt / 2, w, p.alt), 30, 0.35);
            if (D) brilho(20);
            retRedondo(p.x, y - p.alt / 2, w, p.alt, p.alt / 2); c.fillStyle = cor(it.cor); c.fill(); semBrilho();
            alfa(trecho(t, t0 + p.dur * 0.6, t0 + p.dur));
            escreve(it.valor, p.x + w + 22, y + 15, 32, { cor: D ? 'destaque' : 'cinzaClaro', alinha: 'esquerda', tabular: true, macia: true });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; alfa(trecho(t, t1, t1 + 0.3)); escreve(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 10, 30, { cor: 'cinzaClaro', macia: true }); }
        },
        carimbo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.22), s = mistura(2.2, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.25)) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD;
          const cr = Filme.hex(cor(p.cor || 'rosa'), cor('apagado'), ap);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.7;
          alfa(limita(u * 1.6));
          c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          sombraLonga(pontosRet(-w / 2, -h / 2, w, h), 70, 0.35 * (1 - ap));
          retRedondo(-w / 2, -h / 2, w, h, 22); c.fillStyle = cr; c.fill();
          luzPlana(() => retRedondo(-w / 2, -h / 2, w, h, 22), -w / 2, -h / 2, w * 0.2, h, '#fff', 0.15);
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => '#ffffff' });
          if (p.risco && t >= p.risco.de) { c.strokeStyle = cor(p.risco.cor || 'destaque'); c.lineWidth = 22; c.lineCap = 'round'; brilho(16); linha(-w / 2 - 30, 10, w / 2 + 30, -10, sai(trecho(t, p.risco.de, p.risco.ate))); semBrilho(); }
        },
        tumulos(p, t) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? trecho(t, p.borda, p.borda + 0.4) : 1;
          const pos = [[0, -1], [-1, 0], [1, 0], [0, 1]]; // 2x2 covas em losango (as de trás primeiro)
          pos.forEach(([i, j], n) => {
            const x = p.x + i * s * 1.05, y = p.y + j * s * 0.52, sc = pop(t, p.t + n * 0.06, 0.35);
            alfa(1);
            emVolta(x, y, sc, () => {
              const borda = [[x, y - s * 0.5], [x + s, y], [x, y + s * 0.5], [x - s, y]];
              const cova = [[x, y - s * 0.3], [x + s * 0.68, y], [x, y + s * 0.3], [x - s * 0.68, y]];
              poli(borda); c.fillStyle = cor('pedra'); c.fill();
              luzPlana(() => poli(borda), x - s, y - s * 0.5, x + s * 0.3, y + s * 0.3, '#fff', 0.15);
              poli(cova); c.fillStyle = cor('cova'); c.fill();
              alfa(b); brilho(18); c.strokeStyle = cor('destaque'); c.lineWidth = 5; c.lineJoin = 'round'; poli(borda); c.stroke(); semBrilho(); alfa(1);
            });
          });
        },
        helice(p, t) {
          if (t < p.de) return;
          const n = 22, u = sai(trecho(t, p.de, p.ate)), giro = t * 2.4;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5); if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 72, fr = Math.cos(f);
            alfa(vis); c.strokeStyle = cor(escolhe(lista('vivas'), i)); c.lineWidth = 7; c.lineCap = 'round'; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof, cr] of [[ax, fr, 'ciano'], [-ax, -fr, 'rosa']]) {
              alfa(vis * (0.6 + 0.4 * (prof + 1) / 2)); brilho(14, cr); circulo(p.x + sx, y, 10 + 4 * (prof + 1) / 2); c.fillStyle = cor(cr); c.fill(); semBrilho();
            }
          }
          if (p.divide && t >= p.divide) { // divide em dois ramos: um apagado, outro em destaque
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'destaque', m = 12;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                alfa(1); if (D) brilho(16); circulo(x, y, 10); c.fillStyle = cor(r.cor); c.fill(); semBrilho();
              }
              const tr = p.divide + (p.rotulo ?? 0.15); // o rótulo entra no começo da divisão (não no fim)
              if (t >= tr) {
                const s = pop(t, tr, 0.35);
                emVolta(r.x, r.y - 128, s, () => escreve(r.rotulo, r.x, r.y - 110, 42, { cor: r.cor, brilho: D ? 14 : 0, macia: true }));
              }
              if (v >= 1) {
                const s = pop(t, p.divide + p.durDivide, 0.35);
                emVolta(r.x, r.y - 50, s, () => { // o "Y" na ponta
                  c.strokeStyle = cor(r.cor); c.lineWidth = 16; c.lineCap = 'round'; if (D) brilho(18);
                  c.beginPath(); c.moveTo(r.x - 24, r.y - 82); c.lineTo(r.x, r.y - 48); c.lineTo(r.x + 24, r.y - 82); c.moveTo(r.x, r.y - 48); c.lineTo(r.x, r.y - 16); c.stroke(); semBrilho();
                });
              }
            }
          }
        },
        arvore(p, t) {
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, tam: p.raizTam }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, tam: nv.tam }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          let id = 0;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(trecho(t, t0, t0 + passo * 0.8));
            const pais = nos[l - 1], filhos = nos[l], porPai = filhos.length / pais.length;
            alfa(1); c.strokeStyle = cor('lilas'); c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = pai.y + pai.tam / 2 + 8, ym = (yb + f.y - f.tam / 2) / 2;
              polilinha([[pai.x, yb], [pai.x, ym], [f.x, ym], [f.x, f.y - f.tam / 2 - 6]], pr);
            });
            filhos.forEach((f, j) => { // medalhão redondo com um boneco dentro
              const s = pop(t, t0 + passo * 0.55 + j * 0.02, 0.3), r = f.tam / 2, i = id++;
              emVolta(f.x, f.y, s, () => {
                sombraLonga(pontosCirculo(f.x, f.y, r), r * 1.2, 0.4);
                circulo(f.x, f.y, r); c.fillStyle = cor('painel'); c.fill();
                c.save(); circulo(f.x, f.y, r - 4); c.clip();
                boneco(f.x, f.y + r * 0.45, f.tam * 1.1, { pele: escolhe(lista('pele'), i * 2 + l), roupa: escolhe(lista('vivas'), i + l), cabelo: i % 2 ? escolhe(lista('cabelo'), i) : null });
                c.restore();
                c.strokeStyle = cor('lilas'); c.lineWidth = 5; circulo(f.x, f.y, r); c.stroke();
              });
            });
          }
        },
      };
      const MUNDO = new Set(['multidao', 'heroi', 'tumulos', 'helice']); // peças que andam com a câmera

      // ---------- uma cena inteira (fundo + peças) ----------
      const BOR = H.borrao || 6;
      const telaBorrada = novaTela(largura / BOR, altura / BOR);
      function cena(i, t) {
        const cn = H.cenas[i], F = cn.fundo, cm = camCena(i, t), tl = t - cn.de;
        const cam = (f, ex = 0, ey = 0) => { const zf = 1 + (cm.z - 1) * f; c.setTransform(K * zf, 0, 0, K * zf, K * (L / 2 * (1 - zf) + cm.px * f + ex + TR.x), K * (A / 2 * (1 - zf) + ey + TR.y)); };
        if (F.borra) { // fundo borrado: desenha pequeno e amplia (borrão que não depende do tamanho da tela)
          const c0 = c, K0 = K, TR0 = TR;
          c = telaBorrada.getContext('2d'); c.reset(); K = k / BOR; TR = { x: 0, y: 0 };
          FUNDOS[F.tipo](F, t, tl, cam);
          c = c0; K = K0; TR = TR0;
          c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
          c.drawImage(telaBorrada, K * TR.x - largura * 0.02, K * TR.y - altura * 0.02, largura * 1.04, altura * 1.04);
        } else FUNDOS[F.tipo](F, t, tl, cam);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        if (F.escurece) { c.fillStyle = `rgba(6,4,26,${F.escurece})`; c.fillRect(0, 0, largura, altura); }
        for (const p of cn.pecas) {
          c.save();
          if ((p.camada || (MUNDO.has(p.tipo) ? 'mundo' : 'tela')) === 'mundo') cam(1); else tela0();
          c.globalAlpha = 1; PECAS[p.tipo](p, t); c.restore();
        }
        c.globalAlpha = 1; semBrilho();
      }

      // ---------- legendas: 2 a 4 palavras, branco com borda preta, a palavra falada no destaque ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 64, palavras = lg.texto.split(/\s+/);
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
        const tam = lg.tam, passoL = tam * 1.5, n = lg.linhas.length, yb = LG.y || 1590;
        const s = 0.92 + 0.08 * passa(trecho(t, lg.de, lg.de + 0.2));
        tela0(); c.globalAlpha = 1;
        emVolta(L / 2, yb - tam / 2, s, () => {
          let idx = 0;
          lg.linhas.forEach((ln, li) => {
            const y = yb - (n - 1 - li) * passoL, base = idx;
            escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : cor('branco')), contorno: 8, sombra: 3 });
            idx += ln.length;
          });
        });
      }

      // ---------- vinheta ----------
      const vinheta = novaTela(largura, altura);
      { const g = vinheta.getContext('2d');
        const gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.42, largura / 2, altura / 2, altura * 0.62);
        gr.addColorStop(0, 'rgba(4,2,20,0)'); gr.addColorStop(1, 'rgba(4,2,20,0.6)');
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }

      // ---------- um quadro: a cena que sai fica inteira por baixo, a nova abre num círculo do centro ----------
      const CENAS = H.cenas;
      function desenhar(t) {
        c = principal; K = k; c.reset();
        c.fillStyle = cor('ceu0'); c.fillRect(0, 0, tela.width, tela.height);
        TR = tremor(t);
        let i = 0; CENAS.forEach((cn, j) => { if (t >= cn.de) i = j; });
        const cn = CENAS[i], troca = cn.troca ?? 0.4, u = (t - cn.de) / troca;
        if (i > 0 && !cn.corte && u < 1) {
          cena(i - 1, t);
          const raio = Math.hypot(L / 2, A / 2) * 1.02 * sai(u), cx = L / 2, cy = A / 2;
          c.save(); c.setTransform(K, 0, 0, K, K * TR.x, K * TR.y); circulo(cx, cy, raio); c.clip();
          c.setTransform(1, 0, 0, 1, 0, 0); cena(i, t); c.restore();
          c.save(); c.setTransform(K, 0, 0, K, K * TR.x, K * TR.y); // anel aceso na borda do círculo
          c.globalAlpha = 1 - u; c.strokeStyle = cor('destaque'); c.lineWidth = 10; brilho(22); circulo(cx, cy, raio); c.stroke(); semBrilho(); c.restore();
        } else cena(i, t);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(vinheta, 0, 0);
        legenda(t);
        const fim = trecho(t, H.escurece ?? duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#04020f'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: as mesmas marcas de tempo da imagem ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [];
        const calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // nota que começa antes do corte e ainda soaria nele: encurta para acabar no corte
        const ate = (tt, dur, solta) => { for (const [a] of corta) if (tt < a && tt + dur + solta > a) return Math.max(0.02, a - tt - solta); return dur; };
        const sem = 60 / (MU.bpm || 116) / 2, compasso = sem * 8, vol = MU.vol ?? 0.05;
        for (let i = 0, tt = 0.1; tt < duracao - 0.4; i++, tt += sem) { // arpejo escuro de serras desafinadas
          if (calado(tt)) continue;
          const ac = MU.acordes[Math.floor((tt - 0.1) / compasso) % MU.acordes.length];
          const n = ac[MU.padrao[i % MU.padrao.length]], v = vol * (i % 4 === 0 ? 1.15 : 0.85), d = ate(tt, sem * 0.6, 0.1);
          s.nota(n, tt, d, { vol: v, forma: 'serra', ataque: 0.01, solta: 0.1, pan: -0.3 });
          s.nota(n, tt + 0.005, d, { vol: v * 0.8, forma: 'serra', ataque: 0.01, solta: 0.1, pan: 0.3, vibrato: 0.005, vibratoHz: 0.5 });
          s.nota(n, tt, d, { vol: v * 0.6, forma: 'tri', ataque: 0.01, solta: 0.1 });
        }
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += compasso) { // baixo grave a cada compasso
          if (calado(tt)) continue;
          const ac = MU.acordes[b % MU.acordes.length], d = ate(tt, compasso - 0.2, 0.2);
          s.nota(ac[0], tt, d, { vol: MU.baixo ?? 0.11, forma: 'seno', ataque: 0.02, solta: 0.2 });
          s.nota(ac[0], tt, d, { vol: (MU.baixo ?? 0.11) * 0.3, forma: 'serra', ataque: 0.02, solta: 0.2 });
          if (!corta.some(([a]) => tt < a && tt + 0.3 > a)) s.batida(tt, { vol: 0.2, freq: 58, dur: 0.3 });
        }
        // "plop" macio quando as peças entram (o timbre do vetor plano: bolha curta que sobe)
        const plop = (tt, f = 700, v = 0.05) => s.pio(tt, { freq: f, vol: v, repete: 1, dur: 0.06, sobe: 0.9 });
        for (const cn of H.cenas) {
          if (cn.de > 0) s.vento(cn.de - 0.05, 0.4, { vol: 0.07, corte: 3000, onda: 2, entra: 0.15, sai: 0.2 }); // troca em círculo
          for (const p of cn.pecas) {
            if (p.t !== undefined && p.tipo !== 'carimbo') plop(p.t + 0.03, 600 + r() * 300);
            if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.09) plop(tt, 800 + r() * 500, 0.03);
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 5000, onda: 1, entra: 0.3, sai: 0.3 });
            if (p.tipo === 'barras') p.itens.forEach((_, i) => plop(p.t + i * 0.12, 500 + i * 90, 0.05));
            if (p.tipo === 'mapa') { s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 4000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) plop(tt, 450, 0.06); }
            if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.07) plop(tt, 1400 + r() * 500, 0.02);
            if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.06, { vol: 0.06, corte: 900, dur: 0.08 });
          }
        }
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.05) s.toque(tt, { vol: 0.05, corte: 7000, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.45, freq: 55, dur: 0.45 }); s.toque(tt, { vol: 0.07, corte: 1200, dur: 0.1 }); }
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.4 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.13, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.04 }); }
        if (SO.arranhao !== undefined) { // arranhão de disco na virada
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.4, freq: 70, dur: 0.3 });
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
