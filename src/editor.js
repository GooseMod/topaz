(async () => {
const { React } = goosemod.webpackModules.common;
window.React = React; // pain but have to

const forceWrap = (comp, key) => class extends React.PureComponent {
  render() {
    return React.createElement(comp, {
      ...this.props,
      onChange: x => {
        this.props[key] = x;
        this.forceUpdate();

        this.props.onChange(x);
      }
    });
  }
};

const SwitchItem = forceWrap(goosemod.webpackModules.findByDisplayName('SwitchItem'), 'value');
const SingleSelect = forceWrap(goosemod.webpackModules.findByProps('SingleSelect').SingleSelect, 'value');

const debounce = (handler, timeout) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => handler(...args), timeout);
  };
};

const imp = async url => eval(await (await fetch(url)).text());

const patchAppend = (which) => { // sorry
  const orig = document[which].appendChild;

  document[which].appendChild = function(el) {
    if (el.nodeName === 'SCRIPT' && el.src.includes('monaco')) {
      (async () => {
        console.log('monaco', which, el.src);
        (1, eval)(await (await fetch(el.src)).text());
        el.onload?.();
      })();

      return;
    }

    return orig.apply(this, arguments);
  };
};

patchAppend('body');
patchAppend('head');

// hack for mods who load their own monaco and use Node and stuff
if (!window.monaco_react && typeof require !== 'undefined') {
  const toBlock = [ 'global', 'require', 'module', 'process', 'nodeRequire'];

  const orig = {};
  for (const x of toBlock) {
    orig[x] = window[x];
    window[x] = undefined;
  }

  setTimeout(() => Object.keys(orig).forEach(x => window[x] = orig[x]), 5000);
}

if (window.monaco && !window.monaco_react) {
  window.monaco = undefined;
  window.monaco_editor = undefined;
  window.monaco_loader = undefined;
  window.MonacoEnvironment = undefined;
  window.AMDLoader = undefined;
  window._amdLoaderGlobal = undefined;
  window.define = undefined;
}

if (!window.monaco) { // only load once, or errors
  // monaco loader and react dependencies
  await imp('https://unpkg.com/prop-types@15.7.2/prop-types.js');
  await imp('https://unpkg.com/state-local@1.0.7/lib/umd/state-local.min.js');

  await imp('https://unpkg.com/@monaco-editor/loader@1.3.2/lib/umd/monaco-loader.min.js'); // monaco loader
  await imp('https://unpkg.com/@monaco-editor/react@4.4.5/lib/umd/monaco-react.min.js'); // monaco react
}


const MonacoEditor = monaco_react.default;

const langs = {
  'js': 'javascript',
  'jsx': 'javascript', // jsx is half broken because monaco bad but do anyway
  'css': 'css',
  'html':'html'
};

const TabBar = goosemod.webpackModules.findByDisplayName('TabBar');
const TabBarClasses1 = goosemod.webpackModules.findByProps('topPill');
const TabBarClasses2 = goosemod.webpackModules.findByProps('tabBar', 'nowPlayingColumn');

const PanelButton = goosemod.webpackModules.findByDisplayName('PanelButton');
const _Switch = goosemod.webpackModules.findByDisplayName('Switch');
const Switch = forceWrap(_Switch, 'checked');

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'auto', 'thin');

let lastPlugin;
let expandInt;

const editorSettings = JSON.parse(topaz.storage.get('editor_settings') ?? 'null') ?? {
  theme: 'vs-dark',
  focusMode: true
};

const saveEditorSettings = () => topaz.storage.set('editor_settings', JSON.stringify(editorSettings));

const _loadedThemes = {};
const setTheme = async (x) => {
  if (!x.startsWith('vs') && !_loadedThemes[x]) _loadedThemes[x] = monaco.editor.defineTheme(x, await (await fetch(`https://raw.githubusercontent.com/brijeshb42/monaco-themes/master/themes/${x}.json`)).json());

  monaco.editor.setTheme(x);
  editorSettings.theme = x;
};
setTimeout(() => setTheme(editorSettings.theme), 500);

