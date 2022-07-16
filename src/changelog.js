const sleep = x => new Promise(res => setTimeout(res, x));

let body = `__Bundler | JS__
- Auto import React for JSX files which don't themselves
- Add \`X as Y\` ESM import support
- Add CSS import support
- Fix ESM imports sometimes not working
- Fix not using subdirs in some mods
- Rewrite fetching progress to not include builtins and repeated files
- Fix missing builtin warning not triggering when it should
- Clear last error on start

__Bundler | CSS__
- Rewrite theme detection
- Use \`expanded\` style for Grass to not minify and fix bugs

__UI__
- Add changelog modal
- Add changelog button in tabbar

__Storage__
- Rewrite all storage usage to use new custom API using IndexedDB

__Enmity__
- Add initial plugin support

__Cumcord__
- Add alias for modules.webpackModules
- Add support for exported functions instead of objects
- Add Utils
- Add more to Webpack
- Add more to Patcher
- Add support for GitHub links to builds
- Add mock plugin data
- Add more exports

__Popular__
- Add newly working
- Add Enmity plugin support`;
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