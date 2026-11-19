// cel.js — os "pincéis" do anime em 3D: cada material é um shader pequeno.
//  - cel: duas cores duras por superfície (luz e sombra fria azul-violeta), com a borda da sombra
//    tremida como pincelada, e o brilho duro e quente da lanterna;
//  - contorno: a "casca invertida" em azul-marinho em volta de bonecos e objetos;
//  - ceu: céu pintado (degradê em faixas, nuvens de dois tons, lua ou sol, estrelas, serras de névoa);
//  - cachoeira, rio, mapa, nevoa, brilho: água em fios, rio correndo, mapa pintado, névoa e o halo.
// Nada aqui sabe da história: as cores e os tempos chegam por uniforms, postos a cada quadro.
import * as THREE from '../../../vendor/three/three.module.js';

// sorteio e ruído sem seno (inteiros): o mesmo em qualquer máquina e tamanho de tela
export const RUIDO = `
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float h2(vec2 p){ uvec2 q = uvec2(ivec2(floor(p)) + ivec2(40000)); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
float h3(vec3 p){ uvec3 q = uvec3(ivec3(floor(p)) + ivec3(40000)); return float(pcg(q.x + pcg(q.y + pcg(q.z)))) / 4294967295.0; }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z); }
float fbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n2(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }
`;

