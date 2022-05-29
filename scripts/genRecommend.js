// WIP / unused
const { writeFileSync } = require('fs');
const { join } = require('path');

const pc = {
  plugins: [
    'romdotdog/wpm',
    'TaiAurori/custom-timestamps',
    'RazerMoon/vcTimer',
    '12944qwerty/Slowmode-Counter',
    'skullyplugs/collapsible-ui',
    'E-boi/ShowConnections',
    '12944qwerty/betterInvites',
    '12944qwerty/copy-server-icon',
    '12944qwerty/showAllMessageButtons',
    'yuwui/powercord-greentext',
    'Puyodead1/powercord-stafftags',
    'VenPlugs/Unindent',
    'SpoonMcForky/replace-timestamps-pc',
    'powercord-community/channel-typing',
    '12944qwerty/click-mentions',
    'https://github.com/powercord-org/powercord/blob/HEAD/src/Powercord/plugins/pc-codeblocks',
    'https://github.com/powercord-org/powercord/blob/HEAD/src/Powercord/plugins/pc-clickableEdits',
  ],

  themes: [
    'leeprky/MaterialYouTheme',
    'eternal404/dark-discord',
    'NYRI4/Comfy',
    'DiscordStyles/Slate',
    'DiscordStyles/HorizontalServerList',
    'DiscordStyles/RadialStatus',
  ]
};

const bd = {
  plugins: [
    'https://github.com/dylan-dang/BetterDiscordPlugins/blob/main/PreviewMessageLinks.plugin.js'
  ]
};

const getManifest_pc = async (place, theme) => { // just repo or url
  const manifestName = theme ? 'powercord_manifest.json' : 'manifest.json';

  console.log(place);

  let manifestUrl = place + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${place}/HEAD/${manifestName}`;

  return await (await fetch(manifestUrl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '').replace('tree/', ''))).json();
};

const getManifest_bd = async (place, theme) => { // .plugin.js url
  const code = await (await fetch(place.replace('github.com', 'raw.githubusercontent.com').replace('blob/', ''))).text();

  console.log(place);

  return [...code.matchAll(/^ \* @([^ ]*) (.*)/gm)].reduce((a, x) => { a[x[1]] = x[2]; return a; }, {});
};


(async () => {
  let out = {
    plugins: {},
    themes: {}
  };

  for (const place of pc.plugins) {
    const manifest = await getManifest_pc(place, false);
    out.plugins[`PC%${manifest.name}%${manifest.author}`] = place;
  }

  for (const place of pc.themes) {
    const manifest = await getManifest_pc(place, true);
    out.themes[`PC%${manifest.name}%${manifest.author}`] = place;
  }

  for (const place of bd.plugins) {
    const manifest = await getManifest_bd(place, false);
    out.plugins[`BD%${manifest.name}%${manifest.author}`] = place;
  }
  
  console.log(out);
})();