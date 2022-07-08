const { React } = goosemod.webpackModules.common;

module.exports = {
  Icon: (props) => React.createElement(goosemod.webpackModules.findByDisplayName(props.name), { ...props })
};