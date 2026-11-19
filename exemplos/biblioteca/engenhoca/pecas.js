// pecas.js — as peças do motor engenhoca, montadas com formas simples da three.js.
// Quarto de poucos polígonos, o boneco sem rosto (com articulações), e as engenhocas de cano
// amarelo com braçadeira cinza: ímã no barbante, cão-robô, esteira, botão, satélite.
// Aqui só se CONSTRÓI. Quem mexe nas peças no tempo é o motor.js. Nada aqui sabe da história:
// cores e medidas chegam de fora. Sorteio só com semente (o mesmo pedido dá sempre a mesma peça).
import * as THREE from '../../../vendor/three/three.module.js';

const EIXO_Y = new THREE.Vector3(0, 1, 0);

// ---------- materiais (um por cor, guardados) ----------
export function criarMateriais() {
  const guarda = new Map();
  const mat = (cor, o = {}) => {
    const k = cor + JSON.stringify(o);
    if (guarda.has(k)) return guarda.get(k);
    let m;
    if (o.brilha) m = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    else m = new THREE.MeshStandardMaterial({ color: cor, roughness: o.aspero ?? 0.75, metalness: o.metal ?? 0, flatShading: o.chapado ?? true });
    guarda.set(k, m); return m;
  };
  return mat;
}

const sombra = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
const em = (m, x, y, z) => { sombra(m); m.position.set(x, y, z); return m; };

// caixa, bola, cano: formas soltas já com sombra
export const caixa = (m, w, h, d, x = 0, y = 0, z = 0) => { const o = sombra(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); o.position.set(x, y, z); return o; };
export const bola = (m, r, x = 0, y = 0, z = 0, seg = 12) => { const o = sombra(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), m)); o.position.set(x, y, z); return o; };
export const capsula = (m, r, comp, y = 0, seg = 10) => { const o = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(r, comp, 4, seg), m)); o.position.y = y; return o; };

// cano entre dois pontos (o "tubo amarelo" de toda engenhoca)
const CILINDRO = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
export function cano(m, a, b, r = 0.03) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const o = sombra(new THREE.Mesh(CILINDRO, m));
  o.scale.set(r, d.length(), r);
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(EIXO_Y, d.normalize());
  return o;
}

// uma "peça de montar": grupo com um pivô, que o motor faz pular para o lugar
function montavel(lista, ...malhas) {
  const g = new THREE.Group(); malhas.forEach((m) => g.add(m)); lista.push(g); return g;
}
// junta as peças num grupo e devolve a lista em ordem de montagem
function poeNo(pai, lista, base) { for (const g of lista.slice(base)) pai.add(g); }

