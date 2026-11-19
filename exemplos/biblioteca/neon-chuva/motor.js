// MOTOR "neon-chuva" — megacidade de néon, à noite, na chuva, em three.js.
// Jeito de animar: cena 3D. O código monta a cidade inteira (milhares de torres numa malha só,
// "por instância"), cada janela é uma sala acesa vista POR DENTRO (uma conta no shader finge a
// profundidade do quarto), os letreiros têm símbolos inventados, a rua molhada reflete a cidade
// (a cidade é fotografada de cabeça para baixo, em meia resolução), e a chuva, o vapor e os
// carros voadores saem de t. Depois vem o laboratório de cinema (posproducao.js).
// Sem luz de verdade nas torres (só cor que brilha e névoa): é isso que deixa rodar sem placa de vídeo.
// O que muda de um filme para outro está em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import { atlasLetreiros, anelHolograma, bolinha } from './glifos.js';
import { criarPos } from './posproducao.js';

const { limita, mistura, trecho, suave, sorteio, ruido } = Filme;

const HASH = `
float hh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
`;

Filme.criar({
  largura: 1920, altura: 1080, fps: 30, duracao: 9,
  montar({ historia: H, tela, largura: L, altura: A, duracao, fps }) {
    const C = H.cores, F = H.filme, acaso = sorteio(H.semente);
    const peca = (tipo) => (H.pecas || []).find((p) => p.tipo === tipo) || {};
    const pecas = (tipo) => (H.pecas || []).filter((p) => p.tipo === tipo);
    const cor = (h) => new THREE.Color(h);
    const escala = L / 1920;

    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.setClearColor(0x000000, 1);

    const cena = new THREE.Scene();
    cena.fog = new THREE.FogExp2(C.nevoa, H.nevoa);
    const mundo = new THREE.Group(); cena.add(mundo);            // tudo o que aparece no reflexo da rua
    const camera = new THREE.PerspectiveCamera(50, L / A, 0.1, 3000);
    const camReal = new THREE.Vector3();                         // câmera "de verdade" (no reflexo, espelhada)

    const comuns = {
      uT: { value: 0 }, uCamReal: { value: camReal }, uNevoa: { value: cor(C.nevoa) }, uDensidade: { value: H.nevoa },
      uBrilhoCidade: { value: cor(C.brilhoCidade) },
    };
    const nevoaGLSL = `
      vec3 nevoa(vec3 c, vec3 pMundo){
        float d = length(pMundo - cameraPosition);
        float k = 1.0 - exp(-d * uDensidade);
        vec3 nv = mix(uNevoa, uBrilhoCidade, 0.35 * smoothstep(0.4, 1.0, k));
        return mix(c, nv, k);
      }`;

    // =================== céu: degradê com nuvens iluminadas por baixo pela cidade ===================
    {
      const m = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { ...comuns, uAlto: { value: cor(C.ceuAlto) }, uBaixo: { value: cor(C.ceuBaixo) }, uNuvem: { value: cor(C.nuvem) } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vDir; uniform vec3 uAlto, uBaixo, uNuvem, uNevoa, uBrilhoCidade; uniform float uT; ${HASH}
          void main(){
            vec3 d = normalize(vDir);
            float y = max(d.y, 0.0);
            vec3 c = mix(uBaixo, uAlto, smoothstep(0.0, 0.55, y));
            vec2 p = d.xz / (0.18 + y) * 2.2 + vec2(uT * 0.05, 0.0);
            float n = 0.55 * rn(p) + 0.3 * rn(p * 2.3 + 3.1) + 0.15 * rn(p * 5.1);
            float nuv = smoothstep(0.42, 0.78, n) * smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.5, 0.9, y));
            c = mix(c, uNuvem * (1.2 - y), nuv * 0.85);
            c = mix(c, mix(uNevoa, uBrilhoCidade, 0.5), 1.0 - smoothstep(0.0, 0.12, y));
            if (d.y < 0.0) c = uNevoa * 0.8;
            gl_FragColor = vec4(c, 1.0);
          }`,
      });
      m.uniforms.uT = comuns.uT;
      const ceu = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), m); ceu.renderOrder = -1; ceu.frustumCulled = false; mundo.add(ceu);
    }

    // =================== cidade: torres numa malha só ===================
    const CID = peca('cidade'), HER = peca('torre'), RUA = peca('rua');
    const Q = CID.quadra, MEIA_RUA = RUA.largura / 2 + RUA.calcada;   // ruas a cada Q metros
    const torres = [];   // { x, z, w, d, h, tipo, acesas, faixa }
    torres.push({ x: HER.x, z: HER.z, w: HER.largura, d: HER.fundo, h: HER.altura, tipo: HER.janela ?? 0, acesas: HER.acesas ?? 0.85, faixa: HER.faixa ?? 1, heroi: true });
    const dentroHeroi = (x0, x1, z0, z1) => !(x1 < HER.x - HER.largura / 2 - 1 || x0 > HER.x + HER.largura / 2 + 1 || z1 < HER.z - HER.fundo / 2 - 1 || z0 > HER.z + HER.fundo / 2 + 1);
    const cl = CID.clareira;
    const N = Math.ceil(CID.raio / Q);
    for (let i = -N; i < N; i++) for (let j = -N; j < N; j++) {
      // lote entre as ruas: x de i*Q a (i+1)*Q, z de j*Q+Q/2 a (j+1)*Q+Q/2
      const lx0 = i * Q + MEIA_RUA, lx1 = (i + 1) * Q - MEIA_RUA, lz0 = j * Q + Q / 2 + MEIA_RUA, lz1 = (j + 1) * Q + Q / 2 - MEIA_RUA;
      const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, dist = Math.hypot(cx, cz);
      if (dist > CID.raio) continue;
      if (dentroHeroi(lx0, lx1, lz0, lz1)) continue;
      const naRua = Math.abs(cx) < Q && cz < 60 && cz > -CID.raio;   // lotes dos dois lados da rua principal
      const partes = acaso() < 0.45 ? 1 : (acaso() < 0.6 ? 2 : 4);
      const sub = partes === 1 ? [[0, 0, 1, 1]] : partes === 2 ? (acaso() < 0.5 ? [[0, 0, 0.5, 1], [0.5, 0, 1, 1]] : [[0, 0, 1, 0.5], [0, 0.5, 1, 1]]) : [[0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]];
      for (const [a0, b0, a1, b1] of sub) {
        const folga = naRua ? 0.4 : 0.6 + acaso() * 2.5;
        const x0 = mistura(lx0, lx1, a0) + (a0 > 0 ? folga : (naRua && cx > 0 ? 0 : folga * 0.5)), x1 = mistura(lx0, lx1, a1) - (a1 < 1 ? folga : (naRua && cx < 0 ? 0 : folga * 0.5));
        const z0 = mistura(lz0, lz1, b0) + folga * 0.5, z1 = mistura(lz0, lz1, b1) - folga * 0.5;
        let h = CID.alturas[0] + Math.pow(acaso(), 1.8) * (CID.alturas[1] - CID.alturas[0]);
        if (acaso() < CID.arranhaCeus && dist > 120) h = CID.alturas[1] + acaso() * (CID.alturaMax - CID.alturas[1]);
        if (naRua) h = Math.max(h, CID.alturaRua[0] + acaso() * (CID.alturaRua[1] - CID.alturaRua[0]));
        if (cl && Math.hypot(cx - cl.x, cz - cl.z) < cl.raio) h = Math.min(h, cl.alturaMax * (0.5 + 0.5 * acaso()));
        torres.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, h, tipo: Math.floor(acaso() * 4), acesas: CID.acesas[0] + acaso() * (CID.acesas[1] - CID.acesas[0]), faixa: acaso() < CID.faixasNeon ? 1 + Math.floor(acaso() * C.neons.length) : 0 });
        if (h > CID.alturas[1] && acaso() < 0.8) torres.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: 1.2, d: 1.2, h: h + 18 + acaso() * 30, tipo: 4, acesas: 1, faixa: 1 + Math.floor(acaso() * C.neons.length), antena: true });
      }
    }
    const matTorre = new THREE.ShaderMaterial({
      uniforms: { ...comuns, uTorre: { value: cor(C.torre) }, uSalas: { value: C.salas.map(cor) }, uNeons: { value: C.neons.map(cor) }, uLuzSala: { value: H.luzSala } },
      vertexShader: `attribute vec4 aDados; attribute vec2 aAltura;
        varying vec3 vReal, vMundo, vNorm; flat varying vec4 vDados; flat varying vec2 vAltura;   // flat: dado da torre igual em todo pixel (sorteio não pode variar)
        void main(){
          vec4 r = instanceMatrix * vec4(position, 1.0);
          vReal = r.xyz; vNorm = normalize(mat3(instanceMatrix) * normal); vDados = aDados; vAltura = aAltura;
          vec4 w = modelMatrix * r; vMundo = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `varying vec3 vReal, vMundo, vNorm; flat varying vec4 vDados; flat varying vec2 vAltura;
        uniform vec3 uCamReal, uNevoa, uBrilhoCidade, uTorre; uniform vec3 uSalas[6]; uniform vec3 uNeons[${C.neons.length}];
        uniform float uT, uDensidade, uLuzSala; ${HASH} ${nevoaGLSL}
        void main(){
          vec3 n = normalize(vNorm), P = vReal, c;
          float semente = vDados.x * 311.0, tipo = vDados.y;
          int iNeon = int(vDados.z) - 1;
          vec3 neon = iNeon >= 0 ? uNeons[iNeon] : vec3(0.0);
          if (tipo > 3.5) {                                  // antena: um tubo de néon
            float pisca = 0.6 + 0.4 * step(0.5, fract(uT * 0.7 + vDados.x * 5.0));
            c = neon * (2.0 + 2.0 * step(vAltura.y - 3.0, P.y) * pisca) * (0.5 + 0.5 * step(0.5, fract(P.y * 0.25)));
            gl_FragColor = vec4(nevoa(c, vMundo), 1.0); return;
          }
          if (n.y > 0.5) {                                   // telhado: escuro, com luzinhas e borda de néon
            vec2 q = P.xz * 0.5;
            c = uTorre * 0.6 + uSalas[0] * 0.5 * step(0.985, hh(floor(q) + semente));
            gl_FragColor = vec4(nevoa(c, vMundo), 1.0); return;
          }
          // eixo horizontal da fachada
          vec3 eixoU = abs(n.x) > 0.5 ? vec3(0.0, 0.0, -sign(n.x)) : vec3(sign(n.z), 0.0, 0.0);
          float u = dot(P, eixoU), v = P.y;
          bool terreo = v < 4.6 && vAltura.x > 0.5;          // loja no térreo das torres da rua
          vec2 tam = tipo < 0.5 ? vec2(3.2, 3.6) : tipo < 1.5 ? vec2(1.8, 3.6) : tipo < 2.5 ? vec2(4.6, 3.3) : vec2(2.6, 4.2);
          vec2 abre = tipo < 1.5 ? vec2(0.8, 0.66) : tipo < 2.5 ? vec2(0.94, 0.5) : vec2(0.72, 0.74);
          if (terreo) { tam = vec2(4.2, 4.6); abre = vec2(0.84, 0.66); }
          vec2 g = vec2(u, v - (terreo ? 0.0 : 0.8)) / tam;
          vec2 id = floor(g), f = fract(g);
          float h1 = hh(id + semente), h2 = hh(id + semente + 17.0), h3 = hh(id * 1.7 + semente + 3.0);
          float acesa = step(h1, terreo ? 0.9 : vDados.w);
          vec3 sala = uSalas[int(h2 * 5.999)];
          float forca = uLuzSala * (0.55 + 0.8 * h3) * (terreo ? 1.15 : 1.0);
          // fachada: painéis escuros com linhas
          vec3 fach = uTorre * (0.8 + 0.25 * hh(vec2(floor(u / 1.2), semente)));
          vec2 q = (f - 0.5) * tam, meia = 0.5 * tam * abre;
          vec2 borda = meia - abs(q);
          vec2 px = fwidth(g * tam);
          float dentro = smoothstep(0.0, max(px.x, 1e-3), borda.x) * smoothstep(0.0, max(px.y, 1e-3), borda.y);
          // sala por dentro: o raio da câmera entra pelo vidro e bate na parede, no chão ou no teto
          vec3 dir = normalize(P - uCamReal);
          vec3 dl = vec3(dot(dir, eixoU), dir.y, -dot(dir, n));
          float prof = tam.x * 0.85;
          vec3 sl = vec3(dl.x >= 0.0 ? 1.0 : -1.0, dl.y >= 0.0 ? 1.0 : -1.0, 1.0);
          float tx = (sl.x * meia.x * 1.08 - q.x) / (dl.x + sl.x * 1e-4);
          float ty = (sl.y * meia.y * 1.25 - q.y) / (dl.y + sl.y * 1e-4);
          float tz = prof / max(dl.z, 1e-3);
          // qual parede o raio toca primeiro (comparação, nunca igualdade de float: o compilador pode recalcular)
          float plano = (tz < tx && tz < ty) ? 0.0 : (ty < tx ? 1.0 : 2.0);
          float tm = plano < 0.5 ? tz : (plano < 1.5 ? ty : tx);
          vec3 hit = vec3(q, 0.0) + dl * tm;
          vec3 dentroCor;
          if (plano < 0.5) {
            dentroCor = sala;
            // vulto de gente contra a parede do fundo
            float xg = (h3 - 0.5) * tam.x * 0.8, chao = -meia.y * 1.25;
            float corpo = step(abs(hit.x - xg), 0.24) * step(hit.y, chao + 1.45);
            float cabeca = step(length(vec2(hit.x - xg, hit.y - (chao + 1.62))), 0.15);
            dentroCor *= 1.0 - 0.85 * max(corpo, cabeca) * step(0.55, h2);
            dentroCor *= 0.85 + 0.15 * step(0.5, fract(hit.x * 0.5 + h1));
          } else if (plano < 1.5) {
            dentroCor = sl.y > 0.0 ? sala * (1.1 + 1.5 * step(abs(hit.x), 0.35)) : sala * 0.35;   // teto com lâmpada, chão escuro
          } else dentroCor = sala * 0.6;
          dentroCor *= mix(1.0, 0.7, clamp(hit.z / prof, 0.0, 1.0));
          vec3 apagada = uTorre * 0.5 + sala * 0.04;
          vec3 vidro = mix(apagada, dentroCor * forca, acesa);
          float fr = clamp(1.0 - abs(dot(dir, n)), 0.0, 1.0), fres = fr * fr * fr * fr;   // sem pow(): base um tico abaixo de zero daria NaN
          vidro += mix(uNevoa, uBrilhoCidade, 0.5) * fres * 0.6;
          c = mix(fach, vidro, dentro);
          // faixa de néon a cada poucos andares
          if (iNeon >= 0) {
            float passo = 3.0 + floor(vDados.x * 4.0);
            float yb = fract((v - 0.3) / (3.6 * passo));
            float lar = 0.06 / passo;
            c = mix(c, neon * 3.0, smoothstep(lar + fwidth(yb) * 1.5, lar * 0.3, abs(yb - 0.5)));
          }
          // longe: a grade de janelas vira a cor média (sem listras quando a janela é menor que um pixel)
          float pe = max(fwidth(g.x), fwidth(g.y));
          vec3 media = mix(fach, mix(apagada, (uSalas[0] + uSalas[1] + uSalas[2] + uSalas[3] + uSalas[4] + uSalas[5]) / 6.0 * uLuzSala, vDados.w), abre.x * abre.y);
          c = mix(c, media, smoothstep(0.3, 0.8, pe));
          gl_FragColor = vec4(nevoa(c, vMundo), 1.0);
        }`,
    });
    matTorre.uniforms.uT = comuns.uT;
    {
      const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); g.deleteAttribute('uv');
      const malha = new THREE.InstancedMesh(g, matTorre, torres.length);
      const dados = new Float32Array(torres.length * 4), alt = new Float32Array(torres.length * 2), o = new THREE.Object3D();
      torres.forEach((t, i) => {
        o.position.set(t.x, 0, t.z); o.scale.set(t.w, t.h, t.d); o.updateMatrix(); malha.setMatrixAt(i, o.matrix);
        dados.set([acaso(), t.tipo, t.faixa, t.acesas], i * 4);
        alt.set([Math.abs(t.x) < Q && !t.antena ? 1 : 0, t.h], i * 2);
      });
      g.setAttribute('aDados', new THREE.InstancedBufferAttribute(dados, 4));
      g.setAttribute('aAltura', new THREE.InstancedBufferAttribute(alt, 2));
      malha.frustumCulled = false; mundo.add(malha);
    }

    // =================== letreiros com símbolos inventados ===================
    const LET = peca('letreiros');
    const txAtlas = new THREE.CanvasTexture(atlasLetreiros(H.semente + 101)); txAtlas.colorSpace = THREE.NoColorSpace; txAtlas.anisotropy = 4;
    const placas = [];   // { pos, rotY, w, h, deitado, cel, cor, pisca }
    {
      const r = sorteio(H.semente + 7);
      const corN = () => Math.floor(r() * C.neons.length);
      // lâminas saindo das fachadas da rua principal (perpendiculares à fachada)
      const daRua = torres.filter((t) => Math.abs(t.x) < Q && !t.antena && !t.heroi && t.z > -CID.raio * 0.5);
      for (let k = 0; k < LET.rua; k++) {
        const t = daRua[Math.floor(r() * daRua.length)]; if (!t) break;
        const lado = t.x < 0 ? 1 : -1, face = t.x + lado * t.w / 2;
        const h = 4 + r() * 6, w = h / 4 * 1.05;
        placas.push({ pos: [face + lado * (w / 2 + 0.15), 4.5 + r() * Math.min(26, t.h - 12) + h / 2, t.z + (r() - 0.5) * (t.d - 2)], rotY: 0, w, h, deitado: false, cel: Math.floor(r() * 16), cor: corN(), pisca: r() < 0.18 ? 1 : 0 });
      }
      // placas grandes coladas nas fachadas, por toda a cidade
      const todas = torres.filter((t) => !t.antena && !t.heroi && t.h > 25);
      for (let k = 0; k < LET.cidade; k++) {
        const t = todas[Math.floor(r() * todas.length)]; if (!t) break;
        const face = Math.floor(r() * 4), deitado = r() < 0.4;
        const lado = face < 2 ? t.w : t.d, h = deitado ? Math.min(lado * 0.25, 7) : Math.min(t.h * 0.35, 6 + r() * 26);
        const w = deitado ? h * 4 : h / 4;
        if ((deitado ? w : w) > lado - 1) continue;
        const y = 8 + r() * Math.max(1, t.h - 10 - h) + h / 2;
        const off = (r() - 0.5) * (lado - (deitado ? w : w) - 1);
        const pos = face === 0 ? [t.x + t.w / 2 + 0.15, y, t.z + off] : face === 1 ? [t.x - t.w / 2 - 0.15, y, t.z + off] : face === 2 ? [t.x + off, y, t.z + t.d / 2 + 0.15] : [t.x + off, y, t.z - t.d / 2 - 0.15];
        const rotY = face === 0 ? Math.PI / 2 : face === 1 ? -Math.PI / 2 : face === 2 ? 0 : Math.PI;
        placas.push({ pos, rotY, w: deitado ? w : w, h: deitado ? h : h, deitado, cel: Math.floor(r() * 16), cor: corN(), pisca: r() < 0.1 ? 1 : 0 });
      }
      // placas na fachada da torre principal (a câmera sobe por elas)
      for (const p of HER.letreiros || []) placas.push({ pos: [HER.x + HER.largura / 2 + 0.2, p.y, HER.z + p.z], rotY: Math.PI / 2, w: p.deitado ? p.altura * 4 : p.altura / 4, h: p.altura, deitado: !!p.deitado, cel: p.simbolos, cor: p.cor, pisca: p.pisca ? 1 : 0 });
    }
    const matPlaca = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { ...comuns, tAtlas: { value: txAtlas }, uNeons: { value: C.neons.map(cor) }, uFundo: { value: cor(C.fundoPlaca) } },
      vertexShader: `attribute vec4 aPlaca; varying vec2 vUv; flat varying vec4 vPlaca; varying vec3 vMundo;
        void main(){ vUv = uv; vPlaca = aPlaca; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vMundo = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec2 vUv; flat varying vec4 vPlaca; varying vec3 vMundo;
        uniform sampler2D tAtlas; uniform vec3 uNeons[${C.neons.length}]; uniform vec3 uFundo, uNevoa, uBrilhoCidade; uniform float uT, uDensidade; ${HASH} ${nevoaGLSL}
        void main(){
          vec2 uv = vPlaca.y > 0.5 ? vec2(vUv.y, 1.0 - vUv.x) : vUv;      // deitada: o letreiro gira
          float cel = vPlaca.x, col = mod(cel, 8.0), lin = floor(cel / 8.0);
          vec2 ua = vec2((col + uv.x) / 8.0, ((1.0 - lin) + uv.y) / 2.0);
          float a = texture2D(tAtlas, ua).a;
          vec3 neon = uNeons[int(vPlaca.z)];
          float liga = 1.0;
          if (vPlaca.w > 0.5) liga = 0.15 + 0.85 * step(0.22, hh(vec2(floor(uT * 13.0), cel * 7.0 + vPlaca.z * 3.0)));
          vec3 c = uFundo + (neon * a * 3.2 + vec3(1.0) * smoothstep(0.55, 1.0, a) * 2.2) * liga;
          gl_FragColor = vec4(nevoa(c, vMundo), 1.0);
        }`,
    });
    matPlaca.uniforms.uT = comuns.uT;
    {
      const g = new THREE.PlaneGeometry(1, 1);
      const malha = new THREE.InstancedMesh(g, matPlaca, placas.length), o = new THREE.Object3D(), d = new Float32Array(placas.length * 4);
      placas.forEach((p, i) => {
        o.position.set(...p.pos); o.rotation.set(0, p.rotY, 0); o.scale.set(p.w, p.h, 1); o.updateMatrix(); malha.setMatrixAt(i, o.matrix);
        d.set([p.cel % 16, p.deitado ? 1 : 0, p.cor % C.neons.length, p.pisca], i * 4);
      });
      g.setAttribute('aPlaca', new THREE.InstancedBufferAttribute(d, 4));
      malha.frustumCulled = false; mundo.add(malha);
    }

    // =================== hologramas (anéis que giram no céu da cidade) ===================
    const txAnel = new THREE.CanvasTexture(anelHolograma(H.semente + 55)); txAnel.colorSpace = THREE.NoColorSpace;
    const holos = pecas('holograma').map((p, i) => {
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { ...comuns, tAnel: { value: p.anel === false ? txAtlas : txAnel }, uCor: { value: cor(C.neons[p.cor % C.neons.length]) }, uLiga: { value: 0 }, uCelula: { value: p.simbolos ?? -1 } },
        vertexShader: `varying vec2 vUv; varying vec3 vMundo; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vMundo = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `varying vec2 vUv; varying vec3 vMundo; uniform sampler2D tAnel; uniform vec3 uCor, uNevoa, uBrilhoCidade; uniform float uLiga, uCelula, uT, uDensidade; ${HASH}
          void main(){
            vec2 uv = vUv;
            if (uCelula >= 0.0) { float col = mod(uCelula, 8.0), lin = floor(uCelula / 8.0); uv = vec2((col + uv.x) / 8.0, ((1.0 - lin) + uv.y) / 2.0); }
            float a = texture2D(tAnel, uv).a;
            float linhas = 0.75 + 0.25 * step(0.5, fract(vMundo.y * 1.3 - uT * 2.0));
            float k = 1.0 - exp(-length(vMundo - cameraPosition) * uDensidade);
            gl_FragColor = vec4((uCor * 2.4 * a + vec3(smoothstep(0.7, 1.0, a))) * linhas * uLiga * (1.0 - k * 0.8), 1.0);
          }`,
      });
      m.uniforms.uT = comuns.uT;
      const geo = p.anel === false ? new THREE.PlaneGeometry(p.raio / 2, p.raio * 2) : new THREE.PlaneGeometry(p.raio * 2, p.raio * 2);
      const malha = new THREE.Mesh(geo, m); malha.position.set(p.x, p.y, p.z); malha.rotation.y = p.vira ?? 0; mundo.add(malha);
      return { p, malha, m };
    });

    // =================== carrinho de comida na calçada ===================
    const CAR = peca('carrinho');
    const vapores = [];
    const luzCarrinho = [];
    {
      const g = new THREE.Group(); g.position.set(CAR.x, 0, CAR.z); g.rotation.y = CAR.gira ?? 0; mundo.add(g);
      const fosco = (c) => new THREE.MeshLambertMaterial({ color: c });
      const brilha = (c, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
      const caixa = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
      caixa(1.0, 0.85, 2.4, fosco(C.carrinho), 0, 0.75, 0);                    // corpo
      caixa(1.25, 0.06, 2.6, fosco('#2b2f3a'), 0.1, 1.2, 0);                   // tampo do balcão
      for (const [z, x] of [[-0.9, 0.45], [0.9, 0.45], [-0.9, -0.45], [0.9, -0.45]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14), fosco('#15161c')); r.rotation.x = Math.PI / 2; r.position.set(x + 0.08 * Math.sign(x), 0.22, z); r.rotation.set(0, 0, Math.PI / 2); g.add(r); }
      // painel da frente com símbolos (aceso)
      {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.5), new THREE.ShaderMaterial({
          uniforms: { tAtlas: { value: txAtlas }, uCor: { value: cor(C.neons[CAR.corPainel % C.neons.length]) } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `varying vec2 vUv; uniform sampler2D tAtlas; uniform vec3 uCor;
            void main(){ vec2 uv = vec2(vUv.y, 1.0 - vUv.x); float a = texture2D(tAtlas, vec2((3.0 + uv.x) / 8.0, (1.0 + uv.y) / 2.0)).a;
              gl_FragColor = vec4(vec3(0.05, 0.03, 0.06) + uCor * a * 3.0 + smoothstep(0.6, 1.0, a) * 1.5, 1.0); }`,
        }));
        m.position.set(0.51, 0.8, 0); m.rotation.y = Math.PI / 2; g.add(m);
      }
      // toldo listrado
      {
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const x = cv.getContext('2d');
        for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? C.toldo[1] : C.toldo[0]; x.fillRect(i * 8, 0, 8, 8); }
        const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.magFilter = THREE.NearestFilter;
        const t = caixa(1.9, 0.06, 2.9, new THREE.MeshLambertMaterial({ map: tx, emissive: '#331022' }), 0.25, 2.3, 0); t.rotation.z = -0.22;
        for (const z of [-1.3, 1.3]) for (const x of [-0.45, 0.9]) caixa(0.05, x > 0 ? 2.1 : 2.35, 0.05, fosco('#22252e'), x, x > 0 ? 1.05 : 1.18, z);
        // placa em cima do toldo
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), new THREE.ShaderMaterial({
          side: THREE.DoubleSide, uniforms: { tAtlas: { value: txAtlas }, uCor: { value: cor(C.neons[CAR.corPlaca % C.neons.length]) } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `varying vec2 vUv; uniform sampler2D tAtlas; uniform vec3 uCor;
            void main(){ vec2 uv = vec2(vUv.y, 1.0 - vUv.x); float a = texture2D(tAtlas, vec2((6.0 + uv.x) / 8.0, (0.0 + uv.y) / 2.0)).a;
              gl_FragColor = vec4(vec3(0.04, 0.02, 0.06) + uCor * a * 3.5 + smoothstep(0.6, 1.0, a) * 2.0, 1.0); }`,
        }));
        pl.position.set(0.0, 2.75, 0); pl.rotation.y = Math.PI / 2; g.add(pl);
      }
      // lanternas penduradas
      for (const z of [-0.9, 0, 0.9]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), brilha(C.lanterna, 4)); s.position.set(1.05, 1.95, z); g.add(s); caixa(0.01, 0.2, 0.01, fosco('#111'), 1.05, 2.12, z); }
      // panelas com vapor
      for (const [z, r] of [[-0.6, 0.24], [0.25, 0.2]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.3, 16), fosco('#8d939e')); p.position.set(-0.05, 1.38, z); g.add(p); vapores.push({ x: -0.05, y: 1.5, z, r, grupo: g }); }
      // banquinhos
      for (const z of [-0.8, 0, 0.8]) { caixa(0.05, 0.7, 0.05, fosco('#1d1f27'), 1.0, 0.35, z); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 14), fosco(C.neons[(CAR.corPlaca + 1) % C.neons.length])); a.position.set(1.0, 0.72, z); g.add(a); }
      // o cozinheiro: corpo, cabeça e chapéu largo; o braço mexe a concha
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.95, 12), fosco(C.cozinheiro)); corpo.position.set(-0.55, 1.55, -0.15); g.add(corpo);
      const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), fosco('#c99a7c')); cabeca.position.set(-0.53, 2.15, -0.15); g.add(cabeca);
      const chapeu = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.2, 18), fosco('#d8c49a')); chapeu.position.set(-0.53, 2.33, -0.15); g.add(chapeu);
      const braco = new THREE.Group(); braco.position.set(-0.45, 1.85, -0.35); g.add(braco);
      { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), fosco(C.cozinheiro)); b.position.set(0.18, -0.2, 0); b.rotation.z = -0.9; braco.add(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), fosco('#ccc')); c.position.set(0.42, -0.3, 0); c.rotation.z = 0.3; braco.add(c); }
      luzCarrinho.push(braco, chapeu, cabeca);
      // luzes só para o carrinho (as torres não usam luz)
      const quente = new THREE.PointLight(C.lanterna, 14, 9, 1.6); quente.position.set(CAR.x + 1.0, 1.9, CAR.z); mundo.add(quente);
      const rosa = new THREE.PointLight(C.neons[CAR.corPlaca % C.neons.length], 10, 10, 1.6); rosa.position.set(CAR.x + 1.6, 2.9, CAR.z); mundo.add(rosa);
      mundo.add(new THREE.HemisphereLight(C.neons[1], '#2a1030', 0.7));
    }

    // =================== vapor (carrinho e bueiros): bolinhas que sobem; tudo sai de t ===================
    const txBola = new THREE.CanvasTexture(bolinha());
    const fumacas = [];
    const novaFumaca = (base, quantas, tam, sobe, cor0, op) => {
      for (let i = 0; i < quantas; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: txBola, color: cor(cor0), transparent: true, depthWrite: false, opacity: 0, fog: true }));
        mundo.add(m); fumacas.push({ m, base, i, quantas, tam, sobe, op, f: acaso() * 6.28 });
      }
    };
    for (const v of vapores) novaFumaca(new THREE.Vector3(CAR.x + v.x, v.y, CAR.z + v.z), 7, 0.7, 1.6, C.vapor, 0.22);
    for (const b of pecas('vapor')) novaFumaca(new THREE.Vector3(b.x, 0.1, b.z), 9, 2.6 * (b.forca ?? 1), 6 * (b.forca ?? 1), C.vapor, 0.16);

    // =================== rua molhada que reflete ===================
    const reflexo = new THREE.WebGLRenderTarget(Math.round(L / 2), Math.round(A / 2), { type: THREE.HalfFloatType, generateMipmaps: false });
    const matRua = new THREE.ShaderMaterial({
      uniforms: { ...comuns, tReflexo: { value: reflexo.texture }, uRes: { value: new THREE.Vector2(L, A) }, uTemReflexo: { value: 1 }, uAsfalto: { value: cor(C.asfalto) }, uCalcada: { value: cor(C.calcada) }, uFaixa: { value: cor(C.faixa) },
        uQ: { value: Q }, uMeiaRua: { value: RUA.largura / 2 }, uCalcadaL: { value: RUA.calcada }, uMolhado: { value: RUA.molhado } },
      vertexShader: `varying vec3 vMundo; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vMundo = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec3 vMundo; uniform sampler2D tReflexo; uniform vec2 uRes; uniform float uTemReflexo, uT, uDensidade, uQ, uMeiaRua, uCalcadaL, uMolhado;
        uniform vec3 uAsfalto, uCalcada, uFaixa, uNevoa, uBrilhoCidade; ${HASH} ${nevoaGLSL}
        void main(){
          vec2 p = vMundo.xz;
          // onde estou: rua, calçada ou praça (dentro do lote)
          float rx = abs(p.x - uQ * floor(p.x / uQ + 0.5)), rz = abs(p.y - uQ * (floor((p.y - uQ * 0.5) / uQ + 0.5)) - uQ * 0.5);
          float naRua = max(step(rx, uMeiaRua), step(rz, uMeiaRua));
          vec3 base = mix(uCalcada * (0.85 + 0.3 * step(0.5, fract(p.x * 0.8) ) * step(0.5, fract(p.y * 0.8))), uAsfalto, naRua);
          base *= 0.75 + 0.5 * rn(p * 3.0);
          // faixa amarela tracejada no meio das ruas
          float meio = step(rx, 0.08) * step(0.5, fract(p.y * 0.25)) * step(uMeiaRua, rz);
          base = mix(base, uFaixa * 0.5, meio);
          // poças e anéis de gota (cada anel nasce e cresce num tempo sorteado)
          float poca = smoothstep(0.35, 0.65, rn(p * 0.35) * 0.7 + rn(p * 1.3) * 0.3);
          float molhado = mix(uMolhado, 1.0, poca);
          vec2 desvio = vec2(0.0);
          for (int k = 0; k < 2; k++) {
            vec2 gg = p * (k == 0 ? 2.2 : 3.7) + float(k) * 5.3; vec2 id = floor(gg), f = fract(gg) - 0.5;
            float ciclo = uT * 1.6 + hh(id) * 4.0, vida = fract(ciclo);
            vec2 c0 = (vec2(hh(id + floor(ciclo)), hh(id + 7.0 + floor(ciclo))) - 0.5) * 0.6;
            float r = length(f - c0), anel = vida * 0.45;
            float dr = (r - anel) * 30.0, onda = exp(-dr * dr) * (1.0 - vida);
            desvio += normalize(f - c0 + 1e-4) * onda * 0.012;
          }
          desvio += (vec2(rn(p * 4.0 + uT), rn(p * 4.0 - uT + 9.0)) - 0.5) * 0.004;
          vec2 uv = gl_FragCoord.xy / uRes + desvio * (0.5 + poca);
          vec3 refl = uTemReflexo > 0.5 ? texture2D(tReflexo, uv).rgb : mix(uNevoa, uBrilhoCidade, 0.4) * 0.6;
          vec3 v = normalize(vMundo - cameraPosition);
          float fr = clamp(1.0 - abs(v.y), 0.0, 1.0), fres = mix(0.25, 1.0, fr * fr * fr * fr);
          vec3 c = base * (1.0 - 0.6 * molhado) + refl * fres * molhado * 0.95;
          gl_FragColor = vec4(nevoa(c, vMundo), 1.0);
        }`,
    });
    matRua.uniforms.uT = comuns.uT;
    const rua = new THREE.Mesh(new THREE.PlaneGeometry(CID.raio * 2.4, CID.raio * 2.4), matRua); rua.rotation.x = -Math.PI / 2; cena.add(rua);

    // =================== carros voadores ===================
    const TR = peca('trafego');
    const carros = [];
    {
      const r = sorteio(H.semente + 31);
      for (let k = 0; k < TR.pistas; k++) {
        const alt = TR.alturas[0] + r() * (TR.alturas[1] - TR.alturas[0]), eixo = r() < 0.5 ? 'x' : 'z';
        const desl = (Math.floor((r() - 0.5) * 16) + 0.5) * Q;
        const vel = (TR.velocidade[0] + r() * (TR.velocidade[1] - TR.velocidade[0])) * (r() < 0.5 ? -1 : 1);
        for (let c = 0; c < TR.carros; c++) carros.push({ alt: alt + (c % 2) * 1.6, eixo, desl: desl + (c % 2 ? 2.2 : -2.2) * Math.sign(vel), vel: vel * (c % 2 ? 1 : 0.92), ini: r() * 2 * CID.raio });
      }
    }
    const matCarro = new THREE.ShaderMaterial({
      uniforms: { ...comuns, uFarol: { value: cor(C.farol) }, uLanterna: { value: cor(C.lanternaCarro) }, uCasco: { value: cor(C.casco) } },
      vertexShader: `varying vec3 vLocal, vMundo; void main(){ vLocal = position; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vMundo = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec3 vLocal, vMundo; uniform vec3 uFarol, uLanterna, uCasco, uNevoa, uBrilhoCidade; uniform float uDensidade; ${nevoaGLSL}
        void main(){ vec3 c = uCasco; if (vLocal.z > 1.1) c = uFarol * 6.0; else if (vLocal.z < -1.1) c = uLanterna * 5.0; else if (vLocal.y < -0.15) c = uLanterna * 1.4;
          gl_FragColor = vec4(nevoa(c, vMundo), 1.0); }`,
    });
    const malhaCarros = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.5, 2.6), matCarro, Math.max(1, carros.length)); malhaCarros.frustumCulled = false; mundo.add(malhaCarros);

    // =================== chuva: riscos que caem numa caixa que acompanha a câmera ===================
    const CH = peca('chuva');
    const gotas = Array.from({ length: CH.gotas }, () => ({ x: acaso(), y: acaso(), z: acaso(), v: 0.85 + acaso() * 0.3 }));
    const geoChuva = new THREE.BufferGeometry(); geoChuva.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(CH.gotas * 6), 3));
    const chuva = new THREE.LineSegments(geoChuva, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uCor: { value: cor(C.chuva) }, uForca: { value: CH.brilho * (0.35 + 0.65 * escala) } },   // risco de 1 pixel pesa mais em tela pequena
      vertexShader: `varying float vD; void main(){ vec4 v = modelViewMatrix * vec4(position, 1.0); vD = -v.z; gl_Position = projectionMatrix * v; }`,
      fragmentShader: `varying float vD; uniform vec3 uCor; uniform float uForca; void main(){ float a = smoothstep(0.4, 2.0, vD) * (1.0 - smoothstep(10.0, 26.0, vD)); gl_FragColor = vec4(uCor * a * uForca, 1.0); }`,
    }));
    chuva.frustumCulled = false; cena.add(chuva);

    // =================== câmera: pontos da história, curva lisa (Hermite) entre eles ===================
    const K = H.camera;
    const interp = (t, campo) => {
      if (t <= K[0].t) return K[0][campo].slice();
      if (t >= K[K.length - 1].t) return K[K.length - 1][campo].slice();
      let i = 0; while (K[i + 1].t < t) i++;
      const a = K[i], b = K[i + 1], a0 = K[Math.max(0, i - 1)], b1 = K[Math.min(K.length - 1, i + 2)];
      const dt = b.t - a.t, u = (t - a.t) / dt, u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      return [0, 1, 2].map((e) => {
        const ma = i === 0 ? 0 : (b[campo][e] - a0[campo][e]) / (b.t - a0.t) * dt;
        const mb = i + 1 === K.length - 1 ? 0 : (b1[campo][e] - a[campo][e]) / (b1.t - a.t) * dt;
        return h00 * a[campo][e] + h10 * ma + h01 * b[campo][e] + h11 * mb;
      });
    };
    const fovEm = (t) => { let i = 0; while (i < K.length - 1 && K[i + 1].t < t) i++; const a = K[i], b = K[Math.min(K.length - 1, i + 1)]; return mistura(a.fov, b.fov, b.t > a.t ? suave(trecho(t, a.t, b.t)) : 0); };
    const tremor = H.tremor ?? 0.04;
    const poeCamera = (cam, t) => {
      const p = interp(t, 'pos'), o = interp(t, 'olha');
      cam.position.set(p[0] + tremor * ruido(t * 1.3, 3), p[1] + tremor * ruido(t * 1.1, 5), p[2] + tremor * ruido(t * 0.9, 7));
      cam.lookAt(o[0], o[1], o[2]);
      cam.rotateZ(0.012 * ruido(t * 0.7, 11));
      cam.fov = fovEm(t); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    };
    const camAntes = new THREE.PerspectiveCamera(50, L / A, 0.1, 3000);

    // =================== título (desenhado uma vez; a pós-produção põe por cima) ===================
    const TIT = peca('titulo');
    const cvT = document.createElement('canvas'); cvT.width = L; cvT.height = A;
    {
      const x = cvT.getContext('2d'), u = escala;
      const g = x.createLinearGradient(0, A * 0.62, 0, A); g.addColorStop(0, 'rgba(4,4,12,0)'); g.addColorStop(1, 'rgba(4,4,12,0.78)');
      x.fillStyle = g; x.fillRect(0, A * 0.62, L, A * 0.38);
      x.font = `700 ${Math.round(92 * u)}px "DejaVu Sans", Arial, sans-serif`; x.textBaseline = 'alphabetic';
      x.shadowColor = C.neons[0]; x.shadowBlur = 26 * u; x.fillStyle = '#fff4fb';
      x.fillText(String(TIT.texto || ''), 120 * u, A - 130 * u);
      x.shadowBlur = 0; x.fillStyle = C.neons[1]; x.fillRect(122 * u, A - 104 * u, 220 * u, 5 * u);
    }
    const pos = criarPos(render, L, A, F, cvT);

    // =================== desenhar(t) ===================
    const fora = new THREE.Vector3(), ndcA = new THREE.Vector3(), ndcB = new THREE.Vector3(), borrao = new THREE.Vector2();
    const o3 = new THREE.Object3D();
    function desenhar(t) {
      comuns.uT.value = t;
      poeCamera(camera, t);
      poeCamera(camAntes, t - 1 / fps);

      // cozinheiro mexe a panela; hologramas acendem e giram
      const [braco, chapeu, cabeca] = luzCarrinho;
      braco.rotation.z = 0.25 * Math.sin(t * 5.2); braco.rotation.y = 0.35 * Math.sin(t * 2.6);
      cabeca.rotation.y = chapeu.rotation.y = 0.2 * Math.sin(t * 0.9);
      for (const h of holos) {
        h.m.uniforms.uLiga.value = suave(trecho(t, h.p.t ?? 0, (h.p.t ?? 0) + 0.6)) * (0.85 + 0.15 * Math.sin(t * 9 + h.p.x));
        h.malha.rotation.z = (h.p.gira ?? 0) * t;
      }
      // vapor
      for (const f of fumacas) {
        const vida = ((t * 0.32 + f.i / f.quantas) % 1 + 1) % 1;
        f.m.position.set(f.base.x + 0.25 * f.tam * Math.sin(vida * 5 + f.f) + vida * 0.6, f.base.y + vida * f.sobe, f.base.z + 0.2 * f.tam * Math.cos(vida * 4 + f.f));
        f.m.scale.setScalar(f.tam * (0.5 + 1.6 * vida)); f.m.material.opacity = f.op * Math.sin(Math.PI * vida);
      }
      // carros voadores
      carros.forEach((c, i) => {
        const span = 2 * CID.raio, s = ((c.ini + c.vel * t) % span + span) % span - CID.raio;
        if (c.eixo === 'x') { o3.position.set(s, c.alt, c.desl); o3.rotation.set(0, c.vel > 0 ? Math.PI / 2 : -Math.PI / 2, 0); }
        else { o3.position.set(c.desl, c.alt, s); o3.rotation.set(0, c.vel > 0 ? 0 : Math.PI, 0); }
        o3.scale.setScalar(1); o3.updateMatrix(); malhaCarros.setMatrixAt(i, o3.matrix);
      });
      malhaCarros.instanceMatrix.needsUpdate = true;
      // chuva: cada gota tem lugar fixo na caixa; cai com t; a caixa segue a câmera
      const pc = geoChuva.attributes.position.array, cp = camera.position, B = CH.caixa, vq = CH.velocidade, vento = CH.vento, comp = CH.comprimento;
      for (let i = 0; i < gotas.length; i++) {
        const g = gotas[i];
        const y = cp.y + B / 2 - ((((g.y * B + t * vq * g.v - cp.y) % B) + B) % B);
        const x = cp.x - B / 2 + ((((g.x * B + vento[0] * t * vq - cp.x) % B) + B) % B);
        const z = cp.z - B / 2 + ((((g.z * B + vento[2] * t * vq - cp.z) % B) + B) % B);
        const j = i * 6;
        pc[j] = x; pc[j + 1] = y; pc[j + 2] = z;
        pc[j + 3] = x - vento[0] * comp; pc[j + 4] = y + comp; pc[j + 5] = z - vento[2] * comp;
      }
      geoChuva.attributes.position.needsUpdate = true;

      // 1) reflexo da rua: a cidade de cabeça para baixo, em meia resolução, só quando a rua aparece
      const temReflexo = camera.position.y < (RUA.reflexoAte ?? 16);
      matRua.uniforms.uTemReflexo.value = temReflexo ? 1 : 0;
      if (temReflexo) {
        mundo.scale.y = -1; mundo.updateMatrixWorld(true); rua.visible = false; chuva.visible = false;
        camReal.set(camera.position.x, -camera.position.y, camera.position.z);
        render.setRenderTarget(reflexo); render.clear(); render.render(cena, camera);
        mundo.scale.y = 1; mundo.updateMatrixWorld(true); rua.visible = true; chuva.visible = true;
      }
      // 2) a cena em HDR
      camReal.copy(camera.position);
      render.setRenderTarget(pos.cena); render.clear(); render.render(cena, camera);

      // 3) borrão de movimento: um ponto à frente da câmera, visto em t e em t - 1/fps
      camera.getWorldDirection(fora); fora.multiplyScalar(F.distBorrao).add(camera.position);
      ndcA.copy(fora).project(camera); ndcB.copy(fora).project(camAntes);
      borrao.set((ndcA.x - ndcB.x) * 0.5, (ndcA.y - ndcB.y) * 0.5).multiplyScalar(F.borrao);
      if (borrao.length() > 0.03) borrao.setLength(0.03);
      const apaga = Math.max(1 - suave(trecho(t, 0, H.acende ?? 0.5)), suave(trecho(t, duracao - (H.apaga ?? 0.6), duracao)));
      const titulo = TIT.texto ? suave(trecho(t, TIT.t, TIT.t + 0.5)) * (1 - suave(trecho(t, TIT.t + TIT.dur - 0.5, TIT.t + TIT.dur))) : 0;
      pos.aplicar({ t, frame: Math.round(t * fps), borrao, apaga, titulo });
    }

    // =================== som: chuva, sintetizadores longos, vapor, carros e o grave da revelação ===================
    function som() {
      const s = Som.criar(duracao, H.semente), M = H.musica, T = H.tempos, r = sorteio(H.semente + 9);
      s.vento(0, duracao, { vol: 0.09, corte: 5200, onda: 0.15, profundidade: 0.25, entra: 0.3 });   // chuva fina
      s.vento(0, duracao, { vol: 0.06, corte: 900, onda: 0.1, profundidade: 0.3, entra: 0.3 });      // chuva grossa no chão
      for (let t = 0.2; t < T.sobe; t += 0.05 + r() * 0.12) s.toque(t, { vol: 0.02 + 0.03 * r(), corte: 4000 + 3000 * r(), dur: 0.02, pan: r() * 2 - 1 }); // pingos no toldo
      s.vento(0.3, T.sobe + 0.6, { vol: 0.05, corte: 7000, onda: 0.6, profundidade: 0.5, entra: 0.6, sai: 0.8 });  // chiado do vapor
      s.sino('A5', 1.4, 0.8, { vol: 0.05, pan: -0.4, brilho: 3 }); s.sino('E6', 1.62, 0.7, { vol: 0.035, pan: -0.4, brilho: 3 }); // concha na tigela
      // subida: um sopro que cresce
      s.vento(T.sobe, T.revela - T.sobe + 0.6, { vol: 0.12, corte: 1800, onda: 0.9, profundidade: 0.4, entra: 1.6, sai: 0.5 });
      // pad: acordes longos com serra suave (dois osciladores levemente desafinados)
      const p = M.passo;
      M.acordes.forEach((ac, i) => ac.forEach((n, k) => {
        const t0 = 0.2 + i * p;
        if (t0 > duracao) return;
        s.nota(n, t0, p + 0.2, { forma: 'serra', vol: 0.028, ataque: 0.9, solta: 1.2, pan: (k % 2 ? 0.4 : -0.4) });
        s.nota(Som.freq(n) * 1.004, t0, p + 0.2, { forma: 'tri', vol: 0.03, ataque: 1.0, solta: 1.2, pan: (k % 2 ? -0.3 : 0.3), vibrato: 0.002 });
      }));
      // o grave que cresce na revelação
      s.nota(M.grave, T.revela - 1.2, duracao - T.revela + 0.4, { forma: 'serra', vol: 0.16, ataque: 1.6, solta: 1.2 });
      s.nota(Som.freq(M.grave) / 2, T.revela - 1.0, duracao - T.revela + 0.4, { forma: 'seno', vol: 0.3, ataque: 1.4, solta: 1.2 });
      s.batida(T.revela, { vol: 0.5, freq: 60, dur: 0.9 });
      // brilho da revelação: arpejo de sinos
      M.arpejo.forEach((n, i) => s.sino(n, T.revela + 0.15 + i * 0.16, 1.6, { vol: 0.05, pan: i % 2 ? 0.5 : -0.5, brilho: 2.6 }));
      // carros voadores passando (chiado curto que cruza da esquerda para a direita)
      for (const [t0, lado] of M.passagens) {
        s.vento(t0, 1.2, { vol: 0.07, corte: 2600, onda: 0.8, profundidade: 0.2, entra: 0.5, sai: 0.6 });
        s.toque(t0 + 0.55, { vol: 0.03, corte: 1500, dur: 0.3, pan: lado });
      }
      s.sala(0.75);
      return s.fim({ entra: 0.4, sai: 0.8 });
    }

    return { desenhar, som };
  },
});
