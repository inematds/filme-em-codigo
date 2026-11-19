// robo.js — o pequeno astronauta-robô, desenho próprio do kit.
// Cabeça redonda com visor escuro e dois olhos que brilham, antena com bolinha laranja, corpo de
// cápsula com remendo laranja no peito, mochila cinza-azulada, luvas e botas verde-água.
// Cada membro gira num "ombro" ou "quadril" (um grupo vazio), para o motor fazer a pose.
// Nada aqui sabe do tempo: o motor chama pose(...) a cada quadro com números calculados de t.
import * as THREE from '../../../vendor/three/three.module.js';

export function criarRobo(C, planoCorte) {
  const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: o.r ?? 0.45, metalness: o.m ?? 0.05, emissive: o.e || '#000000', emissiveIntensity: o.ei ?? 0, clippingPlanes: [planoCorte], transparent: false });
  const mCorpo = mat(C.corpo, { r: 0.38 });
  const mVisor = mat(C.visor, { r: 0.12, m: 0.3 });
  const mOlho = mat(C.olho, { e: C.olho, ei: 2.2 });
  const mLuva = mat(C.luva, { r: 0.5 });
  const mMochila = mat(C.mochila, { r: 0.55 });
  const mRemendo = mat(C.remendo, { r: 0.5 });
  const mAntena = mat(C.antena, { e: C.antena, ei: 1.4 });

  const raiz = new THREE.Group();        // posição no mundo e giro do corpo todo
  const corpo = new THREE.Group();       // o "apertão" (escala) mexe só aqui
  raiz.add(corpo);
  const malha = (g, m, x = 0, y = 0, z = 0, pai = corpo) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); pai.add(o); return o; };

  // tronco, remendo e mochila
  malha(new THREE.CapsuleGeometry(0.33, 0.32, 8, 20), mCorpo, 0, 0, 0);
  const remendo = malha(new THREE.BoxGeometry(0.26, 0.12, 0.06), mRemendo, 0, 0.06, 0.31);
  remendo.rotation.x = -0.08;
  malha(new THREE.BoxGeometry(0.46, 0.5, 0.22), mMochila, 0, 0.06, -0.33);
  malha(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10), mRemendo, 0.16, 0.06, -0.46);

  // cabeça (gira sozinha): esfera, visor achatado na frente, dois olhos, antena
  const cabeca = new THREE.Group(); cabeca.position.set(0, 0.62, 0); corpo.add(cabeca);
  malha(new THREE.SphereGeometry(0.42, 28, 20), mCorpo, 0, 0, 0, cabeca);
  const visor = malha(new THREE.SphereGeometry(0.4, 28, 16), mVisor, 0, 0.0, 0.1, cabeca);
  visor.scale.set(0.8, 0.56, 0.8);
  const olhos = [-0.13, 0.13].map((x) => { const o = malha(new THREE.SphereGeometry(0.065, 14, 10), mOlho, x, 0.01, 0.43, cabeca); o.scale.set(1, 1.25, 0.5); return o; });
  malha(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), mMochila, 0, 0.53, 0, cabeca);
  malha(new THREE.SphereGeometry(0.065, 14, 10), mAntena, 0, 0.7, 0, cabeca);

  // braços e pernas: grupo no encaixe, cápsula pendurada, luva ou bota na ponta
  const membro = (x, y, comp, raio, ponta, pontaY) => {
    const g = new THREE.Group(); g.position.set(x, y, 0); corpo.add(g);
    malha(new THREE.CapsuleGeometry(raio, comp, 6, 12), mCorpo, 0, -comp / 2 - raio * 0.4, 0, g);
    const p = malha(ponta, mLuva, 0, pontaY, 0.02, g);
    return { g, p };
  };
  const bracoE = membro(-0.4, 0.2, 0.3, 0.085, new THREE.SphereGeometry(0.12, 16, 12), -0.48);
  const bracoD = membro(0.4, 0.2, 0.3, 0.085, new THREE.SphereGeometry(0.12, 16, 12), -0.48);
  const bota = () => { const g = new THREE.CapsuleGeometry(0.12, 0.12, 6, 12); g.rotateX(Math.PI / 2); return g; };
  const pernaE = membro(-0.17, -0.42, 0.2, 0.1, bota(), -0.42);
  const pernaD = membro(0.17, -0.42, 0.2, 0.1, bota(), -0.42);
  pernaE.p.position.z = 0.06; pernaD.p.position.z = 0.06;

  // halo macio dos olhos e da antena (sempre de frente para a câmera)
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  const txHalo = new THREE.CanvasTexture(cv);
  const halo = (cor, tam, pai, x, y, z) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txHalo, color: cor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, clippingPlanes: [planoCorte] }));
    s.scale.set(tam, tam, 1); s.position.set(x, y, z); pai.add(s); return s;
  };
  const halos = [halo(C.olho, 0.32, cabeca, -0.13, 0.01, 0.47), halo(C.olho, 0.32, cabeca, 0.13, 0.01, 0.47), halo(C.antena, 0.3, cabeca, 0, 0.7, 0.02)];

  // P = { x, y, z, giro:[x,y,z], aperta:[sx,sy], cabeca:[x,y,z], bracos:[[x,z],[x,z]], pernas:[[x,z],[x,z]], olho, brilho }
  function pose(P) {
    raiz.position.set(P.x, P.y, P.z || 0);
    raiz.rotation.set(P.giro[0], P.giro[1], P.giro[2]);
    corpo.scale.set(P.aperta[0], P.aperta[1], P.aperta[0]);
    cabeca.rotation.set(P.cabeca[0], P.cabeca[1], P.cabeca[2]);
    bracoE.g.rotation.set(P.bracos[0][0], 0, -P.bracos[0][1]);
    bracoD.g.rotation.set(P.bracos[1][0], 0, P.bracos[1][1]);
    pernaE.g.rotation.set(P.pernas[0][0], 0, -P.pernas[0][1]);
    pernaD.g.rotation.set(P.pernas[1][0], 0, P.pernas[1][1]);
    for (const o of olhos) o.scale.set(1, 1.25 * P.olho, 0.5);
    mOlho.emissiveIntensity = 2.2 * P.brilho;
    halos[0].material.opacity = halos[1].material.opacity = 0.9 * P.brilho * P.olho;
    halos[2].material.opacity = 0.8 * P.brilho;
  }

  return { raiz, pose };
}