// ---------- quarto ----------
export function criarQuarto(cena, Q, C, mat, acaso) {
  const g = new THREE.Group(); cena.add(g);
  const [x0, x1] = Q.paredes.x, zf = Q.paredes.fundo, alt = Q.paredes.altura;
  // chão de tábuas: textura feita aqui, com sorteio de semente
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const c = cv.getContext('2d');
  const tabuas = 8;
  for (let i = 0; i < tabuas; i++) {
    const k = acaso();
    c.fillStyle = Filme.cor(C.madeira, C.madeiraEscura, 0.15 + 0.5 * k);
    c.fillRect(0, i * 64, 512, 64);
    c.fillStyle = Filme.cor(C.madeiraEscura, C.madeiraEscura, 0, 0.55);
    c.fillRect(0, i * 64, 512, 3);
    const corte = Math.floor(acaso() * 400) + 50;
    c.fillRect(corte, i * 64, 3, 64);
    for (let v = 0; v < 6; v++) { c.fillStyle = Filme.cor(C.madeiraEscura, C.madeiraEscura, 0, 0.12); c.fillRect(0, i * 64 + 8 + acaso() * 50, 512, 2); }
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.repeat.set((x1 - x0) / 2.4, 6 / 2.4); tx.anisotropy = 4;
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 12), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 }));
  chao.rotation.x = -Math.PI / 2; chao.position.set((x0 + x1) / 2, 0, zf + 6); chao.receiveShadow = true; g.add(chao);

  // três paredes cinzas, rodapé branco
  const mP = mat(C.parede), mR = mat(C.rodape);
  const fundo = caixa(mP, x1 - x0, alt, 0.1, (x0 + x1) / 2, alt / 2, zf - 0.05); g.add(fundo);
  g.add(caixa(mP, 0.1, alt, 12, x0 - 0.05, alt / 2, zf + 6));
  g.add(caixa(mP, 0.1, alt, 12, x1 + 0.05, alt / 2, zf + 6));
  g.add(caixa(mR, x1 - x0, 0.1, 0.03, (x0 + x1) / 2, 0.05, zf + 0.015));
  g.add(caixa(mR, 0.03, 0.1, 12, x0 + 0.015, 0.05, zf + 6));
  g.add(caixa(mR, 0.03, 0.1, 12, x1 - 0.015, 0.05, zf + 6));

  // janela com vidro azul-claro e cortina coral
  const J = Q.janela;
  g.add(caixa(mat(C.janelaVidro, { aspero: 0.3 }), J.largura, J.altura, 0.02, J.x, J.y, zf + 0.01));
  const mM = mat(C.rodape);
  for (const dx of [-1, 1]) g.add(caixa(mM, 0.07, J.altura + 0.1, 0.06, J.x + dx * J.largura / 2, J.y, zf + 0.03));
  for (const dy of [-1, 0, 1]) g.add(caixa(mM, J.largura + 0.1, 0.07, 0.06, J.x, J.y + dy * J.altura / 2, zf + 0.03));
  g.add(caixa(mM, 0.05, J.altura, 0.05, J.x, J.y, zf + 0.03));
  g.add(caixa(mat(C.cama), 0.32, J.altura + 0.5, 0.06, J.x - J.largura / 2 - 0.24, J.y - 0.1, zf + 0.06));

  // cama coral encostada no fundo
  const K = Q.cama, mC = mat(C.cama), mCe = mat(C.camaEscura);
  g.add(caixa(mCe, K.largura, 0.32, K.comprimento, K.x, 0.16, zf + K.comprimento / 2));
  g.add(caixa(mC, K.largura + 0.04, 0.16, K.comprimento - 0.1, K.x, 0.4, zf + K.comprimento / 2 + 0.05));
  g.add(caixa(mat(C.travesseiro), K.largura * 0.7, 0.1, 0.32, K.x, 0.52, zf + 0.3));
  g.add(caixa(mC, K.largura + 0.08, 1.0, 0.1, K.x, 0.5, zf + 0.05));

  // quadro azul com bola amarela, prateleira com livros
  const F = Q.quadro;
  g.add(caixa(mat(C.quadroMoldura), 0.62, 0.62, 0.04, F.x, F.y, zf + 0.02));
  g.add(caixa(mat(C.quadroFundo), 0.5, 0.5, 0.02, F.x, F.y, zf + 0.05));
  const bolaQ = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), mat(C.quadroBola)); bolaQ.position.set(F.x + 0.05, F.y + 0.03, zf + 0.065); g.add(bolaQ);
  const PR = Q.prateleira;
  g.add(caixa(mat(C.rodape), 0.9, 0.04, 0.24, PR.x, PR.y, zf + 0.12));
  C.livros.forEach((cor, i) => { const h = 0.22 + 0.06 * ((i * 37) % 3) / 2; g.add(caixa(mat(cor), 0.07, h, 0.18, PR.x - 0.3 + i * 0.09, PR.y + 0.02 + h / 2, zf + 0.12)); });

  // planta: vaso amarelo e folhas de cone
  const PL = Q.planta;
  g.add(em(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 10), mat(C.vaso)), PL.x, 0.16, PL.z));
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, inc = 0.25 + 0.25 * acaso(), alt2 = 0.45 + 0.35 * acaso();
    const f = sombra(new THREE.Mesh(new THREE.ConeGeometry(0.04, alt2, 4), mat(i % 2 ? C.folha : C.folhaEscura)));
    f.position.set(PL.x + Math.cos(a) * 0.06, 0.3 + alt2 / 2 * Math.cos(inc), PL.z + Math.sin(a) * 0.06);
    f.rotation.set(Math.sin(a) * inc, 0, -Math.cos(a) * inc); g.add(f);
  }

  // tapete redondo creme com aro azul
  const T = Q.tapete;
  const tap = new THREE.Mesh(new THREE.CircleGeometry(T.raio, 40), mat(C.tapete)); tap.rotation.x = -Math.PI / 2; tap.position.set(T.x, 0.006, T.z); tap.receiveShadow = true; g.add(tap);
  const aro = new THREE.Mesh(new THREE.RingGeometry(T.raio * 0.86, T.raio * 0.97, 40), mat(C.tapeteAro)); aro.rotation.x = -Math.PI / 2; aro.position.set(T.x, 0.008, T.z); aro.receiveShadow = true; g.add(aro);

  // furos escuros nas paredes, por onde a esteira atravessa a casa
  for (const F2 of Q.furos || []) g.add(caixa(mat(C.furo), 0.12, 0.42, 0.7, F2.x, F2.y, F2.z));
  return g;
}

