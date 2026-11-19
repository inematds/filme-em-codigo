// MOTOR "marca-autoral" — vídeo explicativo com cara de marca: fundo preto com grade de pontinhos,
// UMA cor de destaque que brilha, letra grossa e redonda, bonecos de bloco, janelas de aplicativo,
// contador que sobe, mapa que se pinta, barras, carimbo e risco. Tudo "salta" ao entrar.
// Jeito de animar: camadas-planas (desenho 2D em canvas), com letras em traços (letras.js).
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
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);                // sai rápido, chega devagar
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); }; // passa do ponto e volta
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d)))); // nunca negativo (raio de arco)

      // ---------- opacidade da cena (para a troca de cena em 0,3 s) ----------
      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      // brilho macio: o shadowBlur é em pixels da TELA, então multiplica pela escala atual
      const brilho = (raio, cr) => { c.shadowColor = cr || cor('destaque'); c.shadowBlur = raio * escalaAtual(); c.shadowOffsetX = 0; c.shadowOffsetY = 0; };
      const semBrilho = () => { c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- letras grossas e redondas (traço largo de ponta redonda sobre letras.js) ----------
      const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
      const ESPACO = 0.46, ENTRE = 0.27, CELULA = 0.62; // CELULA: largura fixa dos algarismos (números que não pulam)
      const digito = (ch) => ch >= '0' && ch <= '9';
      const avanco = (ch, tab) => { if (ch === ' ') return ESPACO; const g = glifo(ch); if (!g) return ESPACO; return (tab && digito(ch) ? CELULA : g.w) + ENTRE; };
      const largTexto = (txt, tam, tab) => { let w = 0; for (const ch of txt) w += avanco(ch, tab); return Math.max(0, w - ENTRE) * tam; };
      // posições de cada letra (x à esquerda) e o número da palavra de cada letra
      function arruma(txt, x, tam, alinha, tab) {
        const w = largTexto(txt, tam, tab);
        let px = alinha === 'esquerda' ? x : alinha === 'direita' ? x - w : x - w / 2;
        const out = []; let palavra = 0;
        for (const ch of txt) {
          if (ch === ' ') { palavra++; px += ESPACO * tam; continue; }
          const g = glifo(ch);
          const dx = tab && digito(ch) ? (CELULA - g.w) / 2 * tam : 0;
          out.push({ g, x: px + dx, palavra });
          px += avanco(ch, tab) * tam;
        }
        return { letras: out, w };
      }
      function caminho(g, x, y, tam) {
        c.beginPath();
        for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (px de borda preta), brilho, tabular, sombra }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.165;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
        if (o.sombra) {
          c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = lw + (o.contorno || 0) * 2;
          for (const l of letras) { caminho(l.g, l.x + o.sombra, y + o.sombra, tam); c.stroke(); }
        }
        if (o.contorno) {
          c.strokeStyle = '#000'; c.lineWidth = lw + o.contorno * 2;
          for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); }
        }
        for (const l of letras) {
          const cr = corDe(l.palavra);
          if (o.brilho && cr === cor('destaque')) brilho(o.brilho, cr);
          c.strokeStyle = cr; c.lineWidth = lw;
          caminho(l.g, l.x, y, tam); c.stroke();
          semBrilho();
        }
      }

      // ---------- confere as letras ao montar: letra que falta dá erro (não some sem aviso) ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confereLetras() {
        const textos = (H.legendas || []).map((l) => l.texto);
        for (const cn of H.cenas) for (const p of cn.pecas) {
          for (const ch of ['texto', 'titulo', 'unidade']) if (p[ch]) textos.push(p[ch]);
          if (p.tipo === 'contador') textos.push(milhar(p.valor));
          if (p.tipo === 'barras') for (const it of p.itens) textos.push(it.nome, it.valor);
          if (p.tipo === 'helice') textos.push(p.esq.rotulo, p.dir.rotulo);
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- fundo: preto, grade de pontinhos, brilho fraco no meio, cantos escuros ----------
      const M = 120; // margem da grade (a câmera deriva)
      const grade = novaTela((L + 2 * M) * k, (A + 2 * M) * k);
      { const g = grade.getContext('2d'); g.fillStyle = cor('ponto'); const r = Math.max(1, 2.4 * k);
        for (let y = 0; y <= A + 2 * M; y += 40) for (let x = 0; x <= L + 2 * M; x += 40) { g.beginPath(); g.arc(x * k, y * k, r, 0, 7); g.fill(); } }
      const luzMeio = novaTela(largura, altura);
      { const g = luzMeio.getContext('2d'), [r, gg, b] = Filme.rgb(cor('brilhoCentro'));
        const gr = g.createRadialGradient(largura / 2, altura * 0.45, 0, largura / 2, altura * 0.45, largura * 0.75);
        gr.addColorStop(0, `rgba(${r},${gg},${b},0.55)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }
      const vinheta = novaTela(largura, altura);
      { const g = vinheta.getContext('2d');
        const gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.45, largura / 2, altura / 2, altura * 0.62);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }

      // ---------- câmera: deriva e "respira" bem devagar; tremor de alguns quadros na virada ----------
      const CAM = H.camera || {};
      function camera(t) {
        const d = CAM.deriva ?? 12;
        let dx = d * ruido(t * 0.18, 3), dy = d * ruido(t * 0.15, 5);
        const z = 1 + (CAM.respira ?? 0.012) * Math.sin(2 * Math.PI * t / (CAM.periodo || 6));
        const q = Math.round(t * fps);
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) {
            const r = sorteio((H.semente || 1) * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros);
            dx += (r() * 2 - 1) * f; dy += (r() * 2 - 1) * f;
          }
        }
        return { dx, dy, z };
      }

      // ---------- formas ----------
      function retRedondo(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
      }
      // boneco de bloco: cabeça quadrada de cantos redondos com dois olhinhos, corpo que afina para baixo.
      // (x, y) = centro; tam = altura. o = { cor, contorno (0 a 1: some o recheio, fica a borda), brilho }
      function boneco(x, y, tam, o = {}) {
        const cr = o.cor || cor('branco');
        const cw = tam * 0.5, ch = tam * 0.4, topo = y - tam / 2;
        const ct = topo + ch + tam * 0.06, cb = y + tam / 2, w1 = tam * 0.54, w2 = tam * 0.34, rr = tam * 0.07;
        const forma = () => {
          retRedondo(x - cw / 2, topo, cw, ch, tam * 0.11);
          c.moveTo(x - w1 / 2 + rr, ct); c.lineTo(x + w1 / 2 - rr, ct); c.quadraticCurveTo(x + w1 / 2, ct, x + w1 / 2 - 0.01 * tam, ct + rr);
          c.lineTo(x + w2 / 2, cb - rr); c.quadraticCurveTo(x + w2 / 2, cb, x + w2 / 2 - rr, cb);
          c.lineTo(x - w2 / 2 + rr, cb); c.quadraticCurveTo(x - w2 / 2, cb, x - w2 / 2, cb - rr);
          c.lineTo(x - w1 / 2 + 0.01 * tam, ct + rr); c.quadraticCurveTo(x - w1 / 2, ct, x - w1 / 2 + rr, ct); c.closePath();
        };
        const cont = limita(o.contorno || 0), a0 = c.globalAlpha;
        if (o.brilho) brilho(o.brilho, cr);
        if (cont < 1) { c.beginPath(); forma(); c.fillStyle = cr; c.globalAlpha = a0 * (1 - cont); c.fill(); }
        c.globalAlpha = a0;
        if (cont > 0) { c.beginPath(); forma(); c.strokeStyle = cr; c.lineWidth = Math.max(3, tam * 0.035); c.globalAlpha = a0 * cont; c.stroke(); c.globalAlpha = a0; }
        semBrilho();
        if (cont < 1) { // olhos
          c.fillStyle = '#000'; c.globalAlpha = a0 * (1 - cont);
          const ey = topo + ch * 0.42, es = tam * 0.075;
          c.fillRect(x - cw * 0.26 - es / 2, ey, es, es * 1.2); c.fillRect(x + cw * 0.26 - es / 2, ey, es, es * 1.2);
          c.globalAlpha = a0;
        }
      }
      // linha que se desenha (prog de 0 a 1)
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
      // escala em volta de um ponto (para o "salto" das peças)
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      const some = (p, t) => (p.some ? 1 - trecho(t, p.some, p.some + 0.3) : 1);

      // ---------- as peças ----------
      const PECAS = {
        texto(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.35), s = p.sobe ? 1 : pop(t, p.t), dy = p.sobe ? (1 - sai(u)) * 50 : 0;
          alfa((p.sobe ? u : 1) * some(p, t));
          const yc = p.y - p.tam * 0.45;
          emVolta(p.x, yc, s, () => escreve(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, brilho: p.brilho, tabular: p.tabular, alinha: p.alinha }));
          if (p.risco && t >= p.risco.de) { // risco branco que atravessa o texto
            const w = largTexto(p.texto, p.tam) + p.tam * 0.5, pr = sai(trecho(t, p.risco.de, p.risco.ate));
            alfa(1); c.strokeStyle = cor('branco'); c.lineWidth = p.tam * 0.12; c.lineCap = 'round';
            linha(p.x - w / 2, yc + p.tam * 0.08, p.x + w / 2, yc - p.tam * 0.08, pr);
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(trecho(t, p.de, p.de + 0.2) * some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v));
          emVolta(p.x, p.y - p.tam / 2, 1 + 0.06 * Math.max(0, 1 - trecho(t, p.ate, p.ate + 0.3)) * (u >= 1 ? 1 : 0), () =>
            escreve(txt, p.x, p.y, p.tam, { cor: p.cor, brilho: p.brilho, tabular: true }));
        },
        multidao(p, t) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2;
          const ap = p.apaga ? trecho(t, p.apaga, p.apaga + 0.5) : 0;
          // linhas cinzas de cada boneco até um ponto
          if (p.liga && t >= p.liga.de) {
            alfa(0.85); c.strokeStyle = cor('cinza'); c.lineWidth = 1.6; c.lineCap = 'round';
            for (let i = 0; i < n; i++) {
              const col = i % p.colunas, lin = Math.floor(i / p.colunas), x = x0 + col * p.dx, y = p.y + lin * p.dy;
              const atraso = (lin * 0.06 + Math.abs(col - (p.colunas - 1) / 2) * 0.02);
              linha(x, y - p.tam / 2, p.liga.para[0], p.liga.para[1], sai(trecho(t, p.liga.de + atraso, p.liga.ate)));
            }
          }
          for (let i = 0; i < n; i++) {
            const col = i % p.colunas, lin = Math.floor(i / p.colunas), x = x0 + col * p.dx, y = p.y + lin * p.dy;
            const t0 = p.de + (p.ate - p.de) * (i / n), s = pop(t, t0, 0.3);
            alfa(1);
            emVolta(x, y + p.tam / 2, s, () => boneco(x, y, p.tam, { cor: Filme.hex(cor('branco'), cor('cinza'), ap) }));
          }
        },
        heroi(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.45), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.4)) : 0;
          alfa(1);
          // anel de luz no chão
          emVolta(p.x, p.y, s, () => {
            boneco(p.x, p.y, p.tam, { cor: cor('destaque'), brilho: (p.brilho || 30) * (1 - cont * 0.6), contorno: cont });
          });
          if (p.interroga && t >= p.interroga) {
            const si = pop(t, p.interroga + 0.1, 0.4), yq = p.y + p.tam * 0.18;
            emVolta(p.x, yq - p.tam * 0.12, si, () => escreve('?', p.x, yq, p.tam * 0.3, { cor: 'destaque', brilho: 16 }));
          }
        },
        janela(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(1);
          emVolta(p.x, p.y, 0.85 + 0.15 * s, () => {
            alfa(limita(s));
            retRedondo(x, y, p.l, p.a, 26); c.fillStyle = cor('painel'); c.fill();
            c.strokeStyle = cor('borda'); c.lineWidth = 3; c.stroke();
            ['destaque', 'cinza', 'cinza'].forEach((cr, i) => { c.beginPath(); c.arc(x + 40 + i * 30, y + 38, 8, 0, 7); c.fillStyle = cor(cr); c.fill(); });
            escreve(p.titulo, p.x, y + 52, 30, { cor: 'cinzaClaro' });
            if (p.linhas) { // linhas de texto apagadas (o arquivo)
              c.strokeStyle = cor('borda'); c.lineWidth = 16; c.lineCap = 'round';
              for (let i = 0; i < p.linhas; i++) { const yy = y + 130 + i * 75, w = p.l * (i % 3 === 1 ? 0.45 : 0.68); linha(x + 70, yy, x + 70 + w, yy, sai(trecho(t, p.t + 0.1 + i * 0.05, p.t + 0.45 + i * 0.05))); }
            }
          });
        },
        tubos(p, t) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.55, h = p.tam;
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(trecho(t, p.enche.t, p.enche.t + 0.4)) : 0;
            alfa(1);
            emVolta(x, p.y + h / 2, s, () => {
              const forma = () => { c.beginPath(); c.moveTo(x - w / 2, p.y - h / 2); c.lineTo(x - w / 2, p.y + h / 2 - w / 2); c.arc(x, p.y + h / 2 - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, p.y - h / 2); };
              if (cheio > 0) { // líquido sobe
                c.save(); forma(); c.closePath(); c.clip();
                const topo = mistura(p.y + h / 2, p.y - h * 0.15, cheio);
                brilho(20); c.fillStyle = cor('destaque'); c.fillRect(x - w, topo, 2 * w, h); semBrilho(); c.restore();
              }
              forma(); c.strokeStyle = cheio > 0 ? cor('destaque') : cor('branco'); c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
              c.beginPath(); c.moveTo(x - w / 2 - 6, p.y - h / 2); c.lineTo(x + w / 2 + 6, p.y - h / 2); c.stroke();
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
            alfa(1);
            emVolta(x, y + p.tam / 2, s * sa, () => boneco(x, y, p.tam, { cor: Filme.hex(cor('branco'), cor('destaque'), ac), brilho: ac > 0 ? 30 * ac : 0 }));
          }
        },
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          // terra: recheio escuro entra depois que o contorno fecha
          alfa(trecho(t, p.contorno.de + 0.3, p.contorno.ate + 0.2));
          c.fillStyle = cor('terra');
          for (const r of terras) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
          alfa(1); c.strokeStyle = cor('cinza'); c.lineWidth = 2.5; c.lineJoin = 'round';
          for (const r of terras) polilinha(r, pc);
          const D = cor('destaque');
          const forma = (pts) => { c.beginPath(); pts.map(pj).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
          // a região entra varrendo de leste (direita) para oeste
          if (p.regiao && t >= p.regiao.de) {
            const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 10, xa - 10, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
            alfa(1 - 0.6 * im); forma(T.regiao); c.fillStyle = Filme.cor(D, D, 0, 0.28); c.fill();
            c.strokeStyle = D; c.lineWidth = 3; c.stroke();
            // anéis dentro da região
            if (p.aneis && t >= p.aneis.t) {
              c.save(); forma(T.regiao); c.clip();
              const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]);
              const pa = p.aneis.passo; let i = 0;
              for (let lat = la + pa / 2; lat < lb; lat += pa * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? pa / 2 : 0); lon < Math.max(...lo); lon += pa) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                if (s <= 0) continue;
                c.beginPath(); c.arc(x, y, 6 * s, 0, 7); c.strokeStyle = D; c.lineWidth = 2.5; c.stroke();
              }
              c.restore();
            }
            c.restore();
          }
          // o império cresce de um ponto que pulsa
          if (p.imperio && t >= p.imperio.pulsa) {
            const [px, py] = pj(p.imperio.ponto);
            if (t >= p.imperio.de) {
              const u = sai(trecho(t, p.imperio.de, p.imperio.ate));
              c.save(); c.beginPath(); c.arc(px, py, 20 + u * 700, 0, 7); c.clip();
              alfa(1); forma(T.imperio); brilho(26); c.fillStyle = Filme.cor(D, D, 0, 0.5); c.fill(); semBrilho();
              c.strokeStyle = D; c.lineWidth = 3.5; c.stroke();
              c.restore();
            }
            alfa(1); brilho(20); c.fillStyle = D; c.beginPath(); c.arc(px, py, 10 * pop(t, p.imperio.pulsa, 0.3), 0, 7); c.fill(); semBrilho();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            alfa(1 - fase); c.strokeStyle = D; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 10 + fase * 40, 0, 7); c.stroke();
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
            escreve(it.nome, p.x - 24, y + 16, 34, { cor: D ? 'destaque' : 'branco', alinha: 'direita' });
            const w = Math.max(8, p.larg * it.v / p.maximo * u);
            if (D) brilho(22);
            retRedondo(p.x, y - p.alt / 2, w, p.alt, 8); c.fillStyle = cor(it.cor); c.fill(); semBrilho();
            alfa(trecho(t, t0 + p.dur * 0.6, t0 + p.dur));
            escreve(it.valor, p.x + w + 22, y + 15, 32, { cor: D ? 'destaque' : 'cinzaClaro', alinha: 'esquerda', tabular: true });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; alfa(trecho(t, t1, t1 + 0.3)); escreve(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 10, 30, { cor: 'cinzaClaro' }); }
        },
        carimbo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.22), s = mistura(2.2, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.25)) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD;
          const cr = Filme.hex(cor('destaque'), cor('cinza'), ap);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.7;
          alfa(limita(u * 1.6));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          if (ap < 1) brilho(24 * (1 - ap), cr);
          retRedondo(-w / 2, -h / 2, w, h, 14); c.strokeStyle = cr; c.lineWidth = 8; c.stroke();
          retRedondo(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 8); c.lineWidth = 3; c.stroke(); semBrilho();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr, brilho: ap < 0.5 ? 14 : 0 });
          if (p.risco && t >= p.risco.de) {
            c.strokeStyle = cor('branco'); c.lineWidth = 12; c.lineCap = 'round';
            linha(-w / 2 - 20, 8, w / 2 + 20, -8, sai(trecho(t, p.risco.de, p.risco.ate)));
          }
          c.restore();
        },
        tumulos(p, t) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? trecho(t, p.borda, p.borda + 0.4) : 1;
          // 2x2 caixas em vista isométrica (as de trás primeiro)
          const pos = [[0, -1], [-1, 0], [1, 0], [0, 1]];
          pos.forEach(([i, j], n) => {
            const x = p.x + i * s * 0.95, y = p.y + j * s * 0.48, hgt = s * 0.45, sc = pop(t, p.t + n * 0.06, 0.35);
            alfa(1);
            emVolta(x, y + hgt, sc, () => {
              const topo = [[x, y - s / 2], [x + s, y], [x, y + s / 2], [x - s, y]].map(([a, bb]) => [a, bb - hgt]);
              const face = (pts, cr) => { c.beginPath(); pts.forEach(([a, bb], q) => (q ? c.lineTo(a, bb) : c.moveTo(a, bb))); c.closePath(); c.fillStyle = cr; c.fill(); alfa(b); c.strokeStyle = cor('branco'); c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke(); alfa(1); };
              face([[x - s, y - hgt], [x, y + s / 2 - hgt], [x, y + s / 2], [x - s, y]], '#0d0d0d');
              face([[x + s, y - hgt], [x, y + s / 2 - hgt], [x, y + s / 2], [x + s, y]], '#161616');
              face(topo, '#222');
            });
          });
        },
        helice(p, t) {
          if (t < p.de) return;
          const n = 22, u = sai(trecho(t, p.de, p.ate));
          const giro = t * 2.4;
          const ponto = (i) => { const y = mistura(p.y0, p.y1, i / (n - 1)); return y; };
          // degraus e contas: só até onde a hélice já subiu
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5);
            if (vis <= 0) break;
            const y = ponto(i), f = giro + i * 0.55, ax = Math.sin(f) * 70, frente = Math.cos(f);
            alfa(vis * 0.7); c.strokeStyle = cor('cinza'); c.lineWidth = 2.5; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof] of [[ax, frente], [-ax, -frente]]) {
              alfa(vis * (0.55 + 0.45 * (prof + 1) / 2));
              c.beginPath(); c.arc(p.x + sx, y, 9 + 4 * (prof + 1) / 2, 0, 7); c.fillStyle = cor('branco'); c.fill();
            }
          }
          // divide em dois ramos de contas: um apagado, outro em destaque
          if (p.divide && t >= p.divide) {
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'destaque', m = 12;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                alfa(1); if (D) brilho(16);
                c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = cor(r.cor); c.fill(); semBrilho();
              }
              if (v >= 1) { // o cromossomo Y na ponta e o rótulo
                const s = pop(t, p.divide + p.durDivide, 0.35);
                alfa(1);
                emVolta(r.x, r.y - 50, s, () => {
                  c.strokeStyle = cor(r.cor); c.lineWidth = 16; c.lineCap = 'round'; if (D) brilho(18);
                  c.beginPath(); c.moveTo(r.x - 26, r.y - 95); c.lineTo(r.x, r.y - 55); c.lineTo(r.x + 26, r.y - 95); c.moveTo(r.x, r.y - 55); c.lineTo(r.x, r.y - 20); c.stroke(); semBrilho();
                });
                alfa(trecho(t, p.divide + p.durDivide, p.divide + p.durDivide + 0.25));
                escreve(r.rotulo, r.x, r.y - 125, 40, { cor: r.cor, brilho: D ? 14 : 0 });
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
            alfa(1); c.strokeStyle = cor('cinza'); c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = pai.y + pai.tam / 2 + 10, ym = (yb + f.y - f.tam / 2) / 2;
              polilinha([[pai.x, yb], [pai.x, ym], [f.x, ym], [f.x, f.y - f.tam / 2 - 8]], pr);
            });
            filhos.forEach((f, j) => {
              const s = pop(t, t0 + passo * 0.55 + j * 0.02, 0.3);
              emVolta(f.x, f.y + f.tam / 2, s, () => boneco(f.x, f.y, f.tam, { cor: cor('branco') }));
            });
          }
        },
      };

      // ---------- cenas: entram em 0,3 s (somem por baixo da próxima) e crescem de leve ----------
      const CENAS = H.cenas;
      function pesoCena(i, t) {
        const cn = CENAS[i], prox = CENAS[i + 1];
        if (t < cn.de) return 0;
        const entra = cn.corte || i === 0 ? 1 : trecho(t, cn.de, cn.de + 0.3);
        let fica = 1;
        if (prox) fica = prox.corte ? (t < prox.de ? 1 : 0) : 1 - trecho(t, prox.de, prox.de + 0.15); // a cena que sai some mais rápido (não fica vazando atrás da nova)
        return entra * fica;
      }

      // ---------- legendas: 2 a 4 palavras, branco com borda preta, a palavra falada no destaque ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 74, palavras = lg.texto.split(/\s+/);
        const linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && largTexto(tenta, tam) > (LG.largura || 960)) { linhas.push(atual); atual = [p]; } else atual.push(p); }
        if (atual.length) linhas.push(atual);
        // a última palavra acende "segura" segundos antes do fim do cartão
        const pesos = palavras.map((p) => p.length + 2), soma = pesos.slice(0, -1).reduce((a, b) => a + b, 0) || 1;
        const janela = Math.max(0.05, lg.ate - lg.de - (LG.segura ?? 0.55));
        let acum = lg.de; const inicio = pesos.map((w, i) => { const v = acum; if (i < pesos.length - 1) acum += janela * w / soma; return v; });
        // o cartão aparece inteiro de uma vez: confere que fica pelo menos 0,5 s na tela
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
            escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : cor('branco')), contorno: 8, sombra: 3 });
            idx += ln.length;
          });
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        c.fillStyle = cor('fundo'); c.fillRect(0, 0, tela.width, tela.height);
        c.drawImage(luzMeio, 0, 0);
        const cam = camera(t), z = cam.z;
        const base = () => c.setTransform(k * z, 0, 0, k * z, k * (L / 2 * (1 - z) + cam.dx), k * (A / 2 * (1 - z) + cam.dy));
        base(); c.drawImage(grade, -M, -M, L + 2 * M, A + 2 * M);
        CENAS.forEach((cn, i) => {
          const w = pesoCena(i, t);
          if (w <= 0) return;
          GA = w;
          const cresce = cn.corte ? 1 : 0.97 + 0.03 * sai(trecho(t, cn.de, cn.de + 0.4));
          base();
          emVolta(L / 2, A * 0.45, cresce, () => { for (const p of cn.pecas) { c.save(); PECAS[p.tipo](p, t); c.restore(); } });
        });
        GA = 1;
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(vinheta, 0, 0);
        legenda(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: as mesmas marcas de tempo da imagem ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // arpejo escuro de serras desafinadas (duas vozes, uma de cada lado) e baixo a cada compasso
        const sem = 60 / (MU.bpm || 116) / 2, compasso = sem * 8, vol = MU.vol ?? 0.05;
        for (let i = 0, tt = 0.1; tt < duracao - 0.4; i++, tt += sem) {
          if (calado(tt)) continue;
          const ac = MU.acordes[Math.floor((tt - 0.1) / compasso) % MU.acordes.length];
          const n = ac[MU.padrao[i % MU.padrao.length]], v = vol * (i % 4 === 0 ? 1.15 : 0.85);
          s.nota(n, tt, sem * 0.7, { vol: v, forma: 'serra', ataque: 0.008, solta: 0.12, pan: -0.35 });
          s.nota(n, tt + 0.004, sem * 0.7, { vol: v * 0.8, forma: 'serra', ataque: 0.008, solta: 0.12, pan: 0.35, vibrato: 0.004, vibratoHz: 0.6 });
        }
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += compasso) {
          const ac = MU.acordes[b % MU.acordes.length], fimB = corta.reduce((m, [a]) => (a > tt && a < m ? a : m), tt + compasso);
          if (calado(tt)) continue;
          s.nota(ac[0], tt, Math.max(0.2, fimB - tt - 0.15), { vol: MU.baixo ?? 0.11, forma: 'seno', ataque: 0.02, solta: 0.2 });
          s.nota(ac[0], tt, Math.max(0.2, fimB - tt - 0.15), { vol: (MU.baixo ?? 0.11) * 0.35, forma: 'serra', ataque: 0.02, solta: 0.2 });
          s.batida(tt, { vol: 0.22, freq: 60, dur: 0.3 });
        }
        // estalinhos de "pop" quando as peças entram
        const blip = (tt, f = 1500, v = 0.035) => s.pio(tt, { freq: f, vol: v, repete: 1, dur: 0.035, sobe: 0.4 });
        for (const cn of H.cenas) {
          if (cn.de > 0) s.vento(cn.de - 0.08, 0.35, { vol: 0.07, corte: 2500, onda: 2, entra: 0.12, sai: 0.2 }); // troca de cena
          for (const p of cn.pecas) {
            if (p.t !== undefined && p.tipo !== 'carimbo') blip(p.t + 0.03, 1300 + r() * 500);
            if (p.tipo === 'multidao' || p.tipo === 'fila' || p.tipo === 'tubos') for (let tt = p.de; tt < p.ate; tt += 0.09) blip(tt, 1600 + r() * 900, 0.022);
            if (p.tipo === 'multidao' && p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.05, corte: 5000, onda: 1, entra: 0.3, sai: 0.3 });
            if (p.tipo === 'barras') p.itens.forEach((_, i) => blip(p.t + i * 0.12, 900 + i * 120, 0.04));
            if (p.tipo === 'mapa') { s.vento(p.regiao.de, p.regiao.ate - p.regiao.de, { vol: 0.06, corte: 4000, onda: 1, entra: 0.2, sai: 0.3 }); for (let tt = p.imperio.pulsa; tt < p.imperio.de + 0.6; tt += 0.6) blip(tt, 800, 0.05); }
            if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.07) blip(tt, 2200 + r() * 600, 0.015);
            if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.06, { vol: 0.06, corte: 900, dur: 0.08 });
          }
        }
        // tique-tique do contador
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.05) s.toque(tt, { vol: 0.05, corte: 7000, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        // golpe grave (herói, carimbo)
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.55, freq: 55, dur: 0.45 }); s.toque(tt, { vol: 0.08, corte: 1200, dur: 0.1 }); }
        // brilhos curtos
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.4 }));
        // subidas (ruído que cresce e um assobio que sobe)
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.13, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.04 }); }
        // arranhão de disco na virada
        if (SO.arranhao !== undefined) {
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.45, freq: 70, dur: 0.3 });
        }
        // golpe de sintetizador grave
        if (SO.grave !== undefined) { ['A1', 'E2', 'A2'].forEach((n) => s.nota(n, SO.grave, 0.35, { vol: 0.14, forma: 'serra', ataque: 0.005, solta: 0.5 })); s.batida(SO.grave, { vol: 0.5, freq: 50, dur: 0.5 }); }
        // brilho longo no fim
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.22);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
