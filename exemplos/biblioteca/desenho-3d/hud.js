// hud.js — o que fica por cima da foto 3D, numa tela 2D: legenda (branca, contorno preto grosso, a
// palavra falada em amarelo), rótulos (título, placa, carimbo, contador, risco), linhas que ligam
// coisas na tela, clarão branco e o escurecer do fim. As letras são o desenho de letras.js passado
// com um pincel redondo e grosso (não depende de fonte instalada). Tudo é conta de t.

const { limita, mistura, trecho, suave } = Filme;
const TINTA = '#241726';

// salto com "passa do ponto"; preso em 0 no começo (lição: -2e-15 vira raio negativo)
export const salta = (k) => { k = limita(k); if (k <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return Math.max(0, 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2)); };

// confere, ao montar, que toda letra existe e que cada legenda fica 0,5 s inteira na tela
export function confereTextos(textos, legendas) {
  for (const txt of textos) for (const ch of String(txt).toUpperCase()) {
    if (ch === ' ') continue;
    if (!Letras.letra(ch)) throw new Error(`letras.js não tem a letra "${ch}" (em "${txt}")`);
  }
  for (const L of legendas || []) if (L.ate - L.de < 0.5) throw new Error(`legenda "${L.texto}" fica menos de 0,5 s na tela`);
}

