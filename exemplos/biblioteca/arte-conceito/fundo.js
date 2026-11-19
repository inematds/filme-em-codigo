// fundo.js — o cenário da arte de conceito, pintado UMA vez por camada.
// Blocos de guache mais soltos e de menos contraste que a personagem: cada forma é cor de base,
// uma sombra chapada e uma luz chapada, com pinceladas secas por cima. Rua, fachadas, carros e
// faixa saem de uma perspectiva simples: ponto de fuga (fx, fy), x = fx + X/Z, y = fy + Y/Z.
// Cada função recebe (c, peça, cores, sorteio, ajuda) e não sabe nada da história além da peça.
(function () {
  'use strict';
  const { cor, sorteio } = Filme;
  const Pn = () => window.Pincel;

  function quad(c, pts, preenche) { Pn().caminho(c, Pn().recorte(pts.concat(), Math.floor(pts[0][0] * 7 + pts[0][1] * 13) >>> 0, 40, 0.8), true); c.fillStyle = preenche; c.fill(); }
  const caixa = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const x = Math.min(...xs), y = Math.min(...ys); return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]; };

  const F = {
    ceu(c, p, pal, r) {
      const [x, y, w, h] = [p.x, p.y, p.largura, p.altura];
      c.fillStyle = pal.ceu[0]; c.fillRect(x, y, w, h);
      // faixas chapadas: mais clara perto do horizonte, poeira quente embaixo
      c.fillStyle = pal.ceu[1]; c.fillRect(x, 330, w, 200);
      c.fillStyle = pal.ceu[2]; c.fillRect(x, y, w, 260);
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      Pn().riscos(c, [x, y, w, h], 160, 3, pal.ceu[1], 0.5, 11, { comp: 220, larg: 26, abre: 6 });
      Pn().riscos(c, [x, y, w, 400], 60, -2, pal.ceu[2], 0.45, 12, { comp: 260, larg: 20, abre: 4 });
      c.restore();
    },
    fios(c, p, pal) {
      c.strokeStyle = pal.fio; c.lineWidth = Math.max(Pn().minimo, 2.2);
      for (const [[x0, y0], [x1, y1], queda] of p.linhas) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + queda * 2, x1, y1); c.stroke(); }
    },
    longe(c, p, pal, r) { // prédios do fim da rua: azul claro, quase sem contraste
      for (const [x, y, w] of p.blocos) {
        const pts = [[x, y], [x + w, y + 6 * (r() - 0.5)], [x + w, 520], [x, 520]];
        quad(c, pts, pal.longe[0]);
        c.fillStyle = pal.longe[2]; c.fillRect(x + w * 0.62, y + 4, w * 0.38, 520 - y - 4); // lado na sombra
        c.fillStyle = pal.longe[1];
        for (let yy = y + 18; yy < 490; yy += 26) for (let xx = x + 10; xx < x + w * 0.58; xx += 22) c.fillRect(xx, yy, 11, 13);
      }
    },
    rua(c, p, pal, r, A) {
      const { esquerda: e, direita: d, meioFio: m, perto: zp, longe: zl } = p, Y = 380;
      quad(c, [A.proj(e, Y, zp), A.proj(e, Y, zl), A.proj(m, Y, zl), A.proj(m, Y, zp)], pal.rua[0]);
      quad(c, [A.proj(m, Y, zp), A.proj(m, Y, zl), A.proj(d, Y, zl), A.proj(d, Y, zp)], pal.calcada[0]);
      // meio-fio: uma tira clara de luz
      quad(c, [A.proj(m, Y, zp), A.proj(m, Y, zl), A.proj(m + 25, Y, zl), A.proj(m + 25, Y, zp)], pal.calcada[1]);
      // pinceladas secas deitadas (o chão é feito de faixas horizontais)
      const [x0, y0] = A.proj(e, Y, zl), [, y1] = A.proj(e, Y, zp);
      c.save(); c.beginPath(); c.rect(-400, y0, 2800, y1 - y0); c.clip();
      Pn().riscos(c, [-300, y0, 2600, Math.min(900, y1 - y0)], 260, 0, pal.rua[1], 0.35, 21, { comp: 260, larg: 16, abre: 3 });
      c.restore();
    },
    faixa(c, p, pal, r, A) { // faixa de pedestres
      const Y = 380;
      for (let X = p.de; X < p.ate; X += p.listra) quad(c, [A.proj(X, Y, p.z), A.proj(X, Y, p.z + p.fundo), A.proj(X + p.listra * 0.5, Y, p.z + p.fundo), A.proj(X + p.listra * 0.5, Y, p.z)], pal.calcada[1]);
    },
    sombraChao(c, p, pal, r, A) { // sombra longa no chão: multiplica, então a faixa e o meio-fio continuam por baixo
      const pts = p.pontos.map(([X, Z]) => A.proj(X, 380, Z));
      c.save(); c.globalCompositeOperation = 'multiply';
      Pn().caminho(c, Pn().recorte(pts, 31, 50, 1.5)); c.fillStyle = pal.sombra[0]; c.fill();
      c.restore();
    },
    fachada(c, p, pal, r, A) {
      const L = p.lado, X = p.x, base = L > 0 ? pal.predio : pal.predioSombra;
      // a fachada é dividida em prédios de alturas e tons diferentes
      const cortes = [p.perto]; for (let z = p.perto; z < p.longe;) { z = Math.min(p.longe, z * (1.45 + r() * 0.5)); cortes.push(z); }
      for (let i = 0; i < cortes.length - 1; i++) {
        const z0 = cortes[i], z1 = cortes[i + 1], topo = p.topo * (0.75 + r() * 0.3), tom = r();
        const corB = cor(base[0], tom < 0.5 ? base[2] : base[1], Math.abs(tom - 0.5) * 0.7);
        const pts = [A.proj(X, topo, z0), A.proj(X, topo, z1), A.proj(X, p.chao, z1), A.proj(X, p.chao, z0)];
        quad(c, pts, corB);
        c.save(); Pn().caminho(c, pts); c.clip();
        // cornija: faixa de sombra no alto
        quad(c, [A.proj(X, topo, z0), A.proj(X, topo, z1), A.proj(X, topo + 40, z1), A.proj(X, topo + 40, z0)], base[1]);
        // janelas: base azul-ardósia, reflexo claro chapado num canto e o vão escuro de um lado
        for (let Y = topo + p.andar * 0.55; Y < p.chao - 300; Y += p.andar) {
          for (let z = z0 + p.coluna * 0.3; z + p.coluna * 0.45 < z1; z += p.coluna) {
            const za = z, zb = z + p.coluna * 0.45, ya = Y, yb = Y + p.andar * 0.52;
            const j = [A.proj(X, ya, za), A.proj(X, ya, zb), A.proj(X, yb, zb), A.proj(X, yb, za)];
            if (A.proj(X, ya, za)[1] > 1400) continue;
            quad(c, j, pal.janela[0]);
            c.fillStyle = pal.janela[1]; Pn().caminho(c, [j[0], j[1], [(j[1][0] + j[2][0]) / 2, (j[1][1] + j[2][1]) / 2]]); c.fill();
            c.fillStyle = pal.janela[2]; Pn().caminho(c, [j[0], A.proj(X, ya, za + p.coluna * 0.07), A.proj(X, yb, za + p.coluna * 0.07), j[3]]); c.fill();
          }
        }
        // térreo: lojas escuras e toldos vermelhos
        quad(c, [A.proj(X, p.chao - 230, z0), A.proj(X, p.chao - 230, z1), A.proj(X, p.chao, z1), A.proj(X, p.chao, z0)], cor(pal.janela[2], base[1], 0.3));
        if (p.toldos) for (let z = z0 + 0.15; z + 0.5 < z1; z += p.coluna * 1.4) {
          quad(c, [A.proj(X, p.chao - 270, z), A.proj(X, p.chao - 270, z + 0.55), A.proj(X - 70 * L, p.chao - 200, z + 0.55), A.proj(X - 70 * L, p.chao - 200, z)], pal.toldo[0]);
          quad(c, [A.proj(X - 70 * L, p.chao - 215, z), A.proj(X - 70 * L, p.chao - 215, z + 0.55), A.proj(X - 70 * L, p.chao - 200, z + 0.55), A.proj(X - 70 * L, p.chao - 200, z)], pal.toldo[1]);
        }
        // pincel seco em pé, claro e escuro
        Pn().riscos(c, caixa(pts), 70, 90, base[2], 0.4, 40 + i, { comp: 120, larg: 12, abre: 8 });
        Pn().riscos(c, caixa(pts), 40, 90, base[1], 0.3, 60 + i, { comp: 140, larg: 10, abre: 8 });
        c.restore();
        // aresta de luz entre um prédio e outro
        c.fillStyle = L > 0 ? base[2] : base[1];
        Pn().caminho(c, [A.proj(X, topo, z1), A.proj(X, p.chao, z1), A.proj(X, p.chao, z1 * 1.012), A.proj(X, topo, z1 * 1.012)]); c.fill();
      }
    },
    carro(c, p, pal, r, A) { // carro parado junto ao meio-fio, visto de trás e de lado
      const X = p.x, z0 = p.z, z1 = p.z + p.comprimento, W = 190, Y = 380, corpo = p.cor;
      const escuro = cor(corpo, pal.sombra[1], 0.45), claro = cor(corpo, '#ffffff', 0.25);
      // sombra embaixo
      c.save(); c.globalCompositeOperation = 'multiply';
      quad(c, [A.proj(X - 30, Y, z0 - 0.05), A.proj(X - 30, Y, z1 + 0.1), A.proj(X + W + 120, Y, z1 + 0.1), A.proj(X + W + 120, Y, z0 - 0.3)], pal.sombra[0]);
      c.restore();
      quad(c, [A.proj(X, Y - 150, z0), A.proj(X, Y - 150, z1), A.proj(X, Y - 25, z1), A.proj(X, Y - 25, z0)], corpo); // lado
      quad(c, [A.proj(X, Y - 255, z0 + 0.25), A.proj(X, Y - 255, z1 - 0.3), A.proj(X, Y - 150, z1 - 0.1), A.proj(X, Y - 150, z0 + 0.1)], pal.janela[0]); // vidro lateral
      quad(c, [A.proj(X, Y - 255, z0 + 0.25), A.proj(X + W, Y - 255, z0 + 0.25), A.proj(X + W, Y - 150, z0 + 0.1), A.proj(X, Y - 150, z0 + 0.1)], cor(pal.janela[0], pal.janela[2], 0.4)); // vidro de trás
      quad(c, [A.proj(X, Y - 255, z0 + 0.25), A.proj(X + W, Y - 255, z0 + 0.25), A.proj(X + W, Y - 255, z1 - 0.3), A.proj(X, Y - 255, z1 - 0.3)], claro); // teto ao sol
      quad(c, [A.proj(X, Y - 150, z0), A.proj(X + W, Y - 150, z0), A.proj(X + W, Y - 25, z0), A.proj(X, Y - 25, z0)], escuro); // traseira na sombra
      c.fillStyle = '#c8473a'; for (const dx of [12, W - 42]) { const [a, b] = A.proj(X + dx, Y - 130, z0), [a2, b2] = A.proj(X + dx + 30, Y - 105, z0); c.fillRect(a, b, a2 - a, b2 - b); }
      c.fillStyle = '#2a2c34'; for (const zz of [z0 + 0.18, z1 - 0.2]) { const [a, b] = A.proj(X, Y - 45, zz); c.beginPath(); c.ellipse(a, b, 20 / zz, 45 / zz, 0, 0, Math.PI * 2); c.fill(); }
      quad(c, [A.proj(X, Y - 150, z0 + 0.05), A.proj(X, Y - 150, z1), A.proj(X, Y - 138, z1), A.proj(X, Y - 138, z0 + 0.05)], claro); // brilho do sol na linha da porta
    },
    poste(c, p, pal, r, A) {
      const { x: X, z: Z, topo } = p, Y = 380;
      c.save(); c.globalCompositeOperation = 'multiply'; // sombra comprida deitada no chão, vindo para a frente
      quad(c, [A.proj(X - 12, Y, Z), A.proj(X + 12, Y, Z), A.proj(X + 420, Y, Z - 1.2), A.proj(X + 390, Y, Z - 1.2)], pal.sombra[0]);
      c.restore();
      quad(c, [A.proj(X - 11, topo, Z), A.proj(X + 11, topo, Z), A.proj(X + 15, Y, Z), A.proj(X - 15, Y, Z)], pal.poste[0]);
      quad(c, [A.proj(X + 2, topo, Z), A.proj(X + 11, topo, Z), A.proj(X + 15, Y, Z), A.proj(X + 3, Y, Z)], pal.poste[1]);
      quad(c, [A.proj(X + 8, topo - 6, Z), A.proj(X - p.braco, topo - 2, Z), A.proj(X - p.braco, topo + 10, Z), A.proj(X + 8, topo + 12, Z)], pal.poste[0]);
      quad(c, [A.proj(X - p.braco - 26, topo + 4, Z), A.proj(X - p.braco + 26, topo + 4, Z), A.proj(X - p.braco + 16, topo + 30, Z), A.proj(X - p.braco - 16, topo + 30, Z)], pal.poste[1]);
    },
    muro(c, p, pal, r) { // muro de terracota em placas grandes, com a base escura
      const { x, y, largura: w, altura: h } = p, pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      quad(c, pts, pal.muro[0]);
      c.save(); Pn().caminho(c, pts); c.clip();
      for (let yy = y + 20, fila = 0; yy < y + h - p.base; yy += 112, fila++) {
        for (let xx = x - (fila % 2) * 140; xx < x + w; xx += 280) { // placas: algumas mais claras, outras mais escuras
          const t = r();
          if (t < 0.3 || t > 0.8) quad(c, [[xx + 4, yy + 4], [xx + 276, yy + 4], [xx + 276, yy + 108], [xx + 4, yy + 108]], cor(pal.muro[0], t < 0.3 ? pal.muro[1] : pal.muro[2], 0.28));
        }
        c.fillStyle = cor(pal.muro[1], pal.muro[1], 0, 0.55); c.fillRect(x, yy + 108, w, 4);
      }
      Pn().riscos(c, [x, y, w, h], 230, 0, pal.muro[2], 0.32, 71, { comp: 200, larg: 14, abre: 4 });
      Pn().riscos(c, [x, y, w, h], 160, 0, pal.muro[1], 0.3, 72, { comp: 200, larg: 12, abre: 4 });
      c.restore();
      quad(c, [[x, y + h - p.base], [x + w, y + h - p.base], [x + w, y + h], [x, y + h]], pal.muroBase);
      c.fillStyle = pal.muro[2]; c.fillRect(x + w - 8, y, 8, h - p.base); // a quina pega o sol
    },
    chao(c, p, pal, r) { // chão perto: faixas deitadas de sombra e de luz
      const cores = [pal.sombra[1], cor(pal.rua[0], pal.sombra[1], 0.35), pal.calcada[0]];
      const bandas = p.bandas.concat([[p.y + p.altura, 0]]);
      for (let i = 0; i < bandas.length - 1; i++) {
        const [y0, k] = bandas[i], y1 = bandas[i + 1][0];
        quad(c, [[p.x, y0], [p.x + p.largura, y0 + (r() - 0.5) * 10], [p.x + p.largura, y1], [p.x, y1]], cores[k]);
      }
      c.save(); c.beginPath(); c.rect(p.x, p.y, p.largura, p.altura); c.clip();
      Pn().riscos(c, [p.x, p.y, p.largura, p.altura], 160, 0, pal.rua[1], 0.25, 81, { comp: 300, larg: 14, abre: 3 });
      c.restore();
    },
  };

  window.Fundo = F;
})();
