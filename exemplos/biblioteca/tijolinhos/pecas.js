// pecas.js — o catálogo de peças de brinquedo genéricas (sem marca, sem logotipo).
// Tudo medido em "pinos": 1 unidade = a distância entre dois pinos. Tijolo = 1,2 de altura, placa = 0,4.
// Cada peça nasce com a base no chão (y = 0) e o centro no meio do pé. Os pinos são lisos (sem letras).
// Nada aqui sabe da história.
import * as THREE from '../../../vendor/three/three.module.js';

export const ALT = { tijolo: 1.2, placa: 0.4 };
const FOLGA = 0.04;      // a frestinha entre duas peças vizinhas
const PINO_R = 0.3, PINO_A = 0.17;

// caixa com as quinas arredondadas (a quina pega o brilho da luz: é ela que faz parecer plástico)
export function caixaRedonda(w, h, d, r) {
  const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
  const p = g.attributes.position, n = g.attributes.normal;
  const meio = [w / 2, h / 2, d / 2], q = [0, 0, 0], dentro = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    q[0] = p.getX(i); q[1] = p.getY(i); q[2] = p.getZ(i);
    for (let k = 0; k < 3; k++) {
      const a = Math.abs(q[k]);
      if (a > 1e-6 && a < meio[k] * 0.99) q[k] = Math.sign(q[k]) * (meio[k] - r); // a linha do meio vira o começo da curva
      dentro[k] = Math.max(-(meio[k] - r), Math.min(meio[k] - r, q[k]));
    }
    const dx = q[0] - dentro[0], dy = q[1] - dentro[1], dz = q[2] - dentro[2], l = Math.hypot(dx, dy, dz);
    if (l > 1e-6) {
      p.setXYZ(i, dentro[0] + dx / l * r, dentro[1] + dy / l * r, dentro[2] + dz / l * r);
      n.setXYZ(i, dx / l, dy / l, dz / l);
    }
  }
  return g;
}

// junta várias geometrias numa só (posição, normal, uv e índice)
export function junta(lista) {
  let nv = 0, ni = 0;
  for (const g of lista) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of lista) {
    pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, ov * 2);
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx[oi + i] = ix[i] + ov;
    ov += g.attributes.position.count; oi += ix.length;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  r.setIndex(new THREE.BufferAttribute(idx, 1));
  return r;
}

const pino = (x, y, z, r = PINO_R) => { const g = new THREE.CylinderGeometry(r, r, PINO_A, 14, 1); g.translate(x, y + PINO_A / 2, z); return g; };
function pinos(W, D, y) {
  const l = [];
  for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) l.push(pino(i - (W - 1) / 2, y, j - (D - 1) / 2));
  return l;
}

