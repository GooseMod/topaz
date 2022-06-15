const { findByProps } = goosemod.webpackModules;

const anon = true; // use fake values

const bodyAttrs = {
  'data-current-user-id': anon ? '006482395269169152' : findByProps('getCurrentUser').getCurrentUser().id
};

const manager = {
  add: () => {
    for (const x in bodyAttrs) {
      document.body.setAttribute(x, bodyAttrs[x]);
    }
  },

  remove: () => {
    for (const x in bodyAttrs) {
      document.body.removeAttribute(x);
    }
  }
};

manager.add();

manager