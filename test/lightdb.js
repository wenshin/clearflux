import {assert} from 'chai';
import {LightDB} from '../lib';

describe('LightDB', function () {
  it('should findById right', function () {
    let db = new LightDB([{id: 1, name: 'name1'}, {id: 2, name: 'name2'}]);
    assert.deepEqual(db.findById(1), {id: 1, name: 'name1'});
  });

  it('should findByFieldName right', function () {
    let db = new LightDB([{id: 1, name: 'name1'}, {id: 2, name: 'name2'}]);
    assert.deepEqual(db.findByFieldName('name2', 'name'), {id: 2, name: 'name2'});
  });

  it('should inherited Array methods!', function () {
    let db = new LightDB([{id: 1, name: 'name1'}]);
    let newItem = {id: 2, name: 'name2'};
    db.push(newItem);
    assert.deepEqual(db.findById(2), newItem);
    assert.deepEqual(db.find(v => v.id === 2), newItem);
    assert.deepEqual(db.find(v => v.id === 1), {id: 1, name: 'name1'});
    assert.equal(db.length, 2);

    db.pop();
    assert.equal(db.findById(2), undefined);
  });

  it('should iterate array right!', function () {
    let data = [{id: 1, name: 'name1'}, {id: 2, name: 'name2'}];
    let db = new LightDB(data);
    let loopData = [];
    for (let item of db) {
      loopData.push(item);
    }
    assert.deepEqual(loopData, data);

    assert.deepEqual(db.map(v => v.id), [1, 2]);
    assert.deepEqual(db.reduce((prev, cur) => prev + cur.id, 0), 3);
    assert.deepEqual(db.filter(v => v.id === 2), [{id: 2, name: 'name2'}]);
  });
});

