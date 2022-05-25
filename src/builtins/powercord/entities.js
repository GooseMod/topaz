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
    const store = powercord.__topaz.settingStore;

    return { // Basic wrapper with renamed functions
      get: store.getSetting,
      set: store.updateSetting,
      delete: store.deleteSetting,

      getKeys: store.getKeys,

      store: store.store,

      connectStore: () => {} // Unneeded util func, but here incase it is attempted to be called
    };
  }

  _topaz_start() {
    this.startPlugin.bind(this)();
  }

  _topaz_stop() {
    this.stylesheets.forEach((x) => x.remove());

    this.pluginWillUnload.bind(this)();
  }
}

module.exports = {
  Plugin
};