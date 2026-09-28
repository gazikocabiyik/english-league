#!/usr/bin/env bash
# Phosphor (MIT) bold ikonlarını app/assets/icons/ içine indirir ve icons.css üretir.
set -euo pipefail
cd "$(dirname "$0")/.."
ICONS="users-three trophy timer play pause arrow-counter-clockwise arrows-out speaker-high gear caret-left caret-right x download-simple upload-simple person-simple-run chat-circle-text ticket plus trash pencil-simple check microphone-stage music-notes cloud-check cloud-arrow-up cloud-slash pause"
mkdir -p app/assets/icons app/styles
: > app/styles/icons.css
for n in $ICONS; do
  curl -fsSL "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets/bold/${n}-bold.svg" -o "app/assets/icons/${n}.svg"
  echo ".icon-${n}{--i:url(../assets/icons/${n}.svg)}" >> app/styles/icons.css
done
# Anahtar dolu (fill) çizimle: kontur hâli ampule benziyor
curl -fsSL "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets/fill/key-fill.svg" -o app/assets/icons/key.svg
echo ".icon-key{--i:url(../assets/icons/key.svg)}" >> app/styles/icons.css
echo "$(( $(echo $ICONS | wc -w) + 1 )) ikon indirildi"
