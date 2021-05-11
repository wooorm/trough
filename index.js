/**
 * @typedef {(error?: Error|null|undefined, ...output: unknown[]) => void} Callback
 * @typedef {(...input: unknown[]) => unknown} Middleware
 *
 * @typedef {(...input: unknown[]) => void} Run Call all middleware.
 * @typedef {(fn: Middleware) => Pipeline} Use Add `fn` (middleware) to the list.
 * @typedef {{run: Run, use: Use}} Pipeline
 */

/**
 * Create new middleware.
 *
 * @returns {Pipeline}
 */
export function trough() {
  /** @type {Middleware[]} */
  var fns = []
  /** @type {Pipeline} */
  var pipeline = {run, use}

  return pipeline

  /** @type {Run} */
  function run(...values) {
    var middlewareIndex = -1
    /** @type {Callback} */
    // @ts-expect-error Assume it’s a callback.
    var callback = values.pop()

    if (typeof callback !== 'function') {
      throw new TypeError('Expected function as last argument, not ' + callback)
    }

    next(null, ...values)

    /**
     * Run the next `fn`, or we’re done.
     *
     * @param {Error|null|undefined} error
     * @param {unknown[]} output
     */
    function next(error, ...output) {
      var fn = fns[++middlewareIndex]
      var index = -1

      if (error) {
        callback(error)
        return
      }

      // Copy non-nullish input into values.
      while (++index < values.length) {
        if (output[index] === null || output[index] === undefined) {
          output[index] = values[index]
        }
      }

      // Next or done.
      if (fn) {
        wrap(fn, next)(...output)
      } else {
        callback(null, ...output)
      }
    }
  }

  /** @type {Use} */
  function use(middelware) {
    if (typeof middelware !== 'function') {
      throw new TypeError(
        'Expected `middelware` to be a function, not ' + middelware
      )
    }

    fns.push(middelware)
    return pipeline
  }
}

/**
 * Wrap `middleware`.
 * Can be sync or async; return a promise, receive a callback, or return new
 * values and errors.
 *
 * @param {Middleware} middleware
 * @param {Callback} callback
 */
export function wrap(middleware, callback) {
  /** @type {boolean} */
  var called

  return wrapped

  /**
   * Call `middleware`.
   * @param {unknown[]} parameters
   * @returns {void}
   */
  function wrapped(...parameters) {
    var fnExpectsCallback = middleware.length > parameters.length
    /** @type {unknown} */
    var result
    /** @type {Error} */
    var exception

    if (fnExpectsCallback) {
      parameters.push(done)
    }

    try {
      result = middleware(...parameters)
    } catch (error) {
      exception = error

      // Well, this is quite the pickle.
      // `middleware` received a callback and called it synchronously, but that
      // threw an error.
      // The only thing left to do is to throw the thing instead.
      if (fnExpectsCallback && called) {
        throw exception
      }

      return done(exception)
    }

    if (!fnExpectsCallback) {
      if (result instanceof Promise) {
        // type-coverage:ignore-next-line Assume it’s a `Promise<unknown>`
        result.then(then, done)
      } else if (result instanceof Error) {
        done(result)
      } else {
        then(result)
      }
    }
  }

  /**
   * Call `callback`, only once.
   * @type {Callback}
   */
  function done(error, ...output) {
    if (!called) {
      called = true
      callback(error, ...output)
    }
  }

  /**
   * Call `done` with one value.
   *
   * @param {unknown} [value]
   */
  function then(value) {
    done(null, value)
  }
}
