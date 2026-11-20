// MOTOR "dados-3d" — explicativo de jornalismo de dados em 3D: fundo azul-marinho quase preto, chão com
// grade azul fraca, milhares de bonequinhos repetidos (instâncias), colunas que sobem num mapa de quadradinhos,
// barras 3D com o valor flutuando em cima, hélice de contas que gira e um grafo de nós que acende.
// Três cores que brilham (ouro, ciano, vermelho), sem traço de nanquim nem desfoque.
// Por cima do 3D, uma folha 2D com os números e títulos em letras de traço grosso (letras.js) e a legenda.
// Jeito de animar: cena-3d (three.js, sem placa de vídeo), com cortes secos entre as batidas e a câmera
// deslizando dentro de cada uma. Filme narrado na fonte: aqui a fala vira legenda. Sem voz.
// O que aparece, ONDE e QUANDO está em historia.json. Este arquivo não muda de um filme para outro.
import * as THREE from '../../../vendor/three/three.module.js';

const { limita, mistura, trecho, suave, sorteio } = Filme;
const LD = 1080, AD = 1920; // tamanho "de desenho" da folha 2D (vertical); a tela real pode ser menor

// sorteio sem memória: o mesmo par de números dá sempre o mesmo valor (0 a 1)
function h(a, b = 0) {
  let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return (v >>> 0) / 4294967296;
}

