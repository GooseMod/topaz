const { React } = goosemod.webpackModules.common;
const OriginalSwitchItem = goosemod.webpackModules.findByDisplayName('SwitchItem');

module.exports = {
  Switch: class SwitchItemContainer extends React.PureComponent {
    render() {
      return React.createElement(OriginalSwitchItem, {
        value: this.props.checked,
        note: this.props.description,
        onChange: (e) => {
          this.props.onChange(e);

          this.props.value = e;
          this.forceUpdate();
        }
      }, this.props.title);
    }
  },
};