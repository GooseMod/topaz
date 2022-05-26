let BdApi;

(() => {
const cssEls = {};
const unpatches = {};

BdApi = {
  findModule: goosemod.webpackModules.find,
  findModuleByProps: goosemod.webpackModules.findByProps,
  findModuleByDisplayName: goosemod.webpackModules.findByDisplayName,


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


  saveData: (id, key, value) => { // todo: implement save/load data

  },

  loadData: (id, key) => {

  },


  Patcher: {
    instead: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const original = Object.assign({}, parent)[key];
      unpatches[id].push(goosemod.patcher.patch(parent, key, function (args) { return patch(this, args, original.bind(this)); }, true));
    },

    before: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      unpatches[id].push(goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true));
    },

    after: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      unpatches[id].push(goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false));
    },

    unpatchAll: (id) => {
      if (!unpatches[id]) return;
      
      unpatches[id].forEach(x => x());
    }
  },


  React: goosemod.webpackModules.common.React,
  ReactDOM: goosemod.webpackModules.common.ReactDOM
}
})();