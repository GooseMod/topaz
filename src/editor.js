(async () => {
const { React } = goosemod.webpackModules.common;
window.React = React; // pain but have to

const imp = async url => eval(await (await fetch(url)).text());

const patchAppend = (which) => { // sorry
  const orig = document[which].appendChild;

  document[which].appendChild = function(el) {
    if (el.nodeName === 'SCRIPT' && el.src.includes('monaco')) {
      (async () => {
        console.log('monaco', which, el.src);
        (1, eval)(await (await fetch(el.src)).text());
        console.log(window.require);
        el.onload?.();
      })();

      return;
    }

    return orig.apply(this, arguments);
  };
};

patchAppend('body');
patchAppend('head');


if (!window.monaco_react) { // only load once, or errors
  // monaco loader and react dependencies
  await imp('https://unpkg.com/prop-types@15.7.2/prop-types.js');
  await imp('https://unpkg.com/state-local@1.0.7/lib/umd/state-local.min.js');

  await imp('https://unpkg.com/@monaco-editor/loader@1.3.2/lib/umd/monaco-loader.min.js'); // monaco loader
  await imp('https://unpkg.com/@monaco-editor/react@4.4.5/lib/umd/monaco-react.min.js'); // monaco react
}

const MonacoEditor = monaco_react.default;

const langs = {
  'js': 'javascript',
  'css': 'css',
  'html':'html'
};

const TabBar = goosemod.webpackModules.findByDisplayName('TabBar');
const TabBarClasses1 = goosemod.webpackModules.findByProps('topPill');
const TabBarClasses2 = goosemod.webpackModules.findByProps('tabBar', 'nowPlayingColumn');

const PanelButton = goosemod.webpackModules.findByDisplayName('PanelButton');

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'auto', 'thin');

let lastPlugin;
let expandInt;

return function Editor(props) {
  let { files, defaultFile, plugin } = props;
  defaultFile = defaultFile ?? Object.keys(files)[0];

  const editorRef = React.useRef(null);
  const [ openFile, setOpenFile ] = React.useState(defaultFile);

  if (lastPlugin !== plugin.entityID) {
    lastPlugin = plugin.entityID;
    if (window.monaco) monaco.editor.getModels().forEach(x => x.dispose());
  }


  if (!expandInt) {
    expandInt = setInterval(() => {
      if (document.querySelector('.topaz-editor')) return;

      clearInterval(expandInt);
      expandInt = undefined;

      document.querySelector('.contentColumn-1C7as6.contentColumnDefault-3eyv5o').style.maxWidth = '';
      document.querySelector('.contentRegion-3HkfJJ').style.flex = '';
      document.querySelector('.sidebarRegion-1VBisG').style.flex = '';
      document.querySelector('.contentRegionScroller-2_GT_N').style.overflow = 'hidden scroll';
      document.querySelector('.toolsContainer-25FL6V').style.top = '';
    }, 300);

    document.querySelector('.contentColumn-1C7as6.contentColumnDefault-3eyv5o').style.maxWidth = 'calc(100vw - 40px - 218px - 40px)';
    document.querySelector('.contentRegion-3HkfJJ').style.flex = '1 1 80%';
    document.querySelector('.sidebarRegion-1VBisG').style.flex = '1 0 0';
    document.querySelector('.toolsContainer-25FL6V').style.top = '-50px';

    document.querySelector('.contentColumn-1C7as6.contentColumnDefault-3eyv5o').style.transition = 'max-width .5s';
    document.querySelector('.contentRegion-3HkfJJ').style.transition = 'flex .5s';
    document.querySelector('.sidebarRegion-1VBisG').style.transition = 'flex .5s';

    document.querySelector('.contentRegionScroller-2_GT_N').style.overflow = 'visible';
  }

  const openExt = openFile.split('.').pop();

  React.useEffect(() => {
    console.log('ref', editorRef);
    if (!editorRef.current) return;

    editorRef.current.revealLine(0);

    // editorRef.current.setSelection(new monaco.Selection(0, 0, 0, 0));
    // editorRef.current.focus();
  }, [ openFile ]);

  return React.createElement('div', {
    className: 'topaz-editor'
  },
    React.createElement(TabBar, {
      selectedItem: openFile,

      className: [ TabBarClasses2.tabBar, ScrollerClasses.auto ].join(' '),
      type: TabBarClasses1.top,
      look: 1,

      onItemSelect: (x) => {
        if (x.startsWith('_')) return;
        setOpenFile(x);
      }
    },
      ...Object.keys(files).map(x => React.createElement(TabBar.Item, {
        id: x,
        className: TabBarClasses2.item
      }, x)),

      React.createElement(TabBar.Item, {
        id: '_settings',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Gear'),
        tooltipText: 'Editor Settings',
        onClick: async () => {
          console.log('settings');
        }
      })),

      React.createElement(TabBar.Item, {
        id: '_reload',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Retry'),
        tooltipText: 'Reload Plugin',
        onClick: async () => {
          topaz.reload(plugin.entityID);
          goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + plugin.manifest.name, 0, { duration: 5000, position: 1 }));
        }
      }))
    ),

    React.createElement(MonacoEditor, {
      defaultValue: files[openFile],
      defaultLanguage: langs[openExt] ?? openExt,
      path: openFile,
      saveViewState: false,

      onMount: editor => editorRef.current = editor,
      onChange: value => props.onChange(openFile, value),
      theme: 'vs-dark'
    })
  );
};
})(); //# sourceURL=TopazEditor