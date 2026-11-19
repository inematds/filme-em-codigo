// MOTOR "engenhoca" — comédia de engenharia desnecessária, vertical, em 3D de poucos polígonos.
// Jeito de animar: cena-3d (three.js, sem placa de vídeo). Um problema bobo, quatro soluções que
// vão do sensato ao absurdo (cada engenhoca de cano amarelo com braçadeira cinza, que se MONTA peça
// por peça, pulando para o lugar e passando um pouco do ponto), e uma piada final que torna tudo inútil.
// Um boneco sem rosto atua de verdade: mostra, dá de ombros, bate no botão, olha para cima, desaba.
// Entre as piadas, a câmera "chicoteia" (gira rápido com borrão). A fala da fonte vira LEGENDA
// (letras em traços, brancas com contorno preto grosso, duas ou três palavras por vez).
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
// desenhar(t) é conta pura: tudo sai de t e da história; nada guarda o quadro anterior.
import * as THREE from '../../../vendor/three/three.module.js';
import { criarMateriais, criarQuarto, criarBoneco, criarCao, criarIma, criarEsteira, criarCacto, criarBotao, criarEspaco, criarFeixe } from './pecas.js';

const { limita, mistura, trecho, suave, sorteio, ruido } = Filme;

// "pulo": vai de 0 a 1 passando um pouco do ponto e voltando (o encaixe de mola das engenhocas)
const pulo = (k, o = 1.7) => { if (k <= 0) return 0; if (k >= 1) return 1; const x = k - 1; return 1 + (o + 1) * x * x * x + o * x * x; };
// mola que balança e assenta (o barbante do ímã)
const mola = (k) => (k <= 0 ? 0 : 1 - Math.exp(-6 * k) * Math.cos(9 * k));

