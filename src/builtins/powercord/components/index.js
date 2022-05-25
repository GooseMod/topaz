module.exports = {
  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer').TooltipContainer,
  Spinner: goosemod.webpackModules.findByDisplayName('Spinner'),

  AsyncComponent: { // perfect
    from: (comp) => comp
  }
};