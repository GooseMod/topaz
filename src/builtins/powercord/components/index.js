module.exports = {
  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer').TooltipContainer,
  Spinner: goosemod.webpackModules.findByProps('Spinner').Spinner,

  AsyncComponent: { // perfect
    from: (comp) => comp
  }
};