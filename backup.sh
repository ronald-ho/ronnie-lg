#!/bin/sh
# Snapshot the TV's current state into ./backup before installing anything.
# Captures installed apps, launcher entries, HDMI inputs, developer apps, the
# foreground app, and a screenshot. restore.sh compares against this.
set -e
cd "$(dirname "$0")"
export PATH="$PWD/tools/node/bin:$PATH"
B=backup
mkdir -p $B/screens
node tools/ssap.js ssap://system/getSystemInfo > $B/systeminfo.json
node tools/ssap.js ssap://com.webos.applicationManager/listApps > $B/apps.json
node tools/ssap.js ssap://com.webos.applicationManager/listLaunchPoints > $B/launchpoints.json
node tools/ssap.js ssap://com.webos.applicationManager/getForegroundAppInfo > $B/foreground.json
node tools/ssap.js ssap://tv/getExternalInputList > $B/inputs.json
ares-install -d tv --list > $B/dev-apps.txt
node tools/ssap.js shot $B/screens/00-before.jpg
echo "Backup written to $B/"
