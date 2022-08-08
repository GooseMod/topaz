const sleep = x => new Promise(res => setTimeout(res, x));

let body = `
__Sandbox__
- **Rewrote Sandbox to be isolated and a lot more secure.** Sandbox now uses isolated detached frames from the main window, and another rewritten sandbox inside of that. Should now be a lot more secure and easier platform for future development.
- **Added more things that plugins can use.** More plugins should work now, in addition to Bundler improvements.
- Fixed clipboard permissions being wrong way around
- Fixed undefined modules erroring with safeWebpack
- Added a lot more globals accessible
- Added custom Observer support
- Added window.event support
- Rewrote console cleaning for passing on

__Bundler__
- **Rewrote exporting to be more robust.** Handling exports is now rewritten to handle more situations correctly and should be largely flawless.
- **Added NPM support.** Now supports NPM package shorthand using node_modules.
- **Various internal rewrites and fixes.** The bundler should generally also be more stable and should work in more complicated/advanced situations.
- Added \`require.resolve\` support
- Added support when using builtins ending with an extra backslash
- Added proper implementation of __dirname
- Rewrote ESM exports to make matching local variables
- Lower package.main when reading package.json's to support mixed case
- Added support for async/runtime-generated builtins

__Cache__
- **Added caching for GitHub API's file tree.** Installing plugins after first-time should be faster and no longer requires network.
- Added generic fetch method

__Node__
- **Added initial filesystem implementation for GitHub repos.** Advanced PC plugins (like Shiki Codeblocks) should now work with this initial implementation.
- **Added Node request support.** \`request\` and \`https\` modules are now implemented to allow older plugins using NodeJS to make requests.
- \`path\`: Added new resolver from Bundler
- \`path\`: Added isAbsolute
- \`fs\`: Added initial temporary implementation based on GitHub API/raw for GH repos
- \`fs\`: Added stub for writeFile
- \`process\`: Added hrtime
- \`util\`: Added inspect
- \`request\`: Implement
- \`https\`: Implement

__BetterDiscord__
- **Rewrote ZeresPluginLibrary implementation.** Now uses official library patched at runtime in client.
- **Added experimental BDFDB library implementation.** Experimental/WIP support to test if additional common BD libraries can be supported.
- Run load handler if present
- Fixed HTML settings not working
- Global: Mock settings functions

__Terminal__
- **Added Topaz Terminal.** You can open the Topaz Terminal with Alt+T which allows a more direct/alternate interface with Topaz internals.

__Powercord__
- Rewrote settings store to use individual store
- Toasts: Use more options given
- Announcements: Initial add
- Global: Mock not being logged in instead of erroring
- Commands: Fixed not working on use
- \`http\`: Only use CORS proxy as fallback after initial try

__Unbound__
- Rewrite settings store to use individual store

__Rikka__
- Run preInject handler if present

__Index__
- Moved Topaz's CSS injection earlier into init
- Fixed trying to purge previous if it hadn't loaded`;
let bodySplit = body.split('\n');

let categoryAssign = {
  'added': [ 'Added', 'add', 'Rewrote' ],
  // 'progress': [],
  // 'improved': [],
  'fixed': [ 'Fixed' ]
};

let changelog = {
  image: '',
  version: topaz.version[0].toUpperCase() + topaz.version.slice(1),
  date: '2022-08-08',

  body: bodySplit.reduce((acc, x, i) => {
    if (x[0] === '_') {
      const items = bodySplit.slice(i + 1, bodySplit.indexOf(bodySplit.find((y, j) => j > i && y[0] === '_')) - 1);
      const cat = items.reduce((acc, y) => {
        for (const cat in categoryAssign) {
          if (categoryAssign[cat].some(z => y.includes(z))) {
            if (cat === 'added') return acc += 1;
            if (cat === 'fixed') return acc -= 1;
          }
        }

        return acc;
      }, 0) >= 0 ? 'added' : 'fixed';

      acc += (i === 0 ? '' : '\n') + x.replaceAll('__', '') + ` {${cat}${i === -1 ? ' marginTop' : ''}}\n======================\n\n`;
    } else if (x) {
      acc += `* ${x.slice(2)}\n`;
    }

    return acc;
  }, '')
};

let showAdvanced = topaz.storage.get('changelog_advanced', false);
const show = async () => {
  goosemod.changelog.resetChangelog();

  goosemod.changelog.setChangelog(changelog);

  goosemod.changelog.showChangelog();

  await sleep(100);

  setTimeout(() => goosemod.changelog.resetChangelog(), 500);

  const customTweaks = () => {
    document.querySelector('.modal-3Hrb0S [data-text-variant="heading-lg/medium"]').textContent = `Topaz | ${changelog.version}`; // Set changelog modal title
    document.querySelector('.modal-3Hrb0S .footer-31IekZ')?.remove?.(); // Remove footer of modal with social media
    document.querySelector('.title-2ftWWc:first-child').style.marginTop = '0px';

    const hideAdvanced = () => {
      const els = [...document.querySelectorAll('.content-FDHp32 li')];
      if (showAdvanced) {
        els.concat([...document.querySelectorAll('.content-FDHp32 h1')]).forEach(x => x.style.display = '');
      } else {
        els.forEach(x => x.textContent.endsWith('.') ? x.style.display = '' : x.style.display = 'none');
        const children = [...document.querySelectorAll('.content-FDHp32 > div > *')];
        document.querySelectorAll('.content-FDHp32 h1').forEach(x => {
          if ([...children[children.indexOf(x) + 1].children].every(y => !y.textContent.endsWith('.'))) x.style.display = 'none';
        });
      }
    };

    hideAdvanced();

    if (!document.querySelector('#topaz-changelog-advanced')) {
      const container = document.createElement('div');
      document.querySelector('.modal-3Hrb0S [data-text-variant="heading-lg/medium"]').appendChild(container);

      const { React, ReactDOM } = goosemod.webpackModules.common;

      class AdvancedToggle extends React.PureComponent {
        render() {
          return React.createElement(goosemod.webpackModules.findByDisplayName('SwitchItem'), {
            className: 'topaz-changelog-advanced',
            value: showAdvanced,
            onChange: x => {
              showAdvanced = x;
              this.forceUpdate();

              hideAdvanced();

              topaz.storage.set('changelog_advanced', showAdvanced);
            }
          }, 'Advanced');
        }
      }

      ReactDOM.render(React.createElement(AdvancedToggle), container);
    }
  };

  // Tweak again since opening it right at beginning of injection / Discord load (eg: GooseMod update) often fails to do after first wait
  setTimeout(customTweaks, 200);
  customTweaks();
};

show()