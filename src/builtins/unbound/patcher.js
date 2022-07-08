const unpatches = {};

module.exports = {
  create: (id) => {
    unpatches[id] = [];

    return {
      instead: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, args, original); }, false, true);

        unpatches[id].push(unpatch);
        return unpatch;
      },

      before: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

        unpatches[id].push(unpatch);
        return unpatch;
      },

      after: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false);

        unpatches[id].push(unpatch);
        return unpatch;
      },

      unpatchAll: () => {
        unpatches[id].forEach(x => x());
      }
    };
  },

  // todo: temporary as astra and unbound use same import names
  instead: (id, parent, key, patch) => {
    const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, original, args); }, false, true);

    if (!unpatches[id]) unpatches[id] = [];
    unpatches[id].push(unpatch);

    return unpatch;
  },

  before: (id, parent, key, patch) => {
    const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

    if (!unpatches[id]) unpatches[id] = [];
    unpatches[id].push(unpatch);

    return unpatch;
  },

  after: (id, parent, key, patch) => {
    const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, ret, args); }, false);

    if (!unpatches[id]) unpatches[id] = [];
    unpatches[id].push(unpatch);

    return unpatch;
  },

  unpatchAll: (id) => {
    if (!unpatches[id]) return;

    unpatches[id].forEach(x => x());
  }
};