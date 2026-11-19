// MOTOR "desenho-3d" — desenho animado em 3D, vertical (1080x1920).
// Bonecos chapados de cartaz (contorno ameixa, olhos grandes brancos, piscam) dentro de um mundo 3D
// de formas simples com luz de duas cores duras; depois, um passe de nanquim nas bordas de
// profundidade, fundo desfocado nos planos fechados, sombra fria, luz quente e vinheta.
// Um plano por batida, câmera que desliza devagar e se aproxima, cortes secos, clarão branco depois
// do gancho e um tranco de câmera em cada pancada. A narração da fonte vira LEGENDA (sem voz), com
// música e sons feitos em código nos mesmos tempos.
// O que muda de um filme para outro fica em historia.json (cenário, modelos, elenco, planos, câmera,
// legendas, rótulos, música, sons). Este arquivo não muda e não sabe de nenhuma história.
import * as THREE from '../../../vendor/three/three.module.js';
import { criarAtelie } from './boneco.js';
import { criarCatalogo, chave, h } from './pecas.js';
import { criarHud, confereTextos } from './hud.js';
import { criarAcabamento } from './acabamento.js';
import { montarSom } from './trilha.js';

THREE.ColorManagement.enabled = false;   // a cor da história vai como está, sem conversão
const { mistura, trecho, suave } = Filme;
const RAD = Math.PI / 180;
const liso = (k) => k * k * k * (k * (k * 6 - 15) + 10);

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 20,
  montar({ historia: H, tela, largura: L, altura: A, duracao, fps }) {
    const PL = H.planos;
    // ---------- conferências antes de tudo ----------
    const textos = [...(H.legendas || []).map((l) => l.texto), ...(H.rotulos || []).filter((r) => r.texto).map((r) => r.texto)];
    const varre = (lista) => { for (const p of lista || []) { if (p.tipo === 'simbolo') textos.push(p.texto); if (p.molde) varre([p.molde]); } };
    PL.forEach((p) => varre(p.pecas)); Object.values(H.cenarios || {}).forEach(varre);
    confereTextos(textos, H.legendas);
    PL.forEach((p, i) => { if (i && Math.abs(p.de - PL[i - 1].ate) > 1e-6) throw new Error(`plano ${i} não começa onde o anterior acaba`); });

    // ---------- fotógrafo ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    const PERTO = 0.1, LONGE = 700;
    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, L / A, PERTO, LONGE);

    // céu: degradê do horizonte ao alto, numa esfera grande
    const uCeu = { uTopo: { value: new THREE.Color() }, uHoriz: { value: new THREE.Color() }, uBaixo: { value: 0.0 } };
    const ceu = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
      uniforms: uCeu, side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: 'uniform vec3 uTopo, uHoriz; varying vec3 vD; void main(){ float k = smoothstep(-0.02, 0.45, vD.y); gl_FragColor = vec4(mix(uHoriz, uTopo, k), 1.0); }',
    }));
    ceu.frustumCulled = false; ceu.renderOrder = -10; cena.add(ceu);
    const hemi = new THREE.HemisphereLight('#ffffff', '#555555', 1.2); cena.add(hemi);
    const sol = new THREE.DirectionalLight('#ffffff', 2.2); cena.add(sol); cena.add(sol.target);

    // ---------- peças de cada plano ----------
    const atelie = criarAtelie(THREE);
    const cat = criarCatalogo(H, atelie);
    const planos = PL.map((P, i) => {
      const grupo = new THREE.Group(); grupo.visible = false; cena.add(grupo);
      const ctx = { H, plano: P, grupo, semente: (H.semente || 1) * 1000 + i * 37, chao: null };
      const lista = [];
      for (const nome of [].concat(P.cenario || [])) { if (!(H.cenarios || {})[nome]) throw new Error('cenário desconhecido: ' + nome); lista.push(...H.cenarios[nome]); }
      lista.push(...(P.pecas || []));
      const feitas = [];
      // o chão primeiro: as outras peças pisam nele
      lista.filter((p) => p.tipo === 'chao').forEach((p) => { const m = cat.construir(p, ctx); ctx.chao = m.chao; grupo.add(m.obj); feitas.push(m); });
      lista.filter((p) => p.tipo !== 'chao').forEach((p, j) => { ctx.semente = (H.semente || 1) * 1000 + i * 37 + j * 7; const m = cat.construir(p, ctx); grupo.add(m.obj); feitas.push(m); });
      return { P, grupo, feitas, ctx };
    });
    const planoEm = (t) => { let i = 0; PL.forEach((p, j) => { if (t >= p.de) i = j; }); return i; };

    // ---------- câmera: chaves dentro do plano, deslizar macio ----------
    function chavesCam(P) {
      const C = P.camera;
      if (C.chaves) return C.chaves;
      return [Object.assign({ t: P.de }, C.de), Object.assign({ t: P.ate }, C.ate || C.de)];
    }
    const camPlano = PL.map(chavesCam);
    const chutes = (H.chutes || []).map((c) => (typeof c === 'number' ? { t: c, forca: 1 } : c));
    function poeCamera(t, i) {
      const K = camPlano[i];
      let a = K[0], b = K[K.length - 1], k = 0;
      if (t <= K[0].t) { a = b = K[0]; } else if (t >= K[K.length - 1].t) { a = b = K[K.length - 1]; }
      else for (let j = 1; j < K.length; j++) if (t < K[j].t) { a = K[j - 1]; b = K[j]; k = liso((t - a.t) / (b.t - a.t)); break; }
      const mix3 = (u, v) => [mistura(u[0], v[0], k), mistura(u[1], v[1], k), mistura(u[2], v[2], k)];
      const pos = mix3(a.pos, b.pos || a.pos), alvo = mix3(a.alvo, b.alvo || a.alvo);
      let rolo = mistura(a.rolo || 0, b.rolo ?? a.rolo ?? 0, k);
      const fov = mistura(a.fov || 40, b.fov || a.fov || 40, k);
      // tranco de câmera: 7 quadros que morrem
      let dy = 0;
      for (const c of chutes) { const d = t - c.t; if (d >= 0 && d < 7 / 30) { const q = Math.pow(1 - d / (7 / 30), 2) * (c.forca || 1); rolo += q * 2.5 * Math.cos(d * 55); dy += q * 0.06 * Math.sin(d * 70); } }
      for (const T of H.tremores || []) { const d = t - T.t; if (d >= 0 && d < T.quadros / 30) { const f = Math.floor(d * 30); rolo += (h(f, 5) - 0.5) * T.forca * 0.25; dy += (h(f, 6) - 0.5) * T.forca * 0.004; pos[0] += (h(f, 7) - 0.5) * T.forca * 0.004; } }
      camera.position.set(pos[0], pos[1] + dy, pos[2]);
      camera.up.set(0, 1, 0); camera.lookAt(alvo[0], alvo[1] + dy, alvo[2]);
      camera.rotateZ(rolo * RAD);
      camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      return Math.hypot(pos[0] - alvo[0], pos[1] - alvo[1], pos[2] - alvo[2]);
    }
    const v3 = new THREE.Vector3();
    const proj = (p) => { v3.set(p[0], p[1], p[2]).project(camera); return [(v3.x * 0.5 + 0.5) * L, (0.5 - v3.y * 0.5) * A]; };

    // ---------- letreiro e acabamento ----------
    const hudCv = document.createElement('canvas'); hudCv.width = L; hudCv.height = A;
    const hud = criarHud(hudCv.getContext('2d'), L, A, H);
    const acab = criarAcabamento(render, L, A, hudCv, PERTO, LONGE);
    const V = H.visual || {};
    acab.u.uVinheta.value = V.vinheta ?? 0.35; acab.u.uSat.value = V.saturacao ?? 1.08;
    acab.u.uFrio.value = V.frio ?? 0.1; acab.u.uQuente.value = V.quente ?? 0.06;
    if (V.tinta) acab.u.uTinta.value.set(V.tinta);

    function desenhar(t) {
      const i = planoEm(t), Q = planos[i], P = Q.P;
      planos.forEach((q, j) => { q.grupo.visible = j === i; });
      const dist = poeCamera(t, i);
      // céu (pode piscar entre dois céus: dia e noite passando)
      const C = P.ceu || {};
      let topo = C.topo || '#4f8fdc', horiz = C.horiz || '#d8e6f2';
      if (C.pisca && t >= C.pisca.de && t < C.pisca.ate) { if (Math.floor((t - C.pisca.de) * C.pisca.hz * 2) % 2) { topo = C.pisca.topo; horiz = C.pisca.horiz; } }
      if (C.muda) { const m = C.muda; const k = suave(trecho(t, m.de, m.ate)); topo = Filme.hex(topo, m.topo, k); horiz = Filme.hex(horiz, m.horiz, k); }
      uCeu.uTopo.value.set(topo); uCeu.uHoriz.value.set(horiz);
      ceu.position.copy(camera.position);
      // luz
      const Lz = P.luz || {};
      let forcaSol = Lz.forca ?? 2.2;
      if (Lz.muda) forcaSol = mistura(forcaSol, Lz.muda.forca, suave(trecho(t, Lz.muda.de, Lz.muda.ate)));
      sol.color.set(Lz.sol || '#fff4dc'); sol.intensity = forcaSol;
      const d = Lz.dir || [0.5, 1, 0.7]; sol.position.set(camera.position.x + d[0] * 50, d[1] * 50, camera.position.z + d[2] * 50); sol.target.position.set(camera.position.x, 0, camera.position.z);
      hemi.color.set(Lz.ceu || '#dfe9ff'); hemi.groundColor.set(Lz.chao || '#6f6a5a'); hemi.intensity = Lz.ambiente ?? 1.2;
      cena.fog = P.neblina ? new THREE.Fog(P.neblina.cor || horiz, P.neblina.perto, P.neblina.longe) : null;
      // desfoque de fundo nos planos fechados
      acab.u.uDesf.value = P.desfoque ? (P.desfoque.forca ?? 10) : 0;
      acab.u.uFoco.value = P.desfoque && P.desfoque.foco ? P.desfoque.foco : dist;
      // peças
      let linhas = [];
      for (const m of Q.feitas) { m.atualiza(t, camera); if (m.linhas) linhas = linhas.concat(m.linhas(t, camera, L, A, proj)); }
      hud.desenhar(t, linhas);
      acab.compor(cena, camera);
    }

    return { desenhar, som: () => montarSom(H, duracao) };
  },
});
