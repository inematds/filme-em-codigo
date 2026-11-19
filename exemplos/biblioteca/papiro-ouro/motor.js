// MOTOR "papiro-ouro" — rolo de papiro em nanquim e ouro.
// Jeito de animar: camadas-planas (desenho 2D em canvas), com um pincel próprio (pincel.js).
// O papiro é uma folha só e comprida: um rolo desenrola no começo, a câmera viaja por ela, corta,
// e num plano largo a folha gira 90 graus para a linha do tempo inteira caber em pé.
// Este arquivo sabe DESENHAR as peças (rainha, construtores, pirâmide, sol, lua, módulo lunar,
// pegada, colchete de ouro, carimbo, rótulos, contadores). O QUE aparece, ONDE e QUANDO está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio, ruido } = Filme;
  const { fita, pinta, escreve, estrela, caixa } = Pincel;
  const L = 1080, A = 1920; // tamanho "de desenho" (vertical); a tela real pode ser menor, a escala cuida
  const RAD = Math.PI / 180;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 15,
    montar({ historia: H, tela, largura, duracao, fps }) {
      const c = tela.getContext('2d');
      const k = largura / L;
      const P = H.paleta;
      const cor = (n) => P[n] || n;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const sai = (x) => 1 - Math.pow(1 - limita(x), 3);                // sai rápido, chega devagar
      const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); }; // passa do ponto e volta

      // ---------- câmera: chaves {t, x, y, z, giro}; "corte": true pula sem deslizar ----------
      const CH = (H.camera || [{ t: 0, x: L / 2, y: A / 2 }]).map((q) => ({ z: 1, giro: 0, ...q }));
      function camera(t) {
        let q = CH[0];
        for (let i = 0; i < CH.length; i++) if (CH[i].t <= t) q = CH[i]; else break;
        const i = CH.indexOf(q), b = CH[i + 1];
        // chaves com o mesmo t: vale a última (o corte)
        if (!b || b.corte || b.t <= q.t) {
          let j = i; while (CH[j + 1] && CH[j + 1].t === q.t) j++;
          return CH[j];
        }
        if (t < q.t) return q;
        const u = suave(trecho(t, q.t, b.t));
        return { x: mistura(q.x, b.x, u), y: mistura(q.y, b.y, u), z: mistura(q.z, b.z, u), giro: mistura(q.giro, b.giro, u) };
      }
      function matriz(cam) {
        const g = cam.giro * RAD, s = k * cam.z, a = s * Math.cos(g), b = s * Math.sin(g), cc = -b, d = a;
        return [a, b, cc, d, k * L / 2 - (a * cam.x + cc * cam.y), k * A / 2 - (b * cam.x + d * cam.y)];
      }
      const paraTela = (m, x, y) => [(m[0] * x + m[2] * y + m[4]) / k, (m[1] * x + m[3] * y + m[5]) / k];

      // ---------- texturas, feitas uma vez ----------
      // fibras do papiro (cruzadas), em unidades do mundo
      const TF = 512, fibras = novaTela(TF, TF);
      (function () {
        const fc = fibras.getContext('2d'), r = sorteio((H.semente || 1) * 31 + 1);
        fc.lineCap = 'round';
        for (let i = 0; i < 260; i++) { // horizontais
          const y = r() * TF, esc = r() < 0.5;
          fc.strokeStyle = esc ? `rgba(120,80,25,${0.08 + r() * 0.13})` : `rgba(255,236,180,${0.05 + r() * 0.10})`;
          fc.lineWidth = 1 + r() * 2.6; const x = r() * TF, comp = 120 + r() * 380;
          for (const dx of [0, -TF]) { fc.beginPath(); fc.moveTo(x + dx, y); fc.lineTo(x + dx + comp, y + (r() - 0.5) * 3); fc.stroke(); }
        }
        for (let i = 0; i < 200; i++) { // verticais
          const x = r() * TF, esc = r() < 0.5;
          fc.strokeStyle = esc ? `rgba(120,80,25,${0.06 + r() * 0.10})` : `rgba(255,236,180,${0.04 + r() * 0.08})`;
          fc.lineWidth = 1 + r() * 2.4; const y = r() * TF, comp = 120 + r() * 380;
          for (const dy of [0, -TF]) { fc.beginPath(); fc.moveTo(x, y + dy); fc.lineTo(x + (r() - 0.5) * 3, y + dy + comp); fc.stroke(); }
        }
        for (let i = 0; i < 900; i++) { fc.fillStyle = `rgba(90,55,20,${0.08 + r() * 0.25})`; fc.fillRect(r() * TF, r() * TF, 1 + r() * 2.5, 1 + r() * 2); }
      })();
      // manchas grandes e macias (tom do papiro), repetem a cada 1400
      const TM = 700, manchas = novaTela(TM, TM);
      (function () {
        const mc = manchas.getContext('2d'), r = sorteio((H.semente || 1) * 17 + 5);
        for (let i = 0; i < 40; i++) {
          const x = r() * TM, y = r() * TM, raio = 60 + r() * 200, clara = r() < 0.5;
          for (const dx of [-TM, 0, TM]) for (const dy of [-TM, 0, TM]) {
            const gr = mc.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, raio);
            gr.addColorStop(0, clara ? 'rgba(255,240,200,0.22)' : 'rgba(120,80,30,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            mc.fillStyle = gr; mc.fillRect(x + dx - raio, y + dy - raio, raio * 2, raio * 2);
          }
        }
      })();
      // folha de ouro: manchas claras e escuras (o ouro nunca é liso)
      const TO = 160, folhaOuro = novaTela(TO, TO);
      (function () {
        const oc = folhaOuro.getContext('2d'), r = sorteio((H.semente || 1) * 13 + 9);
        oc.fillStyle = cor('ouro'); oc.fillRect(0, 0, TO, TO);
        for (let i = 0; i < 70; i++) {
          const x = r() * TO, y = r() * TO, w = 8 + r() * 30, h = 6 + r() * 20, clara = r() < 0.55;
          oc.fillStyle = clara ? Filme.cor(cor('ouroClaro'), null, 0, 0.35 + r() * 0.4) : Filme.cor(cor('ouroEscuro'), null, 0, 0.2 + r() * 0.3);
          for (const dx of [-TO, 0, TO]) for (const dy of [-TO, 0, TO]) { oc.beginPath(); oc.ellipse(x + dx, y + dy, w / 2, h / 2, r() * 3, 0, Math.PI * 2); oc.fill(); }
        }
      })();
      const pFibras = c.createPattern(fibras, 'repeat'), pManchas = c.createPattern(manchas, 'repeat');
      const OURO = c.createPattern(folhaOuro, 'repeat');
      // luz quente no meio e cantos escuros (na tela)
      const vinheta = novaTela(tela.width, tela.height);
      (function () {
        const vc = vinheta.getContext('2d'), w = tela.width, h = tela.height;
        const g1 = vc.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.45);
        g1.addColorStop(0, 'rgba(255,236,190,0.16)'); g1.addColorStop(1, 'rgba(255,236,190,0)');
        vc.fillStyle = g1; vc.fillRect(0, 0, w, h);
        const g2 = vc.createRadialGradient(w / 2, h * 0.47, h * 0.3, w / 2, h * 0.5, h * 0.78);
        g2.addColorStop(0, 'rgba(40,20,5,0)'); g2.addColorStop(1, 'rgba(40,20,5,0.5)');
        vc.fillStyle = g2; vc.fillRect(0, 0, w, h);
      })();

      // ---------- o papiro: cor, manchas, fibras e emendas das tiras ----------
      function papiro(cam) {
        const R = 1200 / cam.z + 300; // raio do pedaço visível (com folga para o giro)
        const x0 = cam.x - R, x1 = cam.x + R, y0 = cam.y - R * 1.8, y1 = cam.y + R * 1.8;
        c.fillStyle = cor('papiro'); c.fillRect(x0, y0, x1 - x0, y1 - y0);
        c.save(); c.scale(2, 2); c.fillStyle = pManchas; c.fillRect(x0 / 2, y0 / 2, (x1 - x0) / 2, (y1 - y0) / 2); c.restore();
        c.globalAlpha = limita(cam.z * k * 1.6, 0.12, 1); // fibra miúda some no plano largo e na tela pequena (não vira listra)
        c.fillStyle = pFibras; c.fillRect(x0, y0, x1 - x0, y1 - y0);
        c.globalAlpha = 1;
        // emendas: tiras de papiro coladas (verticais a cada 380, horizontais a cada 760)
        c.lineCap = 'butt';
        for (let x = Math.floor(x0 / 380) * 380; x < x1; x += 380) {
          c.fillStyle = 'rgba(120,85,40,0.13)'; c.fillRect(x - 3, y0, 6, y1 - y0);
          c.fillStyle = 'rgba(255,240,205,0.12)'; c.fillRect(x + 3, y0, 4, y1 - y0);
        }
        for (let y = Math.floor(y0 / 760) * 760 + 130; y < y1; y += 760) {
          c.fillStyle = 'rgba(120,85,40,0.10)'; c.fillRect(x0, y - 2, x1 - x0, 5);
        }
      }

      // ---------- faixa de sinais (enfeite genérico, não são hieróglifos de verdade) ----------
      const FX = H.faixaHieroglifos;
      function faixa(cam) {
        if (!FX) return;
        const R = 1200 / cam.z + 300, a = FX.alt, y = FX.y;
        c.strokeStyle = cor('tinta'); c.globalAlpha = 0.45; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(cam.x - R, y - a * 0.75); c.lineTo(cam.x + R, y - a * 0.75); c.moveTo(cam.x - R, y + a * 0.75); c.lineTo(cam.x + R, y + a * 0.75); c.stroke();
        c.lineWidth = 3.5;
        const passo = a * 1.05, s = a * 0.32;
        for (let i = Math.floor((cam.x - R) / passo); i * passo < cam.x + R; i++) {
          const x = i * passo + passo / 2, tipo = Math.floor((0.5 + 0.5 * ruido(i * 7.31 + 0.5, 911)) * 7.999) % 8;
          c.beginPath();
          if (tipo === 0) c.arc(x, y, s * 0.6, 0, Math.PI * 2);
          else if (tipo === 1) { c.moveTo(x - s, y); for (let j = 1; j <= 6; j++) c.lineTo(x - s + j * s / 3, y + (j % 2 ? -s * 0.35 : s * 0.35)); }
          else if (tipo === 2) { c.moveTo(x - s * 0.8, y + s * 0.6); c.lineTo(x, y - s * 0.7); c.lineTo(x + s * 0.8, y + s * 0.6); c.closePath(); }
          else if (tipo === 3) { c.moveTo(x, y - s * 0.8); c.lineTo(x, y + s * 0.8); }
          else if (tipo === 4) { c.ellipse(x, y - s * 0.35, s * 0.35, s * 0.45, 0, 0, Math.PI * 2); c.moveTo(x, y + s * 0.1); c.lineTo(x, y + s * 0.85); }
          else if (tipo === 5) { c.arc(x, y + s * 0.4, s * 0.8, Math.PI, 0); c.closePath(); }
          else if (tipo === 6) { c.moveTo(x - s, y + s * 0.2); c.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y + s * 0.2); c.quadraticCurveTo(x + s * 0.5, y + s * 1.0, x + s, y + s * 0.2); }
          else { c.rect(x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9); }
          c.stroke();
        }
        c.globalAlpha = 1;
      }

      // ---------- linha do tempo de ouro, com marcas de século ----------
      const LT = H.linhaDoTempo;
      function brilhoOuro(x, y, r, alfa) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,245,200,${alfa})`); g.addColorStop(1, 'rgba(255,220,120,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
      }
      function linhaDoTempo(t, cam) {
        if (!LT) return null;
        const d = LT.desenha, u = d ? trecho(t, d.t, d.t + d.dur) : 1;
        const xf = d ? mistura(d.de, d.ate, sai(u)) : LT.x1;
        const trechos = d ? [[LT.x0, d.de], [d.de, xf], [d.ate, LT.x1]] : [[LT.x0, LT.x1]];
        const y = LT.y;
        for (const [a, b] of trechos) {
          if (b - a < 1) continue;
          c.fillStyle = cor('ouroEscuro'); c.fillRect(a, y - 9, b - a, 18);
          c.fillStyle = OURO; c.fillRect(a, y - 6, b - a, 12);
          // marcas de século (tinta), mais longas a cada 500 anos
          c.fillStyle = cor('tinta'); c.globalAlpha = 0.8;
          const m = LT.marcas || 100;
          for (let x = Math.ceil(a / m) * m; x <= b; x += m) {
            const longa = Math.round(x / m) % 5 === 0;
            c.fillRect(x - 2, y + 12, 4, longa ? 34 : 20);
          }
          c.globalAlpha = 1;
        }
        // brilho que corre pela linha
        const gx = cam.x - 700 + ((t * 520) % 1400);
        if (!d || gx < xf || gx > d.ate) brilhoOuro(gx, y, 46, 0.55);
        return d && u > 0 && u < 1 ? [xf, y] : null;
      }

      // ---------- elementos (cada um ganha semente) ----------
      const ELS = (H.elementos || []).map((e, i) => ({ dur: 0, ...e, sem: (H.semente || 1) * 101 + i * 17 }));
      const prog = (e, t) => (e.dur > 0 ? trecho(t, e.t, e.t + e.dur) : 1);
      const TINTA = () => cor('tinta');

      // --- rainha (desenho próprio, de perfil, olhando para +x; o (0,0) é entre os pés) ---
      const R_CORPO = [[-40, -335], [40, -335], [47, -120], [56, -22], [-50, -22], [-44, -120]];
      const R_FAIXA = [[14, -250], [30, -250], [37, -30], [19, -30]];
      const R_CINTO = [[-42, -263], [43, -263], [43, -249], [-42, -249]];
      const R_BARRA1 = [[-48, -72], [52, -72], [53, -60], [-49, -60]];
      const R_BARRA2 = [[-50, -48], [55, -48], [56, -36], [-50, -36]];
      const R_PE1 = [[4, -23], [46, -23], [64, -7], [62, 0], [4, 0]];
      const R_PE2 = [[-44, -23], [-2, -23], [8, 0], [-46, 0]];
      const R_PESCOCO = [[-6, -364], [16, -364], [19, -328], [-9, -328]];
      const R_ROSTO = [[-30, -445], [-5, -458], [22, -450], [30, -430], [32, -414], [46, -399], [47, -392], [38, -388], [40, -381], [36, -377], [38, -370], [32, -360], [14, -352], [-6, -356], [-26, -372], [-36, -400]];
      const R_PERUCA = [[30, -434], [22, -456], [-8, -468], [-40, -458], [-57, -430], [-61, -380], [-59, -318], [-14, -318], [-12, -352], [-4, -386], [8, -406], [15, -425]];
      const R_COLAR = [...Letras.arco(2, -334, 44, 30, 180, 0, 14), ...Letras.arco(2, -334, 24, 12, 0, 180, 10)];
      const R_OLHO = [[16, -409], [24, -415], [34, -410], [26, -405]];
      const R_LOTUS = [[0, -505], [-16, -540], [-6, -530], [0, -548], [6, -530], [16, -540]];
      const BRACO = { repouso: [0.12, 0.25], aponta: [1.5, 1.62], protege: [2.0, 3.89] };
      function poseRainha(e, t) {
        let dir = e.dir || 1, sx = dir, sy = 1, braco = BRACO.repouso;
        for (const a of e.acoes || []) {
          if (a.tipo === 'vira' && t >= a.em) {
            const u = trecho(t, a.em, a.em + 0.24);
            sx = dir * Math.cos(Math.PI * u);
            if (Math.abs(sx) < 0.07) sx = 0.07 * (u < 0.5 ? dir : -dir);
            sy = 1 - 0.07 * Math.sin(Math.PI * u) + 0.03 * Math.sin(Math.PI * trecho(t, a.em + 0.24, a.em + 0.4));
            if (u >= 1) dir = -dir;
          } else if (a.tipo === 'vira' && t > a.em - 0.1) sy = 1 - 0.04 * Math.sin(Math.PI * trecho(t, a.em - 0.1, a.em)); // agacha antes de virar
          if ((a.tipo === 'aponta' || a.tipo === 'protege') && t >= a.de) {
            const alvo = BRACO[a.tipo], ida = passa(trecho(t, a.de, a.de + 0.3)), volta = suave(trecho(t, a.ate, a.ate + 0.28));
            const v = ida * (1 - volta);
            braco = [mistura(braco[0], alvo[0], v), mistura(braco[1], alvo[1], v)];
          }
        }
        return { sx, sy, braco };
      }
      function tubo(pts, larg, corDentro, pr = 1) {
        if (pr <= 0) return;
        const r = Pincel.reamostra(pts, 3), lim = r.total * pr;
        c.beginPath(); let feitos = 0;
        for (let i = 0; i < r.xs.length && r.cum[i] <= lim; i++) { feitos ? c.lineTo(r.xs[i], r.ys[i]) : c.moveTo(r.xs[i], r.ys[i]); feitos++; }
        if (feitos < 2) return;
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = TINTA(); c.lineWidth = larg + 9; c.stroke();
        c.strokeStyle = corDentro; c.lineWidth = larg; c.stroke();
      }
      function rainha(e, t, boil) {
        const pz = poseRainha(e, t), esc = e.escala || 1;
        const pl = trecho(t, e.t, e.t + e.dur * 0.65), pf = trecho(t, e.t + e.dur * 0.35, e.t + e.dur);
        const respira = 1 + 0.006 * Math.sin(t * 2.4);
        c.save(); c.translate(e.x, e.y); c.scale(pz.sx * esc, pz.sy * esc * respira);
        const partes = [
          [R_PE2, 'pele'], [R_PE1, 'pele'], [R_CORPO, 'turquesa'], [R_FAIXA, 'lapis'], [R_CINTO, OURO], [R_BARRA1, OURO], [R_BARRA2, OURO],
          [R_PESCOCO, 'pele'], [R_ROSTO, 'pele'], [R_PERUCA, 'tinta'], [R_COLAR, OURO], [R_OLHO, 'creme'],
        ];
        const N = partes.length + 3;
        const pj = (j, p) => limita(p * N - j * 0.85);
        // braço de trás segura o cajado (fica atrás do corpo)
        const ombroT = [-10, -322], maoT = [58, -238];
        tubo([ombroT, [-16, -252], maoT], 16, Filme.cor(cor('pele'), '#000000', 0.18), pj(0, pl));
        partes.forEach(([pts, cr], j) => {
          pinta(c, pts, { cor: typeof cr === 'string' ? cor(cr) : cr, prog: pj(j, pf), sem: e.sem + j, faixa: 26, veio: cr === 'turquesa' || cr === 'lapis' ? 0.1 : 0 });
        });
        partes.forEach(([pts, cr], j) => {
          if (cr === 'tinta' || pts === R_PESCOCO) return;
          fita(c, pts, { cor: TINTA(), larg: j >= 9 ? 3.2 : 4.2, prog: pj(j, pl), sem: e.sem + j * 3, boil, fecha: true, tremor: 0.6 });
        });
        // olho: pupila, risco de kohl e sobrancelha
        if (pf > 0.6) {
          c.fillStyle = TINTA(); c.beginPath(); c.arc(28, -410, 3.6, 0, Math.PI * 2); c.fill();
          fita(c, [[16, -410], [4, -406]], { cor: TINTA(), larg: 3.5, sem: e.sem + 80, boil, tremor: 0.3 });
          fita(c, [[14, -422], [26, -425], [37, -421]], { cor: TINTA(), larg: 3, sem: e.sem + 81, boil, tremor: 0.3 });
        }
        // coroa: faixa de ouro e disco
        const pc = pj(partes.length, pf);
        if (pc > 0) {
          c.globalAlpha = pc;
          c.strokeStyle = cor('ouroEscuro'); c.lineWidth = 12; c.lineCap = 'round';
          c.beginPath(); c.moveTo(28, -437); c.lineTo(-56, -432); c.stroke();
          c.strokeStyle = OURO; c.lineWidth = 8; c.stroke();
          c.fillStyle = OURO; c.beginPath(); c.arc(-14, -486, 17 * pc, 0, Math.PI * 2); c.fill();
          c.strokeStyle = TINTA(); c.lineWidth = 3; c.stroke();
          c.fillStyle = cor('ouroEscuro'); c.fillRect(-17, -470, 6, 8);
          c.globalAlpha = 1;
        }
        // cajado de ouro com flor de lótus turquesa
        const pk = pj(partes.length + 1, pl);
        if (pk > 0) {
          const balanco = 2 * Math.sin(t * 3.1);
          c.save(); c.translate(60, 0); c.rotate(balanco * RAD * 0.4);
          tubo([[0, -6], [0, mistura(-6, -505, pk)]], 7, OURO);
          if (pk >= 1) { pinta(c, R_LOTUS, { cor: cor('turquesa'), prog: pj(partes.length + 1, pf), sem: e.sem + 90, veio: 0 }); fita(c, R_LOTUS, { cor: TINTA(), larg: 3, sem: e.sem + 91, boil, fecha: true, tremor: 0.4 }); }
          c.restore();
          c.fillStyle = Filme.cor(cor('pele'), '#000000', 0.18); c.strokeStyle = TINTA(); c.lineWidth = 3;
          c.beginPath(); c.ellipse(maoT[0] + 1, maoT[1], 10, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        }
        // braço da frente: aponta, protege os olhos
        const pb = pj(partes.length + 2, pl);
        if (pb > 0) {
          const [a1, a2] = pz.braco, om = [14, -324];
          const co = [om[0] + 84 * Math.sin(a1), om[1] + 84 * Math.cos(a1)], mao = [co[0] + 78 * Math.sin(a2), co[1] + 78 * Math.cos(a2)];
          tubo([om, co, mao], 17, cor('pele'), pb);
          if (pb >= 1) {
            c.save(); c.translate(mao[0], mao[1]); c.rotate(-a2 + Math.PI / 2);
            c.fillStyle = cor('pele'); c.strokeStyle = TINTA(); c.lineWidth = 3.5;
            c.beginPath(); c.ellipse(6, 0, 16, 8.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
            c.restore();
          }
        }
        c.restore();
      }

      // --- construtores puxando um bloco num trenó ---
      function construtor(x, y, esc, fase, sem, boil) {
        c.save(); c.translate(x, y); c.scale(-esc, esc); // olham para a esquerda (para a pirâmide)
        c.rotate(-0.2); // inclinados para a frente: força
        const pele = cor('pele'), ang = 0.42 * Math.sin(fase);
        const quadril = [0, -195];
        const perna = (a, escura) => tubo([quadril, [quadril[0] + 100 * Math.sin(a), quadril[1] + 100 * Math.cos(a)], [quadril[0] + 195 * Math.sin(a) - 4, -2 + 6 * Math.max(0, -Math.cos(a * 2))]], 20, escura ? Filme.cor(pele, '#000000', 0.18) : pele);
        perna(-ang, true);
        tubo([[-6, -322], [-30, -268], [-58, -290]], 17, Filme.cor(pele, '#000000', 0.18)); // braço de trás, na corda
        const TORSO = [[-22, -335], [24, -335], [28, -200], [-24, -200]];
        const SAIOTE = [[-28, -210], [28, -210], [40, -128], [-34, -128]];
        pinta(c, TORSO, { cor: pele, sem, veio: 0 }); fita(c, TORSO, { cor: TINTA(), larg: 5, sem, boil, fecha: true, tremor: 0.6 });
        perna(ang, false);
        pinta(c, SAIOTE, { cor: cor('creme'), sem: sem + 1, veio: 0 }); fita(c, SAIOTE, { cor: TINTA(), larg: 5, sem: sem + 1, boil, fecha: true, tremor: 0.6 });
        // cabeça redonda, cabelo curto preto, olho
        c.fillStyle = pele; c.beginPath(); c.arc(8, -372, 34, 0, Math.PI * 2); c.fill();
        c.fillStyle = TINTA(); c.beginPath(); c.arc(8, -372, 35, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(-4, -360); c.closePath(); c.fill();
        fita(c, Letras.arco(8, -372, 34, 34, 0, 360, 24), { cor: TINTA(), larg: 5, sem: sem + 2, boil, tremor: 0.6 });
        c.fillStyle = TINTA(); c.beginPath(); c.arc(28, -370, 5, 0, Math.PI * 2); c.fill();
        tubo([[10, -322], [-14, -276], [-58, -292]], 17, pele); // braço da frente, na corda
        c.restore();
      }
      function construtores(e, t, boil, tb) {
        const dx = (e.anda || 0) * trecho(tb, e.t, e.ate || e.t + 2), esc = e.escala || 0.42, n = e.n || 3, passo = e.passo || 70;
        const x0 = e.x + dx, y = e.y, xs = [];
        for (let i = 0; i < n; i++) xs.push(x0 + i * passo);
        // trenó e bloco atrás do último
        const tx = xs[n - 1] + 80, BL = [[tx, y - 96], [tx + 100, y - 96], [tx + 100, y - 20], [tx, y - 20]];
        const TR = [[tx - 22, y - 22], [tx + 118, y - 22], [tx + 118, y - 6], [tx - 6, y - 6], [tx - 26, y - 16]];
        // corda: passa pelas mãos e desce até o trenó
        const yc = y - 118 * esc / 0.42;
        c.strokeStyle = cor('ocreEscuro'); c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(xs[0] - 34, yc); c.lineTo(xs[n - 1] + 30, yc + 6); c.lineTo(tx - 22, y - 20); c.stroke();
        pinta(c, BL, { cor: cor('ocre'), sem: e.sem + 5, veio: 0.12 }); fita(c, BL, { cor: TINTA(), larg: 5, sem: e.sem + 6, boil, fecha: true, tremor: 0.6 });
        pinta(c, TR, { cor: cor('ocreEscuro'), sem: e.sem + 7, veio: 0 }); fita(c, TR, { cor: TINTA(), larg: 4.5, sem: e.sem + 8, boil, fecha: true, tremor: 0.5 });
        xs.forEach((x, i) => construtor(x, y, esc, (tb - e.t) * 9 + i * 1.9, e.sem + 20 + i * 7, boil));
      }

      // --- pirâmide pintada fiada por fiada ---
      function piramide(e, t, boil) {
        const n = e.fiadas || 8, h = e.alt / n, pf = trecho(t, e.t, e.t + e.dur * 0.82), pl = trecho(t, e.t + e.dur * 0.1, e.t + e.dur);
        for (let i = 0; i < n; i++) {
          const fi = limita(pf * n - i);
          if (fi <= 0) break;
          const yb = e.y - i * h, yt = e.y - (i + 1) * h, wb = e.base / 2 * (1 - i / n), wt = e.base / 2 * (1 - (i + 1) / n);
          const pts = [[e.x - wb, yb], [e.x + wb, yb], [e.x + wt, yt], [e.x - wt, yt]];
          pinta(c, pts, { cor: i % 2 ? cor('ocre') : Filme.hex(cor('ocre'), cor('ocreEscuro'), 0.25), prog: fi, sem: e.sem + i, faixa: h * 0.55, veio: 0.1 });
          if (fi >= 1 && i < n - 1) fita(c, [[e.x - wt, yt], [e.x + wt, yt]], { cor: TINTA(), larg: Math.max(2, h * 0.09), sem: e.sem + 40 + i, boil, tremor: 0.4 });
        }
        // lado da sombra (direita) um pouco mais escuro
        if (pf > 0) {
          c.save(); c.globalAlpha = 0.18 * pf; c.fillStyle = cor('ocreEscuro');
          c.beginPath(); c.moveTo(e.x, e.y - e.alt); c.lineTo(e.x + e.base / 2, e.y); c.lineTo(e.x + e.base * 0.12, e.y); c.closePath(); c.fill(); c.restore();
        }
        fita(c, [[e.x - e.base / 2, e.y], [e.x, e.y - e.alt], [e.x + e.base / 2, e.y]], { cor: TINTA(), larg: Math.max(4, e.alt * 0.016), prog: pl, sem: e.sem + 99, boil, tremor: 0.8 });
      }

      // --- sol de ouro com raios de nanquim ---
      function sol(e, t, boil) {
        const p = prog(e, t), s = passa(trecho(t, e.t, e.t + e.dur * 0.6));
        if (s <= 0) return;
        c.save(); c.translate(e.x, e.y); c.scale(s, s);
        c.fillStyle = OURO; c.beginPath(); c.arc(0, 0, e.r, 0, Math.PI * 2); c.fill();
        c.restore();
        const raios = 12;
        for (let i = 0; i < raios; i++) {
          const a = i * 2 * Math.PI / raios + 0.05 * Math.sin(t * 1.3), pr = limita(trecho(t, e.t + e.dur * 0.3, e.t + e.dur) * raios - i * 0.5);
          fita(c, [[e.x + Math.cos(a) * e.r * 1.3, e.y + Math.sin(a) * e.r * 1.3], [e.x + Math.cos(a) * e.r * 1.75, e.y + Math.sin(a) * e.r * 1.75]], { cor: TINTA(), larg: 4.5, prog: pr, sem: e.sem + i, boil, tremor: 0.6 });
        }
        fita(c, Letras.arco(e.x, e.y, e.r * s, e.r * s, -90, 270, 36), { cor: cor('ouroEscuro'), larg: 3.5, prog: p, sem: e.sem + 30, boil, tremor: 0.4 });
      }

      // --- lua crescente de ouro ---
      function crescente(r) {
        const ic = [r * 0.46, -r * 0.16], ir = r * 0.84, base = Math.atan2(-ic[1], -ic[0]), fora = [], dentro = [];
        for (let i = -90; i <= 90; i++) {
          const a = base + i * 2 * RAD;
          const p = [Math.cos(a) * r, Math.sin(a) * r];
          if (Math.hypot(p[0] - ic[0], p[1] - ic[1]) > ir) fora.push(p);
        }
        for (let i = 90; i >= -90; i--) {
          const a = base + i * 2 * RAD, p = [ic[0] + Math.cos(a) * ir, ic[1] + Math.sin(a) * ir];
          if (Math.hypot(p[0], p[1]) < r) dentro.push(p);
        }
        return [...fora, ...dentro];
      }
      function lua(e, t, boil) {
        const s = passa(trecho(t, e.t, e.t + e.dur));
        if (s <= 0) return;
        c.save(); c.translate(e.x, e.y); c.scale(s, s);
        const pts = crescente(e.r);
        pinta(c, pts, { cor: OURO, prog: limita(s * 1.4), sem: e.sem, veio: 0 });
        fita(c, pts, { cor: cor('ouroEscuro'), larg: 3, sem: e.sem + 1, boil, fecha: true, tremor: 0.3 });
        c.restore();
        if (t < e.t + e.dur + 0.5) estrela(c, e.x + e.r * 0.2, e.y - e.r * 0.75, 30, '#fff6d0', 1 - trecho(t, e.t + e.dur, e.t + e.dur + 0.5));
      }

      // --- painel de noite na Lua (janela de lápis-lazúli na folha) ---
      function painelNoite(e, t, boil) {
        const { x0, y0, x1, y1, chao } = e;
        c.fillStyle = cor('noite'); c.fillRect(x0, y0, x1 - x0, chao - y0);
        const g = c.createLinearGradient(0, y0, 0, chao); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, Filme.cor(cor('lapis'), null, 0, 0.8));
        c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, chao - y0);
        const r = sorteio(e.sem);
        for (let i = 0; i < (e.estrelas || 8); i++) {
          const sx = x0 + 40 + r() * (x1 - x0 - 80), sy = y0 + 40 + r() * (chao - y0 - 260), fase = r() * 6.28;
          const brilho = 0.6 + 0.4 * Math.sin(t * 2.2 + fase);
          c.fillStyle = cor('ouroClaro'); c.globalAlpha = brilho;
          c.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, rr = j % 2 ? 2.5 : 10 + 3 * brilho; c.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } c.closePath(); c.fill();
          c.globalAlpha = 1;
        }
        // chão da Lua: cinza claro com morrinhos e crateras
        const CH = [[x0, chao + 10]];
        for (let x = x0; x <= x1; x += 34) CH.push([x, chao + 14 * ruido(x * 0.006, e.sem + 3)]);
        CH.push([x1, y1], [x0, y1]);
        pinta(c, CH, { cor: cor('cinzaLua'), sem: e.sem + 4, veio: 0.07 });
        c.strokeStyle = 'rgba(70,70,80,0.55)'; c.lineWidth = 3;
        for (const [cx, cy, rx] of [[x0 + 90, chao + 120, 46], [x0 + 300, chao + 210, 30], [x1 - 110, chao + 170, 52], [x0 + 470, chao + 80, 22]]) { c.beginPath(); c.ellipse(cx, cy, rx, rx * 0.32, 0, 0, Math.PI * 2); c.stroke(); }
        fita(c, CH.slice(0, CH.length - 2), { cor: TINTA(), larg: 4, sem: e.sem + 5, boil, tremor: 0.5 });
        fita(c, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { cor: TINTA(), larg: 7, sem: e.sem + 6, boil, fecha: true, tremor: 0.8 });
      }

      // --- módulo lunar que desce e assenta (amassa ao tocar o chão, levanta pó) ---
      function modulo(e, t, boil, painel) {
        if (t < e.de) return;
        const u = trecho(t, e.de, e.ate), y = mistura(e.yDe, e.yAte, 1 - Math.pow(1 - u, 2.2));
        const pos = t - e.ate, amassa = pos > 0 ? Math.exp(-pos * 9) * Math.sin(pos * 26) : 0;
        const esc = e.escala || 1;
        c.save();
        if (painel) { c.beginPath(); c.rect(painel.x0, painel.y0, painel.x1 - painel.x0, painel.y1 - painel.y0); c.clip(); }
        // jato e pó
        if (u < 1) for (let i = 0; i < 4; i++) {
          const f = ((t * 6 + i / 4) % 1);
          c.fillStyle = `rgba(243,234,210,${0.5 * (1 - f)})`; c.beginPath(); c.arc(e.x + (i - 1.5) * 6, y + 10 + f * 70, 10 + f * 22, 0, Math.PI * 2); c.fill();
        }
        if (pos > 0 && pos < 0.9) for (let i = 0; i < 8; i++) {
          const lado = i % 2 ? 1 : -1, f = pos / 0.9, d = 40 + (i >> 1) * 34 + f * (90 + i * 10);
          c.fillStyle = `rgba(243,234,210,${0.75 * (1 - f)})`; c.beginPath(); c.arc(e.x + lado * d, e.yAte - 10 - f * 26 * ((i >> 1) % 2 + 1), 14 + f * 30, 0, Math.PI * 2); c.fill();
        }
        c.translate(e.x, y); c.scale(esc * (1 + 0.12 * amassa), esc * (1 - 0.16 * amassa));
        const pernas = [[[-42, -62], [-80, 0]], [[42, -62], [80, 0]]];
        for (const [a, b] of pernas) { tubo([a, b], 6, cor('cinzaLua')); c.fillStyle = cor('cinzaLua'); c.strokeStyle = TINTA(); c.lineWidth = 3.5; c.beginPath(); c.ellipse(b[0], b[1] - 3, 15, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
        const BASE = [[-54, -104], [54, -104], [54, -50], [-54, -50]];
        const CABINE = [[-40, -176], [40, -176], [52, -104], [-52, -104]];
        pinta(c, BASE, { cor: OURO, sem: e.sem, veio: 0 }); fita(c, BASE, { cor: TINTA(), larg: 4.5, sem: e.sem + 1, boil, fecha: true, tremor: 0.5 });
        for (const x of [-18, 18]) fita(c, [[x, -102], [x, -52]], { cor: TINTA(), larg: 3, sem: e.sem + 2 + x, boil, tremor: 0.3 });
        pinta(c, CABINE, { cor: cor('turquesa'), sem: e.sem + 3, veio: 0.08 }); fita(c, CABINE, { cor: TINTA(), larg: 4.5, sem: e.sem + 4, boil, fecha: true, tremor: 0.5 });
        const JAN = [[6, -160], [32, -160], [20, -128]];
        pinta(c, JAN, { cor: cor('lapis'), sem: e.sem + 5, veio: 0 }); fita(c, JAN, { cor: TINTA(), larg: 3.5, sem: e.sem + 6, boil, fecha: true, tremor: 0.3 });
        c.strokeStyle = TINTA(); c.lineWidth = 4; c.beginPath(); c.arc(-18, -142, 13, 0, Math.PI * 2); c.stroke();
        tubo([[0, -176], [0, -210]], 3, cor('cinzaLua'));
        c.fillStyle = cor('cinzaLua'); c.beginPath(); c.arc(0, -214, 8, 0, Math.PI * 2); c.fill(); c.lineWidth = 3; c.stroke();
        c.restore();
      }

      // --- pegada com sulcos e a sombra em forma de pirâmide ---
      function pegada(e, t, boil) {
        const pl = prog(e, t), pf = trecho(t, e.t + e.dur * 0.3, e.t + e.dur * 1.1);
        if (pl <= 0) return;
        const s = e.tam || 1, pts = [];
        const meia = (u) => (u < 0.62 ? 40 - 13 * Math.pow((u - 0.28) / 0.34, 2) * (u > 0.28 ? 1 : 0.4) : 27 + 7 * Math.sin((u - 0.62) / 0.38 * Math.PI * 0.5));
        for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([meia(u), -100 + u * 200]); }
        for (let i = 20; i >= 0; i--) { const u = i / 20; pts.push([-meia(u) + 4, -100 + u * 200]); }
        // pontas arredondadas
        const SOLA = [...Letras.arco(2, -96, 34, 22, 180, 360, 10), ...pts.slice(1, 20), ...Letras.arco(2, 98, 30, 18, 0, 180, 10), ...pts.slice(22, 41)];
        c.save(); c.translate(e.x, e.y); c.rotate((e.giro || 0) * RAD); c.scale(s, s);
        pinta(c, SOLA, { cor: '#b9b3a5', prog: pf, sem: e.sem, veio: 0 });
        c.save(); Pincel.caminho(c, SOLA); c.clip();
        for (let i = 0; i < 11; i++) {
          const y = -84 + i * 17, pr = limita(pf * 11 - i);
          if (pr > 0) fita(c, [[-46, y], [mistura(-46, 50, pr), y + 2]], { cor: TINTA(), larg: 6, sem: e.sem + i, boil, tremor: 0.4 });
        }
        c.restore();
        fita(c, SOLA, { cor: TINTA(), larg: 6, prog: pl, sem: e.sem + 30, boil, fecha: true, tremor: 0.6 });
        c.restore();
      }
      function sombra(e, t, boil) {
        const p = prog(e, t);
        if (p <= 0) return;
        const pts = [[e.x - e.base / 2, e.y], [e.x + e.base / 2, e.y], [e.x + e.base * 0.08, e.y - e.alt]];
        pinta(c, pts, { cor: '#24306a', prog: p, sem: e.sem, veio: 0.06 });
        fita(c, pts, { cor: '#8a8fa8', larg: 3, prog: p, sem: e.sem + 1, boil, fecha: true, tremor: 0.4 });
      }

      // --- colchete de ouro (mede a distância no tempo), com estrela na ponta enquanto desenha ---
      function colchete(e, t) {
        const p = prog(e, t);
        if (p <= 0) return null;
        const u = sai(p), pts = [[e.x0, e.y + e.queda], [e.x0, e.y], [e.x1, e.y], [e.x1, e.y + e.queda]];
        const r = Pincel.reamostra(pts, 8), lim = r.total * u;
        c.beginPath(); let ponta = null;
        for (let i = 0; i < r.xs.length; i++) { if (r.cum[i] > lim) break; i ? c.lineTo(r.xs[i], r.ys[i]) : c.moveTo(r.xs[i], r.ys[i]); ponta = [r.xs[i], r.ys[i]]; }
        c.lineCap = 'butt'; c.lineJoin = 'miter';
        c.strokeStyle = cor('ouroEscuro'); c.lineWidth = 18; c.stroke();
        c.strokeStyle = OURO; c.lineWidth = 12; c.stroke();
        return p < 1 ? ponta : null;
      }

      // --- carimbo (bate e fica) e rótulo de ouro ---
      function carimbo(e, t) {
        const u = trecho(t, e.t, e.t + 0.14);
        if (t < e.t) return;
        const s = mistura(1.7, 1, u * u), alfa = mistura(0.2, 0.88, u), tam = e.tam || 54;
        const w = Pincel.largura(e.texto, tam) + tam * 0.9, h = tam * 1.7;
        c.save(); c.translate(e.x, e.y); c.rotate(-0.06); c.scale(s, s); c.globalAlpha = alfa;
        c.strokeStyle = cor('carimbo'); c.lineWidth = 7; c.lineJoin = 'round';
        c.strokeRect(-w / 2, -h / 2, w, h); c.lineWidth = 2.5; c.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18);
        escreve(c, e.texto, 0, tam / 2, tam, { cor: cor('carimbo'), grossura: 0.16 });
        c.restore();
      }
      function rotulo(e, t) {
        if (t < e.t) return;
        escreve(c, e.texto, e.x, e.y + (e.tam || 60) / 2, e.tam || 60, { cor: OURO, contorno: TINTA(), prog: prog(e, t), grossura: 0.2, borda: 0.12 });
      }

      const PECAS = {
        rainha, construtores, piramide, sol, lua, painelNoite, pegada, sombra, colchete, carimbo, rotulo,
      };

      // ---------- coisas da tela (contadores e números grandes, sempre em pé) ----------
      const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      function telas(t, m) {
        for (const s of H.telas || []) {
          if (t < s.de || t >= s.some) continue;
          const entra = passa(trecho(t, s.de, s.de + 0.25)), some = 1 - trecho(t, s.some - 0.15, s.some);
          c.save(); c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = some;
          if (s.tipo === 'contador') {
            const v = s.valor * sai(trecho(t, s.de, s.ate));
            c.translate(s.x, s.y); c.scale(entra, entra);
            escreve(c, fmt(v), 0, 0, s.tam, { cor: OURO, contorno: TINTA(), grossura: 0.2, borda: 0.12 });
            escreve(c, s.rotulo, 0, s.tam * 0.62, s.tam * 0.34, { cor: TINTA(), grossura: 0.2 });
          } else if (s.tipo === 'numerao') {
            const [x, y] = paraTela(m, s.mx, s.my);
            c.translate(x + (s.dx || 0), y + (s.dy || 0)); c.scale(entra, entra);
            escreve(c, s.texto, 0, s.tam / 2, s.tam, { cor: OURO, contorno: TINTA(), grossura: 0.2, borda: 0.12, prog: trecho(t, s.de, s.de + s.dur) });
          }
          c.restore();
        }
      }

      // ---------- legendas: faixa creme com borda de nanquim, a palavra falada em amarelo ----------
      const LG = H.legenda || {};
      const LEGENDAS = (H.legendas || []).map((lg) => {
        const tam = LG.tam || 80, maxL = LG.largura || 900, palavras = lg.texto.split(/\s+/);
        const linhas = []; let atual = [];
        for (const p of palavras) { const tenta = [...atual, p].join('  '); if (atual.length && Pincel.largura(tenta, tam) > maxL) { linhas.push(atual); atual = [p]; } else atual.push(p); }
        if (atual.length) linhas.push(atual);
        // a última palavra acende "segura" segundos antes do fim: dá tempo de ler a frase inteira
        const pesos = palavras.map((p) => p.length + 2), soma = pesos.slice(0, -1).reduce((a, b) => a + b, 0) || 1;
        const janela = Math.max(0.05, lg.ate - lg.de - (LG.segura ?? 0.55) - 0.05);
        let acum = lg.de; const inicio = pesos.map((w, i) => { const v = acum; if (i < pesos.length - 1) acum += janela * w / soma; return v; });
        return { ...lg, linhas, inicio, tam };
      });
      function legenda(t) {
        const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate);
        if (!lg) return;
        let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
        const tam = lg.tam, passo = tam * 1.38, n = lg.linhas.length;
        const larg = Math.max(...lg.linhas.map((ln) => Pincel.largura(ln.join('  '), tam))) + tam * 1.0, alt = n * passo + tam * 0.5;
        const yc = LG.y || 1560;
        const pop = 1 + 0.07 * (1 - sai(trecho(t, lg.de, lg.de + 0.14)));
        c.save(); c.setTransform(k * pop, 0, 0, k * pop, k * L / 2 * (1 - pop), k * yc * (1 - pop));
        c.fillStyle = 'rgba(40,20,5,0.3)'; c.fillRect(L / 2 - larg / 2 + 8, yc - alt / 2 + 10, larg, alt);
        c.fillStyle = cor('creme'); c.fillRect(L / 2 - larg / 2, yc - alt / 2, larg, alt);
        c.strokeStyle = cor('tinta'); c.lineWidth = 5; c.strokeRect(L / 2 - larg / 2, yc - alt / 2, larg, alt);
        let idx = 0;
        lg.linhas.forEach((ln, li) => {
          const y = yc - (n - 1) * passo / 2 + li * passo + tam / 2;
          const mapa = []; ln.forEach((p, pi) => { for (const _ of p) mapa.push(idx + pi); mapa.push(-1, -1); });
          // a palavra falada: contorno escuro + amarelo; as outras: nanquim
          const txt = ln.join('  ');
          escreve(c, txt, L / 2, y, tam, { cor: (i) => (mapa[i] === falada ? cor('amarelo') : cor('tinta')), contorno: null, grossura: 0.19 });
          // contorno só da palavra falada (por cima de novo, com borda)
          let px = L / 2 - Pincel.largura(txt, tam) / 2;
          ln.forEach((p, pi) => {
            const w = Pincel.largura(p, tam);
            if (idx + pi === falada) escreve(c, p, px, y, tam, { cor: cor('amarelo'), contorno: cor('tinta'), grossura: 0.19, borda: 0.1, alinha: 'esquerda' });
            px += w + 1.04 * tam; // largura da palavra + o respiro entre letras + dois espaços
          });
          idx += ln.length;
        });
        c.restore();
      }

      // ---------- o rolo que desenrola no começo ----------
      const RL = H.rolo;
      function rolo(t) {
        if (!RL || t >= RL.t + RL.dur + 0.05) return;
        const u = trecho(t, RL.t, RL.t + RL.dur), y = mistura(-40, A + 80, 1 - Math.pow(1 - u, 1.6));
        c.save(); c.setTransform(k, 0, 0, k, 0, 0);
        c.fillStyle = cor('mesa'); c.fillRect(0, y, L, A - y + 10);
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y + 30, L, 30);
        const g = c.createLinearGradient(0, y - 44, 0, y + 44);
        g.addColorStop(0, '#8a6a3c'); g.addColorStop(0.35, cor('papiroClaro')); g.addColorStop(0.6, cor('papiro')); g.addColorStop(1, '#6b4a22');
        c.fillStyle = g; c.fillRect(-10, y - 44, L + 20, 88);
        c.strokeStyle = cor('tinta'); c.lineWidth = 4; c.strokeRect(-10, y - 44, L + 20, 88);
        c.restore();
      }

      // ---------- um quadro ----------
      function desenhar(t) {
        c.reset();
        const q = Math.round(t * fps), boil = Math.floor(q / 3), tb = Math.floor(q / 2) * 2 / fps; // nanquim treme de 3 em 3; bonecos posam de 2 em 2
        const cam = camera(t), m = matriz(cam);
        c.fillStyle = cor('mesa'); c.fillRect(0, 0, tela.width, tela.height);
        c.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
        papiro(cam);
        faixa(cam);
        let ponta = null;
        const painel = ELS.find((e) => e.tipo === 'painelNoite');
        // ordem: painel, chão/pirâmides/sol/lua, linha do tempo, colchetes, figuras, rótulos
        const ordem = ['painelNoite', 'sol', 'lua', 'piramide', 'sombra', 'pegada'];
        for (const tipo of ordem) for (const e of ELS) if (e.tipo === tipo && t >= e.t) PECAS[tipo](e, tipo === 'piramide' ? t : t, boil);
        for (const e of ELS) if (e.tipo === 'modulo') modulo(e, t, boil, painel);
        const pl = linhaDoTempo(t, cam); if (pl) ponta = pl;
        for (const e of ELS) if (e.tipo === 'colchete' && t >= e.t) { const p = colchete(e, t); if (p) ponta = p; }
        for (const e of ELS) if (e.tipo === 'construtores' && t >= e.t) construtores(e, t, boil, tb);
        for (const e of ELS) if (e.tipo === 'rainha' && t >= e.t) rainha(e, tb, boil);
        for (const e of ELS) if ((e.tipo === 'carimbo' || e.tipo === 'rotulo') && t >= e.t) PECAS[e.tipo](e, t);
        // estrela de ouro na ponta do que está sendo desenhado em ouro
        if (ponta) estrela(c, ponta[0], ponta[1], 34 + 6 * Math.sin(t * 40), '#fffbe6');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(vinheta, 0, 0);
        telas(t, m);
        legenda(t);
        rolo(t);
        const fim = trecho(t, duracao - 0.35, duracao);
        if (fim > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fim; c.fillStyle = cor('mesa'); c.fillRect(0, 0, tela.width, tela.height); c.globalAlpha = 1; }
      }

      // ---------- som: as mesmas marcas de tempo da imagem ----------
      function som() {
        const M = H.musica || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
        const vol = M.vol ?? 0.12, passo = M.passo || 0.25;
        // bordão (drone) bem baixo
        (M.bordao || []).forEach((n, i) => s.nota(n, 0.3, duracao - 0.8, { vol: 0.05 - i * 0.012, forma: i ? 'tri' : 'seno', ataque: 1.2, solta: 0.8, vibrato: 0.003 }));
        // linha de alaúde beliscado (escala com segunda aumentada)
        for (let i = 0, tt = M.entra ?? 0.5; tt < duracao - 0.7; i++, tt += passo) {
          const n = M.notas[i % M.notas.length];
          if (n) s.corda(n, tt, 0.4, { vol, maciez: 0.22, pan: i % 2 ? 0.2 : -0.2 });
        }
        // tambor de moldura macio
        const tp = M.tambor || 0.5;
        for (let tt = M.entra ?? 0.5, i = 0; tt < duracao - 0.6; tt += tp, i++) {
          if (i % 4 === 0 || i % 4 === 3) s.batida(tt, { vol: 0.16, freq: 85, dur: 0.22 });
          else s.toque(tt, { vol: 0.035, corte: 1800, dur: 0.05 });
        }
        // papel desenrolando
        if (RL) { s.vento(RL.t, RL.dur + 0.15, { vol: 0.09, corte: 3200, onda: 3, profundidade: 0.5, entra: 0.05, sai: 0.15 }); for (let tt = RL.t; tt < RL.t + RL.dur; tt += 0.03 + r() * 0.03) s.toque(tt, { vol: 0.025, corte: 5000, dur: 0.03 }); }
        const pincelada = (t0, dur, pan = 0, forca = 1) => { for (let tt = t0; tt < t0 + dur; tt += 0.035 + r() * 0.04) s.toque(tt, { vol: 0.022 * forca, corte: 2400 + r() * 1500, dur: 0.05, pan }); };
        // cortes e viagens: assobio de ar
        const viagens = [];
        for (let i = 1; i < CH.length; i++) {
          const a = CH[i - 1], b = CH[i];
          if (b.corte) viagens.push([b.t - 0.12, 0.3]);
          else if (Math.abs(b.x - a.x) > 300 || Math.abs((b.giro || 0) - (a.giro || 0)) > 10) viagens.push([a.t, b.t - a.t]);
        }
        for (const [t0, d] of viagens) s.vento(t0, d, { vol: 0.16, corte: 1400, onda: 1 / d, profundidade: 0.7, entra: d * 0.4, sai: d * 0.5 });
        for (const e of ELS) {
          if (e.tipo === 'rainha') {
            pincelada(e.t, e.dur, 0, 1);
            for (const a of e.acoes || []) {
              if (a.tipo === 'vira') s.toque(a.em, { vol: 0.06, corte: 1200, dur: 0.12 });
              if (a.tipo === 'aponta' || a.tipo === 'protege') s.toque(a.de + 0.05, { vol: 0.05, corte: 900, dur: 0.1 });
            }
          }
          if (e.tipo === 'lua') ['E6', 'B6'].forEach((n, i) => s.sino(n, e.t + i * 0.08, 1.4, { vol: 0.1, pan: 0.3 }));
          if (e.tipo === 'piramide') {
            if (e.fiadas <= 5) s.sino('A5', e.t, 1.0, { vol: 0.08, pan: -0.3 });
            for (let i = 0; i < e.fiadas; i++) s.toque(e.t + (i + 0.6) / e.fiadas * e.dur * 0.82, { vol: 0.08, corte: 700, dur: 0.07, pan: -0.1 });
            pincelada(e.t, e.dur, -0.1, 0.8);
          }
          if (e.tipo === 'sol') { s.sino('D6', e.t + 0.15, 1.0, { vol: 0.06, pan: 0.3 }); pincelada(e.t + e.dur * 0.3, e.dur * 0.7, 0.3, 0.7); }
          if (e.tipo === 'construtores') {
            for (let tt = e.t; tt < e.ate; tt += 0.35) s.toque(tt, { vol: 0.05, corte: 700, dur: 0.06, pan: 0.2 }); // passos
            for (let tt = e.t + 0.2; tt < e.ate; tt += 0.7) s.vento(tt, 0.3, { vol: 0.05, corte: 500, onda: 2, entra: 0.1, sai: 0.15 }); // o trenó raspando
          }
          if (e.tipo === 'carimbo') { s.batida(e.t + 0.12, { vol: 0.6, freq: 75, dur: 0.3 }); s.toque(e.t + 0.12, { vol: 0.14, corte: 700, dur: 0.1 }); }
          if (e.tipo === 'colchete') { s.vento(e.t, e.dur, { vol: 0.05, corte: 6000, onda: 1, entra: 0.1, sai: 0.2 }); s.sino('A6', e.t + e.dur, 1.2, { vol: 0.08 }); }
          if (e.tipo === 'rotulo') s.sino('D6', e.t + 0.05, 0.9, { vol: 0.08 });
          if (e.tipo === 'modulo') {
            s.vento(e.de, e.ate - e.de, { vol: 0.12, corte: 350, onda: 4, profundidade: 0.4, entra: 0.15, sai: 0.05 });
            s.batida(e.ate, { vol: 0.65, freq: 55, dur: 0.4 }); s.toque(e.ate, { vol: 0.12, corte: 500, dur: 0.15 });
            s.vento(e.ate, 0.6, { vol: 0.08, corte: 1500, onda: 1, entra: 0.02, sai: 0.4 });
          }
          if (e.tipo === 'pegada') pincelada(e.t, e.dur + 0.2, 0, 1);
          if (e.tipo === 'sombra') pincelada(e.t, e.dur, 0.2, 0.7);
        }
        // contadores: tique a cada passo do número
        for (const st of H.telas || []) {
          if (st.tipo === 'contador') for (let tt = st.de; tt < st.ate; tt += 0.06) s.toque(tt, { vol: 0.035, corte: 6000, dur: 0.02 });
          if (st.tipo === 'numerao') s.sino('G5', st.de, 1.2, { vol: 0.08 });
        }
        for (const si of M.sinos || []) si.notas.forEach((n, i) => s.sino(n, si.t + i * 0.12, 1.6, { vol: 0.1 }));
        s.sala(0.2);
        return s.fim({ entra: 0.05, sai: 0.5, pico: 0.78 });
      }

      return { desenhar, som };
    },
  });
})();
