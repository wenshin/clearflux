function clearCache(data, cacheSpace) {
  for (let key of Object.keys(cacheSpace)) {
    let cached = cacheSpace[key] || {};
    delete cached[data[key]];
  }
  return data;
}

export default class LightDB {
  constructor(data, idKey='id') {
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
      item = this.find(_item => _item[field] === value);
      if (item) {
        cached[cacheKey] = item;
        this._indexedCache[field] = cached;
      }
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
