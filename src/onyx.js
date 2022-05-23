class Onyx {
  constructor() {
    const context = {};

    for (const k of Reflect.ownKeys(window)) {
      context[k] = null;
    }

    for (const k of [ 'console' ]) {
      context[k] = window[k];
    }

    context.window = context;

    this.context = context;
  }

  eval(code) {
    with (this.context) {
      return eval(code);
    }
  }
};

Onyx //# sourceURL=Onyx