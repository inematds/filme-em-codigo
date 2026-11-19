// voxels.js — as maquetes de cubinhos. Cada função devolve uma LISTA de cubos, nunca desenha:
//   { x, y, z, cor, m }   (x, y, z = canto do cubo em casas inteiras; y = 0 é o chão da ilha;
//                          m = 'c' cubo comum, 'l' cubo com luz própria, 'v' vidro)
// O motor junta cada lista numa malha só, repetida por instância (InstancedMesh).
// Tudo aqui é conta com o sorteio que vem de fora: a mesma semente dá a mesma maquete.
// Os bonecos (arqueólogo, abelha, germes) são desenho próprio, feitos para este kit.

const cubo = (x, y, z, cor, m = 'c', k = 1, t = 1) => ({ x, y, z, cor, m, k, t }); // k = força da luz própria; t = tamanho
const escolhe = (lista, r) => lista[Math.floor(r() * lista.length) % lista.length];

// ilha flutuante: grama em cima, terra embaixo, o fundo vai afinando e fica irregular
export function ilha(I, r) {
  const v = [], meio = Math.floor(I.lado / 2);
  for (let y = -1; y >= -I.altura; y--) {
    const fundo = -1 - y, encolhe = Math.max(0, fundo - 1);
    for (let x = -meio; x < I.lado - meio; x++) for (let z = -meio; z < I.lado - meio; z++) {
      const borda = Math.min(x + meio, I.lado - meio - 1 - x, z + meio, I.lado - meio - 1 - z);
      if (borda < encolhe - 1) continue;
      if (borda < encolhe && r() < 0.6) continue;
      const cor = y === -1 ? escolhe(I.topo, r) : (y === -2 && I.topo2 ? escolhe(I.topo2, r) : escolhe(I.terra, r));
      v.push(cubo(x, y, z, cor));
    }
  }
  return v;
}

// árvore: tronco 2x2 e uma copa redonda de folhas em vários verdes
export function arvore(A, r) {
  const v = [];
  for (let y = 0; y < A.tronco; y++) for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v.push(cubo(x, y, z, escolhe(A.casca, r)));
  const R = A.copa, cy = A.tronco + R - 1;
  for (let x = -R; x <= R + 1; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R + 1; z++) {
    const d = Math.hypot(x - 0.5, y * 1.1, z - 0.5);
    if (d > R + 0.3 || (d > R - 0.6 && r() < 0.35)) continue;
    v.push(cubo(x, cy + y, z, escolhe(A.folhas, r)));
  }
  // um galho que sai para o lado (a colmeia pendura nele)
  if (A.galho) for (let i = 2; i <= A.galho.comprimento; i++) v.push(cubo(i, A.galho.altura, 0, escolhe(A.casca, r)));
  return v;
}

// colmeia: anéis de cubos dourados, mais largos no meio, com faixas escuras e a porta preta na frente
export function colmeia(C, r) {
  const v = [], perfil = C.perfil;
  perfil.forEach((raio, i) => {
    const y = perfil.length - 1 - i, faixa = i % 2 === 1;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const d = Math.hypot(x, z);
      if (d > raio + 0.2) continue;
      if (d < raio - 1.3 && i > 0 && i < perfil.length - 1) continue; // oco
      const porta = i === perfil.length - 2 && z >= 1 && Math.abs(x) <= 0 && d > raio - 1.2;
      v.push(cubo(x, y, z, porta ? C.porta : (faixa ? escolhe(C.faixa, r) : escolhe(C.cores, r))));
    }
  });
  return v;
}

// abelha: corpo listrado (amarelo, preto, amarelo), cabeça preta, ferrão; as asas são outra malha
export function abelha(B) {
  const v = [];
  const corpo = [B.amarelo, B.preto, B.amarelo, B.preto];
  corpo.forEach((cor, i) => { for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) v.push(cubo(i, y, z, cor)); });
  for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) v.push(cubo(4, y, z, B.cabeca));
  v.push(cubo(5, 1, 0, B.olho), cubo(5, 1, 1, B.olho));
  v.push(cubo(-1, 0, 0, B.preto));
  return v;
}
export function asa(B) {
  const v = [];
  for (let x = 0; x < 2; x++) for (let z = 0; z < 3; z++) v.push(cubo(x, 0, z, B.asa, 'v'));
  return v;
}

