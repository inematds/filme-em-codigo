// pecas.js — o catálogo do estúdio: textura de metal escovado, o "estúdio" que o metal reflete,
// as peças do produto (todas feitas girando um perfil, como num torno) e as mãos de manequim.
// Nada aqui sabe da história além das medidas que o motor passa. Tudo é conta: mesma semente, mesma peça.
import * as THREE from '../../../vendor/three/three.module.js';

// ---------- metal escovado: uma faixa de riscos finos (cada linha da imagem é um risco) ----------
// Nas peças de torno, o "v" da textura corre ao longo do perfil e o "u" dá a volta: os riscos viram
// círculos em volta do centro, como o alumínio escovado na máquina.
export function texturaEscovado(acaso, linhas = 2048) {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = linhas;
  const x = cv.getContext('2d');
  let v = 0.5;
  for (let i = 0; i < linhas; i++) {
    v = 0.82 * v + 0.18 * acaso();                       // riscos vizinhos parecidos (escova larga)
    const fino = acaso();                                // e um risco fino por cima
    const g = Math.round(255 * Math.min(1, Math.max(0, 0.35 + 0.45 * v + 0.25 * (fino - 0.5))));
    x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(0, i, 32, 1);
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter;
  return tx;
}

// ---------- o estúdio que o metal reflete: sala azul-escura com softboxes ----------
export function ambienteEstudio(render) {
  const cena = new THREE.Scene();
  const sala = new THREE.Mesh(new THREE.BoxGeometry(40, 24, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.02, 0.05), side: THREE.BackSide }));
  sala.position.y = 6; cena.add(sala);
  const painel = (w, h, cor, forca, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); cena.add(m);
  };
  painel(14, 10, '#f2f5ff', 4.0, 0, 17, 2, Math.PI / 2, 0);        // softbox grande em cima
  painel(3, 14, '#dfe8ff', 3.2, -15, 6, 4, 0, Math.PI / 2);         // tira alta à esquerda
  painel(3, 14, '#dfe8ff', 2.4, 15, 6, -3, 0, -Math.PI / 2);        // tira alta à direita
  painel(30, 8, '#3a5ea8', 0.9, 0, 3, -19, 0, 0);                   // fundo azul
  painel(30, 5, '#2a3f70', 0.6, 0, 2, 19, 0, Math.PI);              // atrás da câmera, azul fraco
  const pm = new THREE.PMREMGenerator(render);
  const rt = pm.fromScene(cena, 0.02);
  pm.dispose();
  return rt.texture;
}

// ---------- peças de torno ----------
// perfil: lista de [raio, altura]; "passo" reamostra o perfil em pontos iguais (o "v" da textura fica proporcional ao comprimento)
export function torno(perfil, lados = 128, passo = 0.01) {
  const pts = [];
  for (let i = 0; i < perfil.length - 1; i++) {
    const [r0, y0] = perfil[i], [r1, y1] = perfil[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, y1 - y0) / passo));
    for (let k = 0; k < n; k++) pts.push(new THREE.Vector2(r0 + (r1 - r0) * k / n, y0 + (y1 - y0) * k / n));
  }
  pts.push(new THREE.Vector2(...perfil[perfil.length - 1]));
  return new THREE.LatheGeometry(pts, lados);
}

// canto arredondado entre dois trechos retos: devolve pontos de um quarto de círculo
export function canto(cx, cy, r, a0, a1, n = 6) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}

// ---------- mão de manequim (desenho próprio): palma oval, dedos de cápsula com duas falanges ----------
// Eixos da mão: dedos para -z, costas da mão para +y, polegar para -x (mão direita) ou +x (esquerda).
// dobra: quanto cada dedo se fecha (0 = esticado); abre: quanto os dedos se afastam.
export function mao(mat, { direita = true, dobra = [0, 0, 0, 0], polegar = 0.3, abre = 0.08, antebraco = 1.6 } = {}) {
  const raiz = new THREE.Group();
  const s = direita ? -1 : 1;                                  // lado do polegar
  const m = (g) => { const x = new THREE.Mesh(g, mat); x.castShadow = true; x.receiveShadow = true; return x; };
  const palma = m(new THREE.SphereGeometry(1, 28, 18)); palma.scale.set(0.34, 0.12, 0.4); raiz.add(palma);
  const pulso = m(new THREE.CapsuleGeometry(0.15, antebraco, 6, 16)); pulso.rotation.x = Math.PI / 2; pulso.scale.set(1, 1, 0.75);
  pulso.position.set(0, 0.02, 0.3 + antebraco / 2); raiz.add(pulso);
  const falange = (r, c) => { const g = new THREE.CapsuleGeometry(r, c, 4, 12); g.translate(0, c / 2 + r * 0.4, 0); g.rotateX(-Math.PI / 2); return g; };
  const dedos = [];
  const cfg = [[-0.2, 0.2, 0.052], [-0.07, 0.23, 0.055], [0.07, 0.22, 0.053], [0.2, 0.17, 0.046]];
  cfg.forEach(([x, c, r], i) => {
    const base = new THREE.Group(); base.position.set(-s * x, 0.0, -0.33 + Math.abs(x) * 0.25); base.rotation.y = s * x * abre * 4;
    base.rotation.x = -dobra[i] * 0.9; raiz.add(base);
    base.add(m(falange(r, c * 0.55)));
    const ponta = new THREE.Group(); ponta.position.z = -(c * 0.55 + r * 0.9); ponta.rotation.x = -dobra[i] * 1.1; base.add(ponta);
    ponta.add(m(falange(r * 0.92, c * 0.45)));
    dedos.push(base);
  });
  const pol = new THREE.Group(); pol.position.set(s * 0.27, -0.03, -0.02); pol.rotation.set(-0.2, s * (0.9 - polegar), s * 0.3); raiz.add(pol);
  pol.add(m(falange(0.06, 0.16)));
  const polP = new THREE.Group(); polP.position.z = -0.23; polP.rotation.y = s * -polegar * 0.8; pol.add(polP);
  polP.add(m(falange(0.055, 0.12)));
  return raiz;
}

// ---------- lápis: corpo de seis lados, ponta de madeira e grafite; a ponta fica na origem e ele sobe em +y ----------
export function lapis(corCorpo, comp = 1.1) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, comp, 6), new THREE.MeshStandardMaterial({ color: corCorpo, roughness: 0.45, metalness: 0.1 }));
  corpo.position.y = 0.16 + comp / 2; corpo.castShadow = true; g.add(corpo);
  const mad = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.012, 0.13, 12), new THREE.MeshStandardMaterial({ color: '#d9b98c', roughness: 0.8 }));
  mad.position.y = 0.095; mad.castShadow = true; g.add(mad);
  const graf = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.002, 0.03, 8), new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.5 }));
  graf.position.y = 0.015; g.add(graf);
  return g;
}

// ---------- traço do lápis no papel: uma fita fina; o motor só mostra o pedaço já desenhado ----------
// ponto(k) devolve [x, z] para k de 0 a 1
export function fita(ponto, n, larg, y) {
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const [x, z] = ponto(i / n), [xa, za] = ponto(Math.max(0, i - 1) / n), [xb, zb] = ponto(Math.min(n, i + 1) / n);
    let dx = xb - xa, dz = zb - za; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    pos.push(x - dz * larg / 2, y, z + dx * larg / 2, x + dz * larg / 2, y, z - dx * larg / 2);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
