// MOTOR "mesa-de-mapas" — documentário de mesa: tudo acontece sobre uma mesa de madeira coberta por
// um mapa antigo de papel, filmada de cima, com luz quente de luminária. Fotos instantâneas presas com
// fita, alfinetes com barbante vermelho, riscos de caneta vermelha, recortes, lupa e xícara. Os
// rótulos são etiquetas de pergaminho coladas com fita, escritas em letra de máquina de escrever.
// Câmera: deriva lenta (aproxima 1,02 -> 1,12 e anda de lado, trocando de lado a cada cena), troca de
// cena em fusão de 0,4 s (ou corte seco), vinheta quente e grão fino.
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
      const c1 = tela.getContext('2d');
      let c = c1; // o pincel atual: a tela, ou a camada da cena que entra na fusão
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const suave = (x) => { x = limita(x); return x * x * (3 - 2 * x); };
      const passa = (x) => { x = limita(x); const s = 1.4; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const tr = (t, a, b) => trecho(t, a, b);
      const FINO = 1.3 / k; // traço mínimo (barbante, caneta) para não sumir a 360x640

      // ---------- sorteio fixo por peça (sem memória): número de -1 a 1 ----------
      const hs = (a, b, d) => {
        let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((d | 0) + 13, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
        return (h >>> 0) / 2147483648 - 1;
      };

      // ---------- sombra: o shadowBlur é em pixels da TELA, então multiplica pela escala ----------
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      const sombra = (f = 1) => { const s = escalaAtual(); c.shadowColor = 'rgba(18,8,2,0.55)'; c.shadowBlur = 14 * s * f; c.shadowOffsetX = 6 * s * f; c.shadowOffsetY = 10 * s * f; };
      const semSombra = () => { c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.shadowColor = 'rgba(0,0,0,0)'; };
      function emVolta(x, y, s, giro, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); if (giro) c.rotate(giro); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      // peça que "bate" na mesa: chega um pouco maior e assenta
      const bate = (t, t0, d = 0.22) => (t0 === undefined ? { s: 1, a: 1 } : t < t0 ? { s: 0, a: 0 } : { s: mistura(1.22, 1, sai((t - t0) / d)), a: limita((t - t0) / 0.07) });
      const quadroRet = (x, y, w, h) => { c.beginPath(); c.rect(x, y, w, h); };

      // ---------- caneta vermelha, alfinete, barbante ----------
      function caminhoParcial(pts, prog) {
        if (prog <= 0 || pts.length < 2) return false;
        const seg = []; let tot = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
        let falta = tot * limita(prog);
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length && falta > 0; i++) { const u = Math.min(1, falta / seg[i - 1]); falta -= seg[i - 1]; c.lineTo(mistura(pts[i - 1][0], pts[i][0], u), mistura(pts[i - 1][1], pts[i][1], u)); }
        return true;
      }
      // traço de caneta hidrográfica: duas passadas (a segunda mais fina e escura) dão a tinta desigual
      function caneta(pts, prog, larg = 9, cr = cor('vermelho'), alfa = 0.9) {
        if (!caminhoParcial(pts, prog)) return;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const a0 = c.globalAlpha;
        c.strokeStyle = cr; c.globalAlpha = a0 * alfa * 0.8; c.lineWidth = Math.max(FINO, larg); c.stroke();
        c.globalAlpha = a0 * alfa * 0.5; c.lineWidth = Math.max(FINO, larg * 0.45); c.strokeStyle = Filme.hex(cr, '#000000', 0.25); c.stroke();
        c.globalAlpha = a0;
      }
      // círculo feito à mão com caneta: passa um pouco do começo
      function rodaCaneta(x, y, rx, ry, prog, sem, larg = 8) {
        const pts = [], n = 40;
        for (let i = 0; i <= n; i++) { const a = (-110 + 400 * i / n) * RAD, q = 1 + 0.06 * hs(sem, i >> 3, 3) + 0.04 * (i / n); pts.push([x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q]); }
        caneta(pts, prog, larg);
      }
      function alfinete(x, y, cr = cor('vermelho'), s = 1) {
        if (s <= 0) return;
        const r = 15 * s;
        c.fillStyle = 'rgba(15,6,2,0.45)'; c.beginPath(); c.ellipse(x + r * 0.7, y + r * 0.9, r * 1.05, r * 0.8, 0.5, 0, 7); c.fill();
        c.strokeStyle = '#cfcfcf'; c.lineWidth = Math.max(FINO, 2.5 * s); c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.5, y + r * 0.7); c.stroke();
        const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
        g.addColorStop(0, Filme.hex(cr, '#ffffff', 0.55)); g.addColorStop(0.45, cr); g.addColorStop(1, Filme.hex(cr, '#000000', 0.55));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
      function barbante(x0, y0, x1, y1, prog = 1, larg = 3.2) {
        if (prog <= 0) return;
        const x2 = mistura(x0, x1, prog), y2 = mistura(y0, y1, prog);
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(20,5,2,0.35)'; c.lineWidth = Math.max(FINO, larg * 1.3); c.beginPath(); c.moveTo(x0 + 4, y0 + 6); c.lineTo(x2 + 4, y2 + 6); c.stroke();
        c.strokeStyle = cor('barbante'); c.lineWidth = Math.max(FINO, larg); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x2, y2); c.stroke();
      }
      function fita(x, y, w, h, giro) { // fita adesiva fosca
        c.save(); c.translate(x, y); c.rotate(giro * RAD);
        c.fillStyle = 'rgba(236,228,200,0.72)'; c.beginPath();
        c.moveTo(-w / 2, -h / 2); for (let i = 0; i <= 4; i++) c.lineTo(-w / 2 + 3 * (i % 2), -h / 2 + h * i / 4);
        c.lineTo(w / 2, h / 2); for (let i = 4; i >= 0; i--) c.lineTo(w / 2 - 3 * (i % 2), -h / 2 + h * i / 4);
        c.closePath(); c.fill(); c.restore();
      }

      // ---------- letra de máquina de escrever: monoespaçada (cada letra numa célula igual) ----------
      const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
      const CEL = 0.74, MIOLO = CEL - 0.1;
      const largTexto = (txt, tam) => [...txt].length * CEL * tam;
      // escreve letra a letra; o = { corDe(palavra), contorno, alinha, peso }
      function maquina(txt, x, y, tam, o = {}) {
        const w = largTexto(txt, tam), x0 = o.alinha === 'esquerda' ? x : o.alinha === 'direita' ? x - w : x - w / 2;
        const lw = tam * (o.peso || 0.16);
        const letras = []; let palavra = 0, i = 0;
        for (const ch of txt) {
          if (ch === ' ') { palavra++; i++; continue; }
          const g = glifo(ch), sx = Math.min(1, MIOLO / g.w);
          // máquina de escrever: cada letra bate um fio fora da linha
          letras.push({ g, sx, x: x0 + i * CEL * tam + (CEL * tam - g.w * sx * tam) / 2, y: y + hs(ch.charCodeAt(0), i, 5) * tam * 0.025, palavra, i });
          i++;
        }
        const caminho = (l) => { c.beginPath(); for (const tc of l.g.tracos) tc.forEach(([a, b], j) => { const px = l.x + a * l.sx * tam, py = l.y - tam + b * tam; if (j) c.lineTo(px, py); else c.moveTo(px, py); }); };
        c.lineCap = 'round'; c.lineJoin = 'round';
        if (o.contorno) { c.strokeStyle = '#000000'; c.lineWidth = lw + o.contorno * 2; for (const l of letras) { caminho(l); c.stroke(); } }
        const a0 = c.globalAlpha;
        for (const l of letras) {
          c.strokeStyle = o.corDe ? o.corDe(l.palavra) : cor(o.cor || 'tinta'); c.lineWidth = lw;
          if (!o.contorno) c.globalAlpha = a0 * (0.86 + 0.14 * hs(l.i, 3, 9)); // fita da máquina: tinta desigual
          caminho(l); c.stroke();
        }
        c.globalAlpha = a0;
      }
      // etiqueta: caixa de pergaminho colada com fita, girada -2 graus, texto de máquina
      function etiqueta(txt, x, y, tam, o = {}) {
        const w = largTexto(txt, tam) + tam * 0.9, h = tam * 1.62, giro = (o.giro ?? -2) * RAD;
        c.save(); c.translate(x, y); c.rotate(giro);
        sombra(0.6); c.fillStyle = o.fundo || cor('pergaminho'); c.beginPath();
        c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2 + 1); c.lineTo(w / 2 - 1, h / 2); c.lineTo(-w / 2 + 2, h / 2 - 1); c.closePath(); c.fill(); semSombra();
        if (o.fita !== false) { fita(-w / 2 + 10, -h / 2 + 4, Math.min(90, w * 0.3), 30, -35); fita(w / 2 - 10, -h / 2 + 4, Math.min(90, w * 0.3), 30, 35); }
        const cores = o.cores;
        maquina(txt, 0, tam * 0.5, tam, { corDe: (p) => cor(cores ? cores[Math.min(p, cores.length - 1)] : o.cor || 'tinta'), peso: 0.17 });
        c.restore();
        return { w, h };
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

      // =====================================================================================
      // A MESA (pronta uma vez): madeira, mapa antigo, rotas de caneta, alfinetes, fotos e recortes
      // =====================================================================================
      const ME = H.mesa || {}, DW = ME.largura || 1700, DH = ME.altura || 2700;
      const mesa = novaTela(DW * k, DH * k);
      function desenhaMesa() {
        const g = mesa.getContext('2d'), r = sorteio((H.semente || 1) * 31 + 5), salva = c;
        c = g; g.setTransform(k, 0, 0, k, 0, 0);
        // madeira escura com veios
        g.fillStyle = cor('madeira'); g.fillRect(0, 0, DW, DH);
        for (let i = 0; i < 260; i++) {
          const y = r() * DH, x = r() * DW, cmp = 300 + r() * 900, cl = r() < 0.5;
          g.strokeStyle = cl ? 'rgba(120,70,35,0.22)' : 'rgba(10,4,1,0.30)'; g.lineWidth = 1 + r() * 4;
          g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + cmp * 0.3, y + (r() - 0.5) * 30, x + cmp * 0.6, y + (r() - 0.5) * 30, x + cmp, y + (r() - 0.5) * 20); g.stroke();
        }
        for (let x = 0; x < DW; x += 330) { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, x * 1.6); g.lineTo(DW, x * 1.6 + 10); g.stroke(); }
        // o mapa grande, um pouco torto
        const mx = ME.mapa || [70, 110, DW - 140, DH - 230];
        g.save(); g.translate(DW / 2, DH / 2); g.rotate(0.8 * RAD); g.translate(-DW / 2, -DH / 2);
        sombra(2); g.fillStyle = cor('papelMapa'); g.fillRect(mx[0], mx[1], mx[2], mx[3]); semSombra();
        g.save(); g.beginPath(); g.rect(mx[0], mx[1], mx[2], mx[3]); g.clip();
        // manchas de idade
        for (let i = 0; i < 40; i++) {
          const x = mx[0] + r() * mx[2], y = mx[1] + r() * mx[3], rr = 60 + r() * 260, gr = g.createRadialGradient(x, y, 0, x, y, rr);
          gr.addColorStop(0, `rgba(${r() < 0.5 ? '120,80,35' : '255,240,200'},${0.06 + r() * 0.08})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
        }
        // grade de paralelos e meridianos
        g.strokeStyle = 'rgba(90,55,25,0.28)'; g.lineWidth = 2;
        for (let x = mx[0] + 60; x < mx[0] + mx[2]; x += 170) { g.beginPath(); g.moveTo(x, mx[1]); g.quadraticCurveTo(x + 30, mx[1] + mx[3] / 2, x, mx[1] + mx[3]); g.stroke(); }
        for (let y = mx[1] + 80; y < mx[1] + mx[3]; y += 170) { g.beginPath(); g.moveTo(mx[0], y); g.quadraticCurveTo(mx[0] + mx[2] / 2, y - 25, mx[0] + mx[2], y); g.stroke(); }
        // terras inventadas: manchas de contorno sépia
        for (let i = 0; i < 9; i++) {
          const cx = mx[0] + r() * mx[2], cy = mx[1] + r() * mx[3], rr = 120 + r() * 260, n = 36, pts = [];
          for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, q = 1 + 0.28 * Math.sin(a * 3 + i) + 0.15 * Math.sin(a * 7 + i * 2) + 0.08 * hs(i, j, 4); pts.push([cx + Math.cos(a) * rr * q, cy + Math.sin(a) * rr * q * 0.8]); }
          g.beginPath(); pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
          g.fillStyle = 'rgba(150,110,55,0.18)'; g.fill(); g.strokeStyle = 'rgba(80,45,18,0.55)'; g.lineWidth = 3; g.stroke();
          g.strokeStyle = 'rgba(80,45,18,0.18)'; g.lineWidth = 2; for (let e = 1; e <= 2; e++) { g.save(); g.translate(cx, cy); g.scale(1 + e * 0.06, 1 + e * 0.06); g.translate(-cx, -cy); g.stroke(); g.restore(); }
        }
        // rosa dos ventos
        { const x = mx[0] + mx[2] * 0.82, y = mx[1] + mx[3] * 0.9, rr = 120; g.strokeStyle = 'rgba(80,45,18,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, rr * 0.8, 0, 7); g.stroke();
          for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, q = j % 2 ? 0.55 : 1; g.beginPath(); g.moveTo(x + Math.cos(a) * rr * q, y + Math.sin(a) * rr * q); g.lineTo(x + Math.cos(a + 0.25) * 22, y + Math.sin(a + 0.25) * 22); g.lineTo(x + Math.cos(a - 0.25) * 22, y + Math.sin(a - 0.25) * 22); g.closePath(); g.fillStyle = j % 2 ? 'rgba(80,45,18,0.35)' : 'rgba(80,45,18,0.7)'; g.fill(); } }
        // dobras do papel
        for (const [x0, y0, x1, y1] of [[mx[0] + mx[2] / 2, mx[1], mx[0] + mx[2] / 2, mx[1] + mx[3]], [mx[0], mx[1] + mx[3] / 3, mx[0] + mx[2], mx[1] + mx[3] / 3], [mx[0], mx[1] + mx[3] * 2 / 3, mx[0] + mx[2], mx[1] + mx[3] * 2 / 3]]) {
          g.lineWidth = 6; g.strokeStyle = 'rgba(70,40,15,0.13)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          g.lineWidth = 3; g.strokeStyle = 'rgba(255,245,215,0.22)'; g.beginPath(); g.moveTo(x0 + 4, y0 + 4); g.lineTo(x1 + 4, y1 + 4); g.stroke();
        }
        // marcas de xícara
        for (let i = 0; i < 3; i++) { const x = mx[0] + r() * mx[2], y = mx[1] + r() * mx[3], rr = 70 + r() * 25; g.strokeStyle = 'rgba(95,55,20,0.28)'; g.lineWidth = 5 + r() * 5; g.beginPath(); g.arc(x, y, rr, r() * 2, 5 + r()); g.stroke(); }
        // borda queimada
        const gb = g.createRadialGradient(DW / 2, DH / 2, Math.min(mx[2], mx[3]) * 0.38, DW / 2, DH / 2, Math.max(mx[2], mx[3]) * 0.62);
        gb.addColorStop(0, 'rgba(90,50,15,0)'); gb.addColorStop(1, 'rgba(90,50,15,0.45)'); g.fillStyle = gb; g.fillRect(mx[0], mx[1], mx[2], mx[3]);
        g.restore(); g.restore();
        // rotas de caneta vermelha, alfinetes e barbante (enfeite fixo da mesa)
        for (const rota of ME.rotas || []) caneta(rota, 1, 7, cor('vermelho'), 0.75);
        for (const [x, y, rx, ry] of ME.rodas || []) rodaCaneta(x, y, rx, ry, 1, x | 0, 6);
        const pinos = ME.alfinetes || [];
        for (const [a, b] of ME.barbantes || []) barbante(pinos[a][0], pinos[a][1], pinos[b][0], pinos[b][1]);
        for (const [x, y] of pinos) alfinete(x, y, cor('vermelho'), 1);
        // fotos pequenas e recortes espalhados
        for (const f of ME.fotos || []) fotoPequena(f[0], f[1], f[2], f[3], f[4]);
        for (const f of ME.recortes || []) recorte(f[0], f[1], f[2], f[3], f[4]);
        for (const [x, y, rr, gi] of ME.lupas || []) lupa({ x, y, r: rr, giro: gi });
        for (const [x, y, cm, gi] of ME.lapis || []) lapis(x, y, cm, gi);
        c = salva;
      }
      function lapis(x, y, cm, giro) {
        c.save(); c.translate(x, y); c.rotate(giro * RAD); sombra(0.5);
        c.fillStyle = '#c9902f'; c.fillRect(-cm / 2, -9, cm, 18); semSombra();
        c.fillStyle = '#e8c79a'; c.beginPath(); c.moveTo(cm / 2, -9); c.lineTo(cm / 2 + 40, 0); c.lineTo(cm / 2, 9); c.fill();
        c.fillStyle = '#2a2018'; c.beginPath(); c.moveTo(cm / 2 + 28, -3); c.lineTo(cm / 2 + 40, 0); c.lineTo(cm / 2 + 28, 3); c.fill();
        c.fillStyle = '#9a9a9a'; c.fillRect(-cm / 2 - 4, -9, 22, 18); c.fillStyle = '#c45a5a'; c.fillRect(-cm / 2 - 24, -9, 20, 18);
        c.restore();
      }
      function recorte(x, y, w, h, giro) { // recorte de jornal velho: blocos de linhas cinzas (sem letras)
        c.save(); c.translate(x, y); c.rotate(giro * RAD); sombra(0.7);
        c.fillStyle = cor('jornal'); c.fillRect(-w / 2, -h / 2, w, h); semSombra();
        c.fillStyle = 'rgba(40,30,20,0.55)'; c.fillRect(-w / 2 + 16, -h / 2 + 16, w * 0.75, 14);
        c.fillStyle = 'rgba(60,45,30,0.35)'; c.fillRect(-w / 2 + 16, -h / 2 + 44, w * 0.45, h * 0.35);
        for (let yy = -h / 2 + 50; yy < h / 2 - 14; yy += 13) { const x0 = yy < -h / 2 + 44 + h * 0.35 ? -w / 2 + 26 + w * 0.45 : -w / 2 + 16; c.fillStyle = 'rgba(60,45,30,0.3)'; c.fillRect(x0, yy, (w / 2 - 16 - x0) * (0.7 + 0.3 * ((yy | 0) % 3) / 2), 5); }
        c.restore();
      }
      function fotoPequena(x, y, w, giro, tipo) {
        const h = w * 1.15;
        c.save(); c.translate(x, y); c.rotate(giro * RAD); sombra(0.8);
        c.fillStyle = cor('moldura'); c.fillRect(-w / 2, -h / 2, w, h); semSombra();
        const iw = w - 20, ih = w - 20;
        c.save(); c.translate(-w / 2 + 10, -h / 2 + 10); c.beginPath(); c.rect(0, 0, iw, ih); c.clip();
        desenhos[tipo || 'paisagem'](iw, ih, 0, { sem: (x | 0) + (y | 0) });
        c.restore(); c.restore();
      }

      // =====================================================================================
      // DESENHOS DENTRO DAS FOTOS (w x h = área da imagem, origem no canto de cima)
      // =====================================================================================
      const tomSepia = (w, h, q = 0.22) => { c.fillStyle = `rgba(120,78,35,${q})`; c.fillRect(0, 0, w, h); };
      function ceu(w, h, cores, ate = 1) {
        const g = c.createLinearGradient(0, 0, 0, h * ate); cores.forEach((cr, i) => g.addColorStop(i / (cores.length - 1), cr));
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      }
      function serra(w, y, alt, cr, sem, n = 9) {
        c.fillStyle = cr; c.beginPath(); c.moveTo(-10, y + 40);
        for (let i = 0; i <= n; i++) c.lineTo(w * i / n, y - alt * (0.4 + 0.6 * (0.5 + 0.5 * hs(sem, i, 2))));
        c.lineTo(w + 10, y + 40); c.lineTo(w + 10, y + 4000); c.lineTo(-10, y + 4000); c.closePath(); c.fill();
      }
      function nuvens(w, y, sem, cr = 'rgba(255,240,215,0.35)') {
        c.fillStyle = cr;
        for (let i = 0; i < 6; i++) { const x = (0.1 + 0.16 * i + 0.05 * hs(sem, i, 1)) * w, yy = y * (1 + 0.3 * hs(sem, i, 2)); c.beginPath(); c.ellipse(x, yy, w * 0.12, w * 0.03, 0, 0, 7); c.fill(); }
      }
      // gorro mongol: aba de pele virada para cima e copa de feltro com ponta curta (nada de chapéu cônico de palha)
      function gorro(x, y, r, copa, pele, botao) {
        c.fillStyle = copa; c.beginPath(); c.moveTo(x - r * 0.95, y); c.quadraticCurveTo(x - r * 0.9, y - r * 1.05, x, y - r * 1.45); c.quadraticCurveTo(x + r * 0.9, y - r * 1.05, x + r * 0.95, y); c.closePath(); c.fill();
        c.fillStyle = pele; c.beginPath(); c.moveTo(x - r * 1.18, y + r * 0.22);
        for (let i = 0; i <= 10; i++) c.lineTo(x - r * 1.22 + r * 2.44 * i / 10, y - r * (i % 2 ? 0.30 : 0.42));
        c.lineTo(x + r * 1.18, y + r * 0.22); c.closePath(); c.fill();
        c.fillStyle = botao; c.beginPath(); c.arc(x, y - r * 1.5, r * 0.13, 0, 7); c.fill();
      }
      const desenhos = {
        paisagem(w, h, t, o) { ceu(w, h, ['#b89a70', '#e0c79c']); serra(w, h * 0.55, h * 0.25, '#7d6548', o.sem); serra(w, h * 0.72, h * 0.1, '#5d4a32', o.sem + 3); tomSepia(w, h, 0.25); },
        planicie(w, h) {
          ceu(w, h, ['#a98e68', '#d9c39a', '#cdb48a'], 0.42);
          nuvens(w, h * 0.12, 4, 'rgba(250,236,205,0.4)');
          serra(w, h * 0.33, h * 0.07, '#9a8260', 11, 14);
          const g = c.createLinearGradient(0, h * 0.33, 0, h); g.addColorStop(0, '#8f7a55'); g.addColorStop(1, '#5c4a30');
          c.fillStyle = g; c.fillRect(0, h * 0.33, w, h);
          tomSepia(w, h, 0.12);
        },
        khan(w, h) {
          ceu(w, h, ['#3f5a68', '#7a8a86', '#d8a56a', '#e9c28a'], 0.7);
          nuvens(w, h * 0.16, 7, 'rgba(240,225,200,0.35)'); nuvens(w, h * 0.3, 9, 'rgba(255,215,160,0.25)');
          serra(w, h * 0.62, h * 0.08, '#5d6470', 21, 8);
          // morro de capim
          const g = c.createLinearGradient(0, h * 0.78, 0, h); g.addColorStop(0, '#6f7a3c'); g.addColorStop(1, '#39421f');
          c.fillStyle = g; c.beginPath(); c.moveTo(-10, h * 0.9); c.quadraticCurveTo(w * 0.5, h * 0.74, w + 10, h * 0.88); c.lineTo(w + 10, h + 10); c.lineTo(-10, h + 10); c.fill();
          c.save(); c.scale(w, w); // de agora em diante: unidades da largura
          const cav = '#4a2c1a', cavE = '#2c190e', pele = '#c08a5a', deel = '#2f4a6a', ouro = '#d9a640';
          // cavalo de lado, virado para a direita
          c.fillStyle = cav;
          c.beginPath(); c.ellipse(0.5, 0.80, 0.22, 0.09, 0, 0, 7); c.fill();
          c.beginPath(); c.moveTo(0.62, 0.74); c.lineTo(0.70, 0.64); c.lineTo(0.76, 0.58); c.lineTo(0.81, 0.58); c.lineTo(0.80, 0.64); c.lineTo(0.74, 0.74); c.lineTo(0.70, 0.86); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(0.77, 0.57); c.lineTo(0.84, 0.59); c.lineTo(0.905, 0.665); c.lineTo(0.885, 0.69); c.lineTo(0.80, 0.655); c.lineTo(0.765, 0.62); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(0.785, 0.58); c.lineTo(0.79, 0.53); c.lineTo(0.81, 0.585); c.fill();
          c.lineCap = 'round'; c.strokeStyle = cav;
          for (const [x0, y0, x1, y1] of [[0.66, 0.84, 0.68, 1.05], [0.61, 0.85, 0.585, 1.04], [0.36, 0.83, 0.335, 1.05], [0.43, 0.85, 0.44, 1.04]]) { c.lineWidth = 0.032; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
          c.strokeStyle = cavE; c.lineWidth = 0.045; c.beginPath(); c.moveTo(0.29, 0.76); c.quadraticCurveTo(0.22, 0.84, 0.245, 0.96); c.stroke();
          c.lineWidth = 0.03; c.beginPath(); c.moveTo(0.76, 0.585); c.lineTo(0.69, 0.66); c.lineTo(0.645, 0.72); c.stroke();
          // luz da tarde no lombo
          c.strokeStyle = 'rgba(240,170,90,0.35)'; c.lineWidth = 0.012; c.beginPath(); c.ellipse(0.5, 0.80, 0.21, 0.08, 0, Math.PI * 1.1, Math.PI * 1.85); c.stroke();
          // cavaleiro: deel azul que fecha na diagonal, faixa laranja, bota, braço nas rédeas
          c.fillStyle = deel; c.beginPath(); c.moveTo(0.41, 0.72); c.lineTo(0.60, 0.72); c.lineTo(0.575, 0.87); c.lineTo(0.47, 0.86); c.closePath(); c.fill();
          c.fillStyle = '#1b1410'; c.beginPath(); c.ellipse(0.53, 0.885, 0.035, 0.02, 0.2, 0, 7); c.fill();
          c.fillStyle = deel; c.beginPath(); c.moveTo(0.445, 0.735); c.lineTo(0.585, 0.735); c.lineTo(0.565, 0.56); c.lineTo(0.465, 0.56); c.closePath(); c.fill();
          c.strokeStyle = ouro; c.lineWidth = 0.012; c.beginPath(); c.moveTo(0.505, 0.565); c.lineTo(0.565, 0.62); c.lineTo(0.575, 0.73); c.stroke();
          c.fillStyle = '#c8722a'; c.fillRect(0.445, 0.675, 0.14, 0.022);
          c.strokeStyle = deel; c.lineWidth = 0.034; c.beginPath(); c.moveTo(0.55, 0.58); c.lineTo(0.6, 0.64); c.lineTo(0.655, 0.665); c.stroke();
          c.fillStyle = pele; c.beginPath(); c.arc(0.66, 0.667, 0.014, 0, 7); c.fill();
          c.strokeStyle = '#1b1410'; c.lineWidth = 0.004; c.beginPath(); c.moveTo(0.66, 0.667); c.lineTo(0.78, 0.62); c.stroke();
          // cabeça de perfil, bigode fino e comprido caído
          c.fillStyle = pele; c.beginPath(); c.arc(0.515, 0.505, 0.038, 0, 7); c.fill();
          c.fillStyle = '#1b1410'; c.beginPath(); c.arc(0.536, 0.497, 0.0045, 0, 7); c.fill();
          c.strokeStyle = '#1b1410'; c.lineWidth = 0.005; c.beginPath(); c.moveTo(0.538, 0.522); c.quadraticCurveTo(0.548, 0.54, 0.545, 0.575); c.stroke();
          c.beginPath(); c.moveTo(0.53, 0.524); c.quadraticCurveTo(0.528, 0.545, 0.522, 0.57); c.stroke();
          gorro(0.512, 0.478, 0.045, '#7a2a22', '#6b4a2c', ouro);
          c.restore();
          // fim de tarde quente por cima de tudo
          const gl = c.createRadialGradient(w * 0.8, h * 0.55, 0, w * 0.8, h * 0.55, w * 0.8); gl.addColorStop(0, 'rgba(255,190,110,0.22)'); gl.addColorStop(1, 'rgba(255,190,110,0)');
          c.fillStyle = gl; c.fillRect(0, 0, w, h); tomSepia(w, h, 0.1);
        },
        escavacao(w, h, t, o) {
          ceu(w, h, ['#3a2a40', '#8a4a40', '#e08a4a', '#f0b070'], 0.34);
          serra(w, h * 0.32, h * 0.08, '#3a2a30', 31, 10);
          const g = c.createLinearGradient(0, h * 0.3, 0, h); g.addColorStop(0, '#6a4a30'); g.addColorStop(1, '#3a2618');
          c.fillStyle = g; c.fillRect(0, h * 0.31, w, h);
          // grade de barbante branco do sítio arqueológico
          c.strokeStyle = 'rgba(235,225,200,0.55)'; c.lineWidth = Math.max(FINO, 2);
          for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(w * i / 5, h * 0.4); c.lineTo(w * (0.5 + (i / 5 - 0.5) * 1.3), h); c.stroke(); }
          for (const y of [0.5, 0.66, 0.85]) { c.beginPath(); c.moveTo(0, h * y); c.lineTo(w, h * y); c.stroke(); }
          for (const [rx, ry] of o.tumulos.pos) {
            const x = rx * w, y = ry * h, rr = w * 0.13;
            c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(x, y, rr * 1.15, rr * 0.55, 0, 0, 7); c.fill();
            c.fillStyle = '#24160d'; c.beginPath(); c.ellipse(x, y + 3, rr * 0.9, rr * 0.38, 0, 0, 7); c.fill();
            c.strokeStyle = 'rgba(225,210,180,0.55)'; c.lineWidth = Math.max(FINO, 4); c.lineCap = 'round'; // ossos claros, só traços
            c.beginPath(); c.moveTo(x - rr * 0.5, y); c.lineTo(x + rr * 0.35, y + 4); c.stroke();
            c.beginPath(); c.arc(x + rr * 0.5, y + 2, rr * 0.1, 0, 7); c.stroke();
            for (let q = 0; q < 6; q++) { c.fillStyle = '#9a8a72'; c.beginPath(); c.ellipse(x + rr * 1.1 * Math.cos(q), y + rr * 0.52 * Math.sin(q), 7, 5, 0, 0, 7); c.fill(); }
          }
          tomSepia(w, h, 0.08);
        },
        laboratorio(w, h) { // bancada vista de cima: microscópio e bandeja, com a hélice acesa
          ceu(w, h, ['#3a4048', '#22262c']);
          c.fillStyle = '#5a6068'; c.fillRect(w * 0.1, h * 0.55, w * 0.8, h * 0.3);
          c.fillStyle = '#c9d4dc'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(w * (0.2 + i * 0.12), h * 0.7, w * 0.035, 0, 7); c.fill(); }
          c.strokeStyle = '#6ab0ff'; c.lineWidth = Math.max(FINO, 5); for (let i = 0; i < 2; i++) { c.beginPath(); for (let y = 0; y <= 1; y += 0.05) { const x = w * 0.5 + Math.sin(y * 9 + i * Math.PI) * w * 0.12; if (y) c.lineTo(x, h * (0.1 + y * 0.38)); else c.moveTo(x, h * 0.1); } c.stroke(); }
          tomSepia(w, h, 0.12);
        },
      };

      // pessoa pequena vista de longe, de cima (só ombros e cabeça), em tons de foto velha
      function gente(x, y, u, sem, cinza = 0, acesa = 0) {
        const r = sorteio(sem * 31 + 7), pega = (l) => l[Math.floor(r() * l.length)];
        const G = H.gente, tg = (h) => Filme.hex(Filme.hex(h, '#c8b48e', cinza * 0.8), cor('vermelhoVivo'), acesa);
        const roupa = tg(pega(G.roupas)), pele = tg(pega(G.peles)), cabelo = tg(pega(G.cabelos));
        c.fillStyle = roupa; c.beginPath(); c.moveTo(x - u * 0.32, y); c.quadraticCurveTo(x - u * 0.3, y - u * 0.5, x, y - u * 0.52); c.quadraticCurveTo(x + u * 0.3, y - u * 0.5, x + u * 0.32, y); c.closePath(); c.fill();
        c.fillStyle = pele; c.beginPath(); c.arc(x, y - u * 0.66, u * 0.15, 0, 7); c.fill();
        if (r() > 0.15) { c.fillStyle = cabelo; c.beginPath(); c.arc(x, y - u * 0.7, u * 0.15, Math.PI * 1.02, Math.PI * 1.98); c.fill(); }
      }

      // =====================================================================================
      // AS PEÇAS
      // =====================================================================================
      const some = (p, t) => (p.some ? 1 - tr(t, p.some, p.some + 0.25) : 1);
      // foto instantânea: moldura branca (embaixo mais larga), sombra, fita ou alfinete, desenho dentro
      function foto(p, t) {
        const b = bate(t, p.t); if (b.a <= 0) return;
        const w = p.l, h = p.a, bo = p.borda || 24, bb = p.bordaBaixo || 78, a0 = c.globalAlpha;
        if (p.brilho && t >= p.brilho.t) { // a luz da luminária acende atrás da foto do herói
          const u = sai(tr(t, p.brilho.t, p.brilho.t + 0.5)), rr = Math.max(w, h) * (0.6 + 0.15 * u);
          const gl = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr); gl.addColorStop(0, `rgba(255,200,120,${0.55 * u})`); gl.addColorStop(1, 'rgba(255,200,120,0)');
          c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gl; c.fillRect(p.x - rr, p.y - rr, 2 * rr, 2 * rr); c.restore();
        }
        c.globalAlpha = a0 * b.a * some(p, t);
        emVolta(p.x, p.y, b.s, (p.giro || 0) * RAD, () => {
          sombra(1.2); c.fillStyle = cor('moldura'); c.fillRect(p.x - w / 2, p.y - h / 2, w, h); semSombra();
          const iw = w - 2 * bo, ih = h - bo - bb;
          c.save(); c.translate(p.x - w / 2 + bo, p.y - h / 2 + bo); c.beginPath(); c.rect(0, 0, iw, ih); c.clip();
          desenhos[p.desenho](iw, ih, t, p);
          // vinheta da foto e brilho do papel fotográfico
          const gv = c.createRadialGradient(iw / 2, ih / 2, Math.min(iw, ih) * 0.3, iw / 2, ih / 2, Math.max(iw, ih) * 0.75);
          gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(1, 'rgba(25,12,4,0.45)'); c.fillStyle = gv; c.fillRect(0, 0, iw, ih);
          c.restore();
          if (p.tumulos && p.tumulos.borda !== undefined) p.tumulos.pos.forEach(([rx, ry], n) => { // círculos de caneta em volta de cada túmulo
            const t0 = p.tumulos.borda + n * 0.12, x = p.x - w / 2 + bo + rx * iw, y = p.y - h / 2 + bo + ry * ih;
            rodaCaneta(x, y, iw * 0.17, iw * 0.09, sai(tr(t, t0, t0 + 0.3)), 900 + n, 8);
          });
          if (p.fita !== false) { fita(p.x - w * 0.3, p.y - h / 2 + 4, 120, 36, -8); fita(p.x + w * 0.32, p.y - h / 2 + 2, 110, 34, 10); }
        });
        c.globalAlpha = a0;
      }

      const M = 260; // sobra fora da tela
      const PECAS = {
        mesa(p) {
          c.save();
          if (p.borrado) c.drawImage(mesaBorrada, L / 2 - p.x, A / 2 - p.y, DW, DH); else c.drawImage(mesa, L / 2 - p.x, A / 2 - p.y, DW, DH);
          const esc = p.escuro ?? ME.escuro ?? 0; // a mesa fica na penumbra: só a luminária clareia
          if (esc) { c.fillStyle = `rgba(14,7,3,${esc})`; c.fillRect(-M, -M, L + 2 * M, A + 2 * M); }
          c.restore();
        },
        foto,
        rotulo(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.3), b = p.sobe ? { s: 1, a: limita(u * 2) } : bate(t, p.t, 0.2), dy = p.sobe ? (1 - sai(u)) * 50 : 0;
          const a0 = c.globalAlpha; c.globalAlpha = a0 * b.a * some(p, t);
          let w = 0;
          emVolta(p.x, p.y, b.s, 0, () => { w = etiqueta(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, giro: p.giro, fundo: p.fundo ? cor(p.fundo) : null }).w; });
          if (p.risco && t >= p.risco.de) { // risco de caneta vermelha atravessando a etiqueta
            const g = (p.giro ?? -2) * RAD, cx = p.x, cy = p.y + dy, hw = w / 2 + 14;
            const pts = [[-hw, 8], [-hw * 0.3, 2], [hw * 0.4, -3], [hw, -9]].map(([x, y]) => [cx + x * Math.cos(g) - y * Math.sin(g), cy + x * Math.sin(g) + y * Math.cos(g)]);
            caneta(pts, sai(tr(t, p.risco.de, p.risco.ate)), p.tam * 0.16, cor('vermelho'), 0.95);
          }
          c.globalAlpha = a0;
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = tr(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2)), b = bate(t, p.de, 0.2);
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v)).padStart(milhar(p.valor).length, ' ');
          const a0 = c.globalAlpha; c.globalAlpha = a0 * b.a * some(p, t);
          const s = b.s * (u >= 1 ? 1 + 0.06 * (1 - tr(t, p.ate, p.ate + 0.3)) : 1);
          emVolta(p.x, p.y, s, 0, () => etiqueta(txt, p.x, p.y, p.tam, { cor: p.cor }));
          c.globalAlpha = a0;
        },
        alfinete(p, t) { if (t < p.t) return; alfinete(p.x, p.y, cor(p.cor || 'vermelho'), mistura(1.6, 1, sai(tr(t, p.t, p.t + 0.15)))); },
        multidao(p, t) {
          if (t < p.de) return;
          const ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.5) : 0, quem = [];
          p.linhas.forEach((ln, j) => { const x0 = p.x - (p.colunas - 1) * ln.dx / 2 + (j % 2 ? ln.dx * 0.25 : -ln.dx * 0.2); for (let i = 0; i < p.colunas; i++) quem.push({ x: x0 + i * ln.dx + hs(j, i, 5) * ln.dx * 0.15, y: ln.y + hs(j, i, 6) * 6, u: ln.tam }); });
          const n = quem.length, a0 = c.globalAlpha;
          quem.forEach((b, i) => { const t0 = p.de + (p.ate - p.de) * (i / n), s = Math.max(0, passa(tr(t, t0, t0 + 0.25))); if (s > 0) emVolta(b.x, b.y, s, 0, () => gente(b.x, b.y, b.u, 500 + i, ap)); });
          if (p.liga && t >= p.liga.de) quem.forEach((b, i) => { // barbante vermelho de cada cabeça até um alfinete
            const atraso = (Math.floor(i / p.colunas)) * 0.05;
            c.globalAlpha = a0 * 0.85; barbante(b.x, b.y - b.u * 0.66, p.liga.para[0], p.liga.para[1], sai(tr(t, p.liga.de + atraso, p.liga.ate)), 2.2);
          });
          c.globalAlpha = a0;
        },
        folha(p, t) { // folha datilografada (só linhas, sem letras) presa com fita
          const b = bate(t, p.t); if (b.a <= 0) return;
          const a0 = c.globalAlpha; c.globalAlpha = a0 * b.a;
          emVolta(p.x, p.y, b.s, (p.giro || 0) * RAD, () => {
            const x = p.x - p.l / 2, y = p.y - p.a / 2;
            sombra(1); c.fillStyle = cor('folha'); c.fillRect(x, y, p.l, p.a); semSombra();
            for (let i = 0; i < (p.linhas || 0); i++) { const yy = y + p.a * 0.2 + i * 34; if (yy > y + p.a - 40) break; c.fillStyle = 'rgba(40,30,22,0.28)'; c.fillRect(x + 60, yy, (p.l - 120) * (0.55 + 0.45 * (0.5 + 0.5 * hs(i, 2, 3))), 7); }
            fita(x + 30, y + 6, 120, 36, -30); fita(x + p.l - 30, y + 6, 120, 36, 30);
          });
          c.globalAlpha = a0;
        },
        tubos(p, t) { // tubos de ensaio deitados numa bandeja de madeira (vistos de cima)
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.62, h = p.tam;
          const bb = bate(t, p.de, 0.2), a0 = c.globalAlpha;
          c.globalAlpha = a0 * bb.a;
          sombra(0.9); c.fillStyle = cor('bandeja'); c.fillRect(x0 - p.dx * 0.7, p.y - h * 0.62, (p.n - 1) * p.dx + p.dx * 1.4, h * 1.24); semSombra();
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x0 - p.dx * 0.55, p.y - h * 0.52, (p.n - 1) * p.dx + p.dx * 1.1, h * 1.04);
          c.globalAlpha = a0;
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, b = bate(t, t0, 0.18);
            if (b.a <= 0) continue;
            const cheio = p.enche && i === p.enche.i ? sai(tr(t, p.enche.t, p.enche.t + 0.4)) : 0;
            c.globalAlpha = a0 * b.a;
            emVolta(x, p.y, b.s, 0, () => {
              if (cheio > 0) { const gl = c.createRadialGradient(x, p.y, 0, x, p.y, h * 0.8); gl.addColorStop(0, `rgba(255,90,70,${0.5 * cheio})`); gl.addColorStop(1, 'rgba(255,90,70,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gl; c.fillRect(x - h, p.y - h, 2 * h, 2 * h); c.restore(); }
              const forma = () => { c.beginPath(); c.moveTo(x - w / 2, p.y - h / 2); c.lineTo(x + w / 2, p.y - h / 2); c.lineTo(x + w / 2, p.y + h / 2 - w / 2); c.arc(x, p.y + h / 2 - w / 2, w / 2, 0, Math.PI); c.closePath(); };
              sombra(0.5); forma(); c.fillStyle = 'rgba(220,235,240,0.35)'; c.fill(); semSombra();
              const nivel = mistura(0.35, 0.9, cheio), crL = cheio > 0 ? Filme.hex(H.gente.liquidos[i % H.gente.liquidos.length], cor('vermelhoVivo'), cheio) : H.gente.liquidos[i % H.gente.liquidos.length];
              c.save(); forma(); c.clip(); c.fillStyle = crL; c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h); c.restore();
              forma(); c.strokeStyle = 'rgba(240,250,255,0.75)'; c.lineWidth = Math.max(FINO, 3); c.stroke();
              c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = Math.max(FINO, 3); c.beginPath(); c.moveTo(x - w * 0.22, p.y - h * 0.4); c.lineTo(x - w * 0.22, p.y + h * 0.3); c.stroke();
              c.fillStyle = i === (p.enche || {}).i && cheio > 0 ? cor('vermelho') : '#3a3530'; c.fillRect(x - w / 2 - 5, p.y - h / 2 - 14, w + 10, 20);
            });
          }
          c.globalAlpha = a0;
        },
        retratos(p, t) { // 12 fotinhos 3x4 presas na mesa; uma ganha círculo de caneta
          if (t < p.de) return;
          const n = p.colunas * p.linhas.length, a0 = c.globalAlpha;
          const ac = p.acende ? tr(t, p.acende.t, p.acende.t + 0.25) : 0;
          for (let i = 0; i < n; i++) {
            const x = p.x - (p.colunas - 1) * p.dx / 2 + (i % p.colunas) * p.dx, y = p.linhas[Math.floor(i / p.colunas)];
            const b = bate(t, p.de + (p.ate - p.de) * i / n, 0.18); if (b.a <= 0) continue;
            const eu = p.acende && i === p.acende.i, giro = hs(i, 1, 2) * 4 * RAD;
            c.globalAlpha = a0 * b.a;
            emVolta(x, y, b.s * (eu ? 1 + 0.08 * ac : 1), giro, () => {
              if (eu && ac > 0) { const gl = c.createRadialGradient(x, y, 0, x, y, p.l * 1.1); gl.addColorStop(0, `rgba(255,190,110,${0.6 * ac})`); gl.addColorStop(1, 'rgba(255,190,110,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gl; c.fillRect(x - p.l * 1.2, y - p.l * 1.2, p.l * 2.4, p.l * 2.4); c.restore(); }
              sombra(0.7); c.fillStyle = cor('moldura'); c.fillRect(x - p.l / 2, y - p.a / 2, p.l, p.a); semSombra();
              const iw = p.l - 20, ih = p.a - 44;
              c.save(); c.translate(x - p.l / 2 + 10, y - p.a / 2 + 10); c.beginPath(); c.rect(0, 0, iw, ih); c.clip();
              const apaga = p.acende && t >= p.acende.t && !eu ? 0.5 : 0;
              ceu(iw, ih, [Filme.hex('#b49a74', '#cfc2a8', apaga), Filme.hex('#8a7254', '#b8ab92', apaga)]);
              gente(iw / 2, ih + 4, ih * 0.95, 700 + i, apaga, eu ? 0.55 * ac : 0);
              c.restore();
            });
            if (eu && ac > 0) { c.globalAlpha = a0; rodaCaneta(x, y, p.l * 0.72, p.a * 0.66, sai(tr(t, p.acende.t, p.acende.t + 0.35)), 77, 9); alfinete(x + p.l * 0.3, y - p.a / 2 + 4, cor('vermelho'), mistura(1.6, 1, sai(tr(t, p.acende.t, p.acende.t + 0.15)))); }
          }
          c.globalAlpha = a0;
        },
        mapa(p, t) { // mapa de pergaminho num painel: contorno, região, império que cresce do alfinete
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1, a0 = c.globalAlpha;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? suave(tr(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          const pa = p.painel, b = bate(t, p.contorno.de, 0.25);
          c.globalAlpha = a0 * b.a;
          emVolta(p.x, p.y, b.s, -1 * RAD, () => {
            sombra(1.5); c.fillStyle = cor('marMapa'); c.fillRect(pa.x, pa.y, pa.l, pa.a); semSombra();
            c.save(); quadroRet(pa.x, pa.y, pa.l, pa.a); c.clip();
            const terras = [T.eurasia, ...(T.outras || [])].map((r) => r.map(pj));
            const pc = sai(tr(t, p.contorno.de, p.contorno.ate));
            c.globalAlpha = a0 * tr(t, p.contorno.de + 0.25, p.contorno.ate + 0.2);
            for (const r of terras) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = cor('terraMapa'); c.fill(); }
            c.globalAlpha = a0;
            for (const r of terras) if (caminhoParcial([...r, r[0]], pc)) { c.strokeStyle = cor('tintaMapa'); c.lineWidth = 3.5; c.lineJoin = 'round'; c.stroke(); }
            const forma = (pts) => { c.beginPath(); pts.map(pj).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
            const im = p.imperio ? tr(t, p.imperio.de, p.imperio.de + 0.4) : 0;
            if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste, hachurada a caneta
              const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
              const xc = mistura(xb + 10, xa - 10, sai(tr(t, p.regiao.de, p.regiao.ate)));
              c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
              c.globalAlpha = a0 * (1 - 0.7 * im);
              forma(T.regiao); c.fillStyle = 'rgba(200,16,46,0.22)'; c.fill();
              c.save(); forma(T.regiao); c.clip(); c.strokeStyle = 'rgba(200,16,46,0.55)'; c.lineWidth = 3;
              for (let x = xa - 200; x < xb + 200; x += 16) { c.beginPath(); c.moveTo(x, pj([0, 60])[1]); c.lineTo(x + 120, pj([0, 30])[1]); c.stroke(); }
              c.restore();
              forma(T.regiao); c.strokeStyle = cor('vermelho'); c.lineWidth = 5; c.stroke();
              c.restore();
              if (p.aneis && t >= p.aneis.t) { // pontinhos de caneta que pipocam dentro da região
                const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]), passo = p.aneis.passo;
                c.save(); forma(T.regiao); c.clip(); let i = 0;
                for (let lat = la + passo / 2; lat < lb; lat += passo * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? passo / 2 : 0); lon < Math.max(...lo); lon += passo) {
                  const [x, y] = pj([lon, lat]), s = Math.max(0, passa(tr(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, p.aneis.t + (Math.max(...lo) - lon) * 0.004 + 0.25)));
                  if (s <= 0) continue;
                  c.globalAlpha = a0 * (1 - 0.7 * im); c.beginPath(); c.arc(x, y, 6 * s, 0, 7); c.fillStyle = cor('vermelho'); c.fill();
                }
                c.restore(); c.globalAlpha = a0;
              }
            }
            if (p.imperio && t >= p.imperio.de) { // o império cresce de um ponto, com setas de caneta
              const [px, py] = pj(p.imperio.ponto), u = sai(tr(t, p.imperio.de, p.imperio.ate));
              c.save(); c.beginPath(); c.arc(px, py, 20 + u * 650, 0, 7); c.clip();
              forma(T.imperio); c.fillStyle = 'rgba(200,16,46,0.30)'; c.fill(); c.strokeStyle = cor('vermelho'); c.lineWidth = 6; c.setLineDash([]); c.stroke();
              c.restore();
              (p.imperio.setas || []).forEach(([lon, lat], i) => {
                const [qx, qy] = pj([lon, lat]), t0 = p.imperio.de + 0.1 + i * 0.12, pr = sai(tr(t, t0, t0 + 0.6));
                if (pr <= 0) return;
                const mx = (px + qx) / 2 + (qy - py) * 0.18, my = (py + qy) / 2 - (qx - px) * 0.18, pts = [];
                for (let j = 0; j <= 16; j++) { const s = j / 16; pts.push([(1 - s) * (1 - s) * px + 2 * s * (1 - s) * mx + s * s * qx, (1 - s) * (1 - s) * py + 2 * s * (1 - s) * my + s * s * qy]); }
                caneta(pts, pr, 5, cor('vermelho'), 0.9);
                if (pr >= 1) { const [ax, ay] = pts[16], [bx, by] = pts[13], an = Math.atan2(ay - by, ax - bx); caneta([[ax + Math.cos(an + 2.6) * 22, ay + Math.sin(an + 2.6) * 22], [ax, ay], [ax + Math.cos(an - 2.6) * 22, ay + Math.sin(an - 2.6) * 22]], 1, 5, cor('vermelho'), 0.9); }
              });
            }
            c.restore();
            if (p.imperio && t >= p.imperio.pulsa) { // alfinete que pulsa
              const [px, py] = pj(p.imperio.ponto), fase = ((t - p.imperio.pulsa) / 0.6) % 1;
              c.strokeStyle = cor('vermelho'); c.lineWidth = 4; c.globalAlpha = a0 * (1 - fase); c.beginPath(); c.arc(px, py, 14 + fase * 46, 0, 7); c.stroke(); c.globalAlpha = a0;
              alfinete(px, py, cor('vermelho'), mistura(1.6, 1, sai(tr(t, p.imperio.pulsa, p.imperio.pulsa + 0.15))));
            }
          });
          c.restore(); c.globalAlpha = a0;
        },
        cartao(p, t) { // cartão de pergaminho (fundo das barras)
          const b = bate(t, p.t); if (b.a <= 0) return;
          const a0 = c.globalAlpha; c.globalAlpha = a0 * b.a;
          emVolta(p.x, p.y, b.s, (p.giro || 0) * RAD, () => { sombra(1.2); c.fillStyle = cor('pergaminho'); c.fillRect(p.x - p.l / 2, p.y - p.a / 2, p.l, p.a); semSombra(); fita(p.x - p.l / 2 + 20, p.y - p.a / 2 + 8, 110, 34, -35); fita(p.x + p.l / 2 - 20, p.y - p.a / 2 + 8, 110, 34, 35); });
          c.globalAlpha = a0;
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo;
            if (t < t0) return;
            const u = sai(tr(t, t0, t0 + p.dur)), D = it.cor === 'vermelho';
            maquina(it.nome, p.x - 22, y + 15, 34, { alinha: 'direita', cor: D ? 'vermelho' : 'tinta' });
            const w = Math.max(8, p.larg * it.v / p.maximo * u);
            // barra pintada a caneta: retângulo cheio com traço por cima
            c.save(); c.fillStyle = D ? cor('vermelho') : cor('barra'); c.globalAlpha *= D ? 0.92 : 0.8;
            c.beginPath(); c.moveTo(p.x, y - p.alt / 2 + 2); c.lineTo(p.x + w, y - p.alt / 2); c.lineTo(p.x + w - 2, y + p.alt / 2); c.lineTo(p.x + 1, y + p.alt / 2 - 1); c.closePath(); c.fill();
            c.restore();
            if (tr(t, t0 + p.dur * 0.6, t0 + p.dur) > 0) maquina(it.valor, p.x + w + 20, y + 15, 34, { alinha: 'esquerda', cor: D ? 'vermelho' : 'tinta' });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; if (t >= t1) maquina(p.unidade, p.x + p.larg / 2 - 40, p.y + p.itens.length * p.passo + 6, 30, { cor: 'tinta' }); }
        },
        pasta(p, t) { // pasta de arquivo parda, fechada, com aba
          const b = bate(t, p.t); if (b.a <= 0) return;
          const a0 = c.globalAlpha; c.globalAlpha = a0 * b.a;
          emVolta(p.x, p.y, b.s, (p.giro || 0) * RAD, () => {
            const x = p.x - p.l / 2, y = p.y - p.a / 2;
            sombra(1.4); c.fillStyle = cor('pastaEscura'); c.beginPath(); c.moveTo(x + 40, y - 56); c.lineTo(x + 330, y - 56); c.lineTo(x + 370, y + 4); c.lineTo(x + 40, y + 4); c.closePath(); c.fill();
            c.fillStyle = cor('pasta'); c.fillRect(x, y, p.l, p.a); semSombra();
            c.strokeStyle = 'rgba(90,60,25,0.35)'; c.lineWidth = 3; c.strokeRect(x + 14, y + 14, p.l - 28, p.a - 28);
            c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x, y, p.l, p.a * 0.08);
            c.strokeStyle = 'rgba(120,20,20,0.5)'; c.lineWidth = Math.max(FINO, 3); c.beginPath(); c.arc(x + p.l - 80, y + p.a / 2, 18, 0, 7); c.stroke(); // ilhós e cordão
            c.beginPath(); c.moveTo(x + p.l - 80, y + p.a / 2); c.bezierCurveTo(x + p.l - 30, y + p.a / 2 + 60, x + p.l - 120, y + p.a / 2 + 120, x + p.l - 60, y + p.a / 2 + 170); c.stroke();
          });
          c.globalAlpha = a0;
        },
        lupa(p) { lupa(p); },
        xicara(p) { // xícara de chá vista de cima, no pires
          c.save(); sombra(1); c.fillStyle = '#e8e0d0'; c.beginPath(); c.arc(p.x, p.y, p.r * 1.45, 0, 7); c.fill(); semSombra();
          c.fillStyle = '#f4efe4'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
          c.strokeStyle = '#f4efe4'; c.lineWidth = 16; c.beginPath(); c.arc(p.x + p.r * 1.05, p.y, p.r * 0.35, -1.2, 1.2); c.stroke();
          const g = c.createRadialGradient(p.x - p.r * 0.2, p.y - p.r * 0.2, 0, p.x, p.y, p.r * 0.85); g.addColorStop(0, '#9a5a24'); g.addColorStop(1, '#4a2410');
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * 0.84, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,230,180,0.35)'; c.beginPath(); c.ellipse(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.25, p.r * 0.1, -0.6, 0, 7); c.fill();
          c.restore();
        },
        carimbo(p, t) { // carimbo vermelho que bate torto; na virada desbota e leva um risco
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.16), s = mistura(1.8, 1, sai(u)), ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.25) : 0;
          const giro = p.giro * RAD, w = largTexto(p.texto, p.tam) + p.tam * 1.0, h = p.tam * 1.9, a0 = c.globalAlpha;
          c.globalAlpha = a0 * limita(u * 2.5) * (1 - 0.6 * ap);
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          const cr = cor('carimbo');
          c.strokeStyle = cr; c.lineJoin = 'round';
          c.lineWidth = 10; c.strokeRect(-w / 2, -h / 2, w, h); c.lineWidth = 4; c.strokeRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32);
          maquina(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr, peso: 0.19 });
          // tinta falhada: furinhos da cor do papel
          c.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 70; i++) { c.globalAlpha = 0.5 + 0.5 * hs(i, 3, 1) * hs(i, 4, 2); c.beginPath(); c.arc(hs(i, 1, 7) * w / 2, hs(i, 2, 8) * h / 2, 3 + 4 * Math.abs(hs(i, 5, 9)), 0, 7); c.fill(); }
          c.globalCompositeOperation = 'source-over';
          c.restore();
          c.globalAlpha = a0;
          if (p.risco && t >= p.risco.de) {
            const hw = w / 2 + 30, pts = [[-hw, 14], [-hw * 0.2, 3], [hw * 0.5, -6], [hw, -16]].map(([x, y]) => [p.x + x * Math.cos(giro) - y * Math.sin(giro), p.y + x * Math.sin(giro) + y * Math.cos(giro)]);
            caneta(pts, sai(tr(t, p.risco.de, p.risco.ate)), 18, cor('vermelho'), 0.95);
          }
        },
        helice(p, t) { // hélice de DNA dourada que sobe do túmulo e se divide em dois caminhos
          if (t < p.de) return;
          const n = 22, u = sai(tr(t, p.de, p.ate)), giro = t * 2.6, a0 = c.globalAlpha;
          c.save(); c.globalCompositeOperation = 'lighter';
          const ym = (p.y0 + p.y1) / 2, ry = Math.abs(p.y0 - p.y1) / 2 + 60; // brilho oval (sem borda reta)
          c.translate(p.x, ym); c.scale(1, ry / 150);
          const gl = c.createRadialGradient(0, 0, 0, 0, 0, 150); gl.addColorStop(0, `rgba(255,200,110,${0.32 * u})`); gl.addColorStop(1, 'rgba(255,190,90,0)');
          c.fillStyle = gl; c.fillRect(-150, -150, 300, 300);
          c.restore();
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5); if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 58, fr = Math.cos(f);
            c.globalAlpha = a0 * vis * 0.8; c.strokeStyle = cor('ouroClaro'); c.lineWidth = Math.max(FINO, 3); c.beginPath(); c.moveTo(p.x - ax, y); c.lineTo(p.x + ax, y); c.stroke();
            for (const [sx, prof] of [[ax, fr], [-ax, -fr]]) { c.globalAlpha = a0 * vis; c.fillStyle = prof > 0 ? cor('ouroClaro') : cor('ouro'); c.beginPath(); c.arc(p.x + sx, y, 7 + 3 * (prof + 1) / 2, 0, 7); c.fill(); }
          }
          c.globalAlpha = a0;
          if (p.divide && t >= p.divide) {
            const v = tr(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'vermelho', m = 14, pts = [];
              for (let i = 0; i <= m; i++) { const q = i / m; pts.push([mistura(p.x, r.x, q), mistura(p.y1, r.y + 40, q) - Math.sin(q * Math.PI) * 40]); }
              if (D) caneta(pts, sai(v), 9, cor('vermelho'), 0.95); else { c.globalAlpha = a0 * 0.6; caneta(pts, sai(v), 6, cor('apagado'), 0.8); c.globalAlpha = a0; }
              if (v >= 1) {
                const b = bate(t, p.divide + p.durDivide, 0.2);
                c.globalAlpha = a0 * b.a * (D ? 1 : 0.75);
                emVolta(r.x, r.y, b.s, 0, () => etiqueta(r.rotulo, r.x, r.y, r.tam || 38, { cor: D ? 'vermelho' : 'apagado', fundo: D ? null : cor('pergaminhoApagado') }));
                c.globalAlpha = a0;
              }
            }
          }
        },
        arvore(p, t) { // árvore de família em caneta vermelha: a raiz em cima, os descendentes em fotinhos
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, r: p.raizTam / 2 }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, r: nv.tam / 2 }))); }
          const passo = (p.ate - p.de) / p.niveis.length, a0 = c.globalAlpha;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(tr(t, t0, t0 + passo * 0.8)), pais = nos[l - 1], filhos = nos[l], por = filhos.length / pais.length;
            filhos.forEach((f, j) => { const pai = pais[Math.floor(j / por)], ym = (pai.y + pai.r + f.y - f.r) / 2; caneta([[pai.x, pai.y + pai.r * 0.9], [pai.x, ym], [f.x, ym], [f.x, f.y - f.r * 0.9]], pr, Math.max(4, 8 - l), cor('vermelho'), 0.85); });
            filhos.forEach((f, j) => {
              const b = bate(t, t0 + passo * 0.5 + j * 0.02, 0.18); if (b.a <= 0) return;
              c.globalAlpha = a0 * b.a;
              emVolta(f.x, f.y, b.s, hs(l, j, 3) * 5 * RAD, () => medalhao(f.x, f.y, f.r, 300 + l * 37 + j, {}));
              c.globalAlpha = a0;
            });
          }
        },
        raiz(p, t) { // a foto de cima: o khan, que vira só contorno com "?"
          if (t < p.t) return;
          const b = bate(t, p.t, 0.25), cont = p.contorno ? tr(t, p.contorno, p.contorno + 0.3) : 0, a0 = c.globalAlpha;
          const gl = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.tam * 1.1); gl.addColorStop(0, `rgba(255,200,120,${0.5 * (1 - cont)})`); gl.addColorStop(1, 'rgba(255,200,120,0)');
          c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gl; c.fillRect(p.x - p.tam * 1.2, p.y - p.tam * 1.2, p.tam * 2.4, p.tam * 2.4); c.restore();
          c.globalAlpha = a0 * b.a;
          emVolta(p.x, p.y, b.s, 0, () => medalhao(p.x, p.y, p.tam / 2, 11, { khan: true, vazio: cont }));
          c.globalAlpha = a0;
          if (p.interroga && t >= p.interroga) { // "?" a caneta no lugar do rosto
            const pr = sai(tr(t, p.interroga + 0.05, p.interroga + 0.45)), s = p.tam * 0.36, x = p.x, y = p.y - s * 0.3, pts = [];
            for (let i = 0; i <= 14; i++) { const a = (-170 + 240 * i / 14) * RAD; pts.push([x + Math.cos(a) * s * 0.5, y - s * 0.3 + Math.sin(a) * s * 0.5]); }
            pts.push([x, y + s * 0.55]);
            caneta(pts, pr, 14, cor('vermelho'), 0.95);
            if (pr >= 1) { c.fillStyle = cor('vermelho'); c.beginPath(); c.arc(x, y + s * 0.95, 9, 0, 7); c.fill(); }
          }
        },
      };
      for (const cn of H.cenas) for (const p of cn.pecas) if (!PECAS[p.tipo]) throw new Error('Peça sem desenho no motor: ' + p.tipo);

      function lupa(p) { // lupa de cobre deitada na mesa: aumenta o que está embaixo (só um brilho, sem copiar a tela)
        c.save(); c.translate(p.x, p.y); c.rotate((p.giro || 0) * RAD);
        sombra(1.2); c.fillStyle = '#3a2416'; c.fillRect(p.r * 0.95, -16, p.r * 1.5, 32); semSombra();
        c.fillStyle = '#b8783a'; c.fillRect(p.r * 0.92, -10, 40, 20);
        sombra(1); c.strokeStyle = '#b8783a'; c.lineWidth = 16; c.beginPath(); c.arc(0, 0, p.r, 0, 7); c.stroke(); semSombra();
        const g = c.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 0, 0, 0, p.r); g.addColorStop(0, 'rgba(255,250,235,0.32)'); g.addColorStop(0.7, 'rgba(255,240,210,0.08)'); g.addColorStop(1, 'rgba(60,40,20,0.2)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r - 6, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, p.r * 0.75, 3.6, 4.4); c.stroke();
        c.restore();
      }
      // medalhão: foto oval numa moldura de papel, com um busto dentro
      function medalhao(x, y, r, sem, o) {
        sombra(0.6); c.fillStyle = cor('moldura'); c.beginPath(); c.ellipse(x, y, r * 1.12, r * 1.25, 0, 0, 7); c.fill(); semSombra();
        c.save(); c.beginPath(); c.ellipse(x, y, r * 0.95, r * 1.08, 0, 0, 7); c.clip();
        const a0 = c.globalAlpha;
        c.globalAlpha = a0 * (1 - (o.vazio || 0));
        const g = c.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, o.khan ? '#c99a5a' : '#b49a74'); g.addColorStop(1, o.khan ? '#7a5230' : '#7d6548');
        c.fillStyle = g; c.fillRect(x - r, y - r * 1.2, 2 * r, 2.4 * r);
        if (o.khan) bustoKhan(x, y + r * 0.15, r * 0.95); else gente(x, y + r * 1.1, r * 1.9, sem);
        c.globalAlpha = a0;
        if (o.vazio) { c.fillStyle = `rgba(232,220,195,${o.vazio})`; c.fillRect(x - r, y - r * 1.2, 2 * r, 2.4 * r); }
        c.restore();
        if (o.vazio) { c.strokeStyle = cor('tinta'); c.lineWidth = Math.max(FINO, 3); c.setLineDash([10, 8]); c.globalAlpha *= o.vazio; c.beginPath(); c.ellipse(x, y, r * 0.95, r * 1.08, 0, 0, 7); c.stroke(); c.setLineDash([]); c.globalAlpha /= o.vazio; }
      }
      // busto do khan de frente: deel com gola na diagonal, bigode caído, barbicha, gorro de pele
      function bustoKhan(x, y, r) {
        const deel = '#2f4a6a', pele = '#c08a5a';
        c.fillStyle = deel; c.beginPath(); c.moveTo(x - r * 0.95, y + r * 1.2); c.quadraticCurveTo(x - r * 0.9, y + r * 0.35, x, y + r * 0.3); c.quadraticCurveTo(x + r * 0.9, y + r * 0.35, x + r * 0.95, y + r * 1.2); c.closePath(); c.fill();
        c.strokeStyle = '#d9a640'; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(x - r * 0.15, y + r * 0.32); c.lineTo(x + r * 0.35, y + r * 0.75); c.lineTo(x + r * 0.4, y + r * 1.2); c.stroke();
        c.fillStyle = pele; c.fillRect(x - r * 0.12, y + r * 0.1, r * 0.24, r * 0.25);
        c.beginPath(); c.ellipse(x, y - r * 0.12, r * 0.3, r * 0.36, 0, 0, 7); c.fill();
        c.fillStyle = '#1b1410'; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r * 0.11, y - r * 0.16, r * 0.03, 0, 7); c.fill(); }
        c.strokeStyle = '#1b1410'; c.lineWidth = r * 0.035; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - r * 0.02, y + r * 0.02); c.quadraticCurveTo(x - r * 0.14, y + r * 0.04, x - r * 0.17, y + r * 0.2); c.stroke();
        c.beginPath(); c.moveTo(x + r * 0.02, y + r * 0.02); c.quadraticCurveTo(x + r * 0.14, y + r * 0.04, x + r * 0.17, y + r * 0.2); c.stroke();
        c.beginPath(); c.moveTo(x, y + r * 0.12); c.lineTo(x, y + r * 0.24); c.stroke();
        gorro(x, y - r * 0.38, r * 0.36, '#7a2a22', '#6b4a2c', '#d9a640');
      }

      // ---------- camada pronta: mesa borrada e escura (fundo do mapa), vinheta, grão ----------
      desenhaMesa();
      const mesaBorrada = novaTela(DW * k, DH * k);
      { const g = mesaBorrada.getContext('2d'); g.filter = `blur(${Math.max(1, 14 * k)}px) brightness(0.6)`; g.drawImage(mesa, 0, 0); g.filter = 'none'; }
      const vinheta = novaTela(largura * 2, altura * 2); // o dobro da tela: o centro vai para onde está a luminária
      { const g = vinheta.getContext('2d'), gr = g.createRadialGradient(largura, altura, largura * 0.22, largura, altura, altura * 0.6);
        gr.addColorStop(0, 'rgba(40,18,4,0.05)'); gr.addColorStop(0.45, 'rgba(30,12,3,0.42)'); gr.addColorStop(1, 'rgba(10,4,1,0.9)');
        g.fillStyle = gr; g.fillRect(0, 0, largura * 2, altura * 2); }
      const GR = 256, grao = novaTela(GR, GR);
      { const g = grao.getContext('2d'), r = sorteio((H.semente || 1) * 7 + 3), img = g.createImageData(GR, GR);
        for (let i = 0; i < GR * GR; i++) { const v = r() < 0.5 ? 0 : 255, a = Math.floor(r() * 26); img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = a; }
        g.putImageData(img, 0, 0); }
      const camada = novaTela(largura, altura), cc = camada.getContext('2d');

      // ---------- câmera: deriva lenta (aproxima e anda de lado), tremor na virada ----------
      function camera(cn, i, t, q) {
        const C = cn.camera || {}, u = limita((t - cn.de) / Math.max(0.5, cn.ate - cn.de)), lado = (C.lado ?? (i % 2 ? -1 : 1));
        const z = mistura(C.z0 ?? 1.02, C.z1 ?? 1.12, suave(u));
        let dx = lado * (u - 0.5) * (C.pan ?? 50), dy = (u - 0.5) * (C.panY ?? 0);
        for (const tm of H.tremores || []) {
          const q0 = Math.round(tm.t * fps);
          if (q >= q0 && q < q0 + tm.quadros) { const s = sorteio((H.semente || 1) * 1000 + q), f = tm.forca * (1 - (q - q0) / tm.quadros); dx += (s() * 2 - 1) * f; dy += (s() * 2 - 1) * f; }
        }
        return { z, dx, dy };
      }

      // ---------- cenas: fusão de 0,4 s (ou corte seco) ----------
      const CENAS = H.cenas;
      const cenaEm = (t) => { let i = 0; CENAS.forEach((cn, j) => { if (t >= cn.de) i = j; }); return i; };
      function desenhaCena(i, t, q) {
        const cn = CENAS[i], cam = camera(cn, i, t, q);
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        c.translate(L / 2 + cam.dx, A / 2 + cam.dy); c.scale(cam.z, cam.z); c.translate(-L / 2, -A / 2);
        cn.pecas.forEach((p) => { c.save(); PECAS[p.tipo](p, t); c.restore(); });
        // luz da luminária: poça quente onde a cena pede, o resto cai no escuro
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        const lz = cn.luz || [540, 800];
        c.save(); c.globalCompositeOperation = 'lighter';
        const gl = c.createRadialGradient(lz[0] * k, lz[1] * k, 0, lz[0] * k, lz[1] * k, 700 * k); gl.addColorStop(0, 'rgba(255,170,80,0.16)'); gl.addColorStop(1, 'rgba(255,170,80,0)');
        c.fillStyle = gl; c.fillRect(0, 0, largura, altura); c.restore();
        c.drawImage(vinheta, lz[0] * k - largura, lz[1] * k - altura);
      }

      // ---------- legendas: o cartão inteiro de uma vez, a palavra falada em vermelho ----------
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
        const tam = lg.tam, passoL = tam * 1.4, n = lg.linhas.length, yb = LG.y || 1640;
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yb - (n - 1 - li) * passoL, base = idx;
          maquina(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('legendaFalada') : '#ffffff'), contorno: LG.contorno ?? 8, peso: 0.15 });
          idx += ln.length;
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c = c1; c.reset();
        const q = Math.round(t * fps), i = cenaEm(t), cn = CENAS[i];
        const dis = i > 0 && !cn.corte ? (cn.fusao ?? 0.4) : 0;
        if (dis > 0 && t < cn.de + dis) {
          desenhaCena(i - 1, t, q);
          c = cc; c.reset(); desenhaCena(i, t, q); c = c1;
          c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = suave((t - cn.de) / dis); c.drawImage(camada, 0, 0); c.globalAlpha = 1;
        } else desenhaCena(i, t, q);
        // grão fino, que muda a cada quadro (deslocamento sorteado pelo número do quadro)
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        const ox = Math.floor((hs(q, 1, 3) * 0.5 + 0.5) * GR), oy = Math.floor((hs(q, 2, 4) * 0.5 + 0.5) * GR);
        c.save(); c.translate(-ox, -oy); c.fillStyle = c.createPattern(grao, 'repeat'); c.fillRect(0, 0, largura + GR, altura + GR); c.restore();
        // clarão de luminária na batida: por baixo da legenda (nunca cobre o texto)
        for (const f of H.claroes || []) {
          const u = trecho(t, f.t, f.t + f.dur);
          if (t >= f.t && u < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (f.forca ?? 0.4) * (1 - u); c.fillStyle = '#ffcf8a'; c.fillRect(0, 0, tela.width, tela.height); c.restore(); }
        }
        legenda(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: flauta soprada em pentatônica sobre cítara grave lenta, tambores e efeitos ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [];
        // até onde uma nota pode soar: para no começo do corte (nota que atravessa o corte é encurtada)
        const limite = (tt, d) => { for (const [a, b] of corta) { if (tt >= a - 0.02 && tt < b) return 0; if (tt < a && tt + d > a) return a - tt; } return d; };
        const col = 60 / (MU.bpm || 80);
        // cítara grave: uma corda a cada 2 tempos, nota longa
        for (let b = 0, tt = 0.1; tt < duracao - 0.6; b++, tt += col * 2) {
          const d = limite(tt, col * 3.5); if (d <= 0.05) continue;
          s.corda(MU.baixos[b % MU.baixos.length], tt, d, { vol: MU.baixo ?? 0.3, maciez: 0.75, pan: -0.15 });
          if (b % 2 === 1) { const d2 = limite(tt + col, col * 1.6); if (d2 > 0.05) s.corda(MU.quintas[Math.floor(b / 2) % MU.quintas.length], tt + col, d2, { vol: (MU.baixo ?? 0.3) * 0.55, maciez: 0.6, pan: 0.15 }); }
        }
        // flauta: frases com respiração (sopro de ar no começo de cada nota)
        let tt = MU.flautaDe ?? 0.6;
        for (const [nota, tempos] of MU.flauta || []) {
          const d0 = tempos * col;
          if (nota) {
            const d = limite(tt, d0 + 0.25);
            if (d > 0.08) {
              const corteNaNota = d < d0 + 0.25;
              s.nota(nota, tt, Math.max(0.05, d - (corteNaNota ? 0.03 : 0.25)), { vol: MU.vol ?? 0.07, forma: 'seno', ataque: 0.09, solta: corteNaNota ? 0.03 : 0.25, vibrato: 0.006, vibratoHz: 5, pan: 0.1 });
              s.nota(nota, tt, Math.max(0.05, d - (corteNaNota ? 0.03 : 0.25)), { vol: (MU.vol ?? 0.07) * 0.18, forma: 'tri', ataque: 0.12, solta: corteNaNota ? 0.03 : 0.25, pan: 0.1 });
              s.vento(tt, Math.min(0.3, d), { vol: 0.012, corte: 5500, onda: 2, entra: 0.03, sai: 0.2 });
            }
          }
          tt += d0;
          if (tt > duracao - 0.6) break;
        }
        // foto ou etiqueta batendo na mesa: papel + pancadinha na madeira
        const bateMesa = (tt, v = 0.06) => { s.toque(tt, { vol: v, corte: 2600, dur: 0.05, pan: (r() - 0.5) * 0.5 }); s.batida(tt, { vol: v * 1.4, freq: 140, dur: 0.07 }); };
        const canetaSom = (tt, d) => { s.vento(tt, d, { vol: 0.03, corte: 6500, onda: 7, profundidade: 0.8, entra: 0.02, sai: 0.05 }); };
        const pinoSom = (tt) => s.toque(tt, { vol: 0.07, corte: 5000, dur: 0.02 });
        for (const cn of H.cenas) {
          if (cn.de > 0) s.vento(cn.de - 0.05, 0.5, { vol: cn.corte ? 0.0 : 0.04, corte: 1800, onda: 1, entra: 0.2, sai: 0.25 }); // fusão: papel deslizando
          for (const p of cn.pecas) {
            if (p.t !== undefined && ['foto', 'rotulo', 'folha', 'pasta', 'cartao'].includes(p.tipo) && !(p.sobe)) bateMesa(p.t, p.tipo === 'rotulo' ? 0.045 : 0.07);
            if (p.tipo === 'rotulo' && p.sobe) s.toque(p.t, { vol: 0.035, corte: 3500, dur: 0.05 });
            if (p.tipo === 'rotulo' && p.risco) canetaSom(p.risco.de, p.risco.ate - p.risco.de);
            if (p.tipo === 'alfinete') pinoSom(p.t);
            if (p.tipo === 'contador') bateMesa(p.de, 0.05);
            if (p.tipo === 'multidao' || p.tipo === 'retratos' || p.tipo === 'tubos') { const n = p.tipo === 'retratos' ? p.colunas * p.linhas.length : p.tipo === 'tubos' ? p.n : 0; if (n) for (let i = 0; i < n; i++) bateMesa(p.de + (p.ate - p.de) * i / n, 0.03); else for (let tt2 = p.de; tt2 < p.ate; tt2 += 0.1) s.toque(tt2, { vol: 0.02, corte: 2200, dur: 0.04 }); }
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.04, corte: 4500, onda: 1, entra: 0.2, sai: 0.3 });
            if (p.tipo === 'retratos' && p.acende) { canetaSom(p.acende.t, 0.35); pinoSom(p.acende.t); }
            if (p.tipo === 'foto' && p.tumulos && p.tumulos.borda !== undefined) p.tumulos.pos.forEach((_, n) => canetaSom(p.tumulos.borda + n * 0.12, 0.3));
            if (p.tipo === 'barras') p.itens.forEach((_, i) => canetaSom(p.t + i * 0.12, p.dur * 0.8));
            if (p.tipo === 'mapa') { canetaSom(p.contorno.de, p.contorno.ate - p.contorno.de); canetaSom(p.regiao.de, p.regiao.ate - p.regiao.de); pinoSom(p.imperio.pulsa); (p.imperio.setas || []).forEach((_, i) => canetaSom(p.imperio.de + 0.1 + i * 0.12, 0.5)); s.vento(p.sobe.t, p.sobe.dur, { vol: 0.03, corte: 1500, onda: 1, entra: 0.2, sai: 0.2 }); }
            if (p.tipo === 'helice') for (let t2 = p.de; t2 < p.ate; t2 += 0.1) s.pio(t2, { freq: 1600 + r() * 600, vol: 0.012, repete: 1, dur: 0.04 });
            if (p.tipo === 'helice' && p.divide) canetaSom(p.divide, p.durDivide);
            if (p.tipo === 'arvore') for (let l = 0; l < p.niveis.length; l++) canetaSom(p.de + l * (p.ate - p.de) / p.niveis.length, 0.25);
            if (p.tipo === 'raiz' && p.interroga) canetaSom(p.interroga + 0.05, 0.4);
          }
        }
        // tique-tique de máquina de escrever sob o contador
        if (SO.tiques) for (let t2 = SO.tiques[0]; t2 < SO.tiques[1]; t2 += 0.1) { s.toque(t2, { vol: 0.05, corte: 5200, dur: 0.018, pan: (r() - 0.5) * 0.4 }); s.batida(t2, { vol: 0.03, freq: 420, dur: 0.03 }); }
        // tambores graves (gancho, virada, revelação) e o carimbo
        for (const [t2, v] of SO.tambores || []) { s.batida(t2, { vol: v, freq: 52, dur: 0.7 }); s.batida(t2 + 0.01, { vol: v * 0.4, freq: 95, dur: 0.25 }); s.toque(t2, { vol: v * 0.15, corte: 1200, dur: 0.08 }); }
        if (SO.carimbo !== undefined) { s.batida(SO.carimbo, { vol: 0.3, freq: 90, dur: 0.15 }); s.toque(SO.carimbo, { vol: 0.12, corte: 1800, dur: 0.06 }); }
        for (const t2 of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, t2 + i * 0.05, 0.9, { vol: 0.045, pan: (i - 1) * 0.3, brilho: 1.3 }));
        for (const [t2, d] of SO.subidas || []) { s.vento(t2, d, { vol: 0.09, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(t2, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.03 }); }
        if (SO.arranhao !== undefined) {
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.11 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.08 });
          s.vento(a, 0.3, { vol: 0.17, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
        }
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.045, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.22);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
