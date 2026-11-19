// posproducao.js — o "laboratório de cinema" depois que a cena 3D foi fotografada.
// A cena é gravada em HDR (luz pode passar de 1). Depois:
//   1) brilho (bloom) em cadeia que encolhe e cresce de novo (1/2 → 1/32 → 1/4 da tela);
//   2) riscos horizontais de lente anamórfica, feitos numa faixa baixinha da tela;
//   3) um passe final: borrão de movimento da câmera, gotas na lente, separação de cores,
//      curva de filme, cor puxada para verde-azulado e magenta, vinheta, grão e título.
// Nada guarda o quadro anterior: o borrão vem da câmera em t e em t - 1/fps.
import * as THREE from '../../../vendor/three/three.module.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// sorteio por pixel sem seno (inteiros), igual em qualquer tamanho de tela
const HASH = `
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
`;

function passe(frag, uniforms) {
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  return m;
}

export function criarPos(render, L, A, F, tituloCanvas) {
  const alvo = (w, h, tipo = THREE.HalfFloatType) => new THREE.WebGLRenderTarget(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), { type: tipo, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const cena = new THREE.WebGLRenderTarget(L, A, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const desce = [alvo(L / 2, A / 2), alvo(L / 4, A / 4), alvo(L / 8, A / 8), alvo(L / 16, A / 16), alvo(L / 32, A / 32)];
  const sobe = [alvo(L / 16, A / 16), alvo(L / 8, A / 8), alvo(L / 4, A / 4)];
  const risco = [alvo(L / 4, A / 16), alvo(L / 4, A / 16)];

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const roda = (mat, destino) => { quad.material = mat; render.setRenderTarget(destino); render.render(cenaQuad, camQuad); };

  // 1) separa o que brilha (joelho macio) e já reduz pela metade
  const mBrilho = passe(`varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uPx; uniform float uLimiar;
    void main(){
      vec3 c = vec3(0.0);
      c += texture2D(tFonte, vUv + uPx * vec2(-0.5, -0.5)).rgb; c += texture2D(tFonte, vUv + uPx * vec2(0.5, -0.5)).rgb;
      c += texture2D(tFonte, vUv + uPx * vec2(-0.5, 0.5)).rgb;  c += texture2D(tFonte, vUv + uPx * vec2(0.5, 0.5)).rgb;
      c *= 0.25; c = min(c, vec3(40.0));
      float l = max(c.r, max(c.g, c.b));
      float k = clamp((l - uLimiar) / (uLimiar * 0.6 + 1e-3), 0.0, 1.0);
      gl_FragColor = vec4(c * k * k, 1.0);
    }`, { tFonte: { value: null }, uPx: { value: new THREE.Vector2() }, uLimiar: { value: 0.9 } });
  // filtro duplo (Kawase): 5 amostras para descer, 8 para subir
  const mDesce = passe(`varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uPx;
    void main(){ vec3 c = texture2D(tFonte, vUv).rgb * 4.0;
      c += texture2D(tFonte, vUv + uPx * vec2(-1.0, -1.0)).rgb; c += texture2D(tFonte, vUv + uPx * vec2(1.0, -1.0)).rgb;
      c += texture2D(tFonte, vUv + uPx * vec2(-1.0, 1.0)).rgb;  c += texture2D(tFonte, vUv + uPx * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0); }`, { tFonte: { value: null }, uPx: { value: new THREE.Vector2() } });
  const mSobe = passe(`varying vec2 vUv; uniform sampler2D tFonte, tJunta; uniform vec2 uPx;
    void main(){ vec3 c = vec3(0.0);
      c += texture2D(tFonte, vUv + uPx * vec2(-2.0, 0.0)).rgb; c += texture2D(tFonte, vUv + uPx * vec2(2.0, 0.0)).rgb;
      c += texture2D(tFonte, vUv + uPx * vec2(0.0, -2.0)).rgb; c += texture2D(tFonte, vUv + uPx * vec2(0.0, 2.0)).rgb;
      c += 2.0 * texture2D(tFonte, vUv + uPx * vec2(-1.0, -1.0)).rgb; c += 2.0 * texture2D(tFonte, vUv + uPx * vec2(1.0, -1.0)).rgb;
      c += 2.0 * texture2D(tFonte, vUv + uPx * vec2(-1.0, 1.0)).rgb;  c += 2.0 * texture2D(tFonte, vUv + uPx * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 12.0 + texture2D(tJunta, vUv).rgb, 1.0); }`, { tFonte: { value: null }, tJunta: { value: null }, uPx: { value: new THREE.Vector2() } });
  // riscos anamórficos: borrão só na horizontal, cada passe espalha mais
  const mRisco = passe(`varying vec2 vUv; uniform sampler2D tFonte; uniform vec2 uPx; uniform float uPasso;
    void main(){ vec3 c = vec3(0.0); float soma = 0.0;
      for (int i = -6; i <= 6; i++) { float w = exp(-float(i * i) / 14.0); c += texture2D(tFonte, vUv + vec2(uPx.x * uPasso * float(i), 0.0)).rgb * w; soma += w; }
      gl_FragColor = vec4(c / soma, 1.0); }`, { tFonte: { value: null }, uPx: { value: new THREE.Vector2() }, uPasso: { value: 1 } });

  const txTitulo = new THREE.CanvasTexture(tituloCanvas); txTitulo.colorSpace = THREE.NoColorSpace;

  // 3) passe final
  const mFinal = passe(`varying vec2 vUv;
    uniform sampler2D tCena, tBrilho, tRisco, tTitulo;
    uniform vec2 uRes, uBorrao; uniform float uT, uFrame, uEscala;
    uniform float uForcaBrilho, uForcaRisco, uAberracao, uGotas, uGrao, uExposicao, uVinheta, uApaga, uTitulo;
    uniform vec3 uSombra, uLuz, uRiscoCor;
    ${HASH}
    float h1(vec2 p){ return h2(p * 97.0 + 13.0); }
    // gotas paradas na lente: aparecem, ficam e somem; tudo sai de t
    vec3 gotas(vec2 uv){
      vec2 a = vec2(uv.x * uRes.x / uRes.y, uv.y);
      vec2 desvio = vec2(0.0); float luz = 0.0;
      for (int camada = 0; camada < 2; camada++) {
        float esc = camada == 0 ? 5.0 : 9.0;
        vec2 g = a * esc + float(camada) * 7.31;
        vec2 id = floor(g), f = fract(g) - 0.5;
        float h = h1(id + float(camada) * 31.0);
        float ciclo = uT * 0.22 + h * 5.0, vida = fract(ciclo);
        float existe = step(0.78, h1(id + 3.7 + floor(ciclo)));
        vec2 c = (vec2(h1(id + 1.3), h1(id + 2.9)) - 0.5) * 0.5;
        c.y -= vida * vida * 0.25 * step(0.8, h1(id + 9.1));     // algumas escorrem
        float r = (0.06 + 0.1 * h1(id + 5.5)) * (camada == 0 ? 1.0 : 0.7);
        vec2 d = (f - c) * vec2(1.0, 0.85);
        float dist = length(d);
        float m = smoothstep(r, r * 0.8, dist) * existe * smoothstep(0.0, 0.08, vida) * (1.0 - smoothstep(0.75, 1.0, vida));
        desvio += -d / esc * m * 0.9;
        luz += m * smoothstep(r * 0.35, 0.0, length(d - vec2(-0.3, 0.35) * r)) * 0.5;
      }
      return vec3(desvio, luz);
    }
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    void main(){
      vec2 uv = vUv;
      vec3 g = gotas(uv) * uGotas;
      vec2 uvg = uv + g.xy;
      // borrão de movimento da câmera (mesma direção em toda a tela) + separação de cores nas bordas
      vec2 centro = uvg - 0.5;
      vec2 ab = centro * uAberracao * dot(centro, centro) * 2.0;
      vec3 c = vec3(0.0);
      for (int i = 0; i < 6; i++) {
        vec2 o = uBorrao * (float(i) / 5.0 - 0.5);
        c.r += texture2D(tCena, uvg + o + ab).r;
        c.g += texture2D(tCena, uvg + o).g;
        c.b += texture2D(tCena, uvg + o - ab).b;
      }
      c /= 6.0;
      vec3 b = texture2D(tBrilho, uvg).rgb;
      vec3 r = texture2D(tRisco, uvg).rgb;
      c += b * uForcaBrilho + r * uRiscoCor * uForcaRisco;
      c *= uExposicao;
      c = aces(c);
      // cor: sombras verde-azuladas, luzes puxadas para magenta
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, c * uSombra * 1.6, (1.0 - smoothstep(0.0, 0.45, l)) * 0.45);
      c = mix(c, c * uLuz * 1.25, smoothstep(0.45, 1.0, l) * 0.3);
      c += g.z * 0.25;
      c = pow(max(c, 0.0), vec3(1.0 / 2.2));
      // vinheta e grão (célula do grão nunca menor que 1 pixel)
      vec2 v = uv - 0.5; c *= 1.0 - uVinheta * dot(v, v) * 1.6;
      float cel = max(1.0, uEscala * 1.5);
      float n = h2(floor(gl_FragCoord.xy / cel) + vec2(uFrame * 17.0, uFrame * 29.0)) - 0.5;
      c += n * uGrao;
      // título por cima, depois do acabamento (fica nítido)
      vec4 tt = texture2D(tTitulo, vUv);
      c = mix(c, tt.rgb, tt.a * uTitulo);
      c *= 1.0 - uApaga;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`, {
    tCena: { value: cena.texture }, tBrilho: { value: null }, tRisco: { value: null }, tTitulo: { value: txTitulo },
    uRes: { value: new THREE.Vector2(L, A) }, uBorrao: { value: new THREE.Vector2() }, uT: { value: 0 }, uFrame: { value: 0 }, uEscala: { value: L / 1920 },
    uForcaBrilho: { value: F.brilho }, uForcaRisco: { value: F.riscos }, uAberracao: { value: F.aberracao }, uGotas: { value: F.gotasLente }, uGrao: { value: F.grao },
    uExposicao: { value: F.exposicao }, uVinheta: { value: F.vinheta }, uApaga: { value: 0 }, uTitulo: { value: 0 },
    uSombra: { value: new THREE.Color(F.sombra) }, uLuz: { value: new THREE.Color(F.luz) }, uRiscoCor: { value: new THREE.Color(F.corRisco) },
  });

  function aplicar({ t, frame, borrao, apaga, titulo }) {
    const px = (rt) => new THREE.Vector2(1 / rt.width, 1 / rt.height);
    mBrilho.uniforms.tFonte.value = cena.texture; mBrilho.uniforms.uPx.value = px(cena); mBrilho.uniforms.uLimiar.value = F.limiar;
    roda(mBrilho, desce[0]);
    for (let i = 1; i < desce.length; i++) { mDesce.uniforms.tFonte.value = desce[i - 1].texture; mDesce.uniforms.uPx.value = px(desce[i - 1]); roda(mDesce, desce[i]); }
    // sobe: 1/32 → 1/16 (+1/16) → 1/8 (+1/8) → 1/4 (+1/4)
    let fonte = desce[4];
    for (let i = 0; i < sobe.length; i++) {
      mSobe.uniforms.tFonte.value = fonte.texture; mSobe.uniforms.tJunta.value = desce[3 - i].texture; mSobe.uniforms.uPx.value = px(fonte);
      roda(mSobe, sobe[i]); fonte = sobe[i];
    }
    // riscos: da metade (já com o que brilha), espremida numa faixa baixa, espalhada 3 vezes
    mRisco.uniforms.tFonte.value = desce[1].texture; mRisco.uniforms.uPx.value = px(risco[0]); mRisco.uniforms.uPasso.value = 1.5; roda(mRisco, risco[0]);
    mRisco.uniforms.tFonte.value = risco[0].texture; mRisco.uniforms.uPasso.value = 5; roda(mRisco, risco[1]);
    mRisco.uniforms.tFonte.value = risco[1].texture; mRisco.uniforms.uPasso.value = 16; roda(mRisco, risco[0]);
    const u = mFinal.uniforms;
    u.tBrilho.value = sobe[2].texture; u.tRisco.value = risco[0].texture;
    u.uT.value = t; u.uFrame.value = frame; u.uBorrao.value.copy(borrao); u.uApaga.value = apaga; u.uTitulo.value = titulo;
    roda(mFinal, null);
  }

  return { cena, aplicar };
}
