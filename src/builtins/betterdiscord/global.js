let BdApi;
(() => {
const cssEls = {};
const unpatches = {};

const Webpack = goosemod.webpackModules;
const { React } = Webpack.common;

const i18n = Webpack.findByPropsAll('Messages')[1];

const dataLSId = (id) => __entityID + '_bd_' + id;
const bindPatch = (func, unpatch) => func.bind({ unpatch }); // Overriding props in original this, better way?

const makeAddonAPI = (id) => ({
  folder: `/topaz/${id}`, // fake/mock folder

  isEnabled: (x) => false,
  enable: (x) => {},
  disable: (x) => {},
  toggle: (x) => {},
  reload: (x) => {},
  get: (x) => {
    switch (x) {
      case 'ZeresPluginLibrary': return { // temporary https://github.com/programmer2514/BetterDiscord-CollapsibleUI/blob/main/CollapsibleUI.plugin.js#L481
        version: '',
        exports: ZeresPluginLibrary,
        instance: {}
      };
    }

    return undefined;
  },
  getAll: () => ([])
});


const showConfirmationModal = async (title, content, { onConfirm, onCancel, confirmText = i18n.Messages.OKAY, cancelText = i18n.Messages.CANCEL, danger, key } = {}) => {
  const Text = Webpack.findByDisplayName("Text");
  const Markdown = Webpack.find((x) => x.displayName === 'Markdown' && x.rules);
  const ButtonColors = Webpack.findByProps('button', 'colorRed');

  const res = await new Promise((res) => Webpack.findByProps('openModal', 'updateModal').openModal(e => {
    if (e.transitionState === 3) res(false);

    return React.createElement(Webpack.findByDisplayName("ConfirmModal"), {
      header: title,
      confirmText,
      cancelText,
      confirmButtonColor: ButtonColors[danger ? 'colorRed' : 'colorBrand'],
      onClose: () => res(false), // General close (?)
      onCancel: () => { // Cancel text
        res(false);
        e.onClose();
      },
      onConfirm: () => { // Confirm button
        res(true);
        e.onClose();
      },
      transitionState: e.transitionState
    },
      ...content.split('\n').map((x) => React.createElement(Markdown, {
        size: Text.Sizes.SIZE_16
      }, x))
    );
  }, { modalKey: key }));

  if (res) onConfirm?.();
    else onCancel?.();
};

BdApi = window.BdApi = {
  findModule: Webpack.find,
  findAllModules: Webpack.findAll,
  findModuleByProps: Webpack.findByProps,
  findModuleByDisplayName: Webpack.findByDisplayName,

  Webpack: {
    getModule: (filter, { first = true, defaultExport = true } = {}) => Webpack[first ? 'find' : 'findAll'](filter, defaultExport),
    getBulk: (...filters) => filters.map(({ filter, first = true, defaultExport = true } = {}) => Webpack[first ? 'find' : 'findAll'](filter, defaultExport)),


    Filters: {
      combine: filters => x => filters.every(y => y(x)),

      byProps: (props, filter = x => x) => x => {
        if (!x || (typeof x !== 'object' && typeof x !== 'function')) return false;

        const toTest = filter(x);
        if (!toTest) return false;

        return props.every(p => p in toTest) ?? false;
      },

      byPrototypeFields: (props, filter = x => x) => x => {
        if (!x || (typeof x !== 'object' && typeof x !== 'function')) return false;

        const toTest = filter(x);
        if (!toTest?.prototype) return false;

        return props.every(p => p in toTest.prototype) ?? false;
      },

      byRegex: (reg, filter = x => x) => x => {
        const toTest = filter(x);
        if (!toTest) return false;

        return toTest.toString([]).search(reg) !== -1;
      },

      byStrings: (...strings) => x => {
        const str = x.toString([]);
        return strings.every(x => str.includes(x));
      },

      byDisplayName: name => x => x?.displayName === name
    }
  },

  getInternalInstance: goosemod.reactUtils.getReactInstance,

  injectCSS: (id, css) => {
    const el = document.createElement('style');

    el.appendChild(document.createTextNode(css)); // Load the stylesheet via style element w/ CSS text

    document.head.appendChild(el);

    cssEls[id] = el;
  },

  clearCSS: (id) => {
    if (!cssEls[id]) return;

    cssEls[id].remove();

    cssEls[id] = undefined;
    delete cssEls[id];
  },


  loadData: (id, key) => JSON.parse(topaz.storage.get(dataLSId(id)) ?? '{}')[key],
  getData: (...args) => BdApi.loadData(...args), // alias

  saveData: (id, key, value) => {
    const lsId = dataLSId(id);
    const data = JSON.parse(topaz.storage.get(lsId) ?? '{}');

    data[key] = value;

    topaz.storage.set(lsId, JSON.stringify(data));

    return data[key];
  },
  setData: (...args) => BdApi.saveData(...args), // alias

  deleteData: (id, key) => {
    const lsId = dataLSId(id);
    const data = JSON.parse(topaz.storage.get(lsId) ?? '{}');

    data[key] = undefined;
    delete data[key];

    topaz.storage.set(lsId, JSON.stringify(data));

    return data[key];
  },

  isSettingEnabled: (...path) => true,
  disableSetting: (...path) => {},
  enableSetting: (...path) => {},


  showConfirmationModal,
  alert: (title, content) => showConfirmationModal(title, content, { cancelText: null }),

  Patcher: {
    instead: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return bindPatch(patch, unpatch)(this, args, original); }, false, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    before: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args) { return bindPatch(patch, unpatch)(this, args); }, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    after: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return bindPatch(patch, unpatch)(this, args, ret); }, false);

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

  Plugins: makeAddonAPI('plugins'),
  Themes: makeAddonAPI('themes'),

  React: Webpack.common.React,
  ReactDOM: Webpack.common.ReactDOM
};
})();