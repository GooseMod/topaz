(async () => {
let pluginsToInstall = [];
if (window.topaz) { // live reload handling
  const oldPlugins = topaz.getInstalled(); // get plugins installed from old session

  topaz.__noSettingsUpdate = true;
  topaz.purge(); // fully remove topaz (plugins, css, etc)

  pluginsToInstall = oldPlugins;

  const settingItem = goosemod.settings.items.find((x) => x[1] === 'Topaz');
  if (settingItem) goosemod.settings.items.splice(goosemod.settings.items.indexOf(settingItem), 1);
}

if (pluginsToInstall.length === 0) {
  const savedPlugins = localStorage.getItem('topaz_plugins');
  if (savedPlugins) pluginsToInstall = JSON.parse(savedPlugins);
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
  'powercord/modal': await getBuiltin('powercord/modal'),
  'electron': await getBuiltin('electron')
};

const globals = {
  powercord: await getBuiltin('powercord/global')
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
  if (fetchCache[origPath]) return fetchCache[origPath];

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

  /* let code = await (await fetch(path)).text();
  console.log('one', { path, code });
  if (code === '404: Not Found') {
    if (path.includes('.jsx')) {
      path = path.replace('.jsx', '.js');
    } else {
      path = path.replace('.js', '.jsx');
    }

    if (path.includes('.scss')) {
      path = path.replace('.scss', '.css');
    }

    code = await (await fetch(path)).text();

    if (code === '404: Not Found' && path.includes('i18n')) {
      code = 'module.exports = {}'; // i18n jank placeholder fix
    }

    /* if (code === '404: Not Found') {
      if (path.includes('.js')) {
        path = path.replace('.js', '/index.js');
      }

      code = await (await fetch(path)).text();

      if (code === '404: Not Found') {
        if (path.includes('/index.js')) {
          path = path.replace('/index.js', '.json');
        }
  
        code = await (await fetch(path)).text();
      }
    } */ /*
  }
  console.log('two', { path, code }); */

  return fetchCache[origPath] = code;
};

const genId = (p) => `__topaz_${p.split('/').slice(6).join('_').split('.')[0]}`;

const makeChunk = async (root, p) => {
  // console.log('makeChunk', p);
  downloadingProgress++;
  updatePending(null, `Fetching (${downloadingProgress})...`);

  let code = await getCode(root, resolveFileFromTree(p) ?? p, p.match(/.*\.[a-z]+/) ? null : p + '.jsx', p.includes('.jsx') ? p.replace('.jsx', '.js') : p.replace('.js', '.jsx'));
  if (!builtins[p]) code = await includeRequires(join(root, p), code);
  const id = genId(join(root, p));

  if (p.endsWith('.json') || code.startsWith('{')) code = 'module.exports = ' + code;

  const chunk = `// ${p}
let ${id} = {};
(() => {
` + code.replace('module.exports =', `${id} =`).replaceAll(/(module\.)?exports\.(.*?)=/g, (_, _mod, key) => `${id}.${key}=`) + `
})();`;

  return chunk;
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
  // console.log('requires', path, code);

  const root = getDir(path);

  // console.log({ path, root });

  // log('bundling', 'file', path.replace(indexRoot, ''));

  code = await replaceAsync(code, /require\(["'`](.*?)["'`]\)/g, async (_, p) => {
    // console.log('within replace', join(root, p), chunks);
    if (!chunks[join(root, p)]) chunks[join(root, p)] = await makeChunk(root, p);

    return genId(join(root, p));
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

const resolveFileFromTree = (path) => {
  console.log('RESOLVE', path, tree, 'OUT', tree.find((x) => x.path.startsWith(path.replace('./', '')))?.path);

  const res = tree.find((x) => x.path.startsWith(path.replace('./', '')))?.path;
  return res ? ('./' + res) : undefined;
};

let lastStarted = '';
const install = async (info) => {
  // log('installing', info);

  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let isGitHub = !info.startsWith('http');

  let [ newCode, manifest, isTheme ] = finalCache[info] ?? [];

  if (!newCode) {
    updatePending(info, 'Treeing...');

    tree = [];
    if (isGitHub) {
      tree = (await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=true`)).json()).tree;
      // tree = treeInfo.tree;
      // hash = treeInfo.sha;
    }

    updatePending(info, 'Fetching index...');

    const indexFile = resolveFileFromTree('index');

    const indexUrl = !isGitHub ? info : `https://raw.githubusercontent.com/${repo}/${branch}/index.js`;
    const root = getDir(indexUrl);

    chunks = {}; // reset chunks

    let indexCode;
    if (isGitHub && !indexFile) { // if (indexCode === '404: Not Found') {
      const themeManifest = await (await fetch(join(root, './powercord_manifest.json'))).json();

      if (themeManifest) {
        isTheme = true;

        manifest = themeManifest;

        const indexUrl = join(root, './' + themeManifest.theme);
        const indexRoot = getDir(indexUrl);
        indexCode = await getCode(root, './' + themeManifest.theme);

        updatePending(info, 'Bundling...');
        newCode = await transformCSS(indexRoot, indexCode, themeManifest.theme.endsWith('.css'), true);
      }
    } else {
      indexCode = await getCode(root, indexFile ?? './index.js', './index.jsx');

      manifest = await (await fetch(join(root, './manifest.json'))).json();
      updatePending(info, 'Bundling...');
      newCode = await transform(indexUrl, indexCode, info);

      isTheme = false;
    }
  
    finalCache[info] = [ newCode, manifest, isTheme ];
  }

  updatePending(info, 'Executing...');
  // await new Promise((res) => setTimeout(res, 900000));

  let plugin;
  if (isTheme) {
    let el;
    plugin = {
      start: () => {
        if (el) el.remove();
        el = document.createElement('style');

        el.appendChild(document.createTextNode(newCode)); // Load the stylesheet via style element w/ CSS text

        document.head.appendChild(el);
      },

      stop: () => {
        el.remove();
      },

      __theme: true
    };
  } else {
    const PluginClass = eval(newCode);
    PluginClass.prototype.entityID = info; // Setup internal metadata
    PluginClass.prototype.manifest = manifest;

    plugin = new PluginClass();
  }

  plugins[info] = plugin;

  plugin.enabled = true;

  lastStarted = info;
  plugin.start();

  return [ manifest ];
};

const transform = async (path, code, info) => {
  downloadingProgress = 0;

  code = await includeRequires(path, code);
  code = Object.values(chunks).join('\n\n') + '\n\n' + code;

  code = globals.powercord + '\n\n' + code;

  code = code.replace('module.exports =', 'return');

  // console.log({ code });

  updatePending(null, 'Transforming...');

  console.log(code);

  code = sucrase.transform(code, { transforms: [ "typescript", "jsx" ], disableESTransforms: true }).code;

  const makeSourceURL = () => encodeURI(`Topaz | ${info}`); // e `${info}`.replace()
  code = `(function () {
${code}
})(); //# sourceURL=${makeSourceURL()}`;

  return code;
};

const topazSettings = {
  pluginSettingsSidebar: true,
  sandboxEnabled: false
};

window.topaz = {
  settings: topazSettings,

  install: async (info) => {
    const installStartTime = performance.now();

    const [ manifest ] = await install(info);

    log('install', `installed ${info}! took ${(performance.now() - installStartTime).toFixed(2)}ms`);

    localStorage.setItem('topaz_plugins', JSON.stringify(Object.keys(plugins)));
  },

  uninstall: (info) => {
    if (!plugins[info]) return log('uninstall', 'plugin not installed');
    log('uninstall', info);

    plugins[info].stop();
    delete plugins[info];
  },
  uninstallAll: () => Object.keys(plugins).forEach((x) => topaz.uninstall(x)),

  enable: (info) => {
    if (!plugins[info]) return log('enable', 'plugin not installed');
    log('enable', info);

    lastStarted = info;
    plugins[info].start();
    plugins[info].enabled = true;
  },
  disable: (info) => {
    if (!plugins[info]) return log('disable', 'plugin not installed');
    log('disable', info);

    plugins[info].stop();
    plugins[info].enabled = false;
  },

  purge: () => {
    topaz.uninstallAll();
    cssEl.remove();
    msgUnpatch();
  },

  purgeCache: () => {
    fetchCache.purge();
    finalCache.purge();
  },
  getInstalled: () => Object.keys(plugins),

  internal: {
    registerSettings: (id, { label, render, category, props }) => {
      const entityID = lastStarted; // category;
      plugins[entityID].__settings = { category, label, render, props };
    }
  },

  reload: async () => {
    eval(await (await fetch(`http://localhost:1337/src/index.js`)).text());
  },

  log
};

console.clear();
log('init', `topaz loaded! took ${(performance.now() - initStartTime).toFixed(0)}ms`);

(async () => {
  for (const p of pluginsToInstall) {
    await topaz.install(p);
  }

  try { updateOpenSettings(); } catch { }
})();

const recommended = {
  plugins: [
    'romdotdog/wpm',
    'TaiAurori/custom-timestamps',
    'RazerMoon/vcTimer',
    '12944qwerty/Slowmode-Counter',
    'skullyplugs/collapsible-ui',
    'E-boi/ShowConnections',
    '12944qwerty/betterInvites',
    '12944qwerty/copy-server-icon',
    '12944qwerty/showAllMessageButtons',
    'yuwui/powercord-greentext',
    'Puyodead1/powercord-stafftags'
  ],

  themes: [
    'leeprky/MaterialYouTheme',
    'eternal404/dark-discord',
    'NYRI4/Comfy',
    'DiscordStyles/Slate',
    'DiscordStyles/HorizontalServerList',
    'DiscordStyles/RadialStatus'
  ]
};

const updateOpenSettings = async () => {
  if (!document.querySelector('.selected-g-kMVV[aria-controls="gm-topaz-tab"]')) return;

  try {
    await new Promise((res) => setTimeout(res, 10));

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('gm-Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch (_e) { console.log('AAAAAA', _e); }
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

const Button = goosemod.webpackModules.findByProps('Sizes', 'Colors', 'Looks', 'DropdownSizes');
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

class Plugin extends React.PureComponent {
  render() {
    const { manifest, repo, state, substate, settings, entityID } = this.props;

    return React.createElement(TextAndChild, {
      text: state ? repo : [
        React.createElement('span', {
          class: 'title-2dsDLn',
          style: {
            display: 'inline'
          }
        }, manifest.name),

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

        React.createElement('span', {
          class: 'title-2dsDLn',
          style: {
            display: 'inline'
          }
        }, manifest.author.split('#')[0]),

        manifest.author.split('#')[1] ? React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '1px'
          }
        }, '#' + manifest.author.split('#')[1]) : null
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
        React.createElement(Spinner, {
          type: 'spinningCircle'
        }),

        React.createElement('span', {
        }, state,
          React.createElement('span', {
            class: 'description-30xx7u',
            style: {
              marginLeft: '4px'
            }
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

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Retry'),
          tooltipText: 'Fresh Reinstall',
          onClick: async () => {
            delete finalCache[entityID]; // remove final cache
            Object.keys(fetchCache).filter((x) => x.includes(entityID)).forEach((x) => delete fetchCache[x]); // remove fetch caches
            
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
        onChange: x => { topazSettings.pluginSettingsSidebar = x; }
      }),
    )
  }
}

class Settings extends React.PureComponent {
  render() {
    const textInputHandler = (inp) => {
      const el = document.querySelector('.topaz-settings .input-2g-os5');

      if (!el.placeholder) {
        el.placeholder = 'GitHub repo / URL';

        el.onkeydown = async (e) => {
          if (e.keyCode !== 13) return;

          const info = el.value.replace('https://github.com/', '');
          el.value = '';
          // el.value = 'Installing...';

          const rmPending = addPending({ repo: info, state: 'Installing...' });
          this.forceUpdate();

          await topaz.install(info);
          rmPending();

          this.forceUpdate();
        };

        el.onblur = () => {
          setTimeout(() => {
            autocomplete.style.display = 'none';
          }, 200);
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

      const fuzzySearch = new RegExp(`.*${inp.replace(' ', '[-_]')}.*`, 'i');
      const matching = recommended[selectedTab.toLowerCase()].filter((x) => !plugins[x] && fuzzySearch.test(x));

      if (inp.length > 0 && matching.length > 0) {
        autocomplete.style.display = 'block';
        autocomplete.innerHTML = '';

        const hel = document.createElement('h5');
        hel.textContent = 'Recommended ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes');
        autocomplete.appendChild(hel);

        for (const x of matching) {
          const nel = document.createElement('div');
          nel.textContent = x;

          nel.onclick = async () => {
            autocomplete.style.display = 'none';

            el.value = '';
            // el.value = 'Installing...';

            const rmPending = addPending({ repo: x, state: 'Installing...' });
            this.forceUpdate();

            await topaz.install(x);
            rmPending();

            this.forceUpdate();
            // el.value = '';
            /* el.value = x; */
          };

          autocomplete.appendChild(nel);
        }
      } else {
        autocomplete.style.display = 'none';
      }
    };

    setTimeout(() => {
      let tmpEl = document.querySelector('.topaz-settings .input-2g-os5');
      if (tmpEl && !tmpEl.placeholder) textInputHandler('');
    }, 10);


    return React.createElement('div', {
      className: 'topaz-settings'
    },
      React.createElement(FormTitle, {
        tag: 'h1'
      }, 'Topaz',
        React.createElement(HeaderBarContainer.Divider),

        React.createElement(TabBar, {
          selectedItem: selectedTab,
    
          type: TabBarClasses1.topPill,
          className: TabBarClasses2.tabBar,
    
          onItemSelect: (x) => {
            if (x === 'RELOAD') return topaz.reload();

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
          }, React.createElement(goosemod.webpackModules.findByDisplayName('Retry'), { width: 20, height: 20 }))
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

        ...Object.values(plugins).filter((x) => selectedTab === 'PLUGINS' ? !x.__theme : x.__theme).map(({ enabled, manifest, entityID, __settings }) => React.createElement(Plugin, {
          manifest,
          entityID,
          enabled,
          settings: __settings,
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

goosemod.settings.createItem('Topaz', ['',
  Settings
]);

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