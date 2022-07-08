module.exports = {
  ContextMenu: goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu'),
  Modals: goosemod.webpackModules.findByProps('openModal', 'closeAllModals'),
  Dispatcher: goosemod.webpackModules.common.FluxDispatcher,
  React: goosemod.webpackModules.common.React
};