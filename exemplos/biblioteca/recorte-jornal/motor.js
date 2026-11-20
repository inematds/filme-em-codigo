// MOTOR "recorte-jornal" — explicativo em colagem de recortes de papel: tiras de papel rasgado (borda
// com fibra clara e sombra macia), "fotos" de arquivo recortadas e impressas em meio-tom (pontinhos),
// fita adesiva, risco de marcador, rótulos em caixinhas de papel creme tortas, grão de risografia e
// textura de jornal por cima. Paleta de jornal: creme, preto e um vermelho vivo.
// Câmera: pan e zoom lentos em cada cena (o lado troca a cada cena); as bordas "fervem" de leve
// (8 vezes por segundo); cada cena nova entra deslizando da direita, inclinada, com sombra.
// Duas camadas: a COLAGEM (cenário e fotos, que levam o pan e o zoom) e os PAINÉIS (rótulos, mapa,
// barras, pasta), que ficam parados na tela. O tremor da virada mexe as duas.
// Jeito de animar: camadas-planas (canvas 2D), com letras em traços (letras.js).
// Este arquivo sabe DESENHAR as peças. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180;
  // peças que ficam na camada de PAINÉIS (sem pan nem zoom); o resto é colagem
  const SOBRE = new Set(['texto', 'contador', 'janela', 'tubos', 'fila', 'mapa', 'barras', 'pasta', 'carimbo']);

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const TELA = tela.getContext('2d');
      let c = TELA; // o pincel atual (troca para a tela pequena do fundo desfocado)
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const PA = H.papel || {};
      const FERVE = PA.ferve ?? 0.9;            // quanto a borda mexe a cada passo (px de desenho)
      const PASSOS = PA.passos ?? 8;            // a borda ferve 8 vezes por segundo
      const RASGO = PA.rasgo ?? 7;              // quanto a borda rasgada entra e sai
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.5; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const tr = (t, a, b) => trecho(t, a, b);
      const pop = (t, t0, d = 0.3) => (t < t0 ? 0 : Math.max(0, passa((t - t0) / d)));
      let B = 0; // passo da borda que ferve (8 por segundo)

      // ---------- sorteio fixo por peça (sem memória): número de -1 a 1 ----------
      const hs = (a, b, d) => {
        let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263) ^ Math.imul((d | 0) + 13, 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
        return (h >>> 0) / 2147483648 - 1;
      };
      const semDe = (txt) => { let h = 7; for (const ch of String(txt)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return Math.abs(h) % 100000; };

      // ---------- sombra macia: o shadowBlur é em pixels da TELA, então multiplica pela escala ----------
      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      const SOMBRA = PA.sombra || { x: 4, y: 8, borrao: 14, cor: 'rgba(20,12,6,0.42)' };
      const sombra = (f = 1, S = SOMBRA) => { const s = escalaAtual(); c.shadowColor = S.cor; c.shadowBlur = S.borrao * s * f; c.shadowOffsetX = S.x * s * f; c.shadowOffsetY = S.y * s * f; };
      const semSombra = () => { c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- papel rasgado ----------
      // a borda é cortada em pedacinhos de ~26 px que entram e saem (fixo por peça) e fervem um fio
      function rasga(pts, sem, rasgo, fecha = true) {
        const out = [], n = pts.length, m = fecha ? n : n - 1;
        for (let i = 0; i < m; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], d = Math.hypot(x1 - x0, y1 - y0) || 1;
          const nx = -(y1 - y0) / d, ny = (x1 - x0) / d, q = Math.max(1, Math.round(d / 26));
          for (let j = 0; j < q; j++) {
            const u = j / q, o = hs(sem, i * 131 + j, 5) * rasgo * (j % 2 ? 1 : 0.55) + hs(sem, i * 131 + j, 7000 + B) * FERVE;
            out.push([mistura(x0, x1, u) + nx * o, mistura(y0, y1, u) + ny * o]);
          }
        }
        if (!fecha) out.push(pts[n - 1]);
        return out;
      }
      const caminho = (pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
      // o = { rasgo, fibra (borda clara de papel rasgado), sombra, sombraF, trama (meio-tom por cima), borda, lb }
      function papel(pts, cr, sem, o = {}) {
        const rg = o.rasgo ?? RASGO;
        const P1 = rasga(pts, sem, rg);
        if (o.fibra !== false && rg > 2) {
          if (o.sombra !== false) sombra(o.sombraF || 1);
          caminho(P1); c.fillStyle = cor('fibra'); c.fill();
          c.strokeStyle = cor('fibra'); c.lineWidth = 5; c.lineJoin = 'round'; c.stroke(); semSombra();
          caminho(rasga(pts, sem + 333, rg * 0.85)); c.fillStyle = cr; c.fill();
        } else {
          if (o.sombra !== false) sombra(o.sombraF || 1);
          caminho(P1); c.fillStyle = cr; c.fill(); semSombra();
        }
        if (o.trama) { c.fillStyle = TRAMA[Math.max(0, Math.min(TRAMA.length - 1, o.trama - 1))]; c.fill(); }
        if (o.borda) { c.strokeStyle = cor(o.borda); c.lineWidth = o.lb || 4; c.lineJoin = 'round'; c.stroke(); }
      }
      function circ(x, y, rx, ry = rx) {
        const n = Math.max(12, Math.min(40, Math.round(Math.max(rx, ry) / 6))), pts = [];
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
        return pts;
      }
      const ret = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      function retRedondo(x, y, w, h, r) {
        const pts = [];
        for (const [cx, cy, a0] of [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]])
          for (let i = 0; i <= 4; i++) { const a = (a0 + i * 22.5) * RAD; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
        return pts;
      }
      // estrela rasgada (o "brilho" de papel)
      function estrela(x, y, r1, r2, n, cr, sem, giro = 0) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) { const a = giro + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        papel(pts, cr, sem, { rasgo: 5 });
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
      // faixa de papel grossa (galho, tira) de (x0,y0) a (x1,y1)
      function tira(x0, y0, x1, y1, larg, cr, sem, prog = 1, o = {}) {
        if (prog <= 0) return;
        const x2 = mistura(x0, x1, prog), y2 = mistura(y0, y1, prog), d = Math.hypot(x2 - x0, y2 - y0) || 1;
        const nx = -(y2 - y0) / d * larg / 2, ny = (x2 - x0) / d * larg / 2;
        papel([[x0 + nx, y0 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x0 - nx, y0 - ny]], cr, sem, { rasgo: 2, fibra: false, ...o });
      }
      // risco de marcador: traço grosso com estrias, que corre de (x0,y0) a (x1,y1)
      function marcador(x0, y0, x1, y1, larg, cr, sem, prog) {
        if (prog <= 0) return;
        const pts = []; const n = 10;
        for (let i = 0; i <= n; i++) { const u = (i / n) * prog; pts.push([mistura(x0, x1, u), mistura(y0, y1, u) + hs(sem, i, 3) * larg * 0.12]); }
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.globalAlpha *= 0.92; c.strokeStyle = cor(cr); c.lineWidth = larg; polilinha(pts, 1);
        c.globalAlpha /= 0.92;
        // estrias mais escuras do marcador
        c.strokeStyle = Filme.hex(cor(cr), '#000000', 0.25); c.lineWidth = Math.max(1, larg * 0.08);
        for (const f of [-0.3, 0.05, 0.32]) polilinha(pts.map(([x, y]) => [x, y + f * larg]), 1);
      }

      // ---------- meio-tom de fundo (padrão de pontos para o papel do cenário) ----------
      const TRAMA = [0.18, 0.3, 0.42, 0.55].map((r) => {
        const T = novaTela(12, 12), g = T.getContext('2d');
        g.fillStyle = 'rgba(17,14,12,0.5)';
        for (const [x, y] of [[3, 3], [9, 9], [-3, 9], [15, 3], [3, 15], [9, -3]]) { g.beginPath(); g.arc(x, y, 6 * r, 0, 7); g.fill(); }
        return c.createPattern(T, 'repeat');
      });

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
      function traco(g, x, y, tam) {
        c.beginPath();
        for (const t of g.tracos) t.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (px de borda preta), sombra, tabular }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.17;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'tinta'));
        if (o.sombra) { c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = lw + (o.contorno || 0) * 2; for (const l of letras) { traco(l.g, l.x + o.sombra, y + o.sombra, tam); c.stroke(); } }
        if (o.contorno) { c.strokeStyle = cor('tinta'); c.lineWidth = lw + o.contorno * 2; for (const l of letras) { traco(l.g, l.x, y, tam); c.stroke(); } }
        for (const l of letras) { c.strokeStyle = corDe(l.palavra); c.lineWidth = lw; traco(l.g, l.x, y, tam); c.stroke(); }
      }
      // rótulo: letras pretas numa caixinha de papel creme, girada -1,5 grau, com sombra macia
      function rotulo(txt, x, y, tam, o = {}) {
        const w = largTexto(txt, tam, o.tabular), wc = o.largCaixa || w;
        const cx = o.alinha === 'esquerda' ? x + w / 2 : o.alinha === 'direita' ? x - w / 2 : x, cy = y - tam / 2;
        c.save(); c.translate(cx, cy); c.rotate((o.giro ?? -1.5) * RAD); c.translate(-cx, -cy);
        if (o.caixa !== false) {
          const px = tam * 0.42, py = tam * 0.36;
          papel(ret(cx - wc / 2 - px, y - tam - py, wc + 2 * px, tam + 2 * py), cor(o.fundo || 'caixa'), semDe(txt) + 11, { rasgo: 1.2, fibra: false, sombraF: o.sombraF ?? 0.8 });
        }
        escreve(txt, x, y, tam, { cor: o.cor, cores: o.cores, alinha: o.alinha, tabular: o.tabular });
        c.restore();
      }

      // ---------- confere as letras ao montar: letra que falta dá erro ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confereLetras() {
        const textos = (H.legendas || []).map((l) => l.texto);
        const varre = (o) => {
          if (Array.isArray(o)) { o.forEach(varre); return; }
          if (!o || typeof o !== 'object') return;
          for (const [ch, v] of Object.entries(o)) {
            if (typeof v === 'string' && ['texto', 'titulo', 'unidade', 'rotulo', 'nome', 'valor'].includes(ch)) textos.push(v);
            else if (typeof v === 'object') varre(v);
          }
          if (o.tipo === 'contador') textos.push(milhar(o.valor));
        };
        varre(H.cenas);
        textos.push('?');
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- "fotos" de arquivo: desenhadas uma vez em cor, depois impressas em meio-tom ----------
      const BO = H.bonecos;
      const ESC = k * 1.15;                       // resolução das fotos (um pouco acima da tela, por causa do zoom)
      const CEL = Math.max(3, Math.round((PA.celula ?? 6) * ESC)); // célula do meio-tom: nunca menor que 3 px
      const RGB = (n) => Filme.rgb(cor(n));
      const ehVermelho = (r, g, b) => r > 1.9 * Math.max(g, b) + 20;
      function meioTom(G, o) {
        const W = G.width, Hh = G.height, gg = G.getContext('2d');
        const d = gg.getImageData(0, 0, W, Hh).data;
        // base: o papel da foto (creme) e, onde a foto é vermelha, o vermelho chapado
        const base = new ImageData(W, Hh), bd = base.data, fotoC = RGB('foto'), verm = RGB('acento');
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3]; if (a < 8) continue;
          const v = ehVermelho(d[i], d[i + 1], d[i + 2]) ? verm : fotoC;
          bd[i] = v[0]; bd[i + 1] = v[1]; bd[i + 2] = v[2]; bd[i + 3] = a;
        }
        const BA = novaTela(W, Hh); BA.getContext('2d').putImageData(base, 0, 0);
        // pontos de tinta: raio pela escuridão da célula (num grade em quincôncio)
        const PT = novaTela(W, Hh), pg = PT.getContext('2d'); pg.fillStyle = cor('tinta');
        const lum = (j) => (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) / 255;
        for (let lin = 0, y = CEL / 2; y < Hh; lin++, y += CEL * 0.87) {
          for (let x = (lin % 2 ? CEL / 2 : 0); x < W; x += CEL) {
            const xi = Math.min(W - 2, Math.max(0, Math.floor(x))), yi = Math.min(Hh - 2, Math.floor(y));
            let s = 0, a = 0, vm = 0;
            for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const j = ((yi + dy) * W + xi + dx) * 4; s += lum(j); a += d[j + 3]; vm += ehVermelho(d[j], d[j + 1], d[j + 2]) ? 1 : 0; }
            if (a < 4 * 100) continue;
            const L0 = s / 4, esc = vm >= 2 ? limita((0.40 - L0) / 0.3) : Math.pow(limita((0.93 - L0) / 0.8), 1.1);
            const r = CEL * 0.6 * Math.sqrt(esc);
            if (r < 0.35) continue;
            pg.beginPath(); pg.arc(x, y, r, 0, 7); pg.fill();
          }
        }
        pg.globalCompositeOperation = 'destination-in'; pg.drawImage(G, 0, 0);
        // máscara (para a borda branca de recorte e a sombra)
        const tinge = (crs) => { const T = novaTela(W, Hh), tg = T.getContext('2d'); tg.drawImage(G, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = crs; tg.fillRect(0, 0, W, Hh); return T; };
        const OUT = novaTela(W, Hh), og = OUT.getContext('2d');
        if (o.borda !== 0) {
          const bw = (o.borda ?? 5) * ESC;
          const sm = tinge(SOMBRA.cor);
          og.filter = `blur(${Math.max(1, 5 * ESC)}px)`; og.drawImage(sm, 3 * ESC, 6 * ESC); og.filter = 'none';
          const br = tinge(cor('fibra'));
          for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; og.drawImage(br, Math.cos(a) * bw, Math.sin(a) * bw); }
        }
        og.drawImage(BA, 0, 0); og.drawImage(PT, 0, 0);
        return OUT;
      }
      // foto recortada: caixa (w x h) de desenho, âncora (ax, ay); desenho(g) desenha em cor nessa caixa
      function recorte(w, h, ax, ay, desenho, o = {}) {
        const pad = 16, G = novaTela((w + 2 * pad) * ESC, (h + 2 * pad) * ESC), g = G.getContext('2d');
        g.setTransform(ESC, 0, 0, ESC, pad * ESC, pad * ESC);
        desenho(g);
        const img = meioTom(G, o);
        const lav = novaTela(img.width, img.height), lg = lav.getContext('2d'); // versão desbotada
        lg.drawImage(img, 0, 0); lg.globalCompositeOperation = 'source-atop'; lg.globalAlpha = 0.68; lg.fillStyle = cor('papel'); lg.fillRect(0, 0, lav.width, lav.height);
        return { img, lav, x0: -pad - ax, y0: -pad - ay, w: w + 2 * pad, h: h + 2 * pad };
      }
      // cola a foto com a âncora em (x, y); ferve um fio (desloca e gira) a cada passo
      function cola(r, x, y, s = 1, o = {}) {
        if (s <= 0.001) return;
        const sm = o.sem || 1, bx = hs(sm, B, 11) * FERVE, by = hs(sm, B, 12) * FERVE, rot = hs(sm, B, 13) * 0.15 * RAD;
        c.save(); c.translate(x + bx, y + by); c.rotate(rot + (o.giro || 0) * RAD); c.scale(s, s);
        const a0 = c.globalAlpha;
        if ((o.lava ?? 0) < 1) c.drawImage(r.img, r.x0, r.y0, r.w, r.h);
        if (o.lava > 0) { c.globalAlpha = a0 * limita(o.lava); c.drawImage(r.lav, r.x0, r.y0, r.w, r.h); }
        c.restore();
      }

      // ---- desenho em cor das fotos (só formas e degradês; o meio-tom faz o resto) ----
      const claro = (h, q) => Filme.hex(h, '#ffffff', q), escuro = (h, q) => Filme.hex(h, '#000000', q);
      function degrade(g, x0, x1, cr) { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, claro(cr, 0.28)); gr.addColorStop(0.5, cr); gr.addColorStop(1, escuro(cr, 0.45)); return gr; }
      // busto de foto antiga: caixa u x u, base embaixo. o = { tipo: moderno | cientista | khan, sem, roupa, acesa }
      function busto(g, u, o = {}) {
        const r = sorteio((o.sem || 1) * 31 + 7), pega = (l) => l[Math.floor(r() * l.length)];
        const tipo = o.tipo || 'moderno', cx = u / 2;
        const pele = o.pele || pega(BO.peles), roupa = o.acesa ? cor('acento') : (o.roupa || (tipo === 'cientista' ? cor('jaleco') : tipo === 'khan' ? cor('deel') : pega(BO.roupas)));
        const cabelo = pega(BO.cabelos), jeito = Math.floor(r() * 6);
        const hx = cx, hy = 0.38 * u, rx = 0.15 * u * (0.94 + 0.1 * r()), ry = 0.19 * u * (0.96 + 0.06 * r());
        // ombros
        g.beginPath(); g.moveTo(cx - 0.49 * u, u + 2); g.lineTo(cx - 0.47 * u, 0.84 * u);
        g.quadraticCurveTo(cx - 0.44 * u, 0.65 * u, cx - 0.15 * u, 0.61 * u); g.lineTo(cx + 0.15 * u, 0.61 * u);
        g.quadraticCurveTo(cx + 0.44 * u, 0.65 * u, cx + 0.47 * u, 0.84 * u); g.lineTo(cx + 0.49 * u, u + 2); g.closePath();
        g.fillStyle = degrade(g, cx - 0.49 * u, cx + 0.49 * u, roupa); g.fill();
        // pescoço
        g.fillStyle = degrade(g, cx - 0.08 * u, cx + 0.08 * u, escuro(pele, 0.2)); g.fillRect(cx - 0.072 * u, 0.5 * u, 0.144 * u, 0.15 * u);
        if (tipo === 'moderno') { // gola
          g.fillStyle = escuro(roupa, 0.35); g.beginPath(); g.moveTo(cx - 0.12 * u, 0.61 * u); g.lineTo(cx, 0.72 * u); g.lineTo(cx + 0.12 * u, 0.61 * u); g.lineTo(cx + 0.07 * u, 0.6 * u); g.lineTo(cx, 0.66 * u); g.lineTo(cx - 0.07 * u, 0.6 * u); g.closePath(); g.fill();
        }
        if (tipo === 'cientista') { // jaleco aberto: camisa escura no meio e lapelas
          g.fillStyle = '#3c3a38'; g.beginPath(); g.moveTo(cx - 0.11 * u, 0.61 * u); g.lineTo(cx, 0.86 * u); g.lineTo(cx + 0.11 * u, 0.61 * u); g.closePath(); g.fill();
          g.strokeStyle = '#8a8780'; g.lineWidth = 0.012 * u;
          for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 0.13 * u, 0.61 * u); g.lineTo(cx + s * 0.02 * u, 0.9 * u); g.lineTo(cx + s * 0.02 * u, u); g.stroke(); }
        }
        if (tipo === 'khan') {
          // o deel fecha na diagonal (para a esquerda de quem olha), gola de pele e faixa de borda escura
          g.strokeStyle = cor('bordaDeel'); g.lineWidth = 0.055 * u; g.lineCap = 'butt';
          g.beginPath(); g.moveTo(cx + 0.06 * u, 0.62 * u); g.quadraticCurveTo(cx - 0.12 * u, 0.74 * u, cx - 0.2 * u, u + 4); g.stroke();
          g.fillStyle = cor('pele1'); g.beginPath(); g.ellipse(cx, 0.625 * u, 0.2 * u, 0.045 * u, 0, 0, 7); g.fill();
        }
        // orelhas
        g.fillStyle = escuro(pele, 0.12);
        for (const s of [-1, 1]) { g.beginPath(); g.ellipse(hx + s * rx * 0.98, hy + 0.01 * u, 0.028 * u, 0.045 * u, 0, 0, 7); g.fill(); }
        // cabeça com luz de cima à esquerda
        const gr = g.createRadialGradient(hx - rx * 0.4, hy - ry * 0.4, 0, hx, hy, rx * 1.45);
        gr.addColorStop(0, claro(pele, 0.3)); gr.addColorStop(0.55, pele); gr.addColorStop(1, escuro(pele, 0.45));
        g.fillStyle = gr; g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, 7); g.fill();
        // cabelo / chapéu dos modernos
        if (tipo !== 'khan') {
          g.fillStyle = cabelo;
          if (jeito === 0) { /* careca */ g.fillStyle = escuro(pele, 0.3); g.beginPath(); g.ellipse(hx + rx * 0.2, hy - ry * 0.3, rx * 0.6, ry * 0.4, 0, 0, 7); g.globalAlpha = 0.3; g.fill(); g.globalAlpha = 1; }
          else if (jeito === 5 && tipo === 'moderno') { // boné de pano
            g.fillStyle = pega(BO.chapeus); g.beginPath(); g.ellipse(hx, hy - ry * 0.55, rx * 1.08, ry * 0.55, 0, Math.PI, 0); g.fill();
            g.fillRect(hx - rx * 1.1, hy - ry * 0.6, rx * 2.4, ry * 0.18);
          } else if (jeito === 4 && tipo === 'moderno') { // lenço amarrado na cabeça
            g.fillStyle = pega(BO.chapeus); g.beginPath(); g.ellipse(hx, hy - ry * 0.35, rx * 1.12, ry * 0.8, 0, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(hx + rx * 1.1, hy - ry * 0.2); g.lineTo(hx - rx * 1.1, hy - ry * 0.2); g.closePath(); g.fill();
          } else {
            g.beginPath(); g.ellipse(hx, hy - ry * 0.42, rx * 1.05, ry * 0.66, 0, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); g.fill();
            if (jeito === 3) { g.fillRect(hx - rx * 1.05, hy - ry * 0.4, rx * 0.25, ry * 1.2); g.fillRect(hx + rx * 0.8, hy - ry * 0.4, rx * 0.25, ry * 1.2); }
          }
          if (jeito === 2 && tipo === 'moderno') { g.fillStyle = cabelo; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(hx, hy + ry * 0.62, rx * 0.72, ry * 0.42, 0, 0, Math.PI); g.fill(); g.globalAlpha = 1; } // barba
        }
        // rosto: olhos, sobrancelhas, sombra do nariz, boca
        const ink = '#1a1614', ey = hy - 0.005 * u;
        g.fillStyle = ink;
        for (const s of [-1, 1]) { g.beginPath(); g.ellipse(hx + s * 0.055 * u, ey, 0.022 * u, tipo === 'khan' ? 0.008 * u : 0.012 * u, 0, 0, 7); g.fill(); }
        g.strokeStyle = escuro(cabelo, 0.2); g.lineWidth = 0.014 * u; g.lineCap = 'round';
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * 0.025 * u, ey - 0.035 * u + (tipo === 'khan' ? 0.006 * u : 0)); g.lineTo(hx + s * 0.09 * u, ey - 0.04 * u - (tipo === 'khan' ? 0.006 * u : 0)); g.stroke(); }
        g.fillStyle = escuro(pele, 0.35); g.beginPath(); g.moveTo(hx + 0.005 * u, ey + 0.02 * u); g.lineTo(hx + 0.03 * u, ey + 0.075 * u); g.lineTo(hx - 0.01 * u, ey + 0.08 * u); g.closePath(); g.fill();
        g.strokeStyle = escuro(pele, 0.5); g.lineWidth = 0.012 * u; g.beginPath(); g.moveTo(hx - 0.04 * u, hy + 0.12 * u); g.lineTo(hx + 0.04 * u, hy + 0.12 * u); g.stroke();
        if (tipo === 'cientista' && jeito % 2 === 0) { g.strokeStyle = ink; g.lineWidth = 0.01 * u; for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + s * 0.055 * u, ey, 0.038 * u, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(hx - 0.017 * u, ey); g.lineTo(hx + 0.017 * u, ey); g.stroke(); }
        if (tipo === 'khan') {
          // bigode longo e fino que cai além da boca, e barbicha
          g.strokeStyle = ink; g.lineWidth = 0.012 * u; g.lineCap = 'round';
          for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * 0.008 * u, hy + 0.095 * u); g.quadraticCurveTo(hx + s * 0.07 * u, hy + 0.1 * u, hx + s * 0.085 * u, hy + 0.2 * u); g.stroke(); }
          g.fillStyle = ink; g.beginPath(); g.moveTo(hx - 0.02 * u, hy + 0.16 * u); g.lineTo(hx + 0.02 * u, hy + 0.16 * u); g.lineTo(hx, hy + 0.23 * u); g.closePath(); g.fill();
          // gorro: copa de feltro com ponta curta e aba de pele dobrada para cima
          const at = hy - ry * 0.62;
          g.fillStyle = degrade(g, hx - rx, hx + rx, cor('feltro'));
          g.beginPath(); g.moveTo(hx - rx * 0.92, at); g.quadraticCurveTo(hx - rx * 0.85, at - ry * 0.95, hx - rx * 0.1, at - ry * 1.05); g.lineTo(hx, at - ry * 1.22); g.lineTo(hx + rx * 0.1, at - ry * 1.05); g.quadraticCurveTo(hx + rx * 0.85, at - ry * 0.95, hx + rx * 0.92, at); g.closePath(); g.fill();
          g.fillStyle = degrade(g, hx - rx * 1.2, hx + rx * 1.2, cor('pele1'));
          g.beginPath(); g.moveTo(hx - rx * 1.12, at + ry * 0.22);
          for (let i = 0; i <= 12; i++) { const x = hx - rx * 1.22 + (rx * 2.44 * i) / 12; g.lineTo(x, at - ry * (i % 2 ? 0.22 : 0.3)); }
          g.lineTo(hx + rx * 1.12, at + ry * 0.22); g.quadraticCurveTo(hx, at + ry * 0.32, hx - rx * 1.12, at + ry * 0.22); g.closePath(); g.fill();
          g.strokeStyle = claro(cor('pele1'), 0.35); g.lineWidth = 0.006 * u;
          for (let i = 0; i < 14; i++) { const x = hx - rx * 1.05 + (rx * 2.1 * i) / 13; g.beginPath(); g.moveTo(x, at + ry * 0.12); g.lineTo(x + 0.01 * u, at - ry * 0.2); g.stroke(); }
          g.fillStyle = cor('ouro'); g.beginPath(); g.arc(hx, at - ry * 1.24, 0.016 * u, 0, 7); g.fill();
        }
      }
      // cavaleiro de perfil (silhueta escura com bandeira vermelha); caixa 1.4u x 1.3u, âncora nos cascos
      function cavaleiro(g, u, pose, bandeira) {
        const x = 0.7 * u, y = 1.3 * u, cv = '#3a332d';
        g.strokeStyle = cv; g.lineCap = 'round'; g.lineWidth = 0.07 * u;
        const pernas = pose ? [[-0.35, 0.12], [-0.2, -0.06], [0.25, 0.1], [0.38, -0.08]] : [[-0.32, -0.06], [-0.16, 0.1], [0.22, -0.06], [0.36, 0.12]];
        for (const [dx, a] of pernas) { g.beginPath(); g.moveTo(x + dx * u, y - 0.42 * u); g.lineTo(x + (dx + a) * u, y - 0.03 * u); g.stroke(); }
        g.fillStyle = degrade(g, x - 0.5 * u, x + 0.5 * u, cv);
        g.beginPath(); g.ellipse(x, y - 0.5 * u, 0.46 * u, 0.17 * u, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x + 0.3 * u, y - 0.6 * u); g.lineTo(x + 0.55 * u, y - 0.85 * u); g.lineTo(x + 0.66 * u, y - 0.8 * u); g.lineTo(x + 0.62 * u, y - 0.72 * u); g.lineTo(x + 0.44 * u, y - 0.45 * u); g.closePath(); g.fill();
        g.lineWidth = 0.05 * u; g.beginPath(); g.moveTo(x - 0.44 * u, y - 0.55 * u); g.quadraticCurveTo(x - 0.6 * u, y - 0.45 * u, x - 0.55 * u, y - 0.25 * u); g.stroke();
        // cavaleiro: tronco, cabeça e gorro de pele
        g.fillStyle = '#2c2622'; g.beginPath(); g.moveTo(x - 0.15 * u, y - 0.62 * u); g.lineTo(x + 0.1 * u, y - 0.62 * u); g.lineTo(x + 0.04 * u, y - 0.98 * u); g.lineTo(x - 0.1 * u, y - 0.98 * u); g.closePath(); g.fill();
        g.fillStyle = '#6a5446'; g.beginPath(); g.arc(x - 0.03 * u, y - 1.06 * u, 0.075 * u, 0, 7); g.fill();
        g.fillStyle = '#4a3a2e'; g.beginPath(); g.ellipse(x - 0.03 * u, y - 1.12 * u, 0.1 * u, 0.05 * u, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x - 0.08 * u, y - 1.14 * u); g.lineTo(x - 0.03 * u, y - 1.26 * u); g.lineTo(x + 0.03 * u, y - 1.14 * u); g.closePath(); g.fill();
        if (bandeira) {
          g.strokeStyle = '#2a2420'; g.lineWidth = 0.025 * u; g.beginPath(); g.moveTo(x - 0.2 * u, y - 0.7 * u); g.lineTo(x - 0.2 * u, y - 1.28 * u); g.stroke();
          g.fillStyle = cor('acento'); g.beginPath(); g.moveTo(x - 0.2 * u, y - 1.28 * u); g.lineTo(x - 0.62 * u, y - 1.2 * u + (pose ? 0.03 * u : 0)); g.lineTo(x - 0.2 * u, y - 1.06 * u); g.closePath(); g.fill();
        }
      }
      // medalhão: foto redonda num círculo (o busto recortado no círculo) com aro preto
      function medalhaoG(g, r, o) {
        g.save(); g.beginPath(); g.arc(r, r, r, 0, 7); g.clip();
        g.fillStyle = degrade(g, 0, 2 * r, '#cbc2ae'); g.fillRect(0, 0, 2 * r, 2 * r);
        const u = r * 2.2; g.translate(r - u / 2, 2 * r - u * 0.88); busto(g, u, o);
        g.restore();
        g.strokeStyle = '#1a1614'; g.lineWidth = r * 0.12; g.beginPath(); g.arc(r, r, r * 0.95, 0, 7); g.stroke();
      }

      // ---------- prepara as fotos de todas as peças (uma vez, ao montar) ----------
      const RC = new Map();
      const fotoBusto = (u, o) => recorte(u, u, u / 2, u, (g) => busto(g, u, o));
      const fotoMedalhao = (r, o) => recorte(2 * r, 2 * r, r, r, (g) => medalhaoG(g, r, o), { borda: 4 });
      const KHAN = { tipo: 'khan' };
      function preparar(p, sem) {
        if (p.tipo === 'multidao') {
          const lista = [];
          p.linhas.forEach((ln, j) => { const x0 = p.x - (p.colunas - 1) * ln.dx / 2 + (j % 2 ? ln.dx * 0.3 : -ln.dx * 0.2); for (let i = 0; i < p.colunas; i++) lista.push({ x: x0 + i * ln.dx + hs(sem, j * 31 + i, 5) * 12, y: ln.y, u: ln.tam, sem: sem * 100 + j * 31 + i }); });
          lista.forEach((b) => { b.rc = fotoBusto(b.u, { sem: b.sem }); });
          RC.set(p, lista);
        }
        if (p.tipo === 'heroi') RC.set(p, fotoBusto(p.tam, { ...KHAN, sem: 5 }));
        if (p.tipo === 'cientista') RC.set(p, fotoBusto(p.tam, { tipo: 'cientista', sem: p.sem || 3 }));
        if (p.tipo === 'fila') {
          const n = p.colunas * p.linhas.length, lista = [];
          for (let i = 0; i < n; i++) { const u = p.linhas[Math.floor(i / p.colunas)].tam; lista.push({ rc: fotoBusto(u, { sem: sem * 50 + i, roupa: cor('cinza') }), aceso: p.acende && i === p.acende.i ? fotoBusto(u, { sem: sem * 50 + i, acesa: true }) : null }); }
          RC.set(p, lista);
        }
        if (p.tipo === 'cavaleiros') RC.set(p, [0, 1].map((pose) => [0, 1].map((b) => recorte(1.4 * p.tam, 1.3 * p.tam, 0.7 * p.tam, 1.3 * p.tam, (g) => cavaleiro(g, p.tam, pose, b), { borda: 3 }))));
        if (p.tipo === 'arvore') {
          const lista = [];
          p.niveis.forEach((nv, l) => { for (let j = 0; j < nv.n; j++) lista.push(fotoMedalhao(nv.tam / 2, { sem: sem * 10 + l * 37 + j })); });
          RC.set(p, lista);
        }
        if (p.tipo === 'raiz') RC.set(p, fotoMedalhao(p.tam / 2, { ...KHAN, sem: 9 }));
        if (p.tipo === 'desfocado') p.pecas.forEach((q, j) => preparar(q, sem + 500 + j * 7));
      }
      H.cenas.forEach((cn, i) => cn.pecas.forEach((p, j) => preparar(p, (i + 1) * 1000 + j * 17)));

      // ---------- textura por cima: fibras de papel, grão de risografia, retícula leve, bordas escuras ----------
      const textura = novaTela(largura, altura);
      { const g = textura.getContext('2d'), r = sorteio((H.semente || 1) * 13 + 1);
        g.lineCap = 'round';
        for (let i = 0; i < 1800; i++) {
          const x = r() * largura, y = r() * altura, d = (8 + r() * 26) * k, ang = r() * Math.PI;
          g.strokeStyle = r() < 0.5 ? 'rgba(255,250,235,0.10)' : 'rgba(40,25,10,0.08)'; g.lineWidth = Math.max(0.6, (0.6 + r() * 1.2) * k);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d); g.stroke();
        }
        // grão de risografia: pontinhos de tinta e de papel
        for (let i = 0; i < 26000; i++) { g.fillStyle = r() < 0.55 ? 'rgba(20,14,10,0.10)' : 'rgba(255,248,230,0.10)'; const s = Math.max(1, (1 + r() * 1.5) * k); g.fillRect(r() * largura, r() * altura, s, s); }
        // retícula leve por cima de tudo (célula nunca menor que 3 px)
        const cel = Math.max(3, 9 * k);
        g.fillStyle = 'rgba(20,14,10,0.05)';
        for (let lin = 0, y = 0; y < altura; lin++, y += cel * 0.87) for (let x = (lin % 2 ? cel / 2 : 0); x < largura; x += cel) { g.beginPath(); g.arc(x, y, cel * 0.22, 0, 7); g.fill(); }
        const gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.55, largura / 2, altura / 2, altura * 0.62);
        gr.addColorStop(0, 'rgba(30,15,5,0)'); gr.addColorStop(1, 'rgba(30,15,5,0.32)');
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }

      // ---------- as peças ----------
      const M = 90; // sobra fora da tela (pan, zoom, deslize e tremor)
      const FUNDO_DESF = novaTela((L + 2 * M) * k / (H.desfoque || 6), (A + 2 * M) * k / (H.desfoque || 6));
      const PECAS = {
        // ---- cenário (colagem) ----
        fundo(p) { c.fillStyle = cor(p.cor); c.fillRect(-M - 60, -M - 60, L + 2 * M + 120, A + 2 * M + 120); },
        rasgo(p, t, sem) { // tira de papel rasgado de lado a lado: de y0 para baixo (ou para cima, com "cima")
          const y1 = p.cima ? -M - 60 : A + M + 60, pts = [[-M - 60, p.y0], [L + M + 60, p.y0 + (p.inclina || 0)], [L + M + 60, y1], [-M - 60, y1]];
          if (p.cima) pts.reverse();
          papel(pts, cor(p.cor), sem, { rasgo: p.rasgo ?? 10, trama: p.trama, sombraF: p.sombra === false ? 0 : 1.2, fibra: p.fibra });
        },
        forma(p, t, sem) {
          if (p.t !== undefined && t < p.t) return;
          papel(p.pts, cor(p.cor), sem, { rasgo: p.rasgo, trama: p.trama, fibra: p.fibra, borda: p.borda, lb: p.lb });
        },
        sol(p, t, sem) { papel(circ(p.x, p.y, p.r), cor(p.cor), sem, { rasgo: 4, trama: p.trama }); },
        montanhas(p, t, sem) {
          const pts = [[-M - 60, p.y + 60]];
          for (const [x, h] of p.picos) pts.push([x, p.y - h]);
          pts.push([L + M + 60, p.y + 60], [L + M + 60, p.y + 600], [-M - 60, p.y + 600]);
          papel(pts, cor(p.cor), sem, { rasgo: 6, trama: p.trama, fibra: p.fibra });
        },
        nuvem(p, t, sem) {
          const x = p.x + (p.deriva || 0) * t, s = p.tam || 1;
          papel([[-150, 30], [-120, -10], [-60, -40], [10, -55], [80, -35], [140, -5], [170, 30]].map(([a, b]) => [x + a * s, p.y + b * s]), cor(p.cor || 'nuvem'), sem, { rasgo: 6, trama: p.trama ?? 1, sombraF: 0.6 });
        },
        escurece(p) { alfa(p.alfa); c.fillStyle = cor(p.cor); c.fillRect(-M - 60, -M - 60, L + 2 * M + 120, A + 2 * M + 120); alfa(1); },
        luz(p, t, sem) { // cone da luminária e a cúpula preta
          alfa(p.alfa ?? 0.2); const g = c.createLinearGradient(0, p.y, 0, p.y1); g.addColorStop(0, cor(p.cor)); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(p.x - 70, p.y); c.lineTo(p.x + 70, p.y); c.lineTo(p.x + p.l / 2, p.y1); c.lineTo(p.x - p.l / 2, p.y1); c.closePath(); c.fill(); alfa(1);
          papel([[p.x - 140, p.y], [p.x - 60, p.y - 110], [p.x + 60, p.y - 110], [p.x + 140, p.y]], cor('tinta'), sem + 1, { rasgo: 3, fibra: true });
          papel(circ(p.x, p.y + 4, 46, 16), cor(p.cor), sem + 2, { rasgo: 1, fibra: false, sombra: false });
        },
        lupa(p, t, sem) {
          tira(p.x + p.r * 0.7, p.y + p.r * 0.7, p.x + p.r * 1.9, p.y + p.r * 1.9, p.r * 0.32, cor('tinta'), sem, 1, { sombraF: 1 });
          c.lineWidth = p.r * 0.22; c.strokeStyle = cor('tinta'); sombra(); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.stroke(); semSombra();
          alfa(0.25); c.fillStyle = cor('papelClaro'); c.beginPath(); c.arc(p.x, p.y, p.r * 0.9, 0, 7); c.fill(); alfa(1);
        },
        xicara(p, t, sem) {
          papel(circ(p.x, p.y + p.r * 0.55, p.r * 1.5, p.r * 0.45), cor('papelClaro'), sem, { rasgo: 1, fibra: false, trama: 1 });
          papel([[p.x - p.r, p.y - p.r * 0.6], [p.x + p.r, p.y - p.r * 0.6], [p.x + p.r * 0.8, p.y + p.r * 0.5], [p.x - p.r * 0.8, p.y + p.r * 0.5]], cor('papelClaro'), sem + 1, { rasgo: 1, fibra: false, trama: 2 });
          c.lineWidth = p.r * 0.18; c.strokeStyle = cor('papelClaro'); c.beginPath(); c.arc(p.x + p.r * 1.05, p.y - p.r * 0.05, p.r * 0.32, -1.4, 1.4); c.stroke();
          papel(circ(p.x, p.y - p.r * 0.6, p.r, p.r * 0.22), cor('cha'), sem + 2, { rasgo: 0.5, fibra: false, sombra: false });
        },
        recado(p, t, sem) { // pedaço de mapa velho rasgado, com linhas de costa a tinta
          if (p.t !== undefined && t < p.t) return;
          c.save(); c.translate(p.x, p.y); c.rotate((p.giro || 0) * RAD);
          papel(ret(-p.l / 2, -p.a / 2, p.l, p.a), cor(p.cor || 'mapaVelho'), sem, { rasgo: 9, trama: 1 });
          c.strokeStyle = cor('tinta'); c.lineWidth = 3; c.globalAlpha *= 0.7;
          const r = sorteio(sem);
          for (let j = 0; j < 3; j++) { c.beginPath(); let x = -p.l / 2 + 20, y = -p.a / 2 + 40 + j * p.a / 3; c.moveTo(x, y); while (x < p.l / 2 - 20) { x += 18; y += (r() - 0.5) * 22; c.lineTo(x, y); } c.stroke(); }
          c.restore();
        },
        desfocado(p, t, sem) { // as peças de dentro desenhadas numa tela pequena e esticadas: fica borrado
          const f = H.desfoque || 6, g = FUNDO_DESF.getContext('2d'), antigo = c;
          g.reset(); g.setTransform(k / f, 0, 0, k / f, M * k / f, M * k / f);
          c = g; p.pecas.forEach((q, j) => { c.save(); PECAS[q.tipo](q, t, sem + 500 + j * 7); c.restore(); }); c = antigo;
          c.drawImage(FUNDO_DESF, -M, -M, L + 2 * M, A + 2 * M);
        },
        cavaleiros(p, t, sem) { // fila de cavaleiros que trota (as pernas trocam 8 vezes por segundo)
          const fotos = RC.get(p), avanca = (p.vel || 0) * t, volta = L + 2 * M + 400;
          for (let i = p.n - 1; i >= 0; i--) {
            const x = ((p.x0 + i * p.dx + avanca) % volta + volta) % volta - M - 200, y = p.y + (i % 3) * 22, s = 1 - (i % 3) * 0.08;
            cola(fotos[(B + i) % 2][i % 2 === 0 ? 1 : 0], x, y, s, { sem: sem + i });
          }
        },

        // ---- peças da história ----
        texto(p, t) {
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.2), dy = (1 - sai(u)) * 30;
          alfa(u * some(p, t));
          rotulo(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, tabular: p.tabular, giro: p.giro, caixa: p.caixa, fundo: p.fundo });
          if (p.risco && t >= p.risco.de) { // risco de marcador por cima do nome
            const w = largTexto(p.texto, p.tam) + p.tam * 0.7, yc = p.y + dy - p.tam * 0.5;
            alfa(1); marcador(p.x - w / 2, yc + p.tam * 0.1, p.x + w / 2, yc - p.tam * 0.12, p.tam * 0.32, p.risco.cor || 'acento', 4400, sai(tr(t, p.risco.de, p.risco.ate)));
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = tr(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(tr(t, p.de, p.de + 0.2) * some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v)), s = u >= 1 ? 1 + 0.06 * (1 - tr(t, p.ate, p.ate + 0.3)) : 1;
          emVolta(p.x, p.y - p.tam / 2, s, () => rotulo(txt, p.x, p.y, p.tam, { cor: p.cor, tabular: true, largCaixa: largTexto(milhar(p.valor), p.tam, true) }));
        },
        multidao(p, t, sem) {
          if (t < p.de) return;
          const ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.5) : 0, quem = RC.get(p), nl = p.linhas.length;
          quem.forEach((b, i) => { const t0 = p.de + (p.ate - p.de) * (i / quem.length); alfa(1); cola(b.rc, b.x, b.y, pop(t, t0, 0.3), { sem: b.sem, lava: ap * 0.85 }); });
          if (p.liga && t >= p.liga.de) { // fios de tinta de cada cabeça até um ponto
            c.strokeStyle = cor('tinta'); c.lineWidth = 2.5; c.lineCap = 'round';
            quem.forEach((b, i) => { const atraso = (nl - 1 - Math.floor(i / p.colunas)) * 0.05; alfa(0.75); linha(b.x, b.y - b.u * 0.62, p.liga.para[0], p.liga.para[1], sai(tr(t, p.liga.de + atraso, p.liga.ate))); });
            alfa(1);
          }
        },
        heroi(p, t, sem) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), cy = p.y - p.tam * 0.62;
          alfa(1);
          if (p.estrela) emVolta(p.x, cy, s, () => estrela(p.x, cy, p.estrela, p.estrela * 0.62, 16, cor('acento'), sem + 1, t * 0.05));
          cola(RC.get(p), p.x, p.y, s, { sem: sem + 7 });
        },
        cientista(p, t, sem) { if (t < p.t) return; alfa(1); cola(RC.get(p), p.x, p.y, pop(t, p.t, 0.3), { sem: sem + 3, giro: p.giro }); },
        dna(p, t, sem) { // hélice decorativa vermelha que gira devagar (fundo do laboratório)
          const n = p.n || 16;
          for (let i = 0; i < n; i++) {
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = t * 1.6 + i * 0.55, ax = Math.sin(f) * p.larg, fr = Math.cos(f);
            alfa(0.9); c.strokeStyle = cor('tinta'); c.lineWidth = 4; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, pr] of [[ax, fr], [-ax, -fr]]) papel(circ(p.x + sx, y, 10 + 4 * pr), pr > 0 ? cor('acento') : escuro(cor('acento'), 0.35), sem + i, { rasgo: 0.5, fibra: false, sombra: false });
          }
          alfa(1);
        },
        janela(p, t, sem) { // folha creme presa com fita
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            papel(ret(x, y, p.l, p.a), cor(p.cor || 'papelClaro'), sem, { rasgo: 5, sombraF: 1.5 });
            rotulo(p.titulo, p.x, y + 82, 40, { caixa: false, giro: -1 });
            c.strokeStyle = cor('acento'); c.lineWidth = 5; linha(x + 60, y + 108, x + p.l - 60, y + 104, sai(tr(t, p.t + 0.1, p.t + 0.4)));
            for (const [fx, fy, g] of [[x + 30, y - 4, -32], [x + p.l - 30, y - 4, 32]]) { c.save(); c.translate(fx, fy); c.rotate(g * RAD); alfa(0.78); papel(ret(-62, -20, 124, 40), cor('fita'), sem + 1, { rasgo: 2, fibra: false, sombraF: 0.4 }); alfa(1); c.restore(); }
          });
        },
        tubos(p, t, sem) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.6, h = p.tam;
          papel(ret(x0 - p.dx * 0.6, p.y + h * 0.18, (p.n - 1) * p.dx + p.dx * 1.2, h * 0.2), cor('tinta'), sem + 99, { rasgo: 2, fibra: false });
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(tr(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              if (cheio > 0) estrela(x, p.y, w * 1.7 * cheio, w * 1.1 * cheio, 10, cor('acento'), sem + 50, t * 0.1);
              const pts = [[x - w / 2, p.y - h / 2], [x + w / 2, p.y - h / 2], [x + w / 2, p.y + h / 2 - w / 2]];
              for (let a = 1; a < 6; a++) { const an = (a / 6) * Math.PI; pts.push([x + Math.cos(an) * w / 2, p.y + h / 2 - w / 2 + Math.sin(an) * w / 2]); }
              pts.push([x - w / 2, p.y + h / 2 - w / 2]);
              caminho(pts); c.fillStyle = cor('vidro'); c.fill();
              const nivel = mistura(0.35, 0.92, cheio);
              c.save(); caminho(pts); c.clip(); c.fillStyle = cheio > 0 ? cor('acento') : cor('liquido'); c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h);
              if (cheio <= 0) { c.fillStyle = TRAMA[2]; c.fillRect(x - w, p.y + h / 2 - h * nivel, 2 * w, h); }
              c.restore();
              caminho(pts); c.strokeStyle = cor('tinta'); c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
            });
          }
        },
        fila(p, t, sem) { // fichas de papel com uma foto cada; uma acende em vermelho
          if (t < p.de) return;
          const n = p.colunas * p.linhas.length, fotos = RC.get(p), acesoT = p.acende ? p.acende.t : 1e9;
          for (let i = 0; i < n; i++) {
            const ln = p.linhas[Math.floor(i / p.colunas)], x = p.x - (p.colunas - 1) * p.dx / 2 + (i % p.colunas) * p.dx;
            const s = pop(t, p.de + (p.ate - p.de) * i / n, 0.3), ac = p.acende && i === p.acende.i && t >= acesoT;
            const sa = ac ? 1 + 0.12 * Math.sin(Math.PI * tr(t, acesoT, acesoT + 0.4)) : 1;
            const cw = p.dx * 0.86, ch = ln.tam * 1.12, y0 = ln.y - ch;
            alfa(1);
            emVolta(x, ln.y - ch / 2, s * sa, () => {
              const pts = retRedondo(x - cw / 2, y0, cw, ch, 26);
              papel(pts, ac ? cor('acento') : cor('papelClaro'), sem + i, { rasgo: 1.2, fibra: false, sombraF: 0.8 });
              c.save(); caminho(pts); c.clip();
              cola(ac ? fotos[i].aceso : fotos[i].rc, x, ln.y + ln.tam * 0.06, 1, { sem: sem + i, lava: !ac && t >= acesoT ? 0.6 : 0 });
              c.restore();
              if (ac) { c.strokeStyle = cor('tinta'); c.lineWidth = 6; caminho(pts); c.stroke(); }
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
            const borda = retRedondo(pa.x, pa.y, pa.l, pa.a, 34);
            papel(borda, cor('mar'), sem, { rasgo: 1, fibra: false, sombraF: 1.8, trama: 1 });
            c.save(); caminho(borda); c.clip();
            const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
            const pc = sai(tr(t, p.contorno.de, p.contorno.ate));
            alfa(tr(t, p.contorno.de + 0.3, p.contorno.ate + 0.2));
            terras.forEach((r) => { caminho(r); c.fillStyle = cor('terraMapa'); c.fill(); });
            alfa(1); c.strokeStyle = cor('tinta'); c.lineWidth = 4; c.lineJoin = 'round'; c.lineCap = 'round';
            for (const r of terras) polilinha(r, pc);
            const forma = (pts) => caminho(pts.map(pj));
            if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste
              const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
              const xc = mistura(xb + 10, xa - 10, sai(tr(t, p.regiao.de, p.regiao.ate)));
              const im = p.imperio ? tr(t, p.imperio.de, p.imperio.de + 0.4) : 0;
              c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
              alfa(0.78 * (1 - 0.7 * im)); forma(T.regiao); c.fillStyle = cor('acento'); c.fill(); alfa(1 - 0.7 * im); c.strokeStyle = cor('acento'); c.lineWidth = 4; c.stroke();
              c.restore();
              if (p.aneis && t >= p.aneis.t) { // pontinhos vermelhos com aro preto que pipocam na região
                const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]), passo = p.aneis.passo;
                c.save(); forma(T.regiao); c.clip(); let i = 0;
                for (let lat = la + passo / 2; lat < lb; lat += passo * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? passo / 2 : 0); lon < Math.max(...lo); lon += passo) {
                  const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                  if (s <= 0) continue;
                  alfa(1 - 0.7 * im); c.beginPath(); c.arc(x, y, 8 * s, 0, 7); c.fillStyle = cor('tinta'); c.fill(); c.beginPath(); c.arc(x, y, 5 * s, 0, 7); c.fillStyle = cor('papelClaro'); c.fill();
                }
                c.restore(); alfa(1);
              }
            }
            if (p.imperio && t >= p.imperio.pulsa) { // o império cresce de um ponto que pulsa
              const [px, py] = pj(p.imperio.ponto);
              if (t >= p.imperio.de) {
                const u = sai(tr(t, p.imperio.de, p.imperio.ate));
                c.save(); c.beginPath(); c.arc(px, py, 20 + u * 700, 0, 7); c.clip();
                alfa(0.6); forma(T.imperio); c.fillStyle = cor('tinta'); c.fill(); alfa(1); c.strokeStyle = cor('tinta'); c.lineWidth = 5; c.stroke();
                c.restore();
              }
              const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
              c.strokeStyle = cor('acento'); c.lineWidth = 5; alfa(1 - fase); c.beginPath(); c.arc(px, py, 12 + fase * 44, 0, 7); c.stroke();
              alfa(1); const r0 = 13 * pop(t, p.imperio.pulsa, 0.3);
              c.fillStyle = cor('acento'); c.beginPath(); c.arc(px, py, r0, 0, 7); c.fill(); c.strokeStyle = cor('papelClaro'); c.lineWidth = 3; c.stroke();
            }
            c.restore();
            c.strokeStyle = cor('tinta'); c.lineWidth = 5; caminho(borda); c.stroke();
          });
          c.restore();
        },
        barras(p, t, sem) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo;
            if (t < t0) return;
            const u = passa(tr(t, t0, t0 + p.dur)), D = it.cor === 'acento';
            alfa(tr(t, t0, t0 + 0.2));
            rotulo(it.nome, p.x - 30, y + 17, 34, { cor: 'tinta', alinha: 'direita', giro: 0 });
            const w = Math.max(10, p.larg * it.v / p.maximo * u);
            papel(ret(p.x, y - p.alt / 2, w, p.alt), cor(it.cor), sem + i, { rasgo: 3, fibra: true });
            if (tr(t, t0 + p.dur * 0.6, t0 + p.dur) > 0) rotulo(it.valor, p.x + w + 28, y + 16, 32, { cores: [D ? 'acento' : 'tinta'], alinha: 'esquerda', tabular: true, giro: 0 });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; if (t >= t1) { alfa(tr(t, t1, t1 + 0.2)); rotulo(p.unidade, p.x + p.larg / 2 - 40, p.y + p.itens.length * p.passo + 20, 30, { cor: 'tinta' }); } }
        },
        pasta(p, t, sem) { // pasta de arquivo de papel pardo com aba
          if (t < p.t) return;
          const s = pop(t, p.t, 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, s, () => {
            papel([[x + 30, y - 66], [x + 350, y - 66], [x + 400, y + 4], [x + 30, y + 4]], cor('pastaEscura'), sem + 1, { rasgo: 1.5, fibra: false });
            papel(ret(x, y, p.l, p.a), cor('pasta'), sem, { rasgo: 2, fibra: false, sombraF: 1.6, trama: 1 });
            rotulo(p.titulo, x + 215, y - 16, 30, { caixa: false, giro: 0 });
            for (let i = 0; i < (p.linhas || 0); i++) { const yy = y + 80 + i * 82, w = p.l * (i % 3 === 1 ? 0.45 : 0.7), pr = tr(t, p.t + 0.1 + i * 0.05, p.t + 0.4 + i * 0.05); if (pr > 0) papel(ret(x + 70, yy, w * pr, 14), cor('pastaEscura'), sem + 10 + i, { rasgo: 0.6, fibra: false, sombra: false }); }
          });
        },
        carimbo(p, t, sem) { // carimbo de tinta vermelha que bate torto; apaga e leva um risco de marcador
          if (t < p.t) return;
          const u = tr(t, p.t, p.t + 0.18), s = mistura(1.8, 1, sai(u)), ap = p.apaga ? tr(t, p.apaga, p.apaga + 0.2) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD, cr = Filme.hex(cor('acento'), cor('cinza'), ap);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.8;
          alfa(limita(u * 2) * (0.92 - 0.4 * ap));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          c.strokeStyle = cr; c.lineJoin = 'round';
          caminho(rasga(ret(-w / 2, -h / 2, w, h), sem, 1.5)); c.lineWidth = 10; c.stroke();
          caminho(rasga(ret(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32), sem + 1, 1)); c.lineWidth = 4; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr });
          c.restore();
          if (p.risco && t >= p.risco.de) {
            alfa(1); c.save(); c.translate(p.x, p.y); c.rotate(giro);
            marcador(-w / 2 - 40, 18, w / 2 + 40, -18, p.tam * 0.17, p.risco.cor || 'tinta', sem + 5, sai(tr(t, p.risco.de, p.risco.ate)));
            c.restore();
          }
        },
        tumulos(p, t, sem) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? tr(t, p.borda, p.borda + 0.3) : 1;
          alfa(1); papel(circ(p.x, p.y + s * 0.1, s * 2.5, s * 1.05), cor('buraco'), sem + 90, { rasgo: 8, trama: 3 });
          [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([i, j], n) => {
            const x = p.x + i * s * 1.2, y = p.y + j * s * 0.55, sc = pop(t, p.t + n * 0.1, 0.3);
            alfa(1);
            emVolta(x, y, sc, () => {
              const pts = []; for (let a = 0; a <= 12; a++) { const an = Math.PI + Math.PI * a / 12; pts.push([x + Math.cos(an) * s, y + Math.sin(an) * s * 0.45]); }
              papel(pts, cor('monte'), sem + n, { rasgo: 3, trama: 2, borda: b > 0 ? 'papelClaro' : null, lb: 8 * b });
              for (let q = 0; q < 5; q++) papel(circ(x + (q - 2) * s * 0.36, y - 4, s * 0.09, s * 0.065), cor('pedra'), sem + 10 * n + q, { rasgo: 1, fibra: false, sombra: false, trama: 1 });
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
            for (const [sx, prof, cr] of [[ax, fr, 'acento'], [-ax, -fr, 'papelClaro']]) { papel(circ(p.x + sx, y, 12 + 5 * (prof + 1) / 2), cor(cr), sem + i * 2 + (cr === 'acento'), { rasgo: 0.6, fibra: false, sombra: false, borda: 'tinta', lb: 3 }); }
          }
          alfa(1);
          if (p.divide && t >= p.divide) {
            const v = tr(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'acento', m = 12, crr = D ? cor('acento') : cor('cinza');
              for (let i = 1; i <= m; i++) { const q = i / m; if (q > v) break; const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30; papel(circ(x, y, 12), crr, sem + 100 + i + (D ? 50 : 0), { rasgo: 0.6, fibra: false, sombra: false, borda: 'tinta', lb: 3 }); }
              if (v >= 1) {
                const s = pop(t, p.divide + p.durDivide, 0.15);
                emVolta(r.x, r.y - 50, s, () => { // o cromossomo Y de papel
                  tira(r.x - 30, r.y - 100, r.x, r.y - 55, 26, crr, sem + 200, 1, { borda: 'tinta', lb: 4 });
                  tira(r.x + 30, r.y - 100, r.x, r.y - 55, 26, crr, sem + 201, 1, { borda: 'tinta', lb: 4 });
                  tira(r.x, r.y - 60, r.x, r.y - 14, 26, crr, sem + 202, 1, { borda: 'tinta', lb: 4 });
                });
                alfa(tr(t, p.divide + p.durDivide, p.divide + p.durDivide + 0.15));
                rotulo(r.rotulo, r.x, r.y - 135, 42, { cor: D ? 'acento' : 'cinza', fundo: D ? 'caixa' : 'caixaApagada' });
                alfa(1);
              }
            }
          }
        },
        arvore(p, t, sem) { // árvore de família: a raiz em cima, os descendentes em medalhões embaixo
          if (t < p.de) return;
          const fotos = RC.get(p), nos = [[{ x: p.x, y: p.y, r: p.raizTam / 2 }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, r: nv.tam / 2 }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          let f = 0;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(tr(t, t0, t0 + passo * 0.8)), pais = nos[l - 1], filhos = nos[l], por = filhos.length / pais.length;
            filhos.forEach((fi, j) => { const pai = pais[Math.floor(j / por)]; alfa(1); tira(pai.x, pai.y + pai.r * 0.6, fi.x, fi.y - fi.r * 0.6, Math.max(12, 34 - l * 7), cor('tinta'), sem + l * 20 + j, pr, { fibra: true, rasgo: 3 }); });
            filhos.forEach((fi, j) => { const s = pop(t, t0 + passo * 0.5 + j * 0.02, 0.3); cola(fotos[f + j], fi.x, fi.y, s, { sem: sem + l * 20 + j }); });
            f += filhos.length;
          }
        },
        raiz(p, t, sem) { // o medalhão de cima: o khan, que vira só contorno com "?"
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), cont = p.contorno ? tr(t, p.contorno, p.contorno + 0.3) : 0;
          alfa(1);
          if (cont < 1) { alfa(1 - cont); emVolta(p.x, p.y, s, () => estrela(p.x, p.y, p.tam * 0.9, p.tam * 0.66, 16, cor('acento'), sem + 3, t * 0.04)); alfa(1); }
          emVolta(p.x, p.y, s, () => {
            papel(circ(p.x, p.y, p.tam / 2 + 6), cor('papelClaro'), sem + 4, { rasgo: 1, fibra: false });
            alfa(1 - cont); cola(RC.get(p), p.x, p.y, 1, { sem: sem + 5 }); alfa(1);
            c.setLineDash(cont > 0 ? [14, 10] : []); c.strokeStyle = cor('tinta'); c.lineWidth = 7; c.beginPath(); c.arc(p.x, p.y, p.tam / 2 * 0.97, 0, 7); c.stroke(); c.setLineDash([]);
          });
          if (p.interroga && t >= p.interroga) emVolta(p.x, p.y, pop(t, p.interroga + 0.1, 0.3), () => rotulo('?', p.x, p.y + p.tam * 0.2, p.tam * 0.42, { cor: 'acento', caixa: false, giro: 0 }));
        },
      };
      const some = (p, t) => (p.some ? 1 - tr(t, p.some, p.some + 0.2) : 1);
      const confere = (p) => { if (!PECAS[p.tipo]) throw new Error('Peça sem desenho no motor: ' + p.tipo); if (p.pecas) p.pecas.forEach(confere); };
      for (const cn of H.cenas) cn.pecas.forEach(confere);

      // ---------- cenas: cada uma entra deslizando da direita (0,35 s, inclinada, com sombra) ----------
      const CENAS = H.cenas, CAM = H.camera || {}, DESLIZE = CAM.deslize ?? 0.35;
      const dz = (i) => CENAS[i].deslize ?? DESLIZE; // a cena pode pedir um deslize mais curto
      const cenaEm = (t) => { let i = 0; CENAS.forEach((cn, j) => { if (j > 0 && t >= cn.de - dz(j)) i = j; }); return i; };
      function tremor(q) {
        let dx = 0, dy = 0;
        for (const tm of H.tremores || []) {
          const q0 = Math.round(tm.t * fps);
          if (q >= q0 && q < q0 + tm.quadros) { const s = sorteio((H.semente || 1) * 1000 + q), f = tm.forca * (1 - (q - q0) / tm.quadros); dx += (s() * 2 - 1) * f; dy += (s() * 2 - 1) * f; }
        }
        return { dx, dy };
      }
      const SOMBRA_FOLHA = { x: -22, y: 0, borrao: 40, cor: 'rgba(10,6,4,0.55)' };
      function desenhaCena(i, t, tm, desl) {
        const cn = CENAS[i], sem0 = (i + 1) * 1000;
        c.save();
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        c.translate(tm.dx, tm.dy);
        if (desl) {
          c.translate(L / 2 + desl.x, A / 2); c.rotate(desl.giro); c.translate(-L / 2, -A / 2);
          sombra(1, SOMBRA_FOLHA); c.fillStyle = cor('papel'); c.fillRect(0, -60, L + 200, A + 120); semSombra();
          c.beginPath(); c.rect(0, -60, L + 200, A + 120); c.clip();
        }
        // colagem: pan e zoom lentos; o lado troca a cada cena
        const z0 = (cn.zoom || CAM.zoom || [1.02, 1.12])[0], z1 = (cn.zoom || CAM.zoom || [1.02, 1.12])[1];
        const u = tr(t, cn.de - (i ? dz(i) : 0), cn.ate), z = mistura(z0, z1, u), lado = i % 2 ? -1 : 1, pan = (cn.pan ?? CAM.pan ?? 30) * lado * (2 * u - 1);
        c.save(); c.translate(L / 2 + pan, A / 2); c.scale(z, z); c.translate(-L / 2, -A / 2);
        cn.pecas.forEach((p, j) => { if (SOBRE.has(p.tipo) && p.sobre !== false || p.sobre) return; c.save(); PECAS[p.tipo](p, t, sem0 + j * 17); c.restore(); });
        c.restore();
        // painéis: parados na tela (mas tremem e deslizam junto)
        cn.pecas.forEach((p, j) => { if (!(SOBRE.has(p.tipo) && p.sobre !== false || p.sobre)) return; c.save(); PECAS[p.tipo](p, t, sem0 + j * 17); c.restore(); });
        c.restore();
      }

      // ---------- legendas: o cartão inteiro de uma vez, a palavra falada em vermelho ----------
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
      function legenda(t, tm) {
        const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate);
        if (!lg) return;
        let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
        const tam = lg.tam, passoL = tam * 1.45, n = lg.linhas.length, yb = LG.y || 1590;
        c.setTransform(k, 0, 0, k, tm.dx * k, tm.dy * k); c.globalAlpha = 1;
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yb - (n - 1 - li) * passoL, base = idx;
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('acento') : cor('branco')), contorno: 8, sombra: 3 });
          idx += ln.length;
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c = TELA; c.reset();
        const q = Math.round(t * fps); B = Math.floor((q * PASSOS) / fps);
        const i = cenaEm(t), tm = tremor(q);
        GA = 1;
        if (i > 0 && t < CENAS[i].de) { // deslize: a cena de antes por baixo, a nova entrando da direita
          const e = sai(tr(t, CENAS[i].de - dz(i), CENAS[i].de));
          desenhaCena(i - 1, t, tm, null);
          desenhaCena(i, t, tm, { x: (1 - e) * (L + 140), giro: (1 - e) * (CAM.inclina ?? 4) * RAD });
        } else desenhaCena(i, t, tm, null);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(textura, 0, 0);
        // clarão de batida: por baixo da legenda (nunca cobre o texto)
        for (const f of H.claroes || []) {
          const u = trecho(t, f.t, f.t + f.dur);
          if (t >= f.t && u < 1) { c.globalAlpha = (f.forca ?? 0.5) * (1 - u); c.fillStyle = cor('papelClaro'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
        }
        legenda(t, tm);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: arpejo escuro de sintetizador, baixo a cada compasso e efeitos ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // nota que atravessa o corte acaba NELE (a cauda também): devolve [dur, solta] ou null
        const cabe = (tt, dur, solta) => {
          for (const [a] of corta) if (tt < a && tt + dur + solta > a) { const sl = Math.min(solta, (a - tt) * 0.4); return (a - tt - sl) > 0.005 ? [a - tt - sl, sl] : null; }
          return [dur, solta];
        };
        const sem = 60 / (MU.bpm || 116) / 2, compasso = sem * 8, vol = MU.vol ?? 0.05;
        for (let i = 0, tt = 0.1; tt < duracao - 0.4; i++, tt += sem) {
          if (calado(tt)) continue;
          const ac = MU.acordes[Math.floor((tt - 0.1) / compasso) % MU.acordes.length];
          const n = ac[MU.padrao[i % MU.padrao.length]], v = vol * (i % 4 === 0 ? 1.15 : 0.85), d = cabe(tt, sem * 0.7, 0.12);
          if (!d) continue;
          s.nota(n, tt, d[0], { vol: v, forma: 'serra', ataque: 0.008, solta: d[1], pan: -0.35 });
          s.nota(n, tt + 0.004, d[0], { vol: v * 0.8, forma: 'serra', ataque: 0.008, solta: d[1], pan: 0.35, vibrato: 0.004, vibratoHz: 0.6 });
        }
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += compasso) {
          if (calado(tt)) continue;
          const ac = MU.acordes[b % MU.acordes.length], d = cabe(tt, compasso - 0.15, 0.2);
          if (!d) continue;
          s.nota(ac[0], tt, d[0], { vol: MU.baixo ?? 0.11, forma: 'seno', ataque: 0.02, solta: d[1] });
          s.nota(ac[0], tt, d[0], { vol: (MU.baixo ?? 0.11) * 0.35, forma: 'serra', ataque: 0.02, solta: d[1] });
          s.batida(tt, { vol: 0.2, freq: 60, dur: 0.3 });
        }
        // papel: folha que desliza a cada cena nova e tapinha seco quando uma peça cola
        const papelBate = (tt, v = 0.05) => { s.toque(tt, { vol: v, corte: 2600, dur: 0.05, pan: (r() - 0.5) * 0.5 }); s.batida(tt, { vol: v * 1.3, freq: 170, dur: 0.05 }); };
        const naPausa = (tt) => corta.some(([a, b]) => tt > a - 0.05 && tt < b + 0.05);
        CENAS.forEach((cn, i) => {
          const ds = cn.de - (i ? dz(i) : 0);
          if (i > 0 && !naPausa(ds) && !naPausa(cn.de)) s.vento(ds, dz(i) + 0.05, { vol: 0.08, corte: 3200, onda: 2, entra: 0.25, sai: 0.1 });
          if (i > 0) papelBate(cn.de, 0.06);
          for (const p of cn.pecas) {
            if (p.t !== undefined && !['carimbo', 'forma', 'recado'].includes(p.tipo) && !naPausa(p.t)) papelBate(p.t + 0.02, 0.04);
            if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.09) papelBate(tt, 0.022);
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 5000, onda: 1, entra: 0.3, sai: 0.3 });
            if (p.tipo === 'barras') p.itens.forEach((_, i) => papelBate(p.t + i * 0.12, 0.04));
            if (p.tipo === 'mapa') { s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 4000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) s.pio(tt, { freq: 800, vol: 0.04, repete: 1, dur: 0.05 }); }
            if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.07) s.pio(tt, { freq: 2200 + r() * 600, vol: 0.014, repete: 1, dur: 0.035 });
            if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.1, { vol: 0.06, corte: 900, dur: 0.08 });
            if (p.tipo === 'arvore') for (let l = 0; l < p.niveis.length; l++) papelBate(p.de + l * (p.ate - p.de) / p.niveis.length + 0.4, 0.04);
            if (p.tipo === 'texto' && p.risco) s.vento(p.risco.de, p.risco.ate - p.risco.de + 0.05, { vol: 0.07, corte: 1600, onda: 3, entra: 0.03, sai: 0.06 }); // risco de marcador
            if (p.tipo === 'carimbo' && p.risco) s.vento(p.risco.de, p.risco.ate - p.risco.de + 0.05, { vol: 0.07, corte: 1600, onda: 3, entra: 0.03, sai: 0.06 });
          }
        });
        // tique-tique do contador
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.05) s.toque(tt, { vol: 0.05, corte: 7000, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        // golpe grave (herói, carimbo)
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.5, freq: 55, dur: 0.45 }); s.toque(tt, { vol: 0.08, corte: 1200, dur: 0.1 }); }
        // brilhos curtos
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.4 }));
        // subidas (ruído que cresce e um assobio que sobe)
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.13, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.04 }); }
        // arranhão de disco na virada
        if (SO.arranhao !== undefined) {
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.42, freq: 70, dur: 0.3 });
        }
        // golpe de sintetizador grave
        if (SO.grave !== undefined) { ['A1', 'E2', 'A2'].forEach((n) => s.nota(n, SO.grave, 0.35, { vol: 0.13, forma: 'serra', ataque: 0.005, solta: 0.5 })); s.batida(SO.grave, { vol: 0.42, freq: 50, dur: 0.5 }); }
        // brilho longo no fim
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.22);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
