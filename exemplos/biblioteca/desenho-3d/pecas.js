// pecas.js — o catálogo de peças do desenho-3d. Tudo genérico: a história diz qual peça, onde, de
// que cor e quando; o catálogo só sabe montar e mexer.
//   chao     morros que rolam, piso plano ou xadrez (com manchinhas de textura)
//   modelo   um objeto montado de formas simples (caixa, cilindro, cone, esfera, toro, cúpula...)
//            descrito em "modelos" no historia.json; serve para casa, torre, carro, árvore, bicho
//   boneco   o boneco chapado de cartaz (boneco.js), com cara e braços que mudam por tempo
//   grupo    várias cópias de uma peça (multidão, bando, fileira), com entrada em escadinha,
//            linhas que ligam todos a um ponto, espalhar e voltar
//   enxame   centenas de formas iguais numa malha só (balões, trigo, pipoca, gotas, chuva)
//   helice   a dupla hélice de bolinhas
//   brilho   um clarão macio que pulsa
//   simbolo  letra grande de cartaz ("?", "ZZZ", "!")
//   mapa     um mapa desenhado numa folha, que se pinta por camadas
//   chamas   fogo de cones que tremem
//   aneis    anéis que saem de um ponto e somem (ondas de rádio, onda de choque)
//   luz      uma luz pontual (lanterna, fogo)
// Toda peça aceita: pos, rot (graus), esc, anim {pos, rot, esc: [[t, ...], ...]}, laco (balanço),
// aparece / some (pula para dentro / para fora), tinge [[t, '#cor', k]], sombra (raio da sombra oval).
import * as THREE from '../../../vendor/three/three.module.js';
import { salta } from './hud.js';

const { limita, mistura, trecho, suave } = Filme;
const RAD = Math.PI / 180;
const liso = (k) => { k = limita(k); return k * k * k * (k * (k * 6 - 15) + 10); };   // smootherstep

// sorteio sem memória: o mesmo par dá sempre o mesmo número (0 a 1)
export function h(a, b = 0) {
  let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return (v >>> 0) / 4294967296;
}

// valor em chaves [[t, a, b, c], ...] — curva macia entre uma chave e a outra
export function chave(lista, t, reta) {
  if (!lista || !lista.length) return null;
  if (t <= lista[0][0]) return lista[0].slice(1);
  for (let i = 1; i < lista.length; i++) {
    if (t < lista[i][0]) {
      const a = lista[i - 1], b = lista[i], k = (t - a[0]) / (b[0] - a[0]), q = reta ? k : liso(k);
      return a.slice(1).map((v, j) => (typeof v === 'number' ? mistura(v, b[j + 1], q) : (q < 0.5 ? v : b[j + 1])));
    }
  }
  return lista[lista.length - 1].slice(1);
}