Filme.criar({
  largura: LD, altura: AD, fps: 30, duracao: 20,
  montar({ historia: H, tela, largura, altura, duracao, fps }) {
    const P = H.paleta, cor = (n) => P[n] || n;
    const k = largura / LD;
    const sai = (x) => 1 - Math.pow(1 - limita(x), 3);
    const passa = (x) => { x = limita(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
    const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : Math.max(0, passa(trecho(t, t0, t0 + d))));
    const CENAS = H.cenas;
    const cenaEm = (t) => { let i = 0; CENAS.forEach((cn, j) => { if (t >= cn.de) i = j; }); return i; };

    // =====================================================================================
    // FOLHA 2D: números, títulos e legenda em letras de traço (não dependem de fonte instalada)
    // =====================================================================================
    const folha = document.createElement('canvas'); folha.width = largura; folha.height = altura;
    const c = folha.getContext('2d');
    const escalaAtual = () => { const m = c.getTransform(); return Math.hypot(m.a, m.b); };
    const brilho = (raio, cr) => { c.shadowColor = cr; c.shadowBlur = raio * escalaAtual(); c.shadowOffsetX = 0; c.shadowOffsetY = 0; };
    const semBrilho = () => { c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; };
    const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
    const ESPACO = 0.46, ENTRE = 0.27, CELULA = 0.62;
    const digito = (ch) => ch >= '0' && ch <= '9';
    const avanco = (ch, tab) => { if (ch === ' ') return ESPACO; const g = glifo(ch); if (!g) return ESPACO; return (tab && digito(ch) ? CELULA : g.w) + ENTRE; };
    const largTexto = (txt, tam, tab) => { let w = 0; for (const ch of txt) w += avanco(ch, tab); return Math.max(0, w - ENTRE) * tam; };
    function arruma(txt, x, tam, alinha, tab) {
      const w = largTexto(txt, tam, tab);
      let px = alinha === 'esquerda' ? x : alinha === 'direita' ? x - w : x - w / 2;
      const out = []; let palavra = 0;
      for (const ch of txt) {
        if (ch === ' ') { palavra++; px += ESPACO * tam; continue; }
        const g = glifo(ch), dx = tab && digito(ch) ? (CELULA - g.w) / 2 * tam : 0;
        out.push({ g, x: px + dx, palavra }); px += avanco(ch, tab) * tam;
      }
      return out;
    }
    function caminho(g, x, y, tam) {
      c.beginPath();
      for (const tr of g.tracos) tr.forEach(([a, b], i) => { const px = x + a * tam, py = y - tam + b * tam; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
    }
    // o = { cor | cores[palavra] | corDe(palavra), alinha, contorno, brilho, tabular, sombra, peso }
    function escreve(txt, x, y, tam, o = {}) {
      const letras = arruma(txt, x, tam, o.alinha, o.tabular), lw = tam * (o.peso || 0.17);
      c.lineCap = 'round'; c.lineJoin = 'round';
      const corDe = (p) => (o.corDe ? o.corDe(p) : o.cores ? cor(o.cores[Math.min(p, o.cores.length - 1)]) : cor(o.cor || 'branco'));
      // sombra escura macia por baixo (as letras da fonte têm uma sombra leve)
      c.strokeStyle = o.contorno ? '#000' : 'rgba(2,4,12,0.55)'; c.lineWidth = lw + (o.contorno || tam * 0.04) * 2;
      for (const l of letras) { caminho(l.g, l.x + (o.sombra || 0), y + (o.sombra || 0), tam); c.stroke(); }
      for (const l of letras) {
        const cr = corDe(l.palavra);
        if (o.brilho) brilho(o.brilho, cr);
        c.strokeStyle = cr; c.lineWidth = lw; caminho(l.g, l.x, y, tam); c.stroke(); semBrilho();
      }
    }
    const milhar = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // ---------- confere TODAS as letras ao montar: letra que falta dá erro (não some sem aviso) ----------
    (function confere() {
      const textos = (H.legendas || []).map((l) => l.texto);
      for (const cn of CENAS) for (const p of cn.pecas) {
        if (p.texto) textos.push(p.texto);
        if (p.tipo === 'contador') textos.push(milhar(p.valor));
        if (p.tipo === 'barras') for (const it of p.itens) textos.push(it.nome, it.valor);
        if (p.tipo === 'helice' && p.divide) textos.push(p.divide.esq.rotulo, p.divide.dir.rotulo);
        if (p.tipo === 'arvore') textos.push('?');
      }
      const falta = new Set();
      for (const tx of textos) for (const ch of tx.toUpperCase()) if (ch !== ' ' && !glifo(ch)) falta.add(ch);
      if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(' '));
    })();

    // =====================================================================================
    // MUNDO 3D
    // =====================================================================================
    const render = new THREE.WebGLRenderer({ canvas: tela, antialias: true, preserveDrawingBuffer: true });
    render.setPixelRatio(1); render.setSize(largura, altura, false);
    render.toneMapping = THREE.NoToneMapping; render.autoClear = false;
    const cena = new THREE.Scene();
    cena.background = new THREE.Color(cor('fundo'));
    cena.fog = new THREE.Fog(cor('fundo'), 20, 80);
    const camera = new THREE.PerspectiveCamera(45, largura / altura, 0.1, 500);

    const LZ = H.luz;
    cena.add(new THREE.HemisphereLight(LZ.ceu, LZ.chao, LZ.forca));
    const sol = new THREE.DirectionalLight(LZ.sol, LZ.solForca); sol.position.set(6, 12, 9); cena.add(sol);

    // chão escuro e grade azul fraca
    { const ch = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshLambertMaterial({ color: cor('chao') }));
      ch.rotation.x = -Math.PI / 2; ch.position.y = -0.01; cena.add(ch);
      const g = new THREE.GridHelper(400, 200, cor('grade'), cor('grade')); g.position.y = 0.002; cena.add(g); }

    // materiais e peças reaproveitadas
    const fosco = (cr) => new THREE.MeshLambertMaterial({ color: cr });
    const aceso = (cr, f = 0.6) => new THREE.MeshLambertMaterial({ color: cr, emissive: cr, emissiveIntensity: f });
    const somaLuz = (cr, op) => new THREE.MeshBasicMaterial({ color: cr, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const texHalo = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    })();
    const halo = (cr, tam, op = 0.8) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: cr, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op })); s.scale.set(tam, tam, 1); s.userData.op = op; return s; };
    // boneco: corpo que afina para cima e cabeça redonda (altura 0,93 com escala 1)
    const geoBoneco = (seg) => {
      const corpo = new THREE.CylinderGeometry(0.11, 0.25, 0.6, seg, 1, seg < 10); corpo.translate(0, 0.3, 0);
      const cabeca = new THREE.SphereGeometry(0.16, seg, Math.max(4, seg - 2)); cabeca.translate(0, 0.78, 0);
      return { corpo, cabeca };
    };
    const BONECO_FINO = geoBoneco(24), BONECO_LEVE = geoBoneco(6);
    function bonecoMesh(mat) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(BONECO_FINO.corpo, mat), new THREE.Mesh(BONECO_FINO.cabeca, mat));
      return g;
    }
    const mtx = new THREE.Matrix4(), corA = new THREE.Color(), corB = new THREE.Color();
    const pega = (n) => new THREE.Color(cor(n));

    // mapa: lon/lat -> lugar no mundo
    const MP = H.mapa;
    const noMundo = ([lon, lat]) => [(lon - MP.lonC) * MP.escala, -(lat - MP.latC) * MP.escala * MP.achata];

    // =====================================================================================
    // PEÇAS 3D: cada uma monta o que precisa e devolve { atualiza(t), rotulos(t) }
    // =====================================================================================
    const projeta = new THREE.Vector3();
    const naFolha = (x, y, z) => { projeta.set(x, y, z).project(camera); return [(projeta.x * 0.5 + 0.5) * LD, (-projeta.y * 0.5 + 0.5) * AD]; };

    const PECAS3D = {
      multidao(p, G) {
        const r = sorteio(H.semente + 1), pos = [];
        for (let j = 0; j < p.linhas; j++) for (let i = 0; i < p.colunas; i++) {
          const x = (i - (p.colunas - 1) / 2) * p.esp + (r() - 0.5) * 0.4 * p.esp, z = p.z0 - j * p.esp + (r() - 0.5) * 0.4 * p.esp;
          const t0 = p.de + (p.ate - p.de - 0.3) * (0.8 * j / (p.linhas - 1) + 0.2 * r());
          if (p.livre && Math.hypot(x - p.livre[0], z - p.livre[1]) < p.livre[2]) continue;
          pos.push({ x, z, t0 });
        }
        const n = pos.length, mat = fosco(cor('boneco'));
        const corpo = new THREE.InstancedMesh(BONECO_LEVE.corpo, mat, n), cabeca = new THREE.InstancedMesh(BONECO_LEVE.cabeca, mat, n);
        corpo.frustumCulled = cabeca.frustumCulled = false; G.add(corpo, cabeca);
        // raios dourados de cada um até um ponto só
        let raios = null, ligados = [];
        if (p.liga) {
          const rr = sorteio(H.semente + 2), idx = pos.map((_, i) => i).filter(() => rr() < p.liga.n / n).slice(0, p.liga.n);
          ligados = idx.map((i) => ({ i, atraso: rr() * 0.35 }));
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ligados.length * 6), 3));
          raios = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: cor('ouro'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
          raios.frustumCulled = false; G.add(raios);
        }
        const c1 = pega('boneco'), c2 = pega('ardosia');
        return {
          atualiza(t) {
            for (let i = 0; i < n; i++) {
              const s = Math.max(1e-4, pop(t, pos[i].t0, 0.3));
              mtx.makeScale(s, s, s); mtx.setPosition(pos[i].x, 0, pos[i].z);
              corpo.setMatrixAt(i, mtx); cabeca.setMatrixAt(i, mtx);
            }
            corpo.instanceMatrix.needsUpdate = true; cabeca.instanceMatrix.needsUpdate = true;
            mat.color.copy(c1).lerp(c2, p.apaga ? trecho(t, p.apaga, p.apaga + 0.5) : 0);
            if (raios) {
              raios.visible = t >= p.liga.de;
              const a = raios.geometry.attributes.position, [px, py, pz] = p.liga.para;
              ligados.forEach((l, j) => {
                const q = pos[l.i], u = sai(trecho(t, p.liga.de + l.atraso, p.liga.ate));
                a.setXYZ(2 * j, q.x, 0.86, q.z);
                a.setXYZ(2 * j + 1, mistura(q.x, px, u), mistura(0.86, py, u), mistura(q.z, pz, u));
              });
              a.needsUpdate = true;
            }
          },
        };
      },

      heroi(p, G) {
        const mat = aceso(cor('ouro'), 0.55), b = bonecoMesh(mat); b.position.set(p.x, 0, p.z); G.add(b);
        const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 90, 32, 1, true), somaLuz(cor('ouro'), 0.16));
        coluna.position.set(p.x, 45, p.z); G.add(coluna);
        const disco = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), somaLuz(cor('ouro'), 0.35)); disco.rotation.x = -Math.PI / 2; disco.position.set(p.x, 0.01, p.z); G.add(disco);
        const hl = halo(cor('ouro'), 4.5, 0.55); hl.position.set(p.x, 0.78 * p.tam, p.z); G.add(hl);
        return {
          atualiza(t) {
            const s = pop(t, p.t, 0.45), col = trecho(t, p.coluna, p.coluna + 0.6);
            b.visible = hl.visible = s > 0; b.scale.setScalar(Math.max(1e-4, s * p.tam));
            hl.material.opacity = 0.55 * limita(s); hl.position.y = 0.78 * p.tam * s;
            coluna.visible = disco.visible = col > 0; coluna.material.opacity = 0.16 * col; disco.material.opacity = 0.35 * col;
          },
        };
      },

      palco(p, G) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(p.raio, p.raio, 0.2, 64), fosco('#121c3a')); m.position.y = 0.1; G.add(m);
        const aro = new THREE.Mesh(new THREE.TorusGeometry(p.raio, 0.025, 6, 96), aceso('#2b44a0', 0.8)); aro.rotation.x = Math.PI / 2; aro.position.y = 0.2; G.add(aro);
        return { atualiza() {} };
      },

      helice(p, G) {
        const [bx, bz] = p.ponto ? noMundo(p.ponto) : [p.x || 0, p.z || 0];
        const n = p.passos, contas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), aceso(cor(p.cor), 0.6), 2 * n);
        contas.frustumCulled = false; G.add(contas);
        let plano = null;
        if (p.varre) { plano = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), somaLuz(cor('ouro'), 0.3)); plano.rotation.x = -Math.PI / 2; G.add(plano); plano.position.set(bx, 1, bz); }
        const topo = p.y0 + (n - 1) * p.subida;
        const ramos = [];
        if (p.divide) for (const lado of ['esq', 'dir']) {
          const r = p.divide[lado], m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 12, 8), r.cor === 'ardosia' ? fosco(cor('ardosia')) : aceso(cor(r.cor), 0.7), 12);
          m.frustumCulled = false; G.add(m);
          const hl = halo(cor(r.cor), 1.6, r.cor === 'ardosia' ? 0.15 : 0.8); G.add(hl);
          ramos.push({ r, m, hl });
        }
        const pontaDe = (r, q) => [bx + r.dx * q + 0.12 * Math.sin(q * 9), topo + r.dy * q + 0.35 * Math.sin(q * Math.PI), bz];
        return {
          atualiza(t) {
            const u = sai(trecho(t, p.de, p.ate)) * n;
            for (let i = 0; i < n; i++) for (let s = 0; s < 2; s++) {
              const vis = t < p.de ? 0 : limita((u - i) * 1.5), a = i * 0.42 + t * p.giro + s * Math.PI;
              const sc = Math.max(1e-4, vis * (1 + 0.15 * Math.sin(a)));
              mtx.makeScale(sc, sc, sc); mtx.setPosition(bx + Math.cos(a) * p.raio, p.y0 + i * p.subida, bz + Math.sin(a) * p.raio);
              contas.setMatrixAt(2 * i + s, mtx);
            }
            contas.instanceMatrix.needsUpdate = true;
            if (plano) { plano.visible = t >= p.de + 0.2; plano.position.y = p.y0 + (topo - p.y0) * (0.5 - 0.5 * Math.cos((t - p.de) * 2.6)); }
            for (const { r, m, hl } of ramos) {
              const v = trecho(t, p.divide.t, p.divide.t + p.divide.dur);
              for (let i = 0; i < 12; i++) {
                const q = (i + 1) / 12, sc = t < p.divide.t ? 1e-4 : Math.max(1e-4, limita((v - q + 0.12) * 6));
                const [x, y, z] = pontaDe(r, q); mtx.makeScale(sc, sc, sc); mtx.setPosition(x, y, z); m.setMatrixAt(i, mtx);
              }
              m.instanceMatrix.needsUpdate = true;
              const [x, y, z] = pontaDe(r, 1); hl.position.set(x, y, z); hl.visible = v >= 1;
            }
          },
          rotulos(t) {
            if (!p.divide || t < p.divide.t + p.divide.dur) return;
            const al = trecho(t, p.divide.t + p.divide.dur, p.divide.t + p.divide.dur + 0.25);
            for (const { r } of ramos) {
              const [x, y, z] = pontaDe(r, 1), [sx, sy] = naFolha(x, y + 0.55, z), w = largTexto(r.rotulo, 38);
              c.globalAlpha = al; escreve(r.rotulo, limita(sx, w / 2 + 24, LD - w / 2 - 24), sy, 38, { cor: r.cor, brilho: r.cor === 'ardosia' ? 0 : 14 }); c.globalAlpha = 1;
            }
          },
        };
      },

      tubos(p, G) {
        const vidro = new THREE.MeshLambertMaterial({ color: '#9fc7ff', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
        const borda = aceso('#bcd6ff', 0.4), liq = aceso(cor(p.enche.cor), 0.7);
        const gTubo = new THREE.CylinderGeometry(0.12, 0.12, 0.78, 16, 1, true); gTubo.translate(0, 0.39, 0);
        const gFundo = new THREE.SphereGeometry(0.12, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const gLiq = new THREE.CylinderGeometry(0.1, 0.1, 0.66, 14); gLiq.translate(0, 0.33, 0);
        const tubos = [];
        for (let i = 0; i < p.n; i++) {
          const a = Math.PI / 2 + (p.desvio || 0) + (i - p.enche.i) * 2 * Math.PI / p.n, g = new THREE.Group();
          g.position.set(Math.cos(a) * p.raio, 0.32, Math.sin(a) * p.raio);
          g.add(new THREE.Mesh(gTubo, vidro), new THREE.Mesh(gFundo, vidro));
          const aro = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 20), borda); aro.rotation.x = Math.PI / 2; aro.position.y = 0.78; g.add(aro);
          let l = null, hl = null;
          if (i === p.enche.i) { l = new THREE.Mesh(gLiq, liq); g.add(l); hl = halo(cor(p.enche.cor), 1.4, 0.6); hl.position.y = 0.45; g.add(hl); }
          G.add(g); tubos.push({ g, l, hl, t0: p.de + (p.ate - p.de) * i / p.n });
        }
        return {
          atualiza(t) {
            for (const tb of tubos) {
              const s = pop(t, tb.t0, 0.3); tb.g.visible = s > 0; tb.g.scale.setScalar(Math.max(1e-4, s));
              if (tb.l) { const f = sai(trecho(t, p.enche.t, p.enche.t + 0.45)); tb.l.visible = f > 0; tb.l.scale.y = Math.max(1e-4, f); tb.hl.visible = f > 0; tb.hl.material.opacity = 0.6 * f; }
            }
          },
        };
      },

      roda(p, G) {
        const gente = [];
        for (let i = 0; i < p.n; i++) {
          const a = Math.PI / 2 + (i - p.acende.i) * 2 * Math.PI / p.n, mat = new THREE.MeshLambertMaterial({ color: cor('boneco'), emissive: cor('ouro'), emissiveIntensity: 0 });
          const b = bonecoMesh(mat); b.position.set(Math.cos(a) * p.raio, 0.2, Math.sin(a) * p.raio); G.add(b);
          let hl = null; if (i === p.acende.i) { hl = halo(cor('ouro'), 2.6, 0.7); G.add(hl); }
          gente.push({ b, mat, hl, t0: p.de + (p.ate - p.de) * i / p.n, i });
        }
        const c1 = pega('boneco'), c2 = pega('ouro');
        return {
          atualiza(t) {
            for (const g of gente) {
              const ac = g.i === p.acende.i ? trecho(t, p.acende.t, p.acende.t + 0.15) : 0;
              const sa = ac > 0 ? 1 + 0.14 * Math.sin(Math.PI * trecho(t, p.acende.t, p.acende.t + 0.35)) : 1;
              const s = pop(t, g.t0, 0.3) * sa; g.b.visible = s > 0; g.b.scale.setScalar(Math.max(1e-4, s * p.tam));
              g.mat.color.copy(c1).lerp(c2, ac); g.mat.emissiveIntensity = 0.55 * ac;
              if (g.hl) { g.hl.visible = ac > 0; g.hl.material.opacity = 0.7 * ac; g.hl.position.set(g.b.position.x, 0.2 + 0.78 * p.tam, g.b.position.z); }
            }
          },
        };
      },

      barras(p, G) {
        const geo = new THREE.BoxGeometry(p.larg, 1, p.larg); geo.translate(0, 0.5, 0);
        const bs = p.itens.map((it, i) => {
          const m = new THREE.Mesh(geo, it.cor === 'ardosia' ? fosco(cor('ardosia')) : aceso(cor(it.cor), 0.45));
          m.position.set(p.x + (i - (p.itens.length - 1) / 2) * p.passo, 0, p.z); G.add(m); return m;
        });
        const alt = (i, t) => p.alto * p.itens[i].v / p.maximo * passa(trecho(t, p.t + i * 0.12, p.t + i * 0.12 + p.dur));
        return {
          atualiza(t) { bs.forEach((m, i) => { const a = alt(i, t); m.visible = t >= p.t + i * 0.12; m.scale.y = Math.max(1e-3, a); }); },
          rotulos(t) {
            p.itens.forEach((it, i) => {
              const t0 = p.t + i * 0.12; if (t < t0) return;
              const m = bs[i], destaque = it.cor !== 'ardosia';
              const [nx, ny] = naFolha(m.position.x, 0, m.position.z + p.larg / 2);
              c.globalAlpha = trecho(t, t0, t0 + 0.15); escreve(it.nome, nx, ny + 28, 39, { cor: 'branco' });
              const [vx, vy] = naFolha(m.position.x, alt(i, t) + 0.5, m.position.z);
              c.globalAlpha = trecho(t, t0, t0 + 0.14); escreve(it.valor, vx, vy - 14, 46, { cor: destaque ? it.cor : 'branco', tabular: true, brilho: destaque ? 16 : 0, peso: 0.2 });
              c.globalAlpha = 1;
            });
          },
        };
      },

      tumulos(p, G) {
        const [bx, bz] = noMundo(p.ponto), geo = new THREE.BoxGeometry(0.62, 0.34, 0.9); geo.translate(0, 0.17, 0);
        const linhas = new THREE.EdgesGeometry(geo), mat = fosco('#1b2547');
        const lm = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 });
        const caixas = [[-0.5, -0.62], [0.5, -0.62], [-0.5, 0.62], [0.5, 0.62]].map(([dx, dz], n) => {
          const g = new THREE.Group(); g.position.set(bx + dx, 0.3, bz + dz);
          g.add(new THREE.Mesh(geo, mat), new THREE.LineSegments(linhas, lm)); G.add(g); return { g, n };
        });
        return {
          atualiza(t) {
            lm.opacity = trecho(t, p.borda, p.borda + 0.4);
            for (const { g, n } of caixas) { const s = pop(t, p.t + n * 0.06, 0.35); g.visible = s > 0; g.scale.setScalar(Math.max(1e-4, s)); }
          },
        };
      },

      arvore(p, G) {
        const r = sorteio(H.semente + 7), niveis = [[{ x: p.raiz[0], y: p.raiz[1], z: p.raiz[2] }]];
        for (const nv of p.niveis) { const d = p.larg / nv.n; niveis.push(Array.from({ length: nv.n }, (_, j) => ({ x: -p.larg / 2 + d * (j + 0.5), y: nv.y, z: (r() - 0.5) * 1.4 }))); }
        const passo = (p.ate - p.de) / p.niveis.length, arestas = [], nos = [];
        for (let l = 1; l < niveis.length; l++) {
          const pais = niveis[l - 1], filhos = niveis[l], porPai = filhos.length / pais.length, t0 = p.de + (l - 1) * passo;
          filhos.forEach((f, j) => { arestas.push({ a: pais[Math.floor(j / porPai)], b: f, t0 }); nos.push({ ...f, t0: t0 + passo * 0.55 + j * 0.015, tam: 1 - l * 0.12 }); });
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arestas.length * 6), 3));
        const linhas = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#4a5aa0', transparent: true, opacity: 0.9 })); linhas.frustumCulled = false; G.add(linhas);
        const bolas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 10), aceso('#8d9be0', 0.35), nos.length); bolas.frustumCulled = false; G.add(bolas);
        const matRaiz = aceso(cor('ouro'), 0.6), raiz = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), matRaiz); raiz.position.set(...p.raiz); G.add(raiz);
        const hl = halo(cor('ouro'), 3.2, 0.7); hl.position.set(...p.raiz); G.add(hl);
        const anel = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 8, 64), aceso(cor('ciano'), 0.9)); anel.position.set(...p.raiz); G.add(anel);
        const c1 = pega('ouro'), c2 = pega('ardosia'), c3 = pega('ciano');
        return {
          atualiza(t) {
            const a = geo.attributes.position;
            arestas.forEach((e, i) => {
              const u = sai(trecho(t, e.t0, e.t0 + passo * 0.8));
              a.setXYZ(2 * i, e.a.x, e.a.y, e.a.z); a.setXYZ(2 * i + 1, mistura(e.a.x, e.b.x, u), mistura(e.a.y, e.b.y, u), mistura(e.a.z, e.b.z, u));
            });
            a.needsUpdate = true;
            nos.forEach((n, i) => { const s = Math.max(1e-4, pop(t, n.t0, 0.3) * n.tam); mtx.makeScale(s, s, s); mtx.setPosition(n.x, n.y, n.z); bolas.setMatrixAt(i, mtx); });
            bolas.instanceMatrix.needsUpdate = true;
            const ap = trecho(t, p.apaga, p.apaga + 0.3), vira = sai(trecho(t, p.vira, p.vira + 0.35));
            matRaiz.color.copy(c1).lerp(c2, ap).lerp(c3, vira * 0.4); matRaiz.emissive.copy(c1).lerp(c2, ap); matRaiz.emissiveIntensity = 0.6 * (1 - ap * 0.7);
            raiz.scale.setScalar(Math.max(1e-4, (1 + 0.06 * Math.sin(t * 3)) * (1 - vira)));
            hl.material.color.copy(c1).lerp(c3, vira); hl.material.opacity = 0.7 * (1 - ap * 0.8) * (1 - vira) + 0.45 * vira;
            anel.visible = vira > 0; anel.scale.setScalar(Math.max(1e-4, passa(trecho(t, p.vira, p.vira + 0.4)))); anel.quaternion.copy(camera.quaternion);
          },
          rotulos(t) {
            if (t < p.vira + 0.1) return;
            const [x, y] = naFolha(...p.raiz), s = pop(t, p.vira + 0.1, 0.4);
            c.save(); c.translate(x, y); c.scale(s, s); escreve('?', 0, 26, 56, { cor: 'ciano', brilho: 18, peso: 0.2 }); c.restore();
          },
        };
      },
    };

    // ---------- o mapa de colunas (um só, aparece nas cenas que têm a peça "mapa") ----------
    const mapa = (() => {
      const T = H.terra, G = new THREE.Group(); cena.add(G);
      const dentro = ([x, y], poli) => { let d = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const [xi, yi] = poli[i], [xj, yj] = poli[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
      const terras = [T.eurasia, ...(T.ilhas || [])], cel = [], chave = new Set();
      for (let j = 0, lat = MP.passo / 2; lat < 80; j++, lat += MP.passo) for (let i = 0, lon = -12 + MP.passo / 2; lon < 182; i++, lon += MP.passo) {
        if (!terras.some((t) => dentro([lon, lat], t))) continue;
        const [x, z] = noMundo([lon, lat]); chave.add(i + ',' + j);
        cel.push({ i, j, lon, lat, x, z, reg: dentro([lon, lat], T.regiao), imp: dentro([lon, lat], T.imperio) });
      }
      const lons = cel.map((q) => q.lon), lonA = Math.min(...lons), lonB = Math.max(...lons);
      const [pl, pa] = MP.pulso.ponto, dmax = Math.max(...cel.filter((q) => q.imp).map((q) => Math.hypot(q.lon - pl, q.lat - pa)));
      const R = MP.regiao, I = MP.imperio, C = MP.contorno, D = MP.desaba;
      for (const q of cel) {
        q.costa = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !chave.has((q.i + a) + ',' + (q.j + b)));
        const ang = (Math.atan2(q.lat - MP.latC, q.lon - MP.lonC) / (2 * Math.PI) + 1.25) % 1; // o contorno corre em volta
        q.tNasce = q.costa ? C.de + ang * (C.ate - C.de - 0.2) : C.de + 0.25 + h(q.i, q.j) * (C.ate - C.de - 0.15);
        q.tReg = R.de + (lonB - q.lon) / (lonB - lonA) * (R.ate - R.de - 0.3);            // de leste para oeste
        q.tImp = I.de + Math.hypot(q.lon - pl, q.lat - pa) / dmax * (I.ate - I.de - 0.3); // nasce do ponto na Mongólia
      }
      const geo = new THREE.BoxGeometry(MP.passo * MP.escala * 0.92, 1, MP.passo * MP.escala * MP.achata * 0.92); geo.translate(0, 0.5, 0);
      const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
      mat.onBeforeCompile = (sh) => { // luz própria proporcional à cor (o ouro e o vermelho brilham, o azul quase não)
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * diffuseColor.rgb * ' + H.luz.brilho.toFixed(3) + ';');
      };
      const cx = new THREE.InstancedMesh(geo, mat, cel.length); cx.frustumCulled = false; G.add(cx);
      cel.forEach((_, i) => cx.setColorAt(i, corA.set('#ffffff')));
      const cTerra = pega('terra'), cCosta = new THREE.Color('#779eea'), cOuro = pega('ouro'), cVerm = pega('vermelho'), cArd = pega('ardosia');
      // ponto que pulsa e anéis
      const [mx, mz] = noMundo(MP.pulso.ponto);
      const ponto = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), aceso(cor('vermelho'), 0.8)); ponto.position.set(mx, 1.4, mz); G.add(ponto);
      const onda = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 48), somaLuz(cor('vermelho'), 0.8)); onda.rotation.x = -Math.PI / 2; onda.position.set(mx, 1.3, mz); G.add(onda);
      const [ax, az] = noMundo(MP.aneis.centro);
      const aneis = Array.from({ length: MP.aneis.n }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), somaLuz(cor('ouro'), 0.8)); m.rotation.x = -Math.PI / 2; m.position.set(ax, 1.35, az); G.add(m); return m; });
      return {
        G,
        atualiza(t, peca) {
          const esc = 1 - (peca.escurece || 0);
          cel.forEach((q, n) => {
            let alt = MP.base * Math.max(0, pop(t, q.tNasce, 0.3));
            corA.copy(q.costa ? cCosta : cTerra);
            if (q.imp && !q.reg) { const u = sai(trecho(t, q.tImp, q.tImp + 0.3)); alt = mistura(alt, I.altura, u); corA.lerp(cVerm, u); }
            if (q.reg) {
              const u = passa(trecho(t, q.tReg, q.tReg + 0.35)), d = sai(trecho(t, D.t + h(q.i, q.j + 99) * 0.15, D.t + D.dur));
              alt = mistura(alt, R.altura, u); corA.lerp(cOuro, limita(u));
              alt = mistura(alt, MP.base * 1.2, d); corA.lerp(cArd, d);
            }
            corA.multiplyScalar(esc);
            mtx.makeScale(1, Math.max(1e-3, alt), 1); mtx.setPosition(q.x, 0, q.z); cx.setMatrixAt(n, mtx); cx.setColorAt(n, corA);
          });
          cx.instanceMatrix.needsUpdate = true; cx.instanceColor.needsUpdate = true;
          // ponto pulsando
          const pv = t >= MP.pulso.t && t < MP.pulso.some;
          ponto.visible = onda.visible = pv;
          if (pv) {
            ponto.scale.setScalar(Math.max(1e-4, pop(t, MP.pulso.t, 0.3) * (1 + 0.15 * Math.sin((t - MP.pulso.t) * 10.5))));
            const f = ((t - MP.pulso.t) / 0.6) % 1; onda.scale.setScalar(1 + f * 4); onda.material.opacity = 0.8 * (1 - f);
          }
          aneis.forEach((m, i) => { const u = trecho(t, MP.aneis.t + i * 0.12, MP.aneis.t + i * 0.12 + 0.8); m.visible = u > 0 && u < 1; m.scale.setScalar(Math.max(1e-4, sai(u) * MP.aneis.raio)); m.material.opacity = 0.8 * (1 - u); });
          // o mapa sobe (vai para trás) quando entram as barras
          const sb = peca.sobe ? sai(trecho(t, peca.sobe.t, peca.sobe.t + peca.sobe.dur)) : 0;
          const so = peca.sobe || {};
          G.position.set(0, (so.y || 0) * sb, (so.z || 0) * sb);
          G.rotation.x = (so.giro || 0) * sb * Math.PI / 180;            // inclina para a câmera, como um painel
          G.scale.setScalar(mistura(1, so.escala || 1, sb));
        },
      };
    })();

    // ---------- monta as cenas: cada batida é um grupo, só a da vez fica visível ----------
    const MONTADAS = CENAS.map((cn) => {
      const G = new THREE.Group(); cena.add(G);
      const ps = cn.pecas.filter((p) => PECAS3D[p.tipo]).map((p) => PECAS3D[p.tipo](p, G));
      return { G, ps, mapa: cn.pecas.find((p) => p.tipo === 'mapa') };
    });

    // ---------- câmera: desliza entre chaves (curva macia); corte seco entre cenas; tremor na virada ----------
    const alvo = new THREE.Vector3();
    function poeCamera(cn, t) {
      const K = cn.camera; let i = 0;
      while (i < K.length - 2 && t > K[i + 1][0]) i++;
      const a = K[i], b = K[Math.min(i + 1, K.length - 1)], u = b === a ? 0 : suave(trecho(t, a[0], b[0]));
      const p = [0, 1, 2].map((j) => mistura(a[1][j], b[1][j], u)), o = [0, 1, 2].map((j) => mistura(a[2][j], b[2][j], u));
      const q = Math.round(t * fps);
      for (const tr of H.tremores || []) {
        const q0 = Math.round(tr.t * fps);
        if (q >= q0 && q < q0 + tr.quadros) { const r = sorteio(H.semente * 1000 + q), f = tr.forca * (1 - (q - q0) / tr.quadros); const dx = (r() * 2 - 1) * f, dy = (r() * 2 - 1) * f; p[0] += dx; p[1] += dy; o[0] += dx; o[1] += dy; }
      }
      camera.fov = cn.fov || 45; camera.updateProjectionMatrix();
      camera.position.set(...p); alvo.set(...o); camera.lookAt(alvo); camera.updateMatrixWorld();
      cena.fog.near = cn.neblina ? cn.neblina[0] : 20; cena.fog.far = cn.neblina ? cn.neblina[1] : 80;
    }

    // =====================================================================================
    // PEÇAS 2D (na folha por cima): texto, contador, carimbo
    // =====================================================================================
    const PECAS2D = {
      texto(p, t) {
        if (t < p.t) return;
        const s = pop(t, p.t, 0.3), ap = p.apaga ? trecho(t, p.apaga, p.apaga + 0.3) : 0;
        c.globalAlpha = trecho(t, p.t, p.t + 0.12) * (p.some ? 1 - trecho(t, p.some, p.some + 0.25) : 1);
        const yc = p.y - p.tam * 0.45;
        c.save(); c.translate(p.x, yc); c.scale(s, s); c.translate(-p.x, -yc);
        const corDe = ap > 0 ? () => Filme.hex(cor(p.cor), cor('ardosia'), ap) : null;
        escreve(p.texto, p.x, p.y, p.tam, { cor: p.cor, cores: p.cores, corDe, brilho: (p.brilho || 0) * (1 - ap), tabular: p.tabular, peso: p.tam > 100 ? 0.2 : 0.17 });
        c.restore();
        if (p.risco && t >= p.risco.de) {
          const w = largTexto(p.texto, p.tam) + p.tam * 0.5, pr = sai(trecho(t, p.risco.de, p.risco.ate));
          c.strokeStyle = cor(p.risco.cor || 'vermelho'); c.lineWidth = p.tam * 0.13; c.lineCap = 'round'; brilho(14, c.strokeStyle);
          c.beginPath(); c.moveTo(p.x - w / 2, yc + p.tam * 0.08); c.lineTo(p.x - w / 2 + w * pr, yc + p.tam * 0.08 - p.tam * 0.16 * pr); c.stroke(); semBrilho();
        }
        c.globalAlpha = 1;
      },
      contador(p, t) {
        if (t < p.de) return;
        const u = trecho(t, p.de, p.ate), v = p.valor * (1 - Math.pow(1 - u, 2.2));
        c.globalAlpha = trecho(t, p.de, p.de + 0.15) * (p.some ? 1 - trecho(t, p.some, p.some + 0.25) : 1);
        const s = 1 + 0.06 * (u >= 1 ? Math.sin(Math.PI * trecho(t, p.ate, p.ate + 0.3)) : 0), yc = p.y - p.tam / 2;
        c.save(); c.translate(p.x, yc); c.scale(s, s); c.translate(-p.x, -yc);
        escreve(milhar(u >= 1 ? p.valor : Math.floor(v)), p.x, p.y, p.tam, { cor: p.cor, tabular: true, peso: 0.2 });
        c.restore(); c.globalAlpha = 1;
      },
      carimbo(p, t) {
        if (t < p.t) return;
        const u = trecho(t, p.t, p.t + 0.2), s = mistura(2.0, 1, sai(u)), ap = sai(trecho(t, p.apaga, p.apaga + 0.25));
        c.globalAlpha = limita(u * 1.8);
        c.save(); c.translate(p.x, p.y); c.rotate(mistura(p.giro, p.giro * 0.4, ap) * Math.PI / 180); c.scale(s, s);
        escreve(p.texto, 0, p.tam * 0.45, p.tam, { corDe: () => Filme.hex('#ffffff', cor('ardosia'), ap), peso: 0.2 });
        if (p.risco && t >= p.risco.de) {
          const w = largTexto(p.texto, p.tam) + p.tam * 0.6, pr = sai(trecho(t, p.risco.de, p.risco.ate));
          c.strokeStyle = cor('vermelho'); c.lineWidth = p.tam * 0.14; c.lineCap = 'round'; brilho(18, cor('vermelho'));
          c.beginPath(); c.moveTo(-w / 2, 6); c.lineTo(-w / 2 + w * pr, 6 - 14 * pr); c.stroke(); semBrilho();
        }
        c.restore(); c.globalAlpha = 1;
      },
    };

    // ---------- legendas: 2 a 4 palavras, branco com borda preta, a palavra falada em amarelo ----------
    const LG = H.legenda || {};
    const LEGENDAS = (H.legendas || []).map((lg) => {
      const tam = LG.tam || 64, palavras = lg.texto.split(/\s+/), linhas = []; let atual = [];
      for (const w of palavras) { const tenta = [...atual, w].join(' '); if (atual.length && largTexto(tenta, tam) > (LG.largura || 1000)) { linhas.push(atual); atual = [w]; } else atual.push(w); }
      if (atual.length) linhas.push(atual);
      const pesos = palavras.map((w) => w.length + 2), soma = pesos.slice(0, -1).reduce((a, b) => a + b, 0) || 1;
      const janela = Math.max(0.05, lg.ate - lg.de - (LG.segura ?? 0.55));
      let acum = lg.de; const inicio = pesos.map((w, i) => { const v = acum; if (i < pesos.length - 1) acum += janela * w / soma; return v; });
      // o cartão aparece inteiro de uma vez (sem esmaecer): confere que fica pelo menos 0,5 s na tela antes do escuro do fim
      const fimVisivel = Math.min(lg.ate, H.escuro ? H.escuro[0] : duracao);
      if (fimVisivel - lg.de < 0.5 - 1e-6) throw new Error(`Legenda "${lg.texto}" fica menos de 0,5 s na tela.`);
      return { ...lg, linhas, inicio, tam };
    });
    LEGENDAS.forEach((lg, i) => { if (i && lg.de < LEGENDAS[i - 1].ate - 1e-6) throw new Error(`Legenda "${lg.texto}" começa antes da anterior acabar.`); });
    function legenda(t) {
      const lg = LEGENDAS.find((l) => t >= l.de && t < l.ate); if (!lg) return;
      let falada = 0; lg.inicio.forEach((v, i) => { if (t >= v) falada = i; });
      const tam = lg.tam, passoL = tam * 1.5, n = lg.linhas.length, yb = LG.y || 1590;
      const s = 0.92 + 0.08 * passa(trecho(t, lg.de, lg.de + 0.18));
      c.save(); c.translate(LD / 2, yb - tam / 2); c.scale(s, s); c.translate(-LD / 2, -(yb - tam / 2));
      let idx = 0;
      lg.linhas.forEach((ln, li) => {
        const y = yb - (n - 1 - li) * passoL, base = idx;
        escreve(ln.join(' '), LD / 2, y, tam, { corDe: (q) => (base + q === falada ? cor('destaque') : '#ffffff'), contorno: 8, sombra: 3 });
        idx += ln.length;
      });
      c.restore();
    }

    // vinheta fina (pronta uma vez)
    const vinheta = document.createElement('canvas'); vinheta.width = largura; vinheta.height = altura;
    { const g = vinheta.getContext('2d'), gr = g.createRadialGradient(largura / 2, altura / 2, largura * 0.5, largura / 2, altura / 2, altura * 0.62);
      gr.addColorStop(0, 'rgba(2,4,12,0)'); gr.addColorStop(1, 'rgba(2,4,12,0.55)'); g.fillStyle = gr; g.fillRect(0, 0, largura, altura); }

    // a folha 2D vira uma textura colada na frente da câmera
    const txFolha = new THREE.CanvasTexture(folha); txFolha.colorSpace = THREE.SRGBColorSpace; txFolha.generateMipmaps = false; txFolha.minFilter = THREE.LinearFilter;
    const frente = new THREE.Scene(), camFrente = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    frente.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: txFolha, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })));

    // =====================================================================================
    // UM QUADRO
    // =====================================================================================
    function desenhar(t) {
      const ic = cenaEm(t), cn = CENAS[ic];
      poeCamera(cn, t);
      MONTADAS.forEach((m, i) => { m.G.visible = i === ic; });
      const mm = MONTADAS[ic];
      mapa.G.visible = !!mm.mapa;
      if (mm.mapa) mapa.atualiza(t, mm.mapa);
      for (const p of mm.ps) p.atualiza(t);

      c.reset(); c.clearRect(0, 0, largura, altura);
      c.drawImage(vinheta, 0, 0);
      // clarão branco da virada: por baixo dos textos e da legenda (a legenda nunca some no clarão)
      for (const cl of H.claroes || []) { const u = t >= cl.t ? 1 - trecho(t, cl.t, cl.t + cl.dur) : 0; if (u > 0) { c.globalAlpha = cl.forca * u; c.fillStyle = '#ffffff'; c.fillRect(0, 0, largura, altura); } }
      c.globalAlpha = 1;
      c.setTransform(k, 0, 0, k, 0, 0);
      for (const p of cn.pecas) if (PECAS2D[p.tipo]) { c.save(); PECAS2D[p.tipo](p, t); c.restore(); }
      for (const p of mm.ps) if (p.rotulos) { c.save(); p.rotulos(t); c.restore(); }
      legenda(t);
      c.setTransform(1, 0, 0, 1, 0, 0);
      const esc = H.escuro ? trecho(t, H.escuro[0], H.escuro[1]) : 0;
      if (esc > 0) { c.globalAlpha = esc; c.fillStyle = '#000'; c.fillRect(0, 0, largura, altura); }
      c.globalAlpha = 1;
      txFolha.needsUpdate = true;

      render.setRenderTarget(null); render.clear(); render.render(cena, camera); render.render(frente, camFrente);
    }

    // =====================================================================================
    // SOM: as mesmas marcas de tempo da imagem
    // =====================================================================================
    function som() {
      const MU = H.musica || {}, SO = H.sons || {}, s = Som.criar(duracao, (H.semente || 1) + 5), r = sorteio((H.semente || 1) + 77);
      const corta = MU.corta || [], calado = (tt) => corta.some(([a, b]) => tt >= a - 0.02 && tt < b);
      // arpejo escuro de serras desafinadas (duas vozes, uma de cada lado) e baixo a cada compasso
      const sem = 60 / (MU.bpm || 116) / 2, compasso = sem * 8, vol = MU.vol ?? 0.05;
      for (let i = 0, tt = 0.1; tt < duracao - 0.4; i++, tt += sem) {
        if (calado(tt)) continue;
        const ac = MU.acordes[Math.floor((tt - 0.1) / compasso) % MU.acordes.length];
        const n = ac[MU.padrao[i % MU.padrao.length]], v = vol * (i % 4 === 0 ? 1.15 : 0.85);
        s.nota(n, tt, sem * 0.7, { vol: v, forma: 'serra', ataque: 0.008, solta: 0.12, pan: -0.35 });
        s.nota(n, tt + 0.004, sem * 0.7, { vol: v * 0.8, forma: 'serra', ataque: 0.008, solta: 0.12, pan: 0.35, vibrato: 0.004, vibratoHz: 0.6 });
      }
      for (let b = 0, tt = 0.1; tt < duracao - 0.5; b++, tt += compasso) {
        if (calado(tt)) continue;
        const ac = MU.acordes[b % MU.acordes.length], fimB = corta.reduce((m, [a]) => (a > tt && a < m ? a : m), tt + compasso);
        s.nota(ac[0], tt, Math.max(0.2, fimB - tt - 0.15), { vol: MU.baixo ?? 0.11, forma: 'seno', ataque: 0.02, solta: 0.2 });
        s.nota(ac[0], tt, Math.max(0.2, fimB - tt - 0.15), { vol: (MU.baixo ?? 0.11) * 0.35, forma: 'serra', ataque: 0.02, solta: 0.2 });
        s.batida(tt, { vol: 0.22, freq: 60, dur: 0.3 });
      }
      // estalinhos de "pop" quando as peças entram, e um sopro em cada corte
      const blip = (tt, f = 1500, v = 0.035) => s.pio(tt, { freq: f, vol: v, repete: 1, dur: 0.035, sobe: 0.4 });
      for (const cn of CENAS) {
        if (cn.de > 0) s.vento(cn.de - 0.06, 0.3, { vol: 0.06, corte: 3000, onda: 2, entra: 0.08, sai: 0.2 });
        for (const p of cn.pecas) {
          if (p.tipo === 'texto' || p.tipo === 'contador') blip((p.t ?? p.de) + 0.02, 1300 + r() * 500);
          if (p.tipo === 'multidao') { for (let tt = p.de; tt < p.ate; tt += 0.06) blip(tt, 1700 + r() * 900, 0.018); if (p.liga) s.vento(p.liga.de, p.liga.ate - p.liga.de, { vol: 0.06, corte: 5000, onda: 1, entra: 0.3, sai: 0.3 }); }
          if (p.tipo === 'roda' || p.tipo === 'tubos') for (let i = 0; i < p.n; i++) blip(p.de + (p.ate - p.de) * i / p.n, 1500 + i * 60, 0.025);
          if (p.tipo === 'barras') p.itens.forEach((_, i) => { blip(p.t + i * 0.12, 700 + i * 120, 0.045); s.vento(p.t + i * 0.12, p.dur, { vol: 0.03, corte: 1800, onda: 1, entra: 0.1, sai: 0.3 }); });
          if (p.tipo === 'helice') for (let tt = p.de; tt < p.ate; tt += 0.07) blip(tt, 2200 + r() * 600, 0.015);
          if (p.tipo === 'helice' && p.divide) for (let i = 0; i < 6; i++) blip(p.divide.t + i * 0.1, 1800 + i * 150, 0.02);
          if (p.tipo === 'tumulos') for (let n = 0; n < 4; n++) s.toque(p.t + n * 0.06, { vol: 0.07, corte: 900, dur: 0.08 });
          if (p.tipo === 'arvore') for (let l = 0; l < p.niveis.length; l++) blip(p.de + (p.ate - p.de) * (l + 0.55) / p.niveis.length, 1200 + l * 250, 0.03);
          if (p.tipo === 'carimbo') s.toque(p.t + 0.18, { vol: 0.12, corte: 1500, dur: 0.1 });
        }
      }
      // o mapa: colunas nascem (sopro), a região sobe, o ponto pulsa
      s.vento(MP.contorno.de, MP.contorno.ate - MP.contorno.de + 0.2, { vol: 0.05, corte: 4000, onda: 1, entra: 0.2, sai: 0.2 });
      s.vento(MP.regiao.de, MP.regiao.ate - MP.regiao.de, { vol: 0.06, corte: 3000, onda: 1, entra: 0.2, sai: 0.3 });
      for (let tt = MP.pulso.t; tt < MP.imperio.de + 0.6; tt += 0.6) blip(tt, 800, 0.05);
      s.vento(MP.imperio.de, MP.imperio.ate - MP.imperio.de, { vol: 0.05, corte: 1500, onda: 1, entra: 0.3, sai: 0.4 });
      // tique-tique do contador
      if (SO.tiques) for (let tt = SO.tiques[0]; tt < SO.tiques[1]; tt += 0.05) s.toque(tt, { vol: 0.05, corte: 7000, dur: 0.015, pan: (r() - 0.5) * 0.4 });
      for (const tt of SO.golpes || []) { s.batida(tt, { vol: 0.55, freq: 55, dur: 0.45 }); s.toque(tt, { vol: 0.08, corte: 1200, dur: 0.1 }); }
      for (const tt of SO.brilhos || []) ['E6', 'A6', 'C7'].forEach((n, i) => s.sino(n, tt + i * 0.05, 0.9, { vol: 0.05, pan: (i - 1) * 0.3, brilho: 1.4 }));
      // subidas: terminam no número (7,6 s e 10,2 s)
      for (const [tt, d] of SO.subidas || []) { s.vento(tt, d, { vol: 0.13, corte: 2500, onda: 0.2, profundidade: 0.2, entra: d * 0.95, sai: 0.03 }); s.pio(tt, { freq: 260, sobe: 2.5, dur: d, repete: 1, vol: 0.04 }); }
      if (SO.arranhao !== undefined) { // arranhão de disco na virada
        const a = SO.arranhao;
        s.pio(a, { freq: 700, sobe: -0.75, dur: 0.16, repete: 1, vol: 0.12 }); s.pio(a + 0.15, { freq: 450, sobe: 0.9, dur: 0.12, repete: 1, vol: 0.09 });
        s.vento(a, 0.3, { vol: 0.2, corte: 1800, onda: 6, profundidade: 0.9, entra: 0.01, sai: 0.1 });
        s.batida(a, { vol: 0.45, freq: 70, dur: 0.3 });
      }
      if (SO.grave !== undefined) { ['A1', 'E2', 'A2'].forEach((n) => s.nota(n, SO.grave, 0.35, { vol: 0.14, forma: 'serra', ataque: 0.005, solta: 0.5 })); s.batida(SO.grave, { vol: 0.5, freq: 50, dur: 0.5 }); }
      if (SO.brilhoLongo !== undefined) ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'].forEach((n, i) => s.sino(n, SO.brilhoLongo + i * 0.07, 1.6, { vol: 0.05, pan: (i % 2 ? 0.3 : -0.3), brilho: 1.2 }));
      s.sala(0.22);
      return s.fim({ entra: 0.02, sai: 0.5, pico: 0.78 });
    }

    return { desenhar, som };
  },
});
