#!/usr/bin/env node
// Monta a seção "Biblioteca" do guia (PT/EN/ES) a partir de exemplos/biblioteca/.
// Uso: node ferramentas/galeria.mjs   (reescreve só o trecho entre os marcadores)
// Textos traduzidos ficam em guia/biblioteca-i18n.json (títulos, estilos e frases da seção).
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BIB = path.join(RAIZ, 'exemplos/biblioteca');
const I18N = JSON.parse(fs.readFileSync(path.join(RAIZ, 'guia/biblioteca-i18n.json'), 'utf8'));
const REPO = 'https://github.com/inematds/filme-em-codigo';
const INI = '<!-- biblioteca:inicio -->', FIM = '<!-- biblioteca:fim -->';
const NINI = '<!-- biblioteca-nav -->';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ordem = ordem do mapa (estilos de pt)
const motores = Object.keys(I18N.pt.estilos);
const filmes = [];
for (const m of motores) {
  const dir = path.join(BIB, m);
  const hs = fs.readdirSync(dir).filter(f => /^historia.*\.json$/.test(f)).sort((a, b) => (a === 'historia.json' ? -1 : b === 'historia.json' ? 1 : a.localeCompare(b)));
  for (const h of hs) {
    const quadro = h === 'historia.json' ? 'quadro.jpg' : `quadro-${h.replace(/\.json$/, '')}.jpg`;
    if (!fs.existsSync(path.join(dir, quadro))) throw new Error(`sem ${m}/${quadro}`);
    const med = path.join(dir, h === 'historia.json' ? 'medida.json' : `medida-${h}`);
    const res = fs.existsSync(med) ? JSON.parse(fs.readFileSync(med, 'utf8')).resolucao : '';
    const [w, hh] = (res || '1920x1080').split('x').map(Number);
    filmes.push({ m, h, quadro, vertical: hh > w });
  }
}
if (motores.length !== 43 || filmes.length !== 51) console.error(`aviso: ${motores.length} motores, ${filmes.length} filmes`);

function secao(lang, pre) {
  const T = I18N[lang];
  const card = f => {
    const tit = T.titulos[`${f.m}/${f.h}`] || I18N.pt.titulos[`${f.m}/${f.h}`];
    const est = T.estilos[f.m];
    const play = `${pre}exemplos/biblioteca/${f.m}/` + (f.h === 'historia.json' ? '' : `?historia=${f.h}`);
    const video = `${REPO}/releases/download/exemplos-v1/${f.m}-${path.basename(f.h, '.json')}.mp4`;
    return `    <figure class="quadro"><img src="${pre}exemplos/biblioteca/${f.m}/${f.quadro}" alt="${esc(tit)}" loading="lazy"><figcaption><b>${esc(tit)}</b><br>${esc(est)}<span class="bibl"><a href="${play}" target="_blank" rel="noopener">▶ ${esc(T.ui.assistir)}</a> · <a href="${REPO}/tree/main/exemplos/biblioteca/${f.m}" target="_blank" rel="noopener">${esc(T.ui.receita)}</a> · <a href="${video}">${esc(T.ui.video)}</a></span></figcaption></figure>`;
  };
  const deitados = filmes.filter(f => !f.vertical), empe = filmes.filter(f => f.vertical);
  return `${INI}
<section id="biblioteca"><div class="wrap">
  <span class="chip">${esc(T.ui.chip)}</span>
  <h2>${T.ui.h2}</h2>
  <p class="sub">${esc(T.ui.sub)}</p>
  <div class="stats">
    <div class="stat"><b>43</b><span>${esc(T.ui.stat_motores)}</span></div>
    <div class="stat"><b>51</b><span>${esc(T.ui.stat_filmes)}</span></div>
    <div class="stat"><b>0</b><span>${esc(T.ui.stat_ia)}</span></div>
  </div>
  <h3 class="bibh">${esc(T.ui.h_deitado)} · ${deitados.length}</h3>
  <div class="bib bib169">
${deitados.map(card).join('\n')}
  </div>
  <h3 class="bibh">${esc(T.ui.h_empe)} · ${empe.length}</h3>
  <div class="bib bib916">
${empe.map(card).join('\n')}
  </div>
  <p class="fonte">${esc(T.ui.nota_player)}</p>
  <div class="card" style="margin-top:18px"><span class="tag">${esc(T.ui.fonte_tag)}</span><h3>📚 ${esc(T.ui.fonte_h)}</h3><p>${esc(T.ui.fonte_p)}</p><p style="margin-top:10px"><a class="btn ghost" href="${REPO}/blob/main/anexo-fonte/${lang === 'pt' ? 'biblioteca-pt.md' : 'biblioteca-original.md'}" target="_blank" rel="noopener">${esc(T.ui.fonte_btn)}</a> <a href="${REPO}/blob/main/anexo-fonte/LEIA.md" target="_blank" rel="noopener">${esc(T.ui.fonte_leia)}</a></p></div>
</div></section>
${FIM}`;
}

const CSS = `  .bib{display:grid;gap:14px;margin-top:12px} .bib169{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))} .bib916{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
  .bib916 .quadro img{aspect-ratio:9/16} .bib .quadro figcaption{padding:10px 12px;font-size:.84rem} .bibl{display:block;margin-top:6px} .bibh{margin-top:26px;font-family:Sora}
  @media(max-width:540px){.bib169{grid-template-columns:1fr} .bib916{grid-template-columns:1fr 1fr}}
`;

for (const [lang, arq, pre] of [['pt', 'guia/index.html', '../'], ['en', 'guia/en/index.html', '../../'], ['es', 'guia/es/index.html', '../../']]) {
  const p = path.join(RAIZ, arq);
  let html = fs.readFileSync(p, 'utf8');
  const nova = secao(lang, pre);
  if (html.includes(INI)) html = html.slice(0, html.indexOf(INI)) + nova + html.slice(html.indexOf(FIM) + FIM.length);
  else html = html.replace('<section id="referencias">', nova + '\n\n<section id="referencias">');
  if (!html.includes('.bib{')) html = html.replace('</style>', CSS + '</style>');
  if (!html.includes(NINI)) html = html.replace(/(<a class="sec" href="#prova">[^<]*<\/a>)/, `$1\n    ${NINI}<a class="sec" href="#biblioteca">${I18N[lang].ui.nav}</a>`);
  fs.writeFileSync(p, html);
  console.log(`${arq}: ${filmes.length} filmes`);
}
