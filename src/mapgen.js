const tokens = {
  start: 'MAP_START|',
  end: 'MAP_END'
};

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

let makeMap = (output, root, name) => {
  const startTime = performance.now();

  const sources = [];
  const sourcesContent = [];
  const mappings = [];

  let withinSource, currentLine = 0, lastLine = 0, lastSource;
  for (const line of output.split('\n')) {
    if (line.includes(tokens.end)) withinSource = undefined;

    if (withinSource) { // map line
      let nowSource = sources.length - 1;

      mappings.push([ 0, nowSource - lastSource, currentLine - lastLine, 0 ]);

      lastLine = currentLine;
      currentLine++;

      lastSource = nowSource;
    } else mappings.push([]); // skip line

    const ind = line.indexOf(tokens.start);
    if (ind !== -1) {
      const source = line.slice(ind + tokens.start.length);
      // if (!source.startsWith('./')) continue;
      sources.push(source.startsWith('./') ? source.slice(2) : 'topaz://Topaz/' + source + '.js');
      sourcesContent.push(source.startsWith('./') ? topaz.internal.fetchCache.get(root + '/' + source.slice(2)) : topaz.internal.builtins[source]);

      withinSource = source;

      lastSource = sources.length - 2;
      if (lastSource === -1) lastSource = 0; // don't bump source id at start

      currentLine = 0;
    }
  }

  const map = {
    version: 3,
    file: `topaz_plugin.js`,
    sourceRoot: `topaz://Topaz/Plugin${sources.filter(x => !x.startsWith('topaz://') && x.endsWith('.plugin.js')).length === 1 ? '' : `/${name}`}`, // don't use plugin subdir when only one source (eg: BD .plugin.js)
    sources,
    names: [],
    mappings: mappings.map(x => x.map(encode).join('')).join(';'), // encode maps into expected
    sourcesContent
  };

  topaz.log('mapgen', `mapped ${name} in ${(performance.now() - startTime).toFixed(2)}ms`, map);

  return `//# sourceMappingURL=data:application/json;charset=utf-8,` + encodeURIComponent(JSON.stringify(map)); // inline with encoded
};

makeMap