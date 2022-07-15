let cumcord;

(() => {
cumcord = {
  patcher: {
    before: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, true),
    after: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler),
    instead: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, false, true),

    findAndPatch: (find, handler) => {
      let unpatch;
      const tryToFind = () => {
        const ret = find();
        if (!ret) return;

        clearInterval(int);
        unpatch = handler(ret);
      };

      const int = setInterval(tryToFind, 5000);
      tryToFind();

      return () => {
        clearInterval(int);
        if (unpatch) unpatch();
      };
    },

    injectCSS: (css) => {
      const el = document.createElement('style');

      el.appendChild(document.createTextNode(css));

      document.head.appendChild(el);

      return el.remove;
    }
  },

  modules: {
    webpack: {
      ...goosemod.webpackModules,

      findByDisplayName: (name, useDefault = true) => goosemod.webpackModules.find(x => x.displayName === name || x.default.displayName === name, useDefault),

      batchFind: (handler) => {
        const mods = [];
        handler(Object.keys(cumcord.modules.webpack).reduce((acc, x) => {
          acc[x] = (...args) => {
            const ret = cumcord.modules.webpack[x](...args);
            mods.push(ret);
          };

          return acc;
        }, {}));

        return mods;
      },
    },

    common: {
      ...goosemod.webpackModules.common
    },
  },

  utils: {
    ...goosemod.reactUtils
  },

  pluginData: { persist: { ghost: {} } }
};

cumcord.modules.webpackModules = cumcord.modules.webpack;
})();