// ---------- boneco sem rosto ----------
// Olha para +z. A esquerda dele fica no +x. Devolve as juntas que o motor gira.
export function criarBoneco(mat, C, o) {
  const raiz = new THREE.Group();
  const mPele = mat(C.manequim, { chapado: false, aspero: 0.55 }), mBlusa = mat(C.blusa, { chapado: false }), mCalca = mat(C.calca, { chapado: false });
  const mGorro = mat(C.gorro, { chapado: false }), mMeia = mat(C.meia, { chapado: false }), mListra = mat(C.meiaListra, { chapado: false });
  const quadril = new THREE.Group(); quadril.position.y = 0.92; raiz.add(quadril);
  const bacia = caixa(mCalca, 0.3, 0.18, 0.2, 0, 0, 0); quadril.add(bacia);
  const tronco = new THREE.Group(); quadril.add(tronco);
  const torso = capsula(mBlusa, 0.155, 0.3, 0.26, 14); torso.scale.set(1, 1, 0.72); tronco.add(torso);
  const peito = new THREE.Group(); peito.position.y = 0.47; tronco.add(peito);
  const pesc = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.1, 10), mPele)); pesc.position.y = 0.05; peito.add(pesc);
  const cabeca = new THREE.Group(); cabeca.position.y = 0.1; peito.add(cabeca);
  cabeca.add(bola(mPele, 0.112, 0, 0.11, 0, 18));
  const gorro = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.121, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mGorro)); gorro.position.y = 0.13; cabeca.add(gorro);
  const barra = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.05, 18), mGorro)); barra.position.y = 0.13; cabeca.add(barra);
  cabeca.add(bola(mat(C.pompom, { chapado: false }), 0.036, 0, 0.27, 0, 10));

  const bracos = [], pernas = [];
  for (const lado of [1, -1]) { // 1 = esquerda (+x), -1 = direita
    const ombro = new THREE.Group(); ombro.position.set(0.2 * lado, -0.02, 0); peito.add(ombro);
    ombro.add(bola(mBlusa, 0.056, 0, 0, 0, 12));
    ombro.add(capsula(mBlusa, 0.044, 0.2, -0.14, 10));
    const cot = new THREE.Group(); cot.position.y = -0.28; ombro.add(cot);
    cot.add(bola(mBlusa, 0.043, 0, 0, 0, 10));
    cot.add(capsula(mBlusa, 0.04, 0.18, -0.12, 10));
    const mao = new THREE.Group(); mao.position.y = -0.27; cot.add(mao);
    mao.add(bola(mPele, 0.048, 0, 0, 0, 12));
    bracos.push({ lado, ombro, cot, mao });

    const coxa = new THREE.Group(); coxa.position.set(0.085 * lado, -0.02, 0); quadril.add(coxa);
    coxa.add(capsula(mCalca, 0.065, 0.3, -0.21, 10));
    const joelho = new THREE.Group(); joelho.position.y = -0.44; coxa.add(joelho);
    joelho.add(bola(mCalca, 0.06, 0, 0, 0, 10));
    const comMeia = (o.meiaNoPe === 'esquerdo') === (lado === 1);
    joelho.add(capsula(mCalca, 0.055, 0.22, -0.17, 10));
    const pe = new THREE.Group(); pe.position.y = -0.44; joelho.add(pe);
    if (comMeia) {
      const cano2 = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.055, 0.17, 12), mMeia)); cano2.position.y = 0.1; pe.add(cano2);
      for (const y of [0.13, 0.17]) { const l = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.022, 12), mListra)); l.position.y = y; pe.add(l); }
      const p = caixa(mMeia, 0.11, 0.075, 0.22, 0, 0.038, 0.05); pe.add(p);
      pe.add(bola(mMeia, 0.055, 0, 0.04, 0.15, 10));
    } else {
      const p = caixa(mPele, 0.1, 0.07, 0.21, 0, 0.036, 0.05); pe.add(p);
      pe.add(bola(mPele, 0.05, 0, 0.036, 0.14, 10));
    }
    pernas.push({ lado, coxa, joelho, pe, comMeia });
  }
  // a meia que ele segura na mão (o par da que "sumiu")
  const naMao = bracos.find((b) => (o.meiaNaMao === 'esquerda') === (b.lado === 1));
  const meiaMao = new THREE.Group(); meiaMao.position.set(0, -0.03, 0.02); naMao.mao.add(meiaMao);
  const mc = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.2, 10), mMeia)); mc.position.y = -0.1; meiaMao.add(mc);
  for (const y of [-0.03, -0.065]) { const l = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.016, 10), mListra)); l.position.y = y; meiaMao.add(l); }
  const mp = caixa(mMeia, 0.075, 0.05, 0.15, 0, -0.2, 0.05); meiaMao.add(mp);
  return { raiz, quadril, tronco, peito, cabeca, bracos, pernas, meiaMao };
}

