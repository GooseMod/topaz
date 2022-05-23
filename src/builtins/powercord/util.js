const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  sleep,

  waitFor: async (query) => {
    while (true) {
      const el = document.querySelector(query);
      if (el) return el;

      await sleep(5);
    }
  },

  ...goosemod.reactUtils // Export GooseMod React utils
};