// motor.js — retrato-ilustrado: um retrato ilustrado parado que ganha vida aos poucos.
// Como na "marionete de imagem": o desenho é sempre o mesmo, e só peças pequenas mexem — pontas do
// cabelo na brisa, brincos em pêndulo, respiração, piscada, olhar, sobrancelha e sorriso. No fundo,
// só a luz anda: manchas de folha e um sol quente que escorrega devagar na parede (nunca na pele).
// Dois planos: o aberto com um empurrão bem lento e um corte seco para o close do rosto, que é a
// MESMA cena vista com a câmera perto (nada entra nem some no corte).
//
// O motor sabe DESENHAR. O filme (cenário, cores, roupa, penteado, tempos da atuação, planos,
// som) está todo no historia.json. desenhar(t) é conta pura: o mesmo t dá o mesmo quadro.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio, ruido, cor } = Filme;
  const L = 1920, A = 1080, TAU = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 24, duracao: 9,
    montar({ historia: H, tela, largura, altura, duracao }) {
      const c = tela.getContext('2d'), k = largura / L;
      const pal = H.cores, M = H.moca, AT = H.atuacao, sem0 = H.semente || 1;
      const Mo = window.Moca;
      const novaTela = (w, h) => { const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h)); return t; };

      // ---------- marcas de tempo com nome (o som usa as mesmas da imagem) ----------
      const marcas = { inicio: 0, corte: H.planos[1] ? H.planos[1].de : 0, sorriso: AT.sorriso[0], sobrancelha: AT.sobrancelha[0] };
      AT.piscadas.forEach((p, i) => { marcas['piscada' + (i + 1)] = p; });
      const quando = (v) => (typeof v === 'number' ? v : (marcas[v] ?? 0));

      // ---------- atuação: tudo conta de t ----------
      function pisca(t) {
        let p = 0;
        for (const tp of AT.piscadas) {
          const d = t - tp; // fecha em 0,1 s, segura 0,05 s, abre em 0,15 s
          if (d > -0.1 && d < 0) p = Math.max(p, suave(1 + d / 0.1));
          else if (d >= 0 && d < 0.05) p = 1;
          else if (d >= 0.05 && d < 0.2) p = Math.max(p, 1 - suave((d - 0.05) / 0.15));
        }
        return p;
      }
      function chaves(lista, t) { // [[t, valor], ...] com chegada suave
        if (t <= lista[0][0]) return lista[0][1];
        for (let i = 1; i < lista.length; i++) if (t <= lista[i][0]) return mistura(lista[i - 1][1], lista[i][1], suave(trecho(t, lista[i - 1][0], lista[i][0])));
        return lista[lista.length - 1][1];
      }
      function forcaBrisa(t) {
        let b = AT.brisa.base;
        for (const [r0, r1, f] of AT.brisa.rajadas) b += f * Math.sin(Math.PI * trecho(t, r0, r1)) ** 2;
        return b;
      }
      function atuacao(t) {
        const br = forcaBrisa(t), B = AT.brincos;
        const balanco = (fase) => B.angulo * (0.6 + 0.5 * br) * Math.sin(TAU * B.hz * t + fase) + 0.05 * br * Math.sin(TAU * 0.37 * t + fase);
        return {
          t, brisa: br, pisca: pisca(t), olhar: chaves(AT.olhar, t),
          sobr: suave(trecho(t, AT.sobrancelha[0], AT.sobrancelha[1])),
          sorri: suave(trecho(t, AT.sorriso[0], AT.sorriso[1])),
          resp: Math.sin(TAU * t / AT.respira), brinco: [balanco(0), balanco(1.1)],
        };
      }

      // ---------- câmera: o plano da vez e o seu empurrão ----------
      function plano(t) {
        let P = H.planos[0];
        for (const p of H.planos) if (t >= p.de) P = p;
        const u = trecho(t, P.de, P.ate), zoom = mistura(P.zoom[0], P.zoom[1], u);
        const centro = P.foco ? [M.x + P.foco[0] * M.escala, M.y + P.foco[1] * M.escala] : (P.centro || [L / 2, A / 2]);
        // o centro nunca deixa a borda do cenário aparecer
        const cx = limita(centro[0], L / 2 / zoom, L - L / 2 / zoom), cy = limita(centro[1], A / 2 / zoom, A - A / 2 / zoom);
        return { zoom, cx, cy };
      }

      // ---------- peças do cenário (coordenadas do plano aberto, 1920x1080) ----------
      const SORTE = H.pecas.map((p, i) => sorteio(sem0 * 100 + i * 17));
      const PRONTO = H.pecas.map((p, i) => {
        const r = SORTE[i];
        if (p.tipo === 'porta') return { veios: Array.from({ length: p.veios ?? 70 }, () => ({ x: p.x0 + r() * (p.x1 - p.x0), y: r() * A, l: 60 + r() * 260, claro: r() < 0.5, g: 1 + r() * 2.5 })) };
        if (p.tipo === 'manchas') return { lista: Array.from({ length: p.n }, () => ({ x: p.caixa[0] + r() * p.caixa[2], y: p.caixa[1] + r() * p.caixa[3], rx: 18 + r() * 34, ry: 12 + r() * 22, a: r() * TAU, f: r() * 50 })) };
        if (p.tipo === 'mar') return { brilhos: Array.from({ length: p.brilhos ?? 60 }, () => ({ x: r() * L, y: r(), l: 10 + r() * 40, f: r() * 20 })), faixas: Array.from({ length: 26 }, () => ({ y: r(), x: r() * L, l: 120 + r() * 420 })) };
        if (p.tipo === 'buganvilia') return { flores: Array.from({ length: p.n ?? 40 }, (_, j) => ({ u: r(), lado: r() < 0.5 ? -1 : 1, d: 8 + r() * 22, folha: r() < 0.4, a: r() * TAU, tam: 0.8 + r() * 0.5, ramo: j % (p.ramos?.length || 1) })) };
        return null;
      });

      function pecaFundo(p, i, t) {
        const X = PRONTO[i];
        switch (p.tipo) {
          case 'parede': {
            c.fillStyle = pal[p.cor]; c.fillRect(p.x, p.y, p.largura, p.altura);
            break;
          }
          case 'sol': { // mancha quente que escorrega devagar (só no fundo)
            const x = p.x + p.deriva[0] * t, y = p.y + p.deriva[1] * t;
            const g = c.createRadialGradient(x, y, 0, x, y, p.raio);
            g.addColorStop(0, cor(pal[p.cor], pal[p.cor], 0, p.forca)); g.addColorStop(1, cor(pal[p.cor], pal[p.cor], 0, 0));
            c.save(); if (p.caixa) { c.beginPath(); c.rect(...p.caixa); c.clip(); }
            c.fillStyle = g; c.fillRect(x - p.raio, y - p.raio, p.raio * 2, p.raio * 2); c.restore();
            break;
          }
          case 'recorte': { // forma chapada (luz da janela, sombra do beiral), com riscos de caixilho
            c.save(); c.globalAlpha = p.alfa ?? 0.4; c.fillStyle = pal[p.cor];
            c.beginPath(); p.pontos.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
            for (const lin of p.linhas || []) { c.beginPath(); c.moveTo(lin[0], lin[1]); c.lineTo(lin[2], lin[3]); c.lineWidth = lin[4]; c.strokeStyle = pal[p.corLinhas || p.cor]; c.stroke(); }
            c.restore();
            break;
          }
          case 'manchas': { // luz que passa pelas folhas: manchas de sombra que andam devagar
            c.save(); c.beginPath(); c.rect(...p.caixa); c.clip();
            const sombra = pal[p.cor];
            for (const m of X.lista) { // cada mancha tem a borda macia (degradê), como luz passando por folhas
              const dx = p.anda * ruido(t * 0.45 + m.f, 3), dy = p.anda * 0.6 * ruido(t * 0.38 + m.f, 4);
              const a = (p.alfa ?? 0.3) * (0.6 + 0.4 * (0.5 + 0.5 * ruido(t * 0.7 + m.f, 5)));
              c.save(); c.translate(m.x + dx, m.y + dy); c.rotate(m.a + 0.2 * ruido(t * 0.3 + m.f, 6)); c.scale(m.rx, m.ry);
              const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
              g.addColorStop(0, cor(sombra, sombra, 0, a)); g.addColorStop(0.55, cor(sombra, sombra, 0, a)); g.addColorStop(1, cor(sombra, sombra, 0, 0));
              c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill(); c.restore();
            }
            c.restore();
            break;
          }
          case 'porta': { // porta de tábuas pintada de azul-esverdeado, com veios de pincel e batente
            const [b, e, cl] = p.cores.map((n) => pal[n]);
            c.fillStyle = b; c.fillRect(p.x0, 0, p.x1 - p.x0, A);
            c.save(); c.beginPath(); c.rect(p.x0, 0, p.x1 - p.x0, A); c.clip();
            for (const v of X.veios) { c.strokeStyle = cor(v.claro ? cl : e, v.claro ? cl : e, 0, 0.35); c.lineWidth = v.g; c.beginPath(); c.moveTo(v.x, v.y); c.lineTo(v.x + 2, v.y + v.l); c.stroke(); }
            for (const x of p.tabuas || []) { c.fillStyle = cor(e, e, 0, 0.55); c.fillRect(x - 2, 0, 4, A); c.fillStyle = cor(cl, cl, 0, 0.4); c.fillRect(x + 2, 0, 3, A); }
            c.restore();
            c.fillStyle = pal[p.batente]; c.fillRect(p.x1 - 10, 0, 16, A);
            c.fillStyle = cor(pal[p.batente], '#000000', 0.3, 0.35); c.fillRect(p.x1 + 6, 0, 26, A); // sombra do batente na parede
            break;
          }
          case 'ceu': {
            const g = c.createLinearGradient(0, p.de, 0, p.ate);
            p.cores.forEach((n, j) => g.addColorStop(j / (p.cores.length - 1), pal[n]));
            c.fillStyle = g; c.fillRect(0, p.de, L, p.ate - p.de);
            break;
          }
          case 'nuvem': {
            const x = p.x + (p.deriva || 0) * t;
            c.save(); c.translate(x, p.y); c.scale(p.escala, p.escala);
            c.beginPath(); Mo.curva(c, [[-90, 20], [-70, -8], [-30, -14], [-6, -36], [36, -30], [56, -6], [92, 0], [100, 20]], true);
            c.fillStyle = pal[p.cor]; c.fill();
            c.fillStyle = cor(pal[p.cor], pal.mar1 || '#9fb8c8', 0.25); c.fillRect(-100, 14, 210, 10);
            c.restore();
            break;
          }
          case 'morro': {
            c.fillStyle = pal[p.cor]; c.beginPath(); Mo.curva(c, p.pontos, true); c.fill();
            break;
          }
          case 'mar': { // faixas chapadas com riscos mais escuros e brilhos que piscam
            c.fillStyle = pal[p.cores[0]]; c.fillRect(0, p.de, L, p.ate - p.de);
            const g = c.createLinearGradient(0, p.de, 0, p.ate); g.addColorStop(0, cor(pal[p.cores[1]], pal[p.cores[1]], 0, 0.6)); g.addColorStop(1, cor(pal[p.cores[1]], pal[p.cores[1]], 0, 0));
            c.fillStyle = g; c.fillRect(0, p.de, L, p.ate - p.de);
            for (const f of X.faixas) {
              const y = p.de + 6 + f.y * f.y * (p.ate - p.de - 6), larg = 1 + 5 * f.y, x = (f.x + 14 * t * (0.5 + f.y)) % (L + 400) - 200;
              c.fillStyle = cor(pal[p.cores[2]], pal[p.cores[2]], 0, 0.5); c.fillRect(x, y, f.l * (0.4 + f.y), larg);
            }
            for (const b of X.brilhos) {
              const y = p.de + 4 + b.y * b.y * (p.ate - p.de - 4), a = Math.max(0, Math.sin(t * 2.2 + b.f)) ** 3;
              if (a <= 0.01) continue;
              c.fillStyle = cor(pal[p.cores[3]], pal[p.cores[3]], 0, 0.9 * a); c.fillRect(b.x + 6 * Math.sin(t + b.f), y, b.l * (0.3 + b.y), 2 + 2 * b.y);
            }
            break;
          }
          case 'muro': { // mureta caiada: tampo claro, frente lisa, sombra embaixo do tampo
            const [topo, frente, sombra] = p.cores.map((n) => pal[n]);
            c.fillStyle = frente; c.fillRect(0, p.y, L, A - p.y);
            c.fillStyle = topo; c.fillRect(0, p.y, L, p.tampo);
            c.fillStyle = sombra; c.fillRect(0, p.y + p.tampo, L, 10);
            c.strokeStyle = cor(sombra, sombra, 0, 0.8); c.lineWidth = 2; c.beginPath(); c.moveTo(0, p.y); c.lineTo(L, p.y); c.stroke();
            break;
          }
          case 'buganvilia': { // galho que entra pelo alto, à direita, e balança com a brisa
            const br = forcaBrisa(t);
            const ang = 0.018 * Math.sin(t * 1.3) + 0.03 * br * Math.sin(t * 2.4 + 0.6);
            c.save(); c.translate(p.ancora[0], p.ancora[1]); c.rotate(ang); c.translate(-p.ancora[0], -p.ancora[1]);
            p.ramos.forEach((rm) => { c.beginPath(); Mo.curva(c, rm, false); c.strokeStyle = pal[p.caule]; c.lineWidth = 3.4; c.lineCap = 'round'; c.stroke(); });
            const pontoNo = (rm, u) => { const n = rm.length - 1, s = u * n, j = Math.min(n - 1, Math.floor(s)), f = s - j; return [mistura(rm[j][0], rm[j + 1][0], f), mistura(rm[j][1], rm[j + 1][1], f)]; };
            for (const fl of X.flores) {
              const rm = p.ramos[fl.ramo], [x, y] = pontoNo(rm, fl.u), bal = 0.25 * br * Math.sin(t * 3 + fl.a);
              c.save(); c.translate(x, y + fl.lado * fl.d * 0.6); c.rotate(fl.a + bal); c.scale(fl.tam, fl.tam);
              if (fl.folha) { c.fillStyle = pal[p.folha]; c.beginPath(); c.ellipse(0, 0, 12, 6, 0, 0, TAU); c.fill(); }
              else {
                for (let q = 0; q < 3; q++) { c.fillStyle = q ? pal[p.flor[0]] : pal[p.flor[1]]; c.beginPath(); c.ellipse(Math.cos(q * 2.1) * 5, Math.sin(q * 2.1) * 5, 8, 6, q * 2.1, 0, TAU); c.fill(); }
              }
              c.restore();
            }
            c.restore();
            break;
          }
          case 'moca': {
            const cam = plano(t), e = atuacao(t);
            c.save(); c.translate(M.x, M.y); c.scale(M.escala, M.escala);
            Mo.desenha(c, M, e, k * cam.zoom * M.escala);
            c.restore();
            break;
          }
          default: throw new Error('peça desconhecida: ' + p.tipo);
        }
      }

      // ---------- grão de papel (parado: papel não treme), em pixels da tela ----------
      const GT = 256, papel = (() => {
        const g = novaTela(GT, GT), gc = g.getContext('2d'), img = gc.createImageData(GT, GT), r = sorteio(sem0 + 900);
        for (let j = 0; j < GT * GT; j++) {
          const v = 128 + (r() + r() + r() - 1.5) * 60;
          img.data[j * 4] = img.data[j * 4 + 1] = img.data[j * 4 + 2] = limita(v, 0, 255); img.data[j * 4 + 3] = 255;
        }
        gc.putImageData(img, 0, 0); return c.createPattern(g, 'repeat');
      })();

      // ---------- título (só no começo; letras em traço, sem fonte instalada) ----------
      function titulo(t) {
        const TI = H.tituloNaTela; if (!TI) return;
        const a = Math.min(suave(trecho(t, TI.de, TI.de + 0.35)), 1 - suave(trecho(t, TI.ate - 0.4, TI.ate)));
        if (a <= 0) return;
        c.setTransform(k, 0, 0, k, 0, 0);
        const w = window.Letras.largura(H.titulo, TI.tamanho);
        c.fillStyle = cor(pal.faixaTitulo, pal.faixaTitulo, 0, 0.55 * a);
        c.fillRect(TI.x - 36, TI.y - TI.tamanho * 1.55, w + 76, TI.tamanho * 2.2);
        window.Letras.texto(c, H.titulo, TI.x, TI.y, TI.tamanho, { cor: cor(pal.letra, pal.letra, 0, a), alinha: 'esquerda', prog: trecho(t, TI.escreve[0], TI.escreve[1]), sem: 5, boil: 0, larg: TI.tamanho * 0.09 });
      }

      // ---------- desenhar(t) ----------
      function desenhar(t) {
        c.reset(); // nada do pincel passa de um quadro para o outro
        const cam = plano(t);
        c.setTransform(k * cam.zoom, 0, 0, k * cam.zoom, largura / 2 - cam.cx * k * cam.zoom, altura / 2 - cam.cy * k * cam.zoom);
        H.pecas.forEach((p, i) => { c.save(); pecaFundo(p, i, t); c.restore(); });
        // papel por cima de tudo
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = H.grao ?? 0.12; c.fillStyle = papel; c.fillRect(0, 0, largura, altura);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // luz da tarde: um véu quente bem leve e uma vinheta
        c.setTransform(k, 0, 0, k, 0, 0);
        const v = c.createRadialGradient(L * 0.6, A * 0.4, A * 0.45, L / 2, A / 2, A * 1.15);
        v.addColorStop(0, cor(pal.vinheta, pal.vinheta, 0, 0)); v.addColorStop(1, cor(pal.vinheta, pal.vinheta, 0, 0.22));
        c.fillStyle = v; c.fillRect(0, 0, L, A);
        titulo(t);
      }

      // ---------- som: eventos da história, nas mesmas marcas de tempo da imagem ----------
      function som() {
        const m = Som.criar(duracao, sem0 + 3);
        for (const ev of H.som.eventos) {
          const t0 = quando(ev.t) + (ev.mais || 0), o = ev;
          if (ev.f === 'vento') m.vento(t0, ev.dur ?? duracao - t0, o);
          else if (ev.f === 'nota') m.nota(ev.nota, t0, ev.dur, o);
          else if (ev.f === 'piano') { m.sino(ev.nota, t0, ev.dur ?? 2.4, { vol: ev.vol, brilho: 0.9, pan: ev.pan ?? 0.1 }); m.nota(ev.nota, t0, (ev.dur ?? 2.4) * 0.5, { vol: ev.vol * 0.3, forma: 'tri', ataque: 0.005, solta: 1.2, pan: ev.pan ?? 0.1 }); }
          else if (ev.f === 'pio') m.pio(t0, o);
          else if (ev.f === 'toque') m.toque(t0, o);
          else if (ev.f === 'folhas') { const r = sorteio(sem0 + 60); for (let s = t0; s < t0 + ev.dur; s += 0.05 + r() * 0.12) m.toque(s, { vol: ev.vol * (0.4 + 0.6 * r()), corte: 4500, dur: 0.03, pan: (r() - 0.5) * 1.2 }); }
          else throw new Error('som desconhecido: ' + ev.f);
        }
        m.sala(H.som.sala ?? 0.3);
        return m.fim({ entra: 0.4, sai: 0.9, pico: H.som.pico ?? 0.82 });
      }

      return { desenhar, som };
    },
  });
})();