// ---------- cão-robô de cano amarelo ----------
// Olha para +z. Cada peça é um grupo que o motor faz pular para o lugar, em ordem.
export function criarCao(mat, C) {
  const raiz = new THREE.Group(), lista = [];
  const mT = mat(C.cano, { aspero: 0.45, metal: 0.2 }), mG = mat(C.bracadeira, { aspero: 0.5 }), mE = mat(C.cabecaRobo), mV = mat(C.vermelho);
  const H = 0.42, X = 0.12, Z = 0.3, pernas = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const piv = new THREE.Group(); piv.position.set(sx * X, H, sz * Z);
    piv.add(cano(mT, [0, 0, 0], [0, -H + 0.06, 0], 0.026));
    piv.add(caixa(mG, 0.08, 0.06, 0.11, 0, -H + 0.03, 0.015));
    const g = montavel(lista, piv); g.userData.pivo = piv; pernas.push(piv);
  }
  for (const sx of [1, -1]) montavel(lista, cano(mT, [sx * X, H, -Z - 0.05], [sx * X, H, Z + 0.05], 0.028));
  for (const sz of [1, -1]) montavel(lista, cano(mT, [-X - 0.03, H, sz * Z], [X + 0.03, H, sz * Z], 0.024));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) montavel(lista, caixa(mG, 0.075, 0.075, 0.075, sx * X, H, sz * Z));
  montavel(lista, cano(mT, [0, H, Z], [0, H + 0.2, Z + 0.1], 0.026));
  // cabeça: caixa escura sem olhos, orelhas de cone amarelo, nariz vermelho na ponta de um cano
  const cab = new THREE.Group(); cab.position.set(0, H + 0.2, Z + 0.1);
  cab.add(caixa(mE, 0.2, 0.16, 0.22, 0, 0.02, 0.07));
  for (const sx of [1, -1]) { const o = sombra(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 5), mT)); o.position.set(sx * 0.065, 0.14, 0.03); cab.add(o); }
  cab.add(cano(mT, [0, 0.0, 0.18], [0, 0.0, 0.26], 0.014));
  cab.add(bola(mV, 0.03, 0, 0.0, 0.27, 10));
  const gc = montavel(lista, cab); gc.userData.cabeca = cab;
  montavel(lista, cano(mT, [0, H, -Z - 0.05], [0, H + 0.16, -Z - 0.14], 0.016), bola(mV, 0.025, 0, H + 0.17, -Z - 0.15, 8));
  poeNo(raiz, lista, 0);
  return { raiz, lista, cabeca: cab, pernas };
}

