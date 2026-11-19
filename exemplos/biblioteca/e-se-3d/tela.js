// tela.js — o acabamento depois que o céu e o robô foram fotografados.
// Num passe só: bola de fogo da entrada (em volta do robô), riscos de velocidade, de vento e de
// detritos, as passagens entre planos (clarão, varrida de nuvem, escurecida), vinheta, grão e,
// por cima de tudo, o letreiro (contador e legenda) desenhado numa tela 2D.
// Nada guarda o quadro anterior: tudo sai de t e dos números que o motor manda.
import * as THREE from '../../../vendor/three/three.module.js';

export function criarTela(render, L, A, hudCanvas) {
  const folha = new THREE.WebGLRenderTarget(L, A, { samples: 4, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const txHud = new THREE.CanvasTexture(hudCanvas); txHud.colorSpace = THREE.NoColorSpace;
  txHud.minFilter = THREE.LinearFilter; txHud.generateMipmaps = false;
  const u = {
    tCena: { value: folha.texture }, tHud: { value: txHud }, uRes: { value: new THREE.Vector2(L, A) }, uT: { value: 0 }, uPose: { value: 0 },
    uFogo: { value: 0 }, uFogoPos: { value: new THREE.Vector2() }, uFogoDir: { value: new THREE.Vector2(0, -1) }, uFogoFrente: { value: 0.15 },
    uRiscos: { value: 0 }, uRiscoCor: { value: new THREE.Color() }, uRiscoAng: { value: 0 }, uRiscoVel: { value: 1 }, uRiscoLarg: { value: 1 },
    uClarao: { value: 0 }, uEscuro: { value: 0 }, uVarrida: { value: new THREE.Vector2(0, 0) }, uVarridaCor: { value: new THREE.Color('#f4efe8') },
    uGrao: { value: 0.03 }, uVinheta: { value: 0.4 }, uExposicao: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tCena, tHud; uniform vec2 uRes, uFogoPos, uFogoDir, uVarrida;
      uniform float uFogoFrente;
      uniform float uT, uPose, uFogo, uRiscos, uRiscoAng, uRiscoVel, uRiscoLarg, uClarao, uEscuro, uGrao, uVinheta, uExposicao;
      uniform vec3 uRiscoCor, uVarridaCor;
      uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float h1(float x){ return float(pcg(uint(int(floor(x)) + 50000))) / 4294967295.0; }
      float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * ruido(p); p = p * 2.07 + 13.1; a *= 0.5; } return s; }

      // riscos: uma linha fina por faixa sorteada, com pedaços que correm na direção do ângulo
      float riscos(vec2 p, float esp, float semente, float larguraPx){
        vec2 dir = vec2(cos(uRiscoAng), sin(uRiscoAng)), lado = vec2(-dir.y, dir.x);
        float a = dot(p, dir), b = dot(p, lado);
        float faixa = floor(b / esp);
        float h = h1(faixa * 7.0 + semente);
        if (h > 0.45) return 0.0;
        float centro = (h1(faixa * 3.0 + semente + 1.0) * 0.6 + 0.2) * esp;
        float dPx = abs(b - faixa * esp - centro) * uRes.y;
        float w = max(0.75, larguraPx * uRes.y / 1920.0);
        float linha = smoothstep(w, w * 0.3, dPx);
        float vel = uRiscoVel * (0.7 + 0.6 * h1(faixa * 11.0 + semente));
        float periodo = 0.55 + 0.5 * h1(faixa * 13.0 + semente);
        float pos = fract(a / periodo + h1(faixa * 5.0 + semente) - uT * vel / periodo);
        float comp = 0.12 + 0.3 * h1(faixa * 17.0 + semente);
        float pedaco = smoothstep(0.0, 0.02, pos) * smoothstep(comp, comp * 0.15, pos);
        return linha * pedaco * (0.45 + 0.55 * h1(faixa * 19.0 + semente));
      }

      void main(){
        vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
        vec3 c = texture2D(tCena, vUv).rgb;

        // bola de fogo: frente curva na direção da queda, rastro largo atrás, chama que tremula
        if (uFogo > 0.0) {
          vec2 dir = normalize(uFogoDir), lado = vec2(-dir.y, dir.x), q = p - uFogoPos;
          float a = dot(q, dir), b = dot(q, lado);
          float frente = uFogoFrente - 7.0 * b * b;     // a casca de plasma, curva, na frente dos pés
          float s = frente - a;                           // > 0 atrás da casca
          float chama = fbm(vec2(b * 18.0, (a + uT * 1.6) * 9.0));
          float casca = smoothstep(-0.01, 0.003, s) * (exp(-max(s, 0.0) * 18.0) + 0.4 * exp(-max(s, 0.0) * 4.0)) * smoothstep(0.3, 0.08, abs(b));
          float nucleo = exp(-length(q - dir * uFogoFrente) * 14.0);
          float bola = exp(-length(vec2(a * 1.5, b) - vec2(uFogoFrente * 0.5, 0.0)) * 7.0) * (0.6 + 0.6 * chama); // a bola de fogo em volta
          float g = (casca * (0.7 + 0.9 * chama) + nucleo * 0.7 + bola * 0.45) * uFogo;
          vec3 cf = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.85, 0.45), smoothstep(0.2, 0.0, max(s, 0.0)));
          c = c * (1.0 - 0.15 * g) + cf * g * 1.3;
        }

        // riscos de velocidade / vento / detritos (duas camadas)
        if (uRiscos > 0.0) {
          float r = riscos(p, 0.016, 1.0, uRiscoLarg) + 0.7 * riscos(p * 1.0 + 0.37, 0.023, 9.0, uRiscoLarg * 0.7);
          c += uRiscoCor * r * uRiscos * 1.3;
        }

        c *= uExposicao;
        c = c / (1.0 + 0.25 * c);                         // segura o que passa de 1 (fogo, faíscas)
        c = pow(max(c, 0.0), vec3(1.0 / 2.2));

        // passagens entre planos
        c = mix(c, vec3(1.0, 0.96, 0.88), clamp(uClarao, 0.0, 1.0));
        if (uVarrida.y > 0.0) {
          float k = uVarrida.x;                            // -1..1: a nuvem sobe cobrindo, depois sobe descobrindo
          float borda = (fbm(vec2(p.x * 7.0, uT * 2.0)) - 0.5) * 0.18;
          float frente = k < 0.0 ? mix(-0.75, 0.75, k + 1.0) : mix(-0.75, 0.75, k);
          float cobre = k < 0.0 ? smoothstep(frente + 0.02, frente - 0.02, p.y + borda) : smoothstep(frente - 0.02, frente + 0.02, p.y + borda);
          c = mix(c, uVarridaCor, cobre);
        }
        c *= 1.0 - uEscuro;

        vec2 v = vUv - 0.5; v.x *= uRes.x / uRes.y;
        c *= 1.0 - uVinheta * dot(v, v) * 1.6;
        float cel = max(1.0, uRes.y / 1080.0);
        c += (h2(floor(gl_FragCoord.xy / cel) + vec2(uPose * 17.0, uPose * 29.0)) - 0.5) * uGrao;

        vec4 hud = texture2D(tHud, vUv);
        c = mix(c, hud.rgb, hud.a);
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const cenaQuad = new THREE.Scene(); cenaQuad.add(quad);
  const camQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // fundo + cena 3D na folha, depois o passe final na tela
  function foto(cenaFundo, cena, camera) {
    render.setRenderTarget(folha);
    render.autoClear = false; render.clear(true, true, true);
    render.render(cenaFundo, camQuad);
    render.clearDepth();
    render.render(cena, camera);
    txHud.needsUpdate = true;
    render.setRenderTarget(null); render.clear(true, true, true);
    render.render(cenaQuad, camQuad);
  }
  return { foto, u };
}
