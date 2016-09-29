import chai from 'chai';
import { connect } from '../can-react';
import React from 'react';
import compute from 'can-compute';
import ReactTestUtils from 'react-addons-test-utils';
import DefineMap from "can-define/map/";
import 'steal-mocha';
const assert = chai.assert;

describe('can-react', () => {

  describe('connect()', () => {
    let TestComponent;
    let shallowRenderer;

    beforeEach(() => {
      TestComponent = React.createClass({
        render() {
          return React.createElement('div', { className: 'test' });
        }
      });
      shallowRenderer = ReactTestUtils.createRenderer();
    });

    describe('with a map to props function', () => {

      it('should not (by default) render additional dom nodes that the ones from the extended Presentational Component', () => {

        const ConnectedComponent = connect( () => ({ value: 'bar' }), TestComponent );

        shallowRenderer.render( React.createElement( ConnectedComponent, { value: 'foo' } ) );

        const result = shallowRenderer.getRenderOutput();

        assert.equal(result.type, TestComponent); // not ConnectedComponent
        assert.equal(result.props.value, 'bar'); // not 'foo'

      });

      it('should update the component whenever an observable read inside the mapToProps function emits a change event', () => {
        const observable = compute('Inital Value');
        const ConnectedComponent = connect( () => ({ value: observable() }), TestComponent );

        const connectedInstance = ReactTestUtils.renderIntoDocument( React.createElement( ConnectedComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(connectedInstance, TestComponent)[0];

        assert.equal(childComponent.props.value, 'Inital Value');
        observable('new value');
        assert.equal(childComponent.props.value, 'new value');

      });

      it('should update the component when new props are received', () => {
        const observable = compute('Inital Observable Value');
        const ConnectedComponent = connect( ({ propValue }) => ({ value: observable(), propValue }), TestComponent );
        const WrappingComponent = React.createClass({
          getInitialState() {
            return { propValue: 'Initial Prop Value' };
          },
          changeState() {
            this.setState( { propValue: 'New Prop Value' } );
          },
          render() {
            return <ConnectedComponent propValue={ this.state.propValue } />;
          }
        });

        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, TestComponent)[0];

        assert.equal(childComponent.props.propValue, 'Initial Prop Value');
        wrappingInstance.changeState();
        assert.equal(childComponent.props.propValue, 'New Prop Value');
      });

    });

    describe('with can-define constructor function (viewModel)', () => {

      const DefinedViewModel = DefineMap.extend({
        foo: {
          type: 'string',
          value: 'foo'
        },
        bar: {
          get() {
            return this.props.bar || '';
          },
          serialize: true
        },
        foobar: {
          get() {
            return this.foo + this.bar;
          },
          serialize: true
        },
        derivedFromProps: {
          get() {
            if (this.props.propValue) {
              return `${this.props.propValue} ${this.foobar}`;
            }
            return 'No value';
          },
          serialize: true
        },
        callback() {
          if ( this.props.callback ) {
            return this.props.callback();
          }
          return this;
        }
      });

      it('should assign a property to the component called `viewModel` with an instance of ViewModel as the value', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const connectedInstance = ReactTestUtils.renderIntoDocument( React.createElement( ConnectedComponent ) );
        assert.ok( connectedInstance.viewModel instanceof DefinedViewModel );
      });

      it('should pass a props object with copied methods, that have the correct context (the viewmodel) to be used as callbacks', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const connectedInstance = ReactTestUtils.renderIntoDocument( React.createElement( ConnectedComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(connectedInstance, TestComponent)[0];
        assert.equal(childComponent.props.callback(), connectedInstance.viewModel);
      });

      it('should update whenever any observable property on the viewModel instance changes', () => {

        const ConnectedComponent = connect( DefinedViewModel, TestComponent );

        const connectedInstance = ReactTestUtils.renderIntoDocument( React.createElement( ConnectedComponent, { bar: 'bar', baz: 'bam' } ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType( connectedInstance, TestComponent )[0];

        assert.equal(childComponent.props.foobar, 'foobar');
        connectedInstance.viewModel.foo = 'MMM';
        assert.equal(childComponent.props.foobar, 'MMMbar');

      });

      it('should update the component when new props are received', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const WrappingComponent = React.createClass({
          getInitialState() {
            return { barValue: 'Initial Prop Value' };
          },
          changeState() {
            this.setState( { barValue: 'New Prop Value' } );
          },
          render() {
            return <ConnectedComponent bar={ this.state.barValue } />;
          }
        });

        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, TestComponent)[0];

        assert.equal(childComponent.props.bar, 'Initial Prop Value');
        wrappingInstance.changeState();
        assert.equal(childComponent.props.bar, 'New Prop Value');
      });

      it('should be able to call the props.callback function received from parent component', () => {
        const expectedValue = [];
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const WrappingComponent = React.createClass({
          parentCallBack() { return expectedValue; },
          render() {
            return <ConnectedComponent callback={ this.parentCallBack } />;
          }
        });

        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const connectedInstance = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, ConnectedComponent)[0];
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(connectedInstance, TestComponent)[0];

        assert.equal(childComponent.props.callback(), expectedValue);
      });

      it('should assign the received props to the viewModel.props property (issue #4)', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const WrappingComponent = React.createClass({
          getInitialState() {
            return { propValue: 'Initial Prop Value' };
          },
          changeState() {
            this.setState( { propValue: 'New Prop Value' } );
          },
          render() {
            return <ConnectedComponent propValue={ this.state.propValue } />;
          }
        });
        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const connectedInstance = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, ConnectedComponent)[0];
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(connectedInstance, TestComponent)[0];
        const vm = connectedInstance.viewModel;
        assert.equal(vm.props.propValue, 'Initial Prop Value');
        wrappingInstance.changeState();
        assert.equal(vm.props.propValue, 'New Prop Value');
        assert.equal(vm.derivedFromProps, 'New Prop Value foo');
      });

    });

  });

});
