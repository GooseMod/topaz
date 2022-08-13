const prettyAgo = (timestamp) => {
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


  patch(/ActionTypes\.([A-Z_]*)/g, '\'$1\'', [ 'ActionTypes deletion fix', new Date('2022-08-01T06:22:49Z') ]);

  patch('dirtyDispatch', 'dispatch', [ 'dirtyDispatch -> dispatch', new Date('2022-08-03T01:30:44Z') ]);

  patch('\'_orderedActionHandlers\'', '\'_actionHandlers\'', [ 'FluxDispatcher update', new Date('2022-08-10T20:55:38Z') ]);
  patch(/([^s])\.(_orderedActionHandlers|_dependencyGraph|_orderedCallbackTokens|_invalidateCaches)/g, '$1._actionHandlers.$2', [ 'FluxDispatcher update', new Date('2022-08-10T20:55:38Z') ]);


  let toRevert = undefined;
  if (changes.length > 0) {
    const previouslyAsked = topaz.storage.get(entityID + '_autopatch_asked') ?? [];
    changes = changes.filter(x => !previouslyAsked.includes(x[0]));

    if (changes.length === 0) return [ code, { changes, toRevert } ];

    const res = goosemod.confirmDialog('Okay', `${manifest.name} Patched`, `Topaz found that **${manifest.name}** was likely broken and has attempted to automatically fix it.
##### ​
# Patches

${changes.map(x => `- ${x[0]} (${prettyAgo(x[1])})`).join('\n')}`, 'Revert', 'brand');
    if (document.querySelector('[type="submit"] + [type="button"]')) document.querySelector('[type="submit"] + [type="button"]').onclick = () => toRevert = true; // Only revert button, not ignore

    await res;
    if (toRevert === true) code = original;
    else {
      toRevert = false;
      topaz.storage.set(entityID + '_autopatch_asked', changes.map(x => x[0]));
    }
  }

  return [ code, { changes, toRevert } ];
}