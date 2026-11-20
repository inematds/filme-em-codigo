// MOTOR "papel-cartolina" — desenho animado de recortes de cartolina: formas chapadas cortadas a
// tesoura (bordas tortas, círculos em facetas), sombra dura de papel por baixo de cada peça, textura
// de papel por cima, bonecos de cabeça redonda e olhinhos de ponto. Animação dura de recorte: tudo
// anda "de três em três" quadros (10 poses por segundo), a câmera dá um pulinho a cada pose e as
// bordas "fervem" (mexem um fio a cada pose). Cenas trocam em corte seco.
// Jeito de animar: camadas-planas (canvas 2D), com letras em traços (letras.js).
// Este arquivo sabe DESENHAR as peças. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const PA = H.papel || {};
      const POSE = PA.pose || 0.1;        // uma pose a cada 0,1 s (3 quadros a 30 qps)
      const FERVE = PA.ferve ?? 1.8;       // quanto a borda mexe a cada pose (px)
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

      // ---------- tempo em poses (stop-motion): conta a partir do começo de cada peça ----------
      // na hora exata do começo a peça já mostra a 1ª pose (assim bate com o som)
      const decorrido = (t, t0) => (Math.floor((t - t0) / POSE + 1e-6) + 1) * POSE;
      const tr = (t, a, b) => (t < a ? 0 : trecho(a + decorrido(t, a), a, b)); // trecho em poses
      const pop = (t, t0, d = 0.3) => (t < t0 ? 0 : Math.max(0, passa(decorrido(t, t0) / d)));
      let B = 0; // número da pose do quadro (para a borda ferver)

      // ---------- sorteio fixo por peça (sem memória): número de -1 a 1 ----------
      const hs = (a, b, d) => {
        let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((d | 0) + 13, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
        return (h >>> 0) / 2147483648 - 1;
      };

      // ---------- sombra de papel: o shadowBlur é em pixels da TELA, então multiplica pela escala ----------
      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      const SOMBRA = PA.sombra || { x: 5, y: 7, borrao: 3, cor: 'rgba(25,15,10,0.38)' };
      const sombra = (f = 1) => { const s = escalaAtual(); c.shadowColor = SOMBRA.cor; c.shadowBlur = SOMBRA.borrao * s * f; c.shadowOffsetX = SOMBRA.x * s * f; c.shadowOffsetY = SOMBRA.y * s * f; };
      const semSombra = () => { c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- formas de papel recortado ----------
      // caminho com os cantos um pouco tortos (fixo) e a borda que "ferve" a cada pose
      function poli(pts, sem, fixo = 2.2) {
        c.beginPath();
        pts.forEach(([x, y], i) => {
          const jx = hs(sem, i, 1) * fixo + hs(sem, i, 1000 + B) * FERVE, jy = hs(sem, i, 2) * fixo + hs(sem, i, 3000 + B) * FERVE;
          if (i) c.lineTo(x + jx, y + jy); else c.moveTo(x + jx, y + jy);
        });
        c.closePath();
      }
      // círculo cortado a tesoura: facetas visíveis e raio um pouco desigual
      function circ(x, y, rx, ry = rx, sem = 1, a0 = 0) {
        const n = Math.max(9, Math.min(28, Math.round(Math.max(rx, ry) / 7)));
        const pts = [];
        for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2, q = 1 + hs(sem, i, 9) * 0.035; pts.push([x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q]); }
        return pts;
      }
      const ret = (x, y, w, h) => [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]];
      function papel(pts, cr, sem, o = {}) {
        if (o.sombra !== false) sombra(o.sombraF || 1);
        poli(pts, sem, o.fixo ?? 2.2); c.fillStyle = cr; c.fill(); semSombra();
        if (o.borda) { c.strokeStyle = o.borda; c.lineWidth = o.lb || 4; c.lineJoin = 'round'; c.stroke(); }
      }
      // estrela de pontas (brilho de papel)
      function estrela(x, y, r1, r2, n, cr, sem, giro = 0) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) { const a = giro + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        papel(pts, cr, sem, { fixo: 4 });
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
      // faixa de papel grossa (risco, galho): retângulo girado de (x0,y0) a (x1,y1)
      function tira(x0, y0, x1, y1, larg, cr, sem, prog = 1, o = {}) {
        if (prog <= 0) return;
        const x2 = mistura(x0, x1, prog), y2 = mistura(y0, y1, prog), d = Math.hypot(x2 - x0, y2 - y0) || 1;
        const nx = -(y2 - y0) / d * larg / 2, ny = (x2 - x0) / d * larg / 2;
        papel([[x0 + nx, y0 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x0 - nx, y0 - ny]], cr, sem, o);
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
      function caminho(g, x, y, tam) {
        c.beginPath();
        for (const t of g.tracos) t.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (px de borda preta), sombra, tabular }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.17;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
        if (o.sombra) { c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = lw + (o.contorno || 0) * 2; for (const l of letras) { caminho(l.g, l.x + o.sombra, y + o.sombra, tam); c.stroke(); } }
        if (o.contorno) { c.strokeStyle = cor('tinta'); c.lineWidth = lw + o.contorno * 2; for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); } }
        for (const l of letras) { c.strokeStyle = corDe(l.palavra); c.lineWidth = lw; caminho(l.g, l.x, y, tam); c.stroke(); }
      }
      // rótulo: branco com borda preta grossa, girado -3 graus em volta do meio do texto
      function rotulo(txt, x, y, tam, o = {}) {
        const giro = (o.giro ?? -3) * RAD, cx = o.alinha === 'esquerda' ? x + largTexto(txt, tam, o.tabular) / 2 : o.alinha === 'direita' ? x - largTexto(txt, tam, o.tabular) / 2 : x, cy = y - tam / 2;
        c.save(); c.translate(cx, cy); c.rotate(giro); c.translate(-cx, -cy);
        escreve(txt, x, y, tam, { ...o, contorno: o.contorno ?? Math.max(4, tam * 0.11), sombra: o.sombra ?? Math.max(2, tam * 0.04) });
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

      // ---------- textura de papel (fibras na diagonal) e sombra macia nas bordas: pronta uma vez ----------
      const textura = novaTela(largura, altura);
      { const g = textura.getContext('2d'), r = sorteio((H.semente || 1) * 13 + 1);
        g.lineCap = 'round';
        for (let i = 0; i < 2600; i++) {
          const x = r() * largura, y = r() * altura, d = (6 + r() * 22) * k, claro = r() < 0.5;
          g.strokeStyle = claro ? 'rgba(255,255,255,0.10)' : 'rgba(40,25,10,0.09)'; g.lineWidth = Math.max(0.6, (0.8 + r() * 1.4) * k);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y - d * (0.8 + r() * 0.4)); g.stroke();
        }
        for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(30,20,10,0.08)'; g.fillRect(r() * largura, r() * altura, Math.max(1, 2 * k), Math.max(1, 2 * k)); }
        const gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.5, largura / 2, altura / 2, altura * 0.62);
        gr.addColorStop(0, 'rgba(30,15,5,0)'); gr.addColorStop(1, 'rgba(30,15,5,0.42)');
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }

      // ---------- câmera de stop-motion: um pulinho novo a cada pose; tremor na virada ----------
      const CAM = H.camera || {};
      function camera(t, q) {
        const r = sorteio((H.semente || 1) * 977 + B * 7 + 3), j = CAM.pulo ?? 4;
        let dx = (r() * 2 - 1) * j, dy = (r() * 2 - 1) * j;
        const giro = (r() * 2 - 1) * (CAM.giro ?? 0.35) * RAD, z = 1.02 + (r() * 2 - 1) * (CAM.escala ?? 0.005);
        for (const tm of H.tremores || []) {
          const q0 = Math.round(tm.t * fps);
          if (q >= q0 && q < q0 + tm.quadros) { const s = sorteio((H.semente || 1) * 1000 + q), f = tm.forca * (1 - (q - q0) / tm.quadros); dx += (s() * 2 - 1) * f; dy += (s() * 2 - 1) * f; }
        }
        return { dx, dy, z, giro };
      }

      // ---------- cores dos bonecos (o motor só sorteia entre as listas da história) ----------
      const BO = H.bonecos;
      const escurece = (h, q = 0.25) => Filme.hex(h, '#000000', q);

      // boneco de cartolina: (x, yp) = os pés; u = altura. Cabeça redonda, dois olhinhos de ponto.
      // o = { tipo: moderno | cientista | mongol | khan, sem, pele, roupa, cabelo, chapeu, faixa, cinza (0 a 1), acesa }
      function pessoa(x, yp, u, o = {}) {
        const sem = o.sem || 1, r = sorteio(sem * 31 + 7), pega = (lista) => lista[Math.floor(r() * lista.length)];
        const tipo = o.tipo || 'moderno', longo = tipo === 'mongol' || tipo === 'khan';
        const tg = (h) => (o.cinza ? Filme.hex(h, cor('papelCinza'), o.cinza * 0.85) : h);
        const pele = tg(o.pele || pega(BO.peles)), roupa0 = o.roupa || pega(longo ? BO.deels : BO.roupas), cabelo = tg(o.cabelo || pega(BO.cabelos));
        const roupa = tg(tipo === 'cientista' ? cor('jaleco') : roupa0), escuro = tg(cor('tinta'));
        const faixa = tg(o.faixa || pega(BO.faixas)), chapeu = tg(o.chapeu || pega(BO.chapeus)), pelo = tg(o.pelo || pega(BO.pelos));
        const careca = r() < 0.12, rx = 0.165 * u * (0.94 + 0.12 * r()), ry = 0.175 * u * (0.95 + 0.08 * r());
        const ys = yp - 0.56 * u, yb = yp - (longo ? 0.07 : 0.14) * u, wt = 0.40 * u, wb = (longo ? 0.56 : 0.46) * u;
        // pernas / botas
        for (const s of [-1, 1]) papel(ret(x + s * 0.075 * u - 0.05 * u, yb - 0.03 * u, 0.1 * u, yp - yb + 0.03 * u), longo ? escuro : tg(cor('calca')), sem + 2 + s, { sombra: false, fixo: 1 });
        // braços e mãos
        for (const s of [-1, 1]) {
          papel([[x + s * 0.15 * u, ys + 0.02 * u], [x + s * 0.26 * u, ys + 0.05 * u], [x + s * 0.29 * u, ys + 0.30 * u], [x + s * 0.2 * u, ys + 0.31 * u]], escurece(roupa, 0.12), sem + 5 + s, { fixo: 1.2 });
          papel(circ(x + s * 0.25 * u, ys + 0.335 * u, 0.045 * u, 0.045 * u, sem + 8 + s), pele, sem + 8 + s, { sombra: false, fixo: 0.6 });
        }
        // corpo
        papel([[x - wt / 2, ys], [x, ys - 0.01 * u], [x + wt / 2, ys], [x + wb / 2, yb], [x, yb + 0.01 * u], [x - wb / 2, yb]], roupa, sem + 11, { fixo: 1.5 });
        if (tipo === 'moderno') papel([[x - 0.065 * u, ys - 0.005 * u], [x + 0.065 * u, ys - 0.005 * u], [x, ys + 0.085 * u]], pele, sem + 12, { sombra: false, fixo: 0.8 });
        if (tipo === 'cientista') {
          papel([[x - 0.08 * u, ys - 0.005 * u], [x + 0.08 * u, ys - 0.005 * u], [x, ys + 0.2 * u]], tg(cor('camisa')), sem + 12, { sombra: false, fixo: 0.8 });
          c.strokeStyle = tg('#9a968c'); c.lineWidth = Math.max(1.5, 0.012 * u); c.lineCap = 'round';
          linha(x, ys + 0.2 * u, x, yb - 0.01 * u, 1);
          papel(ret(x + 0.06 * u, ys + 0.24 * u, 0.09 * u, 0.06 * u), tg('#e2ddd2'), sem + 13, { sombra: false, fixo: 0.6 });
        }
        if (longo) {
          // o deel fecha do lado direito de quem veste (esquerda de quem olha): uma tira na diagonal e descendo pela lateral
          const bd = tg(o.borda || (tipo === 'khan' ? cor('ouro') : escurece(roupa0, 0.3)));
          papel([[x + 0.03 * u, ys - 0.01 * u], [x + 0.09 * u, ys - 0.01 * u], [x - 0.15 * u, ys + 0.22 * u], [x - 0.2 * u, ys + 0.18 * u]], bd, sem + 14, { sombra: false, fixo: 0.8 });
          papel([[x - 0.2 * u, ys + 0.18 * u], [x - 0.15 * u, ys + 0.22 * u], [x - 0.18 * u, yb], [x - 0.24 * u, yb]], bd, sem + 15, { sombra: false, fixo: 0.8 });
          // faixa na cintura
          papel(ret(x - wt / 2 - 0.035 * u, yp - 0.36 * u, wt + 0.07 * u, 0.065 * u), faixa, sem + 16, { sombra: false, fixo: 1 });
          if (tipo === 'khan') papel([[x + 0.1 * u, yp - 0.30 * u], [x + 0.15 * u, yp - 0.30 * u], [x + 0.17 * u, yp - 0.18 * u], [x + 0.11 * u, yp - 0.19 * u]], faixa, sem + 17, { sombra: false, fixo: 0.6 });
        }
        if (o.acesa) { // boneco aceso: a camisa vira a cor de destaque
          papel([[x - wt / 2, ys], [x + wt / 2, ys], [x + wb / 2, yb], [x - wb / 2, yb]], Filme.hex(roupa, cor('destaque'), o.acesa), sem + 11, { sombra: false, fixo: 1.5 });
        }
        // cabeça
        const yh = ys - 0.14 * u;
        papel(circ(x, yh, rx, ry, sem + 20), pele, sem + 20, { fixo: 1.2 });
        // cabelo (por cima da testa, com franja cortada em dentes)
        if (!longo && !careca) {
          const pts = [], n = 12;
          for (let i = 0; i <= n; i++) { const a = Math.PI * (1.02 + 0.96 * i / n); pts.push([x + Math.cos(a) * rx * 1.07, yh + Math.sin(a) * ry * 1.08]); }
          const fr = 5;
          for (let i = 0; i <= fr; i++) { const fx = x + rx * 1.0 - (2 * rx * i) / fr, fy = yh - ry * (i % 2 ? 0.28 : 0.42); pts.push([fx, fy]); }
          papel(pts, cabelo, sem + 21, { sombra: false, fixo: 1.2 });
        }
        // rosto: dois pontinhos pretos, boca curta, bochecha rosada
        const tinta = tg(cor('tinta')), ey = yh + 0.01 * u, ex = 0.06 * u, er = Math.max(1.4, 0.022 * u);
        c.fillStyle = tinta;
        for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * ex, ey, er, 0, 7); c.fill(); }
        c.globalAlpha *= 0.45; c.fillStyle = tg(cor('bochecha'));
        for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 0.105 * u, yh + 0.065 * u, 0.026 * u, 0, 7); c.fill(); }
        c.globalAlpha /= 0.45;
        if (tipo === 'khan') {
          // sobrancelhas firmes, bigode curto caído e barbicha
          tira(x - 0.1 * u, ey - 0.055 * u, x - 0.025 * u, ey - 0.04 * u, 0.022 * u, tinta, sem + 22, 1, { sombra: false, fixo: 0.4 });
          tira(x + 0.1 * u, ey - 0.055 * u, x + 0.025 * u, ey - 0.04 * u, 0.022 * u, tinta, sem + 23, 1, { sombra: false, fixo: 0.4 });
          papel([[x - 0.012 * u, yh + 0.06 * u], [x - 0.085 * u, yh + 0.105 * u], [x - 0.075 * u, yh + 0.12 * u], [x, yh + 0.08 * u], [x + 0.075 * u, yh + 0.12 * u], [x + 0.085 * u, yh + 0.105 * u], [x + 0.012 * u, yh + 0.06 * u]], tinta, sem + 24, { sombra: false, fixo: 0.4 });
          papel([[x - 0.045 * u, yh + 0.135 * u], [x + 0.045 * u, yh + 0.135 * u], [x + 0.02 * u, yh + 0.235 * u], [x - 0.02 * u, yh + 0.235 * u]], tinta, sem + 25, { sombra: false, fixo: 0.4 });
        } else {
          papel(ret(x - 0.028 * u, yh + 0.085 * u, 0.056 * u, Math.max(1.5, 0.012 * u)), tinta, sem + 26, { sombra: false, fixo: 0.3 });
        }
        // gorro mongol: copa de feltro em ponta e aba de pele dobrada para cima
        if (longo) {
          const ab = yh - ry * 0.45, at = yh - ry * 1.08, wa = rx * 1.15, alto = 0.2 * u;
          // copa: cúpula de feltro com uma ponta curta em cima
          const copa = [];
          for (let i = 0; i <= 10; i++) { const an = Math.PI + Math.PI * i / 10, bico = i === 5 ? 1.25 : 1; copa.push([x + Math.cos(an) * wa * 0.8, at + 0.01 * u + Math.sin(an) * alto * bico]); }
          papel(copa, chapeu, sem + 27, { fixo: 1 });
          // aba de pele dobrada para cima, mais larga em cima, com a borda de cima em tufos
          const pts = [[x - wa * 0.92, ab], [x + wa * 0.92, ab]];
          for (let i = 0; i <= 10; i++) pts.push([x + wa * 1.12 - (2 * wa * 1.12 * i) / 10, at + (i % 2 ? 0.01 : -0.03) * u]);
          papel(pts, pelo, sem + 28, { sombra: false, fixo: 1 });
          papel(circ(x, at + 0.01 * u - alto * 1.25, 0.03 * u, 0.03 * u, sem + 29), tipo === 'khan' ? tg(cor('ouro')) : tg(cor('vermelho')), sem + 29, { sombra: false, fixo: 0.5 });
        }
      }

      // ---------- as peças ----------
      const M = 90; // sobra fora da tela (a câmera pula e treme)
      const PECAS = {
        // ---- cenário ----
        fundo(p) { c.fillStyle = p.cor; c.fillRect(-M - 40, -M - 40, L + 2 * M + 80, A + 2 * M + 80); },
        faixa(p, t, sem) { // tira de papel de lado a lado, de y0 até embaixo, com a borda de cima ondulada
          const pts = [], n = 14;
          for (let i = 0; i <= n; i++) { const x = -M + (L + 2 * M) * i / n; pts.push([x, p.y0 + Math.sin(i * 1.7 + (p.fase || 0)) * (p.onda || 0)]); }
          pts.push([L + M, (p.y1 ?? A) + M], [-M, (p.y1 ?? A) + M]);
          papel(pts, p.cor, sem, { fixo: 3, sombraF: p.sombra === false ? 0 : 1.4 });
        },
        morro(p, t, sem) {
          if (p.t !== undefined && t < p.t) return;
          const s = p.t !== undefined ? pop(t, p.t, 0.3) : 1, pts = [], n = 18;
          for (let i = 0; i <= n; i++) { const a = Math.PI + Math.PI * i / n; pts.push([p.x + Math.cos(a) * p.l, p.y + p.a + Math.sin(a) * p.a]); }
          pts.push([p.x + p.l, p.y + p.a + (p.fundo || 600)], [p.x - p.l, p.y + p.a + (p.fundo || 600)]);
          emVolta(p.x, p.y + p.a, s, () => papel(pts, p.cor, sem, { fixo: 3, sombraF: 1.3 }));
        },
        montanhas(p, t, sem) {
          const pts = [[-M, p.y + 40]];
          for (const [x, h] of p.picos) pts.push([x, p.y - h]);
          pts.push([L + M, p.y + 40]);
          papel(pts, p.cor, sem, { fixo: 3 });
        },
        nuvem(p, t, sem) {
          const x = p.x + (p.deriva || 0) * Math.floor(t / POSE) * POSE, s = p.tam || 1;
          const bolas = [[-90, 10, 60], [-30, -25, 75], [50, -10, 65], [100, 15, 45], [10, 25, 60]];
          bolas.forEach(([dx, dy, r], i) => papel(circ(x + dx * s, p.y + dy * s, r * s, r * s * 0.85, sem + i), cor('nuvem'), sem + i, { fixo: 1.5, sombraF: 0.7 }));
        },
        sol(p, t, sem) { papel(circ(p.x, p.y, p.r, p.r, sem), p.cor, sem, { fixo: 2, sombraF: 0.6 }); },
        ger(p, t, sem) { // tenda de feltro branco com faixas vermelha e azul e porta vermelha
          const s = p.tam, x = p.x, y = p.y;
          papel([[x - s, y], [x - s, y - 0.5 * s], [x - 0.6 * s, y - 0.85 * s], [x, y - 1.0 * s], [x + 0.6 * s, y - 0.85 * s], [x + s, y - 0.5 * s], [x + s, y]], cor('feltro'), sem, { fixo: 1.5 });
          papel(ret(x - s, y - 0.5 * s, 2 * s, 0.1 * s), cor('vermelho'), sem + 1, { sombra: false, fixo: 0.8 });
          papel(ret(x - s, y - 0.33 * s, 2 * s, 0.07 * s), cor('azul'), sem + 2, { sombra: false, fixo: 0.8 });
          papel(ret(x - 0.18 * s, y - 0.42 * s, 0.36 * s, 0.42 * s), cor('vermelho'), sem + 3, { sombra: false, fixo: 0.8 });
        },
        ret(p, t, sem) { papel(ret(p.x, p.y, p.l, p.a), p.cor, sem, { fixo: p.fixo ?? 2, sombra: p.sombra !== false }); },
        luz(p, t, sem) { // cone da luminária
          alfa(p.alfa ?? 0.2);
          poli([[p.x - 60, p.y], [p.x + 60, p.y], [p.x + p.l / 2, p.y1], [p.x - p.l / 2, p.y1]], sem, 3); c.fillStyle = p.cor; c.fill();
          alfa(1);
          papel([[p.x - 120, p.y], [p.x - 50, p.y - 90], [p.x + 50, p.y - 90], [p.x + 120, p.y]], cor('abajur'), sem + 1, { fixo: 1.5 });
          papel(circ(p.x, p.y + 6, 34, 18, sem + 2), p.cor, sem + 2, { sombra: false });
        },
        escurece(p) { alfa(p.alfa); c.fillStyle = p.cor; c.fillRect(-M - 40, -M - 40, L + 2 * M + 80, A + 2 * M + 80); alfa(1); },
        cavaleiros(p, t, sem) { // fila de cavaleiros que trota (pernas trocam a cada pose)
          const pose = Math.floor(t / POSE), avanca = (p.vel || 0) * pose * POSE;
          for (let i = 0; i < p.n; i++) {
            const x = ((p.x0 + i * p.dx + avanca) % (L + 2 * M + 200)) - M - 100, y = p.y + (i % 2) * 18, s = p.tam, sb = (pose + i) % 2;
            const pernas = sb ? [[-0.35, 0.1], [-0.2, -0.05], [0.25, 0.08], [0.38, -0.06]] : [[-0.32, -0.04], [-0.16, 0.08], [0.22, -0.05], [0.36, 0.1]];
            for (const [dx, a] of pernas) tira(x + dx * s, y - 0.05 * s, x + (dx + a) * s, y + 0.38 * s, 0.07 * s, cor('cavalo'), sem + i * 10, 1, { sombra: false, fixo: 0.6 });
            papel(circ(x, y - 0.12 * s, 0.48 * s, 0.22 * s, sem + i * 10 + 1), cor('cavalo'), sem + i * 10 + 1, { fixo: 1 });
            tira(x + 0.38 * s, y - 0.2 * s, x + 0.62 * s, y - 0.5 * s, 0.16 * s, cor('cavalo'), sem + i * 10 + 2, 1, { sombra: false, fixo: 0.6 });
            pessoa(x - 0.02 * s, y - 0.12 * s, 0.75 * s, { tipo: 'mongol', sem: sem + i * 10 + 3 });
            if (i % 2 === 0) { tira(x - 0.18 * s, y - 0.3 * s, x - 0.18 * s, y - 1.3 * s, 0.03 * s, cor('tinta'), sem + i * 10 + 4, 1, { sombra: false, fixo: 0.3 }); papel([[x - 0.18 * s, y - 1.3 * s], [x + 0.2 * s, y - 1.2 * s], [x - 0.18 * s, y - 1.08 * s]], cor('vermelho'), sem + i * 10 + 5, { fixo: 0.8 }); }
          }
        },

        // ---- peças da história ----
        texto(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.3), s = p.sobe ? 1 : pop(t, p.t), dy = p.sobe ? (1 - sai(u)) * 60 : 0;
          alfa((p.sobe ? Math.max(0.34, u) : 1) * some(p, t));
          emVolta(p.x, p.y - p.tam * 0.45, s, () => rotulo(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, tabular: p.tabular, giro: p.giro }));
          if (p.risco && t >= p.risco.de) {
            const w = largTexto(p.texto, p.tam) + p.tam * 0.6, yc = p.y - p.tam * 0.45, pr = sai(tr(t, p.risco.de, p.risco.ate));
            alfa(1); tira(p.x - w / 2, yc + p.tam * 0.12, p.x + w / 2, yc - p.tam * 0.1, p.tam * 0.16, cor(p.risco.cor || 'vermelho'), 4400, pr, { borda: cor('tinta'), lb: 4 });
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
          const n = quem.length;
          quem.forEach((b, i) => {
            const t0 = p.de + (p.ate - p.de) * (i / n), s = pop(t, t0, 0.3);
            alfa(1); emVolta(b.x, b.y, s, () => pessoa(b.x, b.y, b.u, { sem: sem * 100 + i, cinza: ap }));
          });
          // linhas de linha preta de cada cabeça até um ponto
          if (p.liga && t >= p.liga.de) {
            c.strokeStyle = cor('tinta'); c.lineWidth = 2.5; c.lineCap = 'round';
            quem.forEach((b, i) => {
              const atraso = (nl - 1 - Math.floor(i / p.colunas)) * 0.05;
              alfa(0.7); linha(b.x, b.y - b.u * 0.7, p.liga.para[0], p.liga.para[1], sai(tr(t, p.liga.de + atraso, p.liga.ate)));
            });
            alfa(1);
          }
        },
        heroi(p, t, sem) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4);
          alfa(1);
          if (p.estrela) emVolta(p.x, p.y - p.tam * 0.55, s, () => estrela(p.x, p.y - p.tam * 0.55, p.estrela, p.estrela * 0.72, 14, cor('destaque'), sem + 1, Math.floor(t / POSE) * 0.04));
          emVolta(p.x, p.y, s, () => pessoa(p.x, p.y, p.tam, { tipo: 'khan', sem: sem + 7, pele: cor('peleKhan'), roupa: cor('deelKhan'), chapeu: cor('vermelho'), pelo: cor('peloKhan'), faixa: cor('faixaKhan') }));
        },
        janela(p, t, sem) { // folha de papel creme presa com fita
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            papel(ret(x, y, p.l, p.a), cor(p.cor || 'folha'), sem, { fixo: 3, sombraF: 1.6 });
            for (const [fx, fy, g] of [[x + 20, y - 10, -25], [x + p.l - 20, y - 10, 25]]) { c.save(); c.translate(fx, fy); c.rotate(g * RAD); alfa(0.75); papel(ret(-55, -18, 110, 36), cor('fita'), sem + 1, { sombra: false, fixo: 1 }); alfa(1); c.restore(); }
            rotulo(p.titulo, p.x, y + 70, 36, { cor: 'branco', giro: -1.5 });
            if (p.linhas) { for (let i = 0; i < p.linhas; i++) { const yy = y + 130 + i * 70, w = p.l * (i % 3 === 1 ? 0.45 : 0.7), pr = tr(t, p.t + 0.1 + i * 0.05, p.t + 0.4 + i * 0.05); if (pr > 0) papel(ret(x + 70, yy, w * pr, 14), cor('linhaFolha'), sem + 10 + i, { sombra: false, fixo: 1 }); } }
          });
        },
        cientista(p, t, sem) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3);
          alfa(1); emVolta(p.x, p.y, s, () => pessoa(p.x, p.y, p.tam, { tipo: 'cientista', sem: sem + (p.sem || 0) }));
        },
        tubos(p, t, sem) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.6, h = p.tam;
          papel(ret(x0 - p.dx * 0.6, p.y + h * 0.18, (p.n - 1) * p.dx + p.dx * 1.2, h * 0.22), cor('suporte'), sem + 99, { fixo: 2 });
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(tr(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              if (cheio > 0) estrela(x, p.y, w * 1.6 * cheio, w * 1.1 * cheio, 10, cor('destaque'), sem + 50, Math.floor(t / POSE) * 0.05);
              const pts = [[x - w / 2, p.y - h / 2], [x + w / 2, p.y - h / 2], [x + w / 2, p.y + h / 2 - w / 2]];
              for (let a = 1; a < 6; a++) { const an = (a / 6) * Math.PI; pts.push([x + Math.cos(an) * w / 2, p.y + h / 2 - w / 2 + Math.sin(an) * w / 2]); }
              pts.push([x - w / 2, p.y + h / 2 - w / 2]);
              papel(pts, cor('vidro'), sem + i, { fixo: 1 });
              const nivel = mistura(0.3, 0.92, cheio), crL = cheio > 0 ? cor('destaque') : BO.liquidos[i % BO.liquidos.length];
              c.save(); poli(pts, sem + i, 1); c.clip(); c.fillStyle = crL; c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h); c.restore();
              poli(pts, sem + i, 1); c.strokeStyle = cor('tinta'); c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
              papel(ret(x - w / 2 - 6, p.y - h / 2 - 8, w + 12, 14), cor('tinta'), sem + 40 + i, { sombra: false, fixo: 0.6 });
            });
          }
        },
        fila(p, t, sem) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas.length;
          for (let i = 0; i < n; i++) {
            const ln = p.linhas[Math.floor(i / p.colunas)], x = p.x - (p.colunas - 1) * p.dx / 2 + (i % p.colunas) * p.dx;
            const s = pop(t, p.de + (p.ate - p.de) * i / n, 0.3);
            const ac = p.acende && i === p.acende.i ? tr(t, p.acende.t, p.acende.t + 0.1) : 0;
            const sa = ac > 0 ? 1 + 0.1 * Math.sin(Math.PI * tr(t, p.acende.t, p.acende.t + 0.4)) : 1;
            alfa(1);
            emVolta(x, ln.y, s * sa, () => {
              if (ac > 0) estrela(x, ln.y - ln.tam * 0.55, ln.tam * 0.62, ln.tam * 0.45, 12, cor('destaque'), sem + 70, Math.floor(t / POSE) * 0.05);
              pessoa(x, ln.y, ln.tam, { sem: sem * 50 + i, acesa: ac, cinza: ac > 0 ? 0 : (p.acende && t >= p.acende.t ? 0.35 : 0) });
            });
          }
        },
        mapa(p, t, sem) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(tr(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          const pa = p.painel, s0 = pop(t, p.contorno.de, 0.3);
          emVolta(p.x, p.y, s0, () => {
            papel(ret(pa.x, pa.y, pa.l, pa.a), cor('mar'), sem, { fixo: 2, borda: cor('tinta'), lb: 6, sombraF: 1.8 });
            c.save(); c.beginPath(); c.rect(pa.x + 3, pa.y + 3, pa.l - 6, pa.a - 6); c.clip();
            const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
            const pc = sai(tr(t, p.contorno.de, p.contorno.ate));
            alfa(tr(t, p.contorno.de + 0.3, p.contorno.ate + 0.2));
            terras.forEach((r, i) => { poli(r, sem + 10 + i, 0.6); c.fillStyle = cor('terraMapa'); c.fill(); });
            alfa(1); c.strokeStyle = cor('tinta'); c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round';
            for (const r of terras) polilinha(r, pc);
            const forma = (pts, sm) => poli(pts.map(pj), sm, 0.8);
            if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste
              const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
              const xc = mistura(xb + 10, xa - 10, sai(tr(t, p.regiao.de, p.regiao.ate)));
              const im = p.imperio ? tr(t, p.imperio.de, p.imperio.de + 0.4) : 0;
              c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
              alfa(1 - 0.75 * im); forma(T.regiao, sem + 30); c.fillStyle = cor('regiao'); c.fill(); c.strokeStyle = cor('tinta'); c.lineWidth = 5; c.stroke();
              c.restore();
              if (p.aneis && t >= p.aneis.t) { // pontinhos pretos que pipocam dentro da região
                const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]), passo = p.aneis.passo;
                c.save(); forma(T.regiao, sem + 30); c.clip(); let i = 0;
                for (let lat = la + passo / 2; lat < lb; lat += passo * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? passo / 2 : 0); lon < Math.max(...lo); lon += passo) {
                  const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                  if (s <= 0) continue;
                  alfa(1 - 0.75 * im); c.beginPath(); c.arc(x, y, 7 * s, 0, 7); c.fillStyle = cor('tinta'); c.fill();
                }
                c.restore(); alfa(1);
              }
            }
            if (p.imperio && t >= p.imperio.pulsa) { // o império cresce de um ponto que pulsa
              const [px, py] = pj(p.imperio.ponto);
              if (t >= p.imperio.de) {
                const u = sai(tr(t, p.imperio.de, p.imperio.ate));
                c.save(); poli(circ(px, py, 20 + u * 700, 20 + u * 700, sem + 40), sem + 40, 6); c.clip();
                forma(T.imperio, sem + 41); c.fillStyle = cor('imperio'); c.fill(); c.strokeStyle = cor('tinta'); c.lineWidth = 6; c.stroke();
                c.restore();
              }
              const fase = (Math.floor((t - p.imperio.pulsa) / POSE) * POSE / 0.6) % 1;
              c.strokeStyle = cor('tinta'); c.lineWidth = 5; alfa(1 - fase); c.beginPath(); c.arc(px, py, 12 + fase * 40, 0, 7); c.stroke();
              alfa(1); papel(circ(px, py, 13 * pop(t, p.imperio.pulsa, 0.3), 13 * pop(t, p.imperio.pulsa, 0.3), sem + 42), cor('tinta'), sem + 42, { sombra: false, fixo: 0.5 });
              papel(circ(px, py, 6, 6, sem + 43), cor('branco'), sem + 43, { sombra: false, fixo: 0.3 });
            }
            c.restore();
          });
          c.restore();
        },
        barras(p, t, sem) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo;
            if (t < t0) return;
            const u = passa(tr(t, t0, t0 + p.dur)), D = it.cor === 'destaque';
            alfa(1);
            rotulo(it.nome, p.x - 24, y + 17, 36, { cor: D ? 'destaque' : 'branco', alinha: 'direita', giro: 0 });
            const w = Math.max(10, p.larg * it.v / p.maximo * u);
            papel(ret(p.x, y - p.alt / 2, w, p.alt), cor(it.cor), sem + i, { fixo: 1.5, borda: cor('tinta'), lb: 5 });
            if (tr(t, t0 + p.dur * 0.6, t0 + p.dur) > 0) rotulo(it.valor, p.x + w + 22, y + 16, 34, { cor: D ? 'destaque' : 'branco', alinha: 'esquerda', tabular: true, giro: 0 });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; if (t >= t1) rotulo(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 14, 32, { cor: 'branco' }); }
        },
        pasta(p, t, sem) { // pasta de arquivo de cartolina parda com aba
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            papel([[x + 30, y - 60], [x + 330, y - 60], [x + 380, y], [x + 30, y]], cor('pastaEscura'), sem + 1, { fixo: 1.5 });
            papel(ret(x, y, p.l, p.a), cor('pasta'), sem, { fixo: 2.5, sombraF: 1.6 });
            rotulo(p.titulo, x + 205, y - 14, 30, { cor: 'branco', giro: 0 });
            for (let i = 0; i < (p.linhas || 0); i++) { const yy = y + 70 + i * 80, w = p.l * (i % 3 === 1 ? 0.45 : 0.7), pr = tr(t, p.t + 0.1 + i * 0.05, p.t + 0.4 + i * 0.05); if (pr > 0) papel(ret(x + 70, yy, w * pr, 16), cor('pastaEscura'), sem + 10 + i, { sombra: false, fixo: 1 }); }
          });
        },
        carimbo(p, t, sem) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.2), s = mistura(1.9, 1, sai(u)), ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.2) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD, cr = Filme.hex(cor('vermelho'), cor('tinta'), ap * 0.65);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.8;
          alfa(limita(u * 2) * (1 - 0.18 * ap));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          c.strokeStyle = cr; c.lineJoin = 'round';
          poli(ret(-w / 2, -h / 2, w, h), sem, 2.5); c.lineWidth = 10; c.stroke();
          poli(ret(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32), sem + 1, 2); c.lineWidth = 4; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr });
          c.restore();
          if (p.risco && t >= p.risco.de) { // tira amarela de cartolina atravessa o carimbo
            alfa(1); c.save(); c.translate(p.x, p.y); c.rotate(giro);
            tira(-w / 2 - 30, 14, w / 2 + 30, -14, p.tam * 0.15, cor('destaque'), sem + 5, sai(tr(t, p.risco.de, p.risco.ate)), { borda: cor('tinta'), lb: 5 });
            c.restore();
          }
        },
        tumulos(p, t, sem) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? tr(t, p.borda, p.borda + 0.3) : 1;
          alfa(1); papel(circ(p.x, p.y + s * 0.1, s * 2.5, s * 1.05, sem + 90), cor('buraco'), sem + 90, { fixo: 3, sombra: false });
          [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([i, j], n) => {
            const x = p.x + i * s * 1.2, y = p.y + j * s * 0.55, sc = pop(t, p.t + n * 0.1, 0.3);
            alfa(1);
            emVolta(x, y, sc, () => {
              const pts = []; for (let a = 0; a <= 12; a++) { const an = Math.PI + Math.PI * a / 12; pts.push([x + Math.cos(an) * s, y + Math.sin(an) * s * 0.45]); }
              papel(pts, cor('monte'), sem + n, { fixo: 2, borda: b > 0 ? cor('destaque') : null, lb: 7 * b });
              for (let q = 0; q < 5; q++) papel(circ(x + (q - 2) * s * 0.38, y - 4, s * 0.1, s * 0.07, sem + 10 * n + q), cor('pedra'), sem + 10 * n + q, { sombra: false, fixo: 0.8 });
            });
          });
        },
        helice(p, t, sem) {
          if (t < p.de) return;
          const n = 20, u = sai(tr(t, p.de, p.ate)), giro = Math.floor(t / POSE) * POSE * 2.4;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5); if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 70, fr = Math.cos(f);
            alfa(vis); c.strokeStyle = cor('tinta'); c.lineWidth = 5; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof, cr] of [[ax, fr, 'vermelho'], [-ax, -fr, 'azul']]) papel(circ(p.x + sx, y, 12 + 5 * (prof + 1) / 2, 12 + 5 * (prof + 1) / 2, sem + i * 2 + (cr === 'azul')), cor(cr), sem + i * 2 + (cr === 'azul'), { sombra: false, fixo: 0.6, borda: cor('tinta'), lb: 3 });
          }
          alfa(1);
          if (p.divide && t >= p.divide) {
            const v = tr(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'destaque', m = 12, crr = D ? cor('destaque') : cor('papelCinza');
              for (let i = 1; i <= m; i++) { const q = i / m; if (q > v) break; const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30; papel(circ(x, y, 12, 12, sem + 100 + i + (D ? 50 : 0)), crr, sem + 100 + i + (D ? 50 : 0), { sombra: false, fixo: 0.6, borda: cor('tinta'), lb: 3 }); }
              if (v >= 1) {
                const s = pop(t, p.divide + p.durDivide, 0.3);
                emVolta(r.x, r.y - 50, s, () => { // o cromossomo Y de cartolina
                  tira(r.x - 30, r.y - 100, r.x, r.y - 55, 26, crr, sem + 200, 1, { borda: cor('tinta'), lb: 4 });
                  tira(r.x + 30, r.y - 100, r.x, r.y - 55, 26, crr, sem + 201, 1, { borda: cor('tinta'), lb: 4 });
                  tira(r.x, r.y - 60, r.x, r.y - 14, 26, crr, sem + 202, 1, { borda: cor('tinta'), lb: 4 });
                });
                rotulo(r.rotulo, r.x, r.y - 135, 42, { cor: D ? 'destaque' : 'papelCinza' });
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
              alfa(1); tira(pai.x, pai.y + pai.r * 0.6, f.x, f.y - f.r * 0.6, Math.max(12, 30 - l * 6), cor('galho'), sem + l * 20 + j, pr, { borda: cor('tinta'), lb: 3 });
              if (pr >= 1) { const mx = (pai.x + f.x) / 2, my = (pai.y + f.y) / 2; papel(circ(mx + 14, my - 4, 26 - l * 3, 18 - l * 2, sem + 500 + l * 20 + j), cor(j % 2 ? 'folha1' : 'folha2'), sem + 500 + l * 20 + j, { fixo: 1 }); }
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
            if (cont < 1) estrela(p.x, p.y, p.tam * 0.85, p.tam * 0.66, 16, cor('destaque'), sem + 3, Math.floor(t / POSE) * 0.03);
            medalhao(p.x, p.y, p.tam / 2, sem, { khan: true, vazio: cont });
          });
          if (p.interroga && t >= p.interroga) emVolta(p.x, p.y, pop(t, p.interroga + 0.1, 0.3), () => rotulo('?', p.x, p.y + p.tam * 0.18, p.tam * 0.42, { cor: 'destaque', giro: 0 }));
        },
      };
      const some = (p, t) => (p.some ? 1 - tr(t, p.some, p.some + 0.2) : 1);
      for (const cn of H.cenas) for (const p of cn.pecas) if (!PECAS[p.tipo]) throw new Error('Peça sem desenho no motor: ' + p.tipo);

      // medalhão: moldura redonda creme com um busto dentro (recortado no círculo)
      function medalhao(x, y, r, sem, o) {
        papel(circ(x, y, r * 1.12, r * 1.12, sem + 1), cor('tinta'), sem + 1, { fixo: 1 });
        papel(circ(x, y, r, r, sem + 2), cor('moldura'), sem + 2, { sombra: false, fixo: 1 });
        c.save(); poli(circ(x, y, r * 0.98, r * 0.98, sem + 2), sem + 2, 1); c.clip();
        const u = r * 2.3, a0 = c.globalAlpha;
        if (o.khan) {
          c.globalAlpha = a0 * (1 - (o.vazio || 0));
          pessoa(x, y + r * 1.45, r * 2.0, { tipo: 'khan', sem: sem + 7, pele: cor('peleKhan'), roupa: cor('deelKhan'), chapeu: cor('vermelho'), pelo: cor('peloKhan'), faixa: cor('faixaKhan') });
          c.globalAlpha = a0;
        } else pessoa(x, y + r * 1.25, u, { sem });
        c.restore();
      }

      // ---------- cenas: corte seco, uma de cada vez ----------
      const CENAS = H.cenas;
      const cenaEm = (t) => { let i = 0; CENAS.forEach((cn, j) => { if (t >= cn.de) i = j; }); return i; };

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
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : cor('branco')), contorno: 9, sombra: 3 });
          idx += ln.length;
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        const q = Math.round(t * fps); B = Math.floor(q / 3);
        const i = cenaEm(t), cn = CENAS[i], cam = camera(t, q);
        c.setTransform(k, 0, 0, k, 0, 0);
        c.translate(L / 2 + cam.dx, A / 2 + cam.dy); c.rotate(cam.giro); c.scale(cam.z, cam.z); c.translate(-L / 2, -A / 2);
        GA = 1;
        cn.pecas.forEach((p, j) => { c.save(); PECAS[p.tipo](p, t, (i + 1) * 1000 + j * 17); c.restore(); });
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(textura, 0, 0);
        // clarão de batida: por baixo da legenda (nunca cobre o texto)
        for (const f of H.claroes || []) {
          const u = trecho(t, f.t, f.t + f.dur);
          if (t >= f.t && u < 1) { c.globalAlpha = (f.forca ?? 0.6) * (1 - u); c.fillStyle = cor('branco'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
        }
        legenda(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: cítara dedilhada em pentatônica, tambor macio, galope e efeitos ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        const col = 60 / (MU.bpm || 120), oit = col / 2, vol = MU.vol ?? 0.22;
        // melodia: colcheias da pentatônica de lá menor, numa frase que se repete a cada 2 compassos
        for (let i = 0, tt = 0.1; tt < duracao - 0.5; i++, tt += oit) {
          if (calado(tt)) continue;
          const nota = MU.frase[i % MU.frase.length];
          if (nota) s.corda(nota, tt, oit * 1.8, { vol: vol * (i % 4 === 0 ? 1.1 : 0.85), pan: (i % 2 ? 0.25 : -0.25), maciez: 0.35 });
        }
        // baixo de cítara e tambor macio (no 1 e no 3 de cada compasso)
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += col) {
          if (calado(tt)) continue;
          if (b % 2 === 0) s.corda(MU.baixos[Math.floor(b / 4) % MU.baixos.length], tt, col * 1.9, { vol: MU.baixo ?? 0.3, maciez: 0.7 });
          s.batida(tt, { vol: b % 2 === 0 ? 0.22 : 0.12, freq: b % 2 === 0 ? 75 : 95, dur: 0.35 });
          if (b % 2 === 1) s.toque(tt + oit, { vol: 0.03, corte: 1800, dur: 0.05 });
        }
        // galope de casco (ta-ca-tum) em trechos
        for (const [a, d, v] of SO.galope || []) for (let tt = a; tt < a + d; tt += 0.36) [0, 0.09, 0.18].forEach((o, j) => s.toque(tt + o, { vol: v * (j === 2 ? 1.2 : 0.8), corte: 700, dur: 0.06, pan: (r() - 0.5) * 0.3 }));
        // papel batendo quando as peças entram
        const papelBate = (tt, v = 0.06) => { s.toque(tt, { vol: v, corte: 2400, dur: 0.05, pan: (r() - 0.5) * 0.5 }); s.batida(tt, { vol: v * 1.5, freq: 160, dur: 0.06 }); };
        for (const cn of H.cenas) {
          if (cn.de > 0) s.toque(cn.de, { vol: 0.09, corte: 3000, dur: 0.07 }); // corte seco: virada de folha
          for (const p of cn.pecas) {
            if (p.t !== undefined && !['carimbo', 'morro'].includes(p.tipo)) papelBate(p.t);
            if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.1) papelBate(tt, 0.03);
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 4000, onda: 1, entra: 0.3, sai: 0.3 });
            if (p.tipo === 'barras') p.itens.forEach((_, i) => papelBate(p.t + i * 0.12, 0.05));
            if (p.tipo === 'mapa') { papelBate(p.contorno.de, 0.07); s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 3000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) s.pio(tt, { freq: 900, vol: 0.04, repete: 1, dur: 0.05 }); }
            if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.1) s.pio(tt, { freq: 1800 + r() * 600, vol: 0.015, repete: 1, dur: 0.03 });
            if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.1, { vol: 0.08, corte: 700, dur: 0.09 });
            if (p.tipo === 'arvore') for (let l = 0; l < p.niveis.length; l++) papelBate(p.de + l * (p.ate - p.de) / p.niveis.length + 0.4, 0.05);
          }
        }
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.1) s.toque(tt, { vol: 0.045, corte: 6500, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.55, freq: 58, dur: 0.5 }); s.toque(tt, { vol: 0.1, corte: 1500, dur: 0.1 }); }
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.3 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.12, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.035 }); }
        if (SO.arranhao !== undefined) {
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.45, freq: 70, dur: 0.3 });
        }
        if (SO.grave !== undefined) { s.batida(SO.grave, { vol: 0.45, freq: 48, dur: 0.8 }); s.batida(SO.grave + 0.02, { vol: 0.2, freq: 90, dur: 0.3 }); s.corda('A1', SO.grave, 1.2, { vol: 0.25, maciez: 0.8 }); }
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.2);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
