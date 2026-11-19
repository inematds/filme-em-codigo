// MOTOR "aquarela" — curta vertical pintado em aquarela solta: aguadas molhadas e transparentes, bordas
// que sangram, flores de pigmento, papel de grão grosso aparecendo, paleta terrosa e apagada com
// respingos de carmim. A câmera de sonho aproxima devagar (1,06 a 1,14) balançando de lado, as camadas
// andam em paralaxe e "fervem" de leve 8 vezes por segundo; a cena nova entra numa mancha d'água que se
// abre do meio. Rótulos em itálico sépia sobre caixinha de papel, destaque em carmim.
// Jeito de animar: fundo-pintado (camadas pintadas uma vez em canvas 2D) + peças por cima.
// Este arquivo sabe DESENHAR. O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, sorteio, ruido, suave } = Filme;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180, TAU = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 20,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const cTela = tela.getContext('2d');
      let c = cTela; // troca de tela quando a cena é montada à parte (para a mancha que abre)
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const { aguada, bolha, escuro } = Pinturas;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.3; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d)))); // nunca negativo (raio de arco)

      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      const sombraMacia = (raio = 10, dy = 3, cr) => { const s = escalaAtual(); c.shadowColor = cr || 'rgba(58,36,24,0.35)'; c.shadowBlur = raio * s; c.shadowOffsetX = 0; c.shadowOffsetY = dy * s; };
      const semBrilho = () => { c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- letras em traços (letras.js); itálico = topo da letra puxado para a direita ----------
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
          out.push({ g, x: px + dx, palavra });
          px += avanco(ch, tab) * tam;
        }
        return { letras: out, w };
      }
      function caminho(g, x, y, tam, inc = 0) {
        c.beginPath();
        for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam + (1 - b) * tam * inc, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (borda preta), sombra, tabular, peso, italico }
      function escreve(txt, x, y, tam, o = {}) {
        const inc = o.italico ? 0.2 : 0;
        const { letras } = arruma(txt, x - tam * inc * 0.5, tam, o.alinha, o.tabular);
        const lw = tam * (o.peso || 0.16);
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'tinta'));
        if (o.contorno) {
          c.strokeStyle = '#000'; c.lineWidth = lw + o.contorno * 2;
          if (o.sombra) { const s = escalaAtual(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 0; c.shadowOffsetX = o.sombra * s; c.shadowOffsetY = o.sombra * s; }
          for (const l of letras) { caminho(l.g, l.x, y, tam, inc); c.stroke(); }
          semBrilho();
        }
        for (const l of letras) {
          c.strokeStyle = corDe(l.palavra); c.lineWidth = lw;
          caminho(l.g, l.x, y, tam, inc); c.stroke();
        }
      }
      // caixinha de papel macio atrás do rótulo (a fonte: papel claro a 78%)
      function caixaPapel(xc, yc, w, h, a = 1) {
        const a0 = c.globalAlpha;
        sombraMacia(14, 4, 'rgba(58,36,24,0.28)');
        c.globalAlpha = a0 * a; retRedondo(xc - w / 2, yc - h / 2, w, h, h * 0.14); c.fillStyle = cor('caixa'); c.fill(); semBrilho();
        c.globalAlpha = a0 * a * 0.35; retRedondo(xc - w / 2 + 5, yc - h / 2 + 4, w - 10, h - 8, h * 0.12); c.fillStyle = cor('papel'); c.fill();
        c.globalAlpha = a0;
      }
      // rótulo: texto em itálico sépia sobre a caixinha
      function rotulo(txt, x, y, tam, o = {}) {
        const w = largTexto(txt, tam, o.tabular) + tam * (0.9 + 0.2), h = tam * 1.55;
        const xc = o.alinha === 'esquerda' ? x + w / 2 - tam * 0.5 : o.alinha === 'direita' ? x - w / 2 + tam * 0.5 : x;
        if (o.caixa !== false) caixaPapel(xc, y - tam * 0.5, w, h);
        escreve(txt, x, y, tam, { ...o, italico: o.italico ?? true, peso: o.peso || 0.15 });
        return { xc, yc: y - tam * 0.5, w, h };
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
          if (p.tipo === 'heroi' && p.interroga) textos.push('?');
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- gente em aquarela: corpo e cabeça em aguada, sem contorno, borda de pigmento ----------
      // desenha com o pé em (0, 0); tam = altura. v = { roupa, pele, cabelo, chapeu }
      function pintaPessoa(g, tam, v, ac) {
        const r = tam * 0.125, yc = -tam + r, ombro = yc + r * 1.15, mol = Math.max(0.6, tam * 0.012), bw = Math.max(0.6, tam * 0.012), pas = Math.max(3, tam * 0.05);
        aguada(g, bolha(tam * 0.04, -tam * 0.01, tam * 0.2, tam * 0.035, 3, 0.2, 24), cor('sepia'), ac, { passes: 6, molhado: mol, alfa: 0.05, borda: 0, passo: pas });
        const corpo = [[-tam * 0.13, ombro + r * 0.2], [0, ombro - r * 0.3], [tam * 0.13, ombro + r * 0.2], [tam * 0.19, -tam * 0.03], [0, tam * 0.005], [-tam * 0.19, -tam * 0.03]];
        aguada(g, corpo, v.roupa, ac, { passes: 12, molhado: mol, alfa: 0.15, borda: 0.4, bordaW: bw, passo: pas });
        aguada(g, [[-tam * 0.13, ombro + r * 0.4], [-tam * 0.03, ombro], [-tam * 0.05, -tam * 0.03], [-tam * 0.18, -tam * 0.03]], escuro(v.roupa, 0.35), ac, { passes: 6, molhado: mol, alfa: 0.09, borda: 0, passo: pas });
        aguada(g, bolha(0, yc, r, r * 1.08, 5, 0.06, 24), v.pele, ac, { passes: 10, molhado: mol * 0.6, alfa: 0.17, borda: 0.35, bordaW: bw, passo: pas });
        if (v.chapeu) chapeuPele(g, 0, yc, r, v, ac);
        else aguada(g, bolha(-r * 0.1, yc - r * 0.55, r * 1.05, r * 0.62, 9, 0.12, 24, -0.15), v.cabelo || '#3a2418', ac, { passes: 8, molhado: mol * 0.5, alfa: 0.17, borda: 0.2, bordaW: bw, passo: pas });
      }
      // gorro mongol: copa arredondada de feltro com bico curto e aba larga de pele dobrada para cima
      function chapeuPele(g, x, yc, r, v, ac) {
        const mol = Math.max(0.5, r * 0.06), pas = Math.max(2, r * 0.3);
        aguada(g, [[x - r * 0.95, yc - r * 0.55], [x - r * 0.75, yc - r * 1.35], [x - r * 0.2, yc - r * 1.75], [x + r * 0.1, yc - r * 2.05], [x + r * 0.35, yc - r * 1.7], [x + r * 0.85, yc - r * 1.3], [x + r * 0.95, yc - r * 0.55]], v.chapeu, ac, { passes: 10, molhado: mol, alfa: 0.17, borda: 0.35, bordaW: Math.max(0.5, r * 0.07), passo: pas });
        aguada(g, bolha(x, yc - r * 0.62, r * 1.22, r * 0.4, 13, 0.14, 28), v.pele2 || '#a8875e', ac, { passes: 10, molhado: mol, alfa: 0.18, borda: 0.3, bordaW: Math.max(0.5, r * 0.06), passo: pas, graos: 3 });
        // pelos da aba
        g.strokeStyle = '#5a4030'; g.lineCap = 'round'; g.lineWidth = Math.max(0.5, r * 0.06);
        for (let i = 0; i < 14; i++) { const px = x - r * 1.1 + i * r * 0.17; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(px, yc - r * 0.42); g.lineTo(px + r * 0.05, yc - r * 0.8); g.stroke(); }
        g.globalAlpha = 1;
      }
      // Gêngis Khan a cavalo (de lado, olhando para a direita): cavalo baio, deel carmim, gorro de pele
      function pintaGinete(g, tam, ac) {
        const s = tam, bw = Math.max(0.6, s * 0.008), mol = Math.max(0.6, s * 0.008), pas = Math.max(3, s * 0.04);
        const cav = cor('cavalo'), deel = cor('deel');
        aguada(g, bolha(0, -s * 0.01, s * 0.36, s * 0.04, 4, 0.2), cor('sepia'), ac, { passes: 6, molhado: mol * 2, alfa: 0.06, borda: 0, passo: pas });
        // pernas
        g.strokeStyle = escuro(cav, 0.25); g.lineCap = 'round';
        for (const [x0, x1, lw] of [[-0.22, -0.26, 0.035], [-0.12, -0.08, 0.035], [0.15, 0.2, 0.035], [0.24, 0.3, 0.032]]) {
          for (let i = 0; i < 3; i++) { g.globalAlpha = 0.45; g.lineWidth = s * lw * (1 - i * 0.2); g.beginPath(); g.moveTo(x0 * s, -s * 0.36); g.quadraticCurveTo((x0 + x1) / 2 * s + s * 0.02, -s * 0.18, x1 * s, -s * 0.02); g.stroke(); }
        }
        g.globalAlpha = 1;
        // cauda
        aguada(g, [[-s * 0.3, -s * 0.48], [-s * 0.42, -s * 0.36], [-s * 0.44, -s * 0.16], [-s * 0.37, -s * 0.3], [-s * 0.31, -s * 0.42]], '#2e2018', ac, { passes: 8, molhado: mol, alfa: 0.16, borda: 0.2, bordaW: bw, passo: pas });
        // corpo, pescoço e cabeça
        aguada(g, bolha(0, -s * 0.44, s * 0.32, s * 0.12, 21, 0.06), cav, ac, { passes: 14, molhado: mol, alfa: 0.15, borda: 0.4, bordaW: bw, passo: pas, flores: 1, florR: s * 0.08 });
        aguada(g, [[s * 0.18, -s * 0.52], [s * 0.28, -s * 0.7], [s * 0.36, -s * 0.74], [s * 0.4, -s * 0.66], [s * 0.3, -s * 0.5], [s * 0.26, -s * 0.38]], cav, ac, { passes: 12, molhado: mol, alfa: 0.15, borda: 0.4, bordaW: bw, passo: pas });
        aguada(g, bolha(s * 0.42, -s * 0.66, s * 0.075, s * 0.04, 22, 0.08, 24, 0.55), cav, ac, { passes: 10, molhado: mol, alfa: 0.17, borda: 0.4, bordaW: bw, passo: pas });
        aguada(g, [[s * 0.24, -s * 0.72], [s * 0.33, -s * 0.76], [s * 0.26, -s * 0.56], [s * 0.2, -s * 0.5]], '#2e2018', ac, { passes: 8, molhado: mol, alfa: 0.15, borda: 0, passo: pas }); // crina
        // o deel do cavaleiro (cobre a sela e desce pela barriga do cavalo)
        aguada(g, [[-s * 0.1, -s * 0.84], [s * 0.06, -s * 0.86], [s * 0.1, -s * 0.66], [s * 0.14, -s * 0.44], [s * 0.06, -s * 0.33], [-s * 0.1, -s * 0.34], [-s * 0.16, -s * 0.48], [-s * 0.12, -s * 0.66]], deel, ac, { passes: 14, molhado: mol, alfa: 0.16, borda: 0.45, bordaW: bw, passo: pas });
        aguada(g, [[-s * 0.12, -s * 0.66], [-s * 0.04, -s * 0.7], [-s * 0.08, -s * 0.36], [-s * 0.15, -s * 0.46]], escuro(deel, 0.35), ac, { passes: 6, molhado: mol, alfa: 0.1, borda: 0, passo: pas });
        // faixa da cintura e a gola do deel (fecho em diagonal)
        g.strokeStyle = '#c9a86a'; g.lineCap = 'round'; g.lineWidth = s * 0.018; g.globalAlpha = 0.75;
        g.beginPath(); g.moveTo(-s * 0.13, -s * 0.6); g.lineTo(s * 0.1, -s * 0.6); g.stroke();
        g.strokeStyle = escuro(deel, 0.5); g.lineWidth = s * 0.01; g.beginPath(); g.moveTo(-s * 0.04, -s * 0.85); g.lineTo(s * 0.07, -s * 0.66); g.stroke();
        g.globalAlpha = 1;
        // braço com as rédeas
        aguada(g, [[s * 0.02, -s * 0.8], [s * 0.12, -s * 0.66], [s * 0.2, -s * 0.62], [s * 0.18, -s * 0.58], [s * 0.08, -s * 0.62], [-s * 0.02, -s * 0.74]], deel, ac, { passes: 8, molhado: mol, alfa: 0.16, borda: 0.4, bordaW: bw, passo: pas });
        g.strokeStyle = '#2e2018'; g.lineWidth = bw; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(s * 0.19, -s * 0.6); g.lineTo(s * 0.4, -s * 0.64); g.stroke(); g.globalAlpha = 1;
        // cabeça, bigode fino e gorro
        const r = s * 0.052, hy = -s * 0.9;
        aguada(g, bolha(s * 0.01, hy, r, r * 1.1, 31, 0.05, 24), cor('peleKhan'), ac, { passes: 10, molhado: mol * 0.5, alfa: 0.18, borda: 0.4, bordaW: bw, passo: pas });
        g.strokeStyle = '#2a1a12'; g.lineWidth = Math.max(0.6, s * 0.006); g.globalAlpha = 0.7;
        g.beginPath(); g.moveTo(s * 0.03, hy + r * 0.45); g.quadraticCurveTo(s * 0.05, hy + r * 0.9, s * 0.045, hy + r * 1.5); g.stroke();
        g.globalAlpha = 1;
        chapeuPele(g, s * 0.01, hy, r, { chapeu: cor('feltro'), pele2: cor('pelo') }, ac);
      }
      // busto do mesmo homem (para o medalhão): ombros de deel com gola de pele, rosto, bigode, barbicha
      function pintaBusto(g, tam, ac) {
        const s = tam, r = s * 0.2, hy = -s * 0.62, bw = Math.max(0.6, s * 0.012), pas = Math.max(3, s * 0.04), mol = Math.max(0.6, s * 0.01);
        aguada(g, [[-s * 0.45, 0], [-s * 0.4, -s * 0.3], [-s * 0.15, -s * 0.42], [s * 0.15, -s * 0.42], [s * 0.4, -s * 0.3], [s * 0.45, 0]], cor('deel'), ac, { passes: 14, molhado: mol, alfa: 0.15, borda: 0.4, bordaW: bw, passo: pas });
        g.strokeStyle = escuro(cor('deel'), 0.5); g.lineWidth = s * 0.02; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(-s * 0.1, -s * 0.4); g.lineTo(s * 0.16, -s * 0.05); g.stroke(); g.globalAlpha = 1;
        aguada(g, bolha(0, -s * 0.4, s * 0.2, s * 0.06, 41, 0.15, 28), cor('pelo'), ac, { passes: 8, molhado: mol, alfa: 0.16, borda: 0.25, bordaW: bw, passo: pas, graos: 3 });
        aguada(g, bolha(0, hy, r * 0.88, r, 43, 0.04, 28), cor('peleKhan'), ac, { passes: 12, molhado: mol * 0.5, alfa: 0.17, borda: 0.4, bordaW: bw, passo: pas });
        g.fillStyle = '#2a1a12'; g.globalAlpha = 0.8;
        for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * 0.35, hy - r * 0.05, r * 0.11, r * 0.06, 0, 0, TAU); g.fill(); }
        g.strokeStyle = '#2a1a12'; g.lineCap = 'round'; g.lineWidth = Math.max(0.6, s * 0.012);
        for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * r * 0.05, hy + r * 0.38); g.quadraticCurveTo(sx * r * 0.45, hy + r * 0.45, sx * r * 0.5, hy + r * 1.05); g.stroke(); }
        g.beginPath(); g.moveTo(0, hy + r * 0.8); g.lineTo(0, hy + r * 1.15); g.stroke();
        g.globalAlpha = 1;
        chapeuPele(g, 0, hy, r, { chapeu: cor('feltro'), pele2: cor('pelo') }, ac);
      }
      // sprites: cada figura é pintada UMA vez numa tela própria e só colada no filme
      const SPR = {};
      function sprite(chave, w, h, ox, oy, pinta) {
        if (SPR[chave]) return SPR[chave];
        const q = k * 1.4, t = novaTela(w * q, h * q), g = t.getContext('2d');
        g.setTransform(q, 0, 0, q, ox * q, oy * q);
        pinta(g, sorteio((H.semente || 1) * 7 + chave.length * 131 + chave.charCodeAt(chave.length - 1)));
        return (SPR[chave] = { tela: t, w, h, ox, oy });
      }
      const cola = (sp, x, y, esc = 1) => c.drawImage(sp.tela, x - sp.ox * esc, y - sp.oy * esc, sp.w * esc, sp.h * esc);
      const vesteDe = (i) => { const R = P.roupas, Pe = P.peles, C = P.cabelos; return { roupa: R[(i * 7 + 3) % R.length], pele: Pe[(i * 5 + 1) % Pe.length], cabelo: C[(i * 3) % C.length] }; };
      const pessoaSpr = (tam, v, chave) => sprite('p' + chave + '@' + Math.round(tam), tam * 0.5, tam * 1.12, tam * 0.25, tam * 1.06, (g, ac) => pintaPessoa(g, tam, v, ac));
      const gineteSpr = (tam) => sprite('ginete@' + tam, tam * 0.95, tam * 1.18, tam * 0.48, tam * 1.1, (g, ac) => pintaGinete(g, tam, ac));
      const bustoSpr = (tam) => sprite('busto@' + tam, tam, tam, tam / 2, tam, (g, ac) => pintaBusto(g, tam, ac));

      // gente parada dentro da pintura (os cientistas do laboratório)
      Pinturas.gente = (g, p, ac) => { for (const [x, y, tam, roupa, pele, cabelo] of p.itens) { g.save(); g.translate(x, y); pintaPessoa(g, tam, { roupa, pele, cabelo }, ac); g.restore(); } };

      // ---------- papel: grão grosso (cold-press), em pixels da tela (célula >= 1 px) ----------
      const graoPapel = (() => {
        const w = Math.max(64, Math.round(largura / 3)), h = Math.max(64, Math.round(altura / 3)), r = sorteio(9191);
        const t1 = novaTela(w, h), g1 = t1.getContext('2d'), img = g1.createImageData(w, h);
        for (let i = 0; i < w * h; i++) { const v = Math.round(128 + (r() - 0.5) * 120); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
        g1.putImageData(img, 0, 0);
        const t = novaTela(largura, altura), g = t.getContext('2d');
        g.imageSmoothingEnabled = true; g.filter = `blur(${Math.max(0.6, 1.4 * k)}px)`; g.drawImage(t1, 0, 0, largura, altura); g.filter = 'none';
        // dentes miúdos (1 px)
        const fino = g.getImageData(0, 0, largura, altura), rf = sorteio(5151);
        for (let i = 0; i < largura * altura; i++) { const d = (rf() - 0.5) * 40; fino.data[i * 4] += d; fino.data[i * 4 + 1] += d; fino.data[i * 4 + 2] += d; }
        g.putImageData(fino, 0, 0);
        return t;
      })();
      // máscara do grão para furar a tinta (o papel aparece em pontinhos): só os dentes mais altos
      const furos = (() => {
        const t = novaTela(largura, altura), g = t.getContext('2d'), img = graoPapel.getContext('2d').getImageData(0, 0, largura, altura);
        for (let i = 0; i < largura * altura; i++) { const v = img.data[i * 4]; const a = limita((v - 150) / 40); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 0; img.data[i * 4 + 3] = Math.round(a * 255); }
        g.putImageData(img, 0, 0);
        return t;
      })();
      // sombra funda de sangria nas bordas do papel
      const sangriaBorda = novaTela(largura, altura);
      { const g = sangriaBorda.getContext('2d'), [r, gg, b] = Filme.rgb(cor('sepia'));
        const gr = g.createRadialGradient(largura / 2, altura * 0.48, largura * 0.42, largura / 2, altura * 0.5, altura * 0.64);
        gr.addColorStop(0, `rgba(${r},${gg},${b},0)`); gr.addColorStop(0.7, `rgba(${r},${gg},${b},0.22)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0.6)`);
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }

      // ---------- as pinturas: cada camada pintada UMA vez, numa tela própria ----------
      // camada = { prof (0 longe .. 1 perto), y0, y1, extra, deriva, balanca, opaca (papel por baixo), pecas }
      const PINT = {};
      function pintaCamada(cm, q, semente) {
        const ex = cm.extra ?? 60, y0 = cm.y0 ?? 0, y1 = cm.y1 ?? A;
        const tl = novaTela((L + 2 * ex) * k * q, (y1 - y0) * k * q), g = tl.getContext('2d');
        g.setTransform(k * q, 0, 0, k * q, ex * k * q, -y0 * k * q);
        const ac = sorteio(semente);
        for (const pc of cm.pecas) {
          if (!Pinturas[pc.tipo]) throw new Error('Pintor que não existe: ' + pc.tipo);
          g.save(); Pinturas[pc.tipo](g, pc, ac); g.restore();
        }
        // o papel aparece em pontinhos onde o grão é mais alto (a tinta não entra no dente do papel)
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = cm.furos ?? 0.45;
        for (let x = 0; x < tl.width; x += largura) for (let y = 0; y < tl.height; y += altura) g.drawImage(furos, x, y);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        let fundo = null;
        if (cm.opaca) { // papel opaco com a mesma silhueta: a camada de trás não aparece através da tinta
          fundo = novaTela(tl.width, tl.height); const f = fundo.getContext('2d');
          for (let i = 0; i < 6; i++) f.drawImage(tl, 0, 0);
          f.globalCompositeOperation = 'source-in'; f.fillStyle = cor('papel'); f.fillRect(0, 0, fundo.width, fundo.height);
        }
        return { ...cm, tela: tl, fundo, ex, y0, y1 };
      }
      function pintura(id, q) {
        const chave = id + '@' + q;
        if (PINT[chave]) return PINT[chave];
        const def = H.pinturas[id];
        if (!def) throw new Error('Pintura que não existe: ' + id);
        const camadas = def.camadas.map((cm, i) => pintaCamada(cm, q, (H.semente || 1) * 100 + i * 17 + id.length * 3));
        return (PINT[chave] = { camadas });
      }
      // versão achatada e desfocada (fundo de painel): pintada a meia resolução, borrada uma vez
      const DESF = {};
      function desfocada(id, raio) {
        const chave = id + '#' + raio;
        if (DESF[chave]) return DESF[chave];
        const q = 0.5, pt = pintura(id, q);
        const plano = novaTela(L * k * q, A * k * q), g = plano.getContext('2d');
        g.fillStyle = cor('papel'); g.fillRect(0, 0, plano.width, plano.height);
        for (const cm of pt.camadas) { const sx = cm.ex * k * q, h = (cm.y1 - cm.y0) * k * q; if (cm.fundo) g.drawImage(cm.fundo, sx, 0, L * k * q, h, 0, cm.y0 * k * q, L * k * q, h); g.drawImage(cm.tela, sx, 0, L * k * q, h, 0, cm.y0 * k * q, L * k * q, h); }
        const borrada = novaTela(plano.width, plano.height), b = borrada.getContext('2d');
        b.filter = `blur(${raio * k * q}px)`; b.drawImage(plano, 0, 0); b.filter = 'none';
        return (DESF[chave] = borrada);
      }
      for (const cn of H.cenas) { const f = cn.fundo; if (f.desfoque) desfocada(f.pintura, f.desfoque); else pintura(f.pintura, 1); }

      // ---------- câmera de sonho: aproxima de 1,06 a 1,14, balança de lado, sobe devagar ----------
      const CAM = H.camera || {};
      const CENAS = H.cenas;
      function camera(i, t) {
        const cn = CENAS[i], prox = CENAS[i + 1], t0 = cn.de - 0.3, t1 = (prox ? prox.de : duracao) + 0.3;
        const u = trecho(t, t0, t1);
        const z = mistura(CAM.zoom?.[0] ?? 1.06, CAM.zoom?.[1] ?? 1.14, suave(u));
        const dx = (CAM.balanco ?? 12) * Math.sin(TAU * t / (CAM.periodo || 7) + i * 1.7);
        const dy = (CAM.sobe ?? 20) * (0.5 - u);
        const q = Math.round(t * fps);
        let tx = 0, ty = 0; // tremor: vale inteiro para tudo (fundo, painel, rótulo)
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) {
            const r = sorteio((H.semente || 1) * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros);
            tx += (r() * 2 - 1) * f; ty += (r() * 2 - 1) * f;
          }
        }
        return { z, dx: dx + tx, dy: dy + ty, tx, ty, t0, q };
      }
      // "fervura" da linha: um desvio de 1 a 2 px que troca 8 vezes por segundo (conta inteira)
      const FERVE = H.fervura ?? 1.6;
      function ferve(q, n) { const passo = Math.floor(q * 8 / fps), r = sorteio(passo * 977 + n * 131 + (H.semente || 1)); return [(r() * 2 - 1) * FERVE, (r() * 2 - 1) * FERVE]; }
      function poeCamada(cam, prof, extraX = 0, extraY = 0, zoomExtra = 1) {
        const z = cam.z * zoomExtra * (1 + 0.025 * prof * trecho(cam.z, 1.06, 1.14));
        const ox = cam.dx * (0.35 + prof) + extraX, oy = cam.dy * (0.35 + prof) + extraY;
        c.setTransform(k * z, 0, 0, k * z, k * (L / 2 * (1 - z) + ox), k * (A / 2 * (1 - z) + oy));
      }
      function desenhaFundo(i, t) {
        const cn = CENAS[i], f = cn.fundo, cam = camera(i, t);
        c.globalAlpha = 1;
        if (f.desfoque) {
          poeCamada(cam, 0.4, 0, 0, f.zoom || 1); c.drawImage(desfocada(f.pintura, f.desfoque), 0, 0, L, A);
        } else {
          pintura(f.pintura, 1).camadas.forEach((cm, n) => {
            let ox = 0;
            if (cm.deriva) ox = limita(cm.ex * 0.75 - cm.deriva * (t - cam.t0), -cm.ex * 0.75, cm.ex * 0.75); // o céu de longe corre de lado
            if (cm.balanca) ox += cm.balanca * Math.sin(t * 1.25 + i);                                    // o capim de perto balança
            const [fx, fy] = ferve(cam.q, i * 10 + n);
            poeCamada(cam, cm.prof || 0, ox + fx, fy);
            if (cm.fundo) c.drawImage(cm.fundo, -cm.ex, cm.y0, L + 2 * cm.ex, cm.y1 - cm.y0);
            c.drawImage(cm.tela, -cm.ex, cm.y0, L + 2 * cm.ex, cm.y1 - cm.y0);
          });
        }
        if (f.escurece) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = f.escurece; c.fillStyle = cor('escuro'); c.fillRect(0, 0, tela.width, tela.height); }
        c.globalAlpha = 1;
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
      // risco a pincel: duas passadas, a segunda mais fina e fraca (tinta que falha)
      function pincelada(x0, y0, x1, y1, prog, w, cr) {
        if (prog <= 0) return;
        const a0 = c.globalAlpha; c.strokeStyle = cr; c.lineCap = 'round';
        c.lineWidth = w; c.globalAlpha = a0 * 0.85; linha(x0, y0, x1, y1, prog);
        c.lineWidth = w * 0.55; c.globalAlpha = a0 * 0.5; linha(x0, y0 + w * 0.18, x1, y1 - w * 0.12, prog);
        c.globalAlpha = a0;
      }
      function emVolta(x, y, s, f) { if (s <= 0.001) return; c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); }
      const some = (p, t) => (p.some ? 1 - trecho(t, p.some, p.some + 0.3) : 1);
      // flor de pigmento (halo de aquarela): anel de tinta com o miolo mais claro
      function flor(x, y, r, a, cr) {
        const q = cr || cor('destaque'), g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, Filme.cor(q, null, 0, 0.1 * a)); g.addColorStop(0.62, Filme.cor(q, null, 0, 0.22 * a));
        g.addColorStop(0.8, Filme.cor(q, null, 0, 0.34 * a)); g.addColorStop(1, Filme.cor(q, null, 0, 0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      // folha de papel quente com sombra funda nas bordas (cartão, painel do mapa)
      function folha(x, y, w, h, raio = 26, base) {
        sombraMacia(26, 10, 'rgba(40,24,12,0.45)');
        retRedondo(x, y, w, h, raio); c.fillStyle = base || cor('folha'); c.fill(); semBrilho();
        c.save(); retRedondo(x, y, w, h, raio); c.clip();
        const a0 = c.globalAlpha, [r, g, b] = Filme.rgb(cor('sepia')), m = Math.min(w, h);
        for (const [x0, y0, x1, y1] of [[x, 0, x + m * 0.14, 0], [x + w, 0, x + w - m * 0.14, 0], [0, y, 0, y + m * 0.14], [0, y + h, 0, y + h - m * 0.14]]) {
          const gr = c.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(${r},${g},${b},0.34)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
          c.fillStyle = gr; c.fillRect(x, y, w, h);
        }
        c.globalAlpha = a0;
        c.restore();
      }

      // ---------- as peças ----------
      const PECAS = {
        // rótulo: caixinha de papel e itálico sépia; entra subindo e aparecendo em 0,2 s
        texto(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.2), dy = (1 - sai(u)) * 26;
          alfa(u * some(p, t));
          const cx = rotulo(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, tabular: p.tabular, alinha: p.alinha, caixa: p.caixa });
          if (p.risco && t >= p.risco.de) { // risco carmim que atravessa o nome
            const w = cx.w + p.tam * 0.1, pr = sai(trecho(t, p.risco.de, p.risco.ate)), yc = cx.yc + dy;
            alfa(some(p, t)); pincelada(cx.xc - w / 2, yc + p.tam * 0.12, cx.xc + w / 2, yc - p.tam * 0.12, pr, p.tam * 0.16, cor(p.risco.cor || 'destaque'));
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          const ua = trecho(t, p.de, p.de + 0.2);
          alfa(ua * some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v));
          const w = largTexto(milhar(p.valor), p.tam, true) + p.tam * 0.9;
          caixaPapel(p.x, p.y - p.tam * 0.5 + (1 - sai(ua)) * 26, w, p.tam * 1.5);
          emVolta(p.x, p.y - p.tam / 2, 1 + 0.04 * Math.sin(Math.PI * trecho(t, p.ate, p.ate + 0.35)), () =>
            escreve(txt, p.x, p.y + (1 - sai(ua)) * 26, p.tam, { cor: p.cor, tabular: true, peso: 0.15 }));
        },
        // multidão em perspectiva sobre o campo: filas de trás (pequenas) para a frente (grandes)
        multidao(p, t) {
          if (t < p.de) return;
          const ap = p.apaga ? (p.apagaAte ?? 0.7) * sai(trecho(t, p.apaga, p.apaga + 0.6)) : 0;
          const gente = []; let i = 0;
          p.filas.forEach((f, fi) => { const dx = p.larg / f.n; for (let j = 0; j < f.n; j++, i++) { const r = sorteio(p.semente * 100 + i); gente.push({ x: p.x - p.larg / 2 + dx * (j + 0.5) + (r() - 0.5) * dx * 0.4, y: f.y + (r() - 0.5) * 8, tam: f.tam * (0.88 + r() * 0.2), i, fi }); } });
          const n = gente.length;
          if (p.liga && t >= p.liga.de) { // fios de tinta de cada um até o mesmo ponto
            alfa(0.55 * (1 - 0.6 * trecho(t, p.liga.ate, p.liga.ate + 0.8))); c.strokeStyle = cor('fio'); c.lineWidth = 1.5; c.lineCap = 'round';
            for (const g of gente) linha(g.x, g.y - g.tam * 0.86, p.liga.para[0], p.liga.para[1], sai(trecho(t, p.liga.de + (5 - g.fi) * 0.05 + Math.abs(g.x - p.x) * 0.0002, p.liga.ate)));
          }
          for (const g of gente) {
            const t0 = p.de + (p.ate - p.de) * (((g.i * 37) % n) / n), u = trecho(t, t0, t0 + 0.3);
            if (u <= 0) continue;
            alfa(u * (1 - ap)); cola(pessoaSpr(g.tam, vesteDe(g.i), 'm' + g.i), g.x, g.y + (1 - sai(u)) * 8);
          }
        },
        heroi(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.5), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.5)) : 0;
          const pulso = 1 + 0.05 * Math.sin(TAU * (t - p.t) / 1.8);
          if (p.medalhao) { // medalhão de papel com o busto (a raiz da árvore)
            const R = p.tam * 0.62, ym = p.y - p.tam * 0.48;
            alfa(sai(u)); flor(p.x, ym, R * 1.5 * pulso * (1 - 0.5 * cont), 1);
            alfa(sai(u)); c.beginPath(); c.arc(p.x, ym, R, 0, TAU); c.fillStyle = cor('folha'); c.fill();
            if (cont < 1) { alfa(sai(u) * (1 - cont)); c.save(); c.beginPath(); c.arc(p.x, ym, R - 4, 0, TAU); c.clip(); cola(bustoSpr(150), p.x, ym + R * 0.98, R * 1.75 / 150); c.restore(); }
            alfa(sai(u)); c.beginPath(); c.arc(p.x, ym, R, 0, TAU); c.lineWidth = 7; c.strokeStyle = cor('destaque'); c.stroke();
            c.lineWidth = 2; c.strokeStyle = cor('tinta'); c.beginPath(); c.arc(p.x, ym, R + 9, 0, TAU); c.stroke();
            if (p.interroga && t >= p.interroga) {
              const si = pop(t, p.interroga + 0.1, 0.4);
              alfa(1); emVolta(p.x, ym, si, () => escreve('?', p.x, ym + p.tam * 0.2, p.tam * 0.42, { cor: 'destaque', italico: true, peso: 0.17 }));
            }
          } else { // o cavaleiro aparece como tinta que se espalha no papel molhado
            alfa(sai(u)); flor(p.x, p.y - p.tam * 0.55, p.tam * 0.95 * pulso * sai(u), 1);
            alfa(sai(u)); emVolta(p.x, p.y, 0.94 + 0.06 * sai(u), () => cola(gineteSpr(p.tam), p.x, p.y));
          }
        },
        // cartão de papel quente com título em itálico (o estudo)
        janela(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(sai(u) * some(p, t));
          c.save(); c.translate(0, (1 - sai(u)) * 30);
          folha(x, y, p.l, p.a, 26);
          if (p.titulo) {
            escreve(p.titulo, p.x, y + 70, 34, { cor: 'tinta', italico: true, peso: 0.14 });
            c.strokeStyle = cor('destaque'); c.lineWidth = 3; c.globalAlpha *= 0.8; linha(p.x - 160, y + 96, p.x + 160, y + 96, sai(trecho(t, p.t + 0.1, p.t + 0.45)));
          }
          c.restore();
        },
        // pasta de arquivo (papel pardo com aba) — "arquivo do caso"
        pasta(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.3), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(sai(u)); c.save(); c.translate(0, (1 - sai(u)) * 40);
          folha(x + 40, y - 50, 330, 90, 16, cor('pastaEscura'));
          folha(x, y, p.l, p.a, 16, cor('pasta'));
          escreve(p.titulo, x + 66, y - 6, 36, { cor: 'tinta', alinha: 'esquerda', italico: true, peso: 0.14 });
          if (p.linhas) { c.strokeStyle = Filme.cor(cor('tinta'), null, 0, 0.3); c.lineWidth = 6; c.lineCap = 'round';
            for (let i = 0; i < p.linhas; i++) { const yy = y + 90 + i * 70, w = p.l * (i % 3 === 1 ? 0.42 : 0.66); linha(x + 70, yy, x + 70 + w, yy, sai(trecho(t, p.t + 0.1 + i * 0.05, p.t + 0.45 + i * 0.05))); } }
          c.restore();
        },
        // tubos de ensaio de vidro numa estante (a estante é da pintura)
        tubos(p, t) {
          if (t < p.de) return;
          const x0 = p.x - (p.n - 1) * p.dx / 2, w = p.dx * 0.5, h = p.tam;
          for (let i = 0; i < p.n; i++) {
            const x = x0 + i * p.dx, t0 = p.de + (p.ate - p.de) * i / p.n, u = trecho(t, t0, t0 + 0.25);
            if (u <= 0) continue;
            const cheio = p.enche && i === p.enche.i ? sai(trecho(t, p.enche.t, p.enche.t + 0.45)) : 0;
            const yb = p.y + (1 - sai(u)) * 30;
            alfa(u);
            const forma = () => { c.beginPath(); c.moveTo(x - w / 2, yb - h / 2); c.lineTo(x - w / 2, yb + h / 2 - w / 2); c.arc(x, yb + h / 2 - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, yb - h / 2); };
            if (cheio > 0) { alfa(u * cheio); flor(x, yb, 110, 1); alfa(u); }
            forma(); c.closePath(); c.fillStyle = cor('vidroTubo'); c.fill();
            c.save(); forma(); c.closePath(); c.clip();
            const nivel = mistura(0.3, 0.82, cheio), topo = yb + h / 2 - h * nivel;
            c.globalAlpha = GA * u * 0.75; c.fillStyle = Filme.hex(cor('liquido'), cor('destaque'), cheio); c.fillRect(x - w, topo, 2 * w, h);
            c.globalAlpha = GA * u * 0.35; c.fillStyle = escuro(Filme.hex(cor('liquido'), cor('destaque'), cheio), 0.4); c.fillRect(x - w, topo, 2 * w, 5);
            alfa(u * 0.6); c.fillStyle = '#fbf6ec'; c.fillRect(x + w * 0.1, yb - h / 2, w * 0.16, h); // reflexo
            c.restore();
            alfa(u); forma(); c.strokeStyle = cor('tinta'); c.lineWidth = 2.2; c.lineJoin = 'round'; c.globalAlpha *= 0.7; c.stroke();
            c.beginPath(); c.moveTo(x - w / 2 - 5, yb - h / 2); c.lineTo(x + w / 2 + 5, yb - h / 2); c.lineWidth = 3.5; c.stroke();
          }
        },
        // 12 fichas de papel (pílulas) com uma pessoinha; a oitava enche de carmim
        fila(p, t) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2, fw = p.dx * 0.8, fh = p.tam * 1.12;
          for (let i = 0; i < n; i++) {
            const x = x0 + (i % p.colunas) * p.dx, y = p.y + Math.floor(i / p.colunas) * p.dy;
            const t0 = p.de + (p.ate - p.de) * i / n, s = pop(t, t0, 0.3);
            if (s <= 0) continue;
            const ac = p.acende && i === p.acende.i ? sai(trecho(t, p.acende.t, p.acende.t + 0.3)) : 0;
            const sa = ac > 0 ? 1 + 0.1 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.4)) : 1;
            alfa(1);
            emVolta(x, y, s * sa, () => {
              if (ac > 0) { alfa(ac); flor(x, y, fh * 0.85, 1.4); alfa(1); }
              retRedondo(x - fw / 2, y - fh / 2, fw, fh, fw / 2); c.fillStyle = Filme.hex(cor('folha'), cor('destaque'), ac); c.fill();
              c.strokeStyle = Filme.hex(cor('tinta'), escuro(cor('destaque'), 0.3), ac); c.lineWidth = 3; c.globalAlpha *= 0.75; c.stroke(); alfa(1);
              const v = ac > 0.5 ? { roupa: '#f6efe2', pele: '#f6efe2', cabelo: '#f6efe2' } : { roupa: cor('sepia'), pele: cor('sepia'), cabelo: cor('tinta') };
              cola(pessoaSpr(p.tam * 0.72, v, ac > 0.5 ? 'fichaClara' : 'ficha'), x, y + fh * 0.36);
            });
          }
        },
        // mapa num painel de papel quente: terra sépia translúcida, região carmim pontilhada, império índigo
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1, M = H.mapa;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          const pn = p.painel, px = p.x - pn.l / 2, py = p.y - pn.a / 2;
          alfa(sai(trecho(t, p.contorno.de, p.contorno.de + 0.3)));
          folha(px, py, pn.l, pn.a, 30, M.papel);
          c.save(); retRedondo(px + 10, py + 10, pn.l - 20, pn.a - 20, 24); c.clip();
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          alfa(trecho(t, p.contorno.de + 0.3, p.contorno.ate + 0.2)); c.fillStyle = M.terra;
          for (const r of terras) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
          alfa(1); c.strokeStyle = M.linha; c.lineWidth = 2.5; c.lineJoin = 'round'; c.lineCap = 'round';
          for (const r of terras) polilinha(r, pc);
          const forma = (pts) => { c.beginPath(); pts.map(pj).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
          if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste
            const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 10, xa - 10, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
            alfa(1 - 0.5 * im); forma(T.regiao); c.fillStyle = M.regiao; c.fill();
            c.strokeStyle = M.pontos; c.lineWidth = 2.5; c.stroke();
            if (p.aneis && t >= p.aneis.t) { // pontinhos carmim dentro da região
              c.save(); forma(T.regiao); c.clip();
              const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]);
              const pa = p.aneis.passo; let i = 0;
              for (let lat = la + pa / 2; lat < lb; lat += pa * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? pa / 2 : 0); lon < Math.max(...lo); lon += pa) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                if (s <= 0) continue;
                c.beginPath(); c.arc(x, y, 5.5 * s, 0, TAU); c.fillStyle = M.pontos; c.fill();
              }
              c.restore();
            }
            c.restore();
          }
          if (p.imperio && t >= p.imperio.pulsa) { // o império se espalha de um ponto que pulsa
            const [px2, py2] = pj(p.imperio.ponto);
            if (t >= p.imperio.de) {
              const u = sai(trecho(t, p.imperio.de, p.imperio.ate));
              c.save(); c.beginPath(); c.arc(px2, py2, 20 + u * 700, 0, TAU); c.clip();
              alfa(1); forma(T.imperio); c.fillStyle = M.imperio; c.fill();
              c.strokeStyle = M.bordaImperio; c.lineWidth = 3; c.stroke();
              c.restore();
            }
            alfa(1); c.fillStyle = M.pontos; c.beginPath(); c.arc(px2, py2, 10 * pop(t, p.imperio.pulsa, 0.3), 0, TAU); c.fill();
            c.strokeStyle = M.pontos; c.lineWidth = 2.5; c.beginPath(); c.arc(px2, py2, 17 * pop(t, p.imperio.pulsa, 0.3), 0, TAU); c.stroke();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            alfa(1 - fase); c.lineWidth = 3; c.beginPath(); c.arc(px2, py2, 17 + fase * 40, 0, TAU); c.stroke();
          }
          c.restore(); // clip do papel
          c.restore();
        },
        // barras num cartão de papel: Mongol em carmim, os outros em sépia
        barras(p, t) {
          if (t < p.t) return;
          if (p.painel) { const pn = p.painel; alfa(sai(trecho(t, p.t - 0.15, p.t + 0.15))); folha(pn.x - pn.l / 2, pn.y - pn.a / 2, pn.l, pn.a, 26); }
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo, u = sai(trecho(t, t0, t0 + p.dur));
            if (t < t0) return;
            alfa(trecho(t, t0, t0 + 0.2));
            const D = it.cor === 'destaque';
            escreve(it.nome, p.x - 24, y + 16, 34, { cor: D ? 'destaque' : 'tinta', alinha: 'direita', italico: true, peso: 0.14 });
            const w = Math.max(8, p.larg * it.v / p.maximo * u), cr = cor(it.cor);
            c.globalAlpha *= 0.8; retRedondo(p.x, y - p.alt / 2, w, p.alt, 8); c.fillStyle = cr; c.fill();
            c.globalAlpha *= 0.5; retRedondo(p.x + 3, y - p.alt / 2 + 4, Math.max(4, w - 8), p.alt - 10, 6); c.fillStyle = escuro(cr, 0.3); c.fill();
            alfa(trecho(t, t0 + p.dur * 0.6, t0 + p.dur));
            escreve(it.valor, p.x + w + 22, y + 15, 32, { cor: D ? 'destaque' : 'tinta', alinha: 'esquerda', tabular: true, italico: true, peso: 0.14 });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; alfa(trecho(t, t1, t1 + 0.3)); escreve(p.unidade, p.x + p.larg / 2 - 60, p.y + p.itens.length * p.passo + 10, 30, { cor: 'sepia', italico: true, peso: 0.13 }); }
        },
        // carimbo de tinta carmim que bate torto; apaga e leva um risco
        carimbo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.2), s = mistura(1.9, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.3)) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD;
          const cr = Filme.hex(cor('destaque'), cor('sepia'), ap * 0.6), w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.7;
          alfa(limita(u * 1.6) * (1 - 0.6 * ap));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          retRedondo(-w / 2, -h / 2, w, h, 14); c.strokeStyle = cr; c.lineWidth = 8; c.stroke();
          retRedondo(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 8); c.lineWidth = 3; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr, peso: 0.17 });
          // tinta que falhou (pontos do papel)
          const r = sorteio(707); c.fillStyle = cor('pasta'); c.globalAlpha *= 0.7;
          for (let i = 0; i < 70; i++) { c.beginPath(); c.arc((r() - 0.5) * w, (r() - 0.5) * h, 1 + r() * 3.5, 0, TAU); c.fill(); }
          c.restore();
          if (p.risco && t >= p.risco.de) {
            alfa(1); c.save(); c.translate(p.x, p.y); c.rotate(giro);
            pincelada(-w / 2 - 20, 10, w / 2 + 20, -10, sai(trecho(t, p.risco.de, p.risco.ate)), 22, cor('destaque'));
            c.restore();
          }
        },
        // túmulos (os montes são da pintura): ganham uma borda de tinta carmim
        tumulos(p, t) {
          if (t < p.borda) return;
          const b = sai(trecho(t, p.borda, p.borda + 0.45));
          for (const [x, y, rx, ry] of p.montes) {
            alfa(b * 0.9); c.strokeStyle = cor('destaque'); c.lineCap = 'round';
            c.lineWidth = 6; c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI * 1.02, Math.PI * (1.02 + 0.96 * b)); c.stroke();
            alfa(b * 0.4); c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y + 4, rx * 1.03, ry * 1.06, 0, Math.PI * 1.05, Math.PI * (1.05 + 0.9 * b)); c.stroke();
          }
        },
        // hélice de DNA em tinta que sobe do túmulo e se divide em dois ramos
        helice(p, t) {
          if (t < p.de) return;
          const n = 22, u = sai(trecho(t, p.de, p.ate)), giro = t * 2.4;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5);
            if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 66, frente = Math.cos(f);
            alfa(vis * 0.5); c.strokeStyle = cor('dnaFio'); c.lineWidth = 2.5; linha(p.x - ax, y, p.x + ax, y, 1);
            for (const [sx, prof, cr] of [[ax, frente, 'dnaA'], [-ax, -frente, 'dnaB']]) {
              alfa(vis * (0.55 + 0.45 * (prof + 1) / 2));
              const rr = 8 + 5 * (prof + 1) / 2;
              c.beginPath(); c.arc(p.x + sx, y, rr, 0, TAU); c.fillStyle = cor(cr); c.fill();
              c.globalAlpha *= 0.5; c.strokeStyle = escuro(cor(cr), 0.4); c.lineWidth = 2; c.stroke();
            }
          }
          if (p.divide && t >= p.divide) {
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'destaque', m = 12;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                alfa(D ? 1 : 0.55);
                c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fillStyle = cor(r.cor); c.fill();
              }
              if (v >= 1) {
                alfa(trecho(t, p.divide + p.durDivide, p.divide + p.durDivide + 0.2));
                if (D) flor(r.x, r.y, 90, 1.2);
                rotulo(r.rotulo, r.x, r.y - 50, 36, { cor: D ? 'destaque' : 'sepia' });
              }
            }
          }
        },
        // árvore de família: fios de tinta e medalhões de papel com gente pequena dentro
        arvore(p, t) {
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, tam: p.raizTam }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, tam: nv.tam }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          let idx = 0;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(trecho(t, t0, t0 + passo * 0.8));
            const pais = nos[l - 1], filhos = nos[l], porPai = filhos.length / pais.length;
            alfa(0.85); c.strokeStyle = cor('fio'); c.lineWidth = 3.5; c.lineCap = 'round'; c.lineJoin = 'round';
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = pai.y + pai.tam * 0.2, ym = (yb + f.y - f.tam * 0.55) / 2;
              polilinha([[pai.x, yb], [pai.x, ym], [f.x, ym], [f.x, f.y - f.tam * 0.55]], pr);
            });
            filhos.forEach((f, j) => {
              const u = trecho(t, t0 + passo * 0.55 + j * 0.02, t0 + passo * 0.55 + j * 0.02 + 0.3);
              idx++;
              if (u <= 0) return;
              const R = f.tam * 0.5, ym = f.y;
              alfa(u); emVolta(f.x, ym, 0.8 + 0.2 * sai(u), () => {
                c.beginPath(); c.arc(f.x, ym, R, 0, TAU); c.fillStyle = cor('folha'); c.fill();
                c.save(); c.beginPath(); c.arc(f.x, ym, R - 3, 0, TAU); c.clip(); cola(pessoaSpr(R * 2.1, vesteDe(idx * 3), 'a' + idx), f.x, ym + R * 1.25); c.restore();
                c.beginPath(); c.arc(f.x, ym, R, 0, TAU); c.strokeStyle = cor('fio'); c.lineWidth = 3.5; c.stroke();
              });
            });
          }
        },
      };

      // ---------- cenas: cada uma é pintada inteira (fundo + peças); a nova entra numa mancha d'água ----------
      const SG = H.sangra || { antes: 0.1, dur: 0.7 };
      const inicioCena = (j) => (j === 0 ? -1 : CENAS[j].corte ? CENAS[j].de : CENAS[j].de - (CENAS[j].sangra?.antes ?? SG.antes));
      const durSangra = (j) => CENAS[j].sangra?.dur ?? SG.dur;
      function desenhaCena(i, t) {
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.fillStyle = cor('papel'); c.fillRect(0, 0, tela.width, tela.height);
        desenhaFundo(i, t);
        const cn = CENAS[i], cam = camera(i, t);
        GA = 1;
        for (const p of cn.pecas) {
          c.save();
          if (p.naPintura) poeCamada(cam, p.prof ?? 0.6);         // peça que mora na pintura anda com ela
          else c.setTransform(k, 0, 0, k, k * ((cam.dx - cam.tx) * 0.15 + cam.tx), k * ((cam.dy - cam.ty) * 0.15 + cam.ty)); // painel e rótulo: quase parados, mas tremem
          PECAS[p.tipo](p, t); c.restore();
        }
      }
      // a mancha d'água: forma torta de borda macia, pintada uma vez; no filme só cresce
      const MS = 512;
      const manchaAgua = novaTela(MS, MS), bordaAgua = novaTela(MS, MS);
      { const pts = bolha(MS / 2, MS / 2, MS * 0.34, MS * 0.34, 77, 0.22, 64), r = sorteio(4321);
        const g = manchaAgua.getContext('2d'); g.filter = 'blur(10px)'; g.fillStyle = '#fff';
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        for (let i = 0; i < 9; i++) { const a = r() * TAU, d = MS * (0.3 + r() * 0.06), rr = MS * (0.03 + r() * 0.04); g.beginPath(); g.arc(MS / 2 + Math.cos(a) * d, MS / 2 + Math.sin(a) * d, rr, 0, TAU); g.fill(); }
        const b = bordaAgua.getContext('2d'); b.filter = 'blur(3px)'; b.strokeStyle = '#000'; b.lineWidth = 6; b.lineJoin = 'round';
        b.beginPath(); pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.closePath(); b.stroke(); }
      const telaCena = novaTela(largura, altura), cCena = telaCena.getContext('2d');
      const telaMasc = novaTela(largura, altura), cMasc = telaMasc.getContext('2d');
      function raioSangra(j, u) {
        const [cx, cy] = CENAS[j].sangra?.centro || SG.centro || [540, 900];
        const longe = Math.max(Math.hypot(cx, cy), Math.hypot(L - cx, cy), Math.hypot(cx, A - cy), Math.hypot(L - cx, A - cy)) / 0.62;
        return { cx, cy, r: mistura(30, longe, sai(u)) };
      }

      // ---------- legendas: branco com borda preta, a palavra falada em carmim ----------
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
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yb - (n - 1 - li) * passoL, base = idx;
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('falada') : '#ffffff'), contorno: 8, sombra: 3, peso: 0.17 });
          idx += ln.length;
        });
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        cTela.reset(); c = cTela;
        // a cena da vez: a última cuja mancha já começou a abrir
        let j = 0;
        for (let i = 0; i < CENAS.length; i++) if (t >= inicioCena(i)) j = i;
        const u = j > 0 && !CENAS[j].corte ? trecho(t, inicioCena(j), inicioCena(j) + durSangra(j)) : 1;
        if (u >= 1) desenhaCena(j, t);
        else {
          desenhaCena(j - 1, t);
          c = cCena; cCena.reset(); desenhaCena(j, t);
          const { cx, cy, r } = raioSangra(j, u), lado = r / 0.34;
          const cam = camera(j, t);
          cMasc.reset(); cMasc.setTransform(k, 0, 0, k, k * cam.tx, k * cam.ty); cMasc.drawImage(manchaAgua, cx - lado / 2, cy - lado / 2, lado, lado);
          cCena.setTransform(1, 0, 0, 1, 0, 0); cCena.globalCompositeOperation = 'destination-in'; cCena.drawImage(telaMasc, 0, 0); cCena.globalCompositeOperation = 'source-over';
          c = cTela; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(telaCena, 0, 0);
          // a linha de maré: pigmento que junta na borda da mancha
          c.setTransform(k, 0, 0, k, k * cam.tx, k * cam.ty); c.globalAlpha = 0.45 * (1 - u); c.globalCompositeOperation = 'multiply';
          c.drawImage(bordaAgua, cx - lado / 2, cy - lado / 2, lado, lado);
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        }
        // papel por cima de tudo: grão grosso e sombra funda nas bordas (fixos na tela)
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = H.grao ?? 0.32; c.drawImage(graoPapel, 0, 0);
        c.globalCompositeOperation = 'multiply'; c.globalAlpha = 1; c.drawImage(sangriaBorda, 0, 0);
        c.globalCompositeOperation = 'source-over';
        legenda(t);
        const fim = trecho(t, H.escurece?.[0] ?? duracao - 0.35, H.escurece?.[1] ?? duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = cor('escuro'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: flauta de sopro em pentatônica sobre cítara grave; tambores grandes ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt, d = 0) => corta.some(([a, b]) => tt + d > a - 0.02 && tt < b);
        // nota que ainda soa quando a música corta: encurta para acabar no corte
        const ateCorte = (tt, d) => { for (const [a] of corta) if (tt < a && tt + d > a) d = a - tt; return d; };
        const corda = (n, tt, d, o) => { if (calado(tt)) return; s.corda(n, tt, ateCorte(tt, d), o); };
        // cítara grave: dedilhado lento a cada 1,2 s (nota e quinta)
        for (let i = 0, tt = 0.05; tt < duracao - 0.6; i++, tt += MU.passo || 1.2) {
          const ac = MU.acordes[i % MU.acordes.length];
          corda(ac[0], tt, 2.4, { vol: MU.citara ?? 0.3, maciez: 0.35, pan: -0.2 });
          corda(ac[1], tt + 0.09, 2.0, { vol: (MU.citara ?? 0.3) * 0.7, maciez: 0.5, pan: 0.2 });
          if (i % 2) corda(ac[2], tt + 0.6, 1.4, { vol: (MU.citara ?? 0.3) * 0.45, maciez: 0.6, pan: 0.35 });
        }
        // flauta de bambu: frases [tempo, nota, duração], com sopro (ruído) no ataque
        for (const [tt, nota, d] of MU.flauta || []) {
          if (calado(tt, d)) continue;
          s.nota(nota, tt, d, { vol: MU.vol ?? 0.06, forma: 'seno', ataque: 0.1, solta: 0.35, vibrato: 0.006, vibratoHz: 5, pan: 0.1 });
          s.nota(nota, tt, d, { vol: (MU.vol ?? 0.06) * 0.16, forma: 'tri', ataque: 0.12, solta: 0.3, pan: 0.1 });
          s.vento(tt, d + 0.1, { vol: 0.016, corte: 3000, onda: 3, entra: 0.06, sai: 0.2 });
        }
        // tique de madeira sob o contador
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.075) s.toque(tt, { vol: 0.045, corte: 2600, dur: 0.02, pan: (r() - 0.5) * 0.4 });
        // tambor grande (taiko): grave + pele
        const taiko = (tt, v = 1) => { s.batida(tt, { vol: 0.6 * v, freq: 58, dur: 0.75 }); s.batida(tt, { vol: 0.24 * v, freq: 120, dur: 0.18 }); s.toque(tt, { vol: 0.1 * v, corte: 700, dur: 0.12 }); };
        for (const g of SO.tambores || []) taiko(g[0], g[1]);
        // brilho (sino de vidro) e subidas de ar
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, tt + i * 0.06, 1.1, { vol: 0.045, pan: (i - 1.5) * 0.25, brilho: 1.2 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.1, corte: 2200, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 330, sobe: 1.6, dur: d, repete: 1, vol: 0.03 }); }
        // a água que abre cada cena: um chiado macio
        for (let j = 1; j < CENAS.length; j++) if (!CENAS[j].corte) s.vento(inicioCena(j), durSangra(j), { vol: 0.045, corte: 1600, onda: 1, entra: 0.15, sai: 0.4 });
        // galope baixinho sob o exército (três batidas por passo)
        if (SO.galope) for (let tt = SO.galope[0]; tt < SO.galope[1]; tt += 0.42) for (const [d, v] of [[0, 1], [0.09, 0.7], [0.18, 0.85]]) s.toque(tt + d, { vol: 0.05 * v * (SO.galopeVol ?? 1), corte: 420, dur: 0.07 });
        // na virada: corda que escorrega para baixo (o "arranhão" deste estilo) junto do tambor
        if (SO.virada !== undefined) { const a = SO.virada; s.pio(a, { freq: 620, sobe: -0.7, dur: 0.22, repete: 1, vol: 0.09 }); s.vento(a, 0.35, { vol: 0.16, corte: 1500, onda: 5, profundidade: 0.9, entra: 0.01, sai: 0.15 }); }
        // golpe grave longo em "outra linhagem"
        if (SO.grave !== undefined) { ['A1', 'E2', 'A2'].forEach((n) => s.nota(n, SO.grave, 0.5, { vol: 0.1, forma: 'tri', ataque: 0.01, solta: 0.8 })); }
        // brilho longo no fim
        if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.08, 1.8, { vol: 0.045, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.1 }));
        s.sala(0.3);
        return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
