const makeFinalFilter = (filter) => {
  if (Array.isArray(filter)) {
    const subs = filter;
    filter = (mod) => subs.every((s) => mod[s] || (mod.__proto__ && mod.__proto__[s]));
  }

  return filter;
};

module.exports = {
  getModule: (filter, retry, _forever) => { // Ignoring retry and forever arguments for basic implementation
    filter = makeFinalFilter(filter);

    const result = goosemod.webpackModules.find(filter);

    if (!retry) { // retry = false: sync, retry = true: async (returns Promise)
      return result;
    }

    return new Promise((res) => res(result));
  },

  getAllModules: (filter) => {
    filter = makeFinalFilter(filter);

    return goosemod.webpackModules.findAll(filter);
  },

  getModuleByDisplayName: (displayName) => {
    // Use custom find instead of GM's findByDisplayName as PC's is case insensitive
    return goosemod.webpackModules.find((x) => x.displayName && x.displayName.toLowerCase() === displayName.toLowerCase());
  },

  ...goosemod.webpackModules.common, // Export common modules (eg: React)

  // More common not in GM itself
  messages: goosemod.webpackModules.findByProps('sendMessage', 'deleteMessage')
};

// module.exports.Flux.connectStoresAsync = (stores, callback) => (Comp) => module.exports.Flux.connectStores(await Promise.all(x), (p) => callback()