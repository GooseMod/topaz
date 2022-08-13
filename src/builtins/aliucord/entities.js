const { Patcher } = require('aliucord/utils');

class Plugin {
  _topaz_start() {
    this.start.bind(this)();
  }

  _topaz_stop() {
    Patcher.unpatchAll();
  }
}

module.exports = {
  Plugin
};