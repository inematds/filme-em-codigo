// MOTOR "acetato-classico" — desenho animado clássico feito à mão (longas dos anos 1940 e 1950).
// Jeito de animar: FUNDO PINTADO em cinco camadas de aquarela e guache (fundo.js), movidas como uma
// câmera multiplano (as de longe andam menos e são mais macias), e a personagem desenhada por cima
// como ACETATO (raposa.js): pintada chapada, com linha de nanquim. A personagem troca de desenho de
// 2 em 2 quadros, e de 1 em 1 na ação rápida; a câmera anda lisa. No fim, um "copião" de cinema:
// grão, tremor da janela do projetor, poeira no acetato, vinheta e cor quente de cópia antiga.
// Nada da história mora aqui: tudo o que muda está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, ruido, cor } = Filme;
  const L = 1920, A = 1080, TAU = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d'), k = largura / L;
      const P = H.pecas || [], uma = (tipo) => P.find((p) => p.tipo === tipo) || null;
      const CO = H.cores;
      const F = Fundo.pintar(H, k);                     // pintado uma vez só
      const R = uma('raposa'), acs = Raposa.linha(R);
      const acao = (tipo) => acs.find((a) => a.tipo === tipo);

      // ---------- tempo do acetato: 2 em 2 quadros, 1 em 1 na ação rápida ----------
      const UNS = R.uns || [];
      function celDe(q) {
        const t = q / fps;
        if (UNS.some(([a, b]) => t >= a && t < b)) return q;
        return q - (q % 2);
      }

      // ---------- câmera (lisa, de 1 em 1 quadro) ----------
      function camera(t) {
        const C = H.camera; let i = 0;
        while (i < C.length - 2 && t > C[i + 1].t) i++;
        const a = C[i], b = C[i + 1], f = suave(trecho(t, a.t, b.t));
        return { x: mistura(a.x, b.x, f), y: mistura(a.y, b.y, f), zoom: mistura(a.zoom, b.zoom, f) };
      }
      // matriz de uma camada com profundidade f (f = 1: o chão da raposa)
      function matriz(cam, f, wx, wy) {
        const z = 1 + (cam.zoom - 1) * f, cx = 960 + (cam.x - 960) * f, cy = 540 + (cam.y - 540) * f;
        return new DOMMatrix([k * z, 0, 0, k * z, k * (960 - cx * z) + wx, k * (540 - cy * z) + wy]);
      }

      // ---------- vaga-lumes: tudo calculado a partir de t (nada guardado entre quadros) ----------
      const VG = uma('vagalumes') || {}, ON = uma('onda') || {}, HV = uma('vagalume') || {};
      const esp = acao('espirro'), tEsp = esp ? (esp.em ?? esp.ate) : 1e9;
      const narizEsp = Raposa.pontos(R, Raposa.poseEm(acs, tEsp + 0.05)).nariz;
      const centroOnda = [narizEsp[0], R.y];
      const vel = ON.vel || 800, achata = ON.achata || 0.3;
      const sv = sorteio((H.semente || 1) * 977 + 3), [ax0, ax1, ay0, ay1] = VG.area || [0, 1920, 600, 1060];
      const BICHOS = Array.from({ length: VG.quantos || 300 }, () => {
        const hx = ax0 + sv() * (ax1 - ax0), hy = ay0 + Math.pow(sv(), 0.8) * (ay1 - ay0);
        const d = Math.hypot(hx - centroOnda[0], (hy - centroOnda[1]) / achata);
        return { hx, hy, sobe: (VG.sobe || [120, 420])[0] + sv() * ((VG.sobe || [120, 420])[1] - (VG.sobe || [120, 420])[0]), t0: tEsp + 0.15 + d / vel + sv() * 0.25,
          f1: 0.6 + sv() * 1.2, f2: 0.4 + sv() * 0.9, fase: sv() * TAU, pisca: 2 + sv() * 3.5, tam: 0.6 + sv() * 0.7, deriva: (sv() - 0.5) * 30 };
      });
      const SOLTOS = Array.from({ length: VG.soltos || 12 }, () => ({ x: ax0 + sv() * (ax1 - ax0), y: 380 + sv() * 380, f1: 0.2 + sv() * 0.4, f2: 0.3 + sv() * 0.5, fase: sv() * TAU, pisca: 1.5 + sv() * 2, tam: 0.5 + sv() * 0.5 }));
      const brilho = (() => { // o brilho de um vaga-lume, pintado uma vez numa tela pequena
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const g = cv.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, 'rgba(255,255,236,1)'); rg.addColorStop(0.07, cor(CO.vagalume, CO.vagalume, 0, 1));
        rg.addColorStop(0.2, cor(CO.vagalume, CO.vagalume, 0, 0.35)); rg.addColorStop(0.5, cor(CO.vagalumeHalo, CO.vagalumeHalo, 0, 0.08)); rg.addColorStop(1, cor(CO.vagalumeHalo, CO.vagalumeHalo, 0, 0));
        g.fillStyle = rg; g.fillRect(0, 0, 128, 128); return cv;
      })();
      function vagalumes(tc) {
        const lista = [];
        for (const b of BICHOS) {
          const u = tc - b.t0; if (u < 0) continue;
          const sobe = b.sobe * (1 - Math.exp(-u * 1.1));
          const x = b.hx + b.deriva * u + 24 * Math.sin(u * b.f1 + b.fase), y = b.hy - sobe + 14 * Math.sin(u * b.f2 * 2 + b.fase * 1.3);
          const a = Math.min(1, u / 0.25) * (0.55 + 0.45 * Math.sin(tc * b.pisca + b.fase));
          lista.push([x, y, b.tam * (0.55 + 0.75 * (b.hy - 560) / 500), a]);
        }
        for (const s of SOLTOS) {
          const x = s.x + 40 * Math.sin(tc * s.f1 + s.fase), y = s.y + 25 * Math.sin(tc * s.f2 + s.fase * 2);
          lista.push([x, y, s.tam, 0.35 + 0.35 * Math.max(0, Math.sin(tc * s.pisca + s.fase))]);
        }
        return lista;
      }
      const sobeFracao = (tc) => limita((tc - tEsp - 0.2) / ((ON.alcance || 1500) / vel + 0.6));

      // o vaga-lume herói: parado na planta, foge no pulo, passeia e pousa no nariz
      const topo = F.chao.planta ? [F.chao.planta.x + 2, F.chao.planta.y - 8] : [960, 700];
      const voo = HV.voo || [];
      function heroi(tc, nariz) {
        if (!voo.length || tc < voo[0].t) return [topo[0], topo[1] + 2 * Math.sin(tc * 3)];
        const ult = voo[voo.length - 1];
        if (tc <= ult.t) {
          let i = 0; while (i < voo.length - 2 && tc > voo[i + 1].t) i++;
          const p0 = voo[Math.max(0, i - 1)], p1 = voo[i], p2 = voo[i + 1], p3 = voo[Math.min(voo.length - 1, i + 2)];
          const u = trecho(tc, p1.t, p2.t), cr = (a, b, c2, d) => 0.5 * ((2 * b) + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
          return [cr(p0.x, p1.x, p2.x, p3.x), cr(p0.y, p1.y, p2.y, p3.y)];
        }
        const alvo = [nariz[0] - 2, nariz[1] - 9 * (R.escala || 1)], kk = suave(trecho(tc, ult.t, HV.pousa || ult.t + 0.6));
        return [mistura(ult.x, alvo[0], kk), mistura(ult.y, alvo[1], kk) - 40 * Math.sin(Math.PI * kk)];
      }

      // ---------- efeitos desenhados à mão (acetato de efeitos) ----------
      function poeira(x, y, t0, tc, lado) {
        const u = (tc - t0) / 0.6; if (u < 0 || u > 1) return;
        const sp = sorteio(Math.round(t0 * 100) + 5);
        for (let i = 0; i < 7; i++) {
          const dir = (i % 2 ? 1 : -1) * (lado || 1), ex = dir * (20 + 90 * saiDevagar(u)) * (0.6 + sp()), ey = -8 - 30 * saiDevagar(u) * sp();
          const rr = (12 + 20 * u) * (0.6 + 0.6 * sp());
          c.beginPath(); c.arc(x + ex, y + ey, rr, 0, TAU);
          c.fillStyle = cor(CO.poeira, CO.poeira, 0, 0.85 * (1 - u)); c.fill();
          c.strokeStyle = cor(CO.tinta, CO.tinta, 0, 0.5 * (1 - u)); c.lineWidth = 2; c.stroke();
        }
      }
      function estrela(x, y, r, gira) {
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = gira + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        c.closePath(); c.fillStyle = CO.estrelaTonta; c.fill(); c.strokeStyle = CO.tinta; c.lineWidth = 2; c.stroke();
      }
      function onda(t) {
        const u = t - tEsp; if (u < 0) return;
        const dur = (ON.alcance || 1500) / vel;
        for (const [atraso, forca] of [[0, 1], [0.18, 0.55], [0.36, 0.3]]) {
          const uu = u - atraso; if (uu < 0 || uu > dur) continue;
          const r = vel * uu, a = forca * 0.6 * (1 - uu / dur) * Math.min(1, uu / 0.08);
          c.beginPath(); c.ellipse(centroOnda[0], centroOnda[1], r, r * achata, 0, 0, TAU);
          c.strokeStyle = cor(CO.onda, CO.onda, 0, a); c.lineWidth = 7 - 4 * uu / dur; c.stroke();
        }
      }

      // ---------- acabamento de cópia de cinema (pintado uma vez; por quadro só se escolhe o pedaço) ----------
      const GRAO = 256;
      const graos = [0, 1, 2].map((i) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = GRAO;
        const g = cv.getContext('2d'), img = g.createImageData(GRAO, GRAO), sg = sorteio(4242 + i * 77);
        for (let j = 0; j < GRAO * GRAO; j++) { const v = 128 + (sg() + sg() + sg() - 1.5) * 90; img.data[j * 4] = img.data[j * 4 + 1] = img.data[j * 4 + 2] = v; img.data[j * 4 + 3] = 255; }
        g.putImageData(img, 0, 0); return g.createPattern(cv, 'repeat');
      });
      const vinheta = (() => { const g = c.createRadialGradient(largura / 2, altura / 2, altura * 0.35, largura / 2, altura / 2, largura * 0.62); g.addColorStop(0, 'rgba(40,22,10,0)'); g.addColorStop(1, 'rgba(30,16,8,0.62)'); return g; })();
      function copiao(sorte, q) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'multiply'; c.fillStyle = CO.copiaQuente; c.fillRect(0, 0, largura, altura);   // cor quente de cópia
        c.globalCompositeOperation = 'screen'; c.fillStyle = CO.copiaPreto; c.fillRect(0, 0, largura, altura);       // preto lavado
        const fl = (sorte() - 0.5) * 0.05;                                                                                 // a luz do projetor pisca
        c.globalCompositeOperation = fl > 0 ? 'screen' : 'multiply'; c.fillStyle = fl > 0 ? `rgba(255,240,215,${fl})` : `rgba(0,0,0,${-fl})`; c.fillRect(0, 0, largura, altura);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.16;                                                      // grão
        const gx = Math.floor(sorte() * GRAO), gy = Math.floor(sorte() * GRAO);
        c.translate(-gx, -gy); c.fillStyle = graos[q % 3]; c.fillRect(gx, gy, largura, altura); c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.fillStyle = vinheta; c.fillRect(0, 0, largura, altura);
        const n = Math.floor(sorte() * 5);                                                                              // poeira e fiapo no acetato
        for (let i = 0; i < n; i++) {
          const x = sorte() * largura, y = sorte() * altura, r = (1 + sorte() * 2.5) * Math.max(1, k * 1.5), claro = sorte() < 0.35;
          c.fillStyle = claro ? 'rgba(255,248,225,0.55)' : 'rgba(20,12,6,0.6)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        }
        if (sorte() < 0.12) {
          const x = sorte() * largura, y = sorte() * altura, s = 30 * k + sorte() * 40 * k;
          c.strokeStyle = 'rgba(20,12,6,0.45)'; c.lineWidth = Math.max(1, 1.4 * k); c.beginPath(); c.moveTo(x, y);
          c.bezierCurveTo(x + s * 0.5, y - s * 0.4, x + s * 0.2, y + s * 0.6, x + s, y + s * 0.2); c.stroke();
        }
      }

      // ---------- título (letras em traços: não depende de fonte instalada) ----------
      function titulo(t) {
        const p = uma('titulo'); if (!p || !H.titulo) return;
        const a = limita(Math.min(trecho(t, p.de, p.de + 0.5), 1 - trecho(t, p.ate - 0.5, p.ate)));
        if (a <= 0) return;
        const tam = (p.tamanho || 52) * k, txt = H.titulo.toUpperCase();
        const x = (p.x ?? 120) * k, y = (p.y ?? 900) * k;
        c.setTransform(1, 0, 0, 1, 0, 0);
        const g = c.createLinearGradient(0, y - tam * 1.6, 0, y + tam * 1.6);
        g.addColorStop(0, 'rgba(6,12,14,0)'); g.addColorStop(0.5, `rgba(6,12,14,${0.5 * a})`); g.addColorStop(1, 'rgba(6,12,14,0)');
        c.fillStyle = g; c.fillRect(0, y - tam * 1.6, largura, tam * 3.2);
        c.strokeStyle = cor(CO.letra, CO.letra, 0, a); c.lineWidth = Math.max(1.5, tam * 0.11); c.lineCap = 'round'; c.lineJoin = 'round';
        let px = x;
        for (const ch of txt) {
          const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
          for (const tr of gl.tracos) { c.beginPath(); tr.forEach(([u, v], i) => (i ? c.lineTo(px + u * tam, y - tam / 2 + v * tam) : c.moveTo(px + u * tam, y - tam / 2 + v * tam))); c.stroke(); }
          px += (gl.w + 0.2) * tam;
        }
      }

      // ---------- desenhar(t): conta pura ----------
      const ate = acao('aterrissa'), camb = acao('cambalhota'), tonto = acao('tonto');
      function desenhar(t) {
        const q = Math.round(t * fps), cel = celDe(q), tc = cel / fps;
        const sorte = sorteio((H.semente || 1) * 7919 + q * 31 + 5);
        const cam = camera(t);
        const wx = (1.3 * ruido(q * 0.41, 21) + 0.5 * (sorte() - 0.5)) * k, wy = (1.1 * ruido(q * 0.37, 22) + 0.5 * (sorte() - 0.5)) * k; // tremor da janela
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#05080a'; c.fillRect(0, 0, largura, altura);
        // 1) as camadas pintadas, de longe para perto (menos a frente)
        const camada = (cm) => { const M = matriz(cam, cm.f, wx, wy); c.setTransform(M.a / cm.res, 0, 0, M.d / cm.res, M.e + M.a * F.X0, M.f + M.d * F.Y0); c.drawImage(cm.cv, 0, 0); };
        for (const cm of F.camadas) if (cm.nome !== 'frente') camada(cm);
        const M1 = matriz(cam, 1, wx, wy);
        c.setTransform(M1);
        // 2) luz dos vaga-lumes sobre a pintura
        const fr = sobeFracao(tc);
        if (fr > 0) {
          c.globalCompositeOperation = 'lighter';
          const rg = c.createRadialGradient(centroOnda[0], centroOnda[1] - 120, 0, centroOnda[0], centroOnda[1] - 120, 1300);
          rg.addColorStop(0, cor(CO.luzVagalume, CO.luzVagalume, 0, 0.22 * fr)); rg.addColorStop(1, cor(CO.luzVagalume, CO.luzVagalume, 0, 0));
          c.fillStyle = rg; c.fillRect(-300, -200, 2500, 1500);
          c.globalCompositeOperation = 'source-over';
        }
        const pr = Raposa.poseEm(acs, tc), pts = Raposa.pontos(R, pr);
        const vl = vagalumes(tc), hp = heroi(tc, pts.nariz);
        // reflexo no lago
        const lg = F.chao.lago;
        if (lg) {
          c.save(); c.beginPath(); c.ellipse(lg.x, lg.y, lg.rx * 0.97, lg.ry * 0.92, 0, 0, TAU); c.clip();
          c.globalCompositeOperation = 'lighter';
          for (const [x, y, s, a] of vl) {
            if (Math.abs(x - lg.x) > lg.rx || y > lg.y + lg.ry) continue;
            const ry = lg.y - lg.ry * 0.6 + (lg.y - y) * 0.35, rr = 30 * s;
            c.globalAlpha = a * 0.45; c.drawImage(brilho, x - rr, ry - rr * 0.6, rr * 2, rr * 1.2);
          }
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
          c.restore();
        }
        // 3) a onda do espirro cruza o capim
        onda(t);
        // 4) sombra do acetato no chão e a raposa
        const noAr = limita(-pr.alto / 120);
        c.fillStyle = cor(CO.sombraChao, CO.sombraChao, 0, 0.45 * (1 - 0.6 * noAr));
        c.beginPath(); c.ellipse(pr.x - 4 * (R.escala || 1), R.y + 3, 78 * (R.escala || 1) * (1 - 0.4 * noAr), 13 * (R.escala || 1), 0, 0, TAU); c.fill();
        Raposa.desenha(c, M1, R, pr, cel);
        c.setTransform(M1);
        // 5) efeitos: poeira, estrelas da tontura, respingo do espirro
        if (ate) poeira(ate.x0, R.y, ate.de, tc, 1);
        if (camb) poeira(camb.x1, R.y, camb.ate - 0.1, tc, 1);
        if (tonto && tc >= tonto.de && tc < tonto.ate) {
          const [hx, hy] = pts.cabeca;
          for (let i = 0; i < 3; i++) {
            const a = tc * TAU * 1.3 + i * TAU / 3;
            estrela(hx + Math.cos(a) * 62, hy - 70 + Math.sin(a) * 16, 12 + 2 * Math.sin(a), a);
          }
        }
        if (tc >= tEsp && tc < tEsp + 0.35) {
          const u = (tc - tEsp) / 0.35, [nx, ny] = pts.nariz;
          c.strokeStyle = cor(CO.poeira, CO.poeira, 0, 1 - u); c.lineWidth = 3; c.lineCap = 'round';
          for (let i = 0; i < 9; i++) { const a = -0.7 + i * 0.17, r0 = 18 + 70 * u, r1 = r0 + 22; c.beginPath(); c.moveTo(nx + Math.cos(a) * r0, ny + Math.sin(a) * r0 + 30); c.lineTo(nx + Math.cos(a) * r1, ny + Math.sin(a) * r1 + 30); c.stroke(); }
          for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(nx + 30 + 50 * u + i * 22, ny + 26 + (i - 1) * 16 * u, 10 + 16 * u, 0, TAU); c.fillStyle = cor(CO.poeira, CO.poeira, 0, 0.75 * (1 - u)); c.fill(); }
        }
        // 6) os vaga-lumes (luz somada) e o herói
        c.globalCompositeOperation = 'lighter';
        for (const [x, y, s, a] of vl) { if (a <= 0.01) continue; const rr = 34 * s; c.globalAlpha = a; c.drawImage(brilho, x - rr, y - rr, rr * 2, rr * 2); }
        const pisca = 0.8 + 0.2 * Math.sin(tc * 7);
        c.globalAlpha = pisca; c.drawImage(brilho, hp[0] - 46, hp[1] - 46, 92, 92);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.fillStyle = CO.vagalumeCorpo; c.beginPath(); c.ellipse(hp[0] + 3, hp[1] - 2, 3.4, 2.4, 0.3, 0, TAU); c.fill();
        // 7) a frente escura (anda mais que tudo) e o acabamento
        camada(F.camadas.find((cm) => cm.nome === 'frente'));
        copiao(sorte, q);
        titulo(t);
      }

      // ---------- som: sai das MESMAS marcas de tempo da imagem ----------
      function som() {
        const s = Som.criar(duracao, H.semente || 1), M = H.musica || {}, ss = sorteio((H.semente || 1) * 31 + 9);
        s.vento(0, duracao, { vol: 0.035, corte: 320, onda: 0.18 });                                   // noite
        for (let t = 0.3; t < duracao - 0.5; t += 0.45 + ss() * 0.5) s.pio(t, { freq: 4300 + ss() * 500, vol: 0.012, repete: 3, intervalo: 0.06, pan: ss() * 2 - 1 }); // grilos
        // cordas (acordes longos e macios) e flauta
        for (const [notas, t0, d] of (M.acordes || [])) for (const n of notas) s.nota(n, t0, d, { forma: 'tri', vol: 0.03, ataque: 0.5, solta: 0.9, vibrato: 0.004, vibratoHz: 5 });
        for (const [n, t0, d] of (M.flauta || [])) s.nota(n, t0, d, { forma: 'seno', vol: 0.06, ataque: 0.08, solta: 0.35, vibrato: 0.01, vibratoHz: 5.5 });
        // pizzicato na espreita (um para cada passinho)
        const es = acao('espreita');
        if (es) (M.pizzicato || []).forEach((n, i, arr) => s.corda(n, es.de + 0.15 + i * (es.ate - es.de - 0.2) / arr.length, 0.5, { vol: 0.16, maciez: 0.3 }));
        const ag = acao('agacha');
        if (ag) for (let t = ag.de + 0.05; t < ag.ate; t += 1 / (2 * (ag.rebola || 6))) s.toque(t, { vol: 0.05, corte: 2400, dur: 0.03, pan: 0.2 }); // rebolado
        const pu = acao('pulo');
        if (pu) {
          s.vento(pu.de, pu.ate - pu.de + 0.1, { vol: 0.16, corte: 2600, onda: 2, entra: 0.06, sai: 0.25 });  // vuuush
          ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => s.sino(n, pu.de + i * 0.06, 0.4, { vol: 0.05 }));
          s.pio(pu.de + 0.12, { freq: 2600, sobe: 1.2, vol: 0.04, repete: 1, dur: 0.18 });               // o vaga-lume escapa
        }
        if (ate) { s.batida(ate.de, { vol: 0.5, freq: 80, dur: 0.3 }); s.toque(ate.de + 0.02, { vol: 0.12, corte: 900, dur: 0.18 }); }
        if (camb) { ['A4', 'F#4', 'D4', 'A3'].forEach((n, i) => s.sino(n, camb.de + i * 0.15, 0.35, { vol: 0.07, brilho: 3 })); s.batida(camb.ate - 0.1, { vol: 0.3, freq: 100, dur: 0.2 }); }
        if (tonto) for (let t = tonto.de + 0.1; t < tonto.ate - 0.1; t += 0.28) s.pio(t, { freq: 2900, sobe: 0.25, vol: 0.03, repete: 2, intervalo: 0.08, pan: Math.sin(t * 9) }); // passarinhos da tontura
        if (esp) {
          const em = tEsp, a0 = esp.de;
          s.nota('G3', a0 + (em - a0) * 0.38, 0.22, { forma: 'serra', vol: 0.035, ataque: 0.08, solta: 0.15, vibrato: 0.02, vibratoHz: 7 }); // "ah..."
          s.nota('B3', a0 + (em - a0) * 0.78, 0.18, { forma: 'serra', vol: 0.045, ataque: 0.06, solta: 0.1, vibrato: 0.02, vibratoHz: 7 }); // "ah..."
          s.vento(em, 0.4, { vol: 0.35, corte: 3800, onda: 3, entra: 0.01, sai: 0.3 });                   // atchim!
          s.batida(em, { vol: 0.35, freq: 140, dur: 0.18 }); s.toque(em, { vol: 0.15, corte: 7000, dur: 0.3 });
          (M.harpa || []).forEach((n, i) => s.corda(n, em + 0.15 + i * 0.07, 1.4, { vol: 0.13, maciez: 0.15, pan: -0.6 + i * 0.12 })); // harpa sobe com a onda
          for (let i = 0; i < 26; i++) s.sino(['D6', 'E6', 'F#6', 'A6', 'B6', 'D7'][Math.floor(ss() * 6)], em + 0.4 + ss() * (duracao - em - 1.2), 0.9, { vol: 0.025, pan: ss() * 2 - 1 }); // brilhinhos
        }
        if (HV.pousa) { s.sino('A6', HV.pousa, 1.4, { vol: 0.07 }); s.sino('D7', HV.pousa + 0.12, 1.2, { vol: 0.05 }); }
        s.sala(0.45);
        return s.fim({ entra: 0.4, sai: 1.0 });
      }

      return { desenhar, som };
    },
  });
})();