export function criarCatalogo(H, atelie) {
  // ---------- materiais ----------
  const rampa = new THREE.DataTexture(new Uint8Array([120, 255]), 2, 1, THREE.RedFormat);
  rampa.minFilter = rampa.magFilter = THREE.NearestFilter; rampa.needsUpdate = true;
  const toon = (cor, o = {}) => (o.basica
    ? new THREE.MeshBasicMaterial({ color: cor, side: o.dupla ? THREE.DoubleSide : THREE.FrontSide, wireframe: !!o.arame, transparent: !!o.transparente, opacity: o.opacidade ?? 1, depthWrite: !o.transparente })
    : new THREE.MeshToonMaterial({ color: cor, gradientMap: rampa, side: o.dupla ? THREE.DoubleSide : THREE.FrontSide, emissive: o.brilho || '#000000' }));

  // ---------- formas simples ----------
  const geoGuardada = new Map();
  function geometria(forma, tam) {
    const chaveG = forma + ':' + JSON.stringify(tam);
    if (geoGuardada.has(chaveG)) return geoGuardada.get(chaveG);
    let g;
    const T = Array.isArray(tam) ? tam : [tam];
    switch (forma) {
      case 'caixa': g = new THREE.BoxGeometry(T[0], T[1] ?? T[0], T[2] ?? T[0]); break;
      case 'cilindro': g = T.length >= 3 ? new THREE.CylinderGeometry(T[0], T[1], T[2], 18) : new THREE.CylinderGeometry(T[0], T[0], T[1] ?? 1, 18); break;
      case 'cone': g = new THREE.ConeGeometry(T[0], T[1] ?? 1, T[2] ?? 14); break;
      case 'esfera': g = new THREE.SphereGeometry(1, 18, 12); g.scale(T[0], T[1] ?? T[0], T[2] ?? T[0]); break;
      case 'cupula': g = new THREE.SphereGeometry(T[0], 22, 10, 0, Math.PI * 2, 0, Math.PI / 2); break;
      case 'toro': g = new THREE.TorusGeometry(T[0], T[1] ?? 0.05, 8, 32); break;
      case 'plano': g = new THREE.PlaneGeometry(T[0], T[1] ?? T[0]); break;
      case 'disco': g = new THREE.CircleGeometry(T[0], 28); break;
      case 'capsula': g = new THREE.CapsuleGeometry(T[0], T[1] ?? 1, 6, 12); break;
      case 'prisma': g = new THREE.CylinderGeometry(T[0], T[0], T[1] ?? 1, 3); break;
      case 'telhado': { // telhado de duas águas: prisma deitado
        g = new THREE.CylinderGeometry(T[0], T[0], T[2] ?? 1, 3, 1); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2); g.scale(1, (T[1] ?? 1) / T[0], 1); break;
      }
      case 'arcos': { // fileira de colunas em volta de um anel (galeria de torre)
        const R = T[0], n = T[2] ?? 14, gs = [];
        g = new THREE.CylinderGeometry(R * 0.07, R * 0.07, T[1] ?? 1, 8);
        const base = g; const pos = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const c = base.clone(); c.translate(Math.cos(a) * R, 0, Math.sin(a) * R); pos.push(c); }
        g = mergeGeos(pos); break;
      }
      default: throw new Error('forma desconhecida: ' + forma);
    }
    geoGuardada.set(chaveG, g);
    return g;
  }
  function mergeGeos(lista) {
    let total = 0, totalI = 0; for (const g of lista) { total += g.attributes.position.count; totalI += g.index ? g.index.count : 0; }
    const P = new Float32Array(total * 3), N = new Float32Array(total * 3), I = []; let o = 0;
    for (const g of lista) {
      P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
      if (g.index) for (const v of g.index.array) I.push(v + o);
      o += g.attributes.position.count;
    }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setIndex(I);
    return m;
  }

  // ---------- modelo feito de partes ----------
  function corDe(cor, cores) { if (typeof cor === 'string' && cor.startsWith('$')) { const n = cor.slice(1); if (!cores || !cores[n]) throw new Error('falta a cor "' + n + '" na peça'); return cores[n]; } return cor || '#cccccc'; }
  function montaParte(pt, cores, lacos) {
    const g = new THREE.Group();
    if (pt.forma) {
      const m = new THREE.Mesh(geometria(pt.forma, pt.tam ?? 1), toon(corDe(pt.cor, cores), pt));
      if (pt.forma === 'plano' || pt.forma === 'disco') m.material.side = THREE.DoubleSide;
      g.add(m);
    }
    if (pt.modelo) g.add(montaModelo(pt.modelo, Object.assign({}, cores, pt.cores || {}), lacos));
    if (pt.pos) g.position.set(...pt.pos);
    if (pt.rot) g.rotation.set(pt.rot[0] * RAD, (pt.rot[1] || 0) * RAD, (pt.rot[2] || 0) * RAD);
    if (pt.esc) Array.isArray(pt.esc) ? g.scale.set(...pt.esc) : g.scale.setScalar(pt.esc);
    if (pt.laco) lacos.push({ g, laco: pt.laco, rot0: g.rotation.clone(), pos0: g.position.clone() });
    for (const f of pt.filhos || []) g.add(montaParte(f, cores, lacos));
    return g;
  }
  function montaModelo(nome, cores, lacos) {
    const def = (H.modelos || {})[nome];
    if (!def) throw new Error('modelo desconhecido: ' + nome);
    const g = new THREE.Group();
    for (const pt of def) g.add(montaParte(pt, cores, lacos));
    return g;
  }
  // balanço de partes (pá de moinho girando, pescoço bicando, roda rodando, perna correndo)
  function balanca(lacos, t, semente, forca = 1) {
    for (const L of lacos) {
      for (const l of (Array.isArray(L.laco) ? L.laco : [L.laco])) {
        const fase = (l.fase || 0) + (l.solto ? h(semente, 91) * 6.28 : 0);
        // força por canal: "forcaLaco" vale para todos; "forcas": { canal: [[t, v]...] } só para os lacos daquele canal
        const f = typeof forca === 'function' ? forca(l.canal) : forca;
        const onda = Math.sin(t * (l.hz || 1) * 2 * Math.PI + fase);
        const v = l.gira ? t * l.gira * f : (l.abs ? Math.abs(onda) : onda) * (l.amp || 0.2) * f;
        const ax = l.eixo ?? 0;
        if (l.tipo === 'pos') L.g.position.setComponent(ax, L.pos0.getComponent(ax) + (l.gira ? 0 : v));
        else { const r = ['x', 'y', 'z'][ax]; L.g.rotation[r] = L.rot0[r] + v; }
      }
    }
  }

  // ---------- transformação comum a toda peça ----------
  function transforma(obj, P, t, chao, extra = {}) {
    let pos = (P.anim && P.anim.pos && chave(P.anim.pos, t + (extra.tAnda || 0), P.anim.reta)) || P.pos || [0, 0, 0];
    pos = [pos[0] + (extra.dx || 0), pos[1] + (extra.dy || 0), pos[2] + (extra.dz || 0)];
    const rot = (P.anim && P.anim.rot && chave(P.anim.rot, t)) || P.rot || [0, 0, 0];
    let esc = (P.anim && P.anim.esc && chave(P.anim.esc, t)) || (P.esc != null ? (Array.isArray(P.esc) ? P.esc : [P.esc]) : [1]);
    if (esc.length === 1) esc = [esc[0], esc[0], esc[0]];
    let pop = 1;
    const ap = extra.aparece ?? P.aparece, so = extra.some ?? P.some;
    if (ap != null) pop *= salta(trecho(t, ap, ap + (P.durPop || 0.35)));
    if (so != null) pop *= 1 - suave(trecho(t, so, so + 0.25));
    obj.visible = pop > 0.001;
    const y0 = chao && P.solto !== true ? chao.altura(pos[0], pos[2]) : 0;
    obj.position.set(pos[0], pos[1] + y0, pos[2]);
    obj.rotation.set(rot[0] * RAD, (rot[1] || 0) * RAD + (extra.giraY || 0), (rot[2] || 0) * RAD);
    obj.scale.set(esc[0] * pop, esc[1] * pop, esc[2] * pop);
    return { pos: obj.position, pop, chaoY: y0 };
  }

  // cor que muda com o tempo: guarda as cores de origem e mistura com a cor pedida
  function preparaTinge(obj, P) {
    if (!P.tinge) return null;
    const mats = []; obj.traverse((o) => { if (o.material && o.material.color) mats.push([o.material, o.material.color.clone()]); });
    const alvo = new THREE.Color();
    return (t) => {
      let k = 0, cor = P.tinge[0][1];
      for (const [tt, c, kk, dur] of P.tinge) { if (t >= tt) { cor = c; k = mistura(k, kk, suave(trecho(t, tt, tt + (dur ?? 0.3)))); } }
      alvo.set(cor);
      for (const [m, c0] of mats) m.color.copy(c0).lerp(alvo, k);
    };
  }

  // sombra oval no chão (um disco escuro achatado)
  const matSombra = new THREE.MeshBasicMaterial({ color: '#1d1a2a', transparent: true, opacity: 0.32, depthWrite: false });
  const geoSombra = new THREE.CircleGeometry(1, 24);
  function sombraOval(r) { const m = new THREE.Mesh(geoSombra, matSombra); m.rotation.x = -Math.PI / 2; m.scale.set(r, r * 0.6, 1); m.renderOrder = 1; return m; }

  // ---------- cada tipo de peça ----------
  const tipos = {};

  tipos.chao = (P) => {
    const tam = P.tam || 400, seg = (P.ondas && P.ondas.length) ? 140 : 1;
    const ondas = P.ondas || [];
    const altura = (x, z) => { let y = 0; for (const o of ondas) y += o.amp * Math.sin(x * o.fx + (o.fase || 0)) * Math.cos(z * (o.fz ?? o.fx) + (o.fase2 || 0)); return y + (P.y || 0); };
    const geo = new THREE.PlaneGeometry(tam, tam, seg, seg); geo.rotateX(-Math.PI / 2);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setY(i, altura(pa.getX(i), pa.getZ(i)));
    geo.computeVertexNormals();
    // textura: manchinhas (grama, terra) ou xadrez
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d');
    c.fillStyle = P.cor || '#7cc04a'; c.fillRect(0, 0, 512, 512);
    if (P.forma === 'xadrez') { c.fillStyle = P.cor2; const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) c.fillRect(i * 64, j * 64, 64, 64); }
    else if (P.cor2) { c.fillStyle = P.cor2; for (let i = 0; i < 260; i++) { const x = h(i, 3) * 512, y = h(i, 4) * 512, r = 3 + h(i, 5) * 9; c.beginPath(); c.ellipse(x, y, r * 1.6, r, h(i, 6) * 3, 0, 7); c.fill(); } }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    const rep = P.repete || tam / 6; tx.repeat.set(rep, rep); tx.anisotropy = 8;
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: '#ffffff', map: tx, gradientMap: rampa }));
    return { obj: m, chao: { altura }, atualiza() {} };
  };

  tipos.modelo = (P, ctx) => {
    const lacos = [];
    const obj = montaModelo(P.modelo, P.cores, lacos);
    const tg = preparaTinge(obj, P);
    const semente = ctx.semente;
    let som = null; if (P.sombra) { som = sombraOval(P.sombra); ctx.grupo.add(som); }
    return {
      obj, atualiza(t, cam, extra) {
        const r = transforma(obj, P, t, ctx.chao, extra);
        const geral = P.forcaLaco != null ? (chave(P.forcaLaco, t) || [1])[0] : 1;
        balanca(lacos, t + (extra && extra.fase || 0), semente, (canal) => (canal && P.forcas && P.forcas[canal] ? chave(P.forcas[canal], t)[0] : geral));
        if (tg) tg(t);
        if (som) { som.visible = obj.visible; som.position.set(r.pos.x, (ctx.chao ? ctx.chao.altura(r.pos.x, r.pos.z) : 0) + 0.02, r.pos.z); const s = (P.sombra) * r.pop; som.scale.set(s, s * 0.6, 1); }
      },
    };
  };

  // estado do boneco num tempo: a última chave antes de t
  function estadoEm(lista, t) { let e = lista && lista[0]; for (const k of lista || []) if (t >= k[0]) e = k; return e; }
  const MEXEM = new Set(['acena', 'abana', 'martela', 'alto']);
  tipos.boneco = (P, ctx) => {
    const jeito = typeof P.quem === 'string' ? (H.elenco || {})[P.quem] : P.quem;
    if (!jeito) throw new Error('boneco sem jeito: ' + JSON.stringify(P.quem));
    const id = typeof P.quem === 'string' ? P.quem : JSON.stringify(P.quem);
    const alt = (jeito.alt || 1) * (P.tam || 1) * 1.7;
    const mat = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(alt / 2, alt), mat); plano.position.y = alt / 2 - alt * 0.012;
    const obj = new THREE.Group(); obj.add(plano);
    const som = sombraOval(alt * 0.22); ctx.grupo.add(som);
    const semente = (ctx.semente * 131 + 7) | 0;
    const efeitos = P.efeitos || {};
    return {
      obj, alt, atualiza(t, cam, extra = {}) {
        const te = t + (extra.atraso || 0);
        const e = estadoEm(extra.estados || P.estados, te) || [0, 'neutro', 'lado'];
        const st = { cara: e[1] || 'neutro', bracos: e[2] || 'lado', objeto: e[3] || P.objeto || 'nenhum' };
        st.quadro = MEXEM.has(st.bracos) ? Math.floor(te * 5 + h(semente, 2) * 2) % 2 : 0;
        const ciclo = 2.6 + h(semente, 3) * 2, fase = ((te + h(semente, 4) * ciclo) % ciclo);
        st.olho = fase < 0.1 ? 0 : 1;
        for (const nome of ['dourado', 'fuligem', 'curativo', 'gema']) st[nome] = efeitos[nome] != null && te >= efeitos[nome];
        st.montado = !!efeitos.montado;
        mat.map = atelie.textura(jeito, id, st);
        mat.color.set(ctx.plano.luzBoneco || '#ffffff');
        // pulinho em cada troca de estado; pulos pedidos
        const troca = e[0], kk = trecho(te, troca, troca + 0.18);
        let pulo = 0; for (const tp of P.pulos || []) pulo = Math.max(pulo, Math.sin(Math.PI * trecho(t, tp, tp + 0.45)) * alt * 0.25);
        const respira = 1 + 0.012 * Math.sin(te * 2.4 + h(semente, 5) * 6);
        const r = transforma(obj, P, t, ctx.chao, extra);
        obj.position.y += pulo;
        obj.scale.y *= respira * (1 + 0.08 * Math.sin(Math.PI * kk) * (troca > 0 ? 1 : 0));
        const px = obj.position.x + (extra.pai ? extra.pai.x : 0), pz = obj.position.z + (extra.pai ? extra.pai.z : 0);
        obj.rotation.set(0, Math.atan2(cam.position.x - px, cam.position.z - pz) - (extra.paiGiro || 0), (extra.inclina || 0));
        som.visible = obj.visible && !extra.pai; som.position.set(obj.position.x, r.chaoY + 0.02, obj.position.z);
        const s = alt * 0.22 * r.pop * (1 - 0.3 * pulo / alt); som.scale.set(s, s * 0.6, 1);
      },
    };
  };

  tipos.grupo = (P, ctx) => {
    const obj = new THREE.Group();
    const A = P.arranjo || { tipo: 'linha', de: [-2, 0, 0], ate: [2, 0, 0] };
    const n = P.n || 10, membros = [];
    for (let i = 0; i < n; i++) {
      let p;
      if (A.tipo === 'fileiras') { const col = A.colunas || 10, li = Math.floor(i / col), co = i % col, larg = (col - 1) * A.dx; p = [A.centro[0] - larg / 2 + co * A.dx + (li % 2) * A.dx * 0.5 * (A.desloca === false ? 0 : 1) + (h(i, 7) - 0.5) * (A.solta || 0), A.centro[1], A.centro[2] - li * A.dz + (h(i, 8) - 0.5) * (A.solta || 0)]; }
      else if (A.tipo === 'area') { p = [A.centro[0] + (h(i + (A.semente || 0), 1) - 0.5) * A.tam[0], A.centro[1], A.centro[2] + (h(i + (A.semente || 0), 2) - 0.5) * A.tam[1]]; }
      else if (A.tipo === 'anel') { const a = (A.de ?? 0) * RAD + i / n * ((A.arco ?? 360) * RAD); p = [A.centro[0] + Math.cos(a) * A.raio, A.centro[1], A.centro[2] + Math.sin(a) * A.raio]; }
      else { const k = n > 1 ? i / (n - 1) : 0.5; p = [mistura(A.de[0], A.ate[0], k), mistura(A.de[1], A.ate[1], k), mistura(A.de[2], A.ate[2], k)]; }
      const molde = Object.assign({}, P.molde, { pos: p });
      if (P.jeitos && molde.tipo === 'boneco') molde.quem = P.jeitos[(P.jeitosOrdem === 'sorteio' ? Math.floor(h(i, 11) * P.jeitos.length) : i % P.jeitos.length)];
      if (P.coresLista && molde.tipo === 'modelo') molde.cores = P.coresLista[Math.floor(h(i, 12) * P.coresLista.length)];
      if (P.trocas && P.trocas[i]) Object.assign(molde, P.trocas[i]);
      const sub = { ...ctx, semente: ctx.semente * 977 + i * 31 + 1, grupo: ctx.grupo };
      const m = construir(molde, sub);
      obj.add(m.obj); membros.push({ m, p, i });
    }
    const cx = P.espalhaDe || (A.centro || [0, 0, 0]);
    return {
      obj, membros, atualiza(t, cam) {
        for (const { m, p, i } of membros) {
          const extra = {};
          if (P.aparece) extra.aparece = P.aparece.de + (P.aparece.ate - P.aparece.de) * (P.aparece.ordem === 'sorteio' ? h(i, 21) : i / Math.max(1, n - 1));
          if (P.some) extra.some = P.some.de + (P.some.ate - P.some.de) * h(i, 22);
          if (P.atraso) extra.atraso = -h(i, 23) * P.atraso;
          extra.fase = h(i, 24) * 10;
          // espalhar a partir do centro e voltar
          const esp = P.espalha ? chave(P.espalha, t - h(i, 25) * (P.espalhaSolto || 0))[0] : 0;
          if (esp) { const dx = p[0] - cx[0], dz = p[2] - cx[2], d = Math.hypot(dx, dz) || 1, ang = Math.atan2(dz, dx) + (h(i, 26) - 0.5) * 0.8; extra.dx = Math.cos(ang) * esp * (0.6 + 0.8 * h(i, 27)); extra.dz = Math.sin(ang) * esp * (0.6 + 0.8 * h(i, 27)); if (P.olhaFuga) extra.giraY = -ang + Math.PI / 2; }
          const zz = P.zigue ? chave(P.zigue, t)[0] : 0;
          if (zz) { extra.dx = (extra.dx || 0) + Filme.ruido(t * 3 + i * 7.1, 41) * zz; extra.dz = (extra.dz || 0) + Filme.ruido(t * 3 + i * 3.3, 42) * zz; }
          if (P.estados) extra.estados = P.estados;
          if (P.estadosLista) extra.estados = P.estadosLista[Math.floor(h(i, 13) * P.estadosLista.length)];
          // molde que anda (anim.pos): cada um anda com o seu desvio do centro
          if (P.molde.anim && P.molde.anim.pos) { extra.dx = (extra.dx || 0) + p[0] - cx[0]; extra.dy = (extra.dy || 0) + p[1] - cx[1]; extra.dz = (extra.dz || 0) + p[2] - cx[2]; if (P.atrasoAnda) extra.tAnda = -h(i, 29) * P.atrasoAnda; }
          m.atualiza(t, cam, extra);
        }
      },
      // pontos na tela para as linhas que ligam todos a um ponto
      linhas(t, cam, L, A, proj) {
        const Lg = P.liga; if (!Lg || t < Lg.de || t > (Lg.apaga ?? Lg.ate + 0.6)) return [];
        const alvo = proj(Lg.para), out = [];
        for (const { m, i } of membros) {
          if (!m.obj.visible) continue;
          const v = m.obj.position.clone(); v.y += (m.alt || 1) * 0.7;
          const s = proj([v.x, v.y, v.z]);
          const k = suave(trecho(t, Lg.de + h(i, 28) * (Lg.ate - Lg.de) * 0.5, Lg.ate));
          out.push([s[0], s[1], alvo[0], alvo[1], k, 1]);
        }
        return out;
      },
    };
  };

  // amostra de um formato (onde cada item do enxame fica)
  function amostra(F, i, j) {
    const a = h(i, 100 + j * 3), b = h(i, 101 + j * 3), c = h(i, 102 + j * 3);
    if (F.tipo === 'esfera' || F.tipo === 'cupula') {
      const th = a * Math.PI * 2, ph = Math.acos(F.tipo === 'cupula' ? 1 - b : 1 - 2 * b), r = F.r * Math.cbrt(F.oca ? 0.8 + 0.2 * c : c);
      const ry = F.ry ?? F.r;
      return [F.c[0] + r * Math.sin(ph) * Math.cos(th), F.c[1] + (ry / F.r) * r * Math.cos(ph), F.c[2] + r * Math.sin(ph) * Math.sin(th)];
    }
    if (F.tipo === 'disco') { const th = a * Math.PI * 2, r = F.r * Math.sqrt(b); return [F.c[0] + r * Math.cos(th), F.c[1] + (c - 0.5) * (F.alt || 0), F.c[2] + r * Math.sin(th)]; }
    // caixa
    return [F.c[0] + (a - 0.5) * F.tam[0], F.c[1] + (b - 0.5) * (F.tam[1] || 0), F.c[2] + (c - 0.5) * F.tam[2]];
  }
  tipos.enxame = (P, ctx) => {
    const n = P.n || 100;
    const geo = geometria(P.forma || 'esfera', P.tam || 0.3);
    const mat = toon('#ffffff', P);
    const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false;
    const cores = P.cores || ['#ffffff'], col = new THREE.Color();
    for (let i = 0; i < n; i++) im.setColorAt(i, col.set(cores[Math.floor(h(i, 50) * cores.length)]));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const formas = P.formas || [{ tipo: 'caixa', c: [0, 0, 0], tam: [4, 0, 4] }];
    const chao = ctx.chao;
    const obj = new THREE.Group(); obj.add(im);
    let feito = -1;
    return {
      obj, atualiza(t) {
        const parado = !P.trocas && !P.movimento && !P.boia && !P.estoura && !P.aparece && !P.some && !P.anim;
        if (parado && feito >= 0) return;
        feito = t;
        const r = transforma(obj, Object.assign({}, P, { solto: true }), t, null);
        if (!obj.visible) return;
        for (let i = 0; i < n; i++) {
          let p = amostra(formas[0], i, 0);
          for (const [t0, j, dur] of P.trocas || []) {
            const atraso = h(i, 60 + j) * (P.solto ?? 0.6) * dur;
            const k = liso(trecho(t, t0 + atraso, t0 + atraso + dur));
            if (k > 0) { const b = amostra(formas[j], i, j); p = [mistura(p[0], b[0], k), mistura(p[1], b[1], k), mistura(p[2], b[2], k)]; }
          }
          let sc = (P.escala ? mistura(P.escala[0], P.escala[1], h(i, 70)) : 1);
          if (P.movimento === 'cai' || P.movimento === 'sobe') {
            const alt = P.altura || 10, vel = (P.vel || 3) * (0.7 + 0.6 * h(i, 71));
            const f = ((t * vel / alt + h(i, 72)) % 1 + 1) % 1;
            p[1] += P.movimento === 'cai' ? alt * (1 - f) : alt * f;
            if (P.movimento === 'sobe' && P.encolhe) sc *= 1 - f;
          }
          if (P.estoura) {
            const E = P.estoura, te = t - (E.t + h(i, 73) * (E.espalha || 0.3));
            if (te < 0) sc *= 0; else {
              const ang = h(i, 74) * Math.PI * 2, sobe = E.vel * (0.6 + 0.6 * h(i, 75)), lado = E.lado * (0.3 + 0.7 * h(i, 76));
              p = [E.de[0] + Math.cos(ang) * lado * te, Math.max(E.chao ?? -99, E.de[1] + sobe * te - 0.5 * (E.gravidade ?? 9) * te * te), E.de[2] + Math.sin(ang) * lado * te];
              sc *= salta(te / 0.15);
            }
          }
          if (P.boia) p[1] += Math.sin(t * 2.2 + h(i, 77) * 6.28) * P.boia;
          if (P.noChao && chao) p[1] += chao.altura(p[0] + r.pos.x, p[2] + r.pos.z);
          if (P.aparecem) sc *= salta(trecho(t, P.aparecem.de + h(i, 78) * (P.aparecem.ate - P.aparecem.de), P.aparecem.de + h(i, 78) * (P.aparecem.ate - P.aparecem.de) + 0.3));
          e.set((P.gira ? h(i, 79) * 6.28 : 0), h(i, 80) * 6.28 * (P.giraY === false ? 0 : 1), 0); q.setFromEuler(e);
          m4.compose(v.set(p[0], p[1], p[2]), q, s.set(sc, sc * (P.estica || 1), sc));
          im.setMatrixAt(i, m4);
        }
        im.instanceMatrix.needsUpdate = true;
      },
    };
  };

  tipos.helice = (P, ctx) => {
    const obj = new THREE.Group(), n = P.n || 12, alt = P.altura || 3, R = P.raio || 0.5, voltas = P.voltas || 1.5;
    const [ca, cb, cd] = P.cores || ['#e8423a', '#3f8fe0', '#f2d43a'];
    const ga = geometria('esfera', [R * 0.32]), gd = geometria('cilindro', [R * 0.09, 1]);
    for (let i = 0; i < n; i++) {
      const y = (i / (n - 1) - 0.5) * alt, a = i / (n - 1) * voltas * Math.PI * 2;
      const A = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R), B = new THREE.Vector3(-Math.cos(a) * R, y, -Math.sin(a) * R);
      const ma = new THREE.Mesh(ga, toon(ca)); ma.position.copy(A); obj.add(ma);
      const mb = new THREE.Mesh(ga, toon(cb)); mb.position.copy(B); obj.add(mb);
      const d = new THREE.Mesh(gd, toon(cd)); d.position.set(0, y, 0); d.scale.y = 2 * R; d.rotation.set(0, -a, Math.PI / 2); obj.add(d);
    }
    const tg = preparaTinge(obj, P);
    const roda = new THREE.Group(); roda.add(obj);
    return { obj: roda, atualiza(t, cam, extra) { transforma(roda, P, t, P.solto === false ? ctx.chao : null, extra); obj.rotation.y = t * (P.gira ?? 1.2); if (tg) tg(t); } };
  };

  // clarão macio (sempre de frente para a câmera)
  const cvB = document.createElement('canvas'); cvB.width = cvB.height = 128;
  { const gb = cvB.getContext('2d'), gr = gb.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gb.fillStyle = gr; gb.fillRect(0, 0, 128, 128); }
  const txBrilho = new THREE.CanvasTexture(cvB);
  tipos.brilho = (P, ctx) => {
    const mat = new THREE.MeshBasicMaterial({ map: txBrilho, color: P.cor || '#fff2b0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: P.naFrente ? false : true });
    const obj = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); obj.renderOrder = 5;
    return {
      obj, atualiza(t, cam, extra) {
        transforma(obj, P, t, P.solto === false ? ctx.chao : null, extra);
        let v = P.pulsa ? chave(P.pulsa, t)[0] : 1;
        if (P.pisca) v *= (t >= P.pisca.de && t < P.pisca.ate && Math.floor((t - P.pisca.de) * P.pisca.hz * 2) % 2 === 0) ? 1 : 0;
        const tam = (P.tam || 2) * (1 + 0.06 * Math.sin(t * 6));
        obj.scale.multiplyScalar(tam); mat.opacity = v; obj.visible = obj.visible && v > 0.01;
        obj.quaternion.copy(cam.quaternion);
      },
    };
  };

  // letra grande de cartaz ("?", "ZZZ", "!")
  tipos.simbolo = (P, ctx) => {
    const cv = document.createElement('canvas'); const tamPx = 200, txt = String(P.texto).toUpperCase();
    const w = Math.ceil(Letras.largura(txt, tamPx) + 120); cv.width = w; cv.height = 320;
    const g = cv.getContext('2d'); g.lineJoin = g.lineCap = 'round';
    for (const [cor, larg] of [['#241726', tamPx * 0.2 + 30], [P.cor || '#f2d43a', tamPx * 0.2]]) {
      let px = 60;
      for (const ch of txt) { const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tamPx; continue; } g.strokeStyle = cor; g.lineWidth = larg; for (const tr of gl.tracos) { g.beginPath(); tr.forEach(([a, b], j) => (j ? g.lineTo(px + a * tamPx, 60 + b * tamPx) : g.moveTo(px + a * tamPx, 60 + b * tamPx))); if (tr.length === 1) g.lineTo(px + tr[0][0] * tamPx + 0.1, 60 + tr[0][1] * tamPx); g.stroke(); } px += (gl.w + 0.2) * tamPx; }
    }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tx, alphaTest: 0.5, side: THREE.DoubleSide });
    const alt = P.tam || 1;
    const obj = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(alt * w / 320, alt), mat); obj.add(m);
    return { obj, atualiza(t, cam, extra) { transforma(obj, Object.assign({ solto: true }, P), t, null, extra); obj.quaternion.copy(cam.quaternion); m.rotation.z = Math.sin(t * 3) * 0.08 * (P.balanca ?? 1); } };
  };

  // mapa pintado numa folha, por camadas
  tipos.mapa = (P, ctx) => {
    const T = 1024, cv = document.createElement('canvas'); cv.width = T; cv.height = Math.round(T * (P.tam[1] / P.tam[0]));
    const g = cv.getContext('2d'), Hh = cv.height;
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.anisotropy = 8;
    const obj = new THREE.Mesh(new THREE.PlaneGeometry(P.tam[0], P.tam[1]), new THREE.MeshToonMaterial({ map: tx, gradientMap: rampa, side: THREE.DoubleSide }));
    const terras = H.terras || {};
    const pj = ([lon, lat]) => [T / 2 + (lon - P.centro[0]) * P.escala, Hh / 2 - (lat - P.centro[1]) * P.escala * (P.achata || 1)];
    const pontos = (p) => (typeof p === 'string' ? terras[p] : p).map(pj);
    let ultimo = -1;
    function caminho(pts, prog = 1) {
      const tot = pts.length * prog; g.beginPath();
      for (let i = 0; i <= Math.floor(tot) && i < pts.length; i++) (i ? g.lineTo(...pts[i]) : g.moveTo(...pts[i]));
      const f = tot - Math.floor(tot), i = Math.floor(tot);
      if (prog < 1 && i + 1 < pts.length) g.lineTo(mistura(pts[i][0], pts[i + 1][0], f), mistura(pts[i][1], pts[i + 1][1], f));
    }
    return {
      obj, atualiza(t, cam, extra) {
        transforma(obj, Object.assign({ solto: true }, P), t, null, extra);
        const tq = Math.round(t * 30);
        if (tq === ultimo) return; ultimo = tq;
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
        g.fillStyle = P.fundo || '#f1e2b8'; g.fillRect(0, 0, T, Hh);
        g.lineJoin = g.lineCap = 'round';
        for (const C of P.camadas || []) {
          if (t < C.de) continue;
          const k = suave(trecho(t, C.de, C.ate ?? C.de + 0.4));
          g.save(); g.globalAlpha = 1;
          if (C.tipo === 'contorno') { caminho(pontos(C.pontos), k); g.strokeStyle = C.cor || '#241726'; g.lineWidth = C.larg || 6; g.stroke(); }
          else if (C.tipo === 'recheio') { g.globalAlpha = k; caminho(pontos(C.pontos)); g.closePath(); g.fillStyle = C.cor; g.fill(); }
          else if (C.tipo === 'varre') { const x = C.direcao === 'leste' ? T * k : T * (1 - k); g.beginPath(); C.direcao === 'leste' ? g.rect(0, 0, x, Hh) : g.rect(x, 0, T - x, Hh); g.clip(); caminho(pontos(C.pontos)); g.closePath(); g.fillStyle = C.cor; g.globalAlpha = C.alfa ?? 0.85; g.fill(); }
          else if (C.tipo === 'cresce') { const [cx, cy] = pj(C.centro); g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy); caminho(pontos(C.pontos)); g.closePath(); g.fillStyle = C.cor; g.globalAlpha = C.alfa ?? 0.85; g.fill(); g.lineWidth = 5; g.strokeStyle = '#241726'; g.stroke(); }
          else if (C.tipo === 'aneis') { const [cx, cy] = pj(C.ponto); for (let j = 0; j < 3; j++) { const f = trecho(t, C.de + j * 0.15, C.de + j * 0.15 + 0.9); if (f <= 0 || f >= 1) continue; g.globalAlpha = 1 - f; g.lineWidth = 6; g.strokeStyle = C.cor; g.beginPath(); g.arc(cx, cy, f * (C.raio || 160), 0, 7); g.stroke(); } }
          else if (C.tipo === 'ponto') { const [cx, cy] = pj(C.ponto); const r = (C.raio || 14) * (1 + 0.25 * Math.sin((t - C.de) * 9)) * salta(trecho(t, C.de, C.de + 0.3)); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = C.cor; g.fill(); g.lineWidth = 5; g.strokeStyle = '#241726'; g.stroke(); }
          g.restore();
        }
        tx.needsUpdate = true;
      },
    };
  };

  tipos.chamas = (P, ctx) => {
    const obj = new THREE.Group(), n = P.n || 7, cones = [];
    const cores = P.cores || ['#ff7a2a', '#ffc23a', '#ffe9a0'];
    for (let i = 0; i < n; i++) {
      const camada = i % 3, a = h(i, 30) * Math.PI * 2, r = (P.raio || 0.4) * Math.sqrt(h(i, 31)) * (1 - camada * 0.3);
      const m = new THREE.Mesh(geometria('cone', [0.5, 1, 8]), new THREE.MeshBasicMaterial({ color: cores[camada % cores.length] }));
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); obj.add(m); cones.push([m, camada, i]);
    }
    return {
      obj, atualiza(t, cam, extra) {
        transforma(obj, P, t, ctx.chao, extra);
        const f = P.forca ? chave(P.forca, t)[0] : 1;
        for (const [m, camada, i] of cones) {
          const fl = 0.75 + 0.35 * Filme.ruido(t * 9 + i * 3.7, 51);
          const alt = (P.alt || 1) * f * fl * (1 - camada * 0.25);
          m.scale.set((P.raio || 0.4) * 0.9 * (1 - camada * 0.25), Math.max(0.001, alt), (P.raio || 0.4) * 0.9 * (1 - camada * 0.25));
          m.position.y = alt / 2; m.visible = f > 0.02;
        }
      },
    };
  };

  tipos.aneis = (P, ctx) => {
    const obj = new THREE.Group(), n = P.n || 3, an = [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geometria('toro', [1, P.grossura || 0.035]), new THREE.MeshBasicMaterial({ color: P.cor || '#ffd84a', transparent: true, depthWrite: false })); obj.add(m); an.push(m); }
    return {
      obj, atualiza(t, cam, extra) {
        transforma(obj, Object.assign({ solto: true }, P), t, null, extra);
        if (P.encara) obj.quaternion.copy(cam.quaternion);
        an.forEach((m, i) => {
          const f = P.unica ? trecho(t, P.de + i * 0.12, P.de + i * 0.12 + (P.dur || 0.8)) : (((t - (P.de || 0)) * (P.hz || 1) + i / n) % 1 + 1) % 1;
          const vivo = t >= (P.de ?? -1) && (P.ate == null || t < P.ate) && f > 0 && f < 1;
          m.visible = vivo; const r = mistura(P.raio0 || 0.2, P.raio || 1.5, f); m.scale.setScalar(r); m.material.opacity = 1 - f;
        });
      },
    };
  };

  tipos.luz = (P, ctx) => {
    const obj = new THREE.PointLight(P.cor || '#ff9a50', P.forca || 3, P.alcance || 8, 1.2);
    return { obj, atualiza(t, cam, extra) { transforma(obj, Object.assign({ solto: true }, P), t, null, extra); const f = P.anima ? chave(P.anima, t)[0] : 1; obj.intensity = (P.forca || 3) * f * (1 + (P.pisca || 0) * Filme.ruido(t * 8, 61)); } };
  };

  tipos.junto = (P, ctx) => {
    const obj = new THREE.Group(), sub = { ...ctx, chao: null }, filhos = [];
    (P.pecas || []).forEach((q, j) => { const m = construir(q, { ...sub, semente: ctx.semente * 7 + j }); obj.add(m.obj); filhos.push(m); });
    const tg = preparaTinge(obj, P);
    return {
      obj, atualiza(t, cam, extra = {}) {
        transforma(obj, P, t, ctx.chao, extra);
        if (tg) tg(t);
        const e2 = { fase: extra.fase, pai: obj.position, paiGiro: obj.rotation.y, estados: extra.estados };
        for (const f of filhos) f.atualiza(t, cam, e2);
      },
    };
  };

  function construir(P, ctx) {
    const f = tipos[P.tipo];
    if (!f) throw new Error('peça desconhecida: ' + P.tipo);
    return f(P, ctx);
  }

  return { construir, toon, geometria };
}
