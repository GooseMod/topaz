const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;
const Patcher = require('@patcher');

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
      POWERCORD_SETTINGS_UPDATE: ({ category, settings }) => updateSettings(category, settings),
      POWERCORD_SETTING_TOGGLE: ({ category, setting, defaultValue }) => toggleSetting(category, setting, defaultValue),
      POWERCORD_SETTING_UPDATE: ({ category, setting, value }) => updateSetting(category, setting, value),
      POWERCORD_SETTING_DELETE: ({ category, setting }) => deleteSetting(category, setting)
    });
  }

  get patcher() {
    return Patcher.create(this.data.id);
  }

  _topaz_start() {
    this.start.bind(this)();
  }

  _topaz_stop() {
    this.stop.bind(this)();
  }
}