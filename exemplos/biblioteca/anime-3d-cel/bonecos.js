// bonecos.js — a menina, o cachorro e o mosquete, feitos de esferas, cápsulas e caixas.
// Desenho próprio (não copia personagem de ninguém): proporção "chibi", cabeça grande, um casaco de
// cor quente contra a cena fria. Cada peça leva a casca de contorno azul-marinho.
// Aqui só se MONTA o boneco. Quem diz a pose em cada tempo é o motor (lendo a história).
import * as THREE from '../../../vendor/three/three.module.js';

export function criarBonecos(M, C) {
  // uma peça = malha cel + casca de contorno (as duas com a mesma geometria, centrada na origem)
  function peca(geo, hex, o = {}) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, M.cel(hex, o.mat || {})); g.add(m);
    if (o.contorno !== false) { const c = new THREE.Mesh(geo, M.contorno); g.add(c); }
    if (o.p) g.position.set(...o.p);
    if (o.r) g.rotation.set(...o.r);
    if (o.s) g.scale.set(...o.s);
    return g;
  }
  const esfera = (r, seg = 20) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
  const capsula = (r, comp) => new THREE.CapsuleGeometry(r, comp, 6, 14);
  const caixa = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  // ---------- a menina (olha para +z, pés em y = 0, 1 unidade de altura) ----------
  function menina() {
    const raiz = new THREE.Group();          // lugar e giro
    const corpo = new THREE.Group(); raiz.add(corpo);   // inclina a partir dos pés; amassa e estica
    for (const sx of [-1, 1]) corpo.add(peca(esfera(0.07, 14), C.bota, { p: [sx * 0.08, 0.06, 0.02], s: [1, 0.8, 1.35] }));
    const pernas = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(sx * 0.08, 0.12, 0); corpo.add(g); return g; });
    corpo.add(peca(new THREE.CylinderGeometry(0.12, 0.25, 0.42, 22, 1), C.casaco, { p: [0, 0.32, 0] }));
    corpo.add(peca(new THREE.CylinderGeometry(0.255, 0.26, 0.05, 22, 1), C.peloClaro, { p: [0, 0.12, 0] }));
    corpo.add(peca(new THREE.TorusGeometry(0.115, 0.05, 10, 20), C.cachecol, { p: [0, 0.53, 0], r: [Math.PI / 2, 0, 0] }));
    const ponta = new THREE.Group(); ponta.position.set(0.06, 0.53, -0.1); corpo.add(ponta);  // a ponta do cachecol que balança
    ponta.add(peca(caixa(0.075, 0.22, 0.03), C.cachecol, { p: [0, -0.1, 0] }));
    const cabeca = new THREE.Group(); cabeca.position.set(0, 0.62, 0); corpo.add(cabeca);
    const rostoY = 0.24;
    cabeca.add(peca(esfera(0.22, 24), C.pele, { p: [0, rostoY, 0] }));
    cabeca.add(peca(new THREE.SphereGeometry(0.235, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), C.cabelo, { p: [0, rostoY, 0], r: [-0.55, 0, 0] }));
    for (const sx of [-1, 1]) {
      cabeca.add(peca(esfera(0.034, 10), C.tinta, { p: [sx * 0.078, rostoY + 0.0, 0.198], s: [1, 1.35, 0.6], contorno: false }));
      cabeca.add(peca(esfera(0.028, 8), C.bochecha, { p: [sx * 0.125, rostoY - 0.06, 0.17], s: [1.3, 0.7, 0.5], contorno: false }));
    }
    const trancas = [-1, 1].map((sx) => {
      const g = new THREE.Group(); g.position.set(sx * 0.16, rostoY - 0.02, -0.1); cabeca.add(g);
      for (let i = 0; i < 3; i++) g.add(peca(esfera(0.055, 12), C.cabelo, { p: [0, -0.06 - i * 0.075, 0] }));
      g.add(peca(esfera(0.04, 10), C.cachecol, { p: [0, -0.3, 0] }));
      return g;
    });
    const bracos = [-1, 1].map((sx) => {
      const g = new THREE.Group(); g.position.set(sx * 0.15, 0.47, 0); corpo.add(g);
      g.add(peca(capsula(0.05, 0.14), C.casaco, { p: [0, -0.1, 0] }));
      g.add(peca(esfera(0.047, 12), C.pele, { p: [0, -0.22, 0] }));
      return g;
    });
    // a lanterna na mão direita (lado -x quando ela olha para +z)
    const lant = new THREE.Group(); lant.position.set(0, -0.3, 0.02); bracos[0].add(lant);
    lant.add(peca(caixa(0.012, 0.07, 0.012), C.ferro, { p: [0, 0.045, 0], contorno: false }));
    lant.add(peca(caixa(0.1, 0.022, 0.1), C.ferro, { p: [0, 0.005, 0] }));
    lant.add(peca(caixa(0.075, 0.1, 0.075), C.lanterna, { p: [0, -0.06, 0], mat: { proprio: 0.75 } }));
    lant.add(peca(caixa(0.1, 0.022, 0.1), C.ferro, { p: [0, -0.12, 0] }));
    const luz = new THREE.Object3D(); luz.position.set(0, -0.06, 0); lant.add(luz);
    return { raiz, corpo, cabeca, ponta, trancas, bracos, pernas, lant, luz };
  }

  // ---------- o cachorro (olha para +z, patas em y = 0) ----------
  function cachorro() {
    const raiz = new THREE.Group();
    const corpo = new THREE.Group(); corpo.position.y = 0.28; raiz.add(corpo);
    corpo.add(peca(capsula(0.13, 0.26), C.pelo, { r: [Math.PI / 2, 0, 0] }));
    corpo.add(peca(esfera(0.1, 14), C.peloClaro, { p: [0, -0.02, 0.14], s: [1, 1, 0.8] }));
    const cabeca = new THREE.Group(); cabeca.position.set(0, 0.1, 0.2); corpo.add(cabeca);
    cabeca.add(peca(esfera(0.13, 18), C.pelo, { p: [0, 0.07, 0.04] }));
    cabeca.add(peca(esfera(0.07, 14), C.peloClaro, { p: [0, 0.02, 0.16], s: [1, 0.8, 1.25] }));
    cabeca.add(peca(esfera(0.026, 8), C.tinta, { p: [0, 0.05, 0.25], contorno: false }));
    for (const sx of [-1, 1]) {
      cabeca.add(peca(new THREE.ConeGeometry(0.05, 0.11, 10), C.pelo, { p: [sx * 0.08, 0.2, 0.02], r: [0, 0, -sx * 0.25] }));
      cabeca.add(peca(esfera(0.022, 8), C.tinta, { p: [sx * 0.055, 0.1, 0.15], s: [1, 1.3, 0.6], contorno: false }));
    }
    const pernas = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const g = new THREE.Group(); g.position.set(sx * 0.075, -0.05, sz * 0.13); corpo.add(g);
      g.add(peca(capsula(0.038, 0.13), C.pelo, { p: [0, -0.1, 0] }));
      pernas.push(g);
    }
    const cauda = new THREE.Group(); cauda.position.set(0, 0.07, -0.2); corpo.add(cauda);
    cauda.add(peca(new THREE.ConeGeometry(0.04, 0.2, 8), C.pelo, { p: [0, 0.09, 0] }));
    return { raiz, corpo, cabeca, pernas, cauda };
  }

  // ---------- o mosquete velho com baioneta (ao longo de +z) ----------
  function mosquete() {
    const raiz = new THREE.Group();
    raiz.add(peca(caixa(0.05, 0.075, 0.34), C.madeira, { p: [0, 0, 0.17] }));
    raiz.add(peca(new THREE.CylinderGeometry(0.016, 0.016, 0.68, 8), C.ferro, { p: [0, 0.02, 0.66], r: [Math.PI / 2, 0, 0] }));
    raiz.add(peca(new THREE.ConeGeometry(0.014, 0.26, 6), C.metal, { p: [0, 0.03, 1.12], r: [Math.PI / 2, 0, 0] }));
    const ponta = new THREE.Object3D(); ponta.position.set(0, 0.03, 1.22); raiz.add(ponta);
    return { raiz, ponta };
  }

  return { menina, cachorro, mosquete, peca, esfera, caixa };
}
