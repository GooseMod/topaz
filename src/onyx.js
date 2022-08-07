const unsentrify = (obj) => Object.keys(obj).reduce((acc, x) => {
  const sub = obj[x].__REACT_DEVTOOLS_ORIGINAL_METHOD__ ?? obj[x];
  acc[x] = sub.__sentry_original__ ?? sub;
  return acc;
}, {});
const makeSourceURL = (name) => topaz.debug ? ('Onyx' + Math.random().toString().slice(2)) : `${name} | Topaz`.replace(/ /g, '%20');
const prettifyString = (str) => str.replaceAll('_', ' ').split(' ').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

// discord's toast for simplicity
const toast = (content, type) => goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast(content, type, { duration: 5000, position: 1 }));

const permissions = {
  token_read: [ 'getToken', 'showToken' ], // get + show
  token_write: [ 'setToken', 'removeToken', 'hideToken', 'showToken' ], // set + more general
  actions_typing: [ 'startTyping', 'stopTyping' ],
  actions_send: [ 'sendMessage' ],
  readacc_username: [ 'getCurrentUser@username' ],
  readacc_discrim: [ 'getCurrentUser@discriminator' ],
  readacc_email: [ 'getCurrentUser@email' ],
  readacc_phone: [ 'getCurrentUser@phone' ],
  friends_readwho: [ 'getRelationships', 'isFriend' ],
  // friends_check_friend: [ 'isFriend' ],
  // friends_check_blocked: [ 'isBlocked' ],
  status_readstatus: [ 'getStatus', 'isMobileOnline' ],
  status_readactivities: [ 'findActivity', 'getActivities', 'getActivityMetadata', 'getAllApplicationActivities', 'getApplicationActivity', 'getPrimaryActivity' ],
  clipboard_read: [],
  clipboard_write: [ 'copy', 'writeText' ]
};

const complexMap = Object.keys(permissions).reduce((acc, x) => acc.concat(permissions[x].filter(y => y.includes('@')).map(y => [ x, ...y.split('@') ])), []);

const mimic = (orig) => {
  const origType = typeof orig; // mimic original value with empty of same type to try and not cause any errors directly

  switch (origType) {
    case 'function': return () => ([]); // return empty array instead of just undefined to play nicer
  }

  return window[origType[0].toUpperCase() + origType.slice(1)]();
};

const parseStack = (stack) => [...stack.matchAll(/^    at (.*?)( \[as (.*)\])? \((.*)\)$/gm)].map(x => ({
  func: x[1],
  alias: x[3],
  source: x[4],
  sourceType: x[4].startsWith('Topaz') ? 'topaz' : (x[4].includes('discord.com/') ? 'discord' : (x[4] === '<anonymous>' ? 'anonymous' : 'unknown'))
}));

const shouldPermitViaStack = () => {
  const stack = parseStack(Error().stack).slice(2, -2); // slice away onyx wrappers

  const inClone = !!stack.find(x => (x.func === 'assign' || x.func === 'Function.assign') && x.source === '<anonymous>');

  const internalDiscordClone = inClone && stack[1].sourceType === 'discord';

  return internalDiscordClone;
};

const perms = {
  'Token': {
    'Read your token': 'token_read',
    'Set your token': 'token_write'
  },
  'Actions': {
    'Set typing state': 'actions_typing',
    'Send messages': 'actions_send'
  },
  'Account': {
    'See your username': 'readacc_username',
    'See your discriminator': 'readacc_discrim',
    'See your email': 'readacc_email',
    'See your phone number': 'readacc_phone'
  },
  'Friends': {
    'See who you are friends with': 'friends_readwho'
  },
  'Status': {
    'See status of users': 'status_readstatus',
    'See activities of users': 'status_readactivities'
  },
  'Clipboard': {
    'Write to your clipboard': 'clipboard_write',
    'Read from your clipboard': 'clipboard_read'
  }
};


