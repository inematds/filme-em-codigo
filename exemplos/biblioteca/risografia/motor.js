// MOTOR "risografia" — impressão em risografia que se mexe.
// Jeito de animar: camadas planas, mas desenhadas como QUATRO CHAPAS em tons de cinza (uma por tinta:
// rosa, azul, amarelo e preto). Depois um "shader" (programa da placa de vídeo, aqui calculado pela CPU)
// imprime as chapas no papel: cada tinta passa pela sua retícula (pontos, linhas ou grão), as tintas se
// multiplicam onde se cruzam, cada impressão sai um pouco desencontrada, com faixas do rolo e furinhos.
// Cada impressão fica 2 ou 3 quadros na tela, como um maço de folhas sendo folheado.
// O que muda de um filme para outro está em historia.json. Este arquivo não muda.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, ruido, rgb } = Filme;
  const L = 1920, A = 1080;          // tamanho "de desenho" da imagem impressa
  const MARGEM = { x: 130, y: 110 }; // margem de papel em volta da imagem
  const HORIZONTE = 700;
  const ROSA = 0, AZUL = 1, AMARELO = 2, PRETO = 3;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const k = largura / L; // a tela real pode ser menor (os testes usam 640x360)
      const T = H.tempos, TI = H.tintas;

      // ---------- as 4 chapas: uma folha cinza para cada tinta (branco = muita tinta) ----------
      const chapas = [0, 1, 2, 3].map(() => { const cv = document.createElement('canvas'); cv.width = largura; cv.height = altura; return cv; });
      const cc = chapas.map((cv) => cv.getContext('2d'));
      const cinza = (d) => { const g = Math.round(limita(d) * 255); return `rgb(${g},${g},${g})`; };
      const degrade = (y0, y1, a, b) => (c) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, cinza(a)); g.addColorStop(1, cinza(b)); return g; };
      // pinta uma forma nas chapas. dens = [rosa, azul, amarelo, preto]; null = não mexe nessa chapa.
      // modo 'multiply' = multiplica a tinta que já está lá (serve para "clarear" uma área).
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

      // ---------- tempo de impressão: cada folha fica 2 ou 3 quadros ----------
      const SEG = H.segurar || [2, 3], CICLO = SEG.reduce((a, b) => a + b, 0);
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
        // o zoom anda em escala de multiplicação (senão o afastamento parece acelerar no fim)
        return { x: mistura(a.x, b.x, f), y: mistura(a.y, b.y, f), zoom: Math.exp(mistura(Math.log(a.zoom), Math.log(b.zoom), f)) };
      }

      // ---------- coisas sorteadas uma vez só (semente fixa) ----------
      const acaso = sorteio(H.semente || 1);
      const estrelas = Array.from({ length: H.estrelas || 60 }, () => ({ x: acaso() * L, y: acaso() * (HORIZONTE - 60), r: 2 + acaso() * 4, cruz: acaso() < 0.22, f: acaso() * 6.28 }));
      const espumas = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI + acaso() * 0.1, r: 6 + acaso() * 8, f: acaso() * 6.28 }));
      const nuvens = (H.nuvens || []).map((n) => {
        const bolas = []; const qt = 5 + Math.floor(acaso() * 3);
        for (let i = 0; i < qt; i++) { const u = i / (qt - 1); bolas.push({ dx: (u - 0.5) * n.largura * 0.8, dy: -Math.sin(Math.PI * u) * n.largura * (0.12 + acaso() * 0.1), r: n.largura * (0.14 + 0.1 * Math.sin(Math.PI * u) + acaso() * 0.05) }); }
        return { ...n, bolas };
      });

      // densidade do céu numa altura y (para "apagar" a lua e fazer o crescente)
      const CEU = { rosa: [0.12, 0.55], azul: [0.92, 0.72], preto: [0.32, 0.06] };
      const ceuEm = (y, par) => mistura(par[0], par[1], limita(y / HORIZONTE));

      // ---------- partes do desenho (em coordenadas da folha) ----------
      function ceu() {
        pinta([degrade(0, HORIZONTE, ...CEU.rosa), degrade(0, HORIZONTE, ...CEU.azul), 0, degrade(0, HORIZONTE, ...CEU.preto)], (c) => c.fillRect(0, 0, L, HORIZONTE + 4));
      }
      function lua(idx) {
        const Lu = H.lua; if (!Lu) return;
        pinta([0.08, 0, 1, 0], (c) => { c.beginPath(); c.arc(Lu.x, Lu.y, Lu.raio, 0, 7); c.fill(); });
        const y = Lu.y - Lu.raio * 0.25;
        pinta([ceuEm(y, CEU.rosa), ceuEm(y, CEU.azul), 0, ceuEm(y, CEU.preto)], (c) => { c.beginPath(); c.arc(Lu.x + Lu.raio * 0.45, Lu.y - Lu.raio * 0.3, Lu.raio * 0.92, 0, 7); c.fill(); });
      }
      function estrela(c, x, y, r) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
      function estrelasDesenho(idx) {
        const pisca = sorteio((H.semente || 1) * 1000 + idx);
        for (const e of estrelas) {
          const r = e.r * (0.75 + 0.5 * pisca());
          if (e.cruz) pinta([0, 0, 1, 0], (c) => estrela(c, e.x, e.y, r * 2.6));
          else pinta([0, 0, 0.35, 0], (c) => { c.beginPath(); c.arc(e.x, e.y, r * 0.8, 0, 7); c.fill(); });
        }
      }
      function nuvem(n, tq) {
        const x = n.x + n.anda * tq, base = n.y;
        const forma = (c) => { c.beginPath(); for (const b of n.bolas) { c.moveTo(x + b.dx + b.r, base + b.dy); c.arc(x + b.dx, base + b.dy, b.r, 0, 7); } c.rect(x - n.largura * 0.42, base - n.largura * 0.05, n.largura * 0.84, n.largura * 0.11); c.fill(); };
        const alto = base - n.largura * 0.4, baixo = base + n.largura * 0.08;
        pinta([degrade(alto, baixo, 0.05, 0.75), degrade(alto, baixo, 0, 0.18), 0, 0], forma);
      }
      function ilha() {
        pinta([0.2, 0.95, 0, 0.6], (c) => { c.beginPath(); c.moveTo(1640, HORIZONTE + 2); c.quadraticCurveTo(1760, HORIZONTE - 40, 1930, HORIZONTE - 22); c.lineTo(1930, HORIZONTE + 2); c.fill(); });
      }
      // linhas do mar: faixas onduladas, mais altas perto de quem olha
      const LINHAS = []; { let y = HORIZONTE, i = 0; while (y < A + 40) { const h = 14 + i * 4.2; LINHAS.push({ y, h, w: 46 + i * 9, i }); y += h; i++; } }
      function ondaCaminho(c, li, tq, fechar) {
        const fase = (tq * (18 + li.i * 4) + li.i * 37) % li.w;
        c.beginPath(); c.moveTo(-20, li.y + li.h * 2);
        for (let x = -li.w - fase; x < L + li.w; x += li.w) { c.lineTo(x, li.y + li.h * 0.55); c.quadraticCurveTo(x + li.w * 0.5, li.y - li.h * 0.65, x + li.w, li.y + li.h * 0.55); }
        if (fechar) { c.lineTo(L + 20, li.y + li.h * 2); c.closePath(); }
      }
      function mar(tq) {
        pinta([0.3, 0.9, 0, 0.15], (c) => c.fillRect(0, HORIZONTE, L, A - HORIZONTE + 4));
        for (const li of LINHAS) {
          const par = li.i % 2;
          pinta([par ? 0.22 : 0.5, par ? 0.98 : 0.72, 0, par ? 0.22 : 0.06], (c) => { ondaCaminho(c, li, tq, true); c.fill(); });
          pinta([0.55, 0.12, 0, 0], (c) => { c.lineWidth = 2 + li.i * 0.25; c.setLineDash([li.w * 0.55, li.w * 0.45]); ondaCaminho(c, li, tq, false); c.stroke(); });
        }
      }

      // ---------- o farol ----------
      const FX = (H.farol && H.farol.x) || 560;
      const BASE = 800, TOPO = 330, MB = 92, MT = 62; // pé, alto da torre, meia largura embaixo e em cima
      const meiaLargura = (y) => mistura(MB, MT, (BASE - y) / (BASE - TOPO));
      function pedra(tq, idx) {
        pinta([0.3, 0.95, 0, 0.85], (c) => { c.beginPath(); c.moveTo(FX - 260, BASE + 40); c.lineTo(FX - 150, BASE - 12); c.lineTo(FX - 40, BASE - 30); c.lineTo(FX + 120, BASE - 18); c.lineTo(FX + 250, BASE + 36); c.closePath(); c.fill(); });
        pinta([0.85, 0.5, 0, 0.2], (c) => { c.beginPath(); c.moveTo(FX - 150, BASE - 12); c.lineTo(FX - 95, BASE + 30); c.lineTo(FX - 40, BASE - 30); c.closePath(); c.fill(); });
        // espuma batendo na pedra
        for (const e of espumas) {
          const r = e.r * (0.7 + 0.4 * Math.abs(Math.sin(tq * 2.2 + e.f)));
          pinta([0.15, 0, 0, 0], (c) => { c.beginPath(); c.arc(FX + Math.cos(e.a) * 250, BASE + 26 + Math.sin(e.a) * 14 - 6, r, 0, 7); c.fill(); });
        }
      }
      function escada(tq) {
        // miolo da torre (vidro azulado) e a escada em zigue-zague
        pinta([0.25, 0.35, 0, 0.1], (c) => { c.beginPath(); c.moveTo(FX - MB + 26, BASE); c.lineTo(FX - MT + 20, TOPO); c.lineTo(FX + MT - 20, TOPO); c.lineTo(FX + MB - 26, BASE); c.fill(); });
        // a lanterna do faroleiro acende o miolo em volta dele
        const p = posFaroleiro(tq);
        if (tq < T.sobe[1] + 0.4) pinta([null, null, (c) => { const g = c.createRadialGradient(p.x, p.y - 24, 4, p.x, p.y - 24, 90); g.addColorStop(0, cinza(0.95)); g.addColorStop(1, cinza(0)); return g; }, null], (c) => { c.beginPath(); c.moveTo(FX - MB + 26, BASE); c.lineTo(FX - MT + 20, TOPO); c.lineTo(FX + MT - 20, TOPO); c.lineTo(FX + MB - 26, BASE); c.fill(); }, 'lighten');
        pinta([null, null, null, 0.9], (c) => {
          c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath();
          let lado = -1; for (let y = BASE - 10; y > TOPO + 20; y -= 60) { const m = meiaLargura(y) - 34, m2 = meiaLargura(y - 60) - 34; c.moveTo(FX + lado * m, y); c.lineTo(FX - lado * m2, y - 60); lado = -lado; }
          c.stroke(); c.lineWidth = 1.6; c.beginPath();
          lado = -1; for (let y = BASE - 10; y > TOPO + 20; y -= 60) { const m = meiaLargura(y) - 34, m2 = meiaLargura(y - 60) - 34; for (let s = 1; s < 8; s++) { const u = s / 8, x = mistura(FX + lado * m, FX - lado * m2, u), yy = mistura(y, y - 60, u); c.moveTo(x, yy); c.lineTo(x, yy - 14); } lado = -lado; }
          c.stroke();
        });
      }
      function torre() {
        // duas pernas listradas de rosa e creme
        for (const lado of [-1, 1]) {
          const fora = (y) => FX + lado * meiaLargura(y), dentro = (y) => FX + lado * (meiaLargura(y) - 28);
          pinta([0, 0.04, 0, 0], (c) => { c.beginPath(); c.moveTo(fora(BASE), BASE); c.lineTo(fora(TOPO), TOPO); c.lineTo(dentro(TOPO), TOPO); c.lineTo(dentro(BASE), BASE); c.fill(); });
          for (let y = BASE; y > TOPO; y -= 52) {
            const y2 = Math.max(TOPO, y - 26);
            pinta([1, 0, 0, 0], (c) => { c.beginPath(); c.moveTo(fora(y), y); c.lineTo(fora(y2), y2); c.lineTo(dentro(y2), y2); c.lineTo(dentro(y), y); c.fill(); });
          }
          pinta([null, null, null, 0.9], (c) => { c.lineWidth = 2.5; c.beginPath(); c.moveTo(fora(BASE), BASE); c.lineTo(fora(TOPO), TOPO); c.stroke(); });
        }
        // porta embaixo
        pinta([0.2, 0.9, 0, 0.75], (c) => { c.beginPath(); c.moveTo(FX - 20, BASE); c.lineTo(FX - 20, BASE - 44); c.arc(FX, BASE - 44, 20, Math.PI, 0); c.lineTo(FX + 20, BASE); c.fill(); });
      }
      function topo(luz) {
        // sala da lâmpada: vidro que acende
        pinta([luz > 0.5 ? 0.12 : 0.3, luz > 0.5 ? 0.02 : 0.45, mistura(0.15, 1, luz), 0.05], (c) => c.fillRect(FX - 54, TOPO - 92, 108, 92));
        if (luz > 0) pinta([null, null, null, 0], (c) => { c.beginPath(); c.arc(FX - 6, TOPO - 52, 16, 0, 7); c.fill(); }); // a lâmpada
        if (luz > 0) pinta([0, 0, 0.55 * luz, 0], (c) => { c.beginPath(); c.arc(FX - 6, TOPO - 52, 7, 0, 7); c.fill(); });
        pinta([null, null, null, 0.9], (c) => { c.lineWidth = 4; c.strokeRect(FX - 54, TOPO - 92, 108, 92); c.lineWidth = 2.5; c.beginPath(); for (const x of [-18, 18]) { c.moveTo(FX + x, TOPO - 92); c.lineTo(FX + x, TOPO); } c.stroke(); });
        // cúpula rosa, ponta amarela
        pinta([1, 0.1, 0, 0], (c) => { c.beginPath(); c.ellipse(FX, TOPO - 92, 68, 56, 0, Math.PI, 0); c.closePath(); c.fill(); });
        pinta([null, null, null, 0.9], (c) => { c.lineWidth = 3; c.beginPath(); c.ellipse(FX, TOPO - 92, 68, 56, 0, Math.PI, 0); c.closePath(); c.stroke(); });
        pinta([0, 0, 1, 0.1], (c) => { c.beginPath(); c.moveTo(FX - 7, TOPO - 146); c.lineTo(FX, TOPO - 176); c.lineTo(FX + 7, TOPO - 146); c.fill(); });
        // varanda com grade
        pinta([0.2, 0.9, 0, 0.85], (c) => c.fillRect(FX - 118, TOPO - 6, 236, 22));
        pinta([null, null, null, 0.9], (c) => {
          c.lineWidth = 2.4; c.beginPath(); c.moveTo(FX - 116, TOPO - 46); c.lineTo(FX + 116, TOPO - 46);
          for (let x = -116; x <= 116; x += 14.5) { c.moveTo(FX + x, TOPO - 46); c.lineTo(FX + x, TOPO - 6); }
          c.stroke();
        });
      }

      // ---------- o faroleiro (genérico: capa e chapéu de chuva amarelos) ----------
      function posFaroleiro(tq) {
        const p = suave(trecho(tq, T.sobe[0], T.sobe[1]));
        if (p >= 1) return { x: FX + 26, y: TOPO - 6, sobe: false };
        const y = mistura(BASE - 10, TOPO + 24, p), lance = Math.floor((BASE - 10 - y) / 60), u = ((BASE - 10 - y) / 60) - lance;
        const m = meiaLargura(y) - 34, lado = lance % 2 ? 1 : -1;
        return { x: FX + lado * m * (1 - 2 * u), y, sobe: p > 0 && p < 1, vira: lado };
      }
      function faroleiro(tq, idx, luz) {
        const p = posFaroleiro(tq), x = p.x, y = p.y, passo = p.sobe ? (idx % 2 ? 1 : -1) : 0;
        const braco = tq > T.acende - 0.5 && tq < T.acende + 0.6;
        // pernas e botas
        pinta([null, 0.5, null, 0.95], (c) => { c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 6, y - 16); c.lineTo(x - 7 + passo * 3, y - 2 + passo * 2); c.moveTo(x + 6, y - 16); c.lineTo(x + 7 - passo * 3, y - 2 - passo * 2); c.stroke(); });
        // capa
        pinta([0.1, 0, 1, 0], (c) => { c.beginPath(); c.moveTo(x - 17, y - 14); c.lineTo(x - 11, y - 44); c.lineTo(x + 11, y - 44); c.lineTo(x + 17, y - 14); c.closePath(); c.fill(); });
        // rosto e chapéu
        pinta([0.45, 0, 0.35, 0], (c) => { c.beginPath(); c.arc(x, y - 53, 10, 0, 7); c.fill(); });
        pinta([0.1, 0, 1, 0], (c) => { c.beginPath(); c.ellipse(x, y - 60, 17, 5, 0, 0, 7); c.fill(); c.beginPath(); c.arc(x, y - 61, 10, Math.PI, 0); c.fill(); });
        pinta([null, null, null, 0.95], (c) => {
          c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x - 17, y - 14); c.lineTo(x - 11, y - 44); c.lineTo(x + 11, y - 44); c.lineTo(x + 17, y - 14); c.closePath(); c.stroke();
          c.beginPath(); c.arc(x, y - 53, 10, 0, 7); c.stroke();
          c.beginPath(); c.arc(x + 4, y - 54, 1.6, 0, 7); c.fill();
          c.beginPath(); c.ellipse(x, y - 60, 17, 5, 0, 0, 7); c.stroke();
          // braço: segura a lanterna, ou levanta para acender a lâmpada
          c.lineWidth = 5; c.beginPath(); c.moveTo(x + 9, y - 38);
          if (braco) c.lineTo(x - 2, y - 74); else c.lineTo(x + 20, y - 26);
          c.stroke();
        });
        if (!braco && luz < 0.5) pinta([0, 0, 1, null], (c) => { c.beginPath(); c.arc(x + 22, y - 22, 6, 0, 7); c.fill(); });
      }

      // ---------- o feixe e a revelação ----------
      const LAMPADA = { x: FX - 6, y: TOPO - 52 };
      const B = H.baleia;
      const baleiaX = (tq) => B.x0 + B.anda * (tq - T.feixe[0]);
      const anguloFinal = () => Math.atan2(B.y - LAMPADA.y, baleiaX(T.feixe[1]) - LAMPADA.x);
      function anguloFeixe(tq) { return mistura(-0.62, anguloFinal(), saiDevagar(trecho(tq, T.feixe[0], T.feixe[1]))); }
      const ABRE = 0.15;
      function cunha(c, ang, raio) { c.beginPath(); c.moveTo(LAMPADA.x, LAMPADA.y); c.lineTo(LAMPADA.x + Math.cos(ang - ABRE) * raio, LAMPADA.y + Math.sin(ang - ABRE) * raio); c.lineTo(LAMPADA.x + Math.cos(ang + ABRE) * raio, LAMPADA.y + Math.sin(ang + ABRE) * raio); c.closePath(); }
      function feixe(tq) {
        if (tq < T.feixe[0] - 0.3) return 0;
        const ang = anguloFeixe(tq), forte = suave(trecho(tq, T.feixe[0] - 0.3, T.feixe[0] + 0.2));
        for (const a of [ang, ang + Math.PI]) {
          // onde a luz passa, o azul e o preto clareiam (multiplica) e o amarelo entra por cima
          pinta([0.82, 1 - 0.8 * forte, null, 1 - 0.85 * forte], (c) => { cunha(c, a, 2600); c.fill(); }, 'multiply');
          pinta([null, null, (c) => { const g = c.createRadialGradient(LAMPADA.x, LAMPADA.y, 20, LAMPADA.x, LAMPADA.y, 1500); g.addColorStop(0, cinza(0.98 * forte)); g.addColorStop(1, cinza(0.6 * forte)); return g; }, null], (c) => { cunha(c, a, 2600); c.fill(); }, 'lighten');
        }
        return ang;
      }
      function baleia(tq, ang) {
        if (!B || tq < T.feixe[0]) return;
        const x = baleiaX(tq), y = B.y, C = B.comprimento, h = C * 0.3;
        const corpo = (c) => {
          c.beginPath(); c.moveTo(x - C * 0.5, y);
          c.bezierCurveTo(x - C * 0.5, y - h * 0.9, x + C * 0.2, y - h * 1.0, x + C * 0.42, y - h * 0.2);
          c.quadraticCurveTo(x + C * 0.5, y - h * 0.1, x + C * 0.62, y - h * 0.35); // pedúnculo da cauda
          c.lineTo(x + C * 0.6, y + h * 0.05);
          c.bezierCurveTo(x + C * 0.3, y + h * 0.5, x - C * 0.3, y + h * 0.6, x - C * 0.5, y); c.closePath();
        };
        // só aparece dentro da luz (é a sobreposição das tintas que revela a baleia)
        cada((c) => { c.save(); cunha(c, ang, 2600); c.clip(); c.beginPath(); c.rect(0, HORIZONTE + 30, L, A); c.clip(); });
        pinta([0.95, 0.06, null, 0], (c) => { corpo(c); c.fill(); });
        // listras do mar passando por cima (está embaixo d'água)
        for (const li of LINHAS) if (li.y > y - h && li.i % 2) pinta([0.7, null, null, null], (c) => { corpo(c); c.clip(); ondaCaminho(c, li, tq, true); c.fill(); });
        pinta([null, 0.95, null, 0.2], (c) => {
          c.lineWidth = 4; c.lineCap = 'round';
          c.beginPath(); c.arc(x - C * 0.33, y - h * 0.25, 11, 0, 7); c.fill(); // olho
          c.beginPath(); c.moveTo(x - C * 0.47, y + h * 0.08); c.quadraticCurveTo(x - C * 0.36, y + h * 0.22, x - C * 0.25, y + h * 0.1); c.stroke(); // boca
          c.lineWidth = 2.5; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - C * 0.32 + i * 26, y + h * 0.3); c.lineTo(x - C * 0.1 + i * 30, y + h * 0.36); c.stroke(); }
        });
        cada((c) => c.restore());
      }
      function cauda(tq) {
        if (!B || tq < T.cauda) return;
        const sobe = saiDevagar(trecho(tq, T.cauda, T.cauda + 0.8)), x = baleiaX(tq) + B.comprimento * 0.66, y = HORIZONTE + 60 - sobe * 110;
        const forma = (c) => { c.beginPath(); c.moveTo(x - 14, HORIZONTE + 70); c.lineTo(x - 8, y + 10); c.quadraticCurveTo(x - 60, y - 10, x - 78, y - 44); c.quadraticCurveTo(x - 30, y - 30, x, y - 4); c.quadraticCurveTo(x + 30, y - 30, x + 78, y - 44); c.quadraticCurveTo(x + 60, y - 10, x + 8, y + 10); c.lineTo(x + 14, HORIZONTE + 70); c.closePath(); };
        cada((c) => { c.save(); c.beginPath(); c.rect(0, 0, L, HORIZONTE + 52); c.clip(); });
        pinta([0.95, 0.06, 0.7, 0], (c) => { forma(c); c.fill(); });
        cada((c) => c.restore());
      }
      function jato(tq) {
        if (!B || tq < T.jato) return;
        const k2 = trecho(tq, T.jato, T.jato + 0.9), x = baleiaX(tq) - B.comprimento * 0.12, y = B.y - B.comprimento * 0.3 + 20;
        const alt = 210 * saiDevagar(k2), abre = 30 + 70 * k2;
        const forma = (c) => {
          c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x - 6, y - alt * 0.7);
          c.quadraticCurveTo(x - abre * 0.8, y - alt * 1.05, x - abre, y - alt * 0.55); c.quadraticCurveTo(x - abre * 0.4, y - alt * 0.95, x, y - alt * 0.8);
          c.quadraticCurveTo(x + abre * 0.4, y - alt * 0.95, x + abre, y - alt * 0.55); c.quadraticCurveTo(x + abre * 0.8, y - alt * 1.05, x + 6, y - alt * 0.7);
          c.lineTo(x + 9, y); c.closePath();
        };
        pinta([0.08, 0, 0, 0], (c) => { forma(c); c.fill(); });
        pinta([0.85, null, null, null], (c) => { c.lineWidth = 3.5; forma(c); c.stroke(); });
      }

      // ---------- a margem do papel: título, marcas de registro e a tira de cores ----------
      function marcaRegistro(c, x, y) { c.lineWidth = 2.2; c.beginPath(); c.arc(x, y, 15, 0, 7); c.moveTo(x - 28, y); c.lineTo(x + 28, y); c.moveTo(x, y - 28); c.lineTo(x, y + 28); c.stroke(); c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }
      function margem() {
        // fundo de papel (nenhuma tinta) em volta da imagem
        pinta([0, 0, 0, 0], (c) => { c.beginPath(); c.rect(-MARGEM.x - 40, -MARGEM.y - 40, L + 2 * MARGEM.x + 80, A + 2 * MARGEM.y + 80); c.rect(0, 0, L, A); c.fill('evenodd'); });
        pinta([1, 1, 1, 1], (c) => { for (const [x, y] of [[-MARGEM.x / 2, A / 2], [L + MARGEM.x / 2, A / 2], [L / 2, -MARGEM.y / 2], [L / 2, A + MARGEM.y / 2]]) marcaRegistro(c, x, y); });
        // tira de cores: cada tinta sozinha e as misturas
        const amostras = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 1, 0, 0], [1, 0, 1, 0], [0, 1, 1, 0], [0.5, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 0.5, 0], [0, 0, 0, 0.5], [1, 1, 1, 0]];
        amostras.forEach((d, i) => pinta(d, (c) => c.fillRect(40 + i * 40, A + 34, 32, 32)));
        // título e assinatura impressos em preto
        pinta([null, null, null, 1], (c) => {
          c.textBaseline = 'middle';
          c.font = '700 50px Georgia, "DejaVu Serif", serif'; c.fillText(H.titulo || '', 0, -MARGEM.y / 2);
          c.font = '500 26px Georgia, "DejaVu Serif", serif'; c.textAlign = 'right'; c.fillText(H.assinatura || '', L, A + MARGEM.y / 2);
        });
        pinta([1, null, null, null], (c) => c.fillRect(L - 230, -MARGEM.y / 2 - 6, 230, 12));
      }

      // ---------- legenda: uma tira de papel (sem tinta) com o texto em preto, fixa na tela ----------
      function legenda(tq) {
        const l = (H.legendas || []).find((x) => tq >= x.de && tq < x.ate); if (!l) return;
        cada((c) => c.setTransform(k, 0, 0, k, 0, 0));
        cc[PRETO].font = '600 42px Georgia, "DejaVu Serif", serif';
        const w = cc[PRETO].measureText(l.texto).width + 64, x = (L - w) / 2, y = 905, h = 70;
        pinta([0, 0, 0, 0], (c) => { c.beginPath(); c.moveTo(x, y + 3); c.lineTo(x + w, y); c.lineTo(x + w - 4, y + h); c.lineTo(x + 2, y + h - 2); c.closePath(); c.fill(); });
        pinta([0.9, null, null, null], (c) => c.fillRect(x, y + h - 9, w, 7));
        pinta([null, null, null, 1], (c) => { c.font = '600 42px Georgia, "DejaVu Serif", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(l.texto, L / 2, y + h / 2 - 3); });
      }

      // ---------- o "shader": imprime as 4 chapas no papel ----------
      const gl = tela.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('este navegador não tem WebGL');
      const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
      const FRAG = `precision highp float;
uniform sampler2D c0, c1, c2, c3;
uniform vec2 res, cam, d0, d1, d2, d3;
uniform float k, zoom, imp;
uniform vec3 t0, t1, t2, t3, papel, mesa;
uniform vec4 folha;
float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
// cobertura de uma tinta num ponto: densidade da chapa -> retícula -> falhas da impressão
float tinta(sampler2D ch, vec2 px, vec2 w, vec2 d, float ang, float tipo, float n){
  vec2 wp = w - d;                                  // a chapa desencontrada
  float dens = texture2D(ch, (px - d * zoom * k) / res).r;
  if (dens < 0.01) return 0.0;
  float cheio = 0.7 * smoothstep(0.96, 1.0, dens);               // chapado (texto, contorno) falha menos
  dens *= 1.0 - 0.10 * (0.5 + 0.5 * sin(wp.y * 0.031 + n * 1.7 + imp * 0.9)) - 0.10 * vn(vec2(wp.y * 0.012, n * 7.0 + imp)); // faixas do rolo
  dens *= 1.0 - 0.22 * smoothstep(0.6, 0.95, 0.6 * vn(wp * 0.009 + n * 13.1 + imp * 0.37) + 0.4 * vn(wp.yx * 0.031 + n * 3.7));   // chapado falhado
  dens = mix(dens, 1.0, cheio);
  float cel = 7.0, aa = clamp(1.4 / (zoom * k * cel), 0.03, 0.5);
  float ca = cos(ang), sa = sin(ang); vec2 q = vec2(ca * wp.x - sa * wp.y, sa * wp.x + ca * wp.y) / cel;
  float f;
  if (tipo < 0.5) f = 0.5 + 0.25 * (cos(6.2832 * q.x) + cos(6.2832 * q.y));      // pontos
  else if (tipo < 1.5) { f = 0.5 + 0.5 * cos(6.2832 * q.y); aa *= 1.4; }          // linhas
  else { float g = max(0.9, 1.1 / (zoom * k)); f = h(floor(wp / g) + n * 17.0 + imp * 3.0); aa = 0.04; }      // grão (nunca menor que 1 pixel)
  f += (h(floor(wp * 2.0) + n) - 0.5) * 0.10;                                     // borda irregular da tinta
  float lim = mix(1.0 + aa, -aa, dens);
  float cov = smoothstep(lim - aa, lim + aa, f);
  if (h(floor(wp * 0.55) + n * 31.0 + imp * 7.0) > 0.9965) cov *= 0.15;          // furinhos
  return cov;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec2 w = (px / k - vec2(960.0, 540.0)) / zoom + cam;           // ponto na folha
  // borda da folha levemente irregular
  float borda = (vn(vec2(w.x * 0.08, w.y * 0.08)) - 0.5) * 3.0;
  vec2 dentro = min(w - folha.xy, folha.zw - w);
  float naFolha = smoothstep(-0.8, 0.8, min(dentro.x, dentro.y) + borda);
  vec3 cor = papel * (1.0 - 0.07 * vn(w * 0.9) - 0.035 * h(floor(w * 2.3)) - 0.03 * vn(w * 0.05));   // dente do papel
  cor *= mix(vec3(1.0), t0, 0.94 * tinta(c0, px, w, d0, 1.309, 0.0, 0.0));
  cor *= mix(vec3(1.0), t1, 0.94 * tinta(c1, px, w, d1, 0.262, 0.0, 1.0));
  cor *= mix(vec3(1.0), t2, 0.94 * tinta(c2, px, w, d2, 0.0, 1.0, 2.0));
  cor *= mix(vec3(1.0), t3, 0.96 * tinta(c3, px, w, d3, 0.785, 2.0, 3.0));
  float sombra = smoothstep(0.0, 26.0, -min(dentro.x, dentro.y) + 8.0);
  vec3 fora = mesa * (0.6 + 0.4 * sombra) * (1.0 + 0.15 * vn(w * 0.01));
  gl_FragColor = vec4(mix(fora, cor, naFolha), 1.0);
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
      gl.uniform3fv(U('t0'), cor01(TI.rosa)); gl.uniform3fv(U('t1'), cor01(TI.azul)); gl.uniform3fv(U('t2'), cor01(TI.amarelo)); gl.uniform3fv(U('t3'), cor01(TI.preto));
      gl.uniform3fv(U('papel'), cor01(TI.papel)); gl.uniform3fv(U('mesa'), cor01(TI.mesa));
      gl.uniform2f(U('res'), largura, altura); gl.uniform1f(U('k'), k);
      gl.uniform4f(U('folha'), -MARGEM.x, -MARGEM.y, L + MARGEM.x, A + MARGEM.y);
      gl.viewport(0, 0, largura, altura);
      // quanto cada tinta pode sair do lugar (em unidades da folha)
      const DESLOCA = [3.2, 2.2, 4.0, 1.6];

      // ---------- desenhar(t): monta as 4 chapas do instante t e imprime. Não guarda nada entre quadros. ----------
      function desenhar(t) {
        const { idx, tq } = impressao(t);
        const sorte = sorteio((H.semente || 1) * 7919 + idx * 31 + 5);
        const cam = camera(tq);
        cam.x += (sorte() - 0.5) * 2.4; cam.y += (sorte() - 0.5) * 2.4; // a folha nunca cai no mesmo lugar
        const desl = DESLOCA.map((m) => [(sorte() - 0.5) * 2 * m, (sorte() - 0.5) * 2 * m]);
        const luz = tq < T.acende ? 0 : tq < T.acende + 0.1 ? 0.7 : tq < T.acende + 0.2 ? 0.25 : 1;

        // 1) chapas em branco, com a câmera
        cada((c) => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#000'; c.fillRect(0, 0, largura, altura); });
        const z = cam.zoom * k;
        cada((c) => c.setTransform(z, 0, 0, z, k * 960 - cam.x * z, k * 540 - cam.y * z));
        // 2) a imagem, de trás para a frente
        cada((c) => { c.save(); c.beginPath(); c.rect(0, 0, L, A); c.clip(); });
        ceu(); lua(idx); estrelasDesenho(idx);
        for (const n of nuvens) nuvem(n, tq);
        ilha(); mar(tq);
        cauda(tq);
        pedra(tq, idx); escada(tq); torre(); topo(luz);
        faroleiro(tq, idx, luz);
        const ang = feixe(tq);
        baleia(tq, ang); jato(tq);
        cada((c) => c.restore());
        margem();
        legenda(tq);
        // 3) imprime
        chapas.forEach((cv, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texturas[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); });
        gl.uniform2f(U('cam'), cam.x, cam.y); gl.uniform1f(U('zoom'), cam.zoom); gl.uniform1f(U('imp'), idx % 97);
        desl.forEach((d, i) => gl.uniform2f(U('d' + i), d[0], d[1]));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // ---------- som: sai das MESMAS marcas de tempo da imagem ----------
      function som() {
        const s = Som.criar(duracao, H.semente || 1), M = H.musica;
        s.vento(0, duracao, { vol: 0.06, corte: 380, onda: 0.2 });                    // mar
        // a máquina de impressão: um toque macio de rolo a cada batida
        for (let t = 0.3; t < duracao - 0.3; t += M.batida / 2) s.toque(t, { vol: 0.025, corte: 900, dur: 0.05, pan: 0.4 });
        for (let t = 1.0; t < duracao - 0.8; t += M.batida * 2) s.batida(t, { vol: 0.16, freq: 70, dur: 0.3 });
        // acordes lo-fi (triângulo com vibrato leve) e melodia dedilhada
        const dAc = M.passo * 4;
        M.acordes.forEach((ac, i) => ac.forEach((n, j) => s.nota(n, 0.2 + i * dAc, dAc - 0.1, { forma: 'tri', vol: 0.045, ataque: 0.3, solta: 0.8, vibrato: 0.003, pan: (j - 1.5) * 0.3 })));
        M.notas.forEach((n, i) => { const t = 0.8 + i * M.passo; if (t < duracao - 1.0) s.corda(n, t, 1.4, { vol: 0.12, maciez: 0.6, pan: i % 2 ? 0.25 : -0.25 }); });
        // passos na escada (as mesmas trocas de pose do faroleiro)
        let ant = -1;
        for (let t = T.sobe[0]; t < T.sobe[1]; t += 1 / fps) { const { idx } = impressao(t); if (idx % 2 !== ant) { if (idx % 4 === 0) s.toque(t, { vol: 0.05, corte: 1200, dur: 0.06, pan: -0.3 }); ant = idx % 2; } }
        // a lâmpada acende: estalo + brilho
        s.toque(T.acende, { vol: 0.2, corte: 4000, dur: 0.05 });
        ['D6', 'A6'].forEach((n, i) => s.sino(n, T.acende + 0.1 + i * 0.07, 1.6, { vol: 0.07, brilho: 3 }));
        // o feixe gira: um zumbido que sobe
        s.nota(196, T.feixe[0], T.feixe[1] - T.feixe[0], { forma: 'seno', vol: 0.05, ataque: 0.8, solta: 0.6, vibrato: 0.01, vibratoHz: 0.6 });
        // a baleia canta, a cauda aparece e o jato sobe
        s.nota(110, T.feixe[1] - 0.4, 1.6, { forma: 'seno', vol: 0.12, ataque: 0.4, solta: 0.8, vibrato: 0.04, vibratoHz: 0.8 });
        s.nota(165, T.feixe[1] + 0.3, 1.2, { forma: 'seno', vol: 0.07, ataque: 0.4, solta: 0.8, vibrato: 0.05, vibratoHz: 0.7 });
        s.vento(T.jato, 1.2, { vol: 0.12, corte: 2600, onda: 2, entra: 0.08, sai: 0.8 });
        s.sala(0.45);
        return s.fim({ entra: 0.4, sai: 1.0 });
      }

      return { desenhar, som };
    },
  });
})();
