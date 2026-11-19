// MOTOR "e-se-3d" — explicativo vertical "e se…": uma pergunta grande, um personagem 3D pequeno que
// atua de verdade e uma viagem que piora a cada plano (céu, fogo, nuvem, escuro, neblina, faíscas).
// Jeito de animar: cena-3d (three.js, sem placa de vídeo). O robô é desenho próprio (robo.js); o céu
// de cada plano é um shader (fundo.js); fogo, riscos, passagens e o letreiro saem do acabamento
// (tela.js). No alto, um contador amarelo de letra de máquina pula a cada plano; embaixo dele, uma
// legenda que se datilografa numa tarja preta. Letras em traços (letras.js), sem fonte instalada.
// O que muda de um filme para outro fica em historia.json. Este arquivo não muda.
import * as THREE from '../../../vendor/three/three.module.js';
import { criarRobo } from './robo.js';
import { criarFundo } from './fundo.js';
import { criarTela } from './tela.js';

const { limita, mistura, trecho, suave, saiDevagar, sorteio } = Filme;

// sorteio sem memória: o mesmo par de números dá sempre o mesmo valor (0 a 1)
function h(a, b = 0) {
  let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return (v >>> 0) / 4294967296;
}
const mix2 = (a, b, k) => [mistura(a[0], b[0], k), mistura(a[1], b[1], k)];
const mix3 = (a, b, k) => [mistura(a[0], b[0], k), mistura(a[1], b[1], k), mistura(a[2], b[2], k)];

