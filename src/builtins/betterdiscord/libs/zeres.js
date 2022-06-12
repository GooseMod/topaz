let ZeresPluginLibrary, ZLibrary;

(() => {
const WebpackModules = {
  getByProps: goosemod.webpackModules.findByProps,
  getAllByProps: goosemod.webpackModules.findByPropsAll,
  getByDisplayName: goosemod.webpackModules.findByDisplayName,
  getModule: goosemod.webpackModules.find,
  getModules: goosemod.webpackModules.findAll,

  find: (filter, first = true) => goosemod.webpackModules[first ? 'find' : 'findAll'](filter),
  findAll: goosemod.webpackModules.findAll,
  findByUniqueProperties: (props, first = true) => goosemod.webpackModules[first ? 'findByProps' : 'findByPropsAll'](props),
  findByDisplayName: goosemod.webpackModules.findByDisplayName,

  addListener: (listener) => { // painful jank way of not doing listener
    const int = setInterval(() => {
      for (const m of goosemod.webpackModules.all()) {
        if (m) listener(m);
      }
    }, 5000);

    return () => clearInterval(int);
  }
};

const showToast = (content, options = {}) => goosemod.showToast(content, options); // Mostly same options handling

const injectedCSS = {};

const api = {
  WebpackModules,

  Logger: { // barebones
    error: (mod, ...msg) => console.error(mod, ...msg),
    err: (mod, ...msg) => console.error(mod, ...msg),
    warn: (mod, ...msg) => console.warn(mod, ...msg),
    info: (mod, ...msg) => console.info(mod, ...msg),
    dbg: (mod, ...msg) => console.debug(mod, ...msg),
    debug: (mod, ...msg) => console.debug(mod, ...msg),
    log: (mod, ...msg) => console.log(mod, ...msg)
  },

  DiscordModules: {
    get React() { return WebpackModules.getByProps("createElement", "cloneElement"); },
    get ReactDOM() { return WebpackModules.getByProps("render", "findDOMNode"); },
    get Events() { return WebpackModules.getByPrototypes("setMaxListeners", "emit"); },
    get GuildStore() { return WebpackModules.getByProps("getGuild"); },
    get SortedGuildStore() { return WebpackModules.getByProps("getSortedGuilds"); },
    get SelectedGuildStore() { return WebpackModules.getByProps("getLastSelectedGuildId"); },
    get GuildSync() { return WebpackModules.getByProps("getSyncedGuilds"); },
    get GuildInfo() { return WebpackModules.getByProps("getAcronym"); },
    get GuildChannelsStore() { return WebpackModules.getByProps("getChannels", "getDefaultChannel"); },
    get GuildMemberStore() { return WebpackModules.getByProps("getMember"); },
    get MemberCountStore() { return WebpackModules.getByProps("getMemberCounts"); },
    get GuildEmojiStore() { return WebpackModules.getByProps("getEmojis"); },
    get GuildActions() { return WebpackModules.getByProps("requestMembers"); },
    get GuildPermissions() { return WebpackModules.getByProps("getGuildPermissions"); },
    get ChannelStore() { return WebpackModules.getByProps("getChannel", "getDMFromUserId"); },
    get SelectedChannelStore() { return WebpackModules.getByProps("getLastSelectedChannelId"); },
    get ChannelActions() { return WebpackModules.getByProps("selectChannel"); },
    get PrivateChannelActions() { return WebpackModules.getByProps("openPrivateChannel"); },
    get UserInfoStore() { return WebpackModules.getByProps("getSessionId"); },
    get UserSettingsStore() { return WebpackModules.getByProps("guildPositions"); },
    get StreamerModeStore() { return WebpackModules.getByProps("hidePersonalInformation"); },
    get UserSettingsUpdater() { return WebpackModules.getByProps("updateRemoteSettings"); },
    get OnlineWatcher() { return WebpackModules.getByProps("isOnline"); },
    get CurrentUserIdle() { return WebpackModules.getByProps("isIdle"); },
    get RelationshipStore() { return WebpackModules.getByProps("isBlocked", "getFriendIDs"); },
    get RelationshipManager() { return WebpackModules.getByProps("addRelationship"); },
    get MentionStore() { return WebpackModules.getByProps("getMentions"); },
    get UserStore() { return WebpackModules.getByProps("getCurrentUser", "getUser"); },
    get UserStatusStore() { return WebpackModules.getByProps("getStatus", "getState"); },
    get UserTypingStore() { return WebpackModules.getByProps("isTyping"); },
    get UserActivityStore() { return WebpackModules.getByProps("getActivity"); },
    get UserNameResolver() { return WebpackModules.getByProps("getName"); },
    get UserNoteStore() { return WebpackModules.getByProps("getNote"); },
    get UserNoteActions() { return WebpackModules.getByProps("updateNote"); },
    get EmojiInfo() { return WebpackModules.getByProps("isEmojiDisabled"); },
    get EmojiUtils() { return WebpackModules.getByProps("getGuildEmoji"); },
    get EmojiStore() { return WebpackModules.getByProps("getByCategory", "EMOJI_NAME_RE"); },
    get InviteStore() { return WebpackModules.getByProps("getInvites"); },
    get InviteResolver() { return WebpackModules.getByProps("resolveInvite"); },
    get InviteActions() { return WebpackModules.getByProps("acceptInvite"); },
    get DiscordConstants() { return WebpackModules.getByProps("Permissions", "ActivityTypes", "StatusTypes"); },
    get DiscordPermissions() { return WebpackModules.getByProps("Permissions", "ActivityTypes", "StatusTypes").Permissions; },
    get Permissions() { return WebpackModules.getByProps("computePermissions"); },
    get ColorConverter() { return WebpackModules.getByProps("hex2int"); },
    get ColorShader() { return WebpackModules.getByProps("darken"); },
    get TinyColor() { return WebpackModules.getByPrototypes("toRgb"); },
    get ClassResolver() { return WebpackModules.getByProps("getClass"); },
    get ButtonData() { return WebpackModules.getByProps("ButtonSizes"); },
    get NavigationUtils() { return WebpackModules.getByProps("transitionTo", "replaceWith", "getHistory"); },
    get MessageStore() { return WebpackModules.getByProps("getMessage", "getMessages"); },
    get ReactionsStore() { return WebpackModules.getByProps("getReactions", "_dispatcher"); },
    get MessageActions() { return WebpackModules.getByProps("jumpToMessage", "_sendMessage"); },
    get MessageQueue() { return WebpackModules.getByProps("enqueue"); },
    get MessageParser() { return WebpackModules.getModule(m => Object.keys(m)?.every?.(k => k === "parse" || k === "unparse")); },
    get ExperimentStore() { return WebpackModules.getByProps("getExperimentOverrides"); },
    get ExperimentsManager() { return WebpackModules.getByProps("isDeveloper"); },
    get CurrentExperiment() { return WebpackModules.getByProps("getExperimentId"); },
    get StreamStore() { return WebpackModules.getByProps("getAllActiveStreams", "getStreamForUser"); },
    get StreamPreviewStore() { return WebpackModules.getByProps("getIsPreviewLoading", "getPreviewURL"); },
    get ImageResolver() { return WebpackModules.getByProps("getUserAvatarURL", "getGuildIconURL"); },
    get ImageUtils() { return WebpackModules.getByProps("getSizedImageSrc"); },
    get AvatarDefaults() { return WebpackModules.getByProps("getUserAvatarURL", "DEFAULT_AVATARS"); },
    get DNDSources() { return WebpackModules.getByProps("addTarget"); },
    get DNDObjects() { return WebpackModules.getByProps("DragSource"); },
    get ElectronModule() { return WebpackModules.getByProps("setBadge"); },
    get Flux() { return WebpackModules.getByProps("Store", "connectStores"); },
    get Dispatcher() { return WebpackModules.getByProps("dirtyDispatch"); },
    get PathUtils() { return WebpackModules.getByProps("hasBasename"); },
    get NotificationModule() { return WebpackModules.getByProps("showNotification"); },
    get RouterModule() { return WebpackModules.getByProps("Router"); },
    get APIModule() { return WebpackModules.getByProps("getAPIBaseURL"); },
    get AnalyticEvents() { return WebpackModules.getByProps("AnalyticEventConfigs"); },
    get KeyGenerator() { return WebpackModules.getByRegex(/"binary"/); },
    get Buffers() { return WebpackModules.getByProps("Buffer", "kMaxLength"); },
    get DeviceStore() { return WebpackModules.getByProps("getDevices"); },
    get SoftwareInfo() { return WebpackModules.getByProps("os"); },
    get i18n() { return WebpackModules.getByProps("Messages", "languages"); },
    get MediaDeviceInfo() { return WebpackModules.getByProps("Codecs", "MediaEngineContextTypes"); },
    get MediaInfo() { return WebpackModules.getByProps("getOutputVolume"); },
    get MediaEngineInfo() { return WebpackModules.getByProps("determineMediaEngine"); },
    get VoiceInfo() { return WebpackModules.getByProps("getEchoCancellation"); },
    get SoundModule() { return WebpackModules.getByProps("playSound"); },
    get WindowInfo() { return WebpackModules.getByProps("isFocused", "windowSize"); },
    get DOMInfo() { return WebpackModules.getByProps("canUseDOM"); },
    get LocaleManager() { return WebpackModules.getModule(m => m.Messages && Object.keys(m.Messages).length); },
    get Moment() { return WebpackModules.getByProps("parseZone"); },
    get LocationManager() { return WebpackModules.getByProps("createLocation"); },
    get Timestamps() { return WebpackModules.getByProps("fromTimestamp"); },
    get Strings() { return WebpackModules.getModule(m => m.Messages && Object.keys(m.Messages).length); },
    get StringFormats() { return WebpackModules.getByProps("a", "z"); },
    get StringUtils() { return WebpackModules.getByProps("toASCII"); },
    get URLParser() { return WebpackModules.getByProps("Url", "parse"); },
    get ExtraURLs() { return WebpackModules.getByProps("getArticleURL"); },
    get hljs() { return WebpackModules.getByProps("highlight", "highlightBlock"); },
    get SimpleMarkdown() { return WebpackModules.getByProps("parseBlock", "parseInline", "defaultOutput"); },
    get LayerManager() { return WebpackModules.getByProps("popLayer", "pushLayer"); },
    get UserSettingsWindow() { return WebpackModules.getByProps("open", "updateAccount"); },
    get ChannelSettingsWindow() { return WebpackModules.getByProps("open", "updateChannel"); },
    get GuildSettingsWindow() { return WebpackModules.getByProps("open", "updateGuild"); },
    get ModalActions() { return WebpackModules.getByProps("openModal", "updateModal"); },
    get ModalStack() { return WebpackModules.getByProps("push", "update", "pop", "popWithKey"); },
    get UserProfileModals() { return WebpackModules.getByProps("fetchMutualFriends", "setSection"); },
    get AlertModal() { return WebpackModules.getByPrototypes("handleCancel", "handleSubmit"); },
    get ConfirmationModal() { return WebpackModules.findByDisplayName("ConfirmModal"); },
    get ChangeNicknameModal() { return WebpackModules.getByProps("open", "changeNickname"); },
    get CreateChannelModal() { return WebpackModules.getByProps("open", "createChannel"); },
    get PruneMembersModal() { return WebpackModules.getByProps("open", "prune"); },
    get NotificationSettingsModal() { return WebpackModules.getByProps("open", "updateNotificationSettings"); },
    get PrivacySettingsModal() { return WebpackModules.getModule(m => m.open && m.open.toString().includes("PRIVACY_SETTINGS_MODAL")); },
    get Changelog() { return WebpackModules.getModule((m => m.defaultProps && m.defaultProps.selectable == false)); },
    get PopoutStack() { return WebpackModules.getByProps("open", "close", "closeAll"); },
    get PopoutOpener() { return WebpackModules.getByProps("openPopout"); },
    get UserPopout() { return WebpackModules.getModule(m => m.type.displayName === "UserPopoutContainer"); },
    get ContextMenuActions() { return WebpackModules.getByProps("openContextMenu"); },
    get ContextMenuItemsGroup() { return WebpackModules.getByRegex(/itemGroup/); },
    get ContextMenuItem() { return WebpackModules.getByRegex(/\.label\b.*\.hint\b.*\.action\b/); },
    get ExternalLink() { return WebpackModules.getByRegex(/trusted/); },
    get TextElement() { return WebpackModules.getByDisplayName("LegacyText") ?? WebpackModules.getByProps("Colors", "Sizes"); },
    get Anchor() { return WebpackModules.getByDisplayName("Anchor"); },
    get Flex() { return WebpackModules.getByDisplayName("Flex"); },
    get FlexChild() { return WebpackModules.getByProps("Child"); },
    get Clickable() { return WebpackModules.getByDisplayName("Clickable"); },
    get Titles() { return WebpackModules.getByProps("Tags", "default"); },
    get HeaderBar() { return WebpackModules.getByDisplayName("HeaderBar"); },
    get TabBar() { return WebpackModules.getByDisplayName("TabBar"); },
    get Tooltip() { return WebpackModules.getByProps("TooltipContainer").TooltipContainer; },
    get Spinner() { return WebpackModules.getByDisplayName("Spinner"); },
    get FormTitle() { return WebpackModules.getByDisplayName("FormTitle"); },
    get FormSection() { return WebpackModules.getByDisplayName("FormSection"); },
    get FormNotice() { return WebpackModules.getByDisplayName("FormNotice"); },
    get ScrollerThin() { return WebpackModules.getByProps("ScrollerThin").ScrollerThin; },
    get ScrollerAuto() { return WebpackModules.getByProps("ScrollerAuto").ScrollerAuto; },
    get AdvancedScrollerThin() { return WebpackModules.getByProps("AdvancedScrollerThin").AdvancedScrollerThin; },
    get AdvancedScrollerAuto() { return WebpackModules.getByProps("AdvancedScrollerAuto").AdvancedScrollerAuto; },
    get AdvancedScrollerNone() { return WebpackModules.getByProps("AdvancedScrollerNone").AdvancedScrollerNone; },
    get SettingsWrapper() { return WebpackModules.getByDisplayName("FormItem"); },
    get SettingsNote() { return WebpackModules.getByDisplayName("FormText"); },
    get SettingsDivider() { return WebpackModules.getModule(m => !m.defaultProps && m.prototype && m.prototype.render && m.prototype.render.toString().includes("default.divider")); },
    get ColorPicker() { return WebpackModules.getModule(m => m.displayName === "ColorPicker" && m.defaultProps); },
    get Dropdown() { return WebpackModules.getByProps("SingleSelect").SingleSelect; },
    get Keybind() { return WebpackModules.getByPrototypes("handleComboChange"); },
    get RadioGroup() { return WebpackModules.getByDisplayName("RadioGroup"); },
    get Slider() { return WebpackModules.getByPrototypes("renderMark"); },
    get SwitchRow() { return WebpackModules.getByDisplayName("SwitchItem"); },
    get Textbox() { return WebpackModules.getModule(m => m.defaultProps && m.defaultProps.type == "text"); },
  },

  ReactComponents: class ReactComponents {
    static cache = {}

    static getComponentByName = (displayName, selector) => this.getComponent(displayName, selector, m => m.displayName === displayName)

    static getComponent = (displayName, selector, filter) => new Promise((_res) => {
      if (this.cache[displayName]) return res(this.cache[displayName]);

      const res = (ret) => {
        clearInterval(int);

        // if (!ret.displayName) ret.displayName = displayName

        _res({
          id: displayName,
          component: ret,
          selector,
          filter,

          forceUpdateAll: () => {
            if (!selector) return;

            for (const e of document.querySelectorAll(selector)) {
              goosemod.reactUtils.findInTree(goosemod.reactUtils.getReactInstance(e), m => m?.forceUpdate, { walkable: ["return", "stateNode"] })?.forceUpdate?.();
            }
          }
        });
      };

      const check = () => {
        if (this.cache[displayName]) return res(this.cache[displayName]);

        for (const el of document.querySelectorAll(selector)) {
          let inst = goosemod.reactUtils.getOwnerInstance(el);
          if (!inst) continue;

          inst = inst._reactInternals;

          if (!filter) return res(this.cache[displayName] = inst.type);

          while (inst?.return) {
            if (typeof inst.return?.type === 'string') break;
            if (filter(inst.return.type)) return res(this.cache[displayName] = inst.return.type);

            inst = inst.return;
          }
        }
      };

      setTimeout(check, 0);
      const int = setInterval(check, 5000);
    })
  },

  Utilities: class Utilities { // class because... https://github.com/Strencher/BetterDiscordStuff/blob/master/UserDetails/UserDetails.plugin.js#L757
    static suppressErrors = (func, label) => (...args) => {
      try {
        func(...args);
      } catch (e) {
        console.error('Suppressed error for', label, e);
      }
    }

    static findInReactTree = goosemod.reactUtils.findInReactTree
  },

  PluginUtilities: {
    loadSettings: (name, defaults) => {
      return Object.assign({}, defaults, BdApi.loadData('zeres', name) ?? {});
    },

    saveSettings: (name, save) => {
      BdApi.saveData('zeres', name, save);
    },

    addStyle: (id, css) => {
      const el = document.createElement('style');
      el.appendChild(document.createTextNode(css));
      document.body.appendChild(el);

      injectedCSS[id] = el;
    },

    removeStyle: (id) => {
      injectedCSS[id]?.remove();
    }
  },

  Toasts: {
    info: (content, options = {}) => showToast(content, { ...options, type: 'info' }),
    default: (content, options = {}) => showToast(content, { ...options, type: 'default' }),

    success: (content, options = {}) => showToast(content, { ...options, type: 'success' }),
    warning: (content, options = {}) => showToast(content, { ...options, type: 'warning' }),
    error: (content, options = {}) => showToast(content, { ...options, type: 'error' }),

    show: showToast
  },

  ColorConverter: class ColorConverter {
    static getRGB(color) {
      if (color.startsWith('rgb(')) {
        const simple = color.replace('rgb(', '').replace(')', '').replaceAll(' ', '');

        if (color.includes('%')) return simple.replaceAll('%', '').split(',').map(x => parseFloat(x) * 2.55);
        return simple.split(',').map(x => parseInt(x));
      }

      if (color.startsWith('#')) {
        let full = color;
        if (color.length === 4) full = full + full.slice(1);

        full = parseInt(full.slice(1), 16);

        return [
          (full >> 16) & 0xFF,
          (full >> 8) & 0xFF,
          (full) & 0xFF
        ];
      }
    }

    static rgbToAlpha(color, alpha) {
      return `rgba(${this.getRGB(color).join(', ')}, ${alpha})`;
    }

    static _manipulateColor(color, factor) {
      return `rgb(${this.getRGB(color).map(x => Math.round(Math.max(0, Math.min(255, x + x * (factor / 100))))).join(', ')})`;
    }

    static darkenColor(color, factor) {
      return this._manipulateColor(color, -factor);
    }

    static lightenColor(color, factor) {
      return this._manipulateColor(color, factor);
    }

    static _discordModule = goosemod.webpackModules.findByProps('hex2int', 'hex2rgb')
    static isValidHex(color) { return this._discordModule.isValidHex(color); }
    static getDarkness(color) { return this._discordModule.getDarkness(color); }
    static hex2int(color) { return this._discordModule.hex2int(color); }
    static hex2rgb(color) { return this._discordModule.hex2rgb(color); }
    static int2hex(color) { return this._discordModule.int2hex(color); }
    static int2rgba(color, alpha) { return this._discordModule.int2rgba(color, alpha); }
  },

  buildPlugin: (config) => {
    const meta = config.info;
    const id = meta.name;

    return [
      class Plugin {
        start() {
          this.onStart();
        }

        stop() {
          this.onStop();
        }

        getName() { return meta.name; }
        getDescription() { return meta.description; }
        getVersion() { return meta.version; }
        getAuthor() { return meta.authors.map(x => x.name).join(', '); }
      },

      {
        ...api,
        Patcher: Object.keys(BdApi.Patcher).reduce((acc, x) => { acc[x] = BdApi.Patcher[x].bind(this, id); return acc; }, {})
      }
    ];
  }
};

ZLibrary = ZeresPluginLibrary = api;

// some plugins require it in global
global.ZeresPluginLibrary = window.ZeresPluginLibrary = ZeresPluginLibrary;
global.ZLibrary = window.ZLibrary = ZLibrary;
})();