module.exports = {
  getByProps: goosemod.webpackModules.findByProps,

  ...goosemod.webpackModules.common,
  MessageStore: goosemod.webpackModules.findByProps('getMessage', 'getRawMessages'),
  UserStore: goosemod.webpackModules.findByProps('getCurrentUser', 'getUser'),
};