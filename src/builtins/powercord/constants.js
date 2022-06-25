module.exports = {
  WEBSITE: '',
  I18N_WEBSITE: '',
  REPO_URL: '',

  SETTINGS_FOLDER: '/home/topaz/powercord/settings',
  CACHE_FOLDER: '/home/topaz/powercord/settings',
  LOGS_FOLDER: '/home/topaz/powercord/settings',

  DISCORD_INVITE: 'neMncS2', // mock topaz ones
  GUILD_ID: '756146058320674998',
  SpecialChannels: [ 'KNOWN_ISSUES', 'SUPPORT_INSTALLATION', 'SUPPORT_PLUGINS', 'SUPPORT_MISC', 'STORE_PLUGINS', 'STORE_THEMES', 'CSS_SNIPPETS', 'JS_SNIPPETS' ].reduce((acc, x) => { acc[x] = '944004406536466462'; return acc; }, {})
};