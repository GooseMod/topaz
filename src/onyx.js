const unsentrify = (obj) => Object.keys(obj).reduce((acc, x) => { acc[x] = obj[x].__sentry_original__ ?? obj[x]; return acc; }, {});

class Onyx {
  constructor() {
    const context = {};

    for (const k of [ 'goosemod' ]) { // allowed globals
      context[k] = window[k];
    }

    context.console = unsentrify(window.console); // unsentrify console funcs

    context.window = context;
    context.global = context;

    this.context = context;
  }

  eval(code) {
    const preCode = `const window=this;
const global=this;
const globalThis=this;
const module={};\n\n`;

    const postCode = `\n\nreturn module.exports;`;

    const func = (new Function(preCode + code + postCode)).bind(this.context);

    return func();
  }
};

Onyx //# sourceURL=Onyx