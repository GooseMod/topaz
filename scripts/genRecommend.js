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
    'https://raw.githubusercontent.com/powercord-org/powercord/HEAD/src/Powercord/plugins/pc-codeblocks'
  ],

  themes: [
    'leeprky/MaterialYouTheme',
    'eternal404/dark-discord',
    'NYRI4/Comfy',
    'DiscordStyles/Slate',
    'DiscordStyles/HorizontalServerList',
    'DiscordStyles/RadialStatus'
  ]
};

const gen_pc = async (place, theme) => { // just repo or url
  const manifestName = theme ? 'powercord_manifest.json' : 'manifest.json';
  console.log(place, manifestName);
  let manifestUrl = place + '/' + manifestName;
  if (!place.startsWith('http')) manifestUrl = `https://raw.githubusercontent.com/${place}/HEAD/${manifestName}`;

  const manifest = await (await fetch(manifestUrl)).json();

  // Remove unneeded manifest entries to reduce size
  delete manifest['consent'];
  delete manifest['license'];

  return {
    place,
    manifest
  };
};


(async () => {
  const out = JSON.stringify({
    plugins: await Promise.all([ ...pc.plugins.map(async x => await gen_pc(x, false)) ]),
    themes: await Promise.all([ ...pc.themes.map(async x => await gen_pc(x, true)) ])
  });
  
  console.log(out);
  
  writeFileSync(join(__dirname, '../recommended.json'), out);
})();