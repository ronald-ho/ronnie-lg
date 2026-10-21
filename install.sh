#!/bin/sh
# Package the app, install it on the TV, launch it, and screenshot the result.
# Refuses to run until backup.sh has captured the TV's state.
set -e
cd "$(dirname "$0")"
export PATH="$PWD/tools/node/bin:$PATH"
[ -f backup/apps.json ] || { echo "Run ./backup.sh first"; exit 1; }
rm -rf dist && mkdir dist
ares-package app -o dist
ares-install -d tv dist/*.ipk
ares-launch -d tv --close com.ronald.home >/dev/null 2>&1 || true
ares-launch -d tv com.ronald.home
sleep 3
mkdir -p backup/screens
node tools/ssap.js shot backup/screens/installed.jpg
echo "Installed. Screenshot: backup/screens/installed.jpg"
