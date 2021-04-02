/**
 * @callback RejectingCallback
 * @param {Error} error
 * @returns {void}
 */

/**
 * @template MainOutputValue, RestOutputValue
 * @callback ResolvingCallbackVariadic
 * @param {null|undefined} error
 * @param {MainOutputValue} [mainOutput]
 * @param {RestOutputValue[]} [restOutput]
 * @returns {void}
 */

/**
 * @callback ResolvingCallbackVoid
 * @param {null|undefined} error
 * @returns {void}
 */

/**
 * @template MainOutputValue, RestOutputValue
 * @typedef {ResolvingCallbackVoid & ResolvingCallbackVariadic<MainOutputValue, RestOutputValue>} ResolvingCallback
 */

/**
 * @template MainOutputValue, RestOutputValue
 * @typedef {RejectingCallback & ResolvingCallback<MainOutputValue, RestOutputValue>} Callback
 */

/**
 * @template MainOutputValue
 * @callback ReturningMiddleware
 * @param {unknown} mainInput
 * @param {unknown[]} restInput
 * @returns {Error|MainOutputValue|Promise<MainOutputValue>}
 */

/**
 * @template MainOutputValue, RestOutputValue
 * @callback CallingMiddleware
 * @param {unknown} mainInput
 * @param {unknown[]} restInput
 * @param {Callback<MainOutputValue, RestOutputValue>} callback
 * @returns {void}
 */

/**
 * @template MainOutputValue, RestOutputValue
 * @typedef {ReturningMiddleware<MainOutputValue> | CallingMiddleware<MainOutputValue, RestOutputValue>} Middleware
 */

/**
 * Create new middleware.
 */
export function trough() {
  /**
   * @template MainOutputValue, RestOutputValue
   * @type {Middleware<MainOutputValue, RestOutputValue>[]}
   */
  var fns = []
  var pipeline = {run, use}

  return pipeline

  /**
   * Call all middleware.
   *
   * @template MainOutputValue, RestOutputValue
   * @param {[Callback<MainOutputValue, RestOutputValue>] | [...unknown[], Callback<MainOutputValue, RestOutputValue>]} values
   */
  function run(...values) {
    var middlewareIndex = -1
    // prettier-ignore
    /** @type {Callback<MainOutputValue, RestOutputValue>} */
    var callback = (values.pop())

    if (typeof callback !== 'function') {
      throw new TypeError('Expected function as last argument, not ' + callback)
    }

    next(null, ...values)

    /**
     * Run the next `fn`, or we’re done.
     *
     * @template MainOutputValue, RestOutputValue
     * @param {Error?} error
     * @param {[MainOutputValue] | [MainOutputValue, ...RestOutputValue[]]} [output]
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

  /**
   * Add `fn` to the list.
   * @template MainOutputValue, RestOutputValue
   * @param {Middleware<MainOutputValue, RestOutputValue>} middelware
   */
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
 * @template MainOutputValue, RestOutputValue
 * @param {ReturningMiddleware<MainOutputValue> | CallingMiddleware<MainOutputValue, RestOutputValue>} middleware
 * @param {Callback<MainOutputValue, RestOutputValue>} callback
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
    /** @type {Error | MainOutputValue | Promise<MainOutputValue> | void} */
    var result
    /** @type {Error} */
    var exception

    if (fnExpectsCallback) {
      // @ts-ignore this differentiated `middleware` from being
      // `ReturningMiddleware` or `CallingMiddleware`, and thus whether a callback
      // is given.
      parameters.push(done)
    }

    try {
      // @ts-ignore count is off when `done` is passed, but yes, it’s fine.
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
   *
   * @param {([] | [Error] | [null, MainOutputValue | void] | [null, MainOutputValue | void, ...RestOutputValue[]])} output
   */
  function done(...output) {
    if (!called) {
      called = true
      // @ts-ignore count is off.
      callback(...output)
    }
  }

  /**
   * Call `done` with one value.
   *
   * @param {MainOutputValue | void} [value]
   */
  function then(value) {
    done(null, value)
  }
}