// rampa (telhado): fileira de trás alta com pinos, e a rampa descendo para +z
function rampa(W, D) {
  const H = ALT.tijolo, base = 0.34, w = W - FOLGA, z0 = -D / 2 + FOLGA / 2, z1 = D / 2 - FOLGA / 2, zm = z0 + 1;
  const partes = [];
  const pe = caixaRedonda(w, base, D - FOLGA, 0.04); pe.translate(0, base / 2, 0); partes.push(pe);
  const costas = caixaRedonda(w, H - 0.01, 1 - FOLGA / 2, 0.05); costas.translate(0, (H - 0.01) / 2, z0 + (1 - FOLGA / 2) / 2); partes.push(costas);
  // a cunha: face inclinada + dois triângulos dos lados
  const x0 = -w / 2, x1 = w / 2, yA = H - 0.01, yB = base;
  const ny = (z1 - zm), nz = (yA - yB), nl = Math.hypot(ny, nz);
  const P = [
    x0, yA, zm, x1, yA, zm, x1, yB, z1, x0, yB, z1,          // rampa
    x0, yB, zm, x0, yA, zm, x0, yB, z1,                      // lado esquerdo
    x1, yB, zm, x1, yB, z1, x1, yA, zm,                      // lado direito
  ];
  const N = [0, ny / nl, nz / nl, 0, ny / nl, nz / nl, 0, ny / nl, nz / nl, 0, ny / nl, nz / nl, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
  const UV = [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1];
  const cunha = new THREE.BufferGeometry();
  cunha.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  cunha.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  cunha.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  cunha.setIndex([0, 3, 2, 0, 2, 1, 4, 6, 5, 7, 9, 8]);
  partes.push(cunha);
  for (let i = 0; i < W; i++) partes.push(pino(i - (W - 1) / 2, H - 0.01, z0 + 0.5));
  return junta(partes);
}

// redondo 1x1 (ou 2x2) de altura h, com pino em cima
function redondo(raio, h, comPino = true) {
  const c = new THREE.CylinderGeometry(raio - FOLGA / 2, raio - FOLGA / 2, h - 0.01, 22, 1); c.translate(0, (h - 0.01) / 2, 0);
  const l = [c]; if (comPino) l.push(pino(0, h - 0.01, 0, Math.min(PINO_R, raio * 0.62)));
  return junta(l);
}

// O CATÁLOGO: nome → geometria. "t2x4" = tijolo 2x4, "p2x2" = placa, "l1x4" = lisa (sem pino), "r2x2" = rampa...
const cache = new Map();
export function geometria(nome) {
  if (cache.has(nome)) return cache.get(nome);
  let g;
  const m = /^([tplm])(\d+)x(\d+)$/.exec(nome); // m = tijolo liso (sem pino), l = placa lisa
  if (m) {
    const alto = m[1] === 't' || m[1] === 'm', W = Number(m[2]), D = Number(m[3]), H = alto ? ALT.tijolo : ALT.placa;
    const corpo = caixaRedonda(W - FOLGA, H - 0.01, D - FOLGA, alto ? 0.06 : 0.045); corpo.translate(0, (H - 0.01) / 2, 0);
    g = (m[1] === 'l' || m[1] === 'm') ? corpo : junta([corpo, ...pinos(W, D, H - 0.01)]);
  } else if (/^r\d+x\d+$/.test(nome)) {
    const [W, D] = nome.slice(1).split('x').map(Number); g = rampa(W, D);
  } else if (nome === 'red1') g = redondo(0.5, ALT.tijolo);
  else if (nome === 'red2') g = redondo(1.0, ALT.tijolo);
  else if (nome === 'redp1') g = redondo(0.5, ALT.placa);
  else if (nome === 'cone1') {
    const c = new THREE.CylinderGeometry(0.16, 0.48, ALT.tijolo - 0.15, 22, 1); c.translate(0, (ALT.tijolo - 0.15) / 2, 0);
    const ponta = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12, 1); ponta.translate(0, ALT.tijolo - 0.15 + 0.12, 0);
    g = junta([c, ponta]);
  } else if (nome === 'haste') { g = new THREE.CylinderGeometry(0.16, 0.16, 1, 10, 1); g.translate(0, 0.5, 0); }
  else if (nome === 'bola') g = new THREE.SphereGeometry(0.36, 16, 10);
  else if (nome === 'olho') g = new THREE.SphereGeometry(0.075, 10, 6);
  else if (nome === 'cabeca') { const c = caixaRedonda(1.1, 1.0, 1.0, 0.3); c.translate(0, 0.5, 0); g = junta([c, pino(0, 0.99, 0, 0.26)]); }
  else if (nome === 'corpo') { const c = new THREE.CylinderGeometry(0.6, 0.86, 1.45, 4, 1); c.rotateY(Math.PI / 4); c.translate(0, 0.725, 0); g = c.toNonIndexed(); g.computeVertexNormals(); const ix = []; for (let i = 0; i < g.attributes.position.count; i++) ix.push(i); g.setIndex(ix); }
  else if (nome === 'braco') { const c = caixaRedonda(0.26, 0.8, 0.3, 0.1); c.translate(0, -0.4, 0); g = c; }
  else if (nome === 'mao') { g = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10, 1); g.translate(0, -0.95, 0); }
  else throw new Error('peça desconhecida: ' + nome);
  cache.set(nome, g);
  return g;
}

// tamanho do pé de cada peça (para a pilha não encavalar)
export function pe(nome) {
  const m = /^[tplmr](\d+)x(\d+)$/.exec(nome);
  if (m) return [Number(m[1]), Number(m[2])];
  if (nome === 'red2') return [2, 2];
  return [1, 1];
}
export function altura(nome) {
  if (/^[pl]/.test(nome) || nome === 'redp1') return ALT.placa;
  return ALT.tijolo;
}

