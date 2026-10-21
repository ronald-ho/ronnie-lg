#!/bin/sh
# Keeps the TV's Developer Mode session from expiring by resetting LG's session timer.
#
#   ./devmode.sh status       show the time left
#   ./devmode.sh extend       reset the timer to 1000h now
#   ./devmode.sh schedule     run `extend` daily on this Mac (launchd), and once right away
#   ./devmode.sh unschedule   stop the daily run
#
# The session token is read from the TV (/var/luna/preferences/devmode_enabled) and cached
# outside the repo, so the job still works while the TV is off or the Mac is away from home.
set -u
DIR=$(cd "$(dirname "$0")" && pwd)
LABEL=com.ronald.devmode-extend
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
CACHE="$HOME/.config/ronnie-lg/devmode-token"
LOG="$HOME/Library/Logs/ronnie-lg-devmode.log"
API=https://developer.lge.com/secure
TV_IP=${TV_IP:-192.168.4.103}

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

notify() {
  osascript -e "display notification \"$1\" with title \"LG Developer Mode\"" >/dev/null 2>&1 || true
}

token() {
  # Developer-mode SSH as set up with ares-setup-device; the key passphrase comes from tools/askpass.sh
  t=$(SSH_ASKPASS="$DIR/tools/askpass.sh" SSH_ASKPASS_REQUIRE=force ssh -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=accept-new -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    -i "$HOME/.ssh/tv_webos" -p 9922 "prisoner@$TV_IP" 'cat /var/luna/preferences/devmode_enabled' \
    </dev/null 2>/dev/null | tr -dc 'A-Za-z0-9')
  if [ ${#t} -ge 32 ]; then
    mkdir -p "$(dirname "$CACHE")"
    (umask 077; printf '%s' "$t" > "$CACHE")
  elif [ -s "$CACHE" ]; then
    t=$(cat "$CACHE")
  else
    return 1
  fi
  printf '%s' "$t"
}

call() {  # call <Reset|Check>; prints LG's errorMsg (time left for Check), fails unless result=success
  r=$(curl -sS --max-time 30 --retry 3 "$API/$1DevModeSession.dev?sessionToken=$TOKEN") || return 1
  echo "$r" | grep -q '"result":"success"' || { echo "$r"; return 1; }
  echo "$r" | sed -n 's/.*"errorMsg":"\([^"]*\)".*/\1/p'
}

need_token() {
  TOKEN=$(token) || { log "FAIL no session token (TV unreachable and nothing cached)"; notify "Couldn't read the session token from the TV."; exit 1; }
}

case "${1:-}" in
  status)
    need_token
    left=$(call Check) || { log "FAIL check: $left"; exit 1; }
    echo "Developer Mode time left: $left"
    ;;
  extend)
    need_token
    before=$(call Check) || before="?"
    if out=$(call Reset) && after=$(call Check); then
      log "OK reset ($before -> $after)"
    else
      log "FAIL reset: $out"
      notify "Couldn't extend the session. Run ./devmode.sh extend to see why."
      exit 1
    fi
    ;;
  schedule)
    mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$DIR/devmode.sh</string><string>extend</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>12</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
    launchctl bootstrap "gui/$(id -u)" "$PLIST" && echo "Scheduled daily at 12:00 (missed runs happen on wake). Log: $LOG"
    ;;
  unschedule)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
    rm -f "$PLIST"
    echo "Unscheduled. The cached token is at $CACHE (delete it if you like)."
    ;;
  *)
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
