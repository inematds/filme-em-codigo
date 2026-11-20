// MOTOR "retro-futuro" — explicativo vertical com cara de cartaz de ficção científica dos anos 50–60
// (era atômica): fundos pintados em aerógrafo (céu teal e creme, planeta com anel, cidade de agulhas e
// discos), cromo arredondado, laranja de destaque, retícula de impressão, linhas de TV, franja vermelha e
// ciano nas bordas e cantos escuros. A câmera faz um zoom lento (1,02 a 1,12) andando de lado, e cada cena
// abre num círculo que cresce do meio (0,45 s).
// Jeito de animar: camadas-planas (canvas 2D) + fundo-pintado (fundos.js, pintados uma vez ao montar).
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
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d)))); // nunca negativo (raio de arco)
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      const brilho = (raio, cr) => { c.shadowColor = cr || cor('laranja'); c.shadowBlur = raio * escalaAtual(); c.shadowOffsetX = 0; c.shadowOffsetY = 0; };
      const semBrilho = () => { c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- letras geométricas redondas (traço largo de ponta redonda sobre letras.js) ----------
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
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (px), corContorno, brilho, tabular, sombra }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * 0.165;
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'creme'));
        const borda = cor(o.corContorno || '#000000');
        if (o.sombra) {
          c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = lw + (o.contorno || 0) * 2;
          for (const l of letras) { caminho(l.g, l.x + o.sombra, y + o.sombra, tam); c.stroke(); }
        }
        if (o.contorno) {
          c.strokeStyle = borda; c.lineWidth = lw + o.contorno * 2;
          for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); }
        }
        for (const l of letras) {
          const cr = corDe(l.palavra);
          if (o.brilho && cr === cor('laranja')) brilho(o.brilho, cr);
          c.strokeStyle = cr; c.lineWidth = lw;
          caminho(l.g, l.x, y, tam); c.stroke();
          semBrilho();
        }
      }
      // rótulo do cartaz: creme com borda teal (6 px) e sombrinha
      const rotulo = (txt, x, y, tam, o = {}) => escreve(txt, x, y, tam, { contorno: 6, corContorno: 'tealEscuro', sombra: 3, ...o });

      // ---------- confere as letras ao montar: letra que falta dá erro (não some sem aviso) ----------
      const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (function confereLetras() {
        const textos = (H.legendas || []).map((l) => l.texto);
        for (const cn of H.cenas) for (const p of cn.pecas) {
          for (const ch of ['texto', 'titulo', 'unidade']) if (p[ch]) textos.push(p[ch]);
          if (p.tipo === 'contador') textos.push(milhar(p.valor));
          if (p.tipo === 'barras') for (const it of p.itens) textos.push(it.nome, it.valor);
          if (p.tipo === 'helice') textos.push(p.esq.rotulo, p.dir.rotulo);
          if (p.tipo === 'heroi' && p.interroga) textos.push('?');
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- fundos pintados (uma vez) e as versões desfocadas/escurecidas ----------
      const M = 100; // margem do fundo (a câmera anda e treme)
      const FUNDOS = {};
      function fundo(nome, desfoca, escurece) {
        const chave = nome + '|' + (desfoca || 0) + '|' + (escurece || 0);
        if (FUNDOS[chave]) return FUNDOS[chave];
        let t;
        if (!desfoca && !escurece) {
          t = novaTela((L + 2 * M) * k, (A + 2 * M) * k);
          const g = t.getContext('2d'); g.scale(k, k); g.translate(M, M); Fundos.pintar(nome, g);
        } else {
          const base = fundo(nome, 0, 0);
          t = novaTela(base.width, base.height);
          const g = t.getContext('2d');
          g.filter = `blur(${(desfoca || 0) * k}px) brightness(${1 - (escurece || 0)})`; // o desfoque é em pixels da TELA
          g.drawImage(base, 0, 0); g.filter = 'none';
        }
        FUNDOS[chave] = t; return t;
      }
      for (const cn of H.cenas) fundo(cn.fundo, cn.desfoca, cn.escurece);

      // ---------- acabamento de impressão (em pixels da TELA, com piso de 1 px) ----------
      const W = tela.width, Ht = tela.height;
      const SOBRA = 64;
      const grao = novaTela(W + SOBRA, Ht + SOBRA);
      { const g = grao.getContext('2d'), img = g.createImageData(grao.width, grao.height), r = sorteio((H.semente || 1) + 900);
        for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 150; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); }
      const pontos = novaTela(W, Ht); // retícula fina por cima de tudo
      { const g = pontos.getContext('2d'), passo = Math.max(3, Math.round(7 * k * 1.5)), rr = Math.max(0.7, passo * 0.26);
        g.fillStyle = '#0e3b43';
        for (let y = 0, l = 0; y < Ht + passo; y += passo, l++) for (let x = (l % 2) * passo / 2; x < W + passo; x += passo) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } }
      const linhasTV = novaTela(W, Ht);
      { const g = linhasTV.getContext('2d'), passo = Math.max(3, Math.round(6 * k * 1.5)), h = Math.max(1, Math.round(2 * k));
        g.fillStyle = '#000'; for (let y = 0; y < Ht; y += passo) g.fillRect(0, y, W, h); }
      const vinheta = novaTela(W, Ht);
      { const g = vinheta.getContext('2d');
        const gr = g.createRadialGradient(W / 2, Ht / 2, W * 0.42, W / 2, Ht / 2, Ht * 0.62);
        gr.addColorStop(0, 'rgba(6,20,24,0)'); gr.addColorStop(1, 'rgba(6,20,24,0.7)');
        g.fillStyle = gr; g.fillRect(0, 0, W, Ht); }
      const franja = novaTela(W, Ht), fg = franja.getContext('2d');
      const AC = H.acabamento || {};
      function acabamento(t) {
        // franja vermelha e ciana: o vermelho vem de uma cópia um pouco maior (abre para fora nas bordas)
        const e = AC.franja ?? 0.008;
        fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'copy'; fg.globalAlpha = 1;
        fg.drawImage(tela, -W * e / 2, -Ht * e / 2, W * (1 + e), Ht * (1 + e));
        fg.globalCompositeOperation = 'multiply'; fg.fillStyle = '#ff0000'; fg.fillRect(0, 0, W, Ht);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        c.globalCompositeOperation = 'multiply'; c.fillStyle = '#00ffff'; c.fillRect(0, 0, W, Ht);
        c.globalCompositeOperation = 'lighter'; c.drawImage(franja, 0, 0);
        // retícula, grão que muda a cada quadro (sorteado pelo número do quadro) e linhas de TV
        c.globalCompositeOperation = 'multiply'; c.globalAlpha = AC.pontos ?? 0.1; c.drawImage(pontos, 0, 0);
        const r = sorteio((H.semente || 1) * 7 + Math.round(t * fps));
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = AC.grao ?? 0.16; c.drawImage(grao, -Math.floor(r() * SOBRA), -Math.floor(r() * SOBRA));
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = AC.linhas ?? 0.07; c.drawImage(linhasTV, 0, 0);
        c.globalAlpha = 1; c.drawImage(vinheta, 0, 0);
      }

      // ---------- câmera: zoom lento de 1,02 a 1,12 por cena, andando de lado (lado alterna a cada cena) ----------
      const CAM = H.camera || {};
      const IRIS = H.iris ?? 0.45;
      const CENAS = H.cenas;
      function camera(i, t) {
        const cn = CENAS[i], prox = CENAS[i + 1];
        const fim = prox ? prox.de + (prox.corte ? 0 : IRIS) : duracao;
        const u = trecho(t, cn.de, fim);
        const z = mistura(CAM.z0 ?? 1.02, CAM.z1 ?? 1.12, u);
        const lado = i % 2 ? 1 : -1;
        return { z, px: lado * (CAM.anda ?? 22) * (u * 2 - 1) };
      }
      const naCamera = (cam) => { c.translate(L / 2 + cam.px, A / 2); c.scale(cam.z, cam.z); c.translate(-L / 2, -A / 2); };
      // tremor da virada: vale para TUDO (fundo, peças, painéis, rótulos); só a legenda fica parada
      function tremor(t) {
        let dx = 0, dy = 0; const q = Math.round(t * fps);
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) {
            const r = sorteio((H.semente || 1) * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros);
            dx += (r() * 2 - 1) * f; dy += (r() * 2 - 1) * f;
          }
        }
        return { dx, dy };
      }

      // ---------- formas ----------
      function retRedondo(x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
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
      // painel de cromo arredondado (janela de TV do futuro)
      function painelCromo(x, y, w, h) {
        retRedondo(x - 10, y - 10, w + 20, h + 20, 46);
        const gr = c.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#a9c6c0'); gr.addColorStop(0.65, '#2f5a5c'); gr.addColorStop(1, '#c9dcd6');
        c.fillStyle = gr; c.fill();
        retRedondo(x, y, w, h, 36); c.fillStyle = cor('painel'); c.fill();
      }
      // raios de sol de cartaz (atrás do herói)
      function raios(x, y, r, giro, a) {
        c.save(); c.translate(x, y); c.rotate(giro);
        for (let i = 0; i < 16; i++) {
          c.globalAlpha = a * (i % 2 ? 0.35 : 0.6); c.fillStyle = i % 2 ? cor('creme') : cor('laranja');
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * Math.PI / 8, (i + 0.5) * Math.PI / 8); c.closePath(); c.fill();
        }
        c.restore();
        const gr = c.createRadialGradient(x, y, 0, x, y, r * 0.7);
        gr.addColorStop(0, 'rgba(255,207,138,' + (0.85 * a) + ')'); gr.addColorStop(1, 'rgba(255,138,31,0)');
        c.globalAlpha = 1; c.fillStyle = gr; c.beginPath(); c.arc(x, y, r * 0.7, 0, 7); c.fill();
      }

      // ---------- as peças ----------
      const PECAS = {
        texto(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.2), s = p.sobe ? 1 : pop(t, p.t), dy = p.sobe ? (1 - sai(u)) * 40 : 0;
          c.globalAlpha = (p.sobe ? u : 1) * some(p, t);
          const yc = p.y - p.tam * 0.45;
          emVolta(p.x, yc, s, () => rotulo(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, brilho: p.brilho, tabular: p.tabular, alinha: p.alinha }));
          if (p.risco && t >= p.risco.de) { // barra laranja que risca o texto
            const w = largTexto(p.texto, p.tam) + p.tam * 0.5, pr = sai(trecho(t, p.risco.de, p.risco.ate));
            c.globalAlpha = 1; c.lineCap = 'round';
            c.strokeStyle = cor('tealEscuro'); c.lineWidth = p.tam * 0.2; linha(p.x - w / 2, yc + p.tam * 0.08, p.x + w / 2, yc - p.tam * 0.08, pr);
            c.strokeStyle = cor('laranja'); c.lineWidth = p.tam * 0.12; linha(p.x - w / 2, yc + p.tam * 0.08, p.x + w / 2, yc - p.tam * 0.08, pr);
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          c.globalAlpha = trecho(t, p.de, p.de + 0.2) * some(p, t);
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v));
          emVolta(p.x, p.y - p.tam / 2, 1 + 0.06 * Math.max(0, 1 - trecho(t, p.ate, p.ate + 0.3)) * (u >= 1 ? 1 : 0), () =>
            rotulo(txt, p.x, p.y, p.tam, { cor: p.cor, brilho: p.brilho, tabular: true, contorno: 8 }));
        },
        // multidão de bustos em perspectiva (fileiras de trás menores); liga = linhas até um ponto; apaga = viram silhueta
        multidao(p, t) {
          if (t < p.de) return;
          const ap = p.apaga ? trecho(t, p.apaga, p.apaga + 0.5) : 0;
          const lugar = (i) => {
            const col = i % p.colunas, lin = Math.floor(i / p.colunas), e = mistura(p.longe ?? 0.72, 1, lin / Math.max(1, p.linhas - 1));
            return { x: p.x + (col - (p.colunas - 1) / 2 + (lin % 2 ? 0.25 : -0.25)) * p.dx * e, y: p.y + lin * p.dy * mistura(0.85, 1.1, lin / Math.max(1, p.linhas - 1)), tam: p.tam * e, lin, col };
          };
          const n = p.colunas * p.linhas;
          for (let i = 0; i < n; i++) {
            const q = lugar(i), t0 = p.de + (p.ate - p.de) * (i / n), s = pop(t, t0, 0.3);
            c.globalAlpha = 1;
            emVolta(q.x, q.y + q.tam / 2, s, () => Figuras.homem(c, q.x, q.y, q.tam, { sem: (H.semente || 1) * 100 + i, apaga: ap }));
          }
          // linhas de luz de cada cabeça até o ponto (por cima da multidão)
          if (p.liga && t >= p.liga.de) {
            c.lineCap = 'round';
            for (let i = 0; i < n; i++) {
              const q = lugar(i), atraso = ((p.linhas - 1 - q.lin) * 0.05 + Math.abs(q.col - (p.colunas - 1) / 2) * 0.02);
              const pr = sai(trecho(t, p.liga.de + atraso, p.liga.ate));
              c.globalAlpha = 0.7 * (1 - 0.6 * trecho(t, p.liga.ate + 0.2, p.liga.ate + 0.8));
              c.strokeStyle = cor('creme'); c.lineWidth = 2.2; linha(q.x, q.y - q.tam * 0.38, p.liga.para[0], p.liga.para[1], pr);
            }
          }
        },
        // o herói: Gêngis Khan em busto, sobre raios de sol de cartaz
        heroi(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.45), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.4)) : 0;
          c.globalAlpha = 1;
          const ra = limita(trecho(t, p.t, p.t + 0.4)) * (1 - 0.75 * cont);
          if (ra > 0) raios(p.x, p.y - p.tam * 0.12, p.tam * 0.72 * Math.max(0.2, s), t * 0.15, ra);
          emVolta(p.x, p.y + p.tam / 2, s, () => Figuras.khan(c, p.x, p.y, p.tam, { contorno: cont }));
          if (p.interroga && t >= p.interroga) {
            const si = pop(t, p.interroga + 0.1, 0.4), yq = p.y + p.tam * 0.06;
            emVolta(p.x, yq - p.tam * 0.1, si, () => rotulo('?', p.x, yq, p.tam * 0.28, { cor: 'laranja', brilho: 16 }));
          }
        },
        // janela de TV do futuro: cromo, faixa creme com o título e três botões
        janela(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), x = p.x - p.l / 2, y = p.y - p.a / 2;
          emVolta(p.x, p.y, 0.85 + 0.15 * s, () => {
            c.globalAlpha = limita(s);
            painelCromo(x, y, p.l, p.a);
            retRedondo(x + 22, y + 22, p.l - 44, 76, 26); c.fillStyle = cor('areia'); c.fill();
            ['laranja', 'vermelho', 'teal'].forEach((cr, i) => { c.beginPath(); c.arc(x + 70 + i * 40, y + 60, 12, 0, 7); c.fillStyle = cor(cr); c.fill(); });
            escreve(p.titulo, p.x + 60, y + 78, 32, { cor: 'tealEscuro' });
          });
        },
        // pasta de arquivo: aba laranja com o título, folha creme com linhas datilografadas e clipe
        pasta(p, t) {
          if (t < p.t) return;
          const s = pop(t, p.t, 0.4), x = p.x - p.l / 2, y = p.y - p.a / 2;
          emVolta(p.x, p.y, 0.85 + 0.15 * s, () => {
            c.globalAlpha = limita(s);
            retRedondo(x, y - 60, p.l * 0.55, 120, 22); c.fillStyle = '#c8743a'; c.fill();
            retRedondo(x, y, p.l, p.a, 22); c.fill();
            retRedondo(x + 26, y + 30, p.l - 52, p.a - 50, 10); c.fillStyle = cor('areia'); c.fill();
            escreve(p.titulo, x + 40, y - 8, 32, { cor: 'creme', alinha: 'esquerda', contorno: 3, corContorno: '#7a3e1f' });
            c.strokeStyle = 'rgba(14,59,67,0.28)'; c.lineWidth = 12; c.lineCap = 'round';
            for (let i = 0; i < (p.linhas || 0); i++) { const yy = y + 110 + i * 72, w = (p.l - 160) * (i % 3 === 1 ? 0.55 : 0.85); linha(x + 70, yy, x + 70 + w, yy, sai(trecho(t, p.t + 0.1 + i * 0.05, p.t + 0.45 + i * 0.05))); }
            c.strokeStyle = '#c9dcd6'; c.lineWidth = 8; retRedondo(x + p.l - 120, y - 30, 40, 120, 20); c.stroke();
          });
        },
        // tubos de ensaio de vidro com tampa de cromo; um enche de laranja
        tubos(p, t) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.55, h = p.tam;
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, s = pop(t, t0, 0.3);
            const cheio = p.enche && i === p.enche.i ? sai(trecho(t, p.enche.t, p.enche.t + 0.4)) : 0;
            c.globalAlpha = 1;
            emVolta(x, p.y + h / 2, s, () => {
              const forma = () => { c.beginPath(); c.moveTo(x - w / 2, p.y - h / 2); c.lineTo(x - w / 2, p.y + h / 2 - w / 2); c.arc(x, p.y + h / 2 - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, p.y - h / 2); c.closePath(); };
              forma(); c.fillStyle = 'rgba(214,232,220,0.22)'; c.fill();
              c.save(); forma(); c.clip();
              const topo = mistura(p.y + h * 0.18, p.y - h * 0.2, cheio);
              c.fillStyle = cheio > 0 ? cor('laranja') : cor('teal'); c.globalAlpha = cheio > 0 ? 1 : 0.7;
              if (cheio > 0) brilho(18);
              c.fillRect(x - w, topo, 2 * w, h); semBrilho(); c.restore();
              c.globalAlpha = 1;
              forma(); c.strokeStyle = cheio > 0 ? cor('laranja') : cor('creme'); c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
              c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x - w / 2 + 5, p.y - h / 2 + 18, 5, h * 0.55);
              retRedondo(x - w / 2 - 6, p.y - h / 2 - 16, w + 12, 18, 6); c.fillStyle = '#c9dcd6'; c.fill();
            });
          }
        },
        // fichas em pílula com um bonequinho; uma acende
        fila(p, t) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2;
          for (let i = 0; i < n; i++) {
            const x = x0 + (i % p.colunas) * p.dx, y = p.y + Math.floor(i / p.colunas) * p.dy;
            const s = pop(t, p.de + (p.ate - p.de) * i / n, 0.3);
            const ac = p.acende && i === p.acende.i ? trecho(t, p.acende.t, p.acende.t + 0.15) : 0;
            const sa = ac > 0 ? 1 + 0.12 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.35)) : 1;
            const w = p.tam * 0.62, h = p.tam;
            c.globalAlpha = 1;
            emVolta(x, y + h / 2, s * sa, () => {
              if (ac > 0) brilho(34 * ac);
              retRedondo(x - w / 2, y - h / 2, w, h, w / 2); c.fillStyle = Filme.hex(cor('areia'), cor('laranja'), ac); c.fill(); semBrilho();
              c.strokeStyle = cor('tealEscuro'); c.lineWidth = 6; c.stroke();
              c.fillStyle = Filme.hex(cor('teal'), cor('creme'), ac);
              c.beginPath(); c.arc(x, y - h * 0.12, w * 0.2, 0, 7); c.fill();
              c.beginPath(); c.ellipse(x, y + h * 0.24, w * 0.32, h * 0.16, 0, Math.PI, 0); c.fill();
            });
          }
        },
        // mapa no painel teal: terra creme, região laranja que varre de leste a oeste, anéis, império vermelho
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          const sp = pop(t, p.contorno.de, 0.35);
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb) * (0.9 + 0.1 * sp); c.scale(z, z); c.translate(-p.x, -p.y);
          const px0 = p.x - p.painel.l / 2, py0 = p.y - p.painel.a / 2;
          c.globalAlpha = limita(sp * 3);
          painelCromo(px0, py0, p.painel.l, p.painel.a);
          retRedondo(px0, py0, p.painel.l, p.painel.a, 36); c.fillStyle = cor('mar'); c.fill();
          c.save(); retRedondo(px0, py0, p.painel.l, p.painel.a, 36); c.clip();
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          c.globalAlpha = trecho(t, p.contorno.de + 0.3, p.contorno.ate + 0.2);
          c.fillStyle = cor('terra');
          for (const r of terras) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
          c.globalAlpha = 1; c.strokeStyle = cor('creme'); c.lineWidth = 3; c.lineJoin = 'round';
          for (const r of terras) polilinha(r, pc);
          c.globalAlpha = trecho(t, p.contorno.ate, p.contorno.ate + 0.3); c.strokeStyle = cor('teal');
          for (const r of terras) polilinha(r, 1);
          const forma = (pts) => { c.beginPath(); pts.map(pj).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
          if (p.regiao && t >= p.regiao.de) {
            const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 10, xa - 10, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
            c.globalAlpha = 1 - 0.5 * im; forma(T.regiao); c.fillStyle = 'rgba(255,138,31,0.85)'; c.fill();
            c.strokeStyle = cor('tealEscuro'); c.lineWidth = 3; c.stroke();
            if (p.aneis && t >= p.aneis.t) {
              c.save(); forma(T.regiao); c.clip();
              const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]);
              const pa = p.aneis.passo; let i = 0;
              for (let lat = la + pa / 2; lat < lb; lat += pa * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? pa / 2 : 0); lon < Math.max(...lo); lon += pa) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                if (s <= 0) continue;
                c.beginPath(); c.arc(x, y, 6 * s, 0, 7); c.fillStyle = cor('creme'); c.fill();
              }
              c.restore();
            }
            c.restore();
          }
          if (p.imperio && t >= p.imperio.pulsa) {
            const [px, py] = pj(p.imperio.ponto);
            if (t >= p.imperio.de) {
              const u = sai(trecho(t, p.imperio.de, p.imperio.ate));
              c.save(); c.beginPath(); c.arc(px, py, 20 + u * 700, 0, 7); c.clip();
              c.globalAlpha = 1; forma(T.imperio); c.fillStyle = 'rgba(232,72,48,0.6)'; c.fill();
              c.strokeStyle = cor('vermelho'); c.lineWidth = 3.5; c.stroke();
              c.restore();
            }
            c.globalAlpha = 1; brilho(16); c.fillStyle = cor('laranja'); c.beginPath(); c.arc(px, py, 11 * pop(t, p.imperio.pulsa, 0.3), 0, 7); c.fill(); semBrilho();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            c.globalAlpha = 1 - fase; c.strokeStyle = cor('laranja'); c.lineWidth = 4; c.beginPath(); c.arc(px, py, 11 + fase * 40, 0, 7); c.stroke();
          }
          c.restore();
          c.restore();
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo, u = passa(trecho(t, t0, t0 + p.dur));
            if (t < t0) return;
            c.globalAlpha = trecho(t, t0, t0 + 0.15);
            const D = it.cor === 'laranja';
            rotulo(it.nome, p.x - 24, y + 16, 39, { cor: D ? 'laranja' : 'creme', alinha: 'direita', contorno: 5 });
            const w = Math.max(8, p.larg * it.v / p.maximo * u);
            if (D) brilho(18);
            retRedondo(p.x, y - p.alt / 2, w, p.alt, p.alt / 2); c.fillStyle = cor(it.cor); c.fill(); semBrilho();
            c.strokeStyle = cor('tealEscuro'); c.lineWidth = 4; c.stroke();
            c.fillStyle = 'rgba(255,255,255,0.35)'; retRedondo(p.x + 8, y - p.alt / 2 + 6, Math.max(0, w - 16), p.alt * 0.22, p.alt * 0.11); c.fill();
            c.globalAlpha = trecho(t, t0 + p.dur * 0.6, t0 + p.dur);
            rotulo(it.valor, p.x + w + 22, y + 15, 43, { cor: D ? 'laranja' : 'creme', alinha: 'esquerda', tabular: true, contorno: 5 });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; c.globalAlpha = trecho(t, t1, t1 + 0.3); rotulo(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 10, 30, { cor: 'creme', contorno: 5 }); }
        },
        carimbo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.22), s = mistura(2.2, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.25)) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD;
          const cr = Filme.hex(cor('vermelho'), '#b8ab90', ap);
          const w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.7;
          c.globalAlpha = limita(u * 1.6) * (1 - 0.35 * ap);
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          retRedondo(-w / 2, -h / 2, w, h, 18); c.strokeStyle = cr; c.lineWidth = 9; c.stroke();
          retRedondo(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 10); c.lineWidth = 3; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr });
          if (p.risco && t >= p.risco.de) {
            c.globalAlpha = 1; c.lineCap = 'round';
            c.strokeStyle = cor('tealEscuro'); c.lineWidth = 22; linha(-w / 2 - 20, 8, w / 2 + 20, -8, sai(trecho(t, p.risco.de, p.risco.ate)));
            c.strokeStyle = cor('laranja'); c.lineWidth = 14; linha(-w / 2 - 20, 8, w / 2 + 20, -8, sai(trecho(t, p.risco.de, p.risco.ate)));
          }
          c.restore();
        },
        // túmulos: montes de terra com pedras; ganham borda laranja (só o arco de cima)
        tumulos(p, t) {
          if (t < p.t) return;
          const s = p.tam, b = p.borda ? trecho(t, p.borda, p.borda + 0.4) : 1;
          const pos = [[-1.15, -0.55, 0.78], [1.15, -0.55, 0.78], [-1.35, 0.5, 1], [1.35, 0.5, 1]];
          pos.forEach(([i, j, e], n) => {
            const x = p.x + i * s, y = p.y + j * s, w = s * 0.95 * e, h = s * 0.5 * e, sc = pop(t, p.t + n * 0.06, 0.35);
            c.globalAlpha = 1;
            emVolta(x, y, sc, () => {
              c.fillStyle = 'rgba(20,10,5,0.45)'; c.beginPath(); c.ellipse(x, y + 4, w * 1.05, h * 0.25, 0, 0, 7); c.fill();
              const gr = c.createLinearGradient(x - w, y - h, x + w, y); gr.addColorStop(0, '#c98a5a'); gr.addColorStop(0.5, '#8e4f2c'); gr.addColorStop(1, '#4a2414');
              c.beginPath(); c.ellipse(x, y, w, h, 0, Math.PI, 0); c.closePath(); c.fillStyle = gr; c.fill();
              c.fillStyle = '#9a8f80';
              for (let q = 0; q < 7; q++) { const a = Math.PI + (q + 0.5) * Math.PI / 7; c.beginPath(); c.ellipse(x + Math.cos(a) * w * 0.98, y + Math.sin(a) * h * 0.98 + 3, w * 0.07, h * 0.1, 0, 0, 7); c.fill(); }
              if (b > 0) { c.globalAlpha = b; brilho(14); c.strokeStyle = cor('laranja'); c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, w + 8, h + 8, 0, Math.PI, 0); c.stroke(); semBrilho(); c.globalAlpha = 1; }
            });
          });
        },
        // hélice de DNA de contas (cromo e laranja) que sobe e se divide em dois ramos
        helice(p, t) {
          if (t < p.de) return;
          const n = 22, u = sai(trecho(t, p.de, p.ate));
          const giro = t * 2.4;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5);
            if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 70, frente = Math.cos(f);
            c.globalAlpha = vis * 0.8; c.strokeStyle = cor(i % 2 ? 'laranja' : 'teal'); c.lineWidth = 4; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof] of [[ax, frente], [-ax, -frente]]) {
              c.globalAlpha = vis * (0.55 + 0.45 * (prof + 1) / 2);
              const r = 10 + 5 * (prof + 1) / 2, gr = c.createRadialGradient(p.x + sx - r * 0.35, y - r * 0.35, 0, p.x + sx, y, r);
              gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#c9dcd6'); gr.addColorStop(1, '#2f5a5c');
              c.beginPath(); c.arc(p.x + sx, y, r, 0, 7); c.fillStyle = gr; c.fill();
            }
          }
          if (p.divide && t >= p.divide) {
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'laranja', m = 12;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                c.globalAlpha = D ? 1 : 0.75; if (D) brilho(14);
                c.beginPath(); c.arc(x, y, 10, 0, 7); c.fillStyle = cor(r.cor); c.fill(); semBrilho();
              }
              // o Y na ponta e o rótulo: entram enquanto o ramo ainda cresce (prontos bem antes do fim da cena)
              const t1 = p.divide + p.durDivide * 0.5;
              if (t >= t1) {
                const s = pop(t, t1, 0.3);
                c.globalAlpha = D ? 1 : 0.8;
                emVolta(r.x, r.y - 50, s, () => {
                  c.lineCap = 'round';
                  c.strokeStyle = cor('tealEscuro'); c.lineWidth = 24; c.beginPath(); c.moveTo(r.x - 26, r.y - 95); c.lineTo(r.x, r.y - 55); c.lineTo(r.x + 26, r.y - 95); c.moveTo(r.x, r.y - 55); c.lineTo(r.x, r.y - 20); c.stroke();
                  c.strokeStyle = cor(r.cor); c.lineWidth = 16; if (D) brilho(16);
                  c.beginPath(); c.moveTo(r.x - 26, r.y - 95); c.lineTo(r.x, r.y - 55); c.lineTo(r.x + 26, r.y - 95); c.moveTo(r.x, r.y - 55); c.lineTo(r.x, r.y - 20); c.stroke(); semBrilho();
                });
                c.globalAlpha = trecho(t, t1, t1 + 0.2) * (D ? 1 : 0.8);
                rotulo(r.rotulo, r.x, r.y - 125, 40, { cor: r.cor, brilho: D ? 14 : 0 });
              }
            }
          }
        },
        // árvore de família: galhos que descem da raiz até medalhões de retrato
        arvore(p, t) {
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, tam: p.raizTam }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, tam: nv.tam }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(trecho(t, t0, t0 + passo * 0.8));
            const pais = nos[l - 1], filhos = nos[l], porPai = filhos.length / pais.length;
            c.lineCap = 'round'; c.lineJoin = 'round';
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = pai.y + pai.tam / 2 + 6, yf = f.y - f.tam / 2 - 6, ym = (yb + yf) / 2;
              const pts = []; for (let q = 0; q <= 12; q++) { const s = q / 12, e = s * s * (3 - 2 * s); pts.push([mistura(pai.x, f.x, e), mistura(yb, yf, s)]); }
              c.globalAlpha = 1; c.strokeStyle = '#3a2418'; c.lineWidth = 12 - l * 2; polilinha(pts, pr);
              c.strokeStyle = cor('laranja'); c.lineWidth = 3; c.globalAlpha = 0.85; polilinha(pts, pr);
            });
            filhos.forEach((f, j) => {
              const s = pop(t, t0 + passo * 0.55 + j * 0.02, 0.3);
              c.globalAlpha = 1;
              emVolta(f.x, f.y, s, () => Figuras.medalhao(c, f.x, f.y, f.tam / 2, (H.semente || 1) * 50 + l * 10 + j));
            });
          }
        },
        // céu vivo: foguete que cruza e disco que desliza (dão movimento ao fundo)
        foguete(p, t) {
          const u = trecho(t, p.de, p.ate);
          if (t < p.de || u >= 1) return;
          const x = mistura(p.x0, p.x1, u), y = mistura(p.y0, p.y1, u), ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
          c.globalAlpha = 1; Figuras.foguete(c, x, y, p.tam, ang, Math.min(260, Math.hypot(x - p.x0, y - p.y0)));
        },
        disco(p, t) {
          const u = trecho(t, p.de, p.ate);
          c.globalAlpha = 1; Figuras.disco(c, mistura(p.x0, p.x1, u), mistura(p.y0, p.y1, u) + 8 * Math.sin(t * 2.2), p.tam);
        },
      };

      // ---------- uma cena inteira (fundo + peças), dentro do círculo da troca quando ele ainda abre ----------
      const RMAX = Math.hypot(L / 2, A / 2) + 40;
      function cena(i, t, sh, raio) {
        const cn = CENAS[i], cam = camera(i, t);
        const base = () => c.setTransform(k, 0, 0, k, sh.dx * k, sh.dy * k);
        c.save(); base();
        if (raio !== null) { c.beginPath(); c.arc(L / 2, A / 2, raio, 0, 7); c.clip(); }
        c.save(); naCamera(cam); c.globalAlpha = 1; c.drawImage(fundo(cn.fundo, cn.desfoca, cn.escurece), -M, -M, L + 2 * M, A + 2 * M); c.restore();
        for (const p of cn.pecas) { c.save(); if (p.cam) naCamera(cam); PECAS[p.tipo](p, t); c.restore(); }
        c.restore();
      }
      // aro da íris (laranja e creme) enquanto o círculo abre
      function aro(raio, sh) {
        c.setTransform(k, 0, 0, k, sh.dx * k, sh.dy * k); c.globalAlpha = 1;
        c.strokeStyle = cor('tealEscuro'); c.lineWidth = 18; c.beginPath(); c.arc(L / 2, A / 2, raio, 0, 7); c.stroke();
        c.strokeStyle = cor('laranja'); c.lineWidth = 9; c.beginPath(); c.arc(L / 2, A / 2, raio, 0, 7); c.stroke();
        c.strokeStyle = cor('creme'); c.lineWidth = 3; c.beginPath(); c.arc(L / 2, A / 2, raio + 11, 0, 7); c.stroke();
      }

      // ---------- legendas: branco com borda preta de 8 px, a palavra falada em laranja ----------
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
        const s = 0.9 + 0.1 * passa(trecho(t, lg.de, lg.de + 0.2));
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        emVolta(L / 2, yb - tam / 2, s, () => {
          let idx = 0;
          lg.linhas.forEach((ln, li) => {
            const y = yb - (n - 1 - li) * passoL, base = idx;
            escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('laranja') : '#ffffff'), contorno: 8, sombra: 3 });
            idx += ln.length;
          });
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        c.fillStyle = cor('fundo'); c.fillRect(0, 0, tela.width, tela.height);
        const sh = tremor(t);
        let aroAberto = null;
        CENAS.forEach((cn, i) => {
          if (t < cn.de) return;
          const prox = CENAS[i + 1];
          if (prox && t >= prox.de && (prox.corte || t >= prox.de + IRIS)) return; // já coberta pela próxima
          let raio = null;
          if (i > 0 && !cn.corte && t < cn.de + IRIS) { raio = RMAX * sai(trecho(t, cn.de, cn.de + IRIS)); aroAberto = raio; }
          cena(i, t, sh, raio);
        });
        acabamento(t);
        if (aroAberto !== null && aroAberto > 2) aro(aroAberto, sh);
        legenda(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: as mesmas marcas de tempo da imagem ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
        // fim da nota: se ela atravessa um corte, acaba no corte (nada fica soando no silêncio)
        const ateCorte = (tt, dur) => { for (const [a] of corta) if (tt < a && tt + dur > a - 0.03) return Math.max(0.02, a - tt - 0.04); return dur; };
        // arpejo escuro de serras desafinadas (A menor, 116 bpm), com um triângulo por baixo (som de válvula)
        const sem = 60 / (MU.bpm || 116) / 2, compasso = sem * 8, vol = MU.vol ?? 0.05;
        for (let i = 0, tt = 0.1; tt < duracao - 0.4; i++, tt += sem) {
          if (calado(tt)) continue;
          const ac = MU.acordes[Math.floor((tt - 0.1) / compasso) % MU.acordes.length];
          const n = ac[MU.padrao[i % MU.padrao.length]], v = vol * (i % 4 === 0 ? 1.15 : 0.85);
          const d = ateCorte(tt, sem * 0.7 + 0.12), corte = d < sem * 0.7 + 0.12, dn = corte ? d : sem * 0.7, so = corte ? 0.01 : 0.12;
          s.nota(n, tt, dn, { vol: v, forma: 'serra', ataque: 0.008, solta: so, pan: -0.35 });
          s.nota(n, tt + 0.004, dn, { vol: v * 0.8, forma: 'serra', ataque: 0.008, solta: so, pan: 0.35, vibrato: 0.004, vibratoHz: 0.6 });
          s.nota(n, tt, dn, { vol: v * 0.6, forma: 'tri', ataque: 0.01, solta: so });
        }
        for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += compasso) {
          if (calado(tt)) continue;
          const ac = MU.acordes[b % MU.acordes.length];
          const corteAqui = corta.find(([a]) => a > tt && a < tt + compasso);
          const dur = corteAqui ? Math.max(0.1, corteAqui[0] - tt - 0.06) : compasso - 0.15, so = corteAqui ? 0.03 : 0.2;
          s.nota(ac[0], tt, dur, { vol: MU.baixo ?? 0.11, forma: 'seno', ataque: 0.02, solta: so });
          s.nota(ac[0], tt, dur, { vol: (MU.baixo ?? 0.11) * 0.35, forma: 'serra', ataque: 0.02, solta: so });
          if (!corteAqui || corteAqui[0] - tt > 0.35) s.batida(tt, { vol: 0.22, freq: 60, dur: 0.3 });
        }
        // bip de painel quando as peças entram
        const blip = (tt, f = 1500, v = 0.035) => s.pio(tt, { freq: f, vol: v, repete: 1, dur: 0.035, sobe: 0.4 });
        for (const cn of H.cenas) {
          if (cn.de > 0 && !cn.corte) s.vento(cn.de, IRIS + 0.1, { vol: 0.07, corte: 2800, onda: 2, entra: 0.08, sai: 0.25 }); // a íris abrindo
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
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.05) s.toque(tt, { vol: 0.05, corte: 7000, dur: 0.015, pan: (r() - 0.5) * 0.4 });
        for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.5, freq: 55, dur: 0.45 }); s.toque(tt, { vol: 0.08, corte: 1200, dur: 0.1 }); }
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.4 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.13, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.04 }); }
        if (SO.arranhao !== undefined) { // arranhão de disco na virada
          const a = SO.arranhao;
          s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
          s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
          s.batida(a, { vol: 0.42, freq: 70, dur: 0.3 });
        }
        if (SO.grave !== undefined) { ['A1', 'E2', 'A2'].forEach((n) => s.nota(n, SO.grave, 0.35, { vol: 0.14, forma: 'serra', ataque: 0.005, solta: 0.5 })); s.batida(SO.grave, { vol: 0.42, freq: 50, dur: 0.5 }); }
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
        s.sala(0.2);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
