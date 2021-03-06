import chai from 'chai';
import { connect } from '../react-view-models';
import React from 'react';
import compute from 'can-compute';
import ReactTestUtils from 'react-addons-test-utils';
import DefineMap from "can-define/map/";
import 'steal-mocha';
const assert = chai.assert;

describe('react-view-models', () => {

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
        bar: 'string',
        foobar: {
          get() {
            return this.foo + this.bar;
          },
          serialize: true
        },
        zzz: {
          set( newVal ) {
            return newVal.toUpperCase();
          }
        },
        returnContext() {
          return this;
        },
        interceptedCallbackCalled: 'boolean',
        interceptedCallback: {
          type: 'function',
          get( lastSetValue ) {
            return (...args) => {
              this.interceptedCallbackCalled = true;
              if ( lastSetValue ) {
                return lastSetValue(...args);
              }
            };
          },
          serialize: true
        }
      });

      it('should assign a property to the component called `viewModel` with an instance of ViewModel as the value', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const connectedInstance = ReactTestUtils.renderIntoDocument( React.createElement( ConnectedComponent ) );
        assert.ok( connectedInstance.viewModel instanceof DefinedViewModel );
      });

      it('should pass a props object with copied methods, that have the correct context (the viewmodel) for callbacks', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const connectedInstance = ReactTestUtils.renderIntoDocument( React.createElement( ConnectedComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(connectedInstance, TestComponent)[0];
        assert.equal(childComponent.props.returnContext(), connectedInstance.viewModel);
      });

      it('should update whenever any observable property on the viewModel instance changes', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const el = React.createElement( ConnectedComponent, { bar: 'bar', baz: 'bam' } );
        const connectedInstance = ReactTestUtils.renderIntoDocument( el );
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

      it('should update the viewModel when new props are received', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const WrappingComponent = React.createClass({
          getInitialState() {
            return { bar: 'bar' };
          },
          changeState() {
            this.setState( { bar: 'BAZ' } );
          },
          render() {
            return <ConnectedComponent bar={ this.state.bar } />;
          }
        });

        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, ConnectedComponent)[0];

        assert.equal(childComponent.viewModel.foobar, 'foobar');
        wrappingInstance.changeState();
        assert.equal(childComponent.viewModel.foobar, 'fooBAZ');
      });

      it('should use the viewModels props value, if the viewModel changes, and no new props are received', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const WrappingComponent = React.createClass({
          getInitialState() {
            return { bar: 'bar' };
          },
          render() {
            return <ConnectedComponent bar={ this.state.bar } />;
          }
        });

        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, ConnectedComponent)[0];

        assert.equal(childComponent.viewModel.foobar, 'foobar');
        childComponent.viewModel.bar = 'BAZ';
        assert.equal(childComponent.viewModel.foobar, 'fooBAZ');
      });

      it('should be able to call the props.interceptedCallback function received from parent component', () => {
        const expectedValue = [];
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const WrappingComponent = React.createClass({
          parentCallBack() { return expectedValue; },
          render() {
            return <ConnectedComponent interceptedCallback={ this.parentCallBack } />;
          }
        });

        const wrappingInstance = ReactTestUtils.renderIntoDocument( React.createElement( WrappingComponent ) );
        const connectedInstance = ReactTestUtils.scryRenderedComponentsWithType(wrappingInstance, ConnectedComponent)[0];
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType(connectedInstance, TestComponent)[0];

        const actual = childComponent.props.interceptedCallback();

        assert.equal(actual, expectedValue, 'Value returned from wrapping components callback successfully');
        assert.equal(connectedInstance.viewModel.interceptedCallbackCalled, true, 'ViewModels interceptedCallback was called');
      });

      it('should be able to have the viewModel transform props before passing to child component', () => {
        const ConnectedComponent = connect( DefinedViewModel, TestComponent );
        const el = React.createElement( ConnectedComponent, { zzz: 'zzz' } );
        const connectedInstance = ReactTestUtils.renderIntoDocument( el );
        const childComponent = ReactTestUtils.scryRenderedComponentsWithType( connectedInstance, TestComponent )[0];

        assert.equal(childComponent.props.zzz, 'ZZZ');
      });

    });

  });

});
