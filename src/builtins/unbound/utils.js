module.exports = {
  DOM: {
    appendStyle: (id, css) => {
      const el = document.createElement('style');
      el.appendChild(document.createTextNode(css));
      document.body.appendChild(el);

      return el;
    }
  },

  bind: function (target, key, descriptor) {
    descriptor.value = descriptor.value.bind(target);
  },

  ...goosemod.reactUtils
};