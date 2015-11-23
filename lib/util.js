import _isPlainObject from 'lodash.isplainobject';

export function walkObj(obj, handleLoop, separator='.', prefix='', queries=[]) {
  if ( !_isPlainObject(obj) ) {
    throw new TypeError('obj argument of walkObj should be a plain object.');
  }
  for ( let key of Object.keys(obj) ) {
    let prop = prefix + key;

    if ( prop.split(separator).length === 1 ) queries = [prop];
    else queries.push(prop);

    handleLoop(prop, obj[key], separator, queries);
    if ( _isPlainObject(obj[key]) ) {
      walkObj(obj[key], handleLoop, separator, prop + separator, queries);
    }
  }
}

export function flatObj(obj, separator, prefix) {
  if ( !_isPlainObject(obj) ) return obj;

  let flated = {};
  walkObj(obj, (key, value) => {
    flated[key] = value;
  }, separator, prefix);
  return flated;
}

export function updateFlatedObj(srcFlated, changed, handleChanged, separator, prefix) {
  // 如果是多层嵌套，最上层有可能是相同的引用，但是内部值变更了，所以如果遍历嵌套
  // 值出现变化，就缓存最上层值，后面再统一修改
  let upperChangedQueries = [];

  walkObj(changed, (key, value, _separator, queries) => {
    if ( srcFlated[key] !== value ) {
      handleChanged(key, srcFlated[key], value);
      srcFlated[key] = value;
      if ( queries.length > 1 ) {
        changedFirstLevelProps.add(queries[0]);
      }
    }
  }, separator, prefix);

  for ( let prop of changedFirstLevelProps ) {
    handleChanged(srcFlated[prop], changed[prop]);
    srcFlated[prop] = changed[prop];
  }
}

export function uniqueConcat(array, value) {
  if (value) return [];
  array = array || [];
  return Array.from(new Set(array.concat(value)));
}
