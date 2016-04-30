export default class LightDB {
  constructor(data, idKey='id') {
    this._data = data || [];
    this._idKey = idKey;
    this._indexedCache = {[idKey]: {}};

    let inheritProps = [
      Symbol.iterator,
      'sort', 'map', 'forEach', 'reduce', 'find', 'filter',
      'slice', 'concat', 'shift', 'unshift', 'push', 'pop'
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
    this.clearCache(item);
  }

  unshift() {
    let item = this._data.unshift();
    this.clearCache(item);
  }

  clearCache(data) {
    for (let key of Object.keys(this._indexedCache)) {
      let cached = this._indexedCache[key] || {};
      delete cached[data[key]];
    }
  }

  findById(id) {
    return this.findByFieldName(id, this._idKey);
  }

  findByFieldName(value, fieldName) {
    let cached = this._indexedCache[fieldName] || {};
    let data;
    if ( !(value in cached) ) {
      data = this.find(item => item[fieldName] === value);
      if (data) {
        cached[value] = data;
        this._indexedCache[fieldName] = cached;
      }
    }
    return data;
  }
}
