#!/bin/sh
# Snapshot the TV's current state into ./backup before installing anything.
# Captures installed apps, launcher entries, HDMI inputs, developer apps, the
# foreground app, and a screenshot. restore.sh compares against this.
set -e
cd "$(dirname "$0")"
export PATH="$PWD/tools/node/bin:$PATH"
B=backup
# Never overwrite the pre-install snapshot: restore.sh depends on it.
if [ -f $B/apps.json ] && [ "$1" != "--force" ]; then
  echo "backup/ already holds a snapshot. Move it away or pass --force to replace it."; exit 1
fi
mkdir -p $B/screens
node tools/ssap.js ssap://system/getSystemInfo > $B/systeminfo.json
node tools/ssap.js ssap://com.webos.applicationManager/listApps > $B/apps.json
node tools/ssap.js ssap://com.webos.applicationManager/listLaunchPoints > $B/launchpoints.json
node tools/ssap.js ssap://com.webos.applicationManager/getForegroundAppInfo > $B/foreground.json
node tools/ssap.js ssap://tv/getExternalInputList > $B/inputs.json
node tools/ssap.js ssap://tv/getChannelList > $B/channels.json
ares-install -d tv --list > $B/dev-apps.txt
node tools/ssap.js shot $B/screens/00-before.jpg
echo "Backup written to $B/"
