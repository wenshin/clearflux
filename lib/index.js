import Store from './store';
import Actions from './action';

export {Store};
export {Actions};
export Validator from './validator';
export {ValidatorMap} from './validator';
export {StoreWritePermissionError} from './error';

export default {
  createStore: (data, shallowCloneProps) => new Store(data, shallowCloneProps),
  createActions: (store, actions) => new Actions(store, actions)
};
