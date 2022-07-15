let cumcord;

(() => {
cumcord = {
  patcher: {
    before: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, true),
    after: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler),
    instead: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, false, true),

    injectCSS: (css) => {
      const el = document.createElement('style');

      el.appendChild(document.createTextNode(css));

      document.head.appendChild(el);

      return el;
    }
  },

  modules: {
    webpack: {
      findByDisplayName: (name, useDefault = true) => goosemod.webpackModules.find(x => x.displayName === name || x.default.displayName === name, useDefault),
      findByProps: goosemod.webpackModules.findByProps,
      find: goosemod.webpackModules.find
    },

    common: {
      ...goosemod.webpackModules.common
    }
  }
};

cumcord.modules.webpackModules = cumcord.modules.webpack;
})();