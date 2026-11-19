// motor.js — anime-2d: anime japonês 2D de cinema, todo em código.
// Fundo em tinta-pôster pintado UMA vez, em camadas de profundidade (multiplano); a personagem em
// acetato por cima; poses seguradas de 2 em 2 quadros, efeitos de 3 em 3, câmera lisa; e um passe de
// "fotografia" de anime: brilho (bloom), reflexo de lente, vazamento de luz quente, vinheta e grão.
//
// O motor sabe DESENHAR. O filme (planos, cortes, mundos, peças com lugar e tempo, cores, roupa,
// trem, sinal, música) está todo no historia.json. desenhar(t) é conta pura: o mesmo t dá o mesmo
// quadro, em qualquer ordem e em qualquer navegador.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio, ruido, cor } = Filme;
  const L = 1920, A = 1080, TAU = Math.PI * 2;
  const DINAMICAS = new Set(['menina', 'sinal', 'cancela', 'petalas', 'capim', 'trem', 'brilhoMar', 'aves', 'sombraBici']);

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d'), k = largura / L;
      const pal = H.cores, P = H.menina, B = H.bicicleta;
      const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };

      // ---------- tempos: personagem de 2 em 2 quadros, efeitos de 3 em 3 ----------
      const emDois = (t) => Math.floor(t * fps / 2 + 1e-6) * 2 / fps;
      const emTres = (t) => Math.floor(t * fps / 3 + 1e-6) * 3 / fps;

      // ---------- a bicicleta anda e freia (conta fechada, sem guardar nada) ----------
      const BA = H.andar, v0 = BA.velocidade, [f0, f1] = BA.freia;
      const posX = (t) => {
        if (t <= f0) return BA.x0 + v0 * t;
        const s = Math.min(t, f1) - f0, d = f1 - f0;
        return BA.x0 + v0 * f0 + v0 * (s - s * s / (2 * d));
      };
      const vel = (t) => (t <= f0 ? v0 : t >= f1 ? 0 : v0 * (1 - (t - f0) / (f1 - f0)));

      // ---------- sinal e cancela ----------
      const S = H.sinal;
      const lampada = (t) => (t < S.de || t >= S.ate ? -1 : Math.floor((t - S.de) / S.batida) % 2);
      const anguloCancela = (t) => { const C = H.cancela; return (Math.PI / 2) * (1 - suave(trecho(t, C.desce[0], C.desce[1])) + suave(trecho(t, C.sobe[0], C.sobe[1]))); };

      // ---------- trem ----------
      const TR = H.trem, compTrem = TR.carros * TR.comprimento + (TR.carros - 1) * 24;
      const frenteTrem = (t) => TR.entra - TR.velocidade * (t - TR.chega); // x da frente (vai para a esquerda)
      const caudaPassa = (x) => TR.chega + (TR.entra + compTrem - x) / TR.velocidade; // quando a cauda do trem passa pelo x da tela
      const ventoTrem = (t) => limita(suave(trecho(t, TR.chega + 0.12, TR.chega + 0.32)) * (1 - 0.85 * suave(trecho(t, caudaPassa(L / 2) + 0.1, caudaPassa(L / 2) + 0.6))), 0, 1);

      // ---------- mundos: cada camada parada é pintada uma vez ----------
      const mundos = {};
      for (const [nome, M] of Object.entries(H.mundos)) {
        const camadas = M.camadas.map((cam) => {
          const y0 = cam.y ?? 0, h = cam.altura ?? A, w = cam.largura ?? L;
          const tl = novaTela(w * k, h * k), cc = tl.getContext('2d');
          cc.setTransform(k, 0, 0, k, 0, -y0 * k);
          M.pecas.forEach((p, i) => {
            if ((p.camada || M.camadas[0].nome) !== cam.nome || DINAMICAS.has(p.tipo)) return;
            const f = window.Fundos[p.tipo];
            if (!f) throw new Error('peça desconhecida: ' + p.tipo);
            cc.save();
            if (p.giro) { cc.translate(p.x, p.y); cc.rotate(p.giro * Math.PI / 180); cc.translate(-p.x, -p.y); }
            f(cc, p, pal, sorteio((H.semente || 1) * 1000 + hash(nome + ':' + i)));
            cc.restore();
          });
          let fim = tl;
          if (cam.desfoque) { fim = novaTela(tl.width, tl.height); const fc = fim.getContext('2d'); fc.filter = `blur(${cam.desfoque * k}px)`; fc.drawImage(tl, 0, 0); }
          return { ...cam, y0, h, w, tela: fim };
        });
        mundos[nome] = { ...M, camadas };
      }

      // ---------- partículas sorteadas uma vez (posição sai de t) ----------
      const sorteados = (n, semente, f) => { const r = sorteio(semente); return Array.from({ length: n }, () => f(r)); };
      const PETALAS = sorteados(140, (H.semente || 1) + 11, (r) => ({ x: r() * 2400, y: r() * 1200, v: 0.6 + r() * 0.8, tam: 5 + r() * 9, gira: 1 + r() * 4, fase: r() * TAU, perto: r() }));
      const LAMINAS = sorteados(260, (H.semente || 1) + 12, (r) => ({ x: r(), h: 60 + r() * 110, larg: 6 + r() * 8, fase: r() * TAU, tom: r() }));
      const AVES = sorteados(26, (H.semente || 1) + 13, (r) => ({ dx: (r() - 0.5) * 260, dy: (r() - 0.5) * 90, tam: 4 + r() * 5, fase: r() * TAU }));
      const BRILHOS = sorteados(220, (H.semente || 1) + 14, (r) => ({ x: r(), y: r(), w: 6 + r() * 20, f: 3 + r() * 6, fase: r() * TAU }));
      const BOLHAS = sorteados(14, (H.semente || 1) + 15, (r) => ({ x: r() * L, y: r() * A, r: 30 + r() * 70, v: 20 + r() * 40, fase: r() * TAU, tom: r() }));

      // ---------- grão de filme: 3 telas de ruído, em pixels da tela (nunca menor que 1 px) ----------
      const GT = 256, GRAOS = [0, 1, 2].map((i) => {
        const g = novaTela(GT, GT), gc = g.getContext('2d'), img = gc.createImageData(GT, GT), r = sorteio(900 + i);
        for (let j = 0; j < GT * GT; j++) { const v = 128 + (r() + r() + r() - 1.5) * 90; img.data[j * 4] = img.data[j * 4 + 1] = img.data[j * 4 + 2] = v; img.data[j * 4 + 3] = 255; }
        gc.putImageData(img, 0, 0); return c.createPattern(g, 'repeat');
      });
      const pequena = novaTela(largura / 4, altura / 4), pc = pequena.getContext('2d');

      // ---------- câmera do plano (quadros-chave com chegada suave) ----------
      function quadroChave(lista, t) {
        if (!lista || !lista.length) return {};
        if (t <= lista[0].t) return lista[0];
        for (let i = 1; i < lista.length; i++) {
          const a = lista[i - 1], b = lista[i];
          if (t <= b.t) { const u = suave(trecho(t, a.t, b.t)), o = {}; for (const ch of Object.keys(b)) o[ch] = typeof b[ch] === 'number' && typeof a[ch] === 'number' ? mistura(a[ch], b[ch], u) : b[ch]; return o; }
        }
        return lista[lista.length - 1];
      }
      function camera(pl, t) {
        const q = quadroChave(pl.camera, t);
        let x = q.x ?? 0;
        let y = q.y ?? 0;
        if (pl.segue) x = posX(t) - (q.frente ?? 700); // acompanha a bicicleta
        if (pl.tremor) { const f = pl.tremor * ventoTrem(t); x += f * ruido(t * 23, 3); y += f * ruido(t * 19, 4); } // o trem sacode a câmera
        return { x, y, zoom: q.zoom ?? 1, giro: (q.giro ?? 0) * Math.PI / 180 };
      }
      // põe a câmera para uma camada de fator f (as de longe andam e crescem menos)
      function poeCamada(cam, f, cx = L / 2, cy = A / 2) {
        const z = 1 + (cam.zoom - 1) * Math.min(1.4, 0.35 + f * 0.65);
        c.setTransform(k, 0, 0, k, 0, 0);
        c.translate(cx, cy); c.rotate(cam.giro); c.scale(z, z); c.translate(-cx, -cy);
        c.translate(-cam.x * f, -cam.y * f);
      }

      // ---------- peças que mexem ----------
      function dinamica(p, t, pl, cam) {
        const te = emTres(t), tp = emDois(t);
        switch (p.tipo) {
          case 'sinal': {
            c.save(); if (p.giro) { c.translate(p.x, p.y); c.rotate(p.giro * Math.PI / 180); c.translate(-p.x, -p.y); }
            window.Fundos.sinal(c, p.x, p.y, p.escala || 1, pal, lampada(t), p.brilho ?? 1); c.restore(); break;
          }
          case 'cancela': window.Fundos.cancela(c, p.x, p.y, p.comprimento || 600, anguloCancela(te) * (p.fator ?? 1), p.escala || 1, pal, p.dir || -1); break;
          case 'sombraBici': { const x = posX(t) + 110 * (p.escala || 1); c.fillStyle = cor(pal.sombra, pal.sombra, 0, 0.45); c.beginPath(); c.ellipse(x, p.y, 190 * (p.escala || 1), 14, 0, 0, TAU); c.fill(); break; }
          case 'menina': {
            const e = p.escala || 1;
            c.save();
            if (p.vista === 'lado') {
              const xg = posX(t), xp = posX(tp), v = vel(tp) / v0;
              const s = tp - f0;
              let cab = -1 + 0.08 * Math.sin(tp * 7);
              if (s > 0) cab = s < 0.55 ? mistura(-1, 0.85, suave(s / 0.55)) : 0.85 * Math.exp(-2.5 * (s - 0.55)) * Math.cos(6 * (s - 0.55)) + 0.12 * (1 - Math.exp(-2 * (s - 0.55)));
              const piscou = (p.piscadas || []).some((pt) => Math.abs(tp - pt) < 0.07);
              c.translate(xg, p.y); c.scale(e, e);
              window.Menina.lado(c, P, B, { t: tp, dist: xp, rapido: limita((v - 0.5) * 1.6, 0, 1), cabelo: cab, inclina: 0.16 * Math.sin(Math.PI * limita((tp - f0) / (f1 - f0 + 0.35), 0, 1)), pe: suave(trecho(tp, f1 - 0.2, f1 + 0.12)), vento: 0.25 + 0.75 * v, olho: piscou ? 0 : 1 });
            } else if (p.vista === 'costas') {
              c.translate(p.x, p.y); c.scale(e, e);
              window.Menina.costas(c, P, B, { t: tp, vento: Math.max(p.ventoBase ?? 0.12, ventoTrem(tp)), lado: -1 });
            } else {
              const a = pl.acoes || {};
              let abre = a.abre ?? 1, aperta = 0;
              if (a.aperta) aperta = (p.apertaForca ?? 0.8) * (1 - suave(trecho(tp, a.aperta[0], a.aperta[1])));
              if (a.arregala != null && tp >= a.arregala) abre = mistura(abre, 1.18, suave(trecho(tp, a.arregala, a.arregala + 0.12)));
              for (const pt of a.piscadas || []) if (Math.abs(tp - pt) < 0.07) abre = 0;
              const boca = a.sorri ? suave(trecho(tp, a.sorri[0], a.sorri[1])) : 0;
              const mar = a.mar ? suave(trecho(tp, a.mar[0], a.mar[1])) : 0;
              const olhar = a.olhar ? [mistura(a.olhar[0][0], a.olhar[1][0], suave(trecho(tp, a.olhar[2], a.olhar[3]))), mistura(a.olhar[0][1], a.olhar[1][1], suave(trecho(tp, a.olhar[2], a.olhar[3])))] : [0, 0];
              const cabeca = a.ergue ? -a.ergue[2] * suave(trecho(tp, a.ergue[0], a.ergue[1])) : 0;
              c.translate(p.x, p.y + (a.ergue ? -18 * suave(trecho(tp, a.ergue[0], a.ergue[1])) : 0)); c.scale(e, e);
              window.Menina.frente(c, P, { t: tp, olhar, abre, aperta, boca, mar, vento: p.vento ?? 0.4, cabeca });
            }
            c.restore(); break;
          }
          case 'trem': {
            const fx = frenteTrem(emDois(t)), y0 = p.y, h = p.altura || 420;
            if (fx > L + 400 || fx + compTrem < -400) break;
            for (let i = 0; i < TR.carros; i++) {
              const x0 = fx + i * (TR.comprimento + 24), x1 = x0 + TR.comprimento;
              if (x1 < -50 || x0 > L + 50) continue;
              c.fillStyle = TR.corpo; c.beginPath(); c.roundRect(x0, y0, TR.comprimento, h, i === 0 ? [80, 8, 8, 30] : 8); c.fill();
              c.fillStyle = cor(TR.corpo, pal.sombra, 0.35); c.fillRect(x0, y0 + h * 0.82, TR.comprimento, h * 0.18);
              c.fillStyle = TR.faixa[0]; c.fillRect(x0, y0 + h * 0.62, TR.comprimento, h * 0.07);
              c.fillStyle = TR.faixa[1]; c.fillRect(x0, y0 + h * 0.71, TR.comprimento, h * 0.02);
              for (let wx = x0 + 70; wx < x1 - 120; wx += 230) { // janelas que piscam com o sol
                const flash = 0.5 + 0.5 * Math.sin(wx * 0.013 + t * 40);
                const g = c.createLinearGradient(wx, 0, wx + 170, 0); g.addColorStop(0, TR.janela); g.addColorStop(0.5, cor(TR.janela, '#ffffff', 0.25 + 0.55 * flash)); g.addColorStop(1, TR.janela);
                c.fillStyle = g; c.fillRect(wx, y0 + h * 0.18, 170, h * 0.32);
              }
              c.fillStyle = '#3a3a44'; c.fillRect(x0 + 40, y0 + h, TR.comprimento - 80, 26); // rodas e chassi
            }
            // linhas de velocidade por cima (efeito de 3 em 3)
            const r = sorteio(77 + Math.floor(te * 10));
            c.lineCap = 'round';
            for (let i = 0; i < 70; i++) {
              const yy = y0 - 40 + r() * (h + 100), xx = r() * L, ll = 200 + r() * 700;
              c.strokeStyle = r() < 0.7 ? 'rgba(255,255,255,0.55)' : cor(pal.sombra, pal.sombra, 0, 0.35); c.lineWidth = 1.5 + r() * 4;
              c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + ll, yy); c.stroke();
            }
            break;
          }
          case 'capim': { // capim na frente, balançando
            const largura = p.largura || 2600, V = p.vento ?? 0.6;
            for (const b of LAMINAS) {
              const x = p.x + b.x * largura, base = p.y + (p.altura || 220);
              const dobra = -(20 + 50 * V) - (10 + 20 * V) * Math.sin(te * 3.1 + b.fase + x * 0.004);
              c.fillStyle = b.tom < 0.4 ? pal.verde[0] : b.tom < 0.8 ? pal.verde[1] : pal.verde[2];
              c.beginPath(); c.moveTo(x - b.larg, base); c.quadraticCurveTo(x - b.larg * 0.2, base - b.h * 0.55, x + dobra, base - b.h * (p.alto || 1)); c.quadraticCurveTo(x + b.larg * 0.7, base - b.h * 0.45, x + b.larg, base); c.closePath(); c.fill();
            }
            break;
          }
          case 'brilhoMar': { // o mar cintila
            for (const b of BRILHOS) {
              const a = Math.max(0, Math.sin(te * b.f + b.fase)); if (a < 0.3) continue;
              const yy = p.y + b.y * (p.altura || 100), esc = 0.4 + 0.8 * b.y;
              c.fillStyle = `rgba(255,255,245,${(0.85 * a).toFixed(3)})`; c.fillRect(p.x + b.x * (p.largura || L), yy, b.w * esc, 2.5 * esc);
            }
            break;
          }
          case 'aves': { // bando de pássaros cruzando o céu (de 3 em 3)
            c.strokeStyle = pal.ave || '#2a3050'; c.lineCap = 'round';
            for (const a of AVES) {
              const x = p.x + a.dx + (p.anda || 60) * (te - pl.de), y = p.y + a.dy, asa = a.tam * (0.3 + 0.7 * Math.abs(Math.sin(te * 9 + a.fase)));
              c.lineWidth = 2; c.beginPath(); c.moveTo(x - a.tam, y - asa); c.quadraticCurveTo(x - a.tam * 0.3, y, x, y); c.quadraticCurveTo(x + a.tam * 0.3, y, x + a.tam, y - asa); c.stroke();
            }
            break;
          }
          case 'petalas': break; // as pétalas ficam por cima de tudo (ver frente())
        }
      }

      // pétalas de verão voando e bolhas fora de foco, por cima de tudo (de 3 em 3)
      function frente(pl, t) {
        const te = emTres(t), n = pl.petalas ?? 40, vx = pl.ventoX ?? -260, vy = pl.ventoY ?? 60;
        c.setTransform(k, 0, 0, k, 0, 0);
        for (let i = 0; i < Math.min(n, PETALAS.length); i++) {
          const p = PETALAS[i], tam = p.tam * (p.perto > 0.85 ? 2.4 : 1);
          const x = ((p.x + te * vx * p.v) % 2400 + 2400) % 2400 - 240, y = ((p.y + te * vy * p.v + 30 * Math.sin(te * 2 + p.fase)) % 1200 + 1200) % 1200 - 60;
          c.save(); c.translate(x, y); c.rotate(te * p.gira + p.fase); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(te * p.gira + p.fase)));
          c.globalAlpha = p.perto > 0.85 ? 0.45 : 0.9;
          c.fillStyle = p.perto > 0.5 ? '#ffffff' : (pal.petala || '#ffd9e4'); c.beginPath(); c.ellipse(0, 0, tam, tam * 0.55, 0, 0, TAU); c.fill(); c.restore();
        }
        if (pl.bolhas) for (const b of BOLHAS) {
          const x = (b.x + te * b.v) % (L + 200) - 100, y = b.y + 20 * Math.sin(te + b.fase);
          const g = c.createRadialGradient(x, y, 0, x, y, b.r); g.addColorStop(0, `rgba(255,255,240,${0.16 * pl.bolhas})`); g.addColorStop(0.8, `rgba(255,255,240,${0.12 * pl.bolhas})`); g.addColorStop(1, 'rgba(255,255,240,0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, b.r, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
      }

      // ---------- fotografia de anime ----------
      function fotografia(pl, t, cam) {
        // brilho (bloom): uma cópia pequena, só com o que é claro, borrada e somada
        pc.reset(); pc.filter = `brightness(${pl.bloomLimiar ?? 0.9}) contrast(2.6) blur(${Math.max(1, 6 * k)}px)`;
        pc.drawImage(tela, 0, 0, pequena.width, pequena.height); pc.filter = 'none';
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'screen'; c.globalAlpha = pl.bloom ?? 0.35;
        c.drawImage(pequena, 0, 0, largura, altura); c.globalAlpha = 1;
        c.setTransform(k, 0, 0, k, 0, 0);
        // vazamento de luz quente de um canto
        const vz = pl.vazamento ?? 0.25;
        if (vz > 0) {
          const [lx, ly] = pl.vazamentoDe || [L, 0];
          const g = c.createRadialGradient(lx, ly, 0, lx, ly, 1100); g.addColorStop(0, `rgba(255,190,110,${vz})`); g.addColorStop(0.5, `rgba(255,140,90,${vz * 0.35})`); g.addColorStop(1, 'rgba(255,140,90,0)');
          c.fillStyle = g; c.fillRect(0, 0, L, A);
        }
        // reflexo de lente (sol)
        if (pl.sol) {
          const [sx0, sy0] = pl.sol, sx = sx0 - cam.x * (pl.solFator ?? 0), sy = sy0 - cam.y * (pl.solFator ?? 0);
          const g = c.createRadialGradient(sx, sy, 0, sx, sy, 380); g.addColorStop(0, 'rgba(255,255,240,0.95)'); g.addColorStop(0.15, 'rgba(255,250,220,0.6)'); g.addColorStop(1, 'rgba(255,240,200,0)');
          c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 380, 0, TAU); c.fill();
          c.save(); c.translate(sx, sy); c.rotate(t * 0.05);
          for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.fillStyle = `rgba(255,250,225,${i % 2 ? 0.1 : 0.18})`; c.beginPath(); c.moveTo(0, -4); c.lineTo(700 + (i % 3) * 200, 0); c.lineTo(0, 4); c.fill(); }
          c.restore();
          const dx = L / 2 - sx, dy = A / 2 - sy;
          [[0.5, 40, '120,200,255'], [0.85, 70, '255,200,120'], [1.3, 26, '180,255,200'], [1.6, 110, '160,170,255']].forEach(([u, r, rgb]) => {
            c.fillStyle = `rgba(${rgb},0.12)`; c.beginPath(); c.arc(sx + dx * u, sy + dy * u, r, 0, TAU); c.fill();
          });
        }
        c.globalCompositeOperation = 'source-over';
        // vinheta
        const v = c.createRadialGradient(L / 2, A / 2, A * 0.45, L / 2, A / 2, A * 1.05);
        v.addColorStop(0, 'rgba(20,20,60,0)'); v.addColorStop(1, `rgba(20,20,60,${pl.vinheta ?? 0.38})`);
        c.fillStyle = v; c.fillRect(0, 0, L, A);
        // grão fino (troca a cada 2 quadros)
        const q = Math.floor(t * fps / 2 + 1e-6), r = sorteio(5000 + q);
        c.setTransform(1, 0, 0, 1, Math.floor(r() * GT), Math.floor(r() * GT));
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = H.grao ?? 0.16; c.fillStyle = GRAOS[q % 3];
        c.fillRect(-GT, -GT, largura + GT, altura + GT);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }

      // ---------- título (só no começo; letras em traço, sem fonte instalada) ----------
      function titulo(t) {
        const TI = H.tituloNaTela; if (!TI) return;
        const a = Math.min(suave(trecho(t, TI.de, TI.de + 0.3)), 1 - suave(trecho(t, TI.ate - 0.35, TI.ate)));
        if (a <= 0) return;
        c.setTransform(k, 0, 0, k, 0, 0);
        const w = window.Letras.largura(H.titulo, TI.tamanho) + 80;
        const g = c.createLinearGradient(TI.x - 40, 0, TI.x + w + 120, 0); g.addColorStop(0, `rgba(16,22,60,${0.5 * a})`); g.addColorStop(1, 'rgba(16,22,60,0)');
        c.fillStyle = g; c.fillRect(TI.x - 40, TI.y - TI.tamanho * 1.45, w + 160, TI.tamanho * 2.1);
        window.Letras.texto(c, H.titulo, TI.x, TI.y, TI.tamanho, { cor: `rgba(255,253,240,${a})`, alinha: 'esquerda', prog: trecho(t, TI.escreve[0], TI.escreve[1]), sem: 5, boil: Math.floor(t * 10), larg: TI.tamanho * 0.08 });
      }

      // ---------- desenhar(t) ----------
      function planoEm(t) {
        for (const pl of H.planos) if (t >= pl.de && t < pl.ate) return pl;
        return H.planos[H.planos.length - 1];
      }
      function desenhar(t) {
        const pl = planoEm(t), M = mundos[pl.mundo], cam = camera(pl, t);
        c.reset(); // zera TODO o estado do pincel (traço, junta, alfa...): nada passa de um quadro para o outro
        c.fillStyle = pal.ceu[1]; c.fillRect(0, 0, largura, altura);
        for (const cm of M.camadas) {
          poeCamada(cam, cm.fator, pl.centro?.[0], pl.centro?.[1]);
          c.drawImage(cm.tela, 0, cm.y0, cm.w, cm.h);
          M.pecas.forEach((p) => { if (DINAMICAS.has(p.tipo) && (p.camada || M.camadas[0].nome) === cm.nome) dinamica(p, t, pl, cam); });
        }
        frente(pl, t);
        fotografia(pl, t, cam);
        // corte com clarão (o trem chegando)
        if (pl.clarao) { const a = 1 - trecho(t, pl.de, pl.de + pl.clarao); if (a > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(255,255,250,${0.85 * a})`; c.fillRect(0, 0, largura, altura); } }
        titulo(t);
      }

      // ---------- som: tudo nas mesmas marcas de tempo da imagem ----------
      function som() {
        const m = Som.criar(duracao, (H.semente || 1) + 3), MU = H.musica;
        // piano e pads
        for (const [nota, t0, dur, vol] of MU.piano) { m.sino(nota, t0, dur, { vol: vol ?? 0.12, brilho: 0.9, pan: -0.1 }); m.nota(nota, t0, dur * 0.6, { vol: (vol ?? 0.12) * 0.25, forma: 'tri', ataque: 0.005, solta: dur * 0.5 }); }
        for (const [notas, t0, dur] of MU.pads) notas.forEach((n, i) => m.nota(n, t0, dur, { vol: MU.volPad ?? 0.04, forma: 'tri', ataque: 0.6, solta: 1.2, vibrato: 0.003, pan: i % 2 ? 0.4 : -0.4 }));
        // cigarras: zumbido de pios bem rápidos
        for (const [t0, dur] of MU.cigarras) for (let s = t0; s < t0 + dur; s += 0.5) m.pio(s, { freq: 4700 + 300 * Math.sin(s * 3), repete: 24, intervalo: 0.021, dur: 0.016, vol: MU.volCigarra ?? 0.02, pan: Math.sin(s * 1.3) * 0.6 });
        // vento da descida
        m.vento(0, f1 + 0.3, { vol: 0.05, corte: 900, onda: 0.4, sai: 0.5 });
        // freio
        m.pio(f0 + 0.05, { freq: 2300, repete: 1, dur: (f1 - f0) * 0.8, vol: 0.025, sobe: -0.15, pan: 0.1 });
        // sino da passagem: uma batida por troca de lâmpada (a mesma conta da luz)
        for (let s = S.de; s < S.ate; s += S.batida) {
          const longe = H.planos.find((p) => s >= p.de && s < p.ate)?.sinoLonge ?? 1;
          m.sino(S.nota, s, 0.38, { vol: 0.11 * longe, brilho: 3.2, pan: 0.3 }); m.sino(S.nota2 || S.nota, s, 0.3, { vol: 0.05 * longe, brilho: 2.5, pan: 0.3 });
        }
        // cancela descendo e subindo (motorzinho)
        m.toque(H.cancela.desce[1], { vol: 0.12, corte: 1800, dur: 0.12 });
        m.vento(H.cancela.sobe[0], H.cancela.sobe[1] - H.cancela.sobe[0], { vol: 0.02, corte: 300, entra: 0.2, sai: 0.2 });
        // trem: chegada, ronco, batidas das rodas, saída
        const tTrem = TR.chega, passa = caudaPassa(0) - TR.chega; // o mesmo tempo em que o trem está na tela
        m.vento(tTrem - 0.9, 0.95, { vol: 0.05, corte: 260, entra: 0.85, sai: 0.1 });
        m.vento(tTrem, passa + 0.6, { vol: TR.volume ?? 0.16, corte: 700, onda: 3, profundidade: 0.3, entra: 0.08, sai: 0.5 });
        for (let i = 0; i <= TR.carros; i++) { // cada emenda de vagão (e a ponta) passando na frente dela, a mesma conta da imagem
          const s = TR.chega + (TR.entra + i * (TR.comprimento + 24) - L / 2) / TR.velocidade;
          for (const d of [-0.08, 0]) { m.batida(s + d, { vol: 0.32, freq: 70, dur: 0.12 }); m.toque(s + d, { vol: 0.08, corte: 2500 }); }
        }
        // mar e vento depois do trem
        m.vento(tTrem + passa - 0.1, duracao - (tTrem + passa) + 0.1, { vol: 0.045, corte: 420, onda: 0.18, entra: 0.6, sai: 0.8 });
        m.sala(0.3);
        return m.fim({ entra: 0.05, sai: 0.8, pico: MU.pico ?? 0.85 });
      }

      return { desenhar, som };
    },
  });
})();
