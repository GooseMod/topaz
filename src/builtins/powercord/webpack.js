const makeFinalFilter = (filter) => {
  if (Array.isArray(filter)) return (mod) => filter.every(p => (mod[p] ?? (mod.__proto__ && mod.__proto__[p])) !== undefined);
  return filter;
};


module.exports = {
  getModule: (filter, retry = true, _forever = false) => { // Ignoring retry and forever arguments for basic implementation
    filter = makeFinalFilter(filter);

    const result = goosemod.webpackModules.find(filter);

    if (!retry) { // retry = false: sync, retry = true: async (returns Promise)
      return result;
    }

    return new Promise((res) => res(result));
  },

  getAllModules: (filter) => {
    filter = makeFinalFilter(filter);

    return goosemod.webpackModules.findAll(filter);
  },

  getModuleByDisplayName: (displayName) => {
    // Use custom find instead of GM's findByDisplayName as PC's is case insensitive
    return goosemod.webpackModules.find((x) => x.displayName && x.displayName.toLowerCase() === displayName.toLowerCase());
  },

  // Common

  i18n: goosemod.webpackModules.find(x => x.getLanguages && x.Messages?.ACCOUNT),

  // Auto generated by script
  messages: goosemod.webpackModules.findByProps('sendMessage', 'editMessage', 'deleteMessage'),
  typing: goosemod.webpackModules.findByProps('startTyping'),
  http: goosemod.webpackModules.findByProps('getAPIBaseURL', 'get', 'put', 'post'),
  constants: goosemod.webpackModules.findByProps('Endpoints', 'AuditLogActionTypes', 'AutoCompleteResultTypes', 'BITRATE_DEFAULT'),
  channels: goosemod.webpackModules.findByProps('getChannelId', 'getLastSelectedChannelId', 'getVoiceChannelId'),
  spotify: goosemod.webpackModules.findByProps('play', 'pause', 'fetchIsSpotifyProtocolRegistered'),
  spotifySocket: goosemod.webpackModules.findByProps('getActiveSocketAndDevice', 'getPlayerState', 'hasConnectedAccount'),
  React: goosemod.webpackModules.findByProps('createRef', 'createElement', 'Component', 'PureComponent'),
  ReactDOM: goosemod.webpackModules.findByProps('render', 'createPortal'),
  contextMenu: goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu'),
  modal: goosemod.webpackModules.findByProps('openModal', 'openModalLazy', 'closeAllModals'),
  Flux: goosemod.webpackModules.findByProps('Store', 'connectStores'),
  FluxDispatcher: goosemod.webpackModules.findByProps('_currentDispatchActionType', '_processingWaitQueue'),
  Router: goosemod.webpackModules.findByProps('BrowserRouter', 'Router'),
  hljs: goosemod.webpackModules.findByProps('initHighlighting', 'highlight'),
};