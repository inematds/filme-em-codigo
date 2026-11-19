// MOTOR "tijolinhos" — tijolinhos de brinquedo em stop-motion, montados e fotografados em 3D.
// Jeito de animar: cena-3d (three.js, sem placa de vídeo). Tudo anda em 12 POSES por segundo, como
// quem fotografa um brinquedo, mexe um pouquinho e fotografa de novo: peça, boneco, câmera e luz.
// O vídeo sai a 30 quadros por segundo, mas cada pose fica parada por 2 ou 3 quadros.
// Peças genéricas (sem marca): tijolo, placa, lisa, rampa, redondo, cone, haste. Bonecos originais:
// cabeça de cubo arredondado com dois pontinhos de olho, corpo de bloco afunilado, mão de pino.
// Fumaça e fogo também são peças que aparecem e somem, nunca partículas.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import { geometria, pe, altura, ALT, texturaUso, texturaMadeira, ambienteEstudio } from './pecas.js';
import { criarLente } from './lente.js';

const { limita, mistura, trecho, suave, sorteio, saiDevagar, entraDevagar } = Filme;

// sorteio sem memória: o mesmo par de números dá sempre o mesmo valor (0 a 1)
function h(a, b = 0) {
  let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return (v >>> 0) / 4294967296;
}

