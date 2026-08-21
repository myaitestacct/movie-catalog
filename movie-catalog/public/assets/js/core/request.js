export function isAbortError(error) {
  return error?.name === 'AbortError';
}

export function createLatestRequest() {
  let activeController = null;
  let generation = 0;

  return Object.freeze({
    start() {
      activeController?.abort();

      const controller = new AbortController();
      const requestGeneration = ++generation;
      activeController = controller;

      return Object.freeze({
        signal: controller.signal,
        isCurrent() {
          return generation === requestGeneration &&
            !controller.signal.aborted;
        },
        finish() {
          if (
            generation === requestGeneration &&
            activeController === controller
          ) {
            activeController = null;
          }
        }
      });
    },

    cancel() {
      generation += 1;
      activeController?.abort();
      activeController = null;
    }
  });
}
