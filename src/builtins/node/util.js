const formatString = msg => {
  let char = "'";
  if (msg.includes("'")) char = '"';
  if (char === '"' && msg.includes('"')) char = '`';
  if (char === '`' && msg.includes('`')) msg = msg.replaceAll('`', '\\`');

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

  if (Array.isArray(msg)) return `[ ${msg.map(x => inspect(x)).join(', ')} ]`;

  if (typeof msg === 'object') return `{ ${Object.keys(msg).map(x => `${objectKey(x)}: ${inspect(msg[x])}`).join(', ')} }`;

  return msg;
};

module.exports = {
  inspect
};