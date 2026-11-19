// acabamento.js — o passe depois da foto 3D, num shader só:
// 1) linha de nanquim quase preta onde a profundidade "pula" (borda de cada peça), ~5 px a 1080;
// 2) fundo desfocado nos planos fechados (só o que está atrás do foco);
// 3) sombra puxada para o azul frio, luz puxada para o quente, um pouco mais de cor, vinheta macia;
// 4) por cima de tudo, o letreiro (legenda, rótulos, clarão) desenhado numa tela 2D.
// Nada guarda o quadro anterior.
import * as THREE from '../../../vendor/three/three.module.js';

export function criarAcabamento(render, L, A, hud, perto, longe) {
  const prof = new THREE.DepthTexture(L, A); prof.type = THREE.UnsignedIntType;
  const folha = new THREE.WebGLRenderTarget(L, A, { depthTexture: prof, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const txHud = new THREE.CanvasTexture(hud); txHud.colorSpace = THREE.NoColorSpace; txHud.minFilter = THREE.LinearFilter; txHud.generateMipmaps = false;
  const k = L / 1080;
  const u = {
    tCor: { value: folha.texture }, tProf: { value: prof }, tHud: { value: txHud },
    uRes: { value: new THREE.Vector2(L, A) }, uPerto: { value: perto }, uLonge: { value: longe },
    uLarg: { value: 3 * k }, uTinta: { value: new THREE.Color('#1a1220') }, uLimiar: { value: 0.035 },
    uDesf: { value: 0 }, uFoco: { value: 10 }, uVinheta: { value: 0.35 }, uSat: { value: 1.08 }, uFrio: { value: 0.1 }, uQuente: { value: 0.06 },
    uEscala: { value: k },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tCor, tProf, tHud; uniform vec2 uRes; uniform float uPerto, uLonge, uLarg, uLimiar, uDesf, uFoco, uVinheta, uSat, uFrio, uQuente, uEscala;
      uniform vec3 uTinta;
      // profundidade de verdade (em metros) a partir do que a placa guardou
      float dist(vec2 p){ float z = texture2D(tProf, p).x * 2.0 - 1.0; return (2.0 * uPerto * uLonge) / (uLonge + uPerto - z * (uLonge - uPerto)); }
      // 1/distância é reta sobre um plano: a "curvatura" dela só aparece na borda das peças
      float bordaEm(vec2 p, float r){
        vec2 px = r / uRes;
        float c = 1.0 / dist(p);
        float l = 1.0 / dist(p - vec2(px.x, 0.0)), rr = 1.0 / dist(p + vec2(px.x, 0.0));
        float b = 1.0 / dist(p - vec2(0.0, px.y)), t = 1.0 / dist(p + vec2(0.0, px.y));
        float lap = abs(l + rr - 2.0 * c) + abs(b + t - 2.0 * c);
        float salto = max(max(abs(l - c), abs(rr - c)), max(abs(b - c), abs(t - c)));
        return max(lap, salto * 0.6) / c;
      }
      void main(){
        float dC = dist(vUv);
        vec3 c = texture2D(tCor, vUv).rgb;
        // desfoque de fundo (só atrás do foco)
        float atras = uDesf > 0.0 ? smoothstep(uFoco * 1.15, uFoco * 2.2, dC) : 0.0;
        if (atras > 0.0) {
          vec3 s = c; float n = 1.0;
          for (int i = 0; i < 12; i++) {
            float a = float(i) * 2.39996, r = sqrt(float(i) + 0.5) / 3.5;
            vec2 o = vec2(cos(a), sin(a)) * r * uDesf * uEscala * atras / uRes;
            s += texture2D(tCor, vUv + o).rgb; n += 1.0;
          }
          c = s / n;
        }
        // nanquim: borda de profundidade, um pouco mais grossa perto, mais fina longe
        float e = 0.0;
        e = max(e, bordaEm(vUv, uLarg));
        e = max(e, bordaEm(vUv, uLarg * 0.5));
        float tinta = smoothstep(uLimiar, uLimiar * 2.2, e) * (1.0 - 0.75 * atras);
        c = mix(c, uTinta, tinta * 0.92);
        // cor: sombra fria, luz quente, saturação, vinheta
        float lum = dot(c, vec3(0.299, 0.587, 0.114));
        c += vec3(-0.3, 0.0, 0.9) * uFrio * (1.0 - smoothstep(0.0, 0.5, lum));
        c += vec3(0.8, 0.35, -0.5) * uQuente * smoothstep(0.55, 1.0, lum);
        c = mix(vec3(lum), c, uSat);
        vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
        c *= 1.0 - uVinheta * smoothstep(0.35, 0.95, length(q) * 1.25);
        vec4 h = texture2D(tHud, vUv);
        c = mix(c, h.rgb, h.a);
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const cenaQ = new THREE.Scene(); cenaQ.add(quad);
  const camQ = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function compor(cena, camera) {
    render.setRenderTarget(folha); render.clear(); render.render(cena, camera);
    render.setRenderTarget(null); txHud.needsUpdate = true; render.render(cenaQ, camQ);
  }
  return { u, compor };
}
