// massa.js — as formas de massinha e o material de massinha.
// Toda peça nasce de uma forma lisa (bolo, tubo, bola) e é AMASSADA uma vez, ao montar: cada ponto
// anda um pouco num campo de ruído, como dedo apertando a massa. Depois o material põe digitais
// (relevo feito num canvas) e, a cada pose, um tremidinho na superfície ("a massa ferve").
// Nada aqui sabe da história. Tudo é conta: a mesma semente dá sempre a mesma massa.
import * as THREE from '../../../vendor/three/three.module.js';

// sorteio sem memória: o mesmo trio de números dá sempre o mesmo valor (0 a 1)
export function h(a, b = 0, c = 0) {
  let v = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35) ^ Math.imul((c | 0) + 0x1b873593, 0x27d4eb2f);
  v ^= v >>> 15; v = Math.imul(v, 0x2c1b3c6d); v ^= v >>> 12; v = Math.imul(v, 0x297a2d39); v ^= v >>> 15;
  return (v >>> 0) / 4294967296;
}

// ruído liso em 3D (0 a 1): sorteio nos cantos de uma grade, misturado com curva suave
function ruido3(x, y, z, s) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const c = (a, b, d) => h(ix + a + s * 131, iy + b, iz + d);
  const l = (a, b, k) => a + (b - a) * k;
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
           l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

// amassa: cada ponto anda num campo de ruído (o mesmo lugar anda igual, então emendas não abrem)
export function amassa(g, amp, freq, sem) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = x * freq, fy = y * freq, fz = z * freq;
    p.setXYZ(i,
      x + (ruido3(fx, fy, fz, sem) - 0.5) * 2 * amp,
      y + (ruido3(fx, fy, fz, sem + 1) - 0.5) * 2 * amp,
      z + (ruido3(fx, fy, fz, sem + 2) - 0.5) * 2 * amp);
  }
  g.computeVertexNormals();
  return g;
}

// bolo: caixa de cantos redondos (e = 1 vira ovo; e = 0,3 quase caixa), feita de uma bola esticada
export function bolo(w, a, d, e = 0.4, seg = 22) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(10, Math.round(seg * 0.7)));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const f = (v) => Math.sign(v) * Math.pow(Math.abs(v), e);
    p.setXYZ(i, f(p.getX(i)) * w / 2, f(p.getY(i)) * a / 2, f(p.getZ(i)) * d / 2);
  }
  g.computeVertexNormals();
  return g;
}

