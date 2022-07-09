module.exports = {
  Plugin: class Plugin {
    _topaz_start() {
      this.start.bind(this)();
    }

    _topaz_stop() {
      this.stop.bind(this)();
    }

    get settings() {
      return vizality.api.settings.store;
    }
  }
};