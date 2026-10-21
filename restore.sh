#!/bin/sh
# Restore the TV to the state captured in ./backup before the Home app was installed.
#
# The Home app only adds one developer app (com.ronald.home). It does not change system
# settings, the LG launcher, or any other app. So restoring means:
#   1. uninstall com.ronald.home
#   2. check the installed app list matches backup/apps.json again
#   3. take a screenshot so you can see the TV is back to normal
#
# Usage: ./restore.sh
set -e
cd "$(dirname "$0")"
export PATH="$PWD/tools/node/bin:$PATH"
APP_ID=com.ronald.home

echo "== Removing $APP_ID"
if ares-install -d tv --list | grep -qx "$APP_ID"; then
  ares-install -d tv --remove "$APP_ID"
else
  echo "   not installed, nothing to remove"
fi

echo "== Comparing installed apps with backup"
node tools/ssap.js ssap://com.webos.applicationManager/listApps > tools/apps-now.json
/usr/bin/python3 - <<'EOF'
import json
ids = lambda f: {a['id'] for a in json.load(open(f))['apps']}
before, now = ids('backup/apps.json'), ids('tools/apps-now.json')
extra, missing = sorted(now - before), sorted(before - now)
print('   extra apps:  ', extra or 'none')
print('   missing apps:', missing or 'none')
if extra or missing:
    raise SystemExit('   app list differs from backup (see above)')
print('   matches backup')
EOF

echo "== Screenshot"
mkdir -p backup/screens
node tools/ssap.js shot backup/screens/after-restore.jpg
echo "Done. Screenshot: backup/screens/after-restore.jpg"
