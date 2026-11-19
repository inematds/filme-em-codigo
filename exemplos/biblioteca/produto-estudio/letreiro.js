// letreiro.js — tudo o que é texto na tela, desenhado numa tela 2D transparente por cima da foto:
// título fino e bem espaçado no alto, legenda numa pílula translúcida, rótulos com linha-guia na
// vista explodida e a marca no fim (com o sublinhado amarelo).
// As letras são traços (letras.js), não fonte instalada. Ao montar, confere se toda letra da
// história existe, se cada legenda fica pelo menos 0,5 s inteira na tela e se cada texto cabe na largura.
const { limita, trecho, suave, saiDevagar } = Filme;

export function criarLetreiro(H, L, A) {
  const tela = document.createElement('canvas'); tela.width = L; tela.height = A;
  const c = tela.getContext('2d');
  const u = L / 1080;                                   // medidas da história são de um quadro 1080x1920
  const COR = (n) => (H.cores[n] || n);
  const ESPACO = 0.5;                                   // espaço entre palavras (em "tam")
  const glifo = (ch) => (ch === ' ' ? null : Letras.letra(ch));
  const larg = (txt, tam, entre) => { let w = 0; for (const ch of txt) { const g = glifo(ch); w += g ? g.w + entre : ESPACO + entre; } return Math.max(0, w - entre) * tam; };
  const MAI = (s) => String(s || '').toUpperCase();

  // ---------- conferências ao montar (erro diz o que está errado) ----------
  const LG = H.legenda, TI = H.titulos, RO = H.rotulos, MA = H.marca, AP = LG.aparece;
  const EX = H.pecas.find((p) => p.tipo === 'explosao');
  const textos = [
    ...LG.lista.map((q) => [MAI(q.texto), LG.tam, 0.2, 'legenda']),
    ...TI.lista.map((q) => [MAI(q.texto), TI.tam, TI.espaco, 'título']),
    ...(EX ? EX.partes.map((p) => [MAI(p.rotulo), RO.tam, RO.espaco, 'rótulo']) : []),
    [MAI(MA.texto), MA.tam, MA.espaco, 'marca'],
  ];
  const falta = new Set();
  for (const [tx] of textos) for (const ch of tx) if (ch !== ' ' && !glifo(ch)) falta.add(`${ch} (em "${tx}")`);
  if (falta.size) throw new Error('Letra que não existe em letras.js: ' + [...falta].join(', '));
  for (const [tx, tam, entre, onde] of textos) {
    const w = larg(tx, tam, entre) + (onde === 'legenda' ? 2 * tam : 0);
    const cabe = onde === 'rótulo' ? 0.3 * 1080 : 1080 - 2 * 40;
    if (w > cabe) throw new Error(`O ${onde} "${tx}" tem ${Math.round(w)} px e não cabe (máximo ${cabe} px num quadro de 1080).`);
  }
  LG.lista.forEach((q, i) => {
    const inteira = (q.ate - AP) - (q.de + AP);
    if (inteira < 0.5 - 1e-6) throw new Error(`Legenda "${q.texto}" fica inteira só ${inteira.toFixed(2)} s (mínimo 0,5 s).`);
    const prox = LG.lista[i + 1];
    if (prox && prox.de < q.ate) throw new Error(`Legenda "${prox.texto}" começa antes de "${q.texto}" sair.`);
  });

  // ---------- escrever com traços ----------
  // o = { cor, grossura (em tam), entre (espaço entre letras, em tam), alinha: 'centro'|'esquerda'|'direita', alfa }
  function escreve(txt, x, y, tam, o) {
    const entre = o.entre ?? 0.2, w = larg(txt, tam, entre);
    let px = o.alinha === 'esquerda' ? x : o.alinha === 'direita' ? x - w : x - w / 2;
    c.save();
    c.globalAlpha = o.alfa ?? 1; c.strokeStyle = o.cor; c.lineWidth = tam * (o.grossura ?? 0.08); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (const ch of txt) {
      const g = glifo(ch);
      if (g) for (const tr of g.tracos) tr.forEach(([a, b], j) => { const qx = px + a * tam, qy = y - tam + b * tam; if (j) c.lineTo(qx, qy); else c.moveTo(qx, qy); });
      px += ((g ? g.w : ESPACO) + entre) * tam;
    }
    c.stroke(); c.restore();
    return w;
  }
  const entraSai = (t, de, ate, k) => suave(trecho(t, de, de + k)) * (1 - suave(trecho(t, ate - k, ate)));

  // ---------- quadro de textos no tempo t ----------
  // rotulos: [{ texto, x, y (âncora na tela, em pixels), lado, alfa }]
  function desenhar(t, rotulos) {
    c.reset();
    // título do alto
    for (const q of TI.lista) {
      const a = entraSai(t, q.de, q.ate, 0.3); if (a <= 0) continue;
      escreve(MAI(q.texto), L / 2, (TI.y + (1 - a) * 10) * u, TI.tam * u, { cor: COR('texto'), grossura: 0.07, entre: TI.espaco, alfa: a * 0.92 });
    }
    // legenda na pílula
    for (const q of LG.lista) {
      const a = entraSai(t, q.de, q.ate, AP); if (a <= 0) continue;
      const tam = LG.tam * u, txt = MAI(q.texto), w = larg(txt, tam, 0.2), pw = w + 2 * tam, ph = tam * 2.1;
      const cx = L / 2, cy = LG.y * u + (1 - a) * 8 * u;
      c.save(); c.globalAlpha = a; c.fillStyle = COR('pilula');
      c.beginPath(); c.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2); c.fill(); c.restore();
      escreve(txt, cx, cy + tam / 2, tam, { cor: COR('texto'), grossura: 0.1, entre: 0.2, alfa: a });
    }
    // rótulos da vista explodida
    for (const r of rotulos || []) {
      if (r.alfa <= 0) continue;
      const tam = RO.tam * u, d = r.lado, sobe = 34 * u, anda = 30 * u, reto = 120 * u;
      const x1 = r.x + d * anda, y1 = r.y - sobe;
      let x2 = x1 + d * reto; x2 = limita(x2, 28 * u, L - 28 * u);
      c.save(); c.globalAlpha = r.alfa; c.strokeStyle = 'rgba(235,240,250,0.85)'; c.lineWidth = 1.6 * u;
      c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(x1, y1); c.lineTo(x1 + (x2 - x1) * r.linha, y1); c.stroke();
      c.fillStyle = 'rgba(235,240,250,0.95)'; c.beginPath(); c.arc(r.x, r.y, 3 * u, 0, 7); c.fill(); c.restore();
      escreve(MAI(r.texto), x2, y1 - 10 * u, tam, { cor: COR('texto'), grossura: 0.08, entre: RO.espaco, alinha: d > 0 ? 'direita' : 'esquerda', alfa: r.alfa * limita(r.linha * 2 - 0.6) });
    }
    // a marca no fim: entra devagar fechando o espaço entre as letras; depois o sublinhado amarelo cresce
    if (t >= MA.de) {
      const a = saiDevagar(trecho(t, MA.de, MA.de + 0.8)), tam = MA.tam * u, entre = MA.espaco + (1 - a) * 0.5;
      const w = escreve(MAI(MA.texto), L / 2, MA.y * u, tam, { cor: COR('texto'), grossura: 0.035, entre, alfa: a });
      const s = saiDevagar(trecho(t, MA.sublinha[0], MA.sublinha[1]));
      if (s > 0) {
        const sw = w * 0.62 * s;
        c.save(); c.fillStyle = COR('acento'); c.shadowColor = COR('acento'); c.shadowBlur = 14 * u;
        c.fillRect(L / 2 - sw / 2, MA.y * u + 0.42 * tam, sw, 5 * u); c.restore();
      }
    }
  }
  return { tela, desenhar };
}
