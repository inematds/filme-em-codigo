// lente.js — o acabamento de "maquete em miniatura" depois que a cena de cubinhos foi montada.
// 1) a cena é fotografada numa folha com luz alta (HDR) e com a distância de cada ponto (profundidade);
// 2) um passe só faz: o desfoque de miniatura (tilt-shift: o que está longe do foco e o que está
//    perto do alto e do pé do quadro sai borrado), o brilho quente em volta do que tem luz própria
//    (mel, tocha, faísca), a curva de filme, a vinheta, um grão leve e a legenda por cima.
// Nada guarda o quadro anterior: tudo sai do tempo, da câmera e da distância de foco.
import * as THREE from '../../../vendor/three/three.module.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function criarLente(render, L, A, F, legendaCanvas) {
  const prof = new THREE.DepthTexture(L, A); prof.type = THREE.UnsignedIntType;
  const folha = new THREE.WebGLRenderTarget(L, A, { type: THREE.HalfFloatType, samples: 4, depthTexture: prof, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const txLegenda = new THREE.CanvasTexture(legendaCanvas); txLegenda.colorSpace = THREE.NoColorSpace; txLegenda.premultiplyAlpha = false;

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, depthTest: false, depthWrite: false,
    uniforms: {
      tCor: { value: folha.texture }, tProf: { value: prof }, tLegenda: { value: txLegenda },
      uPx: { value: new THREE.Vector2(1 / L, 1 / A) }, uPerto: { value: 0.3 }, uLonge: { value: 400 },
      uFoco: { value: 10 }, uDesfoque: { value: 8 }, uTilt: { value: 0 }, uEscala: { value: L / 1080 },
      uExposicao: { value: F.exposicao }, uQuente: { value: new THREE.Color(F.quente) }, uBrilho: { value: F.brilho },
      uGrao: { value: F.grao }, uVinheta: { value: F.vinheta }, uSemente: { value: 0 }, uLegenda: { value: 0 },
      uApaga: { value: 0 }, uClarao: { value: 0 },
    },
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tCor, tProf, tLegenda; uniform vec2 uPx;
      uniform float uPerto, uLonge, uFoco, uDesfoque, uTilt, uEscala, uExposicao, uBrilho, uGrao, uVinheta, uSemente, uLegenda, uApaga, uClarao;
      uniform vec3 uQuente;
      uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
      float distancia(vec2 uv){ float d = texture2D(tProf, uv).r; float z = d * 2.0 - 1.0; return 2.0 * uPerto * uLonge / (uLonge + uPerto - z * (uLonge - uPerto)); }
      // tamanho do borrão (em pixels de 1080 de largura) para um ponto a distância z, na altura uv.y da tela
      float borrao(float z, float y){
        float lente = uDesfoque * abs(1.0 - uFoco / z);
        float faixa = uTilt * smoothstep(0.16, 0.5, abs(y - 0.47));   // miniatura: alto e pé do quadro borrados
        return min(uDesfoque * 1.6 + uTilt, lente + faixa);
      }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main(){
        float z0 = distancia(vUv), c0 = borrao(z0, vUv.y);
        vec3 soma = texture2D(tCor, vUv).rgb; float peso = 1.0;
        float raioMax = uDesfoque * 1.6 + uTilt;
        // espiral de ouro: 40 amostras num disco; cada amostra só entra se o borrão DELA alcança este pixel
        for (int i = 0; i < 40; i++) {
          float fi = float(i) + 0.5;
          float r = sqrt(fi / 40.0) * raioMax;
          float a = fi * 2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uEscala * uPx;
          float z = distancia(uv);
          float c = borrao(z, uv.y);
          if (z > z0) c = min(c, c0);          // o fundo não vaza por cima de quem está na frente e nítido
          float w = smoothstep(r - 1.5, r + 0.5, c);
          soma += texture2D(tCor, uv).rgb * w; peso += w;
        }
        vec3 c = soma / peso;
        // brilho: só a parte que passa de 1 (luz própria) se espalha num halo largo
        vec3 halo = vec3(0.0); float ph = 0.0;
        for (int i = 0; i < 28; i++) {
          float fi = float(i) + 0.5;
          float r = sqrt(fi / 28.0) * 46.0;
          float a = fi * 2.39996 + 0.7;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uEscala * uPx;
          vec3 cor = texture2D(tCor, uv).rgb;
          float w = 1.0 - r / 52.0;
          halo += max(cor - vec3(0.95), vec3(0.0)) * w; ph += w;
        }
        c += uBrilho * halo / ph * 3.0;
        c *= uExposicao * uQuente;
        c = aces(c);
        c = pow(max(c, 0.0), vec3(1.0 / 2.2));
        vec2 v = vUv - 0.5; c *= 1.0 - uVinheta * dot(v, v) * 1.5;
        float cel = max(1.0, uEscala * 1.6);
        float n = h2(floor(gl_FragCoord.xy / cel) + vec2(uSemente * 17.0, uSemente * 29.0)) - 0.5;
        c += n * uGrao;
        c = mix(c, vec3(1.0, 0.98, 0.92), uClarao);
        c *= 1.0 - uApaga;
        vec4 tt = texture2D(tLegenda, vUv);
        c = mix(c, tt.rgb, tt.a * uLegenda * (1.0 - uApaga));
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function foto(cena, camera, { semente, distFoco, desfoque, tilt, legenda, apaga, clarao, brilho }) {
    render.setRenderTarget(folha); render.clear(); render.render(cena, camera);
    const u = mat.uniforms;
    u.uPerto.value = camera.near; u.uLonge.value = camera.far; u.uFoco.value = distFoco; u.uDesfoque.value = desfoque;
    u.uTilt.value = tilt; u.uSemente.value = semente; u.uLegenda.value = legenda; u.uApaga.value = apaga;
    u.uClarao.value = clarao; u.uBrilho.value = F.brilho * brilho;
    txLegenda.needsUpdate = true; // a legenda é redesenhada a cada quadro
    render.setRenderTarget(null); render.render(cenaQuad, camQuad);
  }
  return { foto };
}
