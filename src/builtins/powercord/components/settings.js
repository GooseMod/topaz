const { React } = goosemod.webpackModules.common;
const OriginalSwitchItem = goosemod.webpackModules.findByDisplayName('SwitchItem');

const OriginalFormItem = goosemod.webpackModules.findByDisplayName('FormItem');
const OriginalFormText = goosemod.webpackModules.findByDisplayName('FormText');

const Flex = goosemod.webpackModules.findByDisplayName('Flex');
const Margins = goosemod.webpackModules.findByProps('marginTop20', 'marginBottom20');
const FormClasses = goosemod.webpackModules.findByProps('formText', 'description');

const FormText = goosemod.webpackModules.findByDisplayName('FormText');

const FormDivider = goosemod.webpackModules.findByDisplayName('FormDivider');
const SettingsFormClasses = goosemod.webpackModules.findByProps('dividerDefault', 'titleDefault');

const OriginalTextInput = goosemod.webpackModules.findByDisplayName('TextInput');
const OriginalSlider = goosemod.webpackModules.findByDisplayName('Slider');

const SelectTempWrapper = goosemod.webpackModules.findByDisplayName('SelectTempWrapper');

const OriginalRadioGroup = goosemod.webpackModules.findByDisplayName('RadioGroup');

const OriginalTextArea = goosemod.webpackModules.findByDisplayName('TextArea');

const Tooltip = goosemod.webpackModules.findByDisplayName('Tooltip');
const Button = goosemod.webpackModules.findByProps('DropdownSizes');

class Divider extends React.PureComponent {
  render() {
    return React.createElement(FormDivider, {
      className: SettingsFormClasses.dividerDefault
    });
  }
}

class FormItem extends React.PureComponent {
  render() {
    return React.createElement(OriginalFormItem, {
        title: this.props.title,
        required: this.props.required,
        className: [Flex.Direction.VERTICAL, Flex.Justify.START, Flex.Align.STRETCH, Flex.Wrap.NO_WRAP, Margins.marginBottom20].join(' '),
        onClick: () => {
          this.props.onClick?.();
        }
      },

      this.props.children,

      this.props.note && React.createElement(OriginalFormText, {
        className: FormClasses.description + (this.props.noteHasMargin ? (' ' + Margins.marginTop8) : '')
      }, this.props.note),

      React.createElement(Divider)
    );
  }
}

module.exports = {
  SwitchItem: OriginalSwitchItem,

  TextAreaInput: class TextAreaInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required,

          noteHasMargin: true
        },

        React.createElement(OriginalTextArea, {
          ...this.props
        })
      );
    }
  },

  TextInput: class TextInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required,

          noteHasMargin: true
        },

        React.createElement(OriginalTextInput, {
          ...this.props
        })
      );
    }
  },

  SliderInput: class SliderInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required
        },

        React.createElement(OriginalSlider, {
          ...this.props,
          className: `${this.props.className ?? ''} ${Margins.marginTop20}`
        })
      );
    }
  },

  SelectInput: class SelectInput extends React.PureComponent {
    render() {
      const title = this.props.children;
      delete this.props.children;

      return React.createElement(FormItem, {
          title,
          note: this.props.note,
          required: this.props.required,

          noteHasMargin: true
        },

        React.createElement(SelectTempWrapper, {
          ...this.props
        })
      );
    }
  },

  RadioGroup: class RadioGroup extends React.PureComponent {
    render() {
      return React.createElement(FormItem, {
          title: this.props.children,
          note: this.props.note,
          required: this.props.required
        },

        React.createElement(OriginalRadioGroup, {
          ...this.props
        })
      );
    }
  },

  ButtonItem: class ButtonItem extends React.PureComponent {
    render() {
      return React.createElement(FormItem, {
        title: this.props.children
      },
        this.props.note && React.createElement(OriginalFormText, { // note here so it's before button
          className: FormClasses.description
        }, this.props.note),

        React.createElement(Tooltip, {
          text: this.props.tooltipText,
          position: this.props.tooltipPosition,
          shouldShow: this.props.tooltipText !== undefined
        },
          () => React.createElement(Button, {
            color: this.props.success ? Button.Colors.GREEN : (this.props.color ?? Button.Colors.BRAND),
            disabled: this.props.disabled,
            onClick: () => this.props.onClick(),
            style: {
              marginLeft: 5
            }
          }, this.props.button)
        )
      );
    }
  },

  Category: class Category extends React.PureComponent {
    render() {
      const children = this.props.opened ? this.props.children : [];

      return React.createElement(FormItem, {
          title: React.createElement('div', {},
            React.createElement('svg', {
              xmlns: "http://www.w3.org/2000/svg",
              viewBox: "0 0 24 24",
              width: "24",
              height: "24",
              style: {
                transform: this.props.opened ? 'rotate(90deg)' : '',
                marginRight: '10px'
              }
            },
              React.createElement('path', {
                fill: 'var(--header-primary)',
                d: 'M9.29 15.88L13.17 12 9.29 8.12c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0l4.59 4.59c.39.39.39 1.02 0 1.41L10.7 17.3c-.39.39-1.02.39-1.41 0-.38-.39-.39-1.03 0-1.42z'
              }),
            ),

            React.createElement('label', {
              class: FormClasses.title,
              style: {
                textTransform: 'none',
                display: 'inline',
                verticalAlign: 'top',
              }
            },
              this.props.name,

              React.createElement(FormText, {
                className: FormClasses.description,
                style: {
                  marginLeft: '34px'
                }
              }, this.props.description)
            ),
          ),

          onClick: () => {
            this.props.onChange(!this.props.opened);
          }
        },

        ...children
      );
    }
  },

  FormItem,
  Divider
};