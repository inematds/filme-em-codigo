// boneco.js — o boneco de desenho animado: chapado, contorno ameixa grosso, olhos grandes brancos.
// Ele é DESENHADO em 2D (numa tela de 256x512) e colado num cartaz que sempre olha para a câmera,
// dentro do mundo 3D. Cada combinação de "jeito" (roupa, chapéu, barba...), cara, braços e piscada
// vira uma textura, feita uma vez só e guardada (é conta pura: o mesmo pedido dá sempre o mesmo
// desenho). Nada aqui sabe da história: quem é quem vem do "elenco" do historia.json.
//
// jeito = { pele, roupa, roupaTipo: tunica|camisa|jaleco|terno|colete|listras, calca, chapeu:
//   nenhum|pele|quepe|aba|coque|bone|oficial|capacete|lenco, chapeuCor, cabelo: curto|careca|grisalho|
//   comprido|coque, cabeloCor, barba, bigode, oculos, gravata, faixa, gola, alt (altura, 1 = adulto) }
// estado = { cara: feliz|neutro|choque|preocupado|bravo|convencido|dorme|pensa|grita,
//   bracos: lado|cintura|alto|acena|aponta|joinha|segura|pensa|empurra|abana|martela|apoia,
//   objeto: prancheta|pergaminho|tigela|nota|barra|banana|leque|martelo|bandeira|livro|nenhum,
//   olho: 1 aberto | 0 fechado, quadro: 0|1 (braço que mexe), dourado, fuligem, gema, montado }

const W = 256, H = 512;
const TINTA = '#241726';

