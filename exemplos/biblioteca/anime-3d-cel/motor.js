// MOTOR "anime-3d-cel" — anime desenhado, só que montado em 3D (three.js, sem placa de vídeo).
// O 3D é pintado para parecer desenho 2D: cada superfície tem só DUAS cores duras (luz e sombra fria
// azul-violeta) com a borda tremida de pincel, contorno azul-marinho (casca invertida nos bonecos,
// borda de profundidade no cenário), céu pintado em shader, névoa de distância, raios de luz, brilho
// macio nas luzes, vinheta e grão. Bonecos mexem de 2 em 2 quadros, água e névoa de 3 em 3, câmera
// lisa. Vertical (1080x1920). A narração da fonte vira LEGENDA (não há voz), com música e sons
// feitos em código nos mesmos tempos da imagem.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import { criarMateriais } from './cel.js';
import { criarBonecos } from './bonecos.js';
import { criarPos } from './pos.js';

THREE.ColorManagement.enabled = false;   // a cor da história vai como está, sem conversão
const { limita, mistura, trecho, suave, sorteio, saiDevagar, vaiVolta } = Filme;
const RAD = Math.PI / 180;

// curva por pontos [[t, valor], ...]: reta entre um ponto e outro, com a curva macia
function curva(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return mistura(va, vb, suave((t - a) / (b - a))); }
  return pts[pts.length - 1][1];
}
// volta para trás passando um pouco do ponto (o "overshoot" do anime)
const passaVolta = (k) => { const x = k - 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; };

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 15,
  montar({ historia: H, tela, largura: L, altura: A, duracao, fps }) {
    const C = H.cores, FI = H.filme;
    const PB = H.posesBoneco || 15, PA = H.posesAgua || 10;
    const emB = (t) => Math.floor(t * PB + 1e-6) / PB;      // bonecos: de 2 em 2 quadros
    const emA = (t) => Math.floor(t * PA + 1e-6) / PA;      // água e névoa: de 3 em 3
    const pecas = H.pecas, uma = (tipo) => pecas.find((p) => p.tipo === tipo), todas = (tipo) => pecas.filter((p) => p.tipo === tipo);

    // ---------- renderizador, cena, câmera ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, L / A, 0.1, 1000);
    const M = criarMateriais(C);
    M.G.uRes.value.set(L, A); M.G.uLarg.value = (FI.contorno || 3) * L / 1080;
    const B = criarBonecos(M, C);
    const { peca } = B;
    const ceu = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), M.ceu); ceu.frustumCulled = false; ceu.renderOrder = -10; cena.add(ceu);
    const garganta = new THREE.Group(), mapaG = new THREE.Group(); cena.add(garganta, mapaG);

    // ruído macio em 2D (para descascar o penhasco), feito do ruído 1D do kit
    const r2 = (x, y, s) => Filme.ruido(x + 7.3 * Filme.ruido(y * 0.7, s + 1), s);

    // ---------- a garganta: leito, rio, paredões, a ferradura da cachoeira, planalto com neve ----------
    const GA = uma('garganta'), CX = GA.centro, R = GA.raio, HT = GA.altura, ABR = GA.abertura * RAD;
    {
      const chao = new THREE.Mesh(new THREE.PlaneGeometry(60, 160, 1, 1), M.cel(C.lama, { risco: 0.18, pincel: 1.2 }));
      chao.rotation.x = -Math.PI / 2; chao.position.set(0, 0, 0); garganta.add(chao);
      for (const P of todas('poca')) {
        const g = new THREE.CircleGeometry(P.raio, 18); const pos = g.attributes.position;
        for (let i = 1; i < pos.count; i++) { const k = 1 + 0.25 * Filme.ruido(i * 0.9, 31 + P.x); pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k * 0.7); }
        const m = new THREE.Mesh(g, M.cel(C.agua)); m.rotation.x = -Math.PI / 2; m.position.set(P.x, 0.02, P.z); garganta.add(m);
      }
      // paredões dos dois lados do rio: caixa com a face de dentro descascada
      for (const s of [-1, 1]) {
        const comp = GA.comprimento + 6, g = new THREE.BoxGeometry(12, HT + 2, comp, 6, 14, 60);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          if (x * s < -5.9) {   // face de dentro (virada para o rio)
            const d = 0.9 * r2(z * 0.18, y * 0.3, 3 + s) + 0.5 * r2(z * 0.5, y * 0.8, 9 + s) + 0.6 * Math.floor((y + 8) / 3.5) * 0.25;
            p.setX(i, x + s * d);
          }
        }
        g.computeVertexNormals();
        const m = peca(g, C.penhasco, { contorno: false, mat: { risco: 0.35, pincel: 1.4 } });
        m.position.set(s * (R + 6), (HT + 2) / 2 - 2 - 0.05, CX[2] + comp / 2 - 1); garganta.add(m);
      }
      // a ferradura: penhasco atrás e a cortina de água na frente
      const t0 = Math.PI - ABR / 2;
      const gp = new THREE.CylinderGeometry(R + 0.7, R + 0.7, HT + 2, 90, 10, true, t0, ABR);
      { const p = gp.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z);
          const k = 1 + (0.05 * r2(a * 6, y * 0.3, 21) + 0.03 * Math.floor((y + 8) / 3) % 2) ; p.setXYZ(i, x * k, y, z * k); } }
      gp.computeVertexNormals();
      const pen = new THREE.Mesh(gp, M.cel(C.penhasco, { risco: 0.35, pincel: 1.4, dois: true })); pen.position.set(CX[0], (HT + 2) / 2 - 2, CX[2]); garganta.add(pen);
      const ca = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HT, 90, 1, true, t0, ABR), M.cachoeira); ca.position.set(CX[0], HT / 2, CX[2]); garganta.add(ca);
      // planalto com neve: um retângulo grande com o buraco da garganta
      const forma = new THREE.Shape(); const W = 140;
      forma.moveTo(-W, -W); forma.lineTo(W, -W); forma.lineTo(W, W); forma.lineTo(-W, W); forma.lineTo(-W, -W);
      const buraco = new THREE.Path(); const zFim = CX[2] + GA.comprimento + 5;
      // forma no plano xy; depois deita (y da forma vira -z do mundo)
      buraco.moveTo(-R - 0.2, -zFim);
      for (let i = 0; i <= 40; i++) { const a = -ABR / 2 + ABR * i / 40; buraco.lineTo(CX[0] + (R + 0.6) * Math.sin(a), -(CX[2] - (R + 0.6) * Math.cos(a))); }
      buraco.lineTo(R + 0.2, -zFim); buraco.lineTo(-R - 0.2, -zFim);
      forma.holes.push(buraco);
      const pl = new THREE.Mesh(new THREE.ShapeGeometry(forma, 6), M.cel(C.neve, { pincel: 0.6 })); pl.rotation.x = -Math.PI / 2; pl.position.y = HT; garganta.add(pl);
    }
    // o rio no leito (sobe e desce com o nível) e o rio de cima, que alimenta a queda
    const rio = new THREE.Mesh(new THREE.PlaneGeometry(2 * R + 4, 150), M.rio); rio.rotation.x = -Math.PI / 2; rio.position.set(0, 0, CX[2] + 70); garganta.add(rio);
    const rioCima = new THREE.Mesh(new THREE.PlaneGeometry(2 * R - 4, 60), M.rio); rioCima.rotation.x = -Math.PI / 2; rioCima.position.set(0, HT + 0.03, CX[2] - R - 30); garganta.add(rioCima);
    // pinheiros (cones em dois andares, por instância)
    {
      const P = uma('pinheiros'), acaso = sorteio(H.semente + 3), lista = [];
      for (let tent = 0; tent < P.quantos * 6 && lista.length < P.quantos; tent++) {
        const x = mistura(P.area[0], P.area[1], acaso()), z = mistura(P.area[2], P.area[3], acaso());
        const dentro = (z > CX[2] && Math.abs(x) < P.fora) || (Math.hypot(x - CX[0], z - CX[2]) < R + 3.5);
        if (dentro) continue;
        lista.push([x, z, mistura(P.altura[0], P.altura[1], acaso())]);
      }
      const O = new THREE.Object3D();
      for (const [andar, k, sobe] of [[0, 1, 0.35], [1, 0.7, 0.75]]) {
        const im = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), M.cel(andar ? C.pinheiro : C.pinheiroEscuro || C.pinheiro, { pincel: 1.5 }), lista.length);
        lista.forEach(([x, z, h], i) => { O.position.set(x, HT + h * sobe, z); O.scale.set(h * 0.32 * k, h * 0.62, h * 0.32 * k); O.rotation.set(0, i, 0); O.updateMatrix(); im.setMatrixAt(i, O.matrix); });
        garganta.add(im);
      }
    }
    // pedras do leito
    for (const P of todas('pedra')) {
      const g = new THREE.IcosahedronGeometry(P.raio, 1); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * Filme.ruido(i * 1.7, 41 + Math.round(P.x * 10)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      g.computeVertexNormals();
      const m = peca(g, C.pedra, { mat: { pincel: 2.5 }, p: [P.x, 0, P.z], s: [1, P.achata, 1] }); garganta.add(m);
    }
    // névoa no pé da queda
    const NV = uma('nevoa'), nevoas = [];
    { const acaso = sorteio(H.semente + 5);
      for (let i = 0; i < NV.quantas; i++) {
        const x = mistura(NV.x[0], NV.x[1], i / (NV.quantas - 1)), z = CX[2] - Math.sqrt(Math.max(0, R * R - x * x)) + 2.5;
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M.nevoa); m.position.set(x, 0.8, z); garganta.add(m);
        nevoas.push({ m, x, z, r: mistura(NV.raio[0], NV.raio[1], acaso()), f: acaso() * 10 });
      } }
    // pingos (o dia inteiro pingando)
    const AG = H.agua, PG = AG.pingos;
    const pingos = PG.x.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.cel(C.aguaClara)); m.scale.set(1, 2.2, 1); garganta.add(m); return m; });
    const quedaPingo = (i, t) => { const per = PG.periodo * (1 + 0.23 * i), ini = PG.de + 0.13 * i; if (t < ini || t > PG.ate) return null; const k = ((t - ini) % per) / per; return k; };

    // gelo do estouro (em cima da borda da queda)
    const GE = uma('gelo-estouro');
    const blocosE = []; { const acaso = sorteio(GE.semente);
      for (let i = 0; i < GE.quantos; i++) {
        const w = mistura(0.8, 1.8, acaso()), h = mistura(0.5, 1.1, acaso()), d = mistura(0.7, 1.4, acaso());
        const m = peca(new THREE.BoxGeometry(w, h, d), C.gelo, { mat: { pincel: 2 } }); garganta.add(m);
        const x = mistura(GE.x[0], GE.x[1], acaso()), y = mistura(GE.y[0], GE.y[1], acaso());
        blocosE.push({ m, x, y, z: GE.z + (acaso() - 0.5) * 1.2, r0: [acaso() * 0.6, acaso() * 3, acaso() * 0.6],
          v: [x * 0.35 + (acaso() - 0.5) * 3, 2 + 5 * acaso(), 12 + 9 * acaso()], giro: [(acaso() - 0.5) * 8, (acaso() - 0.5) * 6, (acaso() - 0.5) * 8], atraso: acaso() * 0.12 });
      } }

    // ---------- o mapa pintado, visto do alto ----------
    const MP = uma('mapa'), M0 = MP.centro;
    { const base = new THREE.Mesh(new THREE.PlaneGeometry(MP.largura, MP.comprimento), M.mapa); base.rotation.x = -Math.PI / 2; base.position.set(...M0); mapaG.add(base);
      // pinheirinhos na terra do mapa (fora do lago e do rio)
      const acaso = sorteio(H.semente + 9), O = new THREE.Object3D(), lista = [];
      for (let tent = 0; tent < 600 && lista.length < 70; tent++) {
        const u = acaso(), v = acaso();
        const lago = Math.hypot((u - 0.5), (v - 0.86) * 1.9) < 0.47;
        const rx = 0.5 + 0.07 * Math.sin(v * 9) + 0.03 * Math.sin(v * 23);
        if (lago || Math.abs(u - rx) < 0.07 || u < 0.04 || u > 0.96 || v < 0.03) continue;
        lista.push([M0[0] + (u - 0.5) * MP.largura, M0[2] + (0.5 - v) * MP.comprimento, 0.8 + 0.8 * acaso()]);
      }
      const im = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), M.cel(C.pinheiro, { pincel: 1.5 }), lista.length);
      lista.forEach(([x, z, h], i) => { O.position.set(x, h * 0.5, z); O.scale.set(h * 0.35, h, h * 0.35); O.rotation.set(0, i, 0); O.updateMatrix(); im.setMatrixAt(i, O.matrix); });
      mapaG.add(im); }
    // placas de gelo levadas pelo vento até a foz
    const GM = uma('gelo-mapa'), placas = [];
    { const acaso = sorteio(GM.semente), n = GM.quantos;
      for (let i = 0; i < n; i++) {
        const w = mistura(1.0, 2.2, acaso()), d = mistura(0.8, 1.7, acaso());
        const m = peca(new THREE.BoxGeometry(w, 0.3, d), C.gelo, { mat: { pincel: 2 } }); mapaG.add(m);
        const camada = Math.floor(i / 9), col = i % 9;
        placas.push({ m,
          ini: [mistura(GM.lago[0], GM.lago[1], acaso()), mistura(GM.lago[2], GM.lago[3], acaso())],
          fim: [GM.foz[0] + (col % 3 - 1) * 1.7 + (acaso() - 0.5) * 0.6, 0.18 + camada * 0.28, GM.foz[1] + (Math.floor(col / 3) - 1) * 1.3 + (acaso() - 0.5) * 0.5],
          giro0: acaso() * 3, giro1: (acaso() - 0.5) * 0.9, inclina: (acaso() - 0.5) * 0.25 * camada,
          sai: mistura(GM.de, GM.ate - 0.75, i / (n - 1)) + (acaso() - 0.5) * 0.08, dura: 0.55 + 0.2 * acaso() });
      } }
    const chegadaPlaca = (p) => p.sai + p.dura;

    // ---------- os bonecos ----------
    const MN = uma('menina'), CH = uma('cachorro'), MQ = uma('mosquete');
    const me = B.menina(), ca = B.cachorro(), mq = B.mosquete();
    garganta.add(me.raiz, ca.raiz, mq.raiz);
    mq.raiz.rotation.order = 'YXZ';
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.brilho(C.lanterna)); halo.frustumCulled = false; garganta.add(halo);
    const faisca = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.brilho('#ffffff')); faisca.material.uniforms.uEstrela.value = 1; garganta.add(faisca);
    const lamas = []; for (let i = 0; i < 12; i++) { const m = peca(new THREE.SphereGeometry(0.035, 8, 6), C.lamaEscura || C.lama, { contorno: false }); garganta.add(m); lamas.push(m); }
    const sombraMe = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18), new THREE.MeshBasicMaterial({ color: C.tinta, transparent: true, opacity: 0.35, depthWrite: false }));
    const sombraCa = sombraMe.clone(); sombraMe.rotation.x = sombraCa.rotation.x = -Math.PI / 2; garganta.add(sombraMe, sombraCa);

    // lugar no caminho (reta entre pontos)
    function noCaminho(cm, t) {
      if (t <= cm[0].t) return cm[0];
      for (let i = 1; i < cm.length; i++) if (t < cm[i].t) {
        const a = cm[i - 1], b = cm[i], k = (t - a.t) / (b.t - a.t);
        return { x: mistura(a.x, b.x, k), y: mistura(a.y, b.y, k), z: mistura(a.z, b.z, k), giro: mistura(a.giro, b.giro, k) };
      }
      return cm[cm.length - 1];
    }
    const acao = (P, tipo, t) => P.acoes.find((a) => a.tipo === tipo && t >= a.de && t < a.ate);

    function poseMenina(t) {
      const p = noCaminho(MN.caminho, t), q = noCaminho(MN.caminho, t - 0.12);
      const vel = Math.hypot(p.x - q.x, p.z - q.z) / 0.12;
      let y = p.y, sy = 1, inclina = 0, lado = 0, bE = 0.15, bD = -0.3, cab = 0, pes = 0, trancaX = 0.15;
      me.raiz.position.set(p.x, 0, p.z); me.raiz.rotation.y = p.giro * RAD;
      const pu = acao(MN, 'pula', t), an = acao(MN, 'anda', t), re = acao(MN, 'recua', t), se = acao(MN, 'senta', t), er = acao(MN, 'ergue', t);
      if (pu) {
        const k = trecho(t, pu.de, pu.ate);
        if (k < 0.25) { const a = suave(k / 0.25); sy = 1 - 0.16 * a; inclina = 0.25 * a; bE = bD = 0.4 * a; }
        else if (k < 0.78) { const a = (k - 0.25) / 0.53; y += 0.42 * Math.sin(Math.PI * a); sy = 1.1 - 0.1 * a; inclina = 0.1; bE = -2.2; bD = -1.4; trancaX = -0.6 * (1 - a); }
        else { const a = (k - 0.78) / 0.22; sy = 0.8 + 0.2 * passaVolta(a); inclina = 0.2 * (1 - a); bE = mistura(-2.2, 0.15, a); bD = mistura(-1.4, -0.3, a); trancaX = 0.6 * vaiVolta(a); }
      }
      if (an) {
        const fase = trecho(t, an.de, an.ate) * an.passos * Math.PI;
        y += 0.035 * Math.abs(Math.sin(fase)); lado = 0.06 * Math.sin(fase); bE = 0.15 + 0.45 * Math.sin(fase); bD = -0.35 - 0.2 * Math.sin(fase);
        pes = Math.sin(fase); inclina = 0.08; trancaX = 0.3 + 0.2 * Math.abs(Math.cos(fase));
      }
      if (re) {
        const k = trecho(t, re.de, re.ate);
        if (k < 0.28) { const a = suave(k / 0.28); inclina = 0.12 * a; sy = 1 - 0.06 * a; }
        else { const a = passaVolta(saiDevagar((k - 0.28) / 0.72)); inclina = mistura(0.12, -0.32, a); sy = mistura(0.94, 1.04, a); bE = mistura(0.15, -2.3, a); bD = mistura(-0.3, -1.9, a); cab = -0.25 * a; trancaX = mistura(0.15, 0.9, vaiVolta(limita((k - 0.28) / 0.5))); }
      }
      if (se) { sy = 0.86; pes = 0; const bal = Math.sin(t * 5.5); me.pernas.forEach((g) => g.rotation.set(0, 0, 0)); cab = -0.28 + 0.06 * Math.sin(t * 1.3); bD = -0.5; bE = 0.25 + 0.1 * bal; trancaX = 0.15 + 0.08 * bal; }
      if (er || (MN.acoes.find((a) => a.tipo === 'ergue') && t >= MN.acoes.find((a) => a.tipo === 'ergue').ate)) {
        const a0 = MN.acoes.find((a) => a.tipo === 'ergue'), k = er ? trecho(t, er.de, er.ate) : 1;
        const a = k < 0.2 ? -0.15 * suave(k / 0.2) : passaVolta(saiDevagar((k - 0.2) / 0.8));   // antecipa (desce) e sobe passando do ponto
        bD = mistura(-0.3, -2.75, a); cab = -0.18 * limita(a); sy = 1 + 0.05 * vaiVolta(limita(k)); trancaX = 0.15 + 0.4 * vaiVolta(limita(k)); void a0;
      }
      me.raiz.position.y = y;
      me.corpo.scale.set(1 + (1 - sy) * 0.5, sy, 1 + (1 - sy) * 0.5);
      me.corpo.rotation.set(inclina, 0, lado);
      me.cabeca.rotation.set(cab, 0, -lado * 0.8);
      me.bracos[0].rotation.set(bD, 0, -0.12); me.bracos[1].rotation.set(bE, 0, 0.12);
      me.pernas.forEach((g, i) => { g.position.z = (i ? 1 : -1) * 0.06 * pes; });
      // continuação: cachecol e tranças atrasam o corpo
      me.ponta.rotation.set(0.25 + limita(vel * 0.35, 0, 0.9) + 0.12 * Math.sin(t * 7), 0, 0.1 * Math.sin(t * 4));
      me.trancas.forEach((g, i) => g.rotation.set(trancaX + 0.1 * Math.sin(t * 5 + i), 0, (i ? 1 : -1) * 0.1));
      // botas na pose sentada: para frente, balançando
      if (se) { me.corpo.children.slice(0, 2).forEach((b, i) => { b.position.set((i ? 1 : -1) * 0.08, 0.1 + 0.03 * Math.sin(t * 5.5 + i * 3), 0.14); }); }
      else me.corpo.children.slice(0, 2).forEach((b, i) => { b.position.set((i ? 1 : -1) * 0.08, 0.06, 0.02 + (i ? 1 : -1) * 0.07 * pes); });
      sombraMe.position.set(p.x, p.y + 0.012, p.z); sombraMe.scale.setScalar(1 - 0.4 * limita((y - p.y) / 0.42));
    }

    function poseCachorro(t) {
      const p = noCaminho(CH.caminho, t);
      ca.raiz.position.set(p.x, p.y, p.z); ca.raiz.rotation.y = p.giro * RAD;
      let pitch = 0, cab = 0, cauda = 0.4 * Math.sin(t * 6), dy = 0;
      const pernas = [0, 0, 0, 0];
      const an = acao(CH, 'anda', t), cv = acao(CH, 'cava', t), px = acao(CH, 'puxa', t), ab = acao(CH, 'abana', t), se = acao(CH, 'senta', t);
      if (an) { const f = trecho(t, an.de, an.ate) * an.passos * Math.PI; pernas[0] = pernas[3] = 0.55 * Math.sin(f); pernas[1] = pernas[2] = -0.55 * Math.sin(f); dy = 0.025 * Math.abs(Math.cos(f)); cauda = 0.5 * Math.sin(t * 14); }
      if (cv) { const f = t * 30; pitch = 0.32; cab = 0.65; pernas[0] = -0.9 + 0.7 * Math.sign(Math.sin(f)); pernas[1] = -0.9 - 0.7 * Math.sign(Math.sin(f)); cauda = 0.7 * Math.sin(t * 20); }
      if (px) { const k = trecho(t, px.de, px.ate), puxao = Math.abs(Math.sin(k * Math.PI * 3)); pitch = -0.22 - 0.1 * puxao; cab = 0.55; pernas[2] = pernas[3] = 0.4; pernas[0] = pernas[1] = -0.5; dy = -0.03 * puxao; }
      if (ab) { cauda = 0.8 * Math.sin(t * 26); cab = -0.12 + 0.08 * Math.sin(t * 3); }
      if (se) { pitch = -0.42; pernas[2] = pernas[3] = -1.25; pernas[0] = pernas[1] = 0.42; cab = -0.35 + 0.1 * Math.sin(t * 1.1); dy = -0.06; }
      ca.corpo.position.y = 0.28 + dy; ca.corpo.rotation.set(pitch, 0, 0);
      ca.cabeca.rotation.set(cab, 0.15 * Math.sin(t * 0.9), 0);
      ca.pernas.forEach((g, i) => g.rotation.set(pernas[i], 0, 0));
      ca.cauda.rotation.set(-0.5, 0, cauda);
      sombraCa.position.set(p.x, p.y + 0.011, p.z); sombraCa.scale.set(0.9, 1.25, 1);
    }

    function poseMosquete(t) {
      const P = MQ.pontos; let a = P[0], b = P[0], k = 0;
      for (let i = 1; i < P.length; i++) { if (t < P[i].t) { a = P[i - 1]; b = P[i]; k = suave((t - a.t) / (b.t - a.t)); break; } a = b = P[i]; }
      mq.raiz.position.set(...[0, 1, 2].map((i) => mistura(a.pos[i], b.pos[i], k)));
      mq.raiz.rotation.set(mistura(a.giro[0], b.giro[0], k), mistura(a.giro[1], b.giro[1], k) * RAD, 0);
      // lama que voa para trás quando o cachorro cava
      const LM = MQ.lama; const dirX = Math.sin(ca.raiz.rotation.y), dirZ = Math.cos(ca.raiz.rotation.y);
      lamas.forEach((m, i) => {
        const sai = LM.de + i * (LM.ate - LM.de) / lamas.length, k2 = (t - sai) / 0.38;
        m.visible = k2 >= 0 && k2 <= 1;
        if (!m.visible) return;
        const lado = ((i * 37) % 7 - 3) * 0.06;
        m.position.set(LM.x - dirX * (0.1 + 0.7 * k2) + lado * dirZ, 0.05 + 0.5 * Math.sin(Math.PI * k2), LM.z - dirZ * (0.1 + 0.7 * k2) - lado * dirX);
      });
    }

    // ---------- câmera: pontos com a curva de Catmull-Rom (lisa, quadro a quadro) ----------
    const tmp = new THREE.Vector3();
    function lugar(v, t) {
      if (Array.isArray(v)) return v;
      if (v.peca === 'lanterna') { me.luz.getWorldPosition(tmp); return [tmp.x + v.d[0], tmp.y + v.d[1], tmp.z + v.d[2]]; }
      return [0, 0, 0];
    }
    function camNo(P, campo, t) {
      const K = P.camera, val = (k) => (campo === 'fov' ? [k.fov] : lugar(k[campo], t));
      if (t <= K[0].t) return val(K[0]);
      if (t >= K[K.length - 1].t) return val(K[K.length - 1]);
      let i = 0; while (t > K[i + 1].t) i++;
      const a = K[i], b = K[i + 1], dt = b.t - a.t, u = (t - a.t) / dt;
      const tang = (j) => { const j0 = Math.max(0, j - 1), j1 = Math.min(K.length - 1, j + 1); const p0 = val(K[j0]), p1 = val(K[j1]); return p0.map((x, c) => (p1[c] - x) / (K[j1].t - K[j0].t)); };
      const ma = tang(i), mb = tang(i + 1), pa = val(a), pb = val(b);
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      return pa.map((x, c) => h00 * x + h10 * dt * ma[c] + h01 * pb[c] + h11 * dt * mb[c]);
    }

    // ---------- céu e luz: estados da história misturados no tempo ----------
    const CAMPOS = ['topo', 'meio', 'horiz', 'nuvem', 'nuvemSombra', 'astro', 'serra', 'luz', 'sombra', 'neblina', 'tinta'];
    const corA = new THREE.Color(), corB = new THREE.Color();
    function ceuNo(P, t) {
      const K = P.ceu; let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
      const a = H.ceus[K[i][1]], b = i + 1 < K.length ? H.ceus[K[i + 1][1]] : a;
      const k = i + 1 < K.length ? suave(trecho(t, K[i][0], K[i + 1][0])) : 0;
      const o = {};
      for (const c of CAMPOS) o[c] = new THREE.Color().copy(corA.set(a[c])).lerp(corB.set(b[c]), k);
      for (const c of ['astroTam', 'estrelas', 'nuvens']) o[c] = mistura(a[c], b[c], k);
      return o;
    }

    // ---------- legenda: maiúsculas em traços, brancas com contorno escuro, no terço de baixo ----------
    const LG = H.legenda, ctxL = null;
    function legenda(t) {
      const cv = pos.legenda, c = cv.getContext('2d');
      c.reset();
      const lg = (H.legendas || []).find((l) => t >= l.de && t < l.ate);
      if (!lg) return;
      const u = L / 1080, tam = LG.tam * u, maxL = LG.largura * u;
      const palavras = lg.texto.toUpperCase().split(/\s+/), linhas = []; let atual = [];
      for (const p of palavras) { const tenta = [...atual, p].join(' '); if (atual.length && Letras.largura(tenta, tam) > maxL) { linhas.push(atual.join(' ')); atual = [p]; } else atual.push(p); }
      if (atual.length) linhas.push(atual.join(' '));
      const passo = tam * 1.45, y0 = LG.y * A - (linhas.length - 1) * passo / 2 - tam / 2;
      const alfa = limita((t - lg.de) / 0.12) * limita((lg.ate - t) / 0.12);
      c.globalAlpha = alfa; c.lineCap = 'round'; c.lineJoin = 'round';
      const passa = (larg, cor) => {
        c.lineWidth = larg; c.strokeStyle = cor;
        linhas.forEach((txt, li) => {
          let px = L / 2 - Letras.largura(txt, tam) / 2; const py = y0 + li * passo;
          for (const ch of txt) {
            const gl = Letras.letra(ch); if (!gl) { px += 0.42 * tam; continue; }
            for (const tr of gl.tracos) { c.beginPath(); tr.forEach(([a, b], i) => (i ? c.lineTo(px + a * tam, py + b * tam) : c.moveTo(px + a * tam, py + b * tam))); c.stroke(); }
            px += (gl.w + 0.2) * tam;
          }
        });
      };
      passa(tam * 0.3, C.tinta);
      passa(tam * 0.13, '#ffffff');
      void ctxL;
    }

    const pos = criarPos(render, L, A);
    const proj = new THREE.Vector3();

    // ---------- arruma a cena para um plano no tempo t ----------
    function arruma(P, t) {
      const naGarganta = P.cenario === 'garganta';
      garganta.visible = naGarganta; mapaG.visible = !naGarganta;
      const c = camNo(P, 'pos', t), o = camNo(P, 'olha', t);
      camera.position.set(c[0], c[1], c[2]); camera.lookAt(o[0], o[1], o[2]);
      camera.fov = camNo(P, 'fov', t)[0]; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      ceu.position.copy(camera.position);
      const S = ceuNo(P, t), U = M.ceu.uniforms;
      U.uTopo.value.copy(S.topo); U.uMeio.value.copy(S.meio); U.uHoriz.value.copy(S.horiz); U.uNuvem.value.copy(S.nuvem); U.uNuvemSombra.value.copy(S.nuvemSombra);
      U.uAstroCor.value.copy(S.astro); U.uSerra.value.copy(S.serra); U.uAstroTam.value = S.astroTam; U.uEstrelas.value = S.estrelas; U.uNuvens.value = S.nuvens;
      U.uDeriva.value = emA(t) * 0.05; U.uSerras.value = naGarganta ? 1 : 0;
      const ad = new THREE.Vector3(...P.astro).normalize(); U.uAstroDir.value.copy(ad);
      M.G.uLuzDir.value.copy(ad).add(new THREE.Vector3(0, 0.35, 0.25)).normalize();
      M.G.uLuzCor.value.copy(S.luz); M.G.uSombra.value.copy(S.sombra); M.G.uTinta.value.copy(S.tinta);
      halo.material.uniforms.uForca.value = mistura(0.55, 1.0, S.estrelas);
      halo.quaternion.copy(camera.quaternion); faisca.quaternion.copy(camera.quaternion);
      // onde a lua/o sol cai na tela (para os raios)
      proj.copy(camera.position).addScaledVector(ad, 500).project(camera);
      const naFrente = proj.z < 1 && Math.abs(proj.x) < 2.2 && Math.abs(proj.y) < 2.2;
      return { sol: new THREE.Vector2(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5), raios: naFrente ? (P.raios || 0) : 0, neblina: S.neblina, tinta: S.tinta, nebDens: P.neblina[0], nebMax: P.neblina[1] };
    }

    // ---------- desenhar(t) ----------
    const planoEm = (t) => H.planos.find((p) => t >= p.de && t < p.ate) || H.planos[H.planos.length - 1];
    function desenhar(t) {
      const tb = emB(t), ta = emA(t), quadro = Math.round(t * fps);

      // água: quanto cai e onde está o nível (de 3 em 3 quadros)
      const fluxo = curva(AG.fluxo, ta); M.G.uFluxo.value = fluxo; M.G.uTa.value = ta;
      const nivel = curva(AG.nivel, ta);
      rio.visible = nivel > -0.2; rio.position.y = nivel;
      rioCima.visible = fluxo > 0.05;
      nevoas.forEach((n, i) => { const s = n.r * (0.3 + 0.7 * fluxo) * (1 + 0.08 * Filme.ruido(ta * 3 + n.f, 50 + i)); n.m.scale.set(s, s * 0.75, s); n.m.position.y = 0.6 + 0.25 * Filme.ruido(ta * 2 + n.f, 60 + i); n.m.visible = fluxo > 0.04; });
      pingos.forEach((m, i) => { const k = quedaPingo(i, ta); m.visible = k !== null; if (k !== null) m.position.set(PG.x[i], PG.altura * (1 - k * k), PG.z + 0.3 * i); });

      // gelo do estouro
      blocosE.forEach((b) => {
        const dt = tb - GE.estoura - b.atraso;
        b.m.visible = t >= GE.aparece && t < GE.estoura + 0.75;   // nasce no corte (nunca no meio do plano) e some antes do plano final
        if (dt <= 0) { b.m.position.set(b.x, b.y, b.z); b.m.rotation.set(...b.r0); return; }
        const x = b.x + b.v[0] * dt, y = b.y + b.v[1] * dt - 4.9 * dt * dt, z = b.z + b.v[2] * dt;
        b.m.position.set(x, y, z); b.m.rotation.set(b.r0[0] + b.giro[0] * dt, b.r0[1] + b.giro[1] * dt, b.r0[2] + b.giro[2] * dt);
        if (y < -1 || z > -29) b.m.visible = false;
      });

      // placas de gelo no mapa
      M.mapa.uniforms.uSeca.value = suave(trecho(ta, MP.seca[0], MP.seca[1])); M.mapa.uniforms.uVento.value = ta * MP.vento;
      placas.forEach((p) => {
        const k = trecho(tb, p.sai, p.sai + p.dura), ke = k * k * (1.6 - 0.6 * k);   // o vento empurra cada vez mais
        const x = mistura(p.ini[0], p.fim[0], ke), z = mistura(p.ini[1], p.fim[2], ke);
        const chegou = tb >= p.sai + p.dura, bate = chegou ? trecho(tb, p.sai + p.dura, p.sai + p.dura + 0.25) : 0;
        const y = chegou ? p.fim[1] : 0.18 + (p.fim[1] - 0.18) * suave(limita((k - 0.7) / 0.3));
        p.m.position.set(M0[0] + x, y, M0[2] + z);
        p.m.rotation.set(chegou ? p.inclina : 0, mistura(p.giro0, p.giro1, suave(k)), chegou ? p.inclina * 0.5 : 0);
        const sq = chegou ? 1 - 0.3 * Math.sin(Math.PI * bate) * (1 - bate) : 1;   // amassa ao bater
        p.m.scale.set(2 - sq, sq, 2 - sq);
      });

      // bonecos (de 2 em 2 quadros)
      poseMenina(tb); poseCachorro(tb); poseMosquete(tb);
      garganta.updateMatrixWorld(true);
      me.luz.getWorldPosition(tmp);
      M.G.uLant.value.copy(tmp); M.G.uLantOn.value = 1; M.G.uLantR.value = 1.05;
      halo.position.copy(tmp); halo.scale.setScalar(0.62 * (1 + 0.04 * Filme.ruido(tb * 4, 70)));
      const BR = MQ.brilho, kb = trecho(t, BR.de, BR.ate);
      faisca.visible = kb > 0 && kb < 1;
      mq.ponta.getWorldPosition(tmp); faisca.position.copy(tmp); faisca.scale.setScalar(0.45 * vaiVolta(kb)); faisca.rotation.z = kb * 1.2;

      // plano e transição
      const P = planoEm(t);
      let tipo = 0, k = 0, clarao = 0, borrao = [0, 0], dois = null, expo = 1;
      for (const tr of H.transicoes) {
        const a = tr.t - tr.dur / 2, kk = (t - a) / tr.dur;
        if (kk < 0 || kk >= 1) continue;
        if (tr.tipo === 'chicote') borrao = tr.borrao.map((v) => v * Math.pow(vaiVolta(kk), 1.5) * L / 1080);
        if (tr.tipo === 'clarao') clarao = Math.max(clarao, Math.pow(1 - Math.abs(2 * kk - 1), 1.5));
        if (tr.tipo === 'casamento') expo = 1 + 0.5 * Math.pow(1 - Math.abs(2 * kk - 1), 2);
        if (tr.tipo === 'estilhaco' || tr.tipo === 'agua') {
          tipo = tr.tipo === 'estilhaco' ? 1 : 2; k = kk;
          dois = [H.planos.find((p) => Math.abs(p.ate - tr.t) < 1e-6), H.planos.find((p) => Math.abs(p.de - tr.t) < 1e-6)];
        }
      }
      for (const cl of H.claroes || []) { const kk = (t - cl.t) / cl.dur; if (kk >= 0 && kk < 1) clarao = Math.max(clarao, cl.forca * Math.pow(1 - kk, 2) * limita(kk * 6)); }

      const filme = (o, i) => ({ ...o, limiar: 0.95, bloom: FI.bloom, vinheta: FI.vinheta, grao: FI.grao, quadro, expo, borda: FI.borda, verProf: FI.verProfundidade });
      if (dois) {
        pos.plano(0, cena, camera, filme(arruma(dois[0], t)));
        pos.plano(1, cena, camera, filme(arruma(dois[1], t)));
      } else {
        pos.plano(0, cena, camera, filme(arruma(P, t)));
      }
      legenda(t);
      pos.junta({ tipo, k, clarao, borrao });
    }

    // ---------- som: tudo nos mesmos tempos da imagem ----------
    function som() {
      const s = Som.criar(duracao, H.semente), MU = H.musica;
      // pad macio
      MU.acordes.forEach((ac, i) => {
        const fim = i + 1 < MU.acordes.length ? MU.acordes[i + 1].t : duracao;
        ac.notas.forEach((n, j) => s.nota(n, ac.t, fim - ac.t + 0.2, { vol: MU.volPad * (j ? 0.7 : 1), forma: 'tri', ataque: 0.5, solta: 0.8, vibrato: 0.003, pan: (j - 1) * 0.4 }));
      });
      // caixinha de música
      MU.caixinha.forEach((n, i) => { if (n) s.sino(n, 0.25 + i * MU.passo, 1.4, { vol: MU.volCaixa, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.6 }); });
      // o estrondo da queda: morre quando a água para e volta no fim
      const f = AG.fluxo, para = f.find((p) => p[1] === 0)[0], volta = f[f.length - 1][0];
      s.vento(0, para + 0.2, { vol: 0.2, corte: 300, onda: 0.7, profundidade: 0.25, entra: 0.2, sai: para - f[1][0] });
      s.vento(0, para, { vol: 0.06, corte: 1300, onda: 0.9, profundidade: 0.3, entra: 0.2, sai: para - f[1][0] });
      const te = GE.estoura;
      s.vento(te, duracao - te, { vol: 0.24, corte: 320, onda: 0.6, profundidade: 0.2, entra: volta - te, sai: 0.4 });
      s.vento(te, duracao - te, { vol: 0.07, corte: 1500, onda: 0.8, profundidade: 0.3, entra: volta - te, sai: 0.4 });
      // transições
      for (const tr of H.transicoes) {
        if (tr.tipo === 'chicote' || tr.tipo === 'agua') s.vento(tr.t - tr.dur / 2, tr.dur, { vol: 0.07, corte: 2600, onda: 2, profundidade: 0.2, entra: tr.dur * 0.6, sai: tr.dur * 0.35 });
        if (tr.tipo === 'estilhaco') ['E7', 'B6', 'G7', 'D7'].forEach((n, i) => s.sino(n, tr.t - 0.18 + i * 0.07, 0.5, { vol: 0.03, pan: (i - 1.5) * 0.4 }));
        if (tr.tipo === 'clarao') s.sino('A6', tr.t, 1.2, { vol: 0.035, brilho: 3 });
      }
      // placas de gelo batendo na foz
      placas.forEach((p, i) => { const tc = emB(chegadaPlaca(p)) + 1 / PB; s.toque(tc, { vol: 0.045, corte: 2200, dur: 0.05, pan: 0.2 * ((i % 5) - 2) }); if (i % 4 === 0) s.batida(tc, { vol: 0.12, freq: 85, dur: 0.18 }); });
      // menina: pulo, passos, susto, lanterna
      for (const a of MN.acoes) {
        if (a.tipo === 'pula') { const pousa = emB(a.de + 0.78 * (a.ate - a.de)); s.batida(pousa, { vol: 0.14, freq: 120, dur: 0.12 }); s.toque(pousa, { vol: 0.05, corte: 900 }); }
        if (a.tipo === 'anda') for (let j = 0; j < a.passos; j++) s.toque(emB(a.de + (j + 0.5) * (a.ate - a.de) / a.passos), { vol: 0.045, corte: 700, dur: 0.07, pan: j % 2 ? 0.15 : -0.15 });
        if (a.tipo === 'recua') s.pio(a.de + 0.28 * (a.ate - a.de), { freq: 820, sobe: 0.6, vol: 0.025, repete: 1, dur: 0.12 });
        if (a.tipo === 'ergue') MU.final.forEach((n, j) => s.sino(n, a.de + 0.12 + j * 0.09, 2.2, { vol: 0.06, pan: (j - 1.5) * 0.3 }));
      }
      // cachorro: patinhas, cava, puxa
      for (const a of CH.acoes) {
        if (a.tipo === 'anda') for (let j = 0; j < a.passos; j++) s.toque(emB(a.de + (j + 0.5) * (a.ate - a.de) / a.passos), { vol: 0.025, corte: 1400, dur: 0.04 });
        if (a.tipo === 'cava') for (let x = a.de; x < a.ate; x += 2 / PB) s.toque(emB(x), { vol: 0.05, corte: 650, dur: 0.06 });
        if (a.tipo === 'puxa') for (let j = 0; j < 3; j++) s.batida(a.de + (j + 0.5) * (a.ate - a.de) / 3, { vol: 0.12, freq: 75, dur: 0.15 });
      }
      // o mosquete sai da lama (tinido) e a baioneta brilha
      s.sino('A5', MQ.pontos[2].t, 0.5, { vol: 0.05, brilho: 4 }); s.sino('D6', MQ.pontos[2].t + 0.03, 0.4, { vol: 0.03, brilho: 4 });
      s.sino('E7', MQ.brilho.de + 0.1, 0.8, { vol: 0.045 });
      // pingos
      PG.x.forEach((_, i) => { for (let x = PG.de; x <= PG.ate; x += 1 / PA) { const k1 = quedaPingo(i, emA(x)), k0 = quedaPingo(i, emA(x - 1 / PA)); if (k1 !== null && k0 !== null && k1 < k0) s.sino(i % 2 ? 'E6' : 'A6', emA(x), 0.35, { vol: 0.03, pan: (i - 1) * 0.5 }); } });
      // o estouro do gelo e o clarão
      s.batida(te, { vol: 0.5, freq: 55, dur: 0.7 });
      for (let j = 0; j < 8; j++) s.toque(te + j * 0.045, { vol: 0.07, corte: 2500, dur: 0.08, pan: (j % 3 - 1) * 0.5 });
      for (const cl of H.claroes || []) s.batida(cl.t, { vol: 0.35, freq: 45, dur: 0.9 });
      s.sala(0.3);
      return s.fim({ entra: 0.3, sai: 1.0, pico: 0.78 });
    }

    return { desenhar, som };
  },
});
