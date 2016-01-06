export function makeRoundNumberMiddleware(digit=2) {
  return function roundNumberMiddleware(middlewareArg) {
    middlewareArg = toNumberMiddleware(middlewareArg);
    return {...middlewareArg, value: Number(middlewareArg.value.toPrecision(digit))};
  };
}

export function toNumberMiddleware(middlewareArg) {
  let value = Number(middlewareArg.value);
  if (!Number.isNaN(value)) {
    return {...middlewareArg, value};
  } else {
    throw new TypeError('[toNumberMiddleware] can not change value to Nubmer');
  }
}
