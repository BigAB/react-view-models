import React from 'react';
import compute from 'can-compute';
import DefineMap from "can-define/map/";

export function connect( MapToProps, ComponentToConnect ) {

  class ConnectedComponent extends React.Component {

    constructor(props) {
      super(props);
      this.propsCompute = compute(props);

      if ( MapToProps.prototype instanceof DefineMap ) {
        this.viewModel = new MapToProps( this.propsCompute() );
        this.mapToState = this.createMapToStateWithViewModel( this.viewModel );
      } else {
        this.mapToState = this.createMapToStateWithFunction( MapToProps )
      }

      this.state = { propsForChild: this.mapToState() };
      let batchNum;
      this.mapToState.bind("change", (ev, newVal) => {
        if(!ev.batchNum || ev.batchNum !== batchNum) {
          this.setState({ propsForChild: newVal });
        }
      });
    }

    createMapToStateWithViewModel( vm ) {
      return compute(() => {
        vm.set( this.propsCompute() );
        const props = vm.serialize();
        getMethodNames( vm ).forEach( methodName => {
          props[methodName] = vm[methodName].bind(vm);
        });
        return props;
      });
    }

    createMapToStateWithFunction( func ) {
      return compute(() => {
        const props = this.propsCompute();
        return Object.assign( {}, props, func(props) );
      });
    }

    componentWillReceiveProps(nextProps) {
      this.propsCompute(nextProps);
    }

    render() {
      return React.createElement(ComponentToConnect, this.state.propsForChild);
    }

  }

  ConnectedComponent.displayName = `Connected(${ getDisplayName(ComponentToConnect) })`;

  return ConnectedComponent;
}

function getDisplayName(ComponentToConnect) {
  return ComponentToConnect.displayName || ComponentToConnect.name || 'Component';
}

function getMethodNames( obj ) {
  const result = [];
  for (var key in obj) {
    try {
      if (typeof( obj[key] ) == "function") {
        result.push( key );
      }
    } catch (err) {
      // do nothing
    }
  }
  return result;
}
