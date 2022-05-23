const { copy } = goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy'); // Use Webpack module for Web support (instead of DiscordNative)

module.exports = {
  clipboard: {
    writeText: (text) => copy(text),
    readText: () => DiscordNative.clipboard.read()
  }
};