export function criarHud(g, L, A, H) {
  const k = L / 1080;
  const ESP = 0.42, ENTRE = 0.2;
  const larguraTxt = (txt, tam) => Letras.largura(txt, tam);

  // pincel: passa cada traço da letra. passadas: [{cor, larg, dx, dy}]
  function escreve(txt, x, y, tam, o = {}) {
    txt = String(txt).toUpperCase();
    const w = larguraTxt(txt, tam);
    const x0 = o.alinha === 'esquerda' ? x : x - w / 2;
    const palavras = []; let idx = 0;
    for (const ch of txt) { if (ch === ' ') idx++; palavras.push(idx); }
    const fino = Math.max(2, tam * (o.peso || 0.17));
    const passes = o.passes || [
      { cor: 'rgba(0,0,0,0.45)', larg: fino + 16 * k * (o.borda ?? 1), dx: 3 * k, dy: 3 * k },
      { cor: o.bordaCor || '#000000', larg: fino + 16 * k * (o.borda ?? 1), dx: 0, dy: 0 },
      { cor: null, larg: fino, dx: 0, dy: 0 },
    ];
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const P of passes) {
      let px = x0, i = 0;
      for (const ch of txt) {
        const gl = Letras.letra(ch);
        if (!gl) { px += ESP * tam; i++; continue; }
        g.strokeStyle = P.cor || (o.corPalavra ? o.corPalavra(palavras[i]) : (o.cor || '#ffffff'));
        g.lineWidth = P.larg;
        for (const tr of gl.tracos) {
          g.beginPath();
          tr.forEach(([a, b], j) => { const X = px + a * tam + P.dx, Y = y - tam + b * tam + P.dy; if (j) g.lineTo(X, Y); else g.moveTo(X, Y); });
          if (tr.length === 1) g.lineTo(px + tr[0][0] * tam + 0.1 + P.dx, y - tam + tr[0][1] * tam + P.dy);
          g.stroke();
        }
        px += (gl.w + ENTRE) * tam; i++;
      }
    }
    return w;
  }

  // ---------- legenda ----------
  const LG = Object.assign({ y: 1590, tam: 62, largura: 940, segura: 0.55 }, H.legenda || {});
  function legenda(t) {
    const cartao = (H.legendas || []).find((c) => t >= c.de && t < c.ate);
    if (!cartao) return;
    const palavras = cartao.texto.split(' '), n = palavras.length;
    const fala = cartao.ate - LG.segura;
    let ativa = 0;
    for (let i = 0; i < n; i++) { const ini = n > 1 ? mistura(cartao.de, fala, i / (n - 1)) : cartao.de; if (t >= ini) ativa = i; }
    const tam = LG.tam * k;
    // quebra em duas linhas se não couber
    let linhas = [palavras];
    if (larguraTxt(cartao.texto, tam) > LG.largura * k && n > 1) {
      let melhor = 1, dif = 1e9;
      for (let c = 1; c < n; c++) { const d = Math.abs(larguraTxt(palavras.slice(0, c).join(' '), tam) - larguraTxt(palavras.slice(c).join(' '), tam)); if (d < dif) { dif = d; melhor = c; } }
      linhas = [palavras.slice(0, melhor), palavras.slice(melhor)];
    }
    const pop = 1 + 0.06 * (1 - suave(trecho(t, cartao.de, cartao.de + 0.12)));
    let base = 0;
    linhas.forEach((ln, li) => {
      const y = (LG.y - (linhas.length - 1 - li) * LG.tam * 1.45) * k;
      g.save(); g.translate(L / 2, y); g.scale(pop, pop); g.translate(-L / 2, -y);
      const b0 = base;
      escreve(ln.join(' '), L / 2, y, tam, { corPalavra: (w) => (b0 + w === ativa ? (H.legenda && H.legenda.destaque) || '#E3E302' : '#ffffff') });
      g.restore();
      base += ln.length;
    });
  }

  // ---------- rótulos ----------
  function numero(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rotulo(R, t) {
    if (t < R.de || (R.ate != null && t >= R.ate)) return;
    const ent = salta(trecho(t, R.de, R.de + 0.35));
    const sai = R.some != null ? 1 - suave(trecho(t, R.some, R.some + 0.25)) : 1;
    if (sai <= 0) return;
    let alfa = sai;
    if (R.apaga != null) alfa *= mistura(1, 0.3, suave(trecho(t, R.apaga, R.apaga + 0.3)));
    const tam = (R.tam || 70) * k;
    let x = (R.x ?? 540) * k, y = (R.y ?? 400) * k;
    if (R.sobe) y += (1 - suave(trecho(t, R.de, R.de + 0.45))) * 50 * k;
    let txt = R.texto;
    if (R.conta) txt = numero(R.conta.valor * suave(trecho(t, R.conta.de, R.conta.ate)));
    const estilo = R.estilo || 'titulo';
    g.save(); g.globalAlpha = alfa;
    let esc = ent;
    if (estilo === 'carimbo') esc = mistura(1.9, 1, suave(trecho(t, R.de, R.de + 0.12)));
    g.translate(x, y - tam / 2); g.rotate((R.giro || 0) * Math.PI / 180); g.scale(esc, esc); g.translate(-x, -(y - tam / 2));
    if (estilo === 'carimbo') g.globalAlpha = alfa * limita(trecho(t, R.de, R.de + 0.05));
    const w = larguraTxt(txt, tam);
    const cor = R.cor || '#ffffff';
    if (estilo === 'placa') {
      const pad = tam * 0.45;
      g.beginPath(); g.roundRect(x - w / 2 - pad, y - tam - pad, w + 2 * pad, tam + 2 * pad, tam * 0.35);
      g.fillStyle = R.fundo || '#fff6e0'; g.fill(); g.lineWidth = 7 * k; g.strokeStyle = TINTA; g.stroke();
      escreve(txt, x, y, tam, { passes: [{ cor: R.cor || TINTA, larg: Math.max(2, tam * 0.17), dx: 0, dy: 0 }] });
    } else if (estilo === 'carimbo') {
      const pad = tam * 0.4, vm = R.cor || '#d23a2a';
      g.lineWidth = 9 * k; g.strokeStyle = vm;
      g.strokeRect(x - w / 2 - pad, y - tam - pad, w + 2 * pad, tam + 2 * pad);
      g.lineWidth = 3 * k; g.strokeRect(x - w / 2 - pad * 0.6, y - tam - pad * 0.6, w + 1.2 * pad, tam + 1.2 * pad);
      escreve(txt, x, y, tam, { passes: [{ cor: 'rgba(255,255,255,0.85)', larg: tam * 0.17 + 10 * k, dx: 0, dy: 0 }, { cor: vm, larg: tam * 0.17, dx: 0, dy: 0 }] });
    } else {
      const cores = R.cores;
      escreve(txt, x, y, tam, { cor, corPalavra: cores ? (i) => cores[Math.min(i, cores.length - 1)] : null, peso: R.peso });
    }
    if (R.risco && t >= R.risco.de) {
      const p = suave(trecho(t, R.risco.de, R.risco.ate));
      const x0 = x - w / 2 - tam * 0.3, x1 = x0 + (w + tam * 0.6) * p, yy = y - tam * 0.5;
      g.lineCap = 'round';
      g.strokeStyle = '#000'; g.lineWidth = tam * 0.16 + 10 * k; g.beginPath(); g.moveTo(x0, yy + tam * 0.06); g.lineTo(x1, yy - tam * 0.06 * p); g.stroke();
      g.strokeStyle = R.riscoCor || '#e8423a'; g.lineWidth = tam * 0.16; g.stroke();
    }
    g.restore();
  }

  // ---------- desenho do letreiro inteiro ----------
  function desenhar(t, linhas) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, L, A);
    // linhas que ligam coisas (vêm do motor em coordenadas de tela)
    if (linhas && linhas.length) {
      g.lineCap = 'round';
      for (const [cor, larg] of [['#241726', 9 * k], [H.corLinha || '#ffd84a', 4 * k]]) {
        g.strokeStyle = cor; g.lineWidth = larg; g.beginPath();
        for (const [x1, y1, x2, y2, p, a] of linhas) { if (p <= 0 || a <= 0) continue; g.moveTo(x1, y1); g.lineTo(mistura(x1, x2, p), mistura(y1, y2, p)); }
        g.stroke();
      }
    }
    for (const R of H.rotulos || []) rotulo(R, t);
    legenda(t);
    // escurecer
    for (const E of H.escurece || []) { const a = suave(trecho(t, E.de, E.ate)) * (E.forca ?? 1); if (a > 0) { g.globalAlpha = a; g.fillStyle = E.cor || '#000'; g.fillRect(0, 0, L, A); g.globalAlpha = 1; } }
    // clarão branco
    let cl = 0;
    for (const c of H.claroes || []) { const d = t - c; if (d >= -1 / 30 && d < 0.3) cl = Math.max(cl, d < 0 ? 0.6 : Math.pow(1 - d / 0.3, 2)); }
    if (cl > 0) { g.globalAlpha = cl; g.fillStyle = '#ffffff'; g.fillRect(0, 0, L, A); g.globalAlpha = 1; }
  }

  return { desenhar, escreve };
}
