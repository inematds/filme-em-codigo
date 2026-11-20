// MOTOR "pastel-oleoso" — pastel oleoso e guache sobre papel escuro, livro ilustrado dos anos 50.
// Jeito de animar: camadas planas numa mesa de várias camadas (céu, morros, feira, frente), com uma
// câmera que anda de lado e depois sobe e recua. Cada forma é cheia de riscos curtos de pastel, na
// mesma direção, que passam um pouco da borda e pulam o dente do papel (pastel.js). As camadas paradas
// são pintadas UMA vez no começo, em 3 versões de riscos; o desenhar(t) troca de versão a cada 2 ou 3
// quadros, e a figura inteira "ferve" como pintura animada. Personagens se mexem de 2 em 2 quadros e
// deixam um rastro leve de pigmento (a pose de antes, bem fraca, calculada de novo: nada é guardado).
// Por cima, o grão pesado do papel com luz vinda de cima à esquerda. O que muda de filme para filme
// está em historia.json.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, saiDevagar, sorteio, ruido, hex } = Filme;
  const { poligono, elipse, retangulo, preenche, guache, risco, raspa, novaTela } = Pastel;
  const L = 1920, A = 1080, TAU = Math.PI * 2;

  Filme.criar({
    largura: L, altura: A, fps: 30, duracao: 10,
    montar({ historia: H, tela, largura, duracao, fps }) {
      const k = largura / L;                       // os testes usam 640x360
      const SEM = H.semente || 1;
      const C = H.cores;
      const cor = (n) => (!n ? C.creme : n[0] === '#' ? n : (C[n] || C.creme));
      const cores = (lista) => (Array.isArray(lista) ? lista.map(cor) : cor(lista));
      const escuro = C.escuro, papel = C.papel;
      const pecas = H.pecas || [];
      const deTipo = (t) => pecas.filter((p) => p.tipo === t);
      const uma = (t) => pecas.find((p) => p.tipo === t) || null;
      const c = tela.getContext('2d');
      const VARIANTES = 3;

      // ---------- tempo: os riscos fervem de 2 em 2 / 3 em 3 quadros; os personagens andam "em dois" ----------
      const SEG = H.segurar || [2, 3], CICLO = SEG.reduce((a, b) => a + b, 0);
      function fervura(t) {
        const q = Math.round(t * fps), n = Math.floor(q / CICLO);
        let resto = q - n * CICLO, idx = n * SEG.length;
        for (const s of SEG) { if (resto < s) break; resto -= s; idx++; }
        return idx;
      }
      const emDois = (t) => Math.floor(Math.round(t * fps) / 2) * 2 / fps;

      // ---------- curvas e câmera (pontos-chave da história) ----------
      // passeio: arranca rápido, anda reto, freia devagar no fim (a = arranque, b = freada)
      const passeio = (u) => {
        const a = 0.08, b = 0.18, v = 1 / (1 - a / 2 - b / 2);
        if (u < a) return v * u * u / (2 * a);
        if (u < 1 - b) return v * (a / 2 + (u - a));
        return 1 - v * (1 - u) * (1 - u) / (2 * b);
      };
      const CURVAS = { suave, passeio: (u) => limita(passeio(u)), reta: (u) => u, sai: saiDevagar };
      function camera(t) {
        const K = H.camera; let i = 0;
        while (i < K.length - 2 && t > K[i + 1].t) i++;
        const a = K[i], b = K[i + 1], f = (CURVAS[b.curva] || suave)(trecho(t, a.t, b.t));
        return { x: mistura(a.x, b.x, f), y: mistura(a.y, b.y, f), zoom: Math.exp(mistura(Math.log(a.zoom), Math.log(b.zoom), f)) };
      }
      const C0 = H.camera[0];
      // centro da câmera para uma camada com fator de parallax f (f=1 anda junto com a feira)
      const centro = (cam, f) => ({ x: C0.x + (cam.x - C0.x) * f, y: C0.y + (cam.y - C0.y) * f });
      function poeCamera(x, cam, f) {
        const o = centro(cam, f), z = cam.zoom * k;
        x.setTransform(z, 0, 0, z, k * L / 2 - o.x * z, k * A / 2 - o.y * z);
      }

      // ---------- papel ----------
      const DENTE = Pastel.dente(Math.round(256 * Math.max(k, 0.5)), k, SEM + 11);
      const GRAO = Pastel.grao(Math.round(512 * Math.max(k, 0.5)), k, SEM + 23);
      function tiraDente(x, w, h, desloca, forca = 1) {
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
        x.globalCompositeOperation = 'destination-out'; x.globalAlpha = forca;
        const pad = x.createPattern(DENTE, 'repeat');
        pad.setTransform(new DOMMatrix([1, 0, 0, 1, desloca, desloca * 0.61]));
        x.fillStyle = pad; x.fillRect(0, 0, w, h); x.restore();
      }
      // fundo do papel (tela inteira): cor do papel com manchas grandes e mais claro onde a feira brilha
      const FUNDO = novaTela(largura, tela.height);
      (() => {
        const x = FUNDO.getContext('2d'), w = FUNDO.width, h = FUNDO.height, acaso = sorteio(SEM + 5);
        x.fillStyle = papel; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) {
          const px = acaso() * w, py = acaso() * h, r = (120 + acaso() * 380) * k, g = x.createRadialGradient(px, py, 0, px, py, r);
          const cl = acaso() < 0.5;
          g.addColorStop(0, Filme.cor(cl ? C.papelClaro : escuro, null, 0, 0.16)); g.addColorStop(1, Filme.cor(papel, null, 0, 0));
          x.fillStyle = g; x.fillRect(0, 0, w, h);
        }
      })();
      // luz de cima à esquerda e cantos mais escuros (o "scan")
      const LUZ = novaTela(largura, tela.height);
      (() => {
        const x = LUZ.getContext('2d'), w = LUZ.width, h = LUZ.height;
        const g = x.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.45, h * 0.5, w * 0.85);
        g.addColorStop(0, 'rgba(255,240,210,0.07)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      })();

      // ================= PEÇAS DE CENÁRIO (desenhadas uma vez por versão) =================
      // varais: bandeirinhas e lanternas presas entre postes, caindo em curva
      const LANTERNAS = [];             // posição de cada lanterna do varal (para o brilho)
      const solta = uma('solta');
      let soltaDe = null;               // a lanterna que vai escapar (sai da camada; é desenhada ao vivo)
      function vaos(p) {
        const r = [];
        for (let x0 = p.x0; x0 < p.x1; x0 += p.vao) r.push([x0, Math.min(p.x1, x0 + p.vao)]);
        return r;
      }
      const naCurva = (x0, x1, y, flecha, u) => [mistura(x0, x1, u), y + flecha * 4 * u * (1 - u)];
      (() => {
        for (const p of deTipo('varal')) {
          if (p.estilo !== 'lanternas') continue;
          vaos(p).forEach(([x0, x1], j) => {
            const n = Math.max(2, Math.round((x1 - x0) / (p.passo || 130)));
            for (let i = 1; i < n; i++) {
              const [lx, ly] = naCurva(x0, x1, p.y, p.flecha, i / n), grande = (i + j) % 2 === 0;
              const l = { x: lx, y: ly + (grande ? 34 : 26), r: grande ? 26 : 19, cor: (p.cores || ['amarelo'])[(i + j) % (p.cores || ['amarelo']).length], fio: ly };
              if (solta && !soltaDe && Math.abs(lx - solta.x) < (x1 - x0) / n / 2 + 1) { soltaDe = { ...l, r: l.r * 1.6 }; continue; }
              LANTERNAS.push(l);
            }
          });
        }
        for (const p of deTipo('lanternaAlta')) LANTERNAS.push({ x: p.x, y: p.y, r: p.r, cor: p.cor || 'amarelo', fio: p.fio ?? (p.y - 200), alta: true });
      })();

      function lanterna(x, ac, l, cx, cy, r, cn) {
        const corpo = elipse(cx, cy, r * 0.92, r);
        preenche(x, corpo, cores([cn, 'amarelo', 'vermelhao']), { ang: 90, larg: Math.max(2.5, r * 0.18), comp: r * 0.9, base: 0.75, dens: 1.2 }, ac);
        for (let i = -2; i <= 2; i++) risco(x, [[cx + i * r * 0.32, cy - r * 0.9], [cx + i * r * 0.42, cy], [cx + i * r * 0.32, cy + r * 0.9]], cor('vermelhao'), Math.max(1.4, r * 0.07), ac, { fios: 1, alfa: 0.55 });
        guache(x, retangulo(cx - r * 0.45, cy - r * 1.12, r * 0.9, r * 0.22), escuro, ac);
        guache(x, retangulo(cx - r * 0.45, cy + r * 0.9, r * 0.9, r * 0.2), escuro, ac);
      }

      function varais(x, ac) {
        for (const p of deTipo('varal')) {
          vaos(p).forEach(([x0, x1]) => {
            const pts = []; for (let u = 0; u <= 1.0001; u += 0.05) pts.push(naCurva(x0, x1, p.y, p.flecha, u));
            risco(x, pts, cor('creme'), 3.2, ac, { fios: 2, alfa: 0.75 });
            if (p.estilo === 'bandeirinhas') {
              const n = Math.round((x1 - x0) / (p.passo || 44)), cs = p.cores || ['creme'];
              for (let i = 0; i < n; i++) {
                const u = (i + 0.5) / n, [bx, by] = naCurva(x0, x1, p.y, p.flecha, u), w = (x1 - x0) / n * 0.42;
                const cn = cs[(i + Math.round(x0 / 7)) % cs.length];
                const tri = poligono([[bx - w, by], [bx + w, by], [bx + (ac() - 0.5) * 6, by + w * 2.3]]);
                preenche(x, tri, cores([cn, 'creme']), { ang: 80, larg: 4, comp: 16, base: 0.6 }, ac);
                if (i % 3 === 0) raspa(x, [[bx - w * 0.6, by + 4], [bx, by + w * 1.6], [bx + w * 0.6, by + 4]], cor('creme'), ac, 1.4);
              }
            }
          });
          // postes (com bandeirinha vermelha em alguns)
          if (p.postes) vaos(p).forEach(([x0], j) => {
            const base = p.postes;
            risco(x, [[x0, p.y - 40], [x0, base]], cor('creme'), 6, ac, { fios: 2 });
            if (j % 2 === 0) preenche(x, poligono([[x0, p.y - 40], [x0 + 38, p.y - 30], [x0, p.y - 18]]), cores(['vermelhao', 'rosa']), { ang: 0, larg: 4, comp: 14 }, ac);
          });
        }
        for (const l of LANTERNAS) {
          if (l.alta) risco(x, [[l.x, l.fio], [l.x, l.y - l.r]], cor('creme'), 2, ac, { fios: 1, alfa: 0.6 });
          else risco(x, [[l.x, l.fio], [l.x, l.y - l.r]], cor('creme'), 2, ac, { fios: 1, alfa: 0.6 });
          lanterna(x, ac, null, l.x, l.y, l.r, l.cor);
        }
      }

      // ---------- barraca: toldo listrado com barrado, postes, fundo escuro, vendedor, mercadoria, balcão ----------
      const TOPO = H.feira.toldo, BALCAO = H.feira.balcao, CHAO = H.feira.chao;
      function barraca(x, ac, p) {
        const x0 = p.x, w = p.larg, x1 = x0 + w, cx = x0 + w / 2;
        // fundo escuro da barraca
        guache(x, retangulo(x0 + 8, TOPO + 80, w - 16, BALCAO - TOPO - 80), hex(escuro, '#000000', 0.25), ac, { alfa: 0.9 });
        // postes
        for (const px of [x0 + 10, x1 - 10]) risco(x, [[px, TOPO + 40], [px, CHAO]], cor('creme'), 7, ac, { fios: 2 });
        // vendedor (se tiver)
        if (p.vendedor) {
          const vx = cx + (p.vendedorX || 0), vy = BALCAO;
          preenche(x, poligono([[vx - 34, vy], [vx - 26, vy - 60], [vx + 26, vy - 60], [vx + 34, vy]]), cores([p.vendedor, 'creme']), { ang: 80, larg: 5, comp: 18 }, ac);
          preenche(x, elipse(vx, vy - 86, 25, 27), cores(['creme', 'rosa']), { ang: -60, larg: 4, comp: 14, base: 0.8 }, ac);
          preenche(x, poligono([[vx - 27, vy - 88], [vx - 22, vy - 112], [vx, vy - 118], [vx + 22, vy - 112], [vx + 27, vy - 90], [vx + 10, vy - 100], [vx - 10, vy - 98]]), cores([escuro, 'anil']), { ang: 20, larg: 4, comp: 14, base: 0.9 }, ac);
          x.globalAlpha = 0.8; x.fillStyle = escuro; x.beginPath(); x.arc(vx - 8, vy - 84, 2.6, 0, TAU); x.arc(vx + 9, vy - 84, 2.6, 0, TAU); x.fill(); x.globalAlpha = 1;
        }
        // mercadoria em cima do balcão
        const m = p.mercadoria;
        if (m === 'frutas') {
          let fila = 0;
          for (let n = 5; n > 0; n--, fila++) for (let i = 0; i < n; i++) {
            const fx = cx - (n - 1) * 15 + i * 30 + (p.mercadoriaX || 0) - 70, fy = BALCAO - 14 - fila * 25;
            preenche(x, elipse(fx, fy, 14, 14), cores([(i + fila) % 2 ? 'amarelo' : 'vermelhao', 'amarelo']), { ang: -50, larg: 4, comp: 12, base: 0.8 }, ac);
          }
          for (let i = 0; i < 3; i++) preenche(x, elipse(cx + 70 + i * 34, BALCAO - 14, 15, 13), cores(['agua', 'creme']), { ang: -50, larg: 4, comp: 12, base: 0.8 }, ac);
        } else if (m === 'panelas') {
          for (const [dx, cn] of [[-110, 'anil'], [-20, 'agua'], [80, 'vermelhao']]) {
            const px = cx + dx;
            preenche(x, poligono([[px - 40, BALCAO - 50], [px + 40, BALCAO - 50], [px + 34, BALCAO - 2], [px - 34, BALCAO - 2]]), cores([cn, 'creme']), { ang: 0, larg: 5, comp: 20, base: 0.7 }, ac);
            risco(x, [[px - 44, BALCAO - 52], [px + 44, BALCAO - 52]], cor('creme'), 5, ac, { fios: 2 });
          }
        } else if (m === 'chaleiras') {
          for (const [dx, cn] of [[-100, 'agua'], [0, 'rosa'], [100, 'amarelo']]) {
            const px = cx + dx;
            preenche(x, elipse(px, BALCAO - 32, 34, 30), cores([cn, 'creme']), { ang: -40, larg: 5, comp: 16, base: 0.75 }, ac);
            risco(x, [[px + 28, BALCAO - 36], [px + 52, BALCAO - 56]], cor(cn), 7, ac, { fios: 2 });
            risco(x, [[px - 22, BALCAO - 58], [px - 10, BALCAO - 78], [px + 14, BALCAO - 76], [px + 22, BALCAO - 58]], cor('creme'), 3, ac, { fios: 2 });
            raspa(x, [[px - 18, BALCAO - 46], [px - 6, BALCAO - 52]], cor('creme'), ac, 2);
          }
        } else if (m === 'balas') {
          for (let i = 0; i < 6; i++) lanterna(x, ac, null, cx - 125 + i * 50, TOPO + 135 + (i % 2) * 20, 15, ['rosa', 'agua', 'amarelo'][i % 3]);
        }
        // balcão: frente com desenho
        const frente = retangulo(x0 + 4, BALCAO, w - 8, CHAO - BALCAO);
        if (p.frenteGuache) guache(x, frente, cor(p.frente), ac); else preenche(x, frente, cores([p.frente, 'creme']), { ang: 90, larg: 6, comp: 34, base: 0.65 }, ac);
        risco(x, [[x0, BALCAO], [x1, BALCAO]], cor('creme'), 6, ac, { fios: 2 });
        const desenho = p.desenho, cd = cor(p.corDesenho || 'creme');
        if (desenho === 'zigue') {
          for (const yy of [BALCAO + 70, BALCAO + 110]) {
            const pts = []; for (let xx = x0 + 22, i = 0; xx <= x1 - 20; xx += 26, i++) pts.push([xx, yy + (i % 2 ? -18 : 18)]);
            risco(x, pts, cd, 7, ac, { fios: 2 });
            if (p.umZigue) break;
          }
        } else if (desenho === 'losangos') {
          const n = Math.floor((w - 30) / 48);
          for (let i = 0; i < n; i++) {
            const lx = x0 + 15 + 24 + i * 48 + ((w - 30) - n * 48) / 2, ly = (BALCAO + CHAO) / 2;
            preenche(x, poligono([[lx, ly - 52], [lx + 20, ly], [lx, ly + 52], [lx - 20, ly]]), cores([p.corDesenho || escuro, 'creme']), { ang: 90, larg: 4, comp: 14, base: 0.85 }, ac);
          }
        } else if (desenho === 'listras') {
          for (let xx = x0 + 22; xx < x1 - 10; xx += 30) risco(x, [[xx, BALCAO + 16], [xx + 2, CHAO - 12]], cd, 6, ac, { fios: 2, alfa: 0.75 });
        }
        // toldo: listras em pé com barrado de ondinhas
        const lista = p.toldo || ['creme', 'vermelhao'], faixa = p.faixa || 34;
        const nf = Math.ceil(w / faixa), topoE = TOPO + 6, topoD = TOPO;
        for (let i = 0; i < nf; i++) {
          const a = x0 - 6 + i * (w + 12) / nf, b = a + (w + 12) / nf;
          preenche(x, poligono([[a, mistura(topoE, topoD, i / nf)], [b, mistura(topoE, topoD, (i + 1) / nf)], [b, TOPO + 80], [a, TOPO + 80]]), cores([lista[i % lista.length], 'creme']), { ang: 92, larg: 6, comp: 46, base: 0.7, dens: 1.1 }, ac);
        }
        const nb = Math.round(w / 30), cb = cor(p.barrado || 'creme');
        for (let i = 0; i < nb; i++) {
          const bx = x0 - 6 + (i + 0.5) * (w + 12) / nb;
          preenche(x, elipse(bx, TOPO + 82, (w + 12) / nb / 2, 13), cb, { ang: 0, larg: 4, comp: 12, base: 0.8 }, ac);
        }
        raspa(x, [[x0 + 10, TOPO + 26], [x0 + w * 0.3, TOPO + 22], [x0 + w * 0.6, TOPO + 24]], cor('creme'), ac, 2);
      }

      // palco do malabarista: painel escuro, barrado e caixote
      function palco(x, ac, p) {
        const x0 = p.x, w = p.larg, x1 = x0 + w;
        guache(x, retangulo(x0, TOPO + 30, w, CHAO - TOPO - 30), hex(escuro, '#000000', 0.35), ac);
        for (let i = 0; i < Math.round(w / 26); i++) preenche(x, elipse(x0 + 13 + i * 26, TOPO + 34, 13, 11), cores([i % 2 ? 'amarelo' : 'vermelhao', 'creme']), { ang: 0, larg: 4, comp: 10 }, ac);
        risco(x, [[x0 + 10, TOPO + 30], [x0 + 10, CHAO]], cor('creme'), 5, ac, { fios: 2 });
        risco(x, [[x1 - 10, TOPO + 30], [x1 - 10, CHAO]], cor('creme'), 5, ac, { fios: 2 });
        // pontinhos de confete no painel
        for (let i = 0; i < 26; i++) { x.globalAlpha = 0.7; x.fillStyle = cor(['rosa', 'amarelo', 'agua', 'creme'][i % 4]); x.fillRect(x0 + 20 + ac() * (w - 40), TOPO + 60 + ac() * (CHAO - TOPO - 160), 6, 6); }
        x.globalAlpha = 1;
        const cx = x0 + w / 2, cy = p.caixote;
        const cx0 = cx - 46, cy0 = cy, cw = 92, ch = CHAO + 10 - cy;
        preenche(x, retangulo(cx0, cy0, cw, ch), cores(['amarelo', 'vermelhao']), { ang: 0, larg: 5, comp: 18, base: 0.75 }, ac);
        risco(x, [[cx0 + 6, cy0 + 6], [cx0 + cw - 6, cy0 + ch - 6]], cor('vermelhao'), 5, ac, { fios: 2 });
        risco(x, [[cx0 + cw - 6, cy0 + 6], [cx0 + 6, cy0 + ch - 6]], cor('vermelhao'), 5, ac, { fios: 2 });
        risco(x, [[cx0, cy0], [cx0 + cw, cy0], [cx0 + cw, cy0 + ch], [cx0, cy0 + ch]], cor('creme'), 3, ac, { fios: 1, fecha: true });
      }

      function chao(x, ac, p) {
        const area = retangulo(p.x0, CHAO, p.x1 - p.x0, p.y1 - CHAO);
        guache(x, area, hex(escuro, '#000000', 0.15), ac, { alfa: 0.96 });
        // fileiras de riscos coloridos e apagados, como pedras da rua
        for (let y = CHAO + 30; y < p.y1; y += 34 + ac() * 26) {
          let xx = p.x0 + ac() * 60;
          while (xx < p.x1) {
            const l = 50 + ac() * 160, cn = cor(['amarelo', 'vermelhao', 'agua', 'anil', 'creme', 'rosa'][Math.floor(ac() * 6)]);
            x.globalAlpha = 0.18 + ac() * 0.3; x.strokeStyle = cn; x.lineWidth = 4 + ac() * 7; x.lineCap = 'round';
            x.beginPath(); x.moveTo(xx, y + (ac() - 0.5) * 8); x.lineTo(xx + l, y + (ac() - 0.5) * 8); x.stroke();
            xx += l + 10 + ac() * 60;
          }
        }
        x.globalAlpha = 1;
      }

      function morro(x, ac, p) {
        const b = p.base, x0 = p.x, w = p.larg, top = b - p.alt;
        let pts;
        if (p.forma === 'pico') pts = [[x0, b], [x0 + w * 0.12, top + p.alt * 0.5], [x0 + w * 0.42, top + 10], [x0 + w * 0.5, top], [x0 + w * 0.58, top + 12], [x0 + w * 0.88, top + p.alt * 0.5], [x0 + w, b]];
        else { pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([x0 + u * w, b - p.alt * Math.pow(Math.sin(Math.PI * u), 0.6)]); } }
        const cn = p.cor || escuro;
        preenche(x, poligono(pts), [cor(cn), hex(cor(cn), cor('vermelhao'), 0.25), hex(cor(cn), '#000000', 0.3)], { ang: 95, larg: 7, comp: 34, base: 0.85, dens: 0.9 }, ac);
        // janelinha acesa de vez em quando
        if (p.janelas) for (let i = 0; i < p.janelas; i++) { x.globalAlpha = 0.8; x.fillStyle = cor('amarelo'); x.fillRect(x0 + w * (0.3 + 0.4 * ac()), top + p.alt * (0.35 + 0.3 * ac()), 9, 12); }
        x.globalAlpha = 1;
      }

      function cesto(x, ac, p) {
        const cs = p.cores || ['amarelo', 'rosa', 'vermelhao', 'agua'];
        risco(x, [[p.x - 70, p.y + 30], [p.x + 70, p.y + 30]], cor('creme'), 6, ac, { fios: 2 });
        for (let i = 0; i < 4; i++) {
          const bx = p.x - 52 + i * 35, by = p.y + 8;
          preenche(x, elipse(bx, by, 17, 17), cores([cs[i % cs.length], 'creme']), { ang: -30, larg: 4, comp: 12, base: 0.8 }, ac);
          raspa(x, [[bx - 10, by - 4], [bx + 8, by - 10]], cor('creme'), ac, 1.6);
        }
      }

      // ---------- camadas (cada uma em 3 versões de riscos) ----------
      function camada(f, x0, y0, x1, y1, pinta, s) {
        const R = k;               // pixels por unidade de desenho
        const lista = [];
        for (let v = 0; v < VARIANTES; v++) {
          const cv = novaTela((x1 - x0) * R, (y1 - y0) * R), x = cv.getContext('2d');
          x.setTransform(R, 0, 0, R, -x0 * R, -y0 * R);
          pinta(x, (n) => sorteio(SEM * 7919 + s * 104729 + v * 1299709 + n * 31));
          tiraDente(x, cv.width, cv.height, v * 53 + s * 17, 0.65);
          lista.push(cv);
        }
        return { f, x0, y0, x1, y1, lista };
      }
      const CAMADAS = [];
      CAMADAS.push(camada(0.8, -500, 1050, 4100, 2120, (x, S) => {
        // brilho morno atrás da feira (dedo esfumando o pastel)
        const g = x.createLinearGradient(0, TOPO - 300, 0, TOPO + 200);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, Filme.cor(C.amarelo, null, 0, 0.13));
        x.fillStyle = g; x.fillRect(-500, TOPO - 300, 4600, 500);
        deTipo('morro').forEach((p, i) => morro(x, S(i), p));
      }, 1));
      CAMADAS.push(camada(1, -400, 1150, 4000, 2400, (x, S) => {
        const ch = uma('chao'); if (ch) chao(x, S(1), ch);
        deTipo('barraca').forEach((p, i) => barraca(x, S(10 + i), p));
        deTipo('palco').forEach((p, i) => palco(x, S(40 + i), p));
        varais(x, S(60));
      }, 2));
      CAMADAS.push(camada(1.15, -800, 2150, 4600, 2520, (x, S) => {
        deTipo('cesto').forEach((p, i) => cesto(x, S(i), p));
      }, 3));

      function pintaCamada(cm, cam, v) {
        poeCamera(c, cam, cm.f);
        c.drawImage(cm.lista[v], cm.x0, cm.y0, cm.x1 - cm.x0, cm.y1 - cm.y0);
      }

      // ================= CÉU (ao vivo, é barato): riscos raspados em arco, estrelas, lua =================
      const CEU = uma('ceu') || { f: 0.55 };
      const ESTRELAS = (() => {
        const e = CEU.estrelas || {}, ac = sorteio(SEM + 77), r = [];
        for (let i = 0; i < (e.quantas || 80); i++) {
          r.push({ x: mistura(e.x0 ?? -200, e.x1 ?? 3400, ac()), y: mistura(e.y0 ?? 750, e.y1 ?? 1450, ac()), tam: 6 + ac() * 16,
            tipo: ac() < 0.35 ? 'brilho' : ac() < 0.6 ? 'asterisco' : 'ponto', cor: ['amarelo', 'creme', 'rosa', 'agua', 'amarelo'][Math.floor(ac() * 5)], fase: ac() * 10 });
        }
        return r;
      })();
      function ceu(cam, idx, tq) {
        poeCamera(c, cam, CEU.f);
        const ac = sorteio(SEM * 13 + idx * 7);
        // arcos grandes raspados no céu (o arrasto do pastel)
        for (const a of CEU.arcos || []) {
          const pts = []; for (let u = 0; u <= 1.0001; u += 0.04) { const ang = mistura(a.de, a.ate, u) * Math.PI / 180; pts.push([a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r]); }
          risco(c, pts, hex(papel, '#000000', 0.35), 9, ac, { fios: 2, alfa: 0.5 });
        }
        for (const s of ESTRELAS) {
          const pis = 0.65 + 0.35 * ruido(tq * 1.3 + s.fase, 5), t2 = s.tam * pis, cn = cor(s.cor);
          if (s.tipo === 'ponto') { c.globalAlpha = 0.8 * pis; c.fillStyle = cn; c.beginPath(); c.arc(s.x, s.y, t2 * 0.22, 0, TAU); c.fill(); c.globalAlpha = 1; continue; }
          if (s.tipo === 'brilho') {
            preenche(c, poligono([[s.x, s.y - t2], [s.x + t2 * 0.22, s.y - t2 * 0.22], [s.x + t2, s.y], [s.x + t2 * 0.22, s.y + t2 * 0.22], [s.x, s.y + t2], [s.x - t2 * 0.22, s.y + t2 * 0.22], [s.x - t2, s.y], [s.x - t2 * 0.22, s.y - t2 * 0.22]]), cn, { ang: 45, larg: 3, comp: 8, base: 0.9 }, ac);
          } else for (let r = 0; r < 3; r++) { const an = r * Math.PI / 3 + 0.3; risco(c, [[s.x - Math.cos(an) * t2 * 0.6, s.y - Math.sin(an) * t2 * 0.6], [s.x + Math.cos(an) * t2 * 0.6, s.y + Math.sin(an) * t2 * 0.6]], cn, 2.6, ac, { fios: 1 }); }
        }
        const lu = CEU.lua;
        if (lu) {
          const g = c.createRadialGradient(lu.x, lu.y, lu.r * 0.5, lu.x, lu.y, lu.r * 3.2);
          g.addColorStop(0, Filme.cor(C.creme, null, 0, 0.16)); g.addColorStop(1, Filme.cor(C.creme, null, 0, 0));
          c.fillStyle = g; c.fillRect(lu.x - lu.r * 3.3, lu.y - lu.r * 3.3, lu.r * 6.6, lu.r * 6.6);
          const fora = new Path2D(); fora.arc(lu.x, lu.y, lu.r, 0, TAU);
          const dentro = new Path2D(); dentro.arc(lu.x + lu.r * 0.45, lu.y - lu.r * 0.25, lu.r * 0.85, 0, TAU);
          const ab = new Path2D(); ab.rect(lu.x - lu.r * 3, lu.y - lu.r * 3, lu.r * 6, lu.r * 6); ab.addPath(dentro);
          c.save(); c.clip(fora); c.clip(ab, 'evenodd');
          preenche(c, { caminho: fora, caixa: [lu.x - lu.r, lu.y - lu.r, lu.x + lu.r, lu.y + lu.r] }, cores(['creme', 'amarelo']), { ang: -60, larg: 4, comp: 14, base: 0.85, dens: 1.4 }, ac);
          c.restore();
        }
      }

      // ================= PERSONAGENS (ao vivo, em dois) =================
      const menina = uma('menina'), cao = uma('cao'), acoug = uma('acougueiro'), malab = uma('malabarista');
      const PELE = cor('creme'), CABELO = hex(escuro, '#000000', 0.4);
      function xMenina(t) { const a = menina.anda; return mistura(a.x0, a.x1, limita(passeio(trecho(t, a.de, a.ate)))); }
      const andando = (t) => t > menina.anda.de && t < menina.anda.ate - 0.05;

      function cabeca(x, ac, hx, hy, r, giro, olhaDir) {
        x.save(); x.translate(hx, hy); x.rotate(giro);
        preenche(x, elipse(0, 0, r, r * 1.02), cores(['creme', 'creme', 'rosa']), { ang: -60, larg: 4, comp: 13, base: 0.85 }, ac);
        // cabelo: touca escura atrás e franja
        preenche(x, poligono([[-r * 1.05, r * 0.35], [-r * 1.1, -r * 0.4], [-r * 0.6, -r * 1.05], [r * 0.2, -r * 1.12], [r * 0.85 * olhaDir, -r * 0.7], [r * 0.5 * olhaDir, -r * 0.45], [-r * 0.1, -r * 0.55], [-r * 0.45, -r * 0.1], [-r * 0.55, r * 0.55]].map(([a, b]) => [a * olhaDir, b])), CABELO, { ang: 30, larg: 4, comp: 14, base: 0.95 }, ac);
        x.globalAlpha = 0.9; x.fillStyle = CABELO; x.beginPath(); x.arc(r * 0.35 * olhaDir, -r * 0.05, r * 0.08, 0, TAU); x.fill();
        x.fillStyle = cor('rosa'); x.globalAlpha = 0.85; x.beginPath(); x.arc(r * 0.45 * olhaDir, r * 0.3, r * 0.17, 0, TAU); x.fill();
        x.globalAlpha = 1; x.restore();
      }

      function desenhaMenina(x, t, idx) {
        const ac = sorteio(SEM * 101 + idx * 3), X = xMenina(t), Y = menina.chao, anda = andando(t);
        const fase = (X - menina.anda.x0) / (menina.passo || 95) * Math.PI;
        const bob = anda ? -Math.abs(Math.sin(fase)) * 7 : 0;
        const olha = limita(trecho(t, menina.olha, menina.olha + 0.5));
        const sw = anda ? Math.sin(fase) * 0.42 : 0;
        const E = menina.escala || 1;
        x.save(); x.translate(X, Y); x.scale(E, E); x.translate(-X, -Y);
        const quadril = [X, Y - 92 + bob];
        // pernas e sapatos
        for (const s of [sw, -sw]) {
          const pe = [quadril[0] + Math.sin(s) * 92, quadril[1] + Math.cos(s) * 92];
          risco(x, [quadril, pe], cor('creme'), 9, ac, { fios: 2 });
          preenche(x, elipse(pe[0] + 7, pe[1] - 2, 13, 7), cores(['amarelo', 'creme']), { ang: 0, larg: 3, comp: 8, base: 0.9 }, ac);
        }
        // braço de trás
        const ombroT = [X - 14, Y - 205 + bob];
        risco(x, [ombroT, [X - 34 - sw * 30, Y - 140 + bob]], cor('vermelhao'), 13, ac, { fios: 2 });
        // casaco vermelho com bolinhas
        const bal = anda ? Math.sin(fase * 2) * 6 : 0;
        const casaco = poligono([[X - 26, Y - 222 + bob], [X + 26, Y - 222 + bob], [X + 64 + bal, Y - 86 + bob], [X - 62 + bal, Y - 82 + bob]]);
        preenche(x, casaco, cores(['vermelhao', 'rosa', 'amarelo']), { ang: -70, larg: 6, comp: 22, base: 0.7, dens: 1.15 }, ac);
        const pac = sorteio(SEM + 404);
        for (let i = 0; i < 14; i++) {
          const v = pac(), u = pac(), py = Y - 210 + v * 115 + bob, meia = 26 + (v) * 36, px = X - meia * 0.8 + u * meia * 1.6;
          x.globalAlpha = 0.9; x.fillStyle = cor('creme'); x.beginPath(); x.arc(px + (ac() - 0.5) * 2, py, 4.5 + ac() * 1.5, 0, TAU); x.fill();
        }
        x.globalAlpha = 1;
        raspa(x, [[X + 8, Y - 200 + bob], [X + 30, Y - 120 + bob]], cor('amarelo'), ac, 1.8);
        // cachecol água, com a ponta voando para trás
        const vento = Math.sin(t * 9) * 8;
        preenche(x, poligono([[X - 30, Y - 228 + bob], [X + 30, Y - 228 + bob], [X + 26, Y - 210 + bob], [X - 30, Y - 210 + bob]]), cores(['agua', 'creme']), { ang: 0, larg: 5, comp: 14, base: 0.85 }, ac);
        preenche(x, poligono([[X - 24, Y - 222 + bob], [X - 70, Y - 214 + vento + bob], [X - 78, Y - 196 + vento + bob], [X - 22, Y - 208 + bob]]), cores(['agua', 'creme']), { ang: 10, larg: 5, comp: 14, base: 0.85 }, ac);
        // cabeça (olha para cima no fim)
        cabeca(x, ac, X + 4, Y - 262 + bob, 36, -0.45 * olha, 1);
        // braço da frente com a vara e a lanterna
        const ombro = [X + 14, Y - 205 + bob], mao = [X + 58, Y - 160 + bob - olha * 10];
        risco(x, [ombro, mao], cor('vermelhao'), 13, ac, { fios: 2 });
        preenche(x, elipse(mao[0], mao[1], 8, 8), PELE, { ang: 0, larg: 3, comp: 8, base: 0.9 }, ac);
        const ponta = [mao[0] + 92, mao[1] - 108 + olha * 20];
        risco(x, [mao, ponta], cor('amarelo'), 5, ac, { fios: 2 });
        const balanço = anda ? Math.sin(fase + 0.6) * 0.3 : Math.sin(t * 3) * 0.08 * (1 - olha);
        const lc = [ponta[0] + Math.sin(balanço) * 44, ponta[1] + Math.cos(balanço) * 44];
        risco(x, [ponta, lc], cor('creme'), 2, ac, { fios: 1 });
        x.restore();
        return { lanterna: [X + (lc[0] - X) * E, Y + (lc[1] - Y) * E], escala: E };
      }

      function posCao(t) {
        const d = cao;
        if (t < d.pula) return { x: d.x, y: d.chao, modo: 'senta', dir: -1 };
        if (t < d.pousa) { const u = trecho(t, d.pula, d.pousa); return { x: mistura(d.x, d.pousoX, u), y: mistura(d.chao, d.chao, u) - Math.sin(Math.PI * u) * d.altura, modo: 'pulo', dir: -1, u }; }
        const u = trecho(t, d.pousa, d.ate);
        return { x: mistura(d.pousoX, d.x1, u), y: d.chao, modo: 'corre', dir: -1 };
      }
      function desenhaCao(x, t, idx) {
        const ac = sorteio(SEM * 211 + idx * 5), p = posCao(t), D = p.dir, branco = cores(['creme', 'agua']);
        if (p.modo !== 'senta' && t > cao.ate + 0.2) return;
        const corre = p.modo === 'corre', fase = t * 22;
        const E = cao.escala || 1;
        x.save(); x.translate(p.x, p.y); x.scale(E, E);
        if (p.modo === 'pulo') x.rotate(D * (p.u - 0.5) * -0.9);
        if (p.modo === 'senta') {
          preenche(x, elipse(0, -40, 30, 38), branco, { ang: -70, larg: 5, comp: 16, base: 0.85 }, ac);
          preenche(x, elipse(D * 20, -88, 22, 19), branco, { ang: -70, larg: 4, comp: 12, base: 0.85 }, ac);
          preenche(x, elipse(D * 4, -98, 8, 14, 0.4 * D), cores(['vermelhao', 'rosa']), { ang: 90, larg: 3, comp: 8, base: 0.8 }, ac);
          for (const dx of [-14, 14]) risco(x, [[D * 10 + dx * 0.4, -20], [D * 12 + dx * 0.4, 0]], cor('creme'), 7, ac, { fios: 2 });
          const rabo = Math.sin(t * 14) * 10;
          risco(x, [[-D * 26, -16], [-D * 44, -30 + rabo]], cor('creme'), 6, ac, { fios: 2 });
        } else {
          const pernas = corre ? [Math.sin(fase), Math.sin(fase + 1.2), Math.sin(fase + Math.PI), Math.sin(fase + Math.PI + 1.2)] : [0.8, 0.6, -0.7, -0.8];
          pernas.forEach((s, i) => { const bx = (i < 2 ? 34 : -30) * D, joelho = [bx + s * 16 * D, -26], pata = [bx + s * 22 * D + (i < 2 ? 6 : -6) * D, -3]; risco(x, [[bx, -48], joelho, pata], cor('creme'), 8, ac, { fios: 2 }); });
          preenche(x, elipse(0, -56, 58, 24), branco, { ang: 0, larg: 5, comp: 18, base: 0.85 }, ac);
          preenche(x, elipse(D * 62, -80, 22, 19), branco, { ang: 0, larg: 4, comp: 12, base: 0.85 }, ac);
          preenche(x, elipse(D * 50, -96, 8, 15, -0.6 * D), cores(['vermelhao', 'rosa']), { ang: 90, larg: 3, comp: 8, base: 0.8 }, ac);
          risco(x, [[-D * 56, -60], [-D * 82, -78 + Math.sin(fase) * 8]], cor('creme'), 6, ac, { fios: 2 });
          x.globalAlpha = 0.9; x.fillStyle = CABELO; x.beginPath(); x.arc(D * 70, -84, 3, 0, TAU); x.fill(); x.globalAlpha = 1;
        }
        x.restore();
        return { boca: [p.x + D * 82 * E, p.y - 74 * E], dir: D };
      }

      // corrente de salsichas: pendurada no toldo, ou na boca do cão
      function desenhaSalsichas(x, t, idx, boca) {
        const s = uma('salsichas'), ac = sorteio(SEM * 307 + idx);
        const n = s.quantas || 6, elos = [];
        if (t >= cao.pega && !boca) return;      // o cão já fugiu com elas
        if (t < cao.pega) {
          for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; elos.push([mistura(s.x0, s.x1, u), s.y + Math.sin(Math.PI * u) * 34, Math.atan2(Math.cos(Math.PI * u) * 34 * Math.PI / n, (s.x1 - s.x0) / n)]); }
        } else {
          const [bx, by] = boca.boca;
          for (let i = 0; i < n; i++) elos.push([bx - boca.dir * (16 + i * 30), by - 4 - i * 5 + Math.sin(t * 20 + i * 1.3) * 7, -boca.dir * 0.2]);
        }
        for (const [ex, ey, g] of elos) preenche(x, elipse(ex, ey, 17, 9, g), cores(['vermelhao', 'rosa']), { ang: 0, larg: 4, comp: 12, base: 0.85 }, ac);
      }

      function desenhaAcougueiro(x, t, idx) {
        const ac = sorteio(SEM * 401 + idx), X = acoug.x, B = BALCAO;
        const bravo = trecho(t, acoug.bravo, acoug.bravo + 0.25) * (1 - trecho(t, acoug.calma, acoug.calma + 0.4));
        for (const lado of [-1, 1]) {
          const ombro = [X + lado * 26, B - 74];
          const desc = [X + lado * 44, B - 6], cima = [X + lado * (60 + Math.sin(t * 16 + lado) * 12), B - 170 + Math.cos(t * 13) * 10];
          const mao = [mistura(desc[0], cima[0], bravo), mistura(desc[1], cima[1], bravo)];
          risco(x, [ombro, mao], cor('anil'), 13, ac, { fios: 2 });
          preenche(x, elipse(mao[0], mao[1], 9, 9), PELE, { ang: 0, larg: 3, comp: 8 }, ac);
        }
        preenche(x, poligono([[X - 38, B], [X - 30, B - 82], [X + 30, B - 82], [X + 38, B]]), cores(['anil', 'agua']), { ang: 80, larg: 5, comp: 18 }, ac);
        preenche(x, poligono([[X - 20, B], [X - 18, B - 62], [X + 18, B - 62], [X + 20, B]]), cores(['creme']), { ang: 80, larg: 4, comp: 14, base: 0.8 }, ac);
        cabeca(x, ac, X, B - 112, 28, 0, -1);
        preenche(x, poligono([[X - 26, B - 132], [X - 20, B - 162], [X + 20, B - 162], [X + 26, B - 132]]), cores(['creme']), { ang: 0, larg: 4, comp: 12, base: 0.9 }, ac);
      }

      function desenhaMalabarista(x, t, idx) {
        const ac = sorteio(SEM * 503 + idx), X = malab.x, Y = malab.pes, per = malab.periodo || 1.6;
        const balanço = Math.sin(t * 4) * 3;
        // pernas
        for (const s of [-1, 1]) risco(x, [[X + s * 10, Y - 90], [X + s * 16, Y]], cor('creme'), 7, ac, { fios: 2 });
        // roupa de losangos
        const corpo = [[X, Y - 220], [X + 40, Y - 150], [X, Y - 80], [X - 40, Y - 150]];
        preenche(x, poligono([corpo[0], corpo[1], [X, Y - 150]]), cores(['rosa', 'creme']), { ang: 60, larg: 4, comp: 14, base: 0.85 }, ac);
        preenche(x, poligono([corpo[0], [X, Y - 150], corpo[3]]), cores(['agua', 'creme']), { ang: 60, larg: 4, comp: 14, base: 0.85 }, ac);
        preenche(x, poligono([[X, Y - 150], corpo[1], corpo[2]]), cores(['agua', 'creme']), { ang: 60, larg: 4, comp: 14, base: 0.85 }, ac);
        preenche(x, poligono([corpo[3], [X, Y - 150], corpo[2]]), cores(['rosa', 'creme']), { ang: 60, larg: 4, comp: 14, base: 0.85 }, ac);
        risco(x, corpo, cor('creme'), 2.5, ac, { fios: 1, fecha: true });
        // braços para os anéis (mãos sobem e descem alternadas)
        const maos = [-1, 1].map((s, i) => [X + s * 72, Y - 190 + Math.sin(t / per * TAU * 2.5 + i * Math.PI) * 12]);
        for (const [i, m] of maos.entries()) { risco(x, [[X + (i ? 16 : -16), Y - 205], m], cor('creme'), 6, ac, { fios: 2 }); }
        cabeca(x, ac, X + balanço * 0.3, Y - 248, 24, balanço * 0.02, 1);
        preenche(x, poligono([[X - 22, Y - 264], [X + 22, Y - 264], [X + 4, Y - 318]]), cores(['vermelhao', 'amarelo']), { ang: 0, larg: 4, comp: 10, base: 0.85 }, ac);
        // os anéis: um arco alto de uma mão para a outra, e uma volta baixa
        const n = malab.aneis || 5, cs = malab.cores || ['amarelo', 'rosa', 'agua', 'creme', 'vermelhao'];
        for (let i = 0; i < n; i++) {
          const p = ((t / per + i / n) % 1 + 1) % 1;
          let ax, ay;
          if (p < 0.72) { const u = p / 0.72; ax = mistura(maos[0][0], maos[1][0], u); ay = maos[0][1] - 10 - Math.sin(Math.PI * u) * 175; }
          else { const u = (p - 0.72) / 0.28; ax = mistura(maos[1][0], maos[0][0], u); ay = maos[1][1] - 10 + Math.sin(Math.PI * u) * 8; }
          const pts = []; for (let a = 0; a <= 12; a++) pts.push([ax + Math.cos(a / 12 * TAU) * 18, ay + Math.sin(a / 12 * TAU) * 18]);
          risco(x, pts, cor(cs[i % cs.length]), 6, ac, { fios: 2 });
        }
      }

      // vapor das panelas (ao vivo: sobe e enrola)
      function vapor(x, t, idx) {
        const ac = sorteio(SEM * 601 + idx);
        for (const b of deTipo('barraca')) {
          if (b.mercadoria !== 'panelas') continue;
          for (const dx of [-110, -20, 80]) for (let j = 0; j < 2; j++) {
            const ph = ((t * 0.6 + j * 0.5 + dx * 0.01) % 1 + 1) % 1, bx = b.x + b.larg / 2 + dx, by = BALCAO - 60 - ph * 90;
            const pts = []; for (let u = 0; u <= 1; u += 0.2) pts.push([bx + Math.sin(u * 5 + t * 3 + j) * 10, by - u * 50]);
            x.save(); x.globalAlpha = 0.6 * Math.sin(Math.PI * ph); risco(x, pts, cor('creme'), 4, ac, { fios: 1, alfa: 0.5 }); x.restore();
          }
        }
      }

      // a lanterna que escapa do varal
      function posSolta(t) {
        const l = soltaDe, s = solta;
        if (!l) return null;
        if (t < s.t) return { x: l.x, y: l.y, fio: true };
        const u = trecho(t, s.t, s.chega);
        const sobe = 1 - Math.pow(1 - u, 1.7);
        return { x: mistura(l.x, s.x1, sobe) + Math.sin((t - s.t) * 2.2) * 26 * u, y: mistura(l.y, s.y1, sobe) + Math.sin((t - s.t) * 9) * 6 * (1 - u), fio: false, sacode: trecho(t, s.t, s.t + 0.3) };
      }
      function desenhaSolta(x, t, idx) {
        const p = posSolta(t); if (!p) return null;
        const ac = sorteio(SEM * 701 + idx), l = soltaDe;
        if (p.fio) risco(x, [[l.x, l.fio], [l.x, l.y - l.r]], cor('creme'), 2, ac, { fios: 1, alfa: 0.6 });
        else {
          // ponta do barbante solto, balançando embaixo
          risco(x, [[p.x, p.y + l.r], [p.x + Math.sin(t * 5) * 8, p.y + l.r + 34]], cor('creme'), 2, ac, { fios: 1, alfa: 0.6 });
          // raios raspados em volta, crescem quando ela sobe
          const forte = trecho(t, solta.t + 1, solta.chega);
          for (let i = 0; i < 14; i++) {
            const an = i / 14 * TAU + 0.2, r0 = l.r * 1.5, r1 = l.r * (1.7 + 0.9 * forte + 0.4 * ac());
            raspa(x, [[p.x + Math.cos(an) * r0, p.y + Math.sin(an) * r0], [p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1]], cor('amarelo'), ac, 2.4 * (0.4 + forte));
          }
        }
        x.save(); x.translate(p.x, p.y); x.rotate(Math.sin(t * 3) * 0.12 + (p.sacode ? Math.sin(p.sacode * 18) * 0.3 * (1 - p.sacode) : 0));
        lanterna(x, ac, null, 0, 0, l.r, l.cor); x.restore();
        return p;
      }

      // brilho das lanternas: dedo esfumando o pastel em volta (somado com 'lighter')
      function brilho(x, px, py, r, forca) {
        const g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, Filme.cor(C.amarelo, null, 0, 0.32 * forca)); g.addColorStop(0.45, Filme.cor(C.vermelhao, null, 0, 0.1 * forca)); g.addColorStop(1, Filme.cor(C.vermelhao, null, 0, 0));
        x.fillStyle = g; x.fillRect(px - r, py - r, 2 * r, 2 * r);
      }

      // ---------- tela dos personagens (para tirar o dente do papel deles também) ----------
      const PERS = novaTela(tela.width, tela.height), cp = PERS.getContext('2d');
      const RASTRO = novaTela(tela.width, tela.height), cr = RASTRO.getContext('2d');

      function personagens(x, t, idx, soRastro) {
        if (soRastro) { desenhaMenina(x, t, idx); if (cao && t >= cao.pula) desenhaCao(x, t, idx); return null; }
        if (malab) desenhaMalabarista(x, t, idx);
        if (acoug) desenhaAcougueiro(x, t, idx);
        const sol = desenhaSolta(x, t, idx);
        const m = desenhaMenina(x, t, idx);
        const boca = cao ? desenhaCao(x, t, idx) : null;
        if (uma('salsichas')) desenhaSalsichas(x, t, idx, t >= cao.pega ? boca : null);
        // lanterna da vara da menina (por cima)
        const lr = (menina.lanterna || 22) * m.escala, ac = sorteio(SEM * 809 + idx);
        lanterna(x, ac, null, m.lanterna[0], m.lanterna[1] + lr, lr, 'amarelo');
        return { menina: [m.lanterna[0], m.lanterna[1] + lr], solta: sol };
      }

      // ---------- título (letras em traços, pastel creme sobre faixa escurecida) ----------
      function titulo(t, idx) {
        const p = uma('titulo'); if (!p || !H.titulo) return;
        const al = trecho(t, p.de, p.de + 0.3) * (1 - trecho(t, p.ate - 0.4, p.ate));
        if (al <= 0) return;
        const tam = p.tamanho || 56, txt = H.titulo.toUpperCase(), w = Letras.largura(txt, tam);
        c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = al;
        const g = c.createLinearGradient(0, p.y - tam * 1.3, 0, p.y + tam * 1.1);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(8,16,18,0.55)'); g.addColorStop(1, 'rgba(8,16,18,0.55)');
        c.fillStyle = g; c.fillRect(0, p.y - tam * 1.3, L, tam * 2.4);
        const ac = sorteio(SEM * 907 + idx);
        let px = p.x;
        for (const ch of txt) {
          const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
          for (const tr of gl.tracos) {
            const pts = tr.map(([a, b]) => [px + a * tam, p.y - tam + b * tam]);
            risco(c, pts, cor('creme'), tam * 0.13, ac, { fios: 3, alfa: al });
          }
          px += (gl.w + 0.2) * tam;
        }
        c.globalAlpha = al;
        risco(c, [[p.x, p.y + tam * 0.35], [p.x + w * 0.4, p.y + tam * 0.33]], cor('amarelo'), tam * 0.09, ac, { fios: 2, alfa: al });
        c.globalAlpha = 1;
      }

      // ================= O QUADRO =================
      function desenhar(t) {
        const idx = fervura(t), v = ((idx % VARIANTES) + VARIANTES) % VARIANTES, tq = emDois(t);
        const cam = camera(t);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        c.drawImage(FUNDO, 0, 0);
        ceu(cam, idx, tq);
        pintaCamada(CAMADAS[0], cam, v);
        // brilho atrás das barracas
        poeCamera(c, cam, 1); c.globalCompositeOperation = 'lighter';
        for (const l of LANTERNAS) brilho(c, l.x, l.y, l.r * 4.2, 0.6 + 0.4 * ruido(tq * 2 + l.x * 0.01, 9));
        c.globalCompositeOperation = 'source-over';
        pintaCamada(CAMADAS[1], cam, v);
        // personagens: rastro (poses de antes, fracas) + pose de agora, numa tela própria com o dente do papel
        cp.setTransform(1, 0, 0, 1, 0, 0); cp.clearRect(0, 0, PERS.width, PERS.height);
        poeCamera(cp, cam, 1);
        vapor(cp, tq, idx);
        const passo = 2 / fps;
        // rastro de pigmento: as duas poses de antes, desenhadas de novo (nada é guardado) e bem fracas
        for (const [atras, forca] of [[2, 0.08], [1, 0.14]]) {
          cr.setTransform(1, 0, 0, 1, 0, 0); cr.clearRect(0, 0, RASTRO.width, RASTRO.height);
          poeCamera(cr, cam, 1); personagens(cr, Math.max(0, tq - atras * passo), idx + atras, true);
          cp.save(); cp.setTransform(1, 0, 0, 1, 0, 0); cp.globalAlpha = forca; cp.drawImage(RASTRO, 0, 0); cp.restore();
        }
        poeCamera(cp, cam, 1);
        const pos = personagens(cp, tq, idx, false);
        tiraDente(cp, PERS.width, PERS.height, idx * 37, 0.75);
        c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(PERS, 0, 0);
        // brilho das lanternas que se mexem
        poeCamera(c, cam, 1); c.globalCompositeOperation = 'lighter';
        brilho(c, pos.menina[0], pos.menina[1], 120, 0.9);
        if (pos.solta) brilho(c, pos.solta.x, pos.solta.y, 150 + 90 * trecho(t, solta.t, solta.chega), 1);
        c.globalCompositeOperation = 'source-over';
        pintaCamada(CAMADAS[2], cam, v);
        // tela inteira: título, grão do papel em relevo, luz do scan
        titulo(t, idx);
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.5;
        const pad = c.createPattern(GRAO, 'repeat'); c.fillStyle = pad; c.fillRect(0, 0, tela.width, tela.height);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
        c.drawImage(LUZ, 0, 0);
      }

      // ================= SOM (feito em código, nos mesmos tempos da imagem) =================
      function som() {
        const S = H.som || {}, m = Som.criar(duracao, SEM);
        const mu = S.musica || {};
        const b = mu.batida || 0.45, t0 = mu.inicio || 0.2;
        // valsa de piano de brinquedo: baixo no 1, acorde no 2 e no 3, melodia por cima
        (mu.baixo || []).forEach((n, compasso) => {
          const tc = t0 + compasso * 3 * b; if (tc > duracao - 0.3 || !n) return;
          m.sino(n, tc, 1.2, { vol: 0.10, brilho: 1.2, pan: -0.2 });
          const ac = (mu.acordes || [])[compasso] || [];
          for (const bt of [1, 2]) for (const nn of ac) if (tc + bt * b < duracao - 0.3) m.sino(nn, tc + bt * b, 0.6, { vol: 0.045, brilho: 1.6, pan: 0.15 });
        });
        (mu.melodia || []).forEach((n, i) => { const tn = t0 + i * b; if (n && tn < duracao - 0.3) m.sino(n, tn, 1.0, { vol: 0.075, brilho: 2.4, pan: 0.05 }); });
        // feira ao fundo: murmúrio (ruído grave que ondula)
        m.vento(0, duracao, { vol: S.murmurio ?? 0.05, corte: 380, onda: 0.9, profundidade: 0.5, entra: 0.6, sai: 2.5 });
        m.vento(0, duracao, { vol: (S.murmurio ?? 0.05) * 0.5, corte: 1100, onda: 1.7, profundidade: 0.7, entra: 0.6, sai: 2.5 });
        // passos da menina
        for (let t = menina.anda.de + 0.1; t < menina.anda.ate - 0.1; t += (menina.passoSom || 0.41)) m.toque(t, { vol: 0.06, dur: 0.05, corte: 1400, pan: -0.1 });
        // anéis do malabarista (pegou)
        if (malab) for (let t = 0.15; t < (malab.somAte || 6); t += (malab.periodo || 1.6) / (malab.aneis || 5)) m.toque(t, { vol: 0.018, dur: 0.03, corte: 5000, pan: -0.3 });
        // cão: pulo, latido, corrida
        if (cao) {
          m.batida(cao.pula, { vol: 0.12, freq: 160, dur: 0.12 });
          m.pio(cao.pega, { freq: 900, vol: 0.05, repete: 2, intervalo: 0.11, dur: 0.07, sobe: -0.3 });
          m.toque(cao.pega, { vol: 0.08, dur: 0.08, corte: 2500 });
          for (let t = cao.pousa; t < cao.ate; t += 0.14) m.toque(t, { vol: 0.035, dur: 0.03, corte: 2200, pan: -0.4 * trecho(t, cao.pousa, cao.ate) });
        }
        if (acoug) { m.batida(acoug.bravo, { vol: 0.14, freq: 120, dur: 0.18 }); m.pio(acoug.bravo + 0.1, { freq: 520, vol: 0.04, repete: 3, intervalo: 0.12, dur: 0.08, sobe: 0.4 }); }
        // a lanterna escapa: o barbante estala ("twang") e um brilho sobe
        if (solta) {
          m.corda('E3', solta.t, 1.6, { vol: 0.24, maciez: 0.3 });
          m.corda('B3', solta.t + 0.02, 1.2, { vol: 0.12, maciez: 0.4 });
          m.sino('E6', solta.t + 1.2, 1.5, { vol: 0.03, brilho: 3 });
        }
        // sino de fecho
        for (const s of S.sinos || []) m.sino(s.nota, s.t, s.dur || 2.4, { vol: s.vol || 0.14, brilho: 2.6 });
        m.sala(0.3);
        return m.fim({ entra: 0.3, sai: 1.0, pico: 0.85 });
      }

      return { desenhar, som };
    },
  });
})();
