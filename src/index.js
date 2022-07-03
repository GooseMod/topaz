(async () => {
let pluginsToInstall = JSON.parse(localStorage.getItem('topaz_plugins') ?? '{}');
if (window.topaz) { // live reload handling
  topaz.__reloading = true;
  topaz.purge(); // fully remove topaz (plugins, css, etc)

  // setTimeout(() => updateOpenSettings(), 1000);
}

const initStartTime = performance.now();

const sucrase = eval(await (await fetch('http://localhost:1337/src/sucrase.js')).text());
const grass = await eval(await (await fetch('http://localhost:1337/src/grass.js')).text());
const Onyx = eval(await (await fetch('http://localhost:1337/src/onyx.js')).text());
const attrs = eval(await (await fetch('http://localhost:1337/src/attrs.js')).text());
const MapGen = eval(await (await fetch('http://localhost:1337/src/mapgen.js')).text());
Onyx.prototype.MapGen = MapGen; // import mapgen into onyx

const Editor = { // defer loading until editor is wanted
  get Component() {
    return (async () => { // async getter
      delete this.Component;
      return this.Component = await eval(await (await fetch('http://localhost:1337/src/editor.js')).text());
    })();
  }
};

let fetchProgressCurrent = 0, fetchProgressTotal = 0;
const includeImports = async (root, code, updateProgress) => {
  if (updateProgress) {
    fetchProgressTotal++;
    updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);
  }

  // remove comments
  code = code.replaceAll(/\/\*[\s\S]*?\*\//gm, '').replaceAll('/*', '').replaceAll('*/', '');
  code = code.replaceAll(/[^:]\/\/.*$/gm, '');


  const res = await replaceAsync(code, /@(import|use|forward) (url\()?['"](.*?)['"]\)?;?/g, async (_, _1, _2, path) => {
    if (path.startsWith('sass:')) return '';

    const isExternal = path.startsWith('http');
    const basePath = (path.startsWith('./') ? '' : './') + path;
    // console.log(isExternal, isExternal ? path : join(root, basePath));

    let code;
    let resolved;
    if (isExternal) {
      if (_.includes('@import') && !_.includes('scss')) return _;

      const req = await fetch(path);
      if (req.status !== 200) {
        code = '';
      } else {
        code = await req.text();
      }
    } else {
      const relativePath =  resolvePath('.' + root.replace(transformRoot, '') + '/' + basePath.replace('./', ''));
      console.log(root, '|', basePath, relativePath, '|', '.' + root.replace(transformRoot, '') + '/' + basePath.replace('./', ''));

      resolved = await resolveFileFromTree(relativePath) ?? await resolveFileFromTree([ ...relativePath.split('/').slice(0, -1), '_' + relativePath.split('/').pop() ].join('/'));
      code = await getCode(transformRoot, resolved);
    }

    const importRoot = isExternal ? getDir(path) : join(transformRoot, getDir(resolved));
    return await includeImports(importRoot, code, updatePending);
  });

  if (updateProgress) fetchProgressCurrent++;

  return res;
};

const transformCSS = async (root, code, skipTransform = false, updateProgress = false) => {
  transformRoot = root;

  if (updateProgress) {
    fetchProgressCurrent = 0;
    fetchProgressTotal = 0;
  }

  let newCode = await includeImports(root, code, updateProgress);
  newCode = newCode.replaceAll(/\[.*?\]/g, (_) => _.replaceAll('/', '\\/')); // grass bad, it errors when \'s are in attr selectors

  if (updateProgress) updatePending(null, 'Transforming...');

  if (!skipTransform) newCode = grass(newCode, { style: '', quiet: true, load_paths: [''] });

  return newCode;
};


const getBuiltin = async (name) => await (await fetch('http://localhost:1337/src/builtins/' + name + '.js')).text();

const builtins = {
  'powercord/entities': await getBuiltin('powercord/entities'),
  'powercord/webpack': await getBuiltin('powercord/webpack'),
  'powercord/injector': await getBuiltin('powercord/injector'),
  'powercord/util': await getBuiltin('powercord/util'),
  'powercord/components': await getBuiltin('powercord/components/index'),
  'powercord/components/settings': await getBuiltin('powercord/components/settings'),
  'powercord/components/modal': await getBuiltin('powercord/components/modal'),
  'powercord/modal': await getBuiltin('powercord/modal'),
  'powercord/http': await getBuiltin('powercord/http'),
  'powercord/constants': await getBuiltin('powercord/constants'),

  '@goosemod/patcher': await getBuiltin('goosemod/patcher'),
  '@goosemod/webpack': await getBuiltin('goosemod/webpack'),
  '@goosemod/webpack/common': await getBuiltin('goosemod/webpackCommon'),
  '@goosemod/logger': await getBuiltin('goosemod/logger'),
  '@goosemod/reactUtils': await getBuiltin('goosemod/reactUtils'),
  '@goosemod/toast': await getBuiltin('goosemod/toast'),
  '@goosemod/settings': await getBuiltin('goosemod/settings'),
  '@goosemod/plugin': await getBuiltin('goosemod/plugin'),

  'electron': await getBuiltin('node/electron'),
  'path': await getBuiltin('node/path'),
  'fs': await getBuiltin('node/fs'),
  'process': await getBuiltin('node/process'),
  'request': await getBuiltin('node/request'),
  'querystring': await getBuiltin('node/querystring'),

  'goosemod/global': '',
  'powercord/global': await getBuiltin('powercord/global'),
  'betterdiscord/global': await getBuiltin('betterdiscord/global'),
  'betterdiscord/libs/zeres': await getBuiltin('betterdiscord/libs/zeres')
};

const join = (root, p) => root + p.replace('./', '/'); // Add .jsx to empty require paths with no file extension

class Cache {
  constructor(id) {
    this.id = id;
    this.store = {};

    this.load();
  }

  get(key, def) {
    return this.store[key] ?? def;
  }

  set(key, val) {
    this.store[key] = val;

    this.save();

    return this.store[key];
  }

  remove(key) {
    this.store[key] = undefined;
    delete this.store[key];

    this.save();
  }

  keys() {
    return Object.keys(this.store);
  }

  purge() {
    this.store = {};

    this.save();
  }

  load() {
    const saved = localStorage.getItem(`topaz_cache_${this.id}`);
    if (!saved) return;

    this.store = JSON.parse(saved);
  }

  save() {
    localStorage.setItem(`topaz_cache_${this.id}`, JSON.stringify(this.store));
  }
}

let fetchCache = new Cache('fetch'), finalCache = new Cache('final');

const getCode = async (root, p, ...backups) => {
  if (builtins[p]) return builtins[p];

  const origPath = join(root, p);
  if (fetchCache.get(origPath)) return fetchCache.get(origPath);

  let code = `'failed to fetch: ${p}'`;
  let path;
  for (path of [ p, ...backups ]) {
    if (!path) continue;

    const req = await fetch(join(root, path));
    // console.log('REQ', join(root, path), req.status);
    if (req.status !== 200) continue;
    console.log(p, req.status);

    code = await req.text();
    break;
    // console.log(join(root, path), req.status, code);
  }

  return fetchCache.set(origPath, code);
};

const genId = (p) => `__topaz_${p.replace(transformRoot, '').replaceAll('./', '/').replace(/[^A-Za-z0-9]/g, '_').split('.')[0]}`;

const makeChunk = async (root, p) => {
  // console.log('makeChunk', p);

  const joined = (root + '/' + p).replace(transformRoot, '');
  const resPath = builtins[p] ? p : resolvePath(joined).slice(1);
  const resolved = await resolveFileFromTree(resPath);
  console.log('CHUNK', genId(resPath), '|', root.replace(transformRoot, ''), p, '|', joined, resPath, resolved);

  const finalPath = resolved ?? p;

  let code = await getCode(transformRoot, finalPath, p.match(/.*\.[a-z]+/) ? null : p + '.jsx', p.includes('.jsx') ? p.replace('.jsx', '.js') : p.replace('.js', '.jsx'));
  // if (!builtins[p]) code = await includeRequires(join(transformRoot, finalPath), code);
  code = await includeRequires(join(transformRoot, finalPath), code);
  const id = genId(resPath);

  if (p.endsWith('.json') || code.startsWith('{')) code = 'module.exports = ' + code;

  const chunk = `// ${finalPath}
let ${id} = {};
(() => { // MAP_START|${finalPath}
` + code.replace('module.exports =', `${id} =`).replace('export default', `${id} =`).replaceAll(/(module\.)?exports\.(.*?)=/g, (_, _mod, key) => `${id}.${key}=`) + `
})(); // MAP_END`;

  return [ id, chunk ];
};

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

let chunks = {}, tree = [];
const includeRequires = async (path, code) => {
  fetchProgressTotal++;
  updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);

  const root = getDir(path);

  // console.log({ path, root });

  // log('bundling', 'file', path.replace(indexRoot, ''));

  code = await replaceAsync(code, /require\(["'`](.*?)["'`]\)/g, async (_, p) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, p);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return chunkId;
  });

  code = await replaceAsync(code, /import (.*) from ['"`](.*)['"`]/g, async (_, what, where) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, where);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return `const ${what.replace('* as ', '')} = ${chunkId}`;
  });

  code = await replaceAsync(code, /this\.loadStylesheet\(['"`](.*?)['"`]\)/g, async (_, p) => {
    const css = (await transformCSS(root, await getCode(root, './' + p.replace(/^.\//, '')))).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `this.loadStylesheet(\`${css}\`)`;
  });

  code = await replaceAsync(code, /powercord\.api\.i18n\.loadAllStrings\(.*?\)/g, async (_, p) => { // todo: actual pc i18n
    const english = (await getCode(transformRoot, './i18n/en-US.json')).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `powercord.api.i18n.loadAllStrings({ 'en-US': JSON.parse(\`${english}\`) })`;
  });

  fetchProgressCurrent++;
  updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);

  return code;
};

const getDir = (url) => url.split('/').slice(0, -1).join('/');

// let root;

const log = (_region, ...args) => {
  const modColor = '253, 218, 13'; // New blurple
  const regionColor = '114, 137, 218'; // Old blurple

  const fromStr = (str) => str.replace('rgb(', '').replace(')', '').split(', ');
  const toStr = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

  const light = (str, val) => toStr(fromStr(str).map((x) => x * val));

  const makeRegionStyle = (color) => `background-color: rgb(${color}); color: white; border-radius: 4px; border: 2px solid ${light(color, 0.5)}; padding: 3px 6px 3px 6px; font-weight: bold;`;

  const regions = _region.split('.');

  const regionStrings = regions.map(x => `%c${x}%c`);
  const regionStyling = regions.reduce((res) => res.concat(makeRegionStyle(regionColor), ''), []);

  console.log(`%ctopaz%c ${regionStrings.join(' ')}`,
    makeRegionStyle(modColor).replace('white', 'black'),
    '',

    ...regionStyling,

    ...args
  );
};

let plugins = {};
let pending = [];

const addPending = (obj) => {
  pending.push(obj);

  return () => pending.splice(pending.indexOf(obj), 1);
};

const updatePending = (repo, substate) => {
  /* if (repo) {
    const obj = pending.find((x) => x.repo === repo);
    if (!obj) return;

    obj.substate = substate;

    const repoEl = [...document.querySelectorAll('.labelRow-2jl9gK > .title-2dsDLn')].find((x) => x.textContent === repo);
    repoEl.parentElement.parentElement.parentElement.children[1].querySelector('.description-30xx7u').textContent = substate;
  } else { */
    const el = document.querySelector('.topaz-loading-text .description-30xx7u');
    if (!el) return;

    el.textContent = substate;
  // }
};

const resolvePath = (x) => {
  let ind;
  if (x.startsWith('./')) x = x.substring(2);
  x = x.replaceAll('/./', '/').replaceAll('//', '/'); // example/./test -> example/test

  while ((ind = x.indexOf('../')) !== -1) {
      const priorSlash = x.lastIndexOf('/', ind - 4);
      x = x.slice(0, priorSlash === -1 ? 0 : (priorSlash + 1)) + x.slice(ind + 3); // example/test/../sub -> example/sub
  }

  return x;
};

let lastError;
const resolveFileFromTree = async (path) => {
  const dirRes = tree.find((x) => x.type === 'tree' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '')))?.path;
  let res;

  if (path === dirRes) { // just require(dir)
    res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/index'))?.path;
    if (!res) {
      res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/package.json'))?.path;
      if (res) {
        const package = JSON.parse(await getCode(transformRoot, './' + res));
        if (package.main.startsWith('/')) package.main = package.main.slice(1);
        if (package.main.startsWith('./')) package.main = package.main.slice(2);

        console.log('PACKAGE', package.main);

        res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/' + package.main))?.path;
      }
    }
  } else res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '')))?.path;

  if (path.startsWith('powercord/') && !builtins[path]) {
    console.warn('Missing builtin', path);
    lastError = `Missing builtin: ${path}`;
  } else if (!res && !builtins[path]) {
    console.warn('Failed to resolve', path);
    lastError = `Failed to resolve: ${path}`;
  }

  return res ? ('./' + res) : undefined;
};

const install = async (info, settings = undefined, disabled = false) => {
  lastError = '';

  let mod;
  if (info.endsWith('.plugin.js') || info.endsWith('.theme.css')) {
    mod = 'bd';
    if (info.includes('github.com/')) info = info.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '');
  }

  info = info.replace('https://github.com/', '');

  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let subdir;
  if (!mod !== 'bd') {
    const spl = info.split('/');
    if (spl.length > 2) { // Not just repo
      repo = spl.slice(0, 2).join('/');
      subdir = spl.slice(4).join('/');
      branch = spl[3] ?? 'HEAD';

      console.log('SUBDIR', repo, subdir);
    }
  }

  let isGitHub = !info.startsWith('http');

  // disable final cache for now as currently no way to make it update after changes
  // let [ newCode, manifest, isTheme ] = finalCache.get(info) ?? [];
  let [ newCode, manifest, isTheme ] = [];

  if (!newCode) {
    updatePending(info, 'Treeing...');

    tree = [];
    if (isGitHub) {
      tree = (await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=true`)).json()).tree;

      if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });
    }

    updatePending(info, 'Fetching index...');

    const indexFile = await resolveFileFromTree('index');

    const indexUrl = !isGitHub ? info : `https://raw.githubusercontent.com/${repo}/${branch}/${subdir ? (subdir + '/') : ''}index.js`;
    let root = getDir(indexUrl);

    chunks = {}; // reset chunks

    if (!mod) {
      if (await resolveFileFromTree('manifest.json')) mod = 'pc';
      if (await resolveFileFromTree('goosemodModule.json')) mod = 'gm';
    }

    let indexCode;
    if (isGitHub && !indexFile) {
      isTheme = true;
      let skipTransform = false;

      switch (mod) {
        case 'bd':
          indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));
          manifest = [...indexCode.matchAll(/^ \* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
          skipTransform = true;

          break;

        default: // default to pc
          mod = 'pc';

          manifest = await (await fetch(join(root, './powercord_manifest.json'))).json();

          indexCode = await getCode(root, './' + manifest.theme);
          root = getDir(join(root, './' + manifest.theme));
          skipTransform = manifest.theme.endsWith('.css');

          const subdir = getDir(manifest.theme);
          if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

          break;
      }

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transformCSS(root, indexCode, skipTransform, true);
    } else {
      indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

      switch (mod) {
        case 'pc':
          manifest = await (await fetch(join(root, './manifest.json'))).json();
          break;

        case 'gm':
          manifest = await (await fetch(join(root, './goosemodModule.json'))).json();

          manifest.author = (await Promise.all(manifest.authors.map(x => x.length === 18 ? goosemod.webpackModules.findByProps('getUser', 'fetchCurrentUser').getUser(x) : x))).join(', ');
          break;

        case 'bd': // read from comment in code
          manifest = [...indexCode.matchAll(/^ \* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
          break;
      }

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transform(indexUrl, indexCode, mod);

      isTheme = false;
    }

    finalCache.set(info, [ newCode, manifest, isTheme ]);
  }

  updatePending(info, 'Executing...');
  // await new Promise((res) => setTimeout(res, 900000));

  let plugin;
  if (isTheme) {
    let el;
    plugin = {
      _topaz_start: () => {
        if (el) el.remove();
        el = document.createElement('style');
        el.appendChild(document.createTextNode(newCode)); // Load the stylesheet via style element w/ CSS text

        document.body.appendChild(el);
      },

      _topaz_stop: () => {
        el.remove();
      },

      __theme: true
    };
  } else {
    const execContainer = new Onyx(info, manifest, transformRoot);
    const PluginClass = execContainer.eval(newCode);

    if (mod !== 'gm') {
      PluginClass.prototype.entityID = info; // Setup internal metadata
      PluginClass.prototype.manifest = manifest;

      plugin = new PluginClass();
    } else {
      plugin = PluginClass;
    }

    switch (mod) {
      case 'bd':
        plugin._topaz_start = plugin.start;
        plugin._topaz_stop = plugin.stop;

        for (const x of [ 'name', 'description', 'version', 'author' ]) manifest[x] = plugin['get' + x.toUpperCase()[0] + x.slice(1)]?.() ?? manifest[x] ?? '';

        if (plugin.getSettingsPanel) plugin.__settings = {
          render: class BDSettingsWrapper extends React.PureComponent {
            constructor(props) {
              super(props);

              this.ref = React.createRef();
              this.ret = plugin.getSettingsPanel();
            }

            componentDidMount() {
              if (this.ret instanceof Node) this.ref.current.appendChild(ret);
            }

            render() {
              if (typeof this.ret === 'string') return React.createElement('div', {
                dangerouslySetInnerHTML: {
                  __html: this.ret
                }
              });

              if (this.ret instanceof Node) return React.createElement('div', {
                ref: this.ref
              });

              if (typeof this.ret === 'function') return React.createElement(this.ret);

              return this.ret;
            }
          }
        };

        break;

      case 'gm':
        plugin._topaz_start = () => {
          plugin.goosemodHandlers.onImport();
          plugin.goosemodHandlers.onLoadingFinished?.();
        };

        plugin._topaz_stop = () => plugin.goosemodHandlers.onRemove?.();
        break;
    }
  }

  plugins[info] = plugin;

  plugin.entityID = info; // Re-set metadata for themes and assurance
  plugin.manifest = manifest;

  plugin.__enabled = !disabled;
  plugin.__mod = mod;
  plugin.__root = transformRoot;

  if (!isTheme) switch (mod) {
    case 'pc':
      if (settings) plugin.settings.store = settings;

      plugin.settings.onChange = () => savePlugins(); // Re-save plugin settings on change
      break;

    case 'gm':
      if (settings) plugin.goosemodHandlers.loadSettings?.(settings);

      if (plugin.goosemodHandlers.getSettings) {
        plugin.settings = {
          get store() {
            return plugin.goosemodHandlers.getSettings() ?? {};
          }
        };

        let lastSettings = plugin.settings.store;
        setTimeout(() => {
          const newSettings = plugin.settings.store;
          if (newSettings !== lastSettings) {
            lastSettings = newSettings;
            savePlugins();
          }
        }, 5000);
      }

      break;
  }

  if (!disabled) plugin._topaz_start();

  return [ manifest ];
};

const replaceLast = (str, from, to) => { // replace only last instance of string in string
  const ind = str.lastIndexOf(from);
  if (ind === -1) return str;

  return str.substring(0, ind) + to + str.substring(ind + from.length);
};

const fullMod = (mod) => {
  switch (mod) {
    case 'pc': return 'powercord';
    case 'bd': return 'betterdiscord';
    case 'gm': return 'goosemod';
  }
};

const mapifyBuiltin = (builtin) => `// MAP_START|${builtin}
${builtins[builtin]}
// MAP_END\n\n`;

let transformRoot;
const transform = async (path, code, mod) => {
  fetchProgressCurrent = 0;
  fetchProgressTotal = 0;

  transformRoot = path.split('/').slice(0, -1).join('/');

  code = await includeRequires(path, code);
  code = Object.values(chunks).join('\n\n') + `\n// MAP_START|${'.' + path.replace(transformRoot, '')}
${code}
// MAP_END`;

  code = mapifyBuiltin(fullMod(mod) + '/global') +
    ((code.includes('ZeresPluginLibrary') || code.includes('ZLibrary')) ? mapifyBuiltin('betterdiscord/libs/zeres') : '') +
    code;

  code = replaceLast(code, 'export default', 'module.exports ='); // esm -> cjs export

  console.log({ code });

  updatePending(null, 'Transforming...');

  code = sucrase.transform(code, { transforms: [ "typescript", "jsx" ], disableESTransforms: true }).code;

  code = `(function () {
${code}
})();`;

  return code;
};

const topazSettings = JSON.parse(localStorage.getItem('topaz_settings') ?? 'null') ?? {
  pluginSettingsSidebar: false,
  simpleUI: false,
  modalPages: false
};

const savePlugins = () => !topaz.__reloading && localStorage.setItem('topaz_plugins', JSON.stringify(Object.keys(plugins).reduce((acc, x) => { acc[x] = plugins[x].settings?.store ?? {}; return acc; }, {})));

const setDisabled = (key, disabled) => {
  const store = JSON.parse(localStorage.getItem('topaz_disabled') ?? '{}');

  if (disabled) {
    store[key] = true;
  } else {
    store[key] = undefined;
    delete store[key];
  }

  localStorage.setItem('topaz_disabled', JSON.stringify(store));
};

const purgeCacheForPlugin = (info) => {
  finalCache.remove(info); // remove final cache
  fetchCache.keys().filter(x => x.includes(info)).forEach(y => fetchCache.remove(y)); // remove fetch caches
};

const purgePermsForPlugin = (info) => {
  const store = JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}');

  store[info] = undefined;
  delete store[info];

  localStorage.setItem('topaz_permissions', JSON.stringify(store));
};


window.topaz = {
  settings: topazSettings,

  install: async (info) => {
    const installStartTime = performance.now();

    const [ manifest ] = await install(info);

    log('install', `installed ${info}! took ${(performance.now() - installStartTime).toFixed(2)}ms`);

    setTimeout(savePlugins, 1000);
  },

  uninstall: (info) => {
    if (!plugins[info]) return log('uninstall', 'plugin not installed');
    log('uninstall', info);

    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_stop();
    } catch (e) {
      console.error('UNINSTALL', e);
      // notify user?
    }

    delete plugins[info];

    if (!topaz.__reloading) {
      purgeCacheForPlugin(info);
      purgePermsForPlugin(info);

      savePlugins();
      setDisabled(info, false); // Remove from disabled list
    }
  },
  uninstallAll: () => Object.keys(plugins).forEach((x) => topaz.uninstall(x)),

  enable: (info) => {
    if (!plugins[info]) return log('enable', 'plugin not installed');
    log('enable', info);

    plugins[info]._topaz_start();
    plugins[info].__enabled = true;

    setDisabled(info, false);
  },
  disable: (info) => {
    if (!plugins[info]) return log('disable', 'plugin not installed');
    log('disable', info);

    plugins[info]._topaz_stop();
    plugins[info].__enabled = false;

    setDisabled(info, true);
  },
  reload: (info) => {
    plugins[info]._topaz_stop();
    delete plugins[info];

    setTimeout(() => topaz.install(info), 200);
  },

  purge: () => {
    topaz.uninstallAll();
    for (const snippet in snippets) stopSnippet(snippet);

    cssEl.remove();
    attrs.remove();

    msgUnpatch();
    settingsUnpatch();
  },

  purgeCache: () => {
    fetchCache.purge();
    finalCache.purge();
  },
  getInstalled: () => Object.keys(plugins),

  internal: {
    registerSettings: (entityID, { label, render, category, props }) => {
      plugins[entityID].__settings = { render, props };
    },

    plugins,
    fetchCache,
    builtins
  },

  reloadTopaz: async () => {
    eval(await (await fetch(`http://localhost:1337/src/index.js`, { cache: 'no-store' })).text());
  },

  log
};

log('init', `topaz loaded! took ${(performance.now() - initStartTime).toFixed(0)}ms`);

(async () => {
  const disabled = JSON.parse(localStorage.getItem('topaz_disabled') ?? '{}');

  for (const p in pluginsToInstall) {
    let settings = pluginsToInstall[p];
    if (typeof settings === 'object' && Object.keys(settings).length === 0) settings = undefined; // {} -> undefined

    await install(p, settings, disabled[p] ?? false);
  }

  try { updateOpenSettings(); } catch { }
})();

const activeSnippets = {};
const startSnippet = async (file, content) => {
  let code;

  if (file.endsWith('css')) {
    code = await transformCSS('https://discord.com/channels/@me', content, !file.endsWith('scss'), false);

    const cssEl = document.createElement('style');
    cssEl.appendChild(document.createTextNode(code));
    document.body.appendChild(cssEl);

    activeSnippets[file] = () => cssEl.remove();
  } else if (file.includes('.js')) {
    code = await transform('https://discord.com/channels/@me', content, 'pc');

    activeSnippets[file] = () => {}; // no way to stop?
  }
};
const stopSnippet = (file) => activeSnippets[file]?.();


const snippets = JSON.parse(localStorage.getItem('topaz_snippets') ?? '{}');
const snippetsToggled = JSON.parse(localStorage.getItem('topaz_snippets_toggled') ?? '{}');
for (const snippet in snippets) {
  if (snippetsToggled[snippet]) startSnippet(snippet, snippets[snippet]);
}

let popular;
(async () => { // Load async as not important / needed right away
  popular = await (await fetch(`http://localhost:1337/popular.json`)).json();
})();

const updateOpenSettings = async () => {
  if (!document.querySelector('.selected-g-kMVV[aria-controls="topaz-tab"]')) return;

  try {
    await new Promise((res) => setTimeout(res, 10));

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch { }
};

const { React, ReactDOM } = goosemod.webpackModules.common;

const TabBar = goosemod.webpackModules.findByDisplayName('TabBar');
const TabBarClasses1 = goosemod.webpackModules.findByProps('topPill');
const TabBarClasses2 = goosemod.webpackModules.findByProps('tabBar', 'nowPlayingColumn')

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'thin');

let selectedTab = 'PLUGINS';
let textInputs = {
  PLUGINS: '',
  THEMES: ''
};

const Text = goosemod.webpackModules.find(x => x.Text?.displayName === 'Text').Text;
const Heading = goosemod.webpackModules.findByProps('Heading').Heading;
const Breadcrumbs = goosemod.webpackModules.findByDisplayName('Breadcrumbs');
const BreadcrumbClasses = goosemod.webpackModules.findByProps('breadcrumbActive');
const Button = goosemod.webpackModules.findByProps('Sizes', 'Colors', 'Looks', 'DropdownSizes');
const LegacyText = goosemod.webpackModules.findByDisplayName('LegacyText');
const Spinner = goosemod.webpackModules.findByDisplayName('Spinner');
const PanelButton = goosemod.webpackModules.findByDisplayName('PanelButton');
const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
const Markdown = goosemod.webpackModules.find((x) => x.displayName === 'Markdown' && x.rules);
const DropdownArrow = goosemod.webpackModules.findByDisplayName('DropdownArrow');
const HeaderBarContainer = goosemod.webpackModules.findByDisplayName('HeaderBarContainer');
const FormItem = goosemod.webpackModules.findByDisplayName('FormItem');
const TextInput = goosemod.webpackModules.findByDisplayName('TextInput');
const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Margins = goosemod.webpackModules.findByProps('marginTop20', 'marginBottom20');
const _Switch = goosemod.webpackModules.findByDisplayName('Switch');

const Header = goosemod.settings.Items['header'];
const Subtext = goosemod.settings.Items['subtext'];
const TextAndChild = goosemod.settings.Items['text-and-child'];
const TextAndToggle = goosemod.settings.Items['toggle'];
const Divider = goosemod.settings.Items['divider'];

class Switch extends React.PureComponent {
  render() {
    return React.createElement(_Switch, {
      checked: this.props.checked,
      onChange: x => {
        this.props.checked = x;
        this.forceUpdate();

        this.props.onChange(x);
      }
    })
  }
}

class TZErrorBoundary extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      error: false
    };
  }

  componentDidCatch(error, moreInfo) {
    console.log('honk', {error, moreInfo});

    const errorStack = decodeURI(error.stack.split('\n').filter((x) => !x.includes('/assets/')).join('\n'));
    const componentStack = decodeURI(moreInfo.componentStack.split('\n').slice(1, 9).join('\n'));


    const suspectedPlugin = errorStack.match(/\((.*) \| GM Module:/)?.[1] ?? componentStack.match(/\((.*) \| GM Module:/)?.[1] ??
      errorStack.match(/\((.*) \| Topaz:/)?.[1] ?? componentStack.match(/\((.*) \| Topaz:/)?.[1];

    let suspectedName = suspectedPlugin ?? 'Unknown';
    const suspectedType = suspectedPlugin ? 'Plugin' : 'Cause';

    if (suspectedName === 'Unknown') {
      if (errorStack.includes('GooseMod')) {
        suspectedName = 'GooseMod Internals';
      }

      if (errorStack.includes('Topaz')) {
        suspectedName = 'Topaz Internals';
      }

      if (errorStack.toLowerCase().includes('powercord') || errorStack.toLowerCase().includes('betterdiscord')) {
        suspectedName = 'Other Mods';
      }
    }

    this.setState({
      error: true,

      suspectedCause: {
        name: suspectedName,
        type: suspectedType
      },

      errorStack: {
        raw: error.stack,
        useful: errorStack
      },

      componentStack: {
        raw: moreInfo.componentStack,
        useful: componentStack
      }
    });
  }

  render() {
    if (this.state.toRetry) {
      this.state.error = false;
    }

    setTimeout(() => {
      this.state.toRetry = true;
    }, 100);

    return this.state.error ? React.createElement('div', {
      className: 'gm-error-boundary'
    },
      React.createElement('div', {},
        React.createElement('div', {}),

        React.createElement(FormTitle, {
          tag: 'h1'
        }, this.props.header ?? 'Topaz has handled an error',
          (this.props.showSuspected ?? true) ? React.createElement(Markdown, {}, `## Suspected ${this.state.suspectedCause.type}: ${this.state.suspectedCause.name}`) : null
        )
      ),

      React.createElement('div', {},
        React.createElement(Button, {
          color: Button.Colors.BRAND,
          size: Button.Sizes.LARGE,

          onClick: () => {
            this.state.toRetry = true;
            this.forceUpdate();
          }
        }, 'Retry'),

        React.createElement(Button, {
          color: Button.Colors.RED,
          size: Button.Sizes.LARGE,

          onClick: () => {
            location.reload();
          }
        }, 'Refresh')
      ),

      React.createElement('div', {
        onClick: () => {
          this.state.toRetry = false;
          this.state.showDetails = !this.state.showDetails;
          this.forceUpdate();
        }
      },
        React.createElement('div', {
          style: {
            transform: `rotate(${this.state.showDetails ? '0' : '-90'}deg)`
          },
        },
          React.createElement(DropdownArrow, {
            width: 24,
            height: 24
          })
        ),

        this.state.showDetails ? 'Hide Details' : 'Show Details'
      ),

      this.state.showDetails ? React.createElement('div', {},
        React.createElement(Markdown, {}, `# Error Stack`),
        React.createElement(Markdown, {}, `\`\`\`
${this.state.errorStack.useful}
\`\`\``),
        React.createElement(Markdown, {}, `# Component Stack`),
        React.createElement(Markdown, {}, `\`\`\`
${this.state.componentStack.useful}
\`\`\``),
        /* React.createElement(Markdown, {}, `# Debug Info`),
        React.createElement(Markdown, {}, `\`\`\`
${goosemod.genDebugInfo()}
\`\`\``) */
      ) : null
    ) : this.props.children;
  }
}

const openSub = (plugin, type, _content) => {
  const useModal = topazSettings.modalPages;

  const breadcrumbBase = {
    activeId: '0',
    breadcrumbs: useModal ? [
      { id: '1', label: plugin },
      { id: '0', label: type[0].toUpperCase() + type.slice(1) },
    ] : [
      { id: '1', label: 'Topaz' },
      { id: '0', label: plugin + ' ' + type[0].toUpperCase() + type.slice(1) }
      /* { id: '1', label: plugin },
      { id: '0', label: type[0].toUpperCase() + type.slice(1) }, */
    ],

    onBreadcrumbClick: (x) => {},
  };

  const content = React.createElement(TZErrorBoundary, {
    header: 'Topaz failed to render ' + type + ' for ' + plugin,
    showSuspected: false
  }, _content);

  if (useModal) {
    const LegacyHeader = goosemod.webpackModules.findByDisplayName('LegacyHeader');

    openSub_modal(React.createElement(Breadcrumbs, {
      ...breadcrumbBase,
      renderCustomBreadcrumb: ({ label }, active) => React.createElement(LegacyHeader, {
        tag: 'h2',
        size: LegacyHeader.Sizes.SIZE_20,
        className: active ? BreadcrumbClasses.breadcrumbActive : BreadcrumbClasses.breadcrumbInactive
      }, label)
    }), content, type);
  } else {
    const titleClasses = goosemod.webpackModules.findByProps('h1');

    openSub_page(React.createElement(FormTitle, {
      tag: 'h1',
    },
      React.createElement(Breadcrumbs, {
        ...breadcrumbBase,
        onBreadcrumbClick: ({ id, label }) => {
          if (id === '1') updateOpenSettings();
        },
        renderCustomBreadcrumb: ({ label }, active) => React.createElement('span', {
          className: titleClasses.h1 + ' ' + (active ? BreadcrumbClasses.breadcrumbActive : BreadcrumbClasses.breadcrumbInactive)
        }, label)
      })
    ), content, type);
  }
};

const openSub_page = (header, content, type) => {
  ReactDOM.render(React.createElement('div', {
    className: `topaz-${type}-page`
  },
    header,

    content
  ), document.querySelector('.topaz-settings'));
};

const openSub_modal = (header, content, type) => {
  const ModalStuff = goosemod.webpackModules.findByProps('ModalRoot');
  const { openModal } = goosemod.webpackModules.findByProps('openModal', 'updateModal');
  const Flex = goosemod.webpackModules.findByDisplayName('Flex');

  openModal((e) => {
    return React.createElement(ModalStuff.ModalRoot, {
      transitionState: e.transitionState,
      size: 'large'
    },
      React.createElement(ModalStuff.ModalHeader, {},
        React.createElement(Flex.Child, {
          basis: 'auto',
          grow: 1,
          shrink: 1,
          wrap: false,
        },
          header
        ),
        React.createElement('FlexChild', {
          basis: 'auto',
          grow: 0,
          shrink: 1,
          wrap: false
        },
          React.createElement(ModalStuff.ModalCloseButton, {
            onClick: e.onClose
          })
        )
      ),

      React.createElement(ModalStuff.ModalContent, {
        className: `topaz-modal-content topaz-${type}-modal-content`
      },
        content
      )
    )
  });
};

class Plugin extends React.PureComponent {
  render() {
    const { manifest, repo, state, substate, settings, entityID, mod, isTheme } = this.props;

    return React.createElement(TextAndChild, {
      text: !manifest ? repo : [
        !mod ? null : React.createElement('span', {
          className: 'topaz-tag'
        }, mod.toUpperCase()),

        manifest.name,

        React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '4px'
          }
        }, 'v' + manifest.version),

        React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '4px',
            marginRight: '4px'
          }
        }, 'by'),

        (manifest.author ?? '').split('#')[0],

        /* manifest.author.split('#')[1] ? React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '1px'
          }
        }, '#' + manifest.author.split('#')[1]) : null */
      ],

      subtext: manifest?.description,
    },
      !state ? React.createElement(Switch, {
        checked: this.props.enabled,
        onChange: x => {
          topaz[x ? 'enable' : 'disable'](entityID);
        }
      }) : React.createElement(LegacyText, {
        size: goosemod.webpackModules.findByProps('size16', 'size32').size16,
        className: goosemod.webpackModules.findByProps('title', 'dividerDefault').title + ' topaz-loading-text'
      },
        state !== 'Error' ? React.createElement(Spinner, {
          type: 'spinningCircle'
        }) : React.createElement(goosemod.webpackModules.findByDisplayNameAll('CloseCircle')[1], {
          // backgroundColor: "hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%)",
          // color: "hsl(0, calc(var(--saturation-factor, 1) * 0%), 100%)",
          color: "hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%)",
          width: 24,
          height: 24
        }),

        React.createElement('span', {
        }, state,
          React.createElement('span', {
            class: 'description-30xx7u'
          }, substate || 'Finding index...')
        )
      ),

      state ? null : React.createElement('div', {
        className: 'topaz-plugin-icons'
      },
        settings ? React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Gear'),
          tooltipText: 'Open Settings',
          onClick: () => {
            openSub(manifest.name, 'settings', React.createElement(settings.render, settings.props ?? {}));
          }
        }) : null,

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Pencil'),
          tooltipText: 'Edit',
          onClick: async () => {
            const plugin = plugins[entityID];
            const getUrl = file => plugin.__root + '/' + file;

            const files = fetchCache.keys().filter(x => x.includes(entityID.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).reduce((acc, x) => { acc[x.replace(plugin.__root + '/', '')] = fetchCache.get(x); return acc; }, {});

            openSub(manifest.name, 'editor', React.createElement(await Editor.Component, {
              files,
              plugin,
              onChange: (file, content) => {
                fetchCache.set(getUrl(file), content);

                files[file] = content;
              },
              onRename: (old, val) => {
                const oldUrl = getUrl(old);

                fetchCache.set(getUrl(val), fetchCache.get(oldUrl));
                fetchCache.remove(oldUrl);

                files[val] = files[old];
                delete files[old];
              },
              onDelete: (file) => {
                fetchCache.remove(getUrl(file));

                delete files[file];
              }
            }));
          }
        }),

        !isTheme ? React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('PersonShield'),
          tooltipText: 'Permissions',
          onClick: async () => {
            const perms = {
              'Token': {
                'Read your token': 'token_read',
                'Set your token': 'token_write'
              },
              'Actions': {
                'Set typing state': 'actions_typing',
                'Send messages': 'actions_send'
              },
              'Account': {
                'See your username': 'readacc_username',
                'See your discriminator': 'readacc_discrim',
                'See your email': 'readacc_email',
                'See your phone number': 'readacc_phone'
              },
              'Friends': {
                'See who you are friends with': 'friends_readwho'
              },
              'Status': {
                'See status of users': 'status_readstatus',
                'See activities of users': 'status_readactivities'
              }
            };

            const givenPermissions = JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}')[entityID] ?? {};

            const entryClasses = goosemod.webpackModules.findByProps('entryItem');

            const grantedPermCount = Object.values(givenPermissions).filter(x => x === true).length;

            openSub(manifest.name, 'permissions', React.createElement('div', {},
              React.createElement(Heading, {
                level: 3,
                variant: 'heading-md/medium',
                className: 'topaz-permission-summary'
              }, `${grantedPermCount} Granted Permission${grantedPermCount === 1 ? '' : 's'}`),

              React.createElement(Button, {
                color: Button.Colors.RED,
                size: Button.Sizes.SMALL,
                className: 'topaz-permission-reset',

                onClick: () => {
                  // save permission allowed/denied
                  const store = JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}');

                  store[entityID] = {};

                  localStorage.setItem('topaz_permissions', JSON.stringify(store));

                  setTimeout(() => { // reload plugin
                    topaz.reload(entityID);
                    goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + manifest.name, 0, { duration: 5000, position: 1 }));
                  }, 100);
                }
              }, 'Reset'),

              ...Object.keys(perms).map(category => React.createElement('div', {},
                React.createElement(Heading, {
                  level: 3,
                  variant: 'heading-md/medium'
                }, category[0].toUpperCase() + category.slice(1).replaceAll('_', ' ')),

                React.createElement('div', {
                  className: goosemod.webpackModules.findByProps('listContainer', 'addButton').listContainer
                },
                  ...Object.keys(perms[category]).filter(x => givenPermissions[perms[category][x]] !== undefined).map(perm => React.createElement('div', { className: entryClasses.entryItem },
                    React.createElement('div', { className: entryClasses.entryName },
                      React.createElement(Text, {
                        color: 'header-primary',
                        variant: 'text-md/normal',
                        className: 'topaz-permission-label'
                      }, perm)
                    ),
                    React.createElement('div', { className: entryClasses.entryActions },
                      React.createElement(Switch, {
                        checked: givenPermissions[perms[category][perm]],
                        onChange: (x) => {
                          // save permission allowed/denied
                          const store = JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}');
                          if (!store[entityID]) store[entityID] = {};

                          store[entityID][perms[category][perm]] = x;

                          localStorage.setItem('topaz_permissions', JSON.stringify(store));

                          setTimeout(() => { // reload plugin
                            topaz.reload(entityID);
                            goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + manifest.name, 0, { duration: 5000, position: 1 }));
                          }, 100);
                        }
                      })
                    )
                  ))
                ),

                React.createElement(Divider),
              )).filter(x => x.props.children[1].props.children)
            ));
          }
        }) : null,

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Link'),
          tooltipText: 'Open Link',
          onClick: async () => {
            let link = entityID.includes('http') ? entityID : `https://github.com/${entityID}`;
            if (link.includes('raw.githubusercontent.com')) link = 'https://github.com/' + [...link.split('/').slice(3, 5), 'blob', ...link.split('/').slice(5)].join('/'); // raw github links -> normal

            window.open(link);
          }
        }),

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Retry'),
          tooltipText: 'Reinstall',
          onClick: async () => {
            await topaz.uninstall(entityID);

            const rmPending = addPending({ repo: entityID, state: 'Installing...' });
            updateOpenSettings();

            await topaz.install(entityID);
            rmPending();
            updateOpenSettings();
          }
        }),

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Trash'),
          tooltipText: 'Uninstall',
          onClick: this.props.onUninstall
        }),
      )
    );
  }
}

