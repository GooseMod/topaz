# topaz
A "next-gen" mod bundling client-side in web, with compat abilities.

> **Warning**
> Topaz is in **early alpha**, you should not rely on it.

<br>

## Usage

- Use GM with development channel
- Run this JS in your console, choose temporary if you just want it until refresh/restart, or persistent for every GM boot (needs refresh)

### Temporary
```js
eval(await (await fetch('https://goosemod.github.io/topaz/out.js')).text())
```

### Persistent
```js
goosemod.storage.set('goosemodTopaz', true)
```

<br>

### Testing

- Go to Topaz setting at bottom of your settings
- Try it out with recommended plugins/themes (or try random ones and have even more bugs)
- Have bugs, have fun :)

<br>

### Local Testing / Development
- Clone repo
- Run `server.py 1337` (opens HTTP server on port 1337)
- Run this JS in your console to use local dev Topaz:
```js
eval(await (await fetch('http://localhost:1337/src/index.js')).text())
```