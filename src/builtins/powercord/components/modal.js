const { React } = goosemod.webpackModules.common;

const mod = goosemod.webpackModules.findByProps('ModalRoot');

const Modal = props => React.createElement(mod.ModalRoot, {
  ...props,
  transitionState: 1
});

for (const x in mod) Modal[x] = mod[x];

// PC has custom exports because
for (const x of [ 'Header', 'Footer', 'Content', 'ListContent', 'CloseButton' ]) Modal[x] = Modal['Modal' + x];
Modal.Sizes = Modal.ModalSize;

module.exports = {
  Modal,
  Confirm: goosemod.webpackModules.findByDisplayName('ConfirmModal')
};