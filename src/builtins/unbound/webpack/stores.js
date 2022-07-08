module.exports = {
  Guilds: goosemod.webpackModules.findByProps('getGuilds', 'getGuild'),
  Users: goosemod.webpackModules.findByProps('getUser', 'getCurrentUser'),
  Channels: goosemod.webpackModules.findByProps('getMutablePrivateChannels')
};