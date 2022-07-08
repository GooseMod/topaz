module.exports = {
  UPlugin: class UPlugin {
    constructor() {

    }

    _topaz_start() {
      this.start.bind(this)();
    }

    _topaz_stop() {
      this.stop.bind(this)();
    }
  }
};