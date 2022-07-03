let powercord;

(() => {
const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;

class SettingsStore extends Flux.Store {
  constructor (Dispatcher, handlers) {
    super(Dispatcher, handlers);
    this.store = {};
  }

  getSetting = (key, def) => {
    return this.store[key] ?? def;
  }

  updateSetting = (key, value) => {
    if (value === undefined) return this.deleteSetting(key);

    this.store[key] = value;

    this.onChange?.();

    return this.store[key];
  }

  toggleSetting = (key, def) => {
    return this.updateSetting(key, !(this.store[key] ?? def));
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

  // not flux but yes
  connectStore = (comp) => class ConnectWrap extends React.PureComponent {
    render() {
      const props = this.props;
      delete props.children;

      return React.createElement(comp, {
        ...props,
        getSetting: settingStore.getSetting,
        updateSetting: settingStore.updateSetting,
        toggleSetting: settingStore.toggleSetting,
        deleteSetting: settingStore.deleteSetting,
      }, this.props.children)
    }
  }
}

const settingStore = new SettingsStore(FluxDispatcher, {
  POWERCORD_SETTINGS_UPDATE: ({ category, settings }) => updateSettings(category, settings),
  POWERCORD_SETTING_TOGGLE: ({ category, setting, defaultValue }) => toggleSetting(category, setting, defaultValue),
  POWERCORD_SETTING_UPDATE: ({ category, setting, value }) => updateSetting(category, setting, value),
  POWERCORD_SETTING_DELETE: ({ category, setting }) => deleteSetting(category, setting)
});

const settingsUnpatch = {};
const i18nMessages = {};

const i18n = goosemod.webpackModules.find(x => x.getLanguages && x.Messages?.ACCOUNT);
const locale = () => goosemod.webpackModules.findByProps('getLocaleInfo').getLocale();
const updateI18n = () => {
  const parent = i18n._provider?._context ?? i18n._proxyContext;
  let { messages, defaultMessages } = parent;

  Object.defineProperty(parent, 'messages', {
    enumerable: true,
    get: () => messages,
    set: o => messages = Object.assign(o, i18nMessages[locale()])
  });

  Object.defineProperty(parent, 'defaultMessages', {
    enumerable: true,
    get: () => defaultMessages,
    set: o => defaultMessages = Object.assign(o, i18nMessages['en-US'])
  });

  parent.messages = messages;
  parent.defaultMessages = defaultMessages;
};

const updateOpenSettings = async () => {
  try {
    await new Promise((res) => setTimeout(res, 100));

    if (topaz.__reloading || !document.querySelector('.selected-g-kMVV[aria-controls="topaz-tab"]')) return;

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch (_e) { }
};

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

            goosemod.webpackModules.findByProps('sendMessage', 'receiveMessage').sendMessage(getChannelId(), {
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

        topaz.internal.registerSettings(__entityID, { render, props: { ...settingStore } });

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
      },

      store: settingStore,
      _fluxProps: (_id) => ({
        settings: settingStore.store,
        getSetting: (key, defaultValue) => settingStore.getSetting(key, defaultValue),
        updateSetting: (key, value) => settingStore.updateSetting(key, value),
        toggleSetting: (key, defaultValue) => settingStore.toggleSetting(key, defaultValue)
      })
    },

    notices: {
      sendToast: (_id, { header, content, type, buttons }) => goosemod.showToast(content) // todo: improve to use all given
    },

    i18n: {
      loadAllStrings: (obj) => { // todo: re-add on locale change
        for (const locale in obj) {
          i18nMessages[locale] = {
            ...(i18nMessages[locale] ?? {}),
            ...obj[locale]
          };
        }

        updateI18n();
      }
    },

    connections: {
      fetchAccounts: async (user) => {
        return undefined;
      }
    }
  },

  __topaz: {
    AsyncComponent
  }
};


})();