let DrApi;

(() => {
const unpatches = {};

const dataLSId = (id) => 'topaz_bd_' + __entityID.replace('https://raw.githubusercontent.com/', '').replace(/[^A-Za-z0-9]/g, '') + '_' + id;


DrApi = {
  webpack: {
    getModuleByProps: goosemod.webpackModules.findByProps
  },

  storage: {
    loadData: (id, key) => JSON.parse(localStorage.getItem(dataLSId(id)) ?? '{}')[key],
    getData: (...args) => BdApi.loadData(...args), // alias

    saveData: (id, key, value) => {
      const lsId = dataLSId(id);
      const data = JSON.parse(localStorage.getItem(lsId) ?? '{}');

      data[key] = value;

      localStorage.setItem(lsId, JSON.stringify(data));

      return data[key];
    },
    setData: (...args) => BdApi.saveData(...args), // alias

    deleteData: (id, key) => {
      const lsId = dataLSId(id);
      const data = JSON.parse(localStorage.getItem(lsId) ?? '{}');

      data[key] = undefined;
      delete data[key];

      localStorage.setItem(lsId, JSON.stringify(data));

      return data[key];
    },
  },

  Patcher: {
    instead: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(args, original, this); }, false, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    before: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(args, this); }, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    after: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(args, ret, this); }, false);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    unpatchAll: (id) => {
      let arr = id;
      if (typeof id === 'string') arr = unpatches[id] ?? [];

      arr.forEach(x => x());
      if (typeof id === 'string') unpatches[id] = [];
    }
  },

  plugins: {
    isEnabled: (name) => {
      const plugin = Object.values(topaz.internal.plugins).find(x => x.__mod === 'dr' && x.constructor.name === name);
      return plugin ? plugin.__enabled : false;
    }
  }
};
})();