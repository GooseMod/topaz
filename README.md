# topaz
A "next-gen" mod bundling client-side in web, with compat abilities.

> **Warning** |
> Topaz is in **alpha**, you should not rely on it.

<br>

## Usage

- Have GooseMod installed, with experimental branch enabled (GooseMod Settings > Experimental (expand at bottom))
- Run the following JS in your console:
- Temporary: Only for current Discord session (until next refresh/reload)
```js
eval(await (await fetch('https://goosemod.github.io/topaz/out.js')).text()) // Just run now
```
  - Persistent: Every Discord load until you uninstall Topaz
```js
goosemod.storage.set('goosemodTopaz', true); // Persist every boot
eval(await (await fetch('https://goosemod.github.io/topaz/out.js')).text()) // Run now
```


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