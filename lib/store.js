import {EventEmitter} from 'events';

import {customizeClone, FlatMap} from './util';
import {StoreWritePermissionError, StoreParamNeedError} from './error';

let ERROR_EVENT = 'storeError';
let CHANGE_EVENT = 'storeChange';
let LOADING_EVENT = 'storeLoading';
let QUERY_SEPARATOR = '&';

/**
 * @Usage:
 *   ```
 *   // 'a.b.d' 不会进行深度 Clone。
 *   let store = new Store({a: 1, b: {c: 1, d: [1, 2, 3...]}}, ['a.b.d']);
 *
 *   class Comp extends Component {
 *     state = store.getDefault();
 *
 *     componentDidMount() {
 *       store.onChange('b.c', c => {
 *         if (c.loading) {
 *           // some loading code
 *         } else if (c.errors) {
 *           this.setState({errors: c.errors})
 *         } else {
 *           this.setState({value: c.value})
 *         }
 *       });
 *       // 监听整个 Store 的数据。注意这个要谨慎使用，当在更新事件中的操作修改了 store 的数据
 *       // 会再一次触发所有对象 change 事件，这样会形成死循环。
 *       store.onChange(({value, loading, errors}) => {
 *         // 这将引起死循环
 *         store.put('b.c', 1);
 *         // 使用绑定的 Actions 修改数据也会导致死循环
 *         storeActions.change('b.c', 1);
 *       })
 *     }
 *
 *     render() {}
 *   }
 *   ```
 */
export default class Store extends EventEmitter {
  static ALL = '';

  constructor(data, shallowCloneProps) {
    super();
    this._default = customizeClone(data, true);
    this._data = new FlatMap(data);
    // ['[query]', 'a.b.c']
    this._shallowClonePropSet = new Set(shallowCloneProps || []);
    this._writer = new Set();
    this._loadingQueries = new Set();
    this._queryErrors = {};
    this._queryEventMapping = {
      // 'change?a.b.c': new Set(['change?a.b.c&b.c.d']),
      // 'change?b.c.d': new Set(['change?a.b.c&b.c.d'])
    };
    // 监听的事件都会被内部包装一下来获得数据，该 Map 用于原始 Callback 和包装后的 Callback 的关系
    // key 为原始 Callback，value 为包装后的 Callback 即 EventEmitter 注册的 Callback
    this._eventMapping = new Map();
    this._waitTriggerEvents = new Set();
    this._timer = null;
  }

  /**
   * 替换数据 query 路径指定的数据
   * @param  {String} query  'a.b'格式属性路径。如果是 Store.ALL = '' 则替换所有数据
   * @param  {[All]}  value  任何值
   * @param  {Object} writer 写入者，可以是任何对象
   * @return {undefined}
   */
  put(query, value, writer) {
    this.needQuery(query);
    this.permit(writer);
    this._data.put(query, value, q => this.trigger(CHANGE_EVENT, q));
  }

  /**
   * 递归新增或更新数据
   * @param  {Object} value  Plain Object 格式的更新数据，如：{a: {b: c}}。
   * @param  {Object} writer [description]
   * @return {undefined}
   */
  patch(value, writer) {
    this.permit(writer);
    this._data.patch(value, q => this.trigger(CHANGE_EVENT, q));
  }

  setErrors(query, errors, writer) {
    this.needQuery(query);
    this.permit(writer);
    this._queryErrors[query] = [].concat(errors);
    this.trigger(CHANGE_EVENT, query);
    this.trigger(ERROR_EVENT, query);
  }

  removeErrors(query, writer) {
    this.needQuery(query);
    this.permit(writer);
    delete this._queryErrors[query];
    this.trigger(CHANGE_EVENT, query);
    this.trigger(ERROR_EVENT, query);
  }

  startLoading(query, writer) {
    this.needQuery(query);
    this.permit(writer);
    this._loadingQueries.add(query);
    this.trigger(CHANGE_EVENT, query);
    this.trigger(LOADING_EVENT, query);
  }

  stopLoading(query, writer) {
    this.needQuery(query);
    this.permit(writer);
    this._loadingQueries.delete(query);
    this.trigger(CHANGE_EVENT, query);
    this.trigger(LOADING_EVENT, query);
  }

  get(queries=[], isDeepClone=true) {
    let values = this._get(queries, isDeepClone);
    return values.length === 1 ? values[0] : values;
  }

  _get(queries=[], isDeepClone=true) {
    queries = typeof queries === 'string' ? [queries] : queries;
    if (!queries.length) queries = [Store.ALL];
    let values = [];
    for (let q of queries) {
      values.push(this.wrapData(q, isDeepClone));
    }
    return values;
  }

  wrapData(query, isDeepClone) {
    return {
      value: this._data.get(query, this._shallowClonePropSet, isDeepClone),
      loading: this._loadingQueries.has(query),
      errors: this._queryErrors[query] || []
    };
  }

  getDefault() {
    return customizeClone(this._default, true);
  }

  permit(writer) {
    if ( !this._writer.has(writer) ) throw new StoreWritePermissionError();
  }

  registerWriter(writer) {
    this._writer.add(writer);
  }

  needQuery(query) {
    if (!query && query !== Store.ALL) throw new StoreParamNeedError('[query]参数是必须的');
  }

  getSnapshot() {
    return this._data.get(Store.ALL, false);
  }

  restore(snapshot, writer) {
    this.permit(writer);
    this._data = new FlatMap(snapshot);
  }

