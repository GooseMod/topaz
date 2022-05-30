let BdApi;
let global = window;

(() => {
const cssEls = {};
const unpatches = {};

const Webpack = goosemod.webpackModules;
const { React } = Webpack.common;

const i18n = Webpack.findByPropsAll('Messages')[1];

const dataLSId = (id) => 'topaz_bd_' + __entityID.replace('https://raw.githubusercontent.com/', '').replace(/[^A-Za-z0-9]/g, '') + '_' + id;

BdApi = {
  findModule: Webpack.find,
  findAllModules: Webpack.findAll,
  findModuleByProps: Webpack.findByProps,
  findModuleByDisplayName: Webpack.findByDisplayName,


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


  loadData: (id, key) => JSON.parse(localStorage.getItem(dataLSId(id)) ?? '{}')[key],

  saveData: (id, key, value) => {
    const lsId = dataLSId(id);
    const data = JSON.parse(localStorage.getItem(lsId) ?? '{}');

    data[key] = value;

    localStorage.setItem(lsId, JSON.stringify(data));

    return data[key];
  },

  deleteData: (id, key) => {
    const lsId = dataLSId(id);
    const data = JSON.parse(localStorage.getItem(lsId) ?? '{}');

    data[key] = undefined;
    delete data[key];

    localStorage.setItem(lsId, JSON.stringify(data));

    return data[key];
  },


  showConfirmationModal: async (title, content, { onConfirm, onCancel, confirmText, cancelText, danger, key } = {}) => {
    const Text = findByDisplayName("Text");
    const Markdown = find((x) => x.displayName === 'Markdown' && x.rules);
    const ButtonColors = findByProps('button', 'colorRed');

    const res = await new Promise((res) => Webpack.findByProps('openModal', 'updateModal').openModal(e => {
      if (e.transitionState === 3) res(false);

      return React.createElement(findByDisplayName("ConfirmModal"), {
        header: title,
        confirmText: confirmText ?? i18n.Messages.OKAY,
        cancelText: cancelText ?? i18n.Messages.CANCEL,
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
  },


  Patcher: {
    instead: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const original = Object.assign({}, parent)[key];

      const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args, original.bind(this)); }, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    before: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    after: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    unpatchAll: (id) => {
      let arr = id;
      if (typeof id === 'string') arr = unpatches[id] ?? [];
      
      arr.forEach(x => x());
    }
  },


  React: Webpack.common.React,
  ReactDOM: Webpack.common.ReactDOM
};
})();