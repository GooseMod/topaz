const MAP_START = 'MAP_START|';
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
  for (const line of output.split('\n')) {
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