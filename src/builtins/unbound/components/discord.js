module.exports = {
  Menu: goosemod.webpackModules.findByProps("MenuRadioItem", "MenuItem"),
  Modal: goosemod.webpackModules.findByProps('ModalRoot'),
  FormText: goosemod.webpackModules.findByDisplayName('FormText'),
  FormTitle: goosemod.webpackModules.findByDisplayName('FormTitle'),
};