const VERT_MUNDO = `
varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = m * instanceMatrix;
  #endif
  vec4 w = m * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(m) * normal); vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export function criarMateriais(C) {
  const cor = (h) => new THREE.Color(h);
  // uniforms que todos os materiais dividem (o mesmo objeto: mudou um, mudou em todos)
  const G = {
    uLuzDir: { value: new THREE.Vector3(0, 1, 0) }, uLuzCor: { value: cor('#ffffff') }, uSombra: { value: cor('#6a64a8') },
    uLant: { value: new THREE.Vector3(0, -99, 0) }, uLantCor: { value: cor(C.lanterna) }, uLantR: { value: 1.2 }, uLantOn: { value: 0 },
    uRes: { value: new THREE.Vector2(1080, 1920) }, uTinta: { value: cor(C.tinta) }, uLarg: { value: 3.5 },
    uTa: { value: 0 }, uFluxo: { value: 1 }, uNivel: { value: 0 },
  };

  // ---------- cel: duas cores duras ----------
  const FRAG_CEL = `${RUIDO}
    varying vec3 vN; varying vec3 vW;
    uniform vec3 uCor, uLuzDir, uLuzCor, uSombra, uLant, uLantCor; uniform float uLantR, uLantOn, uProprio, uRisco, uPincel;
    void main(){
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      // a borda da sombra treme como pincelada (ruído no lugar, não no tempo)
      float d = dot(n, uLuzDir) + (n3(vW * uPincel) - 0.5) * 0.45;
      float luz = step(0.08, d);
      vec3 c = mix(uCor * uSombra, uCor * uLuzCor, luz);
      // pinceladas na pedra: riscos mais escuros só na parte em sombra
      if (uRisco > 0.0) { float r = n3(vW * vec3(1.3, 5.0, 1.3)); c *= 1.0 - uRisco * (1.0 - luz) * step(0.64, r); c *= 1.0 - uRisco * 0.5 * luz * step(0.74, r); }
      // a lanterna: círculo de luz quente de borda dura
      vec3 aL = uLant - vW; float dl = length(aL) + (n3(vW * 5.0) - 0.5) * 0.1;
      float g = (1.0 - step(uLantR, dl)) * uLantOn * step(-0.2, dot(n, aL / max(length(aL), 1e-3)));
      c = mix(c, uCor * uLantCor * 1.25, g * 0.8);
      c = mix(c, uCor * 2.4, uProprio);
      gl_FragColor = vec4(c, 1.0);
    }`;
  const cache = new Map();
  function cel(hex, o = {}) {
    const k = hex + JSON.stringify(o);
    if (cache.has(k)) return cache.get(k);
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT_MUNDO, fragmentShader: FRAG_CEL, side: o.dois ? THREE.DoubleSide : THREE.FrontSide,
      uniforms: { ...G, uCor: { value: cor(hex) }, uProprio: { value: o.proprio || 0 }, uRisco: { value: o.risco || 0 }, uPincel: { value: o.pincel || 3.0 } },
    });
    cache.set(k, m); return m;
  }

  // ---------- contorno: casca invertida em azul-marinho ----------
  // Empurra cada ponto para fora na direção do centro da peça (não da normal), em pixels da tela:
  // assim caixa e cilindro não abrem fresta na quina. Longe da câmera, a linha afina.
  const contorno = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: G,
    vertexShader: `uniform float uLarg; uniform vec2 uRes;
      void main(){
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
        m = m * instanceMatrix;
        #endif
        vec4 w = m * vec4(position, 1.0);
        vec4 cp = projectionMatrix * viewMatrix * w;
        vec3 radial = length(position) > 1e-5 ? normalize(position) : normal;
        vec3 dv = mat3(viewMatrix) * (mat3(m) * radial);
        vec2 d2 = dv.xy * vec2(projectionMatrix[0][0], projectionMatrix[1][1]); float l = length(d2);
        d2 = l > 1e-5 ? d2 / l : vec2(0.0);
        float larg = uLarg * clamp(7.0 / cp.w, 0.4, 1.0);
        cp.xy += d2 * larg * 2.0 / uRes * cp.w;
        gl_Position = cp;
      }`,
    fragmentShader: `uniform vec3 uTinta; void main(){ gl_FragColor = vec4(uTinta, 1.0); }`,
  });

  // ---------- céu pintado ----------
  const U = (v) => ({ value: v });
  const ceu = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uTopo: U(cor('#000')), uMeio: U(cor('#000')), uHoriz: U(cor('#000')), uNuvem: U(cor('#fff')), uNuvemSombra: U(cor('#888')),
      uAstroCor: U(cor('#fff')), uAstroDir: U(new THREE.Vector3(0, 0.5, -1)), uAstroTam: U(0.04), uEstrelas: U(0), uNuvens: U(0.3),
      uDeriva: U(0), uSerra: U(cor('#445')), uSerras: U(1),
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `${RUIDO}
      varying vec3 vDir;
      uniform vec3 uTopo, uMeio, uHoriz, uNuvem, uNuvemSombra, uAstroCor, uAstroDir, uSerra;
      uniform float uAstroTam, uEstrelas, uNuvens, uDeriva, uSerras;
      void main(){
        vec3 d = normalize(vDir); float e = d.y;
        float k = pow(clamp((e + 0.06) / 0.85, 0.0, 1.0), 0.75);
        float kb = mix(floor(k * 7.0) / 7.0, k, 0.2);           // degradê em faixas
        vec3 c = kb < 0.5 ? mix(uHoriz, uMeio, kb * 2.0) : mix(uMeio, uTopo, kb * 2.0 - 1.0);
        float az = atan(d.z, d.x);
        if (uEstrelas > 0.0) {
          vec2 g = vec2(az * 140.0, e * 140.0); vec2 f = fract(g) - 0.5;
          float s = step(0.988, h2(floor(g)));
          c += uEstrelas * s * (1.0 - smoothstep(0.12, 0.3, length(f))) * smoothstep(0.04, 0.3, e) * vec3(1.0, 0.97, 0.9);
        }
        vec3 A = normalize(uAstroDir); float ca = dot(d, A);
        c += uAstroCor * 0.35 * smoothstep(cos(uAstroTam * 7.0), 1.0, ca);         // halo largo
        c = mix(c, uAstroCor * 1.9, step(cos(uAstroTam), ca));                    // o disco (passa de 1: vira brilho)
        if (e > 0.015) {                                                           // nuvens de dois tons
          vec2 p = d.xz / (e + 0.22) * 1.25 + vec2(uDeriva, 0.0);
          float f = fbm2(p), lim = 1.0 - uNuvens;
          vec2 rumo = normalize(A.xz + vec2(1e-4)) * 0.16;
          float lado = fbm2(p + rumo);
          float lit = step(lim + 0.035, lado);
          vec3 nc = mix(uNuvemSombra, uNuvem, lit);
          c = mix(c, nc, step(lim, f) * smoothstep(0.015, 0.08, e));
        }
        if (uSerras > 0.0) {                                                       // serras de névoa, da mais longe à mais perto
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float h = 0.03 + 0.035 * fi + (0.05 - 0.012 * fi) * (n2(vec2(az * (4.0 + 3.0 * fi) + fi * 7.3, fi)) - 0.3);
            vec3 sc = mix(uHoriz, uSerra, 0.35 + 0.22 * fi);
            c = mix(c, sc, step(e, h - 0.07 * fi) * uSerras);
          }
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // ---------- a cachoeira: fios de água descendo (mexe de 3 em 3 quadros) ----------
  const cachoeira = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...G, uAgua: U(cor(C.agua)), uEspuma: U(cor(C.aguaClara)) },
    vertexShader: VERT_MUNDO,
    fragmentShader: `${RUIDO}
      varying vec2 vUv; varying vec3 vW;
      uniform vec3 uAgua, uEspuma, uSombra, uLuzCor; uniform float uTa, uFluxo;
      void main(){
        float col = floor(vUv.x * 60.0);
        float hc = h2(vec2(col, 3.0));
        // com pouca água a cortina vira fios finos; o resto vira gota solta
        float larg = 0.5 * mix(0.12, 1.02, uFluxo);
        float dentro = step(abs(fract(vUv.x * 60.0) - 0.5), larg);
        float fica = step(hc, uFluxo * 1.6 + 0.15) * step(0.02, uFluxo) * dentro;
        float pinga = step(0.86, hc) * (1.0 - fica) * step(abs(fract(vUv.x * 60.0) - 0.5), 0.06) * step(0.7, fract(vUv.y * 2.5 + uTa * (1.3 + hc)));
        if (fica + pinga < 0.5) discard;
        // fios compridos: ruído esticado na vertical, descendo
        float faixa = n2(vec2(vUv.x * 190.0, vUv.y * 4.0 + uTa * (1.6 + 0.4 * hc)));
        float risco = h2(vec2(floor(vUv.x * 190.0), 9.0));
        vec3 c = mix(uAgua * uSombra * 1.3, uAgua * uLuzCor, step(0.38 + 0.2 * risco, faixa));
        c = mix(c, uEspuma * uLuzCor * 1.1, step(0.74, faixa));
        c = mix(c, uEspuma * uLuzCor * 1.15, (1.0 - smoothstep(0.0, 0.16, vUv.y)) * uFluxo); // espuma no pé
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // ---------- o rio no chão: listras correndo para a frente ----------
  const rio = new THREE.ShaderMaterial({
    uniforms: { ...G, uAgua: U(cor(C.agua)), uEspuma: U(cor(C.aguaClara)) },
    vertexShader: VERT_MUNDO,
    fragmentShader: `${RUIDO}
      varying vec3 vW;
      uniform vec3 uAgua, uEspuma, uSombra, uLuzCor, uLant, uLantCor; uniform float uTa, uFluxo, uLantOn, uLantR;
      void main(){
        float f = n2(vec2(vW.x * 0.9, vW.z * 0.25 - uTa * 2.5 * uFluxo));
        vec3 c = mix(uAgua * uSombra * 1.15, uAgua * uLuzCor * 0.95, step(0.45, f));
        c = mix(c, uEspuma * uLuzCor, step(0.8, f) * uFluxo);
        float pe = smoothstep(-34.0, -46.0, vW.z) * uFluxo;                      // espuma branca junto da queda
        c = mix(c, uEspuma * uLuzCor * 1.1, step(0.35, pe + (n2(vW.xz * 0.7 + uTa) - 0.5) * 0.5));
        float g = (1.0 - step(uLantR, length(uLant - vW))) * uLantOn;
        c = mix(c, uAgua * uLantCor * 1.3, g * 0.7);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });

  // ---------- o mapa pintado (vista do alto): lago, terra, mata e o rio que seca ----------
  const mapa = new THREE.ShaderMaterial({
    uniforms: {
      ...G, uLago: U(cor(C.mapaLago)), uTerra: U(cor(C.mapaTerra)), uMato: U(cor(C.mapaMato)), uRioC: U(cor(C.mapaRio)), uLama: U(cor(C.lama)),
      uSeca: U(0), uVento: U(0),
    },
    vertexShader: VERT_MUNDO,
    fragmentShader: `${RUIDO}
      varying vec2 vUv;
      uniform vec3 uLago, uTerra, uMato, uRioC, uLama, uTinta, uSombra, uLuzCor; uniform float uSeca, uVento, uTa;
      float lagoD(vec2 p){ return length((p - vec2(0.5, 0.86)) * vec2(1.0, 1.9)) - 0.42 + (n2(p * 9.0) - 0.5) * 0.08; }
      void main(){
        vec2 p = vUv;                                    // v = 1 em cima (lago), v = 0 embaixo
        float rx = 0.5 + 0.07 * sin(p.y * 9.0) + 0.03 * sin(p.y * 23.0);
        float rioD = abs(p.x - rx) - 0.022;
        float lago = lagoD(p);
        float mato = step(0.56, fbm2(p * 6.0));
        vec3 c = mix(uTerra, uMato, mato);
        c *= mix(1.0, 0.86, step(0.6, n2(p * 30.0)));
        // o rio seca de cima (a foz) para baixo
        float boca = 0.86 - 0.42 / 1.9;
        float noRio = step(rioD, 0.0) * step(p.y, boca + 0.02);
        vec3 corRio = mix(uRioC, uLama, step((boca - p.y) / boca, uSeca));
        c = mix(c, corRio, noRio);
        // lago com listras de vento
        float lv = step(0.62, n2(vec2(p.x * 40.0 - uVento * 3.0, p.y * 6.0)));
        vec3 corLago = mix(uLago, uLago * 1.25, lv);
        c = mix(c, corLago, step(lago, 0.0));
        // linhas de tinta: costa do lago e beira do rio
        float lin = (1.0 - step(0.004, abs(lago))) + (1.0 - step(0.004, abs(rioD))) * step(p.y, boca);
        c = mix(c, uTinta, clamp(lin, 0.0, 1.0));
        gl_FragColor = vec4(c * mix(vec3(1.0), uLuzCor, 0.25), 1.0);
      }`,
  });

  // ---------- névoa: bolas macias que não escrevem profundidade (não ganham contorno) ----------
  const nevoa = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...G, uCor: U(cor(C.aguaClara)), uAlfa: U(0.7) },
    vertexShader: VERT_MUNDO,
    fragmentShader: `${RUIDO}
      varying vec3 vN; varying vec3 vW;
      uniform vec3 uCor, uLuzCor, uSombra; uniform float uAlfa;
      void main(){
        vec3 v = normalize(cameraPosition - vW); float fr = abs(dot(normalize(vN), v));
        float a = step(0.35, fr + (n3(vW * 1.5) - 0.5) * 0.4);
        vec3 c = mix(uCor * uSombra * 1.3, uCor * uLuzCor, step(0.6, fr));
        gl_FragColor = vec4(c, a * uAlfa);
      }`,
  });

  // ---------- brilho: halo de borda dura (lanterna, faísca da baioneta) ----------
  function brilho(hex) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uCor: U(cor(hex)), uForca: U(1), uEstrela: U(0) },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform vec3 uCor; uniform float uForca, uEstrela;
        void main(){
          vec2 p = vUv * 2.0 - 1.0; float r = length(p);
          float a = (1.0 - step(0.55, r)) * 0.32 + (1.0 - step(0.22, r)) * 1.4;   // dois anéis duros
          if (uEstrela > 0.5) a = (1.0 - smoothstep(0.0, 0.06, min(abs(p.x), abs(p.y)))) * (1.0 - r) * 2.5 + (1.0 - step(0.12, r)) * 2.0;
          gl_FragColor = vec4(uCor * a * uForca, 1.0);
        }`,
    });
  }

  return { G, cel, contorno, ceu, cachoeira, rio, mapa, nevoa, brilho };
}

export { VERT_MUNDO };