const permissionsModal = async (manifest, neededPerms) => {
  const ButtonColors = goosemod.webpackModules.findByProps('button', 'colorRed');

  const Text = goosemod.webpackModules.findByDisplayName("LegacyText");
  const Markdown = goosemod.webpackModules.find((x) => x.displayName === 'Markdown' && x.rules);

  const Checkbox = goosemod.webpackModules.findByDisplayName('Checkbox');
  const Tooltip = goosemod.webpackModules.findByDisplayName('Tooltip');

  const { React } = goosemod.webpackModules.common;

  const isDangerous = (perm) => [ 'token', 'readacc' ].includes(perm.split('_').shift());
  const whyDangerous = (perm) => ({
    'token': 'Your token allows access to your account',
    'readacc': 'Your account information includes private information'
  })[perm.split('_').shift()];

  class Permission extends React.PureComponent {
    render() {
      const subPerm = Object.values(perms).find(x => Object.values(x).find(y => y === this.props.perm));
      const name = `${Object.keys(perms)[Object.values(perms).indexOf(subPerm)]} > ${Object.keys(subPerm).find(x => subPerm[x] === this.props.perm)}`;

      return React.createElement(Checkbox, {
        type: 'inverted',
        value: this.props.checked,
        onChange: () => {
          this.props.checked = !this.props.checked;
          this.forceUpdate();

          this.props.onChange(this.props.checked);
        },

        className: 'topaz-permission-choice'
      },
        React.createElement(Text, {
          variant: 'text-sm/normal'
        },
          isDangerous(this.props.perm) ? React.createElement(Tooltip, {
            position: 'top',
            color: 'primary',
            tooltipClassName: 'topaz-nomax-tooltip',

            text: whyDangerous(this.props.perm)
          }, ({
            onMouseLeave,
            onMouseEnter
          }) => React.createElement(goosemod.webpackModules.findByDisplayName('WarningCircle'), {
            className: 'topaz-permission-danger-icon',
            width: 18,
            height: 18,

            onMouseEnter,
            onMouseLeave
          })) : null,
          React.createElement('span', {}, name)
        )
      );
    }
  }

  const finalPerms = neededPerms.reduce((acc, x) => { acc[x] = false; return acc; }, {});

  const permsIncludesReads = neededPerms.some(x => x.includes('read'));
  const permsIncludesWrites = neededPerms.some(x => x.includes('write'));
  const permsIncludesActions = neededPerms.some(x => x.includes('action'));

  let permsTypes = [
    permsIncludesReads ? 'read sensitive data' : null,
    permsIncludesWrites ? 'write sensitive data' : null,
    permsIncludesActions ? 'perform senstive actions' : null,
  ].filter(x => x);

  if (permsTypes.length === 1) permsTypes = permsTypes[0];
    else if (permsTypes.length === 2) permsTypes = permsTypes.join(' and ');
    else permsTypes = permsTypes.slice(0, permsTypes.length - 1).join(', ') + ', and ' + permsTypes[permsTypes.length - 1];

  permsTypes = permsTypes.replace('read sensitive data, write sensitive data', 'read and write sensitive data').replace('read sensitive data and write sensitive data', 'read and write sensitive data');

  const res = await new Promise((res) => goosemod.webpackModules.findByProps('openModal', 'updateModal').openModal(e => {
    if (e.transitionState === 3) res(false);

    class Modal extends React.PureComponent {
      render() {
        const allowedCount = Object.values(finalPerms).filter(x => x).length;
        const totalCount = Object.values(finalPerms).length;
        const allSuffix = totalCount > 1 ? ' All' : '';

        return React.createElement(goosemod.webpackModules.findByDisplayName("ConfirmModal"), {
          header: `${manifest.name} requires permissions`,
          confirmText: allowedCount === 0 ? `Deny${allSuffix}` : (allowedCount === totalCount ? `Allow${allSuffix}` : `Allow ${allowedCount}`),
          cancelText: allowedCount === 0 ? '' : `Deny${allSuffix}`,
          confirmButtonColor: allowedCount === 0 ? ButtonColors.colorRed : ButtonColors.colorBrand,
          onClose: () => res(false), // General close (?)
          onCancel: () => { // Cancel text
            res(false);
            e.onClose();
          },
          onConfirm: () => { // Confirm button
            if (allowedCount === 0) res(false);
              else res(true);

            e.onClose();
          },
          transitionState: e.transitionState
        },
          ...(`Topaz requires your permission before allowing **${manifest.name}** to ${permsTypes}:`).split('\n').map((x) => React.createElement(Markdown, {
            size: Text.Sizes.SIZE_16
          }, x)),

          ...Object.keys(finalPerms).map(x => React.createElement(Permission, {
            perm: x,
            onChange: y => {
              finalPerms[x] = y;
              this.forceUpdate();
            },
            checked: finalPerms[x]
          }))
        );
      }
    }

    return React.createElement(Modal);
  }));

  if (res === false) { // Deny all
    for (const x in finalPerms) {
      finalPerms[x] = false;
    }
  }

  return finalPerms;
};

