(async () => {
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

if (console.context) window.console = console.context(); // Resets console to normal, removing custom methods patched by various things (Sentry, React DevTools) as it's annoying for stack traces

if (window.topaz && topaz.purge) { // live reload handling
  topaz.__reloading = true;
  topaz.purge(); // fully remove topaz (plugins, css, etc)

  // setTimeout(() => updateOpenSettings(), 1000);
}

window.topaz = {
  version: 'alpha 11.2',
  debug: window.topaz?.debug ?? false,
  log
};

const Storage = await eval(await (await fetch('http://localhost:1337/src/storage.js')).text());

const openChangelog = async () => eval(await (await fetch('http://localhost:1337/src/changelog.js')).text());

const lastVersion = Storage.get('last_version');
if (!lastVersion || lastVersion !== topaz.version) {
  if (lastVersion?.split('.')[0] !== topaz.version.split('.')[0]) setTimeout(openChangelog, 2000);
  Storage.delete('cache_final'); // delete final cache
}
// if (lastVersion && lastVersion !== topaz.version) setTimeout(openChangelog, 5000);
Storage.set('last_version', topaz.version);


let pluginsToInstall = JSON.parse(Storage.get('plugins') ?? '{}');

const initStartTime = performance.now();

const sucrase = eval(await (await fetch('http://localhost:1337/src/sucrase.js')).text());
const grass = await eval(await (await fetch('http://localhost:1337/src/grass.js')).text());
const XXHash = (await eval(await (await fetch('http://localhost:1337/src/xxhash.js')).text())()).h64ToString;

const attrs = eval(await (await fetch('http://localhost:1337/src/attrs.js')).text());

const Onyx = eval(await (await fetch('http://localhost:1337/src/onyx.js')).text());
const MapGen = eval(await (await fetch('http://localhost:1337/src/mapgen.js')).text());
Onyx.prototype.MapGen = MapGen; // import mapgen into onyx

const Autopatch = eval(await (await fetch('http://localhost:1337/src/autopatch.js')).text());

const { React, ReactDOM } = goosemod.webpackModules.common;

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
  code = code.replaceAll(/[^:]\/\/.*$/gm, '');
  code = code.replaceAll(/\/\*[\s\S]*?\*\//gm, '').replaceAll('/*', '').replaceAll('*/', '');


  const res = await replaceAsync(code, /@(import|use|forward) (url\()?['"](.*?)['"]\)?;?/g, async (_, _1, _2, path) => {
    if (path.startsWith('sass:')) return '';

    const isExternal = path.startsWith('http');
    const basePath = (path.startsWith('./') ? '' : './') + path;
    // console.log(isExternal, isExternal ? path : join(root, basePath));

    let code;
    let resolved;
    if (isExternal) {
      if (_.includes('@import') && !_.includes('scss')) return _;

      let code = '';
      try {
        code = await fetchCache.fetch(path);
      } catch (e) {
        console.warn('failed to fetch external', code);
      }
    } else {
      const relativePath = resolvePath('.' + root.replace(transformRoot, '') + '/' + basePath.replace('./', ''));
      // console.log(root, '|', basePath, relativePath, '|', '.' + root.replace(transformRoot, '') + '/' + basePath.replace('./', ''));

      resolved = /* await resolveFileFromTree(relativePath + '.scss') ?? */ await resolveFileFromTree(relativePath) ?? await resolveFileFromTree([ ...relativePath.split('/').slice(0, -1), '_' + relativePath.split('/').pop() ].join('/'));
      code = await getCode(transformRoot, resolved);
    }

    const importRoot = isExternal ? getDir(path) : join(transformRoot, getDir(resolved));
    return await includeImports(importRoot, code, updatePending);
  });

  if (updateProgress) fetchProgressCurrent++;

  return res;
};

const transformCSS = async (root, indexRoot, code, skipTransform = false, updateProgress = false) => {
  transformRoot = root;

  if (updateProgress) {
    fetchProgressCurrent = 0;
    fetchProgressTotal = 0;
  }

  if (updateProgress) updatePending(null, 'Importing...');

  let newCode = await includeImports(indexRoot, code, updateProgress);

  if (updateProgress) updatePending(null, 'Transforming...');

  // hacks for grass bugs / missing support
  newCode = newCode.replaceAll(/\[.*?\]/g, _ => _.replaceAll('/', '\\/')); // errors when \'s are in attr selectors
  newCode = newCode.replaceAll(/rgb\(([0-9]+) ([0-9]+) ([0-9]+) \/ ([0-9]+)%\)/g, (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, 0.${a})`); // rgb(0 0 0 / 20%) -> rgba(0, 0, 0, 0.20)

  // temporarily rename css built-ins
  const builtins = [ 'hsla', 'hsl', 'rgb', 'rgba' ];
  for (const x of builtins) newCode = newCode.replaceAll(x, '_' + x);

  const start = performance.now();
  // if (!skipTransform) newCode = topaz.debug ? Glass(newCode) : grass(newCode, { style: 'expanded', quiet: true, load_paths: [''] });
  if (!skipTransform) newCode = grass(newCode, { style: 'expanded', quiet: true, load_paths: [''] });
  log('css.transform', `took ${(performance.now() - start).toFixed(2)}ms`);

  for (const x of builtins) newCode = newCode.replaceAll('_' + x, x);

  return newCode;
};


const getBuiltin = async (name) => await (await fetch('http://localhost:1337/src/builtins/' + name + '.js')).text();

const builtins = {
  'powercord': await getBuiltin('powercord/wrapper'),
  'powercord/entities': await getBuiltin('powercord/entities'),
  ...['Plugin'].reduce((acc, x) => { acc[`powercord/entities/${x}`] = `module.exports = require('powercord/entities').${x};`; return acc; }, {}),
  'powercord/webpack': await getBuiltin('powercord/webpack'),
  'powercord/injector': await getBuiltin('powercord/injector'),
  'powercord/util': await getBuiltin('powercord/util'),
  'powercord/components': await getBuiltin('powercord/components/index'),
  'powercord/components/settings': await getBuiltin('powercord/components/settings'),
  ...['FormItem'].reduce((acc, x) => { acc[`powercord/components/settings/${x}`] = `module.exports = require('powercord/components/settings').${x};`; return acc; }, {}),
  'powercord/components/modal': await getBuiltin('powercord/components/modal'),
  'powercord/components/AsyncComponent': await getBuiltin('powercord/components/AsyncComponent'),
  'powercord/components/ContextMenu': await getBuiltin('powercord/components/ContextMenu'),
  'powercord/modal': await getBuiltin('powercord/modal'),
  'powercord/http': await getBuiltin('powercord/http'),
  'powercord/constants': await getBuiltin('powercord/constants'),
  'powercord/global': await getBuiltin('powercord/global'),

  '@goosemod/patcher': await getBuiltin('goosemod/patcher'),
  '@goosemod/webpack': await getBuiltin('goosemod/webpack'),
  '@goosemod/webpack/common': await getBuiltin('goosemod/webpackCommon'),
  '@goosemod/logger': await getBuiltin('goosemod/logger'),
  '@goosemod/reactUtils': await getBuiltin('goosemod/reactUtils'),
  '@goosemod/toast': await getBuiltin('goosemod/toast'),
  '@goosemod/settings': await getBuiltin('goosemod/settings'),
  '@goosemod/plugin': await getBuiltin('goosemod/plugin'),
  'goosemod/global': '',

  'betterdiscord/global': await getBuiltin('betterdiscord/global'),

  get 'betterdiscord/libs/zeres'() { // patch official
    return new Promise(async res => {
      const out = (await fetchCache.fetch('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js'))
        .replace('static async hasUpdate(updateLink) {', 'static async hasUpdate(updateLink) { return Promise.resolve(false);') // disable updating
        .replace('this.listeners = new Set();', 'this.listeners = {};') // webpack patches to use our API
        .replace('static addListener(listener) {', `static addListener(listener) {
console.log("addListener", listener);
const id = Math.random().toString().slice(2);

let lastLength = 0;
const int = setInterval(() => {
  const all = goosemod.webpackModules.all();
  if (lastLength === all.length) return;
  lastLength = all.length;

  console.log('CHECK', lastLength, all.length, listener);

  for (const m of all) { if (m) listener(m); }
}, 5000);

listener._listenerId = id;
return this.listeners[id] = () => {
  clearInterval(int);
  delete this.listeners[listener._listenerId];
};`)
        .replace('static removeListener(listener) {', 'static removeListener(listener) { this.listeners[listener._listenerId]?.(); return;')
        .replace('static getModule(filter, first = true) {', `static getModule(filter, first = true) { return goosemod.webpackModules[first ? 'find' : 'findAll'](filter);`)
        .replace('static getByIndex(index) {', 'static getByIndex(index) { return goosemod.webpackModules.findByModuleId(index);')
        .replace('static getAllModules() { return goosemod.webpackModules.all().reduce((acc, x, i) => { acc[i] = x; return acc; }, {});')
        .replace('static pushChildPatch(caller, moduleToPatch, functionName, callback, options = {}) {', `static pushChildPatch(caller, moduleToPatch, functionName, callback, options = {}) { return BdApi.Patcher[options.type ?? 'after'](caller, this.resolveModule(moduleToPatch), functionName, callback);`) // use our patcher
        .replace('module.exports.ZeresPluginLibrary = __webpack_exports__["default"];', '(new __webpack_exports__["default"]).load();') // load library on creation, disable export
        .replace('this.__ORIGINAL_PUSH__ = window[this.chunkName].push;', 'return;') // disable webpack push patching
        .replace('showChangelog(footer) {', 'showChangelog(footer) { return;') // disable changelogs
        .replace(/changelog: \[[\s\S]*?\],/, ''); // remove lib's own changelog

      delete builtins['betterdiscord/libs/zeres']; // overwrite getter with output
      builtins['betterdiscord/libs/zeres'] = out;

      res(out);
    });
  },

  get 'betterdiscord/libs/bdfdb'() {
    return new Promise(async res => {
      const out = (await fetchCache.fetch('https://raw.githubusercontent.com/mwittrien/BetterDiscordAddons/master/Library/0BDFDB.plugin.js'))
        .replace('BDFDB.PluginUtils.hasUpdateCheck = function (url) {', 'BDFDB.PluginUtils.hasUpdateCheck = function (url) { return false;') // disable updates
        .replace('BDFDB.PluginUtils.checkUpdate = function (pluginName, url) {', 'BDFDB.PluginUtils.checkUpdate = function (pluginName, url) { return Promise.resolve(0);')
        .replace('BDFDB.PluginUtils.showUpdateNotice = function (pluginName, url) {', 'BDFDB.PluginUtils.showUpdateNotice = function (pluginName, url) { return;')
        .replace('let all = typeof config.all != "boolean" ? false : config.all;', `let all = typeof config.all != "boolean" ? false : config.all;
let out = goosemod.webpackModules[all ? 'findAll' : 'find'](m => filter(m) || (m.type && filter(m.type)));
if (out) out = filter(out) ?? out;
return out;`) // use our own webpack
        .replace('Internal.getWebModuleReq = function () {', 'Internal.getWebModuleReq = function () { return Internal.getWebModuleReq.req = () => {};')
        .replace('this && this !== window', 'this && !this.performance')
        .replace('const chunkName = "webpackChunkdiscord_app";', `
const moduleHandler = (exports) => {
  const removedTypes = [];
  for (const type in PluginStores.chunkObserver) {
    const foundModule = PluginStores.chunkObserver[type].filter(exports) || exports.default && PluginStores.chunkObserver[type].filter(exports.default);
    if (foundModule) {
      Internal.patchComponent(PluginStores.chunkObserver[type].query, PluginStores.chunkObserver[type].config.exported ? foundModule : exports, PluginStores.chunkObserver[type].config);
      removedTypes.push(type);
      break;
    }
  }
  while (removedTypes.length) delete PluginStores.chunkObserver[removedTypes.pop()];
  let found = false, funcString = exports && exports.default && typeof exports.default == "function" && exports.default.toString();
  if (funcString && funcString.indexOf(".page") > -1 && funcString.indexOf(".section") > -1 && funcString.indexOf(".objectType") > -1) {
    const returnValue = exports.default({});
    if (returnValue && returnValue.props && returnValue.props.object == BDFDB.DiscordConstants.AnalyticsObjects.CONTEXT_MENU) {
      for (const type in PluginStores.contextChunkObserver) {
        if (PluginStores.contextChunkObserver[type].filter(returnValue.props.children)) {
          exports.__BDFDB_ContextMenuWrapper_Patch_Name = exports.__BDFDB_ContextMenu_Patch_Name;
          found = true;
          if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
          for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
          break;
        }
      }
    }
  }
  if (!found) for (const type in PluginStores.contextChunkObserver) {
    if (PluginStores.contextChunkObserver[type].filter(exports)) {
      if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
      for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
      break;
    }
  }
};

const int = setInterval(() => {
  // for (const m of goosemod.webpackModules.all()) { if (m) moduleHandler(m); }
}, 5000);

for (const m of goosemod.webpackModules.all()) { if (m) moduleHandler(m); }

Internal.removeChunkObserver = () => clearInterval(int);
return;`)
        .replace(/\}\)\(\);\n$/, `})();
(new module.exports()).load();`); // make and load it

      delete builtins['betterdiscord/libs/bdfdb']; // overwrite getter with output
      builtins['betterdiscord/libs/bdfdb'] = out;

      res(out);
    });
  },

  'drdiscord/global': await getBuiltin('drdiscord/global'),

  'velocity/global': await getBuiltin('velocity/global'),

  '@entities/plugin': await getBuiltin('unbound/plugin'),
  '@structures/plugin': await getBuiltin('unbound/plugin'),
  '@patcher': await getBuiltin('unbound/patcher'),
  '@webpack': await getBuiltin('unbound/webpack/webpack'),
  '@webpack/common': await getBuiltin('unbound/webpack/common'),
  '@webpack/stores': await getBuiltin('unbound/webpack/stores'),
  '@utilities': await getBuiltin('unbound/utils'),
  '@utilities/dom': `module.exports = require('@utilities').DOM;`,
  '@components': await getBuiltin('unbound/components/components'),
  '@components/discord': await getBuiltin('unbound/components/discord'),
  '@components/settings': await getBuiltin('unbound/components/settings'),
  '@api/toasts': await getBuiltin('unbound/toasts'),
  'unbound/global': '',

  '@classes': await getBuiltin('astra/classes'),
  '@util': await getBuiltin('astra/util'),
  'astra/global': '',

  '@cumcord/modules/webpack': `module.exports = cumcord.modules.webpack;`,
  '@cumcord/modules/webpackModules': `module.exports = cumcord.modules.webpack;`,
  '@cumcord/modules/common': 'module.exports = cumcord.modules.common;',
  ...['i18n', 'constants', 'FluxDispatcher'].reduce((acc, x) => { acc[`@cumcord/modules/common/${x}`] = `module.exports = cumcord.modules.common.${x};`; return acc; }, {}),
  '@cumcord/modules': 'module.exports = cumcord.modules;',
  '@cumcord/patcher': `module.exports = cumcord.patcher;`,
  '@cumcord/utils': `module.exports = cumcord.utils;`,
  '@cumcord/pluginData': `module.exports = cumcord.pluginData;`,
  '@cumcord/pluginData/persist': `module.exports = cumcord.pluginData.persist;`,
  'cumcord/global': await getBuiltin('cumcord/global'),

  '@rikka/Common/entities/Plugin': await getBuiltin('rikka/plugin'),
  '@rikka/API/Utils': await getBuiltin('rikka/utils'),
  '@rikka/API/Utils/strings/owoify': `module.exports = require('@rikka/API/Utils').strings.owoify;`,
  'rikka/global': '',

  '@vizality/webpack': `module.exports = require('powercord/webpack');`,
  '@vizality/components/settings': `module.exports = require('powercord/components/settings');`,
  '@vizality/patcher': await getBuiltin('vizality/patcher'),
  '@vizality/entities': await getBuiltin('vizality/entities'),
  'vizality/global': await getBuiltin('vizality/global'),

  'enmity/metro/common': `module.exports = require('unbound/webpack/common');`,
  'enmity/metro': `module.exports = require('unbound/webpack/webpack');`,
  'enmity/patcher': `module.exports = require('unbound/patcher');`,
  'enmity/managers/plugins': `module.exports = { Plugin: {}, registerPlugin: () => {} };`,
  'enmity/global': '',

  'demoncord/global': await getBuiltin('demoncord/global'),

  'aliucord/entities': await getBuiltin('aliucord/entities'),
  'aliucord/metro': await getBuiltin('aliucord/metro'),
  'aliucord/utils': await getBuiltin('aliucord/utils'),
  'aliucord/utils/patcher': `module.exports = require('aliucord/utils').Patcher;`,
  'aliucord/global': '',

  'react': 'module.exports = goosemod.webpackModules.common.React;',
  'lodash': 'module.exports = window._;',

  'electron': await getBuiltin('node/electron'),
  'path': await getBuiltin('node/path'),
  'fs': await getBuiltin('node/fs'),
  'process': await getBuiltin('node/process'),
  'util': await getBuiltin('node/util'),
  'request': await getBuiltin('node/request'),
  'https': await getBuiltin('node/https'),
  'querystring': await getBuiltin('node/querystring'),
  'os': await getBuiltin('node/os'),
  'url': await getBuiltin('node/url'),
};

const join = (root, p) => root + p.replace('./', '/'); // Add .jsx to empty require paths with no file extension

class Cache {
  constructor(id) {
    this.id = id;
    this.store = {};

    this.load();
  }

  async fetch(url) {
    return this.get(url) ?? this.set(url, await (await fetch(url)).text());
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
    const saved = Storage.get(`cache_${this.id}`);
    if (!saved) return;

    this.store = JSON.parse(saved);
  }

  save() {
    Storage.set(`cache_${this.id}`, JSON.stringify(this.store));
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

    const url = join(root, path);
    const req = await fetch(url).catch(e => {
      if (e.stack.startsWith('TypeError')) { // possible CORS error, try with our CORS proxy
        console.warn('Failed to fetch', url, '- trying CORS proxy');
        return fetch(`https://topaz-cors.goosemod.workers.dev/?` + url);
      }
    });
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

const autoImportReact = (code) => { // auto import react for jsx if not imported
  if (!code.match(/^(import|const) [^;]*?React[, ].*?$/gm)) code = `import React from 'react';\n${code}`;
  return code;
};

const makeChunk = async (root, p) => {
  // console.log('makeChunk', p);

  if (p.endsWith('/') && builtins[p.slice(0, -1)]) p = p.slice(0, -1);

  const shouldUpdateFetch = !builtins[p];
  if (shouldUpdateFetch) {
    fetchProgressTotal++;
    updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);
  }

  const joined = (root + '/' + p).replace(transformRoot, '');
  let resPath = builtins[p] ? p : resolvePath(joined).slice(1);

  const resolved = await resolveFileFromTree(resPath);
  // console.log('CHUNK', genId(resPath), '|', root.replace(transformRoot, ''), p, '|', joined, resPath, resolved);

  const finalPath = resolved ?? p;

  let code = await getCode(transformRoot, finalPath, p.match(/.*\.[a-z]+/) ? null : p + '.jsx', p.includes('.jsx') ? p.replace('.jsx', '.js') : p.replace('.js', '.jsx'));
  // if (!builtins[p]) code = await includeRequires(join(transformRoot, finalPath), code);

  if (finalPath.endsWith('sx')) code = autoImportReact(code);

  code = await includeRequires(join(transformRoot, finalPath), code);
  const id = genId(resPath);

  if (p.endsWith('.json') || code.startsWith('{')) code = 'module.exports = ' + code;

  if (p.endsWith('css')) {
    code = `module.exports = () => {
      const el = document.createElement('style');

      el.textContent = document.createTextNode(\`${code.replaceAll('`', '\\`').replaceAll('$', '\\$').replaceAll('\\', '\\\\')}\`);

      document.head.appendChild(el);

      return () => el.remove();
    };`;
  }

  code = await replaceAsync(code, /require\.resolve\(['"`](.*?)['"`]\)/g, async (_, toRes) => '`' + await resolveFileFromTree(toRes) + '`');

  const chunk = `// ${finalPath}
let ${id} = {};
(() => {
const __dirname = '${getDir(finalPath)}';
let module = {
  exports: {}
};
let { exports } = module;

// MAP_START|${finalPath}
` + code
      // .replace(/module\.exports ?=/, `${id} =`)
      .replace('export default', `module.exports =`)
      // .replaceAll(/(module\.)?exports\.(.*?)/g, (_, _mod, key) => `${id}.${key}`)
      .replaceAll(/export const (.*?)=/g, (_, key) => `const ${key} = exports.${key}=`)
      .replaceAll(/export function (.*?)\(/g, (_, key) => `const ${key} = exports.${key} = function ${key}(`)
      .replaceAll(/export class ([^ ]*)/g, (_, key) => `const ${key} = exports.${key} = class ${key}`) +
`\n// MAP_END
${id} = module.exports;
})();`;

  if (shouldUpdateFetch) {
    fetchProgressCurrent++;
    updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);
  }

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
  const root = getDir(path);

  // console.log({ path, root });

  // log('bundling', 'file', path.replace(indexRoot, ''));

  if (code.includes('exports[moduleName] = require(`${__dirname}/${filename}`)')) { // CJS export all jank fix hack
    const base = getDir(path.replace(transformRoot + '/', '').replace('./', ''));
    const files = tree.filter(x => x.type === 'blob' && x.path.toLowerCase().startsWith(base.toLowerCase()) && !x.path.endsWith('/index.js'));
    console.log('export all', files);

    code = `module.exports = {
${(await Promise.all(files.map(async x => {
  const file = x.path.replace(base + '/', '');

  const [ chunkId, code ] = await makeChunk(root, file);
  if (!chunks[chunkId]) chunks[chunkId] = code;

  return `  '${file.split('.').slice(0, -1).join('.')}': ${chunkId}`;
}))).join(',\n')}
};`;

    console.log(code);
  }

  code = code.replaceAll(/^import type .*$/gm, '');

  code = await replaceAsync(code, /require\(["'`](.*?)["'`]\)/g, async (_, p) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, p);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return chunkId;
  });

  code = await replaceAsync(code, /import (.*) from ['"`](.*?)['"`]/g, async (_, what, where) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, where);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return `const ${what.replace('* as ', '').replaceAll(' as ', ':')} = ${chunkId}`;
  });

  code = await replaceAsync(code, /this\.loadStylesheet\(['"`](.*?)['"`]\)/g, async (_, p) => {
    const css = (await transformCSS(transformRoot, root, await getCode(root, './' + p.replace(/^.\//, '')))).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `this.loadStylesheet(\`${css}\`)`;
  });

  /* code = await replaceAsync(code, /powercord\.api\.i18n\.loadAllStrings\(.*?\)/g, async (_, p) => { // todo: actual pc i18n
    const english = (await getCode(transformRoot, './i18n/en-US.json')).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `powercord.api.i18n.loadAllStrings({ 'en-US': JSON.parse(\`${english}\`) })`;
  }); */

  return code;
};

const getDir = (url) => url.split('/').slice(0, -1).join('/');

// let root;

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
    res = tree.find((x) => x.type === 'blob' && (x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/index') || x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/_index')))?.path;
    if (!res) {
      res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/package.json'))?.path;
      if (res) {
        const package = JSON.parse(await getCode(transformRoot, './' + res));
        if (package.main.startsWith('/')) package.main = package.main.slice(1);
        if (package.main.startsWith('./')) package.main = package.main.slice(2);

        console.log('PACKAGE', package.main);

        res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/' + package.main.toLowerCase()))?.path;
      }
    }
  } else res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '')))?.path;

  const lastPart = path.split('/').pop();
  if (!res && tree.find(x => x.type === 'tree' && x.path.toLowerCase().startsWith('node_modules/' + lastPart))) {
    const depRoot = `node_modules/${lastPart}`;
    const packagePath = depRoot + '/package.json';

    const package = JSON.parse(await getCode(transformRoot, './' + packagePath));

    if (package.main.startsWith('/')) package.main = package.main.slice(1);
    if (package.main.startsWith('./')) package.main = package.main.slice(2);

    res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(depRoot.toLowerCase() + '/' + package.main.toLowerCase()))?.path;
  }

  if (!builtins[path] && (path.startsWith('powercord/') || path.startsWith('@'))) {
    console.warn('Missing builtin', path);
    lastError = `Missing builtin: ${path}`;
  } else if (!res && !builtins[path]) {
    console.warn('Failed to resolve', path);
    lastError = `Failed to resolve: ${path}`;
  }


  return res ? ('./' + res) : undefined;
};

const install = async (info, settings = undefined, disabled = false) => {
  const installStartTime = performance.now();

  lastError = '';

  let mod;
  if (info.endsWith('.plugin.js') || info.endsWith('.theme.css')) {
    mod = 'bd';
    if (info.includes('github.com/')) info = info.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '');
  }

  if (info.includes('/Condom/')) {
    if (!info.endsWith('/plugin.js')) info += (info.endsWith('/') ? '' : '/') + 'plugin.js';
    if (info.startsWith('https://github.com/')) info = info.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', '');

    mod = 'cc';
  }

  info = info.replace('https://github.com/', '');

  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let isGitHub = !info.startsWith('http');

  let subdir;
  if (isGitHub) { // todo: check
    const spl = info.split('/');
    if (spl.length > 2) { // Not just repo
      repo = spl.slice(0, 2).join('/');
      subdir = spl.slice(4).join('/');
      branch = spl[3] ?? 'HEAD';

      console.log('SUBDIR', repo, branch, subdir);
    }
  }

  const fetchSum = fetchCache.keys().filter(x => !x.includes('api.github.com') && x.includes(info.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).reduce((acc, x) => acc += x + '|' + fetchCache.get(x), '');
  const fetchHash = XXHash(fetchSum);

  let [ newCode, manifest, isTheme, _mod, autopatchResult, oldHash ] = finalCache.get(info) ?? [];
  mod =_mod ?? mod;

  log('manager.cacheload', '\ncurrent:', fetchHash, '\ncached: ', oldHash, '\nto build:', oldHash !== fetchHash || !newCode)

  if (oldHash !== fetchHash || !newCode) {
    updatePending(info, 'Treeing...');

    tree = [];
    if (isGitHub) {
      tree = JSON.parse(await fetchCache.fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=true`)).tree;

      if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

      log('bundler', 'tree', tree);
    }

    updatePending(info, 'Fetching index...');

    let indexFile = await resolveFileFromTree('index');
    let indexUrl = !isGitHub ? info : `https://raw.githubusercontent.com/${repo}/${branch}/${subdir ? (subdir + '/') : ''}${indexFile ? indexFile.slice(2) : 'index.js'}`;
    let root = getDir(indexUrl);
    let indexCode;

    chunks = {}; // reset chunks

    if (!mod) {
      if (await resolveFileFromTree('velocity_manifest.json')) mod = 'vel';
      if (await resolveFileFromTree('manifest.json')) mod = 'pc';
      if (await resolveFileFromTree('goosemodModule.json')) mod = 'gm';
      if (await resolveFileFromTree('cumcord_manifest.json')) mod = 'cc';
    }


    isTheme = info.endsWith('.theme.css') || await resolveFileFromTree('powercord_manifest.json');
    if (isTheme) {
      let skipTransform = false;
      const fullRoot = root;

      switch (mod) {
        case 'bd':
          indexUrl = join(root, './' + info.split('/').slice(-1)[0]);
          indexCode = await getCode(root, './' + info.split('/').slice(-1)[0]);
          manifest = [...indexCode.matchAll(/^ *\* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
          skipTransform = true;

          break;

        default: // default to pc
          mod = 'pc';

          manifest = JSON.parse(await getCode(root, './powercord_manifest.json'));

          const main = manifest.theme.replace(/^\.?\//, '');
          indexUrl = join(root, './' + main);
          indexCode = await getCode(root, './' + main);
          root = getDir(join(root, './' + main));
          skipTransform = main.endsWith('.css');

          // subdir = getDir(main);
          // if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

          break;
      }

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transformCSS(fullRoot, root, indexCode, skipTransform, true);
    } else {
      switch (mod) {
        case 'pc':
          manifest = JSON.parse(await getCode(root, './manifest.json'));

          if (manifest.id && manifest.authors && manifest.main) {
            mod = 'un';

            manifest.author = manifest.authors.map(x => x.name).join(', ');

            const main = await resolveFileFromTree('src/index');
            indexFile = './' + main.split('/').pop();
            indexUrl = join(root, main);
            root = getDir(indexUrl);

            subdir = getDir(main).slice(2);
            tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });
          } else if (manifest.authors && !manifest.main && manifest.version) {
            mod = 'em';

            manifest.author = manifest.authors.map(x => x.name).join(', ');

            const main = await resolveFileFromTree('src/index');
            indexFile = './' + main.split('/').pop();
            indexUrl = join(root, main);
            root = getDir(indexUrl);

            subdir = getDir(main).slice(2);
            tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });
          }

          if (typeof manifest.author === 'object') manifest.author = manifest.author.name;

          indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

          if (indexCode.includes('extends UPlugin')) mod = 'ast';
          if (indexCode.includes('@rikka')) mod = 'rk';
          if (indexCode.includes('@vizality')) mod = 'vz';
          if (indexCode.includes('aliucord')) mod = 'ac';

          if (mod === 'em') {
            indexCode = indexCode.replace(/registerPlugin\((.*?)\)/, (_, v) => `module.exports = ${v};`);
            indexCode = indexCode.replace(/^import (.*?) from ['"`]\.\.\/manifest\.json['"`].*$/m, (_, v) => `const ${v} = {};`);
          }

          break;

        case 'gm':
          manifest = JSON.parse(await getCode(root, './goosemodModule.json'));

          if (typeof manifest.authors === 'string') manifest.authors = [ manifest.authors.split(' (')[0] ];
          manifest.author = (await Promise.all(manifest.authors.map(x => x.length === 18 ? goosemod.webpackModules.findByProps('getUser', 'fetchCurrentUser').getUser(x) : x))).join(', ');
          break;

        case 'bd': // read from comment in code
          indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

          manifest = [...indexCode.matchAll(/^ *\* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});

          if (indexCode.includes('DrApi')) mod = 'dr';

          break;

        case 'vel': {
          manifest = JSON.parse(await getCode(root, './velocity_manifest.json'));

          const main = './' + manifest.main.replace('./', '');
          indexFile = './' + main.split('/').pop();
          indexUrl = join(root, './' + main);
          root = getDir(indexUrl);

          subdir = getDir(main).slice(2);
          if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

          break;
        }

        case 'cc': {
          if (info.endsWith('/plugin.js')) {
            manifest = JSON.parse(await getCode(root, './plugin.json'));

            indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));
            indexCode = 'module.exports = ' + indexCode;
          } else {
            manifest = JSON.parse(await getCode(root, './cumcord_manifest.json'));

            const main = './' + manifest.file.replace('./', '');
            indexFile = './' + main.split('/').pop();
            indexUrl = join(root, main);
            root = getDir(indexUrl);

            subdir = getDir(main).slice(2);
            if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

            break;
          }
        }

        default: {
          if (!indexCode) indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));
          if (indexCode.includes('demon.')) {
            mod = 'dc';

            manifest = indexCode.match(/meta: {([\s\S]*?)}/)[1].split('\n').slice(1, -1)
              .reduce((acc, x) => {
                let [ key, val ] = x.split(':');

                key = key.trim();
                val = val.trim();

                if (val.endsWith(',')) val = val.slice(0, -1);
                if (val.startsWith('\'') || val.startsWith('"')) val = val.slice(1, -1);

                if (key === 'desc') key = 'description';

                acc[key] = val;

                return acc;
              }, {});
          }

          if (!mod) console.warn('Failed to identify mod');
        }
      }

      if (!indexCode) indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transform(indexUrl, indexCode, mod);

      isTheme = false;
    }

    [ newCode, autopatchResult ] = await Autopatch(info, manifest, newCode);

    finalCache.set(info, [ newCode, manifest, isTheme, mod, autopatchResult, fetchHash ]);
  }

  updatePending(info, 'Executing...');
  // await new Promise((res) => setTimeout(res, 900000));

  let plugin;
  if (isTheme) {
    let el;

    const updateVar = (name, val) => {
      let toSet = val;
      if (name.toLowerCase().includes('font') && val[0] === '%') toSet = 'Whitney';
      document.body.style.setProperty(name, toSet);
    };

    plugin = {
      _topaz_start: () => {
        if (el) el.remove();
        el = document.createElement('style');
        el.appendChild(document.createTextNode(newCode)); // Load the stylesheet via style element w/ CSS text

        document.body.appendChild(el);

        const themeSettingsVars = JSON.parse(Storage.get(info + '_theme_settings', '{}'));
        for (const x in themeSettingsVars) updateVar(x, themeSettingsVars[x]);
      },

      _topaz_stop: () => {
        el.remove();

        const themeSettingsVars = JSON.parse(Storage.get(info + '_theme_settings', '{}'));
        for (const x in themeSettingsVars) document.body.style.removeProperty(x);
      },

      __theme: true
    };

    const discordVars = [ '--header-primary', '--header-secondary', '--text-normal', '--text-muted', '--text-link', '--channels-default', '--interactive-normal', '--interactive-hover', '--interactive-active', '--interactive-muted', '--background-primary', '--background-secondary', '--background-secondary-alt', '--background-tertiary', '--background-accent', '--background-floating', '--background-mobile-primary', '--background-mobile-secondary', '--background-modifier-hover', '--background-modifier-active', '--background-modifier-selected', '--background-modifier-accent', '--background-mentioned', '--background-mentioned-hover', '--background-message-hover', '--background-help-warning', '--background-help-info', '--scrollbar-thin-thumb', '--scrollbar-thin-track', '--scrollbar-auto-thumb', '--scrollbar-auto-track', '--scrollbar-auto-scrollbar-color-thumb', '--scrollbar-auto-scrollbar-color-track', '--elevation-stroke', '--elevation-low', '--elevation-medium', '--elevation-high', '--logo-primary', '--focus-primary', '--radio-group-dot-foreground', '--guild-header-text-shadow', '--channeltextarea-background', '--activity-card-background', '--textbox-markdown-syntax', '--deprecated-card-bg', '--deprecated-card-editable-bg', '--deprecated-store-bg', '--deprecated-quickswitcher-input-background', '--deprecated-quickswitcher-input-placeholder', '--deprecated-text-input-bg', '--deprecated-text-input-border', '--deprecated-text-input-border-hover', '--deprecated-text-input-border-disabled', '--deprecated-text-input-prefix' ];
    class ThemeSettings extends React.PureComponent {
      constructor(props) {
        super(props);

        this.state = {};
        this.state.store = JSON.parse(Storage.get(info + '_theme_settings', '{}'));

        this.state.rawVariables = this.props.code.match(/--([^*!\n}]*): ([^*\n}]*);/g) || [];
        this.state.variables = this.state.rawVariables.map((x) => {
          const spl = x.split(':');

          const name = spl[0].trim();
          const val = spl.slice(1).join(':').trim().slice(0, -1).replace(' !important', '');

          return [
            name,
            this.state.store[name] ?? val,
            val
          ];
        }).filter((x, i, s) => !discordVars.includes(x[0]) && !x[1].includes('var(') && !x[0].includes('glasscord') && s.indexOf(s.find((y) => y[0] === x[0])) === i);

        this.state.background = this.state.variables.find(x => (x[0].toLowerCase().includes('background') || x[0].toLowerCase().includes('bg') || x[0].toLowerCase().includes('wallpaper')) && !x[0].toLowerCase().includes('profile') && x[2].includes('http'));
        this.state.homeButton = this.state.variables.find(x => (x[0].toLowerCase().includes('home')) && x[2].includes('http'));
        this.state.fontPrimary = this.state.variables.find(x => (x[0].toLowerCase().includes('font')) && x[2].includes('sans-serif'));

        this.state.shouldShow = this.state.background || this.state.homeButton || this.state.fontPrimary;
      }

      render() {
        console.log(this.state);

        const saveVar = (name, val) => {
          this.state.store[name] = val;
          Storage.set(info + '_theme_settings', JSON.stringify(this.state.store));
        };

        const toggle = (name, desc, v) => React.createElement(goosemod.webpackModules.findByDisplayName('SwitchItem'), {
          note: desc,
          value: !v[1].startsWith('%'),

          className: 'topaz-theme-setting-toggle',

          onChange: x => {
            if (x) v[1] = v[1].slice(1);
              else v[1] = '%' + v[1];
            updateVar(...v);

            this.forceUpdate();
            saveVar(...v);
          }
        }, name);

        const text = (name, desc, v) => React.createElement(goosemod.settings.Items['text-input'], {
          text: name,
          subtext: desc,
          initialValue: () => v[1].replace(/url\(['"`]?(.*?)['"`]?\)/, (_, inner) => inner),
          oninput: x => {
            if (v[1].startsWith('url(')) x = 'url(' + x + ')';
            v[1] = x;

            updateVar(...v);
            saveVar(...v);
          }
        });

        const toggleable = (v, toggleName, toggleDesc, textName, textDesc) => [
          v && toggle(toggleName, toggleDesc, v),
          v && !v[1].startsWith('%') && text(textName, textDesc, v),
        ];

        return [
          ...toggleable(this.state.background, 'Background', 'Enable theme\'s custom background', 'Background URL'),
          ...toggleable(this.state.homeButton, 'Home Button', 'Enable theme\'s custom home button', 'Image URL'),
          ...toggleable(this.state.fontPrimary, 'Font', 'Enable theme\'s custom font', 'Font Name'),
        ];
      }
    }

    const setProps = { code: newCode };
    if (new ThemeSettings(setProps).state.shouldShow) plugin.__settings = {
      render: ThemeSettings,
      props: setProps
    };
  } else {
    const execContainer = new Onyx(info, manifest, transformRoot);
    let PluginClass = execContainer.eval(newCode);

    switch (mod) {
      case 'vel':
      case 'gm':
      case 'cc':
      case 'em':
      case 'dc':
        if (mod === 'cc' && typeof PluginClass === 'function') PluginClass = PluginClass({ persist: { ghost: {} } });

        plugin = PluginClass;
        if (mod === 'vel') plugin = plugin.Plugin;
        break;

      case 'bd':
        if (!PluginClass.prototype?.start && !PluginClass.start) PluginClass = PluginClass();

        if (PluginClass.prototype) {
          PluginClass.prototype.entityID = PluginClass.name ?? info; // Setup internal metadata
          PluginClass.prototype.manifest = manifest;
          PluginClass.prototype.data = manifest;

          plugin = new PluginClass();
        } else plugin = PluginClass;

        break;

      default:
        PluginClass.prototype.entityID = PluginClass.name ?? info; // Setup internal metadata
        PluginClass.prototype.manifest = manifest;
        PluginClass.prototype.data = manifest;

        plugin = new PluginClass();
    }

    switch (mod) {
      case 'bd':
        plugin._topaz_start = plugin.start;
        plugin._topaz_stop = plugin.stop;

        for (const x of [ 'name', 'description', 'version', 'author' ]) manifest[x] = plugin['get' + x.toUpperCase()[0] + x.slice(1)]?.() ?? manifest[x] ?? '';

        if (plugin.load) plugin.load();

        if (plugin.getSettingsPanel) plugin.__settings = {
          render: class BDSettingsWrapper extends React.PureComponent {
            constructor(props) {
              super(props);

              this.ref = React.createRef();
              this.ret = plugin.getSettingsPanel();
            }

            componentDidMount() {
              if (this.ret instanceof Node) this.ref.current.appendChild(this.ret);
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

      case 'un':
        if (plugin.getSettingsPanel) plugin.__settings = {
          render: plugin.getSettingsPanel(),
          props: {
            settings: plugin.settings
          }
        };

        break;

      case 'vel':
        plugin._topaz_start = () => plugin.onStart();
        plugin._topaz_stop = () => plugin.onStop();

        const SettingComps = eval(`const module = { exports: {} };\n` + builtins['powercord/components/settings'] + `\nmodule.exports`);
        const saveVelSettings = (save = true) => {
          plugin.settings.store = { ...plugin.settings };
          delete plugin.settings.store.store;

          if (save) savePlugins();
        };

        plugin.settings = {};
        if (settings) plugin.settings = settings;
        saveVelSettings(false);

        if (plugin.getSettingsPanel) plugin.__settings = {
          render: class VelocitySettingsWrapper extends React.PureComponent {
            constructor(props) {
              super(props);

              this.ret = plugin.getSettingsPanel();
            }

            render() {
              return React.createElement('div', {

              },
                ...this.ret.map(x => {
                  switch (x.type) {
                    case 'input':
                      return React.createElement(SettingComps.TextInput, {
                        note: x.note,
                        defaultValue: plugin.settings[x.setting] ?? x.placeholder,
                        required: true,
                        onChange: val => {
                          plugin.settings[x.setting] = val;
                          saveVelSettings();

                          x.action(val);
                        }
                      }, x.name);
                  }
                })
              );
            }
          }
        };

        break;

      case 'dr':
        plugin._topaz_start = plugin.onStart;
        plugin._topaz_stop = plugin.onStop;

        plugin.onLoad();

        break;

      case 'cc':
        plugin._topaz_start = () => plugin.onLoad?.();
        plugin._topaz_stop = () => plugin.onUnload?.();

        break;

      case 'em':
        plugin._topaz_start = () => plugin.onStart?.();
        plugin._topaz_stop = () => plugin.onStop?.();

        break;

      case 'dc':
        plugin._topaz_start = () => {
          plugin.__dcStartOut = plugin.onStart?.();
        };

        plugin._topaz_stop = () => {
          plugin.onStop?.(plugin.__dcStartOut);
        };

        break;
    }

    if (!manifest.name && PluginClass.name) manifest.name = PluginClass.name;
    if (!manifest.author && isGitHub) manifest.author = repo.split('/')[0];
  }

  plugins[info] = plugin;

  if (!plugin.entityID) plugin.entityID = info; // Re-set metadata for themes and assurance
  plugin.__entityID = info;
  plugin.manifest = manifest;

  plugin.__enabled = !disabled;
  plugin.__mod = mod;
  plugin.__root = transformRoot;
  plugin.__autopatch = autopatchResult;

  if (!disabled) plugin._topaz_start();

  log('install', `installed ${info}! took ${(performance.now() - installStartTime).toFixed(2)}ms`);

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
    case 'vel': return 'velocity';
    case 'un': return 'unbound';
    case 'ast': return 'astra';
    case 'dr': return 'drdiscord';
    case 'cc': return 'cumcord';
    case 'rk': return 'rikka';
    case 'vz': return 'vizality';
    case 'em': return 'enmity';
    case 'dc': return 'demoncord';
    case 'ac': return 'aliucord';
  }
};

const displayMod = (mod) => {
  switch (mod) {
    case 'pc': return 'Powercord';
    case 'bd': return 'BetterDiscord';
    case 'gm': return 'GooseMod';
    case 'vel': return 'Velocity';
    case 'un': return 'Unbound';
    case 'ast': return 'Astra';
    case 'dr': return 'Discord Re-envisioned';
    case 'cc': return 'Cumcord';
    case 'rk': return 'Rikka';
    case 'vz': return 'Vizality';
    case 'em': return 'Enmity';
    case 'dc': return 'Demoncord';
    case 'ac': return 'Aliucord (RN)';
  }
};

const mapifyBuiltin = async (builtin) => {
  return `// MAP_START|${builtin}
${await includeRequires('', await builtins[builtin])}
// MAP_END\n\n`
};

let transformRoot;
const transform = async (path, code, mod) => {
  fetchProgressCurrent = 0;
  fetchProgressTotal = 0;
  lastError = '';

  transformRoot = path.split('/').slice(0, -1).join('/');

  if (path.endsWith('sx')) code = autoImportReact(code);

  let indexCode = await includeRequires(path, code);

  // do above so added to chunks
  const subGlobal = ((code.includes('ZeresPluginLibrary') || code.includes('ZLibrary')) ? await mapifyBuiltin('betterdiscord/libs/zeres') : '')
    + (code.includes('BDFDB_Global') ? await mapifyBuiltin('betterdiscord/libs/bdfdb') : '');

  let out = await mapifyBuiltin(fullMod(mod) + '/global') +
  Object.values(chunks).join('\n\n') + '\n\n' +
  subGlobal +
    `// MAP_START|${'.' + path.replace(transformRoot, '')}
${replaceLast(indexCode, 'export default', 'module.exports =')
  .replaceAll(/export const (.*?)=/g, (_, key) => `const ${key} = module.exports.${key}=`)
  .replaceAll(/export function (.*?)\(/g, (_, key) => `const ${key} = module.exports.${key} = function ${key}(`)
  .replaceAll(/export class ([^ ]*)/g, (_, key) => `const ${key} = module.exports.${key} = class ${key}`)
}
// MAP_END`;

  if (mod === 'dr') out = replaceLast(out, 'return class ', 'module.exports = class ');

  console.log({ pre: out });

  updatePending(null, 'Transforming...');

  lastError = '';

  try {
    out = sucrase.transform(out, { transforms: [ "typescript", "jsx" ], disableESTransforms: true }).code;
  } catch (e) {
    console.error('transform', e.message, out.split('\n')[parseInt(e.message.match(/\(([0-9]+):([0-9]+)\)/)[1])]);
    throw e;
  }

  out = `(function () {
${out}
})();`;

  console.log({ final: out });

  return out;
};

const topazSettings = JSON.parse(Storage.get('settings') ?? 'null') ?? {
  pluginSettingsSidebar: false,
  simpleUI: false,
  modalPages: false
};

const savePlugins = () => !topaz.__reloading && Storage.set('plugins', JSON.stringify(Object.keys(plugins).reduce((acc, x) => { acc[x] = plugins[x].settings?.store ?? {}; return acc; }, {})));

const setDisabled = (key, disabled) => {
  const store = JSON.parse(Storage.get('disabled') ?? '{}');

  if (disabled) {
    store[key] = true;
  } else {
    store[key] = undefined;
    delete store[key];
  }

  Storage.set('disabled', JSON.stringify(store));
};

const purgeCacheForPlugin = (info) => {
  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let isGitHub = !info.startsWith('http');

  let subdir;
  if (isGitHub) { // todo: check
    const spl = info.split('/');
    if (spl.length > 2) { // Not just repo
      repo = spl.slice(0, 2).join('/');
      subdir = spl.slice(4).join('/');
      branch = spl[3] ?? 'HEAD';
    }
  }

  if (isGitHub && repo) fetchCache.remove(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=true`); // remove gh api cache

  finalCache.remove(info); // remove final cache
  fetchCache.keys().filter(x => x.includes(info.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).forEach(y => fetchCache.remove(y)); // remove fetch caches
};

const purgePermsForPlugin = (info) => {
  const store = JSON.parse(Storage.get('permissions') ?? '{}');

  store[info] = undefined;
  delete store[info];

  Storage.set('permissions', JSON.stringify(store));
};


window.topaz = {
  version: topaz.version,
  debug: topaz.debug,
  settings: topazSettings,
  storage: Storage,

  install: async (info) => {
    const [ manifest ] = await install(info);

    // log('install', `installed ${info}! took ${(performance.now() - installStartTime).toFixed(2)}ms`);

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

      topaz.storage.keys().filter(x => x.startsWith(info)).forEach(x => topaz.storage.delete(x)); // remove keys starting with info

      savePlugins();
      setDisabled(info, false); // Remove from disabled list
    }
  },
  uninstallAll: () => Object.keys(plugins).forEach((x) => topaz.uninstall(x)),

  enable: (info) => {
    if (!plugins[info]) return log('enable', 'plugin not installed');
    log('enable', info);

    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_start();
    } catch (e) {
      console.error('START', e);
      // notify user?
    }

    plugins[info].__enabled = true;

    setDisabled(info, false);
  },
  disable: (info) => {
    if (!plugins[info]) return log('disable', 'plugin not installed');
    log('disable', info);

    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_stop();
    } catch (e) {
      console.error('STOP', e);
      // notify user?
    }

    plugins[info].__enabled = false;

    setDisabled(info, true);
  },
  reload: (info) => {
    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_stop();
    } catch (e) {
      console.error('STOP', e);
      // notify user?
    }

    delete plugins[info];

    setTimeout(() => topaz.install(info), 200);
  },

  purge: () => {
    topaz.uninstallAll();
    for (const snippet in snippets) stopSnippet(snippet);

    cssEl.remove();
    attrs.remove();

    if (typeof Terminal !== 'undefined') Terminal();

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
    finalCache,
    builtins
  },

  reloadTopaz: async () => {
    eval(await (await fetch(`http://localhost:1337/src/index.js`, { cache: 'no-store' })).text());
  },

  log
};

const cssEl = document.createElement('style');
cssEl.appendChild(document.createTextNode(await (await fetch('http://localhost:1337/src/index.css')).text()));
document.head.appendChild(cssEl);

log('init', `topaz loaded! took ${(performance.now() - initStartTime).toFixed(0)}ms`);

(async () => {
  const disabled = JSON.parse(Storage.get('disabled') ?? '{}');

  for (const p in pluginsToInstall) {
    let settings = pluginsToInstall[p];
    if (typeof settings === 'object' && Object.keys(settings).length === 0) settings = undefined; // {} -> undefined

    try {
      await install(p, settings, disabled[p] ?? false);
    } catch (e) {
      console.error('Init install fail', p, e);
    }
  }

  try { updateOpenSettings(); } catch { }
})();

const activeSnippets = {};
const startSnippet = async (file, content) => {
  let code;

  if (file.endsWith('css')) {
    code = await transformCSS('https://discord.com/channels/@me', 'https://discord.com/channels/@me', content, !file.endsWith('scss'), false);

    const cssEl = document.createElement('style');
    cssEl.appendChild(document.createTextNode(code));
    document.body.appendChild(cssEl);

    activeSnippets[file] = () => cssEl.remove();
  } else if (file.includes('.js')) {
    code = await transform('https://discord.com/channels/@me', content, 'pc');
    const ret = eval(`const __entityID = 'snippet';
\n` + code);

    activeSnippets[file] = () => {}; // no way to stop?
    if (typeof ret === 'function') activeSnippets[file] = ret; // if returned a function, guess it's a stop handler
  }
};
const stopSnippet = (file) => activeSnippets[file]?.();


const snippets = JSON.parse(Storage.get('snippets') ?? '{}');
const snippetsToggled = JSON.parse(Storage.get('snippets_toggled') ?? '{}');
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
const Tooltip = goosemod.webpackModules.findByDisplayName('Tooltip');

const TextAndChild = goosemod.settings.Items['text-and-child'];
const TextAndButton = goosemod.settings.Items['text-and-button'];
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
    const { manifest, repo, state, substate, settings, entityID, mod, isTheme, autopatch } = this.props;

    return React.createElement(TextAndChild, {
      text: !manifest ? repo : [
        !mod ? null : React.createElement(Tooltip, {
          text: displayMod(mod),
          position: 'top'
        }, ({ onMouseLeave, onMouseEnter }) => React.createElement('span', {
            className: 'topaz-tag',

            onMouseEnter,
            onMouseLeave
          }, mod.toUpperCase()),
        ),

        autopatch && autopatch.changes.length > 0 && React.createElement(Tooltip, {
          position: 'top',
          color: 'primary',
          tooltipClassName: 'topaz-nomax-tooltip',

          text: `Autopatched${autopatch.changes.length > 1 ? ` (${autopatch.changes.length} changes)` : ''}`
        }, ({
          onMouseLeave,
          onMouseEnter
        }) => React.createElement(goosemod.webpackModules.findByDisplayName('BugCatcher'), {
          // className: 'topaz-permission-danger-icon',
          className: 'topaz-autopatcher-icon',
          width: 20,
          height: 20,

          onMouseEnter,
          onMouseLeave
        })),

        manifest.name,

        manifest.version ? React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '4px'
          }
        }, 'v' + manifest.version) : null,

        manifest.author && React.createElement('span', {
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
          tooltipText: 'Settings',
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

            const files = fetchCache.keys().filter(x => !x.includes('api.github.com') && x.includes(entityID.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).reduce((acc, x) => { acc[x.replace(plugin.__root + '/', '')] = fetchCache.get(x); return acc; }, {});

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
              },
              'Clipboard': {
                'Write to your clipboard': 'clipboard_write',
                'Read from your clipboard': 'clipboard_read'
              }
            };

            const givenPermissions = JSON.parse(Storage.get('permissions') ?? '{}')[entityID] ?? {};

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
                  const store = JSON.parse(Storage.get('permissions') ?? '{}');

                  store[entityID] = {};

                  Storage.set('permissions', JSON.stringify(store));

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
                          const store = JSON.parse(Storage.get('permissions') ?? '{}');
                          if (!store[entityID]) store[entityID] = {};

                          store[entityID][perms[category][perm]] = x;

                          Storage.set('permissions', JSON.stringify(store));

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

const saveTopazSettings = () => Storage.set('settings', JSON.stringify(topazSettings));

class TopazSettings extends React.PureComponent {
  render() {
    return React.createElement('div', {

    },
      React.createElement(FormTitle, {
        tag: 'h5',
        className: Margins.marginBottom8,
      }, 'Appearance'),

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

      React.createElement(FormTitle, {
        tag: 'h5',
        className: Margins.marginBottom8,
      }, 'Actions'),

      React.createElement(TextAndButton, {
        text: 'Purge Caches',
        subtext: 'Purge Topaz\'s caches completely',
        buttonText: 'Purge',

        onclick: () => {
          fetchCache.purge();
          finalCache.purge();
        }
      }),

      React.createElement(FormTitle, {
        tag: 'h5',
        className: Margins.marginBottom8,
      }, 'Backup'),

      React.createElement(TextAndButton, {
        text: 'Download Backup',
        subtext: 'Download a backup file of your Topaz plugins, themes, and settings',
        buttonText: 'Download',

        onclick: () => {
          const toSave = JSON.stringify(topaz.storage.keys().filter(x => !x.startsWith('cache_')).reduce((acc, x) => {
            acc[x] = topaz.storage.get(x);
            return acc;
          }, {}));

          const el = document.createElement("a");
          el.style.display = 'none';

          const file = new Blob([ toSave ], { type: 'application/json' });

          el.href = URL.createObjectURL(file);
          el.download = `topaz_backup.json`;

          document.body.appendChild(el);

          el.click();
          el.remove();
        }
      }),

      React.createElement(TextAndButton, {
        text: 'Restore Backup',
        subtext: 'Restores your Topaz setup from a backup file. **Only load backups you trust**',
        buttonText: 'Restore',

        onclick: async () => {
          const el = document.createElement('input');
          el.style.display = 'none';
          el.type = 'file';

          el.click();

          await new Promise(res => { el.onchange = () => res(); });

          const file = el.files[0];
          if (!file) return;

          const reader = new FileReader();

          reader.onload = () => {
            const obj = JSON.parse(reader.result);

            for (const k in obj) {
              topaz.storage.set(k, obj[k]);
            }

            setTimeout(() => location.reload(), 500);
          };

          reader.readAsText(file);
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
      Storage.set('snippets', JSON.stringify(snippets));
      Storage.set('snippets_toggled', JSON.stringify(snippetsToggled));
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
        fileIcons: true,

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

          if (activeSnippet === old) activeSnippet = val;

          stopSnippet(old);
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

const autocompleteFiltering = JSON.parse(Storage.get('autocomplete_filtering', 'null')) ?? {
  mods: {}
};

class Settings extends React.PureComponent {
  render() {
    const textInputHandler = (inp, init = false) => {
      const addFilterPopout = () => {
        if (document.querySelector('#topaz-repo-filtering')) return; // already open

        const popout = document.createElement('div');
        popout.id = 'topaz-repo-filtering';
        popout.className = ScrollerClasses.thin + (topazSettings.simpleUI ? ' topaz-simple' : '');

        const autoPos = autocomplete.getBoundingClientRect();

        popout.style.top = autoPos.top + 'px';
        popout.style.left = autoPos.right + 8 + 'px';

        document.body.appendChild(popout);

        const regen = () => textInputHandler(el.value ?? '');

        const mods = Object.keys(recom).reduce((acc, x) => {
          const mod = x.split('%')[0].toLowerCase();
          if (!acc.includes(mod)) acc.push(mod);
          return acc;
        }, []);

        class FilterPopout extends React.PureComponent {
          render() {
            return React.createElement(React.Fragment, {},
              React.createElement('h5', {}, 'Filters'),
              React.createElement(FormTitle, {
                tag: 'h5'
              }, 'Mods'),

              ...mods.map(x => React.createElement(goosemod.webpackModules.findByDisplayName('SwitchItem'), {
                value: autocompleteFiltering.mods[x] !== false,
                onChange: y => {
                  autocompleteFiltering.mods[x] = y;

                  this.forceUpdate();
                  regen();

                  Storage.set('autocomplete_filtering', JSON.stringify(autocompleteFiltering));
                }
              }, displayMod(x)))
            );
          }
        }

        ReactDOM.render(React.createElement(FilterPopout), popout);
      };

      const removeFilterPopout = () => {
        document.querySelector('#topaz-repo-filtering')?.remove?.();
      };

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
        const placeholder = 'GitHub repo / URL';
        el.placeholder = placeholder;

        el.onkeydown = async (e) => {
          if (e.keyCode !== 13) return;

          const info = el.value;
          el.value = '';
          // el.value = 'Installing...';

          install(info);
        };

        el.onfocus = () => {
          textInputHandler(el.value ?? '');

          document.onclick = e => {
            if (e.target.placeholder !== placeholder && !e.path.some(x => x.id === 'topaz-repo-autocomplete') && !e.path.some(x => x.id === 'topaz-repo-filtering')) setTimeout(() => {
              removeFilterPopout();
              document.querySelector('#topaz-repo-autocomplete').style.display = 'none';

              document.onclick = null;
            }, 10);
          };
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
      const matching = Object.keys(recom).filter((x) => !plugins[infoFromRecom(recom[x])] && fuzzySearch.test(x) && autocompleteFiltering.mods[x.split('%')[0].toLowerCase()] !== false);

      if (!init) {
        ReactDOM.render(React.createElement(React.Fragment, {},
          React.createElement('h5', {},
            'Popular ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes'),

            React.createElement(PanelButton, {
              icon: goosemod.webpackModules.findByDisplayName('Filter'),
              tooltipText: 'Filter',

              onClick: () => {
                if (document.querySelector('#topaz-repo-filtering')) {
                  removeFilterPopout();
                  document.querySelector('[aria-label="Filter"]').classList.remove('active');
                } else {
                  addFilterPopout();
                  document.querySelector('[aria-label="Filter"]').classList.add('active');
                }
              }
            })
          ),

          ...matching.map(x => {
            const [ mod, name, author ] = x.split('%');

            let place = recom[x];
            if (place.length > 40) place = place.slice(0, 40) + '...';

            return React.createElement('div', {
              className: 'title-2dsDLn',
              onClick: () => {
                autocomplete.style.display = 'none';
                el.value = '';
                install(recom[x]);
              }
            },
              React.createElement('span', {
                className: 'topaz-tag tag-floating'
              }, mod),

              ' ' + name + ' ',

              author !== 'undefined' && React.createElement('span', {
                className: 'description-30xx7u'
              }, 'by '),
              author !== 'undefined' && author.split('#')[0],

              React.createElement('span', {
                className: 'code-style'
              }, place)
            );
          })
        ), autocomplete);

        autocomplete.style.display = 'block';

        if (!document.querySelector('#topaz-repo-filtering')) document.querySelector('[aria-label="Filter"]').classList.remove('active');
          else document.querySelector('[aria-label="Filter"]').classList.add('active');
      } else {
        autocomplete.style.display = 'none';
      }
    };

    setTimeout(() => {
      let tmpEl = document.querySelector('.topaz-settings .input-2g-os5');
      if (tmpEl && !tmpEl.placeholder) textInputHandler('', true);
    }, 10);

    const modules = Object.values(plugins).filter((x) => selectedTab === 'PLUGINS' ? !x.__theme : x.__theme);

    return React.createElement('div', {
      className: 'topaz-settings' + (topazSettings.simpleUI ? ' topaz-simple' : '')
    },
      React.createElement(FormTitle, {
        tag: 'h1'
      }, 'Topaz',
        React.createElement('span', {
          className: 'description-30xx7u topaz-version'
        }, topaz.version),

        React.createElement(HeaderBarContainer.Divider),

        React.createElement(TabBar, {
          selectedItem: selectedTab,

          type: TabBarClasses1.topPill,
          className: TabBarClasses2.tabBar,

          onItemSelect: (x) => {
            if (x === 'RELOAD' || x === 'CHANGELOG') return;

            const textInputEl = document.querySelector('.topaz-settings .input-2g-os5');
            if (textInputEl) textInputs[selectedTab] = textInputEl.value;

            selectedTab = x;
            this.forceUpdate();

            if (textInputEl) textInputEl.value = textInputs[x];
          }
        },
          React.createElement(TabBar.Item, {
            id: 'PLUGINS',
            'aria-label': 'Plugins',

            className: TabBarClasses2.item
          }, 'Plugins'),
          React.createElement(TabBar.Item, {
            id: 'THEMES',
            'aria-label': 'Themes',

            className: TabBarClasses2.item
          }, 'Themes'),
          React.createElement(TabBar.Item, {
            id: 'SNIPPETS',
            'aria-label': 'Snippets',

            className: TabBarClasses2.item
          }, 'Snippets'),
          React.createElement(TabBar.Item, {
            id: 'SETTINGS',
            'aria-label': 'Settings',

            className: TabBarClasses2.item
          }, 'Settings'),

          React.createElement(TabBar.Item, {
            id: 'RELOAD',
            'aria-label': 'Reload',

            className: TabBarClasses2.item
          }, React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Retry'),
            tooltipText: 'Reload Topaz',
            onClick: async () => {
              topaz.reloadTopaz();
            }
          })),

          React.createElement(TabBar.Item, {
            id: 'CHANGELOG',
            'aria-label': 'Changelog',

            className: TabBarClasses2.item
          }, React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Clock'),
            tooltipText: 'Topaz Changelog',
            onClick: async () => {
              openChangelog();
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

        React.createElement(FormTitle, {
          tag: 'h5',
          className: Margins.marginBottom8,
        },
          modules.length + ' Installed',

          modules.length > 0 ? React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Trash'),
            tooltipText: 'Uninstall All',
            onClick: async () => {
              if (!(await goosemod.confirmDialog('Uninstall', 'Uninstall All ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes'), 'Are you sure you want to uninstall all ' + (selectedTab === 'PLUGINS' ? 'plugins' : 'themes') + ' from Topaz?'))) return;
              for (const x of modules) topaz.uninstall(x.__entityID);
            }
          }) : null,

          modules.length > 0 ? React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Copy'),
            tooltipText: 'Copy All',
            onClick: async () => {
              const links = modules.map(({ __entityID }) => {
                let link = __entityID.includes('http') ? __entityID : `https://github.com/${__entityID}`;
                if (link.includes('raw.githubusercontent.com')) link = 'https://github.com/' + [...link.split('/').slice(3, 5), 'blob', ...link.split('/').slice(5)].join('/'); // raw github links -> normal

                return link;
              });

              goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy').copy(links.join('\n'));
            }
          }) : null,
        ),

        React.createElement(Divider),

        ...modules.map(({ entityID, __enabled, manifest, __entityID, __settings, __mod, __theme, __autopatch }) => React.createElement(Plugin, {
          manifest,
          entityID: __entityID,
          enabled: __enabled,
          settings: __settings,
          autopatch: __autopatch,
          mod: __mod,
          isTheme: !!__theme,
          onUninstall: async () => {
            const rmPending = addPending({ repo: __entityID, state: 'Uninstalling...' });
            this.forceUpdate();

            await topaz.uninstall(__entityID);
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

const Terminal = eval(await (await fetch('http://localhost:1337/src/terminal.js')).text());

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