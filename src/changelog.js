const sleep = x => new Promise(res => setTimeout(res, x));

let body = `
__Autopatcher__
- **Added Autopatcher.** The new autopatcher can now try to fix plugins broken by recent common breakages from Discord updates.

__Performance__
- **Installing plugins and themes after the first time is now significantly faster.** The final output of bundling is now cached so bundling each install is no longer needed.
- **Added more caching throughout.** Essentially everything fetched for plugins/themes should be cached now, helping increase perf and decreasing network usage.

__Bundler__
- **Partially rewrote CSS bundler to work with more complex PC themes.** Now use separated main and index roots.

__Onyx__
- Added ESM default export support
- Rewrote sourceURL to add increment to fix Chromium DevTools bug

__Storage__
- Changed saving debounce to 200ms from 1s

__Manager__
- **Added more redundancy.** Information for plugins now no longer soley relies on it's manifest, it also now uses information like constructor name and GitHub username.
- Use plugin's class name if no manifest name
- Use GitHub username if no manifest author and plugin is from GitHub
- Wrap plugin calls in try catch to avoid failing to disable/enable completely

__Backup__
- Fixed restoring sometimes not working

__AliucordRN__
- **Initial AliucordRN plugin support.** A few AliucordRN (React Native) plugins are now supported, very early/WIP.

__BetterDiscord__
- ZeresLib: Only run Webpack listeners when modules are added

__Powercord__
- Added \`powercord\` builtin wrapper
- Added ContextMenu component
- Added tree support for getting settings
- Fixed opening modals erroring
- Added pluginManager.get stub for self
`;
let bodySplit = body.split('\n');

let categoryAssign = {
  'added': [ 'Added', 'add', 'Rewrote' ],
  // 'progress': [],
  // 'improved': [],
  'fixed': [ 'Fixed' ]
};

let changelog = {
  image: '',
  version: topaz.version[0].toUpperCase() + topaz.version.slice(1).split('.')[0],
  date: '2022-08-14',

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