# ronnie-lg

A fast, minimal Apple TV-style home screen for an LG webOS TV (built on an OLED65C1, webOS 6).
Plain HTML/CSS/JS, no framework, so it opens instantly on TV hardware.

- **Dock** of favourite apps on top, **All apps** row underneath.
- The focused tile lifts, gets a white ring and a light sweep; the background glows in the app's colour.
- **Hold OK** on a dock tile to rearrange it (◀ ▶ move, ▼ remove, OK done). Hold OK on an All apps tile to add it to the dock. The order is saved on the TV.
- Works with the D-pad and the Magic Remote pointer.

Edit `app/apps.js` to change the catalogue or the default dock.

## Setup

Needs the TV in Developer Mode with the key server on, and the webOS CLI.

```sh
# Node 22+ on PATH (scripts also pick up an official Node build unpacked in tools/node)
cd tools && npm install && npm install -g @webos-tools/cli && cd ..
ares-setup-device -a tv -i "host=<TV IP>" -i "port=9922" -i "username=prisoner" -i "default=true"
ares-novacom --device tv --getkey            # enter the passphrase shown in the Developer Mode app
ares-setup-device -m tv -i "privatekey=tv_webos" -i "passphrase=<passphrase>"
```

The first `tools/ssap.js` call shows a pairing prompt on the TV; accept it. That pairing is what lets the scripts take screenshots and read the app list.

## Scripts

| Script | What it does |
| --- | --- |
| `./backup.sh` | Saves the installed apps, launcher entries, inputs and a screenshot to `backup/` |
| `./install.sh` | Packages, installs and launches the app, then screenshots it (needs a backup first) |
| `./devmode.sh status` / `extend` | Shows the Developer Mode time left / resets it to 1000h |
| `./restore.sh` | Uninstalls the app, checks the app list matches the backup, screenshots the TV |
| `node tools/ssap.js shot out.jpg` | Screenshot of whatever is on the TV |
| `node tools/press.js RIGHT,OK:hold` | Presses keys inside the running app (via the web inspector) |

The app only adds one developer app (`com.ronald.home`). It changes no settings and doesn't touch LG's launcher, so restoring is just removing it.

## Limits

webOS doesn't let a developer app replace the Home button or start at boot without rooting the TV. Open it from the LG launcher (it's called **Home**), or move it to the front of the LG app bar. Developer Mode sessions expire after 1000h unless extended; when one lapses, developer apps stop opening until it is renewed.

## Keeping Developer Mode alive

`./devmode.sh schedule` installs a launchd job on the Mac that resets the session timer every day at 12:00 (and on wake if the Mac was asleep), so the 1000h never runs out as long as the Mac is used at least once a month. It reads the session token from the TV and calls LG's `ResetDevModeSession` endpoint, which is the same thing the **Extend** button in the Developer Mode app does. The token is cached in `~/.config/ronnie-lg/devmode-token` (never in the repo), so it keeps working when the TV is off. Each run is logged to `~/Library/Logs/ronnie-lg-devmode.log`, and a failed run shows a macOS notification.

To turn it off: `./devmode.sh unschedule` (then delete `~/.config/ronnie-lg/` if you like). If you reinstall the Developer Mode app the token changes; the next run picks up the new one automatically while the TV is on.
