const { React } = goosemod.webpackModules.common;

class AsyncComponent extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {};
  }

  async componentDidMount () {
    this.setState({
      comp: await this.props._provider()
    });
  }

  render () {
    const { comp } = this.state;
    if (comp) return React.createElement(comp, {
      ...this.props,
      ...this.props._pass
    });

    return this.props._fallback ?? null;
  }

  static from (prov, _fallback) {
    return React.memo(
      props => React.createElement(AsyncComponent, {
        _provider: () => prov,
        _fallback,
        ...props
      })
    );
  }

  static fromDisplayName (name, fallback) {
    return AsyncComponent.from(goosemod.webpackModules.findByDisplayName(name), fallback);
  }

  static fromModule (filter, fallback) {
    return AsyncComponent.from(goosemod.webpackModules.find(filter), fallback);
  }

  static fromModuleProp (filter, key, fallback) {
    return AsyncComponent.from((async () => (await goosemod.webpackModules.find(filter))[key])(), fallback);
  }
}


const Flux = goosemod.webpackModules.findByProps('Store', 'connectStores');

// jank Flux addition because yes
Flux.connectStoresAsync = (stores, callback) => comp => AsyncComponent.from((async () => {
  const ret = await Promise.all(stores);
  return Flux.connectStores(ret, p => callback(ret, p))(comp);
})());

module.exports = AsyncComponent;