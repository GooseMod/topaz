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
    if (value === undefined) {
      return this.toggleSetting(key);
    }

    this.store[key] = value;

    return this.store[key];
  }

  toggleSetting = (key) => {
    this.store[key] = !this.store[key];

    return this.store[key];
  }

  deleteSetting = (key) => {
    delete this.store[key];
  }

  getKeys = () => Object.keys(this.store)
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
        const { Settings } = powercord.__topaz;
        const { React } = goosemod.webpackModules.common;
      
        const SettingsView = goosemod.webpackModules.findByDisplayName('SettingsView');
      
        const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
        const FormSection = goosemod.webpackModules.findByDisplayName('FormSection');

        if (!SettingsView) return;

        topaz.internal.registerSettings(id, { render, category, props: { ...settingStore[category] } });


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
                ...settingStore[category]
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
    settingStore
  }
};
})();