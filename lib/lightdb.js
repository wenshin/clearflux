const DEFAULT_ID_KEY = 'id';

function clearCache(data, cacheSpace) {
  for (let key of Object.keys(cacheSpace)) {
    let cached = cacheSpace[key] || {};
    delete cached[data[key]];
  }
  return data;
}

/**
 * LightDB 类
 *
 * @Features
 * 1. 高效缓存数组元素，减少查找元素的遍历次数；
 * 2. 继承原生数组的遍历和大部分方法，可以直接使用 for...of 遍历（需要引入 Symbol polyfill）；
 * 3. 高效的数组转换对象机制。
 *
 * @问题
 *
 * Usage:
 * ```
 * let db = new LightDB([
 *   {myid: 1, name: 'myname', age: 1},
 *   {myid: 2, name: 'myname2', age: 2}
 * ], 'myid');
 *
 * db.findById(1);
 * // {myid: 1, name: 'myname', age: 1}
 *
 * db.findByFieldName('name', 'myname2');
 * // {myid: 2, name: 'myname2', age: 2}
 *
 * let newData = {myid: 1, name: 'myname1'};
 *
 * db.update(newData);
 * // [{myid: 1, name: 'myname1', age: 1}, {myid: 2, name: 'myname2', age: 2}]
 *
 * db.put(newData);
 * // [{myid: 1, name: 'myname1'}, {myid: 2, name: 'myname2', age: 2}]
 *
 * db.put(newData);
 * // [{myid: 1, name: 'myname1'}, {myid: 2, name: 'myname2', age: 2}]
 *
 * db.toObject('name');
 * // {myname1: {myid: 1, name: 'myname1'}, myname2: {myid: 2, name: 'myname2', age: 2}}
 *
 * ```
 */
export default class LightDB {
  static toObject(array, field) {
    let obj = {};
    array.map(item => obj[item[field]] = item);
    return obj;
  }

  constructor(data, idKey=DEFAULT_ID_KEY) {
    this._data = data || [];
    this._idKey = idKey;
    this._indexedCache = {[idKey]: {/*1: {id: 1, name: 'name1'}*/}};

    let inheritProps = [
      Symbol.iterator, // Symbol.iterator 的使用需要使用 babel-polyfill
      'reverse', 'sort', 'map', 'forEach', 'reduce',
      'some', 'every', 'indexOf', 'lastIndexOf', 'find', 'filter',
      'slice', 'concat', 'shift', 'push'
    ];
    for (let prop of inheritProps) {
      this[prop] = this._data[prop] instanceof Function ? this._data[prop].bind(this._data) : this._data[prop];
    }
  }

  get length() {
    return this._data.length;
  }

  set length(value) {
    this._data.length = value;
  }

  toObject(field=DEFAULT_ID_KEY) {
    let cached = this._indexedCache[field] || {};

    // 如果缓存的数量和数据长度一致，则直接返回缓存对象
    if (Object.keys(cached).length === this._data.length) return cached;

    // 如果没有缓存所有数据，则遍历所有数据并缓存为对象
    return ( this._indexedCache[field] = LightDB.toObject(this._data, field) );
  }

  toArray() {
    return this._data;
  }

  pop() {
    let item = this._data.pop();
    return clearCache(item, this._indexedCache);
  }

  unshift() {
    let item = this._data.unshift();
    return clearCache(item, this._indexedCache);
  }

  findByIndex(index) {
    return this._data[index];
  }

  findById(id) {
    return this.findByFieldName(this._idKey, id);
  }

  findByFieldName(field, value) {
    let item;
    let cacheKey = value;
    let cached = this._indexedCache[field] || {};
    if ( !(cacheKey in cached) ) {
      item = this.find(_item => {
        let iterValue = _item[field];
        // 缓存遍历过的条目
        cached[iterValue] || (cached[iterValue] = _item);
        return iterValue === value;
      });
      this._indexedCache[field] = cached;
    } else {
      item = cached[cacheKey];
    }
    return item;
  }

  delByIndex(index) {
    let item = this._data.splice(index, 1)[0];
    return clearCache(item, this._indexedCache);
  }

  delById(id) {
    let index = this.indexOf(this.findById(id));
    return this.delByIndex(index);
  }

  update(item) {
    let id = item[this._idKey];
    if (!id) {
      throw new TypeError('LightDB.update need specify unique id');
    }
    let oldItem = this.findById(id);
    return this.put(Object.assign({}, oldItem, item));
  }

  put(item) {
    let id = item[this._idKey];
    if (!id) {
      throw new TypeError('LightDB.put need specify unique id');
    }
    let oldItem = this.findById(id);
    let index = this.indexOf(oldItem);
    clearCache(oldItem, this._indexedCache);
    return this._data.splice(index, 1, item)[0];
  }
}