Filme.criar({
  largura: 1920, altura: 1080, fps: 30, duracao: 10,
  montar({ historia: H, tela, largura: L, altura: A, duracao }) {
    const C = H.cores, F = H.filme, LZ = H.luz, PPS = H.posesPorSegundo || 12;
    const acaso = sorteio(H.semente);
    const pecasH = H.pecas, todas = (tipo) => pecasH.filter((p) => p.tipo === tipo), uma = (tipo) => pecasH.find((p) => p.tipo === tipo);
    const pose = (t) => Math.floor(t * PPS + 1e-6);          // número da pose (exposição) no tempo t
    const tPose = (t) => pose(t) / PPS;                       // o tempo "congelado" da pose

    // ---------- o fotógrafo: renderizador, cena, câmera ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    const cena = new THREE.Scene();
    cena.background = new THREE.Color('#1a1410');
    cena.environment = ambienteEstudio(render);
    cena.environmentIntensity = LZ.reflexo;
    const camera = new THREE.PerspectiveCamera(30, L / A, 0.3, 400);

    // ---------- materiais ----------
    const uso = texturaUso(sorteio(H.semente + 1));
    const matABS = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: uso.cor, roughness: 0.42, roughnessMap: uso.asp, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.08, sheen: 0 });
    const matTrans = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.62 });
    const matFogo = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.88 });
    const cacheMat = new Map();
    const matCor = (cor, tipo = 'abs') => {
      const k = tipo + cor; if (cacheMat.has(k)) return cacheMat.get(k);
      const m = (tipo === 'abs' ? matABS : matTrans).clone(); m.color.set(cor); cacheMat.set(k, m); return m;
    };

    // ---------- o LOTE: cada tipo de peça vira uma malha só, repetida por instância ----------
    // registro: { g: geometria, m: 'abs'|'trans'|'fogo', cor, fixa: Matrix4 } ou { ..., anda(tq, e, obj) -> false para esconder }
    const registros = [];
    const O = new THREE.Object3D(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    const poe = (g, cor, x, y, z, giro = 0, m = 'abs') => { O.position.set(x, y, z); O.rotation.set(0, giro, 0); O.scale.set(1, 1, 1); O.updateMatrix(); const r = { g, m, cor, fixa: O.matrix.clone() }; registros.push(r); return r; };
    const anda = (g, cor, fn, m = 'abs') => { const r = { g, m, cor, anda: fn }; registros.push(r); return r; };
    const tom = (cor, quanto = 0.05, k = acaso()) => new THREE.Color(cor).multiplyScalar(1 - quanto + 2 * quanto * k); // cada peça com um tom levemente diferente

    // ---------- mesa de madeira e placa de base ----------
    const ME = uma('mesa'), PB = uma('placa');
    {
      const tx = texturaMadeira(sorteio(H.semente + 2), C.mesa, C.mesaVeio); tx.repeat.set(5, 5);
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.55, metalness: 0 }));
      mesa.rotation.x = -Math.PI / 2; mesa.position.y = ME.y; mesa.receiveShadow = true; cena.add(mesa);
      const w = PB.x[1] - PB.x[0], d = PB.z[1] - PB.z[0];
      const chapa = new THREE.Mesh(geometria('l1x1').clone().scale(w, 0.3 / 0.39, d), matCor(C.placa)); // a chapa verde fininha
      chapa.position.set((PB.x[0] + PB.x[1]) / 2, -0.3, (PB.z[0] + PB.z[1]) / 2); chapa.receiveShadow = true; cena.add(chapa);
      // pinos da placa (só a tampinha, a chapa já está embaixo)
      const gp = new THREE.CylinderGeometry(0.3, 0.3, 0.17, 14, 1); gp.translate(0, 0.085, 0);
      const n = w * d, pinosPlaca = new THREE.InstancedMesh(gp, matCor(C.placa), n); let i = 0;
      for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) { O.position.set(PB.x[0] + a + 0.5, 0, PB.z[0] + b + 0.5); O.rotation.set(0, 0, 0); O.scale.set(1, 1, 1); O.updateMatrix(); pinosPlaca.setMatrixAt(i++, O.matrix); }
      pinosPlaca.receiveShadow = true; pinosPlaca.castShadow = true; cena.add(pinosPlaca);
    }

    // ---------- fundo: parede de tijolos azuis, morros, sol de pixel, nuvens no palito ----------
    {
      const P = uma('parede'), cores = C.parede;
      for (let lin = 0; lin * ALT.tijolo < P.altura; lin++) {
        const desloca = (lin % 2) * 2;
        for (let x = P.x[0] - desloca; x < P.x[1]; x += 4) {
          // faixas mais claras, como nuvens pintadas na parede
          const claro = Math.max(0, Math.sin(x * 0.11 + lin * 0.37) * Math.sin(lin * 0.21 + x * 0.03) - 0.55) * 2.4;
          const base = cores[Math.floor(acaso() * cores.length)];
          const cor = new THREE.Color(base).lerp(new THREE.Color(C.paredeClara), limita(claro * acaso() * 1.4, 0, 0.85));
          O.position.set(x + 2, ME.y + lin * ALT.tijolo, P.z); O.rotation.set(0, 0, 0); O.scale.set(1, 1, 1); O.updateMatrix();
          registros.push({ g: 'm4x1', m: 'abs', cor: cor.multiplyScalar(0.96 + 0.08 * acaso()), fixa: O.matrix.clone() });
        }
      }
      // tijolos "de pé" deitados na parede viram pinos de frente: o sol é uma roda de placas redondas
      const S = uma('sol');
      for (let a = -S.raio; a <= S.raio; a++) for (let b = -S.raio; b <= S.raio; b++) {
        if (a * a + b * b > S.raio * S.raio + 0.6) continue;
        O.position.set(S.x + a, S.y + b, S.z); O.rotation.set(Math.PI / 2, 0, 0); O.scale.set(1, 1, 1); O.updateMatrix();
        registros.push({ g: 'p1x1', m: 'abs', cor: tom(C.sol, 0.04), fixa: O.matrix.clone() });
      }
      for (const M of todas('morro')) {
        for (let lin = 0; lin < M.linhas; lin++) {
          const meia = (M.largura / 2) * Math.sqrt(1 - Math.pow(lin / M.linhas, 1.6));
          for (let x = Math.round(M.x - meia); x < M.x + meia - 1; x += 2) {
            poe('t2x2', tom(C.morro[(((lin + Math.round(x / 2)) % C.morro.length) + C.morro.length) % C.morro.length], 0.05), x + 1, ME.y + lin * ALT.tijolo, M.z + (lin % 2) * 0.02, 0);
          }
        }
      }
      for (const N of todas('nuvem')) {
        const haste = { g: 'haste', m: 'abs', cor: new THREE.Color(C.haste) };
        O.position.set(N.x, ME.y, N.z); O.rotation.set(0, 0, 0); O.scale.set(1, N.altura - ME.y, 1); O.updateMatrix(); haste.fixa = O.matrix.clone(); registros.push(haste);
        // nuvem: duas ou três camadas de placas, mais larga embaixo
        const w = N.largura, r2 = sorteio(Math.round(N.x * 31 + N.z * 7 + H.semente));
        for (let c = 0; c < 3; c++) {
          const larg = w - c * 2.5 - Math.floor(r2() * 2), y = N.altura + [0, ALT.placa, ALT.placa + ALT.tijolo][c];
          for (let x = -larg / 2; x < larg / 2 - 0.5; x += 2) {
            for (let z = -1; z <= 1; z += 2) poe(c === 1 ? 't2x2' : 'p2x2', tom(C.nuvem[c % 2], 0.03, r2()), N.x + x + 1, y, N.z + z * (c === 2 ? 0.5 : 1), 0);
          }
        }
      }
    }

    // ---------- plataforma listrada (já está na placa quando o filme começa) ----------
    const PL = uma('plataforma');
    {
      const s = PL.lado / 2;
      for (let a = -s; a < s; a += 2) for (let b = -s; b < s; b += 2) {
        const borda = a === -s || b === -s || a === s - 2 || b === s - 2;
        const cor = borda ? (((a + b) / 2) % 2 === 0 ? C.listraAmarela : C.listraPreta) : C.chapa;
        poe(borda ? 'p2x2' : 'l2x2', tom(cor, 0.04), PL.x + a + 1, 0, PL.z + b + 1, 0);
      }
    }

    // ---------- foguete e torre: a lista de peças que pulam da pilha até o lugar ----------
    const FG = uma('foguete'), TR = uma('torre'), DC = uma('decolagem');
    const yPlat = ALT.placa;
    const construir = []; // { g, cor, m, x, y, z, giro, ordem, grupo }
    FG.camadas.forEach((cor, i) => {
      const y = yPlat + i * ALT.tijolo;
      const corLin = (i === 4 && FG.listra) ? FG.listra : cor;
      if (i % 2 === 0) { for (const dz of [-1, 1]) construir.push({ g: 't4x2', cor: corLin, x: FG.x, y, z: FG.z + dz, giro: 0, grupo: 'foguete', ordem: i }); }
      else { for (const dx of [-1, 1]) construir.push({ g: 't4x2', cor: corLin, x: FG.x + dx, y, z: FG.z, giro: Math.PI / 2, grupo: 'foguete', ordem: i }); }
      if (FG.janela && i === FG.janela.camada) construir.push({ g: 'l2x1', cor: FG.janela.cor, m: 'trans', x: FG.x, y: y + 0.6, z: FG.z + 2.02, giro: 0, rotX: Math.PI / 2, grupo: 'foguete', ordem: i + 0.5 });
    });
    for (const [dx, dz, giro] of [[3, 0, Math.PI / 2], [-3, 0, -Math.PI / 2], [0, 3, 0], [0, -3, Math.PI]]) {
      construir.push({ g: 'r2x2', cor: FG.aletas, x: FG.x + dx, y: yPlat, z: FG.z + dz, giro, grupo: 'foguete', ordem: 0.6 });
    }
    {
      const yb = yPlat + FG.camadas.length * ALT.tijolo;
      construir.push({ g: 'r4x2', cor: FG.bico[0], x: FG.x, y: yb, z: FG.z + 1, giro: 0, grupo: 'foguete', ordem: 20 });
      construir.push({ g: 'r4x2', cor: FG.bico[0], x: FG.x, y: yb, z: FG.z - 1, giro: Math.PI, grupo: 'foguete', ordem: 20 });
      construir.push({ g: 'red2', cor: FG.bico[1], x: FG.x, y: yb + ALT.tijolo, z: FG.z, giro: 0, grupo: 'foguete', ordem: 21 });
      construir.push({ g: 'cone1', cor: FG.bico[2], x: FG.x, y: yb + 2 * ALT.tijolo, z: FG.z, giro: 0, grupo: 'foguete', ordem: 22 });
    }
    TR.camadas.forEach((cor, i) => construir.push({ g: 't2x2', cor, x: TR.x, y: yPlat * 0 + i * ALT.tijolo, z: TR.z, giro: (i % 2) * Math.PI / 2, grupo: 'torre', ordem: i }));
    construir.push({ g: 'p4x1', cor: TR.braco, x: TR.x + 1.5, y: TR.camadas.length * ALT.tijolo, z: TR.z, giro: 0, grupo: 'torre', ordem: TR.camadas.length });

    // ordem de chegada: camada por camada, foguete e torre intercalados
    const listaF = construir.filter((p) => p.grupo === 'foguete').sort((a, b) => a.ordem - b.ordem);
    const listaT = construir.filter((p) => p.grupo === 'torre').sort((a, b) => a.ordem - b.ordem);
    const VOO = 0.42; // segundos no ar
    listaF.forEach((p, i) => { p.chega = tPose(mistura(FG.monta[0] + VOO, FG.monta[1], i / Math.max(1, listaF.length - 1))); });
    listaT.forEach((p, i) => { p.chega = tPose(mistura(TR.monta[0] + VOO, TR.monta[1], i / Math.max(1, listaT.length - 1))); });

    // a pilha: cada peça da montagem começa jogada na placa, num lugar livre
    const PI_ = uma('pilha');
    const ocupado = new Set();
    const livre = (x0, z0, w, d) => { for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) if (ocupado.has((x0 + a) + ',' + (z0 + b))) return false; return true; };
    const marca = (x0, z0, w, d) => { for (let a = -1; a <= w; a++) for (let b = -1; b <= d; b++) ocupado.add((x0 + a) + ',' + (z0 + b)); };
    function lugarNaPilha(g) {
      const [w0, d0] = pe(g);
      for (let tent = 0; tent < 400; tent++) {
        const vira = acaso() < 0.5, w = vira ? d0 : w0, d = vira ? w0 : d0;
        const x0 = Math.floor(mistura(PI_.x[0], PI_.x[1] - w, acaso())), z0 = Math.floor(mistura(PI_.z[0], PI_.z[1] - d, acaso()));
        if (!livre(x0, z0, w, d)) continue;
        marca(x0, z0, w, d);
        return { x: x0 + w / 2, z: z0 + d / 2, giro: (vira ? Math.PI / 2 : 0) + (acaso() - 0.5) * 0.5 };
      }
      return { x: mistura(PI_.x[0], PI_.x[1], acaso()), z: PI_.z[1] + 2, giro: acaso() * 3 };
    }
    const subida = (t) => { // quanto o foguete já subiu
      const k = trecho(t, DC.t, DC.t + DC.dur);
      return DC.altura * Math.pow(k, 1.5);
    };
    const treme = (tq, e) => { // o foguete tremendo antes de sair
      const k = suave(trecho(tq, DC.t - DC.treme, DC.t)) * (1 - trecho(tq, DC.t + 0.4, DC.t + 0.8));
      return [(h(e, 901) - 0.5) * 0.12 * k, (h(e, 902) - 0.5) * 0.12 * k];
    };
    for (const p of construir) {
      const ini = lugarNaPilha(p.g);
      const sai = p.chega - VOO, salto = Math.max(p.y, 0) + 3.5 + 2 * h(p.ordem * 13 + 7, p.x * 5 + 3);
      const giroIni = ini.giro, giroFim = p.giro, gira = (h(p.chega * 100, p.x) < 0.5 ? -1 : 1);
      const id = registros.length;
      p.reg = anda(p.g, tom(p.cor, 0.04), (tq, e, o) => {
        let x, y, z, gy, gx = p.rotX || 0, gz = 0, sx = 1, sy = 1;
        if (tq < sai) { x = ini.x; y = 0; z = ini.z; gy = giroIni; gx = 0; }
        else if (tq < p.chega) {
          const k = (tq - sai) / VOO;
          x = mistura(ini.x, p.x, k); z = mistura(ini.z, p.z, k);
          y = mistura(0, p.y, k) + 4 * salto * k * (1 - k);
          gy = mistura(giroIni, giroFim, suave(k)); gx = mistura(0, gx, k) + gira * Math.sin(Math.PI * k) * 0.9; gz = gira * Math.sin(Math.PI * k) * 0.5;
          const tr = F.tremorPeca; x += (h(e, id) - 0.5) * tr * 2; z += (h(e, id + 7) - 0.5) * tr * 2;
          if (k < 0.15) { sy = 1.06; sx = 0.96; } // estica ao pular
        } else {
          x = p.x; y = p.y; z = p.z; gy = giroFim;
          const desde = pose(tq) - pose(p.chega);
          if (desde === 0) { sy = 0.8; sx = 1.1; } else if (desde === 1) { sy = 1.05; sx = 0.97; } // amassa e assenta
        }
        if (p.grupo === 'foguete') { const [tx, tz] = treme(tq, e); x += tx; z += tz; y += subida(tq); }
        o.position.set(x, y, z); o.rotation.set(gx, gy, gz, 'YXZ'); o.scale.set(sx, sy, sx);
        return true;
      }, p.m || 'abs');
    }
    // peças soltas que sobram na pilha (e não saem do lugar)
    for (let i = 0; i < PI_.soltas; i++) {
      const g = ['t2x4', 't2x2', 't1x2', 'red1', 'p2x4', 'r2x2', 't1x1', 'p1x2'][Math.floor(acaso() * 8)];
      const l = lugarNaPilha(g), cores = ['#c81f2a', '#f3f1ea', '#f2c21a', '#2f6fd0', '#34363b', '#3a9a36', '#ef8a22'];
      poe(g, tom(cores[Math.floor(acaso() * cores.length)], 0.04), l.x, 0, l.z, l.giro);
    }

    // ---------- fogo e fumaça: peças que aparecem e somem ----------
    const baseFoguete = (tq) => new THREE.Vector3(FG.x, yPlat + subida(tq), FG.z);
    for (let i = 0; i < DC.fogo; i++) {
      const g = i % 3 === 0 ? 'cone1' : 'red1', cf = C.fogo[i % C.fogo.length];
      const corHDR = new THREE.Color(cf).multiplyScalar(i % 3 === 2 ? 2.2 : 3.4);
      anda(g, corHDR, (tq, e, o) => {
        const liga = DC.t - 0.25 - h(i, 33) * 0.2;
        if (tq < liga || h(e, i * 3 + 1) < 0.3) return false;      // pisca: aparece e some a cada pose
        const b = baseFoguete(tq), forca = suave(trecho(tq, liga, DC.t + 0.6));
        const k = h(e, i * 3 + 2), ang = h(e, i * 3 + 3) * 6.283, raio = (0.3 + 1.5 * h(i, 5)) * (0.4 + 0.6 * forca);
        const no = tq < DC.t ? 0.6 : 1;                               // antes de sair o fogo espalha mais e fica baixo
        o.position.set(b.x + Math.cos(ang) * raio * (2 - no), Math.max(0.05, b.y - (0.3 + k * 3.2 * forca) * no), b.z + Math.sin(ang) * raio * (2 - no));
        o.rotation.set(Math.PI, ang, 0); const s = 0.8 + 0.9 * h(e, i * 5 + 9);
        o.scale.set(s, s * (0.8 + forca * 0.6), s);
        return true;
      }, 'fogo');
    }
    const ARV = todas('arvore'), alvoCai = ARV.find((a) => a.cai != null);
    // quando a base do foguete passa pela altura y (conta de volta da subida, por busca binária)
    const quandoPassa = (y) => { let a = DC.t, b = DC.t + DC.dur; for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (yPlat + subida(m) < y) a = m; else b = m; } return b; };
    const nRente = Math.round(DC.fumaca * 0.35), nColuna = DC.fumaca - nRente, topoColuna = yPlat + subida(DC.t + DC.dur * 0.97);
    for (let i = 0; i < DC.fumaca; i++) {
      const g = ['t2x2', 'red1', 't1x2', 'red2', 'p2x2'][Math.floor(h(i, 41) * 5)];
      const cor = tom(C.fumaca[Math.floor(h(i, 42) * C.fumaca.length)], 0.03, h(i, 43));
      const rente = i < nRente;
      // rente: sai pelos lados logo na partida; coluna: cada peça nasce quando a base do foguete passa pela altura dela
      const yCol = rente ? 0 : 1.2 + ((i - nRente + h(i, 61)) / nColuna) * (topoColuna - 1.2);
      const ts = tPose(rente ? DC.t - 0.05 + h(i, 60) * 0.9 : quandoPassa(yCol + 0.6));
      const b0 = baseFoguete(ts);
      const ang = (alvoCai && i % 4 === 0 && rente) ? Math.atan2(alvoCai.z - FG.z, alvoCai.x - FG.x) + (h(i, 44) - 0.5) * 0.35 : h(i, 45) * 6.283;
      const vai = rente ? 5 + 12 * h(i, 46) : 0.4 + 1.5 * h(i, 46);
      const dx = (h(i, 47) - 0.5) * 2.2, dz = (h(i, 48) - 0.5) * 2.2, gy0 = h(i, 49) * 6.28, gx0 = h(i, 50) * 6.28;
      const id = i;
      anda(g, cor, (tq, e, o) => {
        if (tq < ts) return false;
        const vida = tq - ts, desde = pose(tq) - pose(ts);
        let x, z, y, rx = gx0, ry = gy0;
        if (rente) { // rola pela placa, pulando
          const k = saiDevagar(limita(vida / 1.6));
          x = b0.x + dx + Math.cos(ang) * vai * k; z = b0.z + dz + Math.sin(ang) * vai * k;
          y = Math.abs(Math.sin(k * 9 + h(i, 51) * 3)) * 0.9 * (1 - k);
          rx += k * vai * 0.9; ry += k * 1.5;
        } else {     // a coluna: fica no lugar, abre para os lados e desce um tiquinho
          const r = vai + 0.45 * Math.min(vida, 3);
          x = b0.x + Math.cos(ang) * r; z = b0.z + Math.sin(ang) * r;
          y = Math.max(0, yCol - 0.12 * vida);
          rx += vida * 0.3;
        }
        const tr = F.tremorPeca; x += (h(e, id + 3000) - 0.5) * tr * 2; z += (h(e, id + 3100) - 0.5) * tr * 2;
        const s = desde === 0 ? 0.55 : desde === 1 ? 1.18 : (rente ? 1 : 1 + 0.3 * limita(vida / 3));
        o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.scale.setScalar(s);
        return true;
      });
    }

    // monta as malhas do lote (uma por tipo de peça + material)
    const lotes = new Map();
    for (const r of registros) {
      const k = r.g + '|' + r.m;
      if (!lotes.has(k)) lotes.set(k, { g: r.g, m: r.m, regs: [] });
      r.i = lotes.get(k).regs.length; lotes.get(k).regs.push(r);
      r.lote = lotes.get(k);
    }
    const moveis = [];
    for (const lt of lotes.values()) {
      const mat = lt.m === 'abs' ? matABS : lt.m === 'trans' ? matTrans : matFogo;
      const malha = new THREE.InstancedMesh(geometria(lt.g), mat, lt.regs.length);
      malha.frustumCulled = false; malha.castShadow = lt.m !== 'fogo'; malha.receiveShadow = lt.m === 'abs';
      if (lt.m === 'trans') malha.renderOrder = 2;
      const cor = new THREE.Color();
      lt.regs.forEach((r, i) => {
        cor.set(r.cor); malha.setColorAt(i, cor);
        malha.setMatrixAt(i, r.fixa || ZERO);
        if (r.anda) moveis.push(r);
      });
      malha.instanceColor.needsUpdate = true;
      lt.malha = malha; cena.add(malha);
    }

    // ---------- peças com dono (mesa de controle, sinal, árvores, bonecos): malhas soltas ----------
    const peca = (g, cor, pai, x, y, z, giro = 0, tipo = 'abs') => {
      const m = new THREE.Mesh(geometria(g), matCor(cor, tipo)); m.position.set(x, y, z); m.rotation.y = giro;
      m.castShadow = true; m.receiveShadow = true; pai.add(m); return m;
    };
    const MC = uma('mesaControle');
    const mesaC = new THREE.Group(); mesaC.position.set(MC.x, 0, MC.z); cena.add(mesaC);
    peca('t4x2', C.listraPreta, mesaC, 0, 0, 0);
    peca('p4x2', '#4a4c52', mesaC, 0, ALT.tijolo, 0);
    peca('redp1', '#f2c21a', mesaC, -1.5, ALT.tijolo + ALT.placa, -0.5);
    peca('redp1', '#d8262e', mesaC, -0.5, ALT.tijolo + ALT.placa, -0.5);
    peca('redp1', '#6ec0f2', mesaC, -1.5, ALT.tijolo + ALT.placa, 0.5, 0, 'trans');
    peca('p1x2', '#9a9ca2', mesaC, 1, ALT.tijolo + ALT.placa, 0, Math.PI / 2);
    const alavanca = new THREE.Group(); alavanca.position.set(1, ALT.tijolo + 2 * ALT.placa, 0); mesaC.add(alavanca);
    { const ha = peca('haste', '#3a3b40', alavanca, 0, 0, 0); ha.scale.set(0.7, 1.4, 0.7); const bo = peca('bola', '#d8262e', alavanca, 0, 1.45, 0); bo.scale.setScalar(0.9); }

    const SN = uma('sinal');
    const sinal = new THREE.Group(); sinal.position.set(SN.x, 0, SN.z); cena.add(sinal);
    peca('red1', '#34363b', sinal, 0, 0, 0); peca('red1', '#34363b', sinal, 0, ALT.tijolo, 0);
    const lampadas = ['#2bd46a', '#ffd23a', '#ff3a2a'].map((cor, i) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.7, emissive: cor, emissiveIntensity: 0 });
      const m = new THREE.Mesh(geometria('red1'), mat); m.position.y = (2 + i) * ALT.tijolo; m.castShadow = true; sinal.add(m);
      return m;
    });
    const luzSinal = new THREE.PointLight('#ffffff', 0, 9, 2); luzSinal.position.set(0, 3.6 * ALT.tijolo, 1.2); sinal.add(luzSinal);

    const arvores = ARV.map((a) => {
      const piv = new THREE.Group(); piv.position.set(a.x + 0.5, 0, a.z); cena.add(piv);
      const g = new THREE.Group(); g.position.x = -0.5; piv.add(g);
      for (let i = 0; i < 3; i++) peca('red1', C.tronco, g, 0, i * ALT.tijolo, 0);
      peca('t2x2', C.folha[0], g, 0, 3 * ALT.tijolo, 0);
      peca('t4x2', C.folha[1], g, 0, 4 * ALT.tijolo, 0); peca('t4x2', C.folha[0], g, 0, 5 * ALT.tijolo, 0, Math.PI / 2);
      peca('t2x2', C.folha[1], g, 0, 6 * ALT.tijolo, 0);
      peca('cone1', C.folha[0], g, 0, 7 * ALT.tijolo, 0);
      return { a, piv };
    });

    // bonecos originais: cabeça de cubo arredondado, dois pontinhos de olho, corpo afunilado, mão de pino
    const bonecos = todas('boneco').map((B) => {
      const raiz = new THREE.Group(); cena.add(raiz);
      peca('corpo', B.cor, raiz, 0, 0, 0);
      const cab = new THREE.Group(); cab.position.y = 1.47; raiz.add(cab);
      peca('cabeca', C.pele, cab, 0, 0, 0);
      for (const s of [-1, 1]) { const o = new THREE.Mesh(geometria('olho'), matCor(C.olho)); o.position.set(s * 0.2, 0.55, 0.5); o.scale.set(1, 1.35, 0.6); cab.add(o); }
      const bracos = [-1, 1].map((s) => {
        const ombro = new THREE.Group(); ombro.position.set(s * 0.6, 1.3, 0); raiz.add(ombro);
        peca('braco', B.cor, ombro, 0, 0, 0); peca('mao', C.pele, ombro, 0, 0, 0);
        return ombro;
      });
      return { B, raiz, cab, bracos };
    });

    // ---------- luz: a lâmpada quente do estúdio (treme um tiquinho entre as fotos) e o céu ----------
    cena.add(new THREE.HemisphereLight(LZ.ceu, LZ.chao, LZ.ambiente));
    const chave = new THREE.DirectionalLight(LZ.chave, LZ.forca);
    chave.position.set(...LZ.de); chave.target.position.set(0, 12, -6); cena.add(chave, chave.target);
    chave.castShadow = true; chave.shadow.mapSize.set(2048, 2048); chave.shadow.bias = -0.0004; chave.shadow.normalBias = 0.04; chave.shadow.radius = 3;
    Object.assign(chave.shadow.camera, { left: -48, right: 48, top: 48, bottom: -40, near: 1, far: 160 }); chave.shadow.camera.updateProjectionMatrix();
    const luzFogo = new THREE.PointLight('#ff9a3a', 0, 30, 1.6); cena.add(luzFogo);

    // ---------- câmera: curva suave pelos pontos da história (posição, alvo, lente, foco) ----------
    const K = H.camera;
    function hermite(campo, t) {
      let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
      const a = K[i], b = K[i + 1], dt = b.t - a.t, u = limita((t - a.t) / dt);
      const val = (k) => (Array.isArray(k[campo]) ? k[campo] : [k[campo]]);
      const tang = (j) => { // inclinação em cada ponto (zero nas pontas e onde a história pede parada)
        const k = K[j]; if (k.para || j === 0 || j === K.length - 1) return val(k).map(() => 0);
        const p = val(K[j - 1]), n = val(K[j + 1]), d = K[j + 1].t - K[j - 1].t; return p.map((v, c) => (n[c] - v) / d);
      };
      const ma = tang(i), mb = tang(i + 1), pa = val(a), pb = val(b);
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      return pa.map((v, c) => h00 * v + h10 * dt * ma[c] + h01 * pb[c] + h11 * dt * mb[c]);
    }
    const olha = new THREE.Vector3(), foco = new THREE.Vector3(), frente = new THREE.Vector3();

    // ---------- título (letras em traços: não depende de fonte instalada) ----------
    const cvT = document.createElement('canvas'); cvT.width = L; cvT.height = A;
    {
      const x = cvT.getContext('2d'), u = A / 1080;
      const g = x.createLinearGradient(0, A * 0.66, 0, A); g.addColorStop(0, 'rgba(12,8,4,0)'); g.addColorStop(1, 'rgba(12,8,4,0.66)');
      x.fillStyle = g; x.fillRect(0, A * 0.66, L, A * 0.34);
      const tam = 66 * u, txt = String(H.titulo || '').toUpperCase(), x0 = 120 * u, y0 = A - 150 * u;
      const passa = (larg, cor) => {
        x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = larg; x.strokeStyle = cor;
        let px = x0;
        for (const ch of txt) {
          const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
          for (const tr of gl.tracos) { x.beginPath(); tr.forEach(([a, b], i) => (i ? x.lineTo(px + a * tam, y0 + b * tam) : x.moveTo(px + a * tam, y0 + b * tam))); x.stroke(); }
          px += (gl.w + 0.2) * tam;
        }
      };
      passa(tam * 0.26, 'rgba(30,18,8,0.85)');
      passa(tam * 0.15, '#fff6e8');
    }
    const lente = criarLente(render, L, A, F, cvT);

    // ---------- desenhar(t): põe cada peça no lugar da pose e tira a foto ----------
    function desenhar(t) {
      const e = pose(t), tq = e / PPS;

      // câmera (também anda em poses: é stop-motion de verdade)
      const p = hermite('pos', tq), o = hermite('olha', tq), fc = hermite('foco', tq);
      const trC = F.tremorCamera;
      camera.position.set(p[0] + (h(e, 11) - 0.5) * trC, p[1] + (h(e, 12) - 0.5) * trC, p[2]);
      olha.set(o[0], o[1], o[2]); camera.lookAt(olha);
      camera.fov = hermite('fov', tq)[0]; camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      camera.getWorldDirection(frente);
      foco.set(fc[0], fc[1], fc[2]).sub(camera.position);
      const distFoco = Math.max(0.5, foco.dot(frente));
      const desfoque = hermite('desfoque', tq)[0];

      // peças do lote que andam
      for (const r of moveis) {
        const vis = r.anda(tq, e, O);
        if (vis) { O.updateMatrix(); r.lote.malha.setMatrixAt(r.i, O.matrix); } else r.lote.malha.setMatrixAt(r.i, ZERO);
      }
      for (const lt of lotes.values()) lt.malha.instanceMatrix.needsUpdate = true;

      // alavanca e sinal
      const kAl = suave(trecho(tq, MC.alavanca, MC.alavanca + 0.25));
      alavanca.rotation.set(mistura(-0.55, 0.6, kAl), 0, 0);
      let acesa = -1; SN.acende.forEach((ta, i) => { if (tq >= ta) acesa = i; });
      const ordemLuz = [2, 1, 0]; // vermelho, amarelo, verde (de cima para baixo no poste)
      lampadas.forEach((m, i) => { m.material.emissiveIntensity = (acesa >= 0 && ordemLuz[acesa] === i) ? 3.2 : 0; });
      if (acesa >= 0) { luzSinal.color.set(lampadas[ordemLuz[acesa]].material.color); luzSinal.position.y = (2.5 + ordemLuz[acesa]) * ALT.tijolo; luzSinal.intensity = 6; } else luzSinal.intensity = 0;

      // árvore derrubada pela fumaça
      for (const { a, piv } of arvores) {
        let r = 0;
        if (a.cai != null && tq >= a.cai) {
          const k = (tq - a.cai) / 0.45;
          r = k < 1 ? -1.5 * entraDevagar(k) : -1.5 + 0.12 * Math.abs(Math.sin((k - 1) * 5)) * Math.exp(-(k - 1) * 3);
        }
        piv.rotation.set(0, 0, r);
      }

      // bonecos
      for (const bo of bonecos) {
        const B = bo.B;
        let x = B.x, z = B.z, y = 0, alvo = B.olha, bracoE = 0.12, bracoD = 0.12, frenteE = 0, frenteD = 0, cabeca = 0;
        for (const ac of B.acoes || []) {
          if (ac.tipo === 'corre' && tq >= ac.de) {
            const k = trecho(tq, ac.de, ac.ate);
            x = mistura(B.x, ac.para[0], suave(k)); z = mistura(B.z, ac.para[1], suave(k));
            y = k < 1 ? Math.abs(Math.sin(Math.PI * ac.pulos * k)) * 0.9 : 0;
            alvo = k < 1 ? [ac.para[0], ac.para[1]] : null; // chegando, vira para a câmera (de frente para a mesa)
            if (k < 1) { const bal = Math.sin(Math.PI * ac.pulos * k * 2); bracoE = 0.5 + 0.4 * bal; bracoD = 0.5 - 0.4 * bal; }
          }
          if (ac.tipo === 'alavanca') {
            const k = suave(trecho(tq, ac.em - 0.25, ac.em)) * (1 - suave(trecho(tq, ac.em + 0.5, ac.em + 0.9)));
            frenteD = 1.25 * k; cabeca = -0.25 * k;
          }
          if (ac.tipo === 'comemora' && tq >= ac.de) {
            const k = suave(trecho(tq, ac.de, ac.de + 0.25)), vez = Math.floor((tq - ac.de) * 3);
            bracoE = bracoD = mistura(0.12, 2.7, k) + (vez % 2) * 0.15 * k;
            y = tq < ac.ate ? Math.abs(Math.sin((tq - ac.de) * Math.PI * 3)) * 0.7 * k : 0;
          }
        }
        bo.raiz.position.set(x + (y > 0 ? (h(e, 77) - 0.5) * 0.05 : 0), y, z);
        bo.raiz.rotation.set(0, alvo ? Math.atan2(alvo[0] - x, alvo[1] - z) : 0, 0);
        bo.cab.rotation.set(cabeca, 0, 0);
        bo.bracos[0].rotation.set(-frenteE, 0, -bracoE); bo.bracos[1].rotation.set(-frenteD, 0, bracoD);
      }

      // luz: treme um pouco entre uma foto e outra; o fogo acende o chão
      chave.intensity = LZ.forca * (1 + (h(e, 5) - 0.5) * 2 * LZ.tremor);
      const fogoK = tq >= DC.t - 0.3 ? suave(trecho(tq, DC.t - 0.3, DC.t + 0.4)) * (0.85 + 0.3 * h(e, 6)) : 0;
      const bf = baseFoguete(tq); luzFogo.position.set(bf.x, Math.max(0.6, bf.y - 1.2), bf.z + 1); luzFogo.intensity = 90 * fogoK;

      // título e escuro do começo e do fim
      const TI = H.tituloTempo || [0.35, 2.3];
      const titulo = suave(trecho(tq, TI[0], TI[0] + 0.35)) * (1 - suave(trecho(tq, TI[1] - 0.35, TI[1])));
      const apaga = Math.max(1 - trecho(t, 0, 0.35), trecho(t, duracao - 0.4, duracao));

      lente.foto(cena, camera, { e, distFoco, desfoque, titulo, apaga, brilho: 1 + (h(e, 8) - 0.5) * 2 * LZ.tremor * 0.5 });
    }

    // ---------- som: estalo de plástico a cada peça que encaixa, marimba e caixinha de música ----------
    function som() {
      const s = Som.criar(duracao, H.semente), M = H.musica, r = sorteio(H.semente + 9);
      // trilha: marimba (sino curto e grave) + baixo macio, crescendo até a decolagem
      M.marimba.forEach((n, i) => {
        const t = 0.3 + i * M.passo * (i < 8 ? 1.4 : 1.15);
        if (t < DC.t - 0.2) s.sino(n, t, 0.55, { vol: 0.11 + 0.03 * (i / M.marimba.length), pan: (i % 4 - 1.5) * 0.2, brilho: 0.7 });
      });
      M.baixo.forEach((n, i) => s.nota(n, 0.3 + i * 1.5, 1.4, { forma: 'tri', vol: 0.16, ataque: 0.05, solta: 0.5 }));
      M.caixinha.forEach((n, i) => { const t = 2.0 + i * 0.5; if (t < DC.t) s.sino(n, t, 1.4, { vol: 0.045, pan: 0.4, brilho: 2.4 }); });
      // um "tic" de plástico para cada peça que encaixa, no mesmo instante da pose
      for (const p of construir) {
        s.toque(p.chega, { vol: 0.14, corte: 6500, dur: 0.035, pan: limita((p.x - 3) / 14, -0.6, 0.6) });
        s.sino(['C7', 'D7', 'E7', 'G7'][Math.floor(r() * 4)], p.chega, 0.07, { vol: 0.03, brilho: 3 });
        s.toque(p.chega - VOO, { vol: 0.03, corte: 3000, dur: 0.02 }); // a peça saindo da pilha
      }
      // boneco correndo (passinhos), alavanca, bip do sinal
      for (const bo of todas('boneco')) for (const ac of bo.acoes || []) {
        if (ac.tipo === 'corre') for (let k = 1; k <= ac.pulos; k++) s.toque(ac.de + (ac.ate - ac.de) * k / ac.pulos, { vol: 0.08, corte: 2200, dur: 0.04, pan: -0.4 });
      }
      s.toque(MC.alavanca, { vol: 0.2, corte: 4000, dur: 0.05, pan: -0.3 }); s.batida(MC.alavanca, { vol: 0.12, freq: 220, dur: 0.12 });
      SN.acende.forEach((ta, i) => s.pio(ta, { freq: [880, 988, 1318][i], dur: i === 2 ? 0.32 : 0.16, repete: 1, vol: 0.09, pan: -0.5 }));
      // decolagem: ronco pequeno, apito de escorregar e pocs de fumaça
      s.vento(DC.t - 0.3, duracao - DC.t + 0.3, { vol: 0.16, corte: 240, onda: 3, profundidade: 0.4, entra: 0.4, sai: 2.0 });
      s.vento(DC.t, 2.4, { vol: 0.07, corte: 1400, onda: 2, entra: 0.2, sai: 1.4 });
      for (let k = 0; k < 6; k++) s.batida(DC.t + k * 0.2, { vol: 0.2 - k * 0.025, freq: 70, dur: 0.3 });
      s.pio(DC.t + 0.15, { freq: 420, sobe: 2.2, dur: 1.6, repete: 1, vol: 0.12 });
      for (let k = 0; k < 26; k++) { const t = DC.t + 0.1 + r() * 2.6; s.toque(t, { vol: 0.03 + 0.04 * r(), corte: 1800 + r() * 2500, dur: 0.03, pan: r() - 0.5 }); }
      if (alvoCai) for (let k = 0; k < 5; k++) s.toque(alvoCai.cai + 0.3 + k * 0.07, { vol: 0.12 - k * 0.02, corte: 5000, dur: 0.04, pan: 0.5 });
      // boneco comemorando e o acorde final de caixinha
      for (const bo of todas('boneco')) for (const ac of bo.acoes || []) if (ac.tipo === 'comemora') { s.sino('G6', ac.de, 0.5, { vol: 0.06, brilho: 2 }); s.sino('C7', ac.de + 0.12, 0.7, { vol: 0.06, brilho: 2 }); }
      M.final.forEach((n, i) => s.sino(n, 7.6 + i * 0.22, 2.2, { vol: 0.08, pan: (i - 1.5) * 0.3, brilho: 2.2 }));
      M.final.forEach((n, i) => s.sino(n.replace(/\d/, (d) => String(Number(d) - 2)), 7.6 + i * 0.22, 1.6, { vol: 0.09, brilho: 0.7 }));
      s.nota('C3', 7.5, 2.0, { forma: 'tri', vol: 0.14, ataque: 0.2, solta: 0.6 });
      s.sala(0.55);
      return s.fim({ entra: 0.2, sai: 0.5, pico: 0.88 });
    }

    return { desenhar, som };
  },
});