const focus_enlarge = () => document.body.classList.add('topaz-editor-focus');
const focus_revert = () => document.body.classList.remove('topaz-editor-focus');

const langToImg = (lang, size = 24) => {
  let img, props = {};

  switch (lang) {
    case 'js':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/javascript.svg';
      break;

    case 'jsx':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/react.svg';
      props.style = { filter: 'hue-rotate(220deg) brightness(1.5)' }; // HS yellow
      break;

    case 'ts':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/typescript.svg';
      break;

    case 'tsx':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/react.svg';
      props.style = { filter: 'hue-rotate(20deg) brightness(1.5)' }; // TS blue
      break;

    case 'css':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/css.svg';
      break;

    case 'scss':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/sass.svg';
      break;
  }

  return React.createElement('img', {
    src: img,
    ...props,

    width: size,
    height: size
  });
};

const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
const FormText = goosemod.webpackModules.findByDisplayName('FormText');
const LegacyHeader = goosemod.webpackModules.findByDisplayName('LegacyHeader');
const ModalStuff = goosemod.webpackModules.findByProps('ModalRoot');
const { openModal } = goosemod.webpackModules.findByProps('openModal', 'updateModal');
const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Markdown = goosemod.webpackModules.find((x) => x.displayName === 'Markdown' && x.rules);
const Button = goosemod.webpackModules.findByProps('Sizes', 'Colors', 'Looks', 'DropdownSizes');

