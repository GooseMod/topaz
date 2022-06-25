const allIcons = goosemod.webpackModules.findAll(x => typeof x === 'function' && x.toString().indexOf('"currentColor"') !== -1);
const Icon = (_props) => {
  const props = Object.assign({}, _props);
  delete props.name;

  return React.createElement(allIcons.find(x => x.displayName === _props.name), props);
};

Icon.Names = allIcons.map(x => x.displayName);


module.exports = {
  Icon,


  Clickable: goosemod.webpackModules.findByDisplayName('Clickable'),
  Button: goosemod.webpackModules.findByProps('DropdownSizes'),

  Card: goosemod.webpackModules.findByDisplayName('Card'),
  Spinner: goosemod.webpackModules.findByDisplayName('Spinner'),

  HeaderBar: goosemod.webpackModules.findByDisplayName('HeaderBar'),
  TabBar: goosemod.webpackModules.findByDisplayName('TabBar'),

  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer').TooltipContainer,

  FormTitle: goosemod.webpackModules.findByDisplayName('FormTitle'),
  FormNotice: goosemod.webpackModules.findByDisplayName('FormNotice'),
  Text: goosemod.webpackModules.findByDisplayName('LegacyText'),
  Flex: goosemod.webpackModules.findByDisplayName('Flex'),

  AdvancedScrollerThin: goosemod.webpackModules.findByProps('AdvancedScrollerThin').AdvancedScrollerThin,
  AdvancedScrollerAuto: goosemod.webpackModules.findByProps('AdvancedScrollerAuto').AdvancedScrollerAuto,
  AdvancedScrollerNone: goosemod.webpackModules.findByProps('AdvancedScrollerNone').AdvancedScrollerNone,

  AsyncComponent: powercord.__topaz.AsyncComponent,

  settings: require('powercord/components/settings')
};