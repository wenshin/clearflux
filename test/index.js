import {assert} from 'chai';
import clearflux, {
  Store, Actions, Validator, ValidatorMap, StoreWritePermissionError
} from '../lib';

describe('clearflux', function () {
  it('should have all props!', function () {
    assert.ok(clearflux.createStore);
    assert.ok(clearflux.createActions);
    assert.ok(Store);
    assert.ok(Actions);
    assert.ok(Validator);
    assert.ok(ValidatorMap);
    assert.ok(StoreWritePermissionError);
  });
});
