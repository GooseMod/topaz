let ZeresPluginLibrary = {
  buildPlugin: (config) => {
    const meta = config.info;
    const id = meta.name;

    return [
      class Plugin {
        start() {
          this.onStart();
        }

        stop() {
          this.onStop();
        }

        getName() { return meta.name; }
        getDescription() { return meta.description; }
        getVersion() { return meta.version; }
        getAuthor() { return meta.authors.map(x => x.name).join(', '); }
      },

      {
        Patcher: Object.keys(BdApi.Patcher).reduce((acc, x) => { acc[x] = BdApi.Patcher[x].bind(this, id); return acc; }),

        WebpackModules: {
          getByProps: goosemod.webpackModules.findByProps,
          getAllByProps: goosemod.webpackModules.findByPropsAll,
          getByDisplayName: goosemod.webpackModules.findByDisplayName,
          getModule: goosemod.webpackModules.find,
          getModules: goosemod.webpackModules.findAll
        }
      }
    ];
  }
};