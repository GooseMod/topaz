// based on https://github.com/powercord-org/powercord/blob/v2/src/fake_node_modules/powercord/components/ContextMenu.jsx
const { React } = goosemod.webpackModules.common;

const { closeContextMenu } = goosemod.webpackModules.findByProps('openContextMenu', 'closeContextMenu');
const { default: Menu, MenuGroup, MenuItem, MenuCheckboxItem, MenuControlItem } = goosemod.webpackModules.findByProps('MenuCheckboxItem');
const Slider = goosemod.webpackModules.find(m => m.render && m.render.toString().includes('sliderContainer'));


class ContextMenu extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {};
  }

  static renderRawItems (items) {
    return (new ContextMenu()).renderItems(items, {
      standalone: true,

      depth: 0,
      group: 0,
      i: 0
    });
  }

  render () {
    if (this.props.items) {
      return this.renderItems(this.props.items, {
        depth: 0,
        group: 0,
        i: 0
      });
    }

    return React.createElement(Menu, {
      navId: this.props.navId ?? `pc-${Math.random().toString().slice(2)}`,
      onClose: closeContextMenu
    },
      ...this.props.itemGroups.map((items, i) => (
        React.createElement(MenuGroup, {},
          ...this.renderItems(items, {
            depth: 0,
            group: i,
            i: 0
          })
        )
      ))
    );
  }

  renderItems (items, ctx) {
    return items.map(item => {
      ctx.i++;

      switch (item.type) {
        case 'button': return this.renderButton(item, ctx);
        case 'checkbox': return this.renderCheckbox(item, ctx);
        case 'slider': return this.renderSlider(item, ctx);
        case 'submenu': return this.renderSubMenu(item, ctx);

        default: return null;
      }
    });
  }

  renderButton (item, ctx) {
    return React.createElement(MenuItem, {
      id: item.id ?? `item-${ctx.group}-${ctx.depth}-${ctx.i}`,

      disabled: item.disabled,
      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext,

      action: () => {
        if (!item.disabled) item.onClick?.();
      }}
    );
  }

  renderCheckbox (item, ctx) {
    const elementKey = `active-${ctx.group}-${ctx.depth}-${ctx.i}`;
    const active = this.state[elementKey] !== void 0
      ? this.state[elementKey]
      : item.defaultState;

    return React.createElement(MenuCheckboxItem, {
      id: item.id ?? `item-${ctx.group}-${ctx.depth}-${ctx.i}`,

      checked: active,
      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext,

      action: e => {
        const newActive = !active;

        if (item.onToggle) {
          item.onToggle(newActive);
        }

        if (ctx.standalone) {
          const el = e.target.closest('[role="menu"]');
          setImmediate(() => goosemod.reactUtils.getOwnerInstance(el).forceUpdate());
        } else {
          this.setState({ [elementKey]: newActive });
        }
      }
    });
  }

  renderSlider (item, ctx) {
    return React.createElement(MenuControlItem, {
      id: item.id ?? `item-${ctx.group}-${ctx.depth}-${ctx.i}`,

      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext,

      control: (props, ref) => React.createElement(Slider, {
        mini,
        ref,
        equidistant: typeof item.markers !== 'undefined',
        stickToMarkers: typeof item.markers !== 'undefined',
        ...props,
        ...item
      })
    });
  }

  renderSubMenu (item, ctx) {
    const elementKey = `items-${ctx.group}-${ctx.depth}-${ctx.i}`;

    let items = this.state[elementKey];
    if (items === void 0) {
      items = item.getItems();
      this.setState({ [elementKey]: items });

      if (items instanceof Promise) {
        items.then(fetchedItems => this.setState({ [elementKey]: fetchedItems }));
      }
    }

    return React.createElement(MenuItem, {
      id: item.id ?? `item-${ctx.group}-${ctx.depth}-${ctx.i}`,

      disabled: !items || !items.length || item.disabled,
      label: item.name,
      color: item.color,
      hint: item.hint,
      subtext: item.subtext
    },
      items && items.length > 0 && !item.disabled && this.renderItems(items, {
        depth: ctx.depth + 1,
        group: 0,
        i: 0
      })
    );
  }
}

module.exports = ContextMenu;