const saveTopazSettings = () => localStorage.setItem('topaz_settings', JSON.stringify(topazSettings));

class TopazSettings extends React.PureComponent {
  render() {
    return React.createElement('div', {

    },
      React.createElement(Header, {
        text: 'Appearance',
      }),

      React.createElement(TextAndToggle, {
        text: 'Simple UI',
        subtext: 'Hides some more technical UI elements',
        isToggled: () => topazSettings.simpleUI,
        onToggle: x => {
          topazSettings.simpleUI = x;
          saveTopazSettings();
        }
      }),

      React.createElement(TextAndToggle, {
        text: 'Use Modals',
        subtext: 'Use modals instead of pages for plugin menus',
        isToggled: () => topazSettings.modalPages,
        onToggle: x => {
          topazSettings.modalPages = x;
          saveTopazSettings();
        }
      }),

      React.createElement(TextAndToggle, {
        text: 'Add Plugin Settings To Sidebar',
        subtext: 'Adds plugin\'s settings to sidebar',
        isToggled: () => topazSettings.pluginSettingsSidebar,
        onToggle: x => {
          topazSettings.pluginSettingsSidebar = x;
          saveTopazSettings();
        }
      }),
    )
  }
}

let activeSnippet;
class Snippets extends React.PureComponent {
  render() {
    const _Editor = (Editor.Component instanceof Promise ? 'div' : Editor.Component) ?? 'div';
    if (_Editor === 'div') setTimeout(() => this.forceUpdate(), 200);

    const saveSnippets = () => {
      localStorage.setItem('topaz_snippets', JSON.stringify(snippets));
      localStorage.setItem('topaz_snippets_toggled', JSON.stringify(snippetsToggled));
    };

    const updateSnippet = (file, content) => {
      snippets[file] = content;
      if (snippetsToggled[file] === undefined) snippetsToggled[file] = true;

      saveSnippets();

      stopSnippet(file);
      if (snippetsToggled[file] && content) startSnippet(file, content);
    };

    return React.createElement('div', {
      className: 'topaz-snippets'
    },
      React.createElement(_Editor, {
        files: snippets,
        toggled: snippetsToggled,
        defaultFile: snippets[activeSnippet] ? activeSnippet : undefined,
        plugin: { entityID: 'snippets' },

        onChange: (file, content) => updateSnippet(file, content),
        onToggle: (file, toggled) => {
          snippetsToggled[file] = toggled;
          updateSnippet(file, snippets[file]);
        },
        onRename: (old, val) => {
          snippets[val] = snippets[old];
          delete snippets[old];

          snippetsToggled[val] = snippetsToggled[old];
          delete snippetsToggled[old];

          updateSnippet(val, snippets[val]);
        },
        onDelete: (file) => {
          delete snippets[file];
          delete snippetsToggled[file];

          saveSnippets();
          stopSnippet(file);
        },

        onOpen: (file) => activeSnippet = file
      })
    );
  }
}