export function flor(F, r) {
  const v = [], alto = 1 + Math.floor(r() * 2);
  for (let y = 0; y < alto; y++) v.push(cubo(0, y, 0, F.caule));
  v.push(cubo(0, alto, 0, F.cor));
  return v;
}

// tumba vista em corte: chão de arenito, duas paredes no fundo com desenhos em cubos coloridos
export function tumba(T, r) {
  const v = [], n = T.lado, m = Math.floor(n / 2);
  for (let y = -3; y < 0; y++) for (let x = -m; x < n - m; x++) for (let z = -m; z < n - m; z++) {
    v.push(cubo(x, y, z, y === -1 ? escolhe(T.chao, r) : escolhe(T.base, r)));
  }
  for (let y = 0; y < T.altura; y++) {
    for (let i = -m; i < n - m; i++) {
      for (const [x, z, face] of [[-m, i, 'x'], [i, -m, 'z']]) {
        if (face === 'z' && i === -m) continue;
        // desenhos: faixas e figurinhas de 1 cubo, sorteadas, longe do chão e do teto
        const desenho = y >= 2 && y <= T.altura - 2 && (y % 3 !== 0) && r() < T.desenhos;
        v.push(cubo(x, y, z, desenho ? escolhe(T.tinta, r) : (y === T.altura - 1 ? escolhe(T.base, r) : escolhe(T.parede, r))));
      }
    }
  }
  return v;
}

// tocha: cabo de madeira preso na parede e a chama de cubos com luz própria (a chama é outra malha)
export function tocha(T) {
  return [cubo(0, 0, 0, T.cabo), cubo(0, 1, 0, T.cabo), cubo(0, 2, 0, T.suporte)];
}
export function chama(T) {
  return [cubo(0, 0, 0, T.chama[0], 'l', 3.2), cubo(0, 1, 0, T.chama[1], 'l', 3.6), cubo(0, 0, -1, T.chama[2], 'l', 2.4), cubo(0, 0, 1, T.chama[2], 'l', 2.4)];
}

// pote de barro (sem a tampa) e a tampa
export function poteBarro(P, r) {
  const v = [];
  P.perfil.forEach((raio, y) => {
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const d = Math.hypot(x, z);
      if (d > raio + 0.2) continue;
      // por dentro é oco; quase na boca fica o mel, com luz própria
      if (y > 0 && d < raio - 1.1) { if (y === P.perfil.length - 2) v.push(cubo(x, y, z, escolhe(P.mel, r), 'l', 1.6)); continue; }
      v.push(cubo(x, y, z, y === P.perfil.length - 1 ? P.borda : escolhe(P.cores, r)));
    }
  });
  return v;
}
export function tampaBarro(P) {
  const v = [];
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) v.push(cubo(x, 0, z, P.tampa));
  v.push(cubo(0, 1, 0, P.borda));
  return v;
}

// tesouro: pilha de cubos de ouro e um baú
export function tesouro(T, r) {
  const v = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) {
    const alto = 1 + Math.floor(r() * 2) - (x === 2 || z === 2 ? 1 : 0);
    for (let y = 0; y < Math.max(1, alto); y++) v.push(cubo(x, y, z, escolhe(T.ouro, r), r() < 0.25 ? 'l' : 'c', 1.4));
  }
  return v;
}
export function bau(T) {
  const v = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 2; z++) for (let y = 0; y < 2; y++) v.push(cubo(x, y, z, y === 1 && x === 1 && z === 1 ? T.fecho : T.madeira));
  return v;
}

