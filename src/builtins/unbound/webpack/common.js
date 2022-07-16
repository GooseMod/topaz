module.exports = {
  ContextMenu: goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu'),
  Modals: goosemod.webpackModules.findByProps('openModal', 'closeAllModals'),
  Dispatcher: goosemod.webpackModules.common.FluxDispatcher,
  React: goosemod.webpackModules.common.React,
  Constants: goosemod.webpackModules.findByProps('MAX_MESSAGE_LENGTH'),
  Messages: goosemod.webpackModules.findByProps('sendMessage'),
  Users: goosemod.webpackModules.findByProps('getCurrentUser'),
};