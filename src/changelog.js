const sleep = x => new Promise(res => setTimeout(res, x));

let body = `
__Popular__
- **Rewrote autocomplete to use React.** Should be a bit snappier and easier to work with in future.
- **Added filtering.** There's now a new filtering menu (click the filter icon) to allow you to filter by mods, with more options coming soon.

__Bundler__
- **Added initial Demoncord plugin support.** Brings the total up to 12 mods!
- Added CORS proxy fallback if a request fails due to lacking CORS
- Tweaked BD meta comment extraction to work with more

__Theme Settings__
- **Added initial theme settings.** With some themes there will now be a settings menu allowing you to customize the background, home icon, and font if they have it. It's currently a work in progress and will only work for some.

__UI__
- **Rewrote to be more robust.** Now correctly handles lack of some metadata like author or version, instead of sometimes showing broken data.

__Changelog__
- **Added advanced toggle.** You can enable it to view all (more technical) changes if you're interested. Also now using Discord's style of paragraphs with explanations.

__Editor__
- Fix freezing/errors if files include some characters`;
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
  date: '2022-07-23',

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