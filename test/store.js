import assert from 'assert';
import { StoreWritePermissionError } from '../lib/error';
import Store from '../lib/store';

describe('store', function () {

  it('should not set values directly!', function () {
    let store = new Store({a: 1, b: {c: 1}});
    assert.throws(() => store.set('a', 2), StoreWritePermissionError);

    let action = {};
    store.registerWriter(action);
    assert.doesNotThrow(() => store.set('a', 2, action), StoreWritePermissionError);
  });

  it('should trigger root level property change event!', function () {
    let store = new Store({a: 1, b: {c: 1}});
    let changedA = false;
    store.onchange('a', function(old, changed) {
      changedA = true;
      assert.notDeepEqual(old, changed, 'When changed the "old" and "changed" value must not deep equal');
    });
    assert(changedA, 'changed handler will trigger immediately when change event');

    changedA = false;
    let action = {get: () => {}};
    store.registerWriter(action);
    store.set('a', 2, action);
    assert(changedA, 'changed handler will trigger when values changed');
  });
});
