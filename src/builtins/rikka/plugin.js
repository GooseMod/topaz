module.exports = class RikkaPlugin {
  _topaz_start() {
    this.inject.bind(this)();
  }

  _topaz_stop() {

  }
}