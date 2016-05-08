import Store from './store';
import Actions from './actions';

export {Actions, Store};
export LightDB from './lightdb';
export Validator from './validator';
export {ValidatorMap} from './validator';
export {StoreParamNeedError} from './error';

export default {
  createStore: (data, shallowCloneProps) => new Store(data, shallowCloneProps),
  createActions: (store, actions) => new Actions(store, actions)
};
