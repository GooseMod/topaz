const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const { getOwnerInstance } = goosemod.reactUtils;

module.exports = {
  sleep,

  waitFor: async (query) => {
    while (true) {
      const el = document.querySelector(query);
      if (el) return el;

      await sleep(5);
    }
  },

  forceUpdateElement: (query, all = false) => {
    for (const x of document[all ? 'querySelectorAll' : 'querySelector'](query)) {
      if (!x) continue;
      getOwnerInstance(x)?.forceUpdate?.();
    }
  },

  ...goosemod.reactUtils // Export GooseMod React utils
};