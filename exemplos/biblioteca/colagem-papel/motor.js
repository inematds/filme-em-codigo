// MOTOR "colagem-papel" — colagem de papel recortado fotografada quadro a quadro.
// Jeito de animar: cada coisa na tela é um PEDAÇO DE PAPEL feito em código uma vez só, no começo
// (montar): papel colorido, pardo, jornal com letras ilegíveis, quadriculado, marmorizado, seda,
// retícula e papel estampado; cortado à tesoura (borda em facetas) ou rasgado (com fiapo branco).
// Cada pedaço vira uma figurinha com a sua sombra. No desenhar(t) só colamos as figurinhas: de dois em
// dois quadros, tremendo um pouquinho a cada pose, com a sombra piscando como se a mesa fosse
// fotografada de novo. As camadas andam em velocidades diferentes (mesa de várias camadas) e, no fim,
// tudo se alinha e a câmera mostra a colagem inteira, plana, presa no cartão com fita crepe.
// O que muda de um filme para outro está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, entraDevagar, sorteio, rgb } = Filme;
  const L = 1920, A = 1080;            // tamanho "de desenho" da folha da colagem
  const TAU = Math.PI * 2;

  // ---------- sorteio sem memória: o mesmo par de números dá sempre o mesmo valor ----------
  function h2(a, b) {
    let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 15), 0x2c1b3c6d); v = Math.imul(v ^ (v >>> 12), 0x297a2d39);
    return ((v ^ (v >>> 15)) >>> 0) / 4294967296;
  }
  // ruído macio em 2 dimensões (de 0 a 1)
  function vn(x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => h2(ix + i + s * 1013, iy + j - s * 7919);
    return mistura(mistura(g(0, 0), g(1, 0), ux), mistura(g(0, 1), g(1, 1), ux), uy);
  }

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const k = largura / L;               // a tela real pode ser menor (os testes usam 640x360)
      const R = k * 1.6, RG = k * 2.4;     // resolução das figurinhas (o gato aparece de perto)
      const C = H.cores, SEM = H.semente || 1;
      // cores das peças: vêm da história (paleta); estas são só a reserva se faltar alguma
      const PAL = Object.assign({"estrela": "#f4eedb", "estrela2": "#f7d774", "lua": "#f4e6b0", "solRaios": "#e8572b", "solRaios2": "#f29a3a", "solDisco": "#ef6b2c", "solDisco2": "#f7a743", "solMiolo": "#f7cf47", "nuvem": "#f5f2ea", "moldura": "#f1e8d2", "caixa": "#a8774a", "caixaTeto": "#8a5a33", "antena": "#2a2933", "chamine": "#8e3a2a", "tampa": "#e9dfc6", "peitoril": "#efe4c8", "toldo": "#f4ecd8", "toldo2": "#d94b3c", "roupas": ["#2c5a9c", "#d9506e", "#f2f0e8", "#3d8f86", "#d9a339", "#e88aa0"], "roupaFundo": "#f6f1e4", "trilho": "#6b4a2e", "bondeJanela": "#1c2350", "bondeLuz": "#f7d774", "bondeTeto": "#c8352e", "roda": "#2a2933", "passaro": "#dcd6c6", "passaroOlho": "#1c1c22", "bico": "#e0a03a", "gato": "#2b2a2f", "gatoListra": "#e2742c", "gatoListra2": "#f2b04a", "gatoOlho": "#f2d24a", "gatoPupila": "#121214", "gatoOlhoFechado": "#cfcac0", "focinho": "#e88aa0", "etiqueta": "#f3ecd9"}, H.paleta || {});
      const pecas = H.pecas || [];
      const deTipo = (tipo) => pecas.filter((p) => p.tipo === tipo);
      const uma = (tipo) => pecas.find((p) => p.tipo === tipo);
      const c = tela.getContext('2d');
      let semente = SEM * 1000;
      const novaSemente = () => ++semente;

      // ---------- tempo de foto: cada pose fica 2 quadros (animação "em dois") ----------
      const SEG = H.segurar || [2], CICLO = SEG.reduce((a, b) => a + b, 0);
      function pose(t) {
        const q = Math.round(t * fps), n = Math.floor(q / CICLO);
        let resto = q - n * CICLO, idx = n * SEG.length, ini = n * CICLO;
        for (const s of SEG) { if (resto < s) break; resto -= s; idx++; ini += s; }
        return { idx, tq: ini / fps };
      }

      // ---------- câmera: pontos-chave da história; "plano" = 1 alinha todas as camadas ----------
      function camera(tq) {
        const K = H.camera; let i = 0;
        while (i < K.length - 2 && tq > K[i + 1].t) i++;
        const a = K[i], b = K[i + 1], f = suave(trecho(tq, a.t, b.t));
        return { x: mistura(a.x, b.x, f), y: mistura(a.y, b.y, f), zoom: Math.exp(mistura(Math.log(a.zoom), Math.log(b.zoom), f)), plano: mistura(a.plano || 0, b.plano || 0, f) };
      }

      // ================= O ACERVO DE PAPÉIS (texturas feitas uma vez) =================
      const novaTela = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; };
      function fibras(x, w, h, acaso, quantas, claro) {
        for (let i = 0; i < quantas; i++) {
          const px = acaso() * w, py = acaso() * h, a = acaso() * TAU, l = 2 + acaso() * 7;
          x.strokeStyle = (acaso() < claro) ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.07)';
          x.lineWidth = 0.5 + acaso() * 0.7;
          x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
        }
      }
      // pinta pixel a pixel (marmorizado e retícula precisam disso)
      function porPixel(cv, rz, fn) {
        const x = cv.getContext('2d'), img = x.getImageData(0, 0, cv.width, cv.height), d = img.data;
        for (let j = 0; j < cv.height; j++) for (let i = 0; i < cv.width; i++) {
          const o = (j * cv.width + i) * 4, cor = fn(i / rz, j / rz);
          d[o] = cor[0]; d[o + 1] = cor[1]; d[o + 2] = cor[2]; d[o + 3] = 255;
        }
        x.putImageData(img, 0, 0);
      }
      // estoque de papel: devolve uma folha (w x h em unidades de desenho, rz = pixels por unidade)
      function estoque(tipo, w, h, cor, cor2, rz, s) {
        const cv = novaTela(w * rz, h * rz), x = cv.getContext('2d'), acaso = sorteio(s);
        x.scale(rz, rz); x.fillStyle = cor; x.fillRect(0, 0, w, h);
        const area = w * h;
        if (tipo === 'marmore') {
          const A1 = rgb(cor), A2 = rgb(cor2 || '#ffffff'), B = [246, 242, 232], so = s % 97;
          porPixel(cv, rz, (u, v) => {
            const q = u * 0.012 + 1.6 * vn(u * 0.006, v * 0.006, so) + 0.8 * vn(u * 0.02, v * 0.02, so + 3);
            const onda = Math.sin(q * 6.0 + v * 0.03 + 4 * vn(u * 0.01, v * 0.004, so + 5));
            const m = limita(0.5 + 0.5 * onda), veio = Math.pow(limita(1 - Math.abs(onda) * 6), 2) * 0.7;
            return [0, 1, 2].map((i) => mistura(mistura(A1[i], A2[i], m), B[i], veio) * (0.94 + 0.06 * vn(u * 0.3, v * 0.3, so + 9)));
          });
          x.setTransform(rz, 0, 0, rz, 0, 0);
        } else if (tipo === 'reticula') {
          const A1 = rgb(cor), A2 = rgb(cor2 || '#000000'), passo = 7, so = s % 97;
          porPixel(cv, rz, (u, v) => {
            const gx = Math.round(u / passo) * passo, gy = Math.round(v / passo) * passo;
            const r = passo * 0.5 * (0.25 + 0.6 * vn(gx * 0.01, gy * 0.01, so));
            const m = limita((r - Math.hypot(u - gx, v - gy)) * rz + 0.5);
            return [0, 1, 2].map((i) => mistura(A1[i], A2[i], m));
          });
          x.setTransform(rz, 0, 0, rz, 0, 0);
        } else if (tipo === 'jornal') {
          x.fillStyle = 'rgba(40,40,46,0.55)';
          for (let col = 0; col < w; col += 118) {
            for (let y = 8 + acaso() * 6; y < h - 6; y += 9) {
              if (acaso() < 0.06) { x.fillRect(col + 6, y, 100, 14); y += 12; continue; } // "manchete"
              let px = col + 6;
              while (px < col + 106) { const pw = 3 + acaso() * 11; if (px + pw > col + 106) break; x.fillRect(px, y, pw, 3.4); px += pw + 2.6; }
            }
          }
        } else if (tipo === 'quadriculado') {
          x.strokeStyle = cor2 || 'rgba(70,110,170,0.45)'; x.lineWidth = 0.8;
          for (let g = 0; g < Math.max(w, h); g += 14) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, h); x.moveTo(0, g); x.lineTo(w, g); x.stroke(); }
        } else if (tipo === 'origami') {          // ondas de escamas (estampa de papel dobrado)
          x.strokeStyle = cor2 || '#ffffff'; x.lineWidth = 2.2; const r = 18;
          for (let j = -1, y = 0; y < h + r; j++, y += r * 0.55) for (let xx = (j % 2) * r - r; xx < w + r; xx += r * 2) {
            x.fillStyle = cor; x.beginPath(); x.arc(xx, y, r, Math.PI, TAU); x.fill();
            for (const rr of [r, r * 0.68, r * 0.36]) { x.beginPath(); x.arc(xx, y, rr, Math.PI, TAU); x.stroke(); }
          }
        } else if (tipo === 'listras') {
          x.fillStyle = cor2 || '#f4ecd8';
          for (let xx = 0; xx < w; xx += 40) x.fillRect(xx, 0, 20, h);
        } else if (tipo === 'bolinhas') {
          x.fillStyle = cor2 || '#ffffff';
          for (let y = 6, j = 0; y < h + 6; y += 12, j++) for (let xx = 6 + (j % 2) * 6; xx < w + 6; xx += 12) { x.beginPath(); x.arc(xx, y, 2.6, 0, TAU); x.fill(); }
        } else if (tipo === 'pardo') {
          for (let i = 0; i < area / 160; i++) { x.fillStyle = acaso() < 0.5 ? 'rgba(70,40,15,0.18)' : 'rgba(255,240,210,0.16)'; x.beginPath(); x.arc(acaso() * w, acaso() * h, 0.5 + acaso() * 1.3, 0, TAU); x.fill(); }
        } else if (tipo === 'seda') {
          for (let i = 0; i < area / 9000; i++) {
            const y = acaso() * h; x.fillStyle = 'rgba(255,255,255,0.10)';
            x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + 20 * (acaso() - 0.5), w * 0.6, y + 20 * (acaso() - 0.5), w, y + 6); x.lineTo(w, y + 14); x.lineTo(0, y + 10); x.fill();
          }
        }
        fibras(x, w, h, acaso, area / 260, 0.55);
        // manchas grandes e suaves: nenhum papel é chapado de verdade
        for (let i = 0; i < Math.max(2, area / 40000); i++) {
          const px = acaso() * w, py = acaso() * h, r = 40 + acaso() * 140, g = x.createRadialGradient(px, py, 0, px, py, r);
          const clara = acaso() < 0.5; g.addColorStop(0, clara ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
        }
        return cv;
      }

      // ================= CORTE: tesoura (facetas) ou rasgado (fiapo branco) =================
      const area2 = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
      function contornos(pts, corte, s, amp) {
        const acaso = sorteio(s);
        if (corte === 'tesoura') {           // cada lado vira 1 a 3 cortes retos, um pouco tortos
          const out = [];
          pts.forEach((a, i) => {
            const b = pts[(i + 1) % pts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / 70));
            for (let j = 0; j < n; j++) { const f = j / n, tr = j ? 1.3 : 0.5; out.push([mistura(a[0], b[0], f) + (acaso() - 0.5) * tr * 2, mistura(a[1], b[1], f) + (acaso() - 0.5) * tr * 2]); }
          });
          return { fora: out, dentro: out };
        }
        // rasgado: pontos a cada 4 unidades, borda que vai e volta, e o fiapo por dentro
        const den = [];
        pts.forEach((a, i) => {
          const b = pts[(i + 1) % pts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 4));
          for (let j = 0; j < n; j++) den.push([mistura(a[0], b[0], j / n), mistura(a[1], b[1], j / n)]);
        });
        const sinal = area2(pts) > 0 ? 1 : -1, so = s % 89, fora = [], dentro = [];
        let ac = 0;
        den.forEach((p, i) => {
          const a = den[(i - 1 + den.length) % den.length], b = den[(i + 1) % den.length];
          let nx = (b[1] - a[1]) * sinal, ny = -(b[0] - a[0]) * sinal; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
          ac += 4;
          const e = amp * ((vn(ac * 0.05, 0, so) - 0.5) * 2 + (vn(ac * 0.3, 3, so) - 0.5) * 0.8);
          const f = 1.6 + 3.2 * vn(ac * 0.09, 7, so);
          fora.push([p[0] + nx * e, p[1] + ny * e]);
          dentro.push([p[0] + nx * (e - f), p[1] + ny * (e - f)]);
        });
        return { fora, dentro };
      }
      const caminho = (x, p) => { x.beginPath(); p.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); };

      // ---------- figurinha: um pedaço de papel pronto, com a sua sombra ----------
      // o = { corte, estoque, cor, cor2, amp, rz, fiapo, extra(x) }  pts em unidades de desenho, em volta do (0,0)
      function figurinha(pts, o) {
        const s = novaSemente(), rz = o.rz || R, M = 14;
        const { fora, dentro } = contornos(pts, o.corte || 'tesoura', s, o.amp ?? 2.4);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [a, b] of fora) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, a); y1 = Math.max(y1, b); }
        x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
        const w = x1 - x0, h = y1 - y0;
        const cv = novaTela(w * rz, h * rz), x = cv.getContext('2d');
        x.setTransform(rz, 0, 0, rz, -x0 * rz, -y0 * rz);
        if (o.corte === 'rasgado') { x.fillStyle = o.fiapo || C.fiapo; caminho(x, fora); x.fill(); }
        x.save(); caminho(x, o.corte === 'rasgado' ? dentro : fora); x.clip();
        const tex = estoque(o.estoque || 'liso', w, h, o.cor, o.cor2, rz, s);
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(tex, 0, 0); x.restore();
        if (o.extra) o.extra(x, s);
        // curvatura leve: a luz pega mais de um lado
        const g = x.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.10)');
        x.fillStyle = g; x.fillRect(x0, y0, w, h);
        x.restore();
        x.strokeStyle = 'rgba(0,0,0,0.16)'; x.lineWidth = 0.8; caminho(x, fora); x.stroke();
        // sombra: a mesma forma, preta e desfocada (o desfoque não segue a escala: vezes rz)
        const sb = novaTela((w + 2 * M) * rz, (h + 2 * M) * rz), y = sb.getContext('2d');
        y.setTransform(rz, 0, 0, rz, (M - x0) * rz - 20000, (M - y0) * rz);
        y.shadowColor = '#000'; y.shadowBlur = 5 * rz; y.shadowOffsetX = 20000; y.fillStyle = '#000'; caminho(y, fora); y.fill();
        return { cv, sb, x0, y0, w, h, M, id: s };
      }

      // ---------- colar uma figurinha: tremor da pose, sombra que pisca e cresce quando levanta ----------
      let IDX = 0;                           // número da pose atual (definido no começo de cada desenhar)
      function cola(F, x, y, o = {}) {
        const rot = o.rot || 0, lev = o.lev || 0, tr = o.treme ?? 1, esc = (o.esc || 1) * (1 + lev * 0.05);
        const jx = (h2(F.id, IDX) - 0.5) * 1.6 * tr, jy = (h2(F.id + 7, IDX) - 0.5) * 1.6 * tr, jr = (h2(F.id + 13, IDX) - 0.5) * 0.006 * tr;
        c.save(); c.translate(x + jx, y + jy);
        const so = (o.sombra ?? 1) * (3 + lev * 26);
        c.globalAlpha = (0.34 - lev * 0.12) * (0.82 + 0.36 * h2(IDX, 99) * (0.6 + 0.4 * h2(F.id, IDX + 5))) * (o.alfa ?? 1);
        c.save(); c.translate(so * 0.55, so); c.rotate(rot + jr); c.scale(esc * (o.vira || 1), esc);
        c.drawImage(F.sb, F.x0 - F.M, F.y0 - F.M, F.w + 2 * F.M, F.h + 2 * F.M); c.restore();
        c.globalAlpha = o.alfa ?? 1;
        c.rotate(rot + jr); c.scale(esc * (o.vira || 1), esc);
        c.drawImage(F.cv, F.x0, F.y0, F.w, F.h);
        c.restore(); c.globalAlpha = 1;
      }

      // ---------- formas em pontos ----------
      const retangulo = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      const elipse = (rx, ry, n = 48, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos(i / n * TAU), cy + ry * Math.sin(i / n * TAU)]);
      const alfinete = (() => {             // alfinete de mapa: bolinha vermelha com brilho
        const F = figurinha(elipse(9, 9, 24), { cor: C.alfinete, estoque: 'liso' });
        return (x, y) => { cola(F, x, y, { sombra: 1.6 }); c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(x - 3, y - 3, 2.6, 0, TAU); c.fill(); };
      })();
      const colchete = (x, y, r = 5) => {   // colchete de latão (junta do boneco)
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(x + 1.2, y + 1.8, r, 0, TAU); c.fill();
        c.fillStyle = C.colchete; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,245,200,0.7)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); c.fill();
      };
      const fitaF = [0, 1, 2, 3].map((i) => figurinha(retangulo(-70, -17, 140, 34), { corte: 'rasgado', amp: 1.2, cor: C.fita, fiapo: C.fita, estoque: 'liso' }));

      // ================= AS PEÇAS DA HISTÓRIA =================
      const cena = [];                      // [{ camada, desenha(tq) }] na ordem da lista
      const J = H.janelas || {};
      const somMarcas = [];                 // marcas de tempo para o som (as mesmas da imagem)

      // ----- céu em faixas: a faixa da noite é trocada pela do dia, uma a uma -----
      for (const p of deTipo('ceu')) {
        const fx = p.faixas.map((f, i) => {
          const pts = retangulo(-140, f.y0, L + 280, f.y1 - f.y0);
          const estrelas = (x, s) => {
            if (i > 3) return; const ac = sorteio(s + 3);
            for (let n = 0; n < (p.estrelas || 0) / 4; n++) { x.fillStyle = ac() < 0.7 ? PAL.estrela : PAL.estrela2; x.beginPath(); x.arc(-100 + ac() * (L + 200), f.y0 + 10 + ac() * (f.y1 - f.y0 - 20), 1.6 + ac() * 2.2, 0, TAU); x.fill(); }
          };
          return {
            f, noite: figurinha(pts, { corte: 'rasgado', amp: 3, cor: f.noite, estoque: f.estoque, extra: estrelas }),
            dia: figurinha(pts, { corte: 'rasgado', amp: 3, cor: f.dia, estoque: f.estoque }), lado: i % 2 ? 1 : -1,
          };
        });
        for (const b of fx) somMarcas.push(['papel', b.f.troca]);
        cena.push({ camada: p.camada || 'ceu', desenha(tq) {
          for (const b of fx) {
            const k0 = trecho(tq, b.f.troca, b.f.troca + 0.4);
            if (k0 < 1) cola(b.noite, 0, 0, { treme: 0.6 });
            if (k0 > 0) { const e = saiDevagar(k0); cola(b.dia, b.lado * (1 - e) * (L + 300), -12 * (1 - e), { lev: 0.6 * (1 - e), treme: 0.6 }); }
          }
        } });
      }
      // ----- lua minguante presa com alfinete: alguém a tira da folha -----
      for (const p of deTipo('lua')) {
        const r = p.raio, d = r * 0.6, yi = Math.sqrt(r * r - d * d / 4), t1 = Math.atan2(yi, d / 2), f1 = Math.atan2(yi, -d / 2), pts = [];
        for (let i = 0; i <= 30; i++) { const a = t1 + (TAU - 2 * t1) * i / 30; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
        for (let i = 1; i < 30; i++) { const a = (TAU - f1) - (TAU - 2 * f1) * i / 30; pts.push([d + r * Math.cos(a), r * Math.sin(a)]); }
        const F = figurinha(pts, { corte: 'rasgado', cor: PAL.lua, estoque: 'liso' });
        somMarcas.push(['papel', p.sai[0]]);
        cena.push({ camada: p.camada || 'ceu', desenha(tq) {
          const k0 = trecho(tq, p.sai[0], p.sai[1]); if (k0 >= 1) return;
          const lev = limita(k0 * 3), e = entraDevagar(k0);
          cola(F, p.x - 40 * e, p.y - 420 * e, { rot: -0.5 - 0.6 * e, lev });
          if (k0 < 0.12) alfinete(p.x - r * 0.45, p.y - 4);
        } });
      }
      // ----- sol rasgado de laranja, com raios que giram -----
      for (const p of deTipo('sol')) {
        const r = p.raio, n = p.raios || 12, pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([Math.cos(a - 0.13) * r * 1.05, Math.sin(a - 0.13) * r * 1.05], [Math.cos(a) * r * 1.62, Math.sin(a) * r * 1.62], [Math.cos(a + 0.13) * r * 1.05, Math.sin(a + 0.13) * r * 1.05]); }
        const raios = figurinha(pts, { corte: 'tesoura', cor: PAL.solRaios, cor2: PAL.solRaios2, estoque: 'marmore' });
        const disco = figurinha(elipse(r, r, 64), { corte: 'rasgado', amp: 3.5, cor: PAL.solDisco, cor2: PAL.solDisco2, estoque: 'marmore' });
        const miolo = figurinha(elipse(r * 0.62, r * 0.62, 48), { corte: 'rasgado', amp: 2, cor: PAL.solMiolo, estoque: 'seda' });
        somMarcas.push(['sobe', p.sobe[0], p.sobe[1]]);
        cena.push({ camada: p.camada || 'ceu', desenha(tq) {
          const k0 = saiDevagar(trecho(tq, p.sobe[0], p.sobe[1])); if (tq < p.sobe[0]) return;
          const y = mistura(p.y0, p.y1, k0);
          cola(raios, p.x, y, { rot: (p.gira || 0.3) * tq });
          cola(disco, p.x, y); cola(miolo, p.x, y, { sombra: 0.6 }); alfinete(p.x, y);
        } });
      }
      // ----- nuvens de papel de seda, presas com fita -----
      for (const p of deTipo('nuvem')) {
        const w = p.largura, pts = [];
        for (let i = 0; i <= 40; i++) { const a = Math.PI + Math.PI * i / 40, bolha = 1 + 0.22 * Math.abs(Math.sin(a * 3.5)); pts.push([Math.cos(a) * w / 2 * 1.0, Math.sin(a) * w * 0.26 * bolha]); }
        pts.push([w / 2, w * 0.06], [-w / 2, w * 0.06]);
        const F = figurinha(pts, { corte: 'rasgado', amp: 2, cor: PAL.nuvem, estoque: 'seda' });
        const fita = fitaF[(p.x | 0) % 4];
        cena.push({ camada: p.camada || 'ceu', desenha(tq) {
          if (tq < p.chega[0]) return;
          const e = saiDevagar(trecho(tq, p.chega[0], p.chega[1]));
          const x = p.x + p.de * (1 - e) * 1400;
          cola(F, x, p.y, { lev: 0.5 * (1 - e) });
          if (e >= 1) cola(fita, x + w * 0.1, p.y - w * 0.08, { rot: 1.3, esc: 0.45, alfa: 0.85, sombra: 0.3 });
        } });
      }
      // ----- prédios: corpo de papel, enfeite no topo e janelas que acendem -----
      const ACESAS = J.acesas || ['#f7d774'];
      const janelaF = {};                    // figurinhas de janela, uma por tamanho e cor
      const janela = (w, h, cor, moldura) => {
        const ch = `${w}x${h}${cor}${moldura ? 'm' : ''}`;
        if (!janelaF[ch]) janelaF[ch] = figurinha(retangulo(-w / 2, -h / 2, w, h), { cor, estoque: 'liso', extra: moldura ? (x) => {
          x.fillStyle = PAL.moldura; x.fillRect(-2.5, -h / 2, 5, h); x.fillRect(-w / 2, -2.5, w, 5);
        } : null });
        return janelaF[ch];
      };
      let ordemJanela = 0;
      for (const p of deTipo('predio')) {
        const base = p.base || 900, w = p.largura, h = base - p.topo;
        let pts = retangulo(0, 0, w, h);
        if (p.extra === 'ponta') pts = [[0, 0], [w * 0.3, 0], [w * 0.3, -40], [w * 0.5, -150], [w * 0.7, -40], [w * 0.7, 0], [w, 0], [w, h], [0, h]];
        const corpo = figurinha(pts, { corte: 'tesoura', cor: p.cor, cor2: p.cor2, estoque: p.estoque || 'liso' });
        const enfeites = [];
        if (p.extra === 'caixa') {
          enfeites.push([figurinha(retangulo(-24, -46, 48, 34), { cor: PAL.caixa, estoque: 'pardo', extra: (x) => { x.fillStyle = 'rgba(60,35,15,0.5)'; x.fillRect(-24, -46, 48, 5); } }), w * 0.62, 0]);
          enfeites.push([figurinha([[-30, -46], [0, -66], [30, -46]], { cor: PAL.caixaTeto, estoque: 'pardo' }), w * 0.62, 0]);
        }
        if (p.extra === 'antena') enfeites.push([figurinha([[-3, 0], [-3, -80], [-18, -80], [-18, -86], [18, -86], [18, -80], [3, -80], [3, 0]], { cor: PAL.antena, estoque: 'liso' }), w * 0.5, 0]);
        if (p.extra === 'chamine') enfeites.push([figurinha(retangulo(-20, -60, 40, 62), { cor: PAL.chamine, estoque: 'pardo' }), w * 0.8, 0]);
        const tampa = p.camada === 'perto' ? figurinha(retangulo(-10, -12, w + 20, 16), { corte: 'rasgado', amp: 1.5, cor: PAL.tampa, estoque: 'liso' }) : null;
        const toldo = p.toldo ? figurinha([[0, 0], [p.toldo.largura, 0], [p.toldo.largura + 14, 40], ...Array.from({ length: 7 }, (_, i) => { const xx = p.toldo.largura + 14 - (i + 0.5) * (p.toldo.largura + 28) / 7; return [[xx + 9, 40], [xx, 54], [xx - 9, 40]]; }).flat(), [-14, 40]], { cor: PAL.toldo, cor2: PAL.toldo2, estoque: 'listras' }) : null;
        // janelas: cada uma tem a hora de acender (sorteada uma vez) e uma cor de luz
        const jn = [], ac = sorteio(SEM * 31 + ordemJanela++);
        const Jp = p.janelas;
        if (Jp) for (let lin = 0; lin < Jp.lin; lin++) for (let col = 0; col < Jp.col; col++) {
          const y = Jp.y0 + lin * Jp.dy; if (y + Jp.h > h - 10) continue;
          const t = mistura(J.acende[0], J.acende[1], ac()), cor = ACESAS[Math.floor(ac() * ACESAS.length)];
          jn.push({ x: Jp.x0 + col * Jp.dx + Jp.w / 2, y: y + Jp.h / 2, t, apagada: janela(Jp.w, Jp.h, J.apagada, Jp.moldura), acesa: janela(Jp.w, Jp.h, cor, Jp.moldura) });
        }
        const peitoril = Jp && Jp.moldura ? figurinha(retangulo(-Jp.w / 2 - 12, -5, Jp.w + 24, 12), { cor: PAL.peitoril, estoque: 'liso' }) : null;
        const verga = Jp && Jp.moldura ? figurinha(retangulo(-Jp.w / 2 - 8, -6, Jp.w + 16, 10), { cor: PAL.peitoril, estoque: 'liso' }) : null;
        cena.push({ camada: p.camada || 'longe', desenha(tq) {
          for (const [F, dx, dy] of enfeites) cola(F, p.x + dx, p.topo + dy, { sombra: 0.7 });
          cola(corpo, p.x, p.topo);
          if (tampa) cola(tampa, p.x, p.topo, { sombra: 0.5 });
          for (const q of jn) {
            const X = p.x + q.x, Y = p.topo + q.y;
            if (verga) cola(verga, X, Y - Jp.h / 2 - 4, { sombra: 0.4, treme: 0.5 });
            cola(tq >= q.t ? q.acesa : q.apagada, X, Y, { sombra: 0.35, treme: 0.5 });
            if (peitoril) cola(peitoril, X, Y + Jp.h / 2 + 4, { sombra: 0.5, treme: 0.5 });
          }
          if (toldo) cola(toldo, p.x + p.toldo.x, p.topo + p.toldo.y);
        } });
        if (jn.length) somMarcas.push(['janelas', ...jn.map((q) => q.t)]);
      }
      // ----- varal com roupas de papel estampado -----
      for (const p of deTipo('varal')) {
        const n = p.roupas || 6, ac = sorteio(SEM + 77), ESTAMPAS = ['bolinhas', 'origami', 'liso', 'listras', 'bolinhas', 'liso'].map((e, i) => [e, PAL.roupas[i % PAL.roupas.length]]);
        const roupas = Array.from({ length: n }, (_, i) => {
          const [est, cor] = ESTAMPAS[i % ESTAMPAS.length], tipo = i % 3, s = 0.9 + ac() * 0.3;
          const pts = tipo === 0 ? [[-20, 0], [20, 0], [30, 14], [20, 18], [20, 48], [-20, 48], [-20, 18], [-30, 14]].map(([a, b]) => [a * s, b * s])
            : tipo === 1 ? retangulo(-16 * s, 0, 32 * s, 40 * s) : [[-14 * s, 0], [14 * s, 0], [16 * s, 46 * s], [2 * s, 46 * s], [0, 18 * s], [-2 * s, 46 * s], [-16 * s, 46 * s]];
          return figurinha(pts, { cor, cor2: PAL.roupaFundo, estoque: est });
        });
        const ponto = (f) => [mistura(p.de[0], p.ate[0], f), mistura(p.de[1], p.ate[1], f) + 26 * Math.sin(Math.PI * f)];
        cena.push({ camada: p.camada || 'longe', desenha(tq) {
          c.strokeStyle = 'rgba(30,30,36,0.85)'; c.lineWidth = 1.6; c.beginPath();
          for (let i = 0; i <= 20; i++) { const [x, y] = ponto(i / 20); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
          roupas.forEach((F, i) => { const [x, y] = ponto((i + 0.7) / (n + 0.4)); cola(F, x, y - 2, { rot: 0.1 * Math.sin(tq * 3.1 + i * 1.7), sombra: 0.5 }); });
        } });
      }
      // ----- rio de papel marmorizado que desliza, ponte de papel pardo, bonde amarelo -----
      for (const p of deTipo('rio')) {
        const F = figurinha(retangulo(-400, 0, L + 900, p.altura), { corte: 'rasgado', cor: p.cor, cor2: p.cor2, estoque: 'marmore' });
        cena.push({ camada: p.camada || 'meio', desenha(tq) { cola(F, -200 + (p.anda || 30) * tq, p.y, { treme: 0.7 }); } });
      }
      for (const p of deTipo('ponte')) {
        const pts = [[-120, 0], [L + 120, 0], [L + 120, 260]], vao = p.vao, ar = p.arco;
        for (let x = L + 120 - 50; x > -200; x -= vao) {
          pts.push([x, 260]);
          for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; pts.push([x - (vao - 60) / 2 * (1 - Math.cos(a)), 260 - (260 - ar) * Math.sin(a)]); }
          pts.push([x - (vao - 60) - 60, 260]);
        }
        pts.push([-120, 260]);
        const F = figurinha(pts, { corte: 'tesoura', cor: p.cor, estoque: 'pardo' });
        const trilho = figurinha(retangulo(-120, -6, L + 240, 12), { cor: PAL.trilho, estoque: 'pardo' });
        cena.push({ camada: p.camada || 'meio', desenha() { cola(F, 0, p.y); cola(trilho, 0, p.y + 2, { sombra: 0.4 }); } });
      }
      for (const p of deTipo('bonde')) {
        const W = 250, Hh = 70;
        const corpo = figurinha([[0, -Hh], [W, -Hh], [W + 8, -Hh + 12], [W + 8, -8], [-8, -8], [-8, -Hh + 12]], { cor: p.cor, estoque: 'liso', extra: (x) => {
          x.fillStyle = p.cor2; x.fillRect(-10, -26, W + 20, 9);
          x.fillStyle = PAL.bondeJanela; for (let i = 0; i < 6; i++) x.fillRect(14 + i * 39, -Hh + 12, 26, 26);
          x.fillStyle = PAL.bondeLuz; for (let i = 0; i < 6; i++) if (i % 2) x.fillRect(16 + i * 39, -Hh + 14, 10, 10);
        } });
        const teto = figurinha(retangulo(-4, -Hh - 10, W + 8, 12), { cor: PAL.bondeTeto, estoque: 'liso' });
        const roda = figurinha(elipse(9, 9, 20), { cor: PAL.roda, estoque: 'liso' });
        somMarcas.push(['bonde', p.anda[0], p.anda[1]]);
        cena.push({ camada: p.camada || 'meio', desenha(tq) {
          if (tq < p.anda[0] || tq > p.anda[1]) return;
          const x = mistura(p.x0, p.x1, trecho(tq, p.anda[0], p.anda[1])), y = p.y - 4;
          cola(teto, x, y, { sombra: 0.6 }); cola(corpo, x, y);
          for (const rx of [40, 80, W - 80, W - 40]) { cola(roda, x + rx, y - 2, { sombra: 0.4, rot: tq * 6 }); colchete(x + rx, y - 2, 3); }
        } });
      }
      // ----- pássaros de jornal: pousados no telhado, voam quando o gato chega -----
      for (const p of deTipo('passaros')) {
        const pousado = figurinha([[-30, -8], [-18, -4], [-10, -16], [4, -20], [13, -16], [24, -10], [14, -6], [10, 4], [-6, 7], [-20, 3]], { cor: PAL.passaro, estoque: 'jornal', extra: (x) => { x.fillStyle = PAL.passaroOlho; x.beginPath(); x.arc(9, -13, 2.2, 0, TAU); x.fill(); x.fillStyle = PAL.bico; x.beginPath(); x.moveTo(16, -13); x.lineTo(27, -10); x.lineTo(16, -7); x.fill(); x.strokeStyle = 'rgba(30,30,36,0.6)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-14, -6); x.quadraticCurveTo(-2, -2, 6, -8); x.stroke(); } });
        const asaCima = figurinha([[-22, -26], [-6, -4], [0, -6], [6, -4], [22, -26], [10, 2], [0, 6], [-10, 2]], { cor: PAL.passaro, estoque: 'jornal' });
        const asaBaixo = figurinha([[-22, 10], [-6, -4], [0, -6], [6, -4], [22, 10], [10, 4], [0, 8], [-10, 4]], { cor: PAL.passaro, estoque: 'jornal' });
        const ac = sorteio(SEM + 404), tb = p.tamanho || 1;
        const bs = Array.from({ length: p.quantos }, (_, i) => ({ x: mistura(p.x0, p.x1, (i + 0.3 + ac() * 0.4) / p.quantos), atraso: ac() * 0.35, vx: -260 - ac() * 520, vy: 300 + ac() * 380, vira: ac() < 0.5 ? -1 : 1 }));
        somMarcas.push(['passaros', p.voa]);
        cena.push({ camada: p.camada || 'perto', desenha(tq, idx) {
          bs.forEach((b, i) => {
            const dt = tq - p.voa - b.atraso;
            if (dt < 0) { cola(pousado, b.x, p.y - 4, { vira: b.vira, sombra: 0.5, esc: tb }); return; }
            const x = b.x + b.vx * dt, y = p.y - 10 - b.vy * dt;
            cola((idx + i) % 2 ? asaCima : asaBaixo, x, y, { lev: limita(dt * 2), esc: tb * 1.15 });
          });
        } });
      }
      // ----- o gato: boneco articulado de papel carvão com listras marmorizadas -----
      for (const p of deTipo('gato')) {
        const listras = (n, x0, x1, y0, y1) => (x, s) => {
          const ac = sorteio(s + 5), tex = estoque('marmore', 60, 60, PAL.gatoListra, PAL.gatoListra2, RG, s + 9), pat = x.createPattern(tex, 'repeat');
          pat.setTransform(new DOMMatrix().scale(1 / RG));
          x.fillStyle = pat;
          for (let i = 0; i < n; i++) {
            const cx = mistura(x0, x1, (i + 0.5) / n), w = 6 + ac() * 6, inc = (ac() - 0.5) * 10;
            x.beginPath(); x.moveTo(cx - w + inc, y0); x.lineTo(cx + w + inc, y0); x.lineTo(cx + w * 0.4, y1); x.lineTo(cx - w * 0.6, y1); x.closePath(); x.fill();
          }
        };
        const carvao = { corte: 'rasgado', amp: 1.6, cor: PAL.gato, estoque: 'liso', rz: RG };
        const arco = [];
        for (let i = 0; i <= 24; i++) { const a = Math.PI + Math.PI * i / 24; arco.push([Math.cos(a) * 80, Math.sin(a) * 58 + 10]); }
        for (let i = 0; i <= 24; i++) { const a = TAU - Math.PI * i / 24; arco.push([Math.cos(a) * 58, Math.sin(a) * 26 + 12]); }
        const CORPO = {
          enrolado: figurinha(elipse(64, 38, 48), { ...carvao, extra: listras(5, -50, 50, -40, 10) }),
          deitado: figurinha(elipse(78, 30, 48), { ...carvao, extra: listras(5, -60, 40, -32, 6) }),
          esticado: figurinha(elipse(94, 24, 48), { ...carvao, extra: listras(6, -75, 50, -26, 4) }),
          arco: figurinha(arco, { ...carvao, extra: listras(5, -60, 50, -50, 0) }),
        };
        const cab = [];
        for (let i = 0; i < 48; i++) {
          const a = i / 48 * TAU - Math.PI; let r = 30;
          for (const ea of [-2.25, -0.9]) { const da = Math.abs(a - ea); if (da < 0.32) r += 24 * (1 - da / 0.32); }
          cab.push([Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.92]);
        }
        const CABECA = figurinha(cab, { ...carvao });
        const caudaPts = [];
        for (let i = 0; i <= 12; i++) { const f = i / 12; caudaPts.push([-f * 92, -6 * (1 - f * 0.4) - 14 * Math.sin(f * 2.4)]); }
        for (let i = 12; i >= 0; i--) { const f = i / 12; caudaPts.push([-f * 92, 6 * (1 - f * 0.4) - 14 * Math.sin(f * 2.4)]); }
        const CAUDA = figurinha(caudaPts, { ...carvao, extra: listras(4, -80, -12, -30, 20) });
        const PERNA = figurinha([[-8, -4], [8, -4], [8, 40], [10, 46], [-9, 47], [-8, 40]], { ...carvao });
        const POSES = {
          dorme: { corpo: ['enrolado', 0, -36, 0], cab: [46, -28, 0.4, 0], cauda: [-52, -12, 3.0, 1], pernas: [] },
          acorda: { corpo: ['deitado', 0, -30, 0], cab: [74, -54, -0.15, 1], cauda: [-74, -26, 0.25, 0], pernas: [[52, -14, -1.45, 0], [40, -14, -1.45, 1]] },
          espreguica: { corpo: ['esticado', 0, -44, 0.2], cab: [98, -26, 0.15, 0], cauda: [-86, -62, 0.9, 0], pernas: [[-62, -48, 0.05, 0], [-50, -46, 0.05, 1], [70, -24, -1.35, 0], [58, -22, -1.3, 1]] },
          arqueia: { corpo: ['arco', 0, -48, 0], cab: [84, -64, 0.15, 1], cauda: [-76, -46, 1.1, 0], pernas: [[-62, -46, 0, 0], [-50, -46, 0, 1], [50, -46, 0, 0], [62, -46, 0, 1]] },
          agacha: { corpo: ['deitado', 0, -30, 0.06], cab: [76, -44, -0.05, 1], cauda: [-74, -24, 0.15, 0], pernas: [[-56, -20, 0.9, 0], [-44, -20, 0.9, 1], [46, -20, -0.6, 0], [58, -20, -0.6, 1]] },
          salta: { corpo: ['esticado', 0, -40, 0], cab: [102, -46, -0.05, 1], cauda: [-90, -40, 0.2, 0], pernas: [[-72, -30, 1.25, 0], [-82, -30, 1.15, 1], [70, -32, -1.25, 0], [80, -32, -1.15, 1]] },
          senta: { corpo: ['deitado', -8, -44, -0.55], cab: [50, -98, 0, 1], cauda: [-72, -12, -0.1, 0], pernas: [[-54, -20, 1.4, 0], [40, -46, 0.05, 0], [50, -46, 0.05, 1]] },
        };
        const S = p.salto, poses = p.poses, e = p.escala || 1;
        for (const [t] of poses) somMarcas.push(['gato', t]);
        if (S) somMarcas.push(['salto', S.de, S.ate]);
        const olhos = (abertos) => {
          for (const ox of [-12, 12]) {
            if (abertos) {
              c.fillStyle = PAL.gatoOlho; c.beginPath(); c.ellipse(ox, -2, 7, 8, 0, 0, TAU); c.fill();
              c.fillStyle = PAL.gatoPupila; c.beginPath(); c.ellipse(ox + 1, -2, 2.2, 6.5, 0, 0, TAU); c.fill();
            } else { c.strokeStyle = PAL.gatoOlhoFechado; c.lineWidth = 2.2; c.beginPath(); c.arc(ox, -4, 6, 0.3, Math.PI - 0.3); c.stroke(); }
          }
          c.fillStyle = PAL.focinho; c.beginPath(); c.moveTo(-4, 8); c.lineTo(4, 8); c.lineTo(0, 13); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(240,236,226,0.8)'; c.lineWidth = 1.1; c.beginPath();
          for (const s of [-1, 1]) for (const dy of [-2, 3]) { c.moveTo(s * 8, 11); c.lineTo(s * 34, 8 + dy * 2); }
          c.stroke();
        };
        cena.push({ camada: p.camada || 'perto', desenha(tq) {
          let nome = poses[0][1]; for (const [t, n] of poses) if (tq >= t) nome = n;
          const P = POSES[nome];
          let x = p.x, y = p.y, giro = 0;
          if (S && tq >= S.de) {
            const f = trecho(tq, S.de, S.ate);
            x = mistura(p.x, S.x, f); y = mistura(p.y, S.y, f) - S.altura * 4 * f * (1 - f);
            if (tq < S.ate) giro = Math.atan2((S.y - p.y) - S.altura * 4 * (1 - 2 * f), S.x - p.x) * 0.7;
          }
          c.save(); c.translate(x, y); c.rotate(giro); c.scale(e, e);
          const [cn, cx, cy, cr] = P.corpo;
          const perna = ([lx, ly, lr], frente) => { if (frente) { cola(PERNA, lx, ly, { rot: lr, sombra: 0.5 }); colchete(lx, ly, 3.4); } };
          for (const pp of P.pernas) if (!pp[3]) perna(pp, true);
          if (!P.cauda[3]) { cola(CAUDA, P.cauda[0], P.cauda[1], { rot: P.cauda[2], sombra: 0.6 }); colchete(P.cauda[0], P.cauda[1], 3.4); }
          cola(CORPO[cn], cx, cy, { rot: cr });
          if (P.cauda[3]) { cola(CAUDA, P.cauda[0], P.cauda[1], { rot: P.cauda[2], sombra: 0.6 }); colchete(P.cauda[0], P.cauda[1], 3.4); }
          for (const pp of P.pernas) if (pp[3]) perna(pp, true);
          const [hx, hy, hr, ab] = P.cab;
          cola(CABECA, hx, hy, { rot: hr });
          c.save(); c.translate(hx, hy); c.rotate(hr); olhos(ab); c.restore();
          colchete(hx - 22, hy + 14, 3.4);
          c.restore();
        } });
      }
      // ----- título numa etiqueta de papel presa com fita; depois é tirada -----
      for (const p of deTipo('titulo')) {
        if (!H.titulo) break;
        const tam = p.tamanho || 48, txt = H.titulo.toUpperCase(), w = Letras.largura(txt, tam) + tam * 1.4, hh = tam * 2.1;
        const F = figurinha(retangulo(0, 0, w, hh), { corte: 'tesoura', cor: PAL.etiqueta, estoque: 'quadriculado', cor2: 'rgba(80,120,170,0.25)' });
        cena.push({ camada: p.camada || 'perto', desenha(tq) {
          if (tq >= p.ate) return;
          const sai = trecho(tq, p.ate - 0.35, p.ate), lev = limita(sai * 2), x = p.x, y = p.y - 300 * entraDevagar(sai);
          cola(F, x, y, { lev, rot: -0.02 - 0.15 * sai });
          c.save(); c.translate(x, y); c.rotate(-0.02 - 0.15 * sai);
          c.strokeStyle = C.tinta; c.lineWidth = tam * 0.13; c.lineCap = 'round'; c.lineJoin = 'round';
          let px = tam * 0.7; const y0 = hh / 2 - tam / 2;
          for (const ch of txt) {
            const g = Letras.letra(ch); if (!g) { px += 0.42 * tam; continue; }
            for (const tr of g.tracos) { c.beginPath(); tr.forEach(([a, b], i) => (i ? c.lineTo(px + a * tam, y0 + b * tam) : c.moveTo(px + a * tam, y0 + b * tam))); c.stroke(); }
            px += (g.w + 0.2) * tam;
          }
          c.restore();
          if (sai === 0) cola(fitaF[1], x + w / 2, y + 2, { esc: 0.7, alfa: 0.88, sombra: 0.3 });
        } });
      }

      // ================= MESA, FOLHA, LUZ E GRÃO =================
      const MESA = { x: -900, y: -600, w: L + 1800, h: A + 1200 };
      const mesa = estoque('liso', MESA.w, MESA.h, C.mesa, null, k, SEM + 2);
      const folha = estoque('liso', L, A, C.folha, null, k * 0.8, SEM + 3);
      const fitas = uma('fitas');
      const CANTOS = [[0, 0, -0.75], [L, 0, 0.75], [0, A, 0.75], [L, A, -0.75]];
      // luz de mesa (mais clara no meio) e grão: feitos uma vez, no tamanho da tela
      const luz = novaTela(largura, altura);
      { const x = luz.getContext('2d'), g = x.createRadialGradient(largura * 0.46, altura * 0.42, 0, largura * 0.46, altura * 0.42, largura * 0.72);
        g.addColorStop(0, 'rgba(255,214,150,0.05)'); g.addColorStop(0.55, 'rgba(40,24,8,0)'); g.addColorStop(1, 'rgba(25,14,4,0.42)');
        x.fillStyle = g; x.fillRect(0, 0, largura, altura); }
      const graos = [0, 1, 2].map((n) => {
        const cv = novaTela(largura, altura), x = cv.getContext('2d'), img = x.createImageData(largura, altura), d = img.data, ac = sorteio(SEM * 17 + n);
        for (let i = 0; i < d.length; i += 4) { const v = 128 + (ac() - 0.5) * 90; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        x.putImageData(img, 0, 0); return cv;
      });

      // ---------- desenhar(t): monta a colagem do instante t. Não guarda nada entre quadros. ----------
      function desenhar(t) {
        const { idx, tq } = pose(t);
        IDX = idx;
        const cam = camera(tq);
        cam.x += (h2(idx, 3) - 0.5) * 1.2; cam.y += (h2(idx, 4) - 0.5) * 1.2;   // a mesa de fotos nunca para no mesmo lugar
        const base = (zz, cx, cy) => c.setTransform(zz * k, 0, 0, zz * k, k * 960 - cx * zz * k, k * 540 - cy * zz * k);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        base(cam.zoom, cam.x, cam.y);
        c.drawImage(mesa, MESA.x, MESA.y, MESA.w, MESA.h);
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(8, 12, L, A);                       // sombra da folha no cartão
        c.drawImage(folha, 0, 0, L, A);
        c.save(); c.beginPath(); c.rect(0, 0, L, A); c.clip();
        const solto = 1 - cam.plano;
        for (const item of cena) {
          const f = (H.camadas || {})[item.camada] || 0, ff = f * solto;
          base(Math.exp(Math.log(cam.zoom) * (1 - 0.6 * ff)), 960 + (cam.x - 960) * (1 - ff), 540 + (cam.y - 540) * (1 - ff));
          item.desenha(tq, idx);
        }
        c.restore();
        base(cam.zoom, cam.x, cam.y);
        if (fitas) CANTOS.forEach(([x, y, r], i) => {
          if (i < 3 || tq >= fitas.cola) { const e = i < 3 ? 1 : saiDevagar(trecho(tq, fitas.cola, fitas.cola + 0.35)); cola(fitaF[i], x + (1 - e) * 260, y + (1 - e) * 160, { rot: r, lev: 0.9 * (1 - e), alfa: 0.9, sombra: 0.4 }); }
        });
        // câmera de mesa: luz que cai nas bordas e grão do filme
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(luz, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.16; c.drawImage(graos[idx % 3], 0, 0);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      }

      // ---------- som: caixinha de música e barulhos de papel nas MESMAS marcas da imagem ----------
      function som() {
        const s = Som.criar(duracao, SEM), M = H.musica || {};
        for (const [n, t, d] of (M.notas || [])) { s.sino(n, t, d * 2.2, { vol: 0.11, brilho: 1.6, pan: -0.15 }); s.sino(n, t + 0.004, d * 1.4, { vol: 0.025, brilho: 3 }); }
        const papel = (t, vol = 0.05, dur = 0.3) => { s.vento(t, dur, { vol, corte: 3200, onda: 3, entra: 0.03, sai: dur * 0.7, profundidade: 0.3 }); s.toque(t + dur * 0.8, { vol: vol * 0.8, corte: 2400, dur: 0.05 }); };
        for (const m of somMarcas) {
          const [tipo, a, b] = m;
          if (tipo === 'papel') papel(a, 0.05, 0.35);
          else if (tipo === 'sobe') { for (let t = a; t < b; t += 0.4) papel(t, 0.025, 0.2); }
          else if (tipo === 'janelas') { m.slice(1).forEach((t, i) => { if (i % 6 === 0) s.toque(t, { vol: 0.02, corte: 5000, dur: 0.02, pan: (i % 12 ? 0.3 : -0.3) }); }); }
          else if (tipo === 'bonde') { s.vento(a, b - a, { vol: 0.05, corte: 260, onda: 0.4, entra: 1.2, sai: 1.2 }); for (let t = a + 0.2; t < b; t += 0.36) s.toque(t, { vol: 0.03 * Math.sin(Math.PI * trecho(t, a, b)), corte: 1200, dur: 0.03 }); }
          else if (tipo === 'gato') papel(a, 0.03, 0.16);
          else if (tipo === 'salto') { s.vento(a, b - a + 0.15, { vol: 0.08, corte: 1800, onda: 2, entra: 0.08, sai: 0.15 }); s.batida(b, { vol: 0.16, freq: 150, dur: 0.12 }); }
          else if (tipo === 'passaros') { for (let i = 0; i < 14; i++) s.toque(a + i * 0.045, { vol: 0.035, corte: 3600, dur: 0.035, pan: (i % 2 ? 0.5 : -0.2) }); s.pio(a + 0.1, { vol: 0.03, freq: 3800, repete: 3 }); s.pio(a + 0.35, { vol: 0.025, freq: 4400, repete: 2, pan: 0.4 }); }
        }
        if (fitas) { s.batida(fitas.cola + 0.33, { vol: 0.22, freq: 95, dur: 0.18 }); s.toque(fitas.cola + 0.33, { vol: 0.05, corte: 2000, dur: 0.06 }); }
        s.sala(0.3);
        return s.fim({ entra: 0.2, sai: 0.8 });
      }

      return { desenhar, som };
    },
  });
})();
