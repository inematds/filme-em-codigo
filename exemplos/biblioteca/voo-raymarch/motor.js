// MOTOR "voo-raymarch" — voo de ficção científica desenhado por UM shader só.
// Jeito de animar: não há modelo 3D nenhum. Para cada pixel, o shader solta um raio da câmera e
// "tateia" o mundo (cânion, arco de pedra, mesas do deserto, nave) por uma conta de distância
// (SDF, raymarching). Depois o quadro passa por um "laboratório de cinema": brilho (bloom),
// riscos horizontais de lente anamórfica, raios de sol, desfoque de profundidade, borrão de
// velocidade, aberração de cor, grão e as faixas pretas de cinema (2,39:1).
// WebGL2 puro, sem biblioteca. Roda sem placa de vídeo (no render, o WebGL é feito pela CPU).
// Tudo o que muda de um filme para outro está em historia.json. Este arquivo não muda.
(function () {
  'use strict';
  const { limita, mistura, trecho, suave, vaiVolta, ruido } = Filme;

  // Qualidade do raymarch (custo por quadro). Medido sem GPU: ver medida.json.
  const ESCALA = 0.5;   // o mundo é calculado na metade da resolução e ampliado
  const PASSOS = 80;    // passos de cada raio
  const LONGE = 420;    // até onde o raio vai (metros)

  // ---------------- shaders ----------------
  const VERT = `#version 300 es
  void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

  // 1) o mundo inteiro numa conta só
  const CENA = `#version 300 es
  precision highp float;
  out vec4 saida;
  uniform vec2 uRes; uniform float uT, uSemente;
  uniform vec3 uCam, uF, uR, uU; uniform float uFov;
  uniform vec3 uNave, uNF, uNR, uNU; uniform float uMotor;
  uniform vec4 uCurva; uniform vec2 uCan, uArco, uSaida; uniform float uArcoZ;
  uniform vec3 uSol, uPla, uAnelN; uniform float uPlaR, uEstrelas;
  uniform vec3 cCeuAlto, cCeuHor, cSol, cRochaA, cRochaB, cVeio, cAgua, cAreia, cPlaA, cPlaB, cAnel, cMotor, cSombra;
  #define PASSOS ${PASSOS}
  #define LONGE ${LONGE}.0

  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21) + uSemente * 0.1371); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm2(vec2 p){ return 0.65 * vn(p) + 0.35 * vn(p * 2.13 + 7.1); }
  float cx(float z){ return uCurva.x * sin(z * uCurva.y) + uCurva.z * sin(z * uCurva.w + 1.3); }
  float abre(float z){ return smoothstep(uSaida.x, uSaida.y, z); }
  float topo(float z, float a, float n){ return uCan.y * (1.0 - 0.8 * a) + 2.0 * n; }

  float sdCanion(vec3 p, float a, float c){
    float x = abs(p.x - c);
    float n = fbm2(vec2(p.z * 0.09, p.y * 0.22));
    float w = uCan.x + 0.16 * max(p.y, 0.0) + 1.6 * n + 0.45 * fract(p.y * 0.8 + n * 0.3) + a * a * 170.0;   // degraus das camadas de rocha
    return max(w - x, p.y - topo(p.z, a, n)) * 0.8;
  }
  float sdMesas(vec3 p, float a){
    if (a < 0.01) return 1e5;
    if (p.y > 10.5) return p.y - 10.0;                         // acima de todas as mesas
    vec2 cel = floor(p.xz / 24.0), lo = p.xz - (cel + 0.5) * 24.0;
    vec2 borda = 12.0 - abs(lo);
    float limite = max(min(borda.x, borda.y), 0.0) + 0.6;      // nunca pula para dentro da mesa vizinha
    float h = h21(cel), h2 = h21(cel + 17.3);
    vec2 cen = (vec2(h, h2) - 0.5) * 10.0;
    float xc = (cel.x + 0.5) * 24.0 + cen.x, zc = (cel.y + 0.5) * 24.0 + cen.y;
    if (abs(xc - cx(zc)) < 16.0 || h21(cel + 3.1) < 0.2) return limite;
    float r = 3.2 + 3.0 * h - 0.1 * max(p.y, 0.0) + 0.3 * fract(p.y * 0.7);
    float alt = (3.0 + 7.0 * h2) * abre(zc);
    return min(max(length(lo - cen) - r, p.y - alt) * 0.8, limite);
  }
  float sdArco(vec3 p){
    vec3 q = p - vec3(cx(uArcoZ), 0.0, uArcoZ);
    if (abs(q.z) > 10.0) return abs(q.z) - 6.0;
    float n = vn(q.xy * 0.6 + 3.0);
    vec2 tt = vec2(length(q.xy * vec2(1.0, 0.9)) - uArco.x, q.z * 0.8);
    return (length(tt) - uArco.y - 0.7 * n) * 0.8;
  }
  float sdElip(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
  float sdCaixa(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
  float sdCaps(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
  vec3 local(vec3 p){ vec3 d = p - uNave; return vec3(dot(d, uNR), dot(d, uNU), dot(d, uNF)); }
  float sdNaveL(vec3 q){
    float corpo = sdElip(q, vec3(0.30, 0.19, 1.2));
    float cabine = sdElip(q - vec3(0.0, 0.13, 0.25), vec3(0.15, 0.11, 0.38));
    vec3 w = q; w.z += abs(w.x) * 0.55;
    float asa = sdCaixa(w - vec3(0.0, -0.03, -0.3), vec3(1.15, 0.03, 0.3));
    vec3 e = vec3(abs(q.x), q.yz);
    float motor = sdCaps(e, vec3(0.48, 0.0, -0.95), vec3(0.48, 0.0, 0.1), 0.11);
    float leme = sdCaixa(q - vec3(0.0, 0.25, -0.75), vec3(0.02, 0.2, 0.22));
    return min(min(min(corpo, cabine), min(asa, motor)), leme);
  }
  #define TAM 0.7
  float sdNave(vec3 p){ float b = length(p - uNave); if (b > 2.8 * TAM) return b - 2.0 * TAM; return sdNaveL(local(p) / TAM) * TAM; }

  float mapa(vec3 p){
    float a = abre(p.z);
    float d = p.y;                              // chão (água no cânion, areia no deserto)
    d = min(d, sdCanion(p, a, cx(p.z)));
    d = min(d, sdMesas(p, a));
    d = min(d, sdArco(p));
    return min(d, sdNave(p));
  }
  vec3 normal(vec3 p, float e){
    vec2 k = vec2(1, -1);
    return normalize(k.xyy * mapa(p + k.xyy * e) + k.yyx * mapa(p + k.yyx * e) + k.yxy * mapa(p + k.yxy * e) + k.xxx * mapa(p + k.xxx * e));
  }

  vec3 ceu(vec3 rd){
    float h = rd.y;
    vec3 c = mix(cCeuHor, cCeuAlto, pow(smoothstep(-0.03, 0.6, h), 0.55));
    float s = max(dot(rd, uSol), 0.0);
    c += cSol * (0.45 * pow(s, 5.0) + 0.9 * pow(s, 70.0)) + cSol * 9.0 * smoothstep(0.9990, 0.9996, s);
    // estrelas: só no céu alto e longe do sol
    vec2 sp = vec2(atan(rd.x, rd.z), h) * 240.0, ci = floor(sp);
    c += vec3(0.8, 0.9, 1.0) * step(0.992, h21(ci + 91.0)) * (1.0 - smoothstep(0.1, 0.45, length(fract(sp) - 0.5))) * uEstrelas * smoothstep(0.05, 0.35, h) * (1.0 - pow(s, 3.0)) * 1.5;
    // planeta com anéis (longe demais para a câmera andar: só a direção conta)
    vec3 C = uPla * 1000.0; float R = uPlaR * 1000.0;
    float b = dot(rd, C), disc = b * b - dot(C, C) + R * R;
    float tP = 1e9;
    if (disc > 0.0) {
      tP = b - sqrt(disc);
      vec3 N = normalize(rd * tP - C);
      float lat = dot(N, uAnelN);
      float faixa = 0.5 + 0.5 * sin(lat * 26.0 + 2.0 * vn(vec2(lat * 9.0, 1.0)));
      vec3 pc = mix(cPlaB, cPlaA, faixa * 0.8 + 0.2 * vn(vec2(lat * 40.0, 3.0)));
      float luz = 0.12 + 1.1 * clamp(dot(N, uSol) * 0.7 + 0.35, 0.0, 1.0);
      c = mix(c, pc * luz * cSol * 1.4, 0.9 * smoothstep(0.0, 0.03, -dot(N, rd)));
    }
    float dn = dot(rd, uAnelN);
    if (abs(dn) > 1e-4) {
      float tR = dot(C, uAnelN) / dn;
      if (tR > 0.0 && tR < tP) {
        float r = length(rd * tR - C) / R;
        float anel = smoothstep(1.35, 1.42, r) * (1.0 - smoothstep(2.25, 2.35, r)) * (1.0 - 0.75 * (1.0 - smoothstep(0.0, 0.05, abs(r - 1.86))));
        anel *= 0.55 + 0.45 * sin(r * 55.0) * sin(r * 13.0 + 1.0);
        c = mix(c, cAnel * cSol * 1.5, clamp(anel, 0.0, 1.0) * 0.85);
      }
    }
    return c;
  }

  vec3 rocha(vec3 p, vec3 n, float a){
    float n1 = fbm2(vec2(p.z * 0.3 + p.x * 0.3, p.y * 1.2));
    float faixas = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(p.y * 2.4 + n1 * 2.0 + sin(p.z * 0.05) * 2.0)) * (0.6 + 0.4 * step(0.5, fract(p.y * 0.8 + n1 * 0.3)));
    vec3 base = mix(cRochaA, cRochaB, faixas * 0.8 + 0.2 * n1) * (0.7 + 0.55 * vn(p.xz * 0.8 + p.y));
    float dif = max(dot(n, uSol), 0.0);
    float sombra = mix(smoothstep(uCan.y * 0.55, uCan.y, p.y), 1.0, a);   // dentro do cânion o sol baixo não chega
    vec3 c = base * (cSol * dif * mix(0.25, 1.0, sombra) * 2.0 + cSombra * (0.75 + 0.35 * n.y) + cCeuHor * 0.12 * a);
    float v = vn(vec2((p.z + p.x) * 0.45, p.y * 0.7) + vec2(n1 * 0.8, 0.0));
    float linha = (1.0 - smoothstep(0.0, 0.012, abs(v - 0.5))) * smoothstep(0.35, 0.7, vn(vec2(p.z + p.x, p.y) * 0.12 + 9.0));
    float pe = exp(-abs(p.y - 0.35) * 6.0);
    c += cVeio * (linha * 1.6 + pe * 1.1) * (1.0 - a);
    return c;
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 ro = uCam, rd = normalize(uF + (uv.x * uR + uv.y * uU) * 2.0 * uFov);
    float t = 0.05; bool bateu = false;
    float mBocal = 1e3, mRastro = 1e3;
    for (int i = 0; i < PASSOS; i++) {
      vec3 p = ro + rd * t;
      float d = mapa(p);
      if (length(p - uNave) < 6.0) {                 // brilho dos motores: o quanto o raio passa perto
        vec3 q = local(p) / TAM; q.x = abs(q.x);
        mBocal = min(mBocal, length(q - vec3(0.48, 0.0, -1.0)));
        float ao = clamp((-1.0 - q.z) / 3.2, 0.0, 1.0);
        mRastro = min(mRastro, length(q - vec3(0.48, 0.0, -1.0 - 3.2 * ao)) + ao * 0.25);
      }
      if (d < 0.0012 * t) { bateu = true; break; }
      t += d;
      if (t > LONGE) break;
    }
    vec3 col;
    float a = 0.0;
    if (bateu) {
      vec3 p = ro + rd * t;
      a = abre(p.z);
      vec3 n = normal(p, 0.001 * t + 0.002);
      float dC = sdCanion(p, a, cx(p.z)), dM = sdMesas(p, a), dA = sdArco(p), dN = sdNave(p);
      float mn = min(min(dC, dM), min(dA, dN));
      if (p.y <= mn + 0.001) {                       // água / areia
        vec2 rip = vec2(vn(p.xz * vec2(0.6, 0.22) + vec2(0.0, uT * 1.5)), vn(p.xz * vec2(0.45, 0.2) + 5.0)) - 0.5;
        vec3 nn = normalize(vec3(rip.x * 0.3, 1.0, rip.y * 0.3));
        vec3 r = reflect(rd, nn);
        float fr = 0.05 + 0.95 * pow(1.0 - max(dot(-rd, nn), 0.0), 5.0);
        float perto = exp(-max(uCan.x - abs(p.x - cx(p.z)), 0.0) * 0.5);
        vec3 agua = cAgua + ceu(r) * fr * 0.85 + cVeio * perto * 0.4 * (1.0 - a) * (0.6 + rip.x);
        vec3 areia = cAreia * (0.55 + 0.35 * vn(p.xz * 0.25)) * (cSol * 1.2 + cSombra * 0.45);
        col = mix(agua, areia, smoothstep(0.15, 0.5, a));
      } else if (dN <= mn + 0.001) {                 // nave
        vec3 q = local(p) / TAM;
        vec3 metal = vec3(0.22, 0.25, 0.28);
        if (q.y > 0.08 && q.z > -0.1 && abs(q.x) < 0.17) metal = vec3(0.05, 0.08, 0.12);
        float dif = max(dot(n, uSol), 0.0), esp = pow(max(dot(reflect(rd, n), uSol), 0.0), 40.0);
        col = metal * (cSol * dif * 1.4 + cSombra * 0.6) + ceu(reflect(rd, n)) * 0.12 + cSol * esp * 1.2;
        col += cVeio * 0.35 * exp(-max(q.y, 0.0) * 5.0) * (1.0 - a);
      } else {
        col = rocha(p, n, a);
      }
      vec3 neblina = mix(cSombra * 0.55, cCeuHor * 0.95, a) + cSol * 0.5 * pow(max(dot(rd, uSol), 0.0), 8.0);
      col = mix(col, neblina, 1.0 - exp(-t * mix(0.009, 0.0035, a)));
    } else {
      col = ceu(rd);
      if (rd.y < 0.0) {                              // chão além do alcance do raio: só a cor, sumindo na névoa
        float a2 = abre(ro.z + rd.z * LONGE);
        vec3 longe = mix(cAgua, cAreia * (cSol * 1.2 + cSombra * 0.45) * 0.6, smoothstep(0.15, 0.5, a2));
        col = mix(longe, mix(cSombra * 0.55, cCeuHor * 0.95, a2), 0.85);
      }
      t = LONGE;
    }
    col += cMotor * uMotor * (exp(-mBocal * 16.0) * 3.0 + exp(-mRastro * 22.0) * 1.2);
    saida = vec4(col, t / LONGE);
  }`;

  // 2) separa o que brilha (e reduz o tamanho)
  const BRILHO = `#version 300 es
  precision highp float; out vec4 saida;
  uniform sampler2D uTex; uniform vec2 uRes; uniform float uLimiar;
  void main(){ vec2 uv = gl_FragCoord.xy / uRes, e = 0.5 / uRes;
    vec3 c = 0.25 * (texture(uTex, uv + vec2(e.x, e.y)).rgb + texture(uTex, uv + vec2(-e.x, e.y)).rgb + texture(uTex, uv + vec2(e.x, -e.y)).rgb + texture(uTex, uv - e).rgb);
    saida = vec4(max(c - uLimiar, 0.0), 1.0); }`;

  // 3) desfoque numa direção (bloom, riscos, desfoque de fundo)
  const BORRA = `#version 300 es
  precision highp float; out vec4 saida;
  uniform sampler2D uTex; uniform vec2 uRes, uPasso;
  void main(){ vec2 uv = gl_FragCoord.xy / uRes;
    float w[5] = float[](0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);
    vec3 c = texture(uTex, uv).rgb * w[0];
    for (int i = 1; i < 5; i++) { c += texture(uTex, uv + uPasso * float(i)).rgb * w[i]; c += texture(uTex, uv - uPasso * float(i)).rgb * w[i]; }
    saida = vec4(c, 1.0); }`;

  // 4) raios de sol: puxa o céu claro na direção do sol
  const RAIOS = `#version 300 es
  precision highp float; out vec4 saida;
  uniform sampler2D uTex; uniform vec2 uRes, uSolUV; uniform float uVisivel;
  void main(){ vec2 uv = gl_FragCoord.xy / uRes, d = (uv - uSolUV) / 28.0 * 0.95;
    vec3 acc = vec3(0.0); float peso = 1.0;
    for (int i = 0; i < 28; i++) { uv -= d; vec4 s = texture(uTex, uv); acc += max(s.rgb - 0.55, 0.0) * step(0.97, s.a) * peso; peso *= 0.955; }
    saida = vec4(acc / 28.0 * uVisivel, 1.0); }`;

  // 5) junta tudo na tela cheia: borrão de velocidade, aberração, profundidade, cor, grão, faixas
  const FINAL = `#version 300 es
  precision highp float; out vec4 saida;
  uniform sampler2D uCena, uBloom, uRisco, uRaios, uDesf, uTit; uniform float uTitA;
  uniform vec2 uRes; uniform float uFaixa, uBorrao, uCA, uGrao, uQuadro, uLuz, uFoco, kBrilho, kRisco, kRaios;
  uniform vec3 cSol;
  float h(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes;
    if (abs(uv.y - 0.5) > 0.5 * uFaixa) { saida = vec4(0.0, 0.0, 0.0, 1.0); return; }
    vec2 su = vec2(uv.x, (uv.y - 0.5) / uFaixa + 0.5), dir = su - 0.5;
    vec3 c = vec3(0.0);
    for (int i = 0; i < 5; i++) { vec2 s = su - dir * uBorrao * float(i) / 4.0;
      c += vec3(texture(uCena, s + dir * uCA).r, texture(uCena, s).g, texture(uCena, s - dir * uCA).b); }
    c /= 5.0;
    float prof = texture(uCena, su).a;
    c = mix(c, texture(uDesf, su).rgb, smoothstep(0.04, 0.4, abs(prof - uFoco)) * 0.6 * (1.0 - step(0.98, prof)));
    c += texture(uBloom, su).rgb * kBrilho + texture(uRisco, su).rgb * vec3(0.5, 0.75, 1.3) * kRisco + texture(uRaios, su).rgb * cSol * kRaios;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c *= mix(vec3(0.78, 1.0, 1.12), vec3(1.12, 0.98, 0.82), smoothstep(0.03, 0.8, l));   // sombra azul-petróleo, luz laranja
    c = pow(aces(c * 0.8), vec3(1.0 / 2.2));
    c *= 1.0 - 0.3 * pow(length(dir * vec2(1.0, 0.55)) * 1.45, 2.0);
    c += (h(gl_FragCoord.xy + uQuadro * 91.7) - 0.5) * uGrao;
    vec4 tt = texture(uTit, uv); c = mix(c, tt.rgb, tt.a * uTitA);   // título curto, só no começo
    saida = vec4(c * uLuz, 1.0);
  }`;

  // ---------------- ajudantes de WebGL ----------------
  function programa(gl, frag) {
    const sh = (tipo, fonte) => {
      const s = gl.createShader(tipo); gl.shaderSource(s, fonte); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader não compilou: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programa não ligou: ' + gl.getProgramInfoLog(p));
    const locais = {};
    return {
      usa(u = {}) {
        gl.useProgram(p);
        for (const [nome, v] of Object.entries(u)) {
          const loc = locais[nome] !== undefined ? locais[nome] : (locais[nome] = gl.getUniformLocation(p, nome));
          if (loc === null) continue;
          if (typeof v === 'number') gl.uniform1f(loc, v);
          else if (v.textura !== undefined) { gl.activeTexture(gl.TEXTURE0 + v.unidade); gl.bindTexture(gl.TEXTURE_2D, v.textura); gl.uniform1i(loc, v.unidade); }
          else if (v.length === 2) gl.uniform2fv(loc, v);
          else if (v.length === 3) gl.uniform3fv(loc, v);
          else gl.uniform4fv(loc, v);
        }
      },
    };
  }
  function alvo(gl, l, a, flutua) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, flutua ? gl.RGBA16F : gl.RGBA8, l, a, 0, gl.RGBA, flutua ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('não consegui criar a tela de trabalho ' + l + 'x' + a);
    return { tex, fb, l, a };
  }
  const linear = (hex) => Filme.rgb(hex).map((v) => Math.pow(v / 255, 2.2));
  const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soma = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  // base de câmera (frente, direita, cima) com giro em volta da frente
  function base(frente, giro) {
    const F = norm(frente), R0 = norm(cruz([0, 1, 0], F)), U0 = cruz(F, R0);
    const c = Math.cos(giro), s = Math.sin(giro);
    return { F, R: soma(R0.map((v) => v * c), U0, s), U: soma(U0.map((v) => v * c), R0, -s) };
  }

  Filme.criar({
    largura: 1920, altura: 1080, fps: 30, duracao: 8,
    montar({ historia: H, tela, largura, altura, duracao, fps }) {
      const gl = tela.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('este navegador não tem WebGL2');
      const flutua = !!gl.getExtension('EXT_color_buffer_float');
      // a história é uma lista de peças, cada uma com seu lugar e seu tempo
      const peca = (tipo) => { const p = (H.pecas || []).find((x) => x.tipo === tipo); if (!p) throw new Error('falta a peça "' + tipo + '" na história'); return p; };
      const pC = peca('canion'), pA = peca('arco'), pS = peca('saida'), pP = peca('planeta'), pSol = peca('sol'), pT = peca('titulo');
      const V = H.voo, FX = H.filme;
      const T = { arco: pA.t, saida: pS.t, acende: H.acende ?? 0.4, apaga: H.apaga ?? 0.5 };
      const K = { largura: pC.largura, altura: pC.altura, curva: pC.curva, arcoRaio: pA.raio, arcoGrossura: pA.grossura };
      const CEU = { sol: pSol.direcao, solSobe: pSol.sobe, planeta: pP.direcao, planetaTamanho: pP.tamanho, anelInclina: pP.anel, estrelas: pP.estrelas ?? 1 };
      const cv = K.curva;

      // tamanhos: o mundo só é calculado dentro da faixa de cinema (2,39:1)
      const faixa = Math.min(1, (largura / FX.faixa) / altura);
      const cl = Math.max(64, Math.round(largura * ESCALA)), ca = Math.max(32, Math.round(altura * faixa * ESCALA));
      const pl = Math.max(16, Math.round(cl / 4)), pa = Math.max(8, Math.round(ca / 4));
      const cena = alvo(gl, cl, ca, flutua);
      const [b1, b2, r1, r2, d1, d2, rr] = Array.from({ length: 7 }, () => alvo(gl, pl, pa, flutua));
      const P = { cena: programa(gl, CENA), brilho: programa(gl, BRILHO), borra: programa(gl, BORRA), raios: programa(gl, RAIOS), final: programa(gl, FINAL) };
      gl.bindVertexArray(gl.createVertexArray());
      const passa = (prog, destino, u) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destino ? destino.fb : null);
        gl.viewport(0, 0, destino ? destino.l : largura, destino ? destino.a : altura);
        prog.usa(u); gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const tx = (a, unidade = 0) => ({ textura: a.tex, unidade });
      // título: escrito uma vez num canvas 2D (fonte genérica, nada instalado), embaixo, sobre faixa escura
      const tit = { tex: gl.createTexture() };
      {
        const c2 = document.createElement('canvas'); c2.width = largura; c2.height = altura;
        const x = c2.getContext('2d'), u = largura / 1920, base = altura * (0.5 + faixa / 2) - 70 * u;
        const g = x.createLinearGradient(0, base - 150 * u, 0, base + 40 * u);
        g.addColorStop(0, 'rgba(2,8,14,0)'); g.addColorStop(1, 'rgba(2,8,14,0.55)'); x.fillStyle = g; x.fillRect(0, base - 150 * u, largura, 190 * u);
        x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 16 * u; x.textBaseline = 'alphabetic';
        x.font = `700 ${Math.round(84 * u)}px "DejaVu Sans", Arial, sans-serif`; x.fillStyle = '#f2fbff';
        if (x.letterSpacing !== undefined) x.letterSpacing = `${Math.round(6 * u)}px`;
        x.fillText(String(pT.texto || '').toUpperCase(), 120 * u, base);
        gl.bindTexture(gl.TEXTURE_2D, tit.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }

      // ---------------- o voo: tudo sai de t ----------------
      const cx = (z) => cv[0] * Math.sin(z * cv[1]) + cv[2] * Math.sin(z * cv[3] + 1.3);
      const dcx = (z) => cv[0] * cv[1] * Math.cos(z * cv[1]) + cv[2] * cv[3] * Math.cos(z * cv[3] + 1.3);
      const ddcx = (z) => -cv[0] * cv[1] * cv[1] * Math.sin(z * cv[1]) - cv[2] * cv[3] * cv[3] * Math.sin(z * cv[3] + 1.3);
      const zCam = (t) => V.velocidade * t + 0.5 * V.arranque * Math.pow(Math.max(0, t - T.saida), 2);
      const aFrente = (t) => V.naveAFrente + V.naveSeAfasta * suave(trecho(t, T.saida, duracao));
      const zArco = zCam(T.arco) + aFrente(T.arco);
      const zBoca = zCam(T.saida) + 2;
      const cores = {};
      for (const [k, v] of Object.entries(H.cores)) cores['c' + k[0].toUpperCase() + k.slice(1)] = linear(v);
      const fixos = {
        uSemente: H.semente, uCurva: cv, uCan: [K.largura, K.altura], uArco: [K.arcoRaio, K.arcoGrossura], uArcoZ: zArco,
        uSaida: [zBoca, zBoca + 50], uPla: norm(CEU.planeta), uPlaR: CEU.planetaTamanho, uAnelN: norm(CEU.anelInclina),
        uEstrelas: CEU.estrelas, cCeuAlto: cores.cCeuAlto, cCeuHor: cores.cCeuHorizonte, cSol: cores.cSol, cRochaA: cores.cRochaA,
        cRochaB: cores.cRochaB, cVeio: cores.cVeio, cAgua: cores.cAgua, cAreia: cores.cAreia, cPlaA: cores.cPlanetaA,
        cPlaB: cores.cPlanetaB, cAnel: cores.cAnel, cMotor: cores.cMotor, cSombra: cores.cSombra,
      };

      function voo(t) {
        const z = zCam(t), fora = suave(trecho(t, T.saida - 0.2, T.saida + 1.6));
        const cam = [cx(z), mistura(V.alturaCanion, V.alturaDeserto, fora) + 0.08 * ruido(t * 1.3, 4), z];
        // nave: na frente, inclina nas curvas e muito no arco
        const kA = trecho(t, T.arco - 0.8, T.arco + 0.6);
        const zs = z + aFrente(t);
        const nave = [cx(zs) - 0.9 * vaiVolta(kA), cam[1] - 0.9 - 1.2 * fora + 0.06 * ruido(t * 2.1, 8), zs];
        const giroNave = limita(-ddcx(zs) * 140, -0.6, 0.6) + V.inclinaArco * Math.sin(Math.PI * suave(kA)) + 0.06 * ruido(t * 3, 2);
        const bn = base([dcx(zs), 0, 1], giroNave);
        // câmera olha a nave e, na saída, levanta o olhar para o planeta
        const alvoNave = soma(soma(nave, bn.F, 10), [0, 0.6, 0]);
        const olharN = norm(soma(alvoNave, cam, -1));
        const olharP = norm(soma(norm(CEU.planeta), [0, -0.12, 0]));
        const w = V.olharPlaneta * suave(trecho(t, T.saida, T.saida + 2.0));
        const tremor = 0.008 * ruido(t * 18, 5) * (1 + 2 * vaiVolta(trecho(t, T.saida - 0.3, T.saida + 1.0)));
        const bc = base(norm(soma(olharN.map((v) => v * (1 - w)), olharP, w)), 0.3 * giroNave + tremor);
        return { cam, nave, bn, bc };
      }

      function desenhar(t) {
        const { cam, nave, bn, bc } = voo(t);
        const solDir = norm([CEU.sol[0], CEU.sol[1] + CEU.solSobe * t / duracao, CEU.sol[2]]);
        const fov = 0.36 + 0.04 * suave(trecho(t, T.saida - 0.3, T.saida + 0.9));
        passa(P.cena, cena, Object.assign({}, fixos, {
          uRes: [cl, ca], uT: t, uCam: cam, uF: bc.F, uR: bc.R, uU: bc.U, uFov: fov,
          uNave: nave, uNF: bn.F, uNR: bn.R, uNU: bn.U, uMotor: 1 + 0.25 * Math.sin(t * 40) + 0.15 * ruido(t * 25, 9), uSol: solDir,
        }));
        // brilho -> bloom (dois desfoques) ; riscos (desfoque só na horizontal, bem largo)
        passa(P.brilho, b1, { uTex: tx(cena), uRes: [pl, pa], uLimiar: 0.9 });
        for (const k of [1, 2.2]) { passa(P.borra, b2, { uTex: tx(b1), uRes: [pl, pa], uPasso: [k / pl, 0] }); passa(P.borra, b1, { uTex: tx(b2), uRes: [pl, pa], uPasso: [0, k / pa] }); }
        passa(P.brilho, r1, { uTex: tx(cena), uRes: [pl, pa], uLimiar: 1.6 });
        passa(P.borra, r2, { uTex: tx(r1), uRes: [pl, pa], uPasso: [3 / pl, 0] });
        passa(P.borra, r1, { uTex: tx(r2), uRes: [pl, pa], uPasso: [9 / pl, 0] });
        passa(P.borra, r2, { uTex: tx(r1), uRes: [pl, pa], uPasso: [24 / pl, 0] });
        // fundo desfocado (profundidade de campo)
        passa(P.brilho, d1, { uTex: tx(cena), uRes: [pl, pa], uLimiar: 0 });
        passa(P.borra, d2, { uTex: tx(d1), uRes: [pl, pa], uPasso: [1.5 / pl, 0] });
        passa(P.borra, d1, { uTex: tx(d2), uRes: [pl, pa], uPasso: [0, 1.5 / pa] });
        // raios de sol: onde o sol cai na tela
        const fz = ponto(solDir, bc.F), asp = cl / ca;
        const solUV = [0.5 + ponto(solDir, bc.R) / Math.max(fz, 0.05) / (2 * fov * asp), 0.5 + ponto(solDir, bc.U) / Math.max(fz, 0.05) / (2 * fov)];
        passa(P.raios, rr, { uTex: tx(cena), uRes: [pl, pa], uSolUV: solUV, uVisivel: limita((fz - 0.5) * 3) });
        // quadro final
        const borrao = FX.borrao * (1 + 1.6 * vaiVolta(trecho(t, T.saida - 0.4, T.saida + 1.4)));
        const luz = Math.min(trecho(t, 0, T.acende), 1 - trecho(t, duracao - T.apaga, duracao));
        const dNave = Math.hypot(nave[0] - cam[0], nave[1] - cam[1], nave[2] - cam[2]);
        passa(P.final, null, {
          uCena: tx(cena, 0), uBloom: tx(b1, 1), uRisco: tx(r2, 2), uRaios: tx(rr, 3), uDesf: tx(d1, 4),
          uRes: [largura, altura], uFaixa: faixa, uBorrao: borrao, uCA: FX.aberracao, uGrao: FX.grao, uQuadro: Math.round(t * fps),
          uTit: { textura: tit.tex, unidade: 5 }, uTitA: suave(trecho(t, pT.t, pT.t + 0.5)) * (1 - suave(trecho(t, pT.t + pT.dur - 0.5, pT.t + pT.dur))),
          uLuz: luz, uFoco: dNave / LONGE, kBrilho: FX.brilho, kRisco: FX.riscos, kRaios: FX.raios, cSol: cores.cSol,
        });
      }

      // ---------------- som: pulso de sintetizador, ronco do motor, rajada no arco, onda na saída ----------------
      function som() {
        const s = Som.criar(duracao, H.semente), M = H.musica, p = M.passo;
        // ronco do motor: ruído grave contínuo + zumbido que sobe na saída
        s.vento(0, duracao, { vol: 0.16, corte: 260, onda: 0.9, profundidade: 0.35, entra: 0.3, sai: 0.8 });
        s.vento(0, duracao, { vol: 0.05, corte: 1800, onda: 1.7, profundidade: 0.5, entra: 0.3, sai: 0.8 });
        ['A1', 'E2'].forEach((n, i) => s.nota(n, 0, T.saida + 0.3, { forma: 'serra', vol: 0.05, ataque: 0.4, solta: 0.6, vibrato: 0.01, vibratoHz: 6 + i, pan: i ? 0.3 : -0.3 }));
        ['A2', 'E3'].forEach((n, i) => s.nota(n, T.saida, duracao - T.saida, { forma: 'serra', vol: 0.04, ataque: 0.5, solta: 0.8, vibrato: 0.012, vibratoHz: 7, pan: i ? 0.3 : -0.3 }));
        // pulso: colcheias curtas e bumbo no tempo, até a saída
        for (let i = 0, t = 0.2; t < T.saida - 0.1; i++, t += p) {
          s.nota(M.pulso[i % M.pulso.length], t, p * 0.45, { forma: 'quad', vol: 0.05, ataque: 0.005, solta: 0.08, pan: i % 2 ? 0.25 : -0.25 });
          if (i % 2 === 0) s.batida(t, { vol: 0.32, freq: 70, dur: 0.22 });
        }
        // passadas pelas paredes (whoosh) e a rajada sob o arco
        for (let t = 0.9; t < T.saida - 0.4; t += 1.15) s.vento(t, 0.6, { vol: 0.08, corte: 2600, onda: 2, profundidade: 0.2, entra: 0.3, sai: 0.3 });
        s.vento(T.arco - 0.45, 1.0, { vol: 0.28, corte: 2200, onda: 1.5, profundidade: 0.2, entra: 0.45, sai: 0.5 });
        s.batida(T.arco, { vol: 0.5, freq: 50, dur: 0.6 });
        // saída: estouro grave, acorde que cresce e sinos lá no alto
        s.batida(T.saida, { vol: 0.7, freq: 45, dur: 1.2 });
        s.vento(T.saida - 0.3, 1.4, { vol: 0.2, corte: 3200, onda: 0.8, profundidade: 0.3, entra: 0.3, sai: 1.0 });
        M.acorde.forEach((n, i) => s.nota(n, T.saida - 0.1, duracao - T.saida, { forma: i < 2 ? 'serra' : 'tri', vol: 0.06, ataque: 1.4, solta: 1.0, vibrato: 0.004, vibratoHz: 4 + i * 0.7, pan: (i - 2) * 0.3 }));
        M.sinos.forEach((n, i) => s.sino(n, T.saida + 0.6 + i * 0.35, 2.4, { vol: 0.06, pan: (i - 1.5) * 0.4, brilho: 1.8 }));
        s.sala(0.5);
        return s.fim({ entra: 0.15, sai: 0.6 });
      }

      return { desenhar, som };
    },
  });
})();
