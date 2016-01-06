export function makeRoundNumberMixin(digit=2) {
  return ({value}) => {
    if (typeof value === 'number') {
      return Number(value.toPrecision(digit));
    } else {
      return value;
    }
  };
}
