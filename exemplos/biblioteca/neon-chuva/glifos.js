// glifos.js — letreiros com símbolos INVENTADOS (nenhuma letra de língua nenhuma).
// Cada símbolo é sorteado (com semente) numa grade de 3x3 pontos: 2 a 4 traços retos ou curvos.
// Tudo é desenhado uma vez em canvas 2D, branco sobre transparente; a cor vem depois, no shader.

const { sorteio } = Filme;

// um símbolo inventado dentro do quadrado (x, y, tam)
function simbolo(c, x, y, tam, r) {
  const P = (i, j) => [x + tam * (0.15 + 0.35 * i), y + tam * (0.15 + 0.35 * j)];
  const tracos = 2 + Math.floor(r() * 3);
  c.beginPath();
  for (let k = 0; k < tracos; k++) {
    const a = P(Math.floor(r() * 3), Math.floor(r() * 3));
    let b = P(Math.floor(r() * 3), Math.floor(r() * 3));
    if (a[0] === b[0] && a[1] === b[1]) b = P(2 - Math.floor(r() * 2), 2);
    c.moveTo(a[0], a[1]);
    const tipo = r();
    if (tipo < 0.45) c.lineTo(b[0], b[1]);
    else if (tipo < 0.8) c.quadraticCurveTo(x + tam * r(), y + tam * r(), b[0], b[1]);
    else { const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2; c.moveTo(cx + tam * 0.16, cy); c.arc(cx, cy, tam * 0.16, 0, Math.PI * 2 * (0.5 + r() * 0.5)); }
  }
  if (r() < 0.35) { const p = P(Math.floor(r() * 3), Math.floor(r() * 3)); c.moveTo(p[0] + tam * 0.05, p[1]); c.arc(p[0], p[1], tam * 0.05, 0, 6.2832); }
  c.stroke();
}

// letreiro vertical (proporção 1:4): moldura de tubo e uma coluna de símbolos
function letreiro(c, x, y, w, h, r) {
  c.save();
  c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = '#fff'; c.shadowBlur = w * 0.08;
  const borda = w * 0.07;
  const moldura = r();
  c.lineWidth = w * 0.035;
  if (moldura < 0.75) { c.beginPath(); c.roundRect(x + borda, y + borda, w - 2 * borda, h - 2 * borda, w * (moldura < 0.4 ? 0.04 : 0.2)); c.stroke(); }
  if (moldura > 0.5) { c.beginPath(); c.moveTo(x + borda * 2, y + borda * 2.2); c.lineTo(x + w - borda * 2, y + borda * 2.2); c.moveTo(x + borda * 2, y + h - borda * 2.2); c.lineTo(x + w - borda * 2, y + h - borda * 2.2); c.stroke(); }
  const n = 3 + Math.floor(r() * 3), tam = Math.min(w * 0.62, (h - 6 * borda) / n * 0.86);
  c.lineWidth = tam * 0.1;
  for (let i = 0; i < n; i++) simbolo(c, x + (w - tam) / 2, y + 3 * borda + i * (h - 6 * borda) / n + ((h - 6 * borda) / n - tam) / 2, tam, r);
  c.restore();
}

// atlas: 8 colunas x 2 linhas de letreiros verticais (128x512 cada)
export function atlasLetreiros(semente) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024;
  const c = cv.getContext('2d'), r = sorteio(semente);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 8; i++) letreiro(c, i * 128, j * 512, 128, 512, r);
  return cv;
}

// anel de holograma: círculos, marcas e símbolos em volta
export function anelHolograma(semente) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c = cv.getContext('2d'), r = sorteio(semente);
  c.translate(256, 256); c.strokeStyle = '#fff'; c.lineCap = 'round'; c.shadowColor = '#fff'; c.shadowBlur = 10;
  for (const [raio, larg] of [[236, 6], [214, 2], [150, 4], [96, 10], [60, 3]]) { c.lineWidth = larg; c.beginPath(); c.arc(0, 0, raio, 0, 6.2832); c.stroke(); }
  c.lineWidth = 3;
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.2832, k = i % 4 ? 0.95 : 0.9; c.beginPath(); c.moveTo(Math.cos(a) * 214 * k, Math.sin(a) * 214 * k); c.lineTo(Math.cos(a) * 214, Math.sin(a) * 214); c.stroke(); }
  c.lineWidth = 4;
  for (let i = 0; i < 10; i++) { c.save(); c.rotate(i / 10 * 6.2832); simbolo(c, -18, -196, 36, r); c.restore(); }
  for (let i = 0; i < 6; i++) { c.save(); c.rotate(i / 6 * 6.2832 + 0.3); c.lineWidth = 3; simbolo(c, -14, -136, 28, r); c.restore(); }
  c.lineWidth = 5; simbolo(c, -44, -44, 88, r);
  return cv;
}

// bolinha macia (vapor, halos)
export function bolinha() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return cv;
}