// arqueólogo: cada parte é uma lista separada (o motor dobra o braço e vira a cabeça)
export function arqueologo(Q) {
  const pernas = [], corpo = [], cabeca = [], chapeu = [], braco = [], bracoE = [];
  for (let y = 0; y < 3; y++) { pernas.push(cubo(-1, y, 0, Q.calca), cubo(1, y, 0, Q.calca)); }
  pernas.push(cubo(-1, 0, 1, Q.bota), cubo(1, 0, 1, Q.bota));
  for (let y = 3; y < 6; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 0; z++) corpo.push(cubo(x, y, z, y === 3 ? Q.cinto : Q.camisa));
  for (let x = -1; x <= 1; x++) corpo.push(cubo(x, 6, 0, Q.lenco));
  corpo.push(cubo(0, 5, 1, Q.lenco), cubo(1, 5, 1, Q.lenco));
  // cabeça 3x3x3 a partir do pescoço (o motor põe em y = 6)
  for (let x = -1; x <= 1; x++) for (let y = 0; y < 3; y++) for (let z = -1; z <= 1; z++) cabeca.push(cubo(x, y, z, Q.pele));
  cabeca.push(cubo(-1, 1, 2, Q.olho), cubo(1, 1, 2, Q.olho), cubo(0, 0, 2, Q.bigode));
  // o chapéu é uma lista à parte: o motor não deixa a aba fazer sombra no rosto
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) chapeu.push(cubo(x, 3, z, Q.chapeu));
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) chapeu.push(cubo(x, 4, z, x === 0 && z === 0 ? Q.chapeu : (z === 1 ? Q.fita : Q.chapeu)));
  // braços pendurados no ombro (o ombro fica em y = 0 da lista, o braço desce)
  for (let y = -2; y <= 0; y++) { braco.push(cubo(0, y, 0, Q.camisa)); bracoE.push(cubo(0, y, 0, Q.camisa)); }
  braco.push(cubo(0, -3, 0, Q.pele)); bracoE.push(cubo(0, -3, 0, Q.pele));
  return { pernas, corpo, cabeca, chapeu, braco, bracoE };
}

// tábua de madeira (a base do pote de vidro) em pranchas
export function tabua(T, r) {
  const v = [], n = T.lado, m = Math.floor(n / 2);
  for (let y = -T.altura; y < 0; y++) for (let x = -m; x < n - m; x++) for (let z = -m; z < n - m; z++) {
    const prancha = Math.floor((x + m) / 3) % T.madeira.length;
    v.push(cubo(x, y, z, y === -1 ? T.madeira[prancha] : escolhe(T.lado2, r)));
  }
  return v;
}

// pote de vidro: só as paredes (casca de cubos de vidro) e a borda de cima mais forte
export function poteVidro(P) {
  const v = [], R = P.raio + 1;
  for (let y = 0; y < P.altura; y++) for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    if (Math.max(Math.abs(x), Math.abs(z)) !== R) continue;
    v.push(cubo(x, y, z, y === P.altura - 1 ? P.borda : P.vidro, 'v'));
  }
  return v;
}
export function tampaPote(P) {
  const v = [], R = P.raio + 1;
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) v.push(cubo(x, 0, z, P.tampa));
  for (let x = -R + 1; x <= R - 1; x++) for (let z = -R + 1; z <= R - 1; z++) v.push(cubo(x, 1, z, Math.max(Math.abs(x), Math.abs(z)) <= 1 ? P.miolo : P.tampa));
  return v;
}

// germe: bolota de cubos 3x3x3 sem os cantos, dois olhos grandes e uma boca preocupada
export function germe(G) {
  const v = [];
  for (let x = -1; x <= 1; x++) for (let y = 0; y < 3; y++) for (let z = -1; z <= 1; z++) {
    if (Math.abs(x) === 1 && Math.abs(z) === 1 && (y === 0 || y === 2)) continue;
    v.push(cubo(x, y, z, (x + y + z) % 2 === 0 ? G.cor : G.sombra));
  }
  v.push(cubo(-1, 1, 2, G.olho), cubo(1, 1, 2, G.olho));
  v.push(cubo(0, 3, 0, G.sombra), cubo(-1, 3, 1, G.cor));
  return v;
}
// pupilas e boca: cubos menores, um pouco para fora do rosto (o motor mexe nelas para o germe olhar)
export function pupilas(G) { return [cubo(-1.2, 1.25, 2.3, G.pupila, 'c', 1, 0.5), cubo(0.8, 1.25, 2.3, G.pupila, 'c', 1, 0.5), cubo(-0.25, 0.3, 1.6, G.pupila, 'c', 1, 0.5), cubo(0.25, 0.15, 1.6, G.pupila, 'c', 1, 0.5)]; }
