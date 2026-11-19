// motor.js — arte-conceito: pintura de desenvolvimento visual de filme de animação, toda em código.
// Guache recortado com arestas vivas e sem contorno; cada forma = base + uma sombra chapada + uma luz
// chapada; pincel seco aparente; grão de papel por cima. O cenário é pintado UMA vez, em camadas de
// profundidade (câmera multiplano), mais solto e de menos contraste. A personagem, as figurinhas da
// rua, o pombo, as folhas e a luz que dança no muro são desenhados a cada quadro: a atuação muda de
// 2 em 2 quadros, vapor, folhas e luz de 3 em 3, a câmera é lisa.
//
// O motor sabe DESENHAR. O filme (lugar de cada peça, tempos da atuação, cores, câmera, música) está
// todo no historia.json. desenhar(t) é conta pura: o mesmo t dá o mesmo quadro, em qualquer ordem.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, ruido, cor } = Filme;
  const L = 1920, A = 1080, TAU = Math.PI * 2;
  const DINAMICAS = new Set(['mulher', 'pessoa', 'ciclista', 'pombo', 'aves', 'manchas', 'folhas']);

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const c = tela.getContext('2d'), k = largura / L;
      const pal = H.cores, M = H.mulher, AT = H.atuacao, Pn = window.Pincel;
      const sem0 = H.semente || 1;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };
      const emDois = (t) => Math.floor(t * fps / 2 + 1e-6) * 2 / fps;
      const emTres = (t) => Math.floor(t * fps / 3 + 1e-6) * 3 / fps;

      // perspectiva da rua: x = fx + X/Z, y = fy + Y/Z (o chão fica em Y = 380)
      const PV = H.perspectiva;
      const ajuda = { proj: (X, Y, Z) => [PV.fx + X / Z, PV.fy + Y / Z] };

      // ---------- camadas: o que é parado é pintado uma vez ----------
      const camadas = H.camadas.map((cam) => {
        const pecas = H.pecas.filter((p) => p.camada === cam.nome);
        let imagem = null;
        if (cam.largura) {
          const tl = novaTela(cam.largura * k, cam.altura * k), cc = tl.getContext('2d');
          cc.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
          Pn.minimo = 1 / k;
          pecas.forEach((p, i) => {
            if (DINAMICAS.has(p.tipo)) return;
            const f = window.Fundo[p.tipo];
            if (!f) throw new Error('peça desconhecida: ' + p.tipo);
            cc.save(); f(cc, p, pal, sorteio(sem0 * 1000 + i * 97 + cam.nome.length), ajuda); cc.restore();
          });
          imagem = tl;
        }
        return { ...cam, pecas, imagem };
      });

      // ---------- grão de papel (parado: papel não treme), em pixels da tela ----------
      const GT = 256, papel = (() => {
        const g = novaTela(GT, GT), gc = g.getContext('2d'), img = gc.createImageData(GT, GT), r = sorteio(sem0 + 900);
        for (let j = 0; j < GT * GT; j++) {
          const y = Math.floor(j / GT), fibra = 10 * Math.sin(y * 0.9 + r() * 0.5); // fibra deitada bem fina
          const v = 128 + (r() + r() + r() - 1.5) * 70 + fibra;
          img.data[j * 4] = img.data[j * 4 + 1] = img.data[j * 4 + 2] = limita(v, 0, 255); img.data[j * 4 + 3] = 255;
        }
        gc.putImageData(img, 0, 0); return c.createPattern(g, 'repeat');
      })();

      // ---------- partículas sorteadas uma vez (a posição sai de t) ----------
      const sorteados = (n, s, f) => { const r = sorteio(s); return Array.from({ length: n }, (_, i) => f(r, i)); };

      // ---------- câmera (quadros-chave com chegada suave) ----------
      function quadroChave(lista, t) {
        if (t <= lista[0].t) return lista[0];
        for (let i = 1; i < lista.length; i++) {
          const a = lista[i - 1], b = lista[i];
          if (t <= b.t) { const u = suave(trecho(t, a.t, b.t)), o = {}; for (const ch of Object.keys(b)) o[ch] = typeof b[ch] === 'number' ? mistura(a[ch] ?? 0, b[ch], u) : b[ch]; return o; }
        }
        return lista[lista.length - 1];
      }
      // as camadas de longe andam e crescem menos (parallax do empurrão da câmera)
      function poeCamada(cam, f) {
        const z = 1 + (cam.zoom - 1) * Math.min(1.4, 0.35 + f * 0.65);
        c.setTransform(k, 0, 0, k, 0, 0);
        c.translate(L / 2, A / 2); c.scale(z, z); c.translate(-L / 2, -A / 2);
        c.translate(-cam.x * f, -cam.y * f);
        return z;
      }

      // ---------- atuação da personagem (tudo conta de t) ----------
      const [a0, a1] = AT.anda;
      const posX = (t) => mistura(M.x0, M.x1, saiDevagar(trecho(t, a0, a1)));
      const passos = (t) => (posX(t) - M.x0) / AT.passo;
      function cabeca(t) {
        const C = AT.cabeca, [b0, b1, vb] = C.abaixa, [s0, s1, vs] = C.sobe, [d0, d1] = C.assenta;
        if (t < b1) return vb * suave(trecho(t, b0, b1));
        if (t < s1) return mistura(vb, vs, saiDevagar(trecho(t, s0, s1)));
        return mistura(vs, 1, suave(trecho(t, d0, d1)));
      }
      function atuacao(t) {
        const sorri = suave(trecho(t, AT.sorri[0], AT.sorri[1]));
        let abre = mistura(1, AT.arregala[2], suave(trecho(t, AT.arregala[0], AT.arregala[1])));
        abre = mistura(abre, 0.9, sorri);
        for (const pt of AT.piscadas) abre *= limita(Math.abs(t - pt) / 0.1, 0, 1);
        const [g0, g1, o0, o1] = AT.olhar, u = suave(trecho(t, o0, o1));
        const [v0, v1, vb] = AT.brisa, vento = vb + 0.85 * suave(trecho(t, v0, v0 + 0.9)) * (1 - 0.7 * suave(trecho(t, v1 - 1.4, v1)));
        const [r0, r1] = AT.respira;
        return {
          cab: cabeca(t), atraso: limita((cabeca(t) - cabeca(t - 0.18)) * 1.5, -1, 1),
          olhar: [mistura(g0[0], g1[0], u), mistura(g0[1], g1[1], u)], abre,
          sobr: suave(trecho(t, AT.sobrancelha[0], AT.sobrancelha[1])) * (1 - 0.55 * sorri),
          boca: suave(trecho(t, AT.boca[0], AT.boca[1])), sorri, vento,
          resp: suave(trecho(t, r0, r1)) * (1 - suave(trecho(t, r1 + 0.4, r1 + 1.6))),
          t: emTres(t),
        };
      }

      // ---------- figurinhas da rua: manchas de pincel ----------
      function pessoa(p, t, X, Z, fase) {
        const [px, py] = ajuda.proj(X, 380, Z), s = 1 / Z, sw = Math.sin(fase * Math.PI);
        c.save(); c.translate(px, py); c.scale(s, s);
        c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = pal.sombra[0]; // sombra comprida para a frente
        c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.lineTo(150, 120); c.lineTo(110, 125); c.closePath(); c.fill(); c.restore();
        c.lineCap = 'round'; c.strokeStyle = p.calca; c.lineWidth = 30;
        for (const lado of [1, -1]) { c.beginPath(); c.moveTo(0, -200); c.lineTo(lado * sw * 46, -6); c.stroke(); }
        Pn.forma(c, [[-38, -385], [38, -385], [44, -190], [-44, -190]], p.cor, 7, { reta: true, passo: 40, tremor: 3 });
        c.fillStyle = cor(p.cor, pal.sombra[1], 0.4); c.fillRect(8, -380, 34, 186);
        c.strokeStyle = p.cor; c.lineWidth = 22; for (const lado of [1, -1]) { c.beginPath(); c.moveTo(lado * 30, -370); c.lineTo(lado * 36 - lado * sw * 26, -230); c.stroke(); }
        c.fillStyle = M.pele[1]; c.beginPath(); c.ellipse(0, -418, 27, 32, 0, 0, TAU); c.fill();
        c.fillStyle = '#3a2a22'; c.beginPath(); c.ellipse(-3, -432, 28, 20, 0, Math.PI, TAU); c.fill();
        c.restore();
      }
      function ciclista(p, t, X, Z, te) {
        const [px, py] = ajuda.proj(X, 380, Z), s = 1 / Z, pedal = te * 9;
        c.save(); c.translate(px, py); c.scale(s, s);
        c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = pal.sombra[0];
        c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineTo(170, 140); c.lineTo(130, 146); c.closePath(); c.fill(); c.restore();
        c.fillStyle = p.bike; // roda da frente (vista de frente: um risco grosso)
        c.beginPath(); c.ellipse(0, -110, 14, 110, 0, 0, TAU); c.fill();
        c.strokeStyle = p.bike; c.lineWidth = 12; c.beginPath(); c.moveTo(-80, -250); c.lineTo(80, -250); c.stroke(); // guidão
        c.lineCap = 'round'; c.strokeStyle = '#2f3445'; c.lineWidth = 30;
        for (const lado of [1, -1]) { const y = -200 + 50 * Math.sin(pedal + (lado > 0 ? 0 : Math.PI)); c.beginPath(); c.moveTo(lado * 30, -330); c.lineTo(lado * 40, y); c.stroke(); }
        Pn.forma(c, [[-55, -500], [55, -500], [60, -320], [-60, -320]], p.cor, 9, { reta: true, passo: 40, tremor: 3 });
        c.fillStyle = cor(p.cor, pal.sombra[1], 0.4); c.fillRect(14, -495, 44, 172);
        c.strokeStyle = p.cor; c.lineWidth = 24; for (const lado of [1, -1]) { c.beginPath(); c.moveTo(lado * 48, -480); c.lineTo(lado * 76, -258); c.stroke(); }
        c.fillStyle = M.pele[1]; c.beginPath(); c.ellipse(0, -545, 32, 38, 0, 0, TAU); c.fill();
        c.fillStyle = '#c94a3a'; c.beginPath(); c.ellipse(0, -565, 36, 22, 0, Math.PI, TAU); c.fill(); // boné
        c.restore();
      }
      function pombo(p, t, z) {
        const te = emDois(t), voa = te >= p.voa, d = Math.max(0, te - p.voa);
        let [px, py] = ajuda.proj(p.x, p.y, p.z);
        px += (p.vx * d + 120 * d * d * Math.sign(p.vx)) / p.z; py += (p.vy * d - 180 * d * d) / p.z;
        const s = (p.tamanho ?? 70) / p.z / 60;
        c.save(); c.translate(px, py); c.scale(s * (p.vx < 0 ? -1 : 1), s);
        const bica = voa ? 0 : Math.max(0, Math.sin(te * 5)) * 8;
        c.fillStyle = pal.pombo[0]; c.beginPath(); c.ellipse(0, -22, 34, 20, voa ? -0.4 : 0, 0, TAU); c.fill(); // corpo
        c.fillStyle = pal.pombo[1]; c.beginPath(); c.moveTo(-28, -24); c.lineTo(-62, -12 - (voa ? 14 : 0)); c.lineTo(-30, -10); c.fill(); // rabo
        c.fillStyle = pal.pombo[0]; c.beginPath(); c.arc(28, -42 + bica, 13, 0, TAU); c.fill(); // cabeça
        c.fillStyle = '#d4a04a'; c.beginPath(); c.moveTo(40, -44 + bica); c.lineTo(50, -40 + bica); c.lineTo(40, -38 + bica); c.fill();
        if (voa) { // asas batendo
          const a = Math.sin(te * 34) * 0.9;
          for (const [k2, corA] of [[1, pal.pombo[2]], [-0.6, pal.pombo[1]]]) {
            c.fillStyle = corA; c.beginPath(); c.moveTo(-10, -30); c.lineTo(-20 + 30 * k2, -30 - 60 * Math.cos(a) * k2); c.lineTo(20, -30 - 50 * Math.cos(a) * k2); c.lineTo(14, -28); c.fill();
          }
        } else { c.fillStyle = pal.pombo[2]; c.beginPath(); c.ellipse(-4, -26, 22, 9, -0.1, 0, TAU); c.fill(); }
        c.restore();
      }

      // ---------- peças que mexem ----------
      const MANCHAS = {}, FOLHAS = {}, AVES = {};
      function dinamica(p, i, t, cam, zc) {
        const te = emTres(t);
        switch (p.tipo) {
          case 'mulher': {
            const tp = emDois(t), e = atuacao(tp), n = passos(tp);
            const pare = 1 - suave(trecho(tp, a1 - 0.5, a1));
            const bob = -9 * Math.abs(Math.sin(Math.PI * n)) * pare, giro = 0.012 * Math.sin(Math.PI * n) * pare;
            Pn.minimo = 1 / (k * M.escala * zc);
            c.save(); c.translate(posX(tp), M.y + bob); c.rotate(giro); c.scale(M.escala, M.escala);
            window.Mulher.desenha(c, M, e);
            c.restore(); Pn.minimo = 1 / k; break;
          }
          case 'pessoa': {
            const u = trecho(t, p.de, p.ate), X = mistura(p.x[0], p.x[1], u), Z = p.zDe ? mistura(p.zDe[0], p.zDe[1], u) : p.z;
            pessoa(p, t, X, Z, emDois(t) * 1.8 + (p.fase || 0));
            break;
          }
          case 'ciclista': {
            if (t < p.de || t > p.ate) break;
            const u = trecho(t, p.de, p.ate);
            ciclista(p, t, mistura(p.x[0], p.x[1], u), mistura(p.zDe[0], p.zDe[1], u), emDois(t));
            break;
          }
          case 'pombo': pombo(p, t); break;
          case 'aves': {
            if (t < p.de || t > p.ate) break;
            const lista = AVES[i] || (AVES[i] = sorteados(p.n, sem0 + 30 + i, (r) => ({ dx: (r() - 0.5) * 220, dy: (r() - 0.5) * 70, tam: 7 + r() * 6, fase: r() * TAU })));
            const tp = emDois(t), d = tp - p.de;
            c.strokeStyle = pal.ave; c.lineCap = 'round'; c.lineWidth = Math.max(1 / k, 2.6);
            for (const a of lista) {
              const x = p.x + a.dx + p.vx * d, y = p.y + a.dy + p.vy * d, asa = a.tam * (0.25 + 0.75 * Math.abs(Math.sin(tp * 8 + a.fase)));
              c.beginPath(); c.moveTo(x - a.tam, y - asa); c.quadraticCurveTo(x - a.tam * 0.3, y, x, y); c.quadraticCurveTo(x + a.tam * 0.3, y, x + a.tam, y - asa); c.stroke();
            }
            break;
          }
          case 'manchas': { // luz do sol passando pelas folhas e dançando no muro
            const [x, y, w, h] = p.caixa;
            const lista = MANCHAS[i] || (MANCHAS[i] = sorteados(p.n, sem0 + 40 + i, (r, j) => {
              const cx = x + r() * w * 0.75, cy = y + Math.pow(r(), 1.4) * h * 0.8, rx = 22 + r() * 46;
              const pts = Array.from({ length: 9 }, (_, q) => { const a = q / 9 * TAU, rr = rx * (0.75 + 0.5 * r()); return [Math.cos(a) * rr, Math.sin(a) * rr * 0.62]; });
              return { cx, cy, pts: Pn.recorte(pts.concat(), 300 + j, 14, 1), f: r() * 10 };
            }));
            c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
            for (const m of lista) {
              const dx = 34 * ruido(te * 0.5 + m.f, 5), dy = 18 * ruido(te * 0.4 + m.f, 6), a = 0.35 + 0.35 * (0.5 + 0.5 * ruido(te * 0.9 + m.f, 7));
              c.save(); c.translate(m.cx + dx, m.cy + dy); c.globalAlpha = a; c.fillStyle = pal.muro[2]; Pn.caminho(c, m.pts); c.fill(); c.restore();
            }
            c.restore(); break;
          }
          case 'folhas': { // galho de folhas na frente, no canto: balança com a brisa
            const lista = FOLHAS[i] || (FOLHAS[i] = sorteados(p.n, sem0 + 50 + i, (r, j) => {
              const a = r() * TAU, d = Math.sqrt(r()) * p.raio;
              return { x: p.x + Math.cos(a) * d * 1.3, y: p.y + Math.sin(a) * d * 0.6, ang: r() * TAU, tam: 42 + r() * 44, tom: Math.floor(r() * 3), f: r() * 10, s: 600 + j };
            }));
            const v = atuacao(te).vento;
            c.save(); c.translate(p.x - 260, p.y - 200); c.rotate(0.025 * Math.sin(te * 1.2) + 0.04 * v * Math.sin(te * 3.1)); c.translate(-(p.x - 260), -(p.y - 200));
            for (const f of lista) {
              const ang = f.ang + 0.15 * v * Math.sin(te * 4 + f.f);
              c.save(); c.translate(f.x, f.y); c.rotate(ang);
              const folha = [[-f.tam, 0], [-f.tam * 0.3, -f.tam * 0.42], [f.tam * 0.6, -f.tam * 0.25], [f.tam * 1.1, 0], [f.tam * 0.6, f.tam * 0.28], [-f.tam * 0.3, f.tam * 0.4]];
              Pn.forma(c, folha, pal.folha[f.tom], f.s, { reta: true, passo: 18, tremor: 1.5 });
              c.fillStyle = f.tom === 0 ? pal.folha[1] : pal.folha[2]; Pn.caminho(c, [[-f.tam, 0], [-f.tam * 0.3, -f.tam * 0.42], [f.tam * 0.6, -f.tam * 0.25], [f.tam * 1.1, 0]]); c.fill();
              c.restore();
            }
            c.restore(); break;
          }
        }
      }

      // ---------- título (só no começo; letras em traço, sem fonte instalada) ----------
      function titulo(t) {
        const TI = H.tituloNaTela; if (!TI) return;
        const a = Math.min(suave(trecho(t, TI.de, TI.de + 0.3)), 1 - suave(trecho(t, TI.ate - 0.35, TI.ate)));
        if (a <= 0) return;
        c.setTransform(k, 0, 0, k, 0, 0);
        const w = window.Letras.largura(H.titulo, TI.tamanho);
        c.fillStyle = cor(pal.faixaTitulo, pal.faixaTitulo, 0, 0.62 * a);
        Pn.caminho(c, Pn.recorte([[TI.x - 40, TI.y - TI.tamanho * 1.6], [TI.x + w + 50, TI.y - TI.tamanho * 1.6], [TI.x + w + 50, TI.y + TI.tamanho * 0.6], [TI.x - 40, TI.y + TI.tamanho * 0.6]], 5, 60, 1.5)); c.fill();
        window.Letras.texto(c, H.titulo, TI.x, TI.y, TI.tamanho, { cor: cor(pal.letra, pal.letra, 0, a), alinha: 'esquerda', prog: trecho(t, TI.escreve[0], TI.escreve[1]), sem: 5, boil: Math.floor(t * 10), larg: TI.tamanho * 0.09 });
      }

      // ---------- desenhar(t) ----------
      function desenhar(t) {
        c.reset(); // zera TODO o estado do pincel: nada passa de um quadro para o outro
        const cam = quadroChave(H.camera, t);
        c.fillStyle = pal.ceu[0]; c.fillRect(0, 0, largura, altura);
        for (const cm of camadas) {
          const zc = poeCamada(cam, cm.fator);
          Pn.minimo = 1 / (k * zc);
          if (cm.imagem) c.drawImage(cm.imagem, cm.x, cm.y, cm.largura, cm.altura);
          cm.pecas.forEach((p) => { if (DINAMICAS.has(p.tipo)) dinamica(p, H.pecas.indexOf(p), t, cam, zc); });
        }
        // papel por cima de tudo (grão fino, nunca menor que 1 pixel)
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = H.grao ?? 0.2; c.fillStyle = papel; c.fillRect(0, 0, largura, altura);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // vinheta quente bem leve
        c.setTransform(k, 0, 0, k, 0, 0);
        const v = c.createRadialGradient(L * 0.45, A * 0.45, A * 0.5, L / 2, A / 2, A * 1.1);
        v.addColorStop(0, 'rgba(60,40,40,0)'); v.addColorStop(1, 'rgba(60,40,40,0.22)');
        c.fillStyle = v; c.fillRect(0, 0, L, A);
        titulo(t);
      }

      // ---------- som: tudo nas mesmas marcas de tempo da imagem ----------
      function som() {
        const m = Som.criar(duracao, sem0 + 3), MU = H.musica;
        // manhã da cidade: um rumor grave longe e o ar
        m.vento(0, duracao, { vol: 0.07, corte: 260, onda: 0.12, entra: 1.0, sai: 1.2 });
        m.vento(0, duracao, { vol: 0.025, corte: 1400, onda: 0.3, entra: 1.0, sai: 1.2 });
        for (const s of MU.pios) m.pio(s, { freq: 3600 + 500 * Math.sin(s * 7), repete: 3, intervalo: 0.09, dur: 0.05, vol: 0.025, pan: Math.sin(s * 3) * 0.7 });
        // passos: um a cada passo da conta da caminhada, até ela parar
        let ultimo = 0;
        for (let s = a0; s <= a1; s += 0.002) {
          const n = Math.floor(passos(s) + 0.5);
          if (n > ultimo) { ultimo = n; const vol = 1 - 0.5 * trecho(s, a1 - 0.8, a1); m.batida(s, { vol: 0.16 * vol, freq: 95, dur: 0.09 }); m.toque(s, { vol: 0.07 * vol, corte: 2600, dur: 0.05, pan: -0.2 }); }
        }
        // ciclista: catraca da roda livre e a campainha (nos tempos da peça)
        for (const p of H.pecas) {
          if (p.tipo === 'ciclista') {
            const panDe = (tt) => limita((ajuda.proj(mistura(p.x[0], p.x[1], trecho(tt, p.de, p.ate)), 380, mistura(p.zDe[0], p.zDe[1], trecho(tt, p.de, p.ate)))[0] - L / 2) / (L / 2), -1, 1);
            for (let s = p.de; s < p.ate; s += 0.06) m.toque(s, { vol: 0.012 + 0.03 * trecho(s, p.de, p.ate), corte: 5000, dur: 0.012, pan: panDe(s) });
            for (const s of p.sino) { m.sino(MU.sino[0], s, 0.9, { vol: 0.09, brilho: 3.4, pan: panDe(s) }); m.sino(MU.sino[1], s + 0.02, 0.7, { vol: 0.05, brilho: 2.8, pan: panDe(s) }); }
          }
          if (p.tipo === 'pombo') { // asas: um bater por batida da conta das asas, por meio segundo
            const pan = limita((ajuda.proj(p.x, p.y, p.z)[0] - L / 2) / (L / 2), -1, 1);
            for (let s = p.voa; s < p.voa + 0.75; s += Math.PI / 34) m.toque(s, { vol: 0.07 * (1 - trecho(s, p.voa, p.voa + 0.8)), corte: 1300, dur: 0.05, pan });
          }
        }
        // o fôlego curto quando ela olha para cima
        m.vento(AT.respira[0], 0.35, { vol: 0.03, corte: 2200, entra: 0.12, sai: 0.18 });
        // a brisa que levanta o cabelo
        m.vento(AT.brisa[0], AT.brisa[1] - AT.brisa[0], { vol: 0.05, corte: 900, onda: 0.5, entra: 0.9, sai: 1.4 });
        // um acorde quente abrindo junto com o sorriso
        const AC = MU.acorde;
        AC.notas.forEach((n, i) => m.nota(n, AC.t + i * 0.06, AC.dur, { vol: AC.vol, forma: 'tri', ataque: 0.9, solta: 1.6, vibrato: 0.002, pan: i % 2 ? 0.35 : -0.35 }));
        for (const [n, s, d, vol] of MU.piano) { m.sino(n, s, d, { vol, brilho: 0.9, pan: 0.1 }); m.nota(n, s, d * 0.5, { vol: vol * 0.3, forma: 'tri', ataque: 0.005, solta: d * 0.5 }); }
        m.sala(0.3);
        return m.fim({ entra: 0.3, sai: 0.9, pico: MU.pico ?? 0.85 });
      }

      return { desenhar, som };
    },
  });
})();
