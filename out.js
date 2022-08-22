(async () => {
const log = (_region, ...args) => {
  const modColor = '253, 218, 13'; // New blurple
  const regionColor = '114, 137, 218'; // Old blurple

  const fromStr = (str) => str.replace('rgb(', '').replace(')', '').split(', ');
  const toStr = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

  const light = (str, val) => toStr(fromStr(str).map((x) => x * val));

  const makeRegionStyle = (color) => `background-color: rgb(${color}); color: white; border-radius: 4px; border: 2px solid ${light(color, 0.5)}; padding: 3px 6px 3px 6px; font-weight: bold;`;

  const regions = _region.split('.');

  const regionStrings = regions.map(x => `%c${x}%c`);
  const regionStyling = regions.reduce((res) => res.concat(makeRegionStyle(regionColor), ''), []);

  console.log(`%ctopaz%c ${regionStrings.join(' ')}`,
    makeRegionStyle(modColor).replace('white', 'black'),
    '',

    ...regionStyling,

    ...args
  );
};

if (console.context) window.console = console.context(); // Resets console to normal, removing custom methods patched by various things (Sentry, React DevTools) as it's annoying for stack traces

if (window.topaz && topaz.purge) { // live reload handling
  topaz.__reloading = true;
  topaz.purge(); // fully remove topaz (plugins, css, etc)

  // setTimeout(() => updateOpenSettings(), 1000);
}

window.topaz = {
  version: 'alpha 11.0',
  log
};

const Storage = await eval(`(async () => {
const startTime = performance.now();
const dbReq = indexedDB.open('topaz');

const makeTrans = () => db.transaction([ 'store' ], 'readwrite').objectStore('store');

const debounce = (handler, timeout) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => handler(...args), timeout);
  };
};

const save = debounce(() => makeTrans().put(store, 'store').onsuccess = e => topaz.log('storage', 'db saved'), 200);


let db;
const store = await new Promise(res => {
  dbReq.onerror = e => console.error('topaz failed to open idb db', e);
  dbReq.onsuccess = e => {
    db = e.target.result;

    try {
      makeTrans().get('store').onsuccess = e => {
        res(e.target.result);
      };
    } catch (e) {
      console.error('failed to read from db', e);
    }
  };

  dbReq.onupgradeneeded = e => {
    db = e.target.result;

    const objectStore = db.createObjectStore('store');

    const store = {};

    objectStore.add(store, 'store');

    topaz.log('storage', 'inited db', store);

    res(store);
  };
});


const Storage = {
  set: (key, value) => {
    store[key] = value;
    save();
  },

  get: (key, def) => {
    return store[key] ?? def;
  },

  delete: (key) => {
    delete store[key];
    save();
  },

  keys: () => Object.keys(store),

  store
};

// local storage compat
Storage.setItem = Storage.set;
Storage.getItem = Storage.get;
Storage.removeItem = Storage.delete;


topaz.log('storage', \`loaded \${Object.keys(store).length} keys in \${(performance.now() - startTime).toFixed(2)}ms\`);

return Storage; // eval export
})(); //# sourceURL=TopazStorage`);

const openChangelog = async () => eval(`const sleep = x => new Promise(res => setTimeout(res, x));

let body = \`
__Autopatcher__
- **Added Autopatcher.** The new autopatcher can now try to fix plugins broken by recent common breakages from Discord updates.

__Performance__
- **Installing plugins and themes after the first time is now significantly faster.** The final output of bundling is now cached so bundling each install is no longer needed.
- **Added more caching throughout.** Essentially everything fetched for plugins/themes should be cached now, helping increase perf and decreasing network usage.

__Bundler__
- **Partially rewrote CSS bundler to work with more complex PC themes.** Now use separated main and index roots.

__Onyx__
- Added ESM default export support
- Rewrote sourceURL to add increment to fix Chromium DevTools bug

__Storage__
- Changed saving debounce to 200ms from 1s

__Manager__
- **Added more redundancy.** Information for plugins now no longer soley relies on it's manifest, it also now uses information like constructor name and GitHub username.
- Use plugin's class name if no manifest name
- Use GitHub username if no manifest author and plugin is from GitHub
- Wrap plugin calls in try catch to avoid failing to disable/enable completely

__Backup__
- Fixed restoring sometimes not working

__AliucordRN__
- **Initial AliucordRN plugin support.** A few AliucordRN (React Native) plugins are now supported, very early/WIP.

__BetterDiscord__
- ZeresLib: Only run Webpack listeners when modules are added

__Powercord__
- Added \\\`powercord\\\` builtin wrapper
- Added ContextMenu component
- Added tree support for getting settings
- Fixed opening modals erroring
- Added pluginManager.get stub for self
\`;
let bodySplit = body.split('\\n');

let categoryAssign = {
  'added': [ 'Added', 'add', 'Rewrote' ],
  // 'progress': [],
  // 'improved': [],
  'fixed': [ 'Fixed' ]
};

let changelog = {
  image: '',
  version: topaz.version[0].toUpperCase() + topaz.version.slice(1).split('.')[0],
  date: '2022-08-14',

  body: bodySplit.reduce((acc, x, i) => {
    if (x[0] === '_') {
      const items = bodySplit.slice(i + 1, bodySplit.indexOf(bodySplit.find((y, j) => j > i && y[0] === '_')) - 1);
      const cat = items.reduce((acc, y) => {
        for (const cat in categoryAssign) {
          if (categoryAssign[cat].some(z => y.includes(z))) {
            if (cat === 'added') return acc += 1;
            if (cat === 'fixed') return acc -= 1;
          }
        }

        return acc;
      }, 0) >= 0 ? 'added' : 'fixed';

      acc += (i === 0 ? '' : '\\n') + x.replaceAll('__', '') + \` {\${cat}\${i === -1 ? ' marginTop' : ''}}\\n======================\\n\\n\`;
    } else if (x) {
      acc += \`* \${x.slice(2)}\\n\`;
    }

    return acc;
  }, '')
};

let showAdvanced = topaz.storage.get('changelog_advanced', false);
const show = async () => {
  goosemod.changelog.resetChangelog();

  goosemod.changelog.setChangelog(changelog);

  goosemod.changelog.showChangelog();

  await sleep(100);

  setTimeout(() => goosemod.changelog.resetChangelog(), 500);

  const customTweaks = () => {
    document.querySelector('.modal-3Hrb0S [data-text-variant="heading-lg/medium"]').textContent = \`Topaz | \${changelog.version}\`; // Set changelog modal title
    document.querySelector('.modal-3Hrb0S .footer-31IekZ')?.remove?.(); // Remove footer of modal with social media
    document.querySelector('.title-2ftWWc:first-child').style.marginTop = '0px';

    const hideAdvanced = () => {
      const els = [...document.querySelectorAll('.content-FDHp32 li')];
      if (showAdvanced) {
        els.concat([...document.querySelectorAll('.content-FDHp32 h1')]).forEach(x => x.style.display = '');
      } else {
        els.forEach(x => x.textContent.endsWith('.') ? x.style.display = '' : x.style.display = 'none');
        const children = [...document.querySelectorAll('.content-FDHp32 > div > *')];
        document.querySelectorAll('.content-FDHp32 h1').forEach(x => {
          if ([...children[children.indexOf(x) + 1].children].every(y => !y.textContent.endsWith('.'))) x.style.display = 'none';
        });
      }
    };

    hideAdvanced();

    if (!document.querySelector('#topaz-changelog-advanced')) {
      const container = document.createElement('div');
      document.querySelector('.modal-3Hrb0S [data-text-variant="heading-lg/medium"]').appendChild(container);

      const { React, ReactDOM } = goosemod.webpackModules.common;

      class AdvancedToggle extends React.PureComponent {
        render() {
          return React.createElement(goosemod.webpackModules.findByDisplayName('SwitchItem'), {
            className: 'topaz-changelog-advanced',
            value: showAdvanced,
            onChange: x => {
              showAdvanced = x;
              this.forceUpdate();

              hideAdvanced();

              topaz.storage.set('changelog_advanced', showAdvanced);
            }
          }, 'Advanced');
        }
      }

      ReactDOM.render(React.createElement(AdvancedToggle), container);
    }
  };

  // Tweak again since opening it right at beginning of injection / Discord load (eg: GooseMod update) often fails to do after first wait
  setTimeout(customTweaks, 200);
  customTweaks();
};

show()`);

const lastVersion = Storage.get('last_version');
if (!lastVersion || lastVersion !== topaz.version) {
  if (lastVersion?.split('.')[0] !== topaz.version.split('.')[0]) setTimeout(openChangelog, 2000);
  Storage.delete('cache_final'); // delete final cache
}
// if (lastVersion && lastVersion !== topaz.version) setTimeout(openChangelog, 5000);
Storage.set('last_version', topaz.version);


let pluginsToInstall = JSON.parse(Storage.get('plugins') ?? '{}');

const initStartTime = performance.now();

const sucrase = eval(`const sucrase=function(e){"use strict";var t,n,s;function o(e){switch(e){case n.num:return"num";case n.bigint:return"bigint";case n.decimal:return"decimal";case n.regexp:return"regexp";case n.string:return"string";case n.name:return"name";case n.eof:return"eof";case n.bracketL:return"[";case n.bracketR:return"]";case n.braceL:return"{";case n.braceBarL:return"{|";case n.braceR:return"}";case n.braceBarR:return"|}";case n.parenL:return"(";case n.parenR:return")";case n.comma:return",";case n.semi:return";";case n.colon:return":";case n.doubleColon:return"::";case n.dot:return".";case n.question:return"?";case n.questionDot:return"?.";case n.arrow:return"=>";case n.template:return"template";case n.ellipsis:return"...";case n.backQuote:return"\`";case n.dollarBraceL:return"\${";case n.at:return"@";case n.hash:return"#";case n.eq:return"=";case n.assign:return"_=";case n.preIncDec:case n.postIncDec:return"++/--";case n.bang:return"!";case n.tilde:return"~";case n.pipeline:return"|>";case n.nullishCoalescing:return"??";case n.logicalOR:return"||";case n.logicalAND:return"&&";case n.bitwiseOR:return"|";case n.bitwiseXOR:return"^";case n.bitwiseAND:return"&";case n.equality:return"==/!=";case n.lessThan:return"<";case n.greaterThan:return">";case n.relationalOrEqual:return"<=/>=";case n.bitShift:return"<</>>";case n.plus:return"+";case n.minus:return"-";case n.modulo:return"%";case n.star:return"*";case n.slash:return"/";case n.exponent:return"**";case n.jsxName:return"jsxName";case n.jsxText:return"jsxText";case n.jsxTagStart:return"jsxTagStart";case n.jsxTagEnd:return"jsxTagEnd";case n.typeParameterStart:return"typeParameterStart";case n.nonNullAssertion:return"nonNullAssertion";case n._break:return"break";case n._case:return"case";case n._catch:return"catch";case n._continue:return"continue";case n._debugger:return"debugger";case n._default:return"default";case n._do:return"do";case n._else:return"else";case n._finally:return"finally";case n._for:return"for";case n._function:return"function";case n._if:return"if";case n._return:return"return";case n._switch:return"switch";case n._throw:return"throw";case n._try:return"try";case n._var:return"var";case n._let:return"let";case n._const:return"const";case n._while:return"while";case n._with:return"with";case n._new:return"new";case n._this:return"this";case n._super:return"super";case n._class:return"class";case n._extends:return"extends";case n._export:return"export";case n._import:return"import";case n._yield:return"yield";case n._null:return"null";case n._true:return"true";case n._false:return"false";case n._in:return"in";case n._instanceof:return"instanceof";case n._typeof:return"typeof";case n._void:return"void";case n._delete:return"delete";case n._async:return"async";case n._get:return"get";case n._set:return"set";case n._declare:return"declare";case n._readonly:return"readonly";case n._abstract:return"abstract";case n._static:return"static";case n._public:return"public";case n._private:return"private";case n._protected:return"protected";case n._override:return"override";case n._as:return"as";case n._enum:return"enum";case n._type:return"type";case n._implements:return"implements";default:return""}}!function(e){e[e.NONE=0]="NONE";e[e._abstract=1]="_abstract";e[e._as=2]="_as";e[e._asserts=3]="_asserts";e[e._async=4]="_async";e[e._await=5]="_await";e[e._checks=6]="_checks";e[e._constructor=7]="_constructor";e[e._declare=8]="_declare";e[e._enum=9]="_enum";e[e._exports=10]="_exports";e[e._from=11]="_from";e[e._get=12]="_get";e[e._global=13]="_global";e[e._implements=14]="_implements";e[e._infer=15]="_infer";e[e._interface=16]="_interface";e[e._is=17]="_is";e[e._keyof=18]="_keyof";e[e._mixins=19]="_mixins";e[e._module=20]="_module";e[e._namespace=21]="_namespace";e[e._of=22]="_of";e[e._opaque=23]="_opaque";e[e._override=24]="_override";e[e._private=25]="_private";e[e._protected=26]="_protected";e[e._proto=27]="_proto";e[e._public=28]="_public";e[e._readonly=29]="_readonly";e[e._require=30]="_require";e[e._set=31]="_set";e[e._static=32]="_static";e[e._type=33]="_type";e[e._unique=34]="_unique"}(t||(t={})),function(e){e[e.PRECEDENCE_MASK=15]="PRECEDENCE_MASK";e[e.IS_KEYWORD=16]="IS_KEYWORD";e[e.IS_ASSIGN=32]="IS_ASSIGN";e[e.IS_RIGHT_ASSOCIATIVE=64]="IS_RIGHT_ASSOCIATIVE";e[e.IS_PREFIX=128]="IS_PREFIX";e[e.IS_POSTFIX=256]="IS_POSTFIX";e[e.num=0]="num";e[e.bigint=512]="bigint";e[e.decimal=1024]="decimal";e[e.regexp=1536]="regexp";e[e.string=2048]="string";e[e.name=2560]="name";e[e.eof=3072]="eof";e[e.bracketL=3584]="bracketL";e[e.bracketR=4096]="bracketR";e[e.braceL=4608]="braceL";e[e.braceBarL=5120]="braceBarL";e[e.braceR=5632]="braceR";e[e.braceBarR=6144]="braceBarR";e[e.parenL=6656]="parenL";e[e.parenR=7168]="parenR";e[e.comma=7680]="comma";e[e.semi=8192]="semi";e[e.colon=8704]="colon";e[e.doubleColon=9216]="doubleColon";e[e.dot=9728]="dot";e[e.question=10240]="question";e[e.questionDot=10752]="questionDot";e[e.arrow=11264]="arrow";e[e.template=11776]="template";e[e.ellipsis=12288]="ellipsis";e[e.backQuote=12800]="backQuote";e[e.dollarBraceL=13312]="dollarBraceL";e[e.at=13824]="at";e[e.hash=14336]="hash";e[e.eq=14880]="eq";e[e.assign=15392]="assign";e[e.preIncDec=16256]="preIncDec";e[e.postIncDec=16768]="postIncDec";e[e.bang=17024]="bang";e[e.tilde=17536]="tilde";e[e.pipeline=17921]="pipeline";e[e.nullishCoalescing=18434]="nullishCoalescing";e[e.logicalOR=18946]="logicalOR";e[e.logicalAND=19459]="logicalAND";e[e.bitwiseOR=19972]="bitwiseOR";e[e.bitwiseXOR=20485]="bitwiseXOR";e[e.bitwiseAND=20998]="bitwiseAND";e[e.equality=21511]="equality";e[e.lessThan=22024]="lessThan";e[e.greaterThan=22536]="greaterThan";e[e.relationalOrEqual=23048]="relationalOrEqual";e[e.bitShift=23561]="bitShift";e[e.plus=24202]="plus";e[e.minus=24714]="minus";e[e.modulo=25099]="modulo";e[e.star=25611]="star";e[e.slash=26123]="slash";e[e.exponent=26700]="exponent";e[e.jsxName=27136]="jsxName";e[e.jsxText=27648]="jsxText";e[e.jsxTagStart=28160]="jsxTagStart";e[e.jsxTagEnd=28672]="jsxTagEnd";e[e.typeParameterStart=29184]="typeParameterStart";e[e.nonNullAssertion=29696]="nonNullAssertion";e[e._break=30224]="_break";e[e._case=30736]="_case";e[e._catch=31248]="_catch";e[e._continue=31760]="_continue";e[e._debugger=32272]="_debugger";e[e._default=32784]="_default";e[e._do=33296]="_do";e[e._else=33808]="_else";e[e._finally=34320]="_finally";e[e._for=34832]="_for";e[e._function=35344]="_function";e[e._if=35856]="_if";e[e._return=36368]="_return";e[e._switch=36880]="_switch";e[e._throw=37520]="_throw";e[e._try=37904]="_try";e[e._var=38416]="_var";e[e._let=38928]="_let";e[e._const=39440]="_const";e[e._while=39952]="_while";e[e._with=40464]="_with";e[e._new=40976]="_new";e[e._this=41488]="_this";e[e._super=42e3]="_super";e[e._class=42512]="_class";e[e._extends=43024]="_extends";e[e._export=43536]="_export";e[e._import=44048]="_import";e[e._yield=44560]="_yield";e[e._null=45072]="_null";e[e._true=45584]="_true";e[e._false=46096]="_false";e[e._in=46616]="_in";e[e._instanceof=47128]="_instanceof";e[e._typeof=47760]="_typeof";e[e._void=48272]="_void";e[e._delete=48784]="_delete";e[e._async=49168]="_async";e[e._get=49680]="_get";e[e._set=50192]="_set";e[e._declare=50704]="_declare";e[e._readonly=51216]="_readonly";e[e._abstract=51728]="_abstract";e[e._static=52240]="_static";e[e._public=52752]="_public";e[e._private=53264]="_private";e[e._protected=53776]="_protected";e[e._override=54288]="_override";e[e._as=54800]="_as";e[e._enum=55312]="_enum";e[e._type=55824]="_type";e[e._implements=56336]="_implements"}(n||(n={}));class r{constructor(e,t,n){this.startTokenIndex=e,this.endTokenIndex=t,this.isFunctionScope=n}}class i{constructor(e,t,n,s,o,r,i,a,c,h,l,p){this.potentialArrowAt=e,this.noAnonFunctionType=t,this.tokensLength=n,this.scopesLength=s,this.pos=o,this.type=r,this.contextualKeyword=i,this.start=a,this.end=c,this.isType=h,this.scopeDepth=l,this.error=p}}class a{constructor(){a.prototype.__init.call(this),a.prototype.__init2.call(this),a.prototype.__init3.call(this),a.prototype.__init4.call(this),a.prototype.__init5.call(this),a.prototype.__init6.call(this),a.prototype.__init7.call(this),a.prototype.__init8.call(this),a.prototype.__init9.call(this),a.prototype.__init10.call(this),a.prototype.__init11.call(this),a.prototype.__init12.call(this)}__init(){this.potentialArrowAt=-1}__init2(){this.noAnonFunctionType=!1}__init3(){this.tokens=[]}__init4(){this.scopes=[]}__init5(){this.pos=0}__init6(){this.type=n.eof}__init7(){this.contextualKeyword=t.NONE}__init8(){this.start=0}__init9(){this.end=0}__init10(){this.isType=!1}__init11(){this.scopeDepth=0}__init12(){this.error=null}snapshot(){return new i(this.potentialArrowAt,this.noAnonFunctionType,this.tokens.length,this.scopes.length,this.pos,this.type,this.contextualKeyword,this.start,this.end,this.isType,this.scopeDepth,this.error)}restoreFromSnapshot(e){this.potentialArrowAt=e.potentialArrowAt,this.noAnonFunctionType=e.noAnonFunctionType,this.tokens.length=e.tokensLength,this.scopes.length=e.scopesLength,this.pos=e.pos,this.type=e.type,this.contextualKeyword=e.contextualKeyword,this.start=e.start,this.end=e.end,this.isType=e.isType,this.scopeDepth=e.scopeDepth,this.error=e.error}}let c,h,l,p,u,f;function d(){return f++}function m(e){if("pos"in e){const t=function(e){let t=1,n=1;for(let o=0;o<e;o++)u.charCodeAt(o)===s.lineFeed?(t++,n=1):n++;return new k(t,n)}(e.pos);e.message+=\` (\${t.line}:\${t.column})\`,e.loc=t}return e}!function(e){e[e.backSpace=8]="backSpace";e[e.lineFeed=10]="lineFeed";e[e.carriageReturn=13]="carriageReturn";e[e.shiftOut=14]="shiftOut";e[e.space=32]="space";e[e.exclamationMark=33]="exclamationMark";e[e.quotationMark=34]="quotationMark";e[e.numberSign=35]="numberSign";e[e.dollarSign=36]="dollarSign";e[e.percentSign=37]="percentSign";e[e.ampersand=38]="ampersand";e[e.apostrophe=39]="apostrophe";e[e.leftParenthesis=40]="leftParenthesis";e[e.rightParenthesis=41]="rightParenthesis";e[e.asterisk=42]="asterisk";e[e.plusSign=43]="plusSign";e[e.comma=44]="comma";e[e.dash=45]="dash";e[e.dot=46]="dot";e[e.slash=47]="slash";e[e.digit0=48]="digit0";e[e.digit1=49]="digit1";e[e.digit2=50]="digit2";e[e.digit3=51]="digit3";e[e.digit4=52]="digit4";e[e.digit5=53]="digit5";e[e.digit6=54]="digit6";e[e.digit7=55]="digit7";e[e.digit8=56]="digit8";e[e.digit9=57]="digit9";e[e.colon=58]="colon";e[e.semicolon=59]="semicolon";e[e.lessThan=60]="lessThan";e[e.equalsTo=61]="equalsTo";e[e.greaterThan=62]="greaterThan";e[e.questionMark=63]="questionMark";e[e.atSign=64]="atSign";e[e.uppercaseA=65]="uppercaseA";e[e.uppercaseB=66]="uppercaseB";e[e.uppercaseC=67]="uppercaseC";e[e.uppercaseD=68]="uppercaseD";e[e.uppercaseE=69]="uppercaseE";e[e.uppercaseF=70]="uppercaseF";e[e.uppercaseG=71]="uppercaseG";e[e.uppercaseH=72]="uppercaseH";e[e.uppercaseI=73]="uppercaseI";e[e.uppercaseJ=74]="uppercaseJ";e[e.uppercaseK=75]="uppercaseK";e[e.uppercaseL=76]="uppercaseL";e[e.uppercaseM=77]="uppercaseM";e[e.uppercaseN=78]="uppercaseN";e[e.uppercaseO=79]="uppercaseO";e[e.uppercaseP=80]="uppercaseP";e[e.uppercaseQ=81]="uppercaseQ";e[e.uppercaseR=82]="uppercaseR";e[e.uppercaseS=83]="uppercaseS";e[e.uppercaseT=84]="uppercaseT";e[e.uppercaseU=85]="uppercaseU";e[e.uppercaseV=86]="uppercaseV";e[e.uppercaseW=87]="uppercaseW";e[e.uppercaseX=88]="uppercaseX";e[e.uppercaseY=89]="uppercaseY";e[e.uppercaseZ=90]="uppercaseZ";e[e.leftSquareBracket=91]="leftSquareBracket";e[e.backslash=92]="backslash";e[e.rightSquareBracket=93]="rightSquareBracket";e[e.caret=94]="caret";e[e.underscore=95]="underscore";e[e.graveAccent=96]="graveAccent";e[e.lowercaseA=97]="lowercaseA";e[e.lowercaseB=98]="lowercaseB";e[e.lowercaseC=99]="lowercaseC";e[e.lowercaseD=100]="lowercaseD";e[e.lowercaseE=101]="lowercaseE";e[e.lowercaseF=102]="lowercaseF";e[e.lowercaseG=103]="lowercaseG";e[e.lowercaseH=104]="lowercaseH";e[e.lowercaseI=105]="lowercaseI";e[e.lowercaseJ=106]="lowercaseJ";e[e.lowercaseK=107]="lowercaseK";e[e.lowercaseL=108]="lowercaseL";e[e.lowercaseM=109]="lowercaseM";e[e.lowercaseN=110]="lowercaseN";e[e.lowercaseO=111]="lowercaseO";e[e.lowercaseP=112]="lowercaseP";e[e.lowercaseQ=113]="lowercaseQ";e[e.lowercaseR=114]="lowercaseR";e[e.lowercaseS=115]="lowercaseS";e[e.lowercaseT=116]="lowercaseT";e[e.lowercaseU=117]="lowercaseU";e[e.lowercaseV=118]="lowercaseV";e[e.lowercaseW=119]="lowercaseW";e[e.lowercaseX=120]="lowercaseX";e[e.lowercaseY=121]="lowercaseY";e[e.lowercaseZ=122]="lowercaseZ";e[e.leftCurlyBrace=123]="leftCurlyBrace";e[e.verticalBar=124]="verticalBar";e[e.rightCurlyBrace=125]="rightCurlyBrace";e[e.tilde=126]="tilde";e[e.nonBreakingSpace=160]="nonBreakingSpace";e[e.oghamSpaceMark=5760]="oghamSpaceMark";e[e.lineSeparator=8232]="lineSeparator";e[e.paragraphSeparator=8233]="paragraphSeparator"}(s||(s={}));class k{constructor(e,t){this.line=e,this.column=t}}function _(e,t,n,s){u=e,p=new a,f=1,c=t,h=n,l=s}function g(e){return p.contextualKeyword===e}function y(e){const t=Z();return t.type===n.name&&t.contextualKeyword===e}function T(e){return p.contextualKeyword===e&&X(n.name)}function x(e){T(e)||A()}function b(){return J(n.eof)||J(n.braceR)||I()}function I(){const e=p.tokens[p.tokens.length-1];for(let t=e?e.end:0;t<p.start;t++){const e=u.charCodeAt(t);if(e===s.lineFeed||e===s.carriageReturn||8232===e||8233===e)return!0}return!1}function v(){return X(n.semi)||b()}function w(){v()||A('Unexpected token, expected ";"')}function C(e){X(e)||A(\`Unexpected token, expected "\${o(e)}"\`)}function A(e="Unexpected token",t=p.start){if(p.error)return;const s=new SyntaxError(e);s.pos=t,p.error=s,p.pos=u.length,ae(n.eof)}const E=[9,11,12,s.space,s.nonBreakingSpace,s.oghamSpaceMark,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8239,8287,12288,65279],S=/(?:\\s|\\/\\/.*|\\/\\*[^]*?\\*\\/)*/g,N=new Uint8Array(65536);for(const e of E)N[e]=1;function L(e){if(e<48)return 36===e;if(e<58)return!0;if(e<65)return!1;if(e<91)return!0;if(e<97)return 95===e;if(e<123)return!0;if(e<128)return!1;throw new Error("Should not be called with non-ASCII char code.")}const R=new Uint8Array(65536);for(let e=0;e<128;e++)R[e]=L(e)?1:0;for(let e=128;e<65536;e++)R[e]=1;for(const e of E)R[e]=0;R[8232]=0,R[8233]=0;const O=R.slice();for(let e=s.digit0;e<=s.digit9;e++)O[e]=0;const P=new Int32Array([-1,27,594,729,1566,2187,2673,3294,-1,3510,-1,4428,4563,4644,4941,5319,5697,-1,6237,6696,7155,7587,7749,7911,-1,8127,-1,-1,-1,54,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,243,-1,-1,-1,486,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,81,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,108,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,135,-1,-1,-1,-1,-1,-1,-1,-1,-1,162,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,189,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,216,-1,-1,-1,-1,-1,-1,t._abstract<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._as<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,270,-1,-1,-1,-1,-1,405,-1,-1,-1,-1,-1,-1,297,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,324,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,351,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,378,-1,-1,-1,-1,-1,-1,-1,t._asserts<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,432,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,459,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._async<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,513,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,540,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,567,-1,-1,-1,-1,-1,-1,t._await<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,621,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,648,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,675,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,702,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._break<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,756,-1,-1,-1,-1,-1,-1,918,-1,-1,-1,1053,-1,-1,1161,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,783,837,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,810,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._case<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,864,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,891,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._catch<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,945,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,972,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,999,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1026,-1,-1,-1,-1,-1,-1,-1,t._checks<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1080,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1107,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1134,-1,-1,-1,-1,-1,-1,-1,1+(n._class<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1188,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1215,1431,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1242,-1,-1,-1,-1,-1,-1,1+(n._const<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1269,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1296,-1,-1,-1,-1,-1,-1,-1,-1,1323,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1350,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1377,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1404,-1,-1,-1,-1,-1,-1,-1,-1,t._constructor<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1458,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1485,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1512,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1539,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._continue<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1593,-1,-1,-1,-1,-1,-1,-1,-1,-1,2160,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1620,1782,-1,-1,1917,-1,-1,-1,-1,-1,2052,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1647,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1674,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1701,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1728,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1755,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._debugger<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1809,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1836,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1863,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1890,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._declare<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1944,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1971,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1998,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2025,-1,-1,-1,-1,-1,-1,1+(n._default<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2079,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2106,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2133,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._delete<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._do<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2214,-1,2295,-1,-1,-1,-1,-1,-1,-1,-1,-1,2376,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2241,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2268,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._else<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2322,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2349,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._enum<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2403,-1,-1,-1,2538,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2430,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2457,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2484,-1,-1,-1,-1,-1,-1,1+(n._export<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2511,-1,-1,-1,-1,-1,-1,-1,t._exports<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2565,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2592,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2619,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2646,-1,-1,-1,-1,-1,-1,-1,1+(n._extends<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2700,-1,-1,-1,-1,-1,-1,-1,2808,-1,-1,-1,-1,-1,2970,-1,-1,3024,-1,-1,3105,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2727,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2754,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2781,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._false<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2835,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2862,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2889,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2916,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2943,-1,1+(n._finally<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2997,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._for<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3051,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3078,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._from<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3132,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3159,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3186,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3213,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3240,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3267,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._function<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3321,-1,-1,-1,-1,-1,-1,3375,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3348,-1,-1,-1,-1,-1,-1,t._get<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3402,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3429,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3456,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3483,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._global<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3537,-1,-1,-1,-1,-1,-1,3564,3888,-1,-1,-1,-1,4401,-1,-1,-1,-1,-1,-1,-1,1+(n._if<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3591,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3618,-1,-1,3807,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3645,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3672,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3699,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3726,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3753,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3780,-1,-1,-1,-1,-1,-1,-1,t._implements<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3834,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3861,-1,-1,-1,-1,-1,-1,1+(n._import<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._in<<1),-1,-1,-1,-1,-1,3915,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3996,4212,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3942,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3969,-1,-1,-1,-1,-1,-1,-1,-1,t._infer<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4023,-1,-1,-1,-1,-1,-1,-1,4050,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4077,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4104,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4131,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4158,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4185,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._instanceof<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4239,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4266,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4293,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4320,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4347,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4374,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._interface<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._is<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4455,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4482,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4509,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4536,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._keyof<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4590,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4617,-1,-1,-1,-1,-1,-1,1+(n._let<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4671,-1,-1,-1,-1,-1,4806,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4698,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4725,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4752,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4779,-1,-1,-1,-1,-1,-1,-1,t._mixins<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4833,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4860,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4887,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4914,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._module<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4968,-1,-1,-1,5184,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5238,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4995,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5022,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5049,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5076,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5103,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5130,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5157,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._namespace<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5211,-1,-1,-1,1+(n._new<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5265,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5292,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._null<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5346,-1,-1,-1,-1,-1,-1,-1,-1,-1,5373,-1,-1,-1,-1,-1,5508,-1,-1,-1,-1,t._of<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5400,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5427,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5454,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5481,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._opaque<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5535,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5562,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5589,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5616,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5643,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5670,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._override<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5724,-1,-1,6102,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5751,-1,-1,-1,-1,-1,5886,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5778,-1,-1,-1,-1,-1,5805,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5832,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5859,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._private<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5913,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5940,-1,-1,-1,-1,-1,-1,-1,-1,-1,6075,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5967,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5994,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6021,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6048,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._protected<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._proto<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6129,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6156,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6183,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6210,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._public<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6264,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6291,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6453,-1,-1,6588,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6318,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6345,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6372,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6399,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6426,-1,t._readonly<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6480,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6507,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6534,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6561,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._require<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6615,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6642,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6669,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._return<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6723,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6777,6912,-1,7020,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6750,-1,-1,-1,-1,-1,-1,t._set<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6804,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6831,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6858,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6885,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._static<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6939,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6966,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6993,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._super<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7047,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7074,-1,-1,-1,-1,-1,-1,-1,-1,-1,7101,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7128,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._switch<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7182,-1,-1,-1,-1,-1,-1,-1,-1,-1,7344,-1,-1,-1,-1,-1,-1,7452,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7209,-1,-1,-1,-1,-1,-1,-1,-1,7263,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7236,-1,-1,-1,-1,-1,-1,-1,1+(n._this<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7290,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7317,-1,-1,-1,1+(n._throw<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7371,-1,-1,-1,7425,-1,-1,-1,-1,-1,-1,7398,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._true<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._try<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7479,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7506,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._type<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7533,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7560,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._typeof<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7614,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7641,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7668,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7695,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7722,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,t._unique<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7776,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7830,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7803,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._var<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7857,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7884,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._void<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7938,8046,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7965,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7992,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8019,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._while<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8073,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8100,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._with<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8154,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8181,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8208,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8235,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(n._yield<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]);var j;function D(e){const t=e.identifierRole;return t===j.TopLevelDeclaration||t===j.FunctionScopedDeclaration||t===j.BlockScopedDeclaration||t===j.ObjectShorthandTopLevelDeclaration||t===j.ObjectShorthandFunctionScopedDeclaration||t===j.ObjectShorthandBlockScopedDeclaration}function q(e){const t=e.identifierRole;return t===j.FunctionScopedDeclaration||t===j.BlockScopedDeclaration||t===j.ObjectShorthandFunctionScopedDeclaration||t===j.ObjectShorthandBlockScopedDeclaration}function F(e){const t=e.identifierRole;return t===j.TopLevelDeclaration||t===j.ObjectShorthandTopLevelDeclaration||t===j.ImportDeclaration}function B(e){const t=e.identifierRole;return t===j.TopLevelDeclaration||t===j.BlockScopedDeclaration||t===j.ObjectShorthandTopLevelDeclaration||t===j.ObjectShorthandBlockScopedDeclaration}function \$(e){const t=e.identifierRole;return t===j.FunctionScopedDeclaration||t===j.ObjectShorthandFunctionScopedDeclaration}function M(e){return e.identifierRole===j.ObjectShorthandTopLevelDeclaration||e.identifierRole===j.ObjectShorthandBlockScopedDeclaration||e.identifierRole===j.ObjectShorthandFunctionScopedDeclaration}!function(e){e[e.Access=0]="Access";e[e.ExportAccess=1]="ExportAccess";e[e.TopLevelDeclaration=2]="TopLevelDeclaration";e[e.FunctionScopedDeclaration=3]="FunctionScopedDeclaration";e[e.BlockScopedDeclaration=4]="BlockScopedDeclaration";e[e.ObjectShorthandTopLevelDeclaration=5]="ObjectShorthandTopLevelDeclaration";e[e.ObjectShorthandFunctionScopedDeclaration=6]="ObjectShorthandFunctionScopedDeclaration";e[e.ObjectShorthandBlockScopedDeclaration=7]="ObjectShorthandBlockScopedDeclaration";e[e.ObjectShorthand=8]="ObjectShorthand";e[e.ImportDeclaration=9]="ImportDeclaration";e[e.ObjectKey=10]="ObjectKey";e[e.ImportAccess=11]="ImportAccess"}(j||(j={}));class K{constructor(){this.type=p.type,this.contextualKeyword=p.contextualKeyword,this.start=p.start,this.end=p.end,this.scopeDepth=p.scopeDepth,this.isType=p.isType,this.identifierRole=null,this.shadowsGlobal=!1,this.isAsyncOperation=!1,this.contextId=null,this.rhsEndIndex=null,this.isExpression=!1,this.numNullishCoalesceStarts=0,this.numNullishCoalesceEnds=0,this.isOptionalChainStart=!1,this.isOptionalChainEnd=!1,this.subscriptStartIndex=null,this.nullishStartIndex=null}}function V(){p.tokens.push(new K),se()}function H(){p.tokens.push(new K),p.start=p.pos,function(){for(;;){if(p.pos>=u.length)return void A("Unterminated template");const e=u.charCodeAt(p.pos);if(e===s.graveAccent||e===s.dollarSign&&u.charCodeAt(p.pos+1)===s.leftCurlyBrace)return p.pos===p.start&&J(n.template)?e===s.dollarSign?(p.pos+=2,void ae(n.dollarBraceL)):(++p.pos,void ae(n.backQuote)):void ae(n.template);e===s.backslash&&p.pos++,p.pos++}}()}function U(){p.type===n.assign&&--p.pos,function(){const e=p.pos;let t=!1,o=!1;for(;;){if(p.pos>=u.length)return void A("Unterminated regular expression",e);const n=u.charCodeAt(p.pos);if(t)t=!1;else{if(n===s.leftSquareBracket)o=!0;else if(n===s.rightSquareBracket&&o)o=!1;else if(n===s.slash&&!o)break;t=n===s.backslash}++p.pos}++p.pos,function(){for(;p.pos<u.length;){const e=u.charCodeAt(p.pos);if(R[e])p.pos++;else{if(e!==s.backslash)break;if(p.pos+=2,u.charCodeAt(p.pos)===s.leftCurlyBrace){for(;p.pos<u.length&&u.charCodeAt(p.pos)!==s.rightCurlyBrace;)p.pos++;p.pos++}}}}(),ae(n.regexp)}()}function W(e){for(let t=p.tokens.length-e;t<p.tokens.length;t++)p.tokens[t].isType=!0;const t=p.isType;return p.isType=!0,t}function z(e){p.isType=e}function X(e){return!!J(e)&&(V(),!0)}function G(e){const t=p.isType;p.isType=!0,X(e),p.isType=t}function J(e){return p.type===e}function Y(){const e=p.snapshot();V();const t=p.type;return p.restoreFromSnapshot(e),t}class Q{constructor(e,t){this.type=e,this.contextualKeyword=t}}function Z(){const e=p.snapshot();V();const t=p.type,n=p.contextualKeyword;return p.restoreFromSnapshot(e),new Q(t,n)}function ee(){return te(p.pos)}function te(e){S.lastIndex=e;return e+S.exec(u)[0].length}function ne(){return u.charCodeAt(ee())}function se(){if(ie(),p.start=p.pos,p.pos>=u.length){const e=p.tokens;return e.length>=2&&e[e.length-1].start>=u.length&&e[e.length-2].start>=u.length&&A("Unexpectedly reached the end of input."),void ae(n.eof)}var e;e=u.charCodeAt(p.pos),O[e]||e===s.backslash||e===s.atSign&&u.charCodeAt(p.pos+1)===s.atSign?function(){let e=0,t=0,o=p.pos;for(;o<u.length&&(t=u.charCodeAt(o),!(t<s.lowercaseA||t>s.lowercaseZ));){const n=P[e+(t-s.lowercaseA)+1];if(-1===n)break;e=n,o++}const r=P[e];if(r>-1&&!R[t])return p.pos=o,void(1&r?ae(r>>>1):ae(n.name,r>>>1));for(;o<u.length;){const e=u.charCodeAt(o);if(R[e])o++;else if(e===s.backslash){if(o+=2,u.charCodeAt(o)===s.leftCurlyBrace){for(;o<u.length&&u.charCodeAt(o)!==s.rightCurlyBrace;)o++;o++}}else{if(e!==s.atSign||u.charCodeAt(o+1)!==s.atSign)break;o+=2}}p.pos=o,ae(n.name)}():ce(e)}function oe(){for(;u.charCodeAt(p.pos)!==s.asterisk||u.charCodeAt(p.pos+1)!==s.slash;)if(p.pos++,p.pos>u.length)return void A("Unterminated comment",p.pos-2);p.pos+=2}function re(e){let t=u.charCodeAt(p.pos+=e);if(p.pos<u.length)for(;t!==s.lineFeed&&t!==s.carriageReturn&&t!==s.lineSeparator&&t!==s.paragraphSeparator&&++p.pos<u.length;)t=u.charCodeAt(p.pos)}function ie(){for(;p.pos<u.length;){const e=u.charCodeAt(p.pos);switch(e){case s.carriageReturn:u.charCodeAt(p.pos+1)===s.lineFeed&&++p.pos;case s.lineFeed:case s.lineSeparator:case s.paragraphSeparator:++p.pos;break;case s.slash:switch(u.charCodeAt(p.pos+1)){case s.asterisk:p.pos+=2,oe();break;case s.slash:re(2);break;default:return}break;default:if(!N[e])return;++p.pos}}}function ae(e,n=t.NONE){p.end=p.pos,p.type=e,p.contextualKeyword=n}function ce(e){switch(e){case s.numberSign:return++p.pos,void ae(n.hash);case s.dot:return void function(){const e=u.charCodeAt(p.pos+1);e>=s.digit0&&e<=s.digit9?pe(!0):e===s.dot&&u.charCodeAt(p.pos+2)===s.dot?(p.pos+=3,ae(n.ellipsis)):(++p.pos,ae(n.dot))}();case s.leftParenthesis:return++p.pos,void ae(n.parenL);case s.rightParenthesis:return++p.pos,void ae(n.parenR);case s.semicolon:return++p.pos,void ae(n.semi);case s.comma:return++p.pos,void ae(n.comma);case s.leftSquareBracket:return++p.pos,void ae(n.bracketL);case s.rightSquareBracket:return++p.pos,void ae(n.bracketR);case s.leftCurlyBrace:return void(l&&u.charCodeAt(p.pos+1)===s.verticalBar?he(n.braceBarL,2):(++p.pos,ae(n.braceL)));case s.rightCurlyBrace:return++p.pos,void ae(n.braceR);case s.colon:return void(u.charCodeAt(p.pos+1)===s.colon?he(n.doubleColon,2):(++p.pos,ae(n.colon)));case s.questionMark:return void function(){const e=u.charCodeAt(p.pos+1),t=u.charCodeAt(p.pos+2);e!==s.questionMark||p.isType?e!==s.dot||t>=s.digit0&&t<=s.digit9?(++p.pos,ae(n.question)):(p.pos+=2,ae(n.questionDot)):t===s.equalsTo?he(n.assign,3):he(n.nullishCoalescing,2)}();case s.atSign:return++p.pos,void ae(n.at);case s.graveAccent:return++p.pos,void ae(n.backQuote);case s.digit0:{const e=u.charCodeAt(p.pos+1);if(e===s.lowercaseX||e===s.uppercaseX||e===s.lowercaseO||e===s.uppercaseO||e===s.lowercaseB||e===s.uppercaseB)return void function(){let e=!1;const t=p.pos;p.pos+=2,le();const o=u.charCodeAt(p.pos);o===s.lowercaseN?(++p.pos,e=!0):o===s.lowercaseM&&A("Invalid decimal",t);if(e)return void ae(n.bigint);ae(n.num)}()}case s.digit1:case s.digit2:case s.digit3:case s.digit4:case s.digit5:case s.digit6:case s.digit7:case s.digit8:case s.digit9:return void pe(!1);case s.quotationMark:case s.apostrophe:return void function(e){for(p.pos++;;){if(p.pos>=u.length)return void A("Unterminated string constant");const t=u.charCodeAt(p.pos);if(t===s.backslash)p.pos++;else if(t===e)break;p.pos++}p.pos++,ae(n.string)}(e);case s.slash:return void(u.charCodeAt(p.pos+1)===s.equalsTo?he(n.assign,2):he(n.slash,1));case s.percentSign:case s.asterisk:return void function(e){let t=e===s.asterisk?n.star:n.modulo,o=1,r=u.charCodeAt(p.pos+1);e===s.asterisk&&r===s.asterisk&&(o++,r=u.charCodeAt(p.pos+2),t=n.exponent),r===s.equalsTo&&u.charCodeAt(p.pos+2)!==s.greaterThan&&(o++,t=n.assign),he(t,o)}(e);case s.verticalBar:case s.ampersand:return void function(e){const t=u.charCodeAt(p.pos+1);if(t!==e){if(e===s.verticalBar){if(t===s.greaterThan)return void he(n.pipeline,2);if(t===s.rightCurlyBrace&&l)return void he(n.braceBarR,2)}t!==s.equalsTo?he(e===s.verticalBar?n.bitwiseOR:n.bitwiseAND,1):he(n.assign,2)}else u.charCodeAt(p.pos+2)===s.equalsTo?he(n.assign,3):he(e===s.verticalBar?n.logicalOR:n.logicalAND,2)}(e);case s.caret:return void(u.charCodeAt(p.pos+1)===s.equalsTo?he(n.assign,2):he(n.bitwiseXOR,1));case s.plusSign:case s.dash:return void function(e){const t=u.charCodeAt(p.pos+1);t!==e?t===s.equalsTo?he(n.assign,2):e===s.plusSign?he(n.plus,1):he(n.minus,1):he(n.preIncDec,2)}(e);case s.lessThan:case s.greaterThan:return void function(e){const t=u.charCodeAt(p.pos+1);if(t===e){const t=e===s.greaterThan&&u.charCodeAt(p.pos+2)===s.greaterThan?3:2;return u.charCodeAt(p.pos+t)===s.equalsTo?void he(n.assign,t+1):e===s.greaterThan&&p.isType?void he(n.greaterThan,1):void he(n.bitShift,t)}t===s.equalsTo?he(n.relationalOrEqual,2):e===s.lessThan?he(n.lessThan,1):he(n.greaterThan,1)}(e);case s.equalsTo:case s.exclamationMark:return void function(e){const t=u.charCodeAt(p.pos+1);if(t!==s.equalsTo)return e===s.equalsTo&&t===s.greaterThan?(p.pos+=2,void ae(n.arrow)):void he(e===s.equalsTo?n.eq:n.bang,1);he(n.equality,u.charCodeAt(p.pos+2)===s.equalsTo?3:2)}(e);case s.tilde:return void he(n.tilde,1)}A(\`Unexpected character '\${String.fromCharCode(e)}'\`,p.pos)}function he(e,t){p.pos+=t,ae(e)}function le(){for(;;){const e=u.charCodeAt(p.pos);if(!(e>=s.digit0&&e<=s.digit9||e>=s.lowercaseA&&e<=s.lowercaseF||e>=s.uppercaseA&&e<=s.uppercaseF||e===s.underscore))break;p.pos++}}function pe(e){let t=!1,o=!1;e||le();let r=u.charCodeAt(p.pos);r===s.dot&&(++p.pos,le(),r=u.charCodeAt(p.pos)),r!==s.uppercaseE&&r!==s.lowercaseE||(r=u.charCodeAt(++p.pos),r!==s.plusSign&&r!==s.dash||++p.pos,le(),r=u.charCodeAt(p.pos)),r===s.lowercaseN?(++p.pos,t=!0):r===s.lowercaseM&&(++p.pos,o=!0),ae(t?n.bigint:o?n.decimal:n.num)}const ue={quot:'"',amp:"&",apos:"'",lt:"<",gt:">",nbsp:" ",iexcl:"¡",cent:"¢",pound:"£",curren:"¤",yen:"¥",brvbar:"¦",sect:"§",uml:"¨",copy:"©",ordf:"ª",laquo:"«",not:"¬",shy:"­",reg:"®",macr:"¯",deg:"°",plusmn:"±",sup2:"²",sup3:"³",acute:"´",micro:"µ",para:"¶",middot:"·",cedil:"¸",sup1:"¹",ordm:"º",raquo:"»",frac14:"¼",frac12:"½",frac34:"¾",iquest:"¿",Agrave:"À",Aacute:"Á",Acirc:"Â",Atilde:"Ã",Auml:"Ä",Aring:"Å",AElig:"Æ",Ccedil:"Ç",Egrave:"È",Eacute:"É",Ecirc:"Ê",Euml:"Ë",Igrave:"Ì",Iacute:"Í",Icirc:"Î",Iuml:"Ï",ETH:"Ð",Ntilde:"Ñ",Ograve:"Ò",Oacute:"Ó",Ocirc:"Ô",Otilde:"Õ",Ouml:"Ö",times:"×",Oslash:"Ø",Ugrave:"Ù",Uacute:"Ú",Ucirc:"Û",Uuml:"Ü",Yacute:"Ý",THORN:"Þ",szlig:"ß",agrave:"à",aacute:"á",acirc:"â",atilde:"ã",auml:"ä",aring:"å",aelig:"æ",ccedil:"ç",egrave:"è",eacute:"é",ecirc:"ê",euml:"ë",igrave:"ì",iacute:"í",icirc:"î",iuml:"ï",eth:"ð",ntilde:"ñ",ograve:"ò",oacute:"ó",ocirc:"ô",otilde:"õ",ouml:"ö",divide:"÷",oslash:"ø",ugrave:"ù",uacute:"ú",ucirc:"û",uuml:"ü",yacute:"ý",thorn:"þ",yuml:"ÿ",OElig:"Œ",oelig:"œ",Scaron:"Š",scaron:"š",Yuml:"Ÿ",fnof:"ƒ",circ:"ˆ",tilde:"˜",Alpha:"Α",Beta:"Β",Gamma:"Γ",Delta:"Δ",Epsilon:"Ε",Zeta:"Ζ",Eta:"Η",Theta:"Θ",Iota:"Ι",Kappa:"Κ",Lambda:"Λ",Mu:"Μ",Nu:"Ν",Xi:"Ξ",Omicron:"Ο",Pi:"Π",Rho:"Ρ",Sigma:"Σ",Tau:"Τ",Upsilon:"Υ",Phi:"Φ",Chi:"Χ",Psi:"Ψ",Omega:"Ω",alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ε",zeta:"ζ",eta:"η",theta:"θ",iota:"ι",kappa:"κ",lambda:"λ",mu:"μ",nu:"ν",xi:"ξ",omicron:"ο",pi:"π",rho:"ρ",sigmaf:"ς",sigma:"σ",tau:"τ",upsilon:"υ",phi:"φ",chi:"χ",psi:"ψ",omega:"ω",thetasym:"ϑ",upsih:"ϒ",piv:"ϖ",ensp:" ",emsp:" ",thinsp:" ",zwnj:"‌",zwj:"‍",lrm:"‎",rlm:"‏",ndash:"–",mdash:"—",lsquo:"‘",rsquo:"’",sbquo:"‚",ldquo:"“",rdquo:"”",bdquo:"„",dagger:"†",Dagger:"‡",bull:"•",hellip:"…",permil:"‰",prime:"′",Prime:"″",lsaquo:"‹",rsaquo:"›",oline:"‾",frasl:"⁄",euro:"€",image:"ℑ",weierp:"℘",real:"ℜ",trade:"™",alefsym:"ℵ",larr:"←",uarr:"↑",rarr:"→",darr:"↓",harr:"↔",crarr:"↵",lArr:"⇐",uArr:"⇑",rArr:"⇒",dArr:"⇓",hArr:"⇔",forall:"∀",part:"∂",exist:"∃",empty:"∅",nabla:"∇",isin:"∈",notin:"∉",ni:"∋",prod:"∏",sum:"∑",minus:"−",lowast:"∗",radic:"√",prop:"∝",infin:"∞",ang:"∠",and:"∧",or:"∨",cap:"∩",cup:"∪",int:"∫",there4:"∴",sim:"∼",cong:"≅",asymp:"≈",ne:"≠",equiv:"≡",le:"≤",ge:"≥",sub:"⊂",sup:"⊃",nsub:"⊄",sube:"⊆",supe:"⊇",oplus:"⊕",otimes:"⊗",perp:"⊥",sdot:"⋅",lceil:"⌈",rceil:"⌉",lfloor:"⌊",rfloor:"⌋",lang:"〈",rang:"〉",loz:"◊",spades:"♠",clubs:"♣",hearts:"♥",diams:"♦"};function fe(e){const[t,n]=de(e.jsxPragma||"React.createElement"),[s,o]=de(e.jsxFragmentPragma||"React.Fragment");return{base:t,suffix:n,fragmentBase:s,fragmentSuffix:o}}function de(e){let t=e.indexOf(".");return-1===t&&(t=e.length),[e.slice(0,t),e.slice(t)]}class me{getPrefixCode(){return""}getHoistedCode(){return""}getSuffixCode(){return""}}const ke=/^[\\da-fA-F]+\$/,_e=/^\\d+\$/;class ge extends me{__init(){this.lastLineNumber=1}__init2(){this.lastIndex=0}__init3(){this.filenameVarName=null}constructor(e,t,n,s,o){super(),this.rootTransformer=e,this.tokens=t,this.importProcessor=n,this.nameManager=s,this.options=o,ge.prototype.__init.call(this),ge.prototype.__init2.call(this),ge.prototype.__init3.call(this),this.jsxPragmaInfo=fe(o)}process(){return!!this.tokens.matches1(n.jsxTagStart)&&(this.processJSXTag(),!0)}getPrefixCode(){return this.filenameVarName?\`const \${this.filenameVarName} = \${JSON.stringify(this.options.filePath||"")};\`:""}getLineNumberForIndex(e){const t=this.tokens.code;for(;this.lastIndex<e&&this.lastIndex<t.length;)"\\n"===t[this.lastIndex]&&this.lastLineNumber++,this.lastIndex++;return this.lastLineNumber}getFilenameVarName(){return this.filenameVarName||(this.filenameVarName=this.nameManager.claimFreeName("_jsxFileName")),this.filenameVarName}processProps(e){const t=this.getLineNumberForIndex(e),s=this.options.production?"":\`__self: this, __source: {fileName: \${this.getFilenameVarName()}, lineNumber: \${t}}\`;if(this.tokens.matches1(n.jsxName)||this.tokens.matches1(n.braceL)){for(this.tokens.appendCode(", {");;){if(this.tokens.matches2(n.jsxName,n.eq))this.processPropKeyName(),this.tokens.replaceToken(": "),this.tokens.matches1(n.braceL)?(this.tokens.replaceToken(""),this.rootTransformer.processBalancedCode(),this.tokens.replaceToken("")):this.tokens.matches1(n.jsxTagStart)?this.processJSXTag():this.processStringPropValue();else if(this.tokens.matches1(n.jsxName))this.processPropKeyName(),this.tokens.appendCode(": true");else{if(!this.tokens.matches1(n.braceL))break;this.tokens.replaceToken(""),this.rootTransformer.processBalancedCode(),this.tokens.replaceToken("")}this.tokens.appendCode(",")}s?this.tokens.appendCode(\` \${s}}\`):this.tokens.appendCode("}")}else s?this.tokens.appendCode(\`, {\${s}}\`):this.tokens.appendCode(", null")}processPropKeyName(){const e=this.tokens.identifierName();e.includes("-")?this.tokens.replaceToken(\`'\${e}'\`):this.tokens.copyToken()}processStringPropValue(){const e=this.tokens.currentToken(),t=this.tokens.code.slice(e.start+1,e.end-1),n=Te(t),s=function(e){let t="";for(let n=0;n<e.length;n++){const s=e[n];if("\\n"===s)if(/\\s/.test(e[n+1]))for(t+=" ";n<e.length&&/\\s/.test(e[n+1]);)n++;else t+="\\n";else if("&"===s){const{entity:s,newI:o}=xe(e,n+1);t+=s,n=o-1}else t+=s}return JSON.stringify(t)}(t);this.tokens.replaceToken(s+n)}processTagIntro(){let e=this.tokens.currentIndex()+1;for(;this.tokens.tokens[e].isType||!this.tokens.matches2AtIndex(e-1,n.jsxName,n.jsxName)&&!this.tokens.matches2AtIndex(e-1,n.greaterThan,n.jsxName)&&!this.tokens.matches1AtIndex(e,n.braceL)&&!this.tokens.matches1AtIndex(e,n.jsxTagEnd)&&!this.tokens.matches2AtIndex(e,n.slash,n.jsxTagEnd);)e++;if(e===this.tokens.currentIndex()+1){const e=this.tokens.identifierName();ye(e)&&this.tokens.replaceToken(\`'\${e}'\`)}for(;this.tokens.currentIndex()<e;)this.rootTransformer.processToken()}processChildren(){for(;;){if(this.tokens.matches2(n.jsxTagStart,n.slash))return;if(this.tokens.matches1(n.braceL))this.tokens.matches2(n.braceL,n.braceR)?(this.tokens.replaceToken(""),this.tokens.replaceToken("")):(this.tokens.replaceToken(", "),this.rootTransformer.processBalancedCode(),this.tokens.replaceToken(""));else if(this.tokens.matches1(n.jsxTagStart))this.tokens.appendCode(", "),this.processJSXTag();else{if(!this.tokens.matches1(n.jsxText))throw new Error("Unexpected token when processing JSX children.");this.processChildTextElement()}}}processChildTextElement(){const e=this.tokens.currentToken(),t=this.tokens.code.slice(e.start,e.end),n=Te(t),s=function(e){let t="",n="",s=!1,o=!1;for(let r=0;r<e.length;r++){const i=e[r];if(" "===i||"\\t"===i||"\\r"===i)s||(n+=i);else if("\\n"===i)n="",s=!0;else{if(o&&s&&(t+=" "),t+=n,n="","&"===i){const{entity:n,newI:s}=xe(e,r+1);r=s-1,t+=n}else t+=i;o=!0,s=!1}}s||(t+=n);return JSON.stringify(t)}(t);'""'===s?this.tokens.replaceToken(n):this.tokens.replaceToken(\`, \${s}\${n}\`)}processJSXTag(){const{jsxPragmaInfo:e}=this,t=this.importProcessor&&this.importProcessor.getIdentifierReplacement(e.base)||e.base,s=this.tokens.currentToken().start;if(this.tokens.replaceToken(\`\${t}\${e.suffix}(\`),this.tokens.matches1(n.jsxTagEnd)){const t=this.importProcessor&&this.importProcessor.getIdentifierReplacement(e.fragmentBase)||e.fragmentBase;for(this.tokens.replaceToken(\`\${t}\${e.fragmentSuffix}, null\`),this.processChildren();!this.tokens.matches1(n.jsxTagEnd);)this.tokens.replaceToken("");this.tokens.replaceToken(")")}else if(this.processTagIntro(),this.processProps(s),this.tokens.matches2(n.slash,n.jsxTagEnd))this.tokens.replaceToken(""),this.tokens.replaceToken(")");else{if(!this.tokens.matches1(n.jsxTagEnd))throw new Error("Expected either /> or > at the end of the tag.");for(this.tokens.replaceToken(""),this.processChildren();!this.tokens.matches1(n.jsxTagEnd);)this.tokens.replaceToken("");this.tokens.replaceToken(")")}}}function ye(e){const t=e.charCodeAt(0);return t>=s.lowercaseA&&t<=s.lowercaseZ}function Te(e){let t=0,n=0;for(const s of e)"\\n"===s?(t++,n=0):" "===s&&n++;return"\\n".repeat(t)+" ".repeat(n)}function xe(e,t){let n,s="",o=0,r=t;for(;r<e.length&&o++<10;){const t=e[r];if(r++,";"===t){"#"===s[0]?"x"===s[1]?(s=s.substr(2),ke.test(s)&&(n=String.fromCodePoint(parseInt(s,16)))):(s=s.substr(1),_e.test(s)&&(n=String.fromCodePoint(parseInt(s,10)))):n=ue[s];break}s+=t}return n?{entity:n,newI:r}:{entity:"&",newI:t}}function be(e,t){const s=fe(t),o=new Set;for(let t=0;t<e.tokens.length;t++){const r=e.tokens[t];if(r.type!==n.name||r.isType||r.identifierRole!==j.Access&&r.identifierRole!==j.ObjectShorthand&&r.identifierRole!==j.ExportAccess||r.shadowsGlobal||o.add(e.identifierNameForToken(r)),r.type===n.jsxTagStart&&o.add(s.base),r.type===n.jsxTagStart&&t+1<e.tokens.length&&e.tokens[t+1].type===n.jsxTagEnd&&(o.add(s.base),o.add(s.fragmentBase)),r.type===n.jsxName&&r.identifierRole===j.Access){ye(e.identifierNameForToken(r))&&e.tokens[t+1].type!==n.dot||o.add(e.identifierNameForToken(r))}}return o}class Ie{__init(){this.nonTypeIdentifiers=new Set}__init2(){this.importInfoByPath=new Map}__init3(){this.importsToReplace=new Map}__init4(){this.identifierReplacements=new Map}__init5(){this.exportBindingsByLocalName=new Map}constructor(e,t,n,s,o,r){this.nameManager=e,this.tokens=t,this.enableLegacyTypeScriptModuleInterop=n,this.options=s,this.isTypeScriptTransformEnabled=o,this.helperManager=r,Ie.prototype.__init.call(this),Ie.prototype.__init2.call(this),Ie.prototype.__init3.call(this),Ie.prototype.__init4.call(this),Ie.prototype.__init5.call(this)}preprocessTokens(){for(let e=0;e<this.tokens.tokens.length;e++)this.tokens.matches1AtIndex(e,n._import)&&!this.tokens.matches3AtIndex(e,n._import,n.name,n.eq)&&this.preprocessImportAtIndex(e),this.tokens.matches1AtIndex(e,n._export)&&!this.tokens.matches2AtIndex(e,n._export,n.eq)&&this.preprocessExportAtIndex(e);this.generateImportReplacements()}pruneTypeOnlyImports(){this.nonTypeIdentifiers=be(this.tokens,this.options);for(const[e,t]of this.importInfoByPath.entries()){if(t.hasBareImport||t.hasStarExport||t.exportStarNames.length>0||t.namedExports.length>0)continue;[...t.defaultNames,...t.wildcardNames,...t.namedImports.map(({localName:e})=>e)].every(e=>this.isTypeName(e))&&this.importsToReplace.set(e,"")}}isTypeName(e){return this.isTypeScriptTransformEnabled&&!this.nonTypeIdentifiers.has(e)}generateImportReplacements(){for(const[e,t]of this.importInfoByPath.entries()){const{defaultNames:n,wildcardNames:s,namedImports:o,namedExports:r,exportStarNames:i,hasStarExport:a}=t;if(0===n.length&&0===s.length&&0===o.length&&0===r.length&&0===i.length&&!a){this.importsToReplace.set(e,\`require('\${e}');\`);continue}const c=this.getFreeIdentifierForPath(e);let h;h=this.enableLegacyTypeScriptModuleInterop?c:s.length>0?s[0]:this.getFreeIdentifierForPath(e);let l=\`var \${c} = require('\${e}');\`;if(s.length>0)for(const e of s){l+=\` var \${e} = \${this.enableLegacyTypeScriptModuleInterop?c:\`\${this.helperManager.getHelperName("interopRequireWildcard")}(\${c})\`};\`}else i.length>0&&h!==c?l+=\` var \${h} = \${this.helperManager.getHelperName("interopRequireWildcard")}(\${c});\`:n.length>0&&h!==c&&(l+=\` var \${h} = \${this.helperManager.getHelperName("interopRequireDefault")}(\${c});\`);for(const{importedName:e,localName:t}of r)l+=\` \${this.helperManager.getHelperName("createNamedExportFrom")}(\${c}, '\${t}', '\${e}');\`;for(const e of i)l+=\` exports.\${e} = \${h};\`;a&&(l+=\` \${this.helperManager.getHelperName("createStarExport")}(\${c});\`),this.importsToReplace.set(e,l);for(const e of n)this.identifierReplacements.set(e,h+".default");for(const{importedName:e,localName:t}of o)this.identifierReplacements.set(t,\`\${c}.\${e}\`)}}getFreeIdentifierForPath(e){const t=e.split("/"),n=t[t.length-1].replace(/\\W/g,"");return this.nameManager.claimFreeName("_"+n)}preprocessImportAtIndex(e){const s=[],o=[],r=[];if(e++,(this.tokens.matchesContextualAtIndex(e,t._type)||this.tokens.matches1AtIndex(e,n._typeof))&&!this.tokens.matches1AtIndex(e+1,n.comma)&&!this.tokens.matchesContextualAtIndex(e+1,t._from))return;if(this.tokens.matches1AtIndex(e,n.parenL))return;if(this.tokens.matches1AtIndex(e,n.name)&&(s.push(this.tokens.identifierNameAtIndex(e)),e++,this.tokens.matches1AtIndex(e,n.comma)&&e++),this.tokens.matches1AtIndex(e,n.star)&&(e+=2,o.push(this.tokens.identifierNameAtIndex(e)),e++),this.tokens.matches1AtIndex(e,n.braceL)){const t=this.getNamedImports(e+1);e=t.newIndex;for(const e of t.namedImports)"default"===e.importedName?s.push(e.localName):r.push(e)}if(this.tokens.matchesContextualAtIndex(e,t._from)&&e++,!this.tokens.matches1AtIndex(e,n.string))throw new Error("Expected string token at the end of import statement.");const i=this.tokens.stringValueAtIndex(e),a=this.getImportInfo(i);a.defaultNames.push(...s),a.wildcardNames.push(...o),a.namedImports.push(...r),0===s.length&&0===o.length&&0===r.length&&(a.hasBareImport=!0)}preprocessExportAtIndex(e){if(this.tokens.matches2AtIndex(e,n._export,n._var)||this.tokens.matches2AtIndex(e,n._export,n._let)||this.tokens.matches2AtIndex(e,n._export,n._const))this.preprocessVarExportAtIndex(e);else if(this.tokens.matches2AtIndex(e,n._export,n._function)||this.tokens.matches2AtIndex(e,n._export,n._class)){const t=this.tokens.identifierNameAtIndex(e+2);this.addExportBinding(t,t)}else if(this.tokens.matches3AtIndex(e,n._export,n.name,n._function)){const t=this.tokens.identifierNameAtIndex(e+3);this.addExportBinding(t,t)}else this.tokens.matches2AtIndex(e,n._export,n.braceL)?this.preprocessNamedExportAtIndex(e):this.tokens.matches2AtIndex(e,n._export,n.star)&&this.preprocessExportStarAtIndex(e)}preprocessVarExportAtIndex(e){let t=0;for(let s=e+2;;s++)if(this.tokens.matches1AtIndex(s,n.braceL)||this.tokens.matches1AtIndex(s,n.dollarBraceL)||this.tokens.matches1AtIndex(s,n.bracketL))t++;else if(this.tokens.matches1AtIndex(s,n.braceR)||this.tokens.matches1AtIndex(s,n.bracketR))t--;else{if(0===t&&!this.tokens.matches1AtIndex(s,n.name))break;if(this.tokens.matches1AtIndex(1,n.eq)){const e=this.tokens.currentToken().rhsEndIndex;if(null==e)throw new Error("Expected = token with an end index.");s=e-1}else{if(D(this.tokens.tokens[s])){const e=this.tokens.identifierNameAtIndex(s);this.identifierReplacements.set(e,"exports."+e)}}}}preprocessNamedExportAtIndex(e){e+=2;const{newIndex:s,namedImports:o}=this.getNamedImports(e);if(e=s,!this.tokens.matchesContextualAtIndex(e,t._from)){for(const{importedName:e,localName:t}of o)this.addExportBinding(e,t);return}if(e++,!this.tokens.matches1AtIndex(e,n.string))throw new Error("Expected string token at the end of import statement.");const r=this.tokens.stringValueAtIndex(e);this.getImportInfo(r).namedExports.push(...o)}preprocessExportStarAtIndex(e){let t=null;if(this.tokens.matches3AtIndex(e,n._export,n.star,n._as)?(e+=3,t=this.tokens.identifierNameAtIndex(e),e+=2):e+=3,!this.tokens.matches1AtIndex(e,n.string))throw new Error("Expected string token at the end of star export statement.");const s=this.tokens.stringValueAtIndex(e),o=this.getImportInfo(s);null!==t?o.exportStarNames.push(t):o.hasStarExport=!0}getNamedImports(e){const s=[];for(;;){if(this.tokens.matches1AtIndex(e,n.braceR)){e++;break}let o=!1;(this.tokens.matchesContextualAtIndex(e,t._type)||this.tokens.matches1AtIndex(e,n._typeof))&&this.tokens.matches1AtIndex(e+1,n.name)&&!this.tokens.matchesContextualAtIndex(e+1,t._as)&&(o=!0,e++);const r=this.tokens.identifierNameAtIndex(e);let i;if(e++,this.tokens.matchesContextualAtIndex(e,t._as)?(e++,i=this.tokens.identifierNameAtIndex(e),e++):i=r,o||s.push({importedName:r,localName:i}),this.tokens.matches2AtIndex(e,n.comma,n.braceR)){e+=2;break}if(this.tokens.matches1AtIndex(e,n.braceR)){e++;break}if(!this.tokens.matches1AtIndex(e,n.comma))throw new Error("Unexpected token: "+JSON.stringify(this.tokens.tokens[e]));e++}return{newIndex:e,namedImports:s}}getImportInfo(e){const t=this.importInfoByPath.get(e);if(t)return t;const n={defaultNames:[],wildcardNames:[],namedImports:[],namedExports:[],hasBareImport:!1,exportStarNames:[],hasStarExport:!1};return this.importInfoByPath.set(e,n),n}addExportBinding(e,t){this.exportBindingsByLocalName.has(e)||this.exportBindingsByLocalName.set(e,[]),this.exportBindingsByLocalName.get(e).push(t)}claimImportCode(e){const t=this.importsToReplace.get(e);return this.importsToReplace.set(e,""),t||""}getIdentifierReplacement(e){return this.identifierReplacements.get(e)||null}resolveExportBinding(e){const t=this.exportBindingsByLocalName.get(e);return t&&0!==t.length?t.map(e=>"exports."+e).join(" = "):null}getGlobalNames(){return new Set([...this.identifierReplacements.keys(),...this.exportBindingsByLocalName.keys()])}}function ve(e,t,{compiledFilename:n}){let o="AAAA";for(let t=0;t<e.length;t++)e.charCodeAt(t)===s.lineFeed&&(o+=";AACA");return{version:3,file:n||"",sources:[t],mappings:o,names:[]}}const we={interopRequireWildcard:"\\n    function interopRequireWildcard(obj) {\\n      if (obj && obj.__esModule) {\\n        return obj;\\n      } else {\\n        var newObj = {};\\n        if (obj != null) {\\n          for (var key in obj) {\\n            if (Object.prototype.hasOwnProperty.call(obj, key)) {\\n              newObj[key] = obj[key];\\n            }\\n          }\\n        }\\n        newObj.default = obj;\\n        return newObj;\\n      }\\n    }\\n  ",interopRequireDefault:"\\n    function interopRequireDefault(obj) {\\n      return obj && obj.__esModule ? obj : { default: obj };\\n    }\\n  ",createNamedExportFrom:"\\n    function createNamedExportFrom(obj, localName, importedName) {\\n      Object.defineProperty(exports, localName, {enumerable: true, get: () => obj[importedName]});\\n    }\\n  ",createStarExport:'\\n    function createStarExport(obj) {\\n      Object.keys(obj)\\n        .filter((key) => key !== "default" && key !== "__esModule")\\n        .forEach((key) => {\\n          if (exports.hasOwnProperty(key)) {\\n            return;\\n          }\\n          Object.defineProperty(exports, key, {enumerable: true, get: () => obj[key]});\\n        });\\n    }\\n  ',nullishCoalesce:"\\n    function nullishCoalesce(lhs, rhsFn) {\\n      if (lhs != null) {\\n        return lhs;\\n      } else {\\n        return rhsFn();\\n      }\\n    }\\n  ",asyncNullishCoalesce:"\\n    async function asyncNullishCoalesce(lhs, rhsFn) {\\n      if (lhs != null) {\\n        return lhs;\\n      } else {\\n        return await rhsFn();\\n      }\\n    }\\n  ",optionalChain:"\\n    function optionalChain(ops) {\\n      let lastAccessLHS = undefined;\\n      let value = ops[0];\\n      let i = 1;\\n      while (i < ops.length) {\\n        const op = ops[i];\\n        const fn = ops[i + 1];\\n        i += 2;\\n        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {\\n          return undefined;\\n        }\\n        if (op === 'access' || op === 'optionalAccess') {\\n          lastAccessLHS = value;\\n          value = fn(value);\\n        } else if (op === 'call' || op === 'optionalCall') {\\n          value = fn((...args) => value.call(lastAccessLHS, ...args));\\n          lastAccessLHS = undefined;\\n        }\\n      }\\n      return value;\\n    }\\n  ",asyncOptionalChain:"\\n    async function asyncOptionalChain(ops) {\\n      let lastAccessLHS = undefined;\\n      let value = ops[0];\\n      let i = 1;\\n      while (i < ops.length) {\\n        const op = ops[i];\\n        const fn = ops[i + 1];\\n        i += 2;\\n        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {\\n          return undefined;\\n        }\\n        if (op === 'access' || op === 'optionalAccess') {\\n          lastAccessLHS = value;\\n          value = await fn(value);\\n        } else if (op === 'call' || op === 'optionalCall') {\\n          value = await fn((...args) => value.call(lastAccessLHS, ...args));\\n          lastAccessLHS = undefined;\\n        }\\n      }\\n      return value;\\n    }\\n  ",optionalChainDelete:"\\n    function optionalChainDelete(ops) {\\n      const result = OPTIONAL_CHAIN_NAME(ops);\\n      return result == null ? true : result;\\n    }\\n  ",asyncOptionalChainDelete:"\\n    async function asyncOptionalChainDelete(ops) {\\n      const result = await ASYNC_OPTIONAL_CHAIN_NAME(ops);\\n      return result == null ? true : result;\\n    }\\n  "};class Ce{__init(){this.helperNames={}}constructor(e){this.nameManager=e,Ce.prototype.__init.call(this)}getHelperName(e){let t=this.helperNames[e];return t||(t=this.nameManager.claimFreeName("_"+e),this.helperNames[e]=t,t)}emitHelpers(){let e="";this.helperNames.optionalChainDelete&&this.getHelperName("optionalChain"),this.helperNames.asyncOptionalChainDelete&&this.getHelperName("asyncOptionalChain");for(const[t,n]of Object.entries(we)){const s=this.helperNames[t];let o=n;"optionalChainDelete"===t?o=o.replace("OPTIONAL_CHAIN_NAME",this.helperNames.optionalChain):"asyncOptionalChainDelete"===t&&(o=o.replace("ASYNC_OPTIONAL_CHAIN_NAME",this.helperNames.asyncOptionalChain)),s&&(e+=" ",e+=o.replace(t,s).replace(/\\s+/g," ").trim())}return e}}function Ae(e,t,s){(function(e,t){for(const s of e.tokens)if(s.type===n.name&&q(s)&&t.has(e.identifierNameForToken(s)))return!0;return!1})(e,s)&&function(e,t,s){const o=[];let r=t.length-1;for(let i=e.tokens.length-1;;i--){for(;o.length>0&&o[o.length-1].startTokenIndex===i+1;)o.pop();for(;r>=0&&t[r].endTokenIndex===i+1;)o.push(t[r]),r--;if(i<0)break;const a=e.tokens[i],c=e.identifierNameForToken(a);if(o.length>1&&a.type===n.name&&s.has(c))if(B(a))Ee(o[o.length-1],e,c);else if(\$(a)){let t=o.length-1;for(;t>0&&!o[t].isFunctionScope;)t--;if(t<0)throw new Error("Did not find parent function scope.");Ee(o[t],e,c)}}if(o.length>0)throw new Error("Expected empty scope stack after processing file.")}(e,t,s)}function Ee(e,t,s){for(let o=e.startTokenIndex;o<e.endTokenIndex;o++){const e=t.tokens[o];e.type!==n.name&&e.type!==n.jsxName||t.identifierNameForToken(e)!==s||(e.shadowsGlobal=!0)}}class Se{__init(){this.usedNames=new Set}constructor(e,t){Se.prototype.__init.call(this),this.usedNames=new Set(function(e,t){const s=[];for(const o of t)o.type===n.name&&s.push(e.slice(o.start,o.end));return s}(e,t))}claimFreeName(e){const t=this.findFreeName(e);return this.usedNames.add(t),t}findFreeName(e){if(!this.usedNames.has(e))return e;let t=2;for(;this.usedNames.has(e+String(t));)t++;return e+String(t)}}var Ne="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};function Le(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Re(e,t){return e(t={exports:{}},t.exports),t.exports}var Oe=Re((function(e,t){var n,s=Ne&&Ne.__extends||(n=function(e,t){return(n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)},function(e,t){function s(){this.constructor=e}n(e,t),e.prototype=null===t?Object.create(t):(s.prototype=t.prototype,new s)});Object.defineProperty(t,"__esModule",{value:!0}),t.DetailContext=t.NoopContext=t.VError=void 0;var o=function(e){function t(n,s){var o=e.call(this,s)||this;return o.path=n,Object.setPrototypeOf(o,t.prototype),o}return s(t,e),t}(Error);t.VError=o;var r=function(){function e(){}return e.prototype.fail=function(e,t,n){return!1},e.prototype.unionResolver=function(){return this},e.prototype.createContext=function(){return this},e.prototype.resolveUnion=function(e){},e}();t.NoopContext=r;var i=function(){function e(){this._propNames=[""],this._messages=[null],this._score=0}return e.prototype.fail=function(e,t,n){return this._propNames.push(e),this._messages.push(t),this._score+=n,!1},e.prototype.unionResolver=function(){return new a},e.prototype.resolveUnion=function(e){for(var t,n,s=null,o=0,r=e.contexts;o<r.length;o++){var i=r[o];(!s||i._score>=s._score)&&(s=i)}s&&s._score>0&&((t=this._propNames).push.apply(t,s._propNames),(n=this._messages).push.apply(n,s._messages))},e.prototype.getError=function(e){for(var t=[],n=this._propNames.length-1;n>=0;n--){var s=this._propNames[n];e+="number"==typeof s?"["+s+"]":s?"."+s:"";var r=this._messages[n];r&&t.push(e+" "+r)}return new o(e,t.join("; "))},e.prototype.getErrorDetail=function(e){for(var t=[],n=this._propNames.length-1;n>=0;n--){var s=this._propNames[n];e+="number"==typeof s?"["+s+"]":s?"."+s:"";var o=this._messages[n];o&&t.push({path:e,message:o})}var r=null;for(n=t.length-1;n>=0;n--)r&&(t[n].nested=[r]),r=t[n];return r},e}();t.DetailContext=i;var a=function(){function e(){this.contexts=[]}return e.prototype.createContext=function(){var e=new i;return this.contexts.push(e),e},e}()}));Le(Oe),Oe.DetailContext,Oe.NoopContext,Oe.VError;var Pe=Re((function(e,t){var n,s=Ne&&Ne.__extends||(n=function(e,t){return(n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)},function(e,t){function s(){this.constructor=e}n(e,t),e.prototype=null===t?Object.create(t):(s.prototype=t.prototype,new s)});Object.defineProperty(t,"__esModule",{value:!0}),t.basicTypes=t.BasicType=t.TParamList=t.TParam=t.param=t.TFunc=t.func=t.TProp=t.TOptional=t.opt=t.TIface=t.iface=t.TEnumLiteral=t.enumlit=t.TEnumType=t.enumtype=t.TIntersection=t.intersection=t.TUnion=t.union=t.TTuple=t.tuple=t.TArray=t.array=t.TLiteral=t.lit=t.TName=t.name=t.TType=void 0;var o=function(){};function r(e){return"string"==typeof e?a(e):e}function i(e,t){var n=e[t];if(!n)throw new Error("Unknown type "+t);return n}function a(e){return new c(e)}t.TType=o,t.name=a;var c=function(e){function t(t){var n=e.call(this)||this;return n.name=t,n._failMsg="is not a "+t,n}return s(t,e),t.prototype.getChecker=function(e,n,s){var o=this,r=i(e,this.name),a=r.getChecker(e,n,s);return r instanceof I||r instanceof t?a:function(e,t){return!!a(e,t)||t.fail(null,o._failMsg,0)}},t}(o);t.TName=c,t.lit=function(e){return new h(e)};var h=function(e){function t(t){var n=e.call(this)||this;return n.value=t,n.name=JSON.stringify(t),n._failMsg="is not "+n.name,n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this;return function(e,t){return e===n.value||t.fail(null,n._failMsg,-1)}},t}(o);t.TLiteral=h,t.array=function(e){return new l(r(e))};var l=function(e){function t(t){var n=e.call(this)||this;return n.ttype=t,n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this.ttype.getChecker(e,t);return function(e,t){if(!Array.isArray(e))return t.fail(null,"is not an array",0);for(var s=0;s<e.length;s++){if(!n(e[s],t))return t.fail(s,null,1)}return!0}},t}(o);t.TArray=l,t.tuple=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return new p(e.map((function(e){return r(e)})))};var p=function(e){function t(t){var n=e.call(this)||this;return n.ttypes=t,n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this.ttypes.map((function(n){return n.getChecker(e,t)})),s=function(e,t){if(!Array.isArray(e))return t.fail(null,"is not an array",0);for(var s=0;s<n.length;s++){if(!n[s](e[s],t))return t.fail(s,null,1)}return!0};return t?function(e,t){return!!s(e,t)&&(e.length<=n.length||t.fail(n.length,"is extraneous",2))}:s},t}(o);t.TTuple=p,t.union=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return new u(e.map((function(e){return r(e)})))};var u=function(e){function t(t){var n=e.call(this)||this;n.ttypes=t;var s=t.map((function(e){return e instanceof c||e instanceof h?e.name:null})).filter((function(e){return e})),o=t.length-s.length;return s.length?(o>0&&s.push(o+" more"),n._failMsg="is none of "+s.join(", ")):n._failMsg="is none of "+o+" types",n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this,s=this.ttypes.map((function(n){return n.getChecker(e,t)}));return function(e,t){for(var o=t.unionResolver(),r=0;r<s.length;r++){if(s[r](e,o.createContext()))return!0}return t.resolveUnion(o),t.fail(null,n._failMsg,0)}},t}(o);t.TUnion=u,t.intersection=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return new f(e.map((function(e){return r(e)})))};var f=function(e){function t(t){var n=e.call(this)||this;return n.ttypes=t,n}return s(t,e),t.prototype.getChecker=function(e,t){var n=new Set,s=this.ttypes.map((function(s){return s.getChecker(e,t,n)}));return function(e,t){return!!s.every((function(n){return n(e,t)}))||t.fail(null,null,0)}},t}(o);t.TIntersection=f,t.enumtype=function(e){return new d(e)};var d=function(e){function t(t){var n=e.call(this)||this;return n.members=t,n.validValues=new Set,n._failMsg="is not a valid enum value",n.validValues=new Set(Object.keys(t).map((function(e){return t[e]}))),n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this;return function(e,t){return!!n.validValues.has(e)||t.fail(null,n._failMsg,0)}},t}(o);t.TEnumType=d,t.enumlit=function(e,t){return new m(e,t)};var m=function(e){function t(t,n){var s=e.call(this)||this;return s.enumName=t,s.prop=n,s._failMsg="is not "+t+"."+n,s}return s(t,e),t.prototype.getChecker=function(e,t){var n=this,s=i(e,this.enumName);if(!(s instanceof d))throw new Error("Type "+this.enumName+" used in enumlit is not an enum type");var o=s.members[this.prop];if(!s.members.hasOwnProperty(this.prop))throw new Error("Unknown value "+this.enumName+"."+this.prop+" used in enumlit");return function(e,t){return e===o||t.fail(null,n._failMsg,-1)}},t}(o);function k(e){return Object.keys(e).map((function(t){return function(e,t){return t instanceof g?new y(e,t.ttype,!0):new y(e,r(t),!1)}(t,e[t])}))}t.TEnumLiteral=m,t.iface=function(e,t){return new _(e,k(t))};var _=function(e){function t(t,n){var s=e.call(this)||this;return s.bases=t,s.props=n,s.propSet=new Set(n.map((function(e){return e.name}))),s}return s(t,e),t.prototype.getChecker=function(e,t,n){var s=this,o=this.bases.map((function(n){return i(e,n).getChecker(e,t)})),r=this.props.map((function(n){return n.ttype.getChecker(e,t)})),a=new Oe.NoopContext,c=this.props.map((function(e,t){return!e.isOpt&&!r[t](void 0,a)})),h=function(e,t){if("object"!=typeof e||null===e)return t.fail(null,"is not an object",0);for(var n=0;n<o.length;n++)if(!o[n](e,t))return!1;for(n=0;n<r.length;n++){var i=s.props[n].name,a=e[i];if(void 0===a){if(c[n])return t.fail(i,"is missing",1)}else if(!r[n](a,t))return t.fail(i,null,1)}return!0};if(!t)return h;var l=this.propSet;return n&&(this.propSet.forEach((function(e){return n.add(e)})),l=n),function(e,t){if(!h(e,t))return!1;for(var n in e)if(!l.has(n))return t.fail(n,"is extraneous",2);return!0}},t}(o);t.TIface=_,t.opt=function(e){return new g(r(e))};var g=function(e){function t(t){var n=e.call(this)||this;return n.ttype=t,n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this.ttype.getChecker(e,t);return function(e,t){return void 0===e||n(e,t)}},t}(o);t.TOptional=g;var y=function(e,t,n){this.name=e,this.ttype=t,this.isOpt=n};t.TProp=y,t.func=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];return new T(new b(t),r(e))};var T=function(e){function t(t,n){var s=e.call(this)||this;return s.paramList=t,s.result=n,s}return s(t,e),t.prototype.getChecker=function(e,t){return function(e,t){return"function"==typeof e||t.fail(null,"is not a function",0)}},t}(o);t.TFunc=T,t.param=function(e,t,n){return new x(e,r(t),Boolean(n))};var x=function(e,t,n){this.name=e,this.ttype=t,this.isOpt=n};t.TParam=x;var b=function(e){function t(t){var n=e.call(this)||this;return n.params=t,n}return s(t,e),t.prototype.getChecker=function(e,t){var n=this,s=this.params.map((function(n){return n.ttype.getChecker(e,t)})),o=new Oe.NoopContext,r=this.params.map((function(e,t){return!e.isOpt&&!s[t](void 0,o)})),i=function(e,t){if(!Array.isArray(e))return t.fail(null,"is not an array",0);for(var o=0;o<s.length;o++){var i=n.params[o];if(void 0===e[o]){if(r[o])return t.fail(i.name,"is missing",1)}else if(!s[o](e[o],t))return t.fail(i.name,null,1)}return!0};return t?function(e,t){return!!i(e,t)&&(e.length<=s.length||t.fail(s.length,"is extraneous",2))}:i},t}(o);t.TParamList=b;var I=function(e){function t(t,n){var s=e.call(this)||this;return s.validator=t,s.message=n,s}return s(t,e),t.prototype.getChecker=function(e,t){var n=this;return function(e,t){return!!n.validator(e)||t.fail(null,n.message,0)}},t}(o);t.BasicType=I,t.basicTypes={any:new I((function(e){return!0}),"is invalid"),number:new I((function(e){return"number"==typeof e}),"is not a number"),object:new I((function(e){return"object"==typeof e&&e}),"is not an object"),boolean:new I((function(e){return"boolean"==typeof e}),"is not a boolean"),string:new I((function(e){return"string"==typeof e}),"is not a string"),symbol:new I((function(e){return"symbol"==typeof e}),"is not a symbol"),void:new I((function(e){return null==e}),"is not void"),undefined:new I((function(e){return void 0===e}),"is not undefined"),null:new I((function(e){return null===e}),"is not null"),never:new I((function(e){return!1}),"is unexpected"),Date:new I(w("[object Date]"),"is not a Date"),RegExp:new I(w("[object RegExp]"),"is not a RegExp")};var v=Object.prototype.toString;function w(e){return function(t){return"object"==typeof t&&t&&v.call(t)===e}}"undefined"!=typeof Buffer&&(t.basicTypes.Buffer=new I((function(e){return Buffer.isBuffer(e)}),"is not a Buffer"));for(var C=function(e){t.basicTypes[e.name]=new I((function(t){return t instanceof e}),"is not a "+e.name)},A=0,E=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,ArrayBuffer];A<E.length;A++){C(E[A])}}));Le(Pe),Pe.basicTypes,Pe.BasicType,Pe.TParamList,Pe.TParam,Pe.param,Pe.TFunc,Pe.func,Pe.TProp,Pe.TOptional,Pe.opt,Pe.TIface,Pe.iface,Pe.TEnumLiteral,Pe.enumlit,Pe.TEnumType,Pe.enumtype,Pe.TIntersection,Pe.intersection,Pe.TUnion,Pe.union,Pe.TTuple,Pe.tuple,Pe.TArray,Pe.array,Pe.TLiteral,Pe.lit,Pe.TName,Pe.name,Pe.TType;var je=Re((function(e,t){var n=Ne&&Ne.__spreadArrays||function(){for(var e=0,t=0,n=arguments.length;t<n;t++)e+=arguments[t].length;var s=Array(e),o=0;for(t=0;t<n;t++)for(var r=arguments[t],i=0,a=r.length;i<a;i++,o++)s[o]=r[i];return s};Object.defineProperty(t,"__esModule",{value:!0}),t.Checker=t.createCheckers=void 0;var s=Pe;Object.defineProperty(t,"TArray",{enumerable:!0,get:function(){return s.TArray}}),Object.defineProperty(t,"TEnumType",{enumerable:!0,get:function(){return s.TEnumType}}),Object.defineProperty(t,"TEnumLiteral",{enumerable:!0,get:function(){return s.TEnumLiteral}}),Object.defineProperty(t,"TFunc",{enumerable:!0,get:function(){return s.TFunc}}),Object.defineProperty(t,"TIface",{enumerable:!0,get:function(){return s.TIface}}),Object.defineProperty(t,"TLiteral",{enumerable:!0,get:function(){return s.TLiteral}}),Object.defineProperty(t,"TName",{enumerable:!0,get:function(){return s.TName}}),Object.defineProperty(t,"TOptional",{enumerable:!0,get:function(){return s.TOptional}}),Object.defineProperty(t,"TParam",{enumerable:!0,get:function(){return s.TParam}}),Object.defineProperty(t,"TParamList",{enumerable:!0,get:function(){return s.TParamList}}),Object.defineProperty(t,"TProp",{enumerable:!0,get:function(){return s.TProp}}),Object.defineProperty(t,"TTuple",{enumerable:!0,get:function(){return s.TTuple}}),Object.defineProperty(t,"TType",{enumerable:!0,get:function(){return s.TType}}),Object.defineProperty(t,"TUnion",{enumerable:!0,get:function(){return s.TUnion}}),Object.defineProperty(t,"TIntersection",{enumerable:!0,get:function(){return s.TIntersection}}),Object.defineProperty(t,"array",{enumerable:!0,get:function(){return s.array}}),Object.defineProperty(t,"enumlit",{enumerable:!0,get:function(){return s.enumlit}}),Object.defineProperty(t,"enumtype",{enumerable:!0,get:function(){return s.enumtype}}),Object.defineProperty(t,"func",{enumerable:!0,get:function(){return s.func}}),Object.defineProperty(t,"iface",{enumerable:!0,get:function(){return s.iface}}),Object.defineProperty(t,"lit",{enumerable:!0,get:function(){return s.lit}}),Object.defineProperty(t,"name",{enumerable:!0,get:function(){return s.name}}),Object.defineProperty(t,"opt",{enumerable:!0,get:function(){return s.opt}}),Object.defineProperty(t,"param",{enumerable:!0,get:function(){return s.param}}),Object.defineProperty(t,"tuple",{enumerable:!0,get:function(){return s.tuple}}),Object.defineProperty(t,"union",{enumerable:!0,get:function(){return s.union}}),Object.defineProperty(t,"intersection",{enumerable:!0,get:function(){return s.intersection}}),Object.defineProperty(t,"BasicType",{enumerable:!0,get:function(){return s.BasicType}});var o=Oe;Object.defineProperty(t,"VError",{enumerable:!0,get:function(){return o.VError}}),t.createCheckers=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];for(var s=Object.assign.apply(Object,n([{},Pe.basicTypes],e)),o={},i=0,a=e;i<a.length;i++)for(var c=a[i],h=0,l=Object.keys(c);h<l.length;h++){var p=l[h];o[p]=new r(s,c[p])}return o};var r=function(){function e(e,t,n){if(void 0===n&&(n="value"),this.suite=e,this.ttype=t,this._path=n,this.props=new Map,t instanceof Pe.TIface)for(var s=0,o=t.props;s<o.length;s++){var r=o[s];this.props.set(r.name,r.ttype)}this.checkerPlain=this.ttype.getChecker(e,!1),this.checkerStrict=this.ttype.getChecker(e,!0)}return e.prototype.setReportedPath=function(e){this._path=e},e.prototype.check=function(e){return this._doCheck(this.checkerPlain,e)},e.prototype.test=function(e){return this.checkerPlain(e,new Oe.NoopContext)},e.prototype.validate=function(e){return this._doValidate(this.checkerPlain,e)},e.prototype.strictCheck=function(e){return this._doCheck(this.checkerStrict,e)},e.prototype.strictTest=function(e){return this.checkerStrict(e,new Oe.NoopContext)},e.prototype.strictValidate=function(e){return this._doValidate(this.checkerStrict,e)},e.prototype.getProp=function(t){var n=this.props.get(t);if(!n)throw new Error("Type has no property "+t);return new e(this.suite,n,this._path+"."+t)},e.prototype.methodArgs=function(t){var n=this._getMethod(t);return new e(this.suite,n.paramList)},e.prototype.methodResult=function(t){var n=this._getMethod(t);return new e(this.suite,n.result)},e.prototype.getArgs=function(){if(!(this.ttype instanceof Pe.TFunc))throw new Error("getArgs() applied to non-function");return new e(this.suite,this.ttype.paramList)},e.prototype.getResult=function(){if(!(this.ttype instanceof Pe.TFunc))throw new Error("getResult() applied to non-function");return new e(this.suite,this.ttype.result)},e.prototype.getType=function(){return this.ttype},e.prototype._doCheck=function(e,t){if(!e(t,new Oe.NoopContext)){var n=new Oe.DetailContext;throw e(t,n),n.getError(this._path)}},e.prototype._doValidate=function(e,t){if(e(t,new Oe.NoopContext))return null;var n=new Oe.DetailContext;return e(t,n),n.getErrorDetail(this._path)},e.prototype._getMethod=function(e){var t=this.props.get(e);if(!t)throw new Error("Type has no property "+e);if(!(t instanceof Pe.TFunc))throw new Error("Property "+e+" is not a method");return t},e}();t.Checker=r}));Le(je),je.Checker;var De=je.createCheckers;je.TArray,je.TEnumType,je.TEnumLiteral,je.TFunc,je.TIface,je.TLiteral,je.TName,je.TOptional,je.TParam,je.TParamList,je.TProp,je.TTuple,je.TType,je.TUnion,je.TIntersection;var qe=je.array;je.enumlit,je.enumtype,je.func;var Fe=je.iface,Be=je.lit;je.name;var \$e=je.opt;je.param,je.tuple;var Me=je.union;je.intersection,je.BasicType,je.VError;const Ke={Transform:Me(Be("jsx"),Be("typescript"),Be("flow"),Be("imports"),Be("react-hot-loader"),Be("jest")),SourceMapOptions:Fe([],{compiledFilename:"string"}),Options:Fe([],{transforms:qe("Transform"),jsxPragma:\$e("string"),jsxFragmentPragma:\$e("string"),enableLegacyTypeScriptModuleInterop:\$e("boolean"),enableLegacyBabel5ModuleInterop:\$e("boolean"),sourceMapOptions:\$e("SourceMapOptions"),filePath:\$e("string"),production:\$e("boolean"),disableESTransforms:\$e("boolean")})},{Options:Ve}=De(Ke);function He(){V(),nn(!1)}function Ue(e){V(),Ge(e)}function We(e){Rn(),Xe(e)}function ze(){Rn(),p.tokens[p.tokens.length-1].identifierRole=j.ImportDeclaration}function Xe(e){let t;t=0===p.scopeDepth?j.TopLevelDeclaration:e?j.BlockScopedDeclaration:j.FunctionScopedDeclaration,p.tokens[p.tokens.length-1].identifierRole=t}function Ge(e){switch(p.type){case n._this:{const e=W(0);return V(),void z(e)}case n._yield:case n.name:return p.type=n.name,void We(e);case n.bracketL:return V(),void Je(n.bracketR,e,!0);case n.braceL:return void bn(!0,e);default:A()}}function Je(e,t,s=!1,o=!1,r=0){let i=!0,a=!1;const c=p.tokens.length;for(;!X(e)&&!p.error;)if(i?i=!1:(C(n.comma),p.tokens[p.tokens.length-1].contextId=r,!a&&p.tokens[c].isType&&(p.tokens[p.tokens.length-1].isType=!0,a=!0)),s&&J(n.comma));else{if(X(e))break;if(J(n.ellipsis)){Ue(t),Qe(),X(n.comma),C(e);break}Ye(o,t)}}function Ye(e,n){e&&nt([t._public,t._protected,t._private,t._readonly,t._override]),Ze(n),Qe(),Ze(n,!0)}function Qe(){l?function(){const e=W(0);X(n.question),J(n.colon)&&os();z(e)}():h&&function(){const e=W(0);X(n.question),wt(),z(e)}()}function Ze(e,t=!1){if(t||Ge(e),!X(n.eq))return;const s=p.tokens.length-1;nn(),p.tokens[s].rhsEndIndex=p.tokens.length}function et(){return J(n.name)}function tt(){const e=p.snapshot();V();return!!((J(n.bracketL)||J(n.braceL)||J(n.star)||J(n.ellipsis)||J(n.hash)||J(n.name)||Boolean(p.type&n.IS_KEYWORD)||J(n.string)||J(n.num)||J(n.bigint)||J(n.decimal))&&!I())||(p.restoreFromSnapshot(e),!1)}function nt(e){for(;;){if(null===st(e))break}}function st(e){if(!J(n.name))return null;const s=p.contextualKeyword;if(-1!==e.indexOf(s)&&tt()){switch(s){case t._readonly:p.tokens[p.tokens.length-1].type=n._readonly;break;case t._abstract:p.tokens[p.tokens.length-1].type=n._abstract;break;case t._static:p.tokens[p.tokens.length-1].type=n._static;break;case t._public:p.tokens[p.tokens.length-1].type=n._public;break;case t._private:p.tokens[p.tokens.length-1].type=n._private;break;case t._protected:p.tokens[p.tokens.length-1].type=n._protected;break;case t._override:p.tokens[p.tokens.length-1].type=n._override;break;case t._declare:p.tokens[p.tokens.length-1].type=n._declare}return s}return null}function ot(){for(Rn();X(n.dot);)Rn()}function rt(){C(n._import),C(n.parenL),C(n.string),C(n.parenR),X(n.dot)&&ot(),J(n.lessThan)&&Kt()}function it(){J(n.lessThan)&&at()}function at(){const e=W(0);for(J(n.lessThan)||J(n.typeParameterStart)?V():A();!X(n.greaterThan)&&!p.error;)Rn(),X(n._extends)&&At(),X(n.eq)&&At(),X(n.comma);z(e)}function ct(e){const t=e===n.arrow;var s;it(),C(n.parenL),p.scopeDepth++,s=!1,Je(n.parenR,s),p.scopeDepth--,(t||J(e))&&vt(e)}function ht(){X(n.comma)||w()}function lt(){ct(n.colon),ht()}function pt(){if(!J(n.bracketL)||!function(){const e=p.snapshot();V();const t=X(n.name)&&J(n.colon);return p.restoreFromSnapshot(e),t}())return!1;const e=W(0);return C(n.bracketL),Rn(),Ct(),C(n.bracketR),wt(),ht(),z(e),!0}function ut(e){X(n.question),e||!J(n.parenL)&&!J(n.lessThan)?(wt(),ht()):(ct(n.colon),ht())}function ft(){if(J(n.parenL)||J(n.lessThan))return void lt();if(J(n._new))return V(),void(J(n.parenL)||J(n.lessThan)?lt():ut(!1));const e=!!st([t._readonly]);pt()||((g(t._get)||g(t._set))&&tt(),wn(-1),ut(e))}function dt(){for(C(n.braceL);!X(n.braceR)&&!p.error;)ft()}function mt(){const e=p.snapshot(),s=function(){if(V(),X(n.plus)||X(n.minus))return g(t._readonly);g(t._readonly)&&V();if(!J(n.bracketL))return!1;if(V(),!et())return!1;return V(),J(n._in)}();return p.restoreFromSnapshot(e),s}function kt(){C(n.braceL),J(n.plus)||J(n.minus)?(V(),x(t._readonly)):T(t._readonly),C(n.bracketL),Rn(),C(n._in),At(),T(t._as)&&At(),C(n.bracketR),J(n.plus)||J(n.minus)?(V(),C(n.question)):X(n.question),X(n.colon)&&At(),w(),C(n.braceR)}function _t(){X(n.ellipsis)?At():(At(),X(n.question)),X(n.colon)&&At()}var gt;function yt(e){e===gt.TSAbstractConstructorType&&x(t._abstract),e!==gt.TSConstructorType&&e!==gt.TSAbstractConstructorType||C(n._new),ct(n.arrow)}function Tt(){switch(p.type){case n.name:return ot(),void(!I()&&J(n.lessThan)&&Kt());case n._void:case n._null:return void V();case n.string:case n.num:case n.bigint:case n.decimal:case n._true:case n._false:return void _n();case n.minus:return V(),void _n();case n._this:return V(),void(g(t._is)&&!I()&&(V(),Ct()));case n._typeof:return C(n._typeof),void(J(n._import)?rt():ot());case n._import:return void rt();case n.braceL:return void(mt()?kt():dt());case n.bracketL:return void function(){for(C(n.bracketL);!X(n.bracketR)&&!p.error;)_t(),X(n.comma)}();case n.parenL:return C(n.parenL),At(),void C(n.parenR);case n.backQuote:return void function(){for(H(),H();!J(n.backQuote)&&!p.error;)C(n.dollarBraceL),At(),H(),H();V()}();default:if(p.type&n.IS_KEYWORD)return V(),void(p.tokens[p.tokens.length-1].type=n.name)}A()}function xt(){g(t._keyof)||g(t._unique)||g(t._readonly)?(V(),xt()):g(t._infer)?(x(t._infer),Rn()):function(){for(Tt();!I()&&X(n.bracketL);)X(n.bracketR)||(At(),C(n.bracketR))}()}function bt(){if(X(n.bitwiseAND),xt(),J(n.bitwiseAND))for(;X(n.bitwiseAND);)xt()}function It(){return!!J(n.lessThan)||J(n.parenL)&&function(){const e=p.snapshot(),t=function(){if(V(),J(n.parenR)||J(n.ellipsis))return!0;if(function(){if(J(n.name)||J(n._this))return V(),!0;if(J(n.braceL)||J(n.bracketL)){let e=1;for(V();e>0&&!p.error;)J(n.braceL)||J(n.bracketL)?e++:(J(n.braceR)||J(n.bracketR))&&e--,V();return!0}return!1}()){if(J(n.colon)||J(n.comma)||J(n.question)||J(n.eq))return!0;if(J(n.parenR)&&(V(),J(n.arrow)))return!0}return!1}();return p.restoreFromSnapshot(e),t}()}function vt(e){const s=W(0);C(e);(function(){const e=p.snapshot();if(g(t._asserts)&&!I())return V(),T(t._is)?(At(),!0):et()||J(n._this)?(V(),T(t._is)&&At(),!0):(p.restoreFromSnapshot(e),!1);if(et()||J(n._this))return V(),g(t._is)&&!I()?(V(),At(),!0):(p.restoreFromSnapshot(e),!1);return!1})()||At(),z(s)}function wt(){J(n.colon)&&Ct()}function Ct(){const e=W(0);C(n.colon),At(),z(e)}function At(){Et(),!I()&&X(n._extends)&&(Et(),C(n.question),At(),C(n.colon),At())}function Et(){It()?yt(gt.TSFunctionType):J(n._new)?yt(gt.TSConstructorType):g(t._abstract)&&Y()===n._new?yt(gt.TSAbstractConstructorType):function(){if(X(n.bitwiseOR),bt(),J(n.bitwiseOR))for(;X(n.bitwiseOR);)bt()}()}function St(){for(;!J(n.braceL)&&!p.error;)Nt(),X(n.comma)}function Nt(){ot(),J(n.lessThan)&&Kt()}function Lt(){if(J(n.string)?_n():Rn(),X(n.eq)){const e=p.tokens.length-1;nn(),p.tokens[e].rhsEndIndex=p.tokens.length}}function Rt(){for(We(!1),C(n.braceL);!X(n.braceR)&&!p.error;)Lt(),X(n.comma)}function Ot(){C(n.braceL),ds(n.braceR)}function Pt(){We(!1),X(n.dot)?Pt():Ot()}function jt(){g(t._global)?Rn():J(n.string)?mn():A(),J(n.braceL)?Ot():w()}function Dt(){ze(),C(n.eq),g(t._require)&&Y()===n.parenL?(x(t._require),C(n.parenL),J(n.string)||A(),_n(),C(n.parenR)):ot(),w()}function qt(){return Bt(p.contextualKeyword,!0)}function Ft(e){switch(e){case t._declare:{const e=p.tokens.length-1;if(function(){if(v())return!1;switch(p.type){case n._function:{const e=W(1);V();return ys(p.start,!0),z(e),!0}case n._class:{const e=W(1);return xs(!0,!1),z(e),!0}case n._const:if(J(n._const)&&y(t._enum)){const e=W(1);return C(n._const),x(t._enum),p.tokens[p.tokens.length-1].type=n._enum,Rt(),z(e),!0}case n._var:case n._let:{const e=W(1);return us(p.type),z(e),!0}case n.name:{const e=W(1),n=p.contextualKeyword;let s=!1;return n===t._global?(jt(),s=!0):s=Bt(n,!0),z(e),s}default:return!1}}())return p.tokens[e].type=n._declare,!0;break}case t._global:if(J(n.braceL))return Ot(),!0;break;default:return Bt(e,!1)}return!1}function Bt(e,s){switch(e){case t._abstract:if(\$t(s)&&J(n._class))return p.tokens[p.tokens.length-1].type=n._abstract,xs(!0,!1),!0;break;case t._enum:if(\$t(s)&&J(n.name))return p.tokens[p.tokens.length-1].type=n._enum,Rt(),!0;break;case t._interface:if(\$t(s)&&J(n.name)){const e=W(s?2:1);return We(!1),it(),X(n._extends)&&St(),dt(),z(e),!0}break;case t._module:if(\$t(s)){if(J(n.string)){const e=W(s?2:1);return jt(),z(e),!0}if(J(n.name)){const e=W(s?2:1);return Pt(),z(e),!0}}break;case t._namespace:if(\$t(s)&&J(n.name)){const e=W(s?2:1);return Pt(),z(e),!0}break;case t._type:if(\$t(s)&&J(n.name)){const e=W(s?2:1);return We(!1),it(),C(n.eq),At(),w(),z(e),!0}}return!1}function \$t(e){return e?(V(),!0):!v()}function Mt(){const e=p.snapshot();return at(),Ts(),J(n.colon)&&vt(n.colon),C(n.arrow),p.error?(p.restoreFromSnapshot(e),!1):(Sn(!0),!0)}function Kt(){const e=W(0);for(C(n.lessThan);!X(n.greaterThan)&&!p.error;)At(),X(n.comma);z(e)}function Vt(){if(J(n.name))switch(p.contextualKeyword){case t._abstract:case t._declare:case t._enum:case t._interface:case t._module:case t._namespace:case t._type:return!0}return!1}function Ht(e,t){return c?function(e,t){if(!J(n.lessThan))return sn(e,t);const s=p.snapshot();let o=sn(e,t);if(!p.error)return o;p.restoreFromSnapshot(s);p.type=n.typeParameterStart,at(),o=sn(e,t),o||A();return o}(e,t):function(e,t){if(!J(n.lessThan))return sn(e,t);const s=p.snapshot();at();const o=sn(e,t);o||A();if(!p.error)return o;p.restoreFromSnapshot(s);return sn(e,t)}(e,t)}function Ut(){Qt()}function Wt(e){Ut(),X(n.colon)?Ut():p.tokens[p.tokens.length-1].identifierRole=e}function zt(){for(Wt(j.Access);J(n.dot);)Qt(),Ut()}function Xt(){J(n.braceR)||tn()}function Gt(){if(X(n.braceL))return C(n.ellipsis),nn(),void Qt();Wt(j.ObjectKey),J(n.eq)&&(Qt(),function(){switch(p.type){case n.braceL:return V(),Xt(),void Qt();case n.jsxTagStart:return Yt(),void Qt();case n.string:return void Qt();default:A("JSX value should be either an expression or a quoted JSX text")}}())}function Jt(){if(J(n.jsxTagEnd))return!1;for(zt(),h&&function(){if(X(n.jsxTagStart)){p.tokens[p.tokens.length-1].type=n.typeParameterStart;const e=W(1);for(;!J(n.greaterThan)&&!p.error;)At(),X(n.comma);Qt(),z(e)}}();!J(n.slash)&&!J(n.jsxTagEnd)&&!p.error;)Gt();const e=J(n.slash);return e&&Qt(),e}function Yt(){Qt(),function e(){if(!Jt())for(Zt();;)switch(p.type){case n.jsxTagStart:if(Qt(),J(n.slash))return Qt(),void(J(n.jsxTagEnd)||zt());e(),Zt();break;case n.jsxText:Zt();break;case n.braceL:V(),J(n.ellipsis)?(C(n.ellipsis),tn(),Zt()):(Xt(),Zt());break;default:return void A()}}()}function Qt(){p.tokens.push(new K),ie(),p.start=p.pos;const e=u.charCodeAt(p.pos);if(O[e])!function(){let e;do{if(p.pos>u.length)return void A("Unexpectedly reached the end of input.");e=u.charCodeAt(++p.pos)}while(R[e]||e===s.dash);ae(n.jsxName)}();else if(e===s.quotationMark||e===s.apostrophe)!function(e){for(p.pos++;;){if(p.pos>=u.length)return void A("Unterminated string constant");if(u.charCodeAt(p.pos)===e){p.pos++;break}p.pos++}ae(n.string)}(e);else switch(++p.pos,e){case s.greaterThan:ae(n.jsxTagEnd);break;case s.lessThan:ae(n.jsxTagStart);break;case s.slash:ae(n.slash);break;case s.equalsTo:ae(n.eq);break;case s.leftCurlyBrace:ae(n.braceL);break;case s.dot:ae(n.dot);break;case s.colon:ae(n.colon);break;default:A()}}function Zt(){p.tokens.push(new K),p.start=p.pos,function(){for(;;){if(p.pos>=u.length)return void A("Unterminated JSX contents");const e=u.charCodeAt(p.pos);switch(e){case s.lessThan:case s.leftCurlyBrace:return p.pos===p.start?e===s.lessThan?(p.pos++,void ae(n.jsxTagStart)):void ce(e):void ae(n.jsxText);default:p.pos++}}}()}!function(e){e[e.TSFunctionType=0]="TSFunctionType";e[e.TSConstructorType=1]="TSConstructorType";e[e.TSAbstractConstructorType=2]="TSAbstractConstructorType"}(gt||(gt={}));class en{constructor(e){this.stop=e}}function tn(e=!1){if(nn(e),J(n.comma))for(;X(n.comma);)nn(e)}function nn(e=!1,t=!1){return h?Ht(e,t):l?function(e,t){if(J(n.lessThan)){const s=p.snapshot();let o=sn(e,t);if(!p.error)return o;p.restoreFromSnapshot(s),p.type=n.typeParameterStart;const r=W(0);if(Vn(),z(r),o=sn(e,t),o)return!0;A()}return sn(e,t)}(e,t):sn(e,t)}function sn(e,s){if(J(n._yield))return V(),J(n.semi)||b()||(X(n.star),nn()),!1;(J(n.parenL)||J(n.name)||J(n._yield))&&(p.potentialArrowAt=p.start);const o=function(e){if(function(e){const s=p.tokens.length;if(rn())return!0;return function e(s,o,r){if(h&&(n._in&n.PRECEDENCE_MASK)>o&&!I()&&T(t._as)){p.tokens[p.tokens.length-1].type=n._as;const t=W(1);return At(),z(t),void e(s,o,r)}const i=p.type&n.PRECEDENCE_MASK;if(i>0&&(!r||!J(n._in))&&i>o){const t=p.type;V(),t===n.nullishCoalescing&&(p.tokens[p.tokens.length-1].nullishStartIndex=s);const a=p.tokens.length;rn(),e(a,t&n.IS_RIGHT_ASSOCIATIVE?i-1:i,r),t===n.nullishCoalescing&&(p.tokens[s].numNullishCoalesceStarts++,p.tokens[p.tokens.length-1].numNullishCoalesceEnds++),e(s,o,r)}}(s,-1,e),!1}(e))return!0;return function(e){h||l?function(e){if(J(n.question)){const e=Y();if(e===n.colon||e===n.comma||e===n.parenR)return}on(e)}(e):on(e)}(e),!1}(e);return s&&Tn(),p.type&n.IS_ASSIGN?(V(),nn(e),!1):o}function on(e){X(n.question)&&(nn(),C(n.colon),nn(e))}function rn(){if(h&&!c&&X(n.lessThan))return function(){const e=W(1);At(),C(n.greaterThan),z(e),rn()}(),!1;if(g(t._module)&&ne()===s.leftCurlyBrace&&!function(){const e=ee();for(let t=p.end;t<e;t++){const e=u.charCodeAt(t);if(e===s.lineFeed||e===s.carriageReturn||8232===e||8233===e)return!0}return!1}())return x(t._module),C(n.braceL),ds(n.braceR),!1;if(p.type&n.IS_PREFIX)return V(),rn(),!1;if(an())return!0;for(;p.type&n.IS_POSTFIX&&!b();)p.type===n.preIncDec&&(p.type=n.postIncDec),V();return!1}function an(){const e=p.tokens.length;return!!mn()||(cn(e),p.tokens.length>e&&p.tokens[e].isOptionalChainStart&&(p.tokens[p.tokens.length-1].isOptionalChainEnd=!0),!1)}function cn(e,s=!1){l?function(e,s=!1){if(p.tokens[p.tokens.length-1].contextualKeyword===t._async&&J(n.lessThan)){const e=p.snapshot();if(function(){p.scopeDepth++;const e=p.tokens.length;if(Ts(),!yn())return!1;return An(e),!0}()&&!p.error)return;p.restoreFromSnapshot(e)}hn(e,s)}(e,s):hn(e,s)}function hn(e,t=!1){const n=new en(!1);do{ln(e,t,n)}while(!n.stop&&!p.error)}function ln(e,t,s){h?function(e,t,s){if(I()||!X(n.bang)){if(J(n.lessThan)){const s=p.snapshot();if(!t&&un()){if(Mt())return}if(Kt(),!t&&X(n.parenL)?(p.tokens[p.tokens.length-1].subscriptStartIndex=e,fn()):J(n.backQuote)?xn():A(),!p.error)return;p.restoreFromSnapshot(s)}else!t&&J(n.questionDot)&&Y()===n.lessThan&&(V(),p.tokens[e].isOptionalChainStart=!0,p.tokens[p.tokens.length-1].subscriptStartIndex=e,Kt(),C(n.parenL),fn());pn(e,t,s)}else p.tokens[p.tokens.length-1].type=n.nonNullAssertion}(e,t,s):l?function(e,t,s){if(J(n.questionDot)&&Y()===n.lessThan)return t?void(s.stop=!0):(V(),Hn(),C(n.parenL),void fn());if(!t&&J(n.lessThan)){const e=p.snapshot();if(Hn(),C(n.parenL),fn(),!p.error)return;p.restoreFromSnapshot(e)}pn(e,t,s)}(e,t,s):pn(e,t,s)}function pn(e,t,s){if(!t&&X(n.doubleColon))dn(),s.stop=!0,cn(e,t);else if(J(n.questionDot)){if(p.tokens[e].isOptionalChainStart=!0,t&&Y()===n.parenL)return void(s.stop=!0);V(),p.tokens[p.tokens.length-1].subscriptStartIndex=e,X(n.bracketL)?(tn(),C(n.bracketR)):X(n.parenL)?fn():kn()}else if(X(n.dot))p.tokens[p.tokens.length-1].subscriptStartIndex=e,kn();else if(X(n.bracketL))p.tokens[p.tokens.length-1].subscriptStartIndex=e,tn(),C(n.bracketR);else if(!t&&J(n.parenL))if(un()){const t=p.snapshot(),o=p.tokens.length;V(),p.tokens[p.tokens.length-1].subscriptStartIndex=e;const r=d();p.tokens[p.tokens.length-1].contextId=r,fn(),p.tokens[p.tokens.length-1].contextId=r,(J(n.colon)||J(n.arrow))&&(p.restoreFromSnapshot(t),s.stop=!0,p.scopeDepth++,Ts(),function(e){h?J(n.colon)&&Ct():l&&function(){if(J(n.colon)){const e=p.noAnonFunctionType;p.noAnonFunctionType=!0,os(),p.noAnonFunctionType=e}}();C(n.arrow),An(e)}(o))}else{V(),p.tokens[p.tokens.length-1].subscriptStartIndex=e;const t=d();p.tokens[p.tokens.length-1].contextId=t,fn(),p.tokens[p.tokens.length-1].contextId=t}else J(n.backQuote)?xn():s.stop=!0}function un(){return p.tokens[p.tokens.length-1].contextualKeyword===t._async&&!b()}function fn(){let e=!0;for(;!X(n.parenR)&&!p.error;){if(e)e=!1;else if(C(n.comma),X(n.parenR))break;Ln(!1)}}function dn(){const e=p.tokens.length;mn(),cn(e,!0)}function mn(){if(X(n.modulo))return Rn(),!1;if(J(n.jsxText))return _n(),!1;if(J(n.lessThan)&&c)return p.type=n.jsxTagStart,Yt(),V(),!1;const e=p.potentialArrowAt===p.start;switch(p.type){case n.slash:case n.assign:U();case n._super:case n._this:case n.regexp:case n.num:case n.bigint:case n.decimal:case n.string:case n._null:case n._true:case n._false:return V(),!1;case n._import:return V(),J(n.dot)&&(p.tokens[p.tokens.length-1].type=n.name,V(),Rn()),!1;case n.name:{const s=p.tokens.length,o=p.start,r=p.contextualKeyword;return Rn(),r===t._await?(rn(),!1):r===t._async&&J(n._function)&&!b()?(V(),ys(o,!1),!1):e&&r===t._async&&!b()&&J(n.name)?(p.scopeDepth++,We(!1),C(n.arrow),An(s),!0):J(n._do)&&!b()?(V(),fs(),!1):e&&!b()&&J(n.arrow)?(p.scopeDepth++,Xe(!1),C(n.arrow),An(s),!0):(p.tokens[p.tokens.length-1].identifierRole=j.Access,!1)}case n._do:return V(),fs(),!1;case n.parenL:return function(e){const t=p.snapshot(),s=p.tokens.length;C(n.parenL);let o=!0;for(;!J(n.parenR)&&!p.error;){if(o)o=!1;else if(C(n.comma),J(n.parenR))break;if(J(n.ellipsis)){Ue(!1),Tn();break}nn(!1,!0)}if(C(n.parenR),e&&function(){return J(n.colon)||!b()}()){if(yn())return p.restoreFromSnapshot(t),p.scopeDepth++,Ts(),yn(),An(s),!0}return!1}(e);case n.bracketL:return V(),Nn(n.bracketR,!0),!1;case n.braceL:return bn(!1,!1),!1;case n._function:return function(){const e=p.start;Rn(),X(n.dot)&&Rn();ys(e,!1)}(),!1;case n.at:hs();case n._class:return xs(!1),!1;case n._new:return function(){if(C(n._new),X(n.dot))return void Rn();dn(),X(n.questionDot),function(){h?function(){if(J(n.lessThan)){const e=p.snapshot();p.type=n.typeParameterStart,Kt(),J(n.parenL)||A(),p.error&&p.restoreFromSnapshot(e)}}():l&&function(){if(J(n.lessThan)){const e=p.snapshot();Hn(),p.error&&p.restoreFromSnapshot(e)}}();X(n.parenL)&&Nn(n.parenR)}()}(),!1;case n.backQuote:return xn(),!1;case n.doubleColon:return V(),dn(),!1;case n.hash:{const e=ne();return O[e]||e===s.backslash?kn():V(),!1}default:return A(),!1}}function kn(){X(n.hash),Rn()}function _n(){V()}function gn(){C(n.parenL),tn(),C(n.parenR)}function yn(){return h?function(){if(J(n.colon)){const e=p.snapshot();vt(n.colon),b()&&A(),J(n.arrow)||A(),p.error&&p.restoreFromSnapshot(e)}return X(n.arrow)}():l?function(){if(J(n.colon)){const e=W(0),t=p.snapshot(),s=p.noAnonFunctionType;p.noAnonFunctionType=!0,jn(),p.noAnonFunctionType=s,b()&&A(),J(n.arrow)||A(),p.error&&p.restoreFromSnapshot(t),z(e)}return X(n.arrow)}():X(n.arrow)}function Tn(){(h||l)&&(G(n.question),J(n.colon)&&(h?Ct():l&&os()))}function xn(){for(H(),H();!J(n.backQuote)&&!p.error;)C(n.dollarBraceL),tn(),H(),H();V()}function bn(e,s){const o=d();let r=!0;for(V(),p.tokens[p.tokens.length-1].contextId=o;!X(n.braceR)&&!p.error;){if(r)r=!1;else if(C(n.comma),X(n.braceR))break;let i=!1;if(J(n.ellipsis)){const t=p.tokens.length;if(He(),e&&(p.tokens.length===t+2&&Xe(s),X(n.braceR)))break}else e||(i=X(n.star)),!e&&g(t._async)?(i&&A(),Rn(),J(n.colon)||J(n.parenL)||J(n.braceR)||J(n.eq)||J(n.comma)||(J(n.star)&&(V(),i=!0),wn(o))):wn(o),vn(e,s,o)}p.tokens[p.tokens.length-1].contextId=o}function In(e,t){const s=p.start;return J(n.parenL)?(e&&A(),Cn(s,!1),!0):!!function(e){return!e&&(J(n.string)||J(n.num)||J(n.bracketL)||J(n.name)||!!(p.type&n.IS_KEYWORD))}(e)&&(wn(t),Cn(s,!1),!0)}function vn(e,t,s){h?it():l&&J(n.lessThan)&&(Vn(),J(n.parenL)||A());In(e,s)||function(e,t){if(X(n.colon))return void(e?Ze(t):nn(!1));let s;s=e?0===p.scopeDepth?j.ObjectShorthandTopLevelDeclaration:t?j.ObjectShorthandBlockScopedDeclaration:j.ObjectShorthandFunctionScopedDeclaration:j.ObjectShorthand,p.tokens[p.tokens.length-1].identifierRole=s,Ze(t,!0)}(e,t)}function wn(e){l&&is(),X(n.bracketL)?(p.tokens[p.tokens.length-1].contextId=e,nn(),C(n.bracketR),p.tokens[p.tokens.length-1].contextId=e):(J(n.num)||J(n.string)||J(n.bigint)||J(n.decimal)?mn():kn(),p.tokens[p.tokens.length-1].identifierRole=j.ObjectKey,p.tokens[p.tokens.length-1].contextId=e)}function Cn(e,t){const n=d();p.scopeDepth++;const s=p.tokens.length;Ts(t,n),En(e,n);const o=p.tokens.length;p.scopes.push(new r(s,o,!0)),p.scopeDepth--}function An(e){Sn(!0);const t=p.tokens.length;p.scopes.push(new r(e,t,!0)),p.scopeDepth--}function En(e,t=0){h?function(e,t){if(J(n.colon)&&vt(n.colon),J(n.braceL)||!v())Sn(!1,t);else{let t=p.tokens.length-1;for(;t>=0&&(p.tokens[t].start>=e||p.tokens[t].type===n._default||p.tokens[t].type===n._export);)p.tokens[t].isType=!0,t--}}(e,t):l?function(e){J(n.colon)&&jn();Sn(!1,e)}(t):Sn(!1,t)}function Sn(e,t=0){e&&!J(n.braceL)?nn():fs(!0,t)}function Nn(e,t=!1){let s=!0;for(;!X(e)&&!p.error;){if(s)s=!1;else if(C(n.comma),X(e))break;Ln(t)}}function Ln(e){e&&J(n.comma)||(J(n.ellipsis)?(He(),Tn()):J(n.question)?V():nn(!1,!0))}function Rn(){V(),p.tokens[p.tokens.length-1].type=n.name}function On(e){const t=W(0);C(e||n.colon),ss(),z(t)}function Pn(){C(n.modulo),x(t._checks),X(n.parenL)&&(tn(),C(n.parenR))}function jn(){const e=W(0);C(n.colon),J(n.modulo)?Pn():(ss(),J(n.modulo)&&Pn()),z(e)}function Dn(){J(n._class)?(V(),qn(!0)):J(n._function)?(V(),Rn(),J(n.lessThan)&&Vn(),C(n.parenL),Qn(),C(n.parenR),jn(),w()):J(n._var)?(V(),rs(),w()):T(t._module)?X(n.dot)?(x(t._exports),os(),w()):function(){J(n.string)?mn():Rn();C(n.braceL);for(;!J(n.braceR)&&!p.error;)J(n._import)?(V(),Ps()):A();C(n.braceR)}():g(t._type)?(V(),Mn()):g(t._opaque)?(V(),Kn(!0)):g(t._interface)?(V(),qn()):J(n._export)?(C(n._export),X(n._default)?J(n._function)||J(n._class)?Dn():(ss(),w()):J(n._var)||J(n._function)||J(n._class)||g(t._opaque)?Dn():J(n.star)||J(n.braceL)||g(t._interface)||g(t._type)||g(t._opaque)?Ss():A()):A()}function qn(e=!1){if(\$n(),J(n.lessThan)&&Vn(),X(n._extends))do{Fn()}while(!e&&X(n.comma));if(g(t._mixins)){V();do{Fn()}while(X(n.comma))}if(g(t._implements)){V();do{Fn()}while(X(n.comma))}zn(e,!1,e)}function Fn(){Jn(!1),J(n.lessThan)&&Hn()}function Bn(){qn()}function \$n(){Rn()}function Mn(){\$n(),J(n.lessThan)&&Vn(),On(n.eq),w()}function Kn(e){x(t._type),\$n(),J(n.lessThan)&&Vn(),J(n.colon)&&On(n.colon),e||On(n.eq),w()}function Vn(){const e=W(0);J(n.lessThan)||J(n.typeParameterStart)?V():A();do{is(),rs(),X(n.eq)&&ss(),J(n.greaterThan)||C(n.comma)}while(!J(n.greaterThan)&&!p.error);C(n.greaterThan),z(e)}function Hn(){const e=W(0);for(C(n.lessThan);!J(n.greaterThan)&&!p.error;)ss(),J(n.greaterThan)||C(n.comma);C(n.greaterThan),z(e)}function Un(){J(n.num)||J(n.string)?mn():Rn()}function Wn(){for(J(n.lessThan)&&Vn(),C(n.parenL);!J(n.parenR)&&!J(n.ellipsis)&&!p.error;)Yn(),J(n.parenR)||C(n.comma);X(n.ellipsis)&&Yn(),C(n.parenR),On()}function zn(e,s,o){let r;for(s&&J(n.braceBarL)?(C(n.braceBarL),r=n.braceBarR):(C(n.braceL),r=n.braceR);!J(r)&&!p.error;){if(o&&g(t._proto)){const t=Y();t!==n.colon&&t!==n.question&&(V(),e=!1)}if(e&&g(t._static)){const e=Y();e!==n.colon&&e!==n.question&&V()}if(is(),X(n.bracketL))X(n.bracketL)?(Un(),C(n.bracketR),C(n.bracketR),J(n.lessThan)||J(n.parenL)?Wn():(X(n.question),On())):(Y()===n.colon?(Un(),On()):ss(),C(n.bracketR),On());else if(J(n.parenL)||J(n.lessThan))Wn();else{if(g(t._get)||g(t._set)){const e=Y();e!==n.name&&e!==n.string&&e!==n.num||V()}Xn()}Gn()}C(r)}function Xn(){if(J(n.ellipsis)){if(C(n.ellipsis),X(n.comma)||X(n.semi),J(n.braceR))return;ss()}else Un(),J(n.lessThan)||J(n.parenL)?Wn():(X(n.question),On())}function Gn(){X(n.semi)||X(n.comma)||J(n.braceR)||J(n.braceBarR)||A()}function Jn(e){for(e||Rn();X(n.dot);)Rn()}function Yn(){const e=Y();e===n.colon||e===n.question?(Rn(),X(n.question),On()):ss()}function Qn(){for(;!J(n.parenR)&&!J(n.ellipsis)&&!p.error;)Yn(),J(n.parenR)||C(n.comma);X(n.ellipsis)&&Yn()}function Zn(){let e=!1;const s=p.noAnonFunctionType;switch(p.type){case n.name:return g(t._interface)?void function(){if(x(t._interface),X(n._extends))do{Fn()}while(X(n.comma));zn(!1,!1,!1)}():(Rn(),Jn(!0),void(J(n.lessThan)&&Hn()));case n.braceL:return void zn(!1,!1,!1);case n.braceBarL:return void zn(!1,!0,!1);case n.bracketL:return void function(){for(C(n.bracketL);p.pos<u.length&&!J(n.bracketR)&&(ss(),!J(n.bracketR));)C(n.comma);C(n.bracketR)}();case n.lessThan:return Vn(),C(n.parenL),Qn(),C(n.parenR),C(n.arrow),void ss();case n.parenL:if(V(),!J(n.parenR)&&!J(n.ellipsis))if(J(n.name)){const t=Y();e=t!==n.question&&t!==n.colon}else e=!0;if(e){if(p.noAnonFunctionType=!1,ss(),p.noAnonFunctionType=s,p.noAnonFunctionType||!(J(n.comma)||J(n.parenR)&&Y()===n.arrow))return void C(n.parenR);X(n.comma)}return Qn(),C(n.parenR),C(n.arrow),void ss();case n.minus:return V(),void _n();case n.string:case n.num:case n._true:case n._false:case n._null:case n._this:case n._void:case n.star:return void V();default:if(p.type===n._typeof)return C(n._typeof),void Zn();if(p.type&n.IS_KEYWORD)return V(),void(p.tokens[p.tokens.length-1].type=n.name)}A()}function es(){X(n.question)?es():function(){for(Zn();!b()&&(J(n.bracketL)||J(n.questionDot));)X(n.questionDot),C(n.bracketL),X(n.bracketR)||(ss(),C(n.bracketR))}()}function ts(){es(),!p.noAnonFunctionType&&X(n.arrow)&&ss()}function ns(){for(X(n.bitwiseAND),ts();X(n.bitwiseAND);)ts()}function ss(){!function(){for(X(n.bitwiseOR),ns();X(n.bitwiseOR);)ns()}()}function os(){On()}function rs(){Rn(),J(n.colon)&&os()}function is(){(J(n.plus)||J(n.minus))&&(V(),p.tokens[p.tokens.length-1].isType=!0)}function as(){if(J(n._typeof)||g(t._type)){const s=Z();(((e=s).type===n.name||e.type&n.IS_KEYWORD)&&e.contextualKeyword!==t._from||s.type===n.braceL||s.type===n.star)&&V()}var e}function cs(e){l&&function(){if(J(n.name)&&p.contextualKeyword===t._interface){const e=W(0);return V(),Bn(),z(e),!0}return!1}()||(J(n.at)&&hs(),function(e){if(h&&function(){if(p.type===n._const){const e=Z();if(e.type===n.name&&e.contextualKeyword===t._enum)return C(n._const),x(t._enum),p.tokens[p.tokens.length-1].type=n._enum,Rt(),!0}return!1}())return;const s=p.type;switch(s){case n._break:case n._continue:return V(),void(v()||(Rn(),w()));case n._debugger:return V(),void w();case n._do:return V(),cs(!1),C(n._while),gn(),void X(n.semi);case n._for:return void function(){p.scopeDepth++;const e=p.tokens.length;!function(){V();let e=!1;g(t._await)&&(e=!0,V());if(C(n.parenL),J(n.semi))return e&&A(),void ms();if(J(n._var)||J(n._let)||J(n._const)){const s=p.type;return V(),_s(!0,s),J(n._in)||g(t._of)?void ks(e):void ms()}if(tn(!0),J(n._in)||g(t._of))return void ks(e);e&&A();ms()}();const s=p.tokens.length;p.scopes.push(new r(e,s,!1)),p.scopeDepth--}();case n._function:if(Y()===n.dot)break;return e||A(),void function(){const e=p.start;V(),ys(e,!0)}();case n._class:return e||A(),void xs(!0);case n._if:return V(),gn(),cs(!1),void(X(n._else)&&cs(!1));case n._return:return V(),void(v()||(tn(),w()));case n._switch:return void function(){V(),gn(),p.scopeDepth++;const e=p.tokens.length;C(n.braceL);for(;!J(n.braceR)&&!p.error;)if(J(n._case)||J(n._default)){const e=J(n._case);V(),e&&tn(),C(n.colon)}else cs(!0);V();const t=p.tokens.length;p.scopes.push(new r(e,t,!1)),p.scopeDepth--}();case n._throw:return V(),tn(),void w();case n._try:return void function(){if(V(),fs(),J(n._catch)){V();let e=null;if(J(n.parenL)&&(p.scopeDepth++,e=p.tokens.length,C(n.parenL),Ge(!0),h&&wt(),C(n.parenR)),fs(),null!=e){const t=p.tokens.length;p.scopes.push(new r(e,t,!1)),p.scopeDepth--}}X(n._finally)&&fs()}();case n._let:case n._const:e||A();case n._var:return void us(s);case n._while:return V(),gn(),void cs(!1);case n.braceL:return void fs();case n.semi:return void V();case n._export:case n._import:{const e=Y();if(e===n.parenL||e===n.dot)break;return V(),void(s===n._import?Ps():Ss())}case n.name:if(p.contextualKeyword===t._async){const e=p.start,t=p.snapshot();if(V(),J(n._function)&&!b())return C(n._function),void ys(e,!0);p.restoreFromSnapshot(t)}}const o=p.tokens.length;tn();let i=null;if(p.tokens.length===o+1){const e=p.tokens[p.tokens.length-1];e.type===n.name&&(i=e.contextualKeyword)}if(null==i)return void w();X(n.colon)?cs(!0):(a=i,h?function(e){Ft(e)||w()}(a):l?function(e){if(e===t._declare){if(J(n._class)||J(n.name)||J(n._function)||J(n._var)||J(n._export)){const e=W(1);Dn(),z(e)}}else if(J(n.name))if(e===t._interface){const e=W(1);Bn(),z(e)}else if(e===t._type){const e=W(1);Mn(),z(e)}else if(e===t._opaque){const e=W(1);Kn(!1),z(e)}w()}(a):w());var a}(e))}function hs(){for(;J(n.at);)ls()}function ls(){if(V(),X(n.parenL))tn(),C(n.parenR);else for(Rn();X(n.dot);)Rn();h?(J(n.lessThan)&&Kt(),ps()):ps()}function ps(){X(n.parenL)&&fn()}function us(e){V(),_s(!1,e),w()}function fs(e=!1,t=0){const s=p.tokens.length;p.scopeDepth++,C(n.braceL),t&&(p.tokens[p.tokens.length-1].contextId=t),ds(n.braceR),t&&(p.tokens[p.tokens.length-1].contextId=t);const o=p.tokens.length;p.scopes.push(new r(s,o,e)),p.scopeDepth--}function ds(e){for(;!X(e)&&!p.error;)cs(!0)}function ms(){C(n.semi),J(n.semi)||tn(),C(n.semi),J(n.parenR)||tn(),C(n.parenR),cs(!1)}function ks(e){e?T(t._of):V(),tn(),C(n.parenR),cs(!1)}function _s(e,t){for(;;){if(gs(t===n._const||t===n._let),X(n.eq)){const t=p.tokens.length-1;nn(e),p.tokens[t].rhsEndIndex=p.tokens.length}if(!X(n.comma))break}}function gs(e){Ge(e),h?function(){const e=W(0);X(n.bang),wt(),z(e)}():l&&J(n.colon)&&os()}function ys(e,t,s=!1){J(n.star)&&V(),!t||s||J(n.name)||J(n._yield)||A();let o=null;J(n.name)&&(t||(o=p.tokens.length,p.scopeDepth++),We(!1));const i=p.tokens.length;p.scopeDepth++,Ts(),En(e);const a=p.tokens.length;p.scopes.push(new r(i,a,!0)),p.scopeDepth--,null!==o&&(p.scopes.push(new r(o,a,!0)),p.scopeDepth--)}function Ts(e=!1,t=0){h?it():l&&function(){if(J(n.lessThan)){const e=W(0);Vn(),z(e)}}(),C(n.parenL),t&&(p.tokens[p.tokens.length-1].contextId=t),Je(n.parenR,!1,!1,e,t),t&&(p.tokens[p.tokens.length-1].contextId=t)}function xs(e,s=!1){const o=d();V(),p.tokens[p.tokens.length-1].contextId=o,p.tokens[p.tokens.length-1].isExpression=!e;let i=null;e||(i=p.tokens.length,p.scopeDepth++),function(e,s=!1){if(h&&(!e||s)&&g(t._implements))return;J(n.name)&&We(!0);h?it():l&&J(n.lessThan)&&Vn()}(e,s),function(){let e=!1;X(n._extends)?(an(),e=!0):e=!1;h?function(e){if(e&&J(n.lessThan)&&Kt(),T(t._implements)){p.tokens[p.tokens.length-1].type=n._implements;const e=W(1);St(),z(e)}}(e):l&&function(e){if(e&&J(n.lessThan)&&Hn(),g(t._implements)){const e=W(0);V(),p.tokens[p.tokens.length-1].type=n._implements;do{\$n(),J(n.lessThan)&&Hn()}while(X(n.comma));z(e)}}(e)}();const a=p.tokens.length;if(function(e){C(n.braceL);for(;!X(n.braceR)&&!p.error;){if(X(n.semi))continue;if(J(n.at)){ls();continue}vs(p.start,e)}}(o),!p.error&&(p.tokens[a].contextId=o,p.tokens[p.tokens.length-1].contextId=o,null!==i)){const e=p.tokens.length;p.scopes.push(new r(i,e,!1)),p.scopeDepth--}}function bs(){return J(n.eq)||J(n.semi)||J(n.braceR)||J(n.bang)||J(n.colon)}function Is(){return J(n.parenL)||J(n.lessThan)}function vs(e,s){h&&nt([t._declare,t._public,t._protected,t._private,t._override]);let o=!1;if(J(n.name)&&p.contextualKeyword===t._static){if(Rn(),Is())return void ws(e,!1);if(bs())return void Es();if(p.tokens[p.tokens.length-1].type=n._static,o=!0,J(n.braceL))return p.tokens[p.tokens.length-1].contextId=s,void fs()}!function(e,s,o){if(h&&function(e){const n=p.tokens.length;nt([t._abstract,t._readonly,t._declare,t._static,t._override]);const s=p.tokens.length;if(pt()){for(let t=e?n-1:n;t<s;t++)p.tokens[t].isType=!0;return!0}return!1}(s))return;if(X(n.star))return Cs(o),void ws(e,!1);Cs(o);let r=!1;const i=p.tokens[p.tokens.length-1];i.contextualKeyword===t._constructor&&(r=!0);if(As(),Is())ws(e,r);else if(bs())Es();else if(i.contextualKeyword!==t._async||v())i.contextualKeyword!==t._get&&i.contextualKeyword!==t._set||v()&&J(n.star)?v()?Es():A():(i.contextualKeyword===t._get?p.tokens[p.tokens.length-1].type=n._get:p.tokens[p.tokens.length-1].type=n._set,Cs(o),ws(e,!1));else{p.tokens[p.tokens.length-1].type=n._async;J(n.star)&&V(),Cs(o),As(),ws(e,!1)}}(e,o,s)}function ws(e,t){h?it():l&&J(n.lessThan)&&Vn(),Cn(e,t)}function Cs(e){wn(e)}function As(){if(h){const e=W(0);X(n.question),z(e)}}function Es(){if(h?(G(n.bang),wt()):l&&J(n.colon)&&os(),J(n.eq)){const e=p.tokens.length;V(),nn(),p.tokens[e].rhsEndIndex=p.tokens.length}w()}function Ss(){const e=p.tokens.length-1;h&&(X(n._import)?(g(t._type)&&Y()!==n.eq&&x(t._type),Dt(),1):X(n.eq)?(tn(),w(),1):T(t._as)?(x(t._namespace),Rn(),w(),1):(g(t._type)&&Y()===n.braceL&&V(),0))||((l?J(n.star)||g(t._type)&&Y()===n.star:J(n.star))?l?function(){if(T(t._type)){const e=W(2);Rs(),z(e)}else Rs()}():Rs():function(){if(h&&Vt())return!1;if(l&&J(n.name)&&(p.contextualKeyword===t._type||p.contextualKeyword===t._interface||p.contextualKeyword===t._opaque))return!1;if(J(n.name))return p.contextualKeyword!==t._async;if(!J(n._default))return!1;const e=ee(),o=Z(),r=o.type===n.name&&o.contextualKeyword===t._from;if(o.type===n.comma)return!0;if(r){const t=u.charCodeAt(te(e+4));return t===s.quotationMark||t===s.apostrophe}return!1}()?(Rn(),J(n.comma)&&Y()===n.star?(C(n.comma),C(n.star),x(t._as),Rn()):Ns(),Ls()):X(n._default)?function(){if(h&&function(){if(g(t._abstract)&&Y()===n._class)return p.type=n._abstract,V(),xs(!0,!0),!0;if(g(t._interface)){const e=W(2);return Bt(t._interface,!0),z(e),!0}return!1}())return;const e=p.start;X(n._function)?ys(e,!0,!0):g(t._async)&&Y()===n._function?(T(t._async),X(n._function),ys(e,!0,!0)):J(n._class)?xs(!0,!0):J(n.at)?(hs(),xs(!0,!0)):(nn(),w())}():h&&Vt()||l&&(g(t._type)||g(t._interface)||g(t._opaque))||p.type===n._var||p.type===n._const||p.type===n._let||p.type===n._function||p.type===n._class||g(t._async)||J(n.at)?h?function(){const e=T(t._declare);e&&(p.tokens[p.tokens.length-1].type=n._declare);let s=!1;if(J(n.name))if(e){const e=W(2);s=qt(),z(e)}else s=qt();if(!s)if(e){const e=W(2);cs(!0),z(e)}else cs(!0)}():l?function(){if(g(t._type)){const e=W(1);V(),J(n.braceL)?(Os(),Ls()):Mn(),z(e)}else if(g(t._opaque)){const e=W(1);V(),Kn(!1),z(e)}else if(g(t._interface)){const e=W(1);V(),Bn(),z(e)}else cs(!0)}():cs(!0):(Os(),Ls()),p.tokens[e].rhsEndIndex=p.tokens.length)}function Ns(){X(n.comma)&&Os()}function Ls(){T(t._from)&&mn(),w()}function Rs(){C(n.star),g(t._as)?(V(),p.tokens[p.tokens.length-1].type=n._as,Rn(),Ns(),Ls()):Ls()}function Os(){let e=!0;for(C(n.braceL);!X(n.braceR)&&!p.error;){if(e)e=!1;else if(C(n.comma),X(n.braceR))break;Rn(),p.tokens[p.tokens.length-1].identifierRole=j.ExportAccess,T(t._as)&&Rn()}}function Ps(){if(h&&J(n.name)&&Y()===n.eq)Dt();else{if(h&&g(t._type)){const e=Y();if(e===n.name){if(x(t._type),Y()===n.eq)return void Dt()}else e!==n.star&&e!==n.braceL||x(t._type)}J(n.string)||(function(){l&&as();let e=!0;if(J(n.name)&&(js(),!X(n.comma)))return;if(J(n.star))return V(),x(t._as),void js();C(n.braceL);for(;!X(n.braceR)&&!p.error;){if(e)e=!1;else if(X(n.colon)&&A("ES2015 named imports do not destructure. Use another statement for destructuring after the import."),C(n.comma),X(n.braceR))break;Ds()}}(),x(t._from)),mn(),w()}}function js(){ze()}function Ds(){l?function(){const e=p.contextualKeyword===t._type||p.type===n._typeof;e?V():Rn(),g(t._as)&&!y(t._as)?(Rn(),(!e||J(n.name)||p.type&n.IS_KEYWORD)&&Rn()):e&&(J(n.name)||p.type&n.IS_KEYWORD)&&(Rn(),T(t._as)&&Rn())}():(ze(),g(t._as)&&(p.tokens[p.tokens.length-1].identifierRole=j.ImportAccess,V(),ze()))}function qs(){return 0===p.pos&&u.charCodeAt(0)===s.numberSign&&u.charCodeAt(1)===s.exclamationMark&&re(2),se(),function(){if(ds(n.eof),p.scopes.push(new r(0,p.tokens.length,!0)),0!==p.scopeDepth)throw new Error("Invalid scope depth at end of file: "+p.scopeDepth);return new Fs(p.tokens,p.scopes)}()}class Fs{constructor(e,t){this.tokens=e,this.scopes=t}}class Bs{__init(){this.resultCode=""}__init2(){this.tokenIndex=0}constructor(e,t,n,s,o){this.code=e,this.tokens=t,this.isFlowEnabled=n,this.disableESTransforms=s,this.helperManager=o,Bs.prototype.__init.call(this),Bs.prototype.__init2.call(this)}snapshot(){return{resultCode:this.resultCode,tokenIndex:this.tokenIndex}}restoreToSnapshot(e){this.resultCode=e.resultCode,this.tokenIndex=e.tokenIndex}getResultCodeIndex(){return this.resultCode.length}reset(){this.resultCode="",this.tokenIndex=0}matchesContextualAtIndex(e,t){return this.matches1AtIndex(e,n.name)&&this.tokens[e].contextualKeyword===t}identifierNameAtIndex(e){return this.identifierNameForToken(this.tokens[e])}identifierName(){return this.identifierNameForToken(this.currentToken())}identifierNameForToken(e){return this.code.slice(e.start,e.end)}rawCodeForToken(e){return this.code.slice(e.start,e.end)}stringValueAtIndex(e){return this.stringValueForToken(this.tokens[e])}stringValue(){return this.stringValueForToken(this.currentToken())}stringValueForToken(e){return this.code.slice(e.start+1,e.end-1)}matches1AtIndex(e,t){return this.tokens[e].type===t}matches2AtIndex(e,t,n){return this.tokens[e].type===t&&this.tokens[e+1].type===n}matches3AtIndex(e,t,n,s){return this.tokens[e].type===t&&this.tokens[e+1].type===n&&this.tokens[e+2].type===s}matches1(e){return this.tokens[this.tokenIndex].type===e}matches2(e,t){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t}matches3(e,t,n){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t&&this.tokens[this.tokenIndex+2].type===n}matches4(e,t,n,s){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t&&this.tokens[this.tokenIndex+2].type===n&&this.tokens[this.tokenIndex+3].type===s}matches5(e,t,n,s,o){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t&&this.tokens[this.tokenIndex+2].type===n&&this.tokens[this.tokenIndex+3].type===s&&this.tokens[this.tokenIndex+4].type===o}matchesContextual(e){return this.matchesContextualAtIndex(this.tokenIndex,e)}matchesContextIdAndLabel(e,t){return this.matches1(e)&&this.currentToken().contextId===t}previousWhitespaceAndComments(){let e=this.code.slice(this.tokenIndex>0?this.tokens[this.tokenIndex-1].end:0,this.tokenIndex<this.tokens.length?this.tokens[this.tokenIndex].start:this.code.length);return this.isFlowEnabled&&(e=e.replace(/@flow/g,"")),e}replaceToken(e){this.resultCode+=this.previousWhitespaceAndComments(),this.appendTokenPrefix(),this.resultCode+=e,this.appendTokenSuffix(),this.tokenIndex++}replaceTokenTrimmingLeftWhitespace(e){this.resultCode+=this.previousWhitespaceAndComments().replace(/[^\\r\\n]/g,""),this.appendTokenPrefix(),this.resultCode+=e,this.appendTokenSuffix(),this.tokenIndex++}removeInitialToken(){this.replaceToken("")}removeToken(){this.replaceTokenTrimmingLeftWhitespace("")}copyExpectedToken(e){if(this.tokens[this.tokenIndex].type!==e)throw new Error("Expected token "+e);this.copyToken()}copyToken(){this.resultCode+=this.previousWhitespaceAndComments(),this.appendTokenPrefix(),this.resultCode+=this.code.slice(this.tokens[this.tokenIndex].start,this.tokens[this.tokenIndex].end),this.appendTokenSuffix(),this.tokenIndex++}copyTokenWithPrefix(e){this.resultCode+=this.previousWhitespaceAndComments(),this.appendTokenPrefix(),this.resultCode+=e,this.resultCode+=this.code.slice(this.tokens[this.tokenIndex].start,this.tokens[this.tokenIndex].end),this.appendTokenSuffix(),this.tokenIndex++}appendTokenPrefix(){const e=this.currentToken();if((e.numNullishCoalesceStarts||e.isOptionalChainStart)&&(e.isAsyncOperation=function(e){let n=e.currentIndex(),s=0;const o=e.currentToken();do{const r=e.tokens[n];if(r.isOptionalChainStart&&s++,r.isOptionalChainEnd&&s--,s+=r.numNullishCoalesceStarts,s-=r.numNullishCoalesceEnds,r.contextualKeyword===t._await&&null==r.identifierRole&&r.scopeDepth===o.scopeDepth)return!0;n+=1}while(s>0&&n<e.tokens.length);return!1}(this)),!this.disableESTransforms){if(e.numNullishCoalesceStarts)for(let t=0;t<e.numNullishCoalesceStarts;t++)e.isAsyncOperation?(this.resultCode+="await ",this.resultCode+=this.helperManager.getHelperName("asyncNullishCoalesce")):this.resultCode+=this.helperManager.getHelperName("nullishCoalesce"),this.resultCode+="(";e.isOptionalChainStart&&(e.isAsyncOperation&&(this.resultCode+="await "),this.tokenIndex>0&&this.tokenAtRelativeIndex(-1).type===n._delete?e.isAsyncOperation?this.resultCode+=this.helperManager.getHelperName("asyncOptionalChainDelete"):this.resultCode+=this.helperManager.getHelperName("optionalChainDelete"):e.isAsyncOperation?this.resultCode+=this.helperManager.getHelperName("asyncOptionalChain"):this.resultCode+=this.helperManager.getHelperName("optionalChain"),this.resultCode+="([")}}appendTokenSuffix(){const e=this.currentToken();if(e.isOptionalChainEnd&&!this.disableESTransforms&&(this.resultCode+="])"),e.numNullishCoalesceEnds&&!this.disableESTransforms)for(let t=0;t<e.numNullishCoalesceEnds;t++)this.resultCode+="))"}appendCode(e){this.resultCode+=e}currentToken(){return this.tokens[this.tokenIndex]}currentTokenCode(){const e=this.currentToken();return this.code.slice(e.start,e.end)}tokenAtRelativeIndex(e){return this.tokens[this.tokenIndex+e]}currentIndex(){return this.tokenIndex}nextToken(){if(this.tokenIndex===this.tokens.length)throw new Error("Unexpectedly reached end of input.");this.tokenIndex++}previousToken(){this.tokenIndex--}finish(){if(this.tokenIndex!==this.tokens.length)throw new Error("Tried to finish processing tokens before reaching the end.");return this.resultCode+=this.previousWhitespaceAndComments(),this.resultCode}isAtEnd(){return this.tokenIndex===this.tokens.length}}function \$s(e,s,o,r){const i=s.snapshot(),a=function(e){const t=e.currentToken(),s=t.contextId;if(null==s)throw new Error("Expected context ID on class token.");const o=t.isExpression;if(null==o)throw new Error("Expected isExpression on class token.");let r=null,i=!1;e.nextToken(),e.matches1(n.name)&&(r=e.identifierName());for(;!e.matchesContextIdAndLabel(n.braceL,s);)e.matches1(n._extends)&&!e.currentToken().isType&&(i=!0),e.nextToken();return{isExpression:o,className:r,hasSuperclass:i}}(s);let c=[];const h=[],l=[];let p=null;const u=[],f=[],d=s.currentToken().contextId;if(null==d)throw new Error("Expected non-null class context ID on class open-brace.");for(s.nextToken();!s.matchesContextIdAndLabel(n.braceR,d);)if(s.matchesContextual(t._constructor)&&!s.currentToken().isType)({constructorInitializerStatements:c,constructorInsertPos:p}=Ks(s));else if(s.matches1(n.semi))r||f.push({start:s.currentIndex(),end:s.currentIndex()+1}),s.nextToken();else if(s.currentToken().isType)s.nextToken();else{const i=s.currentIndex();let a=!1,m=!1,k=!1;for(;Vs(s.currentToken());)s.matches1(n._static)&&(a=!0),s.matches1(n.hash)&&(m=!0),s.matches1(n._declare)&&(k=!0),s.nextToken();if(a&&s.matches1(n.braceL)){Ms(s,d);continue}if(m){Ms(s,d);continue}if(s.matchesContextual(t._constructor)&&!s.currentToken().isType){({constructorInitializerStatements:c,constructorInsertPos:p}=Ks(s));continue}const _=s.currentIndex();if(Hs(s),s.matches1(n.lessThan)||s.matches1(n.parenL)){Ms(s,d);continue}for(;s.currentToken().isType;)s.nextToken();if(s.matches1(n.eq)){const t=s.currentIndex(),n=s.currentToken().rhsEndIndex;if(null==n)throw new Error("Expected rhsEndIndex on class field assignment.");for(s.nextToken();s.currentIndex()<n;)e.processToken();let r;a?(r=o.claimFreeName("__initStatic"),l.push(r)):(r=o.claimFreeName("__init"),h.push(r)),u.push({initializerName:r,equalsIndex:t,start:_,end:s.currentIndex()})}else r&&!k||f.push({start:i,end:s.currentIndex()})}return s.restoreToSnapshot(i),r?{headerInfo:a,constructorInitializerStatements:c,instanceInitializerNames:[],staticInitializerNames:[],constructorInsertPos:p,fields:[],rangesToRemove:f}:{headerInfo:a,constructorInitializerStatements:c,instanceInitializerNames:h,staticInitializerNames:l,constructorInsertPos:p,fields:u,rangesToRemove:f}}function Ms(e,t){for(e.nextToken();e.currentToken().contextId!==t;)e.nextToken();for(;Vs(e.tokenAtRelativeIndex(-1));)e.previousToken()}function Ks(e){const t=[];e.nextToken();const s=e.currentToken().contextId;if(null==s)throw new Error("Expected context ID on open-paren starting constructor params.");for(;!e.matchesContextIdAndLabel(n.parenR,s);)if(e.currentToken().contextId===s){if(e.nextToken(),Vs(e.currentToken())){for(e.nextToken();Vs(e.currentToken());)e.nextToken();const s=e.currentToken();if(s.type!==n.name)throw new Error("Expected identifier after access modifiers in constructor arg.");const o=e.identifierNameForToken(s);t.push(\`this.\${o} = \${o}\`)}}else e.nextToken();e.nextToken();let o=e.currentIndex(),r=!1;for(;!e.matchesContextIdAndLabel(n.braceR,s);){if(!r&&e.matches2(n._super,n.parenL)){e.nextToken();const t=e.currentToken().contextId;if(null==t)throw new Error("Expected a context ID on the super call");for(;!e.matchesContextIdAndLabel(n.parenR,t);)e.nextToken();o=e.currentIndex(),r=!0}e.nextToken()}return e.nextToken(),{constructorInitializerStatements:t,constructorInsertPos:o}}function Vs(e){return[n._async,n._get,n._set,n.plus,n.minus,n._readonly,n._static,n._public,n._private,n._protected,n._override,n._abstract,n.star,n._declare,n.hash].includes(e.type)}function Hs(e){if(e.matches1(n.bracketL)){const t=e.currentToken().contextId;if(null==t)throw new Error("Expected class context ID on computed name open bracket.");for(;!e.matchesContextIdAndLabel(n.bracketR,t);)e.nextToken();e.nextToken()}else e.nextToken()}function Us(e){if(e.removeInitialToken(),e.removeToken(),e.removeToken(),e.removeToken(),e.matches1(n.parenL))e.removeToken(),e.removeToken(),e.removeToken();else for(;e.matches1(n.dot);)e.removeToken(),e.removeToken()}const Ws={typeDeclarations:new Set,valueDeclarations:new Set};function zs(e){const t=new Set,s=new Set;for(let o=0;o<e.tokens.length;o++){const r=e.tokens[o];r.type===n.name&&F(r)&&(r.isType?t.add(e.identifierNameForToken(r)):s.add(e.identifierNameForToken(r)))}return{typeDeclarations:t,valueDeclarations:s}}function Xs(e,t,s){if(!e)return!1;const o=t.currentToken();if(null==o.rhsEndIndex)throw new Error("Expected non-null rhsEndIndex on export token.");const r=o.rhsEndIndex-t.currentIndex();if(3!==r&&(4!==r||!t.matches1AtIndex(o.rhsEndIndex-1,n.semi)))return!1;const i=t.tokenAtRelativeIndex(2);if(i.type!==n.name)return!1;const a=t.identifierNameForToken(i);return s.typeDeclarations.has(a)&&!s.valueDeclarations.has(a)}class Gs extends me{__init(){this.hadExport=!1}__init2(){this.hadNamedExport=!1}__init3(){this.hadDefaultExport=!1}constructor(e,t,n,s,o,r,i){super(),this.rootTransformer=e,this.tokens=t,this.importProcessor=n,this.nameManager=s,this.reactHotLoaderTransformer=o,this.enableLegacyBabel5ModuleInterop=r,this.isTypeScriptTransformEnabled=i,Gs.prototype.__init.call(this),Gs.prototype.__init2.call(this),Gs.prototype.__init3.call(this),this.declarationInfo=i?zs(t):Ws}getPrefixCode(){let e="";return this.hadExport&&(e+='Object.defineProperty(exports, "__esModule", {value: true});'),e}getSuffixCode(){return this.enableLegacyBabel5ModuleInterop&&this.hadDefaultExport&&!this.hadNamedExport?"\\nmodule.exports = exports.default;\\n":""}process(){return this.tokens.matches3(n._import,n.name,n.eq)?this.processImportEquals():this.tokens.matches1(n._import)?(this.processImport(),!0):this.tokens.matches2(n._export,n.eq)?(this.tokens.replaceToken("module.exports"),!0):this.tokens.matches1(n._export)&&!this.tokens.currentToken().isType?(this.hadExport=!0,this.processExport()):!(!this.tokens.matches2(n.name,n.postIncDec)||!this.processPostIncDec())||(this.tokens.matches1(n.name)||this.tokens.matches1(n.jsxName)?this.processIdentifier():this.tokens.matches1(n.eq)?this.processAssignment():this.tokens.matches1(n.assign)?this.processComplexAssignment():!!this.tokens.matches1(n.preIncDec)&&this.processPreIncDec())}processImportEquals(){const e=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);return this.importProcessor.isTypeName(e)?Us(this.tokens):this.tokens.replaceToken("const"),!0}processImport(){if(this.tokens.matches2(n._import,n.parenL)){this.tokens.replaceToken("Promise.resolve().then(() => require");const e=this.tokens.currentToken().contextId;if(null==e)throw new Error("Expected context ID on dynamic import invocation.");for(this.tokens.copyToken();!this.tokens.matchesContextIdAndLabel(n.parenR,e);)this.rootTransformer.processToken();return void this.tokens.replaceToken("))")}if(this.removeImportAndDetectIfType())this.tokens.removeToken();else{const e=this.tokens.stringValue();this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(e)),this.tokens.appendCode(this.importProcessor.claimImportCode(e))}this.tokens.matches1(n.semi)&&this.tokens.removeToken()}removeImportAndDetectIfType(){if(this.tokens.removeInitialToken(),this.tokens.matchesContextual(t._type)&&!this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,n.comma)&&!this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t._from))return this.removeRemainingImport(),!0;if(this.tokens.matches1(n.name)||this.tokens.matches1(n.star))return this.removeRemainingImport(),!1;if(this.tokens.matches1(n.string))return!1;let e=!1;for(;!this.tokens.matches1(n.string);)(!e&&this.tokens.matches1(n.braceL)||this.tokens.matches1(n.comma))&&(this.tokens.removeToken(),(this.tokens.matches2(n.name,n.comma)||this.tokens.matches2(n.name,n.braceR)||this.tokens.matches4(n.name,n.name,n.name,n.comma)||this.tokens.matches4(n.name,n.name,n.name,n.braceR))&&(e=!0)),this.tokens.removeToken();return!e}removeRemainingImport(){for(;!this.tokens.matches1(n.string);)this.tokens.removeToken()}processIdentifier(){const e=this.tokens.currentToken();if(e.shadowsGlobal)return!1;if(e.identifierRole===j.ObjectShorthand)return this.processObjectShorthand();if(e.identifierRole!==j.Access)return!1;const t=this.importProcessor.getIdentifierReplacement(this.tokens.identifierNameForToken(e));if(!t)return!1;let s=this.tokens.currentIndex()+1;for(;s<this.tokens.tokens.length&&this.tokens.tokens[s].type===n.parenR;)s++;return this.tokens.tokens[s].type===n.parenL?this.tokens.tokenAtRelativeIndex(1).type===n.parenL&&this.tokens.tokenAtRelativeIndex(-1).type!==n._new?(this.tokens.replaceToken(t+".call(void 0, "),this.tokens.removeToken(),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(n.parenR)):this.tokens.replaceToken(\`(0, \${t})\`):this.tokens.replaceToken(t),!0}processObjectShorthand(){const e=this.tokens.identifierName(),t=this.importProcessor.getIdentifierReplacement(e);return!!t&&(this.tokens.replaceToken(\`\${e}: \${t}\`),!0)}processExport(){if(this.tokens.matches2(n._export,n._enum)||this.tokens.matches3(n._export,n._const,n._enum))return!1;if(this.tokens.matches2(n._export,n._default))return this.processExportDefault(),this.hadDefaultExport=!0,!0;if(this.hadNamedExport=!0,this.tokens.matches2(n._export,n._var)||this.tokens.matches2(n._export,n._let)||this.tokens.matches2(n._export,n._const))return this.processExportVar(),!0;if(this.tokens.matches2(n._export,n._function)||this.tokens.matches3(n._export,n.name,n._function))return this.processExportFunction(),!0;if(this.tokens.matches2(n._export,n._class)||this.tokens.matches3(n._export,n._abstract,n._class))return this.processExportClass(),!0;if(this.tokens.matches2(n._export,n.braceL))return this.processExportBindings(),!0;if(this.tokens.matches2(n._export,n.star))return this.processExportStar(),!0;if(this.tokens.matches3(n._export,n.name,n.braceL)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t._type)){for(this.tokens.removeInitialToken();!this.tokens.matches1(n.braceR);)this.tokens.removeToken();return this.tokens.removeToken(),this.tokens.matchesContextual(t._from)&&this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,n.string)&&(this.tokens.removeToken(),this.tokens.removeToken()),!0}throw new Error("Unrecognized export syntax.")}processAssignment(){const e=this.tokens.currentIndex(),t=this.tokens.tokens[e-1];if(t.isType||t.type!==n.name)return!1;if(t.shadowsGlobal)return!1;if(e>=2&&this.tokens.matches1AtIndex(e-2,n.dot))return!1;if(e>=2&&[n._var,n._let,n._const].includes(this.tokens.tokens[e-2].type))return!1;const s=this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(t));return!!s&&(this.tokens.copyToken(),this.tokens.appendCode(\` \${s} =\`),!0)}processComplexAssignment(){const e=this.tokens.currentIndex(),t=this.tokens.tokens[e-1];if(t.type!==n.name)return!1;if(t.shadowsGlobal)return!1;if(e>=2&&this.tokens.matches1AtIndex(e-2,n.dot))return!1;const s=this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(t));return!!s&&(this.tokens.appendCode(" = "+s),this.tokens.copyToken(),!0)}processPreIncDec(){const e=this.tokens.currentIndex(),t=this.tokens.tokens[e+1];if(t.type!==n.name)return!1;if(t.shadowsGlobal)return!1;if(e+2<this.tokens.tokens.length&&(this.tokens.matches1AtIndex(e+2,n.dot)||this.tokens.matches1AtIndex(e+2,n.bracketL)||this.tokens.matches1AtIndex(e+2,n.parenL)))return!1;const s=this.tokens.identifierNameForToken(t),o=this.importProcessor.resolveExportBinding(s);return!!o&&(this.tokens.appendCode(o+" = "),this.tokens.copyToken(),!0)}processPostIncDec(){const e=this.tokens.currentIndex(),t=this.tokens.tokens[e],s=this.tokens.tokens[e+1];if(t.type!==n.name)return!1;if(t.shadowsGlobal)return!1;if(e>=1&&this.tokens.matches1AtIndex(e-1,n.dot))return!1;const o=this.tokens.identifierNameForToken(t),r=this.importProcessor.resolveExportBinding(o);if(!r)return!1;const i=this.tokens.rawCodeForToken(s),a=this.importProcessor.getIdentifierReplacement(o)||o;if("++"===i)this.tokens.replaceToken(\`(\${a} = \${r} = \${a} + 1, \${a} - 1)\`);else{if("--"!==i)throw new Error("Unexpected operator: "+i);this.tokens.replaceToken(\`(\${a} = \${r} = \${a} - 1, \${a} + 1)\`)}return this.tokens.removeToken(),!0}processExportDefault(){if(this.tokens.matches4(n._export,n._default,n._function,n.name)||this.tokens.matches5(n._export,n._default,n.name,n._function,n.name)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+2,t._async)){this.tokens.removeInitialToken(),this.tokens.removeToken();const e=this.processNamedFunction();this.tokens.appendCode(\` exports.default = \${e};\`)}else if(this.tokens.matches4(n._export,n._default,n._class,n.name)||this.tokens.matches5(n._export,n._default,n._abstract,n._class,n.name)){this.tokens.removeInitialToken(),this.tokens.removeToken(),this.tokens.matches1(n._abstract)&&this.tokens.removeToken();const e=this.rootTransformer.processNamedClass();this.tokens.appendCode(\` exports.default = \${e};\`)}else{if(this.tokens.matches3(n._export,n._default,n.at))throw new Error("Export default statements with decorators are not yet supported.");if(Xs(this.isTypeScriptTransformEnabled,this.tokens,this.declarationInfo))this.tokens.removeInitialToken(),this.tokens.removeToken(),this.tokens.removeToken();else if(this.reactHotLoaderTransformer){const e=this.nameManager.claimFreeName("_default");this.tokens.replaceToken(\`let \${e}; exports.\`),this.tokens.copyToken(),this.tokens.appendCode(\` = \${e} =\`),this.reactHotLoaderTransformer.setExtractedDefaultExportName(e)}else this.tokens.replaceToken("exports."),this.tokens.copyToken(),this.tokens.appendCode(" =")}}processExportVar(){this.isSimpleExportVar()?this.processSimpleExportVar():this.processComplexExportVar()}isSimpleExportVar(){let e=this.tokens.currentIndex();if(e++,e++,!this.tokens.matches1AtIndex(e,n.name))return!1;for(e++;e<this.tokens.tokens.length&&this.tokens.tokens[e].isType;)e++;return!!this.tokens.matches1AtIndex(e,n.eq)}processSimpleExportVar(){this.tokens.removeInitialToken(),this.tokens.copyToken();const e=this.tokens.identifierName();for(;!this.tokens.matches1(n.eq);)this.rootTransformer.processToken();const t=this.tokens.currentToken().rhsEndIndex;if(null==t)throw new Error("Expected = token with an end index.");for(;this.tokens.currentIndex()<t;)this.rootTransformer.processToken();this.tokens.appendCode(\`; exports.\${e} = \${e}\`)}processComplexExportVar(){this.tokens.removeInitialToken(),this.tokens.removeToken();const e=this.tokens.matches1(n.braceL);e&&this.tokens.appendCode("(");let t=0;for(;;)if(this.tokens.matches1(n.braceL)||this.tokens.matches1(n.dollarBraceL)||this.tokens.matches1(n.bracketL))t++,this.tokens.copyToken();else if(this.tokens.matches1(n.braceR)||this.tokens.matches1(n.bracketR))t--,this.tokens.copyToken();else{if(0===t&&!this.tokens.matches1(n.name)&&!this.tokens.currentToken().isType)break;if(this.tokens.matches1(n.eq)){const e=this.tokens.currentToken().rhsEndIndex;if(null==e)throw new Error("Expected = token with an end index.");for(;this.tokens.currentIndex()<e;)this.rootTransformer.processToken()}else{const e=this.tokens.currentToken();if(D(e)){const t=this.tokens.identifierName();let n=this.importProcessor.getIdentifierReplacement(t);if(null===n)throw new Error(\`Expected a replacement for \${t} in \\\`export var\\\` syntax.\`);M(e)&&(n=\`\${t}: \${n}\`),this.tokens.replaceToken(n)}else this.rootTransformer.processToken()}}if(e){const e=this.tokens.currentToken().rhsEndIndex;if(null==e)throw new Error("Expected = token with an end index.");for(;this.tokens.currentIndex()<e;)this.rootTransformer.processToken();this.tokens.appendCode(")")}}processExportFunction(){this.tokens.replaceToken("");const e=this.processNamedFunction();this.tokens.appendCode(\` exports.\${e} = \${e};\`)}processNamedFunction(){if(this.tokens.matches1(n._function))this.tokens.copyToken();else if(this.tokens.matches2(n.name,n._function)){if(!this.tokens.matchesContextual(t._async))throw new Error("Expected async keyword in function export.");this.tokens.copyToken(),this.tokens.copyToken()}if(this.tokens.matches1(n.star)&&this.tokens.copyToken(),!this.tokens.matches1(n.name))throw new Error("Expected identifier for exported function name.");const e=this.tokens.identifierName();if(this.tokens.copyToken(),this.tokens.currentToken().isType)for(this.tokens.removeInitialToken();this.tokens.currentToken().isType;)this.tokens.removeToken();return this.tokens.copyExpectedToken(n.parenL),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(n.parenR),this.rootTransformer.processPossibleTypeRange(),this.tokens.copyExpectedToken(n.braceL),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(n.braceR),e}processExportClass(){this.tokens.removeInitialToken(),this.tokens.matches1(n._abstract)&&this.tokens.removeToken();const e=this.rootTransformer.processNamedClass();this.tokens.appendCode(\` exports.\${e} = \${e};\`)}processExportBindings(){this.tokens.removeInitialToken(),this.tokens.removeToken();const e=[];for(;;){if(this.tokens.matches1(n.braceR)){this.tokens.removeToken();break}const s=this.tokens.identifierName();let o;if(this.tokens.removeToken(),this.tokens.matchesContextual(t._as)?(this.tokens.removeToken(),o=this.tokens.identifierName(),this.tokens.removeToken()):o=s,!this.shouldElideExportedIdentifier(s)){const t=this.importProcessor.getIdentifierReplacement(s);e.push(\`exports.\${o} = \${t||s};\`)}if(this.tokens.matches1(n.braceR)){this.tokens.removeToken();break}if(this.tokens.matches2(n.comma,n.braceR)){this.tokens.removeToken(),this.tokens.removeToken();break}if(!this.tokens.matches1(n.comma))throw new Error("Unexpected token: "+JSON.stringify(this.tokens.currentToken()));this.tokens.removeToken()}if(this.tokens.matchesContextual(t._from)){this.tokens.removeToken();const e=this.tokens.stringValue();this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(e))}else this.tokens.appendCode(e.join(" "));this.tokens.matches1(n.semi)&&this.tokens.removeToken()}processExportStar(){for(this.tokens.removeInitialToken();!this.tokens.matches1(n.string);)this.tokens.removeToken();const e=this.tokens.stringValue();this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(e)),this.tokens.matches1(n.semi)&&this.tokens.removeToken()}shouldElideExportedIdentifier(e){return this.isTypeScriptTransformEnabled&&!this.declarationInfo.valueDeclarations.has(e)}}class Js extends me{constructor(e,t,n,s,o){super(),this.tokens=e,this.nameManager=t,this.reactHotLoaderTransformer=n,this.isTypeScriptTransformEnabled=s,this.nonTypeIdentifiers=s?be(e,o):new Set,this.declarationInfo=s?zs(e):Ws}process(){if(this.tokens.matches3(n._import,n.name,n.eq))return this.processImportEquals();if(this.tokens.matches4(n._import,n.name,n.name,n.eq)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t._type)){this.tokens.removeInitialToken();for(let e=0;e<7;e++)this.tokens.removeToken();return!0}if(this.tokens.matches2(n._export,n.eq))return this.tokens.replaceToken("module.exports"),!0;if(this.tokens.matches5(n._export,n._import,n.name,n.name,n.eq)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+2,t._type)){this.tokens.removeInitialToken();for(let e=0;e<8;e++)this.tokens.removeToken();return!0}if(this.tokens.matches1(n._import))return this.processImport();if(this.tokens.matches2(n._export,n._default))return this.processExportDefault();if(this.tokens.matches2(n._export,n.braceL))return this.processNamedExports();if(this.tokens.matches3(n._export,n.name,n.braceL)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t._type)){for(this.tokens.removeInitialToken();!this.tokens.matches1(n.braceR);)this.tokens.removeToken();return this.tokens.removeToken(),this.tokens.matchesContextual(t._from)&&this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,n.string)&&(this.tokens.removeToken(),this.tokens.removeToken()),!0}return!1}processImportEquals(){const e=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);return this.isTypeName(e)?Us(this.tokens):this.tokens.replaceToken("const"),!0}processImport(){if(this.tokens.matches2(n._import,n.parenL))return!1;const e=this.tokens.snapshot();if(this.removeImportTypeBindings()){for(this.tokens.restoreToSnapshot(e);!this.tokens.matches1(n.string);)this.tokens.removeToken();this.tokens.removeToken(),this.tokens.matches1(n.semi)&&this.tokens.removeToken()}return!0}removeImportTypeBindings(){if(this.tokens.copyExpectedToken(n._import),this.tokens.matchesContextual(t._type)&&!this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,n.comma)&&!this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t._from))return!0;if(this.tokens.matches1(n.string))return this.tokens.copyToken(),!1;let e=!1;if(this.tokens.matches1(n.name)&&(this.isTypeName(this.tokens.identifierName())?(this.tokens.removeToken(),this.tokens.matches1(n.comma)&&this.tokens.removeToken()):(e=!0,this.tokens.copyToken(),this.tokens.matches1(n.comma)&&this.tokens.copyToken())),this.tokens.matches1(n.star))this.isTypeName(this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+2))?(this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken()):(e=!0,this.tokens.copyExpectedToken(n.star),this.tokens.copyExpectedToken(n.name),this.tokens.copyExpectedToken(n.name));else if(this.tokens.matches1(n.braceL)){for(this.tokens.copyToken();!this.tokens.matches1(n.braceR);)if(this.tokens.matches3(n.name,n.name,n.comma)||this.tokens.matches3(n.name,n.name,n.braceR))this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.matches1(n.comma)&&this.tokens.removeToken();else if(this.tokens.matches5(n.name,n.name,n.name,n.name,n.comma)||this.tokens.matches5(n.name,n.name,n.name,n.name,n.braceR))this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.matches1(n.comma)&&this.tokens.removeToken();else if(this.tokens.matches2(n.name,n.comma)||this.tokens.matches2(n.name,n.braceR))this.isTypeName(this.tokens.identifierName())?(this.tokens.removeToken(),this.tokens.matches1(n.comma)&&this.tokens.removeToken()):(e=!0,this.tokens.copyToken(),this.tokens.matches1(n.comma)&&this.tokens.copyToken());else{if(!this.tokens.matches4(n.name,n.name,n.name,n.comma)&&!this.tokens.matches4(n.name,n.name,n.name,n.braceR))throw new Error("Unexpected import form.");this.isTypeName(this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+2))?(this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.matches1(n.comma)&&this.tokens.removeToken()):(e=!0,this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.matches1(n.comma)&&this.tokens.copyToken())}this.tokens.copyExpectedToken(n.braceR)}return!e}isTypeName(e){return this.isTypeScriptTransformEnabled&&!this.nonTypeIdentifiers.has(e)}processExportDefault(){if(Xs(this.isTypeScriptTransformEnabled,this.tokens,this.declarationInfo))return this.tokens.removeInitialToken(),this.tokens.removeToken(),this.tokens.removeToken(),!0;if(!(this.tokens.matches4(n._export,n._default,n._function,n.name)||this.tokens.matches5(n._export,n._default,n.name,n._function,n.name)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+2,t._async)||this.tokens.matches4(n._export,n._default,n._class,n.name)||this.tokens.matches5(n._export,n._default,n._abstract,n._class,n.name))&&this.reactHotLoaderTransformer){const e=this.nameManager.claimFreeName("_default");return this.tokens.replaceToken(\`let \${e}; export\`),this.tokens.copyToken(),this.tokens.appendCode(\` \${e} =\`),this.reactHotLoaderTransformer.setExtractedDefaultExportName(e),!0}return!1}processNamedExports(){if(!this.isTypeScriptTransformEnabled)return!1;for(this.tokens.copyExpectedToken(n._export),this.tokens.copyExpectedToken(n.braceL);!this.tokens.matches1(n.braceR);){if(!this.tokens.matches1(n.name))throw new Error("Expected identifier at the start of named export.");if(this.shouldElideExportedName(this.tokens.identifierName())){for(;!this.tokens.matches1(n.comma)&&!this.tokens.matches1(n.braceR)&&!this.tokens.isAtEnd();)this.tokens.removeToken();this.tokens.matches1(n.comma)&&this.tokens.removeToken()}else{for(;!this.tokens.matches1(n.comma)&&!this.tokens.matches1(n.braceR)&&!this.tokens.isAtEnd();)this.tokens.copyToken();this.tokens.matches1(n.comma)&&this.tokens.copyToken()}}return this.tokens.copyExpectedToken(n.braceR),!0}shouldElideExportedName(e){return this.isTypeScriptTransformEnabled&&this.declarationInfo.typeDeclarations.has(e)&&!this.declarationInfo.valueDeclarations.has(e)}}class Ys extends me{constructor(e,t){super(),this.rootTransformer=e,this.tokens=t}process(){return this.rootTransformer.processPossibleArrowParamEnd()||this.rootTransformer.processPossibleAsyncArrowWithTypeParams()||this.rootTransformer.processPossibleTypeRange()}}const Qs=["mock","unmock","enableAutomock","disableAutomock"];class Zs extends me{__init(){this.hoistedFunctionNames=[]}constructor(e,t,n,s){super(),this.rootTransformer=e,this.tokens=t,this.nameManager=n,this.importProcessor=s,Zs.prototype.__init.call(this)}process(){return!(0!==this.tokens.currentToken().scopeDepth||!this.tokens.matches4(n.name,n.dot,n.name,n.parenL)||"jest"!==this.tokens.identifierName())&&(!function(e){let t=void 0,n=e[0],s=1;for(;s<e.length;){const o=e[s],r=e[s+1];if(s+=2,("optionalAccess"===o||"optionalCall"===o)&&null==n)return;"access"===o||"optionalAccess"===o?(t=n,n=r(n)):"call"!==o&&"optionalCall"!==o||(n=r((...e)=>n.call(t,...e)),t=void 0)}return n}([this,"access",e=>e.importProcessor,"optionalAccess",e=>e.getGlobalNames,"call",e=>e(),"optionalAccess",e=>e.has,"call",e=>e("jest")])&&this.extractHoistedCalls())}getHoistedCode(){return this.hoistedFunctionNames.length>0?this.hoistedFunctionNames.map(e=>e+"();").join(""):""}extractHoistedCalls(){this.tokens.removeToken();let e=!1;for(;this.tokens.matches3(n.dot,n.name,n.parenL);){const t=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);if(Qs.includes(t)){const t=this.nameManager.claimFreeName("__jestHoist");this.hoistedFunctionNames.push(t),this.tokens.replaceToken(\`function \${t}(){jest.\`),this.tokens.copyToken(),this.tokens.copyToken(),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(n.parenR),this.tokens.appendCode(";}"),e=!1}else e?this.tokens.copyToken():this.tokens.replaceToken("jest."),this.tokens.copyToken(),this.tokens.copyToken(),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(n.parenR),e=!0}return!0}}class eo extends me{constructor(e){super(),this.tokens=e}process(){if(this.tokens.matches1(n.num)){const e=this.tokens.currentTokenCode();if(e.includes("_"))return this.tokens.replaceToken(e.replace(/_/g,"")),!0}return!1}}class to extends me{constructor(e,t){super(),this.tokens=e,this.nameManager=t}process(){return!!this.tokens.matches2(n._catch,n.braceL)&&(this.tokens.copyToken(),this.tokens.appendCode(\` (\${this.nameManager.claimFreeName("e")})\`),!0)}}class no extends me{constructor(e,t){super(),this.tokens=e,this.nameManager=t}process(){if(this.tokens.matches1(n.nullishCoalescing)){const e=this.tokens.currentToken();return this.tokens.tokens[e.nullishStartIndex].isAsyncOperation?this.tokens.replaceTokenTrimmingLeftWhitespace(", async () => ("):this.tokens.replaceTokenTrimmingLeftWhitespace(", () => ("),!0}if(this.tokens.matches1(n._delete)){if(this.tokens.tokenAtRelativeIndex(1).isOptionalChainStart)return this.tokens.removeInitialToken(),!0}const e=this.tokens.currentToken().subscriptStartIndex;if(null!=e&&this.tokens.tokens[e].isOptionalChainStart&&this.tokens.tokenAtRelativeIndex(-1).type!==n._super){const t=this.nameManager.claimFreeName("_");let s;if(s=e>0&&this.tokens.matches1AtIndex(e-1,n._delete)&&this.isLastSubscriptInChain()?\`\${t} => delete \${t}\`:\`\${t} => \${t}\`,this.tokens.tokens[e].isAsyncOperation&&(s="async "+s),this.tokens.matches2(n.questionDot,n.parenL)||this.tokens.matches2(n.questionDot,n.lessThan))this.justSkippedSuper()&&this.tokens.appendCode(".bind(this)"),this.tokens.replaceTokenTrimmingLeftWhitespace(", 'optionalCall', "+s);else if(this.tokens.matches2(n.questionDot,n.bracketL))this.tokens.replaceTokenTrimmingLeftWhitespace(", 'optionalAccess', "+s);else if(this.tokens.matches1(n.questionDot))this.tokens.replaceTokenTrimmingLeftWhitespace(\`, 'optionalAccess', \${s}.\`);else if(this.tokens.matches1(n.dot))this.tokens.replaceTokenTrimmingLeftWhitespace(\`, 'access', \${s}.\`);else if(this.tokens.matches1(n.bracketL))this.tokens.replaceTokenTrimmingLeftWhitespace(\`, 'access', \${s}[\`);else{if(!this.tokens.matches1(n.parenL))throw new Error("Unexpected subscript operator in optional chain.");this.justSkippedSuper()&&this.tokens.appendCode(".bind(this)"),this.tokens.replaceTokenTrimmingLeftWhitespace(\`, 'call', \${s}(\`)}return!0}return!1}isLastSubscriptInChain(){let e=0;for(let t=this.tokens.currentIndex()+1;;t++){if(t>=this.tokens.tokens.length)throw new Error("Reached the end of the code while finding the end of the access chain.");if(this.tokens.tokens[t].isOptionalChainStart?e++:this.tokens.tokens[t].isOptionalChainEnd&&e--,e<0)return!0;if(0===e&&null!=this.tokens.tokens[t].subscriptStartIndex)return!1}}justSkippedSuper(){let e=0,t=this.tokens.currentIndex()-1;for(;;){if(t<0)throw new Error("Reached the start of the code while finding the start of the access chain.");if(this.tokens.tokens[t].isOptionalChainStart?e--:this.tokens.tokens[t].isOptionalChainEnd&&e++,e<0)return!1;if(0===e&&null!=this.tokens.tokens[t].subscriptStartIndex)return this.tokens.tokens[t-1].type===n._super;t--}}}class so extends me{constructor(e,t,n,s){super(),this.rootTransformer=e,this.tokens=t,this.importProcessor=n,this.options=s}process(){const e=this.tokens.currentIndex();if("createReactClass"===this.tokens.identifierName()){const t=this.importProcessor&&this.importProcessor.getIdentifierReplacement("createReactClass");return t?this.tokens.replaceToken(\`(0, \${t})\`):this.tokens.copyToken(),this.tryProcessCreateClassCall(e),!0}if(this.tokens.matches3(n.name,n.dot,n.name)&&"React"===this.tokens.identifierName()&&"createClass"===this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+2)){const t=this.importProcessor&&this.importProcessor.getIdentifierReplacement("React")||"React";return t?(this.tokens.replaceToken(t),this.tokens.copyToken(),this.tokens.copyToken()):(this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.copyToken()),this.tryProcessCreateClassCall(e),!0}return!1}tryProcessCreateClassCall(e){const t=this.findDisplayName(e);t&&this.classNeedsDisplayName()&&(this.tokens.copyExpectedToken(n.parenL),this.tokens.copyExpectedToken(n.braceL),this.tokens.appendCode(\`displayName: '\${t}',\`),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(n.braceR),this.tokens.copyExpectedToken(n.parenR))}findDisplayName(e){return e<2?null:this.tokens.matches2AtIndex(e-2,n.name,n.eq)||e>=2&&this.tokens.tokens[e-2].identifierRole===j.ObjectKey?this.tokens.identifierNameAtIndex(e-2):this.tokens.matches2AtIndex(e-2,n._export,n._default)?this.getDisplayNameFromFilename():null}getDisplayNameFromFilename(){const e=(this.options.filePath||"unknown").split("/"),t=e[e.length-1],n=t.lastIndexOf("."),s=-1===n?t:t.slice(0,n);return"index"===s&&e[e.length-2]?e[e.length-2]:s}classNeedsDisplayName(){let e=this.tokens.currentIndex();if(!this.tokens.matches2(n.parenL,n.braceL))return!1;const t=e+1,s=this.tokens.tokens[t].contextId;if(null==s)throw new Error("Expected non-null context ID on object open-brace.");for(;e<this.tokens.tokens.length;e++){const t=this.tokens.tokens[e];if(t.type===n.braceR&&t.contextId===s){e++;break}if("displayName"===this.tokens.identifierNameAtIndex(e)&&this.tokens.tokens[e].identifierRole===j.ObjectKey&&t.contextId===s)return!1}if(e===this.tokens.tokens.length)throw new Error("Unexpected end of input when processing React class.");return this.tokens.matches1AtIndex(e,n.parenR)||this.tokens.matches2AtIndex(e,n.comma,n.parenR)}}class oo extends me{__init(){this.extractedDefaultExportName=null}constructor(e,t){super(),this.tokens=e,this.filePath=t,oo.prototype.__init.call(this)}setExtractedDefaultExportName(e){this.extractedDefaultExportName=e}getPrefixCode(){return"\\n      (function () {\\n        var enterModule = require('react-hot-loader').enterModule;\\n        enterModule && enterModule(module);\\n      })();".replace(/\\s+/g," ").trim()}getSuffixCode(){const e=new Set;for(const t of this.tokens.tokens)!t.isType&&F(t)&&t.identifierRole!==j.ImportDeclaration&&e.add(this.tokens.identifierNameForToken(t));const t=Array.from(e).map(e=>({variableName:e,uniqueLocalName:e}));return this.extractedDefaultExportName&&t.push({variableName:this.extractedDefaultExportName,uniqueLocalName:"default"}),\`\\n;(function () {\\n  var reactHotLoader = require('react-hot-loader').default;\\n  var leaveModule = require('react-hot-loader').leaveModule;\\n  if (!reactHotLoader) {\\n    return;\\n  }\\n\${t.map(({variableName:e,uniqueLocalName:t})=>\`  reactHotLoader.register(\${e}, "\${t}", \${JSON.stringify(this.filePath||"")});\`).join("\\n")}\\n  leaveModule(module);\\n})();\`}process(){return!1}}const ro=new Set(["break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","new","return","super","switch","this","throw","try","typeof","var","void","while","with","yield","enum","implements","interface","let","package","private","protected","public","static","await","false","null","true"]);function io(e){if(0===e.length)return!1;if(!O[e.charCodeAt(0)])return!1;for(let t=1;t<e.length;t++)if(!R[e.charCodeAt(t)])return!1;return!ro.has(e)}class ao extends me{constructor(e,t,n){super(),this.rootTransformer=e,this.tokens=t,this.isImportsTransformEnabled=n}process(){return!!(this.rootTransformer.processPossibleArrowParamEnd()||this.rootTransformer.processPossibleAsyncArrowWithTypeParams()||this.rootTransformer.processPossibleTypeRange())||(this.tokens.matches1(n._public)||this.tokens.matches1(n._protected)||this.tokens.matches1(n._private)||this.tokens.matches1(n._abstract)||this.tokens.matches1(n._readonly)||this.tokens.matches1(n._override)||this.tokens.matches1(n.nonNullAssertion)?(this.tokens.removeInitialToken(),!0):this.tokens.matches1(n._enum)||this.tokens.matches2(n._const,n._enum)?(this.processEnum(),!0):!(!this.tokens.matches2(n._export,n._enum)&&!this.tokens.matches3(n._export,n._const,n._enum))&&(this.processEnum(!0),!0))}processEnum(e=!1){for(this.tokens.removeInitialToken();this.tokens.matches1(n._const)||this.tokens.matches1(n._enum);)this.tokens.removeToken();const t=this.tokens.identifierName();this.tokens.removeToken(),e&&!this.isImportsTransformEnabled&&this.tokens.appendCode("export "),this.tokens.appendCode(\`var \${t}; (function (\${t})\`),this.tokens.copyExpectedToken(n.braceL),this.processEnumBody(t),this.tokens.copyExpectedToken(n.braceR),e&&this.isImportsTransformEnabled?this.tokens.appendCode(\`)(\${t} || (exports.\${t} = \${t} = {}));\`):this.tokens.appendCode(\`)(\${t} || (\${t} = {}));\`)}processEnumBody(e){let t=null;for(;!this.tokens.matches1(n.braceR);){const{nameStringCode:s,variableName:o}=this.extractEnumKeyInfo(this.tokens.currentToken());this.tokens.removeInitialToken(),this.tokens.matches3(n.eq,n.string,n.comma)||this.tokens.matches3(n.eq,n.string,n.braceR)?this.processStringLiteralEnumMember(e,s,o):this.tokens.matches1(n.eq)?this.processExplicitValueEnumMember(e,s,o):this.processImplicitValueEnumMember(e,s,o,t),this.tokens.matches1(n.comma)&&this.tokens.removeToken(),t=null!=o?o:\`\${e}[\${s}]\`}}extractEnumKeyInfo(e){if(e.type===n.name){const t=this.tokens.identifierNameForToken(e);return{nameStringCode:\`"\${t}"\`,variableName:io(t)?t:null}}if(e.type===n.string){const t=this.tokens.stringValueForToken(e);return{nameStringCode:this.tokens.code.slice(e.start,e.end),variableName:io(t)?t:null}}throw new Error("Expected name or string at beginning of enum element.")}processStringLiteralEnumMember(e,t,n){null!=n?(this.tokens.appendCode("const "+n),this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.appendCode(\`; \${e}[\${t}] = \${n};\`)):(this.tokens.appendCode(\`\${e}[\${t}]\`),this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.appendCode(";"))}processExplicitValueEnumMember(e,t,n){const s=this.tokens.currentToken().rhsEndIndex;if(null==s)throw new Error("Expected rhsEndIndex on enum assign.");if(null!=n){for(this.tokens.appendCode("const "+n),this.tokens.copyToken();this.tokens.currentIndex()<s;)this.rootTransformer.processToken();this.tokens.appendCode(\`; \${e}[\${e}[\${t}] = \${n}] = \${t};\`)}else{for(this.tokens.appendCode(\`\${e}[\${e}[\${t}]\`),this.tokens.copyToken();this.tokens.currentIndex()<s;)this.rootTransformer.processToken();this.tokens.appendCode(\`] = \${t};\`)}}processImplicitValueEnumMember(e,t,n,s){let o=null!=s?s+" + 1":"0";null!=n&&(this.tokens.appendCode(\`const \${n} = \${o}; \`),o=n),this.tokens.appendCode(\`\${e}[\${e}[\${t}] = \${o}] = \${t};\`)}}class co{__init(){this.transformers=[]}__init2(){this.generatedVariables=[]}constructor(e,t,n,s){co.prototype.__init.call(this),co.prototype.__init2.call(this),this.nameManager=e.nameManager,this.helperManager=e.helperManager;const{tokenProcessor:o,importProcessor:r}=e;this.tokens=o,this.isImportsTransformEnabled=t.includes("imports"),this.isReactHotLoaderTransformEnabled=t.includes("react-hot-loader"),this.disableESTransforms=Boolean(s.disableESTransforms),s.disableESTransforms||(this.transformers.push(new no(o,this.nameManager)),this.transformers.push(new eo(o)),this.transformers.push(new to(o,this.nameManager))),t.includes("jsx")&&(this.transformers.push(new ge(this,o,r,this.nameManager,s)),this.transformers.push(new so(this,o,r,s)));let i=null;if(t.includes("react-hot-loader")){if(!s.filePath)throw new Error("filePath is required when using the react-hot-loader transform.");i=new oo(o,s.filePath),this.transformers.push(i)}if(t.includes("imports")){if(null===r)throw new Error("Expected non-null importProcessor with imports transform enabled.");this.transformers.push(new Gs(this,o,r,this.nameManager,i,n,t.includes("typescript")))}else this.transformers.push(new Js(o,this.nameManager,i,t.includes("typescript"),s));t.includes("flow")&&this.transformers.push(new Ys(this,o)),t.includes("typescript")&&this.transformers.push(new ao(this,o,t.includes("imports"))),t.includes("jest")&&this.transformers.push(new Zs(this,o,this.nameManager,r))}transform(){this.tokens.reset(),this.processBalancedCode();let e=this.isImportsTransformEnabled?'"use strict";':"";for(const t of this.transformers)e+=t.getPrefixCode();e+=this.helperManager.emitHelpers(),e+=this.generatedVariables.map(e=>\` var \${e};\`).join("");for(const t of this.transformers)e+=t.getHoistedCode();let t="";for(const e of this.transformers)t+=e.getSuffixCode();let n=this.tokens.finish();if(n.startsWith("#!")){let s=n.indexOf("\\n");return-1===s&&(s=n.length,n+="\\n"),n.slice(0,s+1)+e+n.slice(s+1)+t}return e+this.tokens.finish()+t}processBalancedCode(){let e=0,t=0;for(;!this.tokens.isAtEnd();){if(this.tokens.matches1(n.braceL)||this.tokens.matches1(n.dollarBraceL))e++;else if(this.tokens.matches1(n.braceR)){if(0===e)return;e--}if(this.tokens.matches1(n.parenL))t++;else if(this.tokens.matches1(n.parenR)){if(0===t)return;t--}this.processToken()}}processToken(){if(this.tokens.matches1(n._class))this.processClass();else{for(const e of this.transformers){if(e.process())return}this.tokens.copyToken()}}processNamedClass(){if(!this.tokens.matches2(n._class,n.name))throw new Error("Expected identifier for exported class name.");const e=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);return this.processClass(),e}processClass(){const e=\$s(this,this.tokens,this.nameManager,this.disableESTransforms),t=(e.headerInfo.isExpression||!e.headerInfo.className)&&e.staticInitializerNames.length+e.instanceInitializerNames.length>0;let s=e.headerInfo.className;t&&(s=this.nameManager.claimFreeName("_class"),this.generatedVariables.push(s),this.tokens.appendCode(\` (\${s} =\`));const o=this.tokens.currentToken().contextId;if(null==o)throw new Error("Expected class to have a context ID.");for(this.tokens.copyExpectedToken(n._class);!this.tokens.matchesContextIdAndLabel(n.braceL,o);)this.processToken();this.processClassBody(e,s);const r=e.staticInitializerNames.map(e=>\`\${s}.\${e}()\`);t?this.tokens.appendCode(\`, \${r.map(e=>e+", ").join("")}\${s})\`):e.staticInitializerNames.length>0&&this.tokens.appendCode(" "+r.map(e=>e+";").join(" "))}processClassBody(e,t){const{headerInfo:s,constructorInsertPos:o,constructorInitializerStatements:r,fields:i,instanceInitializerNames:a,rangesToRemove:c}=e;let h=0,l=0;const p=this.tokens.currentToken().contextId;if(null==p)throw new Error("Expected non-null context ID on class.");this.tokens.copyExpectedToken(n.braceL),this.isReactHotLoaderTransformEnabled&&this.tokens.appendCode("__reactstandin__regenerateByEval(key, code) {this[key] = eval(code);}");const u=r.length+a.length>0;if(null===o&&u){const e=this.makeConstructorInitCode(r,a,t);if(s.hasSuperclass){const t=this.nameManager.claimFreeName("args");this.tokens.appendCode(\`constructor(...\${t}) { super(...\${t}); \${e}; }\`)}else this.tokens.appendCode(\`constructor() { \${e}; }\`)}for(;!this.tokens.matchesContextIdAndLabel(n.braceR,p);)if(h<i.length&&this.tokens.currentIndex()===i[h].start){let e=!1;for(this.tokens.matches1(n.bracketL)?this.tokens.copyTokenWithPrefix(i[h].initializerName+"() {this"):this.tokens.matches1(n.string)||this.tokens.matches1(n.num)?(this.tokens.copyTokenWithPrefix(i[h].initializerName+"() {this["),e=!0):this.tokens.copyTokenWithPrefix(i[h].initializerName+"() {this.");this.tokens.currentIndex()<i[h].end;)e&&this.tokens.currentIndex()===i[h].equalsIndex&&this.tokens.appendCode("]"),this.processToken();this.tokens.appendCode("}"),h++}else if(l<c.length&&this.tokens.currentIndex()>=c[l].start){for(this.tokens.currentIndex()<c[l].end&&this.tokens.removeInitialToken();this.tokens.currentIndex()<c[l].end;)this.tokens.removeToken();l++}else this.tokens.currentIndex()===o?(this.tokens.copyToken(),u&&this.tokens.appendCode(\`;\${this.makeConstructorInitCode(r,a,t)};\`),this.processToken()):this.processToken();this.tokens.copyExpectedToken(n.braceR)}makeConstructorInitCode(e,t,n){return[...e,...t.map(e=>\`\${n}.prototype.\${e}.call(this)\`)].join(";")}processPossibleArrowParamEnd(){if(this.tokens.matches2(n.parenR,n.colon)&&this.tokens.tokenAtRelativeIndex(1).isType){let e=this.tokens.currentIndex()+1;for(;this.tokens.tokens[e].isType;)e++;if(this.tokens.matches1AtIndex(e,n.arrow)){for(this.tokens.removeInitialToken();this.tokens.currentIndex()<e;)this.tokens.removeToken();return this.tokens.replaceTokenTrimmingLeftWhitespace(") =>"),!0}}return!1}processPossibleAsyncArrowWithTypeParams(){if(!this.tokens.matchesContextual(t._async)&&!this.tokens.matches1(n._async))return!1;const e=this.tokens.tokenAtRelativeIndex(1);if(e.type!==n.lessThan||!e.isType)return!1;let s=this.tokens.currentIndex()+1;for(;this.tokens.tokens[s].isType;)s++;if(this.tokens.matches1AtIndex(s,n.parenL)){for(this.tokens.replaceToken("async ("),this.tokens.removeInitialToken();this.tokens.currentIndex()<s;)this.tokens.removeToken();return this.tokens.removeToken(),this.processBalancedCode(),this.processToken(),!0}return!1}processPossibleTypeRange(){if(this.tokens.currentToken().isType){for(this.tokens.removeInitialToken();this.tokens.currentToken().isType;)this.tokens.removeToken();return!0}return!1}}var ho=function(){function e(e){this.string=e;for(var t=[0],n=0;n<e.length;)switch(e[n]){case"\\n":n+="\\n".length,t.push(n);break;case"\\r":"\\n"===e[n+="\\r".length]&&(n+="\\n".length),t.push(n);break;default:n++}this.offsets=t}return e.prototype.locationForIndex=function(e){if(e<0||e>this.string.length)return null;for(var t=0,n=this.offsets;n[t+1]<=e;)t++;return{line:t,column:e-n[t]}},e.prototype.indexForLocation=function(e){var t=e.line,n=e.column;return t<0||t>=this.offsets.length||n<0||n>this.lengthOfLine(t)?null:this.offsets[t]+n},e.prototype.lengthOfLine=function(e){var t=this.offsets[e];return(e===this.offsets.length-1?this.string.length:this.offsets[e+1])-t},e}();function lo(e,t){return e.length>t?e.slice(0,t-3)+"...":e}function po(e,s,o){s++,e.matches1AtIndex(s,n.parenL)||(e.matches1AtIndex(s,n.name)&&(o.add(e.identifierNameAtIndex(s)),s++,e.matches1AtIndex(s,n.comma)&&s++),e.matches1AtIndex(s,n.star)&&(s+=2,o.add(e.identifierNameAtIndex(s)),s++),e.matches1AtIndex(s,n.braceL)&&function(e,s,o){for(;;){if(e.matches1AtIndex(s,n.braceR))return;let r=e.identifierNameAtIndex(s);if(s++,e.matchesContextualAtIndex(s,t._as)&&(s++,r=e.identifierNameAtIndex(s),s++),o.add(r),e.matches2AtIndex(s,n.comma,n.braceR))return;if(e.matches1AtIndex(s,n.braceR))return;if(!e.matches1AtIndex(s,n.comma))throw new Error("Unexpected token: "+JSON.stringify(e.tokens[s]));s++}}(e,++s,o))}function uo(e,t){const s=t.transforms.includes("jsx"),o=t.transforms.includes("typescript"),r=t.transforms.includes("flow"),i=!0===t.disableESTransforms,a=function(e,t,n,s){if(s&&n)throw new Error("Cannot combine flow and typescript plugins.");_(e,t,n,s);const o=qs();if(p.error)throw m(p.error);return o}(e,s,o,r),c=a.tokens,h=a.scopes,l=new Se(e,c),u=new Ce(l),f=new Bs(e,c,r,i,u),d=Boolean(t.enableLegacyTypeScriptModuleInterop);let k=null;return t.transforms.includes("imports")?(k=new Ie(l,f,d,t,t.transforms.includes("typescript"),u),k.preprocessTokens(),Ae(f,h,k.getGlobalNames()),t.transforms.includes("typescript")&&k.pruneTypeOnlyImports()):t.transforms.includes("typescript")&&Ae(f,h,function(e){const t=new Set;for(let s=0;s<e.tokens.length;s++)e.matches1AtIndex(s,n._import)&&!e.matches3AtIndex(s,n._import,n.name,n.eq)&&po(e,s,t);return t}(f)),{tokenProcessor:f,scopes:h,nameManager:l,importProcessor:k,helperManager:u}}return e.getFormattedTokens=function(e,t){return function(e,t){if(0===t.length)return"";const n=Object.keys(t[0]).filter(e=>"type"!==e&&"value"!==e&&"start"!==e&&"end"!==e&&"loc"!==e),s=Object.keys(t[0].type).filter(e=>"label"!==e&&"keyword"!==e),r=["Location","Label","Raw",...n,...s],i=new ho(e),a=[r,...t.map((function(t){const r=e.slice(t.start,t.end);return[(i=t.start,a=t.end,\`\${l(i)}-\${l(a)}\`),o(t.type),lo(String(r),14),...n.map(e=>h(t[e],e)),...s.map(e=>h(t.type[e],e))];var i,a}))],c=r.map(()=>0);for(const e of a)for(let t=0;t<e.length;t++)c[t]=Math.max(c[t],e[t].length);return a.map(e=>e.map((e,t)=>e.padEnd(c[t])).join(" ")).join("\\n");function h(e,t){return!0===e?t:!1===e||null===e?"":String(e)}function l(e){const t=i.locationForIndex(e);return t?\`\${t.line+1}:\${t.column+1}\`:"Unknown"}}(e,uo(e,t).tokenProcessor.tokens)},e.getVersion=function(){return require("../package.json").version},e.transform=function(e,t){!function(e){Ve.strictCheck(e)}(t);try{const n=uo(e,t);let s={code:new co(n,t.transforms,Boolean(t.enableLegacyBabel5ModuleInterop),t).transform()};if(t.sourceMapOptions){if(!t.filePath)throw new Error("filePath must be specified when generating a source map.");s={...s,sourceMap:ve(s.code,t.filePath,t.sourceMapOptions)}}return s}catch(e){throw t.filePath&&(e.message=\`Error transforming \${t.filePath}: \${e.message}\`),e}},Object.defineProperty(e,"__esModule",{value:!0}),e}({});sucrase //# sourceURL=Sucrase`);
const grass = await eval(`(async () => {
function js_read_fs(path) {
  console.info('GRASS read_fs', path)
  return ""
}

function js_is_file(path) {
  console.log(\`GRASS is_file\`, path)
  return true
}

function js_is_dir(path) {
  console.log(\`GRASS is_dir\`, path)
  return false
}
const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
const cachedTextEncoder = new TextEncoder('utf-8');
cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

let WASM_VECTOR_LEN = 0;


const encodeString = function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
};

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  \`\${val}\`;
    }
    if (type == 'string') {
        return \`"\${val}"\`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return \`Symbol(\${description})\`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return \`Function(\${name})\`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\\[object ([^\\]]+)\\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of \`val\`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return \`\${val.name}: \${val.message}\\n\${val.stack}\`;
    }
    // TODO we could test for more things here, like \`Set\`s and \`Map\`s.
    return className;
}
/**
* @param {string} p
* @param {any} options
* @returns {string}
*/
function str(p, options) {
  let ptr1, len1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(p, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.str(retptr, ptr0, len0, addHeapObject(options));
        const r0 = getInt32Memory0()[retptr / 4 + 0];
        const r1 = getInt32Memory0()[retptr / 4 + 1];
        const r2 = getInt32Memory0()[retptr / 4 + 2];
        const r3 = getInt32Memory0()[retptr / 4 + 3];
        ptr1 = r0;
        len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        return getStringFromWasm0(ptr1, len1);
    } catch (e) {
        // topaz.log('grass', 'failed', e);
        console.error('grass failed to compile\\n', e, { stdin: p, options });
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        if (ptr1) wasm.__wbindgen_free(ptr1, len1);
    }
}

/**
* @returns {any}
*/
/* export function get_config() {
    const ret = wasm.get_config();
    return takeObject(ret);
} */

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
* @param {string} path
* @param {any} jsconfig
* @returns {string}
*/
/* export function file(path, jsconfig) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.file(retptr, ptr0, len0, addBorrowedObject(jsconfig));
        const r0 = getInt32Memory0()[retptr / 4 + 0];
        const r1 = getInt32Memory0()[retptr / 4 + 1];
        const r2 = getInt32Memory0()[retptr / 4 + 2];
        const r3 = getInt32Memory0()[retptr / 4 + 3];
        let ptr1 = r0;
        let len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        heap[stack_pointer++] = undefined;
        wasm.__wbindgen_free(ptr1, len1);
    }
} */

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

const imports = {
    __wbindgen_placeholder__: {
        __wbindgen_string_new: function(arg0, arg1) {
            var ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
        __wbindgen_string_get: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'string' ? obj : undefined;
            const ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbindgen_boolean_get: function(arg0) {
            const v = getObject(arg0);
            const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
            return ret;
        },
        __wbindgen_is_object: function(arg0) {
            const val = getObject(arg0);
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg_jsreadfs_82f60869c0333697: function(arg0, arg1, arg2) {
            const ret = js_read_fs(getStringFromWasm0(arg1, arg2));
            const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbg_jsisfile_5c0a4b8a496e3cfe: function(arg0, arg1) {
            const ret = js_is_file(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_jsisdir_8b96007ac52fd047: function(arg0, arg1) {
            const ret = js_is_dir(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbindgen_json_parse: function(arg0, arg1) {
            const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbindgen_json_serialize: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = JSON.stringify(obj === undefined ? null : obj);
            const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbindgen_number_get: function(arg0, arg1) {
            const obj = getObject(arg1);
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
            getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
        },
        __wbindgen_is_null: function(arg0) {
            const ret = getObject(arg0) === null;
            return ret;
        },
        __wbindgen_is_undefined: function(arg0) {
            const ret = getObject(arg0) === undefined;
            return ret;
        },
        __wbindgen_object_clone_ref: function(arg0) {
            const ret = getObject(arg0);
            return addHeapObject(ret);
        },
        __wbg_get_f7833d6ec572e462: function(arg0, arg1) {
            const ret = getObject(arg0)[takeObject(arg1)];
            return addHeapObject(ret);
        },
        __wbg_msCrypto_c429c3f8f7a70bb5: function(arg0) {
            const ret = getObject(arg0).msCrypto;
            return addHeapObject(ret);
        },
        __wbg_crypto_9e3521ed42436d35: function(arg0) {
            const ret = getObject(arg0).crypto;
            return addHeapObject(ret);
        },
        __wbg_getRandomValues_3e46aa268da0fed1: function() { return handleError(function (arg0, arg1) {
            getObject(arg0).getRandomValues(getObject(arg1));
        }, arguments) },
        __wbg_modulerequire_0a83c0c31d12d2c7: function() { return handleError(function (arg0, arg1) {
            const ret = module.require(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        }, arguments) },
        __wbg_randomFillSync_59fcc2add91fe7b3: function() { return handleError(function (arg0, arg1, arg2) {
            getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
        }, arguments) },
        __wbg_process_f2b73829dbd321da: function(arg0) {
            const ret = getObject(arg0).process;
            return addHeapObject(ret);
        },
        __wbg_versions_cd82f79c98672a9f: function(arg0) {
            const ret = getObject(arg0).versions;
            return addHeapObject(ret);
        },
        __wbg_node_ee3f6da4130bd35f: function(arg0) {
            const ret = getObject(arg0).node;
            return addHeapObject(ret);
        },
        __wbindgen_is_string: function(arg0) {
            const ret = typeof(getObject(arg0)) === 'string';
            return ret;
        },
        __wbg_isArray_8480ed76e5369634: function(arg0) {
            var ret = Array.isArray(getObject(arg0));
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_649f53c967aec9b3: function(arg0) {
            var ret = getObject(arg0) instanceof ArrayBuffer;
            return ret;
        },
        __wbg_values_71935f80778b5113: function(arg0) {
            var ret = getObject(arg0).values();
            return addHeapObject(ret);
        },
        __wbg_new_55259b13834a484c: function(arg0, arg1) {
            var ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_newnoargs_f579424187aa1717: function(arg0, arg1) {
            var ret = new Function(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbg_call_89558c3e96703ca1: function() { return handleError(function (arg0, arg1) {
            var ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        }, arguments) },
        __wbg_next_dd1a890d37e38d73: function() { return handleError(function (arg0) {
            var ret = getObject(arg0).next();
            return addHeapObject(ret);
        }, arguments) },
        __wbg_next_c7a2a6b012059a5e: function(arg0) {
            var ret = getObject(arg0).next;
            return addHeapObject(ret);
        },
        __wbg_done_982b1c7ac0cbc69d: function(arg0) {
            var ret = getObject(arg0).done;
            return ret;
        },
        __wbg_value_2def2d1fb38b02cd: function(arg0) {
            var ret = getObject(arg0).value;
            return addHeapObject(ret);
        },
        __wbg_iterator_4b9cedbeda0c0e30: function() {
            var ret = Symbol.iterator;
            return addHeapObject(ret);
        },
        __wbg_globalThis_d61b1f48a57191ae: function() { return handleError(function () {
            var ret = globalThis.globalThis;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_self_e23d74ae45fb17d1: function() { return handleError(function () {
            var ret = self.self;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_window_b4be7f48b24ac56e: function() { return handleError(function () {
            var ret = window.window;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_global_e7669da72fd7f239: function() { return handleError(function () {
            var ret = global.global;
            return addHeapObject(ret);
        }, arguments) },
        __wbg_instanceof_Uint8Array_8a8537f46e056474: function(arg0) {
            var ret = getObject(arg0) instanceof Uint8Array;
            return ret;
        },
        __wbg_new_e3b800e570795b3c: function(arg0) {
            var ret = new Uint8Array(getObject(arg0));
            return addHeapObject(ret);
        },
        __wbg_newwithlength_5f4ce114a24dfe1e: function(arg0) {
            var ret = new Uint8Array(arg0 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_subarray_a68f835ca2af506f: function(arg0, arg1, arg2) {
            var ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        },
        __wbg_length_30803400a8f15c59: function(arg0) {
            var ret = getObject(arg0).length;
            return ret;
        },
        __wbg_set_5b8081e9d002f0df: function(arg0, arg1, arg2) {
            getObject(arg0).set(getObject(arg1), arg2 >>> 0);
        },
        __wbindgen_is_function: function(arg0) {
            var ret = typeof(getObject(arg0)) === 'function';
            return ret;
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
        __wbg_buffer_5e74a88a1424a2e0: function(arg0) {
            var ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        },
        __wbg_get_8bbb82393651dd9c: function() { return handleError(function (arg0, arg1) {
            var ret = Reflect.get(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        }, arguments) },
        __wbindgen_debug_string: function(arg0, arg1) {
            var ret = debugString(getObject(arg1));
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbindgen_throw: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_memory: function() {
            var ret = wasm.memory;
            return addHeapObject(ret);
        },
    },

};

let wasmCode = await (await fetch('https://goosemod.github.io/topaz/src/grass.wasm')).arrayBuffer();
const wasmInstance = (await WebAssembly.instantiate(wasmCode, imports)).instance;
const wasm = wasmInstance.exports;

return str;
})(); //# sourceURL=Grass`);
const XXHash = (await eval(`var E=Object.defineProperty;var r=(s,i)=>E(s,"name",{value:i,configurable:!0});var M=new Uint8Array([0,97,115,109,1,0,0,0,1,48,8,96,3,127,127,127,0,96,3,127,127,127,1,127,96,2,127,127,0,96,2,127,126,0,96,1,127,1,127,96,1,127,1,126,96,3,127,127,126,1,126,96,3,126,127,127,1,126,3,11,10,1,1,2,0,4,6,7,3,0,5,5,3,1,0,1,7,85,9,3,109,101,109,2,0,5,120,120,104,51,50,0,0,6,105,110,105,116,51,50,0,2,8,117,112,100,97,116,101,51,50,0,3,8,100,105,103,101,115,116,51,50,0,4,5,120,120,104,54,52,0,5,6,105,110,105,116,54,52,0,7,8,117,112,100,97,116,101,54,52,0,8,8,100,105,103,101,115,116,54,52,0,9,10,211,23,10,242,1,1,4,127,32,0,32,1,106,33,3,32,1,65,16,79,4,127,32,3,65,16,107,33,6,32,2,65,168,136,141,161,2,106,33,3,32,2,65,247,148,175,175,120,106,33,4,32,2,65,177,243,221,241,121,107,33,5,3,64,32,0,40,2,0,65,247,148,175,175,120,108,32,3,106,65,13,119,65,177,243,221,241,121,108,33,3,32,0,65,4,106,34,0,40,2,0,65,247,148,175,175,120,108,32,4,106,65,13,119,65,177,243,221,241,121,108,33,4,32,0,65,4,106,34,0,40,2,0,65,247,148,175,175,120,108,32,2,106,65,13,119,65,177,243,221,241,121,108,33,2,32,0,65,4,106,34,0,40,2,0,65,247,148,175,175,120,108,32,5,106,65,13,119,65,177,243,221,241,121,108,33,5,32,0,65,4,106,34,0,32,6,77,13,0,11,32,2,65,12,119,32,5,65,18,119,106,32,4,65,7,119,106,32,3,65,1,119,106,5,32,2,65,177,207,217,178,1,106,11,32,1,106,32,0,32,1,65,15,113,16,1,11,146,1,0,32,1,32,2,106,33,2,3,64,32,1,65,4,106,32,2,75,69,4,64,32,1,40,2,0,65,189,220,202,149,124,108,32,0,106,65,17,119,65,175,214,211,190,2,108,33,0,32,1,65,4,106,33,1,12,1,11,11,3,64,32,1,32,2,79,69,4,64,32,1,45,0,0,65,177,207,217,178,1,108,32,0,106,65,11,119,65,177,243,221,241,121,108,33,0,32,1,65,1,106,33,1,12,1,11,11,32,0,65,15,118,32,0,115,65,247,148,175,175,120,108,34,0,32,0,65,13,118,115,65,189,220,202,149,124,108,34,0,32,0,65,16,118,115,11,63,0,32,0,65,8,106,32,1,65,168,136,141,161,2,106,54,2,0,32,0,65,12,106,32,1,65,247,148,175,175,120,106,54,2,0,32,0,65,16,106,32,1,54,2,0,32,0,65,20,106,32,1,65,177,243,221,241,121,107,54,2,0,11,211,4,1,6,127,32,1,32,2,106,33,6,32,0,65,24,106,33,5,32,0,65,40,106,40,2,0,33,3,32,0,32,0,40,2,0,32,2,106,54,2,0,32,0,65,4,106,34,4,32,4,40,2,0,32,2,65,16,79,32,0,40,2,0,65,16,79,114,114,54,2,0,32,2,32,3,106,65,16,73,4,64,32,3,32,5,106,32,1,32,2,252,10,0,0,32,0,65,40,106,32,2,32,3,106,54,2,0,15,11,32,3,4,64,32,3,32,5,106,32,1,65,16,32,3,107,34,2,252,10,0,0,32,0,65,8,106,34,3,40,2,0,32,5,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,4,32,3,32,4,54,2,0,32,0,65,12,106,34,3,40,2,0,32,5,65,4,106,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,4,32,3,32,4,54,2,0,32,0,65,16,106,34,3,40,2,0,32,5,65,8,106,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,4,32,3,32,4,54,2,0,32,0,65,20,106,34,3,40,2,0,32,5,65,12,106,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,4,32,3,32,4,54,2,0,32,0,65,40,106,65,0,54,2,0,32,1,32,2,106,33,1,11,32,1,32,6,65,16,107,77,4,64,32,6,65,16,107,33,8,32,0,65,8,106,40,2,0,33,2,32,0,65,12,106,40,2,0,33,3,32,0,65,16,106,40,2,0,33,4,32,0,65,20,106,40,2,0,33,7,3,64,32,1,40,2,0,65,247,148,175,175,120,108,32,2,106,65,13,119,65,177,243,221,241,121,108,33,2,32,1,65,4,106,34,1,40,2,0,65,247,148,175,175,120,108,32,3,106,65,13,119,65,177,243,221,241,121,108,33,3,32,1,65,4,106,34,1,40,2,0,65,247,148,175,175,120,108,32,4,106,65,13,119,65,177,243,221,241,121,108,33,4,32,1,65,4,106,34,1,40,2,0,65,247,148,175,175,120,108,32,7,106,65,13,119,65,177,243,221,241,121,108,33,7,32,1,65,4,106,34,1,32,8,77,13,0,11,32,0,65,8,106,32,2,54,2,0,32,0,65,12,106,32,3,54,2,0,32,0,65,16,106,32,4,54,2,0,32,0,65,20,106,32,7,54,2,0,11,32,1,32,6,73,4,64,32,5,32,1,32,6,32,1,107,34,1,252,10,0,0,32,0,65,40,106,32,1,54,2,0,11,11,97,1,1,127,32,0,65,16,106,40,2,0,33,1,32,0,65,4,106,40,2,0,4,127,32,1,65,12,119,32,0,65,20,106,40,2,0,65,18,119,106,32,0,65,12,106,40,2,0,65,7,119,106,32,0,65,8,106,40,2,0,65,1,119,106,5,32,1,65,177,207,217,178,1,106,11,32,0,40,2,0,106,32,0,65,24,106,32,0,65,40,106,40,2,0,16,1,11,157,4,2,1,127,3,126,32,0,32,1,106,33,3,32,1,65,32,79,4,126,32,3,65,32,107,33,3,32,2,66,135,149,175,175,152,182,222,155,158,127,124,66,207,214,211,190,210,199,171,217,66,124,33,4,32,2,66,207,214,211,190,210,199,171,217,66,124,33,5,32,2,66,0,124,33,6,32,2,66,135,149,175,175,152,182,222,155,158,127,125,33,2,3,64,32,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,4,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,4,32,0,65,8,106,34,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,5,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,5,32,0,65,8,106,34,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,6,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,0,65,8,106,34,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,2,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,2,32,0,65,8,106,34,0,32,3,77,13,0,11,32,6,66,12,137,32,2,66,18,137,124,32,5,66,7,137,124,32,4,66,1,137,124,32,4,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,32,5,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,32,6,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,32,2,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,5,32,2,66,197,207,217,178,241,229,186,234,39,124,11,32,1,173,124,32,0,32,1,65,31,113,16,6,11,137,2,0,32,1,32,2,106,33,2,3,64,32,1,65,8,106,32,2,77,4,64,32,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,32,0,133,66,27,137,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,33,0,32,1,65,8,106,33,1,12,1,11,11,32,1,65,4,106,32,2,77,4,64,32,1,53,2,0,66,135,149,175,175,152,182,222,155,158,127,126,32,0,133,66,23,137,66,207,214,211,190,210,199,171,217,66,126,66,249,243,221,241,153,246,153,171,22,124,33,0,32,1,65,4,106,33,1,11,3,64,32,1,32,2,73,4,64,32,1,49,0,0,66,197,207,217,178,241,229,186,234,39,126,32,0,133,66,11,137,66,135,149,175,175,152,182,222,155,158,127,126,33,0,32,1,65,1,106,33,1,12,1,11,11,32,0,66,33,136,32,0,133,66,207,214,211,190,210,199,171,217,66,126,34,0,32,0,66,29,136,133,66,249,243,221,241,153,246,153,171,22,126,34,0,32,0,66,32,136,133,11,88,0,32,0,65,8,106,32,1,66,135,149,175,175,152,182,222,155,158,127,124,66,207,214,211,190,210,199,171,217,66,124,55,3,0,32,0,65,16,106,32,1,66,207,214,211,190,210,199,171,217,66,124,55,3,0,32,0,65,24,106,32,1,55,3,0,32,0,65,32,106,32,1,66,135,149,175,175,152,182,222,155,158,127,125,55,3,0,11,132,5,2,3,127,4,126,32,1,32,2,106,33,5,32,0,65,40,106,33,4,32,0,65,200,0,106,40,2,0,33,3,32,0,32,0,41,3,0,32,2,173,124,55,3,0,32,2,32,3,106,65,32,73,4,64,32,3,32,4,106,32,1,32,2,252,10,0,0,32,0,65,200,0,106,32,2,32,3,106,54,2,0,15,11,32,3,4,64,32,3,32,4,106,32,1,65,32,32,3,107,34,2,252,10,0,0,32,0,65,8,106,34,3,41,3,0,32,4,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,3,32,6,55,3,0,32,0,65,16,106,34,3,41,3,0,32,4,65,8,106,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,3,32,6,55,3,0,32,0,65,24,106,34,3,41,3,0,32,4,65,16,106,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,3,32,6,55,3,0,32,0,65,32,106,34,3,41,3,0,32,4,65,24,106,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,3,32,6,55,3,0,32,0,65,200,0,106,65,0,54,2,0,32,1,32,2,106,33,1,11,32,1,65,32,106,32,5,77,4,64,32,5,65,32,107,33,2,32,0,65,8,106,41,3,0,33,6,32,0,65,16,106,41,3,0,33,7,32,0,65,24,106,41,3,0,33,8,32,0,65,32,106,41,3,0,33,9,3,64,32,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,6,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,1,65,8,106,34,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,7,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,7,32,1,65,8,106,34,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,8,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,8,32,1,65,8,106,34,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,32,9,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,9,32,1,65,8,106,34,1,32,2,77,13,0,11,32,0,65,8,106,32,6,55,3,0,32,0,65,16,106,32,7,55,3,0,32,0,65,24,106,32,8,55,3,0,32,0,65,32,106,32,9,55,3,0,11,32,1,32,5,73,4,64,32,4,32,1,32,5,32,1,107,34,1,252,10,0,0,32,0,65,200,0,106,32,1,54,2,0,11,11,200,2,1,5,126,32,0,65,24,106,41,3,0,33,1,32,0,41,3,0,34,2,66,32,90,4,126,32,0,65,8,106,41,3,0,34,3,66,1,137,32,0,65,16,106,41,3,0,34,4,66,7,137,124,32,1,66,12,137,32,0,65,32,106,41,3,0,34,5,66,18,137,124,124,32,3,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,32,4,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,32,1,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,32,5,66,207,214,211,190,210,199,171,217,66,126,66,0,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,227,220,202,149,252,206,242,245,133,127,124,5,32,1,66,197,207,217,178,241,229,186,234,39,124,11,32,2,124,32,0,65,40,106,32,2,66,31,131,167,16,6,11]);async function j(){let{instance:{exports:{mem:s,xxh32:i,xxh64:f,init32:p,update32:v,digest32:L,init64:x,update64:S,digest64:A}}}=await WebAssembly.instantiate(M),e=new Uint8Array(s.buffer);function u(t,n){if(s.buffer.byteLength<t+n){let l=Math.ceil((t+n-s.buffer.byteLength)/65536);s.grow(l),e=new Uint8Array(s.buffer)}}r(u,"c");function y(t,n,l,I,T,R){u(t);let a=new Uint8Array(t);return e.set(a),l(0,n),a.set(e.slice(0,t)),{update(g){let d;return e.set(a),typeof g=="string"?(u(3*g.length,t),d=c.encodeInto(g,e.subarray(t)).written):(u(g.byteLength,t),e.set(g,t),d=g.byteLength),I(0,t,d),a.set(e.slice(0,t)),this},digest:()=>(e.set(a),R(T(0)))}}r(y,"l");function h(t){return t>>>0}r(h,"d");let U=2n**64n-1n;function m(t){return t&U}r(m,"y");let c=new TextEncoder,o=0n;function b(t){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:0;return u(3*t.length,0),h(i(0,c.encodeInto(t,e).written,n))}r(b,"p");function w(t){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:o;return u(3*t.length,0),m(f(0,c.encodeInto(t,e).written,n))}return r(w,"v"),{h32:b,h32ToString(t){return b(t,arguments.length>1&&arguments[1]!==void 0?arguments[1]:0).toString(16).padStart(8,"0")},h32Raw(t){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:0;return u(t.byteLength,0),e.set(t),h(i(0,t.byteLength,n))},create32(){return y(48,arguments.length>0&&arguments[0]!==void 0?arguments[0]:0,p,v,L,h)},h64:w,h64ToString(t){return w(t,arguments.length>1&&arguments[1]!==void 0?arguments[1]:o).toString(16).padStart(16,"0")},h64Raw(t){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:o;return u(t.byteLength,0),e.set(t),m(f(0,t.byteLength,n))},create64(){return y(88,arguments.length>0&&arguments[0]!==void 0?arguments[0]:o,x,S,A,m)}}}r(j,"e");j`)()).h64ToString;

const attrs = eval(`const { findByProps } = goosemod.webpackModules;

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

manager`);

const Onyx = eval(`const unsentrify = (obj) => Object.keys(obj).reduce((acc, x) => {
  const sub = obj[x].__REACT_DEVTOOLS_ORIGINAL_METHOD__ ?? obj[x];
  acc[x] = sub.__sentry_original__ ?? sub;
  return acc;
}, {});

const sourceURLIndex = {};
sourceURLIndex.increment = function (name) { this[name] = (this[name] ?? 0) + 1; };

const makeSourceURL = (name) => \`\${name} | Topaz \${sourceURLIndex.increment(name)}\`.replace(/ /g, '%20');
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

const parseStack = (stack) => [...stack.matchAll(/^    at (.*?)( \\[as (.*)\\])? \\((.*)\\)\$/gm)].map(x => ({
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
      const name = \`\${Object.keys(perms)[Object.values(perms).indexOf(subPerm)]} > \${Object.keys(subPerm).find(x => subPerm[x] === this.props.perm)}\`;

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
          header: \`\${manifest.name} requires permissions\`,
          confirmText: allowedCount === 0 ? \`Deny\${allSuffix}\` : (allowedCount === totalCount ? \`Allow\${allSuffix}\` : \`Allow \${allowedCount}\`),
          cancelText: allowedCount === 0 ? '' : \`Deny\${allSuffix}\`,
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
          ...(\`Topaz requires your permission before allowing **\${manifest.name}** to \${permsTypes}:\`).split('\\n').map((x) => React.createElement(Markdown, {
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
  containerParent.innerHTML = window.BdApi ? \`<object data="about:blank"></object>\` : '<iframe></iframe>'; // make iframe. use object (bit slower) if BD is also installed as it breaks sandboxing
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
  context.exports = context.module.exports;

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
    // predictedPerms = Object.keys(permissions).filter(x => permissions[x].some(y => [..._code.matchAll(new RegExp(\`([^. 	]*?)\\\\.\${y}\`, 'g'))].some(z => z && !objectPredictBlacklist.includes(z[1].toLowerCase()))));
    // topaz.log('onyx', 'predicted perms for', this.manifest.name, predictedPerms);
    // permissionsModal(this.manifest, predictedPerms);

    const argumentContext = Object.keys(this.context).filter(x => !x.match(/^[0-9]/) && !x.match(/[-,]/));

    let code = \`(function (\${argumentContext}) {
\${_code}\\n\\n
;return module.exports;
});
//# sourceURL=\${makeSourceURL(this.manifest.name)}\`;

    code += '\\n' + this.MapGen(code, transformRoot, this.manifest.name);

    let exported = containedEval.bind(this.context)(code).apply(this.context, argumentContext.map(x => this.context[x]));

    if (Object.keys(exported).length === 1 && exported.default) exported = exported.default;

    return exported;
  };

  let accessedPermissions = {};
  let firstAccess;

  this.safeWebpack = function (mod) {
    const checkPerms = (target, prop, reciever, missingPerm, givenPermissions) => {
      if (!missingPerm) return Reflect.get(target, prop, reciever);

      // toast(\`[Topaz] \${name}: Blocked accessing (\${prop})\`, 2);

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
              goosemod.showToast(\`Halting \${this.manifest.name} as it is potentially dangerous and denied token\`, { timeout: 10000, subtext: 'Topaz', type: 'error' });
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

  topaz.log('onyx', \`contained \${manifest.name} in \${(performance.now() - startTime).toFixed(2)}ms\`);
};

Onyx //# sourceURL=Onyx`);
const MapGen = eval(`const MAP_START = 'MAP_START|';
const MAP_END = 'MAP_END';

const B64Map = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'];
const encode = (x) => { // base64 vlq
  let encoded = '';

  let vlq = x < 0 ? ((-x << 1) + 1) : (x << 1);

  do {
    let digit = vlq & 31;

    vlq = vlq >> 5;
    if (vlq > 0) digit = digit | 32;

    encoded += B64Map[digit];
  } while (vlq > 0);

  return encoded;
};

const makeMap = (output, root, name) => {
  if (topaz.debug) return '';

  const startTime = performance.now();

  const sources = [];
  const sourcesContent = [];
  const mappings = [];

  let withinSource, currentLine = 0, lastLine = 0, bumpSource = 0;
  for (const line of output.split('\\n')) {
    if (line.includes(MAP_END)) {
      withinSource = false;
      continue;
    }

    if (withinSource) { // map line
      mappings.push([ 0, bumpSource ? bumpSource-- : 0, currentLine - lastLine, 0 ]);

      lastLine = currentLine++;

      continue;
    } else mappings.push([]); // skip line

    const ind = line.indexOf(MAP_START);
    if (ind !== -1) {
      const source = line.slice(ind + MAP_START.length);
      // if (!source.startsWith('./')) continue;

      const local = source.startsWith('./');
      sources.push(local ? source.slice(2) : 'topaz://Topaz/' + source + '.js');
      sourcesContent.push(local ? topaz.internal.fetchCache.get(root + '/' + source.slice(2)) : topaz.internal.builtins[source]);

      withinSource = true;
      if (sources.length > 1) bumpSource = 1; // don't bump for first source

      currentLine = 0; // reset line to 0
    }
  }

  const map = {
    version: 3,
    file: \`topaz_plugin.js\`,
    sourceRoot: \`topaz://Topaz/Plugin\${sources.filter(x => !x.startsWith('topaz://') && x.endsWith('.plugin.js')).length === 1 ? '' : \`/\${name}\`}\`, // don't use plugin subdir when only one source (eg: BD .plugin.js)
    sources,
    names: [],
    mappings: mappings.map(x => x.map(encode).join('')).join(';'), // encode maps into expected
    sourcesContent
  };

  topaz.log('mapgen', \`mapped \${name} in \${(performance.now() - startTime).toFixed(2)}ms\`, map);

  return \`//# sourceMappingURL=data:application/json;charset=utf-8,\` + encodeURIComponent(JSON.stringify(map)); // inline with encoded
};

makeMap`);
Onyx.prototype.MapGen = MapGen; // import mapgen into onyx

const Autopatch = eval(`const prettyAgo = (timestamp) => {
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const interval = intervals.find(i => i.seconds <= seconds);
  const count = Math.floor(seconds / interval.seconds);

  const rtf = new Intl.RelativeTimeFormat("en", {
    localeMatcher: 'best fit',
    numeric: 'auto',
    style: 'long'
  });

  return rtf.format(count * -1, interval.label);
};


async (entityID, manifest, code) => {
  let changes = [];
  const original = code;

  const patch = (original, replacement, change) => {
    const before = code;

    code = code.replaceAll(original, replacement);

    if (code !== before && !changes.find(x => x[0] === change[0])) changes.push(change);
  };


  patch(/ActionTypes\\.([A-Z_]*)/g, '\\'\$1\\'', [ 'ActionTypes deletion fix', new Date('2022-08-01T06:22:49Z') ]);

  patch('dirtyDispatch', 'dispatch', [ 'dirtyDispatch -> dispatch', new Date('2022-08-03T01:30:44Z') ]);

  patch('\\'_orderedActionHandlers\\'', '\\'_actionHandlers\\'', [ 'FluxDispatcher update', new Date('2022-08-10T20:55:38Z') ]);
  patch(/([^s])\\.(_orderedActionHandlers|_dependencyGraph|_orderedCallbackTokens|_invalidateCaches)/g, '\$1._actionHandlers.\$2', [ 'FluxDispatcher update', new Date('2022-08-10T20:55:38Z') ]);


  let toRevert = undefined;
  if (changes.length > 0) {
    const previouslyAsked = topaz.storage.get(entityID + '_autopatch_asked') ?? [];
    const changesToShow = changes.filter(x => !previouslyAsked.includes(x[0]));

    if (changesToShow.length === 0) return [ code, { changes, toRevert } ];

    const res = goosemod.confirmDialog('Okay', \`\${manifest.name} Patched\`, \`Topaz found that **\${manifest.name}** was likely broken and has attempted to automatically fix it.
##### ​
# Patches

\${changesToShow.map(x => \`- \${x[0]} (\${prettyAgo(x[1])})\`).join('\\n')}\`, 'Revert', 'brand');
    if (document.querySelector('[type="submit"] + [type="button"]')) document.querySelector('[type="submit"] + [type="button"]').onclick = () => toRevert = true; // Only revert button, not ignore

    await res;
    if (toRevert === true) code = original;
    else {
      toRevert = false;
      topaz.storage.set(entityID + '_autopatch_asked', changes.map(x => x[0]));
    }
  }

  return [ code, { changes, toRevert } ];
}`);

const Editor = { // defer loading until editor is wanted
  get Component() {
    return (async () => { // async getter
      delete this.Component;
      return this.Component = await eval(`(async () => {
const { React } = goosemod.webpackModules.common;
window.React = React; // pain but have to

const forceWrap = (comp, key) => class extends React.PureComponent {
  render() {
    return React.createElement(comp, {
      ...this.props,
      onChange: x => {
        this.props[key] = x;
        this.forceUpdate();

        this.props.onChange(x);
      }
    });
  }
};

const SwitchItem = forceWrap(goosemod.webpackModules.findByDisplayName('SwitchItem'), 'value');
const SingleSelect = forceWrap(goosemod.webpackModules.findByProps('SingleSelect').SingleSelect, 'value');

const debounce = (handler, timeout) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => handler(...args), timeout);
  };
};

const imp = async url => eval(await (await fetch(url)).text());

const patchAppend = (which) => { // sorry
  const orig = document[which].appendChild;

  document[which].appendChild = function(el) {
    if (el.nodeName === 'SCRIPT' && el.src.includes('monaco')) {
      (async () => {
        console.log('monaco', which, el.src);
        (1, eval)(await (await fetch(el.src)).text());
        el.onload?.();
      })();

      return;
    }

    return orig.apply(this, arguments);
  };
};

patchAppend('body');
patchAppend('head');

// hack for mods who load their own monaco and use Node and stuff
if (!window.monaco_react && typeof require !== 'undefined') {
  const toBlock = [ 'global', 'require', 'module', 'process', 'nodeRequire'];

  const orig = {};
  for (const x of toBlock) {
    orig[x] = window[x];
    window[x] = undefined;
  }

  setTimeout(() => Object.keys(orig).forEach(x => window[x] = orig[x]), 5000);
}

if (window.monaco && !window.monaco_react) {
  window.monaco = undefined;
  window.monaco_editor = undefined;
  window.monaco_loader = undefined;
  window.MonacoEnvironment = undefined;
  window.AMDLoader = undefined;
  window._amdLoaderGlobal = undefined;
  window.define = undefined;
}

if (!window.monaco) { // only load once, or errors
  // monaco loader and react dependencies
  await imp('https://unpkg.com/prop-types@15.7.2/prop-types.js');
  await imp('https://unpkg.com/state-local@1.0.7/lib/umd/state-local.min.js');

  await imp('https://unpkg.com/@monaco-editor/loader@1.3.2/lib/umd/monaco-loader.min.js'); // monaco loader
  await imp('https://unpkg.com/@monaco-editor/react@4.4.5/lib/umd/monaco-react.min.js'); // monaco react
}


const MonacoEditor = monaco_react.default;

const langs = {
  'js': 'javascript',
  'jsx': 'javascript', // jsx is half broken because monaco bad but do anyway
  'css': 'css',
  'html':'html'
};

const TabBar = goosemod.webpackModules.findByDisplayName('TabBar');
const TabBarClasses1 = goosemod.webpackModules.findByProps('topPill');
const TabBarClasses2 = goosemod.webpackModules.findByProps('tabBar', 'nowPlayingColumn');

const PanelButton = goosemod.webpackModules.findByDisplayName('PanelButton');
const _Switch = goosemod.webpackModules.findByDisplayName('Switch');
const Switch = forceWrap(_Switch, 'checked');

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'auto', 'thin');

let lastPlugin;
let expandInt;

const editorSettings = JSON.parse(topaz.storage.get('editor_settings') ?? 'null') ?? {
  theme: 'vs-dark',
  focusMode: true
};

const saveEditorSettings = () => topaz.storage.set('editor_settings', JSON.stringify(editorSettings));

const _loadedThemes = {};
const setTheme = async (x) => {
  if (!x.startsWith('vs') && !_loadedThemes[x]) _loadedThemes[x] = monaco.editor.defineTheme(x, await (await fetch(\`https://raw.githubusercontent.com/brijeshb42/monaco-themes/master/themes/\${x}.json\`)).json());

  monaco.editor.setTheme(x);
  editorSettings.theme = x;
};
setTimeout(() => setTheme(editorSettings.theme), 500);

const focus_enlarge = () => document.body.classList.add('topaz-editor-focus');
const focus_revert = () => document.body.classList.remove('topaz-editor-focus');

const langToImg = (lang, size = 24) => {
  let img, props = {};

  switch (lang) {
    case 'js':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/javascript.svg';
      break;

    case 'jsx':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/react.svg';
      props.style = { filter: 'hue-rotate(220deg) brightness(1.5)' }; // HS yellow
      break;

    case 'ts':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/typescript.svg';
      break;

    case 'tsx':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/react.svg';
      props.style = { filter: 'hue-rotate(20deg) brightness(1.5)' }; // TS blue
      break;

    case 'css':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/css.svg';
      break;

    case 'scss':
      img = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/sass.svg';
      break;
  }

  return React.createElement('img', {
    src: img,
    ...props,

    width: size,
    height: size
  });
};

const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
const FormText = goosemod.webpackModules.findByDisplayName('FormText');
const LegacyHeader = goosemod.webpackModules.findByDisplayName('LegacyHeader');
const ModalStuff = goosemod.webpackModules.findByProps('ModalRoot');
const { openModal } = goosemod.webpackModules.findByProps('openModal', 'updateModal');
const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Markdown = goosemod.webpackModules.find((x) => x.displayName === 'Markdown' && x.rules);
const Button = goosemod.webpackModules.findByProps('Sizes', 'Colors', 'Looks', 'DropdownSizes');

const makeModal = (header, content, entireCustom) => {
  openModal((e) => {
    return React.createElement(ModalStuff.ModalRoot, {
      transitionState: e.transitionState,
      size: 'large'
    },
      entireCustom ? React.createElement(entireCustom, e, null) : React.createElement(ModalStuff.ModalHeader, {},
        React.createElement(Flex.Child, {
          basis: 'auto',
          grow: 1,
          shrink: 1,
          wrap: false,
        },
          React.createElement(LegacyHeader, {
            tag: 'h2',
            size: LegacyHeader.Sizes.SIZE_20,
            className: 'topaz-modal-header'
          }, header)
        ),
        React.createElement('FlexChild', {
          basis: 'auto',
          grow: 0,
          shrink: 1,
          wrap: false
        },
          React.createElement(ModalStuff.ModalCloseButton, {
            onClick: e.onClose
          })
        )
      ),

      entireCustom ? null : React.createElement(ModalStuff.ModalContent, {
        className: \`topaz-modal-content\`
      },
        content
      )
    )
  });
};


const selections = {};

let ignoreNextSelect = false;
return function Editor(props) {
  let { files, defaultFile, plugin, toggled, fileIcons } = props;
  defaultFile = defaultFile ?? Object.keys(files)[0] ?? '';

  const loadPreviousSelection = (file) => {
    setTimeout(() => {
      const ref = editorRef.current;
      console.log(ref);

      if (selections[plugin.entityID + file]) {
        ref.setSelection(selections[plugin.entityID + file]);
        ref.revealLineInCenter(selections[plugin.entityID + file].startLineNumber);
      } else ref.revealLine(0);

      ref.focus();
    }, editorRef.current ? 20 : 500);
  };

  const editorRef = React.useRef(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [ openFile, setOpenFile ] = React.useState(defaultFile);

  if (lastPlugin !== plugin.entityID) { // dispose models to clean up
    lastPlugin = plugin.entityID;
    if (window.monaco) monaco.editor.getModels().forEach(x => x.dispose());

    loadPreviousSelection(openFile);
  }


  if (!expandInt && editorSettings.focusMode) {
    expandInt = setInterval(() => {
      if (document.querySelector('.topaz-editor')) return;

      clearInterval(expandInt);
      expandInt = undefined;

      focus_revert();
    }, 300);

    focus_enlarge();
  }

  const openExt = openFile.split('.').pop();

  console.log('render', files, defaultFile, openFile, files[openFile] === undefined, openExt);

  return React.createElement('div', {
    className: 'topaz-editor'
  },
    React.createElement(TabBar, {
      selectedItem: openFile,

      className: [ TabBarClasses2.tabBar, ScrollerClasses.auto ].join(' '),
      type: TabBarClasses1.top,
      look: 1,

      onItemSelect: (x) => {
        if (x.startsWith('#')) return;
        if (ignoreNextSelect) return ignoreNextSelect = false;

        selections[plugin.entityID + openFile] = editorRef.current.getSelection();

        setOpenFile(x);
        props.onOpen?.(x);

        if (openFile !== x) loadPreviousSelection(x);
      }
    },
      ...Object.keys(files).map(x => React.createElement(TabBar.Item, {
        id: x,
        className: TabBarClasses2.item
      },
        !fileIcons ? null : React.createElement(SingleSelect, {
          onChange: y => {
            const newFile = x.split('.').slice(0, -1).join('.') + '.' + y;

            props.onRename?.(x, newFile);
            if (openFile === x) {
              setOpenFile(newFile);
              forceUpdate(); // sorry :)
              setImmediate(() => document.querySelector('#inptab-' + newFile.replace(/[^A-Za-z0-9]/g, '_')).parentElement.click());
            }
          },
          options: [ 'css', 'scss', '-', 'js', 'jsx', '-', 'ts', 'tsx' ].map(y => ({
            label: y,
            value: y
          })),
          value: x.split('.').pop() ?? 'css',

          popoutClassName: 'topaz-file-popout',

          renderOptionValue: ([ { value } ]) => langToImg(value, 24),
          renderOptionLabel: ({ value }) => value === '-' ? '' : React.createElement(React.Fragment, {},
            langToImg(value, 24),

            value.toUpperCase()
          )
        }),

        React.createElement('input', {
          type: 'text',
          autocomplete: 'off',
          spellcheck: 'false',
          autocorrect: 'off',

          value: fileIcons ? x.split('.').slice(0, -1).join('.') : x,
          id: 'inptab-' + x.replace(/[^A-Za-z0-9]/g, '_'),

          style: {
            width: (x.length * 0.8) + 'ch'
          },

          onChange: (e) => {
            let val = e.target.value;
            if (fileIcons) val += '.' + x.split('.').pop();

            if (!document.querySelector('.topaz-snippets')) document.querySelector('#inptab-' + x.replace(/[^A-Za-z0-9]/g, '_')).style.width = (val.length * 0.8) + 'ch';

            props.onRename?.(x, val);

            if (openFile === x) setOpenFile(val);
          }
        }),

        plugin.entityID !== 'snippets' ? null : React.createElement(Switch, {
          checked: toggled[x] ?? true,
          onChange: (y) => props.onToggle?.(x, y)
        }),

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Trash'),
          tooltipText: 'Delete',
          onClick: () => {
            ignoreNextSelect = true;

            const originalIndex = Object.keys(files).indexOf(openFile);

            props.onDelete?.(x);

            if (openFile === x) {
              let newOpenIndex = originalIndex - 1;
              if (newOpenIndex < 0) newOpenIndex = 0;

              setOpenFile(Object.keys(files)[newOpenIndex] ?? '');
            } else forceUpdate();
          }
        })
      )),

      React.createElement(TabBar.Item, {
        id: '#new',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('PlusAlt'),
        tooltipText: 'New',
        tooltipClassName: plugin.entityID !== 'snippets' ? '' : (goosemod.webpackModules.findByProps('tooltipBottom').tooltipBottom + ' topaz-snippets-tooltip-bottom'),
        onClick: () => {
          const name = fileIcons ? '.css' : '';

          files[name] = '';
          if (openFile === name) forceUpdate();
            else setOpenFile(name);

          setTimeout(() => document.querySelector('#inptab-' + name.replace(/[^A-Za-z0-9]/g, '_')).focus(), 100);

          props.onNew?.(name);
        }
      })),

      plugin.entityID !== 'snippets' ? null : React.createElement(TabBar.Item, {
        id: '#library',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Library'),
        tooltipText: 'Library',
        tooltipClassName: goosemod.webpackModules.findByProps('tooltipBottom').tooltipBottom + ' topaz-snippets-tooltip-bottom',
        onClick: async () => {
          let selectedItem = 'CSS';

          const { fetchMessages } = goosemod.webpackModules.findByProps('fetchMessages', 'sendMessage');
          const { getRawMessages } = goosemod.webpackModules.findByProps('getMessages');
          const { getChannel, hasChannel } = goosemod.webpackModules.findByProps('getChannel', 'getDMFromUserId');

          const channels = [
            '755005803303403570',
            '836694789898109009',
            '449569809613717518',
            '1000955971650195588',
          ];

          const getSnippets = async (channelId) => {
            if (!hasChannel(channelId)) return;

            await fetchMessages({ channelId }); // Load messages

            const channel = getChannel(channelId);
            const messages = Object.values(getRawMessages(channelId)).filter(x => x.content.includes('\\\`\\\`\\\`css') && // Make sure it has CSS codeblock
              !x.message_reference && // Exclude replies
              !x.content.toLowerCase().includes('quick css') && // Exclude PC / BD specific snippets
              !x.content.toLowerCase().includes('plugin') &&
              !x.content.toLowerCase().includes('powercord') && !x.content.toLowerCase().includes('betterdiscord') &&
              !x.content.toLowerCase().includes('fix') && !x.content.toLowerCase().includes('bother') &&
              (x.attachments.length > 0 || x.embeds.length > 0)
            );

            for (let i = messages.length - 1; i > 0; i--) { // shuffle
              const j = Math.floor(Math.random() * (i + 1));
              [messages[i], messages[j]] = [messages[j], messages[i]];
            }

            return { channel, messages };
          };

          const channelSnippets = (await Promise.all(channels.map(x => getSnippets(x)))).filter(x => x);

          const makeBuiltin = ({ title, desc, preview, author, css }) => {
            return {
              attachments: [ {
                proxy_url: preview,
                type: 'image'
              } ],
              author,

              content: \`\${title}\\n\${desc}\\n\\\`\\\`\\\`css\\n\${css}\\\`\\\`\\\`\`
            }
          };

          const builtinSnippets = [ {
            channel: null,
            messages: [
              {
                title: 'Custom Font',
                desc: 'Choose a custom font (locally installed) for Discord, edit to change',
                preview: '',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: \`body {
  --font-primary: normal font name;
  --font-display: header font name;
  --font-headline: header font name;
  --font-code: code font name;
}

code { /* Fix code font variable not being used in some places */
  font-family: var(--font-code);
}\`
              },
              {
                title: 'Custom Home Icon',
                desc: 'Choose a custom home icon (top left Discord icon), edit to change',
                preview: 'https://i.imgur.com/6zSmFRU.png',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: \`[class^="homeIcon"] path {
  fill: none;
}

[class^="homeIcon"] {
  background: url(IMAGE_URL_HERE) center/cover no-repeat;
  width: 48px;
  height: 48px;
}\`
              },
              {
                title: 'Hide Public Badge',
                desc: 'Hides the public badge in server headers',
                preview: '',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: \`[class^="communityInfoContainer"] {
  display: none;
}\`
              },
              {
                title: 'Hide Help Button',
                desc: 'Hides the help button (top right)',
                preview: '',
                author: {
                  id: '506482395269169153',
                  avatar: '256174d9f90e1c70c5602ef28efd74ab',
                  username: 'Ducko'
                },
                css: \`[class^="toolbar"] a[href^="https://support.discord.com"] {
  display: none;
}\`
              }
            ].map(x => makeBuiltin(x))
          } ];

          const snippets = channelSnippets.concat(builtinSnippets);

          class Snippet extends React.PureComponent {
            render() {
              const attach = this.props.attachments[this.props.attachments.length - 1] ?? this.props.embeds[this.props.embeds.length - 1];
              // if (!attach) return null;

              let title = this.props.content.split('\\n')[0].replaceAll('**', '').replaceAll('__', '').replace(':', '').split('.')[0].split(' (')[0].split('!')[0];
              let content = this.props.content;

              content = content.replaceAll('Preview: ', '').replaceAll('Previews: ', '').replaceAll(', instead:', '');

              if (title.length < 50 && !title.includes('\`\`\`')) {
                const cap = (str, spl) => str.split(spl).map(x => (x[0] ?? '').toUpperCase() + x.slice(1)).join(spl);
                title = cap(cap(title, ' '), '/').replace(/https\\:\\/\\/.*?( |\\n|\$)/gi, '');
                title = title.replace('Adds A', '').replace('Adds ', '').replace('Make ', '');
                content = content.split('\\n').slice(1).join('\\n');
              } else {
                title = '';
              }

              content = content.replace(/\`\`\`css(.*)\`\`\`/gs, '').replace(/https\\:\\/\\/.*?( |\\n|\$)/gi, '');

              if (this.props._title) title = this.props._title;
              if (this.props._content) content = this.props._content;

              if (!title || title.length < 8) return null;

              content = content.split('\\n').filter(x => x)[0] ?? '';
              if (content.includes('other snippets')) content = '';
              if (content) content = content[0].toUpperCase() + content.slice(1);

              const code = /\`\`\`css(.*)\`\`\`/s.exec(this.props.content)[1].trim();
              const file = title.split(' ').slice(0, 3).join('') + '.css';

              if (files[file]) return null;

              return React.createElement('div', {
                className: 'topaz-snippet'
              },
                attach ? React.createElement(((attach.type ?? attach.content_type).startsWith('video') || (attach.type ?? attach.content_type).startsWith('gifv')) ? 'video' : 'img', {
                  src: attach?.video?.proxy_url || attach.proxy_url || attach.thumbnail?.proxy_url || 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=',
                  autoPlay: true,
                  muted: true,
                  loop: true
                }) : null,

                React.createElement(LegacyHeader, {
                  tag: 'h2',
                  size: LegacyHeader.Sizes.SIZE_20
                },
                  React.createElement('span', {}, title),

                  React.createElement('div', {

                  },
                    React.createElement('img', {
                      src: \`https://cdn.discordapp.com/avatars/\${this.props.author.id}/\${this.props.author.avatar}.webp?size=24\`
                    }),

                    React.createElement('span', {}, this.props.author.username)
                  ),
                ),

                React.createElement(FormText, {
                  type: 'description'
                },
                  React.createElement(Markdown, {}, content)
                ),

                React.createElement('div', {},
                  React.createElement(Button, {
                    color: Button.Colors.BRAND,
                    look: Button.Looks.FILLED,

                    size: Button.Sizes.SMALL,

                    onClick: () => {
                      props.onChange(file, code);
                      setOpenFile(file);
                      this.forceUpdate();
                    }
                  }, 'Add'),

                  this.props.channel ? React.createElement(goosemod.webpackModules.findByDisplayName('Tooltip'), {
                    text: 'Jump to Message',
                    position: 'top'
                  }, ({ onMouseLeave, onMouseEnter }) => React.createElement(Button, {
                    color: Button.Colors.PRIMARY,
                    size: Button.Sizes.SMALL,

                    onMouseEnter,
                    onMouseLeave,

                    onClick: () => {
                      const { transitionTo } = goosemod.webpackModules.findByProps('transitionTo');
                      const { jumpToMessage } = goosemod.webpackModules.findByProps('jumpToMessage');

                      this.props.onClose();
                      document.querySelector('.closeButton-PCZcma').click();

                      transitionTo(\`/channels/\${this.props.channel.guild_id}/\${this.props.channel.id}\`);
                      jumpToMessage({ channelId: this.props.channel.id, messageId: this.props.id, flash: true });
                    }
                  },
                    React.createElement(goosemod.webpackModules.findByDisplayName('Reply'), {
                      width: '24',
                      height: '24',
                    })
                  )) : null
                )
              )
            }
          }

          class SnippetsLibrary extends React.PureComponent {
            render() {
              return [
                React.createElement(ModalStuff.ModalHeader, {},
                  React.createElement(Flex.Child, {
                    basis: 'auto',
                    grow: 1,
                    shrink: 1,
                    wrap: false,
                  },
                    React.createElement(LegacyHeader, {
                      tag: 'h2',
                      size: LegacyHeader.Sizes.SIZE_20,
                      className: 'topaz-snippets-library-header'
                    },
                      'Snippets Library',

                      React.createElement(TabBar, {
                        selectedItem,

                        type: TabBarClasses1.topPill,
                        className: [ TabBarClasses2.tabBar],

                        onItemSelect: (x) => {
                          selectedItem = x;
                          this.forceUpdate();
                        }
                      },
                        React.createElement(TabBar.Item, {
                          id: 'CSS'
                        }, 'CSS'),
                        /* React.createElement(TabBar.Item, {
                          id: 'CHANNELS',

                          className: TabBarClasses2.item
                        }, 'Your Channels'),

                        React.createElement(TabBar.Item, {
                          id: 'COMMON',

                          className: TabBarClasses2.item
                        }, 'Common'), */

                        /* React.createElement(TabBar.Item, {
                          id: 'SOURCES',

                          className: TabBarClasses2.item
                        }, 'Sources'), */
                      )
                    )
                  ),
                  React.createElement('FlexChild', {
                    basis: 'auto',
                    grow: 0,
                    shrink: 1,
                    wrap: false
                  },
                    React.createElement(ModalStuff.ModalCloseButton, {
                      onClick: this.props.onClose
                    })
                  )
                ),

                React.createElement(ModalStuff.ModalContent, {
                  className: \`topaz-modal-content\`
                },
                  React.createElement('div', {
                    className: 'topaz-snippet-container'
                  },
                    snippets.reduce((acc, x) => acc.concat(x.messages.map(y => React.createElement(Snippet, {
                      ...y,
                      channel: x.channel,
                      onClose: this.props.onClose
                    }))), [])
                  )
                )
              ];
            }
          }

          makeModal(null, null, SnippetsLibrary);
        }
      })),

      React.createElement(TabBar.Item, {
        id: '#settings',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Gear'),
        tooltipText: 'Editor Settings',
        onClick: async () => {
          const titleCase = (str) => str.split(' ').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

          makeModal('Editor Settings', [
            React.createElement(SwitchItem, {
              note: 'Enlarges settings content for larger editor',
              value: editorSettings.focusMode,
              onChange: x => {
                editorSettings.focusMode = x;
                saveEditorSettings();

                if (x) focus_enlarge();
                  else focus_revert();
              }
            }, 'Focus Mode'),

            React.createElement(FormTitle, {
              tag: 'h5'
            }, 'Theme'),

            React.createElement(SingleSelect, {
              onChange: x => {
                setTheme(x);
                saveEditorSettings();
              },
              options: [ 'vs-dark', 'vs-light', 'Dracula', 'Monokai', 'Nord', 'Twilight' ].map(x => ({
                label: titleCase(x.replace('vs-', 'VS ')),
                value: x
              })),
              value: editorSettings.theme
            })
          ]);
        }
      })),

      React.createElement(TabBar.Item, {
        id: '#reload',

        className: TabBarClasses2.item
      }, React.createElement(PanelButton, {
        icon: goosemod.webpackModules.findByDisplayName('Retry'),
        tooltipText: 'Reload Plugin',
        onClick: async () => {
          topaz.reload(plugin.__entityID);
          goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + plugin.manifest.name, 0, { duration: 5000, position: 1 }));
        }
      }))
    ),

    files[openFile] === undefined ? React.createElement('section', {
      className: 'topaz-editor-no-files',
    },
      React.createElement('div', {}, 'You have no ' + (plugin.entityID === 'snippets' ? 'snippets' : 'files')),
      React.createElement('div', {},
        'Make a ' + (plugin.entityID === 'snippets' ? 'snippet' : 'file') + ' with the',
        React.createElement(goosemod.webpackModules.findByDisplayName('PlusAlt'), {
          width: 20,
          height: 20
        }),
        'icon in the ' + (plugin.entityID === 'snippets' ? 'sidebar' : 'tabbar')
      )
    ) : React.createElement(MonacoEditor, {
      defaultValue: files[openFile],
      defaultLanguage: langs[openExt] ?? openExt,
      path: (plugin.entityID + '_' + openFile).replace(/[^A-Za-z0-9\\-_ ]/g, ''),
      saveViewState: false,

      onMount: editor => editorRef.current = editor,
      onChange: debounce(value => props.onChange(openFile, value), 500),
      theme: editorSettings.theme
    })
  );
};
})(); //# sourceURL=TopazEditor`);
    })();
  }
};

let fetchProgressCurrent = 0, fetchProgressTotal = 0;
const includeImports = async (root, code, updateProgress) => {
  if (updateProgress) {
    fetchProgressTotal++;
    updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);
  }

  // remove comments
  code = code.replaceAll(/[^:]\/\/.*$/gm, '');
  code = code.replaceAll(/\/\*[\s\S]*?\*\//gm, '').replaceAll('/*', '').replaceAll('*/', '');


  const res = await replaceAsync(code, /@(import|use|forward) (url\()?['"](.*?)['"]\)?;?/g, async (_, _1, _2, path) => {
    if (path.startsWith('sass:')) return '';

    const isExternal = path.startsWith('http');
    const basePath = (path.startsWith('./') ? '' : './') + path;
    // console.log(isExternal, isExternal ? path : join(root, basePath));

    let code;
    let resolved;
    if (isExternal) {
      if (_.includes('@import') && !_.includes('scss')) return _;

      let code = '';
      try {
        code = await fetchCache.fetch(path);
      } catch (e) {
        console.warn('failed to fetch external', code);
      }
    } else {
      const relativePath = resolvePath('.' + root.replace(transformRoot, '') + '/' + basePath.replace('./', ''));
      // console.log(root, '|', basePath, relativePath, '|', '.' + root.replace(transformRoot, '') + '/' + basePath.replace('./', ''));

      resolved = /* await resolveFileFromTree(relativePath + '.scss') ?? */ await resolveFileFromTree(relativePath) ?? await resolveFileFromTree([ ...relativePath.split('/').slice(0, -1), '_' + relativePath.split('/').pop() ].join('/'));
      code = await getCode(transformRoot, resolved);
    }

    const importRoot = isExternal ? getDir(path) : join(transformRoot, getDir(resolved));
    return await includeImports(importRoot, code, updatePending);
  });

  if (updateProgress) fetchProgressCurrent++;

  return res;
};

const transformCSS = async (root, indexRoot, code, skipTransform = false, updateProgress = false) => {
  transformRoot = root;

  if (updateProgress) {
    fetchProgressCurrent = 0;
    fetchProgressTotal = 0;
  }

  if (updateProgress) updatePending(null, 'Importing...');

  let newCode = await includeImports(indexRoot, code, updateProgress);

  if (updateProgress) updatePending(null, 'Transforming...');

  // hacks for grass bugs / missing support
  newCode = newCode.replaceAll(/\[.*?\]/g, _ => _.replaceAll('/', '\\/')); // errors when \'s are in attr selectors
  newCode = newCode.replaceAll(/rgb\(([0-9]+) ([0-9]+) ([0-9]+) \/ ([0-9]+)%\)/g, (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, 0.${a})`); // rgb(0 0 0 / 20%) -> rgba(0, 0, 0, 0.20)

  // temporarily rename css built-ins
  const builtins = [ 'hsla', 'hsl', 'rgb', 'rgba' ];
  for (const x of builtins) newCode = newCode.replaceAll(x, '_' + x);

  const start = performance.now();
  // if (!skipTransform) newCode = topaz.debug ? Glass(newCode) : grass(newCode, { style: 'expanded', quiet: true, load_paths: [''] });
  if (!skipTransform) newCode = grass(newCode, { style: 'expanded', quiet: true, load_paths: [''] });
  log('css.transform', `took ${(performance.now() - start).toFixed(2)}ms`);

  for (const x of builtins) newCode = newCode.replaceAll('_' + x, x);

  return newCode;
};


const getBuiltin = async (name) => await (await fetch('https://goosemod.github.io/topaz/src/builtins/' + name + '.js')).text();

const builtins = {
  'powercord': `module.exports = {
  entities: require('powercord/entities')
};`,
  'powercord/entities': `class Plugin {
  constructor() {
    this.stylesheets = [];
  }

  loadStylesheet(css) {
    const el = document.createElement('style');

    el.appendChild(document.createTextNode(css)); // Load the stylesheet via style element w/ CSS text

    document.head.appendChild(el);

    this.stylesheets.push(el); // Push to internal array so we can remove the elements on unload
  }

  error(...args) {
    console.error(this.entityID, ...args);
  }

  warn(...args) {
    console.warn(this.entityID, ...args);
  }

  log(...args) {
    console.log(this.entityID, ...args);
  }

  get settings() {
    return powercord.api.settings.store;
  }

  _topaz_start() {
    this.startPlugin.bind(this)();
  }

  _topaz_stop() {
    this.stylesheets.forEach((x) => x.remove());

    this.pluginWillUnload.bind(this)();
  }

  _load = this._topaz_start
  _unload = this._topaz_stop
}

module.exports = {
  Plugin
};`,
  ...['Plugin'].reduce((acc, x) => { acc[`powercord/components/settings/${x}`] = `module.exports = require('powercord/entities').${x};`; return acc; }, {}),
  'powercord/webpack': `const makeFinalFilter = (filter) => {
  if (Array.isArray(filter)) return (mod) => filter.every(p => mod.hasOwnProperty(p) || mod.__proto__?.hasOwnProperty?.(p));
  return filter;
};


module.exports = {
  getModule: (filter, retry = true, _forever = false) => { // Ignoring retry and forever arguments for basic implementation
    filter = makeFinalFilter(filter);

    const result = goosemod.webpackModules.find(filter);

    if (!retry) { // retry = false: sync, retry = true: async (returns Promise)
      return result;
    }

    return new Promise((res) => res(result));
  },

  getAllModules: (filter) => {
    filter = makeFinalFilter(filter);

    return goosemod.webpackModules.findAll(filter);
  },

  getModuleByDisplayName: (displayName) => {
    // Use custom find instead of GM's findByDisplayName as PC's is case insensitive
    return goosemod.webpackModules.find((x) => x.displayName && x.displayName.toLowerCase() === displayName.toLowerCase());
  },

  // Common

  i18n: goosemod.webpackModules.find(x => x.getLanguages && x.Messages?.ACCOUNT),

  // Auto generated by script
  messages: goosemod.webpackModules.findByProps('sendMessage', 'editMessage', 'deleteMessage'),
  typing: goosemod.webpackModules.findByProps('startTyping'),
  http: goosemod.webpackModules.findByProps('getAPIBaseURL', 'get', 'put', 'post'),
  constants: goosemod.webpackModules.findByProps('Endpoints', 'AuditLogActionTypes', 'AutoCompleteResultTypes', 'BITRATE_DEFAULT'),
  channels: goosemod.webpackModules.findByProps('getChannelId', 'getLastSelectedChannelId', 'getVoiceChannelId'),
  spotify: goosemod.webpackModules.findByProps('play', 'pause', 'fetchIsSpotifyProtocolRegistered'),
  spotifySocket: goosemod.webpackModules.findByProps('getActiveSocketAndDevice', 'getPlayerState', 'hasConnectedAccount'),
  React: goosemod.webpackModules.findByProps('createRef', 'createElement', 'Component', 'PureComponent'),
  ReactDOM: goosemod.webpackModules.findByProps('render', 'createPortal'),
  contextMenu: goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu'),
  modal: goosemod.webpackModules.findByProps('openModal', 'openModalLazy', 'closeAllModals'),
  Flux: goosemod.webpackModules.findByProps('Store', 'connectStores'),
  FluxDispatcher: goosemod.webpackModules.findByProps('_currentDispatchActionType', '_processingWaitQueue'),
  Router: goosemod.webpackModules.findByProps('BrowserRouter', 'Router'),
  hljs: goosemod.webpackModules.findByProps('initHighlighting', 'highlight'),
};`,
  'powercord/injector': `module.exports = goosemod.patcher;`,
  'powercord/util': `const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const { getOwnerInstance } = goosemod.reactUtils;

const { FluxDispatcher, constants: { Routes } } = goosemod.webpackModules.common;


module.exports = {
  sleep,

  waitFor: async (query) => {
    while (true) {
      const el = document.querySelector(query);
      if (el) return el;

      await sleep(200);
    }
  },

  forceUpdateElement: (query, all = false) => {
    for (const x of (all ? document.querySelectorAll(query) : [ document.querySelector(query) ])) {
      if (!x) continue;
      getOwnerInstance(x)?.forceUpdate?.();
    }
  },

  gotoOrJoinServer: async (inviteCode, channelId) => {
    const invite = goosemod.webpackModules.findByProps('getInvite').getInvite(inviteCode) ?? (await goosemod.webpackModules.findByProps('resolveInvite').resolveInvite(inviteCode)).invite;

    if (goosemod.webpackModules.findByProps('getGuilds').getGuilds()[invite.guild.id]) goosemod.webpackModules.findByProps('transitionTo').transitionTo(Routes.CHANNEL(invite.guild.id, channelId ? channelId : goosemod.webpackModules.findByProps('getLastSelectedChannelId').getChannelId(invite.guild.id)));
      else FluxDispatcher.dispatch({
      type: 'INVITE_MODAL_OPEN',
      context: 'APP',
      invite,
      code
    });
  },

  injectContextMenu: (injectionId, displayName, patch, before = false) => { // todo: implement

  },

  wrapInHooks: method => (...args) => {
    const { React } = goosemod.webpackModules.common;

    const { current } = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

    const useMemo = current.useMemo;
    const useState = current.useState;
    const useReducer = current.useReducer;
    const useEffect = current.useEffect;
    const useLayoutEffect = current.useLayoutEffect;
    const useRef = current.useRef;
    const useCallback = current.useCallback;
    const useContext = current.useContext;

    current.useMemo = method => method();
    current.useState = val => [ val, () => null ];
    current.useReducer = val => [ val, () => null ];
    current.useEffect = () => {};
    current.useLayoutEffect = () => {};
    current.useRef = () => ({ current: null });
    current.useCallback = cb => cb;
    current.useContext = ctx => ctx._currentValue;

    const res = method(...args);

    current.useMemo = useMemo;
    current.useState = useState;
    current.useReducer = useReducer;
    current.useEffect = useEffect;
    current.useLayoutEffect = useLayoutEffect;
    current.useRef = useRef;
    current.useCallback = useCallback;
    current.useContext = useContext;

    return res;
  },

  ...goosemod.reactUtils // Export GooseMod React utils
};`,
  'powercord/components': `const { React } = goosemod.webpackModules.common;

const allIcons = goosemod.webpackModules.findAll(x => typeof x === 'function' && x.toString().indexOf('"currentColor"') !== -1);
const Icon = (_props) => {
  const props = Object.assign({}, _props);
  delete props.name;

  return React.createElement(allIcons.find(x => x.displayName === _props.name), props);
};

Icon.Names = allIcons.map(x => x.displayName);


module.exports = {
  Icon,

  Icons: {
    FontAwesome: React.memo(props => {
      if (!document.querySelector('#fontawesome')) { // inject fontawesome when/if needed
        const el = document.createElement('link');
        el.rel = 'stylesheet';
        el.href = 'https://kit-pro.fontawesome.com/releases/v5.15.4/css/pro.min.css';
        el.id = 'fontawesome';

        document.head.appendChild(el);
      }

      const styles = {
        regular: 'r',
        light: 'l',
        duotone: 'd',
        brands: 'b'
      };

      const style = Object.keys(styles).find(x => props.icon.includes(x));

      return React.createElement('div', {
        className: \`\${styles[style] ? \`fa\${styles[style]}\` : 'fas'} fa-fw fa-\${props.icon.replace(\`-\${style}\`, '')} \${props.className}\`.trim()
      });
    }),

    Pin: React.memo(props => React.createElement('svg', {
      viewBox: "0 0 24 24",
      ...props
    },
      React.createElement('path', {
        fill: 'currentColor',
        d: 'M19 3H5V5H7V12H5V14H11V22H13V14H19V12H17V5H19V3Z'
      })
    ))
  },


  Clickable: goosemod.webpackModules.findByDisplayName('Clickable'),
  Button: goosemod.webpackModules.findByProps('DropdownSizes'),

  Card: goosemod.webpackModules.findByDisplayName('Card'),
  Spinner: goosemod.webpackModules.findByDisplayName('Spinner'),

  HeaderBar: goosemod.webpackModules.findByDisplayName('HeaderBar'),
  TabBar: goosemod.webpackModules.findByDisplayName('TabBar'),

  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer').TooltipContainer,

  FormTitle: goosemod.webpackModules.findByDisplayName('FormTitle'),
  FormNotice: goosemod.webpackModules.findByDisplayName('FormNotice'),
  Text: goosemod.webpackModules.findByDisplayName('LegacyText'),
  Flex: goosemod.webpackModules.findByDisplayName('Flex'),

  AdvancedScrollerThin: goosemod.webpackModules.findByProps('AdvancedScrollerThin').AdvancedScrollerThin,
  AdvancedScrollerAuto: goosemod.webpackModules.findByProps('AdvancedScrollerAuto').AdvancedScrollerAuto,
  AdvancedScrollerNone: goosemod.webpackModules.findByProps('AdvancedScrollerNone').AdvancedScrollerNone,

  Menu: goosemod.webpackModules.findByProps('MenuGroup'),

  AsyncComponent: require('powercord/components/AsyncComponent'),
  settings: require('powercord/components/settings'),
  modal: require('powercord/components/modal'),
  ContextMenu: require('powercord/components/ContextMenu')
};`,
  'powercord/components/settings': `const { React } = goosemod.webpackModules.common;
const OriginalSwitchItem = goosemod.webpackModules.findByDisplayName('SwitchItem');

const OriginalFormItem = goosemod.webpackModules.findByDisplayName('FormItem');
const OriginalFormText = goosemod.webpackModules.findByDisplayName('FormText');

const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Margins = goosemod.webpackModules.findByProps('marginTop20', 'marginBottom20');
const FormClasses = goosemod.webpackModules.findByProps('formText', 'description');

const FormText = goosemod.webpackModules.findByDisplayName('FormText');

const FormDivider = goosemod.webpackModules.findByDisplayName('FormDivider');
const SettingsFormClasses = goosemod.webpackModules.findByProps('dividerDefault', 'titleDefault');

const OriginalTextInput = goosemod.webpackModules.findByDisplayName('TextInput');
const OriginalSlider = goosemod.webpackModules.findByDisplayName('Slider');

const SelectTempWrapper = goosemod.webpackModules.findByDisplayName('SelectTempWrapper');

const OriginalRadioGroup = goosemod.webpackModules.findByDisplayName('RadioGroup');

const Tooltip = goosemod.webpackModules.findByDisplayName('Tooltip');
const Button = goosemod.webpackModules.findByProps('DropdownSizes');

class Divider extends React.PureComponent {
  render() {
    return React.createElement(FormDivider, {
      className: SettingsFormClasses.dividerDefault
    });
  }
}

class FormItem extends React.PureComponent {
  render() {
    return React.createElement(OriginalFormItem, {
        title: this.props.title,
        required: this.props.required,
        className: [Flex.Direction.VERTICAL, Flex.Justify.START, Flex.Align.STRETCH, Flex.Wrap.NO_WRAP, Margins.marginBottom20].join(' '),
        onClick: () => {
          this.props.onClick?.();
        }
      },

      this.props.children,

      this.props.note && React.createElement(OriginalFormText, {
        className: FormClasses.description + (this.props.noteHasMargin ? (' ' + Margins.marginTop8) : '')
      }, this.props.note),

      React.createElement(Divider)
    );
  }
}

module.exports = {
  SwitchItem: OriginalSwitchItem,

  TextInput: class TextInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required,

          noteHasMargin: true
        },

        React.createElement(OriginalTextInput, {
          ...this.props
        })
      );
    }
  },

  SliderInput: class SliderInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required
        },

        React.createElement(OriginalSlider, {
          ...this.props,
          className: \`\${this.props.className ?? ''} \${Margins.marginTop20}\`
        })
      );
    }
  },

  SelectInput: class SelectInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required,

          noteHasMargin: true
        },

        React.createElement(SelectTempWrapper, {
          ...this.props
        })
      );
    }
  },

  RadioGroup: class RadioGroup extends React.PureComponent {
    render() {
      return React.createElement(FormItem, {
          title: this.props.children,
          note: this.props.note,
          required: this.props.required
        },

        React.createElement(OriginalRadioGroup, {
          ...this.props
        })
      );
    }
  },

  ButtonItem: class ButtonItem extends React.PureComponent {
    render() {
      return React.createElement(FormItem, {
        title: this.props.children
      },
        this.props.note && React.createElement(OriginalFormText, { // note here so it's before button
          className: FormClasses.description
        }, this.props.note),

        React.createElement(Tooltip, {
          text: this.props.tooltipText,
          position: this.props.tooltipPosition,
          shouldShow: this.props.tooltipText !== undefined
        },
          () => React.createElement(Button, {
            color: this.props.success ? Button.Colors.GREEN : (this.props.color ?? Button.Colors.BRAND),
            disabled: this.props.disabled,
            onClick: () => this.props.onClick(),
            style: {
              marginLeft: 5
            }
          }, this.props.button)
        )
      );
    }
  },

  Category: class Category extends React.PureComponent {
    render() {
      const children = this.props.opened ? this.props.children : [];

      return React.createElement(FormItem, {
          title: React.createElement('div', {},
            React.createElement('svg', {
              xmlns: "http://www.w3.org/2000/svg",
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              style: {
                transform: this.props.opened ? 'rotate(90deg)' : '',
                marginRight: '10px'
              }
            },
              React.createElement('path', {
                fill: 'var(--header-primary)',
                d: 'M9.29 15.88L13.17 12 9.29 8.12c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0l4.59 4.59c.39.39.39 1.02 0 1.41L10.7 17.3c-.39.39-1.02.39-1.41 0-.38-.39-.39-1.03 0-1.42z'
              }),
            ),

            React.createElement('label', {
              class: FormClasses.title,
              style: {
                textTransform: 'none',
                display: 'inline',
                verticalAlign: 'top',
              }
            },
              this.props.name,

              React.createElement(FormText, {
                className: FormClasses.description,
                style: {
                  marginLeft: '34px'
                }
              }, this.props.description)
            ),
          ),

          onClick: () => {
            this.props.onChange(!this.props.opened);
          }
        },

        ...children
      );
    }
  },

  FormItem,
  Divider
};`,
  ...['FormItem'].reduce((acc, x) => { acc[`powercord/components/settings/${x}`] = `module.exports = require('powercord/components/settings').${x};`; return acc; }, {}),
  'powercord/components/modal': `const { React } = goosemod.webpackModules.common;

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
};`,
  'powercord/components/AsyncComponent': `const { React } = goosemod.webpackModules.common;

class AsyncComponent extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {};
  }

  async componentDidMount () {
    this.setState({
      comp: await this.props._provider()
    });
  }

  render () {
    const { comp } = this.state;
    if (comp) return React.createElement(comp, {
      ...this.props,
      ...this.props._pass
    });

    return this.props._fallback ?? null;
  }

  static from (prov, _fallback) {
    return React.memo(
      props => React.createElement(AsyncComponent, {
        _provider: () => prov,
        _fallback,
        ...props
      })
    );
  }

  static fromDisplayName (name, fallback) {
    return AsyncComponent.from(goosemod.webpackModules.findByDisplayName(name), fallback);
  }

  static fromModule (filter, fallback) {
    return AsyncComponent.from(goosemod.webpackModules.find(filter), fallback);
  }

  static fromModuleProp (filter, key, fallback) {
    return AsyncComponent.from((async () => (await goosemod.webpackModules.find(filter))[key])(), fallback);
  }
}


const Flux = goosemod.webpackModules.findByProps('Store', 'connectStores');

// jank Flux addition because yes
Flux.connectStoresAsync = (stores, callback) => comp => AsyncComponent.from((async () => {
  const ret = await Promise.all(stores);
  return Flux.connectStores(ret, p => callback(ret, p))(comp);
})());

module.exports = AsyncComponent;`,
  'powercord/components/ContextMenu': `// based on https://github.com/powercord-org/powercord/blob/v2/src/fake_node_modules/powercord/components/ContextMenu.jsx
const { React } = goosemod.webpackModules.common;

const { closeContextMenu } = goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu');
const { default: Menu, MenuGroup, MenuItem, MenuCheckboxItem, MenuControlItem } = goosemod.webpackModules.findByProps('MenuCheckboxItem');
const Slider = goosemod.webpackModules.find(m => m.render && m.render.toString().includes('sliderContainer'));


class ContextMenu extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {};
  }

  static renderRawItems (items) {
    return (new ContextMenu()).renderItems(items, {
      standalone: true,

      depth: 0,
      group: 0,
      i: 0
    });
  }

  render () {
    if (this.props.items) {
      return this.renderItems(this.props.items, {
        depth: 0,
        group: 0,
        i: 0
      });
    }

    return React.createElement(Menu, {
      navId: this.props.navId ?? \`pc-\${Math.random().toString().slice(2)}\`,
      onClose: closeContextMenu
    },
      ...this.props.itemGroups.map((items, i) => (
        React.createElement(MenuGroup, {},
          ...this.renderItems(items, {
            depth: 0,
            group: i,
            i: 0
          })
        )
      ))
    );
  }

  renderItems (items, ctx) {
    return items.map(item => {
      ctx.i++;

      switch (item.type) {
        case 'button': return this.renderButton(item, ctx);
        case 'checkbox': return this.renderCheckbox(item, ctx);
        case 'slider': return this.renderSlider(item, ctx);
        case 'submenu': return this.renderSubMenu(item, ctx);

        default: return null;
      }
    });
  }

  renderButton (item, ctx) {
    return React.createElement(MenuItem, {
      id: item.id ?? \`item-\${ctx.group}-\${ctx.depth}-\${ctx.i}\`,

      disabled: item.disabled,
      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext,

      action: () => {
        if (!item.disabled) item.onClick?.();
      }}
    );
  }

  renderCheckbox (item, ctx) {
    const elementKey = \`active-\${ctx.group}-\${ctx.depth}-\${ctx.i}\`;
    const active = this.state[elementKey] !== void 0
      ? this.state[elementKey]
      : item.defaultState;

    return React.createElement(MenuCheckboxItem, {
      id: item.id ?? \`item-\${ctx.group}-\${ctx.depth}-\${ctx.i}\`,

      checked: active,
      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext,

      action: e => {
        const newActive = !active;

        if (item.onToggle) {
          item.onToggle(newActive);
        }

        if (ctx.standalone) {
          const el = e.target.closest('[role="menu"]');
          setImmediate(() => goosemod.reactUtils.getOwnerInstance(el).forceUpdate());
        } else {
          this.setState({ [elementKey]: newActive });
        }
      }
    });
  }

  renderSlider (item, ctx) {
    return React.createElement(MenuControlItem, {
      id: item.id ?? \`item-\${ctx.group}-\${ctx.depth}-\${ctx.i}\`,

      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext,

      control: (props, ref) => React.createElement(Slider, {
        mini,
        ref,
        equidistant: typeof item.markers !== 'undefined',
        stickToMarkers: typeof item.markers !== 'undefined',
        ...props,
        ...item
      })
    });
  }

  renderSubMenu (item, ctx) {
    const elementKey = \`items-\${ctx.group}-\${ctx.depth}-\${ctx.i}\`;

    let items = this.state[elementKey];
    if (items === void 0) {
      items = item.getItems();
      this.setState({ [elementKey]: items });

      if (items instanceof Promise) {
        items.then(fetchedItems => this.setState({ [elementKey]: fetchedItems }));
      }
    }

    return React.createElement(MenuItem, {
      id: item.id ?? \`item-\${ctx.group}-\${ctx.depth}-\${ctx.i}\`,

      disabled: !items || !items.length || item.disabled,
      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext
    },
      items && items.length > 0 && !item.disabled && this.renderItems(items, {
        depth: ctx.depth + 1,
        group: 0,
        i: 0
      })
    );
  }
}

module.exports = ContextMenu;`,
  'powercord/modal': `const modalManager = goosemod.webpackModules.findByProps('openModal', 'updateModal');
const Modal = goosemod.webpackModules.findByProps('ModalRoot');
const { React } = goosemod.webpackModules.common;

let lastId;
module.exports = {
  open: (comp) => {
    if (comp.toString().toLowerCase().includes('changelog')) return console.warn('Ignoring modal open for changelog');

    return lastId = modalManager.openModal(props => React.createElement(Modal.ModalRoot, {
      ...props,
      className: 'topaz-pc-modal-jank'
    }, React.createElement(comp)))
  },

  close: () => modalManager.closeModal(lastId),

  closeAll: () => modalManager.closeAllModals()
};`,
  'powercord/http': `class Request {
  constructor(method, url) {
    this.method = method;
    this.url = url;

    this.data = null;
    this.headers = {};
    this.query = {};
  }

  set(key, value) { // set header
    this.headers[key] = value;
    return this;
  }

  query(key, value) { // set query param
    this.query[key] = value;
    return this;
  }

  send(body) { // set post data
    this.body = body;
    return this;
  }

  execute() {
    return new Promise(async (res, _rej) => {
      const rej = err => console.error(err) || _rej(err);

      let url = this.url;

      if (Object.keys(this.query).length > 0) {
        url += '?' + new URLSearchParams(this.query).toString();
      }

      const opts = {
        method: this.method,
        headers: this.headers
      };

      if (this.body) opts.body = this.headers['Content-Type'] === 'application/x-www-form-urlencoded' ? new URLSearchParams(this.body) : JSON.stringify(this.body);

      topaz.log('powercord.http', 'fetch', url, opts);

      const resp = await fetch(url, opts).catch(e => {
        if (e.stack.startsWith('TypeError')) { // possible CORS error, try with our CORS proxy
          console.warn('Failed to fetch', url, '- trying CORS proxy');
          return fetch(\`https://topaz-cors.goosemod.workers.dev/?\` + url);
        }
      });

      const body = await resp.text().catch(rej);

      topaz.log('powercord.http', 'fetch', resp, body);

      const ret = {
        raw: body,
        body: resp.headers.get('Content-Type').includes('application/json') ? JSON.parse(body) : body,

        ok: resp.status >= 200 && resp.status < 400,
        statusCode: resp.status,
        statusText: resp.statusText,
        headers: Object.fromEntries(resp.headers)
      };

      if (ret.ok) res(ret);
        else rej(Object.assign(new Error(resp.status + ' ' + resp.statusText), ret));
    });
  }

  then(res, rej) {
    if (this._res) return this._res.then(res, rej);

    return this._res = this.execute().then(res, rej);
  }

  catch(rej) {
    return this.then(null, rej);
  }
}

module.exports = [ 'get', 'post', 'put', 'del', 'head' ].reduce((acc, x) => { acc[x] = (url) => new Request(x === 'del' ? 'DELETE' : x.toUpperCase(), url); return acc; }, {});`,
  'powercord/constants': `module.exports = {
  WEBSITE: '',
  I18N_WEBSITE: '',
  REPO_URL: '',

  SETTINGS_FOLDER: '/home/topaz/powercord/settings',
  CACHE_FOLDER: '/home/topaz/powercord/settings',
  LOGS_FOLDER: '/home/topaz/powercord/settings',

  DISCORD_INVITE: 'neMncS2', // mock topaz ones
  GUILD_ID: '756146058320674998',
  SpecialChannels: [ 'KNOWN_ISSUES', 'SUPPORT_INSTALLATION', 'SUPPORT_PLUGINS', 'SUPPORT_MISC', 'STORE_PLUGINS', 'STORE_THEMES', 'CSS_SNIPPETS', 'JS_SNIPPETS' ].reduce((acc, x) => { acc[x] = '944004406536466462'; return acc; }, {})
};`,
  'powercord/global': `let powercord;

(() => {
const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;

const fluxPrefix = 'topaz_pc_settings_' + __entityID.replace(/[^A-Za-z0-9]/g, '_');
const FluxActions = {
  UPDATE_SETTINGS: fluxPrefix + '_update_settings',
  TOGGLE_SETTING: fluxPrefix + '_toggle_setting',
  UPDATE_SETTING: fluxPrefix + '_update_setting',
  DELETE_SETTING: fluxPrefix + '_delete_setting',
};

class SettingsStore extends Flux.Store {
  constructor (Dispatcher, handlers) {
    super(Dispatcher, handlers);
    this._store = JSON.parse(topaz.storage.get(__entityID + '_pc', '{}') ?? {});
  }

  onChange() {
    topaz.storage.set(__entityID + '_pc', JSON.stringify(this._store));
  }

  getSetting = (key, def) => {
    let out = this._store;

    for (const k of key.split('.')) {
      out = out[k];
    }

    return out ?? def;
  }

  updateSetting = (key, value) => {
    if (value === undefined) return this.deleteSetting(key);

    this._store[key] = value;

    this.onChange();

    return this._store[key];
  }

  toggleSetting = (key, def) => {
    return this.updateSetting(key, !(this._store[key] ?? def));
  }

  deleteSetting = (key) => {
    delete this._store[key];

    this.onChange();
  }

  getKeys = () => Object.keys(this._store)

  // alt names for other parts
  get = this.getSetting
  set = this.updateSetting
  delete = this.deleteSetting

  connectStore = connectStore
}

const connectStore = (comp) => Flux.connectStores([ settingStore ], () => ({
  settings: settingStore.store,
  getSetting: settingStore.getSetting,

  updateSetting: (setting, value) => {
    FluxDispatcher.dispatch({
      type: FluxActions.UPDATE_SETTING,
      setting,
      value
    });
  },

  toggleSetting: (setting, defaultValue) => {
    FluxDispatcher.dispatch({
      type: FluxActions.TOGGLE_SETTING,
      setting,
      defaultValue
    });
  },

  deleteSetting: (setting) => {
    FluxDispatcher.dispatch({
      type: FluxActions.DELETE_SETTING,
      setting
    });
  }
}))(comp);

const settingStore = new SettingsStore(FluxDispatcher, { // always return true to update properly
  [FluxActions.TOGGLE_SETTING]: ({ setting, defaultValue }) => settingStore.toggleSetting(setting, defaultValue) || true,
  [FluxActions.UPDATE_SETTING]: ({ setting, value }) => settingStore.updateSetting(setting, value) || true,
  [FluxActions.DELETE_SETTING]: ({ setting }) => settingStore.deleteSetting(setting) || true
});

const settingsUnpatch = {};
const i18nMessages = {};

const i18n = goosemod.webpackModules.find(x => x.getLanguages && x.Messages?.ACCOUNT);
const locale = () => goosemod.webpackModules.findByProps('getLocaleInfo').getLocale();
const updateI18n = () => {
  const parent = i18n._provider?._context ?? i18n._proxyContext;
  let { messages, defaultMessages } = parent;

  Object.defineProperty(parent, 'messages', {
    enumerable: true,
    get: () => messages,
    set: o => messages = Object.assign(o, i18nMessages[locale()])
  });

  Object.defineProperty(parent, 'defaultMessages', {
    enumerable: true,
    get: () => defaultMessages,
    set: o => defaultMessages = Object.assign(o, i18nMessages['en-US'])
  });

  parent.messages = messages;
  parent.defaultMessages = defaultMessages;
};

const updateOpenSettings = async () => {
  try {
    await new Promise((res) => setTimeout(res, 100));

    if (topaz.__reloading || !document.querySelector('.selected-g-kMVV[aria-controls="topaz-tab"]')) return;

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch (_e) { }
};


powercord = {
  api: {
    commands: {
      registerCommand: ({ command, alias, description, usage, executor }) => {
        const { getChannelId } = goosemod.webpackModules.findByProps('getChannelId', 'getVoiceChannelId');

        // TODO: implement alias

        goosemod.patcher.commands.add(command, description,
          async (ret) => {
            // Don't just destructure as using without text arguments returns empty object ({})

            let textGiven = '';
            if (ret[0]?.value) {
              const [{ value: text }] = ret;
              textGiven = text;
            }

            const out = await executor(textGiven.split(' ')); // Run original executor func (await incase it's an async function)

            if (!out) return;
            if (!out.send) {
              goosemod.patcher.internalMessage(out.result); // PC impl. sends internal message when out.send === false, so we also do the same via our previous Patcher API function
              return;
            }


            // When send is true, we send it as a message via sendMessage

            goosemod.webpackModules.findByProps('sendMessage', 'receiveMessage')['sendMessage'](getChannelId(), {
              content: out.result,

              tts: false,
              invalidEmojis: [],
              validNonShortcutEmojis: []
            });
          }, [
          { type: 3, required: false, name: 'args', description: 'Arguments for PC command' } // Argument for any string for compat. with PC's classical commands
        ]);
      },

      unregisterCommand: (command) => {
        goosemod.patcher.commands.remove(command);
      }
    },

    settings: {
      registerSettings: (id, { label, render, category }) => {
        const { React } = goosemod.webpackModules.common;

        const SettingsView = goosemod.webpackModules.findByDisplayName('SettingsView');

        const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
        const FormSection = goosemod.webpackModules.findByDisplayName('FormSection');

        if (!SettingsView) return;

        topaz.internal.registerSettings(__entityID, {
          render: connectStore(render)
        });

        settingsUnpatch[id] = goosemod.patcher.patch(SettingsView.prototype, 'getPredicateSections', (_, sections) => {
          const logout = sections.find((c) => c.section === 'logout');
          if (!logout || !topaz.settings.pluginSettingsSidebar) return sections;

          const finalLabel = typeof label === 'function' ? label() : label;

          sections.splice(sections.indexOf(logout) - 1, 0, {
            section: finalLabel,
            label: finalLabel,
            predicate: () => { },
            element: () => React.createElement(FormSection, { },
              React.createElement(FormTitle, { tag: 'h2' }, finalLabel),

              React.createElement(render, {
                ...settingStore
              })
            )
          });

          return sections;
        });

        updateOpenSettings();
      },

      unregisterSettings: (id) => {
        if (!settingsUnpatch[id]) return;

        settingsUnpatch[id]();

        settingsUnpatch[id] = null;
        delete settingsUnpatch[id];

        updateOpenSettings();
      },

      store: settingStore,
      _fluxProps: (_id) => ({
        settings: settingStore.store,
        getSetting: (key, defaultValue) => settingStore.getSetting(key, defaultValue),
        updateSetting: (key, value) => settingStore.updateSetting(key, value),
        toggleSetting: (key, defaultValue) => settingStore.toggleSetting(key, defaultValue)
      }),
      connectStores: (_id) => connectStore
    },

    notices: {
      sendToast: (_id, { header, content, type, buttons, timeout }) => goosemod.showToast(content, { subtext: header, type, timeout }), // todo: improve to use all given
      sendAnnouncement: (_id, { color, message, button: { text: buttonText, onClick } }) => goosemod.patcher.notices.patch(message, buttonText, onClick, color ?? 'brand'),
    },

    i18n: {
      loadAllStrings: (obj) => { // todo: re-add on locale change
        for (const locale in obj) {
          i18nMessages[locale] = {
            ...(i18nMessages[locale] ?? {}),
            ...obj[locale]
          };
        }

        updateI18n();
      }
    },

    connections: {
      fetchAccounts: async (user) => {
        return undefined;
      }
    }
  },

  pluginManager: {
    get: x => {
      topaz.log('powercord.pluginManager.get', x);
      return topaz.internal.plugins[__entityID];
    }
  },

  account: null,
  fetchAccount: async () => {}
};


})();`,

  '@goosemod/patcher': `module.exports = goosemod.patcher;`,
  '@goosemod/webpack': `module.exports = goosemod.webpackModules;`,
  '@goosemod/webpack/common': `module.exports = goosemod.webpackModules.common;`,
  '@goosemod/logger': `module.exports = goosemod.logger;`,
  '@goosemod/reactUtils': `module.exports = goosemod.reactUtils;`,
  '@goosemod/toast': `module.exports = goosemod.showToast;`,
  '@goosemod/settings': `module.exports = goosemod.settings;`,
  '@goosemod/plugin': `module.exports = class Plugin {
  constructor() {
    this.patches = [];
    this.commands = [];
    this.stylesheets = [];
  }

  command(...args) {
    this.commands.push(args[0]);

    goosemod.patcher.commands.add(...args);
  }

  enqueueUnpatch(unpatch) {
    this.patches.push(unpatch);
  }

  addCss(css) {
    const el = document.createElement('style');

    el.appendChild(document.createTextNode(css)); // Load the stylesheet via style element w/ CSS text

    document.head.appendChild(el);

    this.stylesheets.push(el); // Push to internal array so we can remove the elements on unload
  }

  toast(content, options) {
    goosemod.showToast(content, {
      subtext: this.name,
      ...options
    });
  }

  goosemodHandlers = {
    onImport: () => {
      this.onImport();
    },

    onRemove: () => {
      this.patches.forEach((x) => x());
      this.stylesheets.forEach((x) => x.remove());
      this.commands.forEach((x) => commands.remove(x));

      this.onRemove?.();
    }
  }
}`,
  'goosemod/global': '',

  'betterdiscord/global': `let BdApi;
(() => {
const cssEls = {};
const unpatches = {};

const Webpack = goosemod.webpackModules;
const { React } = Webpack.common;

const i18n = Webpack.findByPropsAll('Messages')[1];

const dataLSId = (id) => __entityID + '_bd_' + id;
const bindPatch = (func, unpatch) => func.bind({ unpatch }); // Overriding props in original this, better way?

const makeAddonAPI = (id) => ({
  folder: \`/topaz/\${id}\`, // fake/mock folder

  isEnabled: (x) => false,
  enable: (x) => {},
  disable: (x) => {},
  toggle: (x) => {},
  reload: (x) => {},
  get: (x) => {
    switch (x) {
      case 'ZeresPluginLibrary': return { // temporary https://github.com/programmer2514/BetterDiscord-CollapsibleUI/blob/main/CollapsibleUI.plugin.js#L481
        version: '',
        exports: ZeresPluginLibrary,
        instance: {}
      };
    }

    return undefined;
  },
  getAll: () => ([])
});


const showConfirmationModal = async (title, content, { onConfirm, onCancel, confirmText = i18n.Messages.OKAY, cancelText = i18n.Messages.CANCEL, danger, key } = {}) => {
  const Text = Webpack.findByDisplayName("Text");
  const Markdown = Webpack.find((x) => x.displayName === 'Markdown' && x.rules);
  const ButtonColors = Webpack.findByProps('button', 'colorRed');

  const res = await new Promise((res) => Webpack.findByProps('openModal', 'updateModal').openModal(e => {
    if (e.transitionState === 3) res(false);

    return React.createElement(Webpack.findByDisplayName("ConfirmModal"), {
      header: title,
      confirmText,
      cancelText,
      confirmButtonColor: ButtonColors[danger ? 'colorRed' : 'colorBrand'],
      onClose: () => res(false), // General close (?)
      onCancel: () => { // Cancel text
        res(false);
        e.onClose();
      },
      onConfirm: () => { // Confirm button
        res(true);
        e.onClose();
      },
      transitionState: e.transitionState
    },
      ...content.split('\\n').map((x) => React.createElement(Markdown, {
        size: Text.Sizes.SIZE_16
      }, x))
    );
  }, { modalKey: key }));

  if (res) onConfirm?.();
    else onCancel?.();
};

BdApi = window.BdApi = {
  findModule: Webpack.find,
  findAllModules: Webpack.findAll,
  findModuleByProps: Webpack.findByProps,
  findModuleByDisplayName: Webpack.findByDisplayName,

  getInternalInstance: goosemod.reactUtils.getReactInstance,

  injectCSS: (id, css) => {
    const el = document.createElement('style');

    el.appendChild(document.createTextNode(css)); // Load the stylesheet via style element w/ CSS text

    document.head.appendChild(el);

    cssEls[id] = el;
  },

  clearCSS: (id) => {
    if (!cssEls[id]) return;

    cssEls[id].remove();

    cssEls[id] = undefined;
    delete cssEls[id];
  },


  loadData: (id, key) => JSON.parse(topaz.storage.get(dataLSId(id)) ?? '{}')[key],
  getData: (...args) => BdApi.loadData(...args), // alias

  saveData: (id, key, value) => {
    const lsId = dataLSId(id);
    const data = JSON.parse(topaz.storage.get(lsId) ?? '{}');

    data[key] = value;

    topaz.storage.set(lsId, JSON.stringify(data));

    return data[key];
  },
  setData: (...args) => BdApi.saveData(...args), // alias

  deleteData: (id, key) => {
    const lsId = dataLSId(id);
    const data = JSON.parse(topaz.storage.get(lsId) ?? '{}');

    data[key] = undefined;
    delete data[key];

    topaz.storage.set(lsId, JSON.stringify(data));

    return data[key];
  },

  isSettingEnabled: (...path) => true,
  disableSetting: (...path) => {},
  enableSetting: (...path) => {},


  showConfirmationModal,
  alert: (title, content) => showConfirmationModal(title, content, { cancelText: null }),

  Patcher: {
    instead: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return bindPatch(patch, unpatch)(this, args, original); }, false, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    before: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args) { return bindPatch(patch, unpatch)(this, args); }, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    after: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return bindPatch(patch, unpatch)(this, args, ret); }, false);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    unpatchAll: (id) => {
      let arr = id;
      if (typeof id === 'string') arr = unpatches[id] ?? [];

      arr.forEach(x => x());
      if (typeof id === 'string') unpatches[id] = [];
    }
  },

  Plugins: makeAddonAPI('plugins'),
  Themes: makeAddonAPI('themes'),

  React: Webpack.common.React,
  ReactDOM: Webpack.common.ReactDOM
};
})();`,

  get 'betterdiscord/libs/zeres'() { // patch official
    return new Promise(async res => {
      const out = (await fetchCache.fetch('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js'))
        .replace('static async hasUpdate(updateLink) {', 'static async hasUpdate(updateLink) { return Promise.resolve(false);') // disable updating
        .replace('this.listeners = new Set();', 'this.listeners = {};') // webpack patches to use our API
        .replace('static addListener(listener) {', `static addListener(listener) {
console.log("addListener", listener);
const id = Math.random().toString().slice(2);

let lastLength = 0;
const int = setInterval(() => {
  const all = goosemod.webpackModules.all();
  if (lastLength === all.length) return;
  lastLength = all.length;

  console.log('CHECK', lastLength, all.length, listener);

  for (const m of all) { if (m) listener(m); }
}, 5000);

listener._listenerId = id;
return this.listeners[id] = () => {
  clearInterval(int);
  delete this.listeners[listener._listenerId];
};`)
        .replace('static removeListener(listener) {', 'static removeListener(listener) { this.listeners[listener._listenerId]?.(); return;')
        .replace('static getModule(filter, first = true) {', `static getModule(filter, first = true) { return goosemod.webpackModules[first ? 'find' : 'findAll'](filter);`)
        .replace('static getByIndex(index) {', 'static getByIndex(index) { return goosemod.webpackModules.findByModuleId(index);')
        .replace('static getAllModules() { return goosemod.webpackModules.all().reduce((acc, x, i) => { acc[i] = x; return acc; }, {});')
        .replace('static pushChildPatch(caller, moduleToPatch, functionName, callback, options = {}) {', `static pushChildPatch(caller, moduleToPatch, functionName, callback, options = {}) { return BdApi.Patcher[options.type ?? 'after'](caller, this.resolveModule(moduleToPatch), functionName, callback);`) // use our patcher
        .replace('module.exports.ZeresPluginLibrary = __webpack_exports__["default"];', '(new __webpack_exports__["default"]).load();') // load library on creation, disable export
        .replace('this.__ORIGINAL_PUSH__ = window[this.chunkName].push;', 'return;') // disable webpack push patching
        .replace('showChangelog(footer) {', 'showChangelog(footer) { return;') // disable changelogs
        .replace(/changelog: \[[\s\S]*?\],/, ''); // remove lib's own changelog

      delete builtins['betterdiscord/libs/zeres']; // overwrite getter with output
      builtins['betterdiscord/libs/zeres'] = out;

      res(out);
    });
  },

  get 'betterdiscord/libs/bdfdb'() {
    return new Promise(async res => {
      const out = (await fetchCache.fetch('https://raw.githubusercontent.com/mwittrien/BetterDiscordAddons/master/Library/0BDFDB.plugin.js'))
        .replace('BDFDB.PluginUtils.hasUpdateCheck = function (url) {', 'BDFDB.PluginUtils.hasUpdateCheck = function (url) { return false;') // disable updates
        .replace('BDFDB.PluginUtils.checkUpdate = function (pluginName, url) {', 'BDFDB.PluginUtils.checkUpdate = function (pluginName, url) { return Promise.resolve(0);')
        .replace('BDFDB.PluginUtils.showUpdateNotice = function (pluginName, url) {', 'BDFDB.PluginUtils.showUpdateNotice = function (pluginName, url) { return;')
        .replace('let all = typeof config.all != "boolean" ? false : config.all;', `let all = typeof config.all != "boolean" ? false : config.all;
let out = goosemod.webpackModules[all ? 'findAll' : 'find'](m => filter(m) || (m.type && filter(m.type)));
if (out) out = filter(out) ?? out;
return out;`) // use our own webpack
        .replace('Internal.getWebModuleReq = function () {', 'Internal.getWebModuleReq = function () { return Internal.getWebModuleReq.req = () => {};')
        .replace('this && this !== window', 'this && !this.performance')
        .replace('const chunkName = "webpackChunkdiscord_app";', `
const moduleHandler = (exports) => {
  const removedTypes = [];
  for (const type in PluginStores.chunkObserver) {
    const foundModule = PluginStores.chunkObserver[type].filter(exports) || exports.default && PluginStores.chunkObserver[type].filter(exports.default);
    if (foundModule) {
      Internal.patchComponent(PluginStores.chunkObserver[type].query, PluginStores.chunkObserver[type].config.exported ? foundModule : exports, PluginStores.chunkObserver[type].config);
      removedTypes.push(type);
      break;
    }
  }
  while (removedTypes.length) delete PluginStores.chunkObserver[removedTypes.pop()];
  let found = false, funcString = exports && exports.default && typeof exports.default == "function" && exports.default.toString();
  if (funcString && funcString.indexOf(".page") > -1 && funcString.indexOf(".section") > -1 && funcString.indexOf(".objectType") > -1) {
    const returnValue = exports.default({});
    if (returnValue && returnValue.props && returnValue.props.object == BDFDB.DiscordConstants.AnalyticsObjects.CONTEXT_MENU) {
      for (const type in PluginStores.contextChunkObserver) {
        if (PluginStores.contextChunkObserver[type].filter(returnValue.props.children)) {
          exports.__BDFDB_ContextMenuWrapper_Patch_Name = exports.__BDFDB_ContextMenu_Patch_Name;
          found = true;
          if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
          for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
          break;
        }
      }
    }
  }
  if (!found) for (const type in PluginStores.contextChunkObserver) {
    if (PluginStores.contextChunkObserver[type].filter(exports)) {
      if (PluginStores.contextChunkObserver[type].modules.indexOf(exports) == -1) PluginStores.contextChunkObserver[type].modules.push(exports);
      for (const plugin of PluginStores.contextChunkObserver[type].query) Internal.patchContextMenu(plugin, type, exports);
      break;
    }
  }
};

const int = setInterval(() => {
  // for (const m of goosemod.webpackModules.all()) { if (m) moduleHandler(m); }
}, 5000);

for (const m of goosemod.webpackModules.all()) { if (m) moduleHandler(m); }

Internal.removeChunkObserver = () => clearInterval(int);
return;`)
        .replace(/\}\)\(\);\n$/, `})();
(new module.exports()).load();`); // make and load it

      delete builtins['betterdiscord/libs/bdfdb']; // overwrite getter with output
      builtins['betterdiscord/libs/bdfdb'] = out;

      res(out);
    });
  },

  'drdiscord/global': `let DrApi;

(() => {
const unpatches = {};

const dataLSId = (id) => __entityID + '_dr_' + id;


DrApi = {
  webpack: {
    getModuleByProps: goosemod.webpackModules.findByProps
  },

  storage: {
    loadData: (id, key) => JSON.parse(topaz.storage.get(dataLSId(id)) ?? '{}')[key],
    getData: (...args) => BdApi.loadData(...args), // alias

    saveData: (id, key, value) => {
      const lsId = dataLSId(id);
      const data = JSON.parse(topaz.storage.get(lsId) ?? '{}');

      data[key] = value;

      topaz.storage.set(lsId, JSON.stringify(data));

      return data[key];
    },
    setData: (...args) => BdApi.saveData(...args), // alias

    deleteData: (id, key) => {
      const lsId = dataLSId(id);
      const data = JSON.parse(topaz.storage.get(lsId) ?? '{}');

      data[key] = undefined;
      delete data[key];

      topaz.storage.set(lsId, JSON.stringify(data));

      return data[key];
    },
  },

  Patcher: {
    instead: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(args, original, this); }, false, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    before: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(args, this); }, true);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    after: (id, parent, key, patch) => {
      if (!unpatches[id]) unpatches[id] = [];

      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(args, ret, this); }, false);

      unpatches[id].push(unpatch);
      return unpatch;
    },

    unpatchAll: (id) => {
      let arr = id;
      if (typeof id === 'string') arr = unpatches[id] ?? [];

      arr.forEach(x => x());
      if (typeof id === 'string') unpatches[id] = [];
    }
  },

  plugins: {
    isEnabled: (name) => {
      const plugin = Object.values(topaz.internal.plugins).find(x => x.__mod === 'dr' && x.constructor.name === name);
      return plugin ? plugin.__enabled : false;
    }
  }
};
})();`,

  'velocity/global': `let VApi;

(() => {
const cssEls = {};
const unpatches = {};

const Webpack = goosemod.webpackModules;

const Patcher = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(args, ret); }, false);

  unpatches[id].push(unpatch);
  return unpatch;
};

Patcher.after = Patcher;
Patcher.instead = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(args, original, this); }, false, true);

  unpatches[id].push(unpatch);
  return unpatch;
};
Patcher.before = (id, parent, key, patch) => {
  if (!unpatches[id]) unpatches[id] = [];

  const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(args, this); }, true);

  unpatches[id].push(unpatch);
  return unpatch;
};
Patcher.unpatchAll = (id) => {
  let arr = id;
  if (typeof id === 'string') arr = unpatches[id] ?? [];

  arr.forEach(x => x());
  if (typeof id === 'string') unpatches[id] = [];
};

VApi = {
  WebpackModules: {
    find: (filter) => {
      switch (typeof filter) {
        case 'string': return goosemod.webpackModules.find(x => x.displayName === filter || x.default.displayName === filter, false);
        case 'number': return goosemod.webpackModules.findByModuleId(filter);
      }

      if (Array.isArray(filter)) return goosemod.webpackModules.findByProps(...filter);

      return goosemod.webpackModules.find(filter);
    }
  },

  Styling: {
    injectCSS: (id, css) => {
      const el = document.createElement('style');

      el.appendChild(document.createTextNode(css)); // Load the stylesheet via style element w/ CSS text

      document.head.appendChild(el);

      cssEls[id] = el;
    },

    clearCSS: (id) => {
      if (!cssEls[id]) return;

      cssEls[id].remove();

      cssEls[id] = undefined;
      delete cssEls[id];
    },
  },

  Patcher,

  Logger: {
    log: (name, ...msg) => console.log(name, ...msg)
  },

  VelocityElements: {
    head: document.head
  },

  showToast: (header, content, props) => {
    goosemod.showToast(content, {
      subtext: header,
      ...props
    });
  },


  React: Webpack.common.React,
  ReactDOM: Webpack.common.ReactDOM
};
})();`,

  '@entities/plugin': `const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;

const fluxPrefix = 'topaz_un_settings_' + __entityID.replace(/[^A-Za-z0-9]/g, '_');
const FluxActions = {
  TOGGLE_SETTING: fluxPrefix + '_toggle_setting',
  UPDATE_SETTING: fluxPrefix + '_update_setting',
  DELETE_SETTING: fluxPrefix + '_delete_setting',
};

class SettingsStore extends Flux.Store {
  constructor (Dispatcher, handlers) {
    super(Dispatcher, handlers);
    this._store = JSON.parse(topaz.storage.get(__entityID + '_un', '{}') ?? {});
  }

  onChange() {
    topaz.storage.set(__entityID + '_un', JSON.stringify(this._store));
  }

  get = (key, def) => {
    return this._store[key] ?? def;
  }

  update = (key, value) => {
    if (value === undefined) return this.deleteSetting(key);

    this._store[key] = value;

    this.onChange();

    return this._store[key];
  }

  toggle = (key, def) => {
    return this.updateSetting(key, !(this._store[key] ?? def));
  }

  delete = (key) => {
    delete this._store[key];

    this.onChange();
  }

  getKeys = () => Object.keys(this._store)

  connectStore = connectStore
}

const connectStore = (comp) => Flux.connectStores([ settingStore ], () => ({
  settings: settingStore.store,
  get: settingStore.get,

  set: (setting, value) => {
    FluxDispatcher.dispatch({
      type: FluxActions.UPDATE_SETTING,
      setting,
      value
    });
  },

  toggle: (setting, defaultValue) => {
    FluxDispatcher.dispatch({
      type: FluxActions.TOGGLE_SETTING,
      setting,
      defaultValue
    });
  },

  delete: (setting) => {
    FluxDispatcher.dispatch({
      type: FluxActions.DELETE_SETTING,
      setting
    });
  }
}))(comp);

const settingStore = new SettingsStore(FluxDispatcher, { // always return true to update properly
  [FluxActions.TOGGLE_SETTING]: ({ setting, defaultValue }) => settingStore.toggle(setting, defaultValue) || true,
  [FluxActions.UPDATE_SETTING]: ({ setting, value }) => settingStore.update(setting, value) || true,
  [FluxActions.DELETE_SETTING]: ({ setting }) => settingStore.delete(setting) || true
});


module.exports = class Plugin {
  constructor() {
    this.settings = settingStore;

    this.unpatches = [];
  }

  get patcher() {
    return {
      instead: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, args, original); }, false, true);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      before: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      after: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      unpatchAll: () => {
        this.unpatches.forEach(x => x());
      }
    }
  }

  _topaz_start() {
    this.start.bind(this)();
  }

  _topaz_stop() {
    this.stop.bind(this)();
  }
}`,
  '@structures/plugin': `const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;

const fluxPrefix = 'topaz_un_settings_' + __entityID.replace(/[^A-Za-z0-9]/g, '_');
const FluxActions = {
  TOGGLE_SETTING: fluxPrefix + '_toggle_setting',
  UPDATE_SETTING: fluxPrefix + '_update_setting',
  DELETE_SETTING: fluxPrefix + '_delete_setting',
};

class SettingsStore extends Flux.Store {
  constructor (Dispatcher, handlers) {
    super(Dispatcher, handlers);
    this._store = JSON.parse(topaz.storage.get(__entityID + '_un', '{}') ?? {});
  }

  onChange() {
    topaz.storage.set(__entityID + '_un', JSON.stringify(this._store));
  }

  get = (key, def) => {
    return this._store[key] ?? def;
  }

  update = (key, value) => {
    if (value === undefined) return this.deleteSetting(key);

    this._store[key] = value;

    this.onChange();

    return this._store[key];
  }

  toggle = (key, def) => {
    return this.updateSetting(key, !(this._store[key] ?? def));
  }

  delete = (key) => {
    delete this._store[key];

    this.onChange();
  }

  getKeys = () => Object.keys(this._store)

  connectStore = connectStore
}

const connectStore = (comp) => Flux.connectStores([ settingStore ], () => ({
  settings: settingStore.store,
  get: settingStore.get,

  set: (setting, value) => {
    FluxDispatcher.dispatch({
      type: FluxActions.UPDATE_SETTING,
      setting,
      value
    });
  },

  toggle: (setting, defaultValue) => {
    FluxDispatcher.dispatch({
      type: FluxActions.TOGGLE_SETTING,
      setting,
      defaultValue
    });
  },

  delete: (setting) => {
    FluxDispatcher.dispatch({
      type: FluxActions.DELETE_SETTING,
      setting
    });
  }
}))(comp);

const settingStore = new SettingsStore(FluxDispatcher, { // always return true to update properly
  [FluxActions.TOGGLE_SETTING]: ({ setting, defaultValue }) => settingStore.toggle(setting, defaultValue) || true,
  [FluxActions.UPDATE_SETTING]: ({ setting, value }) => settingStore.update(setting, value) || true,
  [FluxActions.DELETE_SETTING]: ({ setting }) => settingStore.delete(setting) || true
});


module.exports = class Plugin {
  constructor() {
    this.settings = settingStore;

    this.unpatches = [];
  }

  get patcher() {
    return {
      instead: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, args, original); }, false, true);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      before: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      after: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false);

        this.unpatches.push(unpatch);
        return unpatch;
      },

      unpatchAll: () => {
        this.unpatches.forEach(x => x());
      }
    }
  }

  _topaz_start() {
    this.start.bind(this)();
  }

  _topaz_stop() {
    this.stop.bind(this)();
  }
}`,
  '@patcher': `const unpatches = {};

module.exports = {
  create: (id) => {
    unpatches[id] = [];

    return {
      instead: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, args, original); }, false, true);

        unpatches[id].push(unpatch);
        return unpatch;
      },

      before: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

        unpatches[id].push(unpatch);
        return unpatch;
      },

      after: (parent, key, patch) => {
        const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, args, ret); }, false);

        unpatches[id].push(unpatch);
        return unpatch;
      },

      unpatchAll: () => {
        unpatches[id].forEach(x => x());
      }
    };
  },

  // todo: temporary as astra and unbound use same import names
  instead: (id, parent, key, patch) => {
    const unpatch = goosemod.patcher.patch(parent, key, function (args, original) { return patch(this, original, args); }, false, true);

    if (!unpatches[id]) unpatches[id] = [];
    unpatches[id].push(unpatch);

    return unpatch;
  },

  before: (id, parent, key, patch) => {
    const unpatch = goosemod.patcher.patch(parent, key, function (args) { return patch(this, args); }, true);

    if (!unpatches[id]) unpatches[id] = [];
    unpatches[id].push(unpatch);

    return unpatch;
  },

  after: (id, parent, key, patch) => {
    const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) { return patch(this, ret, args); }, false);

    if (!unpatches[id]) unpatches[id] = [];
    unpatches[id].push(unpatch);

    return unpatch;
  },

  unpatchAll: (id) => {
    if (!unpatches[id]) return;

    unpatches[id].forEach(x => x());
  }
};`,
  '@webpack': `const bulkify = (original) => (...args) => {
  const opts = args[args.length - 1];
  if (opts.bulk) return args.slice(0, -1).map(x => original(...x));

  return original(...args);
}

module.exports = {
  findByProps: bulkify(goosemod.webpackModules.findByProps),
  findByDisplayName: (name, opts = {}) => goosemod.webpackModules.find(x => x.displayName === name || x.default?.displayName === name, opts.interop ?? true),

  bulk: (...filters) => filters.map(x => goosemod.webpackModules.find(x, false)),
  findLazy: (filter) => new Promise(res => {
    const check = () => {
      const ret = goosemod.webpackModules.find(filter);
      if (!ret) return;

      res(ret);
      clearInterval(int);
    };

    const int = setInterval(check, 1000);
    check();
  }),

  filters: {
    byProps: (...props) => (x) => props.every(y => x.hasOwnProperty(y) || (x.__proto__?.hasOwnProperty?.(y))),
    byDisplayName: (name, exportDefault = false) => (x) => {
      if (x.displayName === name) return x;
      if (x.default?.displayName === name) return exportDefault ? x.default : x;
    }
  },

  // todo: temporary as astra and unbound use same import names
  getByProps: goosemod.webpackModules.findByProps,
  getByDisplayName: (name, opts) => {
    const ret = goosemod.webpackModules.find(x => x.displayName === name || x.default?.displayName === name, false);

    return opts.ret === 'exports' ? ret : ret[name];
  },

  MessageActions: goosemod.webpackModules.findByProps('sendMessage')
};`,
  '@webpack/common': `module.exports = {
  ContextMenu: goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu'),
  Modals: goosemod.webpackModules.findByProps('openModal', 'closeAllModals'),
  Dispatcher: goosemod.webpackModules.common.FluxDispatcher,
  React: goosemod.webpackModules.common.React,
  Constants: goosemod.webpackModules.findByProps('MAX_MESSAGE_LENGTH'),
  Messages: goosemod.webpackModules.findByProps('sendMessage'),
  Users: goosemod.webpackModules.findByProps('getCurrentUser'),
};`,
  '@webpack/stores': `module.exports = {
  Guilds: goosemod.webpackModules.findByProps('getGuilds', 'getGuild'),
  Users: goosemod.webpackModules.findByProps('getUser', 'getCurrentUser'),
  Channels: goosemod.webpackModules.findByProps('getMutablePrivateChannels')
};`,
  '@utilities': `module.exports = {
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
};`,
  '@utilities/dom': `module.exports = require('@utilities').DOM;`,
  '@components': `const { React } = goosemod.webpackModules.common;

module.exports = {
  Icon: (props) => React.createElement(goosemod.webpackModules.findByDisplayName(props.name), { ...props })
};`,
  '@components/discord': `module.exports = {
  Menu: goosemod.webpackModules.findByProps("MenuRadioItem", "MenuItem"),
  Modal: goosemod.webpackModules.findByProps('ModalRoot'),
  FormText: goosemod.webpackModules.findByDisplayName('FormText'),
  FormTitle: goosemod.webpackModules.findByDisplayName('FormTitle'),
};`,
  '@components/settings': `const { React } = goosemod.webpackModules.common;
const OriginalSwitchItem = goosemod.webpackModules.findByDisplayName('SwitchItem');

module.exports = {
  Switch: class SwitchItemContainer extends React.PureComponent {
    render() {
      return React.createElement(OriginalSwitchItem, {
        value: this.props.checked,
        note: this.props.description,
        onChange: (e) => {
          this.props.onChange(e);

          this.props.value = e;
          this.forceUpdate();
        }
      }, this.props.title);
    }
  },
};`,
  '@api/toasts': `module.exports = {
  open: (opts) => goosemod.showToast(opts.content, { subtext: opts.title })
};`,
  'unbound/global': '',

  '@classes': `module.exports = {
  UPlugin: class UPlugin {
    constructor() {

    }

    _topaz_start() {
      this.start.bind(this)();
    }

    _topaz_stop() {
      this.stop.bind(this)();
    }
  }
};`,
  '@util': `module.exports = {
  suppressErrors: (func) => (...args) => {
    try {
      func(...args);
    } catch (e) {
      console.error('Suppressed error for', label, e);
    }
  }
};`,
  'astra/global': '',

  '@cumcord/modules/webpack': `module.exports = cumcord.modules.webpack;`,
  '@cumcord/modules/webpackModules': `module.exports = cumcord.modules.webpack;`,
  '@cumcord/modules/common': 'module.exports = cumcord.modules.common;',
  ...['i18n', 'constants', 'FluxDispatcher'].reduce((acc, x) => { acc[`@cumcord/modules/common/${x}`] = `module.exports = cumcord.modules.common.${x};`; return acc; }, {}),
  '@cumcord/modules': 'module.exports = cumcord.modules;',
  '@cumcord/patcher': `module.exports = cumcord.patcher;`,
  '@cumcord/utils': `module.exports = cumcord.utils;`,
  '@cumcord/pluginData': `module.exports = cumcord.pluginData;`,
  '@cumcord/pluginData/persist': `module.exports = cumcord.pluginData.persist;`,
  'cumcord/global': `let cumcord;

(() => {
cumcord = {
  patcher: {
    before: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, true),
    after: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler),
    instead: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, false, true),

    findAndPatch: (find, handler) => {
      let unpatch;
      const tryToFind = () => {
        const ret = find();
        if (!ret) return;

        clearInterval(int);
        unpatch = handler(ret);
      };

      const int = setInterval(tryToFind, 5000);
      tryToFind();

      return () => {
        clearInterval(int);
        if (unpatch) unpatch();
      };
    },

    injectCSS: (css) => {
      const el = document.createElement('style');

      el.textContent = document.createTextNode(css);

      document.head.appendChild(el);

      return (newCss) => {
        if (newCss === undefined) el.remove();
          else newCss.textContent = newCss;
      };
    }
  },

  modules: {
    webpack: {
      ...goosemod.webpackModules,

      findByDisplayName: (name, useDefault = true) => goosemod.webpackModules.find(x => x.displayName === name || x.default.displayName === name, useDefault),
      findByDisplayNameAll: (name, useDefault = true) => goosemod.webpackModules.findAll(x => x.displayName === name || x.default.displayName === name, useDefault),

      batchFind: (handler) => {
        const mods = [];
        handler(Object.keys(cumcord.modules.webpack).reduce((acc, x) => {
          acc[x] = (...args) => {
            const ret = cumcord.modules.webpack[x](...args);
            mods.push(ret);
          };

          return acc;
        }, {}));

        return mods;
      },

      findAsync: (find) => new Promise(res => {
        const tryToFind = () => {
          const ret = find();
          if (!ret) return;

          clearInterval(int);
          res(ret);
        };

        const int = setInterval(tryToFind, 5000);
        tryToFind();
      }),
    },

    common: {
      ...goosemod.webpackModules.common,
      i18n: goosemod.webpackModules.findByPropsAll('Messages')[1]
    },
  },

  utils: {
    ...goosemod.reactUtils,

    copyText: x => goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy')['copy'](x)
  },

  pluginData: { persist: { ghost: {}, store: {} } }
};

cumcord.modules.webpackModules = cumcord.modules.webpack;
})();`,

  '@rikka/Common/entities/Plugin': `module.exports = class RikkaPlugin {
  _topaz_start() {
    this.preInject.bind(this)();
    this.inject.bind(this)();
  }

  _topaz_stop() {

  }
}`,
  '@rikka/API/Utils': `module.exports = {
  log: (...args) => console.log(...args),

  strings: {
    owoify: {
      owoifyText: x => x.replaceAll('r', 'w').replaceAll('l', 'w').replaceAll('R', 'W').replaceAll('L', 'W')
    }
  }
};`,
  '@rikka/API/Utils/strings/owoify': `module.exports = require('@rikka/API/Utils').strings.owoify;`,
  'rikka/global': '',

  '@vizality/webpack': `module.exports = require('powercord/webpack');`,
  '@vizality/components/settings': `module.exports = require('powercord/components/settings');`,
  '@vizality/patcher': `module.exports = {
  patch: goosemod.patcher.inject,
  unpatch: goosemod.patcher.uninject
};`,
  '@vizality/entities': `module.exports = {
  Plugin: class Plugin {
    _topaz_start() {
      this.start.bind(this)();
    }

    _topaz_stop() {
      this.stop.bind(this)();
    }

    get settings() {
      return vizality.api.settings.store;
    }
  }
};`,
  'vizality/global': `let vizality;

(() => {
const { React, Flux, FluxDispatcher } = goosemod.webpackModules.common;

class SettingsStore extends Flux.Store {
  constructor (Dispatcher, handlers) {
    super(Dispatcher, handlers);
    this.store = {};
  }

  getSetting = (key, def) => {
    return this.store[key] ?? def;
  }

  updateSetting = (key, value) => {
    if (value === undefined) return this.deleteSetting(key);

    this.store[key] = value;

    this.onChange?.();

    return this.store[key];
  }

  toggleSetting = (key, def) => {
    return this.updateSetting(key, !(this.store[key] ?? def));
  }

  deleteSetting = (key) => {
    delete this.store[key];

    this.onChange?.();
  }

  getKeys = () => Object.keys(this.store)

  // alt names for other parts
  get = this.getSetting
  set = this.updateSetting
  delete = this.deleteSetting

  // not flux but yes
  connectStore = connectStore
}

const connectStore = (comp) => class ConnectWrap extends React.PureComponent {
  render() {
    const props = this.props;
    delete props.children;

    return React.createElement(comp, {
      ...props,
      getSetting: settingStore.getSetting,
      updateSetting: settingStore.updateSetting,
      toggleSetting: settingStore.toggleSetting,
      deleteSetting: settingStore.deleteSetting,
    }, this.props.children)
  }
};

const settingStore = new SettingsStore(FluxDispatcher, {
  VIZALITY_SETTINGS_UPDATE: ({ category, settings }) => updateSettings(category, settings),
  VIZALITY_SETTING_TOGGLE: ({ category, setting, defaultValue }) => toggleSetting(category, setting, defaultValue),
  VIZALITY_SETTING_UPDATE: ({ category, setting, value }) => updateSetting(category, setting, value),
  VIZALITY_SETTING_DELETE: ({ category, setting }) => deleteSetting(category, setting)
});

const settingsUnpatch = {};
const i18nMessages = {};

const i18n = goosemod.webpackModules.find(x => x.getLanguages && x.Messages?.ACCOUNT);
const locale = () => goosemod.webpackModules.findByProps('getLocaleInfo').getLocale();
const updateI18n = () => {
  const parent = i18n._provider?._context ?? i18n._proxyContext;
  let { messages, defaultMessages } = parent;

  Object.defineProperty(parent, 'messages', {
    enumerable: true,
    get: () => messages,
    set: o => messages = Object.assign(o, i18nMessages[locale()])
  });

  Object.defineProperty(parent, 'defaultMessages', {
    enumerable: true,
    get: () => defaultMessages,
    set: o => defaultMessages = Object.assign(o, i18nMessages['en-US'])
  });

  parent.messages = messages;
  parent.defaultMessages = defaultMessages;
};

const updateOpenSettings = async () => {
  try {
    await new Promise((res) => setTimeout(res, 100));

    if (topaz.__reloading || !document.querySelector('.selected-g-kMVV[aria-controls="topaz-tab"]')) return;

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch (_e) { }
};


vizality = {
  api: {
    commands: {
      registerCommand: ({ command, alias, description, usage, executor }) => {
        const getChannelId = goosemod.webpackModules.findByProps('getChannelId').getChannelId;

        // TODO: implement alias

        goosemod.patcher.commands.add(command, description,
          async (ret) => {
            // Don't just destructure as using without text arguments returns empty object ({})

            let textGiven = '';
            if (ret[0]?.value) {
              const [{ value: text }] = ret;
              textGiven = text;
            }

            const out = await executor(textGiven.split(' ')); // Run original executor func (await incase it's an async function)

            if (!out) return;
            if (!out.send) {
              goosemod.patcher.internalMessage(out.result); // PC impl. sends internal message when out.send === false, so we also do the same via our previous Patcher API function
              return;
            }


            // When send is true, we send it as a message via sendMessage

            goosemod.webpackModules.findByProps('sendMessage', 'receiveMessage')['sendMessage'](getChannelId(), {
              content: out.result,

              tts: false,
              invalidEmojis: [],
              validNonShortcutEmojis: []
            });
          }, [
          { type: 3, required: false, name: 'args', description: 'Arguments for PC command' } // Argument for any string for compat. with PC's classical commands
        ]);
      },

      unregisterCommand: (command) => {
        goosemod.patcher.commands.remove(command);
      }
    },

    settings: {
      registerSettings: (id, { label, render, category }) => {
        const { React } = goosemod.webpackModules.common;

        const SettingsView = goosemod.webpackModules.findByDisplayName('SettingsView');

        const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
        const FormSection = goosemod.webpackModules.findByDisplayName('FormSection');

        if (!SettingsView) return;

        topaz.internal.registerSettings(__entityID, { render, props: { ...settingStore } });

        settingsUnpatch[id] = goosemod.patcher.patch(SettingsView.prototype, 'getPredicateSections', (_, sections) => {
          const logout = sections.find((c) => c.section === 'logout');
          if (!logout || !topaz.settings.pluginSettingsSidebar) return sections;

          const finalLabel = typeof label === 'function' ? label() : label;

          sections.splice(sections.indexOf(logout) - 1, 0, {
            section: finalLabel,
            label: finalLabel,
            predicate: () => { },
            element: () => React.createElement(FormSection, { },
              React.createElement(FormTitle, { tag: 'h2' }, finalLabel),

              React.createElement(render, {
                ...settingStore
              })
            )
          });

          return sections;
        });

        updateOpenSettings();
      },

      unregisterSettings: (id) => {
        if (!settingsUnpatch[id]) return;

        settingsUnpatch[id]();

        settingsUnpatch[id] = null;
        delete settingsUnpatch[id];

        updateOpenSettings();
      },

      store: settingStore,
      _fluxProps: (_id) => ({
        settings: settingStore.store,
        getSetting: (key, defaultValue) => settingStore.getSetting(key, defaultValue),
        updateSetting: (key, value) => settingStore.updateSetting(key, value),
        toggleSetting: (key, defaultValue) => settingStore.toggleSetting(key, defaultValue)
      }),
      connectStores: (_id) => connectStore
    },

    notices: {
      sendToast: (_id, { header, content, type, buttons }) => goosemod.showToast(content) // todo: improve to use all given
    },

    i18n: {
      loadAllStrings: (obj) => { // todo: re-add on locale change
        for (const locale in obj) {
          i18nMessages[locale] = {
            ...(i18nMessages[locale] ?? {}),
            ...obj[locale]
          };
        }

        updateI18n();
      }
    },

    connections: {
      fetchAccounts: async (user) => {
        return undefined;
      }
    }
  }
};


})();`,

  'enmity/metro/common': `module.exports = require('unbound/webpack/common');`,
  'enmity/metro': `module.exports = require('unbound/webpack/webpack');`,
  'enmity/patcher': `module.exports = require('unbound/patcher');`,
  'enmity/managers/plugins': `module.exports = { Plugin: {}, registerPlugin: () => {} };`,
  'enmity/global': '',

  'demoncord/global': `let demon;

(() => {
demon = {
  summon: mod => {
    switch (mod) {
      case 'modules/webpack': return {
        ...goosemod.webpackModules
      };

      case 'patcher': return {
        before: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, true),
        after: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler),
        instead: (name, parent, handler) => goosemod.patcher.patch(parent, name, handler, false, true),
      };

      case 'utils/logger': return {
        makeLogger: (func, name) => (regions, ...msg) => func(name, ...regions, ...msg)
      };
    }
  }
};
})();`,

  'aliucord/entities': `const { Patcher } = require('aliucord/utils');

class Plugin {
  _topaz_start() {
    this.start.bind(this)();
  }

  _topaz_stop() {
    Patcher.unpatchAll();
  }
}

module.exports = {
  Plugin
};`,
  'aliucord/metro': `module.exports = {
  getByProps: goosemod.webpackModules.findByProps,

  ...goosemod.webpackModules.common,
  MessageStore: goosemod.webpackModules.findByProps('getMessage', 'getRawMessages'),
  UserStore: goosemod.webpackModules.findByProps('getCurrentUser', 'getUser'),
};`,
  'aliucord/utils': `const unpatches = [];

module.exports = {
  Patcher: {
    instead: (parent, key, patch) => {
      const unpatch = goosemod.patcher.patch(parent, key, function (args, original) {
        const ctx = {
          result: undefined,
          original
        };

        patch(ctx, ...args);

        return ctx.result;
      }, false, true);

      unpatches.push(unpatch);
      return unpatch;
    },

    before: (parent, key, patch) => {
      const unpatch = goosemod.patcher.patch(parent, key, function (args) {
        const ctx = {
          result: undefined
        };

        patch(ctx, ...args);

        return ctx.result;
      }, true);

      unpatches.push(unpatch);
      return unpatch;
    },

    after: (parent, key, patch) => {
      const unpatch = goosemod.patcher.patch(parent, key, function (args, ret) {
        const ctx = {
          result: ret
        };

        patch(ctx, ret, ...args);

        return ctx.result;
      }, false);

      unpatches.push(unpatch);
      return unpatch;
    },

    unpatchAll: () => {
      unpatches.forEach(x => x());
    }
  }
};`,
  'aliucord/utils/patcher': `module.exports = require('aliucord/utils').Patcher;`,
  'aliucord/global': '',

  'react': 'module.exports = goosemod.webpackModules.common.React;',
  'lodash': 'module.exports = window._;',

  'electron': `module.exports = {
  clipboard: {
    writeText: (text) => goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy')['copy'](text),
    readText: () => window.DiscordNative ? DiscordNative.clipboard.read() : 'clipboard' // await navigator.clipboard.readText()
  },

  shell: {
    openExternal: (url) => window.open(url)
  }
};`,
  'path': `const resolve = (x) => {
  let ind;
  if (x.startsWith('./')) x = x.substring(2);
  x = x.replaceAll('/./', '/').replaceAll('//', '/'); // example/./test -> example/test

  while ((ind = x.indexOf('../')) !== -1) {
      const priorSlash = x.lastIndexOf('/', ind - 4);
      x = x.slice(0, priorSlash === -1 ? 0 : (priorSlash + 1)) + x.slice(ind + 3); // example/test/../sub -> example/sub
  }

  return x;
};

module.exports = {
  join: (...parts) => resolve(parts.join('/')),
  resolve: (...parts) => resolve(parts.join('/')), // todo: implement resolve properly (root / overwrite)

  isAbsolute: p => p.startsWith('/') || !!p.match(/^[A-Z]:\\\\/)
};`,
  'fs': `const strToBuf = str => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);

  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }

  return buf;
};

const syncRequest = (url, useBuffer) => {
  let resp = topaz.internal.fetchCache.get(url);

  if (!resp) {
    const request = new XMLHttpRequest();
    request.open('GET', url, false);
    if (useBuffer) request.overrideMimeType('text\\/plain; charset=x-user-defined');
    request.send(null);

    if (request.status !== 200) return;

    resp = request.responseText;
    topaz.internal.fetchCache.set(url, resp);
  }

  return resp;
};

module.exports = {
  readdirSync: path => {
    const isRepo = __entityID.split('/').length === 2;

    topaz.log('fs.readdirSync', path);

    if (isRepo) {
      const url = \`https://api.github.com/repos/\${__entityID}/contents/\${path}\`;

      const resp = syncRequest(url, false);

      if (!resp) return [];

      return JSON.parse(resp).map(x => x.name);
    }

    return [];
  },
  writeFile: (path, data, cb) => {},

  readFileSync: (path, encoding) => {
    const isRepo = __entityID.split('/').length === 2;

    topaz.log('fs.readFileSync', path, encoding);

    if (isRepo) {
      const url = \`https://raw.githubusercontent.com/\${__entityID}/HEAD/\${path}\`;
      const useBuffer = encoding == null;

      const resp = syncRequest(url, useBuffer);

      if (useBuffer) {
        const buffer = strToBuf(resp);

        buffer.toString = function() { return new TextDecoder().decode(this); };
        buffer.buffer = buffer;

        return buffer;
      } else return resp;
    }
  },

  promises: {
    readFile: async (path, encoding) => {
      topaz.log('fs.promises.readFile', path, encoding);

      const isRepo = __entityID.split('/').length === 2;

      if (isRepo) {
        const url = \`https://raw.githubusercontent.com/\${__entityID}/HEAD/\${path}\`;

        return await (await fetch(url)).text();
      }
    }
  }
};`,
  'process': `module.exports = {
  platform: 'linux',
  env: {
    HOME: '/home/topaz'
  },

  hrtime: (toDiff) => {
    const stamp = Math.floor(performance.now());
    const sec = Math.floor(stamp / 1000);
    const nano = (stamp % 1000) * 1000 * 1000;

    if (!toDiff) return [ sec, nano ];

    return [ Math.abs(sec - toDiff[0]), Math.abs(nano - toDiff[1]) ]
  }
};`,
  'util': `const formatString = msg => {
  let char = "'";
  if (msg.includes("'")) char = '"';
  if (char === '"' && msg.includes('"')) char = '\`';
  if (char === '\`' && msg.includes('\`')) msg = msg.replaceAll('\`', '\\\\\`');

  return char + msg + char;
};

const objectKey = key => {
  if (key.match(/[^0-9a-zA-Z_]/)) return formatString(key);
  return key;
};

const inspect = msg => {
  if (msg === null) return 'null';
  if (msg === undefined) return 'undefined';

  if (msg === true) return 'true';
  if (msg === false) return 'false';

  if (typeof msg === 'string') return formatString(msg);

  if (Array.isArray(msg)) return \`[ \${msg.map(x => inspect(x)).join(', ')} ]\`;

  if (typeof msg === 'object') return \`{ \${Object.keys(msg).map(x => \`\${objectKey(x)}: \${inspect(msg[x])}\`).join(', ')} }\`;

  return msg;
};

module.exports = {
  inspect
};`,
  'request': `const https = require('https');

// Generic polyfill for "request" npm package, wrapper for https
const nodeReq = ({ method, url, headers, qs, timeout, body }) => new Promise((resolve) => {
  let req;
  try {
    req = https.request(url + (qs != null ? \`?\${(new URLSearchParams(qs)).toString()}\` : ''), { method, headers, timeout }, async (res) => {
      resolve(res);
    });
  } catch (e) {
    return resolve(e);
  }

  req.on('error', resolve);

  if (body) req.write(body); // Write POST body if included

  req.end();
});

const request = (...args) => {
  topaz.log('node.request', ...args);
  let options, callback;
  switch (args.length) {
    case 3: // request(url, options, callback)
      options = {
        url: args[0],
        ...args[1]
      };

      callback = args[2];
      break;

    default: // request(url, callback) / request(options, callback)
      options = args[0];
      callback = args[1];
  }

  if (typeof options === 'string') {
    options = {
      url: options
    };
  }

  const listeners = {};

  nodeReq(options).then(async (res) => {
    if (!res.statusCode) {
      listeners['error']?.(res);
      return callback?.(res, null, null);
    }

    listeners['response']?.(res);

    let data = [];
    res.on('data', (chunk) => {
      data.push(chunk);
      listeners['data']?.(chunk);
    });

    await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

    // const buf = Buffer.concat(data);
    const buf = new Uint8Array(...data).buffer;
    buf.toString = function() { return new TextDecoder().decode(this); };

    callback?.(undefined, res, options.encoding !== null ? buf.toString() : buf);
  });

  const ret = {
    on: (type, handler) => {
      listeners[type] = handler;
      return ret; // Return self
    }
  };

  return ret;
};

for (const m of [ 'get', 'post', 'put', 'patch', 'delete', 'head', 'options' ]) {
  request[m] = (url, callback) => request({ url, method: m }, callback);
}
request.del = request.delete; // Special case

module.exports = request;`,
  'https': `const request = (...args) => {
  topaz.log('node.https', ...args);

  let opts, cb;
  if (args.length === 2) {
    opts = args[0];
    cb = args[1];
  }

  if (args.length === 3) {
    const url = new URL(args[0]);

    opts = {
      hostname: url.hostname,
      path: url.pathname,
      port: url.protocol === 'https:' ? 443 : 80,
      ...args[1]
    };

    cb = args[2];
  }

  const { method, headers, timeout, hostname, path, port } = opts;

  const url = \`\${port === 443 ? 'https' : 'http'}://\${hostname}\${path}\`;

  const listeners = {};

  return {
    write: (body) => {},
    end: async () => {
      const req = await fetch(url, {
        method,
        headers
      });

      cb({
        statusCode: req.status,
        headers: req.headers,

        on: (ev, handler) => listeners[ev] = handler
      });

      const data = await req.arrayBuffer();

      listeners.data(data);

      listeners.end();
    },
    on: (ev, handler) => listeners[ev] = handler
  };
};

module.exports = {
  request
};`,
  'querystring': `module.exports = {
  stringify: x => new URLSearchParams(x).toString()
};`,
  'os': `module.exports = {
  platform: () => 'linux'
};`,
  'url': `module.exports = {
  URL
};`,
};

const join = (root, p) => root + p.replace('./', '/'); // Add .jsx to empty require paths with no file extension

class Cache {
  constructor(id) {
    this.id = id;
    this.store = {};

    this.load();
  }

  async fetch(url) {
    return this.get(url) ?? this.set(url, await (await fetch(url)).text());
  }

  get(key, def) {
    return this.store[key] ?? def;
  }

  set(key, val) {
    this.store[key] = val;

    this.save();

    return this.store[key];
  }

  remove(key) {
    this.store[key] = undefined;
    delete this.store[key];

    this.save();
  }

  keys() {
    return Object.keys(this.store);
  }

  purge() {
    this.store = {};

    this.save();
  }

  load() {
    const saved = Storage.get(`cache_${this.id}`);
    if (!saved) return;

    this.store = JSON.parse(saved);
  }

  save() {
    Storage.set(`cache_${this.id}`, JSON.stringify(this.store));
  }
}

let fetchCache = new Cache('fetch'), finalCache = new Cache('final');

const getCode = async (root, p, ...backups) => {
  if (builtins[p]) return builtins[p];

  const origPath = join(root, p);
  if (fetchCache.get(origPath)) return fetchCache.get(origPath);

  let code = `'failed to fetch: ${p}'`;
  let path;
  for (path of [ p, ...backups ]) {
    if (!path) continue;

    const url = join(root, path);
    const req = await fetch(url).catch(e => {
      if (e.stack.startsWith('TypeError')) { // possible CORS error, try with our CORS proxy
        console.warn('Failed to fetch', url, '- trying CORS proxy');
        return fetch(`https://topaz-cors.goosemod.workers.dev/?` + url);
      }
    });
    // console.log('REQ', join(root, path), req.status);
    if (req.status !== 200) continue;
    console.log(p, req.status);

    code = await req.text();
    break;
    // console.log(join(root, path), req.status, code);
  }

  return fetchCache.set(origPath, code);
};

const genId = (p) => `__topaz_${p.replace(transformRoot, '').replaceAll('./', '/').replace(/[^A-Za-z0-9]/g, '_').split('.')[0]}`;

const autoImportReact = (code) => { // auto import react for jsx if not imported
  if (!code.match(/^(import|const) [^;]*?React[, ].*?$/gm)) code = `import React from 'react';\n${code}`;
  return code;
};

const makeChunk = async (root, p) => {
  // console.log('makeChunk', p);

  if (p.endsWith('/') && builtins[p.slice(0, -1)]) p = p.slice(0, -1);

  const shouldUpdateFetch = !builtins[p];
  if (shouldUpdateFetch) {
    fetchProgressTotal++;
    updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);
  }

  const joined = (root + '/' + p).replace(transformRoot, '');
  let resPath = builtins[p] ? p : resolvePath(joined).slice(1);

  const resolved = await resolveFileFromTree(resPath);
  // console.log('CHUNK', genId(resPath), '|', root.replace(transformRoot, ''), p, '|', joined, resPath, resolved);

  const finalPath = resolved ?? p;

  let code = await getCode(transformRoot, finalPath, p.match(/.*\.[a-z]+/) ? null : p + '.jsx', p.includes('.jsx') ? p.replace('.jsx', '.js') : p.replace('.js', '.jsx'));
  // if (!builtins[p]) code = await includeRequires(join(transformRoot, finalPath), code);

  if (finalPath.endsWith('sx')) code = autoImportReact(code);

  code = await includeRequires(join(transformRoot, finalPath), code);
  const id = genId(resPath);

  if (p.endsWith('.json') || code.startsWith('{')) code = 'module.exports = ' + code;

  if (p.endsWith('css')) {
    code = `module.exports = () => {
      const el = document.createElement('style');

      el.textContent = document.createTextNode(\`${code.replaceAll('`', '\\`').replaceAll('$', '\\$').replaceAll('\\', '\\\\')}\`);

      document.head.appendChild(el);

      return () => el.remove();
    };`;
  }

  code = await replaceAsync(code, /require\.resolve\(['"`](.*?)['"`]\)/g, async (_, toRes) => '`' + await resolveFileFromTree(toRes) + '`');

  const chunk = `// ${finalPath}
let ${id} = {};
(() => {
const __dirname = '${getDir(finalPath)}';
let module = {
  exports: {}
};
let { exports } = module;

// MAP_START|${finalPath}
` + code
      // .replace(/module\.exports ?=/, `${id} =`)
      .replace('export default', `module.exports =`)
      // .replaceAll(/(module\.)?exports\.(.*?)/g, (_, _mod, key) => `${id}.${key}`)
      .replaceAll(/export const (.*?)=/g, (_, key) => `const ${key} = exports.${key}=`)
      .replaceAll(/export function (.*?)\(/g, (_, key) => `const ${key} = exports.${key} = function ${key}(`)
      .replaceAll(/export class ([^ ]*)/g, (_, key) => `const ${key} = exports.${key} = class ${key}`) +
`\n// MAP_END
${id} = module.exports;
})();`;

  if (shouldUpdateFetch) {
    fetchProgressCurrent++;
    updatePending(null, `Fetching (${fetchProgressCurrent}/${fetchProgressTotal})...`);
  }

  return [ id, chunk ];
};

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

let chunks = {}, tree = [];
const includeRequires = async (path, code) => {
  const root = getDir(path);

  // console.log({ path, root });

  // log('bundling', 'file', path.replace(indexRoot, ''));

  if (code.includes('exports[moduleName] = require(`${__dirname}/${filename}`)')) { // CJS export all jank fix hack
    const base = getDir(path.replace(transformRoot + '/', '').replace('./', ''));
    const files = tree.filter(x => x.type === 'blob' && x.path.toLowerCase().startsWith(base.toLowerCase()) && !x.path.endsWith('/index.js'));
    console.log('export all', files);

    code = `module.exports = {
${(await Promise.all(files.map(async x => {
  const file = x.path.replace(base + '/', '');

  const [ chunkId, code ] = await makeChunk(root, file);
  if (!chunks[chunkId]) chunks[chunkId] = code;

  return `  '${file.split('.').slice(0, -1).join('.')}': ${chunkId}`;
}))).join(',\n')}
};`;

    console.log(code);
  }

  code = code.replaceAll(/^import type .*$/gm, '');

  code = await replaceAsync(code, /require\(["'`](.*?)["'`]\)/g, async (_, p) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, p);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return chunkId;
  });

  code = await replaceAsync(code, /import (.*) from ['"`](.*?)['"`]/g, async (_, what, where) => {
    // console.log('within replace', join(root, p), chunks);
    const [ chunkId, code ] = await makeChunk(root, where);
    if (!chunks[chunkId]) chunks[chunkId] = code;

    return `const ${what.replace('* as ', '').replaceAll(' as ', ':')} = ${chunkId}`;
  });

  code = await replaceAsync(code, /this\.loadStylesheet\(['"`](.*?)['"`]\)/g, async (_, p) => {
    const css = (await transformCSS(transformRoot, root, await getCode(root, './' + p.replace(/^.\//, '')))).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `this.loadStylesheet(\`${css}\`)`;
  });

  /* code = await replaceAsync(code, /powercord\.api\.i18n\.loadAllStrings\(.*?\)/g, async (_, p) => { // todo: actual pc i18n
    const english = (await getCode(transformRoot, './i18n/en-US.json')).replace(/\\/g, '\\\\').replace(/\`/g, '\`');

    return `powercord.api.i18n.loadAllStrings({ 'en-US': JSON.parse(\`${english}\`) })`;
  }); */

  return code;
};

const getDir = (url) => url.split('/').slice(0, -1).join('/');

// let root;

let plugins = {};
let pending = [];

const addPending = (obj) => {
  pending.push(obj);

  return () => pending.splice(pending.indexOf(obj), 1);
};

const updatePending = (repo, substate) => {
  /* if (repo) {
    const obj = pending.find((x) => x.repo === repo);
    if (!obj) return;

    obj.substate = substate;

    const repoEl = [...document.querySelectorAll('.labelRow-2jl9gK > .title-2dsDLn')].find((x) => x.textContent === repo);
    repoEl.parentElement.parentElement.parentElement.children[1].querySelector('.description-30xx7u').textContent = substate;
  } else { */
    const el = document.querySelector('.topaz-loading-text .description-30xx7u');
    if (!el) return;

    el.textContent = substate;
  // }
};

const resolvePath = (x) => {
  let ind;
  if (x.startsWith('./')) x = x.substring(2);
  x = x.replaceAll('/./', '/').replaceAll('//', '/'); // example/./test -> example/test

  while ((ind = x.indexOf('../')) !== -1) {
      const priorSlash = x.lastIndexOf('/', ind - 4);
      x = x.slice(0, priorSlash === -1 ? 0 : (priorSlash + 1)) + x.slice(ind + 3); // example/test/../sub -> example/sub
  }

  return x;
};

let lastError;
const resolveFileFromTree = async (path) => {
  const dirRes = tree.find((x) => x.type === 'tree' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '')))?.path;
  let res;

  if (path === dirRes) { // just require(dir)
    res = tree.find((x) => x.type === 'blob' && (x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/index') || x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/_index')))?.path;
    if (!res) {
      res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/package.json'))?.path;
      if (res) {
        const package = JSON.parse(await getCode(transformRoot, './' + res));
        if (package.main.startsWith('/')) package.main = package.main.slice(1);
        if (package.main.startsWith('./')) package.main = package.main.slice(2);

        console.log('PACKAGE', package.main);

        res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '') + '/' + package.main.toLowerCase()))?.path;
      }
    }
  } else res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(path.toLowerCase().replace('./', '')))?.path;

  const lastPart = path.split('/').pop();
  if (!res && tree.find(x => x.type === 'tree' && x.path.toLowerCase().startsWith('node_modules/' + lastPart))) {
    const depRoot = `node_modules/${lastPart}`;
    const packagePath = depRoot + '/package.json';

    const package = JSON.parse(await getCode(transformRoot, './' + packagePath));

    if (package.main.startsWith('/')) package.main = package.main.slice(1);
    if (package.main.startsWith('./')) package.main = package.main.slice(2);

    res = tree.find((x) => x.type === 'blob' && x.path.toLowerCase().startsWith(depRoot.toLowerCase() + '/' + package.main.toLowerCase()))?.path;
  }

  if (!builtins[path] && (path.startsWith('powercord/') || path.startsWith('@'))) {
    console.warn('Missing builtin', path);
    lastError = `Missing builtin: ${path}`;
  } else if (!res && !builtins[path]) {
    console.warn('Failed to resolve', path);
    lastError = `Failed to resolve: ${path}`;
  }


  return res ? ('./' + res) : undefined;
};

const install = async (info, settings = undefined, disabled = false) => {
  const installStartTime = performance.now();

  lastError = '';

  let mod;
  if (info.endsWith('.plugin.js') || info.endsWith('.theme.css')) {
    mod = 'bd';
    if (info.includes('github.com/')) info = info.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '');
  }

  if (info.includes('/Condom/')) {
    if (!info.endsWith('/plugin.js')) info += (info.endsWith('/') ? '' : '/') + 'plugin.js';
    if (info.startsWith('https://github.com/')) info = info.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', '');

    mod = 'cc';
  }

  info = info.replace('https://github.com/', '');

  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let isGitHub = !info.startsWith('http');

  let subdir;
  if (isGitHub) { // todo: check
    const spl = info.split('/');
    if (spl.length > 2) { // Not just repo
      repo = spl.slice(0, 2).join('/');
      subdir = spl.slice(4).join('/');
      branch = spl[3] ?? 'HEAD';

      console.log('SUBDIR', repo, branch, subdir);
    }
  }

  const fetchSum = fetchCache.keys().filter(x => !x.includes('api.github.com') && x.includes(info.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).reduce((acc, x) => acc += x + '|' + fetchCache.get(x), '');
  const fetchHash = XXHash(fetchSum);

  let [ newCode, manifest, isTheme, _mod, autopatchResult, oldHash ] = finalCache.get(info) ?? [];
  mod =_mod ?? mod;

  log('manager.cacheload', '\ncurrent:', fetchHash, '\ncached: ', oldHash, '\nto build:', oldHash !== fetchHash || !newCode)

  if (oldHash !== fetchHash || !newCode) {
    updatePending(info, 'Treeing...');

    tree = [];
    if (isGitHub) {
      tree = JSON.parse(await fetchCache.fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=true`)).tree;

      if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

      log('bundler', 'tree', tree);
    }

    updatePending(info, 'Fetching index...');

    let indexFile = await resolveFileFromTree('index');
    let indexUrl = !isGitHub ? info : `https://raw.githubusercontent.com/${repo}/${branch}/${subdir ? (subdir + '/') : ''}${indexFile ? indexFile.slice(2) : 'index.js'}`;
    let root = getDir(indexUrl);
    let indexCode;

    chunks = {}; // reset chunks

    if (!mod) {
      if (await resolveFileFromTree('velocity_manifest.json')) mod = 'vel';
      if (await resolveFileFromTree('manifest.json')) mod = 'pc';
      if (await resolveFileFromTree('goosemodModule.json')) mod = 'gm';
      if (await resolveFileFromTree('cumcord_manifest.json')) mod = 'cc';
    }


    isTheme = info.endsWith('.theme.css') || await resolveFileFromTree('powercord_manifest.json');
    if (isTheme) {
      let skipTransform = false;
      const fullRoot = root;

      switch (mod) {
        case 'bd':
          indexUrl = join(root, './' + info.split('/').slice(-1)[0]);
          indexCode = await getCode(root, './' + info.split('/').slice(-1)[0]);
          manifest = [...indexCode.matchAll(/^ *\* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
          skipTransform = true;

          break;

        default: // default to pc
          mod = 'pc';

          manifest = JSON.parse(await getCode(root, './powercord_manifest.json'));

          const main = manifest.theme.replace(/^\.?\//, '');
          indexUrl = join(root, './' + main);
          indexCode = await getCode(root, './' + main);
          root = getDir(join(root, './' + main));
          skipTransform = main.endsWith('.css');

          // subdir = getDir(main);
          // if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

          break;
      }

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transformCSS(fullRoot, root, indexCode, skipTransform, true);
    } else {
      switch (mod) {
        case 'pc':
          manifest = JSON.parse(await getCode(root, './manifest.json'));

          if (manifest.id && manifest.authors && manifest.main) {
            mod = 'un';

            manifest.author = manifest.authors.map(x => x.name).join(', ');

            const main = await resolveFileFromTree('src/index');
            indexFile = './' + main.split('/').pop();
            indexUrl = join(root, main);
            root = getDir(indexUrl);

            subdir = getDir(main).slice(2);
            tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });
          } else if (manifest.authors && !manifest.main && manifest.version) {
            mod = 'em';

            manifest.author = manifest.authors.map(x => x.name).join(', ');

            const main = await resolveFileFromTree('src/index');
            indexFile = './' + main.split('/').pop();
            indexUrl = join(root, main);
            root = getDir(indexUrl);

            subdir = getDir(main).slice(2);
            tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });
          }

          if (typeof manifest.author === 'object') manifest.author = manifest.author.name;

          indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

          if (indexCode.includes('extends UPlugin')) mod = 'ast';
          if (indexCode.includes('@rikka')) mod = 'rk';
          if (indexCode.includes('@vizality')) mod = 'vz';
          if (indexCode.includes('aliucord')) mod = 'ac';

          if (mod === 'em') {
            indexCode = indexCode.replace(/registerPlugin\((.*?)\)/, (_, v) => `module.exports = ${v};`);
            indexCode = indexCode.replace(/^import (.*?) from ['"`]\.\.\/manifest\.json['"`].*$/m, (_, v) => `const ${v} = {};`);
          }

          break;

        case 'gm':
          manifest = JSON.parse(await getCode(root, './goosemodModule.json'));

          if (typeof manifest.authors === 'string') manifest.authors = [ manifest.authors.split(' (')[0] ];
          manifest.author = (await Promise.all(manifest.authors.map(x => x.length === 18 ? goosemod.webpackModules.findByProps('getUser', 'fetchCurrentUser').getUser(x) : x))).join(', ');
          break;

        case 'bd': // read from comment in code
          indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

          manifest = [...indexCode.matchAll(/^ *\* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});

          if (indexCode.includes('DrApi')) mod = 'dr';

          break;

        case 'vel': {
          manifest = JSON.parse(await getCode(root, './velocity_manifest.json'));

          const main = './' + manifest.main.replace('./', '');
          indexFile = './' + main.split('/').pop();
          indexUrl = join(root, './' + main);
          root = getDir(indexUrl);

          subdir = getDir(main).slice(2);
          if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

          break;
        }

        case 'cc': {
          if (info.endsWith('/plugin.js')) {
            manifest = JSON.parse(await getCode(root, './plugin.json'));

            indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));
            indexCode = 'module.exports = ' + indexCode;
          } else {
            manifest = JSON.parse(await getCode(root, './cumcord_manifest.json'));

            const main = './' + manifest.file.replace('./', '');
            indexFile = './' + main.split('/').pop();
            indexUrl = join(root, main);
            root = getDir(indexUrl);

            subdir = getDir(main).slice(2);
            if (subdir) tree = tree.filter(x => x.path.startsWith(subdir + '/')).map(x => { x.path = x.path.replace(subdir + '/', ''); return x; });

            break;
          }
        }

        default: {
          if (!indexCode) indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));
          if (indexCode.includes('demon.')) {
            mod = 'dc';

            manifest = indexCode.match(/meta: {([\s\S]*?)}/)[1].split('\n').slice(1, -1)
              .reduce((acc, x) => {
                let [ key, val ] = x.split(':');

                key = key.trim();
                val = val.trim();

                if (val.endsWith(',')) val = val.slice(0, -1);
                if (val.startsWith('\'') || val.startsWith('"')) val = val.slice(1, -1);

                if (key === 'desc') key = 'description';

                acc[key] = val;

                return acc;
              }, {});
          }

          if (!mod) console.warn('Failed to identify mod');
        }
      }

      if (!indexCode) indexCode = await getCode(root, indexFile ?? ('./' + info.split('/').slice(-1)[0]));

      const pend = pending.find(x => x.repo === info);
      if (pend) pend.manifest = manifest;

      updatePending(info, 'Bundling...');
      newCode = await transform(indexUrl, indexCode, mod);

      isTheme = false;
    }

    [ newCode, autopatchResult ] = await Autopatch(info, manifest, newCode);

    finalCache.set(info, [ newCode, manifest, isTheme, mod, autopatchResult, fetchHash ]);
  }

  updatePending(info, 'Executing...');
  // await new Promise((res) => setTimeout(res, 900000));

  let plugin;
  if (isTheme) {
    let el;

    const updateVar = (name, val) => {
      let toSet = val;
      if (name.toLowerCase().includes('font') && val[0] === '%') toSet = 'Whitney';
      document.body.style.setProperty(name, toSet);
    };

    plugin = {
      _topaz_start: () => {
        if (el) el.remove();
        el = document.createElement('style');
        el.appendChild(document.createTextNode(newCode)); // Load the stylesheet via style element w/ CSS text

        document.body.appendChild(el);

        const themeSettingsVars = JSON.parse(Storage.get(info + '_theme_settings', '{}'));
        for (const x in themeSettingsVars) updateVar(x, themeSettingsVars[x]);
      },

      _topaz_stop: () => {
        el.remove();

        const themeSettingsVars = JSON.parse(Storage.get(info + '_theme_settings', '{}'));
        for (const x in themeSettingsVars) document.body.style.removeProperty(x);
      },

      __theme: true
    };

    const discordVars = [ '--header-primary', '--header-secondary', '--text-normal', '--text-muted', '--text-link', '--channels-default', '--interactive-normal', '--interactive-hover', '--interactive-active', '--interactive-muted', '--background-primary', '--background-secondary', '--background-secondary-alt', '--background-tertiary', '--background-accent', '--background-floating', '--background-mobile-primary', '--background-mobile-secondary', '--background-modifier-hover', '--background-modifier-active', '--background-modifier-selected', '--background-modifier-accent', '--background-mentioned', '--background-mentioned-hover', '--background-message-hover', '--background-help-warning', '--background-help-info', '--scrollbar-thin-thumb', '--scrollbar-thin-track', '--scrollbar-auto-thumb', '--scrollbar-auto-track', '--scrollbar-auto-scrollbar-color-thumb', '--scrollbar-auto-scrollbar-color-track', '--elevation-stroke', '--elevation-low', '--elevation-medium', '--elevation-high', '--logo-primary', '--focus-primary', '--radio-group-dot-foreground', '--guild-header-text-shadow', '--channeltextarea-background', '--activity-card-background', '--textbox-markdown-syntax', '--deprecated-card-bg', '--deprecated-card-editable-bg', '--deprecated-store-bg', '--deprecated-quickswitcher-input-background', '--deprecated-quickswitcher-input-placeholder', '--deprecated-text-input-bg', '--deprecated-text-input-border', '--deprecated-text-input-border-hover', '--deprecated-text-input-border-disabled', '--deprecated-text-input-prefix' ];
    class ThemeSettings extends React.PureComponent {
      constructor(props) {
        super(props);

        this.state = {};
        this.state.store = JSON.parse(Storage.get(info + '_theme_settings', '{}'));

        this.state.rawVariables = this.props.code.match(/--([^*!\n}]*): ([^*\n}]*);/g) || [];
        this.state.variables = this.state.rawVariables.map((x) => {
          const spl = x.split(':');

          const name = spl[0].trim();
          const val = spl.slice(1).join(':').trim().slice(0, -1).replace(' !important', '');

          return [
            name,
            this.state.store[name] ?? val,
            val
          ];
        }).filter((x, i, s) => !discordVars.includes(x[0]) && !x[1].includes('var(') && !x[0].includes('glasscord') && s.indexOf(s.find((y) => y[0] === x[0])) === i);

        this.state.background = this.state.variables.find(x => (x[0].toLowerCase().includes('background') || x[0].toLowerCase().includes('bg') || x[0].toLowerCase().includes('wallpaper')) && !x[0].toLowerCase().includes('profile') && x[2].includes('http'));
        this.state.homeButton = this.state.variables.find(x => (x[0].toLowerCase().includes('home')) && x[2].includes('http'));
        this.state.fontPrimary = this.state.variables.find(x => (x[0].toLowerCase().includes('font')) && x[2].includes('sans-serif'));

        this.state.shouldShow = this.state.background || this.state.homeButton || this.state.fontPrimary;
      }

      render() {
        console.log(this.state);

        const saveVar = (name, val) => {
          this.state.store[name] = val;
          Storage.set(info + '_theme_settings', JSON.stringify(this.state.store));
        };

        const toggle = (name, desc, v) => React.createElement(goosemod.webpackModules.findByDisplayName('SwitchItem'), {
          note: desc,
          value: !v[1].startsWith('%'),

          className: 'topaz-theme-setting-toggle',

          onChange: x => {
            if (x) v[1] = v[1].slice(1);
              else v[1] = '%' + v[1];
            updateVar(...v);

            this.forceUpdate();
            saveVar(...v);
          }
        }, name);

        const text = (name, desc, v) => React.createElement(goosemod.settings.Items['text-input'], {
          text: name,
          subtext: desc,
          initialValue: () => v[1].replace(/url\(['"`]?(.*?)['"`]?\)/, (_, inner) => inner),
          oninput: x => {
            if (v[1].startsWith('url(')) x = 'url(' + x + ')';
            v[1] = x;

            updateVar(...v);
            saveVar(...v);
          }
        });

        const toggleable = (v, toggleName, toggleDesc, textName, textDesc) => [
          v && toggle(toggleName, toggleDesc, v),
          v && !v[1].startsWith('%') && text(textName, textDesc, v),
        ];

        return [
          ...toggleable(this.state.background, 'Background', 'Enable theme\'s custom background', 'Background URL'),
          ...toggleable(this.state.homeButton, 'Home Button', 'Enable theme\'s custom home button', 'Image URL'),
          ...toggleable(this.state.fontPrimary, 'Font', 'Enable theme\'s custom font', 'Font Name'),
        ];
      }
    }

    const setProps = { code: newCode };
    if (new ThemeSettings(setProps).state.shouldShow) plugin.__settings = {
      render: ThemeSettings,
      props: setProps
    };
  } else {
    const execContainer = new Onyx(info, manifest, transformRoot);
    let PluginClass = execContainer.eval(newCode);

    switch (mod) {
      case 'vel':
      case 'gm':
      case 'cc':
      case 'em':
      case 'dc':
        if (mod === 'cc' && typeof PluginClass === 'function') PluginClass = PluginClass({ persist: { ghost: {} } });

        plugin = PluginClass;
        if (mod === 'vel') plugin = plugin.Plugin;
        break;

      default:
        PluginClass.prototype.entityID = PluginClass.name ?? info; // Setup internal metadata
        PluginClass.prototype.manifest = manifest;
        PluginClass.prototype.data = manifest;

        plugin = new PluginClass();
    }

    switch (mod) {
      case 'bd':
        plugin._topaz_start = plugin.start;
        plugin._topaz_stop = plugin.stop;

        for (const x of [ 'name', 'description', 'version', 'author' ]) manifest[x] = plugin['get' + x.toUpperCase()[0] + x.slice(1)]?.() ?? manifest[x] ?? '';

        if (plugin.load) plugin.load();

        if (plugin.getSettingsPanel) plugin.__settings = {
          render: class BDSettingsWrapper extends React.PureComponent {
            constructor(props) {
              super(props);

              this.ref = React.createRef();
              this.ret = plugin.getSettingsPanel();
            }

            componentDidMount() {
              if (this.ret instanceof Node) this.ref.current.appendChild(this.ret);
            }

            render() {
              if (typeof this.ret === 'string') return React.createElement('div', {
                dangerouslySetInnerHTML: {
                  __html: this.ret
                }
              });

              if (this.ret instanceof Node) return React.createElement('div', {
                ref: this.ref
              });

              if (typeof this.ret === 'function') return React.createElement(this.ret);

              return this.ret;
            }
          }
        };

        break;

      case 'gm':
        plugin._topaz_start = () => {
          plugin.goosemodHandlers.onImport();
          plugin.goosemodHandlers.onLoadingFinished?.();
        };

        plugin._topaz_stop = () => plugin.goosemodHandlers.onRemove?.();

        if (settings) plugin.goosemodHandlers.loadSettings?.(settings);

        if (plugin.goosemodHandlers.getSettings) {
          plugin.settings = {
            get store() {
              return plugin.goosemodHandlers.getSettings() ?? {};
            }
          };

          let lastSettings = plugin.settings.store;
          setTimeout(() => {
            const newSettings = plugin.settings.store;
            if (newSettings !== lastSettings) {
              lastSettings = newSettings;
              savePlugins();
            }
          }, 5000);
        }

        break;

      case 'un':
        if (plugin.getSettingsPanel) plugin.__settings = {
          render: plugin.getSettingsPanel(),
          props: {
            settings: plugin.settings
          }
        };

        break;

      case 'vel':
        plugin._topaz_start = () => plugin.onStart();
        plugin._topaz_stop = () => plugin.onStop();

        const SettingComps = eval(`const module = { exports: {} };\n` + builtins['powercord/components/settings'] + `\nmodule.exports`);
        const saveVelSettings = (save = true) => {
          plugin.settings.store = { ...plugin.settings };
          delete plugin.settings.store.store;

          if (save) savePlugins();
        };

        plugin.settings = {};
        if (settings) plugin.settings = settings;
        saveVelSettings(false);

        if (plugin.getSettingsPanel) plugin.__settings = {
          render: class VelocitySettingsWrapper extends React.PureComponent {
            constructor(props) {
              super(props);

              this.ret = plugin.getSettingsPanel();
            }

            render() {
              return React.createElement('div', {

              },
                ...this.ret.map(x => {
                  switch (x.type) {
                    case 'input':
                      return React.createElement(SettingComps.TextInput, {
                        note: x.note,
                        defaultValue: plugin.settings[x.setting] ?? x.placeholder,
                        required: true,
                        onChange: val => {
                          plugin.settings[x.setting] = val;
                          saveVelSettings();

                          x.action(val);
                        }
                      }, x.name);
                  }
                })
              );
            }
          }
        };

        break;

      case 'dr':
        plugin._topaz_start = plugin.onStart;
        plugin._topaz_stop = plugin.onStop;

        plugin.onLoad();

        break;

      case 'cc':
        plugin._topaz_start = () => plugin.onLoad?.();
        plugin._topaz_stop = () => plugin.onUnload?.();

        break;

      case 'em':
        plugin._topaz_start = () => plugin.onStart?.();
        plugin._topaz_stop = () => plugin.onStop?.();

        break;

      case 'dc':
        plugin._topaz_start = () => {
          plugin.__dcStartOut = plugin.onStart?.();
        };

        plugin._topaz_stop = () => {
          plugin.onStop?.(plugin.__dcStartOut);
        };

        break;
    }

    if (!manifest.name && PluginClass.name) manifest.name = PluginClass.name;
    if (!manifest.author && isGitHub) manifest.author = repo.split('/')[0];
  }

  plugins[info] = plugin;

  if (!plugin.entityID) plugin.entityID = info; // Re-set metadata for themes and assurance
  plugin.__entityID = info;
  plugin.manifest = manifest;

  plugin.__enabled = !disabled;
  plugin.__mod = mod;
  plugin.__root = transformRoot;
  plugin.__autopatch = autopatchResult;

  if (!disabled) plugin._topaz_start();

  log('install', `installed ${info}! took ${(performance.now() - installStartTime).toFixed(2)}ms`);

  return [ manifest ];
};

const replaceLast = (str, from, to) => { // replace only last instance of string in string
  const ind = str.lastIndexOf(from);
  if (ind === -1) return str;

  return str.substring(0, ind) + to + str.substring(ind + from.length);
};

const fullMod = (mod) => {
  switch (mod) {
    case 'pc': return 'powercord';
    case 'bd': return 'betterdiscord';
    case 'gm': return 'goosemod';
    case 'vel': return 'velocity';
    case 'un': return 'unbound';
    case 'ast': return 'astra';
    case 'dr': return 'drdiscord';
    case 'cc': return 'cumcord';
    case 'rk': return 'rikka';
    case 'vz': return 'vizality';
    case 'em': return 'enmity';
    case 'dc': return 'demoncord';
    case 'ac': return 'aliucord';
  }
};

const displayMod = (mod) => {
  switch (mod) {
    case 'pc': return 'Powercord';
    case 'bd': return 'BetterDiscord';
    case 'gm': return 'GooseMod';
    case 'vel': return 'Velocity';
    case 'un': return 'Unbound';
    case 'ast': return 'Astra';
    case 'dr': return 'Discord Re-envisioned';
    case 'cc': return 'Cumcord';
    case 'rk': return 'Rikka';
    case 'vz': return 'Vizality';
    case 'em': return 'Enmity';
    case 'dc': return 'Demoncord';
    case 'ac': return 'Aliucord (RN)';
  }
};

const mapifyBuiltin = async (builtin) => {
  return `// MAP_START|${builtin}
${await includeRequires('', await builtins[builtin])}
// MAP_END\n\n`
};

let transformRoot;
const transform = async (path, code, mod) => {
  fetchProgressCurrent = 0;
  fetchProgressTotal = 0;
  lastError = '';

  transformRoot = path.split('/').slice(0, -1).join('/');

  if (path.endsWith('sx')) code = autoImportReact(code);

  let indexCode = await includeRequires(path, code);

  // do above so added to chunks
  const subGlobal = ((code.includes('ZeresPluginLibrary') || code.includes('ZLibrary')) ? await mapifyBuiltin('betterdiscord/libs/zeres') : '')
    + (code.includes('BDFDB_Global') ? await mapifyBuiltin('betterdiscord/libs/bdfdb') : '');

  let out = await mapifyBuiltin(fullMod(mod) + '/global') +
  Object.values(chunks).join('\n\n') + '\n\n' +
  subGlobal +
    `// MAP_START|${'.' + path.replace(transformRoot, '')}
${replaceLast(indexCode, 'export default', 'module.exports =')
  .replaceAll(/export const (.*?)=/g, (_, key) => `const ${key} = module.exports.${key}=`)
  .replaceAll(/export function (.*?)\(/g, (_, key) => `const ${key} = module.exports.${key} = function ${key}(`)
  .replaceAll(/export class ([^ ]*)/g, (_, key) => `const ${key} = module.exports.${key} = class ${key}`)
}
// MAP_END`;

  if (mod === 'dr') out = replaceLast(out, 'return class ', 'module.exports = class ');

  console.log({ pre: out });

  updatePending(null, 'Transforming...');

  lastError = '';

  try {
    out = sucrase.transform(out, { transforms: [ "typescript", "jsx" ], disableESTransforms: true }).code;
  } catch (e) {
    console.error('transform', e.message, out.split('\n')[parseInt(e.message.match(/\(([0-9]+):([0-9]+)\)/)[1])]);
    throw e;
  }

  out = `(function () {
${out}
})();`;

  console.log({ final: out });

  return out;
};

const topazSettings = JSON.parse(Storage.get('settings') ?? 'null') ?? {
  pluginSettingsSidebar: false,
  simpleUI: false,
  modalPages: false
};

const savePlugins = () => !topaz.__reloading && Storage.set('plugins', JSON.stringify(Object.keys(plugins).reduce((acc, x) => { acc[x] = plugins[x].settings?.store ?? {}; return acc; }, {})));

const setDisabled = (key, disabled) => {
  const store = JSON.parse(Storage.get('disabled') ?? '{}');

  if (disabled) {
    store[key] = true;
  } else {
    store[key] = undefined;
    delete store[key];
  }

  Storage.set('disabled', JSON.stringify(store));
};

const purgeCacheForPlugin = (info) => {
  let [ repo, branch ] = info.split('@');
  if (!branch) branch = 'HEAD'; // default to HEAD

  let isGitHub = !info.startsWith('http');

  let subdir;
  if (isGitHub) { // todo: check
    const spl = info.split('/');
    if (spl.length > 2) { // Not just repo
      repo = spl.slice(0, 2).join('/');
      subdir = spl.slice(4).join('/');
      branch = spl[3] ?? 'HEAD';
    }
  }

  if (isGitHub && repo) fetchCache.remove(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=true`); // remove gh api cache

  finalCache.remove(info); // remove final cache
  fetchCache.keys().filter(x => x.includes(info.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).forEach(y => fetchCache.remove(y)); // remove fetch caches
};

const purgePermsForPlugin = (info) => {
  const store = JSON.parse(Storage.get('permissions') ?? '{}');

  store[info] = undefined;
  delete store[info];

  Storage.set('permissions', JSON.stringify(store));
};


window.topaz = {
  version: topaz.version,
  settings: topazSettings,
  storage: Storage,

  install: async (info) => {
    const [ manifest ] = await install(info);

    // log('install', `installed ${info}! took ${(performance.now() - installStartTime).toFixed(2)}ms`);

    setTimeout(savePlugins, 1000);
  },

  uninstall: (info) => {
    if (!plugins[info]) return log('uninstall', 'plugin not installed');
    log('uninstall', info);

    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_stop();
    } catch (e) {
      console.error('UNINSTALL', e);
      // notify user?
    }

    delete plugins[info];

    if (!topaz.__reloading) {
      purgeCacheForPlugin(info);
      purgePermsForPlugin(info);

      topaz.storage.keys().filter(x => x.startsWith(info)).forEach(x => topaz.storage.delete(x)); // remove keys starting with info

      savePlugins();
      setDisabled(info, false); // Remove from disabled list
    }
  },
  uninstallAll: () => Object.keys(plugins).forEach((x) => topaz.uninstall(x)),

  enable: (info) => {
    if (!plugins[info]) return log('enable', 'plugin not installed');
    log('enable', info);

    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_start();
    } catch (e) {
      console.error('START', e);
      // notify user?
    }

    plugins[info].__enabled = true;

    setDisabled(info, false);
  },
  disable: (info) => {
    if (!plugins[info]) return log('disable', 'plugin not installed');
    log('disable', info);

    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_stop();
    } catch (e) {
      console.error('STOP', e);
      // notify user?
    }

    plugins[info].__enabled = false;

    setDisabled(info, true);
  },
  reload: (info) => {
    try { // wrap in try incase plugin failed to install so then fails to uninstall as it never inited properly
      plugins[info]._topaz_stop();
    } catch (e) {
      console.error('STOP', e);
      // notify user?
    }

    delete plugins[info];

    setTimeout(() => topaz.install(info), 200);
  },

  purge: () => {
    topaz.uninstallAll();
    for (const snippet in snippets) stopSnippet(snippet);

    cssEl.remove();
    attrs.remove();

    if (typeof Terminal !== 'undefined') Terminal();

    msgUnpatch();
    settingsUnpatch();
  },

  purgeCache: () => {
    fetchCache.purge();
    finalCache.purge();
  },
  getInstalled: () => Object.keys(plugins),

  internal: {
    registerSettings: (entityID, { label, render, category, props }) => {
      plugins[entityID].__settings = { render, props };
    },

    plugins,
    fetchCache,
    finalCache,
    builtins
  },

  reloadTopaz: async () => {
    eval(await (await fetch(`https://goosemod.github.io/topaz/out.js`, { cache: 'no-store' })).text());
  },

  log
};

const cssEl = document.createElement('style');
cssEl.appendChild(document.createTextNode(`#topaz-repo-filtering, #topaz-repo-autocomplete {
  position: absolute;
  z-index: 999;
  background: var(--background-floating);
  max-height: 280px;
  overflow-y: auto;
  border-radius: 0 0 3px 3px;
}

#topaz-repo-filtering > :not(:first-child) {
  margin: 0 8px;
}

#topaz-repo-filtering .divider-_0um2u {
  display: none;
}

#topaz-repo-filtering .container-1zDvAE {
  margin-bottom: 8px;
}

#topaz-repo-filtering .h5-2RwDNl {
  margin-bottom: 8px;
}

#topaz-repo-filtering > :first-child {
  margin-bottom: 10px;
}

#topaz-repo-filtering .container-1zDvAE .title-2dsDLn {
  color: var(--text-normal);
}

#topaz-repo-autocomplete > h5, #topaz-repo-filtering > :first-child {
  padding: 8px;
  font-weight: 600;
  font-size: 12px;
  line-height: 16px;
  font-family: var(--font-display);
  color: var(--header-secondary);
  text-transform: uppercase;
  border-bottom: 2px solid var(--background-primary);
}

#topaz-repo-autocomplete > h5 > button {
  float: right;
  width: 24px;
  height: 24px;
  margin-top: -4px;
}

#topaz-repo-autocomplete > h5 > button.active {
  color: var(--interactive-active);
}

#topaz-repo-autocomplete > h5 > button[aria-label="Filter"] svg {
  transform: scale(1.2);
  width: 16px;
  height: 16px;
}

#topaz-repo-autocomplete > div {
  padding: 12px;
  border-bottom: 2px solid var(--background-primary);
  color: var(--header-secondary);
  cursor: pointer;
}

#topaz-repo-autocomplete .title-2dsDLn {
  font-weight: 600;
  color: var(--text-normal);
}

#topaz-repo-autocomplete .code-style {
  float: right;

  font-family: var(--font-code);
  font-weight: 400;
  font-size: 10px;
}

#topaz-repo-autocomplete > div:hover {
  background: var(--background-secondary);
}

#topaz-repo-filtering {
  border-radius: 6px;
  width: 240px;
  box-shadow: var(--elevation-stroke), var(--elevation-medium);
}


.topaz-settings > [role="tablist"] {
  margin-bottom: 20px;
}

.topaz-settings .topaz-version {
  margin-left: 6px;
  font-family: var(--font-code);
  font-size: 10px;
}

.topaz-settings h1 ~ .vertical-3aLnqW .labelRow-2jl9gK > :first-child {
  font-size: 18px;
  font-weight: 600;
}

.topaz-loading-text {
  display: flex;
  flex: unset;
  height: 40px;
  min-width: 200px;
  justify-content: flex-end;
}

.topaz-loading-text > :first-child {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  margin-top: 10px;
}

.topaz-loading-text > :last-child {
  width: 160px;
}

.topaz-loading-text > :last-child > :last-child {
  display: block;
  font-size: 12px;
}

.topaz-settings div[style="display: flex; justify-content: space-between;"] {
  position: relative;
  /* margin-bottom: 10px; */
}

.topaz-settings div[style="display: flex; justify-content: space-between;"] > div:first-child {
  width: 80%;
}

.topaz-plugin-icons {
  position: absolute;
  /* top: 36px; */
  bottom: -12px;
  right: 0px;

  display: flex;
  gap: 4px;
}

.topaz-settings button[aria-label^="Uninstall"]:hover,
.topaz-settings button[aria-label^="Reinstall"]:hover {
  background: hsla(359,calc(var(--saturation-factor, 1)*82.6%),59.4%,0.6);
}

.topaz-tag {
  padding: 2px 8px;
  margin-right: 6px;
  border-radius: 8px;

  font-size: 14px;
  vertical-align: top;

  color: var(--text-normal);
  background: var(--background-floating);
}

.topaz-tag.tag-floating {
  background: var(--background-modifier-hover);
}

#app-mount .root-g14mjS:not([class^="carousel"]) {
  background: var(--background-primary);
}

#app-mount .root-g14mjS:not([class^="carousel"]) .separator-2lLxgC {
  box-shadow: unset;
  -webkit-box-shadow: unset;
  border-bottom: thin solid var(--background-modifier-accent);
}

.topaz-modal-content {
  padding-top: 20px;
}

.topaz-permissions-page .breadcrumbs-2uP7wU, .topaz-settings-page .breadcrumbs-2uP7wU {
  margin-bottom: 20px;
}

.topaz-permissions-page > div > div:last-child .divider-_0um2u, .topaz-permissions-modal-content > div > div:last-child .divider-_0um2u {
  display: none;
}

.topaz-permission-label {
  color: var(--text-normal);
  font-weight: 400;
}

.topaz-nomax-tooltip {
  max-width: unset !important;
}

.topaz-permission-danger-icon {
  display: inline-block;
  vertical-align: top;

  color: var(--status-danger-background);
  margin-right: 6px;
}

.topaz-permission-danger-icon + span {
  vertical-align: bottom;
}

div + .topaz-permission-choice {
  margin-top: 20px;
}

.topaz-permission-choice {
  margin-top: 10px;
}

.topaz-permission-choice .size14-k_3Hy4 {
  font-weight: 600;
  font-size: 16px;
}

.topaz-permission-reset {
  float: right;
}

.topaz-permission-summary {
  display: inline-block;
  line-height: 32px;
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 30px;
}

body .footer-31IekZ { /* Fix modal footers using special var */
  background: var(--background-secondary);
}

.topaz-permissions-page .divider-_0um2u, .topaz-permissions-modal-content .divider-_0um2u {
  margin-top: 20px;
  margin-bottom: 16px;
}

.topaz-settings .divider-q3P9HC {
  display: inline-flex;
  vertical-align: middle;
  margin: 0 20px;
  margin-right: 12px;
}

.topaz-settings h5 + .dividerDefault-3C2-ws {
  margin-top: 0;
  margin-bottom: 20px;
}

.topaz-settings > h5:nth-child(3) button {
  float: right;
  width: 28px;
  top: -6px;
  height: 28px;
}


.topaz-settings .topPill-3DJJNV {
  display: inline-flex;
}

.topaz-settings [aria-controls="settings-tab"] {
  position: absolute;
  right: 108px;
}

.topaz-settings [aria-controls="reload-tab"], .topaz-settings [aria-controls="changelog-tab"] {
  position: absolute;
  right: 64px;

  padding: 0;
  margin: 0;

  width: 24px;
  height: 24px;

  cursor: default;
}

.topaz-settings [aria-controls="changelog-tab"] {
  right: 32px;
}

.topaz-settings [aria-controls="reload-tab"] > button:hover {
  color: var(--status-danger);
  background: none;
}

.topaz-settings [aria-controls="changelog-tab"] > button:hover {
  color: var(--interactive-hover);
  background: none;
}

.topaz-settings [aria-controls="reload-tab"]:hover, .topaz-settings [aria-controls="changelog-tab"]:hover {
  background: none !important;
  cursor: unset !important;
}

.topaz-settings {
  --input-background: var(--background-secondary);
}

.topaz-pc-modal-jank {
  width: auto !important;
  max-width: initial !important;
  min-height: initial !important;
}

.topaz-editor-focus .contentColumn-1C7as6.contentColumnDefault-3eyv5o {
  max-width: calc(100vw - 270px);
  padding-bottom: 0;
}

.contentColumn-1C7as6.contentColumnDefault-3eyv5o {
  transition: max-width .5s;
}

.topaz-editor-focus .contentRegion-3HkfJJ {
  flex: 1 1 80%;
}

.contentRegion-3HkfJJ {
  transition: flex .5s;
}

.topaz-editor-focus .sidebarRegion-1VBisG {
  flex: 1 0 0;
}

.sidebarRegion-1VBisG {
  transition: flex .5s;
}

.topaz-editor-focus .toolsContainer-25FL6V {
  top: -50px;
}

.toolsContainer-25FL6V {
  transition: top .5s;
}

.topaz-editor-focus .contentRegionScroller-2_GT_N {
  overflow: visible;
}

.topaz-editor > * {
  width: 100%;
}

.topaz-editor-focus .topaz-editor > * {
  width: calc(100vw - 308px) !important;
}

.topaz-editor > section {
  height: 88vh !important;
}

.topaz-editor-no-files {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  gap: 12px;

  background: var(--background-tertiary);
}

.topaz-editor-no-files > :first-child {
  font-weight: 500;
  font-size: 20px;
  line-height: 24px;
  font-family: var(--font-display);
  color: var(--header-primary);
}

.topaz-editor-no-files > :nth-child(2) {
  font-weight: 500;
  font-size: 16px;
  line-height: 20px;
  color: var(--text-normal);
}

.topaz-editor-no-files svg {
  vertical-align: text-bottom;
  color: var(--text-muted);

  margin: 0 2px;
}

.topaz-editor > [role="tablist"] {
  overflow: auto hidden;
}

.topaz-editor > [role="tablist"] > [aria-controls^="#"] {
  position: absolute;
  right: 0px;
  padding: 3px;
}

.topaz-editor > [role="tablist"] > [aria-controls^="#new-tab"], .topaz-editor > [role="tablist"] > [aria-controls^="#library-tab"] {
  right: unset;
  position: unset;

  padding: 8px 6px;
}

.topaz-editor > [role="tablist"] > [aria-controls="#settings-tab"] {
  border-radius: 0 8px 0 0;
}

.topaz-editor > [role="tablist"] > [aria-controls="#reload-tab"] {
  right: 40px;
  border-radius: 8px 0 0 0;
  border-left: none;
}

.topaz-editor > [role="tablist"] > div {
  background: var(--background-secondary-alt);

  padding: 8px 4px 8px 12px;
  height: 40px;
}

.topaz-editor > [role="tablist"] > div > input {
  background: none;
  border: none;

  color: inherit;
  font-size: inherit;
  font-weight: inherit;

  padding: 0;
  margin: 0;
  min-width: 0;

  cursor: default;
}

.topaz-editor > [role="tablist"] > div > input:active {
  cursor: text;
}

.topaz-editor input[type="text"]::-webkit-search-decoration,
.topaz-editor input[type="text"]::-webkit-search-cancel-button,
.topaz-editor input[type="text"]::-webkit-search-results-button,
.topaz-editor input[type="text"]::-webkit-search-results-decoration {
  display: none;
}

.topaz-editor > [role="tablist"] > * > [aria-haspopup="listbox"] {
  padding: 0;
  background: none;
  border: none;

  margin-left: -6px;
  margin-right: 4px;
}

.topaz-editor > [role="tablist"] > * > [aria-haspopup="listbox"] > :last-child {
  display: none;
}



.topaz-file-popout {
  width: 140px !important;
  overflow: visible !important;
  max-height: unset !important;
}

.topaz-file-popout [aria-selected="true"] {
  padding-right: 32px;
}

.topaz-file-popout [aria-selected="true"] > svg {
  position: absolute;
  right: 6px;
}

.topaz-file-popout [data-list-item-id\$="-"] {
  background: var(--background-primary);
  height: 2px;
  margin: 10px 12px;
  padding: 0;

  pointer-events: none;
}

.topaz-file-popout .option-2eIyOn:focus:not(:hover):not([aria-selected="true"]) { /* Fix first option being highlighted for some reason */
  background-color: unset;
  color: var(--interactive-normal);
}

.topaz-editor > [role="tablist"] > * > input {
  flex-grow: 1;
  text-align: left;
}

.topaz-editor > [role="tablist"] > * > :last-child:not(:first-child) {
  margin-left: 6px;
}

.topaz-editor > [role="tablist"] > * {
  flex-shrink: 0;
}

.topaz-editor > [role="tablist"] > * > [aria-label="Delete"] svg {
  width: 18px;
  height: 18px;
}

.topaz-editor > [role="tablist"] > * > [aria-label="Delete"]:hover {
  color: var(--status-danger);
}

.topaz-editor > [role="tablist"] > div:not(:first-child) {
  border-left: 1px solid var(--background-secondary);
}

.topaz-editor > [role="tablist"] > div[aria-selected="true"] {
  background: var(--background-floating);
}

.topaz-editor-page {
  top: -30px;
  position: relative;
}

/* Rounding edges for bprder files */
.topaz-editor > [role="tablist"] > div:first-child { /* First */
  border-radius: 8px 0 0 0;
}

.topaz-editor > [role="tablist"] > div:nth-last-child(3) { /* Last */
  border-radius: 0 8px 0 0;
}

.topaz-snippets > .topaz-editor {
  display: flex;
}

.topaz-snippets > .topaz-editor > [role="tablist"] {
  flex-direction: column;
  background: var(--background-secondary-alt);
  width: 260px !important;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > * {
  border-radius: 0 !important;
  border-bottom: none;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > :not([aria-controls^="#"]) {
  border-left: 2px solid transparent;
  padding: 8px 4px 8px 16px;
  border-bottom: 1px solid var(--background-primary) !important;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > .selected-g-kMVV {
  border-left-color: var(--control-brand-foreground);
}

.topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls^="#"] {
  bottom: 0;
  border-left: none;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#settings-tab"] {
  border-radius: 8px 0 0 0 !important;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#new-tab"], .topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#library-tab"] {
  width: 50%;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#new-tab"] button, .topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#library-tab"] button {
  width: 100%;
}

.topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#library-tab"] {
  position: relative;
  left: 50%;
  transform: translateY(-100%);
  border-left: 1px solid var(--background-secondary);
}


.topaz-snippets > .topaz-editor > [role="tablist"] > [aria-controls="#reload-tab"] {
  display: none;
}

.topaz-snippets > .topaz-editor > section {
  width: calc(100% - 260px) !important;
}

.topaz-snippets > .topaz-editor > [role="tablist"] .input-2XRLou {
  position: relative;
  top: -3px;
  left: -4px;
}

/* Hide some elements for Simple UI */
.topaz-simple .topaz-tag { /* Mod tag */
  display: none;
}

.topaz-simple .topaz-tag + span { /* Plugin version */
  display: none;
}

.topaz-simple [aria-label="Reinstall"] { /* Reinstall button */
  display: none;
}

.topaz-simple [aria-label="Open Link"] { /* Open Link button */
  display: none;
}

.topaz-simple [aria-label="Permissions"] { /* Permissions button */
  display: none;
}

.topaz-simple [aria-label="Edit"] { /* Edit button */
  display: none;
}

#topaz-repo-autocomplete.topaz-simple .code-style { /* Hide repos in autocomplete */
  display: none;
}

.topaz-snippets-tooltip-bottom {
  transform: translateY(100%) !important;
  top: 44px;
}

.topaz-snippets-tooltip-bottom [class^="tooltipPointer"] {
  top: -10px;
}

.topaz-snippets-library-header {
  display: flex;
}

.topaz-snippets-library-header [role="tablist"] {
  display: inline-flex;
  margin-left: 20px;
  flex-grow: 1;
  position: relative;
}


.topaz-snippet {
  box-shadow: var(--elevation-medium);
  background: var(--background-secondary-alt);
  padding: 10px;
  width: 50%;
  border-radius: 8px;

  position: relative;

  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;
}

.topaz-snippet > :first-child {
  width: calc(100% + 20px);
  margin-top: -10px;
  margin-left: -10px;

  object-fit: contain;
  background: var(--background-tertiary);
  height: 200px;

  border-radius: 8px 8px 0 0;
}

.topaz-snippet h2 {
  margin: 8px 0;

  font-size: 18px;
  position: relative;
}

.topaz-snippet > h2 div {
  align-items: center;
  display: inline-flex;
  gap: 6px;
  border-radius: 20px;

  position: absolute;
  right: 0;
  top: 0;
}

.topaz-snippet > h2 div > img {
  border-radius: 50%;
}

.topaz-snippet > h2 div > span {
  color: var(--header-primary);
  font-size: 16px;
  line-height: 16px;
}

.topaz-snippet > h2 > span {
  width: 75%;
  display: inline-block;
}

.topaz-snippet .paragraph-9M861H {
  margin-bottom: 0 !important;
  word-break: break-word;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topaz-snippet > :last-child {
  display: flex;
  gap: 20px;

  margin-top: auto;
}

.topaz-snippet > :last-child > :last-child:not(:first-child) {
  padding: 2px 6px;
  min-width: 0;
}

.topaz-snippet > :last-child > :last-child:not(:first-child) svg {
  transform: scaleX(-1);
}

.topaz-snippet-container {
  overflow: hidden scroll;
  padding-right: 8px;
  display: grid;
  grid-template-columns: calc(50% - 26px) calc(50% - 26px);
  gap: 40px;
  width: 100%;
  box-sizing: border-box;
  overflow: visible;
}

.topaz-theme-setting-toggle > :last-child {
  display: none;
}

.topaz-changelog-advanced {
  position: absolute;
  right: 60px;
  top: 19px;
}

.topaz-changelog-advanced .control-1fl03- {
  margin-left: 8px;
}

.topaz-changelog-advanced .divider-_0um2u {
  display: none;
}

.topaz-terminal {
  position: absolute;
  background: var(--background-floating);
  box-shadow: var(--elevation-high);
  z-index: 99999;
  width: 700px;
  height: 500px;
  top: 30px;
  left: 200px;
  display: flex;
  flex-direction: column;
}

.topaz-terminal > :first-child {
  background: var(--background-tertiary);
  padding: 16px;
  color: var(--header-primary);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
}

.topaz-terminal > :first-child > :last-child {
  cursor: pointer;
  font-size: 24px;
  float: right;
  height: 0;
  margin-top: -2px;
}

.topaz-terminal > :last-child {
  padding: 6px;
  font-size: 14px;
  color: var(--text-normal);
  font-family: var(--font-code);
  white-space: pre-wrap;
  word-break: break-all;
  flex-grow: 1;
  overflow: auto;
  padding-right: 0;
}

.topaz-autopatcher-icon {
  vertical-align: text-bottom;
}`));
document.head.appendChild(cssEl);

log('init', `topaz loaded! took ${(performance.now() - initStartTime).toFixed(0)}ms`);

(async () => {
  const disabled = JSON.parse(Storage.get('disabled') ?? '{}');

  for (const p in pluginsToInstall) {
    let settings = pluginsToInstall[p];
    if (typeof settings === 'object' && Object.keys(settings).length === 0) settings = undefined; // {} -> undefined

    try {
      await install(p, settings, disabled[p] ?? false);
    } catch (e) {
      console.error('Init install fail', p, e);
    }
  }

  try { updateOpenSettings(); } catch { }
})();

const activeSnippets = {};
const startSnippet = async (file, content) => {
  let code;

  if (file.endsWith('css')) {
    code = await transformCSS('https://discord.com/channels/@me', 'https://discord.com/channels/@me', content, !file.endsWith('scss'), false);

    const cssEl = document.createElement('style');
    cssEl.appendChild(document.createTextNode(code));
    document.body.appendChild(cssEl);

    activeSnippets[file] = () => cssEl.remove();
  } else if (file.includes('.js')) {
    code = await transform('https://discord.com/channels/@me', content, 'pc');
    const ret = eval(`const __entityID = 'snippet';
\n` + code);

    activeSnippets[file] = () => {}; // no way to stop?
    if (typeof ret === 'function') activeSnippets[file] = ret; // if returned a function, guess it's a stop handler
  }
};
const stopSnippet = (file) => activeSnippets[file]?.();


const snippets = JSON.parse(Storage.get('snippets') ?? '{}');
const snippetsToggled = JSON.parse(Storage.get('snippets_toggled') ?? '{}');
for (const snippet in snippets) {
  if (snippetsToggled[snippet]) startSnippet(snippet, snippets[snippet]);
}

let popular;
(async () => { // Load async as not important / needed right away
  popular = await (await fetch(`https://goosemod.github.io/topaz/popular.json`)).json();
})();

const updateOpenSettings = async () => {
  if (!document.querySelector('.selected-g-kMVV[aria-controls="topaz-tab"]')) return;

  try {
    await new Promise((res) => setTimeout(res, 10));

    const prevScroll = document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop;

    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Advanced');
    goosemod.webpackModules.findByProps('setSection', 'close', 'submitComplete').setSection('Topaz');

    document.querySelector('.standardSidebarView-E9Pc3j .sidebarRegionScroller-FXiQOh').scrollTop = prevScroll;
  } catch { }
};

const { React, ReactDOM } = goosemod.webpackModules.common;

const TabBar = goosemod.webpackModules.findByDisplayName('TabBar');
const TabBarClasses1 = goosemod.webpackModules.findByProps('topPill');
const TabBarClasses2 = goosemod.webpackModules.findByProps('tabBar', 'nowPlayingColumn')

const ScrollerClasses = goosemod.webpackModules.findByProps('scrollerBase', 'thin');

let selectedTab = 'PLUGINS';
let textInputs = {
  PLUGINS: '',
  THEMES: ''
};

const Text = goosemod.webpackModules.find(x => x.Text?.displayName === 'Text').Text;
const Heading = goosemod.webpackModules.findByProps('Heading').Heading;
const Breadcrumbs = goosemod.webpackModules.findByDisplayName('Breadcrumbs');
const BreadcrumbClasses = goosemod.webpackModules.findByProps('breadcrumbActive');
const Button = goosemod.webpackModules.findByProps('Sizes', 'Colors', 'Looks', 'DropdownSizes');
const LegacyText = goosemod.webpackModules.findByDisplayName('LegacyText');
const Spinner = goosemod.webpackModules.findByDisplayName('Spinner');
const PanelButton = goosemod.webpackModules.findByDisplayName('PanelButton');
const FormTitle = goosemod.webpackModules.findByDisplayName('FormTitle');
const Markdown = goosemod.webpackModules.find((x) => x.displayName === 'Markdown' && x.rules);
const DropdownArrow = goosemod.webpackModules.findByDisplayName('DropdownArrow');
const HeaderBarContainer = goosemod.webpackModules.findByDisplayName('HeaderBarContainer');
const FormItem = goosemod.webpackModules.findByDisplayName('FormItem');
const TextInput = goosemod.webpackModules.findByDisplayName('TextInput');
const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Margins = goosemod.webpackModules.findByProps('marginTop20', 'marginBottom20');
const _Switch = goosemod.webpackModules.findByDisplayName('Switch');
const Tooltip = goosemod.webpackModules.findByDisplayName('Tooltip');

const TextAndChild = goosemod.settings.Items['text-and-child'];
const TextAndButton = goosemod.settings.Items['text-and-button'];
const TextAndToggle = goosemod.settings.Items['toggle'];
const Divider = goosemod.settings.Items['divider'];

class Switch extends React.PureComponent {
  render() {
    return React.createElement(_Switch, {
      checked: this.props.checked,
      onChange: x => {
        this.props.checked = x;
        this.forceUpdate();

        this.props.onChange(x);
      }
    })
  }
}

class TZErrorBoundary extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      error: false
    };
  }

  componentDidCatch(error, moreInfo) {
    console.log('honk', {error, moreInfo});

    const errorStack = decodeURI(error.stack.split('\n').filter((x) => !x.includes('/assets/')).join('\n'));
    const componentStack = decodeURI(moreInfo.componentStack.split('\n').slice(1, 9).join('\n'));


    const suspectedPlugin = errorStack.match(/\((.*) \| GM Module:/)?.[1] ?? componentStack.match(/\((.*) \| GM Module:/)?.[1] ??
      errorStack.match(/\((.*) \| Topaz:/)?.[1] ?? componentStack.match(/\((.*) \| Topaz:/)?.[1];

    let suspectedName = suspectedPlugin ?? 'Unknown';
    const suspectedType = suspectedPlugin ? 'Plugin' : 'Cause';

    if (suspectedName === 'Unknown') {
      if (errorStack.includes('GooseMod')) {
        suspectedName = 'GooseMod Internals';
      }

      if (errorStack.includes('Topaz')) {
        suspectedName = 'Topaz Internals';
      }

      if (errorStack.toLowerCase().includes('powercord') || errorStack.toLowerCase().includes('betterdiscord')) {
        suspectedName = 'Other Mods';
      }
    }

    this.setState({
      error: true,

      suspectedCause: {
        name: suspectedName,
        type: suspectedType
      },

      errorStack: {
        raw: error.stack,
        useful: errorStack
      },

      componentStack: {
        raw: moreInfo.componentStack,
        useful: componentStack
      }
    });
  }

  render() {
    if (this.state.toRetry) {
      this.state.error = false;
    }

    setTimeout(() => {
      this.state.toRetry = true;
    }, 100);

    return this.state.error ? React.createElement('div', {
      className: 'gm-error-boundary'
    },
      React.createElement('div', {},
        React.createElement('div', {}),

        React.createElement(FormTitle, {
          tag: 'h1'
        }, this.props.header ?? 'Topaz has handled an error',
          (this.props.showSuspected ?? true) ? React.createElement(Markdown, {}, `## Suspected ${this.state.suspectedCause.type}: ${this.state.suspectedCause.name}`) : null
        )
      ),

      React.createElement('div', {},
        React.createElement(Button, {
          color: Button.Colors.BRAND,
          size: Button.Sizes.LARGE,

          onClick: () => {
            this.state.toRetry = true;
            this.forceUpdate();
          }
        }, 'Retry'),

        React.createElement(Button, {
          color: Button.Colors.RED,
          size: Button.Sizes.LARGE,

          onClick: () => {
            location.reload();
          }
        }, 'Refresh')
      ),

      React.createElement('div', {
        onClick: () => {
          this.state.toRetry = false;
          this.state.showDetails = !this.state.showDetails;
          this.forceUpdate();
        }
      },
        React.createElement('div', {
          style: {
            transform: `rotate(${this.state.showDetails ? '0' : '-90'}deg)`
          },
        },
          React.createElement(DropdownArrow, {
            width: 24,
            height: 24
          })
        ),

        this.state.showDetails ? 'Hide Details' : 'Show Details'
      ),

      this.state.showDetails ? React.createElement('div', {},
        React.createElement(Markdown, {}, `# Error Stack`),
        React.createElement(Markdown, {}, `\`\`\`
${this.state.errorStack.useful}
\`\`\``),
        React.createElement(Markdown, {}, `# Component Stack`),
        React.createElement(Markdown, {}, `\`\`\`
${this.state.componentStack.useful}
\`\`\``),
        /* React.createElement(Markdown, {}, `# Debug Info`),
        React.createElement(Markdown, {}, `\`\`\`
${goosemod.genDebugInfo()}
\`\`\``) */
      ) : null
    ) : this.props.children;
  }
}

const openSub = (plugin, type, _content) => {
  const useModal = topazSettings.modalPages;

  const breadcrumbBase = {
    activeId: '0',
    breadcrumbs: useModal ? [
      { id: '1', label: plugin },
      { id: '0', label: type[0].toUpperCase() + type.slice(1) },
    ] : [
      { id: '1', label: 'Topaz' },
      { id: '0', label: plugin + ' ' + type[0].toUpperCase() + type.slice(1) }
      /* { id: '1', label: plugin },
      { id: '0', label: type[0].toUpperCase() + type.slice(1) }, */
    ],

    onBreadcrumbClick: (x) => {},
  };

  const content = React.createElement(TZErrorBoundary, {
    header: 'Topaz failed to render ' + type + ' for ' + plugin,
    showSuspected: false
  }, _content);

  if (useModal) {
    const LegacyHeader = goosemod.webpackModules.findByDisplayName('LegacyHeader');

    openSub_modal(React.createElement(Breadcrumbs, {
      ...breadcrumbBase,
      renderCustomBreadcrumb: ({ label }, active) => React.createElement(LegacyHeader, {
        tag: 'h2',
        size: LegacyHeader.Sizes.SIZE_20,
        className: active ? BreadcrumbClasses.breadcrumbActive : BreadcrumbClasses.breadcrumbInactive
      }, label)
    }), content, type);
  } else {
    const titleClasses = goosemod.webpackModules.findByProps('h1');

    openSub_page(React.createElement(FormTitle, {
      tag: 'h1',
    },
      React.createElement(Breadcrumbs, {
        ...breadcrumbBase,
        onBreadcrumbClick: ({ id, label }) => {
          if (id === '1') updateOpenSettings();
        },
        renderCustomBreadcrumb: ({ label }, active) => React.createElement('span', {
          className: titleClasses.h1 + ' ' + (active ? BreadcrumbClasses.breadcrumbActive : BreadcrumbClasses.breadcrumbInactive)
        }, label)
      })
    ), content, type);
  }
};

const openSub_page = (header, content, type) => {
  ReactDOM.render(React.createElement('div', {
    className: `topaz-${type}-page`
  },
    header,

    content
  ), document.querySelector('.topaz-settings'));
};

const openSub_modal = (header, content, type) => {
  const ModalStuff = goosemod.webpackModules.findByProps('ModalRoot');
  const { openModal } = goosemod.webpackModules.findByProps('openModal', 'updateModal');
  const Flex = goosemod.webpackModules.findByDisplayName('Flex');

  openModal((e) => {
    return React.createElement(ModalStuff.ModalRoot, {
      transitionState: e.transitionState,
      size: 'large'
    },
      React.createElement(ModalStuff.ModalHeader, {},
        React.createElement(Flex.Child, {
          basis: 'auto',
          grow: 1,
          shrink: 1,
          wrap: false,
        },
          header
        ),
        React.createElement('FlexChild', {
          basis: 'auto',
          grow: 0,
          shrink: 1,
          wrap: false
        },
          React.createElement(ModalStuff.ModalCloseButton, {
            onClick: e.onClose
          })
        )
      ),

      React.createElement(ModalStuff.ModalContent, {
        className: `topaz-modal-content topaz-${type}-modal-content`
      },
        content
      )
    )
  });
};

class Plugin extends React.PureComponent {
  render() {
    const { manifest, repo, state, substate, settings, entityID, mod, isTheme, autopatch } = this.props;

    return React.createElement(TextAndChild, {
      text: !manifest ? repo : [
        !mod ? null : React.createElement(Tooltip, {
          text: displayMod(mod),
          position: 'top'
        }, ({ onMouseLeave, onMouseEnter }) => React.createElement('span', {
            className: 'topaz-tag',

            onMouseEnter,
            onMouseLeave
          }, mod.toUpperCase()),
        ),

        autopatch && autopatch.changes.length > 0 && React.createElement(Tooltip, {
          position: 'top',
          color: 'primary',
          tooltipClassName: 'topaz-nomax-tooltip',

          text: `Autopatched${autopatch.changes.length > 1 ? ` (${autopatch.changes.length} changes)` : ''}`
        }, ({
          onMouseLeave,
          onMouseEnter
        }) => React.createElement(goosemod.webpackModules.findByDisplayName('BugCatcher'), {
          // className: 'topaz-permission-danger-icon',
          className: 'topaz-autopatcher-icon',
          width: 20,
          height: 20,

          onMouseEnter,
          onMouseLeave
        })),

        manifest.name,

        manifest.version ? React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '4px'
          }
        }, 'v' + manifest.version) : null,

        manifest.author && React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '4px',
            marginRight: '4px'
          }
        }, 'by'),

        (manifest.author ?? '').split('#')[0],

        /* manifest.author.split('#')[1] ? React.createElement('span', {
          class: 'description-30xx7u',
          style: {
            marginLeft: '1px'
          }
        }, '#' + manifest.author.split('#')[1]) : null */
      ],

      subtext: manifest?.description,
    },
      !state ? React.createElement(Switch, {
        checked: this.props.enabled,
        onChange: x => {
          topaz[x ? 'enable' : 'disable'](entityID);
        }
      }) : React.createElement(LegacyText, {
        size: goosemod.webpackModules.findByProps('size16', 'size32').size16,
        className: goosemod.webpackModules.findByProps('title', 'dividerDefault').title + ' topaz-loading-text'
      },
        state !== 'Error' ? React.createElement(Spinner, {
          type: 'spinningCircle'
        }) : React.createElement(goosemod.webpackModules.findByDisplayNameAll('CloseCircle')[1], {
          // backgroundColor: "hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%)",
          // color: "hsl(0, calc(var(--saturation-factor, 1) * 0%), 100%)",
          color: "hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%)",
          width: 24,
          height: 24
        }),

        React.createElement('span', {
        }, state,
          React.createElement('span', {
            class: 'description-30xx7u'
          }, substate || 'Finding index...')
        )
      ),

      state ? null : React.createElement('div', {
        className: 'topaz-plugin-icons'
      },
        settings ? React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Gear'),
          tooltipText: 'Settings',
          onClick: () => {
            openSub(manifest.name, 'settings', React.createElement(settings.render, settings.props ?? {}));
          }
        }) : null,

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Pencil'),
          tooltipText: 'Edit',
          onClick: async () => {
            const plugin = plugins[entityID];
            const getUrl = file => plugin.__root + '/' + file;

            const files = fetchCache.keys().filter(x => !x.includes('api.github.com') && x.includes(entityID.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).reduce((acc, x) => { acc[x.replace(plugin.__root + '/', '')] = fetchCache.get(x); return acc; }, {});

            openSub(manifest.name, 'editor', React.createElement(await Editor.Component, {
              files,
              plugin,
              onChange: (file, content) => {
                fetchCache.set(getUrl(file), content);

                files[file] = content;
              },
              onRename: (old, val) => {
                const oldUrl = getUrl(old);

                fetchCache.set(getUrl(val), fetchCache.get(oldUrl));
                fetchCache.remove(oldUrl);

                files[val] = files[old];
                delete files[old];
              },
              onDelete: (file) => {
                fetchCache.remove(getUrl(file));

                delete files[file];
              }
            }));
          }
        }),

        !isTheme ? React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('PersonShield'),
          tooltipText: 'Permissions',
          onClick: async () => {
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

            const givenPermissions = JSON.parse(Storage.get('permissions') ?? '{}')[entityID] ?? {};

            const entryClasses = goosemod.webpackModules.findByProps('entryItem');

            const grantedPermCount = Object.values(givenPermissions).filter(x => x === true).length;

            openSub(manifest.name, 'permissions', React.createElement('div', {},
              React.createElement(Heading, {
                level: 3,
                variant: 'heading-md/medium',
                className: 'topaz-permission-summary'
              }, `${grantedPermCount} Granted Permission${grantedPermCount === 1 ? '' : 's'}`),

              React.createElement(Button, {
                color: Button.Colors.RED,
                size: Button.Sizes.SMALL,
                className: 'topaz-permission-reset',

                onClick: () => {
                  // save permission allowed/denied
                  const store = JSON.parse(Storage.get('permissions') ?? '{}');

                  store[entityID] = {};

                  Storage.set('permissions', JSON.stringify(store));

                  setTimeout(() => { // reload plugin
                    topaz.reload(entityID);
                    goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + manifest.name, 0, { duration: 5000, position: 1 }));
                  }, 100);
                }
              }, 'Reset'),

              ...Object.keys(perms).map(category => React.createElement('div', {},
                React.createElement(Heading, {
                  level: 3,
                  variant: 'heading-md/medium'
                }, category[0].toUpperCase() + category.slice(1).replaceAll('_', ' ')),

                React.createElement('div', {
                  className: goosemod.webpackModules.findByProps('listContainer', 'addButton').listContainer
                },
                  ...Object.keys(perms[category]).filter(x => givenPermissions[perms[category][x]] !== undefined).map(perm => React.createElement('div', { className: entryClasses.entryItem },
                    React.createElement('div', { className: entryClasses.entryName },
                      React.createElement(Text, {
                        color: 'header-primary',
                        variant: 'text-md/normal',
                        className: 'topaz-permission-label'
                      }, perm)
                    ),
                    React.createElement('div', { className: entryClasses.entryActions },
                      React.createElement(Switch, {
                        checked: givenPermissions[perms[category][perm]],
                        onChange: (x) => {
                          // save permission allowed/denied
                          const store = JSON.parse(Storage.get('permissions') ?? '{}');
                          if (!store[entityID]) store[entityID] = {};

                          store[entityID][perms[category][perm]] = x;

                          Storage.set('permissions', JSON.stringify(store));

                          setTimeout(() => { // reload plugin
                            topaz.reload(entityID);
                            goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast('Reloaded ' + manifest.name, 0, { duration: 5000, position: 1 }));
                          }, 100);
                        }
                      })
                    )
                  ))
                ),

                React.createElement(Divider),
              )).filter(x => x.props.children[1].props.children)
            ));
          }
        }) : null,

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Link'),
          tooltipText: 'Open Link',
          onClick: async () => {
            let link = entityID.includes('http') ? entityID : `https://github.com/${entityID}`;
            if (link.includes('raw.githubusercontent.com')) link = 'https://github.com/' + [...link.split('/').slice(3, 5), 'blob', ...link.split('/').slice(5)].join('/'); // raw github links -> normal

            window.open(link);
          }
        }),

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Retry'),
          tooltipText: 'Reinstall',
          onClick: async () => {
            await topaz.uninstall(entityID);

            const rmPending = addPending({ repo: entityID, state: 'Installing...' });
            updateOpenSettings();

            await topaz.install(entityID);
            rmPending();
            updateOpenSettings();
          }
        }),

        React.createElement(PanelButton, {
          icon: goosemod.webpackModules.findByDisplayName('Trash'),
          tooltipText: 'Uninstall',
          onClick: this.props.onUninstall
        }),
      )
    );
  }
}

const saveTopazSettings = () => Storage.set('settings', JSON.stringify(topazSettings));

class TopazSettings extends React.PureComponent {
  render() {
    return React.createElement('div', {

    },
      React.createElement(FormTitle, {
        tag: 'h5',
        className: Margins.marginBottom8,
      }, 'Appearance'),

      React.createElement(TextAndToggle, {
        text: 'Simple UI',
        subtext: 'Hides some more technical UI elements',
        isToggled: () => topazSettings.simpleUI,
        onToggle: x => {
          topazSettings.simpleUI = x;
          saveTopazSettings();
        }
      }),

      React.createElement(TextAndToggle, {
        text: 'Use Modals',
        subtext: 'Use modals instead of pages for plugin menus',
        isToggled: () => topazSettings.modalPages,
        onToggle: x => {
          topazSettings.modalPages = x;
          saveTopazSettings();
        }
      }),

      React.createElement(TextAndToggle, {
        text: 'Add Plugin Settings To Sidebar',
        subtext: 'Adds plugin\'s settings to sidebar',
        isToggled: () => topazSettings.pluginSettingsSidebar,
        onToggle: x => {
          topazSettings.pluginSettingsSidebar = x;
          saveTopazSettings();
        }
      }),

      React.createElement(FormTitle, {
        tag: 'h5',
        className: Margins.marginBottom8,
      }, 'Actions'),

      React.createElement(TextAndButton, {
        text: 'Purge Caches',
        subtext: 'Purge Topaz\'s caches completely',
        buttonText: 'Purge',

        onclick: () => {
          fetchCache.purge();
          finalCache.purge();
        }
      }),

      React.createElement(FormTitle, {
        tag: 'h5',
        className: Margins.marginBottom8,
      }, 'Backup'),

      React.createElement(TextAndButton, {
        text: 'Download Backup',
        subtext: 'Download a backup file of your Topaz plugins, themes, and settings',
        buttonText: 'Download',

        onclick: () => {
          const toSave = JSON.stringify(topaz.storage.keys().filter(x => !x.startsWith('cache_')).reduce((acc, x) => {
            acc[x] = topaz.storage.get(x);
            return acc;
          }, {}));

          const el = document.createElement("a");
          el.style.display = 'none';

          const file = new Blob([ toSave ], { type: 'application/json' });

          el.href = URL.createObjectURL(file);
          el.download = `topaz_backup.json`;

          document.body.appendChild(el);

          el.click();
          el.remove();
        }
      }),

      React.createElement(TextAndButton, {
        text: 'Restore Backup',
        subtext: 'Restores your Topaz setup from a backup file. **Only load backups you trust**',
        buttonText: 'Restore',

        onclick: async () => {
          const el = document.createElement('input');
          el.style.display = 'none';
          el.type = 'file';

          el.click();

          await new Promise(res => { el.onchange = () => res(); });

          const file = el.files[0];
          if (!file) return;

          const reader = new FileReader();

          reader.onload = () => {
            const obj = JSON.parse(reader.result);

            for (const k in obj) {
              topaz.storage.set(k, obj[k]);
            }

            setTimeout(() => location.reload(), 500);
          };

          reader.readAsText(file);
        }
      }),
    )
  }
}

let activeSnippet;
class Snippets extends React.PureComponent {
  render() {
    const _Editor = (Editor.Component instanceof Promise ? 'div' : Editor.Component) ?? 'div';
    if (_Editor === 'div') setTimeout(() => this.forceUpdate(), 200);

    const saveSnippets = () => {
      Storage.set('snippets', JSON.stringify(snippets));
      Storage.set('snippets_toggled', JSON.stringify(snippetsToggled));
    };

    const updateSnippet = (file, content) => {
      snippets[file] = content;
      if (snippetsToggled[file] === undefined) snippetsToggled[file] = true;

      saveSnippets();

      stopSnippet(file);
      if (snippetsToggled[file] && content) startSnippet(file, content);
    };

    return React.createElement('div', {
      className: 'topaz-snippets'
    },
      React.createElement(_Editor, {
        files: snippets,
        toggled: snippetsToggled,
        defaultFile: snippets[activeSnippet] ? activeSnippet : undefined,
        plugin: { entityID: 'snippets' },
        fileIcons: true,

        onChange: (file, content) => updateSnippet(file, content),
        onToggle: (file, toggled) => {
          snippetsToggled[file] = toggled;
          updateSnippet(file, snippets[file]);
        },
        onRename: (old, val) => {
          snippets[val] = snippets[old];
          delete snippets[old];

          snippetsToggled[val] = snippetsToggled[old];
          delete snippetsToggled[old];

          if (activeSnippet === old) activeSnippet = val;

          stopSnippet(old);
          updateSnippet(val, snippets[val]);
        },
        onDelete: (file) => {
          delete snippets[file];
          delete snippetsToggled[file];

          saveSnippets();
          stopSnippet(file);
        },

        onOpen: (file) => activeSnippet = file
      })
    );
  }
}

const autocompleteFiltering = JSON.parse(Storage.get('autocomplete_filtering', 'null')) ?? {
  mods: {}
};

class Settings extends React.PureComponent {
  render() {
    const textInputHandler = (inp, init = false) => {
      const addFilterPopout = () => {
        if (document.querySelector('#topaz-repo-filtering')) return; // already open

        const popout = document.createElement('div');
        popout.id = 'topaz-repo-filtering';
        popout.className = ScrollerClasses.thin + (topazSettings.simpleUI ? ' topaz-simple' : '');

        const autoPos = autocomplete.getBoundingClientRect();

        popout.style.top = autoPos.top + 'px';
        popout.style.left = autoPos.right + 8 + 'px';

        document.body.appendChild(popout);

        const regen = () => textInputHandler(el.value ?? '');

        const mods = Object.keys(recom).reduce((acc, x) => {
          const mod = x.split('%')[0].toLowerCase();
          if (!acc.includes(mod)) acc.push(mod);
          return acc;
        }, []);

        class FilterPopout extends React.PureComponent {
          render() {
            return React.createElement(React.Fragment, {},
              React.createElement('h5', {}, 'Filters'),
              React.createElement(FormTitle, {
                tag: 'h5'
              }, 'Mods'),

              ...mods.map(x => React.createElement(goosemod.webpackModules.findByDisplayName('SwitchItem'), {
                value: autocompleteFiltering.mods[x] !== false,
                onChange: y => {
                  autocompleteFiltering.mods[x] = y;

                  this.forceUpdate();
                  regen();

                  Storage.set('autocomplete_filtering', JSON.stringify(autocompleteFiltering));
                }
              }, displayMod(x)))
            );
          }
        }

        ReactDOM.render(React.createElement(FilterPopout), popout);
      };

      const removeFilterPopout = () => {
        document.querySelector('#topaz-repo-filtering')?.remove?.();
      };

      const el = document.querySelector('.topaz-settings .input-2g-os5');

      const install = async (info) => {
        const rmPending = addPending({ repo: info, state: 'Installing...' });

        this.forceUpdate();
        setTimeout(() => { this.forceUpdate(); }, 300);

        try {
          await topaz.install(info);
        } catch (e) {
          console.error('INSTALL', e);

          purgeCacheForPlugin(info); // try to purge cache if failed

          const currentPend = pending.find(x => x.repo === info);
          const rmError = addPending({ repo: info, state: 'Error', substate: lastError ?? e.toString().substring(0, 30), manifest: currentPend.manifest });
          setTimeout(rmError, 2000);
        }

        rmPending();

        this.forceUpdate();
        setTimeout(() => { updateOpenSettings(); }, 500); // force update because jank
      };


      if (!el.placeholder) {
        const placeholder = 'GitHub repo / URL';
        el.placeholder = placeholder;

        el.onkeydown = async (e) => {
          if (e.keyCode !== 13) return;

          const info = el.value;
          el.value = '';
          // el.value = 'Installing...';

          install(info);
        };

        el.onfocus = () => {
          textInputHandler(el.value ?? '');

          document.onclick = e => {
            if (e.target.placeholder !== placeholder && !e.path.some(x => x.id === 'topaz-repo-autocomplete') && !e.path.some(x => x.id === 'topaz-repo-filtering')) setTimeout(() => {
              removeFilterPopout();
              document.querySelector('#topaz-repo-autocomplete').style.display = 'none';

              document.onclick = null;
            }, 10);
          };
        };
      }

      let autocomplete = document.querySelector('#topaz-repo-autocomplete');
      if (!autocomplete) {
        autocomplete = document.createElement('div');
        autocomplete.id = 'topaz-repo-autocomplete';
        autocomplete.className = ScrollerClasses.thin + (topazSettings.simpleUI ? ' topaz-simple' : '');

        document.body.appendChild(autocomplete);
      }

      const inputPos = el.getBoundingClientRect();

      autocomplete.style.top = inputPos.bottom + 'px';
      autocomplete.style.left = inputPos.left + 'px';
      autocomplete.style.width = inputPos.width + 'px';

      const fuzzySearch = new RegExp(`.*${inp.replace(' ', '[-_ ]')}.*`, 'i');

      const recom = popular[selectedTab.toLowerCase()];
      const infoFromRecom = (x) => x.endsWith('.plugin.js') ? x.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '') : x.replace('https://github.com/', '');
      const matching = Object.keys(recom).filter((x) => !plugins[infoFromRecom(recom[x])] && fuzzySearch.test(x) && autocompleteFiltering.mods[x.split('%')[0].toLowerCase()] !== false);

      if (!init) {
        ReactDOM.render(React.createElement(React.Fragment, {},
          React.createElement('h5', {},
            'Popular ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes'),

            React.createElement(PanelButton, {
              icon: goosemod.webpackModules.findByDisplayName('Filter'),
              tooltipText: 'Filter',

              onClick: () => {
                if (document.querySelector('#topaz-repo-filtering')) {
                  removeFilterPopout();
                  document.querySelector('[aria-label="Filter"]').classList.remove('active');
                } else {
                  addFilterPopout();
                  document.querySelector('[aria-label="Filter"]').classList.add('active');
                }
              }
            })
          ),

          ...matching.map(x => {
            const [ mod, name, author ] = x.split('%');

            let place = recom[x];
            if (place.length > 40) place = place.slice(0, 40) + '...';

            return React.createElement('div', {
              className: 'title-2dsDLn',
              onClick: () => {
                autocomplete.style.display = 'none';
                el.value = '';
                install(recom[x]);
              }
            },
              React.createElement('span', {
                className: 'topaz-tag tag-floating'
              }, mod),

              ' ' + name + ' ',

              author !== 'undefined' && React.createElement('span', {
                className: 'description-30xx7u'
              }, 'by '),
              author !== 'undefined' && author.split('#')[0],

              React.createElement('span', {
                className: 'code-style'
              }, place)
            );
          })
        ), autocomplete);

        autocomplete.style.display = 'block';

        if (!document.querySelector('#topaz-repo-filtering')) document.querySelector('[aria-label="Filter"]').classList.remove('active');
          else document.querySelector('[aria-label="Filter"]').classList.add('active');
      } else {
        autocomplete.style.display = 'none';
      }
    };

    setTimeout(() => {
      let tmpEl = document.querySelector('.topaz-settings .input-2g-os5');
      if (tmpEl && !tmpEl.placeholder) textInputHandler('', true);
    }, 10);

    const modules = Object.values(plugins).filter((x) => selectedTab === 'PLUGINS' ? !x.__theme : x.__theme);

    return React.createElement('div', {
      className: 'topaz-settings' + (topazSettings.simpleUI ? ' topaz-simple' : '')
    },
      React.createElement(FormTitle, {
        tag: 'h1'
      }, 'Topaz',
        React.createElement('span', {
          className: 'description-30xx7u topaz-version'
        }, topaz.version),

        React.createElement(HeaderBarContainer.Divider),

        React.createElement(TabBar, {
          selectedItem: selectedTab,

          type: TabBarClasses1.topPill,
          className: TabBarClasses2.tabBar,

          onItemSelect: (x) => {
            if (x === 'RELOAD' || x === 'CHANGELOG') return;

            const textInputEl = document.querySelector('.topaz-settings .input-2g-os5');
            if (textInputEl) textInputs[selectedTab] = textInputEl.value;

            selectedTab = x;
            this.forceUpdate();

            if (textInputEl) textInputEl.value = textInputs[x];
          }
        },
          React.createElement(TabBar.Item, {
            id: 'PLUGINS',

            className: TabBarClasses2.item
          }, 'Plugins'),
          React.createElement(TabBar.Item, {
            id: 'THEMES',

            className: TabBarClasses2.item
          }, 'Themes'),
          React.createElement(TabBar.Item, {
            id: 'SNIPPETS',

            className: TabBarClasses2.item
          }, 'Snippets'),
          React.createElement(TabBar.Item, {
            id: 'SETTINGS',

            className: TabBarClasses2.item
          }, 'Settings'),

          React.createElement(TabBar.Item, {
            id: 'RELOAD',

            className: TabBarClasses2.item
          }, React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Retry'),
            tooltipText: 'Reload Topaz',
            onClick: async () => {
              topaz.reloadTopaz();
            }
          })),

          React.createElement(TabBar.Item, {
            id: 'CHANGELOG',

            className: TabBarClasses2.item
          }, React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Clock'),
            tooltipText: 'Topaz Changelog',
            onClick: async () => {
              openChangelog();
            }
          }))
        ),
      ),

      selectedTab === 'SETTINGS' ? React.createElement(TopazSettings) :
        selectedTab === 'SNIPPETS' ? React.createElement(Snippets) : [
        React.createElement(FormItem, {
          title: 'Add ' + (selectedTab === 'PLUGINS' ? 'Plugin' : 'Theme'),
          className: [Flex.Direction.VERTICAL, Flex.Justify.START, Flex.Align.STRETCH, Flex.Wrap.NO_WRAP, Margins.marginBottom20].join(' ')
        },
          React.createElement(TextInput, {
            onChange: textInputHandler
          })
        ),

        React.createElement(FormTitle, {
          tag: 'h5',
          className: Margins.marginBottom8,
        },
          modules.length + ' Installed',

          modules.length > 0 ? React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Trash'),
            tooltipText: 'Uninstall All',
            onClick: async () => {
              if (!(await goosemod.confirmDialog('Uninstall', 'Uninstall All ' + (selectedTab === 'PLUGINS' ? 'Plugins' : 'Themes'), 'Are you sure you want to uninstall all ' + (selectedTab === 'PLUGINS' ? 'plugins' : 'themes') + ' from Topaz?'))) return;
              for (const x of modules) topaz.uninstall(x.__entityID);
            }
          }) : null,

          modules.length > 0 ? React.createElement(PanelButton, {
            icon: goosemod.webpackModules.findByDisplayName('Copy'),
            tooltipText: 'Copy All',
            onClick: async () => {
              const links = modules.map(({ __entityID }) => {
                let link = __entityID.includes('http') ? __entityID : `https://github.com/${__entityID}`;
                if (link.includes('raw.githubusercontent.com')) link = 'https://github.com/' + [...link.split('/').slice(3, 5), 'blob', ...link.split('/').slice(5)].join('/'); // raw github links -> normal

                return link;
              });

              goosemod.webpackModules.findByProps('SUPPORTS_COPY', 'copy').copy(links.join('\n'));
            }
          }) : null,
        ),

        React.createElement(Divider),

        ...modules.map(({ entityID, __enabled, manifest, __entityID, __settings, __mod, __theme, __autopatch }) => React.createElement(Plugin, {
          manifest,
          entityID: __entityID,
          enabled: __enabled,
          settings: __settings,
          autopatch: __autopatch,
          mod: __mod,
          isTheme: !!__theme,
          onUninstall: async () => {
            const rmPending = addPending({ repo: __entityID, state: 'Uninstalling...' });
            this.forceUpdate();

            await topaz.uninstall(__entityID);
            rmPending();

            this.forceUpdate();
          }
        })),

        ...pending.map(obj => React.createElement(Plugin, obj))
      ]
    )
  }
}

let settingsUnpatch = goosemod.patcher.patch(goosemod.webpackModules.findByDisplayName('SettingsView').prototype, 'getPredicateSections', (_, sections) => {
  const logout = sections.find((c) => c.section === 'logout');
  if (!logout) return sections;

  sections.splice(0, 0,
  {
    section: 'Topaz',
    label: 'Topaz',
    predicate: () => { },
    element: () => React.createElement(Settings)
  },

  {
    section: 'DIVIDER',
  },);

  return sections;
});

const Terminal = eval(`const closeTerminal = () => document.querySelector('.topaz-terminal')?.remove?.();

const openTerminal = (e) => {
  if (e) if (!e.altKey || e.code !== 'KeyT') return;

  const alreadyOpen = document.querySelector('.topaz-terminal');
  if (e && alreadyOpen) return closeTerminal();

  const term = document.createElement('div');
  term.className = 'topaz-terminal';

  const header = document.createElement('div');
  header.textContent = 'Topaz Terminal';

  const closeButton = document.createElement('div');
  closeButton.textContent = '✖';

  closeButton.onclick = () => closeTerminal();

  header.appendChild(closeButton);

  const out = document.createElement('div');
  out.contentEditable = true;
  out.autocapitalize = false;
  out.autocomplete = false;
  out.spellcheck = false;
  out.innerHTML = 'Welcome to the Topaz Terminal, here you can quickly and directly interface with Topaz internals.<br>';

  out.className = [ScrollerClasses.thin, ScrollerClasses.fade].join(' ');

  term.append(header, out);

  const storedPos = Storage.get('terminal_position');
  if (storedPos) {
    term.style.left = Math.max(0, storedPos[0]) + 'px';
    term.style.top = Math.max(0, storedPos[1]) + 'px';
  }

  let oldOut;
  if (alreadyOpen) {
    oldOut = document.querySelector('.topaz-terminal > :last-child');
    out.innerHTML = oldOut.innerHTML;
  }

  document.body.appendChild(term);

  if (oldOut) {
    out.scrollTop = oldOut.scrollTop;
    document.querySelectorAll('.topaz-terminal')[0].remove();
  }

  const selectLast = () => {
    const sel = window.getSelection();
    sel.collapse(out.lastChild, out.lastChild.textContent.length);
    out.focus();
  };

  const echo = (text, final = true) => {
    const atEnd = out.scrollHeight - out.clientHeight - out.scrollTop < 50; // check before adding since too much text will scroll

    out.innerHTML += '<br>';
    out.innerHTML += text.replaceAll('\\n', '<br>');

    if (final) out.innerHTML += '<br><br>> ';
    if (atEnd) out.scrollTop = 999999;
  };

  const spacedColumns = (cols) => {
    let longest = 0;
    for (const x of cols) if (x[0]?.length > longest) longest = x[0].length;

    return cols.map(x => x[0] ? \`<b>\${x[0]}</b>\${' '.repeat((longest - x[0].length) + 6)}\${x[1]}\` : '').join('\\n');
  };

  const help = () => {
    const commands = [
      [ 'uninstall [link|all]', 'Uninstalls given plugin/theme or all' ],
      [ 'reinstall [link]', 'Reinstalls given plugin/theme' ],
      [ 'enable [link]', 'Enables given plugin/theme' ],
      [ 'disable [link]', 'Disables given plugin/theme' ],
      [ 'installed', 'Outputs installed plugins and themes' ],
      [],
      [ 'cache [status|purge]', 'Manage Topaz\\'s cache' ],
      [ 'reload', 'Reload Topaz' ],
      [],
      [ 'refresh', 'Refresh Discord' ],
      [],
      [ 'clear', 'Clear terminal' ],
      [ 'help', 'Lists commands' ],
      [ 'exit', 'Exits terminal' ]
    ];

    echo(\`<b><u>Commands</u></b>
\${spacedColumns(commands)}

Enter any link/GH repo to install a plugin/theme\`);
  };

  if (!alreadyOpen) help();

  out.onclick = e => {
    selectLast();
  };

  out.onkeydown = e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Backspace') {
      const newOut = out.innerHTML.slice(0, -1);
      if (newOut.slice(-4) !== '&gt;') out.innerHTML = newOut;
    }

    if (e.key === 'Enter') {
      const txt = out.textContent;
      const cmd = txt.slice(txt.lastIndexOf('> ') + 2);

      const command = cmd.split(' ')[0];
      const extra = cmd.split(' ').slice(1);

      const info = extra[0];

      switch (command) {
        case 'uninstall':
          if (info === 'all') {
            echo(\`Uninstalling all...\`, false);
            topaz.uninstallAll().then(() => echo('Uninstalled all'));
            break;
          }

          if (!topaz.internal.plugins[info]) {
            echo(\`\${info} not installed!\`);
            break;
          }

          echo(\`Uninstalling <b>\${info}</b>...\`, false);
          topaz.uninstall(info).then(() => echo(\`Uninstalled <b>\${info}</b>\`));
          break;

        case 'reinstall':
          if (!topaz.internal.plugins[info]) {
            echo(\`\${info} not installed!\`);
            break;
          }

          echo(\`Reinstalling <b>\${info}</b>...\`, false);
          topaz.reload(info).then(() => echo(\`Reinstalled <b>\${info}</b>\`));
          break;

        case 'enable':
          if (!topaz.internal.plugins[info]) {
            echo(\`\${info} not installed!\`);
            break;
          }

          topaz.enable(info);
          echo(\`Enabled <b>\${info}</b>\`);
          break;

        case 'disable':
          if (!topaz.internal.plugins[info]) {
            echo(\`\${info} not installed!\`);
            break;
          }

          topaz.disable(info);
          echo(\`Disabled <b>\${info}</b>\`);
          break;

        case 'installed':
          const modules = Object.values(topaz.internal.plugins);

          const niceEntity = x => x.replace('https://raw.githubusercontent.com/', '').replace('/master/', ' > ').replace('/HEAD/', ' > ');

          const plugins = modules.filter(x => !x.__theme).map(x => [ x.manifest.name, niceEntity(x.__entityID) ]);
          const themes = modules.filter(x => x.__theme).map(x => [ x.manifest.name, niceEntity(x.__entityID) ]);

          echo(\`<b><u>\${themes.length} Theme\${themes.length === 1 ? '' : 's'}</u></b>
\${spacedColumns(themes)}

<b><u>\${plugins.length} Plugin\${plugins.length === 1 ? '' : 's'}</u></b>
\${spacedColumns(plugins)}\`);
          break;

        case 'cache':
          switch (info) {
            default:
              const getKb = x => (new Blob([ x.join?.('') ?? x ]).size / 1024);
              const displaySize = kb => {
                let unit = 'KB';
                if (kb > 1000) {
                  kb /= 1024;
                  unit = 'MB';
                }

                return kb.toFixed(2) + unit;
              };

              const cacheStatus = (cache) => {
                const totalSize = getKb(Object.values(cache.store));

                const goneThrough = [];
                return spacedColumns([
                  [ 'Total Entries', cache.keys().length ],
                  [ 'Total Size', displaySize(totalSize)],
                  [],
                  ...Object.values(topaz.internal.plugins).map(x => {
                    const [ entries, size ] = cache.keys().filter(y => y.includes(x.__entityID.replace('/blob', '').replace('/tree', '').replace('github.com', 'raw.githubusercontent.com'))).reduce((acc, x) => { goneThrough.push(x); acc[0]++; acc[1] += getKb(cache.get(x)); return acc; }, [0, 0]);
                    return [ x.manifest.name, \`\${entries} entr\${entries === 1 ? 'y' : 'ies'}, \${displaySize(size)} (\${(size / totalSize * 100).toFixed(1)}%)\` ];
                  }).concat(goneThrough.length !== cache.keys().length ? [ [ 'Internal', cache.keys().filter(x => !goneThrough.includes(x)).reduce((acc, x) => { acc[0]++; acc[1] += getKb(cache.get(x)); return acc; }, [0, 0]).reduce((acc, x, i) => acc += !i ? \`\${x} entries, \` : \`\${displaySize(x)} (\${(x / totalSize * 100).toFixed(1)}%)\`, '') ] ] : []),
                ]);
              };

              echo(\`<b><u>Fetch</u></b>
\${cacheStatus(topaz.internal.fetchCache)}


<b><u>Final</u></b>
\${cacheStatus(topaz.internal.finalCache)}\`);
              break;

            case 'purge':
              fetchCache.purge();
              finalCache.purge();
              echo('Purged caches');
              break;
          }

          break;

        case 'reload':
          echo('Reloading Topaz...');
          topaz.reloadTopaz();
          break;

        case 'refresh':
          echo('Refreshing...');
          location.reload();
          break;

        case 'clear':
          out.innerHTML = '> ';
          break;

        case 'exit':
          closeTerminal();
          break;

        case 'debug':
          topaz.debug = !topaz.debug;
          echo(\`Debug <b>\${topaz.debug ? 'ON' : 'OFF'}</b> for this session\`);
          break;

        case 'help':
          help();
          break;

        default:
          if (cmd.includes('/')) { // install
            echo(\`Installing <b>\${cmd}</b>...\`, false);
            topaz.install(cmd).then(() => echo(\`Installed <b>\${cmd}</b>\`));
          } else { // unknown
            echo(\`Unknown command <b>\${cmd}</b>, use <b>help</b> to view available commands\`);
          }
          break;
      }
    }

    if (e.key.length === 1) out.innerHTML += e.key;

    selectLast();
    e.preventDefault();
    return false;
  };

  selectLast();

  header.onmousedown = e => {
    e.preventDefault();
    let lastPos = [ e.clientX, e.clientY ];

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;
    };

    document.onmousemove = e => {
      e.preventDefault();

      const deltaX = lastPos[0] - e.clientX;
      const deltaY = lastPos[1] - e.clientY;

      lastPos = [ e.clientX, e.clientY ];

      const pos = [ term.offsetLeft - deltaX, term.offsetTop - deltaY ];
      term.style.left = pos[0] + 'px';
      term.style.top = pos[1] + 'px';

      Storage.set('terminal_position', pos);
    };
  };
};

document.addEventListener('keydown', openTerminal);
if (document.querySelector('.topaz-terminal')) {
  openTerminal();
}

() => { // topaz purge handler
  document.removeEventListener('keydown', openTerminal);
};`);

const msgModule = goosemod.webpackModules.findByProps('sendMessage');
const msgUnpatch = goosemod.patcher.patch(msgModule, 'sendMessage', ([ _channelId, { content } ]) => {
  if (content.startsWith('+t ')) {
    const info = content.split(' ')[1];
    topaz.install(info);
    return false;
  }

  if (content.startsWith('-t ')) {
    const info = content.split(' ')[1];
    topaz.uninstall(info);
    return false;
  }

  if (content.startsWith('--t')) {
    topaz.uninstallAll();
    return false;
  }

  if (content.startsWith(':t')) {
    topaz.reloadTopaz();
    return false;
  }
}, true);
})(); //# sourceURL=Topaz