// lente.js — o "laboratório" depois que a cena foi fotografada.
// 1) a cena vai para uma folha com luz alta (HDR) e com a distância de cada ponto;
// 2) brilho (bloom): só o que passa do limiar, encolhido para 1/4 e 1/8 do tamanho e borrado;
// 3) desfoque de lente (profundidade de campo: o que está longe do foco borra), soma o brilho,
//    curva de filme e passa para cores de tela;
// 4) acabamento: borrão de chicote (para o lado) ou de mergulho (do centro para fora), clarão branco,
//    vinheta, grão fino e, por cima, a tela de textos (títulos, legenda, rótulos, marca).
// Nada guarda o quadro anterior: tudo sai dos números que o motor passa para foto().
import * as THREE from '../../../vendor/three/three.module.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function criarLente(render, L, A, F, telaTextos) {
  const prof = new THREE.DepthTexture(L, A); prof.type = THREE.UnsignedIntType;
  const opc = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false };
  const folha = new THREE.WebGLRenderTarget(L, A, { ...opc, depthBuffer: true, type: THREE.HalfFloatType, samples: 4, depthTexture: prof });
  const nitida = new THREE.WebGLRenderTarget(L, A, { ...opc, type: THREE.UnsignedByteType });
  const q4 = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.ceil(L / 4), Math.ceil(A / 4), { ...opc, type: THREE.HalfFloatType }));
  const q8 = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.ceil(L / 8), Math.ceil(A / 8), { ...opc, type: THREE.HalfFloatType }));
  const txTextos = new THREE.CanvasTexture(telaTextos); txTextos.colorSpace = THREE.NoColorSpace;
  txTextos.minFilter = THREE.LinearFilter; txTextos.generateMipmaps = false; txTextos.premultiplyAlpha = true;

  const cenaQuad = new THREE.Scene(), camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); cenaQuad.add(quad);
  const passa = (mat, alvo) => { quad.material = mat; render.setRenderTarget(alvo); render.render(cenaQuad, camQuad); };
  const sh = (uniforms, frag) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });

  // brilho: pega só o que passa do limiar (joelho macio) e encolhe (4 amostras cobrem 4x4 pixels)
  const matClaro = sh({ tFonte: { value: null }, uPx: { value: new THREE.Vector2() }, uLimiar: { value: F.limiarBrilho } }, `
    varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uPx; uniform float uLimiar;
    void main(){
      vec3 c = 0.25 * (texture2D(tFonte, vUv + uPx * vec2(-1.0, -1.0)).rgb + texture2D(tFonte, vUv + uPx * vec2(1.0, -1.0)).rgb
                     + texture2D(tFonte, vUv + uPx * vec2(-1.0, 1.0)).rgb + texture2D(tFonte, vUv + uPx * vec2(1.0, 1.0)).rgb);
      float l = max(c.r, max(c.g, c.b));
      float k = clamp((l - uLimiar * 0.6) / (uLimiar * 0.8), 0.0, 1.0);
      gl_FragColor = vec4(c * k * k, 1.0);
    }`);
  const matEncolhe = sh({ tFonte: { value: null }, uPx: { value: new THREE.Vector2() } }, `
    varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uPx;
    void main(){ gl_FragColor = vec4(0.25 * (texture2D(tFonte, vUv + uPx * vec2(-0.5, -0.5)).rgb + texture2D(tFonte, vUv + uPx * vec2(0.5, -0.5)).rgb
      + texture2D(tFonte, vUv + uPx * vec2(-0.5, 0.5)).rgb + texture2D(tFonte, vUv + uPx * vec2(0.5, 0.5)).rgb), 1.0); }`);
  const matBorra = sh({ tFonte: { value: null }, uDir: { value: new THREE.Vector2() } }, `
    varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uDir;
    void main(){
      vec3 s = texture2D(tFonte, vUv).rgb * 0.2270;
      s += (texture2D(tFonte, vUv + uDir * 1.3846).rgb + texture2D(tFonte, vUv - uDir * 1.3846).rgb) * 0.3162;
      s += (texture2D(tFonte, vUv + uDir * 3.2308).rgb + texture2D(tFonte, vUv - uDir * 3.2308).rgb) * 0.0703;
      gl_FragColor = vec4(s, 1.0);
    }`);

  // desfoque de lente + brilho + curva de filme
  const matLente = sh({
    tCor: { value: folha.texture }, tProf: { value: prof }, tB4: { value: q4[0].texture }, tB8: { value: q8[0].texture },
    uPx: { value: new THREE.Vector2(1 / L, 1 / A) }, uPerto: { value: 0.1 }, uLonge: { value: 100 },
    uFoco: { value: 10 }, uDesfoque: { value: 4 }, uEscala: { value: L / 1080 },
    uExposicao: { value: F.exposicao }, uBrilho: { value: F.brilho },
  }, `
    varying vec2 vUv;
    uniform sampler2D tCor, tProf, tB4, tB8; uniform vec2 uPx;
    uniform float uPerto, uLonge, uFoco, uDesfoque, uEscala, uExposicao, uBrilho;
    float distancia(vec2 uv){ float d = texture2D(tProf, uv).r; float z = d * 2.0 - 1.0; return 2.0 * uPerto * uLonge / (uLonge + uPerto - z * (uLonge - uPerto)); }
    float borrao(float z){ return min(uDesfoque * 1.6, uDesfoque * abs(1.0 - uFoco / z)); }
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    void main(){
      float z0 = distancia(vUv), c0 = borrao(z0);
      vec3 soma = texture2D(tCor, vUv).rgb; float peso = 1.0;
      float raioMax = uDesfoque * 1.6;
      // espiral de ouro: 40 amostras num disco; cada amostra só entra se o borrão DELA alcança este pixel
      for (int i = 0; i < 40; i++) {
        float fi = float(i) + 0.5;
        float r = sqrt(fi / 40.0) * raioMax;
        float a = fi * 2.39996;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uEscala * uPx;
        float z = distancia(uv);
        float c = borrao(z);
        if (z > z0) c = min(c, c0);
        float w = smoothstep(r - 1.5, r + 0.5, c);
        vec3 cor = texture2D(tCor, uv).rgb;
        w *= 1.0 + 1.5 * smoothstep(1.2, 3.0, dot(cor, vec3(0.33)));
        soma += cor * w; peso += w;
      }
      vec3 c = soma / peso;
      c += uBrilho * (0.55 * texture2D(tB4, vUv).rgb + 0.9 * texture2D(tB8, vUv).rgb);
      c = aces(c * uExposicao);
      c = pow(max(c, 0.0), vec3(1.0 / 2.2));
      gl_FragColor = vec4(c, 1.0);
    }`);

  // acabamento: chicote / mergulho, clarão, vinheta, grão, textos
  const matFim = sh({
    tCor: { value: nitida.texture }, tTextos: { value: txTextos }, uEscala: { value: L / 1080 },
    uChicote: { value: 0 }, uMergulho: { value: 0 }, uClarao: { value: 0 }, uApaga: { value: 0 },
    uVinheta: { value: F.vinheta }, uGrao: { value: F.grao }, uQuadro: { value: 0 }, uAspecto: { value: A / L },
  }, `
    varying vec2 vUv;
    uniform sampler2D tCor, tTextos; uniform float uEscala, uChicote, uMergulho, uClarao, uApaga, uVinheta, uGrao, uQuadro, uAspecto;
    uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
    float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
    void main(){
      vec3 c;
      if (abs(uChicote) + uMergulho < 0.0005) c = texture2D(tCor, vUv).rgb;
      else {
        // 24 amostras numa linha: para o lado (chicote) e do centro para fora (mergulho)
        vec2 dir = vec2(uChicote, 0.0) + (vUv - 0.5) * uMergulho;
        vec3 s = vec3(0.0);
        for (int i = 0; i < 24; i++) { float k = float(i) / 23.0 - 0.5; s += texture2D(tCor, vUv + dir * k).rgb; }
        c = s / 24.0;
      }
      c = mix(c, vec3(1.0), clamp(uClarao, 0.0, 1.0));
      vec2 v = (vUv - 0.5) * vec2(1.0, uAspecto * 0.75); c *= 1.0 - uVinheta * dot(v, v) * 1.6;
      float cel = max(1.0, uEscala * 1.5);
      c += (h2(floor(gl_FragCoord.xy / cel) + vec2(uQuadro * 17.0, uQuadro * 29.0)) - 0.5) * uGrao;
      vec4 tt = texture2D(tTextos, vUv);
      c = c * (1.0 - tt.a) + tt.rgb;          // a tela de textos vem com alfa já multiplicado
      c *= 1.0 - uApaga;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`);

  function foto(cena, camera, o) {
    render.setRenderTarget(folha); render.clear(); render.render(cena, camera);
    // brilho
    matClaro.uniforms.tFonte.value = folha.texture; matClaro.uniforms.uPx.value.set(1 / L, 1 / A);
    passa(matClaro, q4[0]);
    const borra = (par, w, h) => {
      matBorra.uniforms.tFonte.value = par[0].texture; matBorra.uniforms.uDir.value.set(1 / w, 0); passa(matBorra, par[1]);
      matBorra.uniforms.tFonte.value = par[1].texture; matBorra.uniforms.uDir.value.set(0, 1 / h); passa(matBorra, par[0]);
    };
    borra(q4, q4[0].width, q4[0].height);
    matEncolhe.uniforms.tFonte.value = q4[0].texture; matEncolhe.uniforms.uPx.value.set(1 / q4[0].width, 1 / q4[0].height);
    passa(matEncolhe, q8[0]);
    borra(q8, q8[0].width, q8[0].height);
    borra(q8, q8[0].width, q8[0].height);
    // lente
    const u = matLente.uniforms;
    u.uPerto.value = camera.near; u.uLonge.value = camera.far; u.uFoco.value = o.distFoco; u.uDesfoque.value = o.desfoque;
    passa(matLente, nitida);
    // acabamento
    txTextos.needsUpdate = true;
    const f = matFim.uniforms;
    f.uChicote.value = o.chicote; f.uMergulho.value = o.mergulho; f.uClarao.value = o.clarao; f.uApaga.value = o.apaga; f.uQuadro.value = o.quadro;
    passa(matFim, null);
  }
  return { foto };
}
