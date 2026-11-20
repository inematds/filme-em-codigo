// MOTOR "voxel" — diorama de cubinhos: tudo é feito de cubos grossos em cima de ilhas quadradas que
// flutuam num fundo escuro, vistas de cima e de lado (câmera de três quartos, lente fechada, como
// maquete). Brilho quente no que tem luz própria (mel, tocha, faísca) e desfoque de miniatura.
// Jeito de animar: cena-3d (three.js, sem placa de vídeo). Cada maquete é UMA malha repetida por
// instância (InstancedMesh): um cubo só, desenhado centenas de vezes, cada um com a sua cor.
// Filme narrado na fonte: aqui a fala vira legenda em letras grossas brancas com contorno preto, a
// palavra "falada" em amarelo. Sem voz. Música e sons feitos em código, no tempo de cada ação.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import * as VX from './voxels.js';
import { criarLente } from './lente.js';

const { limita, mistura, trecho, suave, sorteio, saiDevagar, entraDevagar } = Filme;

// sorteio sem memória: o mesmo par de números dá sempre o mesmo valor (0 a 1)
function h(a, b = 0) {
  let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return (v >>> 0) / 4294967296;
}
const mix3 = (a, b, k) => [mistura(a[0], b[0], k), mistura(a[1], b[1], k), mistura(a[2], b[2], k)];
const par = (v) => (Array.isArray(v) ? v : [v, v]);

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 15,
  montar({ historia: H, tela, largura: L, altura: A, duracao, fps }) {
    const F = H.filme, PL = H.planos;
    const pecas = H.pecas, todas = (tipo) => pecas.filter((p) => p.tipo === tipo), uma = (tipo) => pecas.find((p) => p.tipo === tipo);
    const planoEm = (t) => { let i = 0; PL.forEach((p, j) => { if (t >= p.de) i = j; }); return i; };

    // ---------- legenda: confere as letras e o tempo ANTES de montar a cena ----------
    const LG = H.legenda, POP = 0.12, SOME = 0.12;
    const ABRE = H.escuro ? H.escuro[0] : 0.3, FIM = duracao - (H.escuro ? H.escuro[1] : 0.3);
    const LEGENDAS = (H.legendas || []).map((lg) => ({ ...lg, texto: lg.texto.toUpperCase() })); // o MESMO texto é conferido e desenhado
    (function confere() {
      const falta = new Set();
      for (const lg of LEGENDAS) for (const ch of lg.texto) if (ch !== ' ' && !Letras.letra(ch)) falta.add(ch);
      if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' ') + ' (troque a letra na legenda ou desenhe-a em letras.js)');
      LEGENDAS.forEach((lg, i) => {
        const inteira = lg.de + POP;                 // depois do pulinho de entrada, a legenda está inteira
        const sai = Math.min(lg.ate - SOME, FIM);    // começa a sumir (ou o escuro do fim a apaga)
        if (lg.de < ABRE) throw new Error(`Legenda "${lg.texto}" começa no escuro do começo (antes de ${ABRE} s).`);
        if (sai - inteira < 0.5 - 1e-6) throw new Error(`Legenda "${lg.texto}" fica inteira só ${(sai - inteira).toFixed(2)} s (mínimo 0,5 s).`);
        if (i && lg.de < LEGENDAS[i - 1].ate - 1e-6) throw new Error(`Legenda "${lg.texto}" começa antes da anterior acabar.`);
      });
    })();

    // ---------- renderizador, cena, câmera ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, L / A, 1, 400);

    // ---------- o cubo e os três materiais (a cor vem de cada instância) ----------
    const CUBO = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    const matCubo = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0 });
    const matLuz = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const matVidro = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0, transparent: true, opacity: H.vidroOpacidade, depthWrite: false });
    const MAT = { c: matCubo, l: matLuz, v: matVidro };
    const O = new THREE.Object3D(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0), COR = new THREE.Color();

    // uma lista de cubos vira um grupo com até 3 malhas (cubo comum, luz própria, vidro)
    function malha(lista, pai) {
      const g = new THREE.Group(), por = { c: [], l: [], v: [] };
      for (const q of lista) por[q.m].push(q);
      for (const m of ['c', 'l', 'v']) {
        if (!por[m].length) continue;
        const im = new THREE.InstancedMesh(CUBO, MAT[m], por[m].length);
        por[m].forEach((q, i) => {
          const t = q.t || 1;
          O.position.set(q.x + 0.5, q.y + 0.5, q.z + 0.5); O.rotation.set(0, 0, 0); O.scale.setScalar(t); O.updateMatrix();
          im.setMatrixAt(i, O.matrix);
          COR.set(q.cor); if (m === 'l') COR.multiplyScalar(q.k || 1);
          im.setColorAt(i, COR);
        });
        im.instanceColor.needsUpdate = true;
        im.castShadow = m === 'c'; im.receiveShadow = m !== 'l';
        if (m === 'v') im.renderOrder = 2;
        g.add(im);
      }
      if (pai) pai.add(g);
      return g;
    }
    // malha de cubos soltos que andam (mel caindo, água, faíscas): a posição é escrita a cada quadro
    function soltos(n, m, cor, pai, forca = 1) {
      const im = new THREE.InstancedMesh(CUBO, MAT[m], n); im.frustumCulled = false;
      im.castShadow = m === 'c'; im.receiveShadow = m === 'c';
      for (let i = 0; i < n; i++) { im.setMatrixAt(i, ZERO); COR.set(typeof cor === 'function' ? cor(i) : cor); if (m === 'l') COR.multiplyScalar(forca); im.setColorAt(i, COR); }
      im.instanceColor.needsUpdate = true;
      pai.add(im);
      return {
        im,
        poe(i, x, y, z, s = 1, rx = 0, ry = 0) { if (s <= 0.001) { im.setMatrixAt(i, ZERO); return; } O.position.set(x, y, z); O.rotation.set(rx, ry, 0); O.scale.setScalar(s); O.updateMatrix(); im.setMatrixAt(i, O.matrix); },
        some(i) { im.setMatrixAt(i, ZERO); },
        pronto() { im.instanceMatrix.needsUpdate = true; },
      };
    }

    // ---------- cenários: cada um é um grupo no seu lugar do mundo; só o do plano atual aparece ----------
    const CEN = {};
    for (const c of H.cenarios) { const g = new THREE.Group(); g.position.set(...c.lugar); cena.add(g); CEN[c.nome] = { ...c, g }; }
    const em = (p) => CEN[p.cenario].g;
    const anima = []; // funções (t) que põem as peças que andam no lugar; todas escrevem tudo, todo quadro

    // cubinhos soltos flutuando ao redor de cada cenário (o "espaço" da maquete)
    for (const c of H.cenarios) {
      const R = c.flutuantes; if (!R) continue;
      const r = sorteio(H.semente + c.lugar[0] * 3 + 11), lista = [];
      for (let i = 0; i < R.n; i++) {
        const ang = r() * Math.PI * 2, dist = mistura(R.raio[0], R.raio[1], r()), y = mistura(R.altura[0], R.altura[1], r());
        const tam = 1 + Math.floor(r() * 3), cor = R.cores[Math.floor(r() * R.cores.length)];
        lista.push({ x: Math.cos(ang) * dist, y, z: Math.sin(ang) * dist, tam, cor, fase: r() * 6.28, gira: r() * 6.28 });
      }
      const s = soltos(lista.length, 'c', (i) => lista[i].cor, CEN[c.nome].g);
      anima.push((t) => {
        lista.forEach((q, i) => s.poe(i, q.x, q.y + 0.6 * Math.sin(t * 0.9 + q.fase), q.z, q.tam, 0.3 * Math.sin(t * 0.3 + q.fase), q.gira + t * 0.15));
        s.pronto();
      });
    }

    // ---------- peças fixas ----------
    for (const p of todas('ilha')) malha(VX.ilha(p, sorteio(H.semente + 1)), em(p));
    for (const p of todas('tabua')) malha(VX.tabua(p, sorteio(H.semente + 2)), em(p));
    for (const p of todas('tumba')) malha(VX.tumba(p, sorteio(H.semente + 3)), em(p));
    for (const p of todas('arvore')) { const g = malha(VX.arvore(p, sorteio(H.semente + 4)), em(p)); g.position.set(p.x, 0, p.z); }
    for (const p of todas('tesouro')) { const g = malha(VX.tesouro(p, sorteio(H.semente + 5)), em(p)); g.position.set(p.x, 0, p.z); }
    for (const p of todas('bau')) { const g = malha(VX.bau(p), em(p)); g.position.set(p.x, 0, p.z); g.rotation.y = p.giro || 0; }
    for (const p of todas('flores')) {
      const r = sorteio(H.semente + 6);
      for (const [x, z] of p.lugares) { const g = malha(VX.flor({ caule: p.caule, cor: p.cores[Math.floor(r() * p.cores.length)] }, r), em(p)); g.position.set(x, 0, z); }
    }

    // ---------- colmeia (balança de leve) e a gota de mel que pinga ----------
    const luzes = []; // { luz, cenario, forca(t) }
    for (const p of todas('colmeia')) {
      const piv = new THREE.Group(); piv.position.set(p.x, p.y, p.z); em(p).add(piv);
      const g = malha(VX.colmeia(p, sorteio(H.semente + 7)), piv); g.position.y = -p.perfil.length;
      const luz = new THREE.PointLight(p.luz, 0, 14, 1.6); luz.position.set(p.x + 0.5, p.y - p.perfil.length * 0.5, p.z + 3); em(p).add(luz);
      luzes.push({ luz, cenario: p.cenario, forca: () => p.forcaLuz });
      const gota = soltos(1, 'l', p.mel, em(p), 2);
      anima.push((t) => {
        piv.rotation.set(0.04 * Math.sin(t * 2.1), 0, 0.05 * Math.sin(t * 1.7));
        const k = trecho(t, p.pinga, p.pinga + 0.5), y0 = p.y - p.perfil.length - 0.2;
        if (t >= p.pinga && k < 1) gota.poe(0, p.x + 0.5, mistura(y0, 0.3, k * k), p.z + 0.5, 0.55 * (1 - 0.3 * k)); else gota.some(0);
        gota.pronto();
      });
    }

    // ---------- abelhas: voam em roda de um centro; as asas batem ----------
    function criaAbelha(B, pai) {
      const raiz = new THREE.Group(); pai.add(raiz);
      const corpo = malha(VX.abelha(B), raiz); corpo.position.set(-2.5, -1, -1);
      const asas = [-1, 1].map((s) => {
        const piv = new THREE.Group(); piv.position.set(-0.5, 1, s > 0 ? 1 : -1); raiz.add(piv);
        const a = malha(VX.asa(B), piv); a.position.set(-1, 0, s > 0 ? 0 : -3); a.scale.set(1, 0.4, 1);
        return { piv, s };
      });
      raiz.scale.setScalar(B.escala);
      return { raiz, asas, bate(t, i) { asas.forEach(({ piv, s }) => piv.rotation.set(-s * (0.2 + 0.6 * Math.abs(Math.sin(t * 38 + i))), 0, 0)); } };
    }
    for (const p of todas('abelhas')) {
      const lista = [];
      for (let i = 0; i < p.n; i++) lista.push(criaAbelha({ ...H.abelha, escala: H.abelha.escala * (0.9 + 0.2 * h(i, 3)) }, em(p)));
      anima.push((t) => {
        const entra = p.de != null ? saiDevagar(trecho(t, p.de, p.de + 1.0)) : 1;
        lista.forEach((b, i) => {
          const sentido = i % 2 ? -1 : 1, a0 = i / p.n * Math.PI * 2 + h(i, 7);
          const ang = a0 + sentido * p.velocidade * (1 + 0.25 * h(i, 9)) * t;
          const R = mistura(p.raioEntra || 30, p.raio * (0.8 + 0.4 * h(i, 11)), entra);
          const y = p.centro[1] + p.altura * (h(i, 12) - 0.5) + 0.5 * Math.sin(t * 5 + i * 2);
          const visivel = p.de == null || t >= p.de;
          b.raiz.visible = visivel;
          b.raiz.position.set(p.centro[0] + Math.cos(ang) * R, y, p.centro[2] + Math.sin(ang) * R);
          b.raiz.rotation.set(0, Math.atan2(-Math.cos(ang) * sentido, -Math.sin(ang) * sentido), 0.15 * Math.sin(t * 4 + i));
          b.bate(t, i);
        });
      });
    }

    // ---------- tochas: a chama tremula (sorteio por quadro, sem memória) e acende o lugar ----------
    for (const p of todas('tocha')) {
      const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.giro || 0; em(p).add(g);
      malha(VX.tocha(p), g);
      const ch = malha(VX.chama(p), g); ch.position.set(0, 3, 0);
      const luz = new THREE.PointLight(p.luz, 0, 26, 1.4); luz.position.set(p.x + 0.5, p.y + 4, p.z + 0.5); em(p).add(luz);
      luzes.push({ luz, cenario: p.cenario, forca: (t, q) => p.forca * (0.85 + 0.3 * h(q, Math.round(p.x * 7 + p.z))) });
      anima.push((t, q) => { const s = 0.85 + 0.3 * h(q, 31 + p.x), s2 = 0.85 + 0.3 * h(q, 37 + p.z); ch.scale.set(s2, s, s2); });
    }

    // ---------- arqueólogo, pote de barro e o brilho que sobe do mel ----------
    const AQ = uma('arqueologo'), PB = uma('poteBarro');
    if (AQ && PB) {
      const raiz = new THREE.Group(); raiz.position.set(AQ.x, 0, AQ.z); raiz.rotation.y = AQ.giro; raiz.scale.setScalar(AQ.escala); em(AQ).add(raiz);
      const corpo = new THREE.Group(); corpo.position.set(-0.5, 0, 0); raiz.add(corpo);
      const P = VX.arqueologo(AQ);
      malha(P.pernas, corpo); malha(P.corpo, corpo);
      const cab = new THREE.Group(); cab.position.set(0, 7, 0); corpo.add(cab); malha(P.cabeca, cab);
      malha(P.chapeu, cab).traverse((o) => { o.castShadow = false; });
      const brD = new THREE.Group(); brD.position.set(2, 6, -0.5); corpo.add(brD); malha(P.braco, brD);
      const brE = new THREE.Group(); brE.position.set(-2, 6, -0.5); corpo.add(brE); malha(P.bracoE, brE);
      const mao = new THREE.Object3D(); mao.position.set(0.5, -3.2, 1.2); brD.add(mao);

      // o pote (e a tampa) ficam com o centro em (x, z); "escala" encolhe os cubos do pote
      const ep = PB.escala || 1;
      const pote = new THREE.Group(); pote.position.set(PB.x - 0.5 * ep, 0, PB.z - 0.5 * ep); pote.scale.setScalar(ep); em(PB).add(pote);
      malha(VX.poteBarro(PB, sorteio(H.semente + 8)), pote);
      const tampa = malha(VX.tampaBarro(PB), em(PB)); tampa.scale.setScalar(ep);
      const topo = new THREE.Vector3(PB.x, PB.perfil.length * ep, PB.z), naMao = new THREE.Vector3();
      const NB = PB.brilhos, brilhos = soltos(NB, 'l', (i) => PB.brilho[i % PB.brilho.length], em(PB), PB.forcaBrilho);
      anima.push((t) => {
        const [a0, a1] = PB.abre, k = suave(trecho(t, a0, a1));
        // o braço sobe, a cabeça se inclina para ver o mel
        brD.rotation.set(-1.9 * k, 0, -0.15 * k);
        brE.rotation.set(-0.5 * suave(trecho(t, a0 + 0.2, a1 + 0.3)), 0, 0.1);
        cab.rotation.set(0.35 * k - 0.1, AQ.olha * (1 - k), 0);
        corpo.position.y = 0.15 * Math.sin(Math.PI * k);
        // a tampa vai do pote até a mão
        raiz.updateMatrixWorld(true); mao.getWorldPosition(naMao); em(PB).worldToLocal(naMao);
        const pos = new THREE.Vector3().lerpVectors(topo, naMao, k);
        tampa.position.set(pos.x - 0.5 * ep, pos.y - 0.5 * k, pos.z - 0.5 * ep); tampa.rotation.set(0.5 * k, 0, -0.4 * k);
        // brilhos dourados sobem do mel depois que a tampa sai
        for (let i = 0; i < NB; i++) {
          const ti = a0 + 0.15 + i * PB.intervalo, vida = (t - ti) / 1.3;
          if (t < ti || vida >= 1) { brilhos.some(i); continue; }
          const ang = h(i, 21) * 6.283 + vida * 3, r = 0.4 + 1.6 * vida * h(i, 22);
          brilhos.poe(i, PB.x + Math.cos(ang) * r, PB.perfil.length * ep + 0.4 + vida * (3 + 3 * h(i, 23)), PB.z + Math.sin(ang) * r, 0.45 * (1 - vida * 0.8), vida * 4, vida * 3);
        }
        brilhos.pronto();
      });
    }

    // ---------- pote de vidro: o mel cai em cubos, a água é empurrada para fora, a tampa cai ----------
    const PV = uma('poteVidro');
    let PVinfo = null;
    if (PV) {
      const pai = em(PV), base = new THREE.Group(); base.position.set(PV.x, 0, PV.z); pai.add(base);
      malha(VX.poteVidro(PV), base);
      const r = sorteio(H.semente + 12), R = PV.raio, CAM = PV.enche.camadas;
      // casas do mel: camada por camada, numa ordem sorteada dentro de cada camada
      const casas = [];
      for (let y = 0; y < CAM; y++) {
        const cam = [];
        for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) cam.push({ x, y, z, s: r() });
        cam.sort((a, b) => a.s - b.s); casas.push(...cam);
      }
      // a água ocupa algumas casas de baixo e sai, uma a uma, empurrada pelo mel
      const AG = PV.agua, agua = [];
      const baixas = casas.filter((c) => c.y < AG.camadas);
      for (let j = 0; j < AG.n; j++) {
        const c = baixas[Math.floor(j * baixas.length / AG.n + r() * 2) % baixas.length];
        if (c.agua) continue;
        const sai = mistura(AG.sai[0], AG.sai[1], j / Math.max(1, AG.n - 1));
        const ang = Math.atan2(c.z + 0.01, c.x + 0.01) + (r() - 0.5) * 0.6, longe = R + 2.5 + r() * 2.2;
        c.agua = { sai, cai: [Math.cos(ang) * longe, Math.sin(ang) * longe] };
        agua.push(c);
      }
      const [e0, e1] = PV.enche.tempo, QUEDA = 0.45, ALTO = PV.altura + 13;
      let n = 0;
      casas.forEach((c) => { if (!c.agua) { c.chega = mistura(e0 + QUEDA, e1, n / Math.max(1, casas.length - agua.length - 1)); n++; } });
      agua.forEach((c) => { c.chega = c.agua.sai + 0.55 + QUEDA; });
      const mel = soltos(casas.length, 'l', (i) => PV.mel[Math.floor(h(i, 41) * PV.mel.length)], base);
      // brilho do mel: cada cubo com uma força um pouco diferente
      casas.forEach((c, i) => { COR.set(PV.mel[Math.floor(h(i, 41) * PV.mel.length)]).multiplyScalar(PV.brilhoMel * (0.85 + 0.3 * h(i, 42))); mel.im.setColorAt(i, COR); });
      mel.im.instanceColor.needsUpdate = true;
      const ag = soltos(agua.length, 'c', PV.corAgua, base);
      const luzMel = new THREE.PointLight(PV.luz, 0, 18, 1.5); luzMel.position.set(PV.x, 3, PV.z + 1); pai.add(luzMel);
      luzes.push({ luz: luzMel, cenario: PV.cenario, forca: (t) => PV.forcaLuz * (0.25 + 0.75 * trecho(t, e0, e1)) });
      // tampa
      const tampa = malha(VX.tampaPote(PV), base);
      // a abelha da enzima e a faísca
      const EZ = PV.enzima, abelhaEz = criaAbelha({ ...H.abelha, escala: H.abelha.escala * 1.25 }, base);
      const faisca = soltos(1 + EZ.lascas, 'l', EZ.cor, base, EZ.forca);
      const luzFaisca = new THREE.PointLight(EZ.luz, 0, 16, 1.5); base.add(luzFaisca);
      luzes.push({ luz: luzFaisca, cenario: PV.cenario, forca: (t) => EZ.forcaLuz * Math.exp(-Math.max(0, t - EZ.bate) * 3) * (t >= EZ.solta ? 1 : 0) });
      PVinfo = { casas, agua, QUEDA };

      anima.push((t) => {
        casas.forEach((c, i) => {
          const t0 = c.chega - QUEDA;
          if (t < t0) { mel.some(i); return; }
          const k = limita((t - t0) / QUEDA);
          const y = mistura(ALTO + h(i, 43) * 4, c.y, k * k);
          const amassa = t >= c.chega && t < c.chega + 0.1 ? 0.88 : 1;
          mel.poe(i, c.x + 0.5, y + 0.5, c.z + 0.5, amassa, (1 - k) * h(i, 44) * 2, (1 - k) * h(i, 45) * 2);
        });
        mel.pronto();
        agua.forEach((c, j) => {
          const s0 = c.agua.sai, sobe = 0.55, voa = 0.5;
          let x = c.x + 0.5, y = c.y + 0.5, z = c.z + 0.5, rx = 0;
          if (t >= s0 && t < s0 + sobe) { const k = entraDevagar(trecho(t, s0, s0 + sobe)); y = mistura(c.y + 0.5, PV.altura + 0.8, k); }
          else if (t >= s0 + sobe) {
            const k = limita((t - s0 - sobe) / voa);
            x = mistura(c.x + 0.5, c.agua.cai[0], k); z = mistura(c.z + 0.5, c.agua.cai[1], k);
            y = mistura(PV.altura + 0.8, 0.5, k) + 3.2 * k * (1 - k) * 2; rx = k * 4;
            if (k >= 1) { const d = t - s0 - sobe - voa; y = 0.5 + 0.5 * Math.abs(Math.sin(d * 9)) * Math.exp(-d * 6); rx = 0; }
          } else { x += 0.08 * Math.sin(t * 7 + j); }
          ag.poe(j, x, y, z, 0.92, rx, 0);
        });
        ag.pronto();
        // tampa: cai do alto, amassa e quica um pouquinho
        const TC = PV.tampaCai, yT = PV.altura;
        if (t < TC.de) tampa.visible = false;
        else {
          tampa.visible = true;
          let y;
          if (t < TC.em) { const k = trecho(t, TC.de, TC.em); y = mistura(yT + TC.altura, yT, k * k); }
          else { const d = t - TC.em; y = yT + 0.7 * Math.abs(Math.sin(d * 10)) * Math.exp(-d * 7); }
          const amassa = t >= TC.em && t < TC.em + 0.07 ? 0.75 : 1;
          tampa.position.set(0, y, 0); tampa.scale.set(1 + (1 - amassa) * 0.5, amassa, 1 + (1 - amassa) * 0.5);
          tampa.rotation.set(0, t < TC.em ? 0.6 * (1 - trecho(t, TC.de, TC.em)) : 0, 0);
        }
        // abelha da enzima: entra, para em cima do pote, solta a faísca e vai embora
        const visAb = t >= EZ.entra[0] && t < EZ.sai[1];
        abelhaEz.raiz.visible = visAb;
        let pa;
        if (t < EZ.entra[1]) pa = mix3(EZ.de, EZ.para, saiDevagar(trecho(t, EZ.entra[0], EZ.entra[1])));
        else if (t < EZ.sai[0]) pa = EZ.para;
        else pa = mix3(EZ.para, EZ.vai, entraDevagar(trecho(t, EZ.sai[0], EZ.sai[1])));
        abelhaEz.raiz.position.set(pa[0], pa[1] + 0.35 * Math.sin(t * 6), pa[2]);
        const indo = t >= EZ.sai[0] ? Math.atan2(-(EZ.vai[2] - EZ.para[2]), EZ.vai[0] - EZ.para[0]) : Math.atan2(-(EZ.para[2] - EZ.de[2]), EZ.para[0] - EZ.de[0]);
        abelhaEz.raiz.rotation.set(0, indo, 0.1 * Math.sin(t * 5));
        abelhaEz.bate(t, 5);
        // a faísca cai da abelha até o mel e estoura em lascas brancas
        const topoMel = CAM + 0.5;
        if (t >= EZ.solta && t < EZ.bate) { const k = trecho(t, EZ.solta, EZ.bate); faisca.poe(0, EZ.para[0], mistura(EZ.para[1] - 1, topoMel, k * k), EZ.para[2], 0.75, t * 5, t * 4); }
        else if (t >= EZ.entra[0] && t < EZ.solta) faisca.poe(0, pa[0], pa[1] - 1.1 + 0.35 * Math.sin(t * 6), pa[2], 0.6, t * 5, t * 4);
        else faisca.some(0);
        for (let i = 1; i <= EZ.lascas; i++) {
          const vida = (t - EZ.bate) / 0.7;
          if (vida < 0 || vida >= 1) { faisca.some(i); continue; }
          const ang = (i / EZ.lascas) * 6.283 + h(i, 51), sobe = 2.5 * h(i, 52) + 1, r = saiDevagar(vida) * (2 + 1.5 * h(i, 53));
          faisca.poe(i, EZ.para[0] + Math.cos(ang) * r, topoMel + sobe * Math.sin(Math.PI * vida * 0.8), EZ.para[2] + Math.sin(ang) * r, 0.4 * (1 - vida), vida * 6, vida * 5);
        }
        faisca.pronto();
        const pf = t < EZ.bate ? [EZ.para[0], mistura(EZ.para[1] - 1, topoMel, trecho(t, EZ.solta, EZ.bate) ** 2), EZ.para[2]] : [EZ.para[0], topoMel + 1, EZ.para[2]];
        luzFaisca.position.set(pf[0], pf[1], pf[2]);
      });
    }

    // ---------- germes: preocupados com o mel, tremem e depois recuam ----------
    const GERMES = todas('germe').map((G, i) => {
      const raiz = new THREE.Group(); em(G).add(raiz);
      const corpo = malha(VX.germe(G), raiz); corpo.position.set(-0.5, 0, -0.5);
      const olhar = malha(VX.pupilas(G), raiz); olhar.position.set(-0.5, 0, -0.5);
      const escala = G.escala || 0.7;
      raiz.scale.setScalar(escala);
      // de costas para o pote (de frente para quem assiste) e, no susto, fogem para longe dele
      const fora = [G.x - (PV ? PV.x : 0), G.z - (PV ? PV.z : 0)], nf = Math.hypot(...fora) || 1;
      const giro = G.giro ?? Math.atan2(fora[0], fora[1]);
      anima.push((t) => {
        let x = G.x, z = G.z, y = 0, rz = 0, olhaX = 0;
        const M = H.germes;
        // parados: balançam de leve; preocupados (ácido): tremem; depois recuam aos pulinhos
        const treme = t >= M.treme[0] && t < M.treme[1] ? 1 : 0;
        rz = 0.05 * Math.sin(t * 3 + i * 2) + treme * 0.12 * Math.sin(t * 47 + i);
        const kr = trecho(t, M.recua[0] + i * 0.08, M.recua[1] + i * 0.08);
        x += fora[0] / nf * M.distancia * saiDevagar(kr); z += fora[1] / nf * M.distancia * saiDevagar(kr);
        if (kr > 0 && kr < 1) y = Math.abs(Math.sin(kr * Math.PI * 3)) * 0.9;
        olhaX = treme ? 0.25 * Math.sin(t * 9 + i) : 0;
        raiz.position.set(x, y, z); raiz.rotation.set(0, giro, rz);
        const susto = t >= M.recua[0] ? 1.12 : 1;
        olhar.position.set(-0.5 + olhaX, 0, -0.5); olhar.scale.set(1, susto, 1);
      });
      return G;
    });

    // ---------- luz do céu e do sol (muda de plano para plano) ----------
    const hemi = new THREE.HemisphereLight('#ffffff', '#000000', 1); cena.add(hemi);
    const sol = new THREE.DirectionalLight('#ffffff', 1); cena.add(sol, sol.target);
    sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.05;
    Object.assign(sol.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 90 }); sol.shadow.camera.updateProjectionMatrix();
    const fundo = new THREE.Color();

    // ---------- legenda: letras de traço grosso e ponta quadrada (cara de pixel), contorno preto ----------
    const cvL = document.createElement('canvas'); cvL.width = L; cvL.height = A;
    const xL = cvL.getContext('2d'), uL = L / 1080;
    const LEG = LEGENDAS.map((lg) => {
      const tam = LG.tam, palavras = lg.texto.split(/\s+/), linhas = []; let atual = [];
      for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && Letras.largura(tenta, tam) > LG.largura) { linhas.push(atual); atual = [p]; } else atual.push(p); }
      if (atual.length) linhas.push(atual);
      // a palavra "falada" anda pela legenda conforme o tamanho de cada palavra
      const pesos = palavras.map((p) => p.length + 2), soma = pesos.reduce((a, b) => a + b, 0), fala = (lg.ate - SOME - lg.de) * 0.85;
      let acum = lg.de; const inicio = pesos.map((w) => { const v = acum; acum += fala * w / soma; return v; });
      return { ...lg, linhas, inicio };
    });
    function legenda(t) {
      xL.setTransform(1, 0, 0, 1, 0, 0); xL.clearRect(0, 0, L, A);
      const lg = LEG.find((l) => t >= l.de && t < l.ate);
      if (!lg) return 0;
      let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
      const tam = LG.tam, passo = tam * 1.4, y0 = LG.y - (lg.linhas.length - 1) * passo / 2 - tam / 2;
      const pop = 1 + 0.1 * (1 - trecho(t, lg.de, lg.de + POP));
      const alfa = trecho(t, lg.de, lg.de + POP * 0.5) * trecho(lg.ate - t, 0, SOME);
      xL.globalAlpha = alfa;
      xL.setTransform(uL * pop, 0, 0, uL * pop, L / 2 * (1 - pop), (y0 + tam / 2) * uL * (1 - pop));
      xL.lineCap = 'square'; xL.lineJoin = 'miter'; xL.miterLimit = 3;
      if (lg.escala) {
        const { cores, indice, titulo } = lg.escala;
        const passoCor = 66, x0 = 540 - passoCor * cores.length / 2;
        xL.save();
        xL.setTransform(uL, 0, 0, uL, 0, 0);
        xL.fillStyle = LG.contorno;
        xL.fillRect(x0 - 24, 250, passoCor * cores.length + 48, 174);
        Letras.texto(xL, titulo, 540, 311, 40, { cor: LG.cor, larg: 6 });
        cores.forEach((cor, i) => {
          xL.fillStyle = cor;
          xL.fillRect(x0 + i * passoCor, 330, passoCor - 4, 40);
        });
        const centro = x0 + (indice + 0.5) * passoCor;
        xL.fillStyle = LG.cor;
        xL.beginPath();
        xL.moveTo(centro, 374);
        xL.lineTo(centro - 17, 401);
        xL.lineTo(centro + 17, 401);
        xL.fill();
        xL.restore();
      }
      let idx = 0;
      lg.linhas.forEach((ln, li) => {
        const txt = ln.join(' '), y = y0 + li * passo;
        for (const passe of [0, 1, 2]) {
          let px = 540 - Letras.largura(txt, tam) / 2, pi = idx;
          for (const ch of txt) {
            if (ch === ' ') { px += 0.42 * tam; pi++; continue; }
            const gl = Letras.letra(ch);
            const dx = passe === 0 ? tam * 0.06 : 0, dy = passe === 0 ? tam * 0.07 : 0; // passe 0 = sombra dura embaixo
            xL.lineWidth = passe === 2 ? tam * 0.17 : tam * 0.4;
            xL.strokeStyle = passe === 2 ? (pi === falada ? LG.corFalada : LG.cor) : LG.contorno;
            for (const tr of gl.tracos) { xL.beginPath(); tr.forEach(([a, b], i) => (i ? xL.lineTo(px + a * tam + dx, y + b * tam + dy) : xL.moveTo(px + a * tam + dx, y + b * tam + dy))); if (tr.length === 1) xL.lineTo(px + tr[0][0] * tam + dx + 0.01, y + tr[0][1] * tam + dy); xL.stroke(); }
            px += (gl.w + 0.2) * tam;
          }
        }
        idx += ln.length;
      });
      xL.globalAlpha = 1;
      return 1;
    }
    const lente = criarLente(render, L, A, F, cvL);

    // ---------- desenhar(t) ----------
    const alvo = new THREE.Vector3();
    function desenhar(t) {
      const q = Math.round(t * fps), ip = planoEm(t), P = PL[ip], C = CEN[P.cenario], LZ = P.luz;
      // só o cenário do plano aparece
      for (const nome in CEN) CEN[nome].g.visible = nome === P.cenario;
      for (const f of anima) f(t, q);
      for (const l of luzes) l.luz.intensity = l.cenario === P.cenario ? l.forca(t, q) : 0;

      // céu e sol do plano
      fundo.set(LZ.fundo); cena.background = fundo;
      hemi.color.set(LZ.ceu); hemi.groundColor.set(LZ.chao); hemi.intensity = LZ.ambiente;
      sol.color.set(LZ.sol); sol.intensity = LZ.forca;
      sol.position.set(C.lugar[0] + LZ.de[0], C.lugar[1] + LZ.de[1], C.lugar[2] + LZ.de[2]);
      sol.target.position.set(C.lugar[0], C.lugar[1], C.lugar[2]); sol.target.updateMatrixWorld();

      // câmera de três quartos que gira em volta do centro do plano
      const K = P.camera, k = (K.anda === 'sai' ? saiDevagar : suave)(trecho(t, P.de, P.ate));
      const dist = mistura(...par(K.dist), k), el = mistura(...par(K.elev), k) * Math.PI / 180, gi = mistura(...par(K.giro), k) * Math.PI / 180;
      const cc = mix3(K.centro, K.centroFim || K.centro, k);
      alvo.set(C.lugar[0] + cc[0], C.lugar[1] + cc[1], C.lugar[2] + cc[2]);
      camera.position.set(alvo.x + dist * Math.cos(el) * Math.sin(gi), alvo.y + dist * Math.sin(el), alvo.z + dist * Math.cos(el) * Math.cos(gi));
      camera.lookAt(alvo); camera.fov = K.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();

      // passagens: escuro do começo e do fim, clarão em alguns cortes
      const apaga = Math.max(1 - trecho(t, 0, ABRE), trecho(t, FIM, duracao));
      let clarao = 0;
      PL.forEach((Q) => { if (Q.entrada === 'clarao') { const d = t - Q.de; if (d >= 0) clarao = Math.max(clarao, 0.75 * Math.exp(-d * 9)); } });

      const temLegenda = legenda(t);
      lente.foto(cena, camera, { semente: q, distFoco: dist, desfoque: K.desfoque ?? F.desfoque, tilt: K.tilt ?? F.tilt, legenda: temLegenda, apaga, clarao, brilho: 1 });
    }

    // ---------- som: caixinha e marimba suaves; cada ação tem o seu barulho, no mesmo segundo da imagem ----------
    function som() {
      const s = Som.criar(duracao, H.semente), M = H.musica, r = sorteio(H.semente + 9);
      // trilha: arpejo de caixinha de música em cima de acordes macios (bem baixo, como fundo)
      M.acordes.forEach((a, i) => {
        const fim = i + 1 < M.acordes.length ? M.acordes[i + 1].de : duracao;
        a.notas.forEach((n, j) => s.nota(n, a.de, fim - a.de, { forma: 'tri', vol: 0.032, ataque: 0.25, solta: 0.4, pan: (j - 1) * 0.3 }));
        s.nota(a.baixo, a.de, fim - a.de, { forma: 'seno', vol: 0.1, ataque: 0.05, solta: 0.3 });
        for (let b = 0, tb = a.de; tb < fim - 0.05; b++, tb += M.passo) s.sino(a.notas[b % a.notas.length].replace(/\d/, (d) => String(Number(d) + 1)), tb, 0.5, { vol: 0.045, pan: ((b % 4) - 1.5) * 0.25, brilho: 1.6 });
      });
      // cada palavra da legenda: um tique bem leve
      for (const lg of LEG) lg.inicio.forEach((ti) => s.toque(ti, { vol: 0.01, corte: 3000, dur: 0.02 }));
      // corte de plano: um "whoosh" curto
      PL.forEach((P, i) => { if (i) s.vento(P.de - 0.18, 0.4, { vol: P.entrada === 'clarao' ? 0.14 : 0.07, corte: 1500, onda: 2, entra: 0.15, sai: 0.2 }); if (P.entrada === 'clarao') s.sino('C6', P.de, 0.9, { vol: 0.06, brilho: 2.6 }); });
      // abelhas zumbindo onde aparecem (onda de serra com vibrato rápido)
      for (const P of PL) {
        const temAbelha = todas('abelhas').some((p) => p.cenario === P.cenario && (p.de == null || p.de < P.ate));
        if (temAbelha) {
          const ini = Math.max(P.de, ...todas('abelhas').filter((p) => p.cenario === P.cenario && p.de != null).map((p) => p.de));
          s.nota('A2', ini, P.ate - ini, { forma: 'serra', vol: 0.03, ataque: 0.25, solta: 0.15, vibrato: 0.03, vibratoHz: 24, pan: -0.3 });
          s.nota('E3', ini + 0.1, P.ate - ini - 0.1, { forma: 'serra', vol: 0.018, ataque: 0.3, solta: 0.15, vibrato: 0.04, vibratoHz: 31, pan: 0.3 });
        }
      }
      // colmeia: a gota de mel pinga
      for (const p of todas('colmeia')) { s.pio(p.pinga + 0.45, { freq: 900, sobe: 0.9, dur: 0.09, repete: 1, vol: 0.09 }); s.batida(p.pinga + 0.5, { vol: 0.12, freq: 300, dur: 0.1 }); }
      // tumba: fogo das tochas estalando, a tampa de barro raspando e os brilhos tilintando
      for (const P of PL) if (todas('tocha').some((p) => p.cenario === P.cenario)) {
        s.vento(P.de, P.ate - P.de, { vol: 0.035, corte: 500, onda: 3, profundidade: 0.5, entra: 0.1, sai: 0.1 });
        for (let tt = P.de + 0.05; tt < P.ate; tt += 0.07 + 0.2 * r()) s.toque(tt, { vol: 0.03 + 0.04 * r(), corte: 3500 + 2000 * r(), dur: 0.02, pan: r() - 0.5 });
      }
      if (PB) {
        s.vento(PB.abre[0], PB.abre[1] - PB.abre[0] + 0.1, { vol: 0.09, corte: 2600, onda: 6, profundidade: 0.6, entra: 0.03, sai: 0.1 });
        s.batida(PB.abre[0], { vol: 0.18, freq: 160, dur: 0.12 });
        for (let i = 0; i < PB.brilhos; i += 2) s.sino(M.brilho[i % M.brilho.length], PB.abre[0] + 0.15 + i * PB.intervalo, 0.5, { vol: 0.04, pan: (r() - 0.5) * 0.8, brilho: 2.4 });
      }
      // mel caindo: um "plic" grave a cada 4 cubos que chegam; a água sai com "ploc" que sobe
      if (PVinfo) {
        PVinfo.casas.filter((c) => !c.agua).forEach((c, i) => { if (i % 4 === 0) s.batida(c.chega, { vol: 0.07 + 0.03 * r(), freq: 180 + 80 * r(), dur: 0.08, pan: (c.x / 3) * 0.5 }); });
        PVinfo.agua.forEach((c) => { s.pio(c.agua.sai, { freq: 500 + 200 * r(), sobe: 1.4, dur: 0.12, repete: 1, vol: 0.07 }); s.toque(c.agua.sai + 1.05, { vol: 0.06, corte: 2500, dur: 0.04, pan: c.agua.cai[0] / 8 }); });
        const G = H.germes;
        // germes: tremem (zumbido nervoso) e recuam com passinhos e um gritinho que desce
        s.nota('C#4', G.treme[0], G.treme[1] - G.treme[0], { forma: 'quad', vol: 0.02, ataque: 0.05, solta: 0.1, vibrato: 0.06, vibratoHz: 14 });
        GERMES.forEach((g, i) => { s.pio(G.recua[0] + i * 0.08, { freq: 1500 - i * 200, sobe: -0.5, dur: 0.16, repete: 1, vol: 0.05, pan: (g.x / 6) * 0.6 }); for (let k = 1; k <= 3; k++) s.toque(G.recua[0] + i * 0.08 + k * (G.recua[1] - G.recua[0]) / 3, { vol: 0.04, corte: 2000, dur: 0.03 }); });
        // enzima: zumbido da abelha que chega, a faísca que cai (assobio) e o estouro mágico
        const EZ = PV.enzima;
        s.pio(EZ.solta, { freq: 2200, sobe: -0.55, dur: EZ.bate - EZ.solta, repete: 1, vol: 0.06 });
        M.magia.forEach((n, j) => s.sino(n, EZ.bate + j * 0.06, 1.0, { vol: 0.07, pan: (j - 2) * 0.25, brilho: 2.8 }));
        s.vento(EZ.bate, 0.6, { vol: 0.06, corte: 6000, onda: 4, entra: 0.02, sai: 0.5 });
        // tampa: cai assobiando e fecha com uma batida forte (o ponto mais alto do filme)
        const TC = PV.tampaCai;
        s.vento(TC.de, TC.em - TC.de, { vol: 0.1, corte: 1200, onda: 1, entra: 0.2, sai: 0.03 });
        s.batida(TC.em, { vol: 0.5, freq: 95, dur: 0.4 }); s.toque(TC.em, { vol: 0.2, corte: 4000, dur: 0.06 });
        s.batida(TC.em + 0.16, { vol: 0.2, freq: 130, dur: 0.12 });
        M.final.forEach((n, j) => s.sino(n, TC.em + 0.25 + j * 0.12, 1.6, { vol: 0.06, pan: (j - 1.5) * 0.3, brilho: 2 }));
      }
      s.sala(0.35);
      return s.fim({ entra: 0.2, sai: 0.3, pico: 0.78 });
    }

    return { desenhar, som };
  },
});
