const closeTerminal = () => document.querySelector('.topaz-terminal')?.remove?.();

const openTerminal = (e) => {
  if (document.querySelector('.topaz-terminal')) return closeTerminal();
  if (e) if (/* !e.ctrlKey || */ !e.altKey || e.key !== 't') return;

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
    term.style.left = storedPos[0] + 'px';
    term.style.top = storedPos[1] + 'px';
  }

  document.body.appendChild(term);

  const selectLast = () => {
    const sel = window.getSelection();
    sel.collapse(out.lastChild, out.lastChild.textContent.length);
    out.focus();
  };

  const echo = (text, final = true) => {
    out.innerHTML += '<br>';
    out.innerHTML += text.replaceAll('\n', '<br>');

    if (final) out.innerHTML += '<br><br>> ';

    if (out.scrollHeight - out.clientHeight - out.scrollTop < 50) out.scrollTop = 999999;
  };

  const help = () => {
    const commands = [
      [ 'uninstall [link]', 'Uninstalls given plugin/theme' ],
      [ 'reinstall [link]', 'Reinstalls given plugin/theme' ],
      [ 'enable [link]', 'Enables given plugin/theme' ],
      [ 'disable [link]', 'Disables given plugin/theme' ],
      [],
      [ 'installed', 'Outputs installed plugins and themes' ],
      [ 'cache [status|purge]', 'Manage Topaz\'s cache' ],
      [ 'reload', 'Reload Topaz' ],
      [],
      [ 'clear', 'Clear terminal' ],
      [ 'help', 'Lists commands' ],
      [ 'exit', 'Exits terminal' ]
    ];

    let longestCommand = 0;
    for (const x of commands) if (x[0]?.length > longestCommand) longestCommand = x[0].length;

    echo('<b><u>Commands</u></b>\n' + commands.map(x => x[0] ? `<b>${x[0]}</b>${' '.repeat((longestCommand - x[0].length) + 6)}${x[1]}` : '').join('\n'));
  };

  help();

  out.onclick = e => {
    console.log(e);
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
            topaz.uninstallAll();
            echo('Uninstalled all');
            break;
          }

          if (!plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          echo(`Uninstalling <b>${info}</b>...`, false);
          topaz.uninstall(info);
          echo(`Uninstalled <b>${info}</b>`);
          break;

        case 'reinstall':
          if (!plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          echo(`Reinstalling <b>${info}</b>...`, false);
          topaz.reload(info);
          echo(`Reinstalled <b>${info}</b>`);
          break;

        case 'enable':
          if (!plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          topaz.enable(info);
          echo(`Enabled <b>${info}</b>`);
          break;

        case 'disable':
          if (!plugins[info]) {
            echo(`${info} not installed!`);
            break;
          }

          topaz.disable(info);
          echo(`Disabled <b>${info}</b>`);
          break;

        case 'installed':
          echo(`${topaz.getInstalled().map(x => `<b>${x}</b>`).join('\n')}`);
          break;

        case 'cache':
          switch (info) {
            case 'status':
              echo(`Fetch cache entries: ${fetchCache.keys().length}\nFinal cache entries: ${finalCache.keys().length}`);
              break;

            case 'purge':
              fetchCache.purge();
              finalCache.purge();
              echo('Purged caches');
              break;
          }

          break;

        case 'reload':
          echo('Reloading Topaz...', false);
          topaz.reloadTopaz();
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
            topaz.install(cmd);
            echo(`Installed <b>${cmd}</b>`);
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
  closeTerminal();
  openTerminal();
}

() => { // topaz purge handler
  document.removeEventListener('keydown', openTerminal);
  closeTerminal();
};