const sleep = x => new Promise(res => setTimeout(res, x));

let body = `__Settings__
- Add backup system
- Add Purge Caches button
- Rewrite to use more Discord components than GMs

__UI__
- Add quick actions to Plugins and Themes

__Snippets__
- Add Snippets Library (early/WIP)
- Tweak UI

__Bundler | JS__
- Fix purging fetch cache on uninstall
- Add support for builtins ending in /
- Rewrite React auto importing for JSX

__Powercord__
- Settings: Rewrite to use Flux
- Components: Add Menu export`;
let bodySplit = body.split('\n');

let categoryAssign = {
  'added': [ 'Add', 'Rewrite' ],
  // 'progress': [],
  // 'improved': [],
  'fixed': [ 'Fix' ]
};

let changelog = {
  image: '',
  version: topaz.version[0].toUpperCase() + topaz.version.slice(1),
  date: '2022-07-16',

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
  };

  // Tweak again since opening it right at beginning of injection / Discord load (eg: GooseMod update) often fails to do after first wait
  setTimeout(customTweaks, 200);
  customTweaks();
};

show()