#!/usr/bin/env bash
# Passada baixa: cada história de cada motor de exemplos/biblioteca, filme inteiro em tamanho pequeno,
# com 1 e com 3 navegadores; compara quadros.sha256 e monta uma folha de contato (12 quadros).
# Uso: bash conferir-tudo.sh <pasta-de-saida>
set -u
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:?pasta de saida}"; mkdir -p "$OUT/folhas"
REL="$OUT/relatorio.tsv"; echo -e "motor\thistoria\tquadros\tigual_1x3\tsegundos" > "$REL"
cd "$RAIZ"
for d in exemplos/biblioteca/*/; do
  m=$(basename "$d")
  res=$(node -e "console.log(require('./$d/medida.json').resolucao)")
  W=${res%x*}; H=${res#*x}
  if [ "$W" -ge "$H" ]; then L=640; A=360; else L=360; A=640; fi
  for h in "$d"historia*.json; do
    hn=$(basename "$h" .json); t0=$(date +%s)
    for w in 1 3; do
      node ferramentas/render.mjs "$d" --historia "$hn.json" --largura $L --altura $A --trabalhadores $w \
        --sem-som --saida "$OUT/r/$m-$hn-$w" > "$OUT/r-$m-$hn-$w.log" 2>&1
    done
    a="$OUT/r/$m-$hn-1/quadros.sha256"; b="$OUT/r/$m-$hn-3/quadros.sha256"
    n=$( [ -f "$a" ] && wc -l < "$a" || echo 0 )
    if [ -f "$a" ] && [ -f "$b" ] && cmp -s "$a" "$b"; then ig=sim; else ig=NAO; fi
    q="$OUT/r/$m-$hn-1/quadros"
    if [ -d "$q" ]; then
      ls "$q"/*.png | awk -v n="$n" 'BEGIN{srand(1)} {f[NR]=$0} END{for(i=0;i<12;i++){k=int(1+i*(NR-1)/11); print f[k]}}' > "$OUT/lista.txt"
      ffmpeg -v error -y $(sed 's/^/-i /' "$OUT/lista.txt" | tr '\n' ' ') \
        -filter_complex "$(seq 0 11 | sed 's/.*/[&:v]scale=-2:240[v&];/' | tr -d '\n')$(seq 0 11 | sed 's/.*/[v&]/' | tr -d '\n')xstack=inputs=12:layout=$(python3 -c "
import sys
w='w0';h='h0';L=[]
for i in range(12):
  r,c=divmod(i,6)
  x='+'.join(['w0']*c) or '0'; y='+'.join(['h0']*r) or '0'
  L.append(f'{x}_{y}')
print('|'.join(L))")" -q:v 4 "$OUT/folhas/$m-$hn.jpg" 2>>"$OUT/ffmpeg.log"
    fi
    rm -rf "$OUT/r/$m-$hn-1/quadros" "$OUT/r/$m-$hn-3/quadros" "$OUT/r/$m-$hn-1/"*.mp4 "$OUT/r/$m-$hn-3/"*.mp4
    echo -e "$m\t$hn\t$n\t$ig\t$(( $(date +%s) - t0 ))" >> "$REL"
  done
done
echo FIM >> "$REL"
