// MOTOR "xilogravura" — gravura japonesa em madeira que se mexe.
// Jeito de animar: camadas planas, desenhadas como QUATRO CHAPAS em tons de cinza (uma por tábua de
// madeira: tinta clara, tinta funda, traço preto "chave" e vermelho). Depois um "shader" (programa da
// placa de vídeo, aqui calculado pela CPU) imprime as chapas no papel: cada tábua deixa o veio da
// madeira dentro da cor chapada, a tinta sai desigual, as tábuas ficam um pouco fora do lugar, e a
// folha tem fibra e borda rasgada. Cada impressão fica 2 quadros na tela ("animação em dois").
// Nunca finge 3D: tudo é forma plana. O que muda de um filme para outro está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, rgb } = Filme;
  const L = 1920, A = 1080;            // tamanho "de desenho" da imagem impressa
  const MARGEM = { x: 92, y: 84 };     // margem de papel em volta da imagem
  const CLARA = 0, FUNDA = 1, CHAVE = 2, VERMELHA = 3;
  const TAU = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 9,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const k = largura / L; // a tela real pode ser menor (os testes usam 640x360)
      const T = H.tempos, TI = H.tintas, HZ = H.horizonte || 640;
      const pecas = H.pecas || [];
      const deTipo = (tipo) => pecas.filter((p) => p.tipo === tipo);
      const uma = (tipo) => pecas.find((p) => p.tipo === tipo);

      // ---------- as 4 chapas: uma folha cinza para cada tábua (branco = muita tinta) ----------
      const chapas = [0, 1, 2, 3].map(() => { const cv = document.createElement('canvas'); cv.width = largura; cv.height = altura; return cv; });
      const cc = chapas.map((cv) => cv.getContext('2d'));
      const cinza = (d) => { const g = Math.round(limita(d) * 255); return `rgb(${g},${g},${g})`; };
      const degrade = (y0, y1, a, b) => (c) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, cinza(a)); g.addColorStop(1, cinza(b)); return g; };
      // pinta uma forma nas chapas. dens = [clara, funda, chave, vermelha]; null = não mexe nessa chapa.
      function pinta(dens, desenho, modo) {
        for (let i = 0; i < 4; i++) {
          const d = dens[i]; if (d == null) continue;
          const c = cc[i]; c.save();
          if (modo) c.globalCompositeOperation = modo;
          c.fillStyle = c.strokeStyle = (typeof d === 'function') ? d(c) : cinza(d);
          desenho(c, i); c.restore();
        }
      }
      const cada = (fn) => { for (const c of cc) fn(c); };
      const PAPEL = [0, 0, 0, 0];        // "vazado": nenhuma tábua imprime ali, aparece o papel
      const PAPEL_SEM_CHAVE = PAPEL;     // espuma, casco e nuvem apagam até o traço preto que ficou atrás
      const CHAVE_SO = (d) => [null, null, d, null];
      // densidades de cada roupa dos remadores
      const ROUPA = { vermelha: [0, 0, null, 0.95], funda: [0.7, 0.75, null, 0], anil: [1, 1, null, 0], clara: [1, 0.1, null, 0] };

      // ---------- tempo de impressão: cada folha fica 2 quadros (ou o que a história mandar) ----------
      const SEG = H.segurar || [2], CICLO = SEG.reduce((a, b) => a + b, 0);
      function impressao(t) {
        const q = Math.round(t * fps), n = Math.floor(q / CICLO);
        let resto = q - n * CICLO, idx = n * SEG.length, ini = n * CICLO;
        for (const s of SEG) { if (resto < s) break; resto -= s; idx++; ini += s; }
        return { idx, tq: ini / fps };
      }

      // ---------- câmera: pontos-chave da história, curva suave entre eles ----------
      function camera(tq) {
        const C = H.camera; let i = 0;
        while (i < C.length - 2 && tq > C[i + 1].t) i++;
        const a = C[i], b = C[i + 1], f = suave(trecho(tq, a.t, b.t));
        return { x: mistura(a.x, b.x, f), y: mistura(a.y, b.y, f), zoom: Math.exp(mistura(Math.log(a.zoom), Math.log(b.zoom), f)) };
      }

      // ---------- ajudas de desenho ----------
      const poli = (c, pts, fechar = true) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (fechar) c.closePath(); };
      const abre = (tq) => suave(trecho(tq, T.ceuAbre[0], T.ceuAbre[1]));           // 0 = tempestade, 1 = céu limpo
      const calma = (tq) => suave(trecho(tq, T.marAcalma[0], T.marAcalma[1]));

      // ---------- coisas sorteadas uma vez só (semente fixa) ----------
      const acaso = sorteio(H.semente || 1);

      // ================= CÉU, SOL, NUVENS, MONTANHA, PÁSSAROS =================
      function ceu(tq) {
        const a = abre(tq);
        pinta([degrade(0, HZ, 0.78 * (1 - 0.85 * a), 0.5 * (1 - 0.8 * a)), degrade(0, HZ, 0.72 * (1 - a), 0.12 * (1 - a)), null, degrade(0, HZ, 0, 0.16 * a)],
          (c) => c.fillRect(0, 0, L, HZ + 30));
      }
      function sol(p, tq) {
        const y = p.y + (p.dy || 0) * saiDevagar(trecho(tq, p.sobe[0], p.sobe[1]));
        pinta([0, 0, null, 0.95], (c) => { c.beginPath(); c.arc(p.x, y, p.raio, 0, TAU); c.fill(); });
        pinta(CHAVE_SO(0.55), (c) => { c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, y, p.raio, 0, TAU); c.stroke(); });
      }
      function nuvens(p, tq) {
        const a = abre(tq);
        for (const f of p.faixas) {
          const h = f.altura * mistura(1, 0.4, a), x = f.x + p.anda * tq * (1 + 0.6 * a), y = f.y - 40 * a * (f.y / HZ);
          const forma = (c) => { c.beginPath(); c.roundRect(x - f.largura / 2, y - h / 2, f.largura, h, h / 2); c.fill(); };
          pinta(PAPEL_SEM_CHAVE, forma);
          pinta([degrade(y - h / 2, y + h / 2, 0.12 * (1 - 0.5 * a), 0.55 * (1 - 0.6 * a)), degrade(y - h / 2, y + h / 2, 0, 0.12 * (1 - a)), null, null], forma);
        }
      }
      const montanha = (() => {
        const p = uma('montanha'); if (!p) return () => {};
        const W = p.largura, x0 = p.x, y0 = p.y, picos = p.picos.slice().sort((a, b) => a[0] - b[0]);
        const topo = picos.map(([dx, h]) => [x0 + dx, y0 - h]);
        const contorno = (c) => {
          c.beginPath(); c.moveTo(x0 - W / 2, y0 + 30);
          const [p1x, p1y] = topo[0]; c.quadraticCurveTo(p1x - 90, y0 - 20, p1x, p1y);
          for (let i = 1; i < topo.length; i++) {
            const [ax, ay] = topo[i - 1], [bx, by] = topo[i];
            const vale = [mistura(ax, bx, 0.5), Math.max(ay, by) + Math.min(y0 - ay, y0 - by) * 0.28];
            c.lineTo(vale[0], vale[1]); c.lineTo(bx, by);
          }
          const [ux, uy] = topo[topo.length - 1]; c.quadraticCurveTo(ux + 140, y0 - 30, x0 + W / 2, y0 + 30);
        };
        return () => {
          pinta([0.85, degrade(y0 - 300, y0, 0.55, 0.2), null, 0], (c) => { contorno(c); c.closePath(); c.fill(); });
          // neve nos picos mais altos (papel vazado com borda em zigue-zague)
          const altos = topo.slice().sort((a, b) => a[1] - b[1]).slice(0, 2);
          for (const [px, py] of altos) {
            const neve = [[px - 34, py + 48], [px, py], [px + 38, py + 52], [px + 18, py + 40], [px + 6, py + 56], [px - 10, py + 38]];
            pinta(PAPEL_SEM_CHAVE, (c) => { poli(c, neve); c.fill(); });
            pinta(CHAVE_SO(0.9), (c) => { c.lineWidth = 2.4; c.lineJoin = 'round'; poli(c, neve); c.stroke(); });
          }
          // contorno e sulcos das encostas
          pinta(CHAVE_SO(0.92), (c) => { c.lineWidth = 3.6; c.lineJoin = 'round'; contorno(c); c.stroke(); });
          pinta(CHAVE_SO(0.6), (c) => {
            c.lineWidth = 2; c.beginPath();
            for (const [px, py] of topo) for (const dx of [-60, -25, 20, 55]) { c.moveTo(px + dx * 0.25, py + 70); c.quadraticCurveTo(px + dx * 0.8, py + 140, px + dx * 1.6, y0 - 10); }
            c.stroke();
          });
        };
      })();
      const passaros = (() => {
        const p = uma('passaros'); if (!p) return () => {};
        const bs = Array.from({ length: p.quantos || 6 }, () => ({ dx: (acaso() - 0.5) * 360, dy: (acaso() - 0.5) * 150, f: acaso() * TAU, r: 0.8 + acaso() * 0.5 }));
        return (tq) => {
          if (tq < (p.de || 0)) return;
          const dt = tq - (p.de || 0);
          pinta(CHAVE_SO(0.9), (c) => {
            c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
            for (const b of bs) {
              const x = p.x + b.dx + p.anda * dt * b.r, y = p.y + b.dy + 10 * Math.sin(dt * 1.3 + b.f), asa = Math.sin(dt * 10 + b.f), w = 15 * b.r;
              c.moveTo(x - w, y - 7 * asa); c.quadraticCurveTo(x - w * 0.4, y - 9 * asa - 4, x, y); c.quadraticCurveTo(x + w * 0.4, y - 9 * asa - 4, x + w, y - 7 * asa);
            }
            c.stroke();
          });
        };
      })();

      // ================= A ONDA (serve para a gigante e para os cachos pequenos) =================
      // Uma "fita" que sobe do mar e se enrola numa espiral. ext = borda de fora (costas da onda),
      // n = para dentro, w = grossura. Tudo em conta: os mesmos números dão sempre a mesma onda.
      // dir = 1 enrola para a esquerda, -1 para a direita.
      function fita(x, base, Hh, R, curl, dir, larga = false) {
        R = Math.min(R, Hh * 0.55);
        const Cx = -0.2 * R, Cy = -Hh + R, Sx = Cx + R, Sy = Cy;
        const ext = [], w = [];
        // tronco: curva do pé até o começo da espiral (sai na vertical)
        const B0 = larga ? [1.5 * R, 0] : [0.95 * R, 0], c1 = larga ? [1.45 * R, 0.45 * Sy] : [1.0 * R, 0.4 * Sy], c2 = [Sx, Sy * 0.7];
        const NT = 18;
        for (let i = 0; i < NT; i++) {
          const u = i / NT, v = 1 - u;
          ext.push([v * v * v * B0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * Sx, v * v * v * B0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * Sy]);
          w.push(larga ? R * mistura(2.4, 0.82, Math.sqrt(u)) : R * mistura(1.6, 0.8, u));
        }
        // espiral: de "à direita do centro" passando por cima e descendo do outro lado
        const te = -(0.45 * Math.PI + curl * 1.35 * Math.PI), NE = 44;
        for (let i = 0; i <= NE; i++) {
          const s = i / NE, th = te * s, r = R * (1 - 0.42 * (-th) / (1.8 * Math.PI));
          ext.push([Cx + r * Math.cos(th), Cy + r * Math.sin(th)]);
          w.push(0.8 * R * Math.pow(1 - s, 1.25) + 0.015 * R);
        }
        // normais (para dentro) calculadas antes de espelhar
        const nrm = ext.map((_, i) => {
          const a = ext[Math.max(0, i - 1)], b = ext[Math.min(ext.length - 1, i + 1)];
          const tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1;
          return [ty / m, -tx / m];
        });
        const sx = dir === -1 ? -1 : 1;
        return {
          ext: ext.map(([a, b]) => [x + sx * a, base + b]), n: nrm.map(([a, b]) => [sx * a, b]), w,
          nt: NT, centro: [x + sx * Cx, base + Cy], R,
        };
      }
      const borda = (F, f, i0 = 0, i1 = F.ext.length) => F.ext.slice(i0, i1).map((p, j) => { const i = i0 + j; return [p[0] + F.n[i][0] * F.w[i] * f, p[1] + F.n[i][1] * F.w[i] * f]; });
      const faixaFita = (F, f0, f1, i0, i1) => borda(F, f0, i0, i1).concat(borda(F, f1, i0, i1).reverse());
      // dedos de espuma (garras): saem da borda de dentro da crista e se curvam para dentro e para a frente
      function dedos(F, i0, passo, tam, sem) {
        const s = sorteio(sem), lista = [], N = F.ext.length;
        for (let i = i0; i < N - 2; i += passo) {
          const [nx, ny] = F.n[i], w = F.w[i];
          const px = F.ext[i][0] + nx * w * 0.85, py = F.ext[i][1] + ny * w * 0.85;
          let tx = F.ext[i + 1][0] - F.ext[i][0], ty = F.ext[i + 1][1] - F.ext[i][1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
          const len = tam * (0.7 + 0.6 * s()), lg = tam * 0.17;
          const ponta = [px + nx * len * 0.85 + tx * len * 0.55, py + ny * len * 0.85 + ty * len * 0.55];
          lista.push({ a: [px - tx * lg, py - ty * lg], b: [px + tx * lg, py + ty * lg], ponta, ctl: [px + nx * len * 0.75 - tx * len * 0.15, py + ny * len * 0.75 - ty * len * 0.15] });
        }
        return lista;
      }
      const dedoForma = (c, d) => { c.beginPath(); c.moveTo(d.a[0], d.a[1]); c.quadraticCurveTo(d.ctl[0], d.ctl[1], d.ponta[0], d.ponta[1]); c.quadraticCurveTo((d.ctl[0] + d.b[0]) / 2, (d.ctl[1] + d.b[1]) / 2, d.b[0], d.b[1]); c.closePath(); };
      // pinta uma fita inteira: corpo claro, costas fundas, sulcos de papel, crista de espuma, contorno
      function pintaFita(F, o) {
        const tudo = faixaFita(F, 0, 1), N = F.ext.length;
        const lab = Math.floor(mistura(F.nt, N, o.labio ?? 0.74)); // daqui para a ponta é espuma
        // a "barriga" dentro do cacho: água clara no buraco que a espiral abraça
        if (o.barriga) pinta([0.6, 0.06, 0, 0], (c) => { poli(c, borda(F, 1, F.nt, N)); c.fill(); });
        pinta([1, o.claro ?? 0.3, null, 0], (c) => { poli(c, tudo); c.fill(); });
        pinta([null, o.fundo ?? 0.85, null, null], (c) => { poli(c, faixaFita(F, 0, 0.58, 0, lab + 1)); c.fill(); });
        pinta([0.2, 0, null, null], (c) => {
          c.lineWidth = o.sulco ?? 4; c.lineCap = 'round'; c.lineJoin = 'round';
          for (let s = 1; s <= (o.sulcos ?? 5); s++) { poli(c, borda(F, s * 0.5 / ((o.sulcos ?? 5) + 1), 2, lab), false); c.stroke(); }
        });
        pinta(PAPEL_SEM_CHAVE, (c) => { poli(c, faixaFita(F, -0.02, 1.02, lab - 1, N)); c.fill(); });
        const ds = o.dedos ? dedos(F, Math.max(F.nt, lab - (o.antes ?? 6)), o.passo ?? 4, o.dedos, o.sem || 3) : [];
        if (ds.length) pinta(PAPEL_SEM_CHAVE, (c) => { for (const d of ds) { dedoForma(c, d); c.fill(); } });
        pinta(CHAVE_SO(0.95), (c) => {
          c.lineJoin = 'round'; c.lineCap = 'round';
          c.lineWidth = o.contorno ?? 4.5; poli(c, F.ext, false); c.stroke();
          c.lineWidth = (o.contorno ?? 4.5) * 0.75; poli(c, borda(F, 1), false); c.stroke();
          c.lineWidth = (o.contorno ?? 4.5) * 0.6; poli(c, borda(F, 0.02, lab - 1, lab + 1).concat(borda(F, 0.98, lab - 1, lab + 1).reverse()), false); c.stroke();
          for (const d of ds) { dedoForma(c, d); c.stroke(); }
        });
      }

      // ================= MAR =================
      const marP = uma('mar') || { faixas: [] };
      const fases = marP.faixas.map(() => acaso());
      const crista = (u) => Math.pow(0.5 + 0.5 * Math.cos(TAU * u), 2.4);
      function topoMar(fi, x, tq) {
        const b = marP.faixas[fi], amp = b.altura * (1 - 0.55 * calma(tq));
        return b.y - amp * crista((x - b.anda * tq) / b.comprimento + fases[fi]);
      }
      function faixaMar(fi, tq) {
        const b = marP.faixas[fi], pts = [];
        for (let x = -40; x <= L + 40; x += 10) pts.push([x, topoMar(fi, x, tq)]);
        const corpo = pts.concat([[L + 40, A + 60], [-40, A + 60]]);
        pinta([b.clara, b.funda, 0, 0], (c) => { poli(c, corpo); c.fill(); });
        // sulcos de papel: o entalhe que o gravador tirou da madeira
        const esc = 1 + fi * 0.45;
        pinta([0.25, 0, null, null], (c) => {
          c.lineWidth = 2.6 * esc; c.lineCap = 'round';
          [14, 30, 50].forEach((off, j) => {
            c.setLineDash([60 * esc + j * 30, 34 * esc + j * 12]); c.lineDashOffset = -(b.anda * tq) - j * 40 - fi * 70;
            poli(c, pts.map(([x, y]) => [x, y + off * esc]), false); c.stroke();
          });
        });
        pinta(CHAVE_SO(0.95), (c) => { c.lineWidth = 3 + fi * 0.5; c.lineJoin = 'round'; poli(c, pts, false); c.stroke(); });
        // cachos de onda nas cristas
        if (b.rizos) {
          const amp = b.altura * (1 - 0.55 * calma(tq)), dir = b.anda < 0 ? 1 : -1;
          const n0 = Math.floor((-200 - b.anda * tq) / b.comprimento + fases[fi]) - 1, n1 = Math.ceil((L + 200 - b.anda * tq) / b.comprimento + fases[fi]) + 1;
          for (let n = n0; n <= n1; n++) {
            const xp = (n - fases[fi]) * b.comprimento + b.anda * tq;
            if (xp < -150 || xp > L + 150) continue;
            const R = amp * 0.55 + 6, F = fita(xp - dir * R * 0.4, b.y - amp + R * 0.9, R * 2.1, R, 0.5, dir);
            pintaFita(F, { claro: b.funda * 0.4, fundo: b.funda, sulcos: 2, sulco: 2.2 + fi * 0.4, contorno: 3 + fi * 0.4, labio: 0.72, dedos: R * 0.55, passo: 5, antes: 4, sem: n * 7 + fi });
          }
        }
      }

      // ================= A ONDA GIGANTE =================
      const OG = uma('onda-gigante');
      function estadoOnda(tq) {
        const so = suave(trecho(tq, OG.sobe[0], OG.sobe[1])), en = suave(trecho(tq, OG.enrola[0], OG.enrola[1])), qu = trecho(tq, OG.quebra[0], OG.quebra[1]);
        const Hh = OG.altura * (0.12 + 0.88 * so) * (1 - 0.6 * suave(qu)), R = OG.raio * (0.4 + 0.6 * so);
        return { Hh, R, curl: limita(en + 0.5 * qu), x: OG.x - qu * OG.raio * 0.9, base: OG.base + qu * 60, so, qu };
      }
      function pontaOnda(tq) { const e = estadoOnda(tq), F = fita(e.x, e.base, e.Hh, e.R, e.curl, 1); return F.ext[F.ext.length - 1]; }
      const respingos = Array.from({ length: 34 }, () => ({ u: acaso(), vx: -60 - acaso() * 180, vy: -120 + acaso() * 160, r: 7 + acaso() * 12 }));
      const bolas = Array.from({ length: 24 }, () => ({ dx: (acaso() - 0.5) * 680, dy: -acaso() * 240 + 30, r: 38 + acaso() * 60, u: acaso() }));
      const garras = Array.from({ length: 9 }, (_, i) => ({ ang: mistura(-2.55, -0.45, i / 8) + (acaso() - 0.5) * 0.12, len: 230 + acaso() * 200, u: acaso() * 0.3, larg: 48 + acaso() * 26 }));
      function ondaGigante(tq) {
        if (!OG || tq < OG.sobe[0]) return;
        const e = estadoOnda(tq);
        if (e.qu < 0.75) {
          const F = fita(e.x, e.base, e.Hh, e.R, e.curl, 1, true);
          pintaFita(F, { claro: 0.3, fundo: 0.88, sulcos: 7, sulco: 5, contorno: 5.5, labio: mistura(0.9, 0.7, e.curl), barriga: e.curl > 0.55, dedos: e.R * 0.2 * limita(e.so * 1.4 - 0.2), passo: 3, antes: 8, sem: 41 });
        }
        // respingos: saem da ponta da crista e caem (conta fechada: posição = saída + velocidade + gravidade)
        const vivos = [];
        for (const r of respingos) {
          const te = mistura(OG.enrola[0] + 0.4, OG.quebra[1], r.u), dt = tq - te;
          if (dt < 0 || dt > 1.3) continue;
          const [px, py] = pontaOnda(te), x = px + r.vx * dt, y = py + r.vy * dt + 0.5 * 1100 * dt * dt;
          if (y < A) vivos.push([x, y, r.r * (1 - 0.4 * dt)]);
        }
        if (vivos.length) {
          pinta(PAPEL_SEM_CHAVE, (c) => { for (const [x, y, r] of vivos) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } });
          pinta(CHAVE_SO(0.95), (c) => { c.lineWidth = 2.6; for (const [x, y, r] of vivos) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); } });
        }
      }
      // a explosão de espuma quando a onda cai: bolas de papel e garras subindo
      function espuma(tq) {
        if (!OG || tq < OG.quebra[0] || tq > OG.espuma[1]) return;
        const I = [OG.x - OG.raio * 1.05, OG.base - 70];
        const some = 1 - suave(trecho(tq, OG.espuma[1] - 1.1, OG.espuma[1]));
        for (const g of garras) {
          const t0 = OG.quebra[0] + 0.15 + g.u, s = saiDevagar(trecho(tq, t0, t0 + 0.55)) * some; if (s <= 0.02) continue;
          const len = g.len * s, ca = Math.cos(g.ang), sa = Math.sin(g.ang), nx = -sa, ny = ca;
          const pe = [I[0] + ca * 40, I[1] + sa * 40], ponta = [pe[0] + ca * len + nx * len * 0.38, pe[1] + sa * len + ny * len * 0.38];
          const forma = (c) => { c.beginPath(); c.moveTo(pe[0] - nx * g.larg, pe[1] - ny * g.larg); c.quadraticCurveTo(pe[0] + ca * len * 0.6 - nx * g.larg * 0.6, pe[1] + sa * len * 0.6 - ny * g.larg * 0.6, ponta[0], ponta[1]); c.quadraticCurveTo(pe[0] + ca * len * 0.5 + nx * g.larg * 0.9, pe[1] + sa * len * 0.5 + ny * g.larg * 0.9, pe[0] + nx * g.larg, pe[1] + ny * g.larg); c.closePath(); };
          pinta(PAPEL_SEM_CHAVE, (c) => { forma(c); c.fill(); });
          pinta([0.55, null, null, null], (c) => { c.lineWidth = 6; c.beginPath(); c.moveTo(pe[0] + nx * g.larg * 0.5, pe[1] + ny * g.larg * 0.5); c.quadraticCurveTo(pe[0] + ca * len * 0.5 + nx * g.larg * 0.5, pe[1] + sa * len * 0.5 + ny * g.larg * 0.5, ponta[0], ponta[1]); c.stroke(); });
          pinta(CHAVE_SO(0.95), (c) => { c.lineWidth = 3.5; c.lineJoin = 'round'; forma(c); c.stroke(); });
        }
        const lista = [];
        for (const b of bolas) {
          const t0 = OG.quebra[0] + 0.1 + 0.45 * b.u, s = saiDevagar(trecho(tq, t0, t0 + 0.4)) * some;
          if (s > 0.03) lista.push([I[0] + b.dx * (0.7 + 0.3 * s), I[1] + b.dy * s + 30 * (1 - some), b.r * s]);
        }
        lista.sort((a, b) => a[1] - b[1]);
        for (const [x, y, r] of lista) {
          pinta(PAPEL_SEM_CHAVE, (c) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
          pinta([0.75, 0.12, null, null], (c) => { c.beginPath(); c.arc(x, y, r * 0.8, 0.2, Math.PI * 0.95); c.arc(x - r * 0.08, y - r * 0.14, r * 0.68, Math.PI * 0.95, 0.2, true); c.fill(); });
          pinta(CHAVE_SO(0.95), (c) => { c.lineWidth = 3.2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); });
        }
      }

      // ================= BARCOS =================
      const barcosP = deTipo('barco');
      const roupas = H.roupas || ['vermelha', 'funda'];
      function barco(p, tq, idx) {
        const s = p.tamanho || 1, x = p.x + (p.anda || 0) * tq;
        const y = topoMar(p.faixa, x, tq) + 10 * s, inc = Math.atan2(topoMar(p.faixa, x + 60, tq) - topoMar(p.faixa, x - 60, tq), 120) * 0.75;
        const Lb = 340 * s, hb = 38 * s, vira = (p.anda || 0) < 0 ? -1 : 1;
        const em = (c, fn) => { c.translate(x, y); c.rotate(inc); c.scale(vira, 1); fn(c); };
        const casco = (c) => { c.beginPath(); c.moveTo(-Lb * 0.5, -hb * 0.55); c.lineTo(Lb * 0.56, -hb * 1.25); c.quadraticCurveTo(Lb * 0.34, hb * 0.55, -Lb * 0.3, hb * 0.45); c.quadraticCurveTo(-Lb * 0.48, hb * 0.3, -Lb * 0.5, -hb * 0.55); c.closePath(); };
        // remadores: corpo, cabeça e remo; mudam de pose a cada impressão (remada)
        const n = p.remadores || 5;
        for (let i = 0; i < n; i++) {
          const rx = -Lb * 0.34 + i * (Lb * 0.62 / Math.max(1, n - 1)), ry = -hb * 0.75 + (rx / Lb) * hb * 0.6;
          const rema = Math.sin(tq * 5.2 + i * 0.5), inclina = 0.25 * rema;
          const corpo = (c) => { c.save(); c.translate(rx, ry); c.rotate(inclina); c.beginPath(); c.roundRect(-9 * s, -30 * s, 18 * s, 32 * s, 5 * s); c.restore(); };
          const cabeca = (c) => { c.save(); c.translate(rx, ry); c.rotate(inclina); c.beginPath(); c.arc(0, -40 * s, 9 * s, 0, TAU); c.restore(); };
          pinta(ROUPA[roupas[i % roupas.length]] || ROUPA.funda, (c) => em(c, (c2) => { corpo(c2); c2.fill(); }));
          pinta(PAPEL_SEM_CHAVE, (c) => em(c, (c2) => { cabeca(c2); c2.fill(); }));
          pinta(CHAVE_SO(0.95), (c) => em(c, (c2) => {
            c2.lineWidth = 2.2 * Math.max(0.8, s); corpo(c2); c2.stroke(); cabeca(c2); c2.stroke();
            c2.save(); c2.translate(rx, ry); c2.rotate(inclina); c2.beginPath(); c2.arc(0, -42 * s, 9 * s, Math.PI * 1.05, Math.PI * 1.95); c2.lineTo(0, -44 * s); c2.closePath(); c2.fill(); c2.restore();
            c2.lineWidth = 2.6 * s; c2.beginPath(); c2.moveTo(rx + 6 * s, ry - 18 * s); c2.lineTo(rx - 26 * s + rema * 14 * s, ry + 52 * s); c2.stroke();
          }));
        }
        pinta(PAPEL_SEM_CHAVE, (c) => em(c, (c2) => { casco(c2); c2.fill(); }));
        pinta([0.6, 0.2, null, null], (c) => em(c, (c2) => { casco(c2); c2.clip(); c2.fillRect(-Lb, hb * 0.05, Lb * 2, hb); }));
        pinta(CHAVE_SO(0.95), (c) => em(c, (c2) => {
          c2.lineWidth = 3.2 * Math.max(0.7, s); c2.lineJoin = 'round'; casco(c2); c2.stroke();
          c2.lineWidth = 2 * Math.max(0.7, s); c2.beginPath(); c2.moveTo(-Lb * 0.47, -hb * 0.25); c2.lineTo(Lb * 0.45, -hb * 0.85); c2.stroke();
        }));
      }

      // ================= CHUVA =================
      const chuvaP = uma('chuva');
      const gotas = chuvaP ? Array.from({ length: chuvaP.quantas || 120 }, () => ({ x: acaso() * (L + 500) - 100, y: acaso(), len: 90 + acaso() * 200, v: 1500 + acaso() * 700, fim: acaso() })) : [];
      function chuva(tq) {
        if (!chuvaP) return;
        const inc = chuvaP.inclina ?? -0.2, ate = chuvaP.ate || [99, 99];
        pinta(CHAVE_SO(0.5), (c) => {
          c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath();
          for (const g of gotas) {
            if (tq > mistura(ate[0], ate[1], g.fim)) continue;
            const y = ((g.y * (A + 500) + g.v * tq) % (A + 500)) - 300, x = g.x + inc * y;
            c.moveTo(x, y); c.lineTo(x + inc * g.len, y + g.len);
          }
          c.stroke();
        });
      }

      // ================= TÍTULO (cartela no canto, letras em traços: não depende de fonte) =================
      function titulo(p, tq) {
        if (!H.titulo || tq < (p.de || 0) || tq >= (p.ate || 3)) return;
        const tam = p.tamanho || 44, txt = H.titulo.toUpperCase(), w = Letras.largura(txt, tam);
        const x = p.x, y = p.y, bw = w + tam * 1.4 + tam * 1.1, bh = tam * 2;
        pinta(PAPEL, (c) => c.fillRect(x, y, bw, bh));
        pinta([0.35, 0, null, null], (c) => c.fillRect(x, y, bw, bh));
        pinta([0, 0, 0, 0.95], (c) => c.fillRect(x + bw - tam * 1.15, y + tam * 0.45, tam * 0.75, tam * 1.1)); // carimbo vermelho
        pinta(CHAVE_SO(1), (c) => {
          c.lineWidth = 4; c.strokeRect(x, y, bw, bh); c.lineWidth = 1.8; c.strokeRect(x + 8, y + 8, bw - 16, bh - 16);
          c.lineWidth = tam * 0.12; c.lineCap = 'round'; c.lineJoin = 'round';
          let px = x + tam * 0.7;
          const y0 = y + bh / 2 - tam / 2;
          for (const ch of txt) {
            const g = Letras.letra(ch); if (!g) { px += 0.42 * tam; continue; }
            for (const tr of g.tracos) { poli(c, tr.map(([a, b]) => [px + a * tam, y0 + b * tam]), false); c.stroke(); }
            px += (g.w + 0.2) * tam;
          }
        });
      }

      // ================= o "shader": imprime as 4 chapas no papel =================
      const gl = tela.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('este navegador não tem WebGL');
      const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
      const FRAG = `precision highp float;
uniform sampler2D c0, c1, c2, c3;
uniform vec2 res, cam, d0, d1, d2, d3;
uniform float k, zoom, imp;
uniform vec3 tClara, tFunda, tAnil, tChave, tVerm, papel, mesa;
uniform vec4 folha;
float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
// veio da madeira: anéis compridos na horizontal, entortados por um ruído lento
float veio(vec2 w, float n){
  vec2 q = vec2(w.x * 0.0028, w.y * 0.05) + n * vec2(3.1, 7.7);
  q.y += 2.2 * vn(vec2(w.x * 0.0021, w.y * 0.0045) + n * 11.0);
  float g = vn(q) * 4.0 + q.y * 0.6;
  return 0.5 + 0.5 * cos(6.2832 * g);
}
// quanto de tinta uma tábua deixa num ponto do papel
float tinta(sampler2D ch, vec2 px, vec2 w, vec2 d, float n, float forca){
  float dens = texture2D(ch, (px - d * zoom * k) / res).r;
  if (dens < 0.004) return 0.0;
  vec2 wp = w - d;
  float esc = zoom * k;                                              // pixels de tela por unidade da folha
  float aV = smoothstep(1.2, 3.5, 20.0 * esc);                       // veio só onde cabe (>= alguns pixels)
  float cov = dens;
  cov *= 1.0 - forca * aV * 0.24 * veio(wp, n);                      // veio da madeira dentro da cor chapada
  cov *= 1.0 - forca * 0.16 * smoothstep(0.5, 0.9, vn(wp * 0.006 + n * 13.0) + 0.15 * vn(wp * 0.02 + imp * 0.7)); // tinta desigual
  float g = max(2.0, 2.0 / esc);                                     // célula do grão nunca menor que 2 pixels
  if (h(floor(wp / g) + n * 17.0 + imp * 3.0) > 0.992) cov *= 0.7;  // pontinhos onde a tinta não pegou
  return clamp(cov, 0.0, 1.0);
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec2 w = (px / k - vec2(960.0, 540.0)) / zoom + cam;           // ponto na folha
  float esc = zoom * k, aa = 1.0 / esc;
  // borda rasgada (deckle): ruído de duas escalas
  float b = (vn(w * 0.035) - 0.5) * 16.0 + (vn(w * 0.22) - 0.5) * 7.0 * smoothstep(0.15, 0.4, esc);
  vec2 dentro = min(w - folha.xy, folha.zw - w);
  float dist = min(dentro.x, dentro.y) + b;
  float naFolha = smoothstep(-aa, aa, dist);
  // papel: dente, fibras compridas e manchas suaves
  float aF = smoothstep(0.2, 0.6, esc);
  float fibra = vn(vec2(w.x * 0.08 + w.y * 0.5, w.y * 0.08 - w.x * 0.5)) * aF;
  vec3 cor = papel * (1.0 - 0.05 * vn(w * 0.4) * aF - 0.045 * fibra - 0.035 * vn(w * 0.012) + 0.03 * (1.0 - smoothstep(0.0, 14.0, dist)));
  float cl = tinta(c0, px, w, d0, 0.0, 1.0);
  float fu = tinta(c1, px, w, d1, 1.0, 1.0);
  float fd = texture2D(c1, (px - d1 * zoom * k) / res).r;
  float ch = tinta(c2, px, w, d2, 2.0, 0.35);
  float ve = tinta(c3, px, w, d3, 3.0, 0.8);
  cor *= mix(vec3(1.0), tClara, 0.95 * cl);
  vec3 fundaCor = mix(tFunda, tAnil, smoothstep(0.55, 1.0, fd));       // pouca tinta = azul-da-prússia, muita = anil
  cor *= mix(vec3(1.0), fundaCor, 0.96 * min(1.0, fu * 1.7));
  cor *= mix(vec3(1.0), tVerm, 0.95 * ve);
  cor *= mix(vec3(1.0), tChave, 0.97 * ch);
  float sombra = smoothstep(0.0, 30.0, -dist + 6.0);
  vec3 fora = mesa * (0.55 + 0.45 * sombra) * (1.0 + 0.2 * vn(w * 0.012));
  vec3 fim = mix(fora, cor, naFolha);
  vec2 uv = px / res - 0.5;
  fim *= 1.0 - 0.22 * dot(uv, uv);                                   // vinheta leve
  gl_FragColor = vec4(fim, 1.0);
}`;
      function compila(tipo, fonte) { const s = gl.createShader(tipo); gl.shaderSource(s, fonte); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
      const prog = gl.createProgram();
      gl.attachShader(prog, compila(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, compila(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const aP = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
      const U = (n) => gl.getUniformLocation(prog, n);
      const texturas = chapas.map((_, i) => {
        const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
        for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
        gl.uniform1i(U('c' + i), i); return tx;
      });
      const cor01 = (hex) => rgb(hex).map((v) => v / 255);
      for (const [u, nome] of [['tClara', 'clara'], ['tFunda', 'funda'], ['tAnil', 'anil'], ['tChave', 'chave'], ['tVerm', 'vermelha'], ['papel', 'papel'], ['mesa', 'mesa']]) gl.uniform3fv(U(u), cor01(TI[nome]));
      gl.uniform2f(U('res'), largura, altura); gl.uniform1f(U('k'), k);
      gl.uniform4f(U('folha'), -MARGEM.x, -MARGEM.y, L + MARGEM.x, A + MARGEM.y);
      gl.viewport(0, 0, largura, altura);
      // cada tábua tem um desencontro fixo (o gravador nunca acerta) e um tremor pequeno por impressão
      const FIXO = [[3.5, -2.5], [-2, 2.8], [0, 0], [4, 1.5]], TREME = [1.6, 1.4, 0.7, 1.8];

      // ---------- desenhar(t): monta as 4 chapas do instante t e imprime. Não guarda nada entre quadros. ----------
      const ordemMar = marP.faixas.map((_, i) => i);
      function desenhar(t) {
        const { idx, tq } = impressao(t);
        const sorte = sorteio((H.semente || 1) * 7919 + idx * 31 + 5);
        const cam = camera(tq);
        cam.x += (sorte() - 0.5) * 1.6; cam.y += (sorte() - 0.5) * 1.6; // a folha nunca cai no mesmo lugar
        const desl = FIXO.map(([fx, fy], i) => [fx + (sorte() - 0.5) * 2 * TREME[i], fy + (sorte() - 0.5) * 2 * TREME[i]]);

        // 1) chapas em branco (sem tinta), com a câmera
        cada((c) => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#000'; c.fillRect(0, 0, largura, altura); });
        const z = cam.zoom * k;
        cada((c) => c.setTransform(z, 0, 0, z, k * 960 - cam.x * z, k * 540 - cam.y * z));
        // 2) a imagem, de trás para a frente
        cada((c) => { c.save(); c.beginPath(); c.rect(0, 0, L, A); c.clip(); });
        ceu(tq);
        for (const p of deTipo('sol')) sol(p, tq);
        for (const p of deTipo('nuvens')) nuvens(p, tq);
        montanha();
        passaros(tq);
        pinta([0.85, 0.35, 0, 0], (c) => c.fillRect(0, HZ, L, A - HZ + 10));
        for (const fi of ordemMar) {
          faixaMar(fi, tq);
          for (const p of barcosP) if (p.faixa === fi) barco(p, tq, idx);
          if (OG && OG.faixa === fi) { ondaGigante(tq); espuma(tq); }
        }
        chuva(tq);
        for (const p of deTipo('titulo')) titulo(p, tq);
        cada((c) => c.restore());
        // moldura preta em volta da imagem (a tábua-chave também imprime a moldura)
        pinta(CHAVE_SO(1), (c) => { c.lineWidth = 9; c.strokeRect(-2, -2, L + 4, A + 4); });
        // 3) imprime
        chapas.forEach((cv, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texturas[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); });
        gl.uniform2f(U('cam'), cam.x, cam.y); gl.uniform1f(U('zoom'), cam.zoom); gl.uniform1f(U('imp'), idx % 97);
        desl.forEach((d, i) => gl.uniform2f(U('d' + i), d[0], d[1]));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // ---------- som: sai das MESMAS marcas de tempo da imagem ----------
      function som() {
        const s = Som.criar(duracao, H.semente || 1), M = H.musica || {};
        const fimTemp = T.tempestade[1];
        s.vento(0, duracao, { vol: 0.09, corte: 420, onda: 0.28 });                         // o mar
        s.vento(0, fimTemp + 0.6, { vol: 0.05, corte: 2200, onda: 0.6, sai: 0.8 });         // chuva
        // taiko: batida grave no compasso, mais forte na tempestade
        const bat = M.batida || 0.75;
        for (let t = 0.2; t < fimTemp; t += bat) s.batida(t, { vol: (Math.round(t / bat) % 4 === 0) ? 0.34 : 0.18, freq: 62, dur: 0.45 });
        // percussão de madeira (dois toques secos) a cada dois tempos
        for (let t = 0.2 + bat; t < duracao - 0.6; t += bat * 2) { s.toque(t, { vol: 0.07, corte: 1800, dur: 0.035, pan: -0.3 }); s.nota(1050, t, 0.02, { forma: 'seno', vol: 0.05, ataque: 0.001, solta: 0.07 }); }
        // a onda sobe: rufar do taiko acelerando
        if (OG) {
          const [a, b] = [OG.sobe[0], OG.enrola[1]];
          let t = a, passo = 0.42;
          while (t < b) { s.batida(t, { vol: 0.12 + 0.2 * trecho(t, a, b), freq: 80, dur: 0.22 }); t += passo; passo = Math.max(0.09, passo * 0.9); }
          s.vento(OG.sobe[0], OG.quebra[0] - OG.sobe[0], { vol: 0.08, corte: 900, onda: 0.15, entra: 2.5, sai: 0.2 });
          // a onda cai: pancada e estrondo de espuma
          s.batida(OG.quebra[0], { vol: 0.7, freq: 48, dur: 0.9 });
          s.vento(OG.quebra[0], 2.4, { vol: 0.3, corte: 3000, onda: 1.2, entra: 0.03, sai: 1.8 });
          for (let i = 0; i < 6; i++) s.toque(OG.quebra[0] + 0.15 + i * 0.13, { vol: 0.06, corte: 5000, dur: 0.08, pan: (i % 2 ? 0.4 : -0.4) });
        }
        // flauta de bambu: notas soltas na tempestade, frase curta quando o céu abre
        const flauta = (n, t, d, vol) => { s.nota(n, t, d, { forma: 'seno', vol, ataque: 0.18, solta: 0.6, vibrato: 0.012, vibratoHz: 5.5 }); s.vento(t, Math.min(0.4, d), { vol: vol * 0.25, corte: 3500, entra: 0.05, sai: 0.3 }); };
        for (const [n, t, d] of (M.flauta || [])) flauta(n, t, d, 0.07);
        for (const [n, t, d] of (M.fim || [])) flauta(n, t, d, 0.09);
        s.sino('A5', T.ceuAbre[0] + 0.6, 2.4, { vol: 0.05, brilho: 1.2 });
        s.batida(duracao - 1.3, { vol: 0.3, freq: 58, dur: 0.8 });                           // o taiko fecha
        s.sala(0.35);
        return s.fim({ entra: 0.3, sai: 0.9 });
      }

      return { desenhar, som };
    },
  });
})();
