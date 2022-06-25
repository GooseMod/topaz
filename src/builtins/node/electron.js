const { copy } = goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy'); // Use Webpack module for Web support (instead of DiscordNative)

module.exports = {
  clipboard: {
    writeText: (text) => copy(text),
    readText: () => window.DiscordNative ? DiscordNative.clipboard.read() : 'clipboard' // await navigator.clipboard.readText()
  },

  shell: {
    openExternal: (url) => window.open(url)
  }
};