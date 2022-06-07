const unsentrify = (obj) => Object.keys(obj).reduce((acc, x) => { acc[x] = obj[x].__sentry_original__ ?? obj[x]; return acc; }, {});

// discord's toast for simplicity
const toast = (content, type) => goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast(content, type, { duration: 5000, position: 1 }));

const safeWebpack = (mod) => {
  const blocklist = {
    token: [ // Getting token
      '_dispatchToken', '_orderedCallbackTokens', '_computeOrderedCallbackTokens', // Flux
      'IS_SEARCH_FILTER_TOKEN', 'IS_SEARCH_ANSWER_TOKEN', 'SearchTokenTypes', 'TOKEN_REGEX', 'TOKEN_KEY', // Constants
    ],

    login: [ // Login

    ],

    email: [ // Email

    ],

    // todo: user info, message info, etc - prompt the user
  };


  const keys = typeof mod === 'object' ? Reflect.ownKeys(mod) : [];
  // if (keys.includes('Blob')) throw new Error('Onyx blocked access to window in Webpack', mod); // block window

  const hasFlags = keys.some(x => typeof x === 'string' && Object.keys(blocklist).some(y => x.toLowerCase().includes(y))); // has any potential bad key keywords
  return hasFlags ? new Proxy(mod, { // make proxy only if potential
    get: (target, prop, reciever) => {
      if (Object.keys(blocklist).some(x => prop.toLowerCase().includes(x) && !blocklist[x].includes(prop))) {
        toast(`Topaz: Blocked Webpack (${prop})`, 2);
        throw new Error('Onyx blocked access to dangerous property in Webpack: ' + prop);
      }

      return Reflect.get(target, prop, reciever);
    }
  }) : mod;
};


// we have to use function instead of class because classes force strict mode which disables with
const Onyx = function() {
  const context = {};

  // todo: don't allow localStorage, use custom storage api internally
  const allowGlobals = [ 'topaz', 'localStorage', 'document', 'setTimeout', 'setInterval', 'clearInterval' ];

  // nullify (delete) all keys in window to start except allowlist
  for (const k of Object.keys(window)) { // for (const k of Reflect.ownKeys(window)) {
    // if (k === 'clearInterval') console.log('AAAA', k, allowGlobals.includes(k));
    if (allowGlobals.includes(k)) continue;
    context[k] = null;
  }

  // wrap webpack in our safety wrapper
  context.goosemod = {
    ...goosemod
  };

  context.goosemod.webpackModules = Object.keys(goosemod.webpackModules).reduce((acc, x) => {
    let orig = goosemod.webpackModules[x];
  
    if (typeof orig !== 'function') { // just do non funcs (common)
      acc[x] = orig;
    } else {
      orig = orig.bind({}); // clone function

      const all = x.toLowerCase().includes('all');
      acc[x] = all ? (...args) => orig(...args).map(safeWebpack) : (...args) => safeWebpack(orig(...args));
    }

    return acc;
  }, {});

  context.console = unsentrify(window.console); // unsentrify console funcs

  context.window = context; // recursive global

  // mock node
  context.global = context;

  context.module = {};

  this.context = context;

  this.eval = function (_code) {
    const code = _code + '\n\n;module.exports';

    with (this.context) {
      return eval(code);
    }
  };

  topaz.log('onyx', 'created execution container successfully');
};

Onyx //# sourceURL=Onyx