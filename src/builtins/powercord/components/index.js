const { React } = goosemod.webpackModules.common;

const allIcons = goosemod.webpackModules.findAll(x => typeof x === 'function' && x.toString().indexOf('"currentColor"') !== -1);
const Icon = (_props) => {
  const props = Object.assign({}, _props);
  delete props.name;

  return React.createElement(allIcons.find(x => x.displayName === _props.name), props);
};

Icon.Names = allIcons.map(x => x.displayName);


module.exports = {
  Icon,

  Icons: {
    FontAwesome: React.memo(props => {
      if (!document.querySelector('#fontawesome')) { // inject fontawesome when/if needed
        const el = document.createElement('link');
        el.rel = 'stylesheet';
        el.href = 'https://kit-pro.fontawesome.com/releases/v5.15.4/css/pro.min.css';
        el.id = 'fontawesome';

        document.head.appendChild(el);
      }

      const styles = {
        regular: 'r',
        light: 'l',
        duotone: 'd',
        brands: 'b'
      };

      const style = Object.keys(styles).find(x => props.icon.includes(x));

      return React.createElement('div', {
        className: `${styles[style] ? `fa${styles[style]}` : 'fas'} fa-fw fa-${props.icon.replace(`-${style}`, '')} ${props.className}`.trim()
      });
    }),

    Pin: React.memo(props => React.createElement('svg', {
      viewBox: "0 0 24 24",
      ...props
    },
      React.createElement('path', {
        fill: 'currentColor',
        d: 'M19 3H5V5H7V12H5V14H11V22H13V14H19V12H17V5H19V3Z'
      })
    ))
  },


  Clickable: goosemod.webpackModules.findByDisplayName('Clickable'),
  Button: goosemod.webpackModules.findByProps('DropdownSizes'),

  Card: goosemod.webpackModules.findByDisplayName('Card'),
  Spinner: goosemod.webpackModules.findByDisplayName('Spinner'),

  HeaderBar: goosemod.webpackModules.findByDisplayName('HeaderBar'),
  TabBar: goosemod.webpackModules.findByDisplayName('TabBar'),

  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer').TooltipContainer,

  FormTitle: goosemod.webpackModules.findByDisplayName('FormTitle'),
  FormNotice: goosemod.webpackModules.findByDisplayName('FormNotice'),
  Text: goosemod.webpackModules.findByDisplayName('LegacyText'),
  Flex: goosemod.webpackModules.findByDisplayName('Flex'),

  AdvancedScrollerThin: goosemod.webpackModules.findByProps('AdvancedScrollerThin').AdvancedScrollerThin,
  AdvancedScrollerAuto: goosemod.webpackModules.findByProps('AdvancedScrollerAuto').AdvancedScrollerAuto,
  AdvancedScrollerNone: goosemod.webpackModules.findByProps('AdvancedScrollerNone').AdvancedScrollerNone,

  Menu: goosemod.webpackModules.findByProps('MenuGroup'),

  AsyncComponent: require('powercord/components/AsyncComponent'),
  settings: require('powercord/components/settings'),
  modal: require('powercord/components/modal')
};