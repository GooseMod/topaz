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
  toggle = this.toggleSetting
  delete = this.deleteSetting
}


module.exports = class Plugin {
  constructor() {
    this.settings = new SettingsStore(FluxDispatcher, {
      UNBOUND_SETTINGS_UPDATE: ({ category, settings }) => updateSettings(category, settings),
      UNBOUND_SETTING_TOGGLE: ({ category, setting, defaultValue }) => toggleSetting(category, setting, defaultValue),
      UNBOUND_SETTING_UPDATE: ({ category, setting, value }) => updateSetting(category, setting, value),
      UNBOUND_SETTING_DELETE: ({ category, setting }) => deleteSetting(category, setting)
    });

    this.unpatches = [];
  }

  get patcher() {
    return {
      instead: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, args, original); }, false, true);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      before: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      after: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      unpatchAll: () => {
        this.unpatches.forEach(x => x());
      }
    }
  }

  _topaz_start() {
    this.start.bind(this)();
  }

  _topaz_stop() {
    this.stop.bind(this)();
  }
}