// trilha.js — música e sons do desenho-3d, tudo feito em código (comum/som.js), nos mesmos tempos
// da imagem. A história escolhe: andamento, compasso, tom, escala, acordes, percussão, onde a música
// cala, onde fica menor, onde treme (tremolo) e o acorde final; e uma lista de sons com nome e hora
// ("galope", "brilho", "arranhao", "estouro", "boing"...). Nada aqui sabe de nenhuma história.

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(nome) { const m = /^([A-G])([#b]?)(-?\d)$/.exec(nome); return NOTA[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12; }

export function montarSom(H, duracao) {
  const s = Som.criar(duracao, H.semente || 7);
  const r = Filme.sorteio((H.semente || 7) * 17 + 3);
  const M = H.musica || {};
  const dentro = (t, lista) => (lista || []).some(([a, b]) => t >= a && t < b);
  // ---------- música ----------
  if (M.bpm) {
    const pulso = 60 / M.bpm / (M.compasso === 6 ? 2 : 1);  // 6/8: o pulso é a colcheia
    const porComp = M.compasso || 4;
    const raiz = midi(M.tom || 'A3');
    const escala = M.escala || [0, 3, 5, 7, 10];                 // pentatônica menor por padrão
    const menor = M.escalaMenor || escala.map((v) => (v === 4 ? 3 : v === 9 ? 8 : v === 11 ? 10 : v));
    const acordes = M.acordes || [0, 0, 3, 4];                   // grau (índice na escala) do baixo por compasso
    const vol = M.vol ?? 0.12, fim = M.fim ?? duracao;
    const corte = (t) => dentro(t, M.pausas);
    const nota = (grau, oit, t) => { const E = dentro(t, M.menor) ? menor : escala, n = E.length; const o = Math.floor(grau / n), g = ((grau % n) + n) % n; return midiHz(raiz + E[g] + 12 * (o + oit)); };
    let grau = 2;
    const nPulsos = Math.floor((fim - (M.inicio || 0)) / pulso);
    for (let q = 0; q < nPulsos; q++) {
      const t = (M.inicio || 0) + q * pulso;
      if (corte(t) || t >= fim) continue;
      const comp = Math.floor(q / porComp), noComp = q % porComp;
      const ac = acordes[comp % acordes.length];
      const trem = dentro(t, M.tremolo);
      // baixo: "um-pá-pá" (forte no 1, acorde nos outros) ou caminhando
      if (M.baixo === 'caminha') { if (noComp % (porComp === 6 ? 3 : 1) === 0) s.corda(nota(ac + [0, 2, 3, 4][noComp % 4], -1, t), t, pulso * 1.6, { vol: vol * 1.3, maciez: 0.85 }); }
      else if (porComp === 6) { if (noComp === 0 || noComp === 3) s.corda(nota(ac + (noComp ? 2 : 0), -1, t), t, pulso * 2.5, { vol: vol * 1.3, maciez: 0.85 }); else if (noComp === 1 || noComp === 4) s.corda(nota(ac + 2, 0, t), t, pulso, { vol: vol * 0.45, maciez: 0.6 }); }
      else { if (noComp === 0) s.corda(nota(ac, -1, t), t, pulso * 3, { vol: vol * 1.3, maciez: 0.85 }); else if (noComp === 2) s.corda(nota(ac + 2, -1, t), t, pulso * 2, { vol: vol * 0.8, maciez: 0.85 }); if (M.contratempo && noComp % 2 === 1) s.corda(nota(ac + 2, 0, t), t, pulso * 0.6, { vol: vol * 0.4, maciez: 0.5 }); }
      // melodia: passeia pela escala; às vezes descansa
      const toca = trem || r() < (M.densidade ?? 0.6) || noComp === 0;
      if (toca) {
        if (!trem) { const passo = [-2, -1, -1, 1, 1, 2, 0][Math.floor(r() * 7)]; grau = Math.max(0, Math.min(9, grau + passo)); if (noComp === 0) grau = Math.max(0, Math.min(9, ac + [0, 2, 4][Math.floor(r() * 3)])); }
        const f = nota(grau, 1, t);
        if (trem) { for (let z = 0; z < 4; z++) s.corda(f, t + z * pulso / 4, pulso / 4, { vol: vol * 0.7, maciez: 0.3, pan: 0.15 }); }
        else { s.corda(f, t, pulso * 1.8, { vol: vol * 0.95, maciez: 0.35, pan: 0.15 }); if (M.dobra) s.corda(f * 1.004, t + 0.012, pulso * 1.2, { vol: vol * 0.3, maciez: 0.4, pan: -0.25 }); }
      }
      // percussão
      for (const p of M.perc || []) {
        if (p === 'taiko' && (noComp === 0 || (porComp === 4 && noComp === 2 && r() < 0.6))) s.batida(t, { vol: vol * 2.4, freq: 70, dur: 0.35 });
        if (p === 'bumbo' && noComp % 2 === 0) s.batida(t, { vol: vol * 2.0, freq: 60, dur: 0.22 });
        if (p === 'bloco' && noComp % (porComp === 6 ? 3 : 1) === 0) s.pio(t, { freq: 1100, dur: 0.035, repete: 1, vol: vol * 0.55 });
        if (p === 'pandeiro') s.toque(t, { vol: vol * (noComp % 3 === 0 ? 0.35 : 0.18), dur: 0.05, corte: 7000 });
        if (p === 'vassourinha' && noComp % 2 === 1) s.toque(t, { vol: vol * 0.45, dur: 0.12, corte: 5000 });
        if (p === 'caixa' && dentro(t, M.marcha)) { s.toque(t, { vol: vol * 0.6, dur: 0.06, corte: 3500 }); s.toque(t + pulso / 2, { vol: vol * 0.35, dur: 0.05, corte: 3500 }); }
      }
    }
    // acorde final
    if (M.acordeFinal != null) { const t = M.acordeFinal; [0, 2, 4].forEach((g, j) => s.corda(nota(g, j ? 0 : -1, 99), t + j * 0.02, 1.8, { vol: vol * 1.2, maciez: 0.4, pan: (j - 1) * 0.3 })); }
    if (M.duasNotas != null) { const t = M.duasNotas; s.corda(nota(4, 1, 99), t, 0.5, { vol: vol * 1.2, maciez: 0.4 }); s.corda(nota(0, 0, 99), t + 0.22, 1.4, { vol: vol * 1.4, maciez: 0.5 }); }
  }

  // ---------- sons com nome (cada um é uma receita genérica) ----------
  const SONS = {
    galope(t, o) { const d = o.dur || 1.5, v = o.vol ?? 0.1; for (let x = 0; x < d; x += 0.36) for (const dd of [0, 0.07, 0.15]) s.toque(t + x + dd, { vol: v * (dd ? 0.7 : 1), dur: 0.05, corte: 900, pan: o.pan || 0 }); },
    tique(t, o) { const d = o.dur || 1, v = o.vol ?? 0.06, hz = o.hz || 10; for (let x = 0; x < d; x += 1 / hz) s.pio(t + x, { freq: 2400, dur: 0.012, repete: 1, vol: v }); },
    brilho(t, o) { const v = o.vol ?? 0.07; ['E6', 'G6', 'B6', 'E7', 'G7'].forEach((n, j) => s.sino(n, t + j * 0.045, 0.9, { vol: v, pan: (j - 2) * 0.2, brilho: 1.4 })); },
    brilhoLongo(t, o) { const v = o.vol ?? 0.07; ['C6', 'E6', 'G6', 'C7', 'E7', 'G7', 'C8'].forEach((n, j) => s.sino(n, t + j * 0.07, 2.2, { vol: v, pan: (j - 3) * 0.15, brilho: 1.2 })); },
    subida(t, o) { s.pio(t, { freq: 300, sobe: 3, dur: o.dur || 0.6, repete: 1, vol: o.vol ?? 0.05 }); s.vento(t, o.dur || 0.6, { vol: (o.vol ?? 0.05) * 1.5, corte: 2500, entra: 0.4, sai: 0.1 }); },
    whoosh(t, o) { s.vento(t, o.dur || 0.45, { vol: o.vol ?? 0.18, corte: 1800, onda: 2, profundidade: 0.8, entra: 0.15, sai: 0.25 }); },
    arranhao(t, o) { const v = o.vol ?? 0.12; s.pio(t, { freq: 900, sobe: -0.7, dur: 0.12, repete: 1, vol: v }); s.pio(t + 0.12, { freq: 400, sobe: 1.4, dur: 0.1, repete: 1, vol: v }); s.pio(t + 0.22, { freq: 800, sobe: -0.8, dur: 0.18, repete: 1, vol: v }); s.toque(t, { vol: v * 0.8, dur: 0.4, corte: 2500 }); },
    golpe(t, o) { s.batida(t, { vol: o.vol ?? 0.5, freq: 80, dur: 0.4 }); s.toque(t, { vol: (o.vol ?? 0.5) * 0.25, dur: 0.08, corte: 1800 }); },
    tambor(t, o) { s.batida(t, { vol: o.vol ?? 0.6, freq: 48, dur: 1.1 }); s.batida(t + 0.01, { vol: (o.vol ?? 0.6) * 0.4, freq: 95, dur: 0.3 }); },
    baque(t, o) { s.batida(t, { vol: o.vol ?? 0.35, freq: 120, dur: 0.18 }); s.toque(t, { vol: (o.vol ?? 0.35) * 0.3, dur: 0.05, corte: 1200 }); },
    estouro(t, o) { const v = o.vol ?? 0.6; s.batida(t, { vol: v, freq: 42, dur: 1.4 }); s.vento(t, 1.6, { vol: v * 0.7, corte: 700, onda: 1, profundidade: 0.3, entra: 0.01, sai: 1.4 }); s.toque(t, { vol: v * 0.5, dur: 0.3, corte: 1500 }); },
    gongo(t, o) { const v = o.vol ?? 0.08; for (const [n, k] of [['A2', 1], ['E3', 0.6], ['C#4', 0.4], ['G4', 0.25]]) s.sino(n, t, o.dur || 3, { vol: v * k, brilho: 3.5 }); },
    boing(t, o) { const v = o.vol ?? 0.1; s.nota(o.freq || 180, t, 0.35, { forma: 'tri', vol: v, ataque: 0.005, solta: 0.12, vibrato: 0.25, vibratoHz: 14 }); s.pio(t, { freq: o.freq || 180, sobe: 1.2, dur: 0.3, repete: 1, vol: v * 0.8 }); },
    rangido(t, o) { const v = o.vol ?? 0.06; for (let j = 0; j < 7; j++) s.pio(t + j * 0.06, { freq: 140 + 30 * Math.sin(j), sobe: 0.3, dur: 0.05, repete: 1, vol: v }); },
    esguicho(t, o) { const v = o.vol ?? 0.12; s.pio(t, { freq: 320, sobe: -0.6, dur: 0.16, repete: 1, vol: v }); s.toque(t, { vol: v, dur: 0.18, corte: 600 }); },
    pipoca(t, o) { const d = o.dur || 0.8, v = o.vol ?? 0.12; for (let j = 0; j < 22; j++) s.toque(t + r() * d, { vol: v * (0.5 + r() * 0.5), dur: 0.03, corte: 2500 + r() * 2000, pan: r() - 0.5 }); },
    respingo(t, o) { const v = o.vol ?? 0.2; s.vento(t, 0.25, { vol: v * 0.8, corte: 2200, entra: 0.12, sai: 0.1 }); s.toque(t + 0.22, { vol: v, dur: 0.25, corte: 900 }); s.batida(t + 0.22, { vol: v * 0.8, freq: 90, dur: 0.15 }); },
    ding(t, o) { const v = o.vol ?? 0.1; s.sino('E6', t, 1.2, { vol: v, brilho: 1.8 }); s.sino('B6', t + 0.08, 1.2, { vol: v * 0.8, brilho: 1.8 }); s.toque(t, { vol: v * 0.3, dur: 0.05, corte: 6000 }); },
    plim(t, o) { s.sino(o.nota || 'A6', t, 0.8, { vol: o.vol ?? 0.08, brilho: 1.5 }); },
    sinos(t, o) { s.sino('G5', t, 1.4, { vol: o.vol ?? 0.08 }); s.sino('D6', t + 0.18, 1.6, { vol: o.vol ?? 0.08 }); },
    buzina(t, o) { const v = o.vol ?? 0.05; for (const [x, f] of [[0, 392], [0.28, 330]]) { s.nota(f, t + x, 0.18, { forma: 'quad', vol: v, ataque: 0.01, solta: 0.05 }); s.nota(f * 1.26, t + x, 0.18, { forma: 'quad', vol: v * 0.6, ataque: 0.01, solta: 0.05 }); } },
    motor(t, o) { const d = o.dur || 2, v = o.vol ?? 0.06; s.nota(o.freq || 55, t, d, { forma: 'serra', vol: v, ataque: 0.25, solta: 0.4, vibrato: 0.05, vibratoHz: 11 }); s.vento(t, d, { vol: v * 0.6, corte: 300, entra: 0.3, sai: 0.4 }); },
    zumbido(t, o) { const d = o.dur || 3, v = o.vol ?? 0.03; s.nota(60, t, d, { forma: 'serra', vol: v, ataque: 0.4, solta: 0.4 }); s.nota(120, t, d, { forma: 'seno', vol: v * 0.7, ataque: 0.4, solta: 0.4 }); },
    rajada(t, o) { const d = o.dur || 1.5, v = o.vol ?? 0.18; for (let x = 0; x < d; x += 1 / 11) { s.toque(t + x, { vol: v, dur: 0.05, corte: 2200 }); s.batida(t + x, { vol: v * 0.5, freq: 140, dur: 0.06 }); } },
    trovao(t, o) { const v = o.vol ?? 0.5; s.toque(t, { vol: v * 0.6, dur: 0.3, corte: 3000 }); s.batida(t, { vol: v, freq: 38, dur: 2 }); s.vento(t, 2.6, { vol: v * 0.6, corte: 260, onda: 3, profundidade: 0.6, entra: 0.02, sai: 2 }); },
    chuva(t, o) { s.vento(t, o.dur || 4, { vol: o.vol ?? 0.06, corte: 5000, onda: 0.3, profundidade: 0.2, entra: 0.3, sai: 0.6 }); },
    fogo(t, o) { const d = o.dur || 3, v = o.vol ?? 0.05; s.vento(t, d, { vol: v, corte: 400, onda: 1.5, profundidade: 0.5, entra: 0.3, sai: 0.5 }); for (let x = 0; x < d; x += 0.04 + r() * 0.12) s.toque(t + x, { vol: v * (0.4 + r()), dur: 0.02, corte: 4000, pan: r() - 0.5 }); },
    rugido(t, o) { s.vento(t, o.dur || 1.2, { vol: o.vol ?? 0.2, corte: 500, onda: 2, profundidade: 0.3, entra: 0.5, sai: 0.3 }); },
    clank(t, o) { const v = o.vol ?? 0.08; s.sino(620, t, 0.4, { vol: v, brilho: 4 }); s.sino(1130, t, 0.3, { vol: v * 0.6, brilho: 4 }); s.toque(t, { vol: v, dur: 0.04, corte: 5000 }); },
    ronco(t, o) { const v = o.vol ?? 0.08; for (let j = 0; j < (o.vezes || 2); j++) s.vento(t + j * 1.1, 0.7, { vol: v, corte: 220, onda: 6, profundidade: 0.8, entra: 0.3, sai: 0.3 }); },
    asas(t, o) { const v = o.vol ?? 0.05; for (let j = 0; j < 10; j++) s.toque(t + j * 0.045, { vol: v, dur: 0.04, corte: 1400 }); },
    pincel(t, o) { s.vento(t, o.dur || 0.5, { vol: o.vol ?? 0.06, corte: 6000, onda: 4, profundidade: 0.8, entra: 0.05, sai: 0.2 }); },
    trompaTriste(t, o) { const v = o.vol ?? 0.06; s.nota(311, t, 0.3, { forma: 'serra', vol: v, ataque: 0.03, solta: 0.1, vibrato: 0.01 }); s.nota(233, t + 0.38, 0.6, { forma: 'serra', vol: v, ataque: 0.03, solta: 0.3, vibrato: 0.02, vibratoHz: 6 }); },
    corneta(t, o) { const v = o.vol ?? 0.06; for (const f of [262, 330, 392]) s.nota(f, t, 0.5, { forma: 'serra', vol: v, ataque: 0.02, solta: 0.15 }); },
    bicadas(t, o) { const d = o.dur || 1, v = o.vol ?? 0.05; for (let x = 0; x < d; x += 0.09 + r() * 0.08) s.toque(t + x, { vol: v, dur: 0.015, corte: 5000, pan: r() - 0.5 }); },
    passinhos(t, o) { const d = o.dur || 1, v = o.vol ?? 0.06; for (let x = 0; x < d; x += 0.035 + r() * 0.03) s.toque(t + x, { vol: v * (0.5 + r() * 0.5), dur: 0.025, corte: 1600, pan: r() - 0.5 }); },
    chiado(t, o) { const v = o.vol ?? 0.04; for (let j = 0; j < 12; j++) s.pio(t + r() * (o.dur || 0.8), { freq: 900 + r() * 900, sobe: (r() - 0.5) * 0.8, dur: 0.06, repete: 1, vol: v, pan: r() - 0.5 }); },
    aviao(t, o) { const d = o.dur || 2, v = o.vol ?? 0.05; s.nota(110, t, d, { forma: 'serra', vol: v, ataque: 0.4, solta: 0.5, vibrato: 0.02, vibratoHz: 23 }); s.vento(t, d, { vol: v, corte: 1200, entra: 0.4, sai: 0.5 }); },
    furadeira(t, o) { s.nota(o.freq || 520, t, o.dur || 1, { forma: 'serra', vol: o.vol ?? 0.03, ataque: 0.05, solta: 0.1, vibrato: 0.03, vibratoHz: 30 }); },
  };
  for (const S of H.sons || []) {
    const f = SONS[S.som];
    if (!f) throw new Error('som desconhecido: ' + S.som);
    f(S.t, S);
  }
  s.sala(M.sala ?? 0.3);
  return s.fim({ entra: 0.05, sai: 0.5, pico: 0.78 });
}
