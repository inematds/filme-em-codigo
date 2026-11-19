// figuras.js — as pessoas e coisas pintadas do retro-futuro: o homem da multidão (busto de cartaz),
// Gêngis Khan (gorro de pele com copa pontuda, deel de gola cruzada com pele, bigode fino e longo),
// o medalhão da árvore, o foguete e o disco voador do céu.
// Tudo é conta: a mesma semente dá sempre o mesmo homem. Nada aqui sabe da história.
(function () {
  'use strict';
  const { sorteio, hex } = Filme;
  const SILHUETA = '#123f46';
  const PELES = ['#f2c9a0', '#e0ad7e', '#c98a5a', '#9a6040', '#6e432b'];
  const ROUPAS = ['#1f6f73', '#0e3b43', '#ff8a1f', '#f5e6c8', '#8a4a2a', '#e84830', '#4fa3a0', '#c9b48a'];
  const CABELOS = ['#2a1a12', '#5a3a22', '#c8a060', '#151010', '#8a8070'];

  const lin = (g, x0, y0, x1, y1, paradas) => { const gr = g.createLinearGradient(x0, y0, x1, y1); paradas.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };

  // homem da multidão: busto. (x, y) = centro do busto, tam = altura (topo da cabeça até a base dos ombros).
  // o = { sem, apaga (0 a 1: vira silhueta) }
  function homem(g, x, y, tam, o = {}) {
    const r = sorteio(o.sem || 1), u = tam / 100, ap = o.apaga || 0;
    const tinge = (cr) => hex(cr, SILHUETA, ap);
    const pele = PELES[Math.floor(r() * PELES.length)], roupa = ROUPAS[Math.floor(r() * ROUPAS.length)];
    const cabelo = CABELOS[Math.floor(r() * CABELOS.length)], chapeu = r(), hy = y - 20 * u;
    // ombros
    g.fillStyle = tinge(roupa);
    g.beginPath(); g.moveTo(x - 48 * u, y + 50 * u); g.quadraticCurveTo(x - 47 * u, y + 12 * u, x - 18 * u, y + 6 * u); g.lineTo(x + 18 * u, y + 6 * u);
    g.quadraticCurveTo(x + 47 * u, y + 12 * u, x + 48 * u, y + 50 * u); g.closePath(); g.fill();
    g.fillStyle = tinge('#fff3dc'); g.beginPath(); g.moveTo(x - 11 * u, y + 6 * u); g.lineTo(x, y + 26 * u); g.lineTo(x + 11 * u, y + 6 * u); g.closePath(); g.fill(); // gola
    // pescoço e cabeça
    g.fillStyle = tinge(pele); g.fillRect(x - 7 * u, hy + 12 * u, 14 * u, 16 * u);
    g.beginPath(); g.ellipse(x, hy, 16 * u, 20 * u, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(60,25,10,' + (0.22 * (1 - ap)) + ')'; g.beginPath(); g.ellipse(x + 7 * u, hy + 2 * u, 9 * u, 18 * u, 0, 0, 7); g.fill(); // sombra do lado
    if (ap < 0.9) { g.fillStyle = 'rgba(20,10,5,' + (1 - ap) + ')'; g.fillRect(x - 8 * u, hy - 1 * u, 4 * u, 3 * u); g.fillRect(x + 4 * u, hy - 1 * u, 4 * u, 3 * u); }
    // cabelo ou chapéu
    if (chapeu < 0.3) { // chapéu de aba
      g.fillStyle = tinge(r() < 0.5 ? '#0e3b43' : '#c9b48a');
      g.beginPath(); g.ellipse(x, hy - 12 * u, 26 * u, 6 * u, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - 15 * u, hy - 12 * u); g.quadraticCurveTo(x - 15 * u, hy - 32 * u, x, hy - 30 * u); g.quadraticCurveTo(x + 15 * u, hy - 32 * u, x + 15 * u, hy - 12 * u); g.closePath(); g.fill();
      g.fillStyle = tinge('#ff8a1f'); g.fillRect(x - 15 * u, hy - 17 * u, 30 * u, 4 * u);
    } else if (chapeu < 0.42) { // boné
      g.fillStyle = tinge('#e84830');
      g.beginPath(); g.ellipse(x, hy - 12 * u, 17 * u, 12 * u, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.ellipse(x - 12 * u, hy - 11 * u, 13 * u, 4 * u, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = tinge(cabelo);
      g.beginPath(); g.ellipse(x, hy - 9 * u, 17 * u, 13 * u, 0, Math.PI * 0.95, Math.PI * 2.05); g.fill();
    }
    // luz de aerógrafo no ombro esquerdo
    g.fillStyle = 'rgba(255,243,220,' + (0.18 * (1 - ap)) + ')'; g.beginPath(); g.ellipse(x - 28 * u, y + 20 * u, 14 * u, 8 * u, -0.4, 0, 7); g.fill();
  }

  // Gêngis Khan em busto. (x, y) = centro; tam = altura (ponta do gorro até a base dos ombros).
  // o = { contorno (0 a 1: some o recheio e fica a borda), corBorda }
  function khan(g, x, y, tam, o = {}) {
    const u = tam / 100, cont = Math.max(0, Math.min(1, o.contorno || 0)), a0 = g.globalAlpha;
    const partes = [];
    const parte = (forma, preenche) => partes.push({ forma, preenche });
    // deel: ombros largos
    const deel = () => { g.beginPath(); g.moveTo(x - 49 * u, y + 50 * u); g.quadraticCurveTo(x - 48 * u, y + 22 * u, x - 22 * u, y + 13 * u); g.lineTo(x + 22 * u, y + 13 * u); g.quadraticCurveTo(x + 48 * u, y + 22 * u, x + 49 * u, y + 50 * u); g.closePath(); };
    parte(deel, () => { g.fillStyle = lin(g, x - 50 * u, 0, x + 50 * u, 0, [[0, '#4fa3a0'], [0.4, '#1f6f73'], [1, '#0e3b43']]); g.fill(); });
    // gola cruzada (a aba da frente desce do pescoço para a axila), com faixa de pele e fio laranja
    const aba = () => { g.beginPath(); g.moveTo(x + 9 * u, y + 13 * u); g.quadraticCurveTo(x - 4 * u, y + 34 * u, x - 30 * u, y + 50 * u); g.lineTo(x - 18 * u, y + 50 * u); g.quadraticCurveTo(x + 6 * u, y + 34 * u, x + 17 * u, y + 13 * u); g.closePath(); };
    parte(aba, () => { g.fillStyle = '#8a5a32'; g.fill(); g.strokeStyle = '#ffb347'; g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(x + 18 * u, y + 13 * u); g.quadraticCurveTo(x + 7 * u, y + 34 * u, x - 16 * u, y + 50 * u); g.stroke(); });
    const golaPele = () => { g.beginPath(); g.ellipse(x, y + 13 * u, 22 * u, 6 * u, 0, 0, 7); };
    parte(golaPele, () => { g.fillStyle = '#9a6a3c'; g.fill(); });
    // pescoço e rosto
    const rosto = () => { g.beginPath(); g.ellipse(x, y - 7 * u, 14 * u, 17.5 * u, 0, 0, 7); };
    parte(() => { g.beginPath(); g.rect(x - 7 * u, y + 2 * u, 14 * u, 10 * u); }, () => { g.fillStyle = '#b97a4c'; g.fill(); });
    parte(rosto, () => {
      const gr = g.createRadialGradient(x - 5 * u, y - 12 * u, 1 * u, x, y - 7 * u, 19 * u);
      gr.addColorStop(0, '#f0bf8c'); gr.addColorStop(0.7, '#c98a5a'); gr.addColorStop(1, '#8a5232'); g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,138,31,0.18)'; g.beginPath(); g.ellipse(x - 7 * u, y - 2 * u, 4 * u, 3 * u, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 7 * u, y - 2 * u, 4 * u, 3 * u, 0, 0, 7); g.fill();
      g.strokeStyle = '#2a1a12'; g.lineCap = 'round';
      g.lineWidth = 1.9 * u; // sobrancelhas
      g.beginPath(); g.moveTo(x - 10 * u, y - 14 * u); g.lineTo(x - 3 * u, y - 13 * u); g.moveTo(x + 10 * u, y - 14 * u); g.lineTo(x + 3 * u, y - 13 * u); g.stroke();
      g.lineWidth = 1.5 * u; // olhos estreitos
      g.beginPath(); g.moveTo(x - 9 * u, y - 9 * u); g.quadraticCurveTo(x - 6 * u, y - 10.5 * u, x - 3 * u, y - 9.5 * u); g.moveTo(x + 9 * u, y - 9 * u); g.quadraticCurveTo(x + 6 * u, y - 10.5 * u, x + 3 * u, y - 9.5 * u); g.stroke();
      g.lineWidth = 1 * u; g.strokeStyle = '#8a5232'; g.beginPath(); g.moveTo(x, y - 8 * u); g.lineTo(x - 1.5 * u, y - 1 * u); g.lineTo(x + 1.5 * u, y - 0.5 * u); g.stroke(); // nariz
      g.strokeStyle = '#2a1a12'; g.lineWidth = 1.4 * u; // bigode fino e longo, caindo dos lados da boca
      g.beginPath(); g.moveTo(x - 1 * u, y + 1.5 * u); g.quadraticCurveTo(x - 8 * u, y + 1 * u, x - 9 * u, y + 7 * u); g.quadraticCurveTo(x - 10 * u, y + 13 * u, x - 12 * u, y + 18 * u);
      g.moveTo(x + 1 * u, y + 1.5 * u); g.quadraticCurveTo(x + 8 * u, y + 1 * u, x + 9 * u, y + 7 * u); g.quadraticCurveTo(x + 10 * u, y + 13 * u, x + 12 * u, y + 18 * u); g.stroke();
      g.lineWidth = 1 * u; g.beginPath(); g.moveTo(x - 3 * u, y + 4.5 * u); g.lineTo(x + 3 * u, y + 4.5 * u); g.stroke(); // boca
      g.fillStyle = '#2a1a12'; g.beginPath(); g.moveTo(x - 3 * u, y + 7.5 * u); g.lineTo(x, y + 15 * u); g.lineTo(x + 3 * u, y + 7.5 * u); g.closePath(); g.fill(); // barbicha
    });
    // abas de pele que caem dos lados do gorro
    const abas = () => { g.beginPath(); g.ellipse(x - 16 * u, y - 10 * u, 5.5 * u, 13 * u, 0.12, 0, 7); g.moveTo(x + 21.5 * u, y - 10 * u); g.ellipse(x + 16 * u, y - 10 * u, 5.5 * u, 13 * u, -0.12, 0, 7); };
    parte(abas, () => { g.fillStyle = '#8a5a32'; g.fill(); });
    // copa pontuda (vermelho-laranja com costuras douradas) e borla no topo
    const copa = () => { g.beginPath(); g.moveTo(x - 17 * u, y - 26 * u); g.quadraticCurveTo(x - 15 * u, y - 44 * u, x, y - 50 * u); g.quadraticCurveTo(x + 15 * u, y - 44 * u, x + 17 * u, y - 26 * u); g.closePath(); };
    parte(copa, () => {
      g.fillStyle = lin(g, x - 17 * u, 0, x + 17 * u, 0, [[0, '#ff9b4a'], [0.45, '#d2552c'], [1, '#8a2e18']]); g.fill();
      g.strokeStyle = '#ffcf6a'; g.lineWidth = 1.2 * u;
      g.beginPath(); g.moveTo(x, y - 49 * u); g.lineTo(x, y - 27 * u); g.moveTo(x, y - 49 * u); g.quadraticCurveTo(x - 9 * u, y - 40 * u, x - 10 * u, y - 27 * u); g.moveTo(x, y - 49 * u); g.quadraticCurveTo(x + 9 * u, y - 40 * u, x + 10 * u, y - 27 * u); g.stroke();
      g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(x, y - 51 * u, 2.6 * u, 0, 7); g.fill();
    });
    // aba de pele do gorro, fofa (bolinhas na borda)
    const pele = () => { g.beginPath(); g.roundRect(x - 21 * u, y - 31 * u, 42 * u, 12 * u, 6 * u); };
    parte(pele, () => {
      g.fillStyle = lin(g, 0, y - 31 * u, 0, y - 19 * u, [[0, '#c8955a'], [1, '#7a4a2a']]); g.fill();
      g.fillStyle = '#c8955a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x - 19 * u + i * 4.75 * u, y - 31 * u, 2.6 * u, 0, 7); g.fill(); }
      g.fillStyle = '#6a3e22'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x - 19 * u + i * 4.75 * u, y - 19.5 * u, 2.2 * u, 0, 7); g.fill(); }
    });
    // recheio (some com o contorno) e borda
    if (cont < 1) { g.globalAlpha = a0 * (1 - cont); for (const p of partes) { g.save(); p.forma(); p.preenche(); g.restore(); } }
    if (cont > 0) {
      g.globalAlpha = a0 * cont; g.strokeStyle = o.corBorda || '#ff8a1f'; g.lineWidth = Math.max(3, 2.2 * u); g.lineJoin = 'round';
      for (const f of [deel, rosto, abas, copa, pele]) { f(); g.stroke(); }
    }
    g.globalAlpha = a0;
  }

  // medalhão de retrato (árvore): aro laranja, fundo creme, busto em silhueta
  function medalhao(g, x, y, r, sem) {
    const rr = sorteio(sem || 1);
    g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = lin(g, x - r, y - r, x + r, y + r, [[0, '#fff3dc'], [1, '#e0c89a']]); g.beginPath(); g.arc(x, y, r * 0.82, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r * 0.82, 0, 7); g.clip();
    g.fillStyle = ['#1f6f73', '#0e3b43', '#8a4a2a'][Math.floor(rr() * 3)];
    g.beginPath(); g.arc(x, y - r * 0.18, r * 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x, y + r * 0.62, r * 0.6, r * 0.42, 0, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = '#fff3dc'; g.lineWidth = Math.max(1.5, r * 0.06); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }

  // foguete de cromo com aletas laranja, apontando para "ang" (radianos), com rastro de fumaça
  function foguete(g, x, y, tam, ang, rastro) {
    const u = tam / 100;
    if (rastro > 0) {
      g.save(); g.translate(x, y); g.rotate(ang);
      const gr = g.createLinearGradient(-60 * u - rastro, 0, -50 * u, 0); gr.addColorStop(0, 'rgba(255,243,220,0)'); gr.addColorStop(1, 'rgba(255,243,220,0.75)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-50 * u, -7 * u); g.lineTo(-50 * u - rastro, -16 * u); g.lineTo(-50 * u - rastro, 16 * u); g.lineTo(-50 * u, 7 * u); g.closePath(); g.fill();
      g.restore();
    }
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = '#ff8a1f';
    g.beginPath(); g.moveTo(-30 * u, -8 * u); g.lineTo(-52 * u, -24 * u); g.lineTo(-48 * u, -6 * u); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-30 * u, 8 * u); g.lineTo(-52 * u, 24 * u); g.lineTo(-48 * u, 6 * u); g.closePath(); g.fill();
    g.fillStyle = lin(g, 0, -10 * u, 0, 10 * u, [[0, '#ffffff'], [0.4, '#c9dcd6'], [1, '#4f7a78']]);
    g.beginPath(); g.moveTo(50 * u, 0); g.quadraticCurveTo(20 * u, -12 * u, -45 * u, -8 * u); g.lineTo(-45 * u, 8 * u); g.quadraticCurveTo(20 * u, 12 * u, 50 * u, 0); g.closePath(); g.fill();
    g.fillStyle = '#e84830'; g.beginPath(); g.moveTo(50 * u, 0); g.quadraticCurveTo(38 * u, -6 * u, 30 * u, -6.5 * u); g.lineTo(30 * u, 6.5 * u); g.quadraticCurveTo(38 * u, 6 * u, 50 * u, 0); g.closePath(); g.fill();
    g.fillStyle = '#0e3b43'; g.beginPath(); g.arc(10 * u, 0, 3.5 * u, 0, 7); g.fill();
    g.restore();
  }
  // disco voador de cromo com cúpula e luzinhas
  function disco(g, x, y, tam) {
    const u = tam / 100;
    g.fillStyle = 'rgba(214,232,220,0.75)'; g.beginPath(); g.ellipse(x, y - 8 * u, 18 * u, 14 * u, 0, Math.PI, 0); g.fill();
    g.fillStyle = lin(g, 0, y - 10 * u, 0, y + 10 * u, [[0, '#ffffff'], [0.45, '#a9c6c0'], [1, '#2f5a5c']]);
    g.beginPath(); g.ellipse(x, y, 50 * u, 10 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#ff8a1f'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(x + i * 16 * u, y + 2 * u, 2.5 * u, 0, 7); g.fill(); }
  }

  window.Figuras = { homem, khan, medalhao, foguete, disco };
})();
