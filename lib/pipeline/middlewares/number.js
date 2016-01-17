export function makeRoundNumberHandler(digit=2) {
  return function roundNumberHandler(pipeState) {
    pipeState = toNumberHandler(pipeState);
    return {...pipeState, value: Number(pipeState.value.toPrecision(digit))};
  };
}

export function toNumberHandler(pipeState) {
  let value = Number(pipeState.value);
  if (!Number.isNaN(value)) {
    return {...pipeState, value};
  } else {
    throw new TypeError('[toNumberHandler] can not change value to Nubmer');
  }
}
