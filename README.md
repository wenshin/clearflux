# clearflux [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> 


## Install

```sh
$ npm install --save clearflux
```


## Usage

### 初始化 Store 和 Action
```js
var Store = require('clearflux/dist/store');
var Action = require('clearflux/dist/action');

var myStore = new Store({
  foo: 1, 
  foo1: {a: 1}
});

var myAction = new Actions(myStore, {
  // myAction 初始化时会马上执行
  initStore() {
    // putStore 替换整个指定的属性，第一个参数，称作 Query。
    this.putStore('foo', 2);
    this.putStore('foo1.a', 2);
    // patchStore 不会删除数据，只会补充或者修改
    this.patchStore({foo1: {c: 1}});

    // putStore 和 patchStore 会触发 myStore.onChange() 监听的事件

    // 设置 'foo1.a' 为 loading 状态
    this.startLoading('foo1.a');
    // 设置 'foo1.a' 为非 loading 状态
    this.stopLoading('foo1.a');
    // startLoading 和 stopLoading 会触发
    // 使用 myStore.onChange(), myStore.onLoading() 监听的事件

    // 追加 'foo1.a' 的 errors 信息
    this.setErrors('foo1.a', 'Error Message');
    this.setErrors('foo1.a', ['Error Message']);
    // 移除'foo1.a' 所有的错误信息
    this.removeErrors('foo1.a');
    // setErrors 和 removeErrors 会触发
    // 使用 myStore.onChange(), myStore.onError() 监听的事件
  },
  updateSomeThing() {
    // some actions
  }
});

```

### Query
query 是一种查询对象属性的字符串。允许使用 'a.b.c' 表示 {a: {b: {c: 1}}} 中的 c 属性。
query 也可以是使用`&`拼接的多个属性。

### 使用 Action

Action 即正常的函数，可以直接调用，不需要额外的设置。

### 使用 Store

Store 可以使用 onChange、onLoading、onError 监听特定的事件。

  * Store.onChange(Query query, callback)  监听`query`的值、loading 状态、错误信息改变。
    `callback` 接受一个包含 value, loading, errors 属性的对象。
  
      ```
      // 监听 myStore foo 属性的值、loading 状态、错误信息改变。loading 为 布尔值，errors 为数组
      myStore.onChange('foo', ({value: foo, loading, errors}) => {})
      
      // 监听 myStore foo 和 foo.a 属性的值、loading 状态、错误信息改变
      myStore.onChange('foo&foo.a', ({value: foo, loading, errors}) => {})
      ```
  
  * Store.onLoading(Query query, callback) 只监听`query`的 loading 状态改变。`callback`接受和 onChange 一样的参数
  * Store.onError(Query query, callback) 只监听`query`的 errors 值改变。`callback`接受和 onChange 一样的参数

## License

MIT © [yuanwen]()


[npm-image]: https://badge.fury.io/js/clearflux.svg
[npm-url]: https://npmjs.org/package/clearflux
[travis-image]: https://travis-ci.org/wenshin/clearflux.svg?branch=master
[travis-url]: https://travis-ci.org/wenshin/clearflux
[daviddm-image]: https://david-dm.org/wenshin/clearflux.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/wenshin/clearflux
[coveralls-image]: https://coveralls.io/repos/wenshin/clearflux/badge.svg
[coveralls-url]: https://coveralls.io/r/wenshin/clearflux
