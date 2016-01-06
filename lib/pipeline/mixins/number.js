export function makeRoundNumberMixin(digit=2) {
  return function roundNumberMixin(mixinArg) {
    mixinArg = toNumberMixin(mixinArg);
    return {...mixinArg, value: Number(mixinArg.value.toPrecision(digit))};
  };
}

export function toNumberMixin(mixinArg) {
  let value = Number(mixinArg.value);
  if (!Number.isNaN(value)) {
    return {...mixinArg, value};
  } else {
    throw new TypeError('[toNumberMixin] can not change value to Nubmer');
  }
}