Filme.criar({
  largura: 1080, altura: 1920, fps: 30, duracao: 15,
  montar({ historia: H, tela, largura: L, altura: A, duracao, fps }) {
    const PL = H.planos, k = L / 1080;
    const planoEm = (t) => { let i = 0; PL.forEach((p, j) => { if (t >= p.de) i = j; }); return i; };

    // ---------- fotógrafo ----------
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: false, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(L, A, false);
    render.toneMapping = THREE.NoToneMapping; render.outputColorSpace = THREE.LinearSRGBColorSpace;
    render.localClippingEnabled = true;
    const cena = new THREE.Scene();
    const FOV = 38;
    const camera = new THREE.PerspectiveCamera(FOV, L / A, 0.1, 100);
    const meiaAltura = (dist) => dist * Math.tan(FOV * Math.PI / 360); // metade da altura visível no plano do robô

    // luzes: céu e chão (hemisfério), chave pela frente-esquerda, borda por trás-direita
    const hemi = new THREE.HemisphereLight('#ffffff', '#000000', 1.0); cena.add(hemi);
    const chave = new THREE.DirectionalLight('#ffffff', 2); chave.position.set(-3, 4, 6); cena.add(chave);
    const borda = new THREE.DirectionalLight('#ffffff', 2); borda.position.set(4, 2, -5); cena.add(borda);

    // ---------- robô (o corte sobe quando ele vira faíscas) ----------
    const corte = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);
    const robo = criarRobo(H.robo, corte);
    cena.add(robo.raiz);

    // ---------- faíscas: pontos macios, posição calculada pelo tempo ----------
    const NF = Math.max(...PL.map((p) => (p.faiscas ? p.faiscas.n : 0)), 1);
    const posF = new Float32Array(NF * 3), tamF = new Float32Array(NF);
    const geoF = new THREE.BufferGeometry();
    geoF.setAttribute('position', new THREE.BufferAttribute(posF, 3));
    geoF.setAttribute('aTam', new THREE.BufferAttribute(tamF, 1));
    const corF = (PL.find((p) => p.faiscas) || { faiscas: { cor: '#ffd84a' } }).faiscas.cor;
    const matF = new THREE.ShaderMaterial({
      uniforms: { uCor: { value: new THREE.Color(corF) }, uEscala: { value: A / 1920 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aTam; uniform float uEscala; varying float vB;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = max(1.5, aTam * uEscala * 210.0 / -mv.z); vB = min(1.0, aTam); }`,
      fragmentShader: `uniform vec3 uCor; varying float vB;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(uCor * (a * a * 2.4 + smoothstep(0.35, 0.0, d) * 2.0), 1.0) * vB; }`,
    });
    const faiscas = new THREE.Points(geoF, matF); faiscas.frustumCulled = false; cena.add(faiscas);
    // brilho na linha do corte (onde o robô vira faísca)
    const cvB = document.createElement('canvas'); cvB.width = cvB.height = 64;
    const gB = cvB.getContext('2d'), grB = gB.createRadialGradient(32, 32, 0, 32, 32, 32);
    grB.addColorStop(0, 'rgba(255,255,255,1)'); grB.addColorStop(0.35, 'rgba(255,255,255,0.4)'); grB.addColorStop(1, 'rgba(255,255,255,0)');
    gB.fillStyle = grB; gB.fillRect(0, 0, 64, 64);
    const brilhoCorte = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cvB), color: corF, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }));
    cena.add(brilhoCorte);

    // ---------- céu e acabamento ----------
    const fundo = criarFundo(H.planeta.faixas, H.planeta.mancha);
    fundo.u.uRes.value.set(L, A);
    fundo.u.uOlhosCor.value.set(H.planeta.olhos);
    const hud = document.createElement('canvas'); hud.width = L; hud.height = A;
    const g = hud.getContext('2d');
    const acab = criarTela(render, L, A, hud);
    acab.u.uGrao.value = H.filme.grao; acab.u.uVinheta.value = H.filme.vinheta; acab.u.uExposicao.value = H.filme.exposicao;

    // ---------- onde o robô está (na tela e no mundo) em qualquer tempo ----------
    function camDe(t) {
      const P = PL[planoEm(t)], tl = t - P.de, kk = suave(trecho(t, P.de, P.ate)), C = P.camera;
      const dist = mistura(C.dist[0], C.dist[1], kk);
      return { dist, y: C.y || 0, tremor: C.tremor || 0 };
    }
    function roboNoMundo(t) {
      const P = PL[planoEm(t)], R = P.robo; if (!R) return null;
      const kk = suave(trecho(t, P.de, P.ate)), cm = camDe(t), m = meiaAltura(cm.dist) * 2;
      const s = mix2(R.pos[0], R.pos[1], kk);
      return [s[0] * m, cm.y + s[1] * m, 0];
    }

    // ---------- pose do robô para cada ação (conta pura de tl = tempo dentro do plano) ----------
    const sacode = (e, q, n) => [(h(e, n) - 0.5) * q, (h(e, n + 1) - 0.5) * q];
    function poseRobo(P, t, e) {
      const R = P.robo, tl = t - P.de, dur = P.ate - P.de, w = roboNoMundo(t);
      const Q = { x: w[0], y: w[1], z: 0, giro: [0, 0.2, 0], aperta: [1, 1], cabeca: [0, 0, 0], bracos: [[0, 0.25], [0, 0.25]], pernas: [[0, 0.08], [0, 0.08]], olho: 1, brilho: 1 };
      const piscar = (tp) => { const d = Math.abs(tl - tp); return d < 0.09 ? 0.15 + 0.85 * d / 0.09 : 1; };
      if (R.acao === 'acena') {
        Q.y += 0.06 * Math.sin(tl * 2.2);
        Q.giro = [0.06 * Math.sin(tl * 1.3), 0.3 - 0.12 * suave(trecho(tl, 0.2, 1.0)), 0.07 * Math.sin(tl * 1.7)];
        const sobe = suave(trecho(tl, 0.45, 0.8)), antes = Math.sin(Math.PI * trecho(tl, 0.3, 0.5)) * 0.25; // antecipação: desce antes de subir
        const aceno = sobe * 0.38 * Math.sin((tl - 0.8) * 10) * (tl > 0.8 ? 1 : 0);
        Q.bracos = [[0.1, 0.35 + 0.08 * Math.sin(tl * 2)], [-0.15, mistura(0.3 - antes, 2.55, sobe) + aceno]];
        Q.cabeca = [0.05, -0.15 + 0.1 * sobe, 0.12 * sobe];
        Q.pernas = [[0.15 * Math.sin(tl * 2.2), 0.12], [-0.1 * Math.sin(tl * 2.2 + 1), 0.1]];
        Q.olho = piscar(1.7);
      } else if (R.acao === 'entra') {
        const choque = Math.exp(-tl * 7);
        const [sx, sy] = sacode(e, 0.07 + 0.08 * choque, 3);
        Q.x += sx; Q.y += sy;
        const dir = P.fogo ? P.fogo.direcao : [0, -1];
        Q.giro = [0.12, 0.25, Math.atan2(dir[0], -dir[1]) + 0.1 * Math.sin(tl * 9)]; // pés na frente, na direção da queda
        Q.aperta = [1 + 0.18 * choque, 1 - 0.22 * choque];
        Q.bracos = [[-0.6, 2.5 + 0.2 * Math.sin(tl * 23)], [-0.6, 2.6 + 0.2 * Math.sin(tl * 19 + 1)]];
        Q.pernas = [[-0.9, 0.25], [-0.5, 0.2]];
        Q.cabeca = [0.35, 0.2, 0];
        Q.olho = 0.6; Q.brilho = 1.3;
      } else if (R.acao === 'rodopia') {
        const gira = tl * 2.4 + 0.6 * Math.sin(tl * 1.3);
        Q.giro = [0.5 * Math.sin(tl * 1.6), 0.4 + 0.5 * Math.sin(tl * 0.9), gira];
        Q.bracos = [[0.4 * Math.sin(tl * 6), 1.3 + 0.5 * Math.sin(tl * 8)], [0.4 * Math.sin(tl * 6 + 2), 1.4 + 0.5 * Math.sin(tl * 7 + 1)]];
        Q.pernas = [[0.5 * Math.sin(tl * 5), 0.4 + 0.2 * Math.sin(tl * 6)], [0.5 * Math.sin(tl * 5 + 2), 0.35 + 0.2 * Math.sin(tl * 6 + 1)]];
        Q.cabeca = [0.2 * Math.sin(tl * 3), 0, 0];
        Q.olho = 1;
      } else if (R.acao === 'aperta') {
        const s = suave(trecho(tl, 0.15, 1.1)), pulso = Math.sin(tl * 15) * 0.025 * s;
        const [sx, sy] = sacode(e, 0.02 + 0.03 * s, 7); Q.x += sx; Q.y += sy;
        Q.aperta = [1 + 0.16 * s + pulso, 1 - 0.24 * s - pulso];
        Q.giro = [0.1, 0.15, 0.03 * Math.sin(tl * 11)];
        Q.bracos = [[mistura(0, -1.2, s), mistura(0.3, 0.05, s)], [mistura(0, -1.2, s), mistura(0.3, 0.05, s)]];
        Q.pernas = [[mistura(0, -0.8, s), 0.05], [mistura(0, -0.75, s), 0.05]];
        Q.cabeca = [mistura(0, 0.3, s), 0.06 * Math.sin(tl * 13), 0];
        Q.olho = mistura(1, 0.35, s);
      } else if (R.acao === 'procura') {
        Q.y += 0.04 * Math.sin(tl * 1.5);
        const olhaBaixo = suave(trecho(tl, 1.3, 1.7));
        Q.giro = [0.05, 0.1 * Math.sin(tl * 0.7), 0.05 * Math.sin(tl * 1.1)];
        Q.cabeca = [mistura(0, 0.55, olhaBaixo), 0.75 * Math.sin(tl * 2.1) * (1 - olhaBaixo), 0];
        Q.bracos = [[0.1, 0.95 + 0.1 * Math.sin(tl * 2)], [0.1, 0.95 + 0.1 * Math.sin(tl * 2 + 1)]];
        Q.pernas = [[0.1 * Math.sin(tl * 1.5), 0.15], [-0.1 * Math.sin(tl * 1.5), 0.15]];
        Q.olho = piscar(0.6);
      } else if (R.acao === 'dissolve') {
        Q.y += 0.03 * Math.sin(tl * 1.8);
        Q.giro = [0.04, 0.12, 0];
        const sobe = suave(trecho(tl, 0.0, 0.3));
        Q.bracos = [[0.05, 0.35], [-0.15, mistura(0.3, 2.4, sobe) + 0.3 * Math.sin(tl * 9) * sobe]];
        Q.cabeca = [-0.05, 0, 0.12];
        Q.brilho = 1 + 0.6 * suave(trecho(tl, 0.2, 1.2));
      }
      return Q;
    }
    // altura do corte (no mundo) ao dissolver: dos pés até a antena
    function alturaCorte(P, t) {
      if (!P.robo || P.robo.acao !== 'dissolve') return -100;
      const w = roboNoMundo(t), S = P.robo.some;
      return w[1] - 1.05 + 2.5 * suave(trecho(t - P.de, S[0], S[1]));
    }

    // ---------- faíscas: nascem na linha do corte e caem devagar; no plano final, chovem no planeta ----------
    function poeFaiscas(t, e) {
      tamF.fill(0);
      const P = PL[planoEm(t)], FA = P.faiscas;
      if (!FA) return;
      const n = FA.n;
      if (!FA.caem) {
        const S = P.robo.some;
        for (let i = 0; i < n; i++) {
          const tb = P.de + mistura(S[0], S[1], (i + h(i, 1)) / n) - 0.05;
          const idade = t - tb; if (idade < 0) continue;
          const w = roboNoMundo(tb), y0 = alturaCorte(P, tb + 0.05);
          const larg = 0.75 + 0.25 * Math.sin((y0 - w[1]) * 2);
          const x0 = w[0] + (h(i, 2) - 0.5) * larg * 1.1, z0 = (h(i, 3) - 0.5) * 0.6;
          const vx = (h(i, 4) - 0.5) * 0.7, vy = 0.15 + 0.35 * h(i, 5), vz = (h(i, 6) - 0.5) * 0.5;
          posF[i * 3] = x0 + vx * idade + 0.06 * Math.sin(idade * 4 + i);
          posF[i * 3 + 1] = y0 + vy * idade - 0.45 * idade * idade;
          posF[i * 3 + 2] = z0 + vz * idade;
          const vida = 1.2 + 0.8 * h(i, 7);
          tamF[i] = idade > vida ? 0 : (0.55 + 0.6 * h(i, 8)) * (1 - idade / vida) * (0.6 + 0.4 * h(e, i)) * limita(idade / 0.15);
        }
      } else {
        // chuva de faíscas que caem dentro do planeta (o planeta está no fundo, em coordenadas de tela)
        const cm = camDe(t), m = meiaAltura(cm.dist) * 2, pk = suave(trecho(t, P.de, P.ate));
        const PP = P.fundo.planeta, pc = mix3(PP.de, PP.ate, pk);
        for (let i = 0; i < n; i++) {
          const t0 = P.de - 0.2 + 1.2 * h(i, 11);
          const idade = t - t0; if (idade < 0) continue;
          const ang = (h(i, 12) - 0.5) * 2.0, r0 = pc[2] + 0.08 + 0.12 * h(i, 13); // nascem logo acima da borda, dentro do quadro
          const sx = pc[0] + Math.sin(ang) * r0, sy = pc[1] + Math.cos(ang) * r0;
          const kq = limita(idade / (0.7 + 0.5 * h(i, 14)));
          const x = mistura(sx, pc[0] + Math.sin(ang) * pc[2] * 0.75, kq * kq), y = mistura(sy, pc[1] + Math.cos(ang) * pc[2] * 0.75, kq * kq);
          posF[i * 3] = x * m; posF[i * 3 + 1] = cm.y + y * m; posF[i * 3 + 2] = 0;
          tamF[i] = kq >= 1 ? 0 : (0.35 + 0.45 * h(i, 15)) * (1 - kq * 0.6) * (0.6 + 0.4 * h(e, i + 900)) * limita(idade / 0.15); // acende aos poucos, não surge do nada
        }
      }
    }

    // ---------- letreiro: contador amarelo e legenda datilografada (letras em traços, largura fixa) ----------
    const CT = H.contador, LG = H.legenda;
    const PASSO = 0.66;                                    // largura de cada casa de letra (em "tam")
    function escreve(txt, x, y, tam, cor, larg, contorno) {
      const chars = [...txt.toUpperCase()];
      g.lineCap = 'round'; g.lineJoin = 'round';
      const passes = contorno ? [[contorno, larg + 6 * k], [cor, larg]] : [[cor, larg]];
      for (const [cc, lw] of passes) {
        g.strokeStyle = cc; g.lineWidth = lw;
        chars.forEach((ch, i) => {
          const gl = Letras.letra(ch); if (!gl) return;
          const ox = x + i * PASSO * tam + (PASSO * tam - gl.w * tam * 0.82) / 2;
          // letra de máquina: o I ganha pé e chapéu, senão vira um buraco na palavra
          const tracos = (ch === 'I' || ch === 'Í') ? [...gl.tracos, [[-0.14, 0], [0.24, 0]], [[-0.14, 1], [0.24, 1]]] : gl.tracos;
          for (const tr of tracos) {
            g.beginPath();
            tr.forEach(([a, b], j) => { const px = ox + a * tam * 0.82, py = y - tam + b * tam; j ? g.lineTo(px, py) : g.moveTo(px, py); });
            g.stroke();
          }
        });
      }
    }
    const largTexto = (txt, tam) => [...txt].length * PASSO * tam;
    const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const umaCasa = (v) => v.toFixed(1).replace('.', ',');
    function contador(t) {
      const P = PL[planoEm(t)], C = P.contador, tl = t - P.de;
      const kk = saiDevagar(trecho(tl, 0.05, Math.min(1.4, (P.ate - P.de) * 0.7)));
      let grande, menor;
      if (C.texto) grande = C.texto;
      else grande = `${CT.rotulo} ${milhar(mistura(C.valor[0], C.valor[1], kk))} ${CT.unidade}`;
      if (C.textoMenor) menor = C.textoMenor;
      else if (C.menor[0] < 0) menor = `${CT.rotuloMenor} ${CT.foraDeEscala}`;
      else if (C.menor[1] < 0) menor = kk > CT.disparo.vira ? `${CT.rotuloMenor} ${CT.foraDeEscala}` : `${CT.rotuloMenor} ${umaCasa(C.menor[0] * (1 + CT.disparo.vezes * kk * kk))} ${CT.unidadeMenor}`;
      else menor = `${CT.rotuloMenor} ${umaCasa(mistura(C.menor[0], C.menor[1], kk))} ${CT.unidadeMenor}`;
      const pulo = 1 + 0.22 * Math.exp(-tl * 9) * (P.de > 0 ? 1 : 0); // o número pula quando o plano começa
      let tam = CT.tam * k * pulo;
      if (largTexto(grande, tam) > L * 0.92) tam = L * 0.92 / ([...grande].length * PASSO);
      const tamM = CT.tamMenor * k;
      escreve(grande, (L - largTexto(grande, tam)) / 2, CT.y * k + tam * 0.5, tam, CT.cor, tam * 0.13, 'rgba(0,0,0,0.55)');
      escreve(menor, (L - largTexto(menor, tamM)) / 2, CT.y * k + CT.tam * k * 0.5 + tamM * 1.7, tamM, CT.cor, tamM * 0.16, 'rgba(0,0,0,0.55)');
    }
    // quebra a legenda em linhas que cabem na largura
    const LEGENDAS = PL.flatMap((P) => P.legendas || []).map((lg) => {
      const tam = LG.tam * k, maxL = LG.largura * k, linhas = []; let atual = '';
      for (const p of lg.texto.split(/\s+/)) { const tenta = atual ? atual + ' ' + p : p; if (atual && largTexto(tenta, tam) > maxL) { linhas.push(atual); atual = p; } else atual = tenta; }
      if (atual) linhas.push(atual);
      return { ...lg, linhas, tam };
    });
    function legenda(t, e) {
      const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate); if (!lg) return;
      let resta = Math.floor((t - lg.de) * LG.letrasPorSegundo);
      const total = lg.linhas.reduce((s, l) => s + l.length, 0), tam = lg.tam, alt = tam * 1.55;
      lg.linhas.forEach((ln, li) => {
        const vis = ln.slice(0, Math.max(0, Math.min(ln.length, resta))); resta -= ln.length;
        if (!vis.length) return;
        const x = (L - largTexto(ln, tam)) / 2, y = LG.y * k + li * alt;
        g.fillStyle = LG.fundo; g.globalAlpha = 0.88;
        g.fillRect(x - tam * 0.35, y - tam * 1.22, largTexto(vis, tam) + tam * 0.7, tam * 1.5);
        g.globalAlpha = 1;
        escreve(vis, x, y, tam, LG.cor, tam * 0.11);
        // cursor: na ponta da linha que está sendo escrita; depois de escrita, pisca no fim da última
        const escrevendo = vis.length < ln.length || (resta <= 0 && Math.floor((t - lg.de) * LG.letrasPorSegundo) < total);
        const ultima = li === lg.linhas.length - 1;
        if ((escrevendo && vis.length < ln.length) || (ultima && (escrevendo || e % 16 < 8))) {
          g.fillStyle = LG.cor; g.fillRect(x + vis.length * PASSO * tam + tam * 0.08, y - tam * 0.95, tam * 0.45, tam * 0.95);
        }
      });
    }

    // ---------- desenhar(t) ----------
    const vec = new THREE.Vector3();
    function desenhar(t) {
      const e = Math.round(t * fps), i = planoEm(t), P = PL[i], tl = t - P.de, kk = suave(trecho(t, P.de, P.ate));

      // câmera
      const cm = camDe(t), [tx, ty] = sacode(e, cm.tremor, 41);
      camera.position.set(tx, cm.y + ty, cm.dist); camera.lookAt(tx * 0.5, cm.y + ty * 0.5, 0);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();

      // luz do plano
      const LZ = P.luz;
      hemi.color.set(LZ.ceu); hemi.groundColor.set(LZ.chao); hemi.intensity = 1.1;
      chave.color.set(LZ.chave); chave.intensity = LZ.forca * (P.fogo ? 1 + 0.25 * (h(e, 9) - 0.5) : 1);
      borda.color.set(LZ.borda); borda.intensity = LZ.bordaForca;

      // robô
      robo.raiz.visible = !!P.robo;
      if (P.robo) robo.pose(poseRobo(P, t, e));
      const hc = alturaCorte(P, t);
      corte.constant = -hc;
      brilhoCorte.visible = false;
      if (P.robo && P.robo.acao === 'dissolve') {
        const S = P.robo.some, kc = trecho(tl, S[0], S[1]), w = roboNoMundo(t);
        if (kc > 0 && kc < 1) {
          brilhoCorte.visible = true;
          brilhoCorte.position.set(w[0], hc, 0.4);
          brilhoCorte.scale.set(1.6 - 0.8 * kc, 0.32, 1);
          brilhoCorte.material.opacity = (0.75 + 0.25 * h(e, 21)) * Math.sin(Math.PI * Math.min(1, kc * 1.15));
        }
      }

      poeFaiscas(t, e);
      geoF.attributes.position.needsUpdate = true; geoF.attributes.aTam.needsUpdate = true;

      // céu
      const FU = P.fundo, U = fundo.u;
      U.uT.value = t;
      U.uCeuTopo.value.set(FU.ceuTopo); U.uCeuBase.value.set(FU.ceuBase); U.uEstrelas.value = FU.estrelas || 0;
      if (FU.planeta) {
        const pp = mix3(FU.planeta.de, FU.planeta.ate, kk);
        U.uPlaneta.value.set(pp[0], pp[1], pp[2], 1); U.uGiro.value = t * FU.planeta.giro;
      } else U.uPlaneta.value.set(0, 0, 1, 0);
      const NV = FU.nuvem;
      if (NV) { U.uNuvem.value.set(NV.quanto, NV.escala, t * NV.sobe, 0); U.uNuvemCor.value.set(NV.cor); U.uNuvemSombra.value.set(NV.sombra); }
      else U.uNuvem.value.set(0, 1, 0, 0);
      let olhos = 0;
      if (FU.olhos && tl >= FU.olhos.de) {
        olhos = suave(trecho(tl, FU.olhos.de, FU.olhos.de + 0.3));
        for (const pb of FU.olhos.piscadas || []) { const d = Math.abs(tl - pb); if (d < 0.1) olhos *= 0.05 + 0.95 * d / 0.1; }
      }
      U.uOlhos.value = olhos;

      // acabamento: fogo, riscos, passagens
      const AU = acab.u;
      AU.uT.value = t; AU.uPose.value = e;
      if (P.fogo && P.robo) {
        vec.set(...roboNoMundo(t)).project(camera);
        AU.uFogoPos.value.set(vec.x * 0.5 * L / A, vec.y * 0.5);
        AU.uFogoDir.value.set(P.fogo.direcao[0], P.fogo.direcao[1]); AU.uFogoFrente.value = P.fogo.frente ?? 0.15;
        AU.uFogo.value = P.fogo.forca * suave(trecho(tl, 0.0, 0.2)) * (0.85 + 0.3 * h(e, 13));
      } else AU.uFogo.value = 0;
      if (P.riscos) {
        AU.uRiscos.value = P.riscos.quanto * suave(trecho(tl, 0, 0.25)); AU.uRiscoCor.value.set(P.riscos.cor);
        AU.uRiscoAng.value = P.riscos.angulo * Math.PI / 180; AU.uRiscoVel.value = P.riscos.velocidade; AU.uRiscoLarg.value = P.riscos.largura;
      } else AU.uRiscos.value = 0;
      // passagens: valem em volta do começo de cada plano
      let clarao = 0, escuro = 0, varrida = [0, 0];
      PL.forEach((Q) => {
        const d = t - Q.de;
        if (Q.entrada === 'clarao') clarao = Math.max(clarao, d >= 0 ? Math.exp(-d * 7) : 0.7 * suave(trecho(d, -0.12, 0)));
        if (Q.entrada === 'escurece' && Math.abs(d) < 0.3) escuro = Math.max(escuro, 1 - suave(Math.abs(d) / 0.3));
        if (Q.entrada === 'varrida' && Math.abs(d) < 0.3) varrida = [d / 0.3, 1];
        if (Q.entrada === 'abre') escuro = Math.max(escuro, 1 - suave(trecho(d, 0, 0.45)));
      });
      escuro = Math.max(escuro, suave(trecho(t, duracao - 0.3, duracao)));
      AU.uClarao.value = clarao; AU.uEscuro.value = escuro * 0.97; AU.uVarrida.value.set(varrida[0], varrida[1]);

      // letreiro
      g.reset();
      g.clearRect(0, 0, L, A);
      contador(t);
      legenda(t, e);

      acab.foto(fundo.cena, cena, camera);
    }

    // ---------- som: pad e arpejo que escurecem com a descida, efeitos nas palavras-chave ----------
    function som() {
      const s = Som.criar(duracao, H.semente), M = H.musica, r = sorteio(H.semente + 5);
      // pad: acorde de cada plano (onda triangular macia), entrando e saindo devagar
      M.acordes.forEach((a, i) => {
        const fim = i + 1 < M.acordes.length ? M.acordes[i + 1].de : duracao;
        a.notas.forEach((n, j) => s.nota(n, a.de, fim - a.de, { forma: 'tri', vol: 0.05, ataque: 0.25, solta: 0.5, pan: (j - 1) * 0.3, vibrato: 0.003 }));
      });
      // arpejo de caixinha no espaço e nas nuvens; volta no fim
      const fimArpejo = M.arpejoAte ?? duracao;
      for (let i = 0, t = 0.2; t < fimArpejo; i++, t += M.passoArpejo) s.sino(M.arpejo[i % M.arpejo.length], t, 0.6, { vol: 0.035, pan: ((i % 4) - 1.5) * 0.25, brilho: 1.6 });
      // contador: bipe a cada pulo
      PL.forEach((P, i) => { if (P.de > 0) s.pio(P.de + 0.02, { freq: 1760, dur: 0.05, repete: 2, intervalo: 0.07, vol: 0.05 }); });
      // máquina de escrever: um toque seco por letra que aparece
      for (const lg of LEGENDAS) {
        const nl = lg.linhas.reduce((a, l) => a + l.length, 0);
        for (let c = 0; c < nl; c++) {
          const tc = lg.de + c / LG.letrasPorSegundo; if (tc >= lg.ate) break;
          s.toque(tc, { vol: 0.03 + 0.012 * r(), corte: 5200, dur: 0.018, pan: 0.15 });
        }
      }
      // cada plano tem o seu som
      for (const P of PL) {
        const d = P.ate - P.de, a = P.robo ? P.robo.acao : null;
        if (a === 'acena') {
          s.pio(P.de + 0.85, { freq: 1300, sobe: 0.5, dur: 0.07, repete: 2, intervalo: 0.1, vol: 0.05, pan: 0.2 });  // o robô "fala" ao acenar
        }
        if (a === 'entra') {
          s.batida(P.de, { vol: 0.55, freq: 55, dur: 0.9 });
          s.vento(P.de - 0.1, d + 0.2, { vol: 0.2, corte: 900, onda: 6, profundidade: 0.35, entra: 0.08, sai: 0.5 });
          s.vento(P.de, d, { vol: 0.12, corte: 160, onda: 3, profundidade: 0.3, entra: 0.05, sai: 0.6 });
        }
        if (a === 'rodopia') {
          s.vento(P.de, d, { vol: 0.17, corte: 1100, onda: 1.4, profundidade: 0.75, entra: 0.2, sai: 0.4 });
          s.pio(P.de + 0.6, { freq: 900, sobe: -0.4, dur: 0.25, repete: 1, vol: 0.04, pan: -0.3 });
        }
        if (a === 'aperta') {
          s.vento(P.de, d, { vol: 0.2, corte: 140, onda: 2, profundidade: 0.4, entra: 0.3, sai: 0.3 });
          for (let q = 0; q < 5; q++) s.batida(P.de + 0.4 + q * 0.42, { vol: 0.3, freq: 48, dur: 0.35 });
          s.pio(P.de + 0.9, { freq: 330, sobe: -0.25, dur: 0.45, repete: 1, vol: 0.07 }); // metal rangendo
          s.pio(P.de + 1.7, { freq: 300, sobe: -0.3, dur: 0.5, repete: 1, vol: 0.07 });
        }
        if (a === 'procura') {
          s.vento(P.de, d, { vol: 0.07, corte: 300, onda: 0.5, profundidade: 0.5, entra: 0.4, sai: 0.3 });
          s.nota('A1', P.de, d, { forma: 'seno', vol: 0.05, ataque: 0.5, solta: 0.3 });
          s.pio(P.de + 0.5, { freq: 700, sobe: 0.2, dur: 0.06, repete: 2, intervalo: 0.12, vol: 0.035, pan: -0.3 });
        }
        if (a === 'dissolve') {
          const S = P.robo.some;
          for (let q = 0; q < 26; q++) {
            const tq = P.de + mistura(S[0], S[1] + 0.2, q / 26);
            s.sino(M.faiscas[q % M.faiscas.length], tq, 0.9, { vol: 0.04 + 0.03 * r(), pan: r() - 0.5, brilho: 2.5 });
          }
          s.vento(P.de + S[0], S[1] - S[0] + 0.3, { vol: 0.06, corte: 4000, onda: 3, profundidade: 0.4, entra: 0.3, sai: 0.4 });
        }
        if (P.faiscas && P.faiscas.caem) {
          for (let q = 0; q < 10; q++) s.sino(M.faiscas[(q * 2) % M.faiscas.length], P.de + 0.05 + q * 0.06, 0.6, { vol: 0.03, pan: r() - 0.5, brilho: 2 });
          M.final.forEach((n, j) => s.sino(n, P.de + 0.4 + j * 0.12, 1.6, { vol: 0.08, pan: (j - 1.5) * 0.3, brilho: 1.2 }));
          s.batida(P.de, { vol: 0.25, freq: 65, dur: 0.8 });
          // os olhos acendem: dois bipes do robô, agora dentro do planeta
          const OL = P.fundo.olhos;
          if (OL) s.pio(P.de + OL.de + 0.05, { freq: 1300, sobe: 0.5, dur: 0.07, repete: 2, intervalo: 0.1, vol: 0.05 });
        }
      }
      s.sala(0.45);
      return s.fim({ entra: 0.15, sai: 0.4, pico: 0.78 });
    }

    return { desenhar, som };
  },
});
