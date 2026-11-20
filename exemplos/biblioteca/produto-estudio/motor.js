// MOTOR "produto-estudio" — filme de produto em estúdio, vertical (1080x1920), em three.js.
// Jeito de animar: cena 3D (sem placa de vídeo). Um objeto inventado de alumínio usinado e vidro fosco
// flutua num vazio azul-escuro; o metal reflete softboxes de estúdio e tem riscos de escova em círculo;
// um refletor DE VERDADE mora dentro do aro de luz e faz a poça de luz e as sombras se mexerem.
// Planos com câmera lenta (grua, órbita), foco que passa de uma peça para outra, vista explodida com
// rótulos, mergulho até o metal escovado, mãos de manequim desenhando, e a marca no fim.
// As passagens entre planos (chicote, mergulho, clarão) são contas de t na lente, nada guarda quadro.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import { texturaEscovado, ambienteEstudio, torno, canto, mao, lapis, fita } from './pecas.js';
import { criarLente } from './lente.js';
import { criarLetreiro } from './letreiro.js';

const { limita, mistura, trecho, suave, sorteio, saiDevagar, entraDevagar } = Filme;
const Q = Math.PI / 2;

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 14.5,
  montar({ historia: H, tela, largura: L, altura: A, duracao, fps }) {
    const C = H.cores, LZ = H.luz, F = H.filme;
    const uma = (tipo) => H.pecas.find((p) => p.tipo === tipo) || {};
    const letreiro = criarLetreiro(H, L, A);            // confere letras e legendas antes de tudo (dá erro se faltar)

    // ---------- fotógrafo: renderizador, cena, câmera ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    const cena = new THREE.Scene();
    cena.background = new THREE.Color(C.fundoAlto);
    cena.fog = new THREE.Fog(C.fundoHorizonte, 16, 46);
    cena.environment = ambienteEstudio(render);
    cena.environmentIntensity = LZ.reflexo;
    const camera = new THREE.PerspectiveCamera(30, L / A, 0.05, 120);

    // ---------- o vazio do estúdio: fundo em degradê e chão que some no horizonte ----------
    {
      const m = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { uAlto: { value: new THREE.Color(C.fundoAlto) }, uHor: { value: new THREE.Color(C.fundoHorizonte) } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vDir; uniform vec3 uAlto, uHor;
          void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0);
            gl_FragColor = vec4(mix(uHor, uAlto, smoothstep(0.0, 0.45, pow(y, 0.8))), 1.0); }`,
      });
      const fundo = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), m); fundo.renderOrder = -1; cena.add(fundo);
      const chao = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: C.chao, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.6 }));
      chao.rotation.x = -Q; chao.receiveShadow = true; cena.add(chao);
    }

    // ---------- materiais ----------
    const esc = texturaEscovado(sorteio(H.semente));
    const escL = esc.clone(); escL.repeat.set(1, 3); escL.needsUpdate = true;       // riscos mais finos no topo
    const metal = (cor, rug, tx, rep = 1) => new THREE.MeshPhysicalMaterial({
      color: cor, metalness: 1, roughness: rug, anisotropy: 0.75, anisotropyRotation: 0,
      map: tx, bumpMap: tx, bumpScale: 0.35 * rep, roughnessMap: tx,
    });
    const matAlu = metal(C.aluminio, 0.34, esc);
    const matTampa = metal(C.aluminioClaro, 0.28, escL, 1.2);
    const matMoldura = metal(C.aluminioClaro, 0.16, esc);
    const matPlaca = new THREE.MeshStandardMaterial({ color: C.placa, roughness: 0.55, metalness: 0.3 });
    const matCobre = new THREE.MeshPhysicalMaterial({ color: C.cobre, metalness: 1, roughness: 0.3, clearcoat: 0.4 });
    const matLente = new THREE.MeshPhysicalMaterial({ color: C.vidro, metalness: 0, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.25, emissive: C.vidro, emissiveIntensity: 0 });
    matTampa.side = matMoldura.side = matLente.side = THREE.DoubleSide;   // chapas finas de torno: vistas de cima e de baixo
    const matPonto = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.acento).multiplyScalar(2.2) });
    const matMao = new THREE.MeshPhysicalMaterial({ color: C.maos, roughness: 0.6, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5 });
    const matPapel = new THREE.MeshStandardMaterial({ color: C.papel, roughness: 0.92, metalness: 0 });
    const sombra = (m, faz = true, recebe = true) => { m.castShadow = faz; m.receiveShadow = recebe; return m; };

    // ---------- a base: carcaça, bobinas, tampa escovada, lente fosca e o ponto amarelo ----------
    const B = uma('base'), R = B.raio, HB = B.altura;
    const base = new THREE.Group(); base.position.set(B.x, 0, B.z); cena.add(base);
    const partes = {};                       // nome -> { obj, yRepouso, raio (para o rótulo), noAro }
    {
      const perfil = [[0, 0], [R - 0.04, 0], ...canto(R - 0.04, 0.04, 0.04, -Q, 0), [R, HB - 0.04], ...canto(R - 0.04, HB - 0.04, 0.04, 0, Q), [R - 0.1, HB], [R - 0.1, 0.06], [0, 0.06]];
      const carcaca = sombra(new THREE.Mesh(torno(perfil), matAlu)); base.add(carcaca);
      const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 20), matPonto);
      const ap = (B.ponto.angulo || 0) * Math.PI / 180; pt.position.set(Math.sin(ap) * (R + 0.003), B.ponto.y, Math.cos(ap) * (R + 0.003)); pt.rotation.set(Q, 0, -ap); carcaca.add(pt);
      partes.carcaca = { obj: carcaca, yRepouso: 0, raio: R };

      const bob = new THREE.Group(); bob.position.y = 0.07; base.add(bob);
      bob.add(sombra(new THREE.Mesh(new THREE.CylinderGeometry(R - 0.14, R - 0.14, 0.03, 64), matPlaca)));
      const anel = new THREE.TorusGeometry(0.12, 0.045, 12, 28); anel.rotateX(Q);
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 6, r = i === 6 ? 0 : 0.5;
        const m = sombra(new THREE.Mesh(anel, matCobre)); m.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r); bob.add(m);
      }
      partes.bobinas = { obj: bob, yRepouso: 0.07, raio: R - 0.14 };

      const tampa = sombra(new THREE.Mesh(torno([[0.37, HB - 0.012], [0.37, HB], [R - 0.1, HB], [R - 0.1, HB - 0.012]], 160, 0.004), matTampa));
      base.add(tampa); partes.tampa = { obj: tampa, yRepouso: 0, raio: R - 0.1 };

      const domo = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Q; domo.push([0.37 * Math.sin(a), HB - 0.01 + 0.075 * Math.cos(a)]); }
      domo.push([0.37, HB - 0.02]);
      const lente = sombra(new THREE.Mesh(torno(domo, 96), matLente)); base.add(lente);
      partes.lente = { obj: lente, yRepouso: 0, raio: 0.37 };
    }

    // ---------- o aro de luz: aro de alumínio, moldura, fita de LEDs, difusor e o refletor de dentro ----------
    const AR = uma('aro'), RA = AR.raio;
    const aro = new THREE.Group(); cena.add(aro);
    const NL = AR.leds;
    const matDifusor = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: { uLiga: { value: 0 }, uForca: { value: 0 }, uCor: { value: new THREE.Color(C.luz) } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vP; uniform float uLiga, uForca; uniform vec3 uCor;
        void main(){
          float a = fract(atan(vP.x, vP.z) / 6.28318 + 1.0);              // 0 a 1 na volta (começa na frente, como os LEDs)
          float aceso = smoothstep(a - 0.04, a, uLiga * 1.04);
          float r = length(vP.xz), meio = 1.0 - abs(r - ${RA.toFixed(3)}) / 0.09;
          gl_FragColor = vec4(uCor * uForca * aceso * (0.55 + 0.45 * clamp(meio, 0.0, 1.0)), 1.0);
        }`,
    });
    {
      const pa = [[RA - 0.09, 0.01], ...canto(RA - 0.08, 0.01, 0.01, Math.PI, 1.5 * Math.PI), [RA + 0.08, 0], ...canto(RA + 0.08, 0.01, 0.01, -Q, 0), [RA + 0.09, 0.08], ...canto(RA + 0.08, 0.08, 0.01, 0, Q), [RA - 0.08, 0.09], ...canto(RA - 0.08, 0.08, 0.01, Q, Math.PI), [RA - 0.09, 0.01]];
      const carro = new THREE.Mesh(torno(pa, 160, 0.005), matAlu); aro.add(carro);
      partes.aro = { obj: carro, yRepouso: 0, raio: RA + 0.09, noAro: true };
      const mold = new THREE.Mesh(torno([[RA - 0.075, 0.095], [RA - 0.075, 0.105], [RA + 0.075, 0.105], [RA + 0.075, 0.095]], 160, 0.004), matMoldura);
      aro.add(mold); partes.moldura = { obj: mold, yRepouso: 0, raio: RA + 0.075, noAro: true };
      const geoLed = new THREE.BoxGeometry(0.04, 0.012, 0.028);
      const leds = new THREE.InstancedMesh(geoLed, new THREE.MeshBasicMaterial({ color: '#ffffff' }), NL);
      const o = new THREE.Object3D();
      for (let i = 0; i < NL; i++) { const a = i / NL * Math.PI * 2; o.position.set(Math.sin(a) * RA, -0.008, Math.cos(a) * RA); o.rotation.set(0, a, 0); o.updateMatrix(); leds.setMatrixAt(i, o.matrix); leds.setColorAt(i, new THREE.Color(0.05, 0.05, 0.06)); }
      leds.frustumCulled = false;
      const gLeds = new THREE.Group(); gLeds.add(leds); aro.add(gLeds); partes.leds = { obj: gLeds, yRepouso: 0, raio: RA, noAro: true, malha: leds };
      const gd = new THREE.RingGeometry(RA - 0.085, RA + 0.085, 160, 1); gd.rotateX(Q);
      const dif = new THREE.Mesh(gd, matDifusor); dif.position.y = -0.022; aro.add(dif);
      partes.difusor = { obj: dif, yRepouso: -0.022, raio: RA + 0.085, noAro: true };
    }
    const refletor = new THREE.SpotLight(C.luz, 0, 0, LZ.abertura, LZ.penumbra, 2);
    refletor.position.set(0, -0.03, 0); refletor.target.position.set(0, -4, 0); aro.add(refletor, refletor.target);
    refletor.castShadow = true; refletor.shadow.mapSize.set(1024, 1024); refletor.shadow.bias = -0.0004; refletor.shadow.normalBias = 0.02;
    refletor.shadow.camera.near = 0.05; refletor.shadow.camera.far = 12;
    cena.add(new THREE.HemisphereLight('#6d86c4', '#070a14', LZ.ambiente));
    const preenche = new THREE.DirectionalLight('#dfe7ff', LZ.preenche); preenche.position.set(-6, 9, 8); cena.add(preenche);

    // ---------- mesa de trabalho: papel, traço do lápis, lápis e duas mãos de manequim ----------
    const PA = uma('papel'), DS = uma('desenho'), SG = uma('segue'), MA = uma('maoApoio');
    const trabalho = new THREE.Group(); cena.add(trabalho);
    {
      const p = sombra(new THREE.Mesh(new THREE.PlaneGeometry(PA.largura, PA.comprimento), matPapel), false, true);
      p.rotation.set(-Q, 0, PA.giro || 0); p.position.set(PA.x, 0.002, PA.z); trabalho.add(p);
    }
    const NF = 240;
    const pontoDesenho = (k) => {
      const a = -Q + k * Math.PI * 2 * DS.voltas;
      return [DS.centro[0] + DS.rx * (1 + 0.025 * Math.sin(3 * a)) * Math.cos(a), DS.centro[1] + DS.rz * (1 + 0.03 * Math.sin(2 * a + 1)) * Math.sin(a)];
    };
    const geoTraco = fita(pontoDesenho, NF, 0.022, 0.005);
    const traco = new THREE.Mesh(geoTraco, new THREE.MeshBasicMaterial({ color: C.traco, side: THREE.DoubleSide })); trabalho.add(traco);
    const lap = lapis(C.lapis); trabalho.add(lap);
    const eixoLapis = new THREE.Vector3(0.3, 1, 0.42).normalize();
    lap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eixoLapis);
    const maoD = mao(matMao, { direita: true, dobra: [1.05, 1.15, 1.25, 1.3], polegar: 0.7, abre: 0.04 }); trabalho.add(maoD);
    {
      // a mão direita segura o lápis: antebraço para trás e para a direita, costas da mão para cima
      const z = new THREE.Vector3(0.55, 0.42, 0.72).normalize(), y0 = new THREE.Vector3(0.25, 1, -0.15);
      const x = new THREE.Vector3().crossVectors(y0, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
      maoD.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    }
    const maoE = mao(matMao, { direita: false, dobra: [0.12, 0.06, 0.08, 0.16], polegar: 0.15, abre: 0.1 }); trabalho.add(maoE);
    maoE.position.set(MA.x, 0.11, MA.z); maoE.rotation.set(0.04, MA.giro, 0);
    const pontaEm = (t) => { const k = limita((t - DS.de) / (DS.ate - DS.de)); return pontoDesenho(k); };

    // ---------- tempos ----------
    const PL = H.planos;
    const planoEm = (t) => { let i = 0; PL.forEach((p, j) => { if (t >= p.de) i = j; }); return i; };
    const EX = uma('explosao');
    const quandoAbre = (i) => EX.abre + i * EX.passo, quandoFecha = (i) => EX.fecha + (EX.partes.length - 1 - i) * EX.fechaPasso;
    const alturaAro = (t, nome) => {
      let y = mistura(AR.repouso, AR.flutua, suave(trecho(t, AR.sobe[0], AR.sobe[1])));
      y += AR.balanca * Math.sin(t * 1.7) * suave(trecho(t, AR.sobe[1] - 0.3, AR.sobe[1] + 0.5));
      if (nome === 'maos') y += (SG.altura - AR.flutua) * suave(trecho(t, SG.sobe[0], SG.sobe[1]));
      return y;
    };

    // ---------- câmera: curva suave pelos pontos de cada plano (corte seco entre planos) ----------
    function hermite(K, campo, t) {
      if (K.length === 1) return [].concat(K[0][campo]);
      let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
      const a = K[i], b = K[i + 1], dt = b.t - a.t, u = limita((t - a.t) / dt);
      const val = (k) => [].concat(k[campo]);
      const tang = (j) => { const k = K[j]; if (k.para || j === 0 || j === K.length - 1) return val(k).map(() => 0);
        const p = val(K[j - 1]), n = val(K[j + 1]), d = K[j + 1].t - K[j - 1].t; return p.map((v, c) => (n[c] - v) / d); };
      const ma = tang(i), mb = tang(i + 1), pa = val(a), pb = val(b);
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      return pa.map((v, c) => h00 * v + h10 * dt * ma[c] + h01 * pb[c] + h11 * dt * mb[c]);
    }
    // passagens: chicote (gira para o lado e borra), mergulho (borrão do centro para fora), clarão (branco)
    function passagem(t) {
      const r = { chicote: 0, mergulho: 0, clarao: 0, giro: 0 };
      for (let i = 1; i < PL.length; i++) {
        const s = PL[i].de, e = PL[i].entrada;
        if (e === 'chicote') {
          if (t >= s - 0.18 && t < s) { const k = (t - s + 0.18) / 0.18; r.giro = -0.45 * k * k; r.chicote = F.chicote * k; }
          if (t >= s && t < s + 0.24) { const k = 1 - (t - s) / 0.24; r.giro = 0.45 * k * k; r.chicote = F.chicote * k; }
        } else if (e === 'mergulho') {
          if (t >= s - 0.3 && t < s) { const k = (t - s + 0.3) / 0.3; r.mergulho = F.mergulho * k * k; }
          if (t >= s && t < s + 0.28) { const k = 1 - (t - s) / 0.28; r.mergulho = F.mergulho * k * k; }
        } else if (e === 'clarao') {
          if (t >= s - 0.16 && t < s) { const k = (t - s + 0.16) / 0.16; r.clarao = F.clarao * k * k; }
          if (t >= s && t < s + 0.7) r.clarao = F.clarao * (1 - saiDevagar((t - s) / 0.7));
        }
      }
      return r;
    }

    const lente = criarLente(render, L, A, F, letreiro.tela);
    const frente = new THREE.Vector3(), foco = new THREE.Vector3(), v3 = new THREE.Vector3(), cor = new THREE.Color();
    const LIGA = AR.acendem;

    // ---------- desenhar(t) ----------
    function desenhar(t) {
      const ip = planoEm(t), P = PL[ip], nome = P.nome;

      // luz do aro: os LEDs acendem um a um em volta; o refletor e a lente acompanham
      const liga = trecho(t, LIGA[0], LIGA[1]);
      const forca = suave(trecho(t, LIGA[0], LIGA[1] + 0.3));
      matDifusor.uniforms.uLiga.value = liga; matDifusor.uniforms.uForca.value = 3.2 * forca;
      for (let i = 0; i < NL; i++) {
        const aceso = limita((liga * 1.04 - i / NL) / 0.04);
        cor.setRGB(0.05, 0.05, 0.06).lerp(new THREE.Color(C.luz).multiplyScalar(4), aceso);
        partes.leds.malha.setColorAt(i, cor);
      }
      partes.leds.malha.instanceColor.needsUpdate = true;
      refletor.intensity = LZ.refletor * forca;
      matLente.emissiveIntensity = 0.55 * forca;

      // onde está o aro
      let ax = 0, az = 0, ay = alturaAro(t, nome), inclina = 0;
      if (nome === 'maos') {
        const [px, pz] = pontaEm(t - SG.atraso), k = suave(trecho(t, SG.vai[0], SG.vai[1]));
        ax = mistura(0, px, k); az = mistura(0, pz, k);
        const [qx] = pontaEm(t - SG.atraso - 0.15); inclina = limita((px - qx) * 0.6, -0.08, 0.08) * k;
      }
      aro.position.set(ax, ay, az); aro.rotation.set(0, 0, -inclina);

      // vista explodida: cada peça sai para a sua altura e volta de estalo
      const rotulos = [];
      EX.partes.forEach((pt, i) => {
        const pc = partes[pt.nome]; if (!pc) return;
        let k = 0;
        if (nome === 'explosao') k = saiDevagar(trecho(t, quandoAbre(i), quandoAbre(i) + 0.45)) * (1 - entraDevagar(trecho(t, quandoFecha(i), quandoFecha(i) + 0.28)));
        const yMundoRep = (pc.noAro ? ay : 0) + pc.yRepouso;
        pc.obj.position.y = pc.yRepouso + (pt.y - yMundoRep) * k;
        if (nome === 'explosao' && t >= H.rotulos.de && t < H.rotulos.ate + 0.4) {
          const yM = (pc.noAro ? ay : 0) + pc.obj.position.y;
          rotulos.push({ texto: pt.rotulo, lado: pt.lado, mundo: [pt.lado * pc.raio, yM, 0],
            alfa: k * (1 - suave(trecho(t, H.rotulos.ate, H.rotulos.ate + 0.25))), linha: trecho(t, quandoAbre(i) + 0.25, quandoAbre(i) + 0.6) });
        }
      });

      // mesa de trabalho só no plano das mãos
      trabalho.visible = nome === 'maos';
      if (trabalho.visible) {
        const k = limita((t - DS.de) / (DS.ate - DS.de));
        geoTraco.setDrawRange(0, Math.floor(k * NF) * 6);
        const [px, pz] = pontaEm(t);
        const levanta = 0.05 * (1 - suave(trecho(t, DS.de - 0.3, DS.de))) + 0.05 * suave(trecho(t, DS.ate, DS.ate + 0.3));
        lap.position.set(px, 0.004 + levanta, pz);
        const pega = v3.copy(eixoLapis).multiplyScalar(0.42).add(lap.position);
        maoD.position.copy(pega).add(new THREE.Vector3(0.1, 0.12, 0.2).applyQuaternion(maoD.quaternion));
      }

      // câmera do plano + passagem
      const K = P.camera, pos = hermite(K, 'pos', t), olha = hermite(K, 'olha', t), fc = hermite(K, 'foco', t);
      const ps = passagem(t);
      camera.position.set(pos[0], pos[1], pos[2]); camera.lookAt(olha[0], olha[1], olha[2]);
      camera.rotateY(ps.giro);
      camera.fov = hermite(K, 'fov', t)[0]; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      camera.getWorldDirection(frente);
      const distFoco = Math.max(0.2, foco.set(fc[0], fc[1], fc[2]).sub(camera.position).dot(frente));
      const desfoque = hermite(K, 'desfoque', t)[0];

      // rótulos: ponto da peça no mundo vira ponto na tela
      for (const r of rotulos) { v3.set(...r.mundo).project(camera); r.x = (v3.x * 0.5 + 0.5) * L; r.y = (0.5 - v3.y * 0.5) * A; }
      letreiro.desenhar(t, rotulos);

      const apaga = Math.max(1 - suave(trecho(t, 0, 0.4)), suave(trecho(t, duracao - 0.4, duracao)));
      lente.foto(cena, camera, { distFoco, desfoque, chicote: ps.chicote, mergulho: ps.mergulho, clarao: ps.clarao, apaga, quadro: Math.round(t * fps) });
    }

    // ---------- som: pad de vidro, LEDs que tilintam, peças que deslizam e estalam, chiados nas passagens, sino no fim ----------
    function som() {
      const s = Som.criar(duracao, H.semente), M = H.musica, r = sorteio(H.semente + 9);
      // pad: acordes longos (seno + triângulo levemente desafinado), bem macio
      M.acordes.forEach((ac, i) => ac.forEach((n, k) => {
        const t0 = 0.1 + i * M.passo; if (t0 > duracao) return;
        s.nota(n, t0, M.passo + 0.3, { forma: 'seno', vol: 0.05, ataque: 1.2, solta: 1.4, pan: k % 2 ? 0.35 : -0.35 });
        s.nota(Som.freq(n) * 1.003, t0, M.passo + 0.3, { forma: 'tri', vol: 0.022, ataque: 1.4, solta: 1.4, pan: k % 2 ? -0.3 : 0.3, vibrato: 0.002 });
      }));
      // LEDs acendendo em volta: tilintar que sobe
      M.leds.forEach((n, i) => s.sino(n, mistura(LIGA[0], LIGA[1], i / (M.leds.length - 1)), 0.6, { vol: 0.05, pan: Math.sin(i * 1.1) * 0.6, brilho: 2.6 }));
      // o aro sobe: sopro macio
      s.vento(AR.sobe[0] - 0.2, AR.sobe[1] - AR.sobe[0] + 0.6, { vol: 0.05, corte: 900, onda: 0.4, profundidade: 0.3, entra: 0.6, sai: 0.6 });
      // passagens
      for (let i = 1; i < PL.length; i++) {
        const t0 = PL[i].de, e = PL[i].entrada;
        if (e === 'corte') s.toque(t0, { vol: 0.04, corte: 2000, dur: 0.05 });
        if (e === 'chicote') { s.vento(t0 - 0.3, 0.6, { vol: 0.2, corte: 3200, onda: 1.5, profundidade: 0.2, entra: 0.28, sai: 0.3 }); }
        if (e === 'mergulho') { s.vento(t0 - 0.45, 0.75, { vol: 0.22, corte: 1500, onda: 1.0, profundidade: 0.2, entra: 0.42, sai: 0.3 }); s.batida(t0, { vol: 0.18, freq: 70, dur: 0.4 }); }
        if (e === 'clarao') {
          s.vento(t0 - 0.5, 0.6, { vol: 0.12, corte: 5000, onda: 1, profundidade: 0.2, entra: 0.45, sai: 0.15 });
          s.batida(t0, { vol: 0.5, freq: 55, dur: 0.9 });
          M.sino.forEach((n, k) => s.sino(n, t0 + 0.02 + k * 0.05, 3.2, { vol: 0.11, pan: (k - 1.5) * 0.3, brilho: 1.8 }));
        }
      }
      // vista explodida: cada peça desliza com um tilintar; na volta, estalos secos
      EX.partes.forEach((pt, i) => {
        s.sino(M.pecas[i % M.pecas.length], quandoAbre(i) + 0.05, 0.5, { vol: 0.045, pan: pt.lado * 0.4, brilho: 2 });
        s.vento(quandoAbre(i), 0.4, { vol: 0.025, corte: 2600, onda: 2, profundidade: 0.2, entra: 0.15, sai: 0.25 });
        s.toque(quandoFecha(i) + 0.28, { vol: 0.12, corte: 5200, dur: 0.035, pan: pt.lado * 0.3 });
      });
      s.batida(quandoFecha(0) + 0.3, { vol: 0.12, freq: 160, dur: 0.12 });
      // macro: chiado fino de escova
      const pm = PL.find((p) => p.nome === 'macro');
      if (pm) s.vento(pm.de + 0.1, pm.ate - pm.de - 0.1, { vol: 0.03, corte: 7000, onda: 0.8, profundidade: 0.5, entra: 0.4, sai: 0.3 });
      // lápis no papel: arranhado leve enquanto desenha
      s.vento(DS.de, DS.ate - DS.de, { vol: 0.035, corte: 4500, onda: 3.1, profundidade: 0.7, entra: 0.15, sai: 0.2 });
      for (let t = DS.de; t < DS.ate; t += 0.09 + r() * 0.08) s.toque(t, { vol: 0.012, corte: 6000, dur: 0.02, pan: 0.3 });
      // a marca: sino curto quando o sublinhado amarelo chega
      s.sino('A6', H.marca.sublinha[1] - 0.1, 1.4, { vol: 0.07, brilho: 2.4 });
      s.sino('D6', H.marca.sublinha[1] - 0.05, 1.8, { vol: 0.06, brilho: 2 });
      s.sala(0.6);
      return s.fim({ entra: 0.3, sai: 0.6, pico: 0.78 });
    }

    return { desenhar, som };
  },
});
