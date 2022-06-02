const fs = require('fs');

let code = fs.readFileSync('src/index.js', 'utf8');

code = code.replace(/const topazVersion = ([0-9]+);/, (_, v) => `const topazVersion = ${parseInt(v) + 1};`);

fs.writeFileSync('src/index.js', code);

const read = (path) => ('`' + fs.readFileSync('src/' + path + (!path.includes('.') ? '.js' : ''), 'utf8').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`');

code = code.replace(/await getBuiltin\(['"`](.*?)['"`]\)/g, (_, path) => read('builtins/' + path));
code = code.replace(/await \(await fetch\(\'http:\/\/localhost\:1337\/src\/([A-Za-z0-9\/\.]*?)\'\)\)\.text\(\)/g, (_, path) => read(path));
code = code.replace('`http://localhost:1337/src/index.js`', '`https://goosemod.github.io/topaz/out.js`');
code = code.replace('`http://localhost:1337/recommended.json`', '`https://goosemod.github.io/topaz/recommended.json`');
code = code.replaceAll('http://localhost:1337/src/', 'https://goosemod.github.io/topaz/src/');

// console.log(code);
fs.writeFileSync('out.js', code);

console.log('bundled topaz!');