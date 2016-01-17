import pipelineWrap from './pipelineWrap';
/**
 * Middleware 设计为可拦截
 *
 * function(value, pipeObj) {
 *   // pipe 设置为 undefined Pipeline 将终止，而且只能在 PipeMiddleware.
 *   pipeObj.pipe = undefined;
 * }
 *
 * @Pipeline 概念介绍
 * (1): PipelineMiddleware1.pre
 * (2): PipeMiddleware1.pre
 * (3): PipeMiddleware1.post
 * (4): PipeMiddleware2.pre
 * (5): PipeMiddleware2.post
 * (6): PipelineMiddleware1.post
 * - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
 * | (1) | (2) (3) | pipe | (4) (5) | (2) (3) | pipe | (4) (5) | (6) |
 * - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
 *
 * @Usage:
 *   ```
 *   let pipeline = new Pipeline('myPipeline', [
 *     {name: 'pipe1', handle: v => v, type: 'flowAsync', middlewares=[]},
 *     {name: 'pipe2', handle: () => {}, middlewares=[]}
 *   ]);
 *   ```
 */
export default class Pipeline {
  static inheritProps = [
    'push', 'pop', 'shift', 'unshift', 'concat',
    'slice', 'splice', 'filter', 'map', 'reduce'
  ];

  // Pipeline 层的中间件
  static pipelineMiddlewares = [];

  // Pipe 层通用中间件，pre 优先执行，post 倒序执行
  static commonPipeMiddlewares = [];

  /**
   * 追加 Pipeline 层次的中间件。
   *
   * @param  {Array PipelineMiddleware|PipelineMiddleware}  middlewares
   *     PipelineMiddleware 对象，Pipeline 层次的中间件
   *     ```
   *     {
   *       name: 'FooPipelinePlugin',
   *       type: 'pipeline',
   *       pre: Function(PipeState state),
   *       post: Function(PipeState state)
   *       pipeMiddleware: PipeMiddleware
   *     }
   *     ```
   *     函数也必须返回一个和参数同样结构的数组
   *     PipeState。中间件处理函数，接受一个 PipeState 对象作为参数
   *     ```
   *     {
   *       name: '', // Pipe 的名称
   *       value: '', // 当前值
   *       pipe: Function(value),
   *       skip: false
   *     }
   *     ```
   * @return {undefined}
   */
  static applyPipelineMiddlewares(middlewares=[]) {
    Pipeline.pipelineMiddlewares = Pipeline.pipelineMiddlewares.concat(middlewares);
  }

  /**
   * 追加 Pipe 层次的中间件。
   *
   * @param  {Array PipeMiddleware|PipeMiddleware}  middlewares
   *     PipeMiddleware 对象，Pipeline 层次的中间件
   *     ```
   *     {
   *       name: 'FooPipePlugin',
   *       type: 'pipe',
   *       pre: Function(PipeState state),
   *       post: Function(PipeState state)
   *     }
   *     ```
   *     函数也必须返回一个和参数同样结构的数组
   *
   * @return {undefined}
   */
  static applyCommonPipeMiddlewares(middlewares=[]) {
    Pipeline.commonPipeMiddlewares = Pipeline.commonPipeMiddlewares.concat(middlewares);
  }

  constructor(name='pipeline', pipes=[]) {
    this._name = name;
    this._pipes = pipes;
    let delegate = prop => Array.prototype[prop].bind(this._pipes);
    for (let prop of Pipeline.inheritProps) {
      this[prop] = delegate(prop);
    }
  }

  flow(data) {
    let pipelined = pipelineWrap(data, {
      name: this._name,
      middlewares: Pipeline.pipelineMiddlewares
    });
    pipelined = this.reduce(
      (_pipelined, pipe) => {
        let {type='flow', middlewares=[]} = pipe;
        return _pipelined[type]({
          ...pipe,
          middlewares: middlewares.concat(Pipeline.commonPipeMiddlewares)
        });
      }, pipelined);
    return pipelined.finish();
  }
}
