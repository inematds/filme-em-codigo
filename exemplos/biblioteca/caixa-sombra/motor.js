// MOTOR "caixa-sombra" — recorte de papel em caixa de sombra, vertical, com legenda.
// Jeito de animar: camadas planas de papel empilhadas em profundidade. Cada folha joga uma sombra macia
// na folha de trás (é ela que dá o volume), tem grão de papel e borda cortada à mão. A luz vem de trás:
// um astro em anéis lá no alto e lanternas de papel que brilham. A câmera desliza devagar e as folhas da
// frente andam mais que as do fundo. O boneco (polvo.js) muda de pose de 2 em 2 quadros, como stop-motion.
// Troca de plano de dois jeitos: a câmera entra pela janela recortada na cabeça do boneco, ou uma folha
// rasgada sobe e cobre a cena velha com a nova. A fala do filme vira legenda de papel (letras em traços).
// O que muda de um filme para outro está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, entraDevagar, sorteio, ruido } = Filme;
  const L = 1080, A = 1920, TAU = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 15,
    montar({ historia: H, tela, largura, altura, duracao }) {
      const k = largura / L;                 // a tela real pode ser menor (os testes usam 360x640)
      const c = tela.getContext('2d');
      const PA = H.paleta, COR = (n) => PA[n] || n;
      const SEM = H.semente || 1;
      const papel = Papel.criar(SEM);
      const peca = (x, P, cor, o = {}) => papel.peca(x, P, COR(cor), { k, ...o });
      const polvo = Polvo.criar(PA, SEM, papel, k);
      const { recorta, caminho, elipse, gota: formaGota } = Papel;
      const POSES = H.poses_por_segundo || 15;
      const passoPose = (t) => Math.floor(t * POSES + 1e-6) / POSES;
      const PL = H.planos, CN = H.cenas;
      // tela de apoio para as trocas de plano (a cena nova é desenhada nela e colada por cima)
      const apoio = document.createElement('canvas'); apoio.width = largura; apoio.height = altura;
      const ca = apoio.getContext('2d');

      // ---------- letras: confere ao montar, para nenhuma letra sumir sem aviso ----------
      const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
      const ESPACO = 0.78, ENTRE = 0.2;
      const largTexto = (txt, tam) => { let w = 0; for (const ch of txt) { const g = glifo(ch); w += g ? g.w + ENTRE : ESPACO; } return Math.max(0, w - ENTRE) * tam; };
      (function confereLetras() {
        const G = CN.gota || {};
        const textos = (H.legendas || []).map((l) => l.texto);
        for (const q of [G.o2, G.cobre, G.ferro]) if (q && q.texto) textos.push(q.texto);
        const falta = new Set();
        for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
        if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
      })();

      // ---------- legendas: palavras entram uma a uma; a da vez em amarelo ----------
      const LG = H.legenda, FIM = duracao - (H.fimEscuro || 0.3), POP = 0.12, SOME = 0.14;
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tx = lg.texto.toUpperCase(), palavras = tx.split(/\s+/), linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && largTexto(tenta, LG.tam) > LG.largura) { linhas.push(atual); atual = [p]; } else atual.push(p); }
        if (atual.length) linhas.push(atual);
        const passo = lg.passo || LG.passo;
        // regra: a legenda fica pelo menos 0,5 s inteira na tela (última palavra assentada, antes de começar a sumir)
        const completa = lg.de + (palavras.length - 1) * passo + Math.max(passo, POP);
        const sai = Math.min(lg.ate, FIM) - SOME;
        if (completa + 0.5 > sai + 1e-6) throw new Error(`Legenda "${lg.texto}" fica inteira só ${(sai - completa).toFixed(2)} s (mínimo 0,5 s).`);
        return { ...lg, linhas, passo, n: palavras.length };
      });

      // escreve um texto com as letras em traços, como tiras de papel (cada letra um pouco torta)
      function escreve(x, txt, px, py, tam, cor, o = {}) {
        const larg = tam * (o.grossura || 0.17), semente = o.semente || 0;
        const passa = (dx, dy, cr, lw) => {
          x.strokeStyle = cr; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
          let ax = px, i = 0;
          for (const ch of txt) {
            const g = glifo(ch); i++;
            if (!g) { ax += ESPACO * tam; continue; }
            const rot = 0.05 * ruido(i * 1.9 + semente, 41), sobe = tam * 0.03 * ruido(i * 2.7 + semente, 43);
            x.save(); x.translate(ax + g.w * tam / 2 + dx, py - tam / 2 + sobe + dy); x.rotate(rot);
            x.beginPath();
            for (const tr of g.tracos) tr.forEach(([a, b], j) => { const qx = (a - g.w / 2) * tam, qy = (b - 0.5) * tam; j ? x.lineTo(qx, qy) : x.moveTo(qx, qy); if (tr.length === 1) x.lineTo(qx + 0.01, qy); });
            x.stroke(); x.restore();
            ax += (g.w + ENTRE) * tam;
          }
        };
        if (o.sombra !== false) passa(tam * 0.05, tam * 0.075, 'rgba(4,10,28,0.62)', larg * 1.15);
        passa(0, 0, cor, larg);
      }
      const pula = (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);   // passa do ponto e volta
      function legenda(t) {
        const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate); if (!lg) return;
        const sai = limita((Math.min(lg.ate, FIM) - t) / SOME);
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1;
        const tam = LG.tam, alt = tam * 1.4, y0 = LG.y - (lg.linhas.length - 1) * alt / 2;
        let n = 0;
        lg.linhas.forEach((ln, li) => {
          let x = (L - largTexto(ln.join(' '), tam)) / 2;
          const y = y0 + li * alt;
          ln.forEach((p) => {
            const tp = lg.de + n * lg.passo; n++;
            const wp = largTexto(p, tam);
            if (t >= tp) {
              const kk = limita((t - tp) / POP), s = 0.8 + 0.2 * pula(kk);
              const daVez = t < tp + lg.passo || (n === lg.n && t < tp + 0.45);
              c.save(); c.globalAlpha = limita(kk * 2) * sai;
              c.translate(x + wp / 2, y - tam * 0.5); c.scale(s, s); c.translate(-(x + wp / 2), -(y - tam * 0.5));
              escreve(c, p, x, y, tam, COR(daVez ? LG.fala : LG.cor), { semente: n * 3 });
              c.restore();
            }
            x += wp + ESPACO * tam;
          });
        });
      }

      // ---------- tempo: canais com chaves [t, valor], curva suave entre elas ----------
      function canal(lista, t, padrao = 0) {
        if (!lista || !lista.length) return padrao;
        if (t <= lista[0][0]) return lista[0][1];
        for (let i = 0; i < lista.length - 1; i++) {
          const [t0, v0] = lista[i], [t1, v1] = lista[i + 1];
          if (t < t1) return mistura(v0, v1, suave(trecho(t, t0, t1)));
        }
        return lista[lista.length - 1][1];
      }
      // batida do coração: sobe rápido e cai (a lista vem da história, a mesma que faz o som)
      const pulso = (lista, t) => { let v = 0; for (const b of lista || []) if (t >= b) v = Math.max(v, Math.exp(-(t - b) * 7)); return v; };

      // ---------- câmera ----------
      const PV = (CN.mar || {}).polvo || {};
      const polvoEm = (t) => ({ x: canal(PV.x, t, 540), y: canal(PV.y, t, 1300), esc: canal(PV.esc, t, 1), rot: canal(PV.rot, t, 0) });
      function camera(P, t) {
        const C = P.camera;
        if (Array.isArray(C)) {
          const ch = (campo) => canal(C.map((q) => [q.t, q[campo]]), t);
          return { x: ch('x'), y: ch('y'), z: ch('z') };
        }
        if (C.segue === 'polvo') {          // a câmera vai atrás do boneco (com folga: f < 1)
          const p = polvoEm(t);
          return { x: C.base[0] + (p.x - C.ancora[0]) * C.f[0], y: C.base[1] + (p.y - C.ancora[1]) * C.f[1], z: C.z || 1 };
        }
        return { x: L / 2, y: A / 2, z: 1 };
      }
      // põe a folha de profundidade p na frente da câmera (p = 1: anda junto com o boneco; < 1: fundo; > 1: frente)
      function poe(x, cam, p) {
        const zp = Math.exp(Math.log(cam.z) * p), cx = L / 2 + (cam.x - L / 2) * p, cy = A / 2 + (cam.y - A / 2) * p;
        x.setTransform(k * zp, 0, 0, k * zp, k * (L / 2 - cx * zp), k * (A / 2 - cy * zp));
      }

      // ---------- peças fixas, recortadas uma vez ----------
      const MAR = (CN.mar || {}).pecas || [];
      const fixo = new Map();
      MAR.forEach((q, i) => {
        if (q.tipo === 'morro' || q.tipo === 'chao') {
          const pts = [], x0 = -900, x1 = L + 900, n = 120;
          for (let j = 0; j <= n; j++) {
            const x = x0 + (x1 - x0) * j / n;
            const y = q.y + q.amp * (q.tipo === 'morro' ? 0.8 * ruido(x / 260, q.semente) + 0.35 * ruido(x / 70, q.semente + 1) : 0.6 * ruido(x / 340, q.semente) + 0.2 * ruido(x / 60, q.semente + 2));
            pts.push([x, y]);
          }
          pts.push([x1, q.y + 3000], [x0, q.y + 3000]);
          fixo.set(i, caminho(recorta(pts, 1.5, q.semente + 5)));
        }
        if (q.tipo === 'astro') fixo.set(i, Array.from({ length: q.aneis }, (_, j) => caminho(recorta(elipse(0, 0, q.r * (1 - j * 0.2), q.r * (1 - j * 0.2), 90), 3, 70 + j))));
        if (q.tipo === 'peixe') {
          const t = q.tam, pts = [];
          for (let j = 0; j < 40; j++) { const a = TAU * j / 40; pts.push([t * 0.5 * Math.cos(a), t * 0.2 * Math.sin(a)]); }
          const corpo = caminho(recorta(pts, 0.8, 90));
          const rabo = caminho([[-t * 0.45, 0], [-t * 0.78, -t * 0.2], [-t * 0.72, 0], [-t * 0.78, t * 0.2]]);
          fixo.set(i, [corpo, rabo]);
        }
      });

      // alga: tira ondulada com lóbulos, que balança mais na ponta (feita a cada pose)
      function alga(x, q, ts) {
        const n = 22, E = [], D = [];
        for (let j = 0; j <= n; j++) {
          const u = j / n, y = q.y - q.alt * u;
          const bal = 46 * Math.pow(u, 1.5) * Math.sin(ts * 0.9 + q.fase + u * 2.2) + 14 * Math.sin(ts * 1.7 + q.fase * 3 + u * 5) * u;
          const w = q.larg * (1 - 0.75 * Math.pow(u, 1.3)) * (0.78 + 0.22 * Math.sin(u * 16 + q.fase * 2)) * (1 + 0.04 * ruido(j * 1.3, q.fase * 10));
          E.push([q.x + bal - w / 2, y]); D.push([q.x + bal + w / 2, y]);
        }
        const P = new Path2D();
        E.forEach(([a, b], j) => (j ? P.lineTo(a, b) : P.moveTo(a, b)));
        for (let j = n; j >= 0; j--) P.lineTo(D[j][0], D[j][1]);
        P.closePath();
        peca(x, P, q.cor, { alto: 1, sombra: 0.42 });
      }

      // ---------- CENA "mar": fundo do mar em folhas, com o polvo ----------
      function cenaMar(x, t, ts, cam) {
        poe(x, cam, 0.1);
        const g = x.createLinearGradient(0, -700, 0, 1900);
        g.addColorStop(0, PA.agua1); g.addColorStop(0.5, PA.agua2); g.addColorStop(1, PA.agua3);
        x.fillStyle = g; x.fillRect(-1500, -3000, L + 3000, A + 6000);
        MAR.forEach((q, i) => {
          poe(x, cam, q.prof);
          if (q.tipo === 'astro') {
            x.save(); x.translate(q.x, q.y);
            x.save(); x.globalCompositeOperation = 'lighter';
            const gl = x.createRadialGradient(0, 0, q.r * 0.3, 0, 0, q.r * 2.6);
            gl.addColorStop(0, 'rgba(244,231,204,0.35)'); gl.addColorStop(1, 'rgba(244,231,204,0)');
            x.fillStyle = gl; x.fillRect(-q.r * 3, -q.r * 3, q.r * 6, q.r * 6); x.restore();
            fixo.get(i).forEach((P, j) => peca(x, P, Filme.cor(PA.agua1, PA.creme, 0.35 + 0.17 * j), { alto: 0.8, sombra: 0.3, fio: 0.15 }));
            x.restore();
          } else if (q.tipo === 'raios') {
            x.save(); x.globalCompositeOperation = 'lighter';
            for (let j = 0; j < q.n; j++) {
              const a = Math.PI / 2 + (j - (q.n - 1) / 2) * 0.17 + 0.03 * Math.sin(ts * 0.6 + j * 1.7), w = 0.035 + 0.015 * Math.sin(j * 2.3);
              x.fillStyle = `rgba(244,231,204,${0.05 + 0.025 * Math.sin(ts * 0.8 + j)})`;
              x.beginPath(); x.moveTo(q.x, q.y);
              x.lineTo(q.x + Math.cos(a - w) * 2600, q.y + Math.sin(a - w) * 2600); x.lineTo(q.x + Math.cos(a + w) * 2600, q.y + Math.sin(a + w) * 2600);
              x.closePath(); x.fill();
            }
            x.restore();
          } else if (q.tipo === 'morro' || q.tipo === 'chao') {
            peca(x, fixo.get(i), q.cor, { alto: q.tipo === 'chao' ? 1.3 : 1, sombra: 0.5 });
          } else if (q.tipo === 'alga') {
            alga(x, q, ts);
          } else if (q.tipo === 'peixe') {
            if (t < q.de || t > q.ate + 0.5) return;
            const u = trecho(ts, q.de, q.ate), px = mistura(q.x0, q.x1, u), py = q.y + 18 * Math.sin(ts * 3);
            const [corpo, rabo] = fixo.get(i);
            x.save(); x.translate(px, py); x.rotate(0.06 * Math.sin(ts * 6));
            peca(x, rabo, PA.creme, { alto: 0.5, sombra: 0.3, fio: 0 }); peca(x, corpo, PA.creme, { alto: 0.5, sombra: 0.3 });
            x.fillStyle = PA.marinhoEsc; x.beginPath(); x.arc(q.tam * 0.28, -q.tam * 0.04, q.tam * 0.05, 0, TAU); x.fill();
            x.restore();
          } else if (q.tipo === 'bolhas') {
            const B = new Path2D(), faixa = q.y1 - q.y0;
            for (let j = 0; j < q.n; j++) {
              const ac = sorteio(SEM * 100 + j), h1 = ac(), h2 = ac(), h3 = ac(), h4 = ac();
              const y = q.y1 - (((ts * q.vel * (0.7 + 0.6 * h2) + h3 * faixa) % faixa) + faixa) % faixa;
              const bx = q.x0 + h1 * (q.x1 - q.x0) + 16 * Math.sin(ts * 2 + j * 1.3), r = 5 + 9 * h4;
              B.moveTo(bx + r, y); B.arc(bx, y, r, 0, TAU);
            }
            x.fillStyle = 'rgba(244,231,204,0.28)'; x.fill(B);
            x.strokeStyle = 'rgba(244,231,204,0.75)'; x.lineWidth = 3; x.stroke(B);
          } else if (q.tipo === 'polvo') {
            const p = polvoEm(t);
            x.translate(p.x, p.y); x.rotate(p.rot); x.scale(p.esc, p.esc);
            polvo.desenha(x, estadoPolvo(t, ts));
          }
        });
      }
      function estadoPolvo(t, ts) {
        return {
          t: ts, nado: canal(PV.nado, ts), cansa: canal(PV.cansa, ts), anda: canal(PV.anda, ts), luz: canal(PV.luz, ts, 1),
          pulso: pulso(PV.batidas, ts) * canal(PV.luz, ts, 1), pulsoG: pulso(PV.batidasGuelras, ts),
        };
      }

      // ---------- CENA "arco": dentro da cabeça, o arco de papel com os três corações ----------
      const AR = CN.arco || {};
      const fixoArco = (() => {
        if (!AR.furo) return null;
        const F = AR.furo;
        const furo = (r, sem) => {
          const p = [];
          for (let j = 0; j <= 40; j++) { const a = Math.PI + Math.PI * j / 40; p.push([F.x + r * Math.cos(a), F.y + r * Math.sin(a)]); }
          for (let j = 1; j <= 20; j++) p.push([F.x + r, F.y + (A + 900 - F.y) * j / 20]);
          for (let j = 1; j <= 20; j++) p.push([F.x + r - 2 * r * j / 20, A + 900]);
          for (let j = 1; j < 20; j++) p.push([F.x - r, A + 900 - (A + 900 - F.y) * j / 20]);
          return recorta(p, 3, sem);
        };
        const folha = (r, sem) => {
          const P = new Path2D();
          P.rect(-1200, -1600, L + 2400, A + 3200);
          [...furo(r, sem)].reverse().forEach(([a, b], j) => (j ? P.lineTo(a, b) : P.moveTo(a, b))); P.closePath();
          return P;
        };
        // pente das brânquias: tiras em zigue-zague
        const tira = caminho(recorta([[-80, -13], [80, -13], [80, 13], [-80, 13]].flatMap(([a, b], j, arr) => {
          const [c2, d2] = arr[(j + 1) % 4]; return [0, 1, 2, 3, 4, 5].map((s) => [a + (c2 - a) * s / 6, b + (d2 - b) * s / 6]);
        }), 1.4, 61));
        return { frente: folha(F.r, 51), tras: folha(F.r + 36, 52), fundo: folha(F.r + 80, 53), tira };
      })();
      function curvaPts(pts, n = 40) {   // curva macia passando pelos pontos (Catmull-Rom)
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
          for (let j = 0; j < n; j++) {
            const u = j / n, u2 = u * u, u3 = u2 * u;
            out.push([0, 1].map((e) => 0.5 * (2 * p1[e] + (-p0[e] + p2[e]) * u + (2 * p0[e] - 5 * p1[e] + 4 * p2[e] - p3[e]) * u2 + (-p0[e] + 3 * p1[e] - 3 * p2[e] + p3[e]) * u3)));
          }
        }
        out.push(pts[pts.length - 1]);
        return out;
      }
      const TUBOS = (AR.tubos || []).map((tb) => curvaPts(tb));
      function cenaArco(x, t, ts, cam) {
        const F = AR.furo, X = fixoArco;
        x.setTransform(k, 0, 0, k, 0, 0); x.fillStyle = PA.marinhoEsc; x.fillRect(0, 0, L, A);
        poe(x, cam, 0.8);
        // brilho de trás: o coração principal acende a sala inteira
        const pp = pulso(AR.batidasPrincipal, ts), pg = pulso(AR.batidasGuelras, ts);
        x.save(); x.globalCompositeOperation = 'lighter';
        const gl = (gx, gy, r, cor, a) => { const g = x.createRadialGradient(gx, gy, r * 0.1, gx, gy, r); g.addColorStop(0, Papel.rgba(cor, a)); g.addColorStop(1, Papel.rgba(cor, 0)); x.fillStyle = g; x.fillRect(gx - r, gy - r, 2 * r, 2 * r); };
        gl(AR.principal.x, AR.principal.y, 520, PA.amarelo, 0.1 + 0.22 * pp);
        for (const G of AR.guelras) gl(G.x, G.y, 240, PA.coralClaro, 0.05 + 0.2 * pg);
        x.restore();
        poe(x, cam, 0.9);
        // tubos verdes com o sangue (pontinhos azuis) correndo
        x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
        const m = x.getTransform(), s = Math.hypot(m.a, m.b);
        TUBOS.forEach((tb) => {
          const P = new Path2D(); tb.forEach(([a, b], j) => (j ? P.lineTo(a, b) : P.moveTo(a, b)));
          x.shadowColor = 'rgba(4,10,26,0.5)'; x.shadowBlur = 12 * s; x.shadowOffsetY = 7 * s; x.shadowOffsetX = 3 * s;
          x.strokeStyle = PA.tealEsc; x.lineWidth = 30; x.stroke(P);
          x.shadowColor = 'rgba(0,0,0,0)'; x.strokeStyle = PA.verde; x.lineWidth = 20; x.stroke(P);
        });
        x.restore();
        const SG = new Path2D();
        TUBOS.forEach((tb, ti) => {
          let tot = 0; const cum = [0];
          for (let j = 1; j < tb.length; j++) { tot += Math.hypot(tb[j][0] - tb[j - 1][0], tb[j][1] - tb[j - 1][1]); cum.push(tot); }
          for (let d = ((ts * 140 + ti * 23) % 52); d < tot; d += 52) {
            let j = 1; while (j < cum.length - 1 && cum[j] < d) j++;
            const u = (d - cum[j - 1]) / (cum[j] - cum[j - 1] || 1), px = mistura(tb[j - 1][0], tb[j][0], u), py = mistura(tb[j - 1][1], tb[j][1], u);
            SG.moveTo(px + 8, py); SG.arc(px, py, 8, 0, TAU);
          }
        });
        x.fillStyle = PA.gota[3]; x.fill(SG);
        // pentes das brânquias (respiram)
        for (const G of AR.guelras) {
          const [gx, gy] = G.pente, resp = 1 + 0.07 * Math.sin(TAU * 0.9 * ts);
          for (let j = 0; j < 9; j++) {
            x.save(); x.translate(gx, gy + (j - 4) * 34 * resp); x.rotate((j % 2 ? 0.22 : -0.22) * (gx < L / 2 ? 1 : -1));
            peca(x, X.tira, j % 2 ? PA.verde : PA.teal, { alto: 0.7, sombra: 0.45, fio: 0.2 });
            x.restore();
          }
        }
        // os três corações-lanterna
        poe(x, cam, 0.95);
        const P0 = AR.principal, esc = P0.tam / 64;
        x.save(); x.translate(P0.x, P0.y); x.scale(esc, esc);
        polvo.lanterna(x, polvo.coracaoGrande, 0, 0, 64, PA.amarelo, 1, pp, (F.y - F.r - P0.y) / esc);
        x.restore();
        for (const G of AR.guelras) {
          const e = G.tam / 64;
          x.save(); x.translate(G.x, G.y); x.scale(e, e);
          polvo.lanterna(x, polvo.coracaoGrande, 0, 0, 64, PA.coralClaro, 1, pg, (F.y - F.r - G.y) / e);
          x.restore();
        }
        // o arco de papel em três folhas (a de trás com o furo maior: dá a profundidade da caixa)
        poe(x, cam, 1.0); peca(x, X.fundo, PA.coralEsc, { alto: 1.0, sombra: 0.55 });
        poe(x, cam, 1.06); peca(x, X.tras, PA.coralEsc2, { alto: 1.2, sombra: 0.55 });
        poe(x, cam, 1.12); peca(x, X.frente, PA.coral, { alto: 1.5, sombra: 0.6, fio: 0.25 });
      }

      // ---------- CENA "gota": a gota de sangue azul em quatro camadas ----------
      const GO = CN.gota || {};
      const fixoGota = (() => {
        if (!GO.gota) return null;
        const g = GO.gota;
        const camadas = [1, 0.8, 0.6, 0.4].map((e, j) => caminho(recorta(formaGota(g.larg * e, g.alt * e), 2.5, 80 + j)));
        const disco = (r, sem) => caminho(recorta(elipse(0, 0, r, r, 60), 1.6, sem));
        const fundoDiscos = [[260, 620, 520], [860, 1320, 560], [700, 260, 300]].map(([a, b, r], j) => ({ x: a, y: b, P: disco(r, 85 + j) }));
        const pontos = new Path2D(), ac = sorteio(SEM + 7);
        for (let j = 0; j < 120; j++) { const px = -200 + ac() * 1500, py = -200 + ac() * 2300, r = 10 + ac() * 18; pontos.moveTo(px + r, py); pontos.arc(px, py, r, 0, TAU); }
        const ondas = [1690, 1790].map((y, j) => {
          const pts = [];
          for (let i = 0; i <= 80; i++) { const px = -700 + i * 2500 / 80; pts.push([px, y + 34 * Math.sin(px / 150 + j * 2) + 10 * ruido(px / 40, j)]); }
          pts.push([1800, y + 2000], [-700, y + 2000]); return caminho(pts);
        });
        const brilho = caminho(recorta(elipse(0, 0, 26, 64, 40), 1.2, 88));
        const X = new Path2D(); X.rect(-7, -98, 14, 196);
        return { camadas, disco, fundoDiscos, pontos, ondas, brilho, o2: disco(GO.o2.tam / 2, 91), cobre: disco(GO.cobre.r, 92), ferro: disco(GO.ferro.r, 93), X };
      })();
      function cenaGota(x, t, ts, cam) {
        const X = fixoGota, g = GO.gota;
        x.setTransform(k, 0, 0, k, 0, 0); x.fillStyle = PA.marinho; x.fillRect(0, 0, L, A);
        poe(x, cam, 0.3);
        x.fillStyle = 'rgba(8,18,42,0.2)'; x.fill(X.pontos);
        X.fundoDiscos.forEach((d) => { x.save(); x.translate(d.x, d.y); peca(x, d.P, Filme.cor(PA.marinho, PA.marinhoEsc, 0.45), { alto: 0.7, sombra: 0.3, fio: 0.06 }); x.restore(); });
        poe(x, cam, 0.8); peca(x, X.ondas[0], PA.tealEsc, { alto: 1, sombra: 0.5 });
        // a gota: balança devagar e amassa um pouco quando "pousa"
        poe(x, cam, 1.0);
        const amassa = Math.exp(-Math.max(0, ts - g.pousa) * 6) * (ts >= g.pousa ? 1 : 0);
        x.save(); x.translate(g.x, g.y + 12 * Math.sin(TAU * 0.35 * ts)); x.rotate(0.03 * Math.sin(TAU * 0.25 * ts));
        x.scale(1 + 0.07 * amassa, 1 - 0.08 * amassa);
        X.camadas.forEach((P, j) => { x.save(); x.translate(0, g.larg * 0.06 * j); peca(x, P, PA.gota[j], { alto: 1.1, sombra: 0.5, fio: 0.2 }); x.restore(); });
        x.save(); x.translate(-g.larg * 0.18, -g.larg * 0.05); x.rotate(0.35); peca(x, X.brilho, PA.creme, { alto: 0.4, sombra: 0.3, fio: 0 }); x.restore();
        x.restore();
        // cobre: um disco que gira no lugar (de lado para de frente)
        const CB = GO.cobre;
        if (t >= CB.de) {
          const e = pula(limita(trecho(ts, CB.de, CB.de + 0.4)));
          x.save(); x.translate(CB.x, CB.y); x.scale(Math.max(0.02, e), 1);
          peca(x, X.cobre, PA.coral, { alto: 1.2, sombra: 0.55, fio: 0.25 });
          const tm = CB.r * 0.36; escreve(x, CB.texto, -largTexto(CB.texto, tm) / 2, tm / 2, tm, PA.creme, { sombra: false, grossura: 0.2, semente: 5 });
          x.restore();
        }
        // O2: discos que chegam de fora do quadro e ficam rodando em volta
        const O = GO.o2;
        if (t >= O.de) for (let j = 0; j < O.n; j++) {
          const d0 = O.de + j * 0.1, kk = saiDevagar(trecho(ts, d0, d0 + O.chega));
          if (kk <= 0) continue;
          const a = TAU * j / O.n - Math.PI / 2 + 0.3 * (ts - O.de), r = mistura(1250, O.r, kk);
          x.save(); x.translate(O.cx + Math.cos(a) * r, O.cy + Math.sin(a) * r); x.rotate(0.1 * Math.sin(ts * 2 + j));
          peca(x, X.o2, PA.creme, { alto: 1.0, sombra: 0.5 });
          const tm = O.tam * 0.42; escreve(x, O.texto, -largTexto(O.texto, tm) / 2, tm / 2, tm, PA.marinho, { sombra: false, grossura: 0.2, semente: j });
          x.restore();
        }
        // ferro: entra pela direita, leva um X e sai
        const FE = GO.ferro;
        if (t >= FE.de && t < FE.sai + 0.6) {
          const ent = saiDevagar(trecho(ts, FE.de, FE.de + 0.3)), sai = entraDevagar(trecho(ts, FE.sai, FE.sai + 0.35));
          const px = mistura(L + FE.r + 220, FE.x, ent) + (L + FE.r + 220 - FE.x) * sai;
          x.save(); x.translate(px, FE.y); x.rotate(-0.15 + 0.15 * ent);
          peca(x, X.ferro, PA.cinza, { alto: 1.2, sombra: 0.55 });
          if (ts >= FE.risca) {
            const e = pula(limita(trecho(ts, FE.risca, FE.risca + 0.18)));
            for (const r of [0.78, -0.78]) { x.save(); x.rotate(r); x.scale(1, e); peca(x, X.X, PA.coral, { alto: 1.0, sombra: 0.5 }); x.restore(); }
          }
          const tm = FE.r * 0.36; escreve(x, FE.texto, -largTexto(FE.texto, tm) / 2, tm / 2, tm, PA.marinhoEsc, { sombra: false, grossura: 0.2, semente: 9 });
          x.restore();
        }
        poe(x, cam, 1.15); peca(x, X.ondas[1], PA.teal, { alto: 1.4, sombra: 0.55 });
      }

      const CENAS = { mar: cenaMar, arco: cenaArco, gota: cenaGota };
      function cena(x, P, t) {
        x.reset();
        CENAS[P.cena](x, t, passoPose(t), camera(P, t));
      }

      // ---------- trocas de plano ----------
      // 1) janela: a câmera entra pela janela da cabeça do polvo; a cena nova aparece lá dentro
      function trocaJanela(P, Q, t) {
        const de = P.sai.de, ate = P.ate, u = trecho(t, de, ate);
        const c0 = camera(P, de), p = polvoEm(t), st = estadoPolvo(t, passoPose(t));
        // centro da janela no mundo (com a cabeça esticada como no desenho)
        const sy = 1 + 0.1 * st.nado - 0.06 * st.cansa;
        const jx = polvo.centroJanela[0], jy = (polvo.centroJanela[1] - 30) * sy + 30;
        const wx = p.x + (Math.cos(p.rot) * jx - Math.sin(p.rot) * jy) * p.esc, wy = p.y + (Math.sin(p.rot) * jx + Math.cos(p.rot) * jy) * p.esc;
        const cam = { x: mistura(c0.x, wx, saiDevagar(u)), y: mistura(c0.y, wy, saiDevagar(u)), z: Math.exp(mistura(Math.log(c0.z), Math.log(16), Math.pow(u, 1.8))) };
        c.reset();
        cenaMar(c, t, passoPose(t), cam);
        cena(ca, Q, t);
        c.save();
        poe(c, cam, 1); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(p.esc, p.esc); polvo.estica(c, st);
        c.clip(polvo.janela);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = limita(trecho(t, de + 0.1, de + 0.38));
        c.drawImage(apoio, 0, 0);
        c.restore();
      }
      // 2) cortina: uma folha rasgada sobe de baixo e traz a cena nova
      function trocaCortina(P, Q, t) {
        const u = suave(trecho(t, Q.de, Q.de + Q.entra.dur)), yb = mistura(A + 140, -160, u);
        cena(c, P, t);
        cena(ca, Q, t);
        const borda = new Path2D();
        for (let i = 0; i <= 60; i++) { const bx = -40 + i * (L + 80) / 60; const by = yb + 34 * Math.sin(bx * 0.011 + 1.3) + 12 * ruido(bx * 0.04, 17); i ? borda.lineTo(bx, by) : borda.moveTo(bx, by); }
        const regiao = new Path2D(borda); regiao.lineTo(L + 40, A + 400); regiao.lineTo(-40, A + 400); regiao.closePath();
        c.setTransform(k, 0, 0, k, 0, 0);
        c.save(); c.shadowColor = 'rgba(4,10,26,0.6)'; c.shadowBlur = 30 * k; c.shadowOffsetY = -12 * k;
        c.fillStyle = PA.marinhoEsc; c.fill(regiao); c.restore();
        c.save(); c.clip(regiao); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(apoio, 0, 0); c.restore();
        c.setTransform(k, 0, 0, k, 0, 0);
        c.strokeStyle = 'rgba(244,231,204,0.7)'; c.lineWidth = 5; c.translate(0, 3); c.stroke(borda);   // fiapo branco do rasgo
      }

      // ---------- acabamento: cantos mais escuros e grão por cima do quadro inteiro ----------
      const vinheta = document.createElement('canvas'); vinheta.width = largura; vinheta.height = altura;
      (() => {
        const v = vinheta.getContext('2d'), g = v.createRadialGradient(largura / 2, altura * 0.45, largura * 0.35, largura / 2, altura * 0.5, altura * 0.7);
        g.addColorStop(0, 'rgba(2,6,20,0)'); g.addColorStop(1, 'rgba(2,6,20,0.5)'); v.fillStyle = g; v.fillRect(0, 0, largura, altura);
      })();

      // ---------- desenhar(t): conta pura, nada guardado entre quadros ----------
      function desenhar(t) {
        c.reset(); ca.reset();
        let i = PL.findIndex((p) => t >= p.de && t < p.ate); if (i < 0) i = PL.length - 1;
        const P = PL[i];
        if (P.entra && P.entra.tipo === 'cortina' && i > 0 && t < P.de + P.entra.dur) trocaCortina(PL[i - 1], P, t);
        else if (P.sai && P.sai.tipo === 'janela' && t >= P.sai.de && i < PL.length - 1) trocaJanela(P, PL[i + 1], t);
        else cena(c, P, t);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.drawImage(vinheta, 0, 0);
        const pt = papel.padrao(c); pt.setTransform(new DOMMatrix([Math.max(1, 2 * k), 0, 0, Math.max(1, 2 * k), 0, 0]));
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.18; c.fillStyle = pt; c.fillRect(0, 0, largura, altura);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        legenda(t);
        // entra do escuro e termina no escuro
        const esc = Math.max(1 - trecho(t, 0, 0.25), trecho(t, FIM, duracao));
        if (esc > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.fillStyle = `rgba(3,7,18,${esc})`; c.fillRect(0, 0, largura, altura); }
      }

      // ---------- som: música calma e barulhos de papel e de água nas MESMAS marcas da imagem ----------
      function som() {
        const s = Som.criar(duracao, SEM), M = H.musica || {};
        const AC = M.acordes || [];
        AC.forEach(([t0, notas], j) => {
          const dur = (j + 1 < AC.length ? AC[j + 1][0] : duracao) - t0;
          notas.forEach((n, q) => s.nota(n, t0, dur, { vol: 0.03, forma: 'tri', ataque: 0.5, solta: 0.8, pan: (q - 1) * 0.3 }));
          s.nota(notas[0].replace(/\d/, (d) => String(Number(d) - 1)), t0, dur, { vol: 0.05, forma: 'seno', ataque: 0.3, solta: 0.6 });
        });
        for (const [n, t0, d] of (M.notas || [])) s.sino(n, t0, d * 2.4, { vol: 0.05, brilho: 1.3, pan: 0.2 });
        // corações: as mesmas listas de batidas que fazem as lanternas pulsar
        const bate = (t0, v, grave) => { s.batida(t0, { vol: 0.2 * v, freq: grave ? 72 : 96, dur: 0.22 }); s.batida(t0 + 0.15, { vol: 0.12 * v, freq: grave ? 62 : 84, dur: 0.18 }); };
        for (const b of PV.batidas || []) bate(b, 1, false);
        for (const b of AR.batidasGuelras || []) bate(b, 0.6, false);
        for (const b of AR.batidasPrincipal || []) bate(b, 1.25, true);
        const papelSom = (t0, dur, v = 1) => { s.vento(t0, dur, { vol: 0.05 * v, corte: 3200, onda: 3, entra: 0.05, sai: dur * 0.6, profundidade: 0.3 }); s.toque(t0 + dur * 0.7, { vol: 0.035 * v, corte: 2200, dur: 0.05 }); };
        const bolha = (t0, v = 1) => s.pio(t0, { freq: 520 + 300 * ((t0 * 7.3) % 1), sobe: 1.4, dur: 0.05, repete: 1, vol: 0.035 * v });
        for (const q of H.sons || []) {
          const t0 = q.t;
          if (q.tipo === 'bolhas') for (let j = 0; j < 6; j++) bolha(t0 + j * 0.17, 0.8);
          else if (q.tipo === 'entra') { s.vento(t0, q.dur, { vol: 0.06, corte: 900, onda: 1.2, entra: q.dur * 0.75, sai: 0.12, profundidade: 0.2 }); s.sino('A5', t0 + q.dur - 0.05, 1.2, { vol: 0.04, brilho: 1.8 }); }
          else if (q.tipo === 'papel') papelSom(t0, q.dur);
          else if (q.tipo === 'plop') { s.batida(t0, { vol: 0.14, freq: 300, dur: 0.1 }); bolha(t0 + 0.03, 1.4); }
          else if (q.tipo === 'discos') for (let j = 0; j < q.n; j++) { const ti = t0 + j * 0.1 + q.chega * 0.8; s.toque(ti, { vol: 0.04, corte: 2600, dur: 0.04, pan: (j % 2 ? 0.4 : -0.4) }); s.sino(['E6', 'G6', 'A6', 'C7', 'D7'][j % 5], ti, 0.4, { vol: 0.018 }); }
          else if (q.tipo === 'vira') { papelSom(t0, 0.25, 0.8); s.sino('A5', t0 + 0.2, 0.9, { vol: 0.045, brilho: 1.6 }); }
          else if (q.tipo === 'x') { s.batida(t0, { vol: 0.2, freq: 120, dur: 0.14 }); s.toque(t0, { vol: 0.07, corte: 1500, dur: 0.08 }); s.batida(t0 + 0.09, { vol: 0.16, freq: 110, dur: 0.12 }); }
          else if (q.tipo === 'nado') { s.vento(t0, q.dur, { vol: 0.2, corte: 650, onda: 0.9, entra: 0.2, sai: 0.5, profundidade: 0.25 }); for (let j = 0; j < 8; j++) bolha(t0 + 0.1 + j * 0.13, 1.2); }
          else if (q.tipo === 'para') { s.nota('A3', t0, 0.25, { vol: 0.07, forma: 'seno', ataque: 0.01, solta: 0.2 }); s.nota('E3', t0 + 0.28, 0.25, { vol: 0.07, forma: 'seno', ataque: 0.01, solta: 0.3 }); s.nota('A2', t0 + 0.56, 0.5, { vol: 0.08, forma: 'seno', ataque: 0.01, solta: 0.6 }); }
          else if (q.tipo === 'suspiro') { s.nota('D3', t0, 0.8, { vol: 0.04, forma: 'tri', ataque: 0.25, solta: 0.6 }); s.vento(t0, 1.0, { vol: 0.03, corte: 500, entra: 0.3, sai: 0.5 }); }
          else if (q.tipo === 'pousa') { s.batida(t0, { vol: 0.16, freq: 80, dur: 0.3 }); s.vento(t0, 0.6, { vol: 0.04, corte: 400, entra: 0.05, sai: 0.4 }); }
          else if (q.tipo === 'rasteja') { let j = 0; for (let tt = t0; tt < q.ate; tt += q.passo) s.toque(tt, { vol: 0.03, corte: 1100, dur: 0.05, pan: (j++ % 2 ? 0.3 : -0.3) }); }
          else if (q.tipo === 'acende') { ['F5', 'A5', 'D6'].forEach((n, j) => s.sino(n, t0 + j * 0.06, 1.4, { vol: 0.05, brilho: 1.5 })); }
        }
        s.sala(0.3);
        return s.fim({ entra: 0.2, sai: 0.6, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
