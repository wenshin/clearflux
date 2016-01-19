import {assert} from 'chai';
import clearflux, {
  Store, Action, Validator, ValidatorMap, StoreWritePermissionError
} from '../lib';

describe('clearflux', function () {
  it('should have all props!', function () {
    assert.ok(clearflux.createStore);
    assert.ok(clearflux.createAction);
    assert.ok(Store);
    assert.ok(Action);
    assert.ok(Validator);
    assert.ok(ValidatorMap);
    assert.ok(StoreWritePermissionError);
  });
});
