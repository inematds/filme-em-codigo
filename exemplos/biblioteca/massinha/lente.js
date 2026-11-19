// lente.js — a "câmera de macro" depois que a cena foi montada (cópia adaptada da do motor tijolinhos:
// aqui a escala vem da LARGURA, porque o filme é em pé, e a camada de cima é a legenda, não o título).
// 1) a cena é fotografada numa folha com luz alta (HDR) e com a distância de cada ponto (profundidade);
// 2) um passe só faz o desfoque de lente macro (fundo e frente desfocados, bolinhas macias de luz),
//    a cor quente de lâmpada, a curva de filme, a vinheta, o grão (muda a cada foto, não a cada quadro),
//    e põe a legenda por cima.
// Nada guarda o quadro anterior: tudo sai da pose (e) e da distância de foco.
import * as THREE from '../../../vendor/three/three.module.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function criarLente(render, L, A, F, tituloCanvas) {
  const prof = new THREE.DepthTexture(L, A); prof.type = THREE.UnsignedIntType;
  const folha = new THREE.WebGLRenderTarget(L, A, { type: THREE.HalfFloatType, samples: 4, depthTexture: prof, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const txTitulo = new THREE.CanvasTexture(tituloCanvas); txTitulo.colorSpace = THREE.NoColorSpace; txTitulo.premultiplyAlpha = false;

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, depthTest: false, depthWrite: false,
    uniforms: {
      tCor: { value: folha.texture }, tProf: { value: prof }, tTitulo: { value: txTitulo },
      uPx: { value: new THREE.Vector2(1 / L, 1 / A) }, uPerto: { value: 0.3 }, uLonge: { value: 400 },
      uFoco: { value: 10 }, uDesfoque: { value: 8 }, uEscala: { value: L / 1080 },
      uExposicao: { value: F.exposicao }, uQuente: { value: new THREE.Color(F.quente) },
      uGrao: { value: F.grao }, uVinheta: { value: F.vinheta }, uPose: { value: 0 }, uTitulo: { value: 0 }, uApaga: { value: 0 },
    },
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tCor, tProf, tTitulo; uniform vec2 uPx;
      uniform float uPerto, uLonge, uFoco, uDesfoque, uEscala, uExposicao, uGrao, uVinheta, uPose, uTitulo, uApaga;
      uniform vec3 uQuente;
      uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
      float distancia(vec2 uv){ float d = texture2D(tProf, uv).r; float z = d * 2.0 - 1.0; return 2.0 * uPerto * uLonge / (uLonge + uPerto - z * (uLonge - uPerto)); }
      // tamanho do borrão (em pixels de 1080p) para um ponto a distância z
      float borrao(float z){ return min(uDesfoque * 1.6, uDesfoque * abs(1.0 - uFoco / z)); }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main(){
        float z0 = distancia(vUv), c0 = borrao(z0);
        vec3 soma = texture2D(tCor, vUv).rgb; float peso = 1.0;
        float raioMax = uDesfoque * 1.6;
        // espiral de ouro: 48 amostras num disco; cada amostra só entra se o borrão DELA alcança este pixel
        for (int i = 0; i < 48; i++) {
          float fi = float(i) + 0.5;
          float r = sqrt(fi / 48.0) * raioMax;
          float a = fi * 2.39996;
          vec2 o = vec2(cos(a), sin(a)) * r * uEscala;
          vec2 uv = vUv + o * uPx;
          float z = distancia(uv);
          float c = borrao(z);
          if (z > z0) c = min(c, c0);          // o fundo não vaza por cima de quem está na frente e nítido
          float w = smoothstep(r - 1.5, r + 0.5, c);
          vec3 cor = texture2D(tCor, uv).rgb;
          w *= 1.0 + 1.5 * smoothstep(1.2, 3.0, dot(cor, vec3(0.33)));   // pontos de luz viram bolinhas mais fortes
          soma += cor * w; peso += w;
        }
        vec3 c = soma / peso;
        c *= uExposicao * uQuente;
        c = aces(c);
        c = pow(max(c, 0.0), vec3(1.0 / 2.2));
        vec2 v = vUv - 0.5; c *= 1.0 - uVinheta * dot(v, v) * 1.5;
        float cel = max(1.0, uEscala * 1.6);
        float n = h2(floor(gl_FragCoord.xy / cel) + vec2(uPose * 17.0, uPose * 29.0)) - 0.5;
        c += n * uGrao;
        vec4 tt = texture2D(tTitulo, vUv);
        c = mix(c, tt.rgb, tt.a * uTitulo);
        c *= 1.0 - uApaga;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function foto(cena, camera, { e, distFoco, desfoque, titulo, apaga, brilho }) {
    render.setRenderTarget(folha); render.clear(); render.render(cena, camera);
    const u = mat.uniforms;
    u.uPerto.value = camera.near; u.uLonge.value = camera.far; u.uFoco.value = distFoco; u.uDesfoque.value = desfoque;
    u.uExposicao.value = F.exposicao * brilho; u.uPose.value = e; u.uTitulo.value = titulo; u.uApaga.value = apaga;
    txTitulo.needsUpdate = true; // a legenda é redesenhada a cada quadro
    render.setRenderTarget(null); render.render(cenaQuad, camQuad);
  }
  return { foto };
}
