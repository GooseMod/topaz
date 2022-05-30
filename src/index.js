(async () => {
const topazVersion = 128; // Auto increments on build

let pluginsToInstall = JSON.parse(localStorage.getItem('topaz_plugins') ?? '{}');
if (window.topaz) { // live reload handling
  topaz.__reloading = true;
  topaz.purge(); // fully remove topaz (plugins, css, etc)

  setTimeout(() => updateOpenSettings(), 1000);
}

const initStartTime = performance.now();

const sucrase = eval(await (await fetch('http://localhost:1337/src/sucrase.js')).text());
const grass = await eval(await (await fetch('http://localhost:1337/src/grass.js')).text());

const includeImports = async (root, code, updateProgress) => {
  if (updateProgress) {
    downloadingProgress++;
    updatePending(null, `Fetching (${downloadingProgress})...`);
  }

  code = code.replaceAll(/\/\*[\s\S]*?\*\//gm, '').replaceAll('/*', '').replaceAll('*/', '');

  return await replaceAsync(code, /@(import|use|forward) (url\()?['"](.*?)['"]\)?;?/g, async (_, _1, _2, path) => {
    const isExternal = path.startsWith('http');
    const basePath = (path.startsWith('./') ? '' : './') + path;
    // console.log(isExternal, isExternal ? path : join(root, basePath));

    let code;
    if (isExternal) {
      if (_.includes('@import') && !_.includes('scss')) return _;

      const req = await fetch(path);
      if (req.status !== 200) {
        code = '';
      } else {
        code = await req.text();
      }
    } else {
      code = await getCode(root, resolveFileFromTree(basePath) ?? basePath, basePath + '.scss', basePath + '.css', '_' + basePath + '.scss');
    }

    const importRoot = isExternal ? getDir(path) : join(root, getDir(basePath));
    return await includeImports(importRoot, code, updatePending);
  });
};

const transformCSS = async (root, code, skipTransform = false, updateProgress = false) => {
  if (updateProgress) downloadingProgress = 0;

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

  'electron': await getBuiltin('node/electron'),
  'path': await getBuiltin('node/path'),
  'fs': await getBuiltin('node/fs'),
  'request': await getBuiltin('node/request')
};

const globals = {
  powercord: await getBuiltin('powercord/global'),
  betterdiscord: await getBuiltin('betterdiscord/global'),

  bd_zeres: await getBuiltin('betterdiscord/libs/zeres')
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

  let code = '404: Not Found';
  let path;
  for (path of [ p, ...backups ]) {
    if (!path) continue;

    const req = await fetch(join(root, path));
    // console.log('REQ', join(root, path), req.status);
    if (req.status !== 200) continue;

    code = await req.text();
    break;
    // console.log(join(root, path), req.status, code);
  }

  return fetchCache.set(origPath, code);
};

const genId = (p) => `__topaz_${p.replace(transformRoot, '').replaceAll('./', '/').replace(/[\/\-]/g, '_').split('.')[0]}`;

const makeChunk = async (root, p) => {
  // console.log('makeChunk', p);
  downloadingProgress++;
  updatePending(null, `Fetching (${downloadingProgress})...`);

  const joined = (root + '/' + p).replace(transformRoot, '');
  const resPath = builtins[p] ? p : resolvePath(joined).slice(1);
  const resolved = resolveFileFromTree(resPath);
  console.log('CHUNK', genId(resPath), '|', root.replace(transformRoot, ''), p, '|', joined, resPath, resolved);

  let code = await getCode(transformRoot, resolved ?? p, p.match(/.*\.[a-z]+/) ? null : p + '.jsx', p.includes('.jsx') ? p.replace('.jsx', '.js') : p.replace('.js', '.jsx'));
  if (!builtins[p]) code = await includeRequires(join(transformRoot, resolved), code);
  const id = genId(resPath);

  if (p.endsWith('.json') || code.startsWith('{')) code = 'module.exports = ' + code;

  const chunk = `// ${resolved}
let ${id} = {};
(() => {
` + code.replace('module.exports =', `${id} =`).replaceAll(/(module\.)?exports\.(.*?)=/g, (_, _mod, key) => `${id}.${key}=`) + `
})();`;

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

/* async function replaceAwait(str, regex, asyncFn) {
  let data = [];
  while (str.match(regex)) {
    let promise;
    str.replace(regex, (match, ...args) => {
      promise = asyncFn(match, ...args);
    });
    data.push(await promise);
  }

  return str.replace(regex, () => data.shift());
} */

let chunks = {}, tree = [];
let downloadingProgress = 0;
const includeRequires = async (path, code) => {
  const root = getDir(path);

  // console.log({ path, root });

  // log('bundling', 'file', path.replace(indexRoot, ''));

  code = await replaceAsync(code, /require\(["'`](.*?)["'`]\)/g, async (_, p) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, p);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return chunkId;
  });

  code = await replaceAsync(code, /this\.loadStylesheet\(['"`](.*?)['"`]\)/g, async (_, p) => {
    const css = (await transformCSS(root, await getCode(root, './' + p))).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `this.loadStylesheet(\`${css}\`)`;
  });

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
  while (ind = x.indexOf('../') !== -1) x = x.slice(0, ind) + x.slice(ind + 3);

  return x;
}

let lastError;
const resolveFileFromTree = (path) => {
  const res = tree.find((x) => x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '')))?.path;

  console.log('RESOLVE', path, tree, 'OUT', res);

  if (path.startsWith('powercord/') && !builtins[path]) {
    console.warn('Missing builtin', path);
    lastError = `Missing builtin: ${path}`;
  } else if (!res && !builtins[path]) {
    console.warn('Failed to resolve', path);
    lastError = `Failed to resolve: ${path}`;
  }

  return res ? ('./' + res) : undefined;
};

let lastStarted = '';
const install = async (info, settings = {}) => {
  lastError = '';

  let bd;
  if (info.endsWith('.plugin.js')) {
    bd = true;
    if (info.includes('github.com/')) info = info.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '');
  }

  info = info.replace('https://github.com/', '');

  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let subdir;
  if (!bd) {
    const spl = info.split('/');
    if (spl.length > 2) { // Not just repo
      repo = spl.slice(0, 2).join('/');
      subdir = spl.slice(4).join('/');

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

    const indexFile = resolveFileFromTree('index');

    const indexUrl = !isGitHub ? info : `https://raw.githubusercontent.com/${repo}/${branch}/${subdir ? (subdir + '/') : ''}index.js`;
    const root = getDir(indexUrl);

    chunks = {}; // reset chunks

    let indexCode;
    if (isGitHub && !indexFile) { // if (indexCode === '404: Not Found') {
      const themeManifest = await (await fetch(join(root, './powercord_manifest.json'))).json();

      if (themeManifest) {
        isTheme = true;

        manifest = themeManifest;

        const pend = pending.find(x => x.repo === info);
        if (pend) pend.manifest = manifest;

        const indexUrl = join(root, './' + themeManifest.theme);
        const indexRoot = getDir(indexUrl);
        indexCode = await getCode(root, './' + themeManifest.theme);

        updatePending(info, 'Bundling...');
        newCode = await transformCSS(indexRoot, indexCode, themeManifest.theme.endsWith('.css'), true);
      }
    } else {
      indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

      if (!bd) {
        manifest = await (await fetch(join(root, './manifest.json'))).json();
      } else { // read BD manifest from comment
        manifest = [...indexCode.matchAll(/^ \* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
      }

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transform(indexUrl, indexCode, info);

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

        document.head.appendChild(el);
      },

      _topaz_stop: () => {
        el.remove();
      },

      __theme: true
    };
  } else {
    const PluginClass = eval(newCode);
    PluginClass.prototype.entityID = info; // Setup internal metadata
    PluginClass.prototype.manifest = manifest;

    plugin = new PluginClass();

    if (bd) {
      plugin._topaz_start = plugin.start;
      plugin._topaz_stop = plugin.stop;

      for (const x of [ 'name', 'description', 'version', 'author' ]) manifest[x] = plugin['get' + x.toUpperCase()[0] + x.slice(1)]?.() ?? manifest[x] ?? '';
    }
  }

  plugins[info] = plugin;

  plugin.entityID = info; // Re-set metadata for themes and assurance
  plugin.manifest = manifest;

  plugin.__enabled = true;
  plugin.__mod = bd ? 'bd' : 'pc';

  if (!bd && plugin.settings) {
    if (settings) plugin.settings.store = settings;

    plugin.settings.onChange = () => savePlugins(); // Re-save plugin settings on change
  }

  lastStarted = info;
  plugin._topaz_start();

  return [ manifest ];
};

let transformRoot;
const transform = async (path, code, info) => {
  downloadingProgress = 0;
  transformRoot = path.split('/').slice(0, -1).join('/');

  code = await includeRequires(path, code);
  code = Object.values(chunks).join('\n\n') + '\n\n' + code;

  const global = path.endsWith('.plugin.js') ? globals.betterdiscord : globals.powercord;
  code = global + '\n\n' + code;

  // BD: add our own micro-implementations of popular 3rd party plugin libraries
  if (code.includes('ZeresPluginLibrary')) code = globals.bd_zeres + '\n\n' + code;

  code = code.replace('module.exports =', 'return');

  console.log({ code });

  updatePending(null, 'Transforming...');

  code = sucrase.transform(code, { transforms: [ "typescript", "jsx" ], disableESTransforms: true }).code;

  code = `(function () {
${code}
})(); //# sourceURL=${encodeURI(`Topaz | ${info}`)}`;

  return code;
};

const topazSettings = JSON.parse(localStorage.getItem('topaz_settings') ?? 'null') ?? {
  pluginSettingsSidebar: true,
  sandboxEnabled: false,
  simpleUI: false
};

const savePlugins = () => !topaz.__reloading && localStorage.setItem('topaz_plugins', JSON.stringify(Object.keys(plugins).reduce((acc, x) => { acc[x] = plugins[x].settings?.store ?? {}; return acc; }, {})));

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

    plugins[info]._topaz_stop();
    delete plugins[info];

    if (!topaz.__reloading) {
      finalCache.remove(info); // remove final cache
      fetchCache.keys().filter(x => x.includes(info)).forEach(y => fetchCache.remove(y)); // remove fetch caches
    }

    savePlugins();
  },
  uninstallAll: () => Object.keys(plugins).forEach((x) => topaz.uninstall(x)),

  enable: (info) => {
    if (!plugins[info]) return log('enable', 'plugin not installed');
    log('enable', info);

    lastStarted = info;
    plugins[info]._topaz_start();
    plugins[info].__enabled = true;
  },
  disable: (info) => {
    if (!plugins[info]) return log('disable', 'plugin not installed');
    log('disable', info);

    plugins[info]._topaz_stop();
    plugins[info].__enabled = false;
  },

  purge: () => {
    topaz.uninstallAll();
    cssEl.remove();

    msgUnpatch();
    settingsUnpatch();
  },

  purgeCache: () => {
    fetchCache.purge();
    finalCache.purge();
  },
  getInstalled: () => Object.keys(plugins),

  internal: {
    registerSettings: (id, { label, render, category, props }) => {
      const entityID = plugins[category] ? category : lastStarted;
      plugins[entityID].__settings = { category, label, render, props };
    },

    plugins
  },

  reload: async () => {
    eval(await (await fetch(`http://localhost:1337/src/index.js`, { cache: 'no-store' })).text());
  },

  log
};

console.clear();
log('init', `topaz loaded! took ${(performance.now() - initStartTime).toFixed(0)}ms`);

(async () => {
  for (const p in pluginsToInstall) {
    await install(p, pluginsToInstall[p]);
  }

  try { updateOpenSettings(); } catch { }
})();

const recommended = { // Automatically generated
  plugins: {
    'PC%WPM%rom#5692': 'romdotdog/wpm',
    'PC%Custom Timestamps%TaiAurori#6781': 'TaiAurori/custom-timestamps',
    'PC%VCTimer%RazerMoon': 'RazerMoon/vcTimer',
    'PC%Slowmode Counter%12944qwerty, Harley ツ': '12944qwerty/Slowmode-Counter',
    'PC%Collapsble UI%Skullbite': 'skullyplugs/collapsible-ui',
    'PC%Show Connections%ugly-patootie#0611': 'E-boi/ShowConnections',
    'PC%Better Invites%bakzkndd#2819, 12944qwerty': '12944qwerty/betterInvites',
    'PC%Copy Server Icon Url%12944qwerty': '12944qwerty/copy-server-icon',
    'PC%Show All Message Buttons%Kyza, 12944qwerty': '12944qwerty/showAllMessageButtons',
    'PC%Greentext%yui': 'yuwui/powercord-greentext',
    'PC%Staff Tags%Puyodead1': 'Puyodead1/powercord-stafftags',
    'PC%Unindent%Vendicated': 'VenPlugs/Unindent',
    'PC%Replace Timestamps - Powercord%SpoonMcForky': 'SpoonMcForky/replace-timestamps-pc',
    'PC%Channel Typing%Bowser65': 'powercord-community/channel-typing',
    'PC%Click Mentions%12944qwerty': '12944qwerty/click-mentions',
    'PC%User Details%Juby210#0577': 'Juby210/user-details',
    'PC%Tone Indicators%asportnoy#6969': 'asportnoy/powercord-tone-indicators',
    'PC%Better Codeblocks%Powercord Team': 'https://github.com/powercord-org/powercord/blob/HEAD/src/Powercord/plugins/pc-codeblocks',
    'PC%Clickable Message Edits%Harley': 'https://github.com/powercord-org/powercord/blob/HEAD/src/Powercord/plugins/pc-clickableEdits',
    'BD%PreviewMessageLinks%dylan-dang': 'https://github.com/dylan-dang/BetterDiscordPlugins/blob/main/PreviewMessageLinks.plugin.js',
    'BD%NoSpotifyPause%undefined': 'https://github.com/bepvte/bd-addons/blob/main/plugins/NoSpotifyPause.plugin.js',
    'BD%FreeEmojis%An0': 'https://github.com/BetterDiscordPlugins/DiscordFreeEmojis/blob/master/DiscordFreeEmojis64px.plugin.js'
  },
  themes: {
    'PC%Material You%Leeprky#2063': 'leeprky/MaterialYouTheme',
    'PC%Dark Discord%eternal': 'eternal404/dark-discord',
    'PC%Comfy%Nyria#3863': 'NYRI4/Comfy',
    'PC%Slate%Gibbu#1211 & Tropical#8908': 'DiscordStyles/Slate',
    'PC%Horizontal Server List%Gibbu#1211': 'DiscordStyles/HorizontalServerList',
    'PC%RadialStatus%Gibbu#1211': 'DiscordStyles/RadialStatus'
  }
};

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

const { React } = goosemod.webpackModules.common;

const TabBar = goosemod.webpackModules.findByDisplayName('TabBar');
const TabBarClasses1 = goosemod.webpackModules.findByProps('topPill');
const TabBarClasses2 = goosemod.webpackModules.findByProps('tabBar', 'nowPlayingColumn')

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'thin');

let selectedTab = 'PLUGINS';
let textInputs = {
  PLUGINS: '',
  THEMES: ''
};

const Text = goosemod.webpackModules.findByDisplayName('LegacyText');
const Spinner = goosemod.webpackModules.findByDisplayName('Spinner');
const PanelButton = goosemod.webpackModules.findByDisplayName('PanelButton');
const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
const HeaderBarContainer = goosemod.webpackModules.findByDisplayName('HeaderBarContainer');
const FormItem = goosemod.webpackModules.findByDisplayName('FormItem');
const TextInput = goosemod.webpackModules.findByDisplayName('TextInput');
const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Margins = goosemod.webpackModules.findByProps('marginTop20', 'marginBottom20');
const _Switch = goosemod.webpackModules.findByDisplayName('Switch');

const Header = goosemod.settings.Items['header'];
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

class Plugin extends React.PureComponent {
  render() {
    const { manifest, repo, state, substate, settings, entityID, mod } = this.props;

    return React.createElement(TextAndChild, {
      text: !manifest ? repo : [
        (!mod || topazSettings.simpleUI) ? null : React.createElement('span', {
          className: 'topaz-tag'
        }, mod.toUpperCase()),

        manifest.name,

        topazSettings.simpleUI ? null : React.createElement('span', {
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
      }) : React.createElement(Text, {
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
            const ModalStuff = goosemod.webpackModules.findByProps('ModalRoot');
            const Header = goosemod.webpackModules.findByDisplayName('LegacyHeader');
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
                    React.createElement(Header, {
                      tag: 'h2',
                      size: Header.Sizes.SIZE_20
                    }, manifest.name + ' Settings')
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
                  className: 'topaz-settings-modal-content'
                },
                  React.createElement(settings.render, settings.props)
                )
              )
            })
          }
        }) : null,

        topazSettings.simpleUI ? null : React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Link'),
          tooltipText: 'Open Link',
          onClick: async () => {
            window.open(entityID.includes('http') ? entityID : `https://github.com/${entityID}`);
          }
        }),

        topazSettings.simpleUI ? null : React.createElement(PanelButton, {
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
        text: 'Settings'
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
    )
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

        el.onfocus = () => textInputHandler('');

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
        autocomplete.className = ScrollerClasses.thin;

        document.body.appendChild(autocomplete);
      }

      const inputPos = el.getBoundingClientRect();

      autocomplete.style.top = inputPos.bottom + 'px';
      autocomplete.style.left = inputPos.left + 'px';
      autocomplete.style.width = inputPos.width + 'px';

      const fuzzySearch = new RegExp(`.*${inp.replace(' ', '[-_ ]')}.*`, 'i');

      const recom = recommended[selectedTab.toLowerCase()];
      const infoFromRecom = (x) => x.endsWith('.plugin.js') ? x.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '') : x.replace('https://github.com/', '');
      const matching = Object.keys(recom).filter((x) => !plugins[infoFromRecom(recom[x])] && fuzzySearch.test(x));

      if (!init && matching.length > 0) {
        autocomplete.style.display = 'block';
        autocomplete.innerHTML = '';

        const hel = document.createElement('h5');
        hel.textContent = 'Recommended ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes');
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
      className: 'topaz-settings'
    },
      React.createElement(FormTitle, {
        tag: 'h1'
      }, 'Topaz',
        React.createElement('span', {
          className: 'description-30xx7u topaz-version'
        }, 'v' + topazVersion),

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
              topaz.reload();
            }
          }))
        ),
      ),

      selectedTab === 'SETTINGS' ? React.createElement(TopazSettings) : [
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

        ...Object.values(plugins).filter((x) => selectedTab === 'PLUGINS' ? !x.__theme : x.__theme).map(({ __enabled, manifest, entityID, __settings, __mod }) => React.createElement(Plugin, {
          manifest,
          entityID,
          enabled: __enabled,
          settings: __settings,
          mod: __mod,
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
    topaz.reload();
    return false;
  }
}, true);
})(); //# sourceURL=Topaz