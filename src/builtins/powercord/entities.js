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

  error(...args) {
    console.error(this.entityID, ...args);
  }

  get settings() {
    return powercord.api.settings.store;
  }

  _topaz_start() {
    this.startPlugin.bind(this)();
  }

  _topaz_stop() {
    this.stylesheets.forEach((x) => x.remove());

    this.pluginWillUnload.bind(this)();
  }

  _load = this._topaz_start
  _unload = this._topaz_stop
}

module.exports = {
  Plugin
};