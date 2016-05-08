import {EventEmitter} from 'events';

import FlatMap from './utils/flatmap';
import customizeClone from './utils/clone';
import {StoreParamNeedError} from './error';

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
    this._loadingQuerySet = new Set();
    // ['[query]', 'a.b.c']
    this._shallowClonePropSet = new Set(shallowCloneProps || []);
    this._errorsByQuery = {};
    this._querySetByItomQuery = {
      // 'a.b.c': {
      //    'storeChange': new Set(['storeChange?a.b.c&b.c.d']),
      //    'storeLoading': new Set(['storeLoading?a.b.c&b.c.d'])
      // }
    };
    // 监听的事件都会被内部包装一下来获得数据，该 Map 用于原始 Callback 和包装后的 Callback 的关系
    // key 为原始 Callback，value 为包装后的 Callback 即 EventEmitter 注册的 Callback
    this._eventEmitterMap = new Map();
    this._waitTriggerEventSet = new Set();
    this._timer = null;

    this.ALL = Store.ALL;
  }

  /**
   * 替换数据 query 路径指定的数据
   * @param  {String} query  'a.b'格式属性路径。如果是 Store.ALL = '' 则替换所有数据
   * @param  {[All]}  value  任何值
   * @return {undefined}
   */
  put(query, value) {
    this.needQuery(query);
    this.resetStatus(query);
    // value 为 promise 对象
    if (value && value.then && value.catch) {
      let promise = value;
      this.startLoading(query);
      promise
        .then(data => {
          this._data.put(query, data, q => this.trigger(CHANGE_EVENT, q));
        })
        .catch(error => {
          this.setErrors(query, error);
        })
        .then(() => {
          this.stopLoading(query);
        });
    } else {
      this._data.put(query, value, q => this.trigger(CHANGE_EVENT, q));
    }
  }

  /**
   * 递归新增或更新数据
   * @param  {Object} value  Plain Object 格式的更新数据，如：{a: {b: c}}。
   * @return {undefined}
   */
  patch(value) {
    this._data.patch(value, query => {
      this.resetStatus(query);
      this.trigger(CHANGE_EVENT, query);
    });
  }

  setErrors(query, errors) {
    this.needQuery(query);
    this.stopLoading(query);

    this._errorsByQuery[query] = [].concat(errors);
    this.trigger(CHANGE_EVENT, query);
    this.trigger(ERROR_EVENT, query);
  }

  removeErrors(query) {
    this.needQuery(query);
    delete this._errorsByQuery[query];
    this.trigger(CHANGE_EVENT, query);
    this.trigger(ERROR_EVENT, query);
  }

  startLoading(query) {
    this.needQuery(query);
    if (this._loadingQuerySet.has(query)) return;
    this._loadingQuerySet.add(query);
    this.trigger(CHANGE_EVENT, query);
    this.trigger(LOADING_EVENT, query);
  }

  stopLoading(query) {
    this.needQuery(query);
    if (!this._loadingQuerySet.has(query)) return;
    this._loadingQuerySet.delete(query);
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
      loading: this._loadingQuerySet.has(query),
      errors: this._errorsByQuery[query] || []
    };
  }

  getDefault() {
    return customizeClone(this._default, true);
  }

  needQuery(query) {
    if (!query && query !== Store.ALL) throw new StoreParamNeedError('[query]参数是必须的');
  }

  resetStatus(query) {
    this.stopLoading(query);
    this.removeErrors(query);
  }

  getSnapshot() {
    return this._data.get(Store.ALL, false);
  }

  restore(snapshot) {
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
    let eventName = this.fmtEventName(type, queriesStr);
    let wrapperCb = () => handle.apply(this, this._get(queries));

    // 如果是监听所有数据事件，则不需要映射原子事件与实际监听事件的对应关系
    if (queriesStr !== Store.ALL) {
      this.addQueryEventMapping(type, eventName, queries);
    }
    // register EventEmitter
    this.on(eventName, wrapperCb);
    // 保存原始时间和 EventEmitter 注册事件的对应关系
    this._eventEmitterMap.set(handle, wrapperCb);
    // trigger event immediately after bind event
    handle.apply(this, this._get(queries));
  }

  _off(type, queryArg, callback) {
    let {queriesStr, queries, handle} = parseQueryArg(queryArg, callback);
    let eventName = this.fmtEventName(type, queriesStr);
    let wrapperCb = this._eventEmitterMap.get(handle);
    if (wrapperCb) {
      // off event of EventEmitter
      this.removeListener(eventName, wrapperCb);
      // 清楚保存的对应关系
      this._eventEmitterMap.delete(callback);
      queriesStr && this.removeQueryFromEventMapping(type, eventName, queries);
    }
  }

  addQueryEventMapping(type, eventName, queries) {
    for (let query of queries) {
      let eventSetByType = this._querySetByItomQuery[query] || {};
      let eventSet = eventSetByType[type] || new Set();
      eventSet.add(eventName);
      eventSetByType[type] = eventSet;
      this._querySetByItomQuery[query] = eventSetByType;
    }
  }

  removeQueryFromEventMapping(type, eventName, queries) {
    for (let query of queries) {
      let eventSetByType = this._querySetByItomQuery[query];
      if (!eventSetByType) continue;

      let eventSet = eventSetByType[type];
      if (eventSet && eventSet.size) {
        eventSet.delete(eventName);
        if (!eventSet.size) delete eventSetByType[type];
        if (!Object.keys(eventSetByType).length) delete this._querySetByItomQuery[query];
      }
    }
  }

  trigger(type, query) {
    let querySetByItomQuery = this._querySetByItomQuery;
    let eventSetByType = querySetByItomQuery[query] || {};
    let eventSet = eventSetByType[type];
    if (eventSet && eventSet.size) {
      for (let event of eventSet) {
        this._waitTriggerEventSet.add(event);
      }
    }
    // 添加最顶层事件到等待触发事件池中
    this._waitTriggerEventSet.add(type);

    if (this._timer) return;
    this._timer = setTimeout(() => {
      for (let event of this._waitTriggerEventSet) {
        this.emit(event);
      }
      this._timer = null;
      this._waitTriggerEventSet.clear();
    }, 0);
  }

  /**
   * 定义额外的属性，这些属性是由已有的属性计算获得
   * @param  {Object} config
   *     ```
   *     {
   *       [prop]: {
   *         queries: ['query1', 'query2'],
   *         get: () => {}
   *       }
   *     }
   *     ```
   * @return {[type]}        [description]
   */
  combine(config) {
    let getHandleChange = (prop, get) => (...args) => {
      let combineValues = [];
      let combineLoading = false;
      let combineErrors = [];

      args.map(v => {
        combineValues.push(v.value);
        combineErrors = combineErrors.concat(v.errors);
        combineLoading = combineLoading || v.loading;
      });

      this.put(prop, get.apply(null, combineValues));

      combineLoading
        ? this.startLoading(prop)
        : this.stopLoading(prop);

      combineErrors.length
        ? this.setErrors(prop, combineErrors)
        : this.removeErrors(prop);
    };

    for (let prop of Object.keys(config)) {
      let propConfig = config[prop];
      let get = propConfig.get;
      if (this._data.isIn(prop)) throw new Error(`Query "${prop}" existed`);
      if (!(get && get instanceof Function)) throw new Error(`Config "get" should be a function`);
      this.onChange(array2QueriesStr(propConfig.queries), getHandleChange(prop, get));
    }
  }

  /**
   * TODO 不够完善
   * 联合其他 store 的 loading 事件为一个 loading 事件
   * @param  {String} prop     保存 loading 状态的属性名
   * @param  {Array}  configs  [['query1', store1], ['query2', store2]]
   * @return {undefined}
   */
  combineLoadings(prop, configs) {
    this.combineStores(prop, configs, storeMap => {
      let loading = false;
      // 如果组合的 store 有一个是在 loading 状态，则为 loading 状态。
      // 如果组合的 store 都不是 loading 状态，则为非 loading 状态。
      storeMap.forEach(value => loading = value.loading || loading );
      if (loading && !this._loadingQuerySet.has(prop)) this.startLoading(prop);
      if (!loading && this._loadingQuerySet.has(prop)) this.stopLoading(prop);
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