class Settings extends React.PureComponent {
  render() {
    const textInputHandler = (inp, init = false) => {
      const el = document.querySelector('.topaz-settings .input-2g-os5');

      const install = async (info) => {
        const rmPending = addPending({ repo: info, state: 'Installing...' });

        this.forceUpdate();
        setTimeout(() => { this.forceUpdate(); }, 300);

        try {
          await topaz.install(info);
        } catch (e) {
          console.error('INSTALL', e);

          purgeCacheForPlugin(info); // try to purge cache if failed

          const currentPend = pending.find(x => x.repo === info);
          const rmError = addPending({ repo: info, state: 'Error', substate: lastError ?? e.toString().substring(0, 30), manifest: currentPend.manifest });
          setTimeout(rmError, 2000);
        }

        rmPending();

        this.forceUpdate();
        setTimeout(() => { updateOpenSettings(); }, 500); // force update because jank
      };


      if (!el.placeholder) {
        el.placeholder = 'GitHub repo / URL';

        el.onkeydown = async (e) => {
          if (e.keyCode !== 13) return;

          const info = el.value;
          el.value = '';
          // el.value = 'Installing...';

          install(info);
        };

        el.onfocus = () => textInputHandler(el.value ?? '');

        el.onblur = () => {
          setTimeout(() => {
            autocomplete.style.display = 'none';
          }, 100);
        };
      }

      let autocomplete = document.querySelector('#topaz-repo-autocomplete');
      if (!autocomplete) {
        autocomplete = document.createElement('div');
        autocomplete.id = 'topaz-repo-autocomplete';
        autocomplete.className = ScrollerClasses.thin + (topazSettings.simpleUI ? ' topaz-simple' : '');

        document.body.appendChild(autocomplete);
      }

      const inputPos = el.getBoundingClientRect();

      autocomplete.style.top = inputPos.bottom + 'px';
      autocomplete.style.left = inputPos.left + 'px';
      autocomplete.style.width = inputPos.width + 'px';

      const fuzzySearch = new RegExp(`.*${inp.replace(' ', '[-_ ]')}.*`, 'i');

      const recom = popular[selectedTab.toLowerCase()];
      const infoFromRecom = (x) => x.endsWith('.plugin.js') ? x.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '') : x.replace('https://github.com/', '');
      const matching = Object.keys(recom).filter((x) => !plugins[infoFromRecom(recom[x])] && fuzzySearch.test(x));

      if (!init && matching.length > 0) {
        autocomplete.style.display = 'block';
        autocomplete.innerHTML = '';

        const hel = document.createElement('h5');
        hel.textContent = 'Popular ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes');
        autocomplete.appendChild(hel);

        for (const x of matching) {
          const [ mod, name, author ] = x.split('%');

          let place = recom[x];
          if (place.length > 40) place = place.slice(0, 40) + '...';

          const nel = document.createElement('div');
          nel.className = 'title-2dsDLn';
          nel.innerHTML = `<span class="topaz-tag tag-floating">${mod}</span> ${name} <span class="description-30xx7u">by</span> ${author.split('#')[0]} <span class="code-style">${place}</span>`; // sad

          nel.onclick = async () => {
            autocomplete.style.display = 'none';

            el.value = '';

            install(recom[x]);
          };

          autocomplete.appendChild(nel);
        }
      } else {
        autocomplete.style.display = 'none';
      }
    };

    setTimeout(() => {
      let tmpEl = document.querySelector('.topaz-settings .input-2g-os5');
      if (tmpEl && !tmpEl.placeholder) textInputHandler('', true);
    }, 10);


    return React.createElement('div', {
      className: 'topaz-settings' + (topazSettings.simpleUI ? ' topaz-simple' : '')
    },
      React.createElement(FormTitle, {
        tag: 'h1'
      }, 'Topaz',
        React.createElement('span', {
          className: 'description-30xx7u topaz-version'
        }, 'alpha 3.1'),

        React.createElement(HeaderBarContainer.Divider),

        React.createElement(TabBar, {
          selectedItem: selectedTab,

          type: TabBarClasses1.topPill,
          className: TabBarClasses2.tabBar,

          onItemSelect: (x) => {
            if (x === 'RELOAD') return;

            const textInputEl = document.querySelector('.topaz-settings .input-2g-os5');
            if (textInputEl) textInputs[selectedTab] = textInputEl.value;

            selectedTab = x;
            this.forceUpdate();

            if (textInputEl) textInputEl.value = textInputs[x];
          }
        },
          React.createElement(TabBar.Item, {
            id: 'PLUGINS',

            className: TabBarClasses2.item
          }, 'Plugins'),
          React.createElement(TabBar.Item, {
            id: 'THEMES',

            className: TabBarClasses2.item
          }, 'Themes'),
          React.createElement(TabBar.Item, {
            id: 'SNIPPETS',

            className: TabBarClasses2.item
          }, 'Snippets'),
          React.createElement(TabBar.Item, {
            id: 'SETTINGS',

            className: TabBarClasses2.item
          }, 'Settings'),

          React.createElement(TabBar.Item, {
            id: 'RELOAD',

            className: TabBarClasses2.item
          }, React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Retry'),
            tooltipText: 'Reload Topaz',
            onClick: async () => {
              topaz.reloadTopaz();
            }
          }))
        ),
      ),

      selectedTab === 'SETTINGS' ? React.createElement(TopazSettings) :
        selectedTab === 'SNIPPETS' ? React.createElement(Snippets) : [
        React.createElement(FormItem, {
          title: 'Add ' + (selectedTab === 'PLUGINS' ? 'Plugin' : 'Theme'),
          className: [Flex.Direction.VERTICAL, Flex.Justify.START, Flex.Align.STRETCH, Flex.Wrap.NO_WRAP, Margins.marginBottom20].join(' ')
        },
          React.createElement(TextInput, {
            onChange: textInputHandler
          })
        ),

        React.createElement(Header, {
          text: 'Installed'
        }),

        React.createElement(Divider),

        ...Object.values(plugins).filter((x) => selectedTab === 'PLUGINS' ? !x.__theme : x.__theme).map(({ __enabled, manifest, entityID, __settings, __mod, __theme }) => React.createElement(Plugin, {
          manifest,
          entityID,
          enabled: __enabled,
          settings: __settings,
          mod: __mod,
          isTheme: !!__theme,
          onUninstall: async () => {
            const rmPending = addPending({ repo: entityID, state: 'Uninstalling...' });
            this.forceUpdate();

            await topaz.uninstall(entityID);
            rmPending();

            this.forceUpdate();
          }
        })),

        ...pending.map(obj => React.createElement(Plugin, obj))
      ]
    )
  }
}