  /**
   * 绑定 Store 的 change 事件
   * @param  {Array|String|Function}   queryArg 监视的参数
   * @param  {Function}       callback   回调函数
   * @return {undefined}
   */
  onChange(queryArg, callback) {
    this._on(CHANGE_EVENT, queryArg, callback);
  }

  offChange(queryArg, callback) {
    this._off(CHANGE_EVENT, queryArg, callback);
  }

  onLoading(queryArg, callback) {
    this._on(LOADING_EVENT, queryArg, callback);
  }

  offLoading(queryArg, callback) {
    this._off(LOADING_EVENT, queryArg, callback);
  }

  onError(queryArg, callback) {
    this._on(ERROR_EVENT, queryArg, callback);
  }

  offError(queryArg, callback) {
    this._off(ERROR_EVENT, queryArg, callback);
  }

  _on(type, queryArg, callback) {
    let {queries, queriesStr, handle} = parseQueryArg(queryArg, callback);
    this.bind(type, queriesStr, handle);
    handle.apply(this, this._get(queries));
  }

  _off(type, queryArg, callback) {
    let {queriesStr, handle} = parseQueryArg(queryArg, callback);
    this.off(type, queriesStr, handle);
  }

  bind(type, queriesStr, callback) {
    this.addQueryEventMapping(type, queriesStr);
    let queries = queriesStr2Array(queriesStr);
    let eventName = this.fmtEventName(type, queriesStr);
    let wrapperCb = () => callback.apply(this, this._get(queries));
    this._eventMapping.set(callback, wrapperCb);
    this.on(eventName, wrapperCb);
  }

  off(type, queriesStr, callback) {
    let wrapperCb = this._eventMapping.get(callback);
    if (wrapperCb) {
      this.removeListener(this.fmtEventName(type, queriesStr), wrapperCb);
      this.removeQueryFromEventMapping(type, queriesStr);
      this._eventMapping.delete(callback);
    }
  }

  addQueryEventMapping(type, queriesStr) {
    // 如果是监听所有数据事件，则不需要缓存 Mapping
    if (queriesStr === Store.ALL) return;
    let queries = queriesStr2Array(queriesStr);
    let eventName = this.fmtEventName(type, queriesStr);
    for (let query of queries) {
      let key = this.fmtEventName(type, query);
      let eventSet = this._queryEventMapping[key] || new Set();
      eventSet.add(eventName);
      this._queryEventMapping[key] = eventSet;
    }
  }

  removeQueryFromEventMapping(type, queriesStr) {
    if (!queriesStr) return;
    let queries = queriesStr2Array(queriesStr);
    let eventName = this.fmtEventName(type, queriesStr);
    for (let query of queries) {
      let key = this.fmtEventName(type, query);
      let eventSet = this._queryEventMapping[key];
      if (eventSet) eventSet.delete(eventName);
    }
  }

  trigger(type, query) {
    let queryEventMapping = this._queryEventMapping;
    let eventSet = queryEventMapping[this.fmtEventName(type, query)];
    if (eventSet) {
      for (let e of eventSet) {
        this._waitTriggerEvents.add(e);
      }
    }
    // 添加最顶层事件到等待触发事件池中
    this._waitTriggerEvents.add(type);

    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      for (let event of this._waitTriggerEvents) {
        this.emit(event);
      }
      this.timer = null;
      this._waitTriggerEvents.clear();
    }, 10);
  }

  /**
   * 联合其他 store 的 loading 事件为一个 loading 事件
   * @param  {String} prop     保存 loading 状态的属性名
   * @param  {Array}  configs  [['query1', store1], ['query2', store2]]
   * @return {undefined}
   */
  combineLoadings(prop, configs) {
    let writer = {name: 'combineLoadings'};
    this.registerWriter(writer);
    this.combineStores(prop, configs, storeMap => {
      let loading = false;
      // 如果组合的 store 有一个是在 loading 状态，则为 loading 状态。
      // 如果组合的 store 都不是 loading 状态，则为非 loading 状态。
      storeMap.forEach(value => loading = value.loading || loading );
      if (loading && !this._loadingQueries.has(prop)) this.startLoading(prop, writer);
      if (!loading && this._loadingQueries.has(prop)) this.stopLoading(prop, writer);
    });
  }

  combineStores(prop, configs, handle) {
    let storeMap = new Map();
    let getOnChange = store => value => {
      storeMap.set(store, value);
      handle.call(this, storeMap);
    };
    for (let config of configs) {
      let query = config[0];
      let store = config[1];
      storeMap.set(store, false);
      store.onChange(query, getOnChange(store));
    }
  }

  fmtEventName(type, query) {
    return query ? `${type}?${query}` : type;
  }
}

function parseQueryArg(queryArg, handle) {
  let queries = [];
  let queriesStr = Store.ALL;

  if ( queryArg instanceof Array ) {
    queries = queryArg;
    queriesStr = array2QueriesStr(queries);
  } else if ( typeof queryArg === 'function' ) {
    handle = queryArg;
  } else if (typeof queryArg === 'string') {
    queriesStr = queryArg;
    queries = queriesStr2Array(queriesStr);
  }
  return {queries, queriesStr, handle};
}

function queriesStr2Array(queriesStr) {
  return queriesStr.split(QUERY_SEPARATOR);
}

function array2QueriesStr(queries) {
  return queries.join(QUERY_SEPARATOR);
}
