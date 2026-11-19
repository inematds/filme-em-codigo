// pincel.js — o "pincel" do motor papiro-ouro: linha de nanquim afinada nas pontas, cor chapada que
// entra em pinceladas de vaivém, e letras grossas com contorno (usando as letras em traços de letras.js).
// Nada aqui sabe da história. Tudo é conta: o mesmo pedido dá sempre o mesmo desenho.
(function () {
  'use strict';
  const { ruido, limita } = Filme;

  // pontos a cada "passo" (a fita precisa de pontos espalhados por igual)
  function reamostra(pts, passo) {
    const xs = [pts[0][0]], ys = [pts[0][1]], cum = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const d = Math.hypot(bx - ax, by - ay);
      if (d < 1e-6) continue;
      const n = Math.max(1, Math.ceil(d / passo));
      for (let j = 1; j <= n; j++) { xs.push(ax + (bx - ax) * j / n); ys.push(ay + (by - ay) * j / n); cum.push(total + d * j / n); }
      total += d;
    }
    return { xs, ys, cum, total };
  }

  // ---------- fita de nanquim ----------
  // o = { cor, larg, prog (0 a 1), sem, boil, fecha (contorno fechado), tremor }
  // Devolve a ponta [x, y] (no sistema atual) enquanto ainda está desenhando.
  function fita(c, pts, o) {
    const prog = o.prog ?? 1;
    if (!pts || pts.length < 2 || prog <= 0) return null;
    const P = o.fecha ? [...pts, pts[0], pts[1] || pts[0]] : pts;
    const r = reamostra(P, o.passo || 5);
    if (r.total < 1e-6) return null;
    const lim = r.total * Math.min(1, prog), larg = o.larg || 6, sem = o.sem || 1, b = (o.boil || 0) * 3.7, tr = o.tremor ?? larg * 0.18;
    const pontas = Math.max(larg * 2.5, 6);
    const pp = [];
    for (let i = 0; i < r.xs.length; i++) {
      let x = r.xs[i], y = r.ys[i], cu = r.cum[i];
      if (cu > lim) {
        const k = (lim - r.cum[i - 1]) / (cu - r.cum[i - 1]);
        x = r.xs[i - 1] + (x - r.xs[i - 1]) * k; y = r.ys[i - 1] + (y - r.ys[i - 1]) * k; cu = lim;
      }
      pp.push([x, y, cu]);
      if (r.cum[i] >= lim) break;
    }
    if (pp.length < 2) return null;
    const esq = [], dir = [];
    for (let i = 0; i < pp.length; i++) {
      const a = pp[Math.max(0, i - 1)], d = pp[Math.min(pp.length - 1, i + 1)];
      let nx = -(d[1] - a[1]), ny = d[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const cu = pp[i][2];
      let afina = Math.min(1, Math.pow(Math.min(cu, r.total - cu) / pontas, 0.55));
      if (prog < 1) afina = Math.min(afina, Math.pow(limita((lim - cu) / (larg * 1.4)), 0.6) * 0.8 + 0.2);
      const w = larg * Math.max(0.12, afina) * (1 + 0.22 * ruido(cu * 0.035 + sem * 1.3, sem)) / 2;
      const des = tr * ruido(cu * 0.012 + b, sem + 7);
      const x = pp[i][0] + nx * des, y = pp[i][1] + ny * des;
      esq.push([x + nx * w, y + ny * w]); dir.push([x - nx * w, y - ny * w]);
    }
    c.beginPath();
    esq.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = dir.length - 1; i >= 0; i--) c.lineTo(dir[i][0], dir[i][1]);
    c.closePath();
    c.fillStyle = o.cor; c.globalAlpha = o.alfa ?? 0.95; c.fill(); c.globalAlpha = 1;
    if (prog >= 1) return null;
    const u = pp[pp.length - 1];
    return [u[0], u[1]];
  }

  function caminho(c, pts) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  }
  function caixa(pts) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, x1, y0, y1 };
  }

  // ---------- cor chapada que entra em pinceladas de vaivém ----------
  // o = { cor, prog, sem, faixa (altura de cada pincelada), veio (força das marcas do pincel) }
  function pinta(c, pts, o) {
    const prog = o.prog ?? 1;
    if (prog <= 0 || !pts || pts.length < 3) return;
    const bx = caixa(pts), W = bx.x1 - bx.x0, H = bx.y1 - bx.y0;
    c.save();
    caminho(c, pts); c.clip();
    c.fillStyle = o.cor;
    const n = Math.max(2, Math.ceil(H / (o.faixa || 34))), fh = H / n;
    if (prog >= 1) c.fillRect(bx.x0 - 2, bx.y0 - 2, W + 4, H + 4);
    else {
      for (let i = 0; i < n; i++) {
        const f = limita((prog - (i / n) * 0.55) / 0.45);
        if (f <= 0) continue;
        const w = W * f + 4, y = bx.y0 + i * fh - fh * 0.12, h = fh * 1.24;
        const daEsq = i % 2 === 0, x = daEsq ? bx.x0 - 2 : bx.x1 + 2 - w;
        c.beginPath();
        c.rect(x, y, w, h);
        c.fill();
        // a ponta do pincel: arredondada
        c.beginPath(); c.ellipse(daEsq ? x + w : x, y + h / 2, h * 0.35, h / 2, 0, 0, Math.PI * 2); c.fill();
      }
    }
    // marcas do pincel: riscos finos mais escuros no sentido de cada faixa (ficam depois de pronto)
    const veio = o.veio ?? 0.08, sem = o.sem || 3;
    if (veio > 0) {
      c.strokeStyle = 'rgba(40,20,5,1)'; c.lineWidth = Math.max(1, fh * 0.05);
      for (let i = 0; i < n; i++) {
        const f = prog >= 1 ? 1 : limita((prog - (i / n) * 0.55) / 0.45);
        if (f <= 0) continue;
        const daEsq = i % 2 === 0;
        for (let j = 0; j < 3; j++) {
          const yy = bx.y0 + i * fh + fh * (0.2 + 0.3 * j) + fh * 0.1 * ruido(i * 3.1 + j, sem);
          const a = W * (0.05 + 0.25 * (0.5 + 0.5 * ruido(i * 1.7 + j * 2.3, sem + 1)));
          const len = (W - a) * f * (0.6 + 0.3 * (0.5 + 0.5 * ruido(i + j * 5.1, sem + 2)));
          const xa = daEsq ? bx.x0 + a : bx.x1 - a, xb = daEsq ? xa + len : xa - len;
          c.globalAlpha = veio * (0.5 + 0.5 * (0.5 + 0.5 * ruido(i * 2 + j, sem + 4)));
          c.beginPath(); c.moveTo(xa, yy); c.lineTo(xb, yy + fh * 0.04); c.stroke();
        }
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  // ---------- letras grossas com contorno (sem fonte instalada) ----------
  const ENTRE = 0.2, ESPACO = 0.42;
  const largura = (txt, tam) => Letras.largura(txt, tam);
  // escreve com a linha de base em y. o = { cor(i) ou cor, contorno, grossura, borda, prog (0 a 1, letra a letra), alinha }
  function escreve(c, txt, x, y, tam, o) {
    txt = txt.toUpperCase();
    const chars = [...txt], w = largura(txt, tam);
    const n = chars.filter((ch) => ch !== ' ').length || 1, prog = o.prog ?? 1;
    const gross = (o.grossura ?? 0.17) * tam, borda = (o.borda ?? 0.13) * tam;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const passes = o.contorno ? [0, 1] : [1];
    for (const passe of passes) {
      let px = o.alinha === 'esquerda' ? x : x - w / 2, feitas = 0;
      chars.forEach((ch, i) => {
        const g = Letras.letra(ch);
        if (!g) { px += ESPACO * tam; return; }
        const pl = limita(prog * n - feitas); feitas++;
        if (pl > 0) {
          const s = pl < 1 ? 0.6 + 0.4 * pl + 0.25 * Math.sin(Math.PI * pl) : 1; // a letra entra com um pulinho
          const cx = px + g.w * tam / 2, cy = y - tam / 2;
          c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
          c.lineWidth = passe ? gross : gross + borda * 2;
          c.strokeStyle = passe ? (typeof o.cor === 'function' ? o.cor(i) : o.cor) : o.contorno;
          for (const tr of g.tracos) { c.beginPath(); tr.forEach(([a, b], k) => (k ? c.lineTo(px + a * tam, y - tam + b * tam) : c.moveTo(px + a * tam, y - tam + b * tam))); c.stroke(); }
          c.restore();
        }
        px += (g.w + ENTRE) * tam;
      });
    }
    return w;
  }

  // estrelinha de brilho (4 pontas + halo), para a ponta do ouro e para as estrelas do céu
  function estrela(c, x, y, r, cor, alfa = 1) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, `rgba(255,250,220,${0.75 * alfa})`); g.addColorStop(0.3, `rgba(255,220,120,${0.35 * alfa})`); g.addColorStop(1, 'rgba(255,200,80,0)');
    c.fillStyle = g; c.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
    c.globalAlpha = alfa; c.fillStyle = cor;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, rr = i % 2 ? r * 0.16 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
    c.restore();
  }

  window.Pincel = { reamostra, fita, pinta, caminho, caixa, escreve, largura, estrela };
})();
