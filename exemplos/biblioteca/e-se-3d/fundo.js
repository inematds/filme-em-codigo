// fundo.js — o céu de cada plano, pintado por um shader só (nada de imagem baixada).
// Três ingredientes que a história liga e desliga: degradê do céu com estrelas, o planeta de faixas
// (com a mancha e, no fim, dois olhos dentro dela) e camadas de nuvem que sobem enquanto o robô cai.
// Coordenadas: p.y vai de -0,5 (embaixo) a 0,5 (em cima), medidas na ALTURA do quadro.
// O sorteio é por inteiros (sem seno): o mesmo pixel dá o mesmo número em qualquer tamanho de tela.
import * as THREE from '../../../vendor/three/three.module.js';

export function criarFundo(faixas, mancha) {
  const u = {
    uRes: { value: new THREE.Vector2(1080, 1920) }, uT: { value: 0 },
    uCeuTopo: { value: new THREE.Color() }, uCeuBase: { value: new THREE.Color() }, uEstrelas: { value: 0 },
    uPlaneta: { value: new THREE.Vector4(0, 0, 0.3, 0) }, uGiro: { value: 0 },
    uFaixas: { value: faixas.map((c) => new THREE.Color(c)) },
    uMancha: { value: new THREE.Vector4(mancha.lat, mancha.lon, mancha.tam[0], mancha.tam[1]) },
    uManchaCor: { value: new THREE.Color(mancha.cor) },
    uOlhos: { value: 0 }, uOlhosCor: { value: new THREE.Color('#ffffff') },
    uNuvem: { value: new THREE.Vector4(0, 1, 0, 0) }, uNuvemCor: { value: new THREE.Color() }, uNuvemSombra: { value: new THREE.Color() },
  };
  const NF = faixas.length;
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthTest: false, depthWrite: false,
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform vec2 uRes; uniform float uT, uEstrelas, uGiro, uOlhos;
      uniform vec3 uCeuTopo, uCeuBase, uManchaCor, uOlhosCor, uNuvemCor, uNuvemSombra;
      uniform vec4 uPlaneta, uMancha, uNuvem;
      uniform vec3 uFaixas[${NF}];
      uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * ruido(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }
      vec3 faixa(float f){
        f = clamp(f, 0.0, float(${NF - 1}) - 0.001); int i = int(floor(f)); float k = smoothstep(0.25, 0.75, fract(f));
        vec3 a = uFaixas[0], b = uFaixas[0];
        for (int j = 0; j < ${NF}; j++) { if (j == i) a = uFaixas[j]; if (j == i + 1) b = uFaixas[j]; }
        return mix(a, b, k);
      }
      void main(){
        float px = 1.0 / uRes.y;
        vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
        vec3 c = mix(uCeuBase, uCeuTopo, smoothstep(-0.5, 0.5, p.y));

        // estrelas: uma por célula, só nas células sorteadas; tamanho nunca menor que 1 pixel
        if (uEstrelas > 0.0) {
          vec2 q = p * 140.0; vec2 cel = floor(q);
          float h = h2(cel + 7.0);
          if (h > 0.965) {
            vec2 o = vec2(h2(cel + 31.0), h2(cel + 57.0)) * 0.6 + 0.2;
            float d = length(q - cel - o) / 140.0;
            float r = max(px * 0.9, 0.0011 * (h - 0.965) / 0.035);
            c += vec3(0.9, 0.92, 1.0) * uEstrelas * smoothstep(r, 0.0, d) * (0.4 + 0.6 * h2(cel + 3.0));
          }
        }

        // planeta de faixas
        if (uPlaneta.w > 0.0) {
          vec2 d = (p - uPlaneta.xy) / uPlaneta.z; float r2 = dot(d, d), r = sqrt(r2);
          // brilho da atmosfera fora do disco
          c += vec3(1.0, 0.62, 0.32) * 0.35 * exp(-max(r - 1.0, 0.0) * 14.0) * step(1.0, r) * uPlaneta.w;
          if (r < 1.0) {
            float z = sqrt(1.0 - r2);
            float lat = asin(d.y), lon = atan(d.x, z);
            float giro = lon + uGiro;
            vec2 qf = vec2(giro * 2.2, lat * 9.0);
            float turb = fbm(qf + vec2(0.0, 3.0)) - 0.5;
            float onda = sin(giro * 5.0 + lat * 23.0) * 0.04;
            float f = (lat / 1.5708 * 0.5 + 0.5) * float(${NF - 1}) + turb * 0.35 + onda * 2.0;
            vec3 cp = faixa(f);
            cp *= 0.88 + 0.24 * fbm(vec2(giro * 6.0, lat * 70.0));
            // a mancha: elipse com redemoinho, presa na mesma longitude (não gira com as faixas)
            vec2 m = vec2((lon - uMancha.y) * cos(lat) / uMancha.z, (lat - uMancha.x) / uMancha.w);
            float rm = length(m);
            float ang = atan(m.y, m.x) + 2.5 * exp(-rm * 2.0);
            float redem = fbm(vec2(cos(ang), sin(ang)) * rm * 3.0 + 11.0);
            float dentro = smoothstep(1.05, 0.8, rm);
            cp = mix(cp, mix(uManchaCor * 0.8, uManchaCor * 1.2, redem), dentro * 0.92);
            // dois olhos que brilham dentro da mancha (só no fim)
            if (uOlhos > 0.0) {
              vec2 e1 = m - vec2(-0.36, 0.0), e2 = m - vec2(0.36, 0.0);
              float ab = max(uOlhos, 0.06);
              float olho = smoothstep(0.24, 0.17, length(e1 * vec2(1.0, 0.75 / ab))) + smoothstep(0.24, 0.17, length(e2 * vec2(1.0, 0.75 / ab)));
              float auraO = exp(-length(e1) * 5.0) + exp(-length(e2) * 5.0);
              float visor = smoothstep(0.85, 0.7, length(m * vec2(0.85, 1.6)));
              cp = mix(cp, vec3(0.03, 0.04, 0.07), visor * 0.85 * min(1.0, uOlhos * 3.0));
              cp += uOlhosCor * (olho * 2.2 + auraO * 0.35) * min(1.0, uOlhos * 3.0);
            }
            // luz do sol pela esquerda e borda escurecida
            vec3 nrm = vec3(d, z);
            float luz = clamp(dot(nrm, normalize(vec3(-0.55, 0.35, 0.75))), 0.0, 1.0);
            cp *= 0.18 + 0.95 * luz;
            cp *= 0.55 + 0.45 * pow(z, 0.35);
            float borda = smoothstep(1.0, 1.0 - 2.5 * px / uPlaneta.z, r);
            c = mix(c, cp, borda * uPlaneta.w);
          }
        }

        // nuvens: duas camadas que sobem em velocidades diferentes (o robô está caindo)
        if (uNuvem.x > 0.0) {
          vec2 q1 = p * uNuvem.y + vec2(0.0, -uNuvem.z);
          vec2 q2 = p * uNuvem.y * 1.9 + vec2(5.3, -uNuvem.z * 1.8);
          float n1 = fbm(q1 + 0.35 * vec2(fbm(q1 * 1.3 + 2.0), 0.0));
          float n2 = fbm(q2);
          float forma1 = smoothstep(0.42, 0.62, n1), forma2 = smoothstep(0.48, 0.66, n2);
          vec3 c1 = mix(uNuvemSombra, uNuvemCor, smoothstep(0.45, 0.8, n1 + 0.15 * (p.y + 0.5)));
          vec3 c2 = mix(uNuvemSombra, uNuvemCor, smoothstep(0.5, 0.85, n2));
          c = mix(c, c1, forma1 * uNuvem.x);
          c = mix(c, c2, forma2 * uNuvem.x * 0.75);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const cena = new THREE.Scene(); cena.add(quad);
  return { cena, u };
}
