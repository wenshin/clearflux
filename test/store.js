import assert from 'assert';
import { StoreWritePermissionError } from '../lib/error';
import Store from '../lib/store';

describe('store', function () {

  it('should not put values directly!', function () {
    let store = new Store({a: 1, b: {c: 1}});
    assert.throws(() => store.put('a', 2), StoreWritePermissionError);

    let action = {};
    store.registerWriter(action);
    assert.doesNotThrow(() => store.put('a', 2, action), StoreWritePermissionError);
  });

  it('should trigger root level property change event!', function (done) {
    let store = new Store({a: 1, b: {c: 1}});
    let triggerValues = [1, 2];
    store.onChange('a', function(value) {
      assert.equal(triggerValues.shift(), value);
    });

    let action = {get: () => {}};
    store.registerWriter(action);
    store.put('a', 2, action);
    setTimeout(() => {
      assert.ok(!triggerValues.length, `值为“${triggerValues}”的事件没有触发`);
      done();
    }, 25);
  });
});
