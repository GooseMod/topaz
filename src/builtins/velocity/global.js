const SettingComps = require('powercord/components/settings');

let VApi;

(() => {
const cssEls = {};
const unpatches = {};

const Webpack = goosemod.webpackModules;

const dataLSId = (id) => 'topaz_vel_' + __entityID.replace('https://raw.githubusercontent.com/', '').replace(/[^A-Za-z0-9]/g, '') + '_' + id;
const bindPatch = (func, unpatch) => func.bind({ unpatch }); // Overriding props in original this, better way?

const Patcher = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return bindPatch(patch, unpatch)(this, args, ret); }, false);

  unpatches[id].push(unpatch);
  return unpatch;
};

Patcher.after = Patcher;
Patcher.instead = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return bindPatch(patch, unpatch)(this, args, original); }, false, true);

  unpatches[id].push(unpatch);
  return unpatch;
};
Patcher.before = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args) { return bindPatch(patch, unpatch)(this, args); }, true);

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
        case 'string': return goosemod.webpackModules.findByDisplayName(filter);
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

setTimeout(() => {
  const lsId = dataLSId(__entityID);
  const saveSettings = () => {
    localStorage.setItem(lsId, JSON.stringify(module.exports.Plugin.settings ?? {}));
  };

  if (module.exports.Plugin.getSettingsPanel) module.exports.Plugin.__settings = {
    render: class VelocitySettingsWrapper extends React.PureComponent {
      constructor(props) {
        super(props);

        this.ret = module.exports.Plugin.getSettingsPanel();
      }

      render() {
        return React.createElement('div', {

        },
          ...this.ret.map(x => {
            switch (x.type) {
              case 'input':
                return React.createElement(SettingComps.TextInput, {
                  note: x.note,
                  defaultValue: module.exports.Plugin.settings[x.setting] ?? x.placeholder,
                  required: true,
                  onChange: val => {
                    x.action(val);

                    module.exports.Plugin.settings[x.setting] = val;
                    saveSettings();
                  }
                }, x.name);
            }
          })
        );
      }
    }
  };

  module.exports.Plugin.settings = JSON.parse(localStorage.getItem(lsId) ?? '{}');
}, 1);
})();