// tubo: rolinho de massa por uma curva, mais grosso numa ponta que na outra, com pontas redondas
export function tubo(pts, r0, r1 = r0, nSeg = 8, nRad = 7) {
  const curva = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
  const fr = curva.computeFrenetFrames(nSeg, false);
  const pos = [], idx = [], uv = [];
  const anel = (c, nrm, bin, r, v) => {
    for (let j = 0; j <= nRad; j++) {
      const a = (j / nRad) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      pos.push(c.x + r * (ca * nrm.x + sa * bin.x), c.y + r * (ca * nrm.y + sa * bin.y), c.z + r * (ca * nrm.z + sa * bin.z));
      uv.push(j / nRad, v);
    }
  };
  const t0 = fr.tangents[0], tn = fr.tangents[nSeg];
  const p0 = curva.getPointAt(0), pn = curva.getPointAt(1);
  anel(p0.clone().addScaledVector(t0, -r0 * 0.7), fr.normals[0], fr.binormals[0], 0.001, 0); // ponta redonda
  anel(p0.clone().addScaledVector(t0, -r0 * 0.35), fr.normals[0], fr.binormals[0], r0 * 0.8, 0);
  for (let i = 0; i <= nSeg; i++) {
    const k = i / nSeg;
    anel(curva.getPointAt(k), fr.normals[i], fr.binormals[i], r0 + (r1 - r0) * k, k);
  }
  anel(pn.clone().addScaledVector(tn, r1 * 0.35), fr.normals[nSeg], fr.binormals[nSeg], r1 * 0.8, 1);
  anel(pn.clone().addScaledVector(tn, r1 * 0.7), fr.normals[nSeg], fr.binormals[nSeg], 0.001, 1);
  const aneis = nSeg + 5, n = nRad + 1;
  for (let i = 0; i < aneis - 1; i++) for (let j = 0; j < nRad; j++) {
    const a = i * n + j, b = a + n;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// junta várias formas numa só (posição, normal, uv e cor de cada pedaço)
export function junta(lista) {
  const pos = [], nor = [], uv = [], cor = [], idx = [];
  let base = 0;
  for (const { g, c } of lista) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    const col = new THREE.Color(c || '#ffffff');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); cor.push(col.r, col.g, col.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
    base += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  return g;
}

// digitais: relevo cinza num canvas (redemoinhos finos de dedo + furinhos), usado como bumpMap
export function texturaDigitais(sorteio) {
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d');
  c.fillStyle = '#808080'; c.fillRect(0, 0, N, N);
  for (let d = 0; d < 9; d++) {
    const cx = sorteio() * N, cy = sorteio() * N, rot = sorteio() * Math.PI, ach = 0.55 + 0.35 * sorteio();
    const aneis = 7 + Math.floor(sorteio() * 6), a0 = sorteio() * 6.28, abre = 3.2 + sorteio() * 2.4;
    for (let r = 1; r <= aneis; r++) {
      c.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = a0 + (k / 40) * abre, rr = r * 6.5 * (1 + 0.06 * Math.sin(a * 3 + r));
        const x = rr * Math.cos(a), y = rr * Math.sin(a) * ach;
        const px = cx + x * Math.cos(rot) - y * Math.sin(rot), py = cy + x * Math.sin(rot) + y * Math.cos(rot);
        k ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.strokeStyle = r % 2 ? 'rgba(40,40,40,0.35)' : 'rgba(220,220,220,0.3)'; c.lineWidth = 2.2; c.stroke();
    }
  }
  for (let i = 0; i < 260; i++) { // furinhos e calombinhos
    const x = sorteio() * N, y = sorteio() * N, r = 1 + sorteio() * 3.5;
    c.fillStyle = sorteio() < 0.5 ? 'rgba(30,30,30,0.25)' : 'rgba(235,235,235,0.22)';
    c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.NoColorSpace;
  return tx;
}

// material de massinha: fosco, com digitais e com a superfície que treme a cada pose.
// U = uniforms divididos ({ uPose }); torre = { uS, uB, uH } entorta e estica (só a torre usa).
export function materialMassa(U, o = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: o.cor || '#ffffff', vertexColors: !!o.vertexColors, roughness: 0.88, metalness: 0,
    bumpMap: o.digitais || null, bumpScale: o.relevo ?? 0.9,
    emissive: o.emissiva || '#000000', emissiveIntensity: 0,
  });
  ajeita(m, U, o);
  return m;
}

// injeta o tremor de pose (e o jeito da torre) no sombreador de vértice de qualquer material
export function ajeita(m, U, o = {}) {
  const amp = (o.boil ?? 0.006).toFixed(5), torre = !!o.torre;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPose = U.uPose;
    if (torre) { sh.uniforms.uS = U.uS; sh.uniforms.uB = U.uB; sh.uniforms.uH = U.uH; }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uPose; ${torre ? 'uniform float uS, uB, uH;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 q = position * 5.3 + vec3(uPose * 1.71, uPose * 2.33, uPose * 0.97);
          transformed += ${amp} * vec3(sin(q.y + 1.3 * q.z), sin(q.z + 1.7 * q.x), sin(q.x + 1.1 * q.y));
          ${torre ? `float yo = transformed.y; float k = clamp(yo / uH, 0.0, 1.3);
          transformed.x += uB * uH * k * k; transformed.y = yo * uS;` : ''}
        }`);
  };
  m.customProgramCacheKey = () => 'massa' + amp + (torre ? 't' : '');
  return m;
}
