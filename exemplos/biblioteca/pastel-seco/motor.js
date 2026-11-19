// MOTOR "pastel-seco" — personagem em guache de giz e pastel seco, sem contorno, sobre azul chapado.
// Jeito de animar: fundo-pintado (um fundo só, parado) com uma personagem em busto que atua na frente.
// Cada forma é uma mancha chapada e fosca de borda quebrada e pontilhada (seco.js); o volume é dado por
// poucas pinceladas secas, em que as cerdas falham. Lã e pontas de cabelo soltam fiapos.
// Como animação de papel: a pose muda de 2 em 2 quadros, e a textura (borda, cerdas, pó de pigmento)
// é sorteada de novo a cada 3 quadros, então "ferve". Tudo sai de t: as molas (laço do cabelo, óculos,
// fiapos) são contas fechadas a partir das horas das ações; nada é guardado de um quadro para outro.
// Uma câmera só, chegando bem devagar. O que muda de filme para filme está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, vaiVolta, sorteio } = Filme;
  const { elipse, caixa, curva, forma, pincel, fibras, pontilha, novaTela } = Seco;
  const L = 1920, A = 1080, TAU = Math.PI * 2, RAD = Math.PI / 180;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 6,
    montar({ historia: H, tela, largura, fps }) {
      const k = largura / L;                        // os testes usam 640x360
      const SEM = H.semente || 1;
      const C = H.cores;
      const cor = (n) => (!n ? C.creme : n[0] === '#' ? n : (C[n] || C.creme));
      const pecas = H.pecas || [];
      const uma = (t) => pecas.find((p) => p.tipo === t) || null;
      const AC = H.acoes || {};
      const c = tela.getContext('2d');

      // ---------- tempo: pose de 2 em 2 quadros, textura sorteada de novo a cada "ferve" quadros ----------
      const FERVE = H.ferve || 3;
      const quadro = (t) => Math.round(t * fps);
      const poseT = (t) => (H.posesEmDois === false ? t : Math.floor(quadro(t) / 2) * 2 / fps);
      const fervura = (t) => Math.floor(quadro(t) / FERVE);
      // mola: depois de t0, balança e para (amortece). Conta fechada, sem memória.
      const mola = (t, t0, amp, freq = 12, amort = 6) => (t < t0 ? 0 : amp * Math.exp(-amort * (t - t0)) * Math.sin(freq * (t - t0)));

      // ---------- câmera (pontos-chave da história) ----------
      function camera(t) {
        const K = H.camera; let i = 0;
        while (i < K.length - 2 && t > K[i + 1].t) i++;
        const a = K[i], b = K[i + 1], f = suave(trecho(t, a.t, b.t));
        return { x: mistura(a.x, b.x, f), y: mistura(a.y, b.y, f), zoom: mistura(a.zoom || 1, b.zoom || 1, f) };
      }
      function poeCamera(cam) {
        const z = cam.zoom * k;
        c.setTransform(z, 0, 0, z, k * L / 2 - cam.x * z, k * A / 2 - cam.y * z);
      }

      // ---------- papel e pigmento (em pixels da tela: a pinta nunca fica menor que 1 pixel) ----------
      const FUNDO = Seco.mancha(tela.width, tela.height, cor('fundo'), SEM + 5);
      const TAM_GRAO = 512;
      const GRAOS = [0, 1, 2].map((i) => Seco.grao(TAM_GRAO, SEM * 31 + i * 7 + 3, 1));

      // ---------- as ações viram pose (contas de t) ----------
      const gole = AC.gole, solta = AC.solta, aceno = AC.aceno, inclina = AC.inclina;
      const respira = AC.respira || { periodo: 2.6, px: 2 };
      const piscas = AC.pisca || [];

      function poseCabeca(t) {
        let ang = 0, dx = 0, dy = 0;
        if (gole) {
          const fimGole = solta ? solta.de : gole.ate;
          const junto = trecho(t, gole.de - 0.3, gole.de) * (1 - suave(trecho(t, fimGole, fimGole + 0.35)));
          ang += 1.5 * junto; dx += 4 * junto;                        // inclina para o canudo
          for (const tg of gole.goles || []) dy += 7 * vaiVolta(trecho(t, tg - 0.12, tg + 0.16)); // engole
        }
        if (solta) dy -= 6 * vaiVolta(trecho(t, solta.de, solta.ate));   // "ahh": a cabeça sobe um pouco
        if (aceno) {
          const ant = vaiVolta(trecho(t, aceno.de, aceno.desliza - 0.12)); // antecipação: sobe antes de descer
          dy -= 8 * ant; ang -= 1.5 * ant;
          const kk = t < aceno.desliza ? saiDevagar(trecho(t, aceno.desliza - 0.12, aceno.desliza)) : 1 - suave(trecho(t, aceno.desliza, aceno.ate));
          dy += 22 * kk; ang += 2.5 * kk;
          dy += mola(t, aceno.ate, 3, 14, 7);
        }
        if (inclina) {
          const kk = suave(trecho(t, inclina.de, inclina.ate));
          ang += (inclina.graus || 7) * kk + mola(t, inclina.ate, 1.2, 12, 6); dy -= 5 * kk;
        }
        dy += respira.px * Math.sin(TAU * t / respira.periodo);
        return { ang: ang * RAD, dx, dy };
      }
      // ponto da cabeça (em coordenadas do desenho) levado para o mundo
      const CAB = uma('cabeca');
      const PIVO = CAB ? CAB.pivo : [940, 710];
      function naCabeca([x, y], p) {
        const cs = Math.cos(p.ang), sn = Math.sin(p.ang), u = x - PIVO[0], v = y - PIVO[1];
        return [PIVO[0] + p.dx + u * cs - v * sn, PIVO[1] + p.dy + u * sn + v * cs];
      }
      // óculos escorregando no aceno, com um quiquinho quando assentam
      function escorrega(t) {
        if (!aceno) return 0;
        const e = aceno.escorrega ?? 50;
        return e * saiDevagar(trecho(t, aceno.desliza - 0.06, aceno.desliza + 0.1)) + mola(t, aceno.desliza + 0.1, e * 0.1, 26, 9);
      }
      // balanço que segue as ações (laço do cabelo, fiapos): cada ação dá um empurrão que amortece
      function balanco(t) {
        let b = 2 * Math.sin(TAU * t / 1.9);
        if (gole) for (const tg of gole.goles || []) b += mola(t, tg, 5, 13, 5);
        if (solta) b += mola(t, solta.de, 4, 11, 4);
        if (aceno) b += mola(t, aceno.desliza - 0.1, 12, 14, 4);
        if (inclina) b -= mola(t, inclina.de + 0.2, 9, 11, 3.5);
        return b * RAD;
      }
      // canudo: quanto da bebida está subindo pelo canudo (0 a 1)
      function nivel(t) {
        if (!gole) return 0;
        let f = 0.12 + 0.88 * saiDevagar(trecho(t, gole.de, gole.de + (gole.sobe || 0.5)));
        for (const tg of gole.goles || []) f -= 0.3 * vaiVolta(trecho(t, tg - 0.1, tg + 0.18));
        const fim = solta ? solta.de : gole.ate;
        return limita(f * (1 - trecho(t, fim, fim + 0.25)));
      }
      const LATA = uma('lata');
      function poseLata(t, cab) {
        const ang = LATA.anguloCanudo * RAD, boca = naCabeca(LATA.boca, cab);
        const topo = [boca[0] - Math.cos(ang) * LATA.canudo, boca[1] - Math.sin(ang) * LATA.canudo];
        const kk = solta ? suave(trecho(t, solta.de, solta.ate)) : 0, r = LATA.repouso;
        const y = mistura(topo[1] + LATA.h / 2 - 10, r.y, kk) + (solta ? mola(t, solta.ate, 4, 14, 7) : 0);
        return { x: mistura(topo[0], r.x, kk), y, giro: mistura(0, r.giro || 0, kk) * RAD };
      }

      // ---------- peças ----------
      // cada peça tem o seu sorteio: geometria com semente fixa, textura com a semente da fervura
      const sTex = (idx, id) => sorteio(SEM * 1009 + idx * 7919 + id * 131);
      const sFix = (id) => sorteio(SEM * 523 + id * 97);
      let PX = 1;                                     // 1 pixel da tela, em unidades do desenho

      function domo(p) {                              // topo do cabelo: superelipse
        const pts = [], e = 2 / (p.curva || 2.5);
        for (let i = 0; i <= 40; i++) {
          const a = Math.PI + Math.PI * i / 40, cs = Math.cos(a), sn = Math.sin(a);
          pts.push([p.cx + p.rx * Math.sign(cs) * Math.pow(Math.abs(cs), e), p.cy - p.ry * Math.pow(Math.abs(sn), e)]);
        }
        return pts;
      }
      const yDomo = (p, x) => {                       // altura do topo do cabelo num x
        const u = limita(Math.abs(x - p.cx) / p.rx, 0, 0.9999), e = (p.curva || 2.5);
        return p.cy - p.ry * Math.pow(1 - Math.pow(u, e), 1 / e);
      };

      function cabelo(p, idx, tq) {
        const ac = sFix(11), dir = p.cx + p.rx * 0.985, esq = p.cx - p.rx * 0.985;
        const pts = domo(p);
        pts.push([dir, p.barraDir]);
        for (let i = 1; i < 14; i++) {                // barra reta, com pontas desiguais
          const x = mistura(dir, esq, i / 14), y = mistura(p.barraDir, p.barraEsq, i / 14) + (i % 2 ? 9 : -4) + (ac() - 0.5) * 8;
          pts.push([x, y]);
        }
        pts.push([esq, p.barraEsq]);
        const at = sTex(idx, 11);
        const borda = forma(c, pts, cor('laranja'), at, { px: PX, quebra: 4, alcance: 8 });
        // barra marrom e pontas finas na beira de baixo
        pincel(c, curva([[dir - 8, p.barraDir - 8], [p.cx + 80, mistura(p.barraDir, p.barraEsq, 0.35) - 6], [esq + 10, p.barraEsq - 6]], 6), cor('barra'), 20, at, { px: PX, cerdas: 6, alfa: 0.75, falha: 0.6 });
        fibras(c, borda, cor('laranjaEscuro'), at, { px: PX, de: 0.5, ate: 1, cada: 14, comp: 16, larg: 2.2, abre: 0.35 });
        // mechas: pinceladas secas escuras e claras que abrem do alto da cabeça
        mechas(p, idx, 12, p.cx - p.rx * 0.95, p.cx + p.rx * 0.95, (x) => mistura(p.barraEsq, p.barraDir, (x - esq) / (dir - esq)) - 10);
      }
      function mechas(p, idx, id, x0, x1, fimY) {
        const ac = sFix(id), at = sTex(idx, id), topo = [p.cx - 40, p.cy - p.ry * 0.82];
        const n = 11;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.3 + ac() * 0.4) / n, x = mistura(x0, x1, u), y = fimY(x);
          const meio = [mistura(topo[0], x, 0.55) + (x - p.cx) * 0.18, mistura(topo[1], y, 0.5)];
          const escura = i % 3 !== 1;
          pincel(c, curva([[mistura(topo[0], x, 0.12), mistura(topo[1], y, 0.1)], meio, [x, y]], 8), cor(escura ? 'laranjaEscuro' : 'laranjaClaro'),
            8 + ac() * 14, at, { px: PX, cerdas: 4, alfa: escura ? 0.45 : 0.55, falha: 0.65 });
        }
      }
      function franja(p, f, idx) {
        const ac = sFix(13), top = domo(p).filter(([x]) => x >= f.de && x <= f.ate);
        const pts = top.slice(), mid = (f.de + f.ate) / 2, meia = (f.ate - f.de) / 2;
        for (let i = 0; i <= 22; i++) {               // franja reta, que acompanha a curva da cabeça
          const x = mistura(f.ate, f.de, i / 22), u = (x - mid) / meia;
          pts.push([x, f.y + 16 * u * u - 6 + (i % 2 ? 7 : -3) + (ac() - 0.5) * 6]);
        }
        const at = sTex(idx, 13);
        forma(c, pts, cor('laranja'), at, { px: PX, quebra: 3, alcance: 7 });
        mechas(p, idx, 14, f.de + 30, f.ate - 20, (x) => { const u = (x - mid) / meia; return f.y + 16 * u * u - 14; });
      }
      function rosto(p, f, idx) {
        const at = sTex(idx, 21);
        forma(c, elipse(p.cx, p.cy, p.rx, p.ry, 80), cor('pele'), at, { px: PX, quebra: 2.5, alcance: 6 });
        // sombra embaixo da franja e no queixo, em pincel seco (presa dentro do rosto)
        c.save(); Seco.caminho(c, elipse(p.cx, p.cy, p.rx, p.ry, 60), true); c.clip();
        pincel(c, curva([[p.cx - p.rx * 0.85, f.y + 14], [p.cx, f.y + 24], [p.cx + p.rx * 0.9, f.y + 16]], 8), cor('peleSombra'), 22, at, { px: PX, cerdas: 5, alfa: 0.45, falha: 0.6 });
        pincel(c, curva([[p.cx - p.rx * 0.5, p.cy + p.ry * 0.86], [p.cx + p.rx * 0.2, p.cy + p.ry * 0.95], [p.cx + p.rx * 0.6, p.cy + p.ry * 0.78]], 8), cor('peleSombra'), 14, at, { px: PX, cerdas: 4, alfa: 0.4, falha: 0.6 });
        c.restore();
      }
      function bochechas(p, idx) {
        const at = sTex(idx, 31), ac = sFix(31);
        for (const [x, y, r] of p.pontos) {
          pontilha(c, x, y, r, cor('bochecha'), Math.round(r * 3.6), at, { px: PX, tam: 2.6, alfa: 0.55, esticaX: 1.15 });
          for (let i = 0; i < (p.sardas || 0); i++) {
            const sx = x - r * 0.6 + ac() * r * 1.2, sy = y - r * 0.5 + ac() * r * 0.6;
            pontilha(c, sx, sy, 2.2, cor('sarda'), 4, at, { px: PX, tam: 2.4, alfa: 0.9 });
          }
        }
      }
      function olhos(p, t, idx) {
        const at = sTex(idx, 41), fechado = piscas.some((tp) => t >= tp && t < tp + 0.12);
        const feliz = inclina && t >= inclina.de + 0.1;
        c.lineCap = 'round'; c.strokeStyle = cor('olho'); c.fillStyle = cor('olho');
        for (const [x, y] of p.pontos) {
          if (feliz) {
            pincel(c, curva([[x - p.r * 1.7, y + p.r * 0.7], [x, y - p.r * 0.7], [x + p.r * 1.7, y + p.r * 0.7]], 6), cor('olho'), 10, at, { px: PX, cerdas: 4, alfa: 0.95, falha: 0.05 });
          } else if (fechado) {
            pincel(c, [[x - p.r * 1.4, y], [x + p.r * 1.4, y + 1]], cor('olho'), 6, at, { px: PX, cerdas: 3, alfa: 0.95, falha: 0.1 });
          } else {
            forma(c, elipse(x, y, p.r, p.r * 1.15, 16), cor('olho'), at, { px: PX, quebra: 0.8, alcance: 2, pontos: 0.6, passo: 3 });
          }
        }
      }
      function boca(p, t, idx) {
        const at = sTex(idx, 51), chupa = gole && t < (solta ? solta.de + 0.06 : gole.ate);
        const feliz = inclina ? suave(trecho(t, inclina.de, inclina.ate)) : 0, w = p.largura * (1 + 0.45 * feliz);
        if (chupa) {
          forma(c, elipse(p.x, p.y, 10, 9, 16), cor('boca'), at, { px: PX, quebra: 1, alcance: 2, passo: 3 });
          // bochecha puxando para dentro enquanto suga
          pincel(c, curva([[p.x + 52, p.y - 34], [p.x + 40, p.y - 12], [p.x + 50, p.y + 10]], 6), cor('peleSombra'), 9, at, { px: PX, cerdas: 3, alfa: 0.6, falha: 0.4 });
          return;
        }
        if (feliz > 0.3) {                            // sorriso aberto
          const pts = [];
          for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; pts.push([p.x - w / 2 * Math.cos(a), p.y + w * 0.42 * Math.sin(a) * feliz]); }
          forma(c, pts, cor('boca'), at, { px: PX, quebra: 1, alcance: 2, passo: 3 });
        } else {
          pincel(c, [[p.x - w / 2, p.y - 3], [p.x - w / 4, p.y + 5], [p.x + w / 4, p.y + 5], [p.x + w / 2, p.y - 4]], cor('boca'), 6, at, { px: PX, cerdas: 3, alfa: 0.95, falha: 0.15 });
        }
      }
      function presilha(p, idx) {
        const at = sTex(idx, 61);
        for (const d of [-9, 9]) {
          const g = p.giro * RAD, ox = -Math.sin(g) * d, oy = Math.cos(g) * d;
          forma(c, caixa(p.x + ox, p.y + oy, 46, 9, 4, g), cor('amarelo'), at, { px: PX, quebra: 1, alcance: 3, passo: 3 });
        }
      }
      function laco(p, cab, tq, idx) {
        const at = sTex(idx, 71), b = balanco(tq) * 1.6, base = [p.x, p.y + p.r + 16];
        const pts = [];
        for (let i = 0; i <= 22; i++) {               // argola de fio que se fecha e cruza na base
          const a = Math.PI / 2 + 0.35 + (TAU - 0.7) * i / 22;
          const x = p.x + p.r * Math.cos(a) * 0.9, y = p.y + p.r * Math.sin(a);
          const u = x - base[0], v = y - base[1];
          pts.push([base[0] + u * Math.cos(b) - v * Math.sin(b), base[1] + u * Math.sin(b) + v * Math.cos(b)]);
        }
        pts.unshift([base[0] - 6, base[1] + 18]); pts.push([base[0] + 8, base[1] + 18]);
        pincel(c, pts, cor('laranja'), 13, at, { px: PX, cerdas: 3, alfa: 0.95, falha: 0.15 });
        pincel(c, pts, cor('laranjaEscuro'), 5, at, { px: PX, cerdas: 2, alfa: 0.6, falha: 0.5 });
      }
      function fiapos(p, cabeloP, tq, idx) {
        const ac = sFix(81), at = sTex(idx, 81), b = balanco(tq);
        c.lineCap = 'round';
        for (let i = 0; i < (p.n || 8); i++) {
          // raiz na borda do cabelo; o fio corre rente à borda (tangente), para baixo, abrindo um pouco
          const a = mistura(195, 345, (i + 0.2 + ac() * 0.6) / (p.n || 8)) * RAD;
          const e = 2 / (cabeloP.curva || 2.5), cs = Math.cos(a), sn = Math.sin(a);
          const rx = cabeloP.cx + cabeloP.rx * Math.sign(cs) * Math.pow(Math.abs(cs), e), ry = cabeloP.cy + cabeloP.ry * Math.sign(sn) * Math.pow(Math.abs(sn), e);
          const lado = cs < 0 ? -1 : 1;                // à esquerda desce pela esquerda, à direita pela direita
          const tx = lado * Math.abs(Math.sin(a)) * 0.8, ty = Math.abs(Math.cos(a)) * 0.6 + 0.4;
          const nx = (rx - cabeloP.cx) / cabeloP.rx, ny = (ry - cabeloP.cy) / cabeloP.ry, nn = Math.hypot(nx, ny) || 1;
          const comp = 60 + ac() * 50, abre = 0.35 + ac() * 0.2, bal = b * (0.6 + ac() * 0.8) * 60;
          const dx = tx * (1 - abre) + nx / nn * abre, dy = ty * (1 - abre) + ny / nn * abre, d = Math.hypot(dx, dy);
          const ex = rx + dx / d * comp + bal, ey = ry + dy / d * comp;
          const mx = rx + dx / d * comp * 0.5 + nx / nn * 10 + bal * 0.4, my = ry + dy / d * comp * 0.5 + ny / nn * 10;
          pincel(c, curva([[rx - nx / nn * 4, ry - ny / nn * 4], [mx, my], [ex, ey]], 6), cor('laranjaEscuro'), 4.5, at, { px: PX, cerdas: 2, alfa: 0.9, falha: 0.2 });
        }
      }
      function oculos(p, t, idx) {
        const at = sTex(idx, 91), dy = escorrega(t), R = p.r, aro = p.aro;
        const [l1, l2] = p.pontos.map(([x, y]) => [x, y + dy]);
        // haste até a orelha (some no cabelo) e ponte entre as lentes
        pincel(c, [[l1[0] - R, l1[1] - 6], [mistura(l1[0] - R, p.haste[0], 0.5), mistura(l1[1], p.haste[1] + dy * 0.4, 0.5) - 6], [p.haste[0], p.haste[1] + dy * 0.4]], cor('creme'), 9, at, { px: PX, cerdas: 3, alfa: 0.95, falha: 0.1 });
        pincel(c, curva([[l1[0] + R - 4, l1[1] - 10], [(l1[0] + l2[0]) / 2, (l1[1] + l2[1]) / 2 - 22], [l2[0] - R + 4, l2[1] - 10]], 6), cor('creme'), 10, at, { px: PX, cerdas: 3, alfa: 0.95, falha: 0.1 });
        for (const [x, y] of [l1, l2]) {
          forma(c, elipse(x, y, R + aro / 2, R + aro / 2, 48), cor('creme'), at, { px: PX, quebra: 1.6, alcance: 4, passo: 4 });
          forma(c, elipse(x, y, R - aro / 2, R - aro / 2, 48), cor('lente'), at, { px: PX, quebra: 1.2, alcance: 2.5, pontos: 0.8, passo: 4 });
          // brilho na lente
          pincel(c, curva([[x + R * 0.15, y - R * 0.5], [x + R * 0.38, y - R * 0.38], [x + R * 0.5, y - R * 0.12]], 5), cor('creme'), 5, at, { px: PX, cerdas: 2, alfa: 0.35, falha: 0.4 });
        }
      }

      function sueter(p, idx) {
        const at = sTex(idx, 101);
        const borda = forma(c, p.pontos, cor('marinho'), at, { px: PX, quebra: 4, alcance: 9, pontos: 1.8 });
        fibras(c, borda, cor('marinho'), at, { px: PX, cada: 5, comp: 16, larg: 2.4, abre: 0.6 });
        fibras(c, borda, cor('marinhoClaro'), at, { px: PX, cada: 16, comp: 11, larg: 1.6, abre: 0.5, alfa: 0.6 });
        for (const d of p.dobras || []) pincel(c, curva(d, 8), cor('marinhoClaro'), 22, at, { px: PX, cerdas: 5, alfa: 0.5, falha: 0.65 });
      }
      function pescoco(p, idx) {
        const at = sTex(idx, 111);
        forma(c, caixa(p.x, p.y, p.w, p.h, 20), cor('pele'), at, { px: PX, quebra: 2 });
        pincel(c, [[p.x - p.w * 0.4, p.y - p.h * 0.3], [p.x + p.w * 0.4, p.y - p.h * 0.2]], cor('peleSombra'), 26, at, { px: PX, cerdas: 5, alfa: 0.55, falha: 0.5 });
      }
      function gola(p, idx) {
        const at = sTex(idx, 121);
        const borda = forma(c, caixa(p.x, p.y, p.w, p.h, 38), cor('marinho'), at, { px: PX, quebra: 3.5, alcance: 8, pontos: 1.8 });
        fibras(c, borda, cor('marinho'), at, { px: PX, cada: 5, comp: 14, larg: 2.2, abre: 0.6 });
        for (let i = 0; i < 3; i++) {                 // dobras da gola rulê
          const y = p.y - p.h * 0.28 + i * p.h * 0.28;
          pincel(c, curva([[p.x - p.w * 0.42, y + 4], [p.x, y + 12], [p.x + p.w * 0.42, y + 2]], 6), cor(i === 1 ? 'marinhoEscuro' : 'marinhoClaro'), 12, at, { px: PX, cerdas: 4, alfa: 0.55, falha: 0.6 });
        }
      }
      // lata lisa (sem marca nenhuma), canudo com a bebida subindo, e a mão que segura
      function lata(p, pose, t, idx) {
        const at = sTex(idx, 131);
        c.save(); c.translate(pose.x, pose.y); c.rotate(pose.giro);
        const w = p.w, h = p.h, ang = p.anguloCanudo * RAD, base = [0, -h / 2 + 10];   // canudo preso na lata
        const ponta = [base[0] + Math.cos(ang) * p.canudo, base[1] + Math.sin(ang) * p.canudo];
        // canudo (atrás da borda de cima)
        c.lineCap = 'round';
        c.strokeStyle = cor('creme'); c.lineWidth = 13; c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(ponta[0], ponta[1]); c.stroke();
        const f = nivel(t);
        if (f > 0.01) {
          c.strokeStyle = cor('bebida'); c.lineWidth = 7; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(base[0], base[1]);
          c.lineTo(mistura(base[0], ponta[0], f * 0.97), mistura(base[1], ponta[1], f * 0.97)); c.stroke(); c.globalAlpha = 1;
        }
        pincel(c, [[base[0] + 3, base[1] - 4], [ponta[0] + 3, ponta[1] - 1]], '#ffffff', 4, at, { px: PX, cerdas: 2, alfa: 0.35, falha: 0.5 });
        // corpo da lata
        forma(c, caixa(0, 0, w, h, 16), cor('vermelho'), at, { px: PX, quebra: 2, alcance: 5 });
        pincel(c, [[w * 0.2, -h * 0.38], [w * 0.24, 0], [w * 0.2, h * 0.38]], cor('vermelhoClaro'), 20, at, { px: PX, cerdas: 5, alfa: 0.6, falha: 0.6 });
        pincel(c, [[-w * 0.36, -h * 0.38], [-w * 0.38, 0], [-w * 0.36, h * 0.38]], cor('vermelhoEscuro'), 16, at, { px: PX, cerdas: 4, alfa: 0.55, falha: 0.6 });
        pincel(c, curva([[-w * 0.44, -h / 2 + 12], [0, -h / 2 + 20], [w * 0.44, -h / 2 + 12]], 6), cor('creme'), 6, at, { px: PX, cerdas: 3, alfa: 0.7, falha: 0.3 });
        // mão: palma na beira esquerda, três dedos por cima da lata, polegar
        const M = uma('manga'), mao = M ? M.mao : [-58, 38];
        forma(c, elipse(mao[0] + 6, mao[1], 34, 42, 30), cor('pele'), at, { px: PX, quebra: 2, alcance: 4 });
        for (let i = 0; i < 3; i++) forma(c, elipse(mao[0] + 44, mao[1] - 18 + i * 20, 30, 10, 24, -0.06), cor('pele'), at, { px: PX, quebra: 1.4, alcance: 3, passo: 4 });
        forma(c, elipse(mao[0] + 36, mao[1] - 40, 24, 9.5, 20, -0.12), cor('pele'), at, { px: PX, quebra: 1.4, alcance: 3, passo: 4 }); // polegar deitado, abraçando a lata
        pincel(c, [[mao[0] + 18, mao[1] - 10], [mao[0] + 58, mao[1] - 9]], cor('peleSombra'), 5, at, { px: PX, cerdas: 2, alfa: 0.6, falha: 0.4 });
        pincel(c, [[mao[0] + 18, mao[1] + 11], [mao[0] + 58, mao[1] + 12]], cor('peleSombra'), 5, at, { px: PX, cerdas: 2, alfa: 0.6, falha: 0.4 });
        c.restore();
      }
      function maoNoMundo(pose) {
        const M = uma('manga'), m = M ? M.mao : [-58, 38], cs = Math.cos(pose.giro), sn = Math.sin(pose.giro);
        const x = m[0] - 26, y = m[1] + 22;
        return [pose.x + x * cs - y * sn, pose.y + x * sn + y * cs];
      }
      function manga(p, pose, idx) {
        const at = sTex(idx, 141), [hx, hy] = maoNoMundo(pose), [sx, sy] = p.ombro;
        const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
        const w0 = 62, w1 = 40;
        const pts = curva([[sx + nx * w0, sy + ny * w0], [mistura(sx, hx, 0.5) + nx * 66, mistura(sy, hy, 0.5) + ny * 66 - 14], [hx + nx * w1, hy + ny * w1]], 6)
          .concat(curva([[hx - nx * w1, hy - ny * w1], [mistura(sx, hx, 0.5) - nx * 58, mistura(sy, hy, 0.5) - ny * 58 + 10], [sx - nx * w0, sy - ny * w0 + 60]], 6));
        const borda = forma(c, pts, cor('marinho'), at, { px: PX, quebra: 4, alcance: 9, pontos: 1.8 });
        fibras(c, borda, cor('marinho'), at, { px: PX, cada: 5, comp: 15, larg: 2.4, abre: 0.6 });
        pincel(c, [[mistura(sx, hx, 0.25), mistura(sy, hy, 0.25)], [mistura(sx, hx, 0.75), mistura(sy, hy, 0.75)]], cor('marinhoClaro'), 20, at, { px: PX, cerdas: 4, alfa: 0.45, falha: 0.65 });
        // vinco escuro entre o braço e o corpo, e o punho felpudo da manga
        pincel(c, curva([[sx - nx * w0 * 0.9, sy - ny * w0 * 0.9 + 40], [mistura(sx, hx, 0.5) - nx * 52, mistura(sy, hy, 0.5) - ny * 52 + 12], [hx - nx * w1, hy - ny * w1]], 6), cor('marinhoEscuro'), 12, at, { px: PX, cerdas: 4, alfa: 0.7, falha: 0.4 });
        const punho = forma(c, elipse(hx, hy, 30, 48, 30, Math.atan2(dy, dx)), cor('marinho'), at, { px: PX, quebra: 3, alcance: 7, pontos: 1.8 });
        fibras(c, punho, cor('marinho'), at, { px: PX, cada: 4, comp: 12, larg: 2.2, abre: 0.7 });
      }
      function faixa(p, idx) {
        const at = sTex(idx, 151), pts = [];
        for (let i = 0; i <= 40; i++) pts.push([mistura(-200, 2120, i / 40), p.y]);
        pts.push([2120, 1400], [-200, 1400]);
        forma(c, pts, cor('faixa'), at, { px: PX, quebra: 3, alcance: 6, passo: 5 });
      }
      function titulo(p, t, idx) {
        const al = suave(trecho(t, p.de, p.de + 0.35)) * (1 - suave(trecho(t, p.ate - 0.4, p.ate)));
        if (al <= 0.01) return;
        const at = sTex(idx, 161), tam = p.tam;
        let x = p.x;
        for (const ch of p.texto.toUpperCase()) {
          const gl = Letras.letra(ch); if (!gl) { x += 0.42 * tam; continue; }
          for (const tr of gl.tracos) pincel(c, tr.map(([a, b]) => [x + a * tam, p.y - tam + b * tam]), cor('creme'), tam * 0.15, at, { px: PX, cerdas: 4, alfa: 0.95 * al, falha: 0.35 });
          x += (gl.w + 0.2) * tam;
        }
      }

      // ================= O QUADRO =================
      function desenhar(t) {
        c.reset();
        const tq = poseT(t), idx = fervura(t), cam = camera(t);
        PX = 1 / (cam.zoom * k);
        c.drawImage(FUNDO, 0, 0);
        poeCamera(cam);
        const cab = poseCabeca(tq), pl = LATA ? poseLata(tq, cab) : null;
        for (const p of pecas) {
          if (p.tipo === 'sueter') sueter(p, idx);
          else if (p.tipo === 'pescoco') pescoco(p, idx);
          else if (p.tipo === 'gola') gola(p, idx);
          else if (p.tipo === 'manga' && pl) manga(p, pl, idx);
          else if (p.tipo === 'lata' && pl) lata(p, pl, tq, idx);
          else if (p.tipo === 'faixa') faixa(p, idx);
          else if (p.tipo === 'titulo') titulo(p, t, idx);
          else if (p.tipo === 'cabeca') {
            c.save();
            c.translate(PIVO[0] + cab.dx, PIVO[1] + cab.dy); c.rotate(cab.ang); c.translate(-PIVO[0], -PIVO[1]);
            const cp = p.pecas.find((q) => q.tipo === 'cabelo'), fr = p.pecas.find((q) => q.tipo === 'franja') || { y: 440 };
            for (const q of p.pecas) {
              if (q.tipo === 'cabelo') cabelo(q, idx, tq);
              else if (q.tipo === 'rosto') rosto(q, fr, idx);
              else if (q.tipo === 'bochechas') bochechas(q, idx);
              else if (q.tipo === 'olhos') olhos(q, tq, idx);
              else if (q.tipo === 'boca') boca(q, tq, idx);
              else if (q.tipo === 'franja') franja(cp, q, idx);
              else if (q.tipo === 'presilha') presilha(q, idx);
              else if (q.tipo === 'laco') laco(q, cab, tq, idx);
              else if (q.tipo === 'fiapos') fiapos(q, cp, tq, idx);
              else if (q.tipo === 'oculos') oculos(q, tq, idx);
            }
            c.restore();
          }
        }
        // pó de pigmento por cima de tudo (em pixels da tela), sorteado de novo a cada fervura
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        const pad = c.createPattern(GRAOS[idx % GRAOS.length], 'repeat');
        const d = (idx * 173) % TAM_GRAO;
        pad.setTransform(new DOMMatrix([1, 0, 0, 1, d, (d * 0.61) | 0]));
        c.fillStyle = pad; c.fillRect(0, 0, tela.width, tela.height);
      }

      // ================= SOM (feito em código, nos mesmos tempos da imagem) =================
      function som() {
        const S = H.som || {}, dur = H.duracao || 6, m = Som.criar(dur, SEM);
        const b = S.batida || 0.75;
        // piano elétrico preguiçoso: um acorde a cada 2 batidas, baixo macio
        (S.acordes || []).forEach((ac, i) => {
          const tc = i * 2 * b; if (tc > dur - 0.4) return;
          for (const [j, n] of ac.entries()) m.sino(n, tc + j * 0.018, 2.2, { vol: 0.05, brilho: 0.9, pan: -0.2 + j * 0.13 });
          const bx = (S.baixo || [])[i]; if (bx) m.nota(bx, tc, 2 * b * 0.9, { vol: 0.16, forma: 'tri', ataque: 0.02, solta: 0.3 });
        });
        (S.melodia || []).forEach((n, i) => { if (n && i * b / 2 < dur - 0.4) m.sino(n, i * b / 2, 1.1, { vol: 0.04, brilho: 1.4, pan: 0.25 }); });
        // gás da lata: chiado fino e estalinhos
        const gas = S.gas ?? (solta ? solta.ate : 2);
        m.vento(0, Math.min(dur, gas), { vol: 0.02, corte: 7000, onda: 2.3, profundidade: 0.4, entra: 0.1, sai: 0.8 });
        const ac = sorteio(SEM + 77);
        for (let i = 0; i < 26; i++) m.toque(ac() * gas * 0.95, { vol: 0.012 + ac() * 0.012, dur: 0.012, corte: 9000, pan: 0.4 });
        if (gole) {
          // canudo: o gole é um chiado que sobe; cada engolida, uma batida grave e macia
          m.vento(gole.de, (solta ? solta.de : gole.ate) - gole.de, { vol: 0.05, corte: 1500, onda: 3.1, profundidade: 0.8, entra: 0.2, sai: 0.2 });
          for (const tg of gole.goles || []) m.batida(tg, { vol: 0.2, freq: 85, dur: 0.16 });
        }
        if (solta) m.vento(solta.de, 0.55, { vol: 0.05, corte: 900, onda: 1, profundidade: 0.3, entra: 0.05, sai: 0.4 }); // respiro "ahh", sem voz
        if (aceno) { m.toque(aceno.desliza + 0.1, { vol: 0.09, dur: 0.025, corte: 6500, pan: 0.1 }); m.pio(aceno.desliza + 0.1, { freq: 2600, vol: 0.02, repete: 1, dur: 0.02 }); }
        for (const tp of piscas) m.pio(tp, { freq: 3400, vol: 0.012, repete: 1, dur: 0.02 });
        if (inclina && S.sino) m.sino(S.sino, inclina.de + 0.3, 2.2, { vol: 0.11, brilho: 2.6, pan: 0.2 });
        m.sala(0.3);
        return m.fim({ entra: 0.2, sai: 0.6, pico: 0.6 });   // batida seca (clique, gole): pico baixo, o AAC sobe ~0,8 dB
      }

      return { desenhar, som };
    },
  });
})();
