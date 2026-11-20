// fundo.js — pinta o cenário UMA vez, como um quadro. Depois ele fica parado atrás da personagem.
// "Pintar" aqui é o código dar milhares de pinceladas com sorteio de semente fixa:
// a mesma semente pinta sempre o mesmo quadro.
(function () {
  'use strict';
  const { sorteio, cor, mistura } = Filme;
  const MARGEM = 0.05; // o quadro é 10% maior que a tela, para a câmera poder se mexer

  const HORAS = {
    dia: {
      ceu: ['#2560c4', '#4b90e0', '#9bcdf4', '#e3f4fc'], nuvemLuz: '#ffffff', nuvemSombra: '#93b2de', nuvemBase: '#bcd6f2',
      longe: ['#86b2dc', '#79a9c4', '#5d9a8c'], capim: ['#8ed05c', '#5fae48', '#2f7f3c'], flor: ['#ffffff', '#ffe36e', '#ff9db5'],
      mar: ['#bfe4f6', '#3f9fd0', '#1f6fae'], areia: ['#f6e6c0', '#e2c898'], luz: '#fffbe6', sol: null, ambiente: ['#fff3d6', 0.06], poste: '#39465c',
    },
    entardecer: {
      ceu: ['#2a3a8c', '#8a5cab', '#f58f7c', '#ffd596'], nuvemLuz: '#ffd9b4', nuvemSombra: '#84609f', nuvemBase: '#f29a86',
      longe: ['#8d6fa8', '#6f5a94', '#4f4a80'], capim: ['#c9b257', '#7f9a4a', '#3d6a45'], flor: ['#fff4d8', '#ffd36e', '#ffa48f'],
      mar: ['#ffd9a0', '#d98a8c', '#4a5f9c'], areia: ['#f0c79a', '#b98a78'], luz: '#fff0c0', sol: { x: 560, y: 572, r: 64 }, ambiente: ['#ff8a4a', 0.20], poste: '#3a3050',
    },
  };

  // nuvem cúmulo: muitas bolas juntas, borda firme, luz em cima e sombra embaixo
  function nuvem(g, k, r, pal, cx, base, larg, alt, n) {
    const bolas = [];
    for (let i = 0; i < n; i++) {
      const u = (r() + r() + r()) / 1.5 - 1;
      const cupula = Math.pow(Math.max(0, 1 - u * u), 0.8);
      const torre = cupula * (0.5 + 0.5 * Math.exp(-Math.pow((u - 0.12) / 0.38, 2)));
      bolas.push({ x: cx + u * larg / 2, y: base - r() * alt * torre, raio: larg * (0.045 + 0.07 * r()) * (0.55 + 0.6 * cupula) });
    }
    bolas.sort((a, b) => a.y - b.y);
    const x0 = cx - larg * 0.7, y0 = base - alt - larg * 0.2, w = larg * 1.4, h = alt + larg * 0.3;
    const tmp = document.createElement('canvas'); tmp.width = Math.ceil(w * k); tmp.height = Math.ceil(h * k);
    const c = tmp.getContext('2d'); c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    c.fillStyle = pal.nuvemLuz;
    for (const b of bolas) { c.beginPath(); c.arc(b.x, b.y, b.raio, 0, 6.2832); c.fill(); }
    c.globalCompositeOperation = 'destination-out'; c.fillRect(x0, base + larg * 0.012, w, h); // base reta
    c.globalCompositeOperation = 'source-atop';
    for (const b of bolas) { // cada bola: clara em cima à esquerda, sombra embaixo à direita
      const gr = c.createRadialGradient(b.x - b.raio * 0.35, b.y - b.raio * 0.4, b.raio * 0.1, b.x, b.y, b.raio * 1.15);
      gr.addColorStop(0, pal.nuvemLuz); gr.addColorStop(0.55, pal.nuvemLuz); gr.addColorStop(1, cor(pal.nuvemLuz, pal.nuvemSombra, 0.75));
      c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, b.raio, 0, 6.2832); c.fill();
    }
    const gb = c.createLinearGradient(0, base - alt * 0.5, 0, base + 10);
    gb.addColorStop(0, cor(pal.nuvemBase, pal.nuvemBase, 0, 0)); gb.addColorStop(1, cor(pal.nuvemBase, pal.nuvemSombra, 0.35, 0.85));
    c.fillStyle = gb; c.fillRect(x0, y0, w, h);
    g.drawImage(tmp, 0, 0, tmp.width, tmp.height, x0, y0, w, h);
  }

  function serra(g, r, x0, x1, base, amp, corCima, corBaixo, fundoY) {
    const f1 = 0.002 + r() * 0.002, f2 = 0.006 + r() * 0.005, p1 = r() * 6.28, p2 = r() * 6.28;
    const y = (x) => base - amp * (0.6 * Math.sin(x * f1 + p1) + 0.3 * Math.sin(x * f2 + p2) + 0.5);
    const gr = g.createLinearGradient(0, base - amp * 1.4, 0, fundoY); gr.addColorStop(0, corCima); gr.addColorStop(1, corBaixo);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0, fundoY);
    for (let x = x0; x <= x1; x += 12) g.lineTo(x, y(x));
    g.lineTo(x1, fundoY); g.closePath(); g.fill();
    return y;
  }

  window.pintarFundo = function ({ local, hora, semente, largura, altura }) {
    const pal = HORAS[hora] || HORAS.dia;
    const L = 1920, A = 1080, k = largura / L, mx = L * MARGEM, my = A * MARGEM;
    const tela = document.createElement('canvas'); tela.width = Math.round((L + 2 * mx) * k); tela.height = Math.round((A + 2 * my) * k);
    const g = tela.getContext('2d'); g.setTransform(k, 0, 0, k, mx * k, my * k); // (0,0) = canto da tela
    const r = sorteio(semente);
    const X0 = -mx, X1 = L + mx, Y0 = -my, Y1 = A + my;
    const horizonte = local === 'praia' ? 612 : 700;

    // ----- céu -----
    const gc = g.createLinearGradient(0, Y0, 0, horizonte);
    pal.ceu.forEach((cc, i) => gc.addColorStop([0, 0.42, 0.8, 1][i], cc));
    g.fillStyle = gc; g.fillRect(X0, Y0, X1 - X0, horizonte - Y0 + 4);
    for (let i = 0; i < 2600; i++) { // pinceladas largas e quase invisíveis: tiram o ar de "degradê de computador"
      const y = Y0 + r() * (horizonte - Y0), x = X0 + r() * (X1 - X0), w = 90 + r() * 260;
      g.strokeStyle = r() < 0.6 ? 'rgba(255,255,255,0.016)' : cor(pal.ceu[0], pal.ceu[1], 0.5, 0.016); g.lineWidth = 14 + r() * 30; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + (r() - 0.5) * 14); g.stroke();
    }
    if (pal.sol) { // sol baixo e o clarão em volta
      const s = pal.sol;
      for (const [raio, a] of [[620, 0.30], [330, 0.38], [150, 0.6]]) {
        const gs = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, raio); gs.addColorStop(0, cor(pal.luz, pal.luz, 0, a)); gs.addColorStop(1, cor(pal.luz, pal.luz, 0, 0));
        g.fillStyle = gs; g.fillRect(X0, Y0, X1 - X0, horizonte - Y0);
      }
      g.fillStyle = '#fffbe9'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.2832); g.fill();
    } else { // dia: o sol está fora do quadro, em cima à esquerda
      const gs = g.createRadialGradient(-60, -80, 0, -60, -80, 900); gs.addColorStop(0, 'rgba(255,255,240,0.55)'); gs.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = gs; g.fillRect(X0, Y0, X1 - X0, horizonte - Y0);
    }

    // ----- nuvens -----
    const NUVENS = local === 'praia'
      ? [[1320, 470, 760, 300, 90], [330, 380, 420, 150, 46], [1830, 560, 380, 130, 40], [880, 575, 300, 70, 26], [140, 585, 260, 60, 22], [1520, 590, 240, 46, 18]]
      : [[640, 610, 900, 470, 120], [1660, 520, 520, 210, 60], [1180, 640, 360, 110, 34], [150, 650, 300, 90, 28], [1890, 660, 280, 70, 22]];
    for (const [cx, base, larg, alt, n] of NUVENS) nuvem(g, k, r, pal, cx, base, larg, alt, n);

    let chaoY, brilhos = [], marY = null, banco = null;

    if (local === 'praia') {
      // ----- mar -----
      const margemMar = (x) => 772 + 0.05 * (1100 - x) + 10 * Math.sin(x * 0.006); // onde a água encontra a areia
      marY = margemMar;
      const gm = g.createLinearGradient(0, horizonte, 0, 860); gm.addColorStop(0, pal.mar[0]); gm.addColorStop(0.35, pal.mar[1]); gm.addColorStop(1, pal.mar[2]);
      g.fillStyle = gm; g.fillRect(X0, horizonte, X1 - X0, 300);
      // pontal ao longe com farol
      g.fillStyle = cor(pal.longe[1], pal.mar[1], 0.25); g.beginPath(); g.moveTo(X1, horizonte + 2); g.lineTo(1380, horizonte + 2); g.quadraticCurveTo(1520, horizonte - 26, 1650, horizonte - 34); g.quadraticCurveTo(1800, horizonte - 60, X1, horizonte - 78); g.closePath(); g.fill();
      g.fillStyle = cor(pal.nuvemLuz, pal.longe[1], 0.2); g.fillRect(1702, horizonte - 96, 12, 50); g.fillStyle = pal.longe[2]; g.fillRect(1698, horizonte - 104, 20, 10);
      g.fillStyle = pal.luz; g.beginPath(); g.arc(1708, horizonte - 100, 5, 0, 6.2832); g.fill();
      for (let i = 0; i < 1500; i++) { // ondinhas: riscos deitados, maiores perto de quem olha
        const y = horizonte + 3 + Math.pow(r(), 1.6) * 240, prof = (y - horizonte) / 240, x = X0 + r() * (X1 - X0), w = 14 + prof * 110 * r();
        g.strokeStyle = r() < 0.55 ? cor(pal.mar[0], '#ffffff', 0.4, 0.10 + 0.22 * r()) : cor(pal.mar[2], '#102050', 0.4, 0.10 + 0.18 * r());
        g.lineWidth = 1 + prof * 3.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
      }
      if (pal.sol) { // reflexo do sol: uma coluna de riscos claros
        for (let i = 0; i < 420; i++) {
          const prof = Math.pow(r(), 1.3), y = horizonte + 4 + prof * 200, larg = 40 + prof * 240, x = pal.sol.x + (r() - 0.5) * larg, w = 10 + prof * 70 * r();
          g.strokeStyle = cor(pal.luz, '#ffffff', 0.5, 0.25 + 0.5 * r()); g.lineWidth = 1.5 + prof * 3.5; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.stroke();
          if (i % 3 === 0) brilhos.push({ x, y, w, fase: r() * 6.28, v: 1.5 + r() * 3 });
        }
      }
      // ----- areia -----
      chaoY = (x) => 902 + 14 * Math.sin(x * 0.0021 + 0.6);
      const ga = g.createLinearGradient(0, 740, 0, Y1); ga.addColorStop(0, cor(pal.areia[1], pal.mar[2], 0.35)); ga.addColorStop(0.22, pal.areia[1]); ga.addColorStop(1, pal.areia[0]);
      g.fillStyle = ga; g.beginPath(); g.moveTo(X0, Y1);
      for (let x = X0; x <= X1; x += 16) g.lineTo(x, margemMar(x));
      g.lineTo(X1, Y1); g.closePath(); g.fill();
      const gw = g.createLinearGradient(0, 770, 0, 880); gw.addColorStop(0, cor(pal.areia[1], pal.mar[2], 0.5, 0.55)); gw.addColorStop(1, cor(pal.areia[1], pal.mar[2], 0.5, 0)); // areia molhada
      g.fillStyle = gw; g.beginPath(); g.moveTo(X0, 900); for (let x = X0; x <= X1; x += 16) g.lineTo(x, margemMar(x)); g.lineTo(X1, 900); g.closePath(); g.fill();
      for (let i = 0; i < 9000; i++) { // grãos e manchas da areia
        const x = X0 + r() * (X1 - X0), y = margemMar(x) + 16 + r() * (Y1 - margemMar(x)), prof = (y - 760) / 380;
        g.fillStyle = r() < 0.5 ? cor(pal.areia[0], '#ffffff', 0.5, 0.20) : cor(pal.areia[1], '#402030', 0.5, 0.16);
        g.fillRect(x, y, 2 + prof * 5 * r(), 1.2 + prof * 2 * r());
      }
      for (let i = 0; i < 14; i++) { // ondulações da areia (sombras compridas)
        const x = X0 + r() * (X1 - X0), y = 900 + r() * 220, w = 200 + r() * 420;
        g.strokeStyle = cor(pal.areia[1], '#5a3050', 0.4, 0.16); g.lineWidth = 6 + r() * 8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 14 - r() * 12, x + w, y + 4); g.stroke();
      }
      for (let i = 0; i < 12; i++) { // pegadas até onde a personagem está
        const u = i / 11, x = 2010 - u * 650 + (i % 2 ? 16 : -16) * 0.5, y = 1010 - u * 78 + (i % 2 ? 12 : -8);
        g.fillStyle = cor(pal.areia[1], '#402040', 0.45, 0.42); g.beginPath(); g.ellipse(x, y, 17 - u * 4, 7 - u * 1.5, -0.12, 0, 6.2832); g.fill();
      }
      for (let i = 0; i < 16; i++) { // conchas e pedrinhas
        const x = X0 + r() * (X1 - X0), y = 930 + r() * 190; g.fillStyle = cor(pal.areia[0], '#ffffff', 0.6, 0.85);
        g.beginPath(); g.ellipse(x, y, 4 + r() * 4, 2.5 + r() * 2, r() * 3, 0, 6.2832); g.fill();
        g.fillStyle = cor(pal.areia[1], '#402040', 0.5, 0.3); g.beginPath(); g.ellipse(x + 3, y + 3, 5, 2, 0, 0, 6.2832); g.fill();
      }
    } else if (local === 'parque') {
      // ----- parque: árvores ao longe, gramado, caminho, poste, sebe e o banco onde ela senta -----
      const rp = sorteio(semente + 300); // sorteio só do parque
      chaoY = (x) => 978 + 5 * Math.sin(x * 0.003);
      for (let i = 0; i < 110; i++) { // fileira de copas ao longe, azuladas pelo ar
        const x = X0 + i * (X1 - X0) / 110 + rp() * 20, raio = 20 + rp() * 30;
        g.fillStyle = cor(pal.longe[2], pal.ceu[3], 0.3 + 0.2 * rp()); g.beginPath(); g.arc(x, horizonte - raio * 0.5, raio, 0, 6.2832); g.fill();
      }
      const gh = g.createLinearGradient(0, horizonte, 0, Y1); gh.addColorStop(0, cor(pal.capim[1], pal.longe[2], 0.4)); gh.addColorStop(0.35, pal.capim[0]); gh.addColorStop(1, pal.capim[1]);
      g.fillStyle = gh; g.fillRect(X0, horizonte, X1 - X0, Y1 - horizonte);
      // caminho de terra batida: vem do canto de baixo à esquerda e some lá no fundo
      const bordaE = (y) => { const u = (y - horizonte) / (Y1 - horizonte); return 880 - u * u * 900 - u * 120; };
      const bordaD = (y) => { const u = (y - horizonte) / (Y1 - horizonte); return 905 - u * u * 380 - u * 40; };
      g.fillStyle = cor('#e8d6ad', pal.longe[2], 0.1); g.beginPath(); g.moveTo(bordaE(horizonte), horizonte);
      for (let y = horizonte; y <= Y1; y += 8) g.lineTo(bordaE(y), y);
      for (let y = Y1; y >= horizonte; y -= 8) g.lineTo(bordaD(y), y);
      g.closePath(); g.fill();
      for (let i = 0; i < 2600; i++) { // pedrisco do caminho
        const y = horizonte + Math.pow(rp(), 0.7) * (Y1 - horizonte), a = bordaE(y), b = bordaD(y), x = a + rp() * (b - a), prof = (y - horizonte) / (Y1 - horizonte);
        g.fillStyle = rp() < 0.5 ? 'rgba(255,255,240,0.35)' : 'rgba(120,90,60,0.25)'; g.fillRect(x, y, 1 + prof * 4 * rp(), 1 + prof * 2 * rp());
      }
      const arvore = (x, base, alt, larg, escura) => { // tronco + copa de bolas com luz em cima à esquerda
        g.fillStyle = 'rgba(20,50,30,0.25)'; g.beginPath(); g.ellipse(x + larg * 0.15, base + 4, larg * 0.55, larg * 0.09, 0, 0, 6.2832); g.fill();
        g.fillStyle = cor('#6b4a3a', pal.longe[2], escura ? 0.1 : 0.35); g.beginPath(); g.moveTo(x - larg * 0.07, base); g.lineTo(x - larg * 0.04, base - alt * 0.55); g.lineTo(x + larg * 0.04, base - alt * 0.55); g.lineTo(x + larg * 0.07, base); g.closePath(); g.fill();
        const cy = base - alt * 0.68;
        for (let i = 0; i < 16; i++) {
          const a = rp() * 6.28, d = rp() * larg * 0.3, bx = x + Math.cos(a) * d, by = cy + Math.sin(a) * d * 0.7, rr = larg * (0.16 + 0.12 * rp());
          g.fillStyle = cor(pal.capim[2], escura ? '#0e2a1c' : pal.longe[2], escura ? 0.35 : 0.45); g.beginPath(); g.arc(bx, by, rr, 0, 6.2832); g.fill();
          g.fillStyle = cor(pal.capim[1], escura ? '#244a2a' : pal.longe[2], 0.35, 0.85); g.beginPath(); g.arc(bx - rr * 0.25, by - rr * 0.3, rr * 0.62, 0, 6.2832); g.fill();
        }
      };
      for (const [x, base, alt, larg] of [[130, 742, 250, 210], [470, 732, 200, 170], [1060, 726, 170, 140], [1240, 736, 230, 190], [1530, 744, 270, 220]]) arvore(x, base, alt, larg, false);
      // sebe baixa atrás do banco: dá fundo escuro para a madeira e para a Lia
      for (let i = 0; i < 120; i++) {
        const x = 900 + rp() * 860, y = 800 + rp() * 26, rr = 22 + rp() * 20;
        g.fillStyle = cor(pal.capim[2], '#123a2a', 0.3 + 0.3 * rp()); g.beginPath(); g.arc(x, y, rr, 0, 6.2832); g.fill();
        if (rp() < 0.4) { g.fillStyle = cor(pal.capim[1], pal.capim[2], 0.3, 0.8); g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.35, rr * 0.5, 0, 6.2832); g.fill(); }
      }
      g.fillStyle = cor(pal.capim[1], pal.capim[2], 0.5); g.fillRect(880, 822, 900, 22);
      // capim do gramado (fora do caminho)
      g.lineCap = 'round';
      for (let i = 0; i < 16000; i++) {
        const y = horizonte + 4 + Math.pow(rp(), 0.8) * (Y1 - horizonte), x = X0 + rp() * (X1 - X0);
        if (x > bordaE(y) - 4 && x < bordaD(y) + 4) continue;
        const prof = (y - horizonte) / (Y1 - horizonte), len = 5 + prof * 22 * (0.5 + rp()), tom = rp();
        g.strokeStyle = cor(tom < 0.5 ? pal.capim[0] : pal.capim[1], tom < 0.2 ? '#f6ffb0' : pal.capim[2], rp() * 0.8, 0.45 + 0.4 * rp());
        g.lineWidth = 1.2 + prof * 2.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - len * 0.1, y - len * 0.6, x - len * (0.2 + 0.3 * rp()), y - len); g.stroke();
      }
      for (let i = 0; i < 220; i++) { // flores no gramado
        const y = 850 + Math.pow(rp(), 0.7) * 280, x = X0 + rp() * (X1 - X0); if (x > bordaE(y) - 10 && x < bordaD(y) + 10) continue;
        const raio = 2 + (y - 840) / 300 * 5;
        g.fillStyle = pal.flor[Math.floor(rp() * pal.flor.length)]; g.beginPath(); g.arc(x, y, raio, 0, 6.2832); g.fill();
        g.fillStyle = 'rgba(255,190,60,0.9)'; g.beginPath(); g.arc(x, y, raio * 0.4, 0, 6.2832); g.fill();
      }
      // poste de praça ao lado do caminho
      { const x = 930, base = 905, h = 300;
        g.fillStyle = '#2f3a3a'; g.fillRect(x - 5, base - h, 10, h); g.fillRect(x - 14, base - 16, 28, 16);
        g.beginPath(); g.moveTo(x - 20, base - h); g.lineTo(x + 20, base - h); g.lineTo(x + 13, base - h - 44); g.lineTo(x - 13, base - h - 44); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,248,215,0.95)'; g.fillRect(x - 11, base - h - 38, 22, 32);
        g.fillStyle = '#2f3a3a'; g.beginPath(); g.moveTo(x - 18, base - h - 44); g.lineTo(x, base - h - 58); g.lineTo(x + 18, base - h - 44); g.closePath(); g.fill(); }
      // árvore grande na frente, à direita: tronco escuro e copa que sai do quadro
      { const x = 1835;
        g.fillStyle = 'rgba(20,50,30,0.30)'; g.beginPath(); g.ellipse(x - 60, 1050, 260, 40, 0, 0, 6.2832); g.fill();
        g.fillStyle = '#4e3528'; g.beginPath(); g.moveTo(x - 62, Y1); g.quadraticCurveTo(x - 30, 700, x - 40, 260); g.lineTo(x + 40, 240); g.quadraticCurveTo(x + 40, 700, x + 78, Y1); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,230,190,0.18)'; g.beginPath(); g.moveTo(x - 50, Y1); g.quadraticCurveTo(x - 22, 700, x - 34, 260); g.lineTo(x - 14, 256); g.quadraticCurveTo(x - 4, 700, x - 22, Y1); g.closePath(); g.fill();
        for (let i = 0; i < 26; i++) {
          const bx = 1560 + rp() * 460, by = Y0 + rp() * 330, rr = 90 + rp() * 90;
          g.fillStyle = cor(pal.capim[2], '#0e2a1c', 0.3 + 0.2 * rp()); g.beginPath(); g.arc(bx, by, rr, 0, 6.2832); g.fill();
          g.fillStyle = cor(pal.capim[1], pal.capim[2], 0.45, 0.75); g.beginPath(); g.arc(bx - rr * 0.3, by - rr * 0.3, rr * 0.55, 0, 6.2832); g.fill();
        }
        for (let i = 0; i < 9; i++) { // luz passando pelas folhas, no chão
          const lx = 1350 + rp() * 560, ly = 1000 + rp() * 120, rr = 30 + rp() * 50;
          const gm = g.createRadialGradient(lx, ly, 0, lx, ly, rr); gm.addColorStop(0, 'rgba(255,255,170,0.22)'); gm.addColorStop(1, 'rgba(0,0,0,0)');
          g.save(); g.scale(1, 0.4); g.fillStyle = gm; g.fillRect(lx - rr, ly / 0.4 - rr, rr * 2, rr * 2); g.restore();
        } }
      // o banco: encosto e assento de ripas de madeira, pés de ferro. A personagem senta no meio (x = 1300).
      { const x0 = 970, x1 = 1630, chao = chaoY(1300), assento = chao + 12 - 173, ferro = '#2f3a3a';
        const mad = '#c07d43', madLuz = '#dfa261', madSombra = '#8a5230';
        g.fillStyle = 'rgba(20,50,30,0.32)'; g.beginPath(); g.ellipse(1300, chao + 14, 380, 26, 0, 0, 6.2832); g.fill();
        for (const px of [x0 + 40, x1 - 40]) { g.fillStyle = ferro; g.fillRect(px - 7, assento - 168, 14, 168); g.fillRect(px - 8, assento, 16, chao - assento + 8); g.fillRect(px + 20, assento + 10, 12, chao - assento - 8); } // pés e postes do encosto
        for (const [ya, yb] of [[-160, -130], [-118, -88], [-76, -48]]) { // ripas do encosto
          g.fillStyle = mad; g.fillRect(x0, assento + ya, x1 - x0, yb - ya);
          g.fillStyle = madLuz; g.fillRect(x0, assento + ya, x1 - x0, 5); g.fillStyle = madSombra; g.fillRect(x0, assento + yb - 4, x1 - x0, 4);
        }
        g.fillStyle = madLuz; g.beginPath(); g.moveTo(x0 + 6, assento - 14); g.lineTo(x1 - 6, assento - 14); g.lineTo(x1 + 10, assento + 6); g.lineTo(x0 - 10, assento + 6); g.closePath(); g.fill(); // assento visto de cima
        g.strokeStyle = madSombra; g.lineWidth = 2; for (const f of [0.33, 0.66]) { g.beginPath(); g.moveTo(x0 + 6 - f * 16, assento - 14 + f * 20); g.lineTo(x1 - 6 + f * 16, assento - 14 + f * 20); g.stroke(); }
        g.fillStyle = mad; g.fillRect(x0 - 10, assento + 6, x1 - x0 + 20, 18); g.fillStyle = madSombra; g.fillRect(x0 - 10, assento + 20, x1 - x0 + 20, 4); // frente do assento
        g.strokeStyle = 'rgba(90,50,20,0.25)'; g.lineWidth = 1.4; // veio da madeira
        for (let i = 0; i < 60; i++) { const y = assento - 160 + rp() * 112, x = x0 + rp() * (x1 - x0 - 80); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + rp() * 60, y + (rp() - 0.5) * 2); g.stroke(); }
        banco = { x: 1300, y: assento };
      }
    } else {
      // ----- colina: serras ao longe, depois o morro de capim -----
      g.fillStyle = cor(pal.mar[1], pal.ceu[3], 0.45); g.fillRect(X0, horizonte - 6, X1 - X0, 60); // faixa de mar distante
      serra(g, r, X0, X1, 690, 46, cor(pal.longe[0], pal.ceu[3], 0.35), cor(pal.longe[0], pal.ceu[3], 0.6), 800);
      serra(g, r, X0, X1, 735, 40, pal.longe[1], cor(pal.longe[1], pal.ceu[3], 0.45), 860);
      const yMeio = serra(g, r, X0, X1, 792, 36, pal.longe[2], cor(pal.capim[2], pal.longe[2], 0.4), 960);
      for (let i = 0; i < 170; i++) { // bosques no morro do meio: bolinhas escuras com luz em cima
        const x = X0 + r() * (X1 - X0), y = yMeio(x) + 2 + Math.pow(r(), 1.5) * 90, raio = 9 + r() * 15;
        for (const [dx, dy, rr] of [[-raio * 0.7, 3, raio * 0.8], [raio * 0.7, 4, raio * 0.75], [0, -3, raio]]) {
          g.fillStyle = cor(pal.capim[2], pal.longe[2], 0.45); g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 6.2832); g.fill();
          g.fillStyle = cor(pal.capim[1], pal.longe[2], 0.4, 0.8); g.beginPath(); g.arc(x + dx - rr * 0.25, y + dy - rr * 0.3, rr * 0.6, 0, 6.2832); g.fill();
        }
      }
      for (let i = 0; i < 38; i++) { // casinhas da vila ao longe
        const x = 250 + r() * 520, y = yMeio(x) + 6 + r() * 26, w = 9 + r() * 10;
        g.fillStyle = cor('#f4f1e6', pal.longe[1], 0.25); g.fillRect(x, y, w, 7 + r() * 5);
        g.fillStyle = cor('#c8553f', pal.longe[1], 0.35); g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + w / 2, y - 6); g.lineTo(x + w + 2, y); g.closePath(); g.fill();
      }
      chaoY = (x) => 930 - 76 * Math.exp(-Math.pow((x - 1210) / 640, 2)) + 22 * Math.sin(x * 0.0021 + 1);
      const gh = g.createLinearGradient(0, 820, 0, Y1); gh.addColorStop(0, pal.capim[0]); gh.addColorStop(0.45, pal.capim[1]); gh.addColorStop(1, pal.capim[2]);
      g.fillStyle = gh; g.beginPath(); g.moveTo(X0, Y1);
      for (let x = X0; x <= X1; x += 14) g.lineTo(x, chaoY(x));
      g.lineTo(X1, Y1); g.closePath(); g.fill();
      // postes de luz descendo o morro (com fios)
      const POSTES = [[430, 330], [215, 250], [60, 190], [-70, 150]];
      g.strokeStyle = pal.poste; g.lineCap = 'butt';
      POSTES.forEach(([x, h], i) => {
        const y = chaoY(x) + 6 + i * 4;
        g.lineWidth = 9 - i * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke();
        g.lineWidth = 6 - i; g.beginPath(); g.moveTo(x - h * 0.13, y - h * 0.9); g.lineTo(x + h * 0.13, y - h * 0.9); g.moveTo(x - h * 0.09, y - h * 0.8); g.lineTo(x + h * 0.09, y - h * 0.8); g.stroke();
      });
      g.lineWidth = 1.6;
      for (let i = 0; i < POSTES.length - 1; i++) for (const lado of [-1, 1]) {
        const [xa, ha] = POSTES[i], [xb, hb] = POSTES[i + 1], ya = chaoY(xa) + 6 + i * 4 - ha * 0.9, yb = chaoY(xb) + 10 + i * 4 - hb * 0.9;
        g.beginPath(); g.moveTo(xa + lado * ha * 0.12, ya); g.quadraticCurveTo((xa + xb) / 2, Math.max(ya, yb) + 46, xb + lado * hb * 0.12, yb); g.stroke();
      }
      // capim: milhares de pinceladas curtas, maiores e mais escuras perto de quem olha
      g.lineCap = 'round';
      for (let i = 0; i < 26000; i++) {
        const x = X0 + r() * (X1 - X0), topo = chaoY(x), y = topo + Math.pow(r(), 0.8) * (Y1 - topo), prof = (y - 840) / 300;
        const len = 9 + prof * 30 * (0.5 + r()), tom = r();
        g.strokeStyle = cor(tom < 0.5 ? pal.capim[0] : pal.capim[1], tom < 0.25 ? '#f6ffb0' : pal.capim[2], r() * 0.8, 0.5 + 0.4 * r());
        g.lineWidth = 1.4 + prof * 2.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - len * 0.1, y - len * 0.6, x - len * (0.25 + 0.4 * r()), y - len); g.stroke();
      }
      for (let i = 0; i < 520; i++) { // beirada do morro: tufinhos, para a linha não ficar reta
        const x = X0 + r() * (X1 - X0), y = chaoY(x) + 3, len = 8 + r() * 14;
        g.strokeStyle = cor(pal.capim[0], pal.capim[1], r(), 0.95); g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * 0.4, y - len); g.stroke();
      }
      for (let i = 0; i < 12; i++) { // manchas de sol e de sombra de nuvem
        const x = X0 + r() * (X1 - X0), y = 880 + r() * 220, raio = 160 + r() * 260, clara = i % 2 === 0;
        const gm = g.createRadialGradient(x, y, 0, x, y, raio); gm.addColorStop(0, clara ? 'rgba(255,255,170,0.20)' : 'rgba(10,50,60,0.20)'); gm.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.scale(1, 0.45); g.fillStyle = gm; g.fillRect(x - raio, y / 0.45 - raio, raio * 2, raio * 2); g.restore();
      }
      for (let i = 0; i < 300; i++) { // flores
        const x = X0 + r() * (X1 - X0), y = chaoY(x) + 20 + Math.pow(r(), 0.7) * 250, prof = (y - 840) / 300, raio = 2 + prof * 5;
        g.fillStyle = pal.flor[Math.floor(r() * pal.flor.length)]; g.beginPath(); g.arc(x, y, raio, 0, 6.2832); g.fill();
        g.fillStyle = 'rgba(255,190,60,0.9)'; g.beginPath(); g.arc(x, y, raio * 0.4, 0, 6.2832); g.fill();
      }
    }

    // ----- ar: névoa clara na linha do horizonte e a cor da hora por cima de tudo -----
    const gn = g.createLinearGradient(0, horizonte - 130, 0, horizonte + 90);
    gn.addColorStop(0, cor(pal.ceu[3], pal.ceu[3], 0, 0)); gn.addColorStop(0.6, cor(pal.ceu[3], pal.luz, 0.4, 0.34)); gn.addColorStop(1, cor(pal.ceu[3], pal.ceu[3], 0, 0));
    g.fillStyle = gn; g.fillRect(X0, horizonte - 130, X1 - X0, 220);
    g.fillStyle = cor(pal.ambiente[0], pal.ambiente[0], 0, pal.ambiente[1] * 0.6); g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);

    // ----- grão do papel: o quadro inteiro ganha a textura de tinta sobre papel -----
    {
      const gr = document.createElement('canvas'); gr.width = tela.width; gr.height = tela.height;
      const gc2 = gr.getContext('2d'), im = gc2.createImageData(gr.width, gr.height), d = im.data, rg = sorteio(semente + 77);
      for (let i = 0; i < d.length; i += 4) { const v = 128 + (rg() - 0.5) * 64; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      gc2.putImageData(im, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.2; g.drawImage(gr, 0, 0); g.restore();
    }

    return { tela, margemX: mx, margemY: my, chaoY, horizonte, pal, brilhos, marY, banco };
  };
})();