const makeModal = (header, content, entireCustom) => {
  openModal((e) => {
    return React.createElement(ModalStuff.ModalRoot, {
      transitionState: e.transitionState,
      size: 'large'
    },
      entireCustom ? React.createElement(entireCustom, e, null) : React.createElement(ModalStuff.ModalHeader, {},
        React.createElement(Flex.Child, {
          basis: 'auto',
          grow: 1,
          shrink: 1,
          wrap: false,
        },
          React.createElement(LegacyHeader, {
            tag: 'h2',
            size: LegacyHeader.Sizes.SIZE_20,
            className: 'topaz-modal-header'
          }, header)
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

      entireCustom ? null : React.createElement(ModalStuff.ModalContent, {
        className: `topaz-modal-content`
      },
        content
      )
    )
  });
};


const selections = {};

let ignoreNextSelect = false;
return function Editor(props) {
  let { files, defaultFile, plugin, toggled, fileIcons } = props;
  defaultFile = defaultFile ?? Object.keys(files)[0] ?? '';

  const loadPreviousSelection = (file) => {
    setTimeout(() => {
      const ref = editorRef.current;
      console.log(ref);

      if (selections[plugin.entityID + file]) {
        ref.setSelection(selections[plugin.entityID + file]);
        ref.revealLineInCenter(selections[plugin.entityID + file].startLineNumber);
      } else ref.revealLine(0);

      ref.focus();
    }, editorRef.current ? 20 : 500);
  };

  const editorRef = React.useRef(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [ openFile, setOpenFile ] = React.useState(defaultFile);

  if (lastPlugin !== plugin.entityID) { // dispose models to clean up
    lastPlugin = plugin.entityID;
    if (window.monaco) monaco.editor.getModels().forEach(x => x.dispose());

    loadPreviousSelection(openFile);
  }


  if (!expandInt && editorSettings.focusMode) {
    expandInt = setInterval(() => {
      if (document.querySelector('.topaz-editor')) return;

      clearInterval(expandInt);
      expandInt = undefined;

      focus_revert();
    }, 300);

    focus_enlarge();
  }

  const openExt = openFile.split('.').pop();

  console.log('render', files, defaultFile, openFile, files[openFile] === undefined, openExt);

  return React.createElement('div', {
    className: 'topaz-editor'
  },
    React.createElement(TabBar, {
      selectedItem: openFile,

      className: [ TabBarClasses2.tabBar, ScrollerClasses.auto ].join(' '),
      type: TabBarClasses1.top,
      look: 1,

      onItemSelect: (x) => {
        if (x.startsWith('#')) return;
        if (ignoreNextSelect) return ignoreNextSelect = false;

        selections[plugin.entityID + openFile] = editorRef.current.getSelection();

        setOpenFile(x);
        props.onOpen?.(x);

        if (openFile !== x) loadPreviousSelection(x);
      }
    },
      ...Object.keys(files).map(x => React.createElement(TabBar.Item, {
        id: x,
        className: TabBarClasses2.item
      },
        !fileIcons ? null : React.createElement(SingleSelect, {
          onChange: y => {
            const newFile = x.split('.').slice(0, -1).join('.') + '.' + y;

            props.onRename?.(x, newFile);
            if (openFile === x) {
              setOpenFile(newFile);
              forceUpdate(); // sorry :)
              setImmediate(() => document.querySelector('#inptab-' + newFile.replace(/[^A-Za-z0-9]/g, '_')).parentElement.click());
            }
          },
          options: [ 'css', 'scss', '-', 'js', 'jsx', '-', 'ts', 'tsx' ].map(y => ({
            label: y,
            value: y
          })),
          value: x.split('.').pop() ?? 'css',

          popoutClassName: 'topaz-file-popout',

          renderOptionValue: ([ { value } ]) => langToImg(value, 24),
          renderOptionLabel: ({ value }) => value === '-' ? '' : React.createElement(React.Fragment, {},
            langToImg(value, 24),

            value.toUpperCase()
          )
        }),

        React.createElement('input', {
          type: 'text',
          autocomplete: 'off',
          spellcheck: 'false',
          autocorrect: 'off',

          value: fileIcons ? x.split('.').slice(0, -1).join('.') : x,
          id: 'inptab-' + x.replace(/[^A-Za-z0-9]/g, '_'),

          style: {
            width: (x.length * 0.8) + 'ch'
          },

          onChange: (e) => {
            let val = e.target.value;
            if (fileIcons) val += '.' + x.split('.').pop();

            if (!document.querySelector('.topaz-snippets')) document.querySelector('#inptab-' + x.replace(/[^A-Za-z0-9]/g, '_')).style.width = (val.length * 0.8) + 'ch';

            props.onRename?.(x, val);

            if (openFile === x) setOpenFile(val);
          }
        }),

        plugin.entityID !== 'snippets' ? null : React.createElement(Switch, {
          checked: toggled[x] ?? true,
          onChange: (y) => props.onToggle?.(x, y)
        }),

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Trash'),
          tooltipText: 'Delete',
          onClick: () => {
            ignoreNextSelect = true;

            const originalIndex = Object.keys(files).indexOf(openFile);

            props.onDelete?.(x);

            if (openFile === x) {
              let newOpenIndex = originalIndex - 1;
              if (newOpenIndex < 0) newOpenIndex = 0;

              setOpenFile(Object.keys(files)[newOpenIndex] ?? '');
            } else forceUpdate();
          }
        })
      )),

      React.createElement(TabBar.Item, {
        id: '#new',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('PlusAlt'),
        tooltipText: 'New',
        tooltipClassName: plugin.entityID !== 'snippets' ? '' : (goosemod.webpackModules.findByProps('tooltipBottom').tooltipBottom + ' topaz-snippets-tooltip-bottom'),
        onClick: () => {
          const name = fileIcons ? '.css' : '';

          files[name] = '';
          if (openFile === name) forceUpdate();
            else setOpenFile(name);

          setTimeout(() => document.querySelector('#inptab-' + name.replace(/[^A-Za-z0-9]/g, '_')).focus(), 100);

          props.onNew?.(name);
        }
      })),

      plugin.entityID !== 'snippets' ? null : React.createElement(TabBar.Item, {
        id: '#library',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Library'),
        tooltipText: 'Library',
        tooltipClassName: goosemod.webpackModules.findByProps('tooltipBottom').tooltipBottom + ' topaz-snippets-tooltip-bottom',
        onClick: async () => {
          let selectedItem = 'CSS';

          const { fetchMessages } = goosemod.webpackModules.findByProps('fetchMessages', 'sendMessage');
          const { getRawMessages } = goosemod.webpackModules.findByProps('getMessages');
          const { getChannel, hasChannel } = goosemod.webpackModules.findByProps('getChannel', 'getDMFromUserId');

          const channels = [
            '755005803303403570',
            '836694789898109009',
            '449569809613717518'
          ];

          const getSnippets = async (channelId) => {
            if (!hasChannel(channelId)) return;

            await fetchMessages({ channelId }); // Load messages

            const channel = getChannel(channelId);
            const messages = Object.values(getRawMessages(channelId)).filter(x => x.content.includes('\`\`\`css') && // Make sure it has CSS codeblock
              !x.message_reference && // Exclude replies
              !x.content.toLowerCase().includes('quick css') && // Exclude PC / BD specific snippets
              !x.content.toLowerCase().includes('plugin') &&
              !x.content.toLowerCase().includes('powercord') && !x.content.toLowerCase().includes('betterdiscord') &&
              !x.content.toLowerCase().includes('fix') && !x.content.toLowerCase().includes('bother') &&
              (x.attachments.length > 0 || x.embeds.length > 0)
            );

            for (let i = messages.length - 1; i > 0; i--) { // shuffle
              const j = Math.floor(Math.random() * (i + 1));
              [messages[i], messages[j]] = [messages[j], messages[i]];
            }

            return { channel, messages };
          };

          const channelSnippets = (await Promise.all(channels.map(x => getSnippets(x)))).filter(x => x);

          const makeBuiltin = ({ title, desc, preview, author, css }) => {
            return {
              attachments: [ {
                proxy_url: preview,
                type: 'image'
              } ],
              author,

              content: `${title}\n${desc}\n\`\`\`css\n${css}\`\`\``
            }
          };

          const builtinSnippets = [ {
            channel: null,
            messages: [
              {
                title: 'Custom Font',
                desc: 'Choose a custom font (locally installed) for Discord, edit to change',
                preview: '',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: `body {
  --font-primary: normal font name;
  --font-display: header font name;
  --font-headline: header font name;
  --font-code: code font name;
}

code { /* Fix code font variable not being used in some places */
  font-family: var(--font-code);
}`
              },
              {
                title: 'Custom Home Icon',
                desc: 'Choose a custom home icon (top left Discord icon), edit to change',
                preview: 'https://i.imgur.com/6zSmFRU.png',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: `[class^="homeIcon"] path {
  fill: none;
}

[class^="homeIcon"] {
  background: url(IMAGE_URL_HERE) center/cover no-repeat;
  width: 48px;
  height: 48px;
}`
              },
              {
                title: 'Hide Public Badge',
                desc: 'Hides the public badge in server headers',
                preview: '',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: `[class^="communityInfoContainer"] {
  display: none;
}`
              },
              {
                title: 'Hide Help Button',
                desc: 'Hides the help button (top right)',
                preview: '',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: `[class^="toolbar"] a[href="https://support.discord.com/"] {
  display: none;
}`
              }
            ].map(x => makeBuiltin(x))
          } ];

          const snippets = channelSnippets.concat(builtinSnippets);

          class Snippet extends React.PureComponent {
            render() {
              const attach = this.props.attachments[this.props.attachments.length - 1] ?? this.props.embeds[this.props.embeds.length - 1];
              // if (!attach) return null;

              let title = this.props.content.split('\n')[0].replaceAll('**', '').replaceAll('__', '').replace(':', '').split('.')[0].split(' (')[0].split('!')[0];
              let content = this.props.content;

              content = content.replaceAll('Preview: ', '').replaceAll('Previews: ', '').replaceAll(', instead:', '');

              if (title.length < 50 && !title.includes('```')) {
                const cap = (str, spl) => str.split(spl).map(x => (x[0] ?? '').toUpperCase() + x.slice(1)).join(spl);
                title = cap(cap(title, ' '), '/').replace(/https\:\/\/.*?( |\n|$)/gi, '');
                title = title.replace('Adds A', '').replace('Adds ', '').replace('Make ', '');
                content = content.split('\n').slice(1).join('\n');
              } else {
                title = '';
              }

              content = content.replace(/```css(.*)```/gs, '').replace(/https\:\/\/.*?( |\n|$)/gi, '');

              if (this.props._title) title = this.props._title;
              if (this.props._content) content = this.props._content;

              if (!title || title.length < 8) return null;

              content = content.split('\n').filter(x => x)[0] ?? '';
              if (content.includes('other snippets')) content = '';
              if (content) content = content[0].toUpperCase() + content.slice(1);

              const code = /```css(.*)```/s.exec(this.props.content)[1].trim();
              const file = title.split(' ').slice(0, 3).join('') + '.css';

              if (files[file]) return null;

              return React.createElement('div', {
                className: 'topaz-snippet'
              },
                attach ? React.createElement(((attach.type ?? attach.content_type).startsWith('video') || (attach.type ?? attach.content_type).startsWith('gifv')) ? 'video' : 'img', {
                  src: attach?.video?.proxy_url || attach.proxy_url || attach.thumbnail?.proxy_url || 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=',
                  autoPlay: true,
                  muted: true,
                  loop: true
                }) : null,

                React.createElement(LegacyHeader, {
                  tag: 'h2',
                  size: LegacyHeader.Sizes.SIZE_20
                },
                  React.createElement('span', {}, title),

                  React.createElement('div', {

                  },
                    React.createElement('img', {
                      src: `https://cdn.discordapp.com/avatars/${this.props.author.id}/${this.props.author.avatar}.webp?size=24`
                    }),

                    React.createElement('span', {}, this.props.author.username)
                  ),
                ),

                React.createElement(FormText, {
                  type: 'description'
                },
                  React.createElement(Markdown, {}, content)
                ),

                React.createElement('div', {},
                  React.createElement(Button, {
                    color: Button.Colors.BRAND,
                    look: Button.Looks.FILLED,

                    size: Button.Sizes.SMALL,

                    onClick: () => {
                      props.onChange(file, code);
                      setOpenFile(file);
                      this.forceUpdate();
                    }
                  }, 'Add'),

                  this.props.channel ? React.createElement(goosemod.webpackModules.findByDisplayName('Tooltip'), {
                    text: 'Jump to Message',
                    position: 'top'
                  }, ({ onMouseLeave, onMouseEnter }) => React.createElement(Button, {
                    color: Button.Colors.PRIMARY,
                    size: Button.Sizes.SMALL,

                    onMouseEnter,
                    onMouseLeave,

                    onClick: () => {
                      const { transitionTo } = goosemod.webpackModules.findByProps('transitionTo');
                      const { jumpToMessage } = goosemod.webpackModules.findByProps('jumpToMessage');

                      this.props.onClose();
                      document.querySelector('.closeButton-PCZcma').click();

                      transitionTo(`/channels/${this.props.channel.guild_id}/${this.props.channel.id}`);
                      jumpToMessage({ channelId: this.props.channel.id, messageId: this.props.id, flash: true });
                    }
                  },
                    React.createElement(goosemod.webpackModules.findByDisplayName('Reply'), {
                      width: '24',
                      height: '24',
                    })
                  )) : null
                )
              )
            }
          }

          class SnippetsLibrary extends React.PureComponent {
            render() {
              return [
                React.createElement(ModalStuff.ModalHeader, {},
                  React.createElement(Flex.Child, {
                    basis: 'auto',
                    grow: 1,
                    shrink: 1,
                    wrap: false,
                  },
                    React.createElement(LegacyHeader, {
                      tag: 'h2',
                      size: LegacyHeader.Sizes.SIZE_20,
                      className: 'topaz-snippets-library-header'
                    },
                      'Snippets Library',

                      React.createElement(TabBar, {
                        selectedItem,

                        type: TabBarClasses1.topPill,
                        className: [ TabBarClasses2.tabBar],

                        onItemSelect: (x) => {
                          selectedItem = x;
                          this.forceUpdate();
                        }
                      },
                        React.createElement(TabBar.Item, {
                          id: 'CSS'
                        }, 'CSS'),
                        /* React.createElement(TabBar.Item, {
                          id: 'CHANNELS',

                          className: TabBarClasses2.item
                        }, 'Your Channels'),

                        React.createElement(TabBar.Item, {
                          id: 'COMMON',

                          className: TabBarClasses2.item
                        }, 'Common'), */

                        /* React.createElement(TabBar.Item, {
                          id: 'SOURCES',

                          className: TabBarClasses2.item
                        }, 'Sources'), */
                      )
                    )
                  ),
                  React.createElement('FlexChild', {
                    basis: 'auto',
                    grow: 0,
                    shrink: 1,
                    wrap: false
                  },
                    React.createElement(ModalStuff.ModalCloseButton, {
                      onClick: this.props.onClose
                    })
                  )
                ),

                React.createElement(ModalStuff.ModalContent, {
                  className: `topaz-modal-content`
                },
                  React.createElement('div', {
                    className: 'topaz-snippet-container'
                  },
                    snippets.reduce((acc, x) => acc.concat(x.messages.map(y => React.createElement(Snippet, {
                      ...y,
                      channel: x.channel,
                      onClose: this.props.onClose
                    }))), [])
                  )
                )
              ];
            }
          }

          makeModal(null, null, SnippetsLibrary);
        }
      })),

      React.createElement(TabBar.Item, {
        id: '#settings',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Gear'),
        tooltipText: 'Editor Settings',
        onClick: async () => {
          const titleCase = (str) => str.split(' ').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

          makeModal('Editor Settings', [
            React.createElement(SwitchItem, {
              note: 'Enlarges settings content for larger editor',
              value: editorSettings.focusMode,
              onChange: x => {
                editorSettings.focusMode = x;
                saveEditorSettings();

                if (x) focus_enlarge();
                  else focus_revert();
              }
            }, 'Focus Mode'),

            React.createElement(FormTitle, {
              tag: 'h5'
            }, 'Theme'),

            React.createElement(SingleSelect, {
              onChange: x => {
                setTheme(x);
                saveEditorSettings();
              },
              options: [ 'vs-dark', 'vs-light', 'Dracula', 'Monokai', 'Nord', 'Twilight' ].map(x => ({
                label: titleCase(x.replace('vs-', 'VS ')),
                value: x
              })),
              value: editorSettings.theme
            })
          ]);
        }
      })),

      React.createElement(TabBar.Item, {
        id: '#reload',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Retry'),
        tooltipText: 'Reload Plugin',
        onClick: async () => {
          topaz.reload(plugin.__entityID);
          goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + plugin.manifest.name, 0, { duration: 5000, position: 1 }));
        }
      }))
    ),

    files[openFile] === undefined ? React.createElement('section', {
      className: 'topaz-editor-no-files',
    },
      React.createElement('div', {}, 'You have no ' + (plugin.entityID === 'snippets' ? 'snippets' : 'files')),
      React.createElement('div', {},
        'Make a ' + (plugin.entityID === 'snippets' ? 'snippet' : 'file') + ' with the',
        React.createElement(goosemod.webpackModules.findByDisplayName('PlusAlt'), {
          width: 20,
          height: 20
        }),
        'icon in the ' + (plugin.entityID === 'snippets' ? 'sidebar' : 'tabbar')
      )
    ) : React.createElement(MonacoEditor, {
      defaultValue: files[openFile],
      defaultLanguage: langs[openExt] ?? openExt,
      path: (plugin.entityID + '_' + openFile).replace(/[^A-Za-z0-9\-_ ]/g, ''),
      saveViewState: false,

      onMount: editor => editorRef.current = editor,
      onChange: debounce(value => props.onChange(openFile, value), 500),
      theme: editorSettings.theme
    })
  );
};
})(); //# sourceURL=TopazEditor