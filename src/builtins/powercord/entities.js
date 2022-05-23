const { Settings } = powercord.__topaz;

class Plugin {
  constructor() {
    this.stylesheets = [];
  }

  loadStylesheet(css) {
    const el = document.createElement('style');

    el.appendChild(document.createTextNode(css)); // Load the stylesheet via style element w/ CSS text

    document.head.appendChild(el);
  
    this.stylesheets.push(el); // Push to internal array so we can remove the elements on unload
  }

  get settings() {
    const store = Settings.settingStores[this.entityID];

    return { // Basic wrapper with renamed functions
      get: store.getSetting,
      set: store.updateSetting,
      delete: store.deleteSetting,

      getKeys: store.getKeys,

      connectStore: () => {} // Unneeded util func, but here incase it is attempted to be called
    };
  }

  start() {
    Settings.makeStore(this.entityID);

    this.startPlugin.bind(this)();
  }

  stop() {
    this.stylesheets.forEach((x) => x.remove());

    this.pluginWillUnload.bind(this)();
  }
}

module.exports = {
  Plugin
};