// ---------- ímã vermelho num barbante ----------
export function criarIma(mat, C) {
  const raiz = new THREE.Group(); // pivô no teto
  const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), mat(C.fio)); fio.castShadow = true; raiz.add(fio);
  const ima = new THREE.Group(); raiz.add(ima);
  const mV = mat(C.vermelho, { aspero: 0.4 }), mG = mat(C.bracadeira, { aspero: 0.35, metal: 0.4 });
  const arco = sombra(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.032, 8, 16, Math.PI), mV)); arco.position.y = -0.06; ima.add(arco);
  for (const sx of [1, -1]) {
    const b = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.1, 10), mV)); b.position.set(sx * 0.075, -0.11, 0); ima.add(b);
    const p = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.04, 10), mG)); p.position.set(sx * 0.075, -0.18, 0); ima.add(p);
  }
  // meio toro de 0 a 180 graus = a curva fica em cima, as pontas cinzas apontam para o chão
  return { raiz, fio, ima };
}

// ---------- esteira de cano amarelo que atravessa a casa ----------
export function criarEsteira(mat, C, E) {
  const raiz = new THREE.Group(), lista = [];
  const mT = mat(C.cano, { aspero: 0.45, metal: 0.2 }), mG = mat(C.bracadeira, { aspero: 0.5 }), mB = mat(C.correia, { aspero: 0.9 });
  const [xa, xb] = E.x, z = E.z, y = E.altura, w = E.largura;
  // de onde a esteira chega (xb) para onde vai (xa): pernas e trilhos aparecem nessa ordem
  const passo = E.passoPernas, n = Math.round((xb - xa) / passo);
  for (let i = 0; i <= n; i++) {
    const x = xb - i * passo, g = [];
    for (const sz of [1, -1]) {
      g.push(cano(mT, [x, 0.05, z + sz * w / 2], [x, y, z + sz * w / 2], 0.026));
      g.push(caixa(mG, 0.08, 0.06, 0.08, x, 0.03, z + sz * w / 2));
      g.push(caixa(mG, 0.08, 0.08, 0.08, x, y, z + sz * w / 2));
    }
    g.push(cano(mT, [x, 0.3, z - w / 2], [x, 0.3, z + w / 2], 0.02));
    if (i > 0) {
      const xp = x + passo;
      for (const sz of [1, -1]) g.push(cano(mT, [xp, y, z + sz * w / 2], [x, y, z + sz * w / 2], 0.03));
      g.push(caixa(mB, passo, 0.03, w - 0.04, x + passo / 2, y - 0.02, z));
    }
    const peca = montavel(lista, ...g); peca.userData.x = x;
  }
  poeNo(raiz, lista, 0);
  // ripas da correia: um lote só, o motor põe cada uma no lugar do tempo
  const nRipas = Math.ceil((xb - xa) / E.passoRipa) + 1;
  const ripas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.012, w - 0.06), mat(C.ripa), nRipas);
  ripas.receiveShadow = true; ripas.castShadow = false; raiz.add(ripas);
  return { raiz, lista, ripas, nRipas };
}

// ---------- carga: cacto no vaso e o botão vermelho ----------
export function criarCacto(mat, C) {
  const g = new THREE.Group();
  g.add(em(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.14, 8), mat(C.vasoCacto)), 0, 0.07, 0));
  const mV = mat(C.cacto);
  g.add(capsula(mV, 0.055, 0.22, 0.3, 7));
  const b1 = capsula(mV, 0.032, 0.08, 0, 6); b1.position.set(0.08, 0.33, 0); g.add(b1);
  g.add(cano(mV, [0.03, 0.28, 0], [0.08, 0.28, 0], 0.03));
  const b2 = capsula(mV, 0.03, 0.06, 0, 6); b2.position.set(-0.075, 0.27, 0); g.add(b2);
  g.add(cano(mV, [-0.03, 0.23, 0], [-0.075, 0.23, 0], 0.028));
  return g;
}
export function criarBotao(mat, C) {
  const g = new THREE.Group();
  g.add(caixa(mat(C.bracadeira), 0.26, 0.12, 0.26, 0, 0.06, 0));
  g.add(em(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.03, 16), mat(C.cabecaRobo)), 0, 0.135, 0));
  const topo = new THREE.Group(); topo.position.y = 0.15; g.add(topo);
  const mBotao = new THREE.MeshStandardMaterial({ color: C.vermelho, roughness: 0.35, emissive: C.vermelho, emissiveIntensity: 0 });
  const b = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.07, 16), mBotao)); b.position.y = 0.035; topo.add(b);
  return { raiz: g, topo, mBotao };
}

