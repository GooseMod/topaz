const unpatches = [];

module.exports = {
  Patcher: {
    instead: (parent, key, patch) => {
      const unpatch = goosemod.patcher.patch(parent, key, function (args, original) {
        const ctx = {
          result: undefined,
          original
        };

        patch(ctx, ...args);

        return ctx.result;
      }, false, true);

      unpatches.push(unpatch);
      return unpatch;
    },

    before: (parent, key, patch) => {
      const unpatch = goosemod.patcher.patch(parent, key, function (args) {
        const ctx = {
          result: undefined
        };

        patch(ctx, ...args);

        return ctx.result;
      }, true);

      unpatches.push(unpatch);
      return unpatch;
    },

    after: (parent, key, patch) => {
      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) {
        const ctx = {
          result: ret
        };

        patch(ctx, ret, ...args);

        return ctx.result;
      }, false);

      unpatches.push(unpatch);
      return unpatch;
    },

    unpatchAll: () => {
      unpatches.forEach(x => x());
    }
  }
};