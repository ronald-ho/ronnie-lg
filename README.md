# ronnie-lg

A fast, minimal Apple TV-style home screen for an LG webOS TV (built on an OLED65C1, webOS 6).
Plain HTML/CSS/JS, no framework, so it opens instantly on TV hardware.

- **Dock** of favourite apps on top, **Live TV** antenna channels underneath (OK tunes straight to the channel).
- The focused tile lifts and gets a white ring; the background glows in the app's colour.
- **Hold OK** on a dock tile to rearrange it (◀ ▶ move, ▼ remove, OK done). The **+** tile at the end of the dock adds any other app. The order is saved on the TV.
- Only `transform` and `opacity` animate: webOS 6 rasterises web apps at 4K, so anything that repaints is expensive.
- Works with the D-pad and the Magic Remote pointer.

Edit `app/apps.js` to change the catalogue, the default dock or the channel list.

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

Pairing: `tools/ssap-key.json` (and `app/ssap-key.js`, which `install.sh` builds from it so the app can tune channels) holds a key with broad remote-control permissions on the TV. Both are gitignored. `restore.sh` doesn't remove the pairing; to revoke it, reset the TV's connected devices in Settings › General › External Devices (menu names vary by firmware).

The app only adds one developer app (`com.ronald.home`). It changes no settings and doesn't touch LG's launcher, so restoring is just removing it.

## Limits

webOS doesn't let a developer app replace the Home button or start at boot without rooting the TV. Open it from the LG launcher (it's called **Home**), or move it to the front of the LG app bar. Developer Mode sessions expire after 1000h unless extended; when one lapses, developer apps stop opening until it is renewed.

## Keeping Developer Mode alive

The **Extend Developer Mode** GitHub Actions workflow (`.github/workflows/devmode.yml`) resets the session timer to 1000h every day from GitHub's servers, so it works with the Mac and TV off. It calls LG's `ResetDevModeSession` endpoint, the same thing the **Extend** button in the Developer Mode app does, using the TV's session token stored as the repository secret `DEVMODE_TOKEN` (never in the repo). A failed run shows up red in the Actions tab and GitHub emails you.

One-time setup, from this folder with the TV on:

```sh
./devmode.sh status                       # reads the token from the TV and caches it in ~/.config/ronnie-lg/
gh secret set DEVMODE_TOKEN -R ronald-ho/ronnie-lg < ~/.config/ronnie-lg/devmode-token
gh workflow run devmode.yml -R ronald-ho/ronnie-lg   # optional: run it now
```

If you reinstall the Developer Mode app the token changes: run the two commands above again.

To turn it off: disable the workflow in the repo's Actions tab (or delete the file), and delete the `DEVMODE_TOKEN` secret if you like.

`./devmode.sh extend` resets the timer by hand. If you'd rather run it from the Mac instead of GitHub, `./devmode.sh schedule` installs a daily launchd job (log in `~/Library/Logs/ronnie-lg-devmode.log`, notification on failure) and `./devmode.sh unschedule` removes it.
