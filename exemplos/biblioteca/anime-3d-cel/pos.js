// pos.js — o acabamento de anime depois que a cena 3D foi fotografada.
//  1) a cena vai para uma folha com cor (pode passar de 1) e profundidade;
//  2) em 1/4 da tela: separa o que brilha, borra (brilho macio) e puxa raios de luz da lua ou do sol;
//  3) passe final do plano: contorno de profundidade em azul-marinho no cenário, névoa de distância,
//     brilho, raios, vinheta e grão;
//  4) junta os planos: corte seco, estilhaço de gelo, cortina de água, clarão branco, borrão de
//     chicote, e a legenda por cima.
// Nada guarda o quadro anterior: tudo sai dos uniforms postos em desenhar(t).
import * as THREE from '../../../vendor/three/three.module.js';
import { RUIDO } from './cel.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const passe = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
const U = (v) => ({ value: v });

export function criarPos(render, L, A) {
  const esc = L / 1080;   // 1 no tamanho cheio (1080 de largura), 1/3 no teste de 360x640
  const prof = new THREE.DepthTexture(L, A); prof.type = THREE.UnsignedIntType;
  const rtCena = new THREE.WebGLRenderTarget(L, A, { type: THREE.HalfFloatType, samples: 4, depthTexture: prof, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const q = (w, h, tipo = THREE.HalfFloatType) => new THREE.WebGLRenderTarget(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), { type: tipo, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const rtBri = q(L / 4, A / 4), rtBl1 = q(L / 4, A / 4), rtBl2 = q(L / 4, A / 4), rtRaios = q(L / 4, A / 4);
  const rtFim = [q(L, A, THREE.UnsignedByteType), q(L, A, THREE.UnsignedByteType)];

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const roda = (mat, destino) => { quad.material = mat; render.setRenderTarget(destino); render.render(cenaQuad, camQuad); };

  const mBri = passe(`varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uPx; uniform float uLimiar;
    void main(){ vec3 c = vec3(0.0);
      c += texture2D(tFonte, vUv + uPx * vec2(-1.0, -1.0)).rgb; c += texture2D(tFonte, vUv + uPx * vec2(1.0, -1.0)).rgb;
      c += texture2D(tFonte, vUv + uPx * vec2(-1.0, 1.0)).rgb;  c += texture2D(tFonte, vUv + uPx * vec2(1.0, 1.0)).rgb;
      c = min(c * 0.25, vec3(8.0)); float l = max(c.r, max(c.g, c.b));
      float k = clamp((l - uLimiar) / 0.5, 0.0, 1.0);
      gl_FragColor = vec4(c * k, 1.0); }`, { tFonte: U(null), uPx: U(new THREE.Vector2(1 / L, 1 / A)), uLimiar: U(0.95) });
  const mBorra = passe(`varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uDir;
    void main(){ vec3 c = texture2D(tFonte, vUv).rgb * 0.2;
      for (int i = 1; i <= 4; i++) { float w = 0.2 * (1.0 - float(i) / 5.0) * 1.25; c += (texture2D(tFonte, vUv + uDir * float(i)).rgb + texture2D(tFonte, vUv - uDir * float(i)).rgb) * w; }
      gl_FragColor = vec4(c, 1.0); }`, { tFonte: U(null), uDir: U(new THREE.Vector2()) });
  // raios de luz: cada pixel caminha em direção à lua/sol somando o que brilha no caminho
  const mRaios = passe(`varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uSol; uniform float uForca;
    void main(){ vec2 d = (uSol - vUv) / 28.0; vec2 p = vUv; vec3 s = vec3(0.0); float w = 1.0;
      for (int i = 0; i < 28; i++) { p += d; s += texture2D(tFonte, clamp(p, 0.0, 1.0)).rgb * w; w *= 0.94; }
      gl_FragColor = vec4(s / 28.0 * uForca, 1.0); }`, { tFonte: U(null), uSol: U(new THREE.Vector2(0.5, 0.8)), uForca: U(0) });

  const mPlano = passe(`${RUIDO}
    varying vec2 vUv;
    uniform sampler2D tCor, tProf, tBrilho, tRaios; uniform vec2 uPx;
    uniform float uPerto, uLonge, uEscala, uNebDens, uNebMax, uBloom, uVinheta, uGrao, uQuadro, uExpo, uBorda, uVerProf;
    uniform vec3 uTinta, uNeblina;
    float z(vec2 uv){ float d = texture2D(tProf, uv).r; if (d >= 0.99999) return 1e5; float zz = d * 2.0 - 1.0; return 2.0 * uPerto * uLonge / (uLonge + uPerto - zz * (uLonge - uPerto)); }
    void main(){
      vec3 c = texture2D(tCor, vUv).rgb;
      float z0 = z(vUv); float ceu = step(9e4, z0);
      // névoa de distância (o céu já vem pintado)
      c = mix(c, uNeblina, (1.0 - exp(-z0 * uNebDens)) * uNebMax * (1.0 - ceu));
      // contorno de profundidade: segunda diferença de 1/z (zero em chão plano), só na borda de quem está na frente
      float o = max(1.0, 1.6 * uEscala);
      float i0 = 1.0 / z0;
      float iv = (1.0 / z(vUv + vec2(o, 0.0) * uPx) + 1.0 / z(vUv - vec2(o, 0.0) * uPx) + 1.0 / z(vUv + vec2(0.0, o) * uPx) + 1.0 / z(vUv - vec2(0.0, o) * uPx)) * 0.25;
      float borda = step(uBorda, (i0 - iv) / i0) * (1.0 - ceu);
      c = mix(c, uTinta, borda * 0.92);
      c *= uExpo;
      c += texture2D(tBrilho, vUv).rgb * uBloom + texture2D(tRaios, vUv).rgb;
      c = c / (1.0 + max(c - 1.0, 0.0));                                   // joelho macio acima de 1
      vec2 v = vUv - 0.5; c *= 1.0 - uVinheta * dot(v * vec2(1.4, 1.0), v * vec2(1.4, 1.0)) * 1.6;
      float cel = max(1.0, uEscala * 1.5);
      c += (h2(floor(gl_FragCoord.xy / cel) + vec2(uQuadro * 13.0, uQuadro * 7.0)) - 0.5) * uGrao;
      if (uVerProf > 0.5) c = vec3(ceu > 0.5 ? 1.0 : clamp(z0 / 80.0, 0.0, 0.95)) * (1.0 - borda * 0.6);   // só a profundidade, em cinza (para conferir)
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`, {
    tCor: U(rtCena.texture), tProf: U(prof), tBrilho: U(rtBl2.texture), tRaios: U(rtRaios.texture), uPx: U(new THREE.Vector2(1 / L, 1 / A)),
    uPerto: U(0.1), uLonge: U(1000), uEscala: U(esc), uNebDens: U(0.02), uNebMax: U(0.6), uBloom: U(0.8), uVinheta: U(0.35), uGrao: U(0.04),
    uQuadro: U(0), uExpo: U(1), uBorda: U(0.05), uVerProf: U(0), uTinta: U(new THREE.Color('#1b2148')), uNeblina: U(new THREE.Color('#556')),
  });

  // ---------- juntar planos, transições e legenda ----------
  const cvLeg = document.createElement('canvas'); cvLeg.width = L; cvLeg.height = A;
  const txLeg = new THREE.CanvasTexture(cvLeg); txLeg.colorSpace = THREE.NoColorSpace; txLeg.generateMipmaps = false; txLeg.minFilter = THREE.LinearFilter;
  const mJunta = passe(`${RUIDO}
    varying vec2 vUv;
    uniform sampler2D tA, tB, tLeg; uniform vec2 uPx, uBorrao; uniform float uTipo, uK, uClarao, uEscala; uniform vec3 uGelo, uAgua;
    vec3 pega(sampler2D t, vec2 uv){
      if (dot(uBorrao, uBorrao) < 1.0) return texture2D(t, uv).rgb;
      vec3 s = vec3(0.0); for (int i = 0; i < 16; i++) { float f = float(i) / 15.0 - 0.5; s += texture2D(t, clamp(uv + uBorrao * uPx * f, 0.0, 1.0)).rgb; }
      return s / 16.0;
    }
    void main(){
      vec3 a = pega(tA, vUv);
      vec3 c = a;
      if (uTipo > 0.5 && uTipo < 1.5) {                          // estilhaço de gelo
        vec2 p = vUv / uPx / (230.0 * uEscala);
        vec2 ip = floor(p), fp = fract(p); float m1 = 9.0, m2 = 9.0; vec2 dono = vec2(0.0);
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j)); vec2 o = vec2(h2(ip + g), h2(ip + g + 31.7));
          float d = length(g + o - fp); if (d < m1) { m2 = m1; m1 = d; dono = ip + g; } else if (d < m2) m2 = d;
        }
        float lim = 0.15 + 0.55 * h2(dono + 5.0) + 0.3 * (1.0 - vUv.y);   // os cacos caem de cima para baixo
        float vira = step(lim, uK * 1.45);
        vec3 b = pega(tB, vUv);
        c = mix(a, b, vira);
        float risca = (1.0 - step(0.035, m2 - m1)) * (1.0 - step(0.22, abs(uK * 1.45 - lim)));   // só o caco que está virando tem a borda branca
        c = mix(c, uGelo, risca);
      } else if (uTipo > 1.5 && uTipo < 2.5) {                   // cortina de água descendo
        float col = floor(vUv.x / uPx.x / (14.0 * uEscala));
        float frente = 1.0 - (uK * 1.6 - 0.35 * h2(vec2(col, 2.0)));
        vec3 b = pega(tB, vUv);
        float dentro = step(frente, vUv.y);
        float borda = step(frente - 0.06, vUv.y) * (1.0 - dentro);
        c = mix(a, b, dentro);
        c = mix(c, uAgua, borda);
      }
      c = mix(c, vec3(1.0), uClarao);
      vec4 lg = texture2D(tLeg, vUv);
      c = mix(c, lg.rgb, lg.a);
      gl_FragColor = vec4(c, 1.0);
    }`, {
    tA: U(rtFim[0].texture), tB: U(rtFim[1].texture), tLeg: U(txLeg), uPx: U(new THREE.Vector2(1 / L, 1 / A)), uBorrao: U(new THREE.Vector2()),
    uTipo: U(0), uK: U(0), uClarao: U(0), uEscala: U(esc), uGelo: U(new THREE.Color('#f4f8ff')), uAgua: U(new THREE.Color('#dff0ff')),
  });

  // fotografa um plano: cena -> brilho/raios -> passe final em rtFim[i]
  function plano(i, cena, camera, o) {
    render.setRenderTarget(rtCena); render.clear(); render.render(cena, camera);
    mBri.uniforms.tFonte.value = rtCena.texture; mBri.uniforms.uLimiar.value = o.limiar; roda(mBri, rtBri);
    mBorra.uniforms.tFonte.value = rtBri.texture; mBorra.uniforms.uDir.value.set(2.5 / (L / 4), 0); roda(mBorra, rtBl1);
    mBorra.uniforms.tFonte.value = rtBl1.texture; mBorra.uniforms.uDir.value.set(0, 2.5 / (A / 4)); roda(mBorra, rtBl2);
    mRaios.uniforms.tFonte.value = rtBri.texture; mRaios.uniforms.uSol.value.copy(o.sol); mRaios.uniforms.uForca.value = o.raios; roda(mRaios, rtRaios);
    const u = mPlano.uniforms;
    u.uPerto.value = camera.near; u.uLonge.value = camera.far; u.uNebDens.value = o.nebDens; u.uNebMax.value = o.nebMax;
    u.uNeblina.value.copy(o.neblina); u.uTinta.value.copy(o.tinta); u.uBloom.value = o.bloom; u.uVinheta.value = o.vinheta;
    u.uGrao.value = o.grao; u.uQuadro.value = o.quadro; u.uExpo.value = o.expo; u.uBorda.value = o.borda; u.uVerProf.value = o.verProf ? 1 : 0;
    roda(mPlano, rtFim[i]);
  }
  function junta(o) {
    const u = mJunta.uniforms;
    u.uTipo.value = o.tipo; u.uK.value = o.k; u.uClarao.value = o.clarao; u.uBorrao.value.set(o.borrao[0], o.borrao[1]);
    txLeg.needsUpdate = true;
    roda(mJunta, null);
  }
  return { plano, junta, legenda: cvLeg };
}
