// cabeca.js — a personagem do sombra-chapada: uma cabeça 3D ESCONDIDA, pintada chapada.
// Ninguém vê o 3D: ele só serve para decidir, em cada pedaço, se a luz bate (cor clara) ou não
// (cor da sombra). Assim, quando a luz anda, as sombras se recortam de um jeito coerente, como
// num desenho de anime de moda feito à mão: formas duras, sem contorno e sem degradê.
//
// - Rosto e pescoço: uma malha de poucas faces (facetas angulosas). Face virada para a luz = coral.
// - Cabelo: uma casca fina sobre o crânio, com grade fina. A divisa entre a luz (amarelo) e a
//   sombra (violeta) leva um ruído preso na própria casca: vira labaredas e gotas que andam
//   junto com a cabeça. Uma faixa laranja fina mora logo antes da divisa.
// - Óculos, sobrancelhas, boca: faixas desenhadas SOBRE a superfície da cabeça (em ângulos), e
//   cada pedacinho que vira de costas some sozinho.
// - Brinco de argola: um pêndulo preso no lóbulo. Gola do casaco: formas chapadas na frente.
//
// Nada aqui sabe a história: formas, cores e medidas chegam pelo historia.json.
(function () {
  'use strict';
  const { mistura, limita, sorteio } = Filme;
  const GRAU = Math.PI / 180;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const esc = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // lista [[x, y], ...] em ordem de x: valor em x, reta entre os pontos
  function interp(lista, x) {
    if (x <= lista[0][0]) return lista[0][1];
    for (let i = 1; i < lista.length; i++) if (x <= lista[i][0]) return mistura(lista[i - 1][1], lista[i][1], (x - lista[i - 1][0]) / (lista[i][0] - lista[i - 1][0]));
    return lista[lista.length - 1][1];
  }

  // ruído 2D com semente (tabela + mistura macia), repete a cada "per" em x: preso na casca do cabelo
  function ruido2(sem, per) {
    const N = 64, r = sorteio(sem), tab = Array.from({ length: N * N }, () => r() * 2 - 1);
    const v = (i, j) => tab[(((i % per) + per) % per) % N + (((j % N) + N) % N) * N];
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = mistura(v(i, j), v(i + 1, j), sx), b = mistura(v(i, j + 1), v(i + 1, j + 1), sx);
      return mistura(a, b, sy);
    };
  }

  function criar(P, sem) {
    const [Rx, Ry, Rz] = P.cabeca, mand = P.mandibula ?? 0.38, queixo = P.queixo ?? 55;
    const E = P.escala, F = 4200; // F: perspectiva bem fraca (quase desenho plano)

    // ---------- a forma escondida: um ovo com mandíbula e queixo para a frente ----------
    // f = ângulo em volta (0 = frente), th = ângulo de cima (-90°) a baixo (+90°)
    function surf(f, th) {
      const s = Math.sin(th), co = Math.cos(th), sp = Math.max(0, s);
      const jaw = 1 - mand * Math.pow(sp, 1.5), cf = Math.cos(f), zf = Math.max(0, cf);
      return [Rx * co * Math.sin(f) * jaw, Ry * s, Rz * co * cf * jaw + queixo * sp * sp * zf * zf];
    }
    function normal(f, th) {
      const e = 0.004; th = limita(th, -Math.PI / 2 + 2 * e, Math.PI / 2 - 2 * e);
      let n = norm(cruz(sub(surf(f + e, th), surf(f - e, th)), sub(surf(f, th + e), surf(f, th - e))));
      if (esc(n, surf(f, th)) < 0) n = [-n[0], -n[1], -n[2]];
      return n;
    }
    const ergue = (f, th, l) => { const p = surf(f, th), n = normal(f, th); return [p[0] + n[0] * l, p[1] + n[1] * l, p[2] + n[2] * l]; };

    // ---------- malha do rosto: poucas faces, simétrica ----------
    const NL = P.malha?.colunas ?? 16, LAT = (P.malha?.linhas ?? [-90, -66, -40, -16, 6, 26, 46, 66, 90]).map((g) => g * GRAU);
    const tris = [];
    const ponto = (i, j) => surf(-Math.PI + j * 2 * Math.PI / NL, limita(LAT[i], -Math.PI / 2 + 1e-4, Math.PI / 2 - 1e-4));
    const tri = (a, b, c, centro) => {
      let n = norm(cruz(sub(b, a), sub(c, a)));
      const m = [(a[0] + b[0] + c[0]) / 3 - centro[0], (a[1] + b[1] + c[1]) / 3 - centro[1], (a[2] + b[2] + c[2]) / 3 - centro[2]];
      if (esc(n, m) < 0) n = [-n[0], -n[1], -n[2]];
      if (Number.isFinite(n[0]) && Math.hypot(...cruz(sub(b, a), sub(c, a))) > 1e-3) tris.push({ p: [a, b, c], n });
    };
    for (let i = 0; i < LAT.length - 1; i++) for (let j = 0; j < NL; j++) {
      const a = ponto(i, j), b = ponto(i, j + 1), c = ponto(i + 1, j + 1), d = ponto(i + 1, j);
      if (j < NL / 2) { tri(a, b, c, [0, 0, 0]); tri(a, c, d, [0, 0, 0]); } else { tri(a, b, d, [0, 0, 0]); tri(b, c, d, [0, 0, 0]); } // diagonal espelhada: facetas simétricas
    }
    // nariz: uma cunha de 4 faces
    const N_ = P.nariz, nz = (q) => ergue(q[0] * GRAU, q[1] * GRAU, q[2]);
    const [ponte, ponta, asaE, asaD, base] = [N_.ponte, N_.ponta, [-N_.asa[0], N_.asa[1], N_.asa[2]], N_.asa, N_.base].map(nz);
    const cNariz = [(ponte[0] + ponta[0] + base[0]) / 3, (ponte[1] + ponta[1] + base[1]) / 3, Math.min(ponte[2], base[2]) - 20];
    const nTris0 = tris.length;
    tri(ponte, asaE, ponta, cNariz); tri(ponte, ponta, asaD, cNariz); tri(ponta, asaE, base, cNariz); tri(ponta, base, asaD, cNariz);
    const trisNariz = tris.splice(nTris0);

    // ---------- casca do cabelo: grade fina, ruído preso na casca ----------
    const C = P.cabelo, NH = C.colunas ?? 96, MH = C.linhas ?? 16;
    const rui = ruido2(sem + 31, C.ruido[0]);
    const rp = sorteio(sem + 5), pontasCol = Array.from({ length: NH + 1 }, (_, j) => (j % 2 === 0 ? 0.45 + 0.9 * rp() : 0.2 * rp()));
    pontasCol[NH] = pontasCol[0]; // a costura de trás fecha certinho
    const grade = [];
    for (let i = 0; i <= MH; i++) {
      const linha = [];
      for (let j = 0; j <= NH; j++) {
        const f = -Math.PI + j * 2 * Math.PI / NH, af = Math.abs(f) / GRAU;
        const pontaAqui = af < C.pontasAte ? C.pontas * pontasCol[j] : 0;
        const thH = (interp(C.linha, af) + pontaAqui) * GRAU, v = i / MH;
        const th = mistura(-Math.PI / 2 + 0.01, thH, v);
        const lift = C.volume * (1 - v * v) + 3;
        const u = j / NH;
        const ru = rui(u * C.ruido[0], v * C.ruido[1]) + 0.45 * rui(u * C.ruido[0] * 2.7 + 17, v * C.ruido[1] * 2.7 + 5);
        // perto do redemoinho (o polo) as células ficam finíssimas: lá o ruído some, senão vira estrela
        linha.push({ p: ergue(f, th, lift), n: normal(f, th), r: ru * Filme.suave(limita(v / 0.3)) });
      }
      grade.push(linha);
    }

    // ---------- a pose: gira a cabeça em volta do pescoço e projeta na tela ----------
    function pose(Q) {
      const cr = Math.cos(Q.roll), sr = Math.sin(Q.roll), cp = Math.cos(Q.pitch), sp = Math.sin(Q.pitch), cy = Math.cos(Q.yaw), sy = Math.sin(Q.yaw);
      const piv = P.pivo;
      const rot = (v) => {
        const x1 = v[0] * cr - v[1] * sr, y1 = v[0] * sr + v[1] * cr, z1 = v[2];
        const y2 = y1 * cp + z1 * sp, z2 = -y1 * sp + z1 * cp;
        return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
      };
      const mundo = (v) => { const w = rot(sub(v, piv)); return [w[0] + piv[0], w[1] + piv[1], w[2] + piv[2]]; };
      const tela = (w) => { const s = E * F / (F - w[2] * E); return [Q.x + w[0] * s, Q.y + w[1] * s]; };
      return { rot, mundo, tela, prj: (v) => tela(mundo(v)) };
    }

    // ---------- pincéis ----------
    // polígono sempre na mesma volta (área positiva): pedaços vizinhos no mesmo caminho nunca se
    // anulam, e o caminho inteiro é pintado de uma vez só (sem fresta clara entre as facetas)
    const poli = (c, pts) => {
      let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
      const o = a < 0 ? pts.slice().reverse() : pts;
      c.moveTo(o[0][0], o[0][1]); for (let i = 1; i < o.length; i++) c.lineTo(o[i][0], o[i][1]); c.closePath();
    };

    // faixa sobre a cabeça: de f = de até ate (graus), entre a linha de cima e a de baixo.
    // Cada pedacinho virado de costas para a câmera fica de fora (some atrás da cabeça).
    function faixa(c, Z, b, lado, mexe) {
      const passos = Math.max(2, Math.ceil(Math.abs(b.ate - b.de) / 2));
      let ant = null;
      for (let s = 0; s <= passos; s++) {
        const fg = mistura(b.de, b.ate, s / passos);
        let t0 = interp(b.topo, fg), t1 = interp(b.base, fg);
        if (mexe) { t0 += mexe(fg); t1 += mexe(fg); }
        const f = lado * fg * GRAU, l = b.ergue ?? 8;
        const frente = Z.rot(normal(f, (t0 + t1) / 2 * GRAU))[2] > -0.02;
        const cur = { a: Z.prj(ergue(f, t0 * GRAU, l)), b: Z.prj(ergue(f, t1 * GRAU, l)), frente };
        if (ant && ant.frente && cur.frente) poli(c, [ant.a, cur.a, cur.b, ant.b]);
        ant = cur;
      }
    }

    // ---------- desenha a personagem inteira ----------
    // Q = pose do quadro, L = direção da luz (vetor que vai da pele para a luz), cor = paleta
    function desenha(c, Q, L, cor, px) {
      const Z = pose(Q), limP = P.limiarPele ?? 0.3;
      const visto = (n) => Z.rot(n)[2];
      const luz = (n) => esc(Z.rot(n), L);

      // pescoço: cilindro de facetas, só gira um pouco com a cabeça
      {
        const G = P.pescoco, NS = G.lados, yw = Q.yaw * 0.3, cyw = Math.cos(yw), syw = Math.sin(yw);
        const pts = (a, y, rx, rz) => { const x = rx * Math.sin(a), z = G.z + rz * Math.cos(a); return [Q.corpoX + (x * cyw + z * syw) * E, Q.corpoY + y * E]; };
        const sombra = new Path2D(), luzP = new Path2D();
        for (let s = 0; s < NS; s++) {
          const a0 = (s / NS) * 2 * Math.PI, a1 = ((s + 1) / NS) * 2 * Math.PI, am = (a0 + a1) / 2;
          const n = [Math.sin(am) * cyw + Math.cos(am) * syw, 0.12, -Math.sin(am) * syw + Math.cos(am) * cyw];
          if (n[2] <= 0) continue;
          const q = [pts(a0, G.topo, G.raio[0], G.raio[1]), pts(a1, G.topo, G.raio[0], G.raio[1]), pts(a1, G.fundo, G.raio[0] * 1.15, G.raio[1]), pts(a0, G.fundo, G.raio[0] * 1.15, G.raio[1])];
          poli(sombra, q);
          if (L[2] < (G.luzDeFrente ?? 0.25) && esc(norm(n), L) > (G.limiar ?? limP)) poli(luzP, q); // luz de frente: o queixo faz sombra no pescoço
        }
        c.fillStyle = cor.peleSombra; c.fill(sombra);
        c.fillStyle = cor.peleLuz; c.fill(luzP);
      }

      // rosto: tudo que está de frente na cor da sombra; as faces viradas para a luz em coral
      const sombra = new Path2D(), luzP = new Path2D();
      for (const T of tris) {
        if (visto(T.n) <= 0) continue;
        const q = T.p.map(Z.prj); poli(sombra, q);
        if (luz(T.n) > limP) poli(luzP, q);
      }
      c.fillStyle = cor.peleSombra; c.fill(sombra);
      c.fillStyle = cor.peleLuz; c.fill(luzP);

      // orelhas (só a que está virada para a câmera)
      for (const lado of [-1, 1]) {
        const O = P.orelha, f = lado * 90 * GRAU;
        const nO = norm([lado, 0, 0.25]);
        if (visto(nO) <= 0.05) continue;
        const base = surf(f, 0);
        const pts = O.contorno.map(([y, z, sai]) => [lado * (Math.abs(base[0]) - 4 + sai), y, z]);
        const q = pts.map(Z.prj);
        c.beginPath(); poli(c, q); c.fillStyle = luz(nO) > limP ? cor.peleLuz : cor.peleSombra; c.fill();
        const dentro = O.dentro.map(([y, z, sai]) => Z.prj([lado * (Math.abs(base[0]) - 4 + sai), y, z]));
        c.beginPath(); poli(c, dentro); c.fillStyle = cor.peleFunda; c.fill();
      }

      // cabelo: casca violeta, faixa laranja na divisa e o amarelo da luz por cima
      {
        const limC = P.limiarCabelo ?? 0.1, amp = C.labareda;
        const cel = [], val = [];
        for (let i = 0; i <= MH; i++) { const lp = [], lv = []; for (let j = 0; j <= NH; j++) { const g = grade[i][j]; lp.push(Z.prj(g.p)); lv.push(luz(g.n) - limC + amp * g.r); } cel.push(lp); val.push(lv); }
        const base = new Path2D(), laranja = new Path2D(), amarelo = new Path2D();
        const pedaco = (path, i, j, lim) => { // marching squares: a parte da célula acima do limite
          const qs = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]], out = [];
          for (let k = 0; k < 4; k++) {
            const [a1, b1] = qs[k], [a2, b2] = qs[(k + 1) % 4];
            const v1 = val[a1][b1] - lim, v2 = val[a2][b2] - lim, p1 = cel[a1][b1], p2 = cel[a2][b2];
            if (v1 >= 0) out.push(p1);
            if ((v1 >= 0) !== (v2 >= 0)) { const u = v1 / (v1 - v2); out.push([mistura(p1[0], p2[0], u), mistura(p1[1], p2[1], u)]); }
          }
          if (out.length >= 3) poli(path, out);
        };
        for (let i = 0; i < MH; i++) for (let j = 0; j < NH; j++) {
          const n = grade[i][j].n, n2 = grade[i + 1][j + 1].n;
          if (visto([n[0] + n2[0], n[1] + n2[1], n[2] + n2[2]]) <= 0) continue;
          poli(base, [cel[i][j], cel[i][j + 1], cel[i + 1][j + 1], cel[i + 1][j]]);
          pedaco(laranja, i, j, -C.orla); pedaco(amarelo, i, j, 0);
        }
        c.fillStyle = cor.cabeloSombra; c.fill(base);
        c.fillStyle = cor.cabeloOrla; c.fill(laranja);
        c.fillStyle = cor.cabeloLuz; c.fill(amarelo);
      }

      // nariz
      {
        const s = new Path2D(), l = new Path2D();
        for (const T of trisNariz) { if (visto(T.n) <= 0) continue; const q = T.p.map(Z.prj); poli(s, q); if (luz(T.n) > limP) poli(l, q); }
        c.fillStyle = cor.peleSombra; c.fill(s); c.fillStyle = cor.peleLuz; c.fill(l);
      }

      // boca (meio sorriso: só o canto de um lado sobe)
      {
        const B = P.boca, sobe = (fg) => -Q.sorri * B.sorriso * limita((fg - B.sorrisoDe) / (B.sorrisoAte - B.sorrisoDe));
        const p = new Path2D(); faixa(p, Z, B.labio, 1, sobe); c.fillStyle = cor.boca; c.fill(p);
        const d = new Path2D(); faixa(d, Z, B.risco, 1, sobe); c.fillStyle = cor.bocaRisco; c.fill(d);
      }

      // sobrancelhas: cunhas pretas (a da direita sobe no fim)
      for (const lado of [-1, 1]) {
        const p = new Path2D(), sobe = lado === P.sobrancelhaQueSobe ? Q.sobr * P.sobrancelha.sobe : 0;
        faixa(p, Z, P.sobrancelha, lado, (fg) => -sobe * (0.4 + 0.6 * fg / P.sobrancelha.ate));
        c.fillStyle = cor.sobrancelha; c.fill(p);
      }

      // óculos: aro vermelho, lente vinho, reflexo vermelho, haste; brilho que atravessa
      {
        const O = P.oculos, aro = new Path2D(), lente = new Path2D(), haste = new Path2D(), sombraAro = new Path2D();
        for (const lado of [-1, 1]) { faixa(aro, Z, O.aro, lado); faixa(lente, Z, O.lente, lado); faixa(haste, Z, O.haste, lado); faixa(sombraAro, Z, O.aroBaixo, lado); }
        faixa(aro, Z, O.ponte, 1); faixa(aro, Z, O.ponte, -1);
        c.fillStyle = cor.aroSombra; c.fill(haste);
        c.fillStyle = cor.aro; c.fill(aro);
        c.fillStyle = cor.aroSombra; c.fill(sombraAro);
        c.fillStyle = cor.lente; c.fill(lente);
        c.save(); c.clip(lente);
        const r = new Path2D(); for (const lado of [-1, 1]) faixa(r, Z, O.reflexo, lado);
        c.fillStyle = cor.reflexo; c.fill(r);
        if (Q.brilho > 0 && Q.brilho < 1) { // duas barras claras que atravessam as lentes
          const a = Z.prj(ergue(-O.aro.ate * GRAU, -5 * GRAU, 10)), b = Z.prj(ergue(O.aro.ate * GRAU, -5 * GRAU, 10));
          const x0 = Math.min(a[0], b[0]) - 80 * E, x1 = Math.max(a[0], b[0]) + 80 * E, xm = mistura(x0, x1, Q.brilho), ym = (a[1] + b[1]) / 2, h = 70 * E, inc = 0.45 * h;
          c.fillStyle = cor.brilho;
          for (const [dx, w] of O.brilho) { c.beginPath(); poli(c, [[xm + dx * E + inc, ym - h], [xm + (dx + w) * E + inc, ym - h], [xm + (dx + w) * E - inc, ym + h], [xm + dx * E - inc, ym + h]]); c.fill(); }
        }
        c.restore();
      }

      // brinco: pino e argola de ouro, pêndulo preso no lóbulo da orelha que está à vista
      for (const lado of [-1, 1]) {
        if (lado !== P.brinco.lado) continue;
        const nO = norm([lado, 0, 0.25]);
        if (visto(nO) <= 0.05) continue;
        const B = P.brinco, base = surf(lado * 90 * GRAU, 0), x = lado * (Math.abs(base[0]) - 2);
        const lobo = Z.prj([x, B.lobo[0], B.lobo[1]]), pino = Z.prj([x + lado * 2, B.pino[0], B.pino[1]]);
        const r = B.raio * E, ang = Q.brinco;
        const pl = Z.rot(norm([lado * B.virada[0], 0, B.virada[1]]));
        const largo = Math.max(0.28, Math.abs(pl[2]) * (1 - 0.25 * Math.abs(Math.sin(ang * 3))));
        const cx = lobo[0] - Math.sin(ang) * r, cy = lobo[1] + Math.cos(ang) * r;
        const g = Math.max(B.grossura * E, 1.2 / px);
        c.lineWidth = g; c.strokeStyle = cor.ouro;
        c.beginPath(); c.ellipse(cx, cy, r * largo, r, ang, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = cor.ouroSombra; c.lineWidth = g * 0.75;
        c.beginPath(); c.ellipse(cx, cy, r * largo, r, ang, 0.35 * Math.PI, 1.05 * Math.PI); c.stroke();
        c.fillStyle = cor.ouro; c.beginPath(); c.arc(pino[0], pino[1], Math.max(B.pinoRaio * E, 1 / px), 0, Math.PI * 2); c.fill();
      }
    }

    // gola alta do casaco: formas chapadas na frente de tudo, com um atraso no balanço
    function gola(c, G, Q, cor) {
      c.save();
      c.translate(G.giro[0] + Q.golaX, G.giro[1]); c.rotate(Q.golaGiro); c.translate(-G.giro[0], -G.giro[1]);
      for (const pc of G.pecas) { c.beginPath(); poli(c, pc.pontos); c.fillStyle = cor[pc.cor]; c.fill(); }
      c.restore();
    }

    return { desenha, gola };
  }

  window.Cabeca = { criar };
})();
