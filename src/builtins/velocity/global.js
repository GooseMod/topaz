let VApi;

(() => {
const cssEls = {};
const unpatches = {};

const Webpack = goosemod.webpackModules;

const Patcher = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(args, ret); }, false);

  unpatches[id].push(unpatch);
  return unpatch;
};

Patcher.after = Patcher;
Patcher.instead = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(args, original, this); }, false, true);

  unpatches[id].push(unpatch);
  return unpatch;
};
Patcher.before = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(args, this); }, true);

  unpatches[id].push(unpatch);
  return unpatch;
};
Patcher.unpatchAll = (id) => {
  let arr = id;
  if (typeof id === 'string') arr = unpatches[id] ?? [];

  arr.forEach(x => x());
  if (typeof id === 'string') unpatches[id] = [];
};

VApi = {
  WebpackModules: {
    find: (filter) => {
      switch (typeof filter) {
        case 'string': return goosemod.webpackModules.find(x => x.displayName === filter || x.default.displayName === filter, false);
        case 'number': return goosemod.webpackModules.findByModuleId(filter);
      }

      if (Array.isArray(filter)) return goosemod.webpackModules.findByProps(...filter);

      return goosemod.webpackModules.find(filter);
    }
  },

  Styling: {
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
  },

  Patcher,

  Logger: {

  },

  VelocityElements: {
    head: document.head
  },

  showToast: (header, content, props) => {
    goosemod.showToast(content, {
      subtext: header,
      ...props
    });
  },


  React: Webpack.common.React,
  ReactDOM: Webpack.common.ReactDOM
};
})();