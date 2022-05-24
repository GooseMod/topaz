const modalManager = goosemod.webpackModules.findByProps('openModal', 'updateModal');
const Modal = goosemod.webpackModules.findByProps('ModalRoot');

let lastId;
module.exports = {
  open: (comp) => lastId = modalManager.openModal(props => React.createElement(Modal.ModalRoot, {
    ...props,
    className: 'topaz-pc-modal-jank'
  }, React.createElement(comp))),

  close: () => modalManager.closeModal(lastId),

  closeAll: () => modalManager.closeAllModals()
};