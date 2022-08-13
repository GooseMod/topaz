/* const inp = `$font-stack: Helvetica, sans-serif;
$primary-color: #333;

body {
  font: 100% $font-stack;
  color: $primary-color;
}`; */

/* const inp = `nav {
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li { display: inline-block; }

  a {
    display: block;
    padding: 6px 12px;
    text-decoration: none;
  }
}`; */

const inp = `@import"https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@100;200;300;400;500;600;700;800;900&display=swap";@import"https://fonts.googleapis.com/css2?family=Fira+Code:wght@500;600;700&display=swap";@import"https://dev-cats.github.io/code-snippets/JetBrainsMono.css";.container-2RRFHK .content-3AIQZv .tipTitle-3FYEQp::after{content:" ?";font-size:inherit;font-weight:inherit;color:inherit}.wordmarkWindows-2dq6rw{opacity:0}.withFrame-2dL45i{height:20px;margin:5px 10px 0 0}.withFrame-2dL45i:hover .winButton-3UMjdg{opacity:1}.winButton-3UMjdg{color:#b9bbbe;opacity:.2;border-radius:var(--radius-secondary);margin:5px 7px 0 0;padding:0px !important;width:20px;height:20px;transition:.3s ease-in-out}.winButton-3UMjdg:hover{color:#fff;opacity:1}.winButton-3UMjdg:nth-child(2):hover{background-color:#fd282e;color:var(--background-primary)}.winButton-3UMjdg:nth-child(3):hover{background-color:#ffac62;color:var(--background-primary)}.winButton-3UMjdg:nth-child(4):hover{background-color:var(--spotify-color);color:var(--background-primary)}:root{--font: "Source Sans Pro", sans-serif;--font-primary: var(--font);--font-display: var(--font);--font-code: "JetBrainsMono", "Fira Code", "Source Sans Pro", sans-serif;--font-headline: "Source Sans Pro", Ginto Nord,Ginto,"Helvetica Neue",Helvetica,Arial,sans-serif;--font-korean: Whitney,"Apple SD Gothic Neo","NanumBarunGothic","맑은 고딕","Malgun Gothic",Gulim,굴림,Dotum,돋움,"Helvetica Neue",Helvetica,Arial,sans-serif;--font-japanese: Whitney,Hiragino Sans,"ヒラギノ角ゴ ProN W3","Hiragino Kaku Gothic ProN","メイリオ",Meiryo,Osaka,"MS PGothic","Helvetica Neue",Helvetica,Arial,sans-serif;--font-chinese-simplified: Whitney,"Microsoft YaHei New",微软雅黑,"Microsoft Yahei","Microsoft JhengHei",宋体,SimSun,"Helvetica Neue",Helvetica,Arial,sans-serif;--font-chinese-traditional: Whitney,"Microsoft JhengHei",微軟正黑體,"Microsoft JhengHei UI","Microsoft YaHei",微軟雅黑,宋体,SimSun,"Helvetica Neue",Helvetica,Arial,sans-serif}:root{--av-radius: 35%;--activity-img-radius: 35%;--spine-width: 3px;--cl-width: 260px;--ml-width: 300px;--ml-member-height: 55px;--radius-primary: 10px;--radius-secondary: 6px;--textbar-button-width: 43px;--textbar-button-height: 43px;--context-menu-radius: var(--radius-primary)}code{font-family:"JetBrains Mono" !important;font-feature-settings:"liga" on,"calt" on;-webkit-font-feature-settings:"liga" on,"calt" on;text-rendering:optimizeLegibility}.theme-dark,.theme-light{--info-positive-foreground: var(--green-hover);--info-positive-background: var(--green-tertiary);--status-positive-text: var(--text-color);--status-positive-background: var(--info-positive-foreground);--info-warning-foreground: var(--yellow-alt);--info-warning-background: var(--yellow-alt-hover);--status-warning-text: var(--text-color);--status-warning-background: var(--info-warning-foreground);--info-danger-foreground: var(--red-alt);--info-danger-background: var(--red-alt-hover);--status-danger-background: var(--info-danger-foreground);--status-danger-text: var(--text-color);--focus-primary: var(--brand-experiment)}.theme-dark,.theme-light{--blurple: var(--SKIN-accent-primary, #7E7BFE);--blurple-hover: var(--SKIN-accent-secondary, #7E7BFEcc);--blurple-active: var(--SKIN-accent-tertiary, #7E7BFEcc);--blurple-alt: #ADA9F5;--blurple-replace: var(--blurple);--brand-experiment: var(--blurple);--brand-experiment-hover: var(--blurple-hover);--yellow: var(--SKIN-yellow-primary, #F7C954);--yellow-alt: var(--SKIN-yellow-secondary, #FFAC60);--yellow-alt-hover: var(--SKIN-yellow-tertiary, #ffac6066);--red: var(--SKIN-red-primary, #FD2B30);--red-alt: var(--SKIN-red-secondary, #F42028);--red-alt-hover: var(--SKIN-red-primary, #F4202866);--green: var(--SKIN-green-primary, #00D65D);--green-hover: var(--SKIN-green-secondary, #08DA7A);--green-active: var(--SKIN-green-tertiary, #08d97b66);--green-alt: #4DF3BA;--spotify-color: var(--green-hover);--spotify-bg: var(--green);--spotify-bg-alt: var(--green-hover);--activity-bg: var(--blurple);--twitch-bg: linear-gradient(90deg, __rgba(105, 2, 244, 1) 0%, __rgba(208, 3, 255, 1) 100%);--bot-bg: var(--blurple-hover);--xbox-bg: linear-gradient(90deg, __rgba(0, 172, 65, 1) 0%, __rgba(124, 203, 48, 1) 100%);--bg-reaction: var(--background-secondary);--bg-reaction-border: var(--background-secondary-alt);--bg-reaction-hover: var(--background-secondary-alt);--bg-reaction-self: var(--background-mentioned-hover);--bg-reaction-self-border: var(--background-mentioned);--bg-reaction-self-hover: var(--background-mentioned);--online-color: var(--green-alt);--dnd-color: var(--red);--idle-color: var(--yellow);--streaming-color: var(--blurple);--mar-bar-color: var(--red);--mention-badge-color: var(--blurple);--cl-nub-color: var(--blurple);--sl-nub-color: var(--blurple);--chat-nub-color: var(--red);--nul-color: var(--red-alt)}::-moz-selection{background-color:var(--brand-experiment) !important;color:#fff !important}::selection{background-color:var(--brand-experiment) !important;color:#fff !important}.theme-dark{--header-primary: #fff;--header-secondary: #b9bbbe;--text-color: #eee;--text-normal: #C1C1C5;--text-muted: #ffffff40;--text-link: var(--brand-experiment);--text-link-low-saturation: _hsl(197, calc(var(--saturation-factor, 1)*100%), 52.9%);--text-positive: var(--info-positive-foreground);--text-warning: var(--info-warning-foreground);--text-danger: var(--info-danger-foreground);--text-brand: var(--brand-experiment);--toast-background: var(--background-secondary);--toast-header: var(--background-primary);--toast-contents: var(--background-secondary-alt);--toast-box-shadow: __rgba(0, 0, 0, .2);--toast-border: __rgba(28, 36, 43, .6);--interactive-normal: var(--SKIN-interactive-normal, #D9DDE2cc);--interactive-hover: var(--SKIN-interactive-hover, #eee);--interactive-active: var(--SKIN-interactive-active, #e2e4e8);--interactive-muted: var(--SKIN-interactive-muted, #4b4b4b);--background-primary: var(--SKIN-background-primary, #101014);--background-secondary: var(--SKIN-background-secondary);--background-secondary-alt: var(--SKIN-background-tertiary);--background-tertiary: var(--background-primary);--background-tertiary-alt: #0F0E11;--background-accent: var(--background-secondary-alt);--background-floating: var(--background-primary);--background-nested-floating: var(--background-secondary);--background-mobile-primary: var(--background-primary);--background-mobile-secondary: var(--background-secondary);--background-modifier: var(--background-secondary);--background-modifier-accent: var(--background-secondary);--background-modifier-selected: var(--background-secondary-alt);--background-modifier-hover: var(--background-secondary-alt);--background-modifier-active: var(--background-modifier-hover);--info-positive-text: #fff;--info-warning-text: #fff;--info-danger-text: #fff;--info-help-background: __hsla(197, calc(var(--saturation-factor, 1)*100%), 47.8%, 0.1);--info-help-foreground: _hsl(197, calc(var(--saturation-factor, 1)*100%), 47.8%);--info-help-text: #fff;--status-warning-text: #000;--scrollbar-thin-thumb: var(--background-secondary-alt);--scrollbar-thin-track: transparent;--scrollbar-auto-thumb: #00000066;--scrollbar-auto-track: #17161B99;--scrollbar-auto-scrollbar-color-thumb: var(--background-tertiary);--scrollbar-auto-scrollbar-color-track: var(--background-secondary);--elevation-stroke: 0 0 0 1px __rgba(4, 4, 5, 0.15);--elevation-low: 0 1px 0 __rgba(4, 4, 5, 0.2), 0 1.5px 0 __rgba(6, 6, 7, 0.05), 0 2px 0 __rgba(4, 4, 5, 0.05);--elevation-medium: 0 4px 4px __rgba(0, 0, 0, 0.16);--elevation-high: 0 8px 16px __rgba(0, 0, 0, 0.24);--logo-primary: #fff;--control-brand-foreground: _hsl(241, calc(var(--saturation-factor, 1)*86.1%), 77.5%);--control-brand-foreground-new: _hsl(241, calc(var(--saturation-factor, 1)*86.1%), 77.5%);--background-mentioned: #28151D;--background-mentioned-hover: #28151Dae;--background-mentioned-border: var(--red);--spine-color: var(--background-secondary-alt);--mentioned-spine-color: var(--red-alt);--background-message-hover: __rgba(4, 4, 5, 0.1);--background-message-automod: __hsla(359, calc(var(--saturation-factor, 1)*82.6%), 59.4%, 0.05);--background-message-automod-hover: __hsla(359, calc(var(--saturation-factor, 1)*82.6%), 59.4%, 0.1);--channels-default: #808080;--channel-icon: var(--channels-default);--guild-header-text-shadow: 0 1px 1px __rgba(0, 0, 0, 0.4);--channeltextarea-background: var(--background-secondary);--channeltextarea-caret: var(--brand-experiment);--textbox-markdown-syntax: #8e9297;--spoiler-revealed-background: #292b2f;--spoiler-hidden-background: var(--background-tertiary);--deprecated-card-bg: var(--background-tertiary);--deprecated-card-editable-bg: var(--background-tertiary);--deprecated-store-bg: var(--background-primary);--deprecated-quickswitcher-input-background: var(--background-primary);--deprecated-quickswitcher-input-placeholder: __hsla(0, 0%, 100%, 0.3);--deprecated-text-input-bg: __rgba(0, 0, 0, 0.1);--deprecated-text-input-border: __rgba(0, 0, 0, 0.3);--deprecated-text-input-border-hover: #040405;--deprecated-text-input-border-disabled: var(--background-tertiary);--deprecated-text-input-prefix: #dcddde;--input-background: var(--background-secondary)}:root{--inv-dark-background-primary: var(--background-primary);--inv-dark-background-secondary: var(--background-secondary);--inv-dark-background-tertiary: var(--background-secondary-alt);--inv-dark-text: #ddd;--inv-dark-text-alt: #aaa;--inv-light-text: #222;--inv-light-text-alt: #000;--inv-input-color: var(--blurple);--inv-light-background-primary: var(--background-primary);--inv-light-background-secondary: var(--background-secondary);--inv-light-background-tertiary: var(--background-secondary-alt)}[data-popout-root],html{--brand-experiment-100: _hsl(241, calc(var(--saturation-factor, 1)*77.8%), 98.2%);--brand-experiment-130: _hsl(241, calc(var(--saturation-factor, 1)*87.5%), 96.9%);}`;
/* const inp = `one {
  color: blue;

  two {
    color: red;
    three {
      color: purple;
    }
  }
}`; */

