// motor.js — tinta-na-agua: tinta caindo na água, fotografada de perto, e um enxame de partículas
// que sai da tinta, voa em bando, forma uma figura e explode de volta em tinta.
// O motor sabe DESENHAR o estilo. Plumas, manchas, o caminho do bando, a figura (em partes),
// câmera, foco, cores e música ficam no historia.json.
//
// Tudo sai de t (conta pura). Não há simulação de fluido: cada pluma é um "cogumelo" de tinta
// cuja cabeça desce por uma curva, e dois redemoinhos que giram ao contrário enrolam a tinta
// (o shader gira o ponto de leitura em volta de cada redemoinho, mais forte perto do centro).
// Cada partícula do bando também é uma conta: onde nasceu, onde está no caminho, onde fica na figura.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, sorteio, ruido, rgb } = Filme;
  const MAX = 24; // plumas + manchas + floradas que o shader aguenta

  // ---------------- shaders ----------------
  const VERT = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

  // sorteio por pixel sem seno (inteiros), ruído macio e soma de oitavas
  const COMUM = `
uint hU(uint x){ x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float h21(vec2 p){ ivec2 i = ivec2(floor(p)); return float(hU(uint(i.x) * 1973u + hU(uint(i.y) + 9277u))) / 4294967295.0; }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
vec2 gira(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;

  // passe 1: quanto de cada tinta (preta, azul, ouro) há em cada ponto (em resolução reduzida)
  const TINTA = `#version 300 es
precision highp float;
uniform vec2 res; uniform vec3 cam; uniform float t; uniform int n;
uniform vec4 pa[${MAX}]; // x, y da cabeça, raio, idade
uniform vec4 pb[${MAX}]; // ângulo, cor (0 preta, 1 azul, 2 ouro), haste (em raios), giro
uniform vec4 pc[${MAX}]; // força, tipo (0 pluma, 1 mancha), semente, -
out vec4 saida;
${COMUM}
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  vec2 w = cam.xy + (vec2(uv.x, 1.0 - uv.y) - 0.5) * vec2(1920.0, 1080.0) / cam.z;
  // a água dobra tudo devagar
  vec2 wq = w / 280.0;
  vec2 dob = vec2(fbm(wq + vec2(0.0, t * 0.08)), fbm(wq + vec2(5.2, 1.3 - t * 0.07))) - 0.5;
  vec2 w2 = w + dob * 110.0;
  vec3 d = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= n) break;
    vec4 A = pa[i], B = pb[i], C = pc[i];
    if (A.w <= 0.0 || C.x <= 0.0) continue;
    float dens = 0.0;
    if (C.y < 0.5) {
      // ---- pluma: cabeça em cogumelo + haste que vem de cima ----
      vec2 q = gira(w2 - A.xy, -B.x) / A.z;           // +y = para onde a pluma anda
      if (abs(q.x) > 3.4 || q.y > 3.2 || q.y < -B.z - 2.0) continue;
      float g = B.w * min(A.w, 3.0) * 0.5;
      vec2 r = q;
      for (int k = 0; k < 2; k++) {                     // dois redemoinhos, giros contrários
        float s = k == 0 ? 1.0 : -1.0;
        vec2 c = vec2(-0.58 * s, 0.1);
        vec2 dv = r - c; float rr = dot(dv, dv);
        r = c + gira(dv, s * g * exp(-rr * 1.3) / (rr + 0.25));
      }
      vec2 dq = (fbm(r * 1.7 + C.z * 3.1 + vec2(0.0, t * 0.15)) - 0.5) * vec2(0.45, 0.3);
      r += dq;
      // forma: dois lobos (um em cada redemoinho) e a ponte entre eles; a borda segue a tinta enrolada
      vec2 f = mix(q, r, 0.55);
      float as = (fract(C.z * 0.618) - 0.5) * 0.5;      // cada pluma um pouco torta para um lado
      float lobo = max(smoothstep(0.66 * (1.0 - as), 0.2, length(f - vec2(-0.55 * (1.0 + as), 0.12 + as * 0.3))),
                       smoothstep(0.66 * (1.0 + as), 0.2, length(f - vec2(0.55 * (1.0 - as), 0.12 - as * 0.3))));
      float ponte = smoothstep(0.7, 0.25, length((f - vec2(0.0, -0.08)) * vec2(1.2, 1.6)));
      float cab = max(lobo, ponte * 0.85);
      float halo = smoothstep(1.9, 0.5, length(r * vec2(0.75, 1.0))) * 0.14;
      float haste = 0.0;
      if (q.y < 0.2) {
        float k = clamp(-q.y / max(B.z, 0.5), 0.0, 1.0);
        float onda = (fbm(vec2(q.y * 0.35, C.z * 7.0 + t * 0.1)) - 0.5) * 1.4 * k;
        float larg = mix(0.42, 0.13, sqrt(k));
        haste = exp(-pow((q.x - onda) / larg, 2.0)) * smoothstep(-B.z - 0.6, -B.z + 0.8, q.y) * smoothstep(0.2, -0.25, q.y) * 0.8;
      }
      // fibras finas: riscos de ruído que os redemoinhos enrolam
      float fio = fbm(r * vec2(10.0, 2.2) + C.z * 5.0);
      float fib = clamp(0.25 + 1.5 * (fio - 0.3), 0.15, 1.3);
      dens = (cab * 1.5 + haste) * fib + halo;
    } else {
      // ---- mancha: tinta velha, já espalhada, macia ----
      vec2 q = (w2 - A.xy) / A.z;
      float borda = length(q) + (fbm(q * 1.6 + C.z + t * 0.05) - 0.5) * 1.2;
      dens = smoothstep(1.0, 0.1, borda) * (0.35 + 0.8 * fbm(q * 3.2 + C.z * 1.7 - t * 0.03));
    }
    dens *= C.x;
    d += dens * vec3(B.y < 0.5 ? 1.0 : 0.0, abs(B.y - 1.0) < 0.5 ? 1.0 : 0.0, B.y > 1.5 ? 1.0 : 0.0);
  }
  saida = vec4(1.0 - exp(-d), 1.0);   // guarda a cobertura (0 a 1); o passe final volta para densidade
}`;

  // passe 2: papel iluminado por trás, tinta (com foco), bando, cáustica, vinheta e grão
  const FINAL = `#version 300 es