function cor(hex, k) { // clareia (k>0) ou escurece (k<0) um '#rrggbb'
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  r = f(r); g = f(g); b = f(b);
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// ---------- onde as mãos ficam em cada pose (x a partir do meio; y de cima para baixo) ----------
// [cotoveloEsq, mãoEsq, cotoveloDir, mãoDir]
function pose(bracos, quadro) {
  const q = quadro ? 1 : 0;
  switch (bracos) {
    case 'cintura': return [[-92, 300], [-50, 338], [92, 300], [50, 338]];
    case 'alto': return [[-86, 178], [-74 - 8 * q, 96], [86, 178], [74 + 8 * q, 96]];
    case 'acena': return [[-58, 300], [-60, 352], [96, 210], q ? [118, 120] : [80, 112]];
    case 'aponta': return [[-58, 300], [-60, 352], [98, 246], [146, 236]];
    case 'joinha': return [[-58, 300], [-60, 352], [94, 292], [98, 214]];
    case 'segura': return [[-74, 300], [-26, 318], [74, 300], [26, 318]];
    case 'pensa': return [[-70, 306], [-30, 330], [74, 296], [30, 218]];
    case 'empurra': return [[-30, 262], [62, 226], [96, 250], [140, 222]];
    case 'abana': return [[-58, 300], [-60, 352], [96, 262], q ? [124, 300] : [120, 200]];
    case 'martela': return [[-58, 300], [-60, 352], [98, 232], q ? [118, 286] : [104, 150]];
    case 'apoia': return [[-74, 300], [-30, 316], [92, 296], [52, 336]];
    default: return [[-60, 300], [-62, 358], [60, 300], [62, 358]];
  }
}

function contornar(c, larg) { c.lineWidth = larg; c.strokeStyle = TINTA; c.stroke(); }

function desenhaObjeto(c, nome, x, y, j) {
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  const caixa = (w, h, fundo, r = 4) => { c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, r); c.fillStyle = fundo; c.fill(); contornar(c, 5); };
  if (nome === 'prancheta') { caixa(52, 66, '#b9855a'); c.fillStyle = '#f6f1e2'; c.fillRect(-19, -24, 38, 46); c.fillStyle = TINTA; for (let i = 0; i < 4; i++) c.fillRect(-14, -16 + i * 10, 28, 3); }
  else if (nome === 'pergaminho') { caixa(36, 70, '#f1e2b8', 8); c.fillStyle = '#c9a76a'; c.fillRect(-20, -37, 40, 8); c.fillRect(-20, 29, 40, 8); }
  else if (nome === 'livro') { caixa(60, 46, '#8a3b2c'); c.fillStyle = '#f1e2b8'; c.fillRect(-26, -18, 52, 34); c.fillStyle = TINTA; c.fillRect(-2, -18, 4, 34); }
  else if (nome === 'tigela') { c.beginPath(); c.ellipse(0, 0, 40, 26, 0, 0, Math.PI); c.closePath(); c.fillStyle = '#6b4a8a'; c.fill(); contornar(c, 5); c.beginPath(); c.ellipse(0, 0, 40, 9, 0, 0, Math.PI * 2); c.fillStyle = '#ffd25a'; c.fill(); contornar(c, 4); }
  else if (nome === 'nota') { caixa(84, 42, '#9ccf86', 3); c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fillStyle = '#e8f4d8'; c.fill(); contornar(c, 3); c.fillStyle = TINTA; c.font = 'bold 18px sans-serif'; }
  else if (nome === 'barra') { c.rotate(-0.3); caixa(26, 62, '#6b3a22', 5); c.fillStyle = '#c9a07a'; c.fillRect(-11, -30, 22, 16); c.beginPath(); c.ellipse(4, 34, 7, 12, 0, 0, 7); c.fillStyle = '#6b3a22'; c.fill(); }
  else if (nome === 'banana') { c.beginPath(); c.arc(0, -40, 46, 0.6, 2.4); c.arc(0, -52, 50, 2.3, 0.7, true); c.closePath(); c.fillStyle = '#f2d43a'; c.fill(); contornar(c, 5); }
  else if (nome === 'leque') { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 46, -2.4, -0.7); c.closePath(); c.fillStyle = '#e8c070'; c.fill(); contornar(c, 5); }
  else if (nome === 'martelo') { c.fillStyle = '#9a6a3a'; c.fillRect(-4, -46, 8, 52); c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(-4, -46, 8, 52); caixa(40, 20, '#7d8a96', 3); c.translate(0, -46); caixa(40, 20, '#7d8a96', 3); }
  else if (nome === 'bandeira') { c.fillStyle = TINTA; c.fillRect(-3, -110, 6, 120); c.beginPath(); c.moveTo(3, -108); c.lineTo(70, -90); c.lineTo(3, -70); c.closePath(); c.fillStyle = j.objetoCor || '#c0352a'; c.fill(); contornar(c, 4); }
  c.restore();
}

