module.exports = {
  clipboard: {
    writeText: (text) => goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy')['copy'](text),
    readText: () => window.DiscordNative ? DiscordNative.clipboard.read() : 'clipboard' // await navigator.clipboard.readText()
  },

  shell: {
    openExternal: (url) => window.open(url)
  }
};