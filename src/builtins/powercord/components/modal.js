const Modal = goosemod.webpackModules.findByProps('ModalRoot');

// PC has custom exports because
for (const x of [ 'Header', 'Footer', 'Content', 'ListContent', 'CloseButton' ]) Modal[x] = Modal['Modal' + x];
Modal.Sizes = Modal.ModalSize;

module.exports = {
  Modal
};