// ---------- texturas feitas uma vez, com sorteio de semente fixa ----------
// arranhões finos, digitais e poeira: o plástico "usado" de quem brinca
export function texturaUso(sorteio) {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgb(255,255,255)'; x.fillRect(0, 0, S, S);
  const r = sorteio;
  // manchas de leve diferença de tom (a peça não é 100% lisa)
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${0.012 + r() * 0.02})`; x.beginPath(); x.ellipse(r() * S, r() * S, 20 + r() * 60, 20 + r() * 60, r() * 3, 0, 6.3); x.fill(); }
  // poeira
  for (let i = 0; i < 260; i++) { x.fillStyle = r() < 0.5 ? `rgba(255,255,255,0.9)` : `rgba(60,50,40,${0.25 + r() * 0.3})`; x.fillRect(r() * S, r() * S, 1 + r() * 1.6, 1 + r() * 1.6); }
  const cor = new THREE.CanvasTexture(cv); cor.colorSpace = THREE.SRGBColorSpace;
  // aspereza: base lisa, arranhões e digitais mais foscos
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = S;
  const y = cv2.getContext('2d');
  y.fillStyle = 'rgb(70,70,70)'; y.fillRect(0, 0, S, S);
  y.lineCap = 'round';
  for (let i = 0; i < 70; i++) { // arranhões finos
    const a = r() * 6.28, l = 10 + r() * 70, x0 = r() * S, y0 = r() * S;
    y.strokeStyle = `rgba(200,200,200,${0.25 + r() * 0.4})`; y.lineWidth = 0.6 + r() * 0.8;
    y.beginPath(); y.moveTo(x0, y0); y.quadraticCurveTo(x0 + Math.cos(a + 0.3) * l * 0.5, y0 + Math.sin(a + 0.3) * l * 0.5, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); y.stroke();
  }
  for (let i = 0; i < 5; i++) { // digitais: arcos concêntricos
    const cx = r() * S, cy = r() * S, rot = r() * 3;
    for (let k = 0; k < 9; k++) { y.strokeStyle = 'rgba(170,170,170,0.18)'; y.lineWidth = 1.1; y.beginPath(); y.ellipse(cx, cy, 6 + k * 3.2, 9 + k * 3.6, rot, 0.2, 5.6); y.stroke(); }
  }
  const asp = new THREE.CanvasTexture(cv2); asp.colorSpace = THREE.NoColorSpace;
  return { cor, asp };
}

// veio da madeira da mesa
export function texturaMadeira(sorteio, base, veio) {
  const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), r = sorteio;
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  const tabuas = 4;
  for (let t = 0; t < tabuas; t++) {
    const y0 = t * H / tabuas, hh = H / tabuas;
    x.fillStyle = `rgba(${r() < 0.5 ? '255,220,180' : '40,20,10'},${0.04 + r() * 0.06})`; x.fillRect(0, y0, W, hh);
    for (let i = 0; i < 46; i++) {
      const yy = y0 + r() * hh, a = 1 + r() * 3, f = 0.004 + r() * 0.01, ph = r() * 6;
      x.strokeStyle = veio; x.globalAlpha = 0.08 + r() * 0.2; x.lineWidth = 0.6 + r() * 2.2;
      x.beginPath();
      for (let px = 0; px <= W; px += 16) { const py = yy + a * Math.sin(px * f + ph) + 0.6 * a * Math.sin(px * f * 3.1 + ph * 2); px ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    x.globalAlpha = 0.5; x.fillStyle = veio; x.fillRect(0, y0, W, 2); x.globalAlpha = 1;
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4;
  return tx;
}

// o "estúdio" que o plástico reflete: caixa escura com softbox grande em cima e uma janela quente
export function ambienteEstudio(render) {
  const cena = new THREE.Scene();
  const sala = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.10, 0.085, 0.07), side: THREE.BackSide }));
  sala.position.y = 10; cena.add(sala);
  const painel = (w, h, cor, forca, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); cena.add(m);
  };
  painel(22, 14, '#fff4e6', 5.0, -6, 22, 10, Math.PI / 2, 0);    // softbox grande em cima, um pouco à frente
  painel(10, 16, '#ffd9a8', 3.2, -26, 10, 8, 0, Math.PI / 2);    // janela quente à esquerda
  painel(8, 12, '#cfe0ff', 1.4, 26, 9, -4, 0, -Math.PI / 2);     // rebatedor frio à direita
  painel(40, 6, '#bfe0ff', 0.9, 0, 6, -28, 0, 0);                // a parede azul atrás
  const pm = new THREE.PMREMGenerator(render);
  const rt = pm.fromScene(cena, 0.02);
  pm.dispose();
  return rt.texture;
}
