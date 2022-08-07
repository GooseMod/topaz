const closeTerminal = () => document.querySelector('.topaz-terminal')?.remove?.();

const openTerminal = (e) => {
  if (e) if (/* !e.ctrlKey || */ !e.altKey || e.key !== 't') return;

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
    out.innerHTML += text.replaceAll('\n', '<br>');

    if (final) out.innerHTML += '<br><br>> ';
    if (atEnd) out.scrollTop = 999999;
  };

  const spacedColumns = (cols) => {
    let longest = 0;
    for (const x of cols) if (x[0]?.length > longest) longest = x[0].length;

    return cols.map(x => x[0] ? `<b>${x[0]}</b>${' '.repeat((longest - x[0].length) + 6)}${x[1]}` : '').join('\n');
  };

  const help = () => {
    const commands = [
      [ 'uninstall [link|all]', 'Uninstalls given plugin/theme or all' ],
      [ 'reinstall [link]', 'Reinstalls given plugin/theme' ],
      [ 'enable [link]', 'Enables given plugin/theme' ],
      [ 'disable [link]', 'Disables given plugin/theme' ],
      [ 'installed', 'Outputs installed plugins and themes' ],
      [],
      [ 'cache [status|purge]', 'Manage Topaz\'s cache' ],
      [ 'reload', 'Reload Topaz' ],
      [],
      [ 'refresh', 'Refresh Discord' ],
      [],
      [ 'clear', 'Clear terminal' ],
      [ 'help', 'Lists commands' ],
      [ 'exit', 'Exits terminal' ]
    ];

    echo(`<b><u>Commands</u></b>
${spacedColumns(commands)}

Enter any link/GH repo to install a plugin/theme`);
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
            echo(`Uninstalling all...`, false);
            topaz.uninstallAll().then(() => echo('Uninstalled all'));
            break;
          }

          if (!topaz.internal.plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          echo(`Uninstalling <b>${info}</b>...`, false);
          topaz.uninstall(info).then(() => echo(`Uninstalled <b>${info}</b>`));
          break;

        case 'reinstall':
          if (!topaz.internal.plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          echo(`Reinstalling <b>${info}</b>...`, false);
          topaz.reload(info).then(() => echo(`Reinstalled <b>${info}</b>`));
          break;

        case 'enable':
          if (!topaz.internal.plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          topaz.enable(info);
          echo(`Enabled <b>${info}</b>`);
          break;

        case 'disable':
          if (!topaz.internal.plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          topaz.disable(info);
          echo(`Disabled <b>${info}</b>`);
          break;

        case 'installed':
          const modules = Object.values(topaz.internal.plugins);

          const niceEntity = x => x.replace('https://raw.githubusercontent.com/', '').replace('/master/', ' > ').replace('/HEAD/', ' > ');

          const plugins = modules.filter(x => !x.__theme).map(x => [ x.manifest.name, niceEntity(x.__entityID) ]);
          const themes = modules.filter(x => x.__theme).map(x => [ x.manifest.name, niceEntity(x.__entityID) ]);

          echo(`<b><u>${themes.length} Theme${themes.length === 1 ? '' : 's'}</u></b>
${spacedColumns(themes)}

<b><u>${plugins.length} Plugin${plugins.length === 1 ? '' : 's'}</u></b>
${spacedColumns(plugins)}`);
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
                    return [ x.manifest.name, `${entries} entr${entries === 1 ? 'y' : 'ies'}, ${displaySize(size)} (${(size / totalSize * 100).toFixed(1)}%)` ];
                  }).concat(goneThrough.length !== cache.keys().length ? [ [ 'Internal', cache.keys().filter(x => !goneThrough.includes(x)).reduce((acc, x) => { acc[0]++; acc[1] += getKb(cache.get(x)); return acc; }, [0, 0]).reduce((acc, x, i) => acc += !i ? `${x} entries, ` : `${displaySize(x)} (${(x / totalSize * 100).toFixed(1)}%)`, '') ] ] : []),
                ]);
              };

              echo(`<b><u>Fetch</u></b>
${cacheStatus(topaz.internal.fetchCache)}


<b><u>Final</u></b>
${cacheStatus(topaz.internal.finalCache)}`);
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
          break;

        case 'help':
          help();
          break;

        default:
          if (cmd.includes('/')) { // install
            echo(`Installing <b>${cmd}</b>...`, false);
            topaz.install(cmd).then(() => echo(`Installed <b>${cmd}</b>`));
          } else { // unknown
            echo(`Unknown command <b>${cmd}</b>, use <b>help</b> to view available commands`);
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
};