// ---------- o repertório de poses do boneco (vocabulário do motor; a ordem e o tempo vêm da história) ----------
// braço = [abre para o lado, vai para a frente, dobra o cotovelo, torce]; joe = dobra os joelhos
const NEUTRO = { y: 0, inc: 0, gir: 0, cx: 0, cy: 0, cz: 0, sobe: 0, joe: 0, bE: [0.1, 0, 0.12, 0], bD: [0.1, 0, 0.12, 0] };
const POSES = {
  neutro: {},
  mostra: { bD: [0.3, 1.0, 1.9, 0], cy: -0.18, cz: 0.1, bE: [0.12, 0, 0.15, 0] },
  ombros: { bE: [0.8, 0.45, 1.35, 0], bD: [0.8, 0.45, 1.35, 0], sobe: 0.05, cz: 0.22, cx: -0.06, inc: -0.04 },
  cintura: { bE: [0.62, -0.15, 1.35, -1.57], bD: [0.62, -0.15, 1.35, -1.57], cz: -0.06 },
  olhaCao: { bE: [0.62, -0.15, 1.35, -1.57], bD: [0.62, -0.15, 1.35, -1.57], cy: 0.75, cx: 0.32, cz: 0.1, gir: 0.25 },
  levanta: { bD: [0.15, 2.7, 0.5, 0], bE: [0.25, 0.2, 0.3, 0], inc: -0.08, cx: 0.25, y: 0.03 },
  bate: { bD: [0, 0.54, 0.94, 0], bE: [0.35, 0.3, 0.4, 0], inc: 0.2, cx: 0.45, y: -0.03, joe: 0.08 },
  olhaCima: { bD: [0.2, 0.35, 0.4, 0], bE: [0.2, 0.2, 0.3, 0], inc: -0.12, cx: -0.75, y: 0.02 },
  olhaPe: { bE: [0.15, 0.1, 0.2, 0], bD: [0.15, 0.1, 0.2, 0], inc: 0.22, cx: 0.65, cy: 0.12 },
  desaba: { bE: [0.04, 0.3, 0.1, 0], bD: [0.04, 0.3, 0.1, 0], inc: 0.6, cx: 0.55, cz: 0.12, y: -0.02, joe: 0.32, sobe: -0.04 },
};
const pose = (nome) => { const p = POSES[nome]; if (!p) throw new Error('pose desconhecida: ' + nome); return { ...NEUTRO, ...p }; };
function mistPose(a, b, k) {
  const r = {};
  for (const ch of Object.keys(NEUTRO)) r[ch] = Array.isArray(a[ch]) ? a[ch].map((v, i) => mistura(v, b[ch][i], k)) : mistura(a[ch], b[ch], k);
  return r;
}

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 15,
  montar({ historia: H, tela, largura: L, altura: A, duracao }) {
    const C = H.cores, u = L / 1080;
    const acaso = sorteio(H.semente);
    const pecas = H.pecas, uma = (tipo) => pecas.find((p) => p.tipo === tipo);

    // ---------- renderizador, cenas, câmera ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
    const camera = new THREE.PerspectiveCamera(45, L / A, 0.05, 400);
    const mat = criarMateriais();

    const quarto = new THREE.Scene(); quarto.background = new THREE.Color(C.fundoQuarto);
    const LZ = H.luz;
    quarto.add(new THREE.HemisphereLight(C.luzCeu, C.luzChao, LZ.ceu));
    const sol = new THREE.DirectionalLight(C.luzSol, LZ.sol);
    sol.position.set(...LZ.direcao); sol.target.position.set(0, 0, 0); quarto.add(sol, sol.target);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
    sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.02; sol.shadow.radius = 3;
    criarQuarto(quarto, H.quarto, C, mat, sorteio(H.semente + 1));

    const espaco = new THREE.Scene(); espaco.background = new THREE.Color(C.fundoEspaco);
    espaco.add(new THREE.HemisphereLight('#9fb4ff', '#101830', LZ.ceuEspaco));
    const solE = new THREE.DirectionalLight('#ffffff', LZ.solEspaco); solE.position.set(-3, 4, 5); espaco.add(solE);
    const ES = H.espaco;
    const ESP = criarEspaco(espaco, ES, C, mat, sorteio(H.semente + 2));

    // ---------- peças da história ----------
    const PB = uma('boneco'), BO = criarBoneco(mat, C, PB); quarto.add(BO.raiz);
    const PC = uma('cao'), CAO = criarCao(mat, C); quarto.add(CAO.raiz);
    const PI = uma('ima'), IMA = criarIma(mat, C); quarto.add(IMA.raiz);
    const PE = uma('esteira'), EST = criarEsteira(mat, C, PE); quarto.add(EST.raiz);
    const cargas = (PE.carga || []).map((cg) => {
      if (cg.tipo === 'cacto') { const g = criarCacto(mat, C); quarto.add(g); return { cg, raiz: g }; }
      const b = criarBotao(mat, C); quarto.add(b.raiz); return { cg, raiz: b.raiz, botao: b };
    });
    const BT = cargas.find((c) => c.botao);
    const PF = uma('feixe'), FX = criarFeixe(mat, C); quarto.add(FX.g);
    const FXE = criarFeixe(mat, C); espaco.add(FXE.g);

    const visivel = (p, t) => t >= (p.aparece ?? 0) && t < (p.some ?? 1e9);
    const v3 = new THREE.Vector3(), v4 = new THREE.Vector3();

    // ---------- o boneco no tempo t ----------
    function poseEm(t) {
      let cur = pose('neutro');
      for (const e of PB.atuacao) {
        if (t < e.t) break;
        const k = pulo(trecho(t, e.t, e.t + (e.dur ?? 0.28)), e.mola ?? 1.4);
        cur = mistPose(cur, pose(e.pose), k);
      }
      return cur;
    }
    function poeBoneco(t) {
      const P = poseEm(t), R = BO;
      R.raiz.position.set(...PB.pos); R.raiz.rotation.set(0, (PB.giro || 0) + P.gir, 0);
      const joe = P.joe, desce = 0.44 * (1 - Math.cos(joe)) * 2;
      R.quadril.position.y = 0.92 + P.y - desce + 0.006 * Math.sin(t * 2.6);
      R.tronco.rotation.set(P.inc + 0.01 * Math.sin(t * 2.6 + 1), 0, 0);
      R.cabeca.rotation.order = 'YXZ'; R.cabeca.rotation.set(P.cx, P.cy, P.cz);
      for (const b of R.bracos) {
        const [ab, fr, co, to] = b.lado === 1 ? P.bE : P.bD;
        b.ombro.position.set(0.2 * b.lado, -0.02 + P.sobe, 0);
        b.ombro.rotation.order = 'XZY'; b.ombro.rotation.set(-fr, to * b.lado, ab * b.lado);
        b.cot.rotation.set(-co, 0, 0);
      }
      for (const p of R.pernas) { p.coxa.rotation.set(-joe, 0, 0); p.joelho.rotation.set(2 * joe, 0, 0); p.pe.rotation.set(-joe, 0, 0); }
      R.meiaMao.visible = PB.meiaNaMaoAte == null || t < PB.meiaNaMaoAte;
    }

    // ---------- o cão-robô ----------
    function poeCao(t, alvo) {
      const M = PC.monta, raiz = CAO.raiz;
      raiz.visible = visivel(PC, t);
      const F = PC.fareja, k = suave(trecho(t, F.de, F.ate)), andando = t > F.de && t < F.ate ? 1 : 0;
      const g = PC.giro || 0, dist = F.anda * k;
      raiz.position.set(PC.pos[0] + Math.sin(g) * dist, 0.012 * andando * Math.abs(Math.sin((t - F.de) * 18)), PC.pos[2] + Math.cos(g) * dist);
      raiz.rotation.set(0, g, 0);
      CAO.lista.forEach((peca, i) => {
        const ti = M.de + i * M.passo, kk = pulo(trecho(t, ti, ti + 0.2), 2.2);
        peca.visible = t >= ti;
        peca.scale.setScalar(Math.max(0.001, kk));
        peca.position.y = (1 - limita(kk)) * 0.3;
      });
      CAO.pernas.forEach((p, i) => p.rotation.set(0.35 * andando * Math.sin((t - F.de) * 18 + (i % 3 ? Math.PI : 0)), 0, 0));
      // cabeça: fareja o chão, depois vira e encara o boneco; inclina no "inútil"
      const E = PC.encara;
      let pit = 0.55 * k * (1 - trecho(t, F.ate - 0.1, F.ate)) + 0.15 * andando * Math.sin(t * 26), yaw = 0.25 * andando * Math.sin(t * 7), rol = 0;
      if (t >= E.de && alvo) {
        raiz.updateMatrixWorld(true);
        const loc = raiz.worldToLocal(v4.copy(alvo)).sub(CAO.cabeca.position);
        const yawA = Math.atan2(loc.x, loc.z), pitA = -Math.atan2(loc.y, Math.hypot(loc.x, loc.z));
        const kk = pulo(trecho(t, E.de, E.de + 0.3), 1.6);
        yaw = mistura(yaw, yawA, kk); pit = mistura(pit, pitA, kk);
        if (E.inclina != null) rol = 0.38 * pulo(trecho(t, E.inclina, E.inclina + 0.25), 2);
      }
      CAO.cabeca.rotation.order = 'YXZ'; CAO.cabeca.rotation.set(pit, yaw, rol);
    }

    // ---------- o ímã no barbante ----------
    function poeIma(t) {
      IMA.raiz.visible = visivel(PI, t);
      IMA.raiz.position.set(PI.x, PI.teto, PI.z);
      const kd = mola(Math.max(0, t - PI.desce) / 0.9), comp = mistura(0.25, PI.comprimento, limita(kd, 0, 1.3));
      IMA.fio.scale.set(1, comp, 1); IMA.fio.position.y = -comp / 2;
      IMA.ima.position.y = -comp;
      const ts = t - PI.balanca, kb = limita(ts / 0.4);
      const ang = ts > 0 ? PI.amplitude * kb * Math.sin(2 * Math.PI * PI.ritmo * ts) : 0;
      const ang2 = ts > 0 ? PI.amplitude * 0.55 * kb * Math.cos(2 * Math.PI * PI.ritmo * ts) : 0;
      IMA.raiz.rotation.order = 'YXZ';
      IMA.raiz.rotation.set(ang2, ts > 0 ? ts * 0.8 : 0, ang);
    }

    // ---------- a esteira e a carga ----------
    const XB = PE.x[1];
    function andou(t) { // quanto a correia andou até t (para tudo de vez no fim, com um tranco)
      const R = PE.corre, k = trecho(t, R.de, R.ate);
      return R.distancia * (0.45 * k + 0.55 * suave(k));
    }
    function poeEsteira(t) {
      const M = PE.monta;
      EST.raiz.visible = visivel(PE, t);
      EST.lista.forEach((peca, i) => {
        const ti = M.de + i * M.passo, kk = pulo(trecho(t, ti, ti + 0.2), 2.0);
        peca.visible = t >= ti; peca.scale.set(1, Math.max(0.001, kk), 1);
        peca.position.y = (1 - limita(kk)) * 0.4;
      });
      const s = andou(t), span = EST.nRipas * PE.passoRipa, O = new THREE.Object3D();
      for (let i = 0; i < EST.nRipas; i++) {
        let x = XB - (((i * PE.passoRipa + s) % span) + span) % span;
        O.position.set(x, PE.altura + 0.002, PE.z); O.updateMatrix(); EST.ripas.setMatrixAt(i, O.matrix);
      }
      EST.ripas.instanceMatrix.needsUpdate = true;
      EST.ripas.visible = t >= M.de + EST.lista.length * M.passo;
      const tranco = Math.exp(-Math.max(0, t - PE.corre.ate) * 8) * (t >= PE.corre.ate ? 1 : 0);
      for (const c of cargas) {
        c.raiz.visible = visivel(PE, t) && t >= PE.corre.de - 0.01;
        const x = c.cg.x - s;
        c.raiz.position.set(x, PE.altura + 0.012, PE.z + (c.cg.dz || 0));
        c.raiz.rotation.set(0, 0, 0.12 * tranco * Math.sin((t - PE.corre.ate) * 30));
      }
      if (BT) {
        const ap = BT.cg.aperta, k1 = trecho(t, ap - 0.05, ap), k2 = trecho(t, ap + 0.3, ap + 0.45);
        BT.botao.topo.scale.set(1, 1 - 0.7 * k1 * (1 - k2), 1);
        BT.botao.mBotao.emissiveIntensity = t >= ap ? 1.6 * Math.exp(-(t - ap) * 3) : 0;
      }
    }

    // ---------- feixe cor-de-rosa (do céu até o pé, e do satélite até a Terra) ----------
    function poeFeixe(F, d, t, topo, base, x, z, raio) {
      F.g.visible = t >= d.de;
      if (!F.g.visible) return;
      const k = suave(trecho(t, d.de, d.de + d.desce)), ponta = mistura(topo, base, k), len = Math.max(0.01, topo - ponta);
      const pis = 0.85 + 0.15 * Math.sin(t * 40);
      F.coluna.scale.set(raio, len, raio); F.coluna.position.set(x, ponta + len / 2, z); F.coluna.material.opacity = 0.32 * pis;
      F.miolo.scale.set(raio * 0.35, len, raio * 0.35); F.miolo.position.set(x, ponta + len / 2, z); F.miolo.material.opacity = 0.55 * pis;
      const pousa = d.de + d.desce;
      F.aneis.forEach((a, i) => {
        a.position.set(x, base + 0.01, z);
        if (i === 0) {
          const kk = pulo(trecho(t, pousa, pousa + 0.25), 1.8);
          a.visible = t >= pousa; const r = raio * mistura(3.2, 1.25, kk);
          a.scale.set(r, r, r); a.material.opacity = 0.9;
        } else {
          const fase = (t - pousa - (i - 1) * d.pulso / 3) / d.pulso;
          const f = fase - Math.floor(fase);
          a.visible = fase >= 0;
          const r = raio * (1.3 + 2.4 * f); a.scale.set(r, r, r); a.material.opacity = 0.75 * (1 - f);
        }
      });
    }

    // ---------- pontos que a câmera pode seguir ----------
    function ancora(nome, out) {
      const m = {
        cabeca: BO.cabeca, peito: BO.peito, quadril: BO.quadril, peMeia: BO.pernas.find((p) => p.comMeia).pe,
        cao: CAO.raiz, caoCabeca: CAO.cabeca, ima: IMA.ima, botao: BT ? BT.raiz : null, sat: ESP.sat,
      }[nome];
      if (!m) throw new Error('âncora desconhecida: ' + nome);
      return m.getWorldPosition(out);
    }
    const ponto = (spec, out) => {
      if (Array.isArray(spec)) return out.set(spec[0], spec[1], spec[2]);
      ancora(spec.peca, out); const d = spec.d || [0, 0, 0]; return out.add(v3.set(d[0], d[1], d[2]));
    };
    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), oA = new THREE.Vector3(), oB = new THREE.Vector3();
    function poeCamera(P, t) {
      const ks = P.camera; let a = ks[0], b = ks[0];
      for (let i = 0; i < ks.length; i++) { if (ks[i].t <= t) { a = ks[i]; b = ks[Math.min(i + 1, ks.length - 1)]; } }
      if (t < ks[0].t) b = a;
      const k = a === b ? 0 : suave(trecho(t, a.t, b.t));
      ponto(a.pos, pA); ponto(b.pos, pB); ponto(a.olha, oA); ponto(b.olha, oB);
      pA.lerp(pB, k); oA.lerp(oB, k);
      // tremor no tranco (botão, alvo pousando)
      for (const tr of H.tremores || []) {
        const q = (t - tr.t) / tr.dur;
        if (q >= 0 && q < 1) { const f = tr.forca * (1 - q) * (1 - q); pA.x += f * ruido(t * 45, 3); pA.y += f * ruido(t * 45, 4); }
      }
      camera.position.copy(pA); camera.lookAt(oA);
      camera.fov = mistura(a.fov, b.fov, k);
      // chicote: o plano que sai gira para um lado, o que entra chega do lado oposto
      const CH = H.chicote; let borrao = [0, 0];
      for (const c of H.cortes) {
        const d = t - c.t, w = CH.janela;
        if (Math.abs(d) >= w) continue;
        const ang = d < 0 ? CH.giro * Math.pow(1 + d / w, 2) : -CH.giro * Math.pow(1 - d / w, 2);
        camera.rotateY(-c.dir[0] * ang); camera.rotateX(c.dir[1] * ang);
        const f = 1 - Math.abs(d) / w;
        borrao = [c.dir[0] * CH.borrao * f * u, c.dir[1] * CH.borrao * f * u];
      }
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      return borrao;
    }

    // ---------- passe final: borrão do chicote, cor de tela, vinheta, legenda ----------
    const rtCena = new THREE.WebGLRenderTarget(L, A, { type: THREE.HalfFloatType, samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    const cvLeg = document.createElement('canvas'); cvLeg.width = L; cvLeg.height = A;
    const txLeg = new THREE.CanvasTexture(cvLeg); txLeg.colorSpace = THREE.NoColorSpace; txLeg.generateMipmaps = false; txLeg.minFilter = THREE.LinearFilter;
    const mFinal = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { tCena: { value: rtCena.texture }, tLeg: { value: txLeg }, uPx: { value: new THREE.Vector2(1 / L, 1 / A) }, uBorrao: { value: new THREE.Vector2() },
        uVinheta: { value: H.filme.vinheta }, uApaga: { value: 0 }, uSatura: { value: H.filme.saturacao } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `varying vec2 vUv;
        uniform sampler2D tCena, tLeg; uniform vec2 uPx, uBorrao; uniform float uVinheta, uApaga, uSatura;
        vec3 paraTela(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        void main(){
          vec3 c;
          if (dot(uBorrao, uBorrao) < 1.0) c = texture2D(tCena, vUv).rgb;
          else { c = vec3(0.0); for (int i = 0; i < 24; i++) { float f = float(i) / 23.0 - 0.5; c += texture2D(tCena, clamp(vUv + uBorrao * uPx * f, 0.0, 1.0)).rgb; } c /= 24.0; }
          c = paraTela(c);
          float l = dot(c, vec3(0.299, 0.587, 0.114)); c = clamp(mix(vec3(l), c, uSatura), 0.0, 1.0);
          vec2 q = (vUv - 0.5) * vec2(1.0, 0.7); c *= 1.0 - uVinheta * smoothstep(0.25, 0.7, length(q));
          c *= 1.0 - uApaga;
          vec4 lg = texture2D(tLeg, vUv); c = mix(c, lg.rgb, lg.a);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mFinal); quad.frustumCulled = false;
    const cenaQuad = new THREE.Scene(); cenaQuad.add(quad); const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ---------- legenda: maiúsculas em traços, brancas, contorno preto grosso ----------
    const LG = H.legenda;
    function legenda(t) {
      const c = cvLeg.getContext('2d');
      c.reset();
      const lg = (H.legendas || []).find((l) => t >= l.de && t < l.ate);
      if (!lg) return;
      const tam = LG.tam * u, maxL = LG.largura * u;
      const palavras = lg.texto.toUpperCase().split(/\s+/), linhas = []; let atual = [];
      for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && Letras.largura(tenta, tam) > maxL) { linhas.push(atual.join(' ')); atual = [p]; } else atual.push(p); }
      if (atual.length) linhas.push(atual.join(' '));
      const passo = tam * 1.5, y0 = LG.y * A - (linhas.length - 1) * passo / 2 + tam / 2;
      const esc = mistura(0.82, 1, pulo(trecho(t, lg.de, lg.de + 0.14), 2.5));
      c.translate(L / 2, LG.y * A); c.scale(esc, esc); c.translate(-L / 2, -LG.y * A);
      c.lineCap = 'round'; c.lineJoin = 'round';
      const passa = (larg, cor) => {
        c.lineWidth = larg; c.strokeStyle = cor;
        linhas.forEach((txt, li) => {
          let px = L / 2 - Letras.largura(txt, tam) / 2; const py = y0 + li * passo - tam;
          for (const ch of txt) {
            const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
            for (const tr of gl.tracos) { c.beginPath(); tr.forEach(([a, b], i) => (i ? c.lineTo(px + a * tam, py + b * tam) : c.moveTo(px + a * tam, py + b * tam))); c.stroke(); }
            px += (gl.w + 0.2) * tam;
          }
        });
      };
      passa(tam * LG.contorno, C.contorno);
      passa(tam * LG.miolo, '#ffffff');
    }

    // ---------- um quadro ----------
    function desenhar(t) {
      const P = H.planos.find((p) => t >= p.de && t < p.ate) || H.planos[H.planos.length - 1];
      poeBoneco(t);
      quarto.updateMatrixWorld(true);
      poeCao(t, ancora('cabeca', new THREE.Vector3()));
      poeIma(t); poeEsteira(t);
      const pe = ancora('peMeia', new THREE.Vector3());
      poeFeixe(FX, PF, t, PF.topo, 0.0, pe.x, pe.z + 0.04, PF.raio);
      // espaço: o satélite chega de cima, gira devagar e dispara o feixe
      const SA = ES.satelite, ks = pulo(trecho(t, SA.chega, SA.chega + 0.45), 1.3);
      ESP.sat.position.set(SA.pos[0], mistura(SA.pos[1] + 4, SA.pos[1], ks), SA.pos[2]);
      ESP.sat.rotation.set(0.1, SA.giro + (t - SA.chega) * 0.25, 0.08 * Math.sin(t * 1.3));
      const yTerra = ES.terra.centro[1] + Math.sqrt(ES.terra.raio * ES.terra.raio - ES.terra.centro[2] * ES.terra.centro[2]);
      poeFeixe(FXE, ES.feixe, t, SA.pos[1] - 0.33, yTerra, SA.pos[0], 0, ES.feixe.raio);
      quarto.updateMatrixWorld(true); espaco.updateMatrixWorld(true);

      const borrao = poeCamera(P, t);
      render.setRenderTarget(rtCena); render.clear();
      render.render(P.cena === 'espaco' ? espaco : quarto, camera);
      legenda(t); txLeg.needsUpdate = true;
      mFinal.uniforms.uBorrao.value.set(borrao[0], borrao[1]);
      mFinal.uniforms.uApaga.value = Math.max(1 - trecho(t, 0, 0.2), trecho(t, duracao - 0.35, duracao));
      render.setRenderTarget(null); render.render(cenaQuad, camQuad);
    }

    // ---------- som: música de comédia e efeitos nas palavras-chave, nos mesmos tempos da imagem ----------
    function som() {
      const s = Som.criar(duracao, H.semente), MU = H.musica, r = sorteio(H.semente + 9);
      const calado = (t) => (MU.pausas || []).some(([a, b]) => t >= a && t < b);
      const batida = MU.passo * 2, compasso = batida * 4;
      // baixo de corda beliscada (tum-tá), acordes curtos de marimba no contratempo, melodia saltitante
      for (let t = MU.comeca, i = 0; t < MU.fim; t += batida, i++) {
        const cp = MU.compassos[Math.floor((t - MU.comeca) / compasso) % MU.compassos.length], nb = i % 4;
        if (calado(t)) continue;
        s.corda(cp.baixo[nb % 2], t, 0.45, { vol: 0.34, maciez: 0.6 });
        if (nb % 2 === 1) cp.acorde.forEach((n, j) => s.sino(n, t, 0.25, { vol: 0.035, pan: (j - 1) * 0.3, brilho: 0.8 }));
        if (nb % 2 === 1) s.toque(t, { vol: 0.04, corte: 7000, dur: 0.03 });
      }
      MU.melodia.forEach((n, i) => {
        const t = MU.comeca + i * MU.passo;
        if (n === '-' || t >= MU.fim || calado(t)) return;
        s.sino(n, t, 0.32, { vol: 0.075, pan: 0.15, brilho: 1.1 });
      });
      for (let t = MU.comeca; t < duracao - 0.5; t += compasso) {
        const cp = MU.compassos[Math.floor((t - MU.comeca) / compasso) % MU.compassos.length];
        cp.acorde.forEach((n) => s.nota(n.replace(/\d/, (d) => String(Number(d) - 1)), t, compasso * 0.9, { forma: 'tri', vol: 0.03, ataque: 0.3, solta: 0.6 }));
      }
      // chicotes: sopro rápido
      for (const c of H.cortes) { s.vento(c.t - 0.13, 0.3, { vol: 0.16, corte: 2600, onda: 4, profundidade: 0.3, entra: 0.12, sai: 0.15 }); s.toque(c.t, { vol: 0.05, corte: 5000, dur: 0.05 }); }
      // dar de ombros: dois "pins" subindo
      for (const e of PB.atuacao) {
        if (e.pose === 'ombros') { s.pio(e.t, { freq: 520, sobe: 0.5, dur: 0.1, repete: 2, intervalo: 0.11, vol: 0.06 }); }
        if (e.pose === 'mostra') s.pio(e.t, { freq: 880, sobe: 0.3, dur: 0.08, repete: 1, vol: 0.05 });
        if (e.pose === 'olhaCima') s.pio(e.t, { freq: 600, sobe: 1.0, dur: 0.25, repete: 1, vol: 0.05 });
        if (e.pose === 'desaba') {
          // trombone triste: três notas caindo, a última tremendo
          MU.triste.forEach((n, j) => s.nota(n, e.t - 0.3 + j * 0.3, j === MU.triste.length - 1 ? 0.6 : 0.24, { forma: 'serra', vol: 0.17, ataque: 0.03, solta: 0.15, vibrato: j === MU.triste.length - 1 ? 0.025 : 0.006, vibratoHz: 6 }));
        }
      }
      // ímã: desce assobiando, "tlim" metálico, balanço
      s.pio(PI.desce, { freq: 1200, sobe: -0.6, dur: 0.4, repete: 1, vol: 0.05 });
      s.sino('A6', PI.desce + 0.32, 0.6, { vol: 0.07, brilho: 3 });
      s.vento(PI.balanca, PI.some - PI.balanca, { vol: 0.035, corte: 900, onda: PI.ritmo * 2, profundidade: 0.8, entra: 0.3, sai: 0.3 });
      s.batida(PI.semIma, { vol: 0.14, freq: 160, dur: 0.18 }); s.sino('C5', PI.semIma + 0.04, 0.3, { vol: 0.04, brilho: 0.5 });
      // cão: um estalo de plástico para cada peça que encaixa, farejadas, e o "tim" do olhar parado
      CAO.lista.forEach((_, i) => { const ti = PC.monta.de + i * PC.monta.passo + 0.12; s.toque(ti, { vol: 0.12, corte: 6000, dur: 0.035, pan: 0.2 }); s.sino(['C7', 'D7', 'E7', 'G7'][Math.floor(r() * 4)], ti, 0.07, { vol: 0.025, brilho: 3 }); });
      for (let t = PC.fareja.de; t < PC.fareja.ate - 0.1; t += 0.16) { s.toque(t, { vol: 0.07, corte: 1600, dur: 0.05, pan: 0.2 }); s.toque(t + 0.06, { vol: 0.05, corte: 1800, dur: 0.04, pan: 0.2 }); }
      for (let t = PC.fareja.de; t < PC.fareja.ate; t += 0.11) s.toque(t + 0.02, { vol: 0.03, corte: 900, dur: 0.02, pan: 0.3 });
      s.sino('E6', PC.encara.de, 0.6, { vol: 0.07, brilho: 1.5 });
      if (PC.encara.inclina != null) { s.nota('D4', PC.encara.inclina, 0.18, { forma: 'serra', vol: 0.06, solta: 0.1 }); s.nota('C#4', PC.encara.inclina + 0.2, 0.3, { forma: 'serra', vol: 0.06, solta: 0.15 }); }
      // esteira: peças encaixando, ronco da correia, matraca, tranco no fim
      EST.lista.forEach((_, i) => { const ti = PE.monta.de + i * PE.monta.passo + 0.12; s.toque(ti, { vol: 0.12, corte: 5000, dur: 0.035, pan: -0.2 }); s.batida(ti, { vol: 0.05, freq: 180, dur: 0.06 }); });
      const R = PE.corre;
      s.vento(R.de, R.ate - R.de + 0.2, { vol: 0.13, corte: 260, onda: 7, profundidade: 0.35, entra: 0.15, sai: 0.2 });
      for (let t = R.de; t < R.ate; t += 0.07) s.toque(t, { vol: 0.045, corte: 3200, dur: 0.02, pan: (r() - 0.5) * 0.6 });
      for (const c of cargas) s.vento(R.de + (c.cg.x - 2.5) / (R.distancia / (R.ate - R.de)), 0.45, { vol: 0.07, corte: 1800, onda: 2, entra: 0.15, sai: 0.25 });
      s.batida(R.ate, { vol: 0.25, freq: 90, dur: 0.22 }); s.toque(R.ate, { vol: 0.12, corte: 2500, dur: 0.06 });
      // o tapa no botão: bumbo grande, estalo, alarme
      if (BT) {
        const ap = BT.cg.aperta;
        s.batida(ap, { vol: 0.6, freq: 65, dur: 0.45 }); s.toque(ap, { vol: 0.3, corte: 4000, dur: 0.08 });
        for (let k = 0; k < 3; k++) s.pio(ap + 0.12 + k * 0.22, { freq: 990, sobe: 0.35, dur: 0.16, repete: 1, vol: 0.05 });
        // lançamento: ronco subindo e assobio
        s.vento(ap + 0.3, ES.satelite.chega - ap + 0.2, { vol: 0.22, corte: 700, onda: 1.5, profundidade: 0.3, entra: 0.5, sai: 0.15 });
        s.pio(ap + 0.4, { freq: 260, sobe: 4, dur: ES.satelite.chega - ap - 0.4, repete: 1, vol: 0.06 });
      }
      // espaço: o satélite chega, feixe desce, bipes de "achou"
      s.sino('G6', ES.satelite.chega + 0.3, 1.0, { vol: 0.05, brilho: 2 });
      s.pio(ES.feixe.de, { freq: 1800, sobe: -0.7, dur: ES.feixe.desce + 0.1, repete: 1, vol: 0.06 });
      for (let k = 0; k < 3; k++) s.pio(ES.feixe.de + ES.feixe.desce + 0.05 + k * 0.28, { freq: 1318, dur: 0.12, repete: 1, vol: 0.07 });
      // o alvo pousa no pé: zum descendo, tum, e o arpejo de "localizado"
      s.pio(PF.de, { freq: 2000, sobe: -0.75, dur: PF.desce + 0.05, repete: 1, vol: 0.05 });
      const pousa = PF.de + PF.desce;
      s.batida(pousa, { vol: 0.32, freq: 80, dur: 0.3 });
      ['E6', 'G#6', 'B6', 'E7'].forEach((n, i) => s.sino(n, pousa + 0.05 + i * 0.07, 0.6, { vol: 0.05, brilho: 2 }));
      for (let t = pousa + PF.pulso; t < duracao - 0.4; t += PF.pulso) s.sino('B6', t, 0.25, { vol: 0.03, brilho: 1.2 });
      // fecho: acorde baixinho de caixinha
      MU.final.forEach((n, i) => s.sino(n, duracao - 0.75 + i * 0.05, 0.9, { vol: 0.04, brilho: 1.5 }));
      s.sala(0.3);
      return s.fim({ entra: 0.05, sai: 0.35, pico: 0.78 });
    }

    return { desenhar, som };
  },
});