let settingsUnpatch = goosemod.patcher.patch(goosemod.webpackModules.findByDisplayName('SettingsView').prototype, 'getPredicateSections', (_, sections) => {
  const logout = sections.find((c) => c.section === 'logout');
  if (!logout) return sections;

  sections.splice(0, 0,
  {
    section: 'Topaz',
    label: 'Topaz',
    predicate: () => { },
    element: () => React.createElement(Settings)
  },

  {
    section: 'DIVIDER',
  },);

  return sections;
});

const cssEl = document.createElement('style');
cssEl.appendChild(document.createTextNode(await (await fetch('http://localhost:1337/src/index.css')).text()));
document.head.appendChild(cssEl);

const msgModule = goosemod.webpackModules.findByProps('sendMessage');
const msgUnpatch = goosemod.patcher.patch(msgModule, 'sendMessage', ([ _channelId, { content } ]) => {
  if (content.startsWith('+t ')) {
    const info = content.split(' ')[1];
    topaz.install(info);
    return false;
  }

  if (content.startsWith('-t ')) {
    const info = content.split(' ')[1];
    topaz.uninstall(info);
    return false;
  }

  if (content.startsWith('--t')) {
    topaz.uninstallAll();
    return false;
  }

  if (content.startsWith(':t')) {
    topaz.reloadTopaz();
    return false;
  }
}, true);
})(); //# sourceURL=Topaz