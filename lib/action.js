/**
 *
 * @query 是查询对象的属性链。如：{a: {b: {c: 2}}, 用'a.b.c'查找 c 的值。如果为 '' 则代表整个对象。
 * @Usage:
 *   ```
 *   let actoins = new Actions({
 *     initStore() {
 *       this.startLoading('a');
 *       setTimeout(() => {
 *         this.putStore('a', 'result');
 *         this.stopLoading('a');
 *       }, 1000);
 *     }
 *   });
 *   ```
 */
export default class Actions {
  constructor(store, actions) {
    store.registerWriter(this);
    this.store = store;
    for (let action of Object.keys(actions)) {
      this[action] = actions[action].bind(this);
    }
    this.initStore && this.initStore();
  }

  /**
   * 替换数据
   * @Usage:
   *   如果替换{a: b: {c: 1}} c 的值
   *   ```
   *   let store = new Store({a: {b: {c: 1}}});
   *   action.putStore('a.b.c', 2);
   *   ```
   *
   * @param  {String} query  替换指定数据的内容
   * @param  {AnyType} value 替换的值
   * @return {undefined}
   */
  putStore(query, value) {
    this.store.put(query, value, this);
  }

  /**
   * 更新数据
   *
   * * @Usage:
   *   {a: b: {c: 1}}， 如果在 b 下面插入{d: 2} 新字段
   *   ```
   *   let store = new Store({a: {b: {c: 1}}});
   *   action.patchStore({a: {b: {d: 2}}});
   *   ```
   * @param  {Object} value 从 Store 根节点开始的更新对象。{a: 1, b: {c: 1}}
   * @return {undefined}
   */
  patchStore(value) {
    this.store.patch(value, this);
  }

  setErrors(query, errors) {
    this.store.setErrors(query, errors, this);
  }

  removeErrors(query) {
    this.store.removeErrors(query, this);
  }

  startLoading(query) {
    this.store.startLoading(query, this);
  }

  stopLoading(query) {
    this.store.stopLoading(query, this);
  }
}
