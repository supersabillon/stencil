#!/bin/bash
set -e

if ! [ -x "$(command -v gnuplot)" ]; then
  echo 'Error: gnuplot is not installed.' >&2
  exit 1
fi

RELEASES="$(git tag --sort=creatordate)
main"
RELEASE_COUNT=8

rm -f plotting_data1.dat

COUNTER=0
LAST_RELEASES=$(echo "$RELEASES" | tail -n "$RELEASE_COUNT");
while IFS=$'\n' read -r release; do
  COUNTER=$((COUNTER+1))
  git checkout "$release" --quiet;
  read -r errors <<< \
    "$(npx tsc --noEmit --strictNullChecks --pretty \
      | tail -n 2 \
      | xargs \
      | awk -F" " '{print $2}' \
    )"
  echo "$release $errors $COUNTER">>plotting_data1.dat;
done <<< "$LAST_RELEASES"


gnuplot -persist <<-EOFMARKER
  set style line 1 \
    linecolor rgb '#0060ad' \
    linetype 1 linewidth 2 \
    pointtype 7 pointsize 1.5
  plot "plotting_data1.dat" using 3:2:xticlabel(1) with linespoints linestyle 1
EOFMARKER
