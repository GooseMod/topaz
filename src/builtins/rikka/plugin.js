module.exports = class RikkaPlugin {
  _topaz_start() {
    this.preInject.bind(this)();
    this.inject.bind(this)();
  }

  _topaz_stop() {

  }
}