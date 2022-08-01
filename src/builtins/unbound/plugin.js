const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;

const fluxPrefix = 'topaz_un_settings_' + __entityID.replace(/[^A-Za-z0-9]/g, '_');
const FluxActions = {
  TOGGLE_SETTING: fluxPrefix + '_toggle_setting',
  UPDATE_SETTING: fluxPrefix + '_update_setting',
  DELETE_SETTING: fluxPrefix + '_delete_setting',
};

class SettingsStore extends Flux.Store {
  constructor (Dispatcher, handlers) {
    super(Dispatcher, handlers);
    this._store = JSON.parse(topaz.storage.get(__entityID + '_un', '{}') ?? {});
  }

  onChange() {
    topaz.storage.set(__entityID + '_un', JSON.stringify(this._store));
  }

  get = (key, def) => {
    return this._store[key] ?? def;
  }

  update = (key, value) => {
    if (value === undefined) return this.deleteSetting(key);

    this._store[key] = value;

    this.onChange();

    return this._store[key];
  }

  toggle = (key, def) => {
    return this.updateSetting(key, !(this._store[key] ?? def));
  }

  delete = (key) => {
    delete this._store[key];

    this.onChange();
  }

  getKeys = () => Object.keys(this._store)

  connectStore = connectStore
}

const connectStore = (comp) => Flux.connectStores([ settingStore ], () => ({
  settings: settingStore.store,
  get: settingStore.get,

  set: (setting, value) => {
    FluxDispatcher.dispatch({
      type: FluxActions.UPDATE_SETTING,
      setting,
      value
    });
  },

  toggle: (setting, defaultValue) => {
    FluxDispatcher.dispatch({
      type: FluxActions.TOGGLE_SETTING,
      setting,
      defaultValue
    });
  },

  delete: (setting) => {
    FluxDispatcher.dispatch({
      type: FluxActions.DELETE_SETTING,
      setting
    });
  }
}))(comp);

const settingStore = new SettingsStore(FluxDispatcher, { // always return true to update properly
  [FluxActions.TOGGLE_SETTING]: ({ setting, defaultValue }) => settingStore.toggle(setting, defaultValue) || true,
  [FluxActions.UPDATE_SETTING]: ({ setting, value }) => settingStore.update(setting, value) || true,
  [FluxActions.DELETE_SETTING]: ({ setting }) => settingStore.delete(setting) || true
});


module.exports = class Plugin {
  constructor() {
    this.settings = settingStore;

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