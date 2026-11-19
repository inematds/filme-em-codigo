// MOTOR "explicativo-luz" — explicativo vertical em 3D luminoso: espaço quase preto, planeta feito de
// pontos com nuvens que giram, linhas amarelas que brilham e luz azul na borda. A comparação vira
// corrida (dois marcadores e dois contadores lado a lado); cada palavra-chave ganha um chip de letra
// de máquina; no alto, uma barra fina com a linha de progresso; embaixo, legenda com a palavra da vez
// em amarelo. Termina com uma vista do chão e uma pergunta grande.
// Jeito de animar: cena 3D projetada à mão em canvas 2D (mundo.js tem a câmera e as peças), brilho
// somando luz. Letras em traços (letras.js), sem fonte instalada.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio } = Filme;
  const { camera: criarCamera, criarPlaneta, circulo, noCirculo, caminho, caixa, brilho, linhaBrilho, rgb, rgba } = Mundo;
  const V = Mundo.vet;
  const L = 1080, A = 1920; // tamanho "de desenho"; a tela real pode ser menor, a escala cuida

  // sorteio sem memória: o mesmo par de números dá sempre o mesmo valor (0 a 1)
  function h(a, b = 0) {
    let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
    return (v >>> 0) / 4294967296;
  }
  const mix3 = (a, b, k) => [mistura(a[0], b[0], k), mistura(a[1], b[1], k), mistura(a[2], b[2], k)];
  // valor entre chaves [[t, v], ...] (reta entre uma chave e outra)
  function chave(K, t) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) return mistura(K[i - 1][1], K[i][1], trecho(t, K[i - 1][0], K[i][0]));
    return K[K.length - 1][1];
  }
  // "volta" com passada: sai de 0, passa um pouco de 1 e assenta (o chip pula ao entrar)
  const pula = (k) => { const c1 = 1.9, c3 = c1 + 1, x = k - 1; return 1 + c3 * x * x * x + c1 * x * x; };

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 15,
    montar({ historia: H, tela, largura, duracao }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const COR = (n) => (H.cores[n] || n);
      const PL = H.planos;
      const planoEm = (t) => { let i = 0; PL.forEach((p, j) => { if (t >= p.de) i = j; }); return i; };
      const peca = (P, tipo) => P.pecas.filter((q) => q.tipo === tipo);

      // ---------- letras em traços ----------
      const EXTRA = {
        '·': { w: 0.22, tracos: [[[0.11, 0.52], [0.11, 0.52]]] },
        '•': { w: 0.3, tracos: [[[0.15, 0.5], [0.15, 0.5]]], ponto: true },
        '=': { w: 0.5, tracos: [[[0, 0.36], [0.5, 0.36]], [[0, 0.68], [0.5, 0.68]]] },
      };
      const glifo = (ch) => (ch === ' ' ? null : EXTRA[ch] || Letras.letra(ch));
      const ESPACO = 0.62, ENTRE = 0.2, PASSO = 0.66; // PASSO = casa da letra de máquina (chips, barra)
      const largTexto = (txt, tam, mono) => {
        if (mono) return [...txt].length * PASSO * tam;
        let w = 0; for (const ch of txt) { const g = glifo(ch); w += g ? g.w + ENTRE : ESPACO; } return Math.max(0, w - ENTRE) * tam;
      };
      // escreve um texto; o = { cor, larg, alinha ('centro'|'esquerda'|'direita'), mono, brilho, sombra, escala }
      function escreve(txt, x, y, tam, o) {
        const w = largTexto(txt, tam, o.mono);
        let px = o.alinha === 'esquerda' ? x : o.alinha === 'direita' ? x - w : x - w / 2;
        const larg = o.larg || tam * 0.12, chars = [...txt];
        const pos = [];
        for (const ch of chars) {
          const g = glifo(ch);
          if (o.mono) { if (g) pos.push([g, px + (PASSO * tam - g.w * tam * 0.82) / 2, 0.82]); px += PASSO * tam; }
          else { if (g) pos.push([g, px, 1]); px += (g ? g.w + ENTRE : ESPACO) * tam; }
        }
        const risca = (cor, lw, alfa, soma) => {
          c.save(); if (soma) c.globalCompositeOperation = 'lighter';
          c.strokeStyle = rgba(cor, alfa); c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
          c.beginPath();
          for (const [g, ox, sx] of pos) {
            const lw2 = g.ponto ? lw * 1.9 : lw;
            if (lw2 !== lw) { c.stroke(); c.lineWidth = lw2; c.beginPath(); }
            for (const tr of g.tracos) tr.forEach(([a, b], j) => { const qx = ox + a * tam * sx, qy = y - tam + b * tam; j ? c.lineTo(qx, qy) : c.moveTo(qx, qy); if (tr.length === 1 || (tr.length === 2 && tr[0][0] === tr[1][0] && tr[0][1] === tr[1][1])) c.lineTo(qx + 0.01, qy); });
            if (lw2 !== lw) { c.stroke(); c.lineWidth = lw; c.beginPath(); }
          }
          c.stroke(); c.restore();
        };
        if (o.sombra) risca('#000000', larg + tam * 0.16, 0.7, false);
        if (o.brilho) { risca(o.cor, larg * 4, 0.12 * o.brilho, true); risca(o.cor, larg * 2, 0.25 * o.brilho, true); }
        risca(o.cor, larg, 1, false);
        return w;
      }
      // confere, ao montar, se todas as letras da história existem (letra que falta some sem aviso)
      (function confereLetras() {
        const textos = [H.barra.esquerda, H.barra.direita];
        for (const P of PL) {
          (P.chips || []).forEach((q) => textos.push(q.texto));
          (P.legendas || []).forEach((q) => textos.push(q.texto));
          (P.contadores || []).forEach((q) => textos.push(q.rotulo, q.rodape || '', q.feito ? q.feito.rotulo : ''));
          if (P.titulo) textos.push(...P.titulo.linhas);
        }
        const falta = new Set();
        for (const tx of textos) for (const ch of tx) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- legendas e título: palavras com hora de entrar ----------
      const LG = H.legenda, FIM = duracao - (H.fimEscuro || 0.25), POP = 0.12, SOME = 0.12; // POP = a palavra assenta; SOME = a legenda some
      const LEGENDAS = PL.flatMap((P) => P.legendas || []).map((lg) => {
        const tam = LG.tam, palavras = lg.texto.split(/\s+/), linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && largTexto(tenta, tam) > LG.largura) { linhas.push(atual); atual = [p]; } else atual.push(p); }
        if (atual.length) linhas.push(atual);
        // regra: a legenda fica pelo menos 0,5 s inteira na tela (última palavra assentada, antes de sumir)
        const completa = lg.de + (palavras.length - 1) * lg.passo + Math.max(lg.passo, POP);
        if (completa + 0.5 > lg.ate - SOME + 1e-6) throw new Error(`Legenda "${lg.texto}" fica inteira só ${(lg.ate - SOME - completa).toFixed(2)} s (mínimo 0,5 s).`);
        return { ...lg, linhas, completa };
      });
      PL.forEach((P) => {
        if (!P.titulo) return;
        const n = P.titulo.linhas.join(' ').split(/\s+/).length, completa = P.titulo.de + (n - 1) * P.titulo.passo + Math.max(P.titulo.passo, POP);
        if (completa + 0.5 > FIM + 1e-6) throw new Error('O título final fica inteiro menos de 0,5 s antes de escurecer.');
      });
      // palavras que aparecem uma a uma; a da vez em amarelo
      function palavras(linhas, de, passo, t, tam, y0, alt, cores, destaque) {
        let n = 0;
        const tudo = de + linhas.flat().length * passo;
        linhas.forEach((ln, li) => {
          const wLinha = largTexto(ln.join(' '), tam);
          let x = (L - wLinha) / 2;
          const y = y0 + li * alt;
          ln.forEach((p) => {
            const tp = de + n * passo; n++;
            const wp = largTexto(p, tam);
            if (t >= tp) {
              const kk = limita((t - tp) / POP), s = 0.82 + 0.18 * pula(kk);
              const daVez = t < tp + passo && t < tudo;
              const cor = destaque ? (destaque.includes(p) ? cores.fala : cores.cor) : (daVez ? cores.fala : cores.cor);
              c.save(); c.globalAlpha = limita(kk * 2);
              c.translate(x + wp / 2, y - tam * 0.45); c.scale(s, s); c.translate(-(x + wp / 2), -(y - tam * 0.45));
              escreve(p, x, y, tam, { cor: COR(cor), larg: tam * 0.13, alinha: 'esquerda', sombra: true, brilho: destaque ? 0.8 : 0 });
              c.restore();
            }
            x += wp + ESPACO * tam;
          });
        });
      }
      function legenda(t) {
        const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate); if (!lg) return;
        const sai = limita((lg.ate - t) / SOME);
        c.save(); c.globalAlpha = sai;
        palavras(lg.linhas, lg.de, lg.passo, t, LG.tam, LG.y, LG.tam * 1.35, { cor: LG.cor, fala: LG.fala });
        c.restore();
      }

      // ---------- chips de letra de máquina ----------
      function chip(q, t) {
        if (t < q.de || t >= q.ate) return;
        const kk = limita((t - q.de) / 0.2), s = pula(kk), sai = limita((q.ate - t) / 0.15);
        const tam = q.tam || 34, cor = COR(q.cor || 'amarelo'), w = largTexto(q.texto, tam, true), pad = tam * 0.45;
        const bw = w + pad * 2, bh = tam * 1.7;
        c.save(); c.globalAlpha = limita(kk * 3) * sai;
        c.translate(q.x, q.y); c.scale(s, s);
        if (q.estilo === 'cheio') {
          brilho(c, 0, 0, bw * 0.75, cor, 0.35);
          c.fillStyle = cor; c.fillRect(-bw / 2, -bh / 2, bw, bh);
          escreve(q.texto, 0, tam * 0.5, tam, { cor: H.cores.escuro, larg: tam * 0.13, mono: true });
        } else {
          c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(-bw / 2, -bh / 2, bw, bh);
          linhaBrilho(c, [[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]], cor, 2.5, 0.8, true);
          escreve(q.texto, 0, tam * 0.5, tam, { cor, larg: tam * 0.12, mono: true, brilho: 0.6 });
        }
        c.restore();
      }

      // ---------- contadores grandes ----------
      function contador(q, t) {
        if (t < q.de || t >= q.ate) return;
        const kk = limita((t - q.de) / 0.25), sai = limita((q.ate - t) / 0.15);
        const v = Math.floor(chave(q.chaves, t) + 1e-6), cor = COR(q.cor), tam = q.tam;
        const feito = q.feito && t >= q.feito.em;
        c.save(); c.globalAlpha = limita(kk * 2) * sai;
        c.translate(0, (1 - saiDevagar(kk)) * 40);
        // rótulo em cima, no estilo chip
        chip({ texto: feito ? q.feito.rotulo : q.rotulo, x: q.x, y: q.y - tam * 1.45, de: -1, ate: 99, estilo: feito ? 'cheio' : 'contorno', cor: q.cor, tam: 24 }, t);
        // número: pula um pouco quando termina
        const fimC = q.chaves[q.chaves.length - 1][0], pulo = t >= fimC ? 1 + 0.12 * Math.exp(-(t - fimC) * 10) : 1;
        c.save(); c.translate(q.x, q.y - tam * 0.5); c.scale(pulo, pulo); c.translate(-q.x, -(q.y - tam * 0.5));
        escreve(String(v), q.x, q.y, tam, { cor, larg: tam * 0.16, brilho: 1 });
        c.restore();
        // barra de progresso e rodapé
        const bw = tam * 1.9, by = q.y + tam * 0.32;
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(q.x - bw / 2, by, bw, 5);
        linhaBrilho(c, [[q.x - bw / 2, by + 2.5], [q.x - bw / 2 + bw * limita(v / q.maximo), by + 2.5]], cor, 4, 1);
        if (q.rodape) escreve(q.rodape, q.x, by + 52, 22, { cor: H.cores.cinza, larg: 3, mono: true });
        c.restore();
      }

      // ---------- barra do alto ----------
      function barra(t) {
        const B = H.barra, y = B.y;
        brilho(c, 52, y - B.tam * 0.45, 22, H.cores.amarelo, 0.9);
        c.fillStyle = H.cores.amarelo; c.beginPath(); c.arc(52, y - B.tam * 0.45, 6, 0, Math.PI * 2); c.fill();
        escreve(B.esquerda, 72, y, B.tam, { cor: H.cores.branco, larg: 3.2, mono: true, alinha: 'esquerda' });
        escreve(B.direita, L - 44, y, B.tam * 0.8, { cor: H.cores.cinza, larg: 2.4, mono: true, alinha: 'direita' });
        c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(44, y + 22, L - 88, 3);
        linhaBrilho(c, [[44, y + 23.5], [44 + (L - 88) * limita(t / duracao), y + 23.5]], H.cores.amarelo, 3, 1);
      }

      // ---------- estrelas fixas (sorteadas uma vez pela semente) ----------
      const r0 = sorteio(H.semente * 13 + 1), ESTRELAS = [];
      for (let i = 0; i < 220; i++) ESTRELAS.push([r0() * L, r0() * A, 0.6 + 2.2 * r0() * r0(), r0()]);
      function estrelas(t, forca) {
        c.save(); c.globalCompositeOperation = 'lighter';
        ESTRELAS.forEach(([x, y, s, f], i) => {
          const pisca = 0.55 + 0.45 * Math.sin(t * (1.5 + 2 * f) + i);
          c.fillStyle = `rgba(230,236,255,${(0.35 + 0.5 * f) * pisca * forca})`;
          c.fillRect(x - s / 2, y - s / 2, s, s);
          if (s > 2.2) brilho(c, x, y, s * 5, '#cfe0ff', 0.25 * pisca * forca);
        });
        c.restore();
      }

      // ---------- câmera de cada plano ----------
      function camDe(t) {
        const P = PL[planoEm(t)], C = P.camera, mv = C.move || [P.de, P.ate];
        const kk = suave(trecho(t, mv[0], mv[1]));
        return criarCamera(mix3(C.de.pos, C.ate.pos, kk), mix3(C.de.alvo, C.ate.alvo, kk), C.fov, L, A);
      }

      // ---------- planeta: o giro é a soma dos giros de cada plano até agora (conta, sem memória) ----------
      const PLN = H.planeta, planeta = criarPlaneta(PLN, H.semente * 7 + 3);
      const eixoPlaneta = V.giraZ([0, 1, 0], planeta.eixo);
      function giroEm(t) {
        let a = 0;
        for (const P of PL) { const q = peca(P, 'planeta')[0]; if (!q) continue; a += q.giro * Math.max(0, Math.min(t, P.ate) - P.de) * Math.PI * 2; }
        return a;
      }
      const aparece = (q, t) => (q.aparece ? suave(trecho(t, q.aparece[0], q.aparece[1])) : 1);
      // anel do planeta e órbita (pontos, eixos) feitos uma vez
      const ANEL = circulo(PLN.centro, PLN.raio * H.anel.raio, eixoPlaneta, 120);
      const ORB = circulo(H.sol.centro, H.orbita.raio, H.orbita.normal, 160);
      // o anel e a órbita: t1 aponta para +x ou +z; acha o ângulo do planeta na órbita
      const angPlaneta = (() => { const d = V.sub(PLN.centro, H.sol.centro); return Math.atan2(V.pe(d, ORB.t2), V.pe(d, ORB.t1)); })();

      function marcador(q, cam, t, disco) {
        if (t < q.chaves[0][0] - 0.25) return;
        const fr = chave(q.chaves, t), ent = limita((t - q.chaves[0][0] + 0.25) / 0.25);
        const C = q.caminho === 'anel' ? ANEL : ORB, centro = q.caminho === 'anel' ? PLN.centro : H.sol.centro;
        const raio = q.caminho === 'anel' ? PLN.raio * H.anel.raio : H.orbita.raio;
        const a0 = q.caminho === 'orbita' ? angPlaneta : q.inicio, a = a0 + q.sentido * fr * Math.PI * 2;
        const cor = COR(q.cor);
        // rastro: o caminho já feito, mais forte perto do marcador
        if (fr > 0.002) {
          const n = Math.max(2, Math.ceil(fr * 120)), pts = [];
          for (let i = 0; i <= n; i++) pts.push(noCirculo(centro, raio, C.t1, C.t2, a0 + q.sentido * fr * Math.PI * 2 * i / n));
          caminho(c, cam, pts, cor, 3.2, 0.9 * ent, disco);
          const cauda = pts.slice(Math.max(0, pts.length - 16));
          caminho(c, cam, cauda, '#ffffff', 2.5, 0.6 * ent, disco);
        }
        const X = noCirculo(centro, raio, C.t1, C.t2, a), p = cam.proj(X);
        const atras = disco && p.z > disco.z && Math.hypot(p.x - disco.x, p.y - disco.y) < disco.r;
        const f = (atras ? 0.2 : 1) * ent;
        brilho(c, p.x, p.y, 70, cor, 0.7 * f); brilho(c, p.x, p.y, 26, '#ffffff', 0.9 * f);
      }

      function sol(cam, forca, t) {
        const S = H.sol, p = cam.proj(S.centro), R = S.raio * p.s;
        brilho(c, p.x, p.y, R * 4.2, S.brilho, 0.55 * forca);
        brilho(c, p.x, p.y, R * 2.2, S.cor, 0.8 * forca);
        c.save(); c.globalAlpha = forca;
        const gr = c.createRadialGradient(p.x - R * 0.2, p.y - R * 0.25, R * 0.1, p.x, p.y, R);
        gr.addColorStop(0, '#fffbd0'); gr.addColorStop(0.6, S.cor); gr.addColorStop(1, '#d9a200');
        c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, R, 0, Math.PI * 2); c.fill(); c.restore();
        // anel fino em volta do sol (inclinado com a órbita)
        const anel = circulo(S.centro, S.raio * 1.45, [0.15, 1, 0.25], 80);
        caminho(c, cam, anel.pts, S.cor, 2.5, 0.7 * forca, { x: p.x, y: p.y, r: R, z: p.z });
        return { x: p.x, y: p.y, r: R, z: p.z };
      }

      function seta(q, cam, t, disco) {
        const f = aparece(q, t), cor = COR(q.cor), raio = PLN.raio * q.raio;
        const C = circulo(PLN.centro, raio, eixoPlaneta, 4);
        // traços que correm no sentido do giro, com pontas de seta
        const desloca = q.sentido * t * q.velocidade * Math.PI * 2 / 6;
        for (let s = 0; s < 6; s++) {
          const a0 = desloca + s * Math.PI * 2 / 6, comp = 0.62, pts = [];
          for (let i = 0; i <= 14; i++) pts.push(noCirculo(PLN.centro, raio, C.t1, C.t2, a0 + q.sentido * comp * i / 14));
          caminho(c, cam, pts, cor, 4, f, disco);
          // ponta da seta na frente do traço
          const pa = cam.proj(pts[13]), pb = cam.proj(pts[14]);
          const atras = disco && pb.z > disco.z && Math.hypot(pb.x - disco.x, pb.y - disco.y) < disco.r;
          const dx = pb.x - pa.x, dy = pb.y - pa.y, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, tam = 26 * pb.s / 260;
          linhaBrilho(c, [[pb.x - ux * tam - uy * tam * 0.7, pb.y - uy * tam + ux * tam * 0.7], [pb.x + ux * tam * 0.4, pb.y + uy * tam * 0.4], [pb.x - ux * tam + uy * tam * 0.7, pb.y - uy * tam - ux * tam * 0.7]], cor, 4, f * (atras ? 0.15 : 1));
        }
      }

      // ---------- chão de pontos, céu, montanhas, sol que nasce ----------
      function ceu(Ce) {
        const gr = c.createLinearGradient(0, 0, 0, A);
        gr.addColorStop(0, Ce.topo); gr.addColorStop(Ce.altura, Ce.horizonte); gr.addColorStop(Math.min(1, Ce.altura + 0.12), '#000000'); gr.addColorStop(1, '#000000');
        c.fillStyle = gr; c.fillRect(0, 0, L, A);
      }
      function chao(q, cam, t, P) {
        const cor = COR(q.cor), [cr, cg, cb] = rgb(cor);
        c.save(); c.globalCompositeOperation = 'lighter';
        let i = 0;
        for (let z = q.z[0]; z <= q.z[1]; z += q.passo) {
          for (let x = q.x[0]; x <= q.x[1]; x += q.passo, i++) {
            const jx = (h(i, 1) - 0.5) * q.passo * 0.8, jz = (h(i, 2) - 0.5) * q.passo * 0.8;
            const p = cam.proj([x + jx, 0, z + jz]); if (p.z < 0.3 || p.x < -10 || p.x > L + 10 || p.y > A + 10) continue;
            const forte = h(i, 3), longe = limita(1 - (p.z - 3) / 34) * limita((p.z - 0.8) / 2.5);
            const s = Math.min(9, Math.max(1.2, 0.035 * p.s * (0.5 + forte)));
            const a = (0.18 + 0.75 * forte * forte) * (0.25 + 0.75 * longe) * (0.75 + 0.25 * Math.sin(t * 2 + i));
            c.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
            c.fillRect(p.x - s / 2, p.y - s * 0.3, s, s * 0.6);
            if (forte > 0.93) brilho(c, p.x, p.y, s * 6, cor, 0.35 * longe);
          }
        }
        c.restore();
      }
      function montanhas(q, cam) {
        const pts = q.picos.map(([x, y]) => { const p = cam.proj([x, y, q.z]); return [p.x, p.y]; });
        const base = cam.proj([0, 0, q.z]).y;
        c.beginPath(); c.moveTo(-50, base + 4); pts.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(L + 50, base + 4); c.lineTo(L + 50, A); c.lineTo(-50, A); c.closePath();
        c.fillStyle = '#000000'; c.fill();
        // contorno leve das montanhas, pego pela luz de trás
        linhaBrilho(c, pts, H.cores.amarelo, 1.5, 0.25);
      }
      function solNasce(q, cam, t) {
        const kk = saiDevagar(trecho(t, q.de, q.ate)), y = mistura(q.y[0], q.y[1], kk);
        const p = cam.proj([q.centro[0], y, q.centro[2]]), R = q.raio * p.s;
        const hz = cam.proj([0, 0, q.centro[2]]).y;
        // o céu acende na linha do horizonte conforme o sol sobe
        const acende = 0.25 + 0.75 * kk;
        const gr = c.createRadialGradient(p.x, hz, 0, p.x, hz, L * 0.75);
        gr.addColorStop(0, rgba(H.cores.amarelo, 0.5 * acende)); gr.addColorStop(0.3, rgba('#c9a800', 0.18 * acende)); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(0, 0, L, A); c.restore();
        brilho(c, p.x, p.y, R * 3.2, H.cores.amarelo, 0.7 * acende);
        c.save(); c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(p.x, p.y, R, 0, Math.PI * 2); c.fill(); c.restore();
        brilho(c, p.x, p.y, R * 1.5, '#ffffff', 0.3 * acende);
      }

      // ---------- o jipe (robô de rodas) e o bloco de chumbo ----------
      function poseJipe(q, t) {
        let x = q.base[0], z = q.base[2], olha = 0, anda = 0, susto = 0;
        for (const m of q.movimentos || []) {
          if (m.tipo === 'anda') { const kk = saiDevagar(trecho(t, m.de, m.ate)); x += m.dx * (1 - kk); anda += (1 - kk) * m.dx * -1; }
          if (m.tipo === 'olha') olha = mistura(olha, m.para, suave(trecho(t, m.de, m.ate)));
          if (m.tipo === 'recua') { const kk = suave(trecho(t, m.de, m.ate)); x += m.dx * kk; anda += m.dx * kk; susto = Math.sin(Math.PI * trecho(t, m.de, m.ate)); }
        }
        return { x, z, olha, anda, susto };
      }
      function jipe(q, cam, t) {
        const J = poseJipe(q, t), cor = COR(q.cor), g = q.giro, base = [J.x, 0, J.z];
        const quique = 0.015 * Math.sin(t * 30) * (J.anda !== 0 ? 1 : 0);
        const lado = V.giraY([0, 0, 1], g);
        // rodas (atrás do corpo primeiro)
        const rodas = [];
        for (const sx of [-0.32, 0.32]) for (const sz of [-0.36, 0.36]) rodas.push(V.soma(base, V.giraY([sx, 0.17, sz], g)));
        rodas.sort((a, b) => cam.proj(b).z - cam.proj(a).z);
        const desenhaRoda = (R) => {
          const C = circulo(R, 0.17, lado, 28);
          const pts = C.pts.map((X) => { const p = cam.proj(X); return [p.x, p.y]; });
          c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.fillStyle = '#0c0c08'; c.fill();
          linhaBrilho(c, pts, cor, 2.4, 0.9);
          const giroRoda = J.anda / 0.17;   // a roda gira o quanto o jipe andou
          for (let s = 0; s < 3; s++) {
            const a = giroRoda + s * Math.PI * 2 / 3, P2 = cam.proj(noCirculo(R, 0.15, C.t1, C.t2, a)), P1 = cam.proj(R);
            linhaBrilho(c, [[P1.x, P1.y], [P2.x, P2.y]], cor, 1.6, 0.6);
          }
        };
        rodas.slice(0, 2).forEach(desenhaRoda);
        caixa(c, cam, V.soma(base, [0, 0.2 + quique, 0]), [0.82, 0.26, 0.56], g, { face: '#2a2a22', aresta: cor }, 0.9, 2.2);
        // mastro e cabeça (a cabeça vira para olhar; no susto, se encolhe)
        const topo = V.soma(base, V.soma(V.giraY([0.22, 0, 0], g), [0, 0.46 + quique, 0])), alto = 0.82 - 0.08 * J.susto + quique;
        const pa = cam.proj(topo), pb = cam.proj(V.soma(base, V.soma(V.giraY([0.22, 0, 0], g), [0, alto, 0])));
        linhaBrilho(c, [[pa.x, pa.y], [pb.x, pb.y]], cor, 2.4, 0.9);
        const cab = V.soma(base, V.soma(V.giraY([0.22, 0, 0], g), [0, alto, 0]));
        caixa(c, cam, cab, [0.24, 0.16, 0.2], g + J.olha, { face: '#2a2a22', aresta: cor }, 0.9, 2);
        // olho: a lente que brilha na frente da cabeça
        const olho = cam.proj(V.soma(cab, V.soma(V.giraY([0.125, 0, 0], g + J.olha), [0, 0.08, 0])));
        brilho(c, olho.x, olho.y, 60 * olho.s / 400, '#bfe0ff', 0.9);
        rodas.slice(2).forEach(desenhaRoda);
      }
      function bloco(q, cam, t) {
        const kk = suave(trecho(t, q.derrete[0], q.derrete[1])), cor = COR(q.cor);
        const [w, hh, d] = q.tam;
        // poça que cresce no chão
        if (kk > 0) {
          const n = 40, pts = [];
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2, rr = (0.5 + 0.9 * kk) * (0.85 + 0.15 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 5));
            const p = cam.proj(V.soma(q.base, V.giraY([Math.cos(a) * rr * w * 0.9, 0.005, Math.sin(a) * rr * d * 0.9], q.giro)));
            pts.push([p.x, p.y]);
          }
          c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
          c.fillStyle = rgba('#b85a10', 0.85 * kk); c.fill();
          linhaBrilho(c, pts, cor, 2.5, kk, true);
        }
        // o bloco afunda e se espalha (o volume quase não muda)
        const altura = mistura(hh, 0.04, kk), esp = Math.sqrt(hh / Math.max(altura, 0.05));
        const b = cam.proj(V.soma(q.base, [0, altura * 0.5, 0]));
        brilho(c, b.x, b.y, 2.4 * w * b.s, cor, 0.25 + 0.5 * kk);
        if (altura > 0.05) caixa(c, cam, q.base, [w * Math.min(esp, 1.6), altura, d * Math.min(esp, 1.6)], q.giro, { face: Filme.hex('#3b3b40', '#d46a12', kk), aresta: cor }, 0.7 + 0.3 * kk, 2.4);
        // ar quente subindo: linhas que ondulam
        for (let i = 0; i < 4; i++) {
          const pts = [];
          for (let j = 0; j <= 12; j++) {
            const yy = altura + 0.1 + j * 0.06, xx = (i - 1.5) * w * 0.28 + 0.04 * Math.sin(j * 0.9 - t * 6 + i * 2);
            const p = cam.proj(V.soma(q.base, [xx, yy, 0])); pts.push([p.x, p.y]);
          }
          linhaBrilho(c, pts, cor, 1.4, 0.18 * (0.4 + kk));
        }
      }

      // ---------- passagens entre planos ----------
      function passagens(t) {
        let clarao = 0, escuro = 0;
        PL.forEach((Q) => {
          const d = t - Q.de;
          if (Q.entrada === 'abre') escuro = Math.max(escuro, 1 - suave(trecho(d, 0, 0.45)));
          if (Q.entrada === 'clarao') clarao = Math.max(clarao, d >= 0 ? Math.exp(-d * 6) : 0.6 * suave(trecho(d, -0.12, 0)));
          if (Q.entrada === 'escurece' && Math.abs(d) < 0.22) escuro = Math.max(escuro, 1 - suave(Math.abs(d) / 0.22));
        });
        escuro = Math.max(escuro, suave(trecho(t, FIM, duracao)));
        return { clarao, escuro };
      }

      // ---------- desenhar(t) ----------
      function desenhar(t) {
        c.reset();
        c.setTransform(k, 0, 0, k, 0, 0);
        const P = PL[planoEm(t)], cam = camDe(t);
        c.fillStyle = H.cores.fundo; c.fillRect(0, 0, L, A);
        if (P.ceu) ceu(P.ceu);

        for (const q of peca(P, 'estrelas')) estrelas(t, 1);
        for (const q of peca(P, 'solNasce')) solNasce(q, cam, t);
        for (const q of peca(P, 'montanhas')) montanhas(q, cam);
        for (const q of peca(P, 'chao')) chao(q, cam, t, P);

        // espaço: sol, órbita, planeta, anel, marcadores, seta (o que está atrás do planeta fica fraco)
        const qs = peca(P, 'sol')[0], qo = peca(P, 'orbita')[0], qp = peca(P, 'planeta')[0];
        let discoSol = null;
        if (qs) discoSol = sol(cam, aparece(qs, t), t);
        if (qo) {
          const fr = qo.desenha ? saiDevagar(trecho(t, qo.desenha[0], qo.desenha[1])) : 1;
          const n = Math.max(2, Math.round(160 * fr)), pts = [];
          for (let i = 0; i <= n; i++) pts.push(noCirculo(H.sol.centro, H.orbita.raio, ORB.t1, ORB.t2, angPlaneta + Math.PI * 2 * fr * i / n));
          caminho(c, cam, pts, COR(qo.cor), 2, 0.35, discoSol, 3);
        }
        const pc = cam.proj(PLN.centro), disco = { x: pc.x, y: pc.y, r: PLN.raio * pc.s, z: pc.z };
        // anel, marcadores e seta vão depois do planeta; o pedaço que passa atrás dele sai fraco
        const voltas = P.pecas.filter((q) => q.tipo === 'marcador' || q.tipo === 'anel' || q.tipo === 'seta');
        const desenhaAnelMarc = (q) => {
          if (q.tipo === 'anel') caminho(c, cam, ANEL.pts, COR(q.cor), 2.2, 0.55 * aparece(q, t), disco, 2);
          if (q.tipo === 'marcador') marcador(q, cam, t, disco);
          if (q.tipo === 'seta') seta(q, cam, t, disco);
        };
        if (qp) {
          const giro = giroEm(t);
          planeta.desenhar(c, cam, giro, qp.luz, aparece(qp, t), k);
        }
        voltas.forEach(desenhaAnelMarc);

        // o bloco fica na frente do jipe na história (mais perto da câmera), mas vai antes: suas faces escuras não cobrem o jipe
        for (const q of peca(P, 'bloco')) bloco(q, cam, t);
        for (const q of peca(P, 'jipe')) jipe(q, cam, t);

        // letreiro
        barra(t);
        (P.contadores || []).forEach((q) => contador(q, t));
        (P.chips || []).forEach((q) => chip(q, t));
        if (P.titulo && t >= P.titulo.de) {
          const T = P.titulo;
          palavras(T.linhas.map((l) => l.split(' ')), T.de, T.passo, t, T.tam, T.y, T.tam * 1.25, { cor: 'branco', fala: 'amarelo' }, T.destaque);
        }
        legenda(t);

        // passagens
        const ps = passagens(t);
        c.setTransform(1, 0, 0, 1, 0, 0);
        if (ps.clarao > 0) { c.fillStyle = `rgba(255,236,170,${ps.clarao.toFixed(3)})`; c.fillRect(0, 0, tela.width, tela.height); }
        if (ps.escuro > 0) { c.fillStyle = `rgba(0,0,0,${limita(ps.escuro).toFixed(3)})`; c.fillRect(0, 0, tela.width, tela.height); }
      }

      // ---------- som: pad e pulso baixinhos; efeitos nas palavras-chave, tudo tirado da história ----------
      function som() {
        const s = Som.criar(duracao, H.semente), M = H.musica;
        M.acordes.forEach((a, i) => {
          const fim = i + 1 < M.acordes.length ? M.acordes[i + 1].de : duracao;
          a.notas.forEach((n, j) => s.nota(n, a.de, fim - a.de, { forma: 'tri', vol: 0.028, ataque: 0.3, solta: 0.5, pan: (j - 1.5) * 0.25, vibrato: 0.003 }));
          s.nota(a.notas[0], a.de, fim - a.de, { forma: 'seno', vol: 0.06, ataque: 0.1, solta: 0.4 });
        });
        for (let i = 0, t = 0.3; t < duracao - 0.6; i++, t += M.passoPulso) s.sino(M.pulso[i % M.pulso.length], t, 0.35, { vol: 0.014, pan: ((i % 4) - 1.5) * 0.3, brilho: 1.2 });
        // palavra da legenda: um toque bem leve (marca o ritmo da fala que virou texto)
        for (const lg of LEGENDAS) { const n = lg.texto.split(/\s+/).length; for (let i = 0; i < n; i++) s.toque(lg.de + i * lg.passo, { vol: 0.012, corte: 2500, dur: 0.02 }); }
        for (const P of PL) {
          if (P.entrada === 'clarao') { s.batida(P.de, { vol: 0.5, freq: 50, dur: 1.0 }); s.vento(P.de - 0.05, 0.9, { vol: 0.12, corte: 1200, onda: 3, entra: 0.03, sai: 0.7 }); }
          if (P.entrada === 'escurece') s.vento(P.de - 0.45, 0.6, { vol: 0.1, corte: 1600, onda: 1, profundidade: 0.2, entra: 0.4, sai: 0.12 });
          if (P.camera.move) s.vento(P.camera.move[0], P.camera.move[1] - P.camera.move[0] + 0.2, { vol: 0.09, corte: 700, onda: 0.8, profundidade: 0.3, entra: 0.2, sai: 0.3 });
          for (const q of P.chips || []) s.pio(q.de, { freq: q.estilo === 'cheio' ? 1760 : 2350, dur: 0.035, repete: 1, vol: 0.045 });
          for (const q of P.contadores || []) {
            const t0 = q.chaves[0][0], t1 = q.chaves[q.chaves.length - 1][0], v1 = q.chaves[q.chaves.length - 1][1];
            // tique a cada 9 dias contados, mais agudo no fim
            for (let v = 9; v < v1; v += 9) {
              let tv = t0; for (let i = 1; i < q.chaves.length; i++) { const [ta, va] = q.chaves[i - 1], [tb, vb] = q.chaves[i]; if (v <= vb) { tv = ta + (tb - ta) * (v - va) / (vb - va); break; } }
              s.pio(tv, { freq: q.cor === 'azul' ? 900 + 500 * v / v1 : 1300 + 600 * v / v1, dur: 0.012, repete: 1, vol: 0.03, pan: (q.x - 540) / 600 });
            }
            s.sino(M.conta, t1, 0.8, { vol: 0.07, pan: (q.x - 540) / 600 });
            if (q.feito) M.feito.forEach((n, j) => s.sino(n, q.feito.em + j * 0.05, 1.2, { vol: 0.06, brilho: 1.5 }));
          }
          for (const q of peca(P, 'bloco')) {
            s.vento(q.derrete[0], q.derrete[1] - q.derrete[0] + 0.3, { vol: 0.07, corte: 5200, onda: 9, profundidade: 0.5, entra: 0.15, sai: 0.3 }); // chiado do chumbo
            s.nota('D2', q.derrete[0], q.derrete[1] - q.derrete[0], { forma: 'serra', vol: 0.025, ataque: 0.3, solta: 0.3 });
          }
          for (const q of peca(P, 'jipe')) for (const m of q.movimentos || []) {
            if (m.tipo === 'anda' || m.tipo === 'recua') s.nota('A1', m.de, m.ate - m.de, { forma: 'quad', vol: 0.02, ataque: 0.05, solta: 0.1, vibrato: 0.04, vibratoHz: 18 });
            if (m.tipo === 'olha') s.pio(m.de, { freq: 1100, sobe: 0.4, dur: 0.06, repete: 2, intervalo: 0.09, vol: 0.035 });
            if (m.tipo === 'recua') s.pio(m.de, { freq: 1500, sobe: -0.5, dur: 0.12, repete: 1, vol: 0.04 });
          }
          for (const q of peca(P, 'seta')) s.pio(q.aparece[0], { freq: 1400, sobe: -0.6, dur: 0.5, repete: 1, vol: 0.05 });
          for (const q of peca(P, 'solNasce')) {
            ['A3', 'E4', 'A4', 'C#5'].forEach((n, j) => s.nota(n, q.de, duracao - q.de - 0.3, { forma: 'tri', vol: 0.03, ataque: q.ate - q.de, solta: 0.4, pan: (j - 1.5) * 0.3 }));
          }
          if (P.titulo) M.final.forEach((n, j) => s.sino(n, P.titulo.de + j * 0.1, 1.4, { vol: 0.06, pan: (j - 2) * 0.25, brilho: 1.4 }));
        }
        s.sala(0.4);
        return s.fim({ entra: 0.1, sai: 0.35, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