// desenha o boneco inteiro numa tela 2D (já com o contorno e as cores chapadas)
export function desenhaBoneco(c, j, e) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const ouro = !!e.dourado;
  const pele = ouro ? '#f7d36a' : (j.pele || '#f2c9a0');
  const roupa = ouro ? '#f2c232' : (j.roupa || '#3f6fb5');
  const calca = ouro ? '#d9a520' : (j.calca || '#3d3a4a');
  const tipo = j.roupaTipo || 'tunica';
  const cx = W / 2;
  c.translate(cx, 0);
  const [ce, me, cd, md] = pose(e.bracos || 'lado', e.quadro);

  // ---- pernas (finas, ameixa) e pés ----
  const quadril = tipo === 'tunica' ? 420 : (tipo === 'jaleco' ? 392 : 360);
  if (!e.montado) {
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 20, quadril - 10); c.lineTo(s * 22, 492);
      c.strokeStyle = TINTA; c.lineWidth = tipo === 'camisa' || tipo === 'terno' || tipo === 'colete' || tipo === 'listras' ? 20 : 12; c.stroke();
      if (tipo !== 'tunica' && tipo !== 'jaleco') { c.strokeStyle = calca; c.lineWidth = 11; c.beginPath(); c.moveTo(s * 20, quadril - 10); c.lineTo(s * 22, 482); c.stroke(); }
      c.beginPath(); c.ellipse(s * 30, 496, 18, 9, 0, 0, 7); c.fillStyle = TINTA; c.fill();
    }
  }

  // ---- corpo ----
  const ombro = 238, barra = tipo === 'tunica' ? 438 : (tipo === 'jaleco' ? 404 : 368);
  const lo = 50, lb = tipo === 'tunica' ? 62 : 54;
  c.beginPath();
  c.moveTo(-lo, ombro + 14); c.quadraticCurveTo(-lo, ombro, -lo + 18, ombro - 4);
  c.lineTo(lo - 18, ombro - 4); c.quadraticCurveTo(lo, ombro, lo, ombro + 14);
  c.lineTo(lb, barra); c.quadraticCurveTo(0, barra + 8, -lb, barra); c.closePath();
  const corCorpo = tipo === 'jaleco' && !ouro ? '#f7f5ef' : roupa;
  c.fillStyle = corCorpo; c.fill();
  if (tipo === 'listras' && !ouro) { c.save(); c.clip(); c.fillStyle = j.listraCor || '#f4f1ea'; for (let y = ombro + 6; y < barra; y += 26) c.fillRect(-80, y, 160, 12); c.restore(); }
  if ((tipo === 'camisa' || tipo === 'jaleco' || tipo === 'terno' || tipo === 'colete') && !ouro) {
    // camisa / gola por baixo, gravata
    if (tipo === 'terno' || tipo === 'colete') { c.beginPath(); c.moveTo(-18, ombro - 4); c.lineTo(0, ombro + 70); c.lineTo(18, ombro - 4); c.closePath(); c.fillStyle = j.camisa || '#f7f5ef'; c.fill(); }
    if (tipo === 'jaleco') { c.beginPath(); c.moveTo(-20, ombro - 4); c.lineTo(0, ombro + 52); c.lineTo(20, ombro - 4); c.closePath(); c.fillStyle = j.camisa || '#dfe8f0'; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(0, ombro + 52); c.lineTo(0, barra - 4); c.stroke(); }
    if (j.gravata) { c.beginPath(); c.moveTo(-7, ombro + 2); c.lineTo(7, ombro + 2); c.lineTo(9, ombro + 70); c.lineTo(0, ombro + 82); c.lineTo(-9, ombro + 70); c.closePath(); c.fillStyle = j.gravata; c.fill(); c.lineWidth = 3; c.strokeStyle = TINTA; c.stroke(); }
  }
  if (tipo === 'tunica' && !ouro && j.gola !== false) { c.beginPath(); c.moveTo(-22, ombro - 4); c.lineTo(10, ombro + 120); c.lineWidth = 6; c.strokeStyle = cor(roupa, -0.3); c.stroke(); }
  if (j.faixa && !ouro) { c.save(); c.beginPath(); c.rect(-lb - 4, ombro, 2 * lb + 8, barra - ombro); c.clip(); c.beginPath(); c.moveTo(-60, ombro + 108); c.lineTo(60, ombro + 108); c.lineTo(60, ombro + 128); c.lineTo(-60, ombro + 128); c.closePath(); c.fillStyle = j.faixa; c.fill(); c.restore(); }
  c.beginPath();
  c.moveTo(-lo, ombro + 14); c.quadraticCurveTo(-lo, ombro, -lo + 18, ombro - 4);
  c.lineTo(lo - 18, ombro - 4); c.quadraticCurveTo(lo, ombro, lo, ombro + 14);
  c.lineTo(lb, barra); c.quadraticCurveTo(0, barra + 8, -lb, barra); c.closePath();
  contornar(c, 7);
  if (e.fuligem) { c.fillStyle = 'rgba(40,30,30,0.55)'; for (const [x, y, r] of [[-20, 300, 16], [24, 340, 12], [-30, 380, 10]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }

  // ---- braços (manga grossa com contorno) e mãos ----
  const manga = tipo === 'jaleco' && !ouro ? '#f7f5ef' : (tipo === 'colete' && !ouro ? (j.camisa || '#f7f5ef') : roupa);
  const ombros = [[-lo + 6, ombro + 10], [lo - 6, ombro + 10]];
  const bracos = [[ombros[0], ce, me], [ombros[1], cd, md]];
  for (const [o, co, mo] of bracos) {
    c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(co[0], co[1]); c.lineTo(mo[0], mo[1]);
    c.strokeStyle = TINTA; c.lineWidth = 26; c.stroke();
    c.strokeStyle = manga; c.lineWidth = 14; c.stroke();
  }
  // objeto na mão
  const obj = e.objeto && e.objeto !== 'nenhum' ? e.objeto : null;
  if (obj) {
    const [ox, oy] = (e.bracos === 'segura' || e.bracos === 'apoia') ? [0, 318] : md;
    desenhaObjeto(c, obj, ox, oy - (e.bracos === 'segura' ? 0 : 6), j);
  }
  for (const [, , mo] of bracos) {
    c.beginPath(); c.arc(mo[0], mo[1], 12, 0, 7); c.fillStyle = pele; c.fill(); contornar(c, 5);
  }
  if (e.bracos === 'joinha') { c.beginPath(); c.moveTo(md[0] + 2, md[1] - 8); c.lineTo(md[0] + 2, md[1] - 26); c.lineWidth = 14; c.strokeStyle = TINTA; c.stroke(); c.lineWidth = 7; c.strokeStyle = pele; c.stroke(); }

  // ---- cabeça ----
  const hy = 150, R = 76;
  // cabelo comprido / coque atrás da cabeça
  const cabCor = ouro ? '#e0a820' : (j.cabeloCor || '#2a2028');
  if (j.cabelo === 'comprido') { c.beginPath(); c.ellipse(0, hy + 30, R + 10, R + 30, 0, 0, 7); c.fillStyle = cabCor; c.fill(); contornar(c, 6); }
  c.beginPath(); c.arc(0, hy, R, 0, Math.PI * 2); c.fillStyle = pele; c.fill(); contornar(c, 7);
  if (e.fuligem) { c.fillStyle = 'rgba(40,30,30,0.6)'; for (const [x, y, r] of [[-40, 120, 18], [34, 176, 20], [10, 104, 13], [-30, 190, 12]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
  // cabelo de cima
  if (j.cabelo && j.cabelo !== 'careca' && j.cabelo !== 'comprido') {
    const cc = j.cabelo === 'grisalho' && !ouro ? '#9a9aa2' : cabCor;
    c.beginPath(); c.arc(0, hy, R, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(30, hy - 40, -10, hy - 34); c.quadraticCurveTo(-50, hy - 30, -R + 2, hy - 6); c.closePath();
    c.fillStyle = cc; c.fill(); contornar(c, 6);
    if (j.cabelo === 'coque') { c.beginPath(); c.arc(0, hy - R - 14, 24, 0, 7); c.fillStyle = cc; c.fill(); contornar(c, 6); }
  }
  // barba (embaixo da boca) e bigode
  const barbaCor = ouro ? '#c99a18' : (j.barba || null);
  if (barbaCor) { c.beginPath(); c.moveTo(-R + 14, hy + 22); c.quadraticCurveTo(-46, hy + 110, 0, hy + 128); c.quadraticCurveTo(46, hy + 110, R - 14, hy + 22); c.quadraticCurveTo(0, hy + 66, -R + 14, hy + 22); c.fillStyle = barbaCor; c.fill(); contornar(c, 5); }

  // ---- olhos ----
  const ex = 27, ey = hy - 4;
  const cara = e.cara || 'neutro';
  const fechado = e.olho === 0 || cara === 'dorme';
  for (const s of [-1, 1]) {
    if (fechado) { c.beginPath(); c.arc(s * ex, ey + 2, 13, 0.15 * Math.PI, 0.85 * Math.PI); contornar(c, 5); continue; }
    const grande = cara === 'choque' || cara === 'grita' ? 1.15 : 1;
    c.beginPath(); c.ellipse(s * ex, ey, 16 * grande, 20 * grande, 0, 0, 7); c.fillStyle = '#ffffff'; c.fill(); contornar(c, 4);
    const pr = cara === 'choque' ? 5 : 7;
    const olhaY = cara === 'pensa' ? -7 : 2;
    c.beginPath(); c.arc(s * ex + (cara === 'pensa' ? 4 : 0), ey + olhaY, pr, 0, 7); c.fillStyle = '#16101a'; c.fill();
    if (cara === 'convencido') { c.beginPath(); c.rect(s * ex - 18, ey - 24, 36, 18); c.fillStyle = pele; c.fill(); c.beginPath(); c.moveTo(s * ex - 17, ey - 6); c.lineTo(s * ex + 17, ey - 6); contornar(c, 4); }
  }
  if (j.oculos) { for (const s of [-1, 1]) { c.beginPath(); c.arc(s * ex, ey, 23, 0, 7); contornar(c, 4); } c.beginPath(); c.moveTo(-5, ey - 2); c.lineTo(5, ey - 2); contornar(c, 4); }
  // sobrancelhas
  // [altura do lado de dentro, altura do lado de fora] (positivo = mais baixo)
  const sob = { bravo: [8, -6], preocupado: [-8, 3], choque: [-10, -10], grita: [8, -6], pensa: [-6, -2] }[cara];
  if (sob) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * (ex - 14), ey - 32 + sob[0]); c.lineTo(s * (ex + 14), ey - 32 + sob[1]); contornar(c, 5); }

  // ---- boca ----
  const my = hy + 44;
  c.beginPath();
  if (cara === 'feliz') { c.arc(0, my - 10, 20, 0.15 * Math.PI, 0.85 * Math.PI); contornar(c, 5); }
  else if (cara === 'choque' || cara === 'grita') { c.ellipse(0, my + 2, cara === 'grita' ? 16 : 11, cara === 'grita' ? 18 : 15, 0, 0, 7); c.fillStyle = '#5a1f2a'; c.fill(); contornar(c, 4); }
  else if (cara === 'preocupado') { c.moveTo(-14, my + 4); c.quadraticCurveTo(-7, my - 4, 0, my + 2); c.quadraticCurveTo(7, my + 8, 14, my); contornar(c, 5); }
  else if (cara === 'bravo') { c.arc(0, my + 14, 16, 1.2 * Math.PI, 1.8 * Math.PI); contornar(c, 5); }
  else if (cara === 'convencido') { c.moveTo(-14, my); c.quadraticCurveTo(6, my + 10, 18, my - 6); contornar(c, 5); }
  else if (cara === 'dorme') { c.ellipse(0, my + 2, 7, 5, 0, 0, 7); contornar(c, 4); }
  else { c.moveTo(-10, my); c.lineTo(10, my); contornar(c, 5); }
  if (j.bigode || (barbaCor && j.bigode !== false)) {
    const bc = ouro ? '#c99a18' : (j.bigode || barbaCor);
    c.beginPath(); c.moveTo(0, my - 14); c.quadraticCurveTo(-20, my - 22, -34, my - 2); c.quadraticCurveTo(-18, my - 8, 0, my - 6); c.quadraticCurveTo(18, my - 8, 34, my - 2); c.quadraticCurveTo(20, my - 22, 0, my - 14);
    c.fillStyle = bc; c.fill(); contornar(c, 4);
  }
  if (e.gema) { c.fillStyle = '#ffffff'; for (const [x, y, r] of [[-34, 118, 26], [30, 180, 22], [24, 98, 18]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); contornar(c, 3); c.beginPath(); c.arc(x, y, r * 0.45, 0, 7); c.fillStyle = '#f5b324'; c.fill(); c.fillStyle = '#ffffff'; } }

  // ---- chapéu ----
  const ch = j.chapeu || 'nenhum', chc = ouro ? '#e8b51e' : (j.chapeuCor || '#c9a24a');
  c.beginPath();
  if (ch === 'pele') { // gorro de pele: copa colorida + barra peluda
    c.moveTo(-56, hy - 46); c.quadraticCurveTo(-50, hy - 118, 0, hy - 120); c.quadraticCurveTo(50, hy - 118, 56, hy - 46); c.closePath();
    c.fillStyle = j.chapeuTopo ? (ouro ? '#e8b51e' : j.chapeuTopo) : cor(chc, -0.25); c.fill(); contornar(c, 6);
    c.beginPath(); c.roundRect(-74, hy - 64, 148, 34, 16); c.fillStyle = chc; c.fill(); contornar(c, 6);
  } else if (ch === 'quepe' || ch === 'oficial') {
    c.moveTo(-60, hy - 52); c.quadraticCurveTo(-64, hy - 108, 0, hy - 112); c.quadraticCurveTo(64, hy - 108, 60, hy - 52); c.closePath(); c.fillStyle = chc; c.fill(); contornar(c, 6);
    c.beginPath(); c.ellipse(10, hy - 50, 70, 12, 0, 0, 7); c.fillStyle = ch === 'oficial' ? '#1e1a22' : cor(chc, -0.3); c.fill(); contornar(c, 5);
    if (ch === 'oficial') { c.beginPath(); c.arc(0, hy - 84, 9, 0, 7); c.fillStyle = '#f2c232'; c.fill(); contornar(c, 3); }
  } else if (ch === 'aba') { // chapéu de sol / de aba larga
    c.ellipse(0, hy - 56, 112, 22, 0, 0, 7); c.fillStyle = chc; c.fill(); contornar(c, 6);
    c.beginPath(); c.moveTo(-50, hy - 60); c.quadraticCurveTo(-46, hy - 118, 0, hy - 118); c.quadraticCurveTo(46, hy - 118, 50, hy - 60); c.closePath(); c.fillStyle = chc; c.fill(); contornar(c, 6);
    c.beginPath(); c.rect(-48, hy - 76, 96, 13); c.fillStyle = j.fitaCor || cor(chc, -0.35); c.fill();
  } else if (ch === 'bone') {
    c.arc(0, hy - 30, R - 4, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fillStyle = chc; c.fill(); contornar(c, 6);
    c.beginPath(); c.ellipse(52, hy - 44, 44, 11, 0, 0, 7); c.fillStyle = chc; c.fill(); contornar(c, 5);
  } else if (ch === 'capacete') {
    c.arc(0, hy - 24, R + 4, Math.PI, 0); c.closePath(); c.fillStyle = chc; c.fill(); contornar(c, 6);
    c.beginPath(); c.ellipse(0, hy - 24, R + 18, 10, 0, 0, 7); c.fill(); contornar(c, 5);
  } else if (ch === 'lenco') {
    c.arc(0, hy - 16, R + 2, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fillStyle = chc; c.fill(); contornar(c, 6);
  } else if (ch === 'coque') {
    c.arc(0, hy - R - 16, 22, 0, 7); c.fillStyle = cabCor; c.fill(); contornar(c, 6);
    c.beginPath(); c.rect(-14, hy - R - 8, 28, 10); c.fillStyle = chc; c.fill(); contornar(c, 4);
  } else if (ch === 'cartola') {
    c.rect(-46, hy - 150, 92, 96); c.fillStyle = chc; c.fill(); contornar(c, 6);
    c.beginPath(); c.ellipse(0, hy - 56, 80, 14, 0, 0, 7); c.fill(); contornar(c, 5);
  }
}

// ---------- fábrica de texturas (cada desenho é feito uma vez e guardado) ----------
export function criarAtelie(THREE) {
  const guardadas = new Map();
  function textura(jeito, idJeito, e) {
    const chave = idJeito + '|' + [e.cara, e.bracos, e.objeto, e.olho, e.quadro, e.dourado ? 1 : 0, e.fuligem ? 1 : 0, e.gema ? 1 : 0, e.montado ? 1 : 0].join(',');
    let tx = guardadas.get(chave);
    if (!tx) {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      desenhaBoneco(cv.getContext('2d'), jeito, e);
      tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace;
      tx.minFilter = THREE.LinearMipmapLinearFilter; tx.anisotropy = 4;
      guardadas.set(chave, tx);
    }
    return tx;
  }
  return { textura, W, H };
}