precision highp float;
uniform sampler2D tinta, bando;
uniform vec2 res; uniform vec3 cam; uniform float t, quadro, raioT, raioB, esc;
uniform vec3 papelClaro, papelBorda, absP, absA, absO; uniform vec2 luz;
out vec4 saida;
${COMUM}
vec4 disco(sampler2D s, vec2 uv, float r){
  if (r < 0.6) return texture(s, uv);
  vec2 tam = vec2(textureSize(s, 0));
  float lod = log2(max(1.0, r * tam.x / res.x / 2.5));
  vec4 a = vec4(0.0);
  for (int i = 0; i < 16; i++) {
    float k = (float(i) + 0.5) / 16.0, ang = float(i) * 2.39996;
    a += textureLod(s, uv + vec2(cos(ang), sin(ang)) * sqrt(k) * r / res, lod);
  }
  return a / 16.0;
}
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  vec2 w = cam.xy + (vec2(uv.x, 1.0 - uv.y) - 0.5) * vec2(1920.0, 1080.0) / cam.z;
  // cáustica: a água desvia um pouco a luz e acende uma rede fraca no papel
  float c1 = vn(w / 60.0 + vec2(t * 0.45, -t * 0.3)), c2 = vn(w / 60.0 + vec2(3.1 - t * 0.38, 1.7 + t * 0.33));
  vec2 desvio = (vec2(c1, c2) - 0.5) * 3.2 * esc / res;
  vec3 cob = disco(tinta, uv + desvio, raioT * esc).rgb;
  vec3 d = -log(max(1.0 - cob, vec3(0.002)));
  // papel quente iluminado por trás: claro no meio, mais escuro e quente nas bordas
  vec2 dl = (uv - vec2(luz.x, 1.0 - luz.y)) * vec2(1.6, 1.0);
  float l = exp(-dot(dl, dl) * 1.25);
  vec3 papel = mix(papelBorda, papelClaro, l);
  papel *= 0.985 + 0.03 * fbm(w / 9.0) ;                       // fibra do papel
  float rede = pow(1.0 - abs(c1 - c2), 10.0);
  papel *= 1.0 + 0.018 * rede;
  vec3 col = papel * exp(-(d.x * absP + d.y * absA + d.z * absO));  // mistura de pigmento
  // o ouro brilha: pontinhos que acendem e apagam
  float br = step(0.988, h21(floor(gl_FragCoord.xy / max(1.0, 2.0 * esc)) + quadro * 7.0)) * smoothstep(0.35, 1.2, d.z);
  col += br * vec3(1.0, 0.86, 0.5) * 0.55;
  // bando (partículas e figura), com o seu próprio foco
  vec4 b = disco(bando, uv, raioB * esc);
  col = col * (1.0 - b.a) + b.rgb;
  // vinheta quente e grão fino
  vec2 v = uv - 0.5;
  col *= mix(vec3(1.0), vec3(0.86, 0.79, 0.68), smoothstep(0.3, 0.9, length(v * vec2(1.25, 1.0))));
  float gr = h21(gl_FragCoord.xy + vec2(quadro * 37.0, quadro * 17.0)) - 0.5;
  col += gr * 0.045;
  saida = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function programa(gl, frag) {
    const p = gl.createProgram();
    for (const [tipo, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, frag]]) {
      const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programa: ' + gl.getProgramInfoLog(p));
    const loc = {};
    const u = (nome) => (nome in loc ? loc[nome] : (loc[nome] = gl.getUniformLocation(p, nome)));
    return { p, u };
  }
  function textura(gl, l, a) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, l, a, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  const absorve = (hex) => rgb(hex).map((v) => -Math.log(Math.max(v / 255, 0.02)));
  const COR = { preta: 0, azul: 1, ouro: 2 };

  // caminho liso (Catmull-Rom) medido pelo comprimento: u de 0 a 1 anda com velocidade constante
  function caminho(pts) {
    const P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < 40; k++) {
        const s = k / 40, s2 = s * s, s3 = s2 * s;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
        P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    P.push(pts[pts.length - 1]);
    const L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = L[L.length - 1];
    return function (u) { // -> [x, y, nx, ny] (ponto e normal)
      const alvo = limita(u) * tot;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < alvo) lo = m; else hi = m; }
      const k = (alvo - L[lo]) / Math.max(1e-6, L[hi] - L[lo]);
      const x = mistura(P[lo][0], P[hi][0], k), y = mistura(P[lo][1], P[hi][1], k);
      const dx = P[hi][0] - P[lo][0], dy = P[hi][1] - P[lo][1], dn = Math.hypot(dx, dy) || 1;
      return [x, y, -dy / dn, dx / dn];
    };
  }

  // ponto dentro do polígono?
  function dentro(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  Filme.criar({
    largura: 1920, altura: 1080, fps: 30, duracao: 9.6,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const gl = tela.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('este navegador não tem WebGL2');
      const pecas = (tipo) => (H.pecas || []).filter((p) => p.tipo === tipo);
      const peca = (tipo) => { const p = pecas(tipo)[0]; if (!p) throw new Error('falta a peça "' + tipo + '" na história'); return p; };
      const plumas = pecas('pluma'), manchas = pecas('mancha'), B = peca('bando'), F = peca('figura'), TIT = pecas('titulo')[0];
      const u = largura / 1920;
      const tb = F.explode;

      // ---------------- câmera (pontos da história, curva suave entre eles) ----------------
      const CAM = H.camera;
      function camera(t) {
        if (t <= CAM[0].t) return CAM[0];
        for (let i = 0; i < CAM.length - 1; i++) {
          const a = CAM[i], b = CAM[i + 1];
          if (t <= b.t) {
            const k = suave(trecho(t, a.t, b.t)), r = {};
            for (const c of ['x', 'y', 'zoom', 'tinta', 'bando']) r[c] = mistura(a[c] ?? 0, b[c] ?? 0, k);
            return r;
          }
        }
        return CAM[CAM.length - 1];
      }

      // ---------------- plumas: onde está a cabeça em t ----------------
      function cabeca(p, t) {
        const idade = t - p.de, k = 1 - Math.exp(-Math.max(0, idade) / p.tau), dist = p.desce * k;
        const ang = p.angulo || 0;
        return { x: p.x - Math.sin(ang) * dist, y: p.y + Math.cos(ang) * dist, raio: p.raio * (0.65 + 0.35 * k), idade, dist };
      }

      // ---------------- figura: pose de cada parte em t ----------------
      const partes = F.partes;
      function poses(t) {
        const tf = Math.max(0, t - F.forma[0]);
        const sobe = F.sobe || [0, 0];
        const bate = 2 * Math.PI * (F.bate || 1) * tf;
        const fx = F.x + sobe[0] * tf + 0, fy = F.y + sobe[1] * tf + 6 * Math.sin(bate + Math.PI);
        const e = F.escala || 1, g = F.giro || 0, cg = Math.cos(g) * e, sg = Math.sin(g) * e;
        return partes.map((p) => {
          // matriz [a b c d e f]: x' = a x + c y + e ; y' = b x + d y + f
          let m = [1, 0, 0, 1, 0, 0];
          if (p.pivo) {
            const ang = (p.base || 0) + (p.gira || 0) * Math.sin(bate + (p.fase || 0));
            const ca = Math.cos(ang), sa = Math.sin(ang), [px, py] = p.pivo;
            m = [ca, sa, -sa, ca, px - ca * px + sa * py, py - sa * px - ca * py];
          }
          // figura: gira, escala e leva para o lugar
          return [cg * m[0] - sg * m[1], sg * m[0] + cg * m[1], cg * m[2] - sg * m[3], sg * m[2] + cg * m[3],
            cg * m[4] - sg * m[5] + fx, sg * m[4] + cg * m[5] + fy];
        });
      }
      const aplica = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

      // ---------------- floradas (a figura explode em tinta nova) ----------------
      const poseTb = poses(tb);
      // cada florada nasce num ponto da figura (dx, dy), no lugar onde a figura está na explosão
      const floradas = (F.floradas || []).map((f, i) => {
        const e = F.escala || 1, sb = F.sobe || [0, 0], tf = tb - F.forma[0];
        return { x: F.x + sb[0] * tf + f.dx * e, y: F.y + sb[1] * tf + f.dy * e, de: tb, desce: f.desce, tau: 0.9, raio: f.raio,
          angulo: f.angulo, giro: f.giro, haste: 0, cor: f.cor, semente: 40 + i, florada: true };
      });

      // ---------------- bando: cada partícula sorteada uma vez ----------------
      const N = B.quantos, R = sorteio((H.semente || 1) * 1000 + (B.semente || 1));
      const cam_ = caminho(B.caminho);
      const nasce = (B.nasce || [0]).map((i) => plumas[i]);
      const cores = B.cores, cc = [cores.preta || 0, cores.azul || 0, cores.ouro || 0], somaC = cc[0] + cc[1] + cc[2];
      const P = {
        cor: new Uint8Array(N), lag: new Float32Array(N), lado: new Float32Array(N), z: new Float32Array(N),
        apar: new Float32Array(N), pl: new Uint8Array(N), ang: new Float32Array(N), rho: new Float32Array(N),
        parte: new Int16Array(N), lx: new Float32Array(N), ly: new Float32Array(N),
        dx: new Float32Array(N), dy: new Float32Array(N), vel: new Float32Array(N), sem: new Float32Array(N), ritmo: new Float32Array(N),
      };
      // partes da figura: sorteia pontos dentro de cada uma, na proporção do "peso"
      const pesos = partes.map((p) => p.peso || 0.05), somaP = pesos.reduce((a, b) => a + b, 0);
      function pontoNaParte(p) {
        if (p.forma === 'elipse') {
          const a = R() * 2 * Math.PI, r = Math.sqrt(R());
          const x = Math.cos(a) * r * p.rx, y = Math.sin(a) * r * p.ry, g = p.giro || 0;
          return [p.x + x * Math.cos(g) - y * Math.sin(g), p.y + x * Math.sin(g) + y * Math.cos(g)];
        }
        if (p.forma === 'linha') {
          const pts = p.pontos, seg = Math.floor(R() * (pts.length - 1)), k = R();
          const [ax, ay] = pts[seg], [bx, by] = pts[seg + 1], dn = Math.hypot(bx - ax, by - ay) || 1;
          const off = (R() - 0.5) * p.grossura;
          return [mistura(ax, bx, k) - (by - ay) / dn * off, mistura(ay, by, k) + (bx - ax) / dn * off];
        }
        const xs = p.pontos.map((q) => q[0]), ys = p.pontos.map((q) => q[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        for (let k = 0; k < 200; k++) { const x = mistura(x0, x1, R()), y = mistura(y0, y1, R()); if (dentro(p.pontos, x, y)) return [x, y]; }
        return p.pontos[0];
      }
      for (let i = 0; i < N; i++) {
        let r = R() * somaC; P.cor[i] = r < cc[0] ? 0 : (r < cc[0] + cc[1] ? 1 : 2);
        P.lag[i] = R() * (B.cauda || 0.4);
        const gz = (R() + R() + R() - 1.5) / 1.5; P.lado[i] = gz;
        P.z[i] = R();
        P.apar[i] = mistura(B.aparece[0], B.aparece[1], R());
        P.pl[i] = Math.floor(R() * nasce.length);
        P.ang[i] = R() * 2 * Math.PI; P.rho[i] = Math.sqrt(R()) * 1.1;
        P.sem[i] = R() * 1000; P.ritmo[i] = 0.9 + 0.25 * R();
        if (R() < (B.soltos || 0)) {
          P.parte[i] = -1; const a = R() * 2 * Math.PI, d = 180 + 420 * Math.sqrt(R());
          P.lx[i] = Math.cos(a) * d * 1.3; P.ly[i] = Math.sin(a) * d * 0.7 - 60;
        } else {
          let s = R() * somaP, k = 0; while (k < partes.length - 1 && s > pesos[k]) { s -= pesos[k]; k++; }
          P.parte[i] = k; const [x, y] = pontoNaParte(partes[k]); P.lx[i] = x; P.ly[i] = y;
          // a cor da partícula segue a parte da figura, quase sempre
          if (R() < 0.5) P.cor[i] = COR[partes[k].cor] ?? P.cor[i];
        }
        const a = R() * 2 * Math.PI; P.dx[i] = Math.cos(a); P.dy[i] = Math.sin(a); P.vel[i] = 120 + 520 * R();
      }

      // posição de uma partícula em t. pose = poses(t). Devolve [x, y, alfa] ou null.
      const sv = (t) => trecho(t, B.voa[0], B.voa[1]);
      const L1 = 1 + (B.cauda || 0.4);
      function alvo(i, pose, t) {
        if (P.parte[i] < 0) {
          // solto: paira em volta da figura, girando devagar
          const s = P.sem[i];
          return [F.x + P.lx[i] + 40 * ruido(t * 0.35 + s, 3), F.y + P.ly[i] + 30 * ruido(t * 0.3 + s, 4)];
        }
        const [x, y] = aplica(pose[P.parte[i]], P.lx[i], P.ly[i]);
        return [x + 1.5 * ruido(t * 3 + P.sem[i], 5), y + 1.5 * ruido(t * 3 + P.sem[i], 6)];
      }
      function posicao(i, t, pose) {
        if (t < P.apar[i]) return null;
        let alfa = trecho(t, P.apar[i], P.apar[i] + 0.4);
        const s = P.sem[i];
        // 1) dentro da tinta: pontinho que anda com a cabeça da pluma
        const pl = nasce[P.pl[i]], c = cabeca(pl, Math.min(t, B.voa[1]));
        const a0 = P.ang[i] + 0.5 * (t - P.apar[i]);
        const nx = c.x + Math.cos(a0) * P.rho[i] * c.raio * 1.1, ny = c.y + Math.sin(a0) * P.rho[i] * c.raio * 0.9;
        // 2) no caminho do bando
        const ui = limita(sv(t) * L1 * P.ritmo[i] - P.lag[i]);
        if (ui <= 0) return [nx, ny, alfa];
        const [px, py, qx, qy] = cam_(ui);
        const banda = (B.largura || 150) * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, ui * 1.15))) * (0.75 + 0.5 * ruido(ui * 4 - t * 0.9, 12)); // o bando incha e afina
        const onda = 0.55 * Math.sin(ui * 18 - t * 5 + P.lado[i] * 2) + 0.45 * ruido(ui * 7 + t * 1.3, 9);
        const lado = P.lado[i] * banda + onda * banda * 0.35;
        const tremX = 14 * ruido(t * 2.2 + s, 7), tremY = 14 * ruido(t * 2.2 + s, 8);
        let x = px + qx * lado + tremX, y = py + qy * lado + tremY;
        const w0 = suave(trecho(ui, 0, 0.2));
        x = mistura(nx, x, w0); y = mistura(ny, y, w0);
        // 3) chegando: vai para o seu lugar na figura
        const tAlvo = Math.min(t, tb);
        const w1 = suave(trecho(ui, 0.72, 1));
        if (w1 > 0) {
          const [gx, gy] = alvo(i, t < tb ? pose : poseTb, tAlvo);
          x = mistura(x, gx, w1); y = mistura(y, gy, w1);
        }
        // 4) explosão: sai voando e vira poeira de tinta
        const kb = t - tb;
        if (kb > 0) {
          const d = P.vel[i] * (1 - Math.exp(-2.4 * kb)) / 2.4;
          x += P.dx[i] * d + 26 * kb * ruido(t * 0.7 + s, 10);
          y += P.dy[i] * d + 26 * kb * ruido(t * 0.7 + s, 11) + 10 * kb;
          alfa *= mistura(1, 0.3, trecho(kb, 0, 1.4));
        }
        return [x, y, alfa];
      }

      // ---------------- telas e programas ----------------
      const rt = H.resolucaoTinta || 0.5;
      const tl = Math.max(32, Math.round(largura * rt)), ta = Math.max(18, Math.round(altura * rt));
      const texTinta = textura(gl, tl, ta);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texTinta, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const texBando = textura(gl, largura, altura);
      const PT = programa(gl, TINTA), PF = programa(gl, FINAL);
      gl.bindVertexArray(gl.createVertexArray());
      const camada = document.createElement('canvas'); camada.width = largura; camada.height = altura;
      const c = camada.getContext('2d');

      const TT = H.tintas, PP = H.papel;
      const corTinta = [TT.preta, TT.azul, TT.ouro];
      const todas = plumas.concat(floradas);

      // ---------------- quadro ----------------
      function desenhar(t) {
        const cm = camera(t);
        const quadro = Math.round(t * fps);

        // 1) tinta (plumas, floradas, manchas) -> textura reduzida
        const pa = new Float32Array(MAX * 4), pb = new Float32Array(MAX * 4), pc = new Float32Array(MAX * 4);
        let n = 0;
        for (const p of todas) {
          if (n >= MAX) break;
          const h = cabeca(p, t);
          if (h.idade <= 0) continue;
          let forca = trecho(h.idade, 0, p.florada ? 0.25 : 0.4);
          if (p.florada) forca *= mistura(1.6, 0.95, trecho(h.idade, 0.3, 1.8));
          pa.set([h.x, h.y, h.raio * (p.florada ? (0.5 + 0.8 * (1 - Math.exp(-h.idade / 0.6))) : 1), h.idade], n * 4);
          pb.set([p.angulo || 0, COR[p.cor] ?? 0, (h.dist + (p.haste || 0)) / h.raio, (p.giro || 1.3) * (p.florada ? 1 : 1)], n * 4);
          pc.set([forca, 0, p.semente || n, 0], n * 4);
          n++;
        }
        for (const m of manchas) {
          if (n >= MAX) break;
          const k = suave(trecho(t, m.de, m.ate));
          if (k <= 0) continue;
          pa.set([m.x + 14 * (t - m.de), m.y + 8 * (t - m.de), m.raio * (0.7 + 0.3 * k), t - m.de], n * 4);
          pb.set([0, COR[m.cor] ?? 0, 0, 0], n * 4);
          pc.set([k * (m.forca || 0.3), 1, m.semente || n, 0], n * 4);
          n++;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, tl, ta);
        gl.useProgram(PT.p);
        gl.uniform2f(PT.u('res'), tl, ta); gl.uniform3f(PT.u('cam'), cm.x, cm.y, cm.zoom); gl.uniform1f(PT.u('t'), t);
        gl.uniform1i(PT.u('n'), n);
        gl.uniform4fv(PT.u('pa'), pa); gl.uniform4fv(PT.u('pb'), pb); gl.uniform4fv(PT.u('pc'), pc);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, texTinta); gl.generateMipmap(gl.TEXTURE_2D);

        // 2) bando + figura + título -> camada 2D
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, largura, altura);
        const z = cm.zoom * u;
        c.setTransform(z, 0, 0, z, largura / 2 - cm.x * z, altura / 2 - cm.y * z);
        const pose = poses(Math.min(t, tb)), pose0 = poses(Math.min(t - 0.022, tb));
        // figura cheia (tinta sólida), aparece enquanto o bando chega e some na explosão
        const fp = suave(trecho(t, F.forma[0], F.forma[1])) * (1 - suave(trecho(t, tb, tb + 0.3)));
        if (fp > 0) {
          partes.forEach((p, k) => {
            const m = pose[k];
            c.save(); c.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
            const [r0, g0, b0] = rgb(corTinta[COR[p.cor] ?? 0]);
            c.fillStyle = c.strokeStyle = `rgba(${r0},${g0},${b0},${(0.72 * fp).toFixed(3)})`;
            c.lineCap = 'round'; c.lineJoin = 'round';
            c.beginPath();
            if (p.forma === 'elipse') { c.ellipse(p.x, p.y, p.rx, p.ry, p.giro || 0, 0, 2 * Math.PI); c.fill(); }
            else if (p.forma === 'linha') { p.pontos.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.lineWidth = p.grossura * 0.8; c.stroke(); }
            else { p.pontos.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
            c.restore();
          });
        }
        // partículas: risquinho de onde estava (t - 0,04 s) até onde está (borrão de movimento)
        const baldes = [];
        for (let k = 0; k < 18; k++) baldes.push([]);
        const bokeh = [];
        const voando = t > B.voa[0] && t < B.voa[1] + 0.3;
        for (let i = 0; i < N; i++) {
          const a = posicao(i, t, pose);
          if (!a || a[2] <= 0.02) continue;
          const b = posicao(i, t - 0.022, pose0) || a;
          if (voando && P.z[i] > 1 - (B.bokeh || 0)) { bokeh.push([a[0], a[1], P.cor[i], P.z[i]]); continue; }
          const nivel = a[2] > 0.66 ? 2 : (a[2] > 0.33 ? 1 : 0), grosso = P.z[i] > 0.6 ? 1 : 0;
          baldes[(P.cor[i] * 3 + nivel) * 2 + grosso].push(b[0], b[1], a[0], a[1]);
        }
        c.lineCap = 'round';
        for (let k = 0; k < 18; k++) {
          const L = baldes[k]; if (!L.length) continue;
          const grosso = k % 2, nivel = Math.floor(k / 2) % 3, cor = Math.floor(k / 6);
          const [r0, g0, b0] = rgb(corTinta[cor]);
          c.strokeStyle = `rgba(${r0},${g0},${b0},${[0.25, 0.5, 0.78][nivel]})`;
          c.lineWidth = grosso ? 2.2 : 1.3;
          c.beginPath();
          for (let j = 0; j < L.length; j += 4) { c.moveTo(L[j], L[j + 1]); c.lineTo(L[j + 2] + 0.01, L[j + 3]); }
          c.stroke();
        }
        // partículas perto da lente: discos macios fora de foco
        for (const [x, y, cor, zz] of bokeh) {
          const r = 10 + 28 * (zz - (1 - (B.bokeh || 0.01))) / (B.bokeh || 0.01);
          const [r0, g0, b0] = rgb(corTinta[cor]);
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${r0},${g0},${b0},0.16)`); g.addColorStop(0.7, `rgba(${r0},${g0},${b0},0.12)`); g.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
          c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
        }
        // título: escrito à mão em traços (não depende de fonte)
        if (TIT && H.titulo && t >= TIT.de && t < TIT.ate) {
          c.setTransform(u, 0, 0, u, 0, 0);
          const al = trecho(t, TIT.de, TIT.de + 0.2) * (1 - trecho(t, TIT.ate - 0.5, TIT.ate));
          const [r0, g0, b0] = rgb(TIT.cor || '#1f2a55');
          Letras.texto(c, H.titulo, TIT.x, TIT.y, TIT.tamanho || 46, {
            cor: `rgba(${r0},${g0},${b0},${(0.85 * al).toFixed(3)})`, alinha: 'esquerda',
            prog: trecho(t, TIT.escreve[0], TIT.escreve[1]), sem: 3, boil: Math.floor(t * 10), larg: (TIT.tamanho || 46) * 0.07,
          });
        }
        gl.bindTexture(gl.TEXTURE_2D, texBando);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, camada);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);

        // 3) passe final na tela
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, largura, altura);
        gl.useProgram(PF.p);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texTinta); gl.uniform1i(PF.u('tinta'), 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texBando); gl.uniform1i(PF.u('bando'), 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(PF.u('res'), largura, altura); gl.uniform3f(PF.u('cam'), cm.x, cm.y, cm.zoom);
        gl.uniform1f(PF.u('t'), t); gl.uniform1f(PF.u('quadro'), quadro);
        gl.uniform1f(PF.u('raioT'), cm.tinta || 0); gl.uniform1f(PF.u('raioB'), cm.bando || 0); gl.uniform1f(PF.u('esc'), u);
        const pr = (h) => rgb(h).map((v) => v / 255);
        gl.uniform3fv(PF.u('papelClaro'), pr(PP.claro)); gl.uniform3fv(PF.u('papelBorda'), pr(PP.borda));
        gl.uniform2fv(PF.u('luz'), PP.luz || [0.5, 0.45]);
        gl.uniform3fv(PF.u('absP'), absorve(TT.preta)); gl.uniform3fv(PF.u('absA'), absorve(TT.azul)); gl.uniform3fv(PF.u('absO'), absorve(TT.ouro));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // ---------------- som: nas mesmas marcas de tempo da imagem ----------------
      function som() {
        const M = H.musica || {}, S = Som.criar(duracao, (H.semente || 1) + 3);
        (M.zumbido || []).forEach((nt, i) => S.nota(nt, 0, duracao, { vol: 0.07 - i * 0.02, ataque: 1.5, solta: 1, forma: i ? 'seno' : 'tri', vibrato: 0.002, vibratoHz: 0.3 }));
        S.vento(0, duracao, { vol: 0.03, corte: 380, onda: 0.18 });                       // a água
        (M.dedilhado || []).forEach(([nt, t0], i) => S.corda(nt, t0, 2.2, { vol: 0.2, pan: (i % 2 ? 0.35 : -0.35), maciez: 0.3 }));
        (M.gotas || []).forEach((t0, i) => {                                                // gota debaixo d'água
          S.pio(t0, { freq: 520 + 90 * (i % 3), sobe: 1.4, dur: 0.06, repete: 1, vol: 0.12, pan: (i % 2 ? 0.4 : -0.3) });
          S.batida(t0, { freq: 240, dur: 0.12, vol: 0.12 });
        });
        S.vento(B.voa[0] - 0.2, B.voa[1] - B.voa[0] + 0.6, { vol: 0.12, corte: 1700, onda: 0.9, entra: 0.6, sai: 0.7 }); // o bando passa
        (M.sino || []).forEach(([nt, dt]) => S.sino(nt, F.forma[1] + dt - 0.1, 3.0, { vol: 0.16 }));
        const fb = F.bate || 1;                                                              // batidas de asa
        for (let k = 0; ; k++) {
          const t0 = F.forma[1] + (k + 0.25) / fb; if (t0 >= tb) break;
          S.vento(t0, 0.32, { vol: 0.1, corte: 700, entra: 0.08, sai: 0.2 });
          S.batida(t0, { freq: 70, dur: 0.2, vol: 0.12 });
        }
        S.vento(tb - 0.05, duracao - tb + 0.05, { vol: 0.1, corte: 1000, onda: 0.3, entra: 0.15, sai: 1.2 }); // dissolve
        S.batida(tb, { freq: 90, dur: 0.4, vol: 0.2 });
        S.sala(0.4);
        return S.fim({ entra: 0.3, sai: 1.0 });
      }

      return { desenhar, som };
    },
  });
})();
