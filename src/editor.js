(async () => {
const { React } = goosemod.webpackModules.common;
window.React = React; // pain but have to

const imp = async url => eval(await (await fetch(url)).text());

if (!window.monaco_react) { // only load once, or errors
  // monaco loader and react dependencies
  await imp('https://unpkg.com/prop-types@15.7.2/prop-types.js');
  await imp('https://unpkg.com/state-local@1.0.7/lib/umd/state-local.min.js');

  await imp('https://unpkg.com/@monaco-editor/loader@0.1.2/lib/umd/monaco-loader.min.js'); // monaco loader
  await imp('https://unpkg.com/@monaco-editor/react@4.0.0/lib/umd/monaco-react.min.js'); // monaco react
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

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'auto', 'thin');

let lastPlugin;
return function Editor(props) {
  let { files, defaultFile, plugin } = props;
  defaultFile = defaultFile ?? Object.keys(files)[0];

  const editorRef = React.useRef(null);
  const [ openFile, setOpenFile ] = React.useState(defaultFile);

  if (lastPlugin !== plugin.entityID) {
    lastPlugin = plugin.entityID;
    if (window.monaco) monaco.editor.getModels()[0]?.dispose?.();
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
        setOpenFile(x);
      }
    },
      ...Object.keys(files).map(x => React.createElement(TabBar.Item, {
        id: x,
        className: TabBarClasses2.item
      }, x))
    ),

    React.createElement(MonacoEditor, {
      value: files[openFile],
      language: langs[openExt] ?? openExt,
      path: openFile,
      saveViewState: false,

      onMount: editor => editorRef.current = editor,
      onChange: value => props.onChange(openFile, value),
      theme: 'vs-dark',
      height: '80vh'
    })
  );
};
})();