const iframeGlobals = [ 'performance', ];
const passGlobals = [ 'topaz', 'goosemod', 'fetch', 'document', '_', 'TextEncoder', 'TextDecoder', 'addEventListener', 'removeEventListener', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'Node', 'Element', 'MutationEvent', 'MutationRecord', 'IntersectionObserverEntry', 'addEventListener', 'removeEventListener', 'URL', 'setImmediate', 'NodeList', 'getComputedStyle', 'XMLHttpRequest', 'ArrayBuffer', 'Response' ];

// did you know: using innerHTML is ~2.5x faster than appendChild for some reason (~40ms -> ~15ms), so we setup a parent just for making our iframes via this trick
const containerParent = document.createElement('div');
document.body.appendChild(containerParent);

const createContainer = (inst) => {
  containerParent.innerHTML = window.BdApi ? `<object data="about:blank"></object>` : '<iframe></iframe>'; // make iframe. use object (bit slower) if BD is also installed as it breaks sandboxing
  const el = containerParent.children[0];

  const _constructor = el.contentWindow.Function.constructor;
  el.contentWindow.Function.constructor = function() {
    return (_constructor.apply(inst.context, arguments)).bind(inst.context);
  };


  const ev = el.contentWindow.eval;

  for (const k of Object.keys(el.contentWindow)) {
    if (!iframeGlobals.includes(k)) {
      el.contentWindow[k] = undefined;
      delete el.contentWindow[k];
    }
  }

  const realWindow = window;
  Object.defineProperty(el.contentWindow, "event", {
    get: function() {
      return realWindow.event;
    }
  });

  el.remove();

  return ev;
};


// we have to use function instead of class because classes force strict mode which disables with
const Onyx = function (entityID, manifest, transformRoot) {
  const startTime = performance.now();
  const context = {};

  // nullify (delete) all keys in window to start except allowlist
  for (const k of passGlobals) {
    let orig = window[k];
    context[k] = typeof orig === 'function' && k !== '_' && k !== 'NodeList' ? orig.bind(window) : orig; // bind to fix illegal invocation (also lodash breaks bind)
  }

  const observers = [ 'MutationObserver', 'IntersectionObserver' ];
  for (const k of observers) { // janky wrappers because Chromium breaks with disconnected iframe
    context[k] = function(callback) {
      const obs = new window[k]((mutations) => {
        callback(mutations);
      });

      this.observe = obs.observe.bind(obs);
      this.disconnect = obs.disconnect.bind(obs);
      this.takeRecords = obs.takeRecords.bind(obs);

      return this;
    };
  }

  context.DiscordNative = { // basic polyfill
    crashReporter: {
      getMetadata: () => ({
        user_id: this.safeWebpack(goosemod.webpackModules.findByProps('getCurrentUser')).getCurrentUser().id
      })
    },

    clipboard: {
      copy: x => this.safeWebpack(goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy')).copy(x)
    },

    gpuSettings: {
      getEnableHardwareAcceleration: () => true,
      setEnableHardwareAcceleration: () => {},
    }
  };

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
      acc[x] = all ? (...args) => orig(...args).map(x => this.safeWebpack(x)) : (...args) => this.safeWebpack(orig(...args));
    }

    return acc;
  }, {});

  context.goosemodScope = context.goosemod; // goosemod alias

  context.console = window.console.context ? window.console.context('topaz_plugin') : unsentrify(window.console); // use console.context or fallback on unsentrify

  context.location = { // mock location
    href: window.location.href
  };

  context.window = context; // recursive global
  context.globalThis = context;

  // mock node
  context.global = context;
  context.module = {
    exports: {}
  };
  context.process = {
    versions: {
      electron: '13.6.6'
    }
  }

  // fake global_env for more privacy as it should basically never be really needed
  context.GLOBAL_ENV = {
    RELEASE_CHANNEL: 'canary'
  };

  // custom globals
  context.__entityID = entityID;

  this.entityID = entityID;
  this.manifest = manifest;
  this.context = Object.seal(Object.freeze(Object.assign({}, context)));

  const containedEval = createContainer(this);

  let predictedPerms = [];
  this.eval = function (_code) {
    // basic static code analysis for predicting needed permissions
    // const objectPredictBlacklist = [ 'clyde' ];
    // predictedPerms = Object.keys(permissions).filter(x => permissions[x].some(y => [...code.matchAll(new RegExp(`([^. 	]*?)\\.${y}`, 'g'))].some(z => z && !objectPredictBlacklist.includes(z[1].toLowerCase()))));
    // topaz.log('onyx', 'predicted perms for', this.manifest.name, predictedPerms);

    const argumentContext = Object.keys(this.context).filter(x => !x.match(/^[0-9]/) && !x.match(/[-,]/));

    let code = `(function (${argumentContext}) {
${_code}\n\n
;return module.exports;
});
//# sourceURL=${makeSourceURL(this.manifest.name)}`;

    code += '\n' + this.MapGen(code, transformRoot, this.manifest.name);

    let exported = containedEval.bind(this.context)(code).apply(this.context, argumentContext.map(x => this.context[x]));

    return exported;
  };

  let accessedPermissions = {};
  let firstAccess;

  this.safeWebpack = function (mod) {
    const checkPerms = (target, prop, reciever, missingPerm, givenPermissions) => {
      if (!missingPerm) return Reflect.get(target, prop, reciever);

      // toast(`[Topaz] ${name}: Blocked accessing (${prop})`, 2);

      if (!accessedPermissions[missingPerm] && givenPermissions[missingPerm] === undefined) { // First time asking
        accessedPermissions[missingPerm] = true;
        if (!firstAccess) {
          firstAccess = performance.now();

          setTimeout(async () => {
            firstAccess = null;

            const resultPerms = await permissionsModal(this.manifest, Object.keys(accessedPermissions).concat(predictedPerms));
            Object.keys(resultPerms).forEach(x => delete accessedPermissions[x]);

            // save permission allowed/denied
            const store = JSON.parse(topaz.storage.get('permissions') ?? '{}');
            if (!store[this.entityID]) store[this.entityID] = {};

            store[this.entityID] = {
              ...store[this.entityID],
              ...resultPerms
            };

            topaz.storage.set('permissions', JSON.stringify(store));

            /* if (!given && missingPerm === 'token_read') {
              goosemod.showToast(`Halting ${this.manifest.name} as it is potentially dangerous and denied token`, { timeout: 10000, subtext: 'Topaz', type: 'error' });
              throw new Error('Onyx halting potentially dangerous execution');
            } */

            setTimeout(() => topaz.reload(this.entityID), 500); // reload plugin
          }, 500);
        }
      } else if (givenPermissions[missingPerm] === false) {
        // todo: non-invasively warn user blocked perm and probably broken
      }

      // throw new Error('Onyx blocked access to dangerous property in Webpack: ' + prop);

      return mimic(Reflect.get(target, prop, reciever));
    };

    if (mod === undefined) return undefined;

    let keys = [];
    try {
      keys = Reflect.ownKeys(mod).concat(Reflect.ownKeys(mod.__proto__ ?? {}));
    } catch { }

    if (keys.includes('Object')) return context; // Block window
    if (keys.includes('clear') && keys.includes('get') && keys.includes('set') && keys.includes('remove') && !keys.includes('mergeDeep')) return {}; // Block localStorage

    const hasFlags = keys.some(x => typeof x === 'string' && Object.values(permissions).flat().some(y => x === y.split('@')[0])); // has any keys in it
    return hasFlags ? new Proxy(mod, { // make proxy only if potential
      get: (target, prop, reciever) => {
        const givenPermissions = JSON.parse(topaz.storage.get('permissions') ?? '{}')[entityID] ?? {};
        const complexPerms = complexMap.filter(x => x[1] === prop);

        if (complexPerms.length !== 0) {
          const prox = (toProx) => new Proxy(toProx, {
            get: (sTarget, sProp, sReciever) => {
              if (shouldPermitViaStack()) return Reflect.get(sTarget, sProp, sReciever);

              return checkPerms(sTarget, sProp, sReciever, complexPerms.find(x => x[2] === sProp && givenPermissions[x[0]] !== true)?.[0], JSON.parse(topaz.storage.get('permissions') ?? '{}')[this.entityID] ?? {});
            }
          });

          const orig = Reflect.get(target, prop, reciever);

          if (typeof orig === 'function') return function() {
            return prox(orig.apply(this, arguments));
          };

          if (typeof orig === 'object') return prox(orig);
        }

        return checkPerms(target, prop, reciever, Object.keys(permissions).find(x => permissions[x].includes(prop) && givenPermissions[x] !== true), givenPermissions);
      }
    }) : mod;
  };

  topaz.log('onyx', `contained ${manifest.name} in ${(performance.now() - startTime).toFixed(2)}ms`);
};

Onyx //# sourceURL=Onyx