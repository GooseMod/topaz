let demon;

(() => {
demon = {
  summon: mod => {
    switch (mod) {
      case 'modules/webpack': return {
        ...goosemod.webpackModules
      };

      case 'patcher': return {
        before: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, true),
        after: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler),
        instead: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, false, true),
      };

      case 'utils/logger': return {
        makeLogger: (func, name) => (regions, ...msg) => func(name, ...regions, ...msg)
      };
    }
  }
};
})();