#!/bin/sh
# Run a browser job in one of two shared slots: the container has 4 cores and SwiftShader renders on the CPU, so when
# several agents work at once at most two browsers run together (the others wait here). Local use needs none of this.
#   tools/browser-slot.sh xvfb-run -a node tests/e2e/v2-loop.mjs low 3
L=/tmp/emperors-browser
while :; do
  for s in 1 2; do
    exec 9>"$L.$s.lock"
    if flock -n 9; then "$@"; rc=$?; flock -u 9; exec 9>&-; exit $rc; fi
    exec 9>&-
  done
  sleep 5
done
