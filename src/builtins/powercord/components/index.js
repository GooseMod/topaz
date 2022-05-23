module.exports = {
  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer').TooltipContainer,
  AsyncComponent: { // perfect
    from: (comp) => comp
  }
};