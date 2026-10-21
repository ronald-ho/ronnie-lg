#!/bin/sh
# Restore the TV to the state captured in ./backup before the Home app was installed.
#
# The Home app only adds one developer app (com.ronald.home). It does not change system
# settings, the LG launcher, or any other app. So restoring means:
#   1. uninstall com.ronald.home            (pass/fail: is it gone?)
#   2. report any other differences from backup/apps.json (LG updates etc., informational)
#   3. always take a screenshot so you can see the TV
#
# Usage: ./restore.sh
cd "$(dirname "$0")"
export PATH="$PWD/tools/node/bin:$PATH"
APP_ID=com.ronald.home
STATUS=0

echo "== Removing $APP_ID"
# Can't trust "not in the list" unless listing itself worked (TV off, Dev Mode expired...)
if ! LIST=$(ares-install -d tv --list 2>&1); then
  echo "   FAILED: can't reach the TV's developer mode:"; echo "$LIST" | sed 's/^/   /'; exit 1
fi
if echo "$LIST" | grep -qx "$APP_ID"; then
  ares-install -d tv --remove "$APP_ID"
fi
if ! LIST=$(ares-install -d tv --list 2>&1); then
  echo "   FAILED: couldn't re-check the app list:"; echo "$LIST" | sed 's/^/   /'; STATUS=1
elif echo "$LIST" | grep -qx "$APP_ID"; then
  echo "   FAILED: $APP_ID is still installed"; STATUS=1
else
  echo "   OK: $APP_ID is not installed"
fi

if [ -f backup/apps.json ]; then
  echo "== Other differences from the backup (informational)"
  node tools/ssap.js ssap://com.webos.applicationManager/listApps > tools/apps-now.json && /usr/bin/python3 - <<'PY'
import json
ids = lambda f: {a['id'] for a in json.load(open(f))['apps']}
before, now = ids('backup/apps.json'), ids('tools/apps-now.json')
print('   added since backup:  ', sorted(now - before) or 'none')
print('   removed since backup:', sorted(before - now) or 'none')
PY
fi

echo "== Screenshot"
mkdir -p backup/screens
node tools/ssap.js shot backup/screens/after-restore.jpg && echo "   backup/screens/after-restore.jpg"
exit $STATUS
