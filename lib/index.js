import Store from './store';
import Action from './action';

export {Store};
export {Action};
export Validator from './validator';
export {ValidatorMap} from './validator';
export {StoreWritePermissionError} from './error';

export default {
  createStore: (data, shallowCloneProps) => new Store(data, shallowCloneProps),
  createAction: (store, actions) => new Action(store, actions)
};
