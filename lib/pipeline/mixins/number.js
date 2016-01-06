export function makeRoundNumberMixin(digit=2) {
  return (mixinArg) => {
    if (typeof mixinArg.value === 'number') {
      return {...mixinArg, value: Number(mixinArg.value.toPrecision(digit))};
    } else {
      return mixinArg;
    }
  };
}
