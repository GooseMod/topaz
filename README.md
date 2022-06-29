# topaz
A "next-gen" mod bundling client-side in web, designed for wide compat and with no limits.

> **Warning** |
> Topaz is in **alpha**, you should not rely on it.

<br>

## Features
Core "new" (never really done in a public mod fully before) features:
- Permissions / sandboxing system
- Compat with most plugins/themes from various mods (PC/BD/GM)
- Install plugins/themes just via GitHub repo / URL
- Editing plugin/theme source in client
- Fully functional in web and desktop
- Hardened injection / anti-crash

<br>

## Usage
- Enable Topaz in Goosemod's Experimental settings (in Discord, open Settings > GooseMod > Experimental (scroll down and expand category)

<br>

### Testing

- Go to Topaz setting at top of your settings
- Try it out with recommended plugins/themes (or try random ones)
- Report bugs, have fun :)

<br>

### Local Testing / Development
- Clone repo
- Run `server.py 1337` (opens HTTP server on port 1337)
- Run this JS in your console to use local dev Topaz:
```js
eval(await (await fetch('http://localhost:1337/src/index.js')).text())
```