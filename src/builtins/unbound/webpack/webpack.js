const bulkify = (original) => (...args) => {
  const opts = args[args.length - 1];
  if (opts.bulk) return args.slice(0, -1).map(x => original(...x));

  return original(...args);
}

module.exports = {
  findByProps: bulkify(goosemod.webpackModules.findByProps),
  findByDisplayName: (name, opts = {}) => goosemod.webpackModules.find(x => x.displayName === name || x.default?.displayName === name, opts.interop ?? true),

  bulk: (...filters) => filters.map(x => goosemod.webpackModules.find(x, false)),
  findLazy: (filter) => new Promise(res => {
    const check = () => {
      const ret = goosemod.webpackModules.find(filter);
      if (!ret) return;

      res(ret);
      clearInterval(int);
    };

    const int = setInterval(check, 1000);
    check();
  }),

  filters: {
    byProps: (...props) => (x) => props.every(y => x.hasOwnProperty(y) || (x.__proto__?.hasOwnProperty?.(y))),
    byDisplayName: (name, exportDefault = false) => (x) => {
      if (x.displayName === name) return x;
      if (x.default?.displayName === name) return exportDefault ? x.default : x;
    }
  },

  // todo: temporary as astra and unbound use same import names
  getByProps: goosemod.webpackModules.findByProps,
  getByDisplayName: (name, opts) => {
    const ret = goosemod.webpackModules.find(x => x.displayName === name || x.default?.displayName === name, false);

    return opts.ret === 'exports' ? ret : ret[name];
  },

  MessageActions: goosemod.webpackModules.findByProps('sendMessage')
};