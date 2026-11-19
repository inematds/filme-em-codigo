// fundo.js — pinta UMA vez as cinco camadas do cenário, em aquarela e guache, cada uma numa tela
// própria (céu, árvores de longe, árvores do meio, chão da clareira, frente escura). O motor só move
// essas telas como uma câmera multiplano. As camadas de longe saem mais macias (desfocadas).
// Nada aqui sabe da história: lugar, cor e quantidade de cada peça vêm de historia.json.
(function () {
  'use strict';
  const { sorteio, ruido, cor, hex, limita } = Filme;
  const X0 = -260, Y0 = -160, LW = 2440, LH = 1420; // pedaço do mundo pintado (maior que a tela, para a câmera andar)
  const TAU = Math.PI * 2;

  function novaTela(res) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(LW * res); cv.height = Math.ceil(LH * res);
    const c = cv.getContext('2d');
    c.setTransform(res, 0, 0, res, -X0 * res, -Y0 * res);
    c.lineCap = 'round'; c.lineJoin = 'round';
    return { cv, c, res };
  }

  // ---------- pincel ----------
  // contorno de mancha: elipse com o raio mexido por duas ondas e um pouco de acaso
  function forma(r, x, y, rx, ry, irreg = 0.16, n = 26) {
    const pts = [], f1 = r() * TAU, f2 = r() * TAU, a1 = 2 + Math.floor(r() * 3), a2 = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const m = 1 + irreg * (0.6 * Math.sin(a * a1 + f1) + 0.4 * Math.sin(a * a2 + f2)) + irreg * 0.35 * (r() - 0.5);
      pts.push([x + Math.cos(a) * rx * m, y + Math.sin(a) * ry * m]);
    }
    return pts;
  }
  // curva macia passando perto dos pontos (pelos pontos do meio)
  function caminho(c, pts) {
    const n = pts.length, meio = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    c.beginPath(); const p = meio(n - 1); c.moveTo(p[0], p[1]);
    for (let i = 0; i < n; i++) { const q = meio(i); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
    c.closePath();
  }
  // lavagem de aquarela: camadas finas de tinta, uma sobre a outra, e a borda úmida mais escura
  function lavagem(c, r, x, y, rx, ry, cr, alfa, o = {}) {
    const n = o.camadas || 3;
    for (let i = 0; i < n; i++) {
      const pts = forma(r, x + (r() - 0.5) * rx * 0.1, y + (r() - 0.5) * ry * 0.1, rx * (1 - i * 0.13), ry * (1 - i * 0.13), o.irreg ?? 0.16);
      caminho(c, pts);
      c.fillStyle = cor(cr, cr, 0, alfa); c.fill();
      if (i === 0 && o.borda !== false) { c.strokeStyle = cor(cr, '#000000', 0.4, Math.min(1, alfa * 0.9)); c.lineWidth = o.bordaLarg || 2.2; c.stroke(); }
    }
  }
  // pigmento granulado: pontinhos só onde já tem tinta
  function granula(c, r, x, y, w, h, cr, n, alfa, tam) {
    c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = cr;
    for (let i = 0; i < n; i++) { c.globalAlpha = alfa * (0.35 + 0.65 * r()); const s = tam * (0.5 + r()); c.fillRect(x + r() * w, y + r() * h, s, s); }
    c.restore();
  }
  // pincel seco: riscos paralelos que falham
  function pincelSeco(c, r, x, y, comp, ang, larg, cr, alfa) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    for (let i = 0; i < 7; i++) {
      const off = (i / 6 - 0.5) * larg;
      c.strokeStyle = cor(cr, cr, 0, alfa * (0.5 + 0.5 * r())); c.lineWidth = 0.8 + r() * 1.8;
      c.beginPath();
      let s = r() * 0.25;
      const fim = 0.7 + r() * 0.3;
      while (s < fim) {
        const e = Math.min(fim, s + 0.12 + r() * 0.3);
        c.moveTo(x + nx * off + dx * comp * s, y + ny * off + dy * comp * s);
        c.lineTo(x + nx * off + dx * comp * e + (r() - 0.5) * 2, y + ny * off + dy * comp * e + (r() - 0.5) * 2);
        s = e + r() * 0.14;
      }
      c.stroke();
    }
  }
  // resto de lápis por baixo da tinta
  function lapis(c, r, pts, alfa = 0.22) {
    c.strokeStyle = `rgba(52,44,40,${alfa})`; c.lineWidth = 1.1;
    c.beginPath();
    pts.forEach(([x, y], i) => { const jx = (r() - 0.5) * 3, jy = (r() - 0.5) * 3; if (i) c.lineTo(x + jx, y + jy); else c.moveTo(x + jx, y + jy); });
    c.stroke();
  }
  // tronco em pé: as bordas tremem devagar, afina um pouco em cima
  function tronco(c, r, x, topo, base, larg, cr, alfa, luz) {
    const sem = Math.floor(r() * 1000) + 1, pe = [], pd = [];
    for (let y = topo; y <= base; y += 30) {
      const k = (y - topo) / (base - topo), w = larg * (0.82 + 0.18 * k) + (k > 0.92 ? (k - 0.92) * larg * 3 : 0);
      const cx = x + larg * 0.12 * ruido(y * 0.004, sem) + larg * 0.05 * ruido(y * 0.013, sem + 3);
      pe.push([cx - w / 2 + 3 * ruido(y * 0.03, sem + 1), y]); pd.push([cx + w / 2 + 3 * ruido(y * 0.03, sem + 2), y]);
    }
    const pts = pe.concat(pd.reverse());
    c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath();
    c.fillStyle = cor(cr, cr, 0, alfa); c.fill();
    c.strokeStyle = cor(cr, '#000000', 0.35, alfa * 0.8); c.lineWidth = 2; c.stroke();
    if (luz) { // luz da lua batendo de um lado
      c.save(); c.clip();
      c.strokeStyle = cor(luz, luz, 0, 0.45); c.lineWidth = larg * 0.16;
      c.beginPath(); pd.forEach(([a, b], i) => (i ? c.lineTo(a - larg * 0.1, b) : c.moveTo(a - larg * 0.1, b))); c.stroke();
      c.restore();
    }
    return pts;
  }
  function desfoca(t, px) { // devolve uma tela nova com a camada borrada (só na pintura, nunca por quadro)
    if (!px) return t.cv;
    const cv = document.createElement('canvas'); cv.width = t.cv.width; cv.height = t.cv.height;
    const c = cv.getContext('2d'); c.filter = `blur(${px * t.res}px)`; c.drawImage(t.cv, 0, 0);
    return cv;
  }

  // ================= as camadas =================
  function pintar(H, k) {
    const P = H.pecas || [], uma = (tipo) => P.find((p) => p.tipo === tipo) || {}, deTipo = (tipo) => P.filter((p) => p.tipo === tipo);
    const CO = H.cores, base = (H.semente || 1) * 101;
    const HZ = uma('chao').y || 560;
    const lua = uma('lua');
    const longeDaLua = (x) => !lua.x || Math.abs(x - lua.x) > (lua.raio || 70) + 90;
    const camadas = [];

    // ---------- 1. céu: degradê, lavagens, estrelas e lua cheia ----------
    {
      const t = novaTela(0.55 * k), c = t.c, r = sorteio(base + 1);
      const g = c.createLinearGradient(0, Y0, 0, HZ + 160);
      g.addColorStop(0, CO.ceuTopo); g.addColorStop(0.55, CO.ceuMeio); g.addColorStop(0.85, CO.ceuBaixo); g.addColorStop(1, CO.nevoa);
      c.fillStyle = g; c.fillRect(X0, Y0, LW, LH);
      for (let i = 0; i < 40; i++) lavagem(c, r, X0 + r() * LW, Y0 + r() * (HZ - Y0), 160 + r() * 260, 60 + r() * 90, r() < 0.5 ? CO.ceuTopo : CO.ceuMeio, 0.12, { borda: false, camadas: 2 });
      const est = uma('estrelas');
      for (let i = 0; i < (est.quantas || 0); i++) {
        const x = X0 + r() * LW, y = Y0 + r() * (HZ - 120 - Y0) * 0.85, a = 0.35 + 0.6 * r(), s = 1.2 + r() * 2.2;
        c.fillStyle = cor(CO.estrela, CO.estrela, 0, a); c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
        if (r() < 0.12) { c.strokeStyle = cor(CO.estrela, CO.estrela, 0, a * 0.7); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - s * 4, y); c.lineTo(x + s * 4, y); c.moveTo(x, y - s * 4); c.lineTo(x, y + s * 4); c.stroke(); }
      }
      if (lua.x) {
        const R = lua.raio || 70;
        const h = c.createRadialGradient(lua.x, lua.y, R * 0.8, lua.x, lua.y, R * 5);
        h.addColorStop(0, cor(CO.lua, CO.lua, 0, 0.45)); h.addColorStop(0.3, cor(CO.lua, CO.lua, 0, 0.14)); h.addColorStop(1, cor(CO.lua, CO.lua, 0, 0));
        c.fillStyle = h; c.fillRect(lua.x - R * 5, lua.y - R * 5, R * 10, R * 10);
        lavagem(c, r, lua.x, lua.y, R, R, CO.lua, 0.97, { irreg: 0.02, camadas: 2, bordaLarg: 1.5 });
        for (let i = 0; i < 5; i++) lavagem(c, r, lua.x + (r() - 0.5) * R * 1.1, lua.y + (r() - 0.5) * R * 1.1, R * (0.12 + r() * 0.22), R * (0.1 + r() * 0.18), CO.luaMancha, 0.2, { borda: false, camadas: 1 });
      }
      granula(c, r, X0, Y0, LW, LH, '#000000', 9000, 0.08, 3);
      camadas.push({ nome: 'ceu', cv: desfoca(t, 2.5), res: t.res, f: 0.12 });
    }

    // ---------- 2. árvores de longe, na névoa ----------
    {
      const t = novaTela(0.6 * k), c = t.c, r = sorteio(base + 2), p = uma('arvoresLonge');
      for (let i = 0; i < 8; i++) lavagem(c, r, X0 + r() * LW, HZ - 120 - r() * 160, 300 + r() * 300, 50 + r() * 50, CO.nevoa, 0.18, { borda: false, camadas: 2 });
      const n = p.quantas || 14;
      for (let i = 0; i < n; i++) {
        const x = X0 + (i + 0.2 + 0.6 * r()) * LW / n;
        if (!longeDaLua(x)) continue;
        tronco(c, r, x, Y0, HZ + 60, 34 + r() * 46, CO.troncoLonge, 0.55 + r() * 0.2, null);
      }
      for (let i = 0; i < 16; i++) lavagem(c, r, X0 + r() * LW, Y0 + r() * 160, 200 + r() * 260, 70 + r() * 80, CO.copaLonge, 0.45, { camadas: 2 });
      const g = c.createLinearGradient(0, HZ - 260, 0, HZ + 40);
      g.addColorStop(0, cor(CO.nevoa, CO.nevoa, 0, 0)); g.addColorStop(1, cor(CO.nevoa, CO.nevoa, 0, 0.75));
      c.fillStyle = g; c.fillRect(X0, HZ - 260, LW, 300);
      c.fillStyle = cor(CO.nevoa, CO.nevoa, 0, 0.75); c.fillRect(X0, HZ + 40, LW, LH);
      granula(c, r, X0, Y0, LW, LH, '#0a1420', 7000, 0.1, 3);
      camadas.push({ nome: 'longe', cv: desfoca(t, 4), res: t.res, f: 0.3 });
    }

    // ---------- 3. árvores do meio e a fileira de moitas ----------
    {
      const t = novaTela(0.85 * k), c = t.c, r = sorteio(base + 3), p = uma('arvoresMeio'), m = uma('moitas');
      const n = p.quantas || 8, topoMoita = m.y || 380;
      for (let i = 0; i < n; i++) {
        const x = X0 + (i + 0.15 + 0.7 * r()) * LW / n;
        if (!longeDaLua(x)) continue;
        const larg = 70 + r() * 70, pts = tronco(c, r, x, Y0, topoMoita + 140, larg, CO.troncoMeio, 0.95, CO.luzLua);
        lapis(c, r, pts.slice(0, Math.floor(pts.length / 2)), 0.18);
      }
      for (let i = 0; i < 26; i++) lavagem(c, r, X0 + r() * LW, Y0 + r() * 120, 150 + r() * 220, 80 + r() * 90, CO.copaMeio, 0.8, { camadas: 2 });
      // moitas: bolos redondos, lado de cima pegando a luz da lua
      c.fillStyle = CO.moitaFundo; c.fillRect(X0, topoMoita + 110, LW, LH);
      const nm = m.quantas || 26;
      for (let i = 0; i < nm; i++) {
        const x = X0 + (i + r()) * LW / nm, rx = 110 + r() * 110, ry = 70 + r() * 60, y = topoMoita + ry * 0.9 + r() * 50;
        const tom = [CO.moita1, CO.moita2, CO.moita3][Math.floor(r() * 3)];
        lavagem(c, r, x, y, rx, ry, tom, 0.9, { camadas: 3, irreg: 0.12, bordaLarg: 1.4 });
        lavagem(c, r, x + rx * 0.1, y + ry * 0.45, rx * 0.85, ry * 0.5, CO.moitaFundo, 0.35, { borda: false, camadas: 2 });
        for (let j = 0; j < 4; j++) pincelSeco(c, r, x - rx * 0.6 + r() * rx * 0.8, y - ry * 0.75 + r() * ry * 0.3, rx * 0.6, -0.3 + r() * 0.3, 14, CO.moitaLuz, 0.35);
      }
      for (let i = 0; i < 10; i++) lavagem(c, r, X0 + r() * LW, topoMoita + 190 + r() * 40, 260 + r() * 200, 30 + r() * 20, CO.nevoa, 0.16, { borda: false, camadas: 2 });
      granula(c, r, X0, Y0, LW, LH, '#06100c', 12000, 0.12, 3);
      camadas.push({ nome: 'meio', cv: desfoca(t, 1.6), res: t.res, f: 0.6 });
    }

    // ---------- 4. chão da clareira (o plano da raposa) ----------
    const chao = {};
    {
      const t = novaTela(1.45 * k), c = t.c, r = sorteio(base + 4), y0 = HZ, y1 = Y0 + LH;
      c.beginPath(); c.moveTo(X0, y1);
      for (let x = X0; x <= X0 + LW; x += 40) c.lineTo(x, y0 + 14 * ruido(x * 0.006, 41) + 6 * ruido(x * 0.03, 42));
      c.lineTo(X0 + LW, y1); c.closePath();
      const g = c.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, CO.chaoLonge); g.addColorStop(0.3, CO.chaoMeio); g.addColorStop(1, CO.chaoPerto);
      c.fillStyle = g; c.fill();
      c.save(); c.clip();
      for (let i = 0; i < 70; i++) { const y = y0 + r() * (y1 - y0), s = 0.6 + (y - y0) / (y1 - y0); lavagem(c, r, X0 + r() * LW, y, (120 + r() * 220) * s, (30 + r() * 50) * s, r() < 0.5 ? CO.chaoMeio : CO.chaoPerto, 0.18, { camadas: 2, bordaLarg: 1.6 }); }
      const luz = uma('luzDaLua');
      if (luz.x) {
        const rg = c.createRadialGradient(luz.x, luz.y, 0, luz.x, luz.y, luz.rx);
        rg.addColorStop(0, cor(CO.chaoLuz, CO.chaoLuz, 0, 0.42)); rg.addColorStop(1, cor(CO.chaoLuz, CO.chaoLuz, 0, 0));
        c.save(); c.translate(luz.x, luz.y); c.scale(1, luz.ry / luz.rx); c.translate(-luz.x, -luz.y); c.fillStyle = rg; c.fillRect(luz.x - luz.rx, luz.y - luz.rx, luz.rx * 2, luz.rx * 2); c.restore();
      }
      const sg = c.createLinearGradient(0, y0 - 10, 0, y0 + 90);
      sg.addColorStop(0, 'rgba(6,18,14,0.6)'); sg.addColorStop(1, 'rgba(6,18,14,0)');
      c.fillStyle = sg; c.fillRect(X0, y0 - 20, LW, 120);
      granula(c, r, X0, y0, LW, y1 - y0, '#0b1a12', 26000, 0.14, 3);
      c.restore();

      // lago (antes do capim, para o capim da borda ficar por cima)
      for (const p of deTipo('lago')) {
        lavagem(c, r, p.x, p.y + 4, p.rx * 1.06, p.ry * 1.18, CO.lagoBorda, 0.85, { camadas: 2, irreg: 0.05 });
        c.save(); caminho(c, forma(r, p.x, p.y, p.rx, p.ry, 0.04)); c.clip();
        const ga = c.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry);
        ga.addColorStop(0, CO.aguaLonge); ga.addColorStop(1, CO.aguaPerto);
        c.fillStyle = ga; c.fillRect(p.x - p.rx * 1.2, p.y - p.ry * 1.3, p.rx * 2.4, p.ry * 2.6);
        for (let i = 0; i < 7; i++) { c.strokeStyle = cor(CO.luzLua, CO.luzLua, 0, 0.18 + r() * 0.15); c.lineWidth = 2 + r() * 2; const yy = p.y - p.ry * 0.6 + r() * p.ry * 1.2, xx = p.x + (r() - 0.5) * p.rx * 1.2; c.beginPath(); c.moveTo(xx - 30 - r() * 60, yy); c.lineTo(xx + 30 + r() * 60, yy); c.stroke(); }
        granula(c, r, p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2, '#c8dccf', 1600, 0.1, 2.5);
        c.restore();
        for (const [fx, fy, fr] of (p.folhas || [])) { // folhas de lírio
          c.save(); c.translate(p.x + fx, p.y + fy); c.scale(1, 0.38);
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, fr, 0.4, TAU - 0.15); c.closePath();
          c.fillStyle = CO.folhaLago; c.fill(); c.strokeStyle = cor(CO.folhaLago, '#000000', 0.45, 1); c.lineWidth = 2; c.stroke(); c.restore();
        }
        for (let i = 0; i < (p.juncos || 0); i++) { // juncos na borda de trás
          const jx = p.x + p.rx * (0.35 + 0.55 * r()) * (r() < 0.75 ? 1 : -1), jy = p.y - p.ry * 0.55 + r() * 10, jh = 90 + r() * 80, inc = (r() - 0.5) * 20;
          c.strokeStyle = CO.junco; c.lineWidth = 3; c.beginPath(); c.moveTo(jx, jy); c.quadraticCurveTo(jx + inc * 0.3, jy - jh * 0.6, jx + inc, jy - jh); c.stroke();
          if (r() < 0.6) { c.fillStyle = CO.taboa; c.beginPath(); c.ellipse(jx + inc * 0.9, jy - jh * 0.85, 4.5, 14, inc * 0.01, 0, TAU); c.fill(); }
        }
        lapis(c, r, forma(r, p.x, p.y, p.rx * 1.02, p.ry * 1.05, 0.03, 30), 0.2);
        chao.lago = p;
      }

      // capim: milhares de folhinhas, maiores perto (perspectiva), da linha de trás para a da frente
      const cp = uma('capim'), lam = [];
      for (let i = 0; i < (cp.quantos || 8000); i++) lam.push({ y: y0 + 6 + Math.pow(r(), 0.85) * (y1 - y0), x: X0 + r() * LW, a: r(), b: r(), c: r(), d: r() });
      lam.sort((a, b) => a.y - b.y);
      const naAgua = (x, y) => chao.lago && (((x - chao.lago.x) / chao.lago.rx) ** 2 + ((y - chao.lago.y) / chao.lago.ry) ** 2 < 0.92);
      for (const L of lam) {
        if (naAgua(L.x, L.y)) continue;
        const s = 0.4 + 1.5 * (L.y - y0) / (y1 - y0), h = (9 + L.a * 20) * s * (L.d < 0.06 ? 2.2 : 1), inc = (L.b - 0.5) * 12 * s;
        const tom = L.c < 0.45 ? CO.capimEscuro : (L.c < 0.8 ? CO.capimMedio : CO.capimClaro);
        c.strokeStyle = cor(tom, tom, 0, 0.75); c.lineWidth = 1.3 * s;
        c.beginPath(); c.moveTo(L.x, L.y); c.quadraticCurveTo(L.x + inc * 0.2, L.y - h * 0.6, L.x + inc, L.y - h); c.stroke();
      }
      const fl = uma('flores');
      const coresFlor = [CO.flor1, CO.flor2, CO.flor3, CO.flor4];
      for (let i = 0; i < (fl.quantas || 500); i++) {
        const y = y0 + 20 + Math.pow(r(), 0.8) * (y1 - y0 - 20), x = X0 + r() * LW;
        if (naAgua(x, y)) continue;
        const s = 0.5 + 1.3 * (y - y0) / (y1 - y0), cf = coresFlor[Math.floor(r() * 4)];
        c.fillStyle = cf; for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(x + Math.cos(j * 1.57) * 2.2 * s, y + Math.sin(j * 1.57) * 1.4 * s, 1.9 * s, 0, TAU); c.fill(); }
        c.fillStyle = CO.florMiolo; c.beginPath(); c.arc(x, y, 1.1 * s, 0, TAU); c.fill();
      }

      // tronco caído com musgo
      for (const p of deTipo('troncoCaido')) {
        const R = p.raio, x = p.x, y = p.y, w = p.comp;
        c.fillStyle = 'rgba(8,20,14,0.45)'; c.beginPath(); c.ellipse(x + w / 2, y + 4, w * 0.55, 16, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(x, y - R * 2); c.lineTo(x + w, y - R * 2); c.ellipse(x + w, y - R, R * 0.42, R, 0, -Math.PI / 2, Math.PI / 2); c.lineTo(x, y);
        c.quadraticCurveTo(x - R * 0.5, y - R, x, y - R * 2); c.closePath();
        c.fillStyle = CO.madeira; c.fill(); c.save(); c.clip();
        c.fillStyle = cor(CO.madeira, '#000000', 0.4, 0.8); c.fillRect(x - R, y - R * 0.7, w + R * 2, R);
        for (let i = 0; i < 9; i++) { c.strokeStyle = cor(CO.madeira, '#000000', 0.5, 0.6); c.lineWidth = 2; const yy = y - R * 2 + R * 2 * (0.15 + 0.75 * r()); c.beginPath(); c.moveTo(x + r() * w * 0.3, yy); c.lineTo(x + w * (0.5 + r() * 0.45), yy + (r() - 0.5) * 6); c.stroke(); }
        lavagem(c, r, x + w * 0.45, y - R * 2 + 4, w * 0.55, R * 0.45, CO.musgo, 0.9, { camadas: 2 });
        for (let i = 0; i < 10; i++) pincelSeco(c, r, x + r() * w * 0.9, y - R * 2 + 2, 26, -1.2 - r() * 0.7, 8, CO.musgoLuz, 0.5);
        granula(c, r, x - R, y - R * 2.5, w + R * 2, R * 3, '#1a0e08', 900, 0.25, 2.5);
        c.restore();
        c.fillStyle = CO.madeiraCorte; c.beginPath(); c.ellipse(x + w, y - R, R * 0.42, R, 0, 0, TAU); c.fill();
        c.strokeStyle = cor(CO.madeiraCorte, '#000000', 0.45, 0.8); c.lineWidth = 1.6;
        for (const f of [0.75, 0.5, 0.25]) { c.beginPath(); c.ellipse(x + w, y - R, R * 0.42 * f, R * f, 0, 0, TAU); c.stroke(); }
        c.lineWidth = 2.2; c.beginPath(); c.ellipse(x + w, y - R, R * 0.42, R, 0, 0, TAU); c.stroke();
        lapis(c, r, [[x, y - R * 2], [x + w, y - R * 2]], 0.25);
      }

      // cogumelos vermelhos de pintinhas
      for (const p of deTipo('cogumelos')) for (const [x, y, tam] of p.lista) {
        const s = tam;
        c.fillStyle = 'rgba(8,20,14,0.4)'; c.beginPath(); c.ellipse(x, y + 2, 14 * s, 4 * s, 0, 0, TAU); c.fill();
        c.fillStyle = CO.cogumeloPe; c.beginPath(); c.moveTo(x - 4 * s, y); c.lineTo(x - 3 * s, y - 16 * s); c.lineTo(x + 3 * s, y - 16 * s); c.lineTo(x + 4 * s, y); c.closePath(); c.fill();
        c.fillStyle = CO.cogumelo; c.beginPath(); c.ellipse(x, y - 16 * s, 13 * s, 10 * s, 0, Math.PI, TAU); c.closePath(); c.fill();
        c.strokeStyle = cor(CO.cogumelo, '#000000', 0.5, 1); c.lineWidth = 1.4 * s; c.stroke();
        c.fillStyle = CO.cogumeloPinta;
        for (const [dx, dy, rr] of [[-6, -20, 2], [1, -23, 2.4], [7, -19, 1.7], [-1, -18, 1.3]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); c.fill(); }
      }

      // a planta de semente (onde o vaga-lume pousa)
      for (const p of deTipo('planta')) {
        const tx = p.x + (p.inclina || 8), ty = p.y - p.altura;
        c.strokeStyle = CO.caule; c.lineWidth = 3.4; c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x - 6, p.y - p.altura * 0.55, tx, ty); c.stroke();
        for (const s of [-1, 1]) { c.fillStyle = CO.caule; c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x + s * 22, p.y - 30, p.x + s * 30, p.y - 44); c.quadraticCurveTo(p.x + s * 10, p.y - 24, p.x, p.y); c.fill(); }
        c.strokeStyle = cor(CO.semente, CO.semente, 0, 0.55); c.lineWidth = 1.1;
        for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + Math.cos(a) * 15, ty + Math.sin(a) * 15); c.stroke(); }
        c.fillStyle = cor(CO.semente, CO.semente, 0, 0.8); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; c.beginPath(); c.arc(tx + Math.cos(a) * 15, ty + Math.sin(a) * 15, 1.6, 0, TAU); c.fill(); }
        chao.planta = { x: tx, y: ty };
      }
      camadas.push({ nome: 'chao', cv: t.cv, res: t.res, f: 1 });
    }

    // ---------- 5. frente escura: troncos nos cantos, folhas em cima, samambaias embaixo ----------
    {
      const t = novaTela(1.2 * k), c = t.c, r = sorteio(base + 5), p = uma('frente');
      for (const [x, larg] of (p.troncos || [])) tronco(c, r, x, Y0, Y0 + LH, larg, CO.frente, 1, CO.frenteLuz);
      const folha = (x, y, ang, tam) => {
        c.save(); c.translate(x, y); c.rotate(ang);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(tam * 0.5, -tam * 0.32, tam, 0); c.quadraticCurveTo(tam * 0.5, tam * 0.32, 0, 0);
        c.fillStyle = r() < 0.8 ? CO.frente : CO.frenteFolha; c.fill(); c.restore();
      };
      for (const [x, y, rx, ry] of (p.copas || [])) for (let g = 0; g < 9; g++) { // cachos de folhas pendurados, de tamanhos diferentes
        const gx = x + (r() - 0.5) * 2 * rx, gy = y + (r() - 0.3) * ry * 1.4, gr = 50 + r() * 90;
        c.strokeStyle = CO.frente; c.lineWidth = 5; c.beginPath(); c.moveTo(gx - gr * 1.5, y - ry); c.quadraticCurveTo(gx - gr * 0.4, gy - gr * 0.6, gx, gy); c.stroke();
        for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()); folha(gx + Math.cos(a) * gr * d, gy + Math.sin(a) * gr * 0.8 * d, r() * TAU, 24 + r() * 34); }
      }
      for (const [x, y, tam, dir] of (p.samambaias || [])) {
        for (let f = 0; f < 6; f++) {
          const a0 = -Math.PI / 2 + dir * (0.25 + f * 0.22) + (r() - 0.5) * 0.2, comp = tam * (0.7 + r() * 0.4);
          let px = x, py = y, a = a0;
          for (let s = 0; s < 14; s++) {
            const nx = px + Math.cos(a) * comp / 14, ny = py + Math.sin(a) * comp / 14;
            c.strokeStyle = CO.frente; c.lineWidth = 4 * (1 - s / 16); c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
            const fl = (1 - s / 14) * comp * 0.18;
            folha(nx, ny, a - 1.2, fl); folha(nx, ny, a + 1.2, fl);
            px = nx; py = ny; a += dir * 0.07;
          }
        }
      }
      if (p.capim) for (let i = 0; i < 260; i++) {
        const x = X0 + r() * LW, y = Y0 + LH + 10, h = 60 + r() * 140, inc = (r() - 0.5) * 60;
        c.strokeStyle = CO.frente; c.lineWidth = 4 + r() * 4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + inc * 0.2, y - h * 0.6, x + inc, y - h); c.stroke();
      }
      camadas.push({ nome: 'frente', cv: desfoca(t, 1.8), res: t.res, f: 1.3 });
    }
    return { camadas, chao, X0, Y0, LW, LH };
  }

  window.Fundo = { pintar, X0, Y0, LW, LH };
})();
