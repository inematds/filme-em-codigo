// MOTOR "anime-pintado" — curta vertical com cara de longa de animação pintado à mão: cenários de
// guache e aquarela (céu dourado, nuvens cúmulo grandes, serras azuladas, campos de capim), câmera
// de sonho que aproxima devagar com paralaxe entre as camadas, troca de cenário em fusão de 0,6 s,
// gente pequena de cor chapada com uma sombra, painéis de pergaminho e vidro escuro, partículas de
// luz, vinheta e grão de filme.
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
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
      const passa = (x) => { x = limita(x); const s = 1.4; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
      const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d)))); // nunca negativo (raio de arco)

      let GA = 1;
      const alfa = (a) => { c.globalAlpha = limita(GA * a); };
      const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
      // shadowBlur é em pixels da TELA: multiplica pela escala atual
      const brilho = (raio, cr) => { c.shadowColor = cr || cor('destaque'); c.shadowBlur = raio * escalaAtual(); c.shadowOffsetX = 0; c.shadowOffsetY = 0; };
      const sombraMacia = (raio = 12, dy = 4) => { const s = escalaAtual(); c.shadowColor = cor('sombraTexto'); c.shadowBlur = raio * s; c.shadowOffsetX = 0; c.shadowOffsetY = dy * s; };
      const semBrilho = () => { c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.shadowColor = 'rgba(0,0,0,0)'; };

      // ---------- letras em traços (letras.js), com ponta redonda ----------
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
      function caminho(g, x, y, tam) {
        c.beginPath();
        for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      }
      // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno (borda preta), sombra (macia), tabular, peso }
      function escreve(txt, x, y, tam, o = {}) {
        const { letras, w } = arruma(txt, x, tam, o.alinha, o.tabular);
        const lw = tam * (o.peso || 0.17);
        c.lineCap = 'round'; c.lineJoin = 'round';
        const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
        if (o.veu) { // véu escuro e macio atrás do rótulo (letra clara sobre nuvem clara não se lê)
          const xc = o.alinha === 'esquerda' ? x + w / 2 : o.alinha === 'direita' ? x - w / 2 : x, yc = y - tam / 2;
          const a0 = c.globalAlpha; c.save(); c.translate(xc, yc); c.scale(Math.max(1, (w / 2 + tam * 0.9) / (tam * 1.4)), 1);
          const r = tam * 1.4, g = c.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, cor('veu')); g.addColorStop(1, Filme.cor(cor('veu').slice(0, 7), null, 0, 0));
          c.globalAlpha = a0 * o.veu; c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore(); c.globalAlpha = a0;
        }
        if (o.contorno) {
          c.strokeStyle = '#000'; c.lineWidth = lw + o.contorno * 2;
          if (o.sombra) { const s = escalaAtual(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 0; c.shadowOffsetX = o.sombra * s; c.shadowOffsetY = o.sombra * s; }
          for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); }
          semBrilho();
        } else if (o.sombra !== false) {
          // sombra escura e macia: uma passada só de sombra, por baixo
          sombraMacia(tam * 0.16, tam * 0.05);
          c.strokeStyle = cor('sombraTexto'); c.lineWidth = lw;
          for (const l of letras) { caminho(l.g, l.x, y, tam); c.stroke(); }
          semBrilho();
        }
        for (const l of letras) {
          const cr = corDe(l.palavra);
          if (o.brilho && cr === cor('destaque')) brilho(o.brilho, cr);
          c.strokeStyle = cr; c.lineWidth = lw;
          caminho(l.g, l.x, y, tam); c.stroke();
          semBrilho();
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
          if (p.tipo === 'heroi' && p.interroga) textos.push('?');
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- as pinturas: cada camada pintada UMA vez, numa tela própria ----------
      // camada = { prof (0 longe .. 1 perto), y0, y1, extra (px a mais de cada lado, para a deriva), deriva (px/s), balanca, pecas }
      const PINT = {};
      function pintaCamada(cm, q, semente) {
        const ex = cm.extra || 0, y0 = cm.y0 ?? 0, y1 = cm.y1 ?? A;
        const tl = novaTela((L + 2 * ex) * k * q, (y1 - y0) * k * q), g = tl.getContext('2d');
        g.setTransform(k * q, 0, 0, k * q, ex * k * q, -y0 * k * q);
        const ac = sorteio(semente);
        for (const pc of cm.pecas) {
          if (!Pinturas[pc.tipo]) throw new Error('Pintor que não existe: ' + pc.tipo);
          g.save(); Pinturas[pc.tipo](g, pc, ac); g.restore();
        }
        return { ...cm, tela: tl, ex, y0, y1 };
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
        for (const cm of pt.camadas) g.drawImage(cm.tela, cm.ex * k * q, 0, L * k * q, (cm.y1 - cm.y0) * k * q, 0, cm.y0 * k * q, L * k * q, (cm.y1 - cm.y0) * k * q);
        const borrada = novaTela(plano.width, plano.height), b = borrada.getContext('2d');
        b.filter = `blur(${raio * k * q}px)`; b.drawImage(plano, 0, 0); b.filter = 'none';
        return (DESF[chave] = borrada);
      }
      // pinta tudo ao montar (nada de pintura no meio do filme)
      for (const cn of H.cenas) { const f = cn.fundo; if (f.desfoque) desfocada(f.pintura, f.desfoque); else pintura(f.pintura, 1); }

      // ---------- câmera de sonho: aproxima de 1,06 a 1,14, balança de lado, sobe devagar ----------
      const CAM = H.camera || {};
      const CENAS = H.cenas;
      function camera(i, t) {
        const cn = CENAS[i], prox = CENAS[i + 1], t0 = cn.de - 0.3, t1 = (prox ? prox.de : duracao) + 0.3;
        const u = trecho(t, t0, t1);
        const z = mistura(CAM.zoom?.[0] ?? 1.06, CAM.zoom?.[1] ?? 1.14, suave(u));
        let dx = (CAM.balanco ?? 14) * Math.sin(TAU * t / (CAM.periodo || 7) + i * 1.7);
        let dy = (CAM.sobe ?? 22) * (u - 0.5);
        const q = Math.round(t * fps);
        let tx = 0, ty = 0; // tremor: vale inteiro também para painel e rótulo
        for (const tr of H.tremores || []) {
          const q0 = Math.round(tr.t * fps);
          if (q >= q0 && q < q0 + tr.quadros) {
            const r = sorteio((H.semente || 1) * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros);
            tx += (r() * 2 - 1) * f; ty += (r() * 2 - 1) * f;
          }
        }
        return { z, dx: dx + tx, dy: dy + ty, tx, ty, t0 };
      }
      // transformação de uma camada de profundidade prof (as de perto andam mais)
      function poeCamada(cam, prof, extraX = 0) {
        const z = cam.z * (1 + 0.025 * prof * trecho(cam.z, 1.06, 1.14));
        const ox = cam.dx * (0.35 + prof) + extraX, oy = cam.dy * (0.35 + prof);
        c.setTransform(k * z, 0, 0, k * z, k * (L / 2 * (1 - z) + ox), k * (A / 2 * (1 - z) + oy));
      }
      function desenhaFundo(i, t, a) {
        const cn = CENAS[i], f = cn.fundo, cam = camera(i, t);
        c.globalAlpha = a;
        if (f.desfoque) {
          poeCamada(cam, 0.4); c.drawImage(desfocada(f.pintura, f.desfoque), 0, 0, L, A);
        } else {
          for (const cm of pintura(f.pintura, 1).camadas) {
            let ox = 0;
            if (cm.deriva) ox = limita(cm.ex * 0.75 - cm.deriva * (t - cam.t0), -cm.ex * 0.75, cm.ex * 0.75); // o céu de longe corre de lado
            if (cm.balanca) ox += cm.balanca * Math.sin(t * 1.25 + i);                                    // o capim de perto balança
            poeCamada(cam, cm.prof || 0, ox);
            c.drawImage(cm.tela, -cm.ex, cm.y0, L + 2 * cm.ex, cm.y1 - cm.y0);
          }
        }
        if (f.escurece) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a * f.escurece; c.fillStyle = cor('escuro'); c.fillRect(0, 0, tela.width, tela.height); }
        c.globalAlpha = 1;
      }

      // ---------- gente pequena: cor chapada, uma sombra de borda dura, contorno fino marrom ----------
      // (x, yPe) = pé; tam = altura. o = { roupa, pele, cabelo, apaga (0..1 vira vulto), acesa (0..1 brilha), chapeu }
      function pessoa(x, yPe, tam, o = {}) {
        const r = tam * 0.14, yc = yPe - tam + r, ombro = yc + r * 1.05;
        const ap = limita(o.apaga || 0), ac = limita(o.acesa || 0);
        const tinta = (cr) => Filme.hex(Filme.hex(cr, cor('vulto'), ap), cor('destaque'), ac * 0.6);
        const roupa = tinta(o.roupa || '#8a6a4a'), pele = tinta(o.pele || '#e8b98f'), cabelo = tinta(o.cabelo || '#3a2a20');
        const a0 = c.globalAlpha;
        // sombra no chão
        c.globalAlpha = a0 * 0.28; c.fillStyle = '#20140a'; c.beginPath(); c.ellipse(x + tam * 0.06, yPe, tam * 0.22, tam * 0.045, 0, 0, TAU); c.fill(); c.globalAlpha = a0;
        const corpo = () => {
          c.beginPath();
          c.moveTo(x - tam * 0.15, ombro + r * 0.2); c.quadraticCurveTo(x, ombro - r * 0.35, x + tam * 0.15, ombro + r * 0.2);
          c.lineTo(x + tam * 0.21, yPe - tam * 0.02); c.quadraticCurveTo(x, yPe + tam * 0.02, x - tam * 0.21, yPe - tam * 0.02); c.closePath();
        };
        const lw = Math.max(0.8, tam * 0.014);
        c.lineJoin = 'round';
        corpo(); c.fillStyle = roupa; c.fill();
        // sombra chapada do lado contrário à luz (a luz vem da direita)
        c.save(); corpo(); c.clip(); c.fillStyle = Filme.hex(roupa, '#1d1430', 0.38); c.fillRect(x - tam * 0.3, ombro - r, tam * 0.24, tam); c.restore();
        corpo(); c.strokeStyle = Filme.hex(roupa, '#1a0f08', 0.6); c.lineWidth = lw; c.stroke();
        // cabeça
        c.beginPath(); c.arc(x, yc, r, 0, TAU); c.fillStyle = pele; c.fill();
        c.save(); c.beginPath(); c.arc(x, yc, r, 0, TAU); c.clip();
        c.fillStyle = Filme.hex(pele, '#5a2f3a', 0.3); c.beginPath(); c.arc(x + r * 0.45, yc + r * 0.1, r * 1.15, 0, TAU); c.rect(x - 2 * r, yc - 2 * r, 4 * r, 4 * r); c.fill('evenodd');
        c.fillStyle = cabelo;
        if (o.chapeu) { c.fillRect(x - 2 * r, yc - 2 * r, 4 * r, r * 1.55); }
        else { c.beginPath(); c.ellipse(x - r * 0.1, yc - r * 0.55, r * 1.15, r * 0.75, -0.15, 0, TAU); c.fill(); }
        c.restore();
        if (o.chapeu) { c.fillStyle = Filme.hex(o.chapeu, cor('vulto'), ap); c.beginPath(); c.ellipse(x, yc - r * 0.55, r * 1.25, r * 0.38, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x, yc - r * 0.75, r * 0.85, Math.PI, 0); c.fill(); }
        c.beginPath(); c.arc(x, yc, r, 0, TAU); c.strokeStyle = Filme.hex(pele, '#2a140a', 0.65); c.lineWidth = lw; c.stroke();
        if (tam >= 50 && ap < 0.6) { // olhinhos de ponto
          c.fillStyle = '#21140c'; c.globalAlpha = a0 * (1 - ap);
          for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r * 0.36 + r * 0.08, yc + r * 0.12, Math.max(0.6, r * 0.09), 0, TAU); c.fill(); }
          c.globalAlpha = a0;
        }
      }
      const vesteDe = (i) => { const R = P.roupas, Pe = P.peles, C = P.cabelos; return { roupa: R[(i * 7 + 3) % R.length], pele: Pe[(i * 5 + 1) % Pe.length], cabelo: C[(i * 3) % C.length] }; };
      // halo de luz dourada (somado)
      function halo(x, y, r, a, cr) {
        const g = c.createRadialGradient(x, y, 0, x, y, r), q = cr || cor('luz');
        g.addColorStop(0, Filme.cor(q, null, 0, 0.75 * a)); g.addColorStop(0.4, Filme.cor(q, null, 0, 0.28 * a)); g.addColorStop(1, Filme.cor(q, null, 0, 0));
        const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.globalCompositeOperation = op;
      }

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
      // papel: pinceladas fixas (sorteio com semente) sobre um retângulo — pergaminho, pasta
      function papel(x, y, w, h, base, mancha, semente, raio = 22) {
        retRedondo(x, y, w, h, raio); c.fillStyle = base; c.fill();
        c.save(); retRedondo(x, y, w, h, raio); c.clip();
        const r = sorteio(semente), a0 = c.globalAlpha; c.lineCap = 'round';
        for (let i = 0; i < 70; i++) { c.globalAlpha = a0 * (0.08 + r() * 0.1); c.strokeStyle = mancha; c.lineWidth = 8 + r() * 18; const px = x + r() * w, py = y + r() * h; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 40 + r() * 80, py + (r() - 0.5) * 10); c.stroke(); }
        const g = c.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,50,10,0.28)'); c.globalAlpha = a0; c.fillStyle = g; c.fillRect(x, y, w, h);
        c.restore();
      }

      // ---------- as peças ----------
      const PECAS = {
        texto(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.3), dy = (1 - sai(u)) * 34; // sobe e aparece (0,3 s)
          alfa(u * some(p, t));
          escreve(p.texto, p.x, p.y + dy, p.tam, { cor: p.cor, cores: p.cores, brilho: p.brilho, tabular: p.tabular, alinha: p.alinha, veu: p.veu });
          if (p.risco && t >= p.risco.de) { // risco que atravessa o nome
            const w = largTexto(p.texto, p.tam) + p.tam * 0.5, pr = sai(trecho(t, p.risco.de, p.risco.ate)), yc = p.y - p.tam * 0.45;
            alfa(1); c.strokeStyle = cor(p.risco.cor || 'tinta'); c.lineWidth = p.tam * 0.13; c.lineCap = 'round'; sombraMacia(8, 2);
            linha(p.x - w / 2, yc + p.tam * 0.08, p.x + w / 2, yc - p.tam * 0.08, pr); semBrilho();
          }
        },
        contador(p, t) {
          if (t < p.de) return;
          const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
          alfa(trecho(t, p.de, p.de + 0.25) * some(p, t));
          const txt = milhar(u >= 1 ? p.valor : Math.floor(v));
          emVolta(p.x, p.y - p.tam / 2, 1 + 0.05 * Math.sin(Math.PI * trecho(t, p.ate, p.ate + 0.35)), () =>
            escreve(txt, p.x, p.y, p.tam, { cor: p.cor, brilho: p.brilho, tabular: true, veu: p.veu }));
        },
        // multidão em perspectiva sobre o campo: filas de trás (pequenas) para a frente (grandes)
        multidao(p, t) {
          if (t < p.de) return;
          const ap = p.apaga ? (p.apagaAte ?? 0.65) * sai(trecho(t, p.apaga, p.apaga + 0.6)) : 0;
          const gente = []; let i = 0;
          p.filas.forEach((f, fi) => { const dx = p.larg / f.n; for (let j = 0; j < f.n; j++, i++) { const r = sorteio(p.semente * 100 + i); gente.push({ x: p.x - p.larg / 2 + dx * (j + 0.5) + (r() - 0.5) * dx * 0.4, y: f.y + (r() - 0.5) * 8, tam: f.tam * (0.88 + r() * 0.2), i, fi }); } });
          const n = gente.length;
          if (p.liga && t >= p.liga.de) { // fios de luz de cada um até o mesmo ponto
            alfa(0.55 * (1 - 0.5 * trecho(t, p.liga.ate, p.liga.ate + 1))); c.strokeStyle = cor('fio'); c.lineWidth = 1.6; c.lineCap = 'round';
            const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
            for (const g of gente) linha(g.x, g.y - g.tam * 0.86, p.liga.para[0], p.liga.para[1], sai(trecho(t, p.liga.de + (5 - g.fi) * 0.05 + Math.abs(g.x - p.x) * 0.0002, p.liga.ate)));
            c.globalCompositeOperation = op;
          }
          for (const g of gente) { // a ordem já é de trás para a frente
            const t0 = p.de + (p.ate - p.de) * (((g.i * 37) % n) / n), u = trecho(t, t0, t0 + 0.3);
            if (u <= 0) continue;
            alfa(u); pessoa(g.x, g.y + (1 - sai(u)) * 10, g.tam, { ...vesteDe(g.i), apaga: ap });
          }
        },
        heroi(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.45), cont = p.contorno ? sai(trecho(t, p.contorno, p.contorno + 0.5)) : 0;
          const pulso = 1 + 0.06 * Math.sin(TAU * (t - p.t) / 1.6);
          alfa(1); halo(p.x, p.y - p.tam * 0.5, p.tam * 1.3 * pulso * sai(u) * (1 - 0.6 * cont), 1);
          if (p.medalhao) { // moldura redonda dourada (a raiz da árvore)
            const R = p.tam * 0.62, ym = p.y - p.tam * 0.48;
            alfa(sai(u)); c.beginPath(); c.arc(p.x, ym, R, 0, TAU); c.fillStyle = Filme.cor(cor('medalha'), null, 0, 1 - cont); c.fill();
            c.lineWidth = 7; c.strokeStyle = cor('destaque'); brilho(18 * (1 - cont * 0.5)); c.stroke(); semBrilho();
            if (cont < 1) { alfa(sai(u) * (1 - cont)); c.save(); c.beginPath(); c.arc(p.x, ym, R - 4, 0, TAU); c.clip(); pessoa(p.x, p.y + p.tam * 0.25, p.tam * 0.95, { ...p.veste, acesa: 0.15 }); c.restore(); }
            if (p.interroga && t >= p.interroga) {
              const si = pop(t, p.interroga + 0.1, 0.4);
              alfa(1); emVolta(p.x, ym, si, () => escreve('?', p.x, ym + p.tam * 0.2, p.tam * 0.42, { cor: 'destaque', brilho: 16 }));
            }
          } else {
            alfa(sai(u)); emVolta(p.x, p.y, 0.9 + 0.1 * sai(u), () => pessoa(p.x, p.y, p.tam, { ...p.veste, acesa: 0.25 }));
          }
        },
        // painel de vidro escuro e quente com borda dourada fina
        janela(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.35), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(sai(u) * some(p, t));
          emVolta(p.x, p.y, 0.96 + 0.04 * sai(u), () => {
            retRedondo(x, y, p.l, p.a, 30); c.fillStyle = cor('vidro'); c.fill();
            c.strokeStyle = cor('bordaVidro'); c.lineWidth = 2.5; c.stroke();
            retRedondo(x + 10, y + 10, p.l - 20, p.a - 20, 22); c.strokeStyle = Filme.cor(cor('destaque'), null, 0, 0.18); c.lineWidth = 1.5; c.stroke();
            if (p.titulo) escreve(p.titulo, p.x, y + 66, 34, { cor: 'destaque', peso: 0.15 });
          });
        },
        // pasta de arquivo (papel pardo com aba) — "arquivo do caso"
        pasta(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.35), x = p.x - p.l / 2, y = p.y - p.a / 2;
          alfa(sai(u)); c.save(); c.translate(0, (1 - sai(u)) * 40);
          sombraMacia(30, 14); retRedondo(x, y, p.l, p.a, 16); c.fillStyle = cor('pastaEscura'); c.fill(); semBrilho();
          retRedondo(x + 40, y - 46, 300, 80, 16); c.fillStyle = cor('pastaEscura'); c.fill(); // aba
          papel(x + 6, y + 6, p.l - 12, p.a - 12, cor('pasta'), cor('pastaEscura'), 91, 12);
          escreve(p.titulo, x + 70, y - 2, 30, { cor: 'tintaEscura', alinha: 'esquerda', sombra: false, peso: 0.15 });
          if (p.linhas) { c.strokeStyle = Filme.cor(cor('tintaEscura'), null, 0, 0.35); c.lineWidth = 6; c.lineCap = 'round';
            for (let i = 0; i < p.linhas; i++) { const yy = y + 90 + i * 70, w = p.l * (i % 3 === 1 ? 0.42 : 0.66); linha(x + 70, yy, x + 70 + w, yy, sai(trecho(t, p.t + 0.1 + i * 0.05, p.t + 0.45 + i * 0.05))); } }
          c.restore();
        },
        // tubos de ensaio de vidro numa estante de madeira (a estante é da pintura)
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
            forma(); c.closePath(); c.fillStyle = cor('vidroTubo'); c.fill();
            c.save(); forma(); c.closePath(); c.clip();
            const nivel = mistura(0.28, 0.82, cheio), topo = yb + h / 2 - h * nivel;
            if (cheio > 0) brilho(24 * cheio, cor('destaque'));
            c.fillStyle = Filme.hex(cor('liquido'), cor('destaque'), cheio); c.fillRect(x - w, topo, 2 * w, h);
            semBrilho();
            c.fillStyle = 'rgba(255,250,235,0.55)'; c.fillRect(x + w * 0.12, yb - h / 2, w * 0.14, h); // reflexo
            c.restore();
            forma(); c.strokeStyle = cor('bordaTubo'); c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
            c.beginPath(); c.moveTo(x - w / 2 - 5, yb - h / 2); c.lineTo(x + w / 2 + 5, yb - h / 2); c.lineWidth = 4; c.stroke();
            if (cheio > 0) { alfa(cheio); halo(x, topo + 10, 90, 0.8); }
          }
        },
        // 12 pessoas em duas filas; uma acende
        fila(p, t) {
          if (t < p.de) return;
          const n = p.colunas * p.linhas, x0 = p.x - (p.colunas - 1) * p.dx / 2;
          for (let i = 0; i < n; i++) {
            const x = x0 + (i % p.colunas) * p.dx, y = p.y + Math.floor(i / p.colunas) * p.dy;
            const t0 = p.de + (p.ate - p.de) * i / n, u = trecho(t, t0, t0 + 0.25);
            if (u <= 0) continue;
            const ac = p.acende && i === p.acende.i ? trecho(t, p.acende.t, p.acende.t + 0.2) : 0;
            const sa = ac > 0 ? 1 + 0.1 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.4)) : 1;
            alfa(u);
            if (ac > 0) halo(x, y, p.tam * 0.9, ac);
            emVolta(x, y + p.tam / 2, sa, () => pessoa(x, y + p.tam / 2 + (1 - sai(u)) * 14, p.tam, { ...vesteDe(i + 4), apaga: ac > 0 ? 0 : 0.25, acesa: ac }));
          }
        },
        mapa(p, t) {
          if (t < p.contorno.de) return;
          const T = H.terra, e = p.escala, ach = p.achata || 1, M = H.mapa;
          const pj = ([lon, lat]) => [p.x + (lon - p.lonC) * e, p.y - (lat - p.latC) * e * ach];
          const sb = p.sobe ? sai(trecho(t, p.sobe.t, p.sobe.t + p.sobe.dur)) : 0;
          c.save();
          c.translate(p.x, p.y + (p.sobe ? p.sobe.dy * sb : 0)); const z = mistura(1, p.sobe ? p.sobe.z : 1, sb); c.scale(z, z); c.translate(-p.x, -p.y);
          // o painel: mar claro numa moldura de papel
          const pn = p.painel, px = p.x - pn.l / 2, py = p.y - pn.a / 2;
          alfa(sai(trecho(t, p.contorno.de, p.contorno.de + 0.3)));
          sombraMacia(30, 12); retRedondo(px, py, pn.l, pn.a, 34); c.fillStyle = M.papel; c.fill(); semBrilho();
          retRedondo(px + 14, py + 14, pn.l - 28, pn.a - 28, 24); c.fillStyle = M.mar; c.fill();
          c.save(); retRedondo(px + 14, py + 14, pn.l - 28, pn.a - 28, 24); c.clip();
          const terras = [T.eurasia, ...(T.ilhas || [])].map((r) => r.map(pj));
          const pc = sai(trecho(t, p.contorno.de, p.contorno.ate));
          alfa(trecho(t, p.contorno.de + 0.3, p.contorno.ate + 0.2)); c.fillStyle = M.terra;
          for (const r of terras) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
          alfa(1); c.strokeStyle = M.linha; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
          for (const r of terras) polilinha(r, pc);
          const forma = (pts) => { c.beginPath(); pts.map(pj).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
          if (p.regiao && t >= p.regiao.de) { // a região entra varrendo de leste para oeste
            const xs = T.regiao.map((q) => pj(q)[0]), xa = Math.min(...xs), xb = Math.max(...xs);
            const xc = mistura(xb + 10, xa - 10, sai(trecho(t, p.regiao.de, p.regiao.ate)));
            const im = p.imperio ? trecho(t, p.imperio.de, p.imperio.de + 0.5) : 0;
            c.save(); c.beginPath(); c.rect(xc, -2000, 4000, 6000); c.clip();
            alfa(1 - 0.5 * im); forma(T.regiao); c.fillStyle = M.regiao; c.fill();
            c.strokeStyle = M.pontos; c.lineWidth = 2.5; c.setLineDash([8, 7]); c.stroke(); c.setLineDash([]);
            if (p.aneis && t >= p.aneis.t) { // pontinhos laranja dentro da região
              c.save(); forma(T.regiao); c.clip();
              const ys = T.regiao.map((q) => q[1]), la = Math.min(...ys), lb = Math.max(...ys), lo = T.regiao.map((q) => q[0]);
              const pa = p.aneis.passo; let i = 0;
              for (let lat = la + pa / 2; lat < lb; lat += pa * 0.85) for (let lon = Math.min(...lo) + ((i++ % 2) ? pa / 2 : 0); lon < Math.max(...lo); lon += pa) {
                const [x, y] = pj([lon, lat]), s = pop(t, p.aneis.t + (Math.max(...lo) - lon) * 0.004, 0.3);
                if (s <= 0) continue;
                c.beginPath(); c.arc(x, y, 6 * s, 0, TAU); c.fillStyle = M.pontos; c.fill();
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
              c.strokeStyle = M.bordaImperio; c.lineWidth = 3.5; c.stroke();
              c.restore();
            }
            alfa(1); c.fillStyle = M.pontos; brilho(14, M.pontos); c.beginPath(); c.arc(px2, py2, 11 * pop(t, p.imperio.pulsa, 0.3), 0, TAU); c.fill(); semBrilho();
            const fase = ((t - p.imperio.pulsa) / 0.6) % 1;
            alfa(1 - fase); c.strokeStyle = M.pontos; c.lineWidth = 3; c.beginPath(); c.arc(px2, py2, 11 + fase * 40, 0, TAU); c.stroke();
          }
          c.restore(); // clip do mar
          c.restore();
        },
        barras(p, t) {
          if (t < p.t) return;
          p.itens.forEach((it, i) => {
            const t0 = p.t + i * 0.12, y = p.y + i * p.passo, u = sai(trecho(t, t0, t0 + p.dur));
            if (t < t0) return;
            alfa(trecho(t, t0, t0 + 0.2));
            const D = it.cor === 'destaque';
            escreve(it.nome, p.x - 24, y + 16, 34, { cor: D ? 'destaque' : 'branco', alinha: 'direita' });
            const w = Math.max(8, p.larg * it.v / p.maximo * u);
            sombraMacia(10, 4); if (D) brilho(20);
            retRedondo(p.x, y - p.alt / 2, w, p.alt, p.alt / 2); c.fillStyle = cor(it.cor); c.fill(); semBrilho();
            alfa(trecho(t, t0 + p.dur * 0.6, t0 + p.dur));
            escreve(it.valor, p.x + w + 22, y + 15, 32, { cor: D ? 'destaque' : 'branco', alinha: 'esquerda', tabular: true });
          });
          if (p.unidade) { const t1 = p.t + p.itens.length * 0.12; alfa(trecho(t, t1, t1 + 0.3)); escreve(p.unidade, p.x + p.larg / 2, p.y + p.itens.length * p.passo + 10, 30, { cor: 'branco' }); }
        },
        // carimbo de tinta vermelha que bate torto; apaga e leva um risco dourado
        carimbo(p, t) {
          if (t < p.t) return;
          const u = trecho(t, p.t, p.t + 0.2), s = mistura(1.9, 1, sai(u)), ap = p.apaga ? sai(trecho(t, p.apaga, p.apaga + 0.3)) : 0;
          const giro = mistura(p.giro, p.giroApagado ?? p.giro, ap) * RAD;
          const cr = cor('carimbo'), w = largTexto(p.texto, p.tam) + p.tam * 0.9, h = p.tam * 1.7;
          alfa(limita(u * 1.6) * (1 - 0.6 * ap));
          c.save(); c.translate(p.x, p.y); c.rotate(giro); c.scale(s, s);
          retRedondo(-w / 2, -h / 2, w, h, 14); c.strokeStyle = cr; c.lineWidth = 8; c.stroke();
          retRedondo(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 8); c.lineWidth = 3; c.stroke();
          escreve(p.texto, 0, p.tam / 2, p.tam, { corDe: () => cr, sombra: false });
          c.restore();
          if (p.risco && t >= p.risco.de) {
            alfa(1); c.save(); c.translate(p.x, p.y); c.rotate(giro);
            c.strokeStyle = cor('destaque'); c.lineWidth = 16; c.lineCap = 'round'; brilho(14);
            linha(-w / 2 - 20, 8, w / 2 + 20, -8, sai(trecho(t, p.risco.de, p.risco.ate))); semBrilho(); c.restore();
          }
        },
        // túmulos: montes de terra e capim; ganham uma borda de luz
        tumulos(p, t) {
          if (t < p.t) return;
          const b = p.borda ? sai(trecho(t, p.borda, p.borda + 0.4)) : 0;
          for (const [x, y, rx, ry] of p.montes) {
            alfa(1);
            c.beginPath(); c.ellipse(x, y, rx, ry * 1.6, 0, Math.PI, TAU); c.closePath();
            const g = c.createLinearGradient(x - rx, y - ry * 1.6, x + rx * 0.6, y); g.addColorStop(0, cor('monteSombra')); g.addColorStop(0.6, cor('monte')); g.addColorStop(1, cor('monteLuz'));
            c.fillStyle = g; c.fill();
            c.save(); c.clip(); const r = sorteio(Math.round(x * 7 + y)); c.lineCap = 'round';
            for (let i = 0; i < 40; i++) { const px = x - rx + r() * 2 * rx, py = y - r() * ry * 1.6; c.globalAlpha = GA * 0.4; c.strokeStyle = r() < 0.5 ? cor('monteLuz') : cor('monteSombra'); c.lineWidth = 2 + r() * 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 3, py - 8 - r() * 8); c.stroke(); }
            c.restore();
            c.globalAlpha = GA * 0.3; c.fillStyle = '#140a10'; c.beginPath(); c.ellipse(x, y + 4, rx * 1.05, ry * 0.35, 0, 0, TAU); c.fill();
            if (b > 0) {
              alfa(b); c.beginPath(); c.ellipse(x, y, rx, ry * 1.6, 0, Math.PI, TAU); c.closePath();
              c.strokeStyle = cor('destaque'); c.lineWidth = 3.5; brilho(16); c.stroke(); semBrilho();
            }
          }
        },
        // hélice de DNA de luz que sobe do túmulo e se divide em dois ramos
        helice(p, t) {
          if (t < p.de) return;
          const n = 22, u = sai(trecho(t, p.de, p.ate)), giro = t * 2.4;
          const op = c.globalCompositeOperation;
          for (let i = 0; i < n; i++) {
            const vis = limita((u * n - i) * 1.5);
            if (vis <= 0) break;
            const y = mistura(p.y0, p.y1, i / (n - 1)), f = giro + i * 0.55, ax = Math.sin(f) * 66, frente = Math.cos(f);
            alfa(vis * 0.55); c.strokeStyle = cor('dnaFio'); c.lineWidth = 2.5; linha(p.x - ax, y, p.x + ax, y, 1);
            c.globalCompositeOperation = 'lighter';
            for (const [sx, prof, cr] of [[ax, frente, 'dnaA'], [-ax, -frente, 'dnaB']]) {
              alfa(vis * (0.5 + 0.5 * (prof + 1) / 2));
              halo(p.x + sx, y, 26, 0.6, cor(cr));
              c.beginPath(); c.arc(p.x + sx, y, 7 + 4 * (prof + 1) / 2, 0, TAU); c.fillStyle = cor(cr); c.fill();
            }
            c.globalCompositeOperation = op;
          }
          if (p.divide && t >= p.divide) {
            const v = trecho(t, p.divide, p.divide + p.durDivide);
            for (const r of [p.esq, p.dir]) {
              const D = r.cor === 'destaque', m = 12;
              for (let i = 1; i <= m; i++) {
                const q = i / m; if (q > v) break;
                const x = mistura(p.x, r.x, q), y = mistura(p.y1, r.y, q) - Math.sin(q * Math.PI) * 30;
                alfa(D ? 1 : 0.6); if (D) halo(x, y, 30, 0.7);
                c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fillStyle = cor(r.cor); c.fill();
              }
              if (v >= 1) {
                alfa(trecho(t, p.divide + p.durDivide, p.divide + p.durDivide + 0.25));
                escreve(r.rotulo, r.x, r.y - 50, 40, { cor: r.cor, brilho: D ? 14 : 0, veu: p.veu ?? 0.9 });
              }
            }
          }
          c.globalCompositeOperation = op;
        },
        // árvore de família: fios dourados e medalhões redondos com gente pequena dentro
        arvore(p, t) {
          if (t < p.de) return;
          const nos = [[{ x: p.x, y: p.y, tam: p.raizTam }]];
          for (const nv of p.niveis) { const d = p.larg / nv.n; nos.push(Array.from({ length: nv.n }, (_, j) => ({ x: p.x - p.larg / 2 + d * (j + 0.5), y: nv.y, tam: nv.tam }))); }
          const passo = (p.ate - p.de) / p.niveis.length;
          let idx = 0;
          for (let l = 1; l < nos.length; l++) {
            const t0 = p.de + (l - 1) * passo, pr = sai(trecho(t, t0, t0 + passo * 0.8));
            const pais = nos[l - 1], filhos = nos[l], porPai = filhos.length / pais.length;
            alfa(0.9); c.strokeStyle = cor('fio'); c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; brilho(8, cor('fio'));
            filhos.forEach((f, j) => {
              const pai = pais[Math.floor(j / porPai)], yb = pai.y + pai.tam * 0.2, ym = (yb + f.y - f.tam * 0.55) / 2;
              polilinha([[pai.x, yb], [pai.x, ym], [f.x, ym], [f.x, f.y - f.tam * 0.55]], pr);
            });
            semBrilho();
            filhos.forEach((f, j) => {
              const u = trecho(t, t0 + passo * 0.55 + j * 0.02, t0 + passo * 0.55 + j * 0.02 + 0.3);
              idx++;
              if (u <= 0) return;
              const R = f.tam * 0.5, ym = f.y;
              alfa(u); emVolta(f.x, ym, 0.8 + 0.2 * sai(u), () => {
                c.beginPath(); c.arc(f.x, ym, R, 0, TAU); c.fillStyle = cor('medalha'); c.fill();
                c.save(); c.beginPath(); c.arc(f.x, ym, R - 3, 0, TAU); c.clip(); pessoa(f.x, ym + R * 1.25, R * 2.1, vesteDe(idx * 3)); c.restore();
                c.beginPath(); c.arc(f.x, ym, R, 0, TAU); c.strokeStyle = cor('fio'); c.lineWidth = 4; c.stroke();
              });
            });
          }
        },
      };

      // ---------- cenas: as peças entram em 0,3 s; o fundo troca em fusão de 0,6 s centrada na batida ----------
      function pesoCena(i, t) {
        const cn = CENAS[i], prox = CENAS[i + 1];
        if (t < cn.de) return 0;
        const entra = cn.corte || i === 0 ? 1 : trecho(t, cn.de, cn.de + 0.3);
        let fica = 1;
        if (prox) fica = prox.corte ? (t < prox.de ? 1 : 0) : 1 - trecho(t, prox.de, prox.de + 0.15);
        return entra * fica;
      }
      const FUSAO = H.fusao ?? 0.6;
      function pesoFundo(i, t) { // quanto o fundo i cobre (desenhado por cima do anterior)
        const cn = CENAS[i];
        if (i === 0) return 1;
        if (cn.corte) return t >= cn.de ? 1 : 0;
        return trecho(t, cn.de - FUSAO / 2, cn.de + FUSAO / 2);
      }

      // ---------- legendas: branco com borda preta, a palavra falada em âmbar ----------
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
          escreve(ln.join(' '), L / 2, y, tam, { corDe: (p) => (base + p === falada ? cor('destaque') : '#ffffff'), contorno: 8, sombra: 3 });
          idx += ln.length;
        });
      }

      // ---------- acabamento: partículas de luz, vinheta, grão de filme ----------
      const PO = H.poeira || { n: 40 };
      const ciscos = (() => { const r = sorteio((H.semente || 1) + 900); return Array.from({ length: PO.n }, () => ({ x: r() * L, y: r() * A, v: 12 + r() * 30, f: r() * TAU, s: 3 + r() * 6 })); })();
      const brilhinho = novaTela(64, 64);
      { const g = brilhinho.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32), [r, gg, b] = Filme.rgb(cor('luz'));
        gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.25, `rgba(${r},${gg},${b},0.5)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
      const vinheta = novaTela(largura, altura);
      { const g = vinheta.getContext('2d');
        const gr = g.createRadialGradient(largura / 2, altura * 0.45, largura * 0.35, largura / 2, altura * 0.5, altura * 0.62);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(25,12,4,0.62)');
        g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }
      // grão: um ladrilho de ruído em pixels da tela (célula de 1 px, nunca menos), deslocado a cada quadro
      const grao = novaTela(256, 256);
      { const g = grao.getContext('2d'), img = g.createImageData(256, 256), r = sorteio(4242);
        for (let i = 0; i < 256 * 256; i++) { const v = Math.round(128 + (r() - 0.5) * 200); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
        g.putImageData(img, 0, 0); }
      const padraoGrao = c.createPattern(grao, 'repeat');

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        c.fillStyle = cor('escuro'); c.fillRect(0, 0, tela.width, tela.height);
        // fundos: cada um por cima do anterior, em fusão
        let primeiro = 0;
        for (let i = CENAS.length - 1; i >= 0; i--) if (t >= CENAS[i].de && pesoFundo(i, t) >= 1) { primeiro = i; break; }
        for (let i = primeiro; i < CENAS.length; i++) { const w = pesoFundo(i, t); if (w > 0) desenhaFundo(i, t, w); }
        // peças
        CENAS.forEach((cn, i) => {
          const w = pesoCena(i, t);
          if (w <= 0) return;
          GA = w;
          const cam = camera(i, t);
          for (const p of cn.pecas) {
            c.save();
            if (p.naPintura) poeCamada(cam, p.prof ?? 0.6);         // peça que mora na pintura anda com ela
            else c.setTransform(k, 0, 0, k, k * ((cam.dx - cam.tx) * 0.15 + cam.tx), k * ((cam.dy - cam.ty) * 0.15 + cam.ty)); // painel e rótulo: quase parados, mas tremem
            PECAS[p.tipo](p, t); c.restore();
          }
        });
        GA = 1;
        // partículas de luz quentes, subindo devagar
        c.setTransform(k, 0, 0, k, 0, 0); c.globalCompositeOperation = 'lighter';
        for (const m of ciscos) {
          const y = ((m.y - m.v * t) % A + A) % A, x = m.x + 14 * Math.sin(t * 0.6 + m.f) + 5 * t;
          c.globalAlpha = (PO.forca ?? 0.55) * (0.45 + 0.55 * Math.sin(t * 1.7 + m.f * 3) ** 2);
          c.drawImage(brilhinho, x - m.s * 2, y - m.s * 2, m.s * 4, m.s * 4);
        }
        c.globalCompositeOperation = 'source-over';
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(vinheta, 0, 0);
        // grão fino
        { const r = sorteio(Math.round(t * fps) + 77), ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
          c.globalCompositeOperation = 'overlay'; c.globalAlpha = H.grao ?? 0.09; c.translate(-ox, -oy); c.fillStyle = padraoGrao; c.fillRect(ox, oy, tela.width, tela.height);
          c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
        legenda(t);
        const fim = trecho(t, H.escurece?.[0] ?? duracao - 0.35, H.escurece?.[1] ?? duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = '#000'; c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: flauta de sopro em pentatônica sobre cítara grave; tambores grandes ----------
      function som() {
        const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const corta = MU.corta || [], calado = (tt, d = 0) => corta.some(([a, b]) => tt + d > a - 0.02 && tt < b);
        // nota que ainda soa quando a música corta: encurta para acabar no corte (a corda já sai em 0,05 s)
        const ateCorte = (tt, d) => { for (const [a] of corta) if (tt < a && tt + d > a) d = a - tt; return d; };
        const corda = (n, tt, d, o) => { if (calado(tt)) return; s.corda(n, tt, ateCorte(tt, d), o); };
        // cítara grave: dedilhado a cada 1,2 s (nota e quinta)
        for (let i = 0, tt = 0.05; tt < duracao - 0.6; i++, tt += MU.passo || 1.2) {
          const ac = MU.acordes[i % MU.acordes.length];
          corda(ac[0], tt, 2.4, { vol: MU.citara ?? 0.32, maciez: 0.35, pan: -0.2 });
          corda(ac[1], tt + 0.09, 2.0, { vol: (MU.citara ?? 0.32) * 0.7, maciez: 0.5, pan: 0.2 });
          if (i % 2) corda(ac[2], tt + 0.6, 1.4, { vol: (MU.citara ?? 0.32) * 0.45, maciez: 0.6, pan: 0.35 });
        }
        // flauta: frases [tempo, nota, duração], com sopro (ruído) no ataque
        for (const [tt, nota, d] of MU.flauta || []) {
          if (calado(tt, d)) continue;
          s.nota(nota, tt, d, { vol: MU.vol ?? 0.06, forma: 'seno', ataque: 0.09, solta: 0.35, vibrato: 0.006, vibratoHz: 5.2, pan: 0.1 });
          s.nota(nota, tt, d, { vol: (MU.vol ?? 0.06) * 0.18, forma: 'tri', ataque: 0.12, solta: 0.3, pan: 0.1 });
          s.vento(tt, d + 0.1, { vol: 0.012, corte: 3200, onda: 3, entra: 0.06, sai: 0.2 });
        }
        // tique-tique de madeira sob o contador
        if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.075) s.toque(tt, { vol: 0.045, corte: 2600, dur: 0.02, pan: (r() - 0.5) * 0.4 });
        // tambor grande (taiko): grave + pele
        const taiko = (tt, v = 1) => { s.batida(tt, { vol: 0.62 * v, freq: 58, dur: 0.75 }); s.batida(tt, { vol: 0.25 * v, freq: 120, dur: 0.18 }); s.toque(tt, { vol: 0.1 * v, corte: 700, dur: 0.12 }); };
        for (const g of SO.tambores || []) taiko(g[0], g[1]);
        // brilho (sino de vidro) e subidas de ar
        for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, tt + i * 0.06, 1.1, { vol: 0.045, pan: (i - 1.5) * 0.25, brilho: 1.2 }));
        for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.11, corte: 2200, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 330, sobe: 1.6, dur: d, repete: 1, vol: 0.03 }); }
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