const parse = (scss) => {
  const tokens = scss.split(/({|})/g);

  let extraOut = '';
  const out = {};

  let currentSelector;
  let selectorTree = [];
  let last;

  const makeSelector = tree => {
    let out = '';
    for (const x of tree) {
      const outMap = out.split(",").map(y => y.trim());
      const xMap = x.split(",").map(y => y.trim());

      out = outMap.map(x => xMap.map(y => {
        if (y[0] === '&') return x + y.slice(1);
        return x + ' ' + y;
      })).flat().join(", ");
    }

    return out;
  };

  for (let t of tokens) {
    const imports = t.match(/@(import|use|forward) ?(url\()?['"](.*?)['"]\)?;?/g);
    if (imports) extraOut += imports.join('\n') + '\n';

    // console.log([ t, selectorTree ]);
    if (t === '{') {
      const selector = last.split(';').pop().trim();
      currentSelector = selector;
      selectorTree.push(selector);
      continue;
    }

    if (t === '}') {
      currentSelector = selectorTree.pop();
      continue;
    }

    if (currentSelector) {
      t = t.trim();

      const selector = makeSelector(selectorTree);
      // const params = t.match(/(.*?): (.*?)(\r?\n|$)/g)?.map(x => x.trim()).join('\n  ');
      // const params = t.match(/(.*?): ([(].*[)])?.*(;|(\r?\n)|$)/g)?.map(x => x.trim()).join('\n  ');

      const params = [];
      let innerMod = t;
      innerMod = innerMod.replace(/(.*?): .*?([(].*[)]).*?(;|(\r?\n)|$)/g, _ => params.push(_) || '');
      params.concat(innerMod.match(/(.*?): (.*?)(;|\r?\n|$)/g));

      if (params.length > 0) {
        console.log(params);
        if (!out[selector]) out[selector] = [];
        out[selector].push(params.map(x => x.trim()).join('\n  '));
      }
    }

    last = t;
  }

  return extraOut + '\n\n' + Object.keys(out).map(x =>`${x} {
  ${out[x].join(';\n')}
}`).join('\n');
};

const process = (scss) => {
  let out = scss;

  const variables = [];

  out = out.replace(/\$(.*): (.*);\n*/g, (_, name, value) => {
    variables.push([name.trim(), value.trim()]);
    return '';
  });

  for (const v of variables) {
    // console.log(v);
    out = out.replace(new RegExp(`\\$${v[0]}`, 'g'), v[1]);
  }
/*
  const bracketMatch = /(.*?) {[\s\S]*?(?=})/gm;

  const test = t => {
    const parentSelector = t.split('{')[0].trim();
    const inside = t.split('{').slice(1).join('{').trim();
    console.log(inside);
    // console.log('test', { parentSelector, inside });

    const innerOut = inside.replace(bracketMatch, '');
    let subOut = inside.replace(bracketMatch, `${parentSelector} $1 {`);

    // console.log({ innerOut, subOut });

    return t.replace(bracketMatch, _ => test(_));
  };

  out.replace(bracketMatch, _ => test(_)); */

  return parse(out);
};

console.log(process(inp));

process