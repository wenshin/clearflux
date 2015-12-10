import _isPlainObject from 'lodash.isplainobject';
import _clone from 'lodash._baseclone';

let DEFAULT_SEPARATOR = '.';

export class FlatMap {
  constructor(obj, separator=DEFAULT_SEPARATOR, prefix='') {
    this._flated = flatObj(obj, separator, prefix);
    this.separator = separator;
    this.prefix = prefix;
  }

  get(query, isDeepClone=true) {
    return _clone(this._flated[query], isDeepClone);
  }

  put(query, value, handleChanged) {
    putFlatedObj(this._flated, query, value, handleChanged, this.separator, this.prefix);
  }

  patch(changed, handleChanged) {
    patchFlatedObj(this._flated, changed, handleChanged, this.separator, this.prefix);
  }
}

export function iterateObj(obj, src, compare, separator=DEFAULT_SEPARATOR, prefix='', queries=[]) {
  if ( !_isPlainObject(src) || !_isPlainObject(obj) ) {
    throw new TypeError('[obj, src] arguments of iterateObj should be a plain object.');
  }
  for ( let key of Object.keys(src) ) {
    let prop = prefix + (prefix ? separator : '') + key;

    if ( prop.split(separator).length === 1 ) queries = [prop];
    else queries.push(prop);

    if ( compare(key, obj, src, queries, separator) ) {
      if ( _isPlainObject(src[key]) ) {
        iterateObj(obj[key], src[key], compare, separator, prop, queries);
      }
    }
  }
}

export function flatObj(obj, prefix, separator) {
  let flated = {};
  if ( !_isPlainObject(obj) ) return flated;

  iterateObj({}, obj, (key, _obj, _src, queries) => {
    let prop = queries.slice(-1);
    flated[prop] = _src[key];
    _obj[key] = _obj[key] || {};
    return true;
  }, separator, prefix);
  return flated;
}

export function patchFlatedObj(srcFlated, changed, handleChanged, separator, prefix) {
  if ( !_isPlainObject(changed) ) return srcFlated;

  iterateObj(srcFlated, changed, (key, _obj, _src, queries) => {
    let obj = _obj[key];
    let src = _src[key];
    let prop = queries.slice(-1);
    let next = true;
    if (obj !== src) {
      if ( _isPlainObject(obj) && _isPlainObject(src) ) {
        next = true;
      } else {
        _obj[key] = src;
        srcFlated[prop] = _obj[key];
        triggerChangeEvents(srcFlated, queries, handleChanged);
        next = false;
      }
    } else {
      next = false;
    }
    return next;
  }, separator, prefix);
}

function triggerChangeEvents(flated, queries, handleChanged) {
  for ( let query of queries ) {
    handleChanged(query, flated[query]);
  }
}

export function putFlatedObj(srcFlated, query, value, handleChanged, separator=DEFAULT_SEPARATOR) {
  if ( typeof query !== 'string' ) return srcFlated;
  for (let key of Object.keys(srcFlated)) {
    if (query.indexOf(key) !== -1) {}
  }
  let old = srcFlated[query];
  bubbleQuery(null, query, (key, q) => {
    if (!key) {
      if (srcFlated[query] !== value) {
        srcFlated[query] = value;
        handleChanged(query, value);
        return true;
      }
    } else {
      let prop = q + separator + key;
      srcFlated[q][key] = srcFlated[prop];
      handleChanged(q, srcFlated[prop]);
      return true;
    }
  }, separator);
}

function bubbleQuery(key, query, next, separator) {
  key = key || '';
  if (!next(key, query)) return;
  let re = new RegExp(`^(.+)[${separator}]([^${separator}]+)$`, 'i');
  let matched = query.match(re);
  if (matched) bubbleQuery(matched[2], matched[1], next, separator);
}
