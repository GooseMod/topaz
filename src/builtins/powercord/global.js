let powercord;

(() => {
class SimpleStore {
  constructor() {
    this.store = {};
  }

  getSetting = (key, defaultValue) => {
    return this.store[key] ?? defaultValue;
  }

  updateSetting = (key, value) => {
    if (value === undefined) value = !this.store[key];

    this.store[key] = value;

    console.log('updateSetting', key, value, this.onChange);

    this.onChange?.();

    return this.store[key];
  }

  toggleSetting = (key) => {
    return this.updateSetting(key);
  }

  deleteSetting = (key) => {
    delete this.store[key];

    this.onChange?.();
  }

  getKeys = () => Object.keys(this.store)

  // alt names for other parts
  get = this.getSetting
  set = this.updateSetting
  delete = this.deleteSetting

  // random stub
  connectStore = () => {}
}

const settingStore = new SimpleStore();

const settingsUnpatch = {};

const updateOpenSettings = async () => {
  try {
    await new Promise((res) => setTimeout(res, 100));

    if (topaz.__noSettingsUpdate || !document.querySelector('.selected-g-kMVV[aria-controls="gm-topaz-tab"]')) return;

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('gm-Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch (_e) { }
};

const { React } = goosemod.webpackModules.common;
class AsyncComponent extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {};
  }

  async componentDidMount () {
    this.setState({
      comp: await this.props._provider()
    });
  }

  render () {
    const { comp } = this.state;
    if (comp) return React.createElement(comp, {
      ...this.props,
      ...this.props._pass
    });

    return this.props._fallback ?? null;
  }

  static from (prov, _fallback) {
    return React.memo(
      props => React.createElement(AsyncComponent, {
        _provider: () => prov,
        _fallback,
        ...props
      })
    );
  }

  static fromDisplayName (name, fallback) {
    return AsyncComponent.from(goosemod.webpackModules.findByDisplayName(name), fallback);
  }

  static fromModule (filter, fallback) {
    return AsyncComponent.from(goosemod.webpackModules.find(filter), fallback);
  }

  static fromModuleProp (filter, key, fallback) {
    return AsyncComponent.from((async () => (await getModule(filter))[key])(), fallback);
  }
}

powercord = {
  api: {
    commands: {
      registerCommand: ({ command, alias, description, usage, executor }) => {
        const sendMessage = goosemod.webpackModules.findByProps('sendMessage', 'receiveMessage').sendMessage;
        const getChannelId = goosemod.webpackModules.findByProps('getChannelId').getChannelId;

        // TODO: implement alias
      
        goosemod.patcher.commands.add(command, description,
          async (ret) => {
            // Don't just destructure as using without text arguments returns empty object ({})
      
            let textGiven = '';
            if (ret[0]?.value) {
              const [{ value: text }] = ret;
              textGiven = text;
            }
      
            const out = await executor(textGiven.split(' ')); // Run original executor func (await incase it's an async function)
      
            if (!out) return;
            if (!out.send) {
              goosemod.patcher.internalMessage(out.result); // PC impl. sends internal message when out.send === false, so we also do the same via our previous Patcher API function
              return;
            }

      
            // When send is true, we send it as a message via sendMessage
      
            sendMessage(getChannelId(), {
              content: out.result,
      
              tts: false,
              invalidEmojis: [],
              validNonShortcutEmojis: []
            });
          }, [
          { type: 3, required: false, name: 'args', description: 'Arguments for PC command' } // Argument for any string for compat. with PC's classical commands
        ]);
      },

      unregisterCommand: (command) => {
        goosemod.patcher.commands.remove(command);
      }
    },

    settings: {
      registerSettings: (id, { label, render, category }) => {
        const { React } = goosemod.webpackModules.common;
      
        const SettingsView = goosemod.webpackModules.findByDisplayName('SettingsView');
      
        const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
        const FormSection = goosemod.webpackModules.findByDisplayName('FormSection');

        if (!SettingsView) return;

        topaz.internal.registerSettings(id, { label, render, category, props: { ...settingStore } });


        settingsUnpatch[id] = goosemod.patcher.patch(SettingsView.prototype, 'getPredicateSections', (_, sections) => {
          const logout = sections.find((c) => c.section === 'logout');
          if (!logout || !topaz.settings.pluginSettingsSidebar) return sections;

          const finalLabel = typeof label === 'function' ? label() : label;
          
          sections.splice(sections.indexOf(logout) - 1, 0, {
            section: finalLabel,
            label: finalLabel,
            predicate: () => { },
            element: () => React.createElement(FormSection, { },
              React.createElement(FormTitle, { tag: 'h2' }, finalLabel),
          
              React.createElement(render, {
                ...settingStore
              })
            )
          });

          return sections;
        });

        updateOpenSettings();
      },

      unregisterSettings: (id) => {
        if (!settingsUnpatch[id]) return;

        settingsUnpatch[id]();

        settingsUnpatch[id] = null;
        delete settingsUnpatch[id];

        updateOpenSettings();
      }
    },

    notices: {
      sendToast: (_id, { header, content, type, buttons }) => goosemod.showToast(content) // todo: improve to use all given
    },

    i18n: {
      loadAllStrings: (obj) => {
  
      }
    },

    connections: {
      fetchAccounts: async (user) => {
        return undefined;
      }
    }
  },

  __topaz: {
    settingStore,
    AsyncComponent
  }
};
})();