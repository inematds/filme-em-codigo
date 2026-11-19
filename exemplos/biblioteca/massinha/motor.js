// MOTOR "massinha" — massinha de modelar numa maquete de mesa, fotografada em stop-motion.
// Jeito de animar: cena-3d (three.js, sem placa de vídeo). Tudo anda em 12 POSES por segundo, como
// quem fotografa a maquete, mexe um pouquinho e fotografa de novo: torre, bonecos, sol, câmera e luz.
// O vídeo sai a 30 quadros por segundo, mas cada pose fica parada por 2 ou 3 quadros.
// Cada peça é uma forma lisa amassada com ruído (massa calombenta), com digitais no relevo e uma
// fervura leve da superfície a cada pose. Bonecos e sol são desenho próprio.
// O filme é narrado na fonte: aqui a fala vira LEGENDA (2 ou 3 palavras, a palavra falada em amarelo),
// com música e sons feitos em código. Sem voz.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import { h, amassa, bolo, tubo, junta, texturaDigitais, materialMassa, ajeita } from './massa.js';
import { criarLente } from './lente.js';

const { limita, mistura, trecho, suave, sorteio } = Filme;

// valor de uma lista de chaves { t, v } no tempo t: mistura suave; "corte" = pula na hora;
// "degraus" = sobe em N passinhos (stop-motion de régua)
function mistureValor(a, b, k) {
  if (typeof a === 'number') return mistura(a, b, k);
  if (Array.isArray(a)) return a.map((v, i) => mistura(v, b[i], k));
  if (typeof a === 'string' && a[0] === '#') return '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
  return k < 1 ? a : b;
}
function chave(K, t, campo = 'v') {
  let i = 0; while (i < K.length - 1 && K[i + 1].t <= t) i++;
  const a = K[i], b = K[i + 1];
  if (!b || b.corte || t <= a.t || !(campo in b)) return a[campo];
  let k = (t - a.t) / (b.t - a.t);
  k = b.degraus ? Math.floor(k * b.degraus + 1e-6) / b.degraus : suave(k);
  return mistureValor(a[campo], b[campo], k);
}

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 15,
  montar({ historia: H, tela, largura: L, altura: A, duracao }) {
    const C = H.cores, F = H.filme, LZ = H.luz, MS = H.massa, PPS = H.posesPorSegundo || 12;
    const acaso = sorteio(H.semente);
    const pecasH = H.pecas, todas = (tipo) => pecasH.filter((p) => p.tipo === tipo), uma = (tipo) => pecasH.find((p) => p.tipo === tipo);
    const pose = (t) => Math.floor(t * PPS + 1e-6);

    // ---------- o fotógrafo ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, L / A, 0.1, 200);

    // ---------- a massa ----------
    const U = { uPose: { value: 0 }, uS: { value: 1 }, uB: { value: 0 }, uH: { value: 10 } };
    const digitais = texturaDigitais(sorteio(H.semente + 3)); digitais.repeat.set(MS.repete, MS.repete);
    const matVC = materialMassa(U, { vertexColors: true, digitais, relevo: MS.digital, boil: MS.boil });
    const cache = new Map();
    const mat = (cor, boil = MS.boil) => {
      const k = cor + boil; if (cache.has(k)) return cache.get(k);
      const m = materialMassa(U, { cor, digitais, relevo: MS.digital, boil }); cache.set(k, m); return m;
    };
    let semente = H.semente * 101;
    const am = (g, amp, freq) => amassa(g, amp * (MS.calombo || 1), freq, semente++); // calombo: quanto a massa foi apertada
    // põe uma forma (já amassada) num grupo
    const poe = (pai, g, cor, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, boil) => {
      const m = new THREE.Mesh(g, mat(cor, boil)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true; pai.add(m); return m;
    };
    // forma solta num lugar do mundo, para juntar com outras numa malha só
    const noLugar = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => {
      const M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(...s));
      return g.applyMatrix4(M);
    };
    const tom = (cor, q = 0.06) => '#' + new THREE.Color(cor).multiplyScalar(1 - q + 2 * q * acaso()).getHexString();

    // ---------- cenário fixo (uma malha só, com a cor em cada ponto) ----------
    const fixo = [], janelas = [];
    const ME = uma('mesa'), PR = uma('praca');
    {
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(ME.lado, ME.lado, 1, 1), new THREE.MeshStandardMaterial({ color: C.mesa, roughness: 0.92, bumpMap: digitais, bumpScale: 0.5 }));
      mesa.rotation.x = -Math.PI / 2; mesa.position.y = ME.y; mesa.receiveShadow = true; cena.add(mesa);
      const g = am(bolo(PR.largura, 0.5, PR.fundo, 0.28, 40), 0.07, 0.9);
      fixo.push({ g: noLugar(g, PR.x, -0.3, PR.z), c: C.praca });
    }
    for (const P of todas('predio')) {
      const g = am(bolo(P.largura, P.altura, P.fundo, 0.3, 26), 0.06, 1.1);
      fixo.push({ g: noLugar(g, P.x, P.altura / 2 - 0.2, P.z), c: tom(C.predio[Math.floor(acaso() * C.predio.length)], 0.03) });
      const tg = am(bolo(P.largura + 0.25, 0.75, P.fundo + 0.2, 0.55, 22), 0.05, 1.3);
      fixo.push({ g: noLugar(tg, P.x, P.altura - 0.05, P.z), c: tom(C.telhado, 0.05) });
      const ch = am(bolo(0.28, 0.6, 0.28, 0.4, 12), 0.025, 3);
      fixo.push({ g: noLugar(ch, P.x + P.largura * (acaso() - 0.5) * 0.6, P.altura + 0.45, P.z), c: tom(C.chamine, 0.05) });
      for (let a = 0; a < P.andares; a++) for (let c = 0; c < P.colunas; c++) {
        const wx = P.x - P.largura / 2 + (c + 0.5) * P.largura / P.colunas, wy = 0.55 + a * (P.altura - 0.9) / P.andares + 0.25;
        const jg = am(bolo(0.32, 0.46, 0.12, 0.45, 10), 0.015, 5);
        janelas.push({ g: noLugar(jg, wx, wy, P.z + P.fundo / 2 + 0.01), c: '#ffffff' });
      }
    }
    for (const T of todas('arvore')) {
      fixo.push({ g: noLugar(am(tubo([[0, 0, 0], [0.04, T.altura * 0.5, 0], [0, T.altura, 0]], 0.14, 0.09, 4, 7), 0.02, 4), T.x, -0.05, T.z), c: C.tronco });
      for (let k = 0; k < 3; k++) {
        const r = T.raio * (0.75 + 0.25 * acaso());
        const g = am(bolo(r * 1.6, r * 1.5, r * 1.6, 1, 18), r * 0.12, 1.6);
        fixo.push({ g: noLugar(g, T.x + (k - 1) * r * 0.45, T.altura + r * 0.4 + (k === 1 ? r * 0.35 : 0), T.z + (acaso() - 0.5) * 0.3), c: tom(C.copa[k % C.copa.length], 0.04) });
      }
    }
    for (const N of todas('nuvem')) {
      const w = N.largura;
      for (let k = 0; k < 4; k++) {
        const r = w * (k === 1 || k === 2 ? 0.3 : 0.22);
        const g = am(bolo(r * 2, r * 1.3, r * 1.2, 1, 16), r * 0.1, 1.8);
        fixo.push({ g: noLugar(g, N.x + (k - 1.5) * w * 0.24, N.y + (k === 1 || k === 2 ? r * 0.25 : 0), N.z), c: tom(C.nuvem, 0.03) });
      }
      fixo.push({ g: noLugar(new THREE.CylinderGeometry(0.012, 0.012, 30, 4), N.x, N.y + 15, N.z), c: C.fio });
    }
    const malhaFixa = new THREE.Mesh(junta(fixo), matVC); malhaFixa.castShadow = malhaFixa.receiveShadow = true; cena.add(malhaFixa);
    const matJanela = materialMassa(U, { cor: C.janela, digitais, relevo: 0.4, boil: 0.003, emissiva: C.janelaAcesa });
    const malhaJanelas = new THREE.Mesh(junta(janelas), matJanela); malhaJanelas.receiveShadow = true; cena.add(malhaJanelas);

    // céu pintado no fundo (degradê que muda com a hora do dia)
    const CE = uma('ceu');
    const matCeu = new THREE.ShaderMaterial({
      uniforms: { uTopo: { value: new THREE.Color() }, uBase: { value: new THREE.Color() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 uTopo, uBase;
        void main(){ float k = smoothstep(0.12, 0.38, vUv.y); vec3 c = mix(uBase, uTopo, k);
          c *= 0.97 + 0.03 * sin(vUv.x * 40.0 + sin(vUv.y * 23.0) * 2.0); gl_FragColor = vec4(c, 1.0); }`,
    });
    const ceu = new THREE.Mesh(new THREE.PlaneGeometry(CE.largura, CE.altura), matCeu);
    ceu.position.set(0, CE.altura / 2 - 6, CE.z); cena.add(ceu);

    // ---------- a torre: perfil curvo, quatro pés, arcos, travessas em X, plataformas e a ponta ----------
    const TO = uma('torre'), HT = TO.altura; U.uH.value = HT;
    const yTopo = HT * 0.86;                                   // plataforma de cima
    const meia = (y) => 0.17 + 2.33 * Math.pow(Math.max(0, 1 - y / yTopo), 2.1);
    {
      const pc = [];
      const canto = (sx, sz, y) => [sx * meia(y), y, sz * meia(y)];
      const cantos = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
      const r = (y) => 0.06 + 0.17 * Math.pow(Math.max(0, 1 - y / yTopo), 1.5);
      for (const [sx, sz] of cantos) {
        const pts = []; for (let y = 0; y <= yTopo + 1e-6; y += yTopo / 10) pts.push(canto(sx, sz, y));
        pc.push({ g: am(tubo(pts, r(0), r(yTopo), 20, 8), 0.025, 2.2), c: C.torre });
        pc.push({ g: noLugar(am(bolo(0.75, 0.42, 0.75, 0.45, 14), 0.04, 2), sx * meia(0), 0.12, sz * meia(0)), c: C.torreEscura });
      }
      const niveis = [0.6, 1.4, 2.6, 3.35, 4.1, 4.85, 5.6, 6.35, 7.1, 7.85, yTopo];
      const faces = [[0, 1], [1, 2], [2, 3], [3, 0]];
      for (const [i, j] of faces) {
        const A_ = cantos[i], B_ = cantos[j];
        for (const y of niveis) pc.push({ g: am(tubo([canto(...A_, y), canto(...B_, y)], 0.045, 0.045, 3, 6), 0.012, 4), c: C.torre });
        for (let n = 1; n < niveis.length - 1; n++) {
          const ya = niveis[n], yb = niveis[n + 1];
          pc.push({ g: am(tubo([canto(...A_, ya), canto(...B_, yb)], 0.034, 0.03, 4, 5), 0.01, 5), c: C.torreEscura });
          pc.push({ g: am(tubo([canto(...B_, ya), canto(...A_, yb)], 0.034, 0.03, 4, 5), 0.01, 5), c: C.torreEscura });
        }
        // arco da base: de um pé ao outro, subindo até 1,9
        const arco = [];
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI * k / 10, y = 0.45 + 1.45 * Math.sin(a), f = -Math.cos(a);
          const pa = canto(...A_, y), pb = canto(...B_, y);
          arco.push([mistura(pa[0], pb[0], (f + 1) / 2) * 0.96, y, mistura(pa[2], pb[2], (f + 1) / 2) * 0.96]);
        }
        pc.push({ g: am(tubo(arco, 0.075, 0.075, 16, 7), 0.015, 3), c: C.torre });
      }
      const plat = (y, lado, alt) => pc.push({ g: noLugar(am(bolo(lado, alt, lado, 0.35, 22), 0.03, 2.5), 0, y, 0), c: C.torreEscura });
      plat(2.6, 2 * meia(2.6) + 0.55, 0.3); plat(5.6, 2 * meia(5.6) + 0.42, 0.24); plat(yTopo, 0.62, 0.34);
      pc.push({ g: noLugar(am(bolo(0.36, 0.45, 0.36, 0.6, 14), 0.02, 4), 0, yTopo + 0.35, 0), c: C.torre });
      pc.push({ g: am(tubo([[0, yTopo + 0.5, 0], [0, (yTopo + HT) / 2, 0], [0, HT - 0.02, 0]], 0.07, 0.04, 6, 7), 0.008, 6), c: C.torre });
      pc.push({ g: noLugar(am(bolo(0.13, 0.11, 0.13, 1, 12), 0.006, 9), 0, HT - 0.4, 0), c: C.torreEscura });
      const g = junta(pc);
      const matTorre = ajeita(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.88, metalness: 0, bumpMap: digitais, bumpScale: MS.digital }), U, { torre: true, boil: MS.boil });
      const torre = new THREE.Mesh(g, matTorre); torre.position.set(TO.x, 0, TO.z);
      torre.castShadow = torre.receiveShadow = true;
      torre.customDepthMaterial = ajeita(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), U, { torre: true, boil: MS.boil });
      cena.add(torre);
    }
    // o mesmo jeito do sombreador, em conta: onde fica um ponto da torre esticada e entortada
    const espinha = (x, y, z, s, b) => { const k = limita(y / HT, 0, 1.3); return [TO.x + x + b * HT * k * k, y * s, TO.z + z]; };
    const inclinacao = (y, s, b) => -Math.atan((2 * b * limita(y / HT, 0, 1.3)) / s);

    // ---------- régua amarela (com os números em traços) e a setinha vermelha ----------
    const RG = uma('regua');
    const regua = new THREE.Group(); cena.add(regua);
    const seta = new THREE.Group(); cena.add(seta);
    if (RG) {
      const larg = 0.26, base = RG.zero - 0.13, topo = RG.zero + RG.comprimento + 0.17, alt = topo - base;
      poe(regua, am(bolo(larg, alt, 0.07, 0.3, 22), 0.006, 6), C.regua, 0, (base + topo) / 2, 0, 0, 0, 0, 0.002);
      poe(regua, am(tubo([[0, base - 4, -0.06], [0, base + 0.2, -0.06]], 0.035, 0.035, 4, 6), 0.008, 3), C.cavalete, 0, 0, 0, 0, 0, 0, 0.002);
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * alt / larg);
      const x = cv.getContext('2d'), pp = cv.width / larg, yPx = (y) => (topo - y) * pp;
      x.strokeStyle = C.reguaRisco; x.lineCap = 'round';
      for (let cm = 0; cm <= RG.cm; cm++) {
        const y = yPx(RG.zero + cm * RG.comprimento / RG.cm), longo = cm % 5 === 0;
        x.lineWidth = longo ? 6 : 4; x.beginPath(); x.moveTo(0, y); x.lineTo(longo ? 92 : 54, y); x.stroke();
        if (longo) escreve(x, String(cm), 200, y - 26, 52, C.reguaRisco, 9);
      }
      escreve(x, 'CM', 200, yPx(topo) + 20, 40, C.reguaRisco, 7);
      const tx = new THREE.CanvasTexture(cv);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(larg * 0.94, alt * 0.97), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.9 }));
      face.position.set(0, (base + topo) / 2, 0.045); regua.add(face);
      regua.position.set(TO.x + RG.x, 0, TO.z + RG.z);
      const cone = new THREE.Mesh(am(new THREE.ConeGeometry(0.05, 0.16, 10, 2), 0.004, 20), mat(C.seta, 0.002));
      cone.rotation.z = -Math.PI / 2; cone.castShadow = true; seta.add(cone);
      seta.add(Object.assign(new THREE.Mesh(am(tubo([[-0.16, 0, 0], [-0.06, 0, 0]], 0.012, 0.012, 2, 5), 0.002, 20), mat(C.torreEscura, 0.002))));
    }
    // escreve números com as letras em traços (sem fonte instalada)
    function escreve(x, txt, cx, cy, tam, cor, larg) {
      x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = larg; x.strokeStyle = cor;
      let px = cx - Letras.largura(txt, tam) / 2;
      for (const ch of txt) {
        const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
        for (const tr of gl.tracos) { x.beginPath(); tr.forEach(([a, b], i) => (i ? x.lineTo(px + a * tam, cy + b * tam) : x.moveTo(px + a * tam, cy + b * tam))); x.stroke(); }
        px += (gl.w + 0.2) * tam;
      }
    }

    // ---------- o sol de massinha: bola, raios em cone, cara que muda ----------
    const SO = uma('sol');
    const sol = new THREE.Group(); cena.add(sol);
    const caraSol = {};
    {
      const R = SO.raio;
      poe(sol, am(bolo(2 * R, 2 * R, 1.6 * R, 1, 28), R * 0.05, 2.2), C.sol);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, rr = R * 1.12;
        const g = am(new THREE.ConeGeometry(R * 0.2, R * 0.55, 10, 3), R * 0.02, 6);
        poe(sol, g, C.raio, Math.cos(a) * rr, Math.sin(a) * rr, -0.05, 0, 0, a - Math.PI / 2);
      }
      for (const s of [-1, 1]) {
        caraSol['olho' + s] = poe(sol, bolo(R * 0.17, R * 0.24, R * 0.1, 1, 12), C.olho, s * R * 0.32, R * 0.18, R * 0.76, 0, 0, 0, 0.002);
        poe(sol, bolo(R * 0.3, R * 0.18, R * 0.08, 1, 12), C.bochecha, s * R * 0.55, -R * 0.1, R * 0.7, 0, s * 0.5, 0, 0.002);
      }
      caraSol.sorri = poe(sol, new THREE.TorusGeometry(R * 0.3, R * 0.055, 8, 16, Math.PI), C.olho, 0, -R * 0.12, R * 0.8, 0, 0, Math.PI, 0.002);
      caraSol.calmo = poe(sol, new THREE.TorusGeometry(R * 0.22, R * 0.05, 8, 14, Math.PI * 0.7), C.olho, 0, -R * 0.12, R * 0.8, 0, 0, Math.PI * 1.15, 0.002);
      caraSol.espanto = poe(sol, new THREE.TorusGeometry(R * 0.13, R * 0.06, 8, 16), C.olho, 0, -R * 0.3, R * 0.8, 0, 0, 0, 0.002);
      poe(sol, new THREE.CylinderGeometry(0.012, 0.012, 30, 4), C.fio, 0, R + 15, 0);
    }

    // ---------- o pombo (desenho próprio): corpo de ovo, asas, colar verde, bico laranja ----------
    const PB = uma('pombo');
    const pombo = new THREE.Group(); cena.add(pombo);
    const pb = {};
    {
      const e = PB.escala || 1, bo = 0.0018, raiz = new THREE.Group(); raiz.scale.setScalar(e); pombo.add(raiz); pb.raiz = raiz;
      const corpo = new THREE.Group(); raiz.add(corpo); pb.corpo = corpo;
      poe(corpo, am(bolo(0.25, 0.24, 0.32, 1, 22), 0.008, 14), C.pombo, 0, 0.18, -0.01, 0.25, 0, 0, bo);
      poe(corpo, am(bolo(0.19, 0.17, 0.12, 1, 14), 0.005, 18), C.pomboClaro, 0, 0.15, 0.1, 0.25, 0, 0, bo);
      poe(corpo, am(bolo(0.12, 0.035, 0.17, 0.8, 12), 0.004, 20), C.pomboAsa, 0, 0.13, -0.2, -0.45, 0, 0, bo);
      pb.asas = [-1, 1].map((s) => {
        const g = new THREE.Group(); g.position.set(s * 0.1, 0.25, -0.03); corpo.add(g);
        poe(g, am(bolo(0.05, 0.16, 0.25, 0.8, 14), 0.005, 18), C.pomboAsa, 0, -0.06, -0.02, 0.3, 0, -s * 0.12, bo);
        return g;
      });
      poe(corpo, am(new THREE.TorusGeometry(0.062, 0.03, 8, 18), 0.003, 25), C.pescoco, 0, 0.3, 0.05, Math.PI / 2 - 0.35, 0, 0, bo);
      const cab = new THREE.Group(); cab.position.set(0, 0.34, 0.06); corpo.add(cab); pb.cab = cab;
      poe(cab, am(bolo(0.17, 0.165, 0.17, 1, 18), 0.004, 20), C.pombo, 0, 0, 0, 0, 0, 0, bo);
      poe(cab, am(new THREE.ConeGeometry(0.03, 0.09, 10, 2), 0.002, 30), C.bico, 0, -0.012, 0.11, Math.PI / 2 + 0.2, 0, 0, bo);
      pb.olhos = [-1, 1].map((s) => {
        const g = new THREE.Group(); g.position.set(s * 0.06, 0.025, 0.05); g.rotation.y = s * 0.55; cab.add(g);
        poe(g, bolo(0.05, 0.05, 0.03, 1, 12), C.branco, 0, 0, 0, 0, 0, 0, bo);
        poe(g, bolo(0.028, 0.03, 0.02, 1, 10), C.olho, 0, 0, 0.012, 0, 0, 0, bo);
        return g;
      });
      for (const s of [-1, 1]) poe(raiz, am(bolo(0.035, 0.05, 0.07, 0.8, 10), 0.002, 30), C.pe, s * 0.045, 0.02, 0.03, 0, 0, 0, bo);
    }

    // ---------- bonecos (desenho próprio): pintor de boina e padeiro de touca ----------
    function quadrinho() { // a pintura no cavalete: uma torrinha marrom num céu azul, pincelada
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 230;
      const x = cv.getContext('2d'); x.fillStyle = '#bcd6ea'; x.fillRect(0, 0, 256, 230);
      x.fillStyle = '#e8d9b0'; x.fillRect(0, 178, 256, 52);
      x.strokeStyle = '#8a4a22'; x.lineWidth = 9; x.lineCap = 'round';
      x.beginPath(); x.moveTo(78, 190); x.quadraticCurveTo(118, 120, 126, 26); x.quadraticCurveTo(134, 120, 178, 190); x.stroke();
      x.lineWidth = 6; x.beginPath(); x.moveTo(100, 120); x.lineTo(152, 120); x.moveTo(110, 165); x.quadraticCurveTo(128, 140, 146, 165); x.stroke();
      return new THREE.CanvasTexture(cv);
    }
    const bonecos = todas('boneco').map((B, bi) => {
      const pintor = B.papel === 'pintor', corCorpo = pintor ? C.pintor : C.padeiro;
      const raiz = new THREE.Group(); cena.add(raiz);
      for (const s of [-1, 1]) poe(raiz, am(bolo(0.19, 0.44, 0.22, 0.6, 14), 0.015, 5), C.calca, s * 0.12, 0.22, 0);
      poe(raiz, am(bolo(0.68, 0.8, 0.52, 0.55, 22), 0.03, 2.5), corCorpo, 0, 0.78, 0);
      if (!pintor) poe(raiz, am(bolo(0.5, 0.56, 0.08, 0.5, 14), 0.015, 4), C.branco, 0, 0.68, 0.25, -0.08, 0, 0);
      const cab = new THREE.Group(); cab.position.set(0, 1.44, 0); raiz.add(cab);
      poe(cab, am(bolo(0.6, 0.58, 0.56, 1, 22), 0.025, 3), C.pele);
      poe(cab, am(bolo(0.14, 0.13, 0.14, 1, 12), 0.008, 8), C.pele, 0, -0.03, 0.29);
      for (const s of [-1, 1]) poe(cab, bolo(0.065, 0.085, 0.04, 1, 10), C.olho, s * 0.11, 0.08, 0.255, 0, s * 0.3, 0);
      poe(cab, am(bolo(pintor ? 0.36 : 0.3, 0.09, 0.1, 0.7, 12), 0.01, 8), C.bigode, 0, -0.12, 0.265, 0, 0, 0);
      if (pintor) {
        poe(cab, am(bolo(0.66, 0.2, 0.62, 1, 20), 0.02, 4), C.boina, 0.04, 0.27, -0.02, 0, 0, -0.22);
        poe(cab, bolo(0.07, 0.08, 0.07, 1, 8), C.boina, -0.02, 0.39, -0.02);
      } else {
        poe(cab, am(bolo(0.46, 0.34, 0.46, 0.8, 18), 0.015, 5), C.branco, 0, 0.35, 0);
        poe(cab, am(bolo(0.66, 0.38, 0.62, 1, 20), 0.04, 3.5), C.branco, 0, 0.58, 0);
      }
      const ombros = [-1, 1].map((s) => {
        const o = new THREE.Group(); o.position.set(s * 0.37, 1.08, 0); raiz.add(o);
        poe(o, am(tubo([[0, 0, 0], [s * 0.02, -0.22, 0.02], [0, -0.42, 0.04]], 0.09, 0.08, 4, 7), 0.01, 6), corCorpo);
        poe(o, am(bolo(0.16, 0.16, 0.16, 1, 12), 0.008, 8), C.pele, 0, -0.48, 0.05);
        return o;
      });
      const mao = ombros[1];
      if (pintor) {
        poe(mao, am(tubo([[0, -0.48, 0.05], [0, -0.5, 0.42]], 0.022, 0.018, 3, 6), 0.003, 10), C.cavalete);
        poe(mao, am(bolo(0.05, 0.05, 0.09, 1, 8), 0.003, 12), C.seta, 0, -0.5, 0.45);
      } else {
        poe(mao, am(bolo(0.13, 0.13, 0.8, 0.85, 18), 0.012, 6), C.pao, 0, -0.5, 0.2, 0.15, 0, 0);
      }
      if (B.cavalete) {
        const cv = new THREE.Group(); cv.position.set(B.cavalete.x, 0, B.cavalete.z); cv.rotation.y = B.cavalete.giro; cena.add(cv);
        for (const [x0, z0] of [[-0.3, 0.12], [0.3, 0.12], [0, -0.35]]) poe(cv, am(tubo([[x0, 0, z0], [x0 * 0.3, 1.5, z0 * 0.2]], 0.035, 0.03, 4, 6), 0.006, 6), C.cavalete);
        poe(cv, am(bolo(0.74, 0.08, 0.12, 0.4, 10), 0.006, 6), C.cavalete, 0, 0.75, 0.1);
        poe(cv, am(bolo(0.76, 0.68, 0.05, 0.3, 14), 0.008, 5), C.tela, 0, 1.13, 0.12, -0.12, 0, 0);
        const quadro = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.59), new THREE.MeshStandardMaterial({ map: quadrinho(), roughness: 0.95 }));
        quadro.position.set(0, 1.13, 0.155); quadro.rotation.x = -0.12; cv.add(quadro);
      }
      return { B, raiz, cab, ombros, bi };
    });

    // ---------- luz: lâmpada quente do estúdio (treme um tiquinho entre as fotos) e o céu ----------
    const hemi = new THREE.HemisphereLight(LZ.ceu, LZ.chao, 1); cena.add(hemi);
    const chaveLuz = new THREE.DirectionalLight('#ffffff', 2.5);
    chaveLuz.position.set(...LZ.de); chaveLuz.target.position.set(0, 4, 0); cena.add(chaveLuz, chaveLuz.target);
    chaveLuz.castShadow = true; chaveLuz.shadow.mapSize.set(2048, 2048); chaveLuz.shadow.bias = -0.0005; chaveLuz.shadow.normalBias = 0.03; chaveLuz.shadow.radius = 4;
    Object.assign(chaveLuz.shadow.camera, { left: -15, right: 15, top: 16, bottom: -14, near: 1, far: 70 }); chaveLuz.shadow.camera.updateProjectionMatrix();

    // ---------- câmera: curva suave dentro de cada plano; "corte" troca de plano na hora ----------
    const K = H.camera;
    function cam(campo, t) {
      let ini = 0; K.forEach((k, j) => { if (k.t <= t && (k.corte || j === 0)) ini = j; });
      let fim = ini; while (fim + 1 < K.length && !K[fim + 1].corte) fim++;
      const S = K.slice(ini, fim + 1);
      const val = (k) => (Array.isArray(k[campo]) ? k[campo] : [k[campo]]);
      if (S.length === 1 || t <= S[0].t) return val(S[0]);
      let i = 0; while (i < S.length - 2 && t > S[i + 1].t) i++;
      const a = S[i], b = S[i + 1], dt = b.t - a.t, u = limita((t - a.t) / dt);
      const tang = (j) => {
        const k = S[j]; if (k.para || j === 0 || j === S.length - 1) return val(k).map(() => 0);
        const p = val(S[j - 1]), n = val(S[j + 1]), d = S[j + 1].t - S[j - 1].t; return p.map((v, c) => (n[c] - v) / d);
      };
      const ma = tang(i), mb = tang(i + 1), pa = val(a), pbv = val(b);
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      return pa.map((v, c) => h00 * v + h10 * dt * ma[c] + h01 * pbv[c] + h11 * dt * mb[c]);
    }
    const olha = new THREE.Vector3(), foco = new THREE.Vector3(), frente = new THREE.Vector3();

    // ---------- legenda: letras gordas e redondas, brancas com contorno escuro, a palavra falada em amarelo ----------
    const cvL = document.createElement('canvas'); cvL.width = L; cvL.height = A;
    const xL = cvL.getContext('2d'), LG = H.legenda, uL = L / 1080;
    const LEGENDAS = (H.legendas || []).map((lg) => {
      const tam = LG.tam, palavras = lg.texto.split(/\s+/), linhas = []; let atual = [];
      for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && Letras.largura(tenta, tam) > LG.largura) { linhas.push(atual); atual = [p]; } else atual.push(p); }
      if (atual.length) linhas.push(atual);
      const pesos = palavras.map((p) => p.length + 2), soma = pesos.reduce((a, b) => a + b, 0);
      let acum = lg.de; const inicio = pesos.map((w) => { const v = acum; acum += (lg.ate - lg.de) * 0.8 * w / soma; return v; });
      return { ...lg, linhas, inicio };
    });
    function legenda(t) {
      xL.setTransform(1, 0, 0, 1, 0, 0); xL.clearRect(0, 0, L, A);
      const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate);
      if (!lg) return 0;
      let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
      const tam = LG.tam, passo = tam * 1.32, y0 = (lg.y || LG.y) - (lg.linhas.length - 1) * passo / 2 - tam / 2;
      const pop = 1 + 0.08 * (1 - trecho(t, lg.de, lg.de + 0.12)); // entra com um pulinho
      xL.setTransform(uL * pop, 0, 0, uL * pop, L / 2 * (1 - pop), (y0 + tam / 2) * uL * (1 - pop));
      xL.lineCap = 'round'; xL.lineJoin = 'round';
      let idx = 0;
      lg.linhas.forEach((ln, li) => {
        const txt = ln.join(' '), y = y0 + li * passo;
        for (const passe of [0, 1]) {
          let px = 540 - Letras.largura(txt, tam) / 2, pi = idx;
          for (const ch of txt) {
            if (ch === ' ') { px += 0.42 * tam; pi++; continue; }
            const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
            xL.lineWidth = passe ? tam * 0.2 : tam * 0.42;
            xL.strokeStyle = passe ? (pi === falada ? LG.corFalada : LG.cor) : LG.contorno;
            for (const tr of gl.tracos) { xL.beginPath(); tr.forEach(([a, b], i) => (i ? xL.lineTo(px + a * tam, y + b * tam) : xL.moveTo(px + a * tam, y + b * tam))); xL.stroke(); }
            px += (gl.w + 0.2) * tam;
          }
        }
        idx += ln.length;
      });
      return 1;
    }
    const lente = criarLente(render, L, A, F, cvL);

    // ---------- desenhar(t): põe cada peça no lugar da pose e tira a foto ----------
    const CEU = H.ceu, cores = (n) => new THREE.Color(n);
    function desenhar(t) {
      const e = pose(t), tq = e / PPS;
      U.uPose.value = e;

      // câmera (também anda em poses)
      const p = cam('pos', tq), o = cam('olha', tq), fc = cam('foco', tq);
      const trC = F.tremorCamera;
      camera.position.set(p[0] + (h(e, 11) - 0.5) * trC, p[1] + (h(e, 12) - 0.5) * trC, p[2]);
      olha.set(o[0], o[1], o[2]); camera.lookAt(olha);
      camera.fov = cam('fov', tq)[0]; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      camera.getWorldDirection(frente);
      foco.set(fc[0], fc[1], fc[2]).sub(camera.position);
      const distFoco = Math.max(0.3, foco.dot(frente)), desfoque = cam('desfoque', tq)[0];

      // hora do dia: céu, lâmpada, janelas acesas
      matCeu.uniforms.uTopo.value.set(chave(CEU, tq, 'topo')); matCeu.uniforms.uBase.value.set(chave(CEU, tq, 'base'));
      chaveLuz.color.set(chave(CEU, tq, 'luz')); chaveLuz.intensity = chave(CEU, tq, 'forca') * (1 + (h(e, 5) - 0.5) * 2 * LZ.tremor);
      hemi.intensity = chave(CEU, tq, 'ambiente');
      matJanela.emissiveIntensity = 2.2 * chave(CEU, tq, 'janelas');

      // a torre estica e entorta (o sombreador faz a conta; aqui só os números)
      const s = chave(TO.estica, tq), b = chave(TO.dobra, tq);
      U.uS.value = s; U.uB.value = b;
      const ponta = espinha(0, HT, 0, s, b), giroPonta = inclinacao(HT, s, b);

      // régua e setinha só no plano delas; a seta acompanha os pés do pombo
      const comRegua = RG && tq >= RG.de && tq < RG.ate;
      regua.visible = seta.visible = !!comRegua;
      if (comRegua) seta.position.set(ponta[0] + 0.2, ponta[1] + 0.005, ponta[2] + 0.02);

      // pombo na ponta
      pombo.position.set(ponta[0], ponta[1], ponta[2]); pombo.rotation.set(0, 0.35, giroPonta);
      let cabY = 0, cabX = 0, asa = 0, pisca = 1, estufa = 1;
      for (const ac of PB.acoes) {
        if (ac.tipo === 'olha' && tq >= ac.de && tq < ac.ate) {
          const n = ac.para.length, i = Math.min(n - 1, Math.floor(trecho(tq, ac.de, ac.ate) * n));
          cabY = ac.para[i];
        }
        if (ac.tipo === 'olhaBaixo' && tq >= ac.de && tq < ac.ate) cabX = 0.35 * suave(trecho(tq, ac.de, ac.de + 0.3));
        if (ac.tipo === 'bate' && tq >= ac.de && tq < ac.ate) asa = 0.5 + 0.5 * Math.sin((tq - ac.de) * Math.PI * 7);
        if (ac.tipo === 'pisca' && tq >= ac.em && tq < ac.em + 0.17) pisca = 0.12;
        if (ac.tipo === 'arrulha' && tq >= ac.em && tq < ac.em + 0.6) estufa = 1 + 0.07 * Math.sin(trecho(tq, ac.em, ac.em + 0.6) * Math.PI * 2);
      }
      pb.cab.rotation.set(cabX, cabY, 0);
      pb.asas.forEach((g, i) => { g.rotation.set(0, 0, (i ? 1 : -1) * 1.0 * asa); });
      pb.olhos.forEach((g) => g.scale.set(1, pisca, 1));
      pb.corpo.scale.set(estufa, 1, estufa);
      pb.corpo.position.y = asa ? 0.015 * Math.sin((tq) * Math.PI * 7) : 0;

      // sol: desce no fio, olha a câmera, inclina e muda a cara
      const sp = chave(SO.caminho, tq, 'pos');
      sol.position.set(sp[0], sp[1], sp[2]);
      sol.rotation.set(0, Math.atan2(camera.position.x - sp[0], camera.position.z - sp[2]) * 0.8, chave(SO.inclina, tq));
      let jeito = SO.cara[0].jeito; for (const c of SO.cara) if (tq >= c.t) jeito = c.jeito;
      for (const k of ['sorri', 'calmo', 'espanto']) caraSol[k].visible = k === jeito;
      const olhoG = jeito === 'espanto' ? 1.4 : 1; caraSol['olho-1'].scale.setScalar(olhoG); caraSol['olho1'].scale.setScalar(olhoG);

      // bonecos
      for (const bo of bonecos) {
        const B = bo.B;
        let y = 0, cabX = 0, cabY = 0;
        const om = bo.ombros, rot = [[0, 0, -0.08], [0, 0, 0.08]];
        for (const ac of B.acoes || []) {
          if (tq < ac.de || tq >= ac.ate) continue;
          const k = suave(trecho(tq, ac.de, ac.de + 0.25)) * (1 - suave(trecho(tq, ac.ate - 0.2, ac.ate)));
          if (ac.tipo === 'pinta') { rot[1] = [(-1.0 + 0.28 * Math.sin((tq - ac.de) * 9)) * k, 0, 0.1 + 0.25 * k]; cabY = 0.35 * k; }
          if (ac.tipo === 'acena') { rot[1] = [-0.3 * k, 0, (2.3 + 0.35 * Math.sin((tq - ac.de) * 10)) * k]; }
          if (ac.tipo === 'olhaCima') { cabX = -0.55 * k; cabY = -(B.giro || 0) * k; }
          if (ac.tipo === 'aponta') rot[0] = [-2.4 * k, 0, -0.2 * k];
          if (ac.tipo === 'pula') y = Math.abs(Math.sin((tq - ac.de) * Math.PI * 3)) * 0.28;
        }
        bo.raiz.position.set(B.x, y, B.z); bo.raiz.rotation.set(0, B.giro || 0, 0);
        bo.cab.rotation.set(cabX, cabY, 0);
        om.forEach((g, i) => g.rotation.set(...rot[i]));
      }

      // legenda (no tempo da fala, não da pose) e escuro do começo e do fim
      const temLegenda = legenda(t);
      const apaga = Math.max(1 - trecho(t, 0, 0.3), trecho(t, duracao - 0.45, duracao));
      lente.foto(cena, camera, { e, distFoco, desfoque, titulo: temLegenda, apaga, brilho: 1 + (h(e, 8) - 0.5) * 2 * LZ.tremor * 0.5 });
    }

    // ---------- som: valsinha de acordeão, e cada coisa que acontece tem o seu barulho ----------
    function som() {
      const s = Som.criar(duracao, H.semente), M = H.musica, r = sorteio(H.semente + 9), bt = M.compasso;
      const noite = (H.ceu.find((c) => c.janelas >= 1) || { t: duracao }).t;
      // valsa em 3 tempos: baixo no 1, acorde curto no 2 e no 3; melodia de "acordeão" (onda quadrada com vibrato)
      for (let c = 0; c * 3 * bt < noite - 0.1; c++) {
        const t0 = 0.15 + c * 3 * bt;
        s.nota(M.baixo[c % M.baixo.length], t0, bt * 1.1, { forma: 'tri', vol: 0.17, ataque: 0.01, solta: 0.15 });
        for (const k of [1, 2]) for (const n of M.acordes[c % M.acordes.length]) s.nota(n, t0 + k * bt, bt * 0.45, { forma: 'tri', vol: 0.035, ataque: 0.01, solta: 0.08, pan: 0.2 });
      }
      M.melodia.forEach((n, i) => {
        const t0 = 0.15 + i * bt; if (t0 > noite - 0.2) return;
        s.nota(n, t0, bt * 0.95, { forma: 'quad', vol: 0.022, ataque: 0.03, solta: 0.08, vibrato: 0.006, vibratoHz: 6, pan: -0.15 });
        s.nota(n, t0, bt * 0.95, { forma: 'seno', vol: 0.05, ataque: 0.03, solta: 0.1, vibrato: 0.006, vibratoHz: 6, pan: -0.15 });
      });
      // à noite: caixinha de música bem baixinha e grilos
      M.noite.forEach((n, i) => s.sino(n, noite + 0.15 + i * 0.36, 1.2, { vol: 0.035, brilho: 1.6, pan: 0.3 }));
      for (let t = noite + 0.2; t < duracao - 0.3; t += 0.55) s.pio(t + r() * 0.1, { freq: 4300, repete: 3, vol: 0.012, pan: 0.6 });
      // cortes de plano: um "fuuu" curtinho
      for (const k of H.camera) if (k.corte) s.vento(k.t - 0.12, 0.32, { vol: 0.05, corte: 1800, entra: 0.12, sai: 0.18 });
      // pintor: pinceladas
      for (const bo of todas('boneco')) for (const ac of bo.acoes || []) {
        if (ac.tipo === 'pinta') for (let t = ac.de + 0.2; t < ac.ate - 0.2; t += 0.7) s.toque(t, { vol: 0.05, corte: 2500, dur: 0.09, pan: -0.4 });
        if (ac.tipo === 'pula') for (let k = 0; k < 2; k++) s.batida(ac.de + (k + 1) / 3, { vol: 0.16, freq: 140, dur: 0.12, pan: 0.4 });
      }
      // sol descendo no fio: um brilho de sininhos; inclinando de calor: um chiado de calor
      const solDesce = SO.caminho.find((c, i) => i > 0 && !c.corte && c.pos[1] < SO.caminho[i - 1].pos[1] - 3);
      if (solDesce) ['G6', 'C7', 'E7', 'G7'].forEach((n, i) => s.sino(n, solDesce.t - 0.45 + i * 0.09, 0.9, { vol: 0.05, brilho: 2.2, pan: 0.4 }));
      const calor = SO.inclina.find((c) => c.v > 0.2);
      if (calor) s.vento(calor.t - 0.4, 0.9, { vol: 0.09, corte: 3500, entra: 0.3, sai: 0.4, pan: 0.3 });
      // a torre: estica (sobe "bóing" e range), régua (um tique por centímetro, um "plim" no fim), encolhe (desce)
      const ES = TO.estica;
      for (let i = 1; i < ES.length; i++) {
        const a = ES[i - 1], b2 = ES[i]; if (b2.corte) continue;
        const d = b2.v - a.v;
        if (b2.degraus) {
          for (let k = 1; k <= b2.degraus; k++) {
            const t = a.t + (b2.t - a.t) * k / b2.degraus;
            s.toque(t, { vol: 0.12, corte: 6000, dur: 0.03, pan: 0.3 }); s.sino(['C6', 'D6', 'E6', 'G6', 'A6'][k % 5], t, 0.12, { vol: 0.02 + 0.002 * k, brilho: 2.4 });
          }
          s.sino('G6', b2.t + 0.05, 1.1, { vol: 0.12, brilho: 2 }); s.sino('C7', b2.t + 0.15, 1.3, { vol: 0.12, brilho: 2 });
        } else if (d > 0.05) {
          s.pio(a.t, { freq: 180, sobe: 1.6, dur: b2.t - a.t + 0.15, repete: 1, vol: 0.2 });
          for (let k = 0; k < 6; k++) s.toque(a.t + k * 0.07, { vol: 0.08, corte: 1200, dur: 0.06 });
          s.batida(b2.t, { vol: 0.25, freq: 90, dur: 0.25 });
        } else if (d < -0.05) {
          s.pio(a.t, { freq: 520, sobe: -0.65, dur: b2.t - a.t + 0.2, repete: 1, vol: 0.2 });
          s.batida(b2.t + 0.05, { vol: 0.22, freq: 80, dur: 0.25 });
        }
      }
      // o topo inclina: rangido que desce; o sol se espanta: assobio "hã?"
      const DB = TO.dobra;
      for (let i = 1; i < DB.length; i++) if (!DB[i].corte && DB[i].v < DB[i - 1].v - 0.03) {
        for (let k = 0; k < 9; k++) s.toque(DB[i - 1].t + k * 0.05, { vol: 0.1 - k * 0.007, corte: 900 + k * 60, dur: 0.07, pan: -0.3 });
        s.pio(DB[i - 1].t, { freq: 300, sobe: -0.35, dur: 0.5, repete: 1, vol: 0.16 });
      }
      for (const c of SO.cara) {
        if (c.jeito === 'espanto') { s.pio(c.t + 0.05, { freq: 620, sobe: 0.7, dur: 0.22, repete: 1, vol: 0.13, pan: 0.4 }); s.sino('A6', c.t + 0.05, 0.4, { vol: 0.05 }); }
        if (c.jeito === 'sorri' && c.t > 0) ['C6', 'E6', 'G6'].forEach((n, i) => s.sino(n, c.t + i * 0.08, 0.8, { vol: 0.06, brilho: 1.8, pan: 0.4 }));
      }
      // pombo: asas batendo, cabeça virando, piscada e o arrulho
      for (const ac of PB.acoes) {
        if (ac.tipo === 'bate') for (let t = ac.de; t < ac.ate; t += 2 / 7) s.vento(t, 0.12, { vol: 0.07, corte: 2200, entra: 0.02, sai: 0.08 });
        if (ac.tipo === 'olha' && ac.som) for (let i = 1; i < ac.para.length; i++) s.toque(ac.de + (ac.ate - ac.de) * i / ac.para.length, { vol: 0.06, corte: 3000, dur: 0.03 });
        if (ac.tipo === 'pisca') s.toque(ac.em, { vol: 0.04, corte: 7000, dur: 0.015 });
        if (ac.tipo === 'arrulha') {
          s.nota(310, ac.em, 0.26, { forma: 'seno', vol: 0.22, ataque: 0.04, solta: 0.08, vibrato: 0.05, vibratoHz: 22 });
          s.nota(270, ac.em + 0.3, 0.38, { forma: 'seno', vol: 0.24, ataque: 0.05, solta: 0.15, vibrato: 0.06, vibratoHz: 20 });
        }
      }
      s.sala(0.35);
      return s.fim({ entra: 0.15, sai: 0.5, pico: 0.8 });
    }

    return { desenhar, som };
  },
});