// ---------- espaço: Terra de poucos polígonos, estrelas e o satélite ----------
export function criarEspaco(cena, ES, C, mat, acaso) {
  const g = new THREE.Group(); cena.add(g);
  const geo = new THREE.IcosahedronGeometry(ES.terra.raio, 4).toNonIndexed();
  const pos = geo.attributes.position, cores = new Float32Array(pos.count * 3);
  const mar = new THREE.Color(C.mar), mar2 = new THREE.Color(C.marClaro), terra = new THREE.Color(C.terra);
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const n = Math.sin(cx * 0.21 + Math.sin(cz * 0.17)) * Math.cos(cz * 0.19 + cy * 0.07) + 0.35 * Math.sin(cy * 0.5 + cx * 0.3);
    const cor = n > 0.55 ? terra : (acaso() < 0.5 ? mar : mar2);
    for (let k = 0; k < 3; k++) { cores[(i + k) * 3] = cor.r; cores[(i + k) * 3 + 1] = cor.g; cores[(i + k) * 3 + 2] = cor.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  const terraM = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }));
  terraM.position.set(...ES.terra.centro); g.add(terraM);
  // halo fino da atmosfera
  const halo = new THREE.Mesh(new THREE.SphereGeometry(ES.terra.raio * 1.02, 48, 24), new THREE.MeshBasicMaterial({ color: C.atmosfera, transparent: true, opacity: 0.25, side: THREE.BackSide }));
  halo.position.copy(terraM.position); g.add(halo);
  // estrelas: pontos sorteados numa casca grande
  const n = 500, pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = acaso() * Math.PI * 2, b = Math.acos(2 * acaso() - 1), r = 120;
    pts[i * 3] = r * Math.sin(b) * Math.cos(a); pts[i * 3 + 1] = r * Math.cos(b); pts[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false })));

  // satélite: corpo escuro com placa amarela, moldura de cano amarelo, painéis azuis, antena rosa
  const sat = new THREE.Group(); g.add(sat);
  const mT = mat(C.cano, { aspero: 0.45, metal: 0.2 });
  sat.add(caixa(mat(C.cabecaRobo), 0.5, 0.42, 0.42, 0, 0, 0));
  sat.add(caixa(mat(C.cano), 0.26, 0.18, 0.02, 0, 0.02, 0.22));
  for (const sy of [1, -1]) for (const sz of [1, -1]) sat.add(cano(mT, [-0.27, sy * 0.22, sz * 0.22], [0.27, sy * 0.22, sz * 0.22], 0.018));
  for (const sx of [1, -1]) {
    sat.add(cano(mat(C.bracadeira), [sx * 0.25, 0, 0], [sx * 0.45, 0, 0], 0.02));
    for (let k = 0; k < 3; k++) {
      const x = sx * (0.6 + k * 0.32);
      sat.add(caixa(mat(C.painel, { aspero: 0.3, metal: 0.3 }), 0.3, 0.02, 0.4, x, 0, 0));
      sat.add(caixa(mat(C.painelLinha), 0.012, 0.024, 0.4, x + 0.15 * sx, 0, 0));
    }
  }
  const prato = sombra(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 14, 1, true), mat(C.prato, { chapado: false })));
  prato.position.y = -0.29; prato.material.side = THREE.DoubleSide; sat.add(prato);
  sat.add(cano(mat(C.bracadeira), [0, 0.21, 0], [0, 0.55, 0], 0.01));
  sat.add(bola(mat(C.feixe), 0.03, 0, 0.56, 0, 8));
  return { grupo: g, sat, terra: terraM };
}

// ---------- feixe e alvo cor-de-rosa ----------
export function criarFeixe(mat, C) {
  const g = new THREE.Group();
  const mF = new THREE.MeshBasicMaterial({ color: C.feixe, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coluna = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), mF); g.add(coluna);
  const miolo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), mF.clone()); g.add(miolo);
  const aneis = [];
  for (let i = 0; i < 4; i++) {
    const m = mF.clone();
    const a = new THREE.Mesh(new THREE.TorusGeometry(1, i === 0 ? 0.08 : 0.05, 6, 40), m); a.rotation.x = Math.PI / 2; g.add(a); aneis.push(a);
  }
  return { g, coluna, miolo, aneis };
}
