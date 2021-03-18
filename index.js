// Create new middleware.
export function trough() {
  var fns = []
  var middleware = {run, use}

  return middleware

  // Run `fns`.
  // Last argument must be a completion handler.
  function run(...input) {
    var index = -1
    var done = input.pop()

    if (typeof done !== 'function') {
      throw new TypeError('Expected function as last argument, not ' + done)
    }

    next(null, ...input)

    // Run the next `fn`, if any.
    function next(...values) {
      var fn = fns[++index]
      var error = values.shift()
      var pos = -1

      if (error) {
        done(error)
        return
      }

      // Copy non-nullish input into values.
      while (++pos < input.length) {
        if (values[pos] === null || values[pos] === undefined) {
          values[pos] = input[pos]
        }
      }

      // Next or done.
      if (fn) {
        wrap(fn, next)(...values)
      } else {
        done(null, ...values)
      }
    }
  }

  // Add `fn` to the list.
  function use(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Expected `fn` to be a function, not ' + fn)
    }

    fns.push(fn)
    return middleware
  }
}

// Wrap `fn`.
// Can be sync or async; return a promise, receive a completion handler, return
// new values and errors.
export function wrap(fn, callback) {
  var called

  return wrapped

  function wrapped(...parameters) {
    var callback = fn.length > parameters.length
    var result

    if (callback) {
      parameters.push(done)
    }

    try {
      result = fn(...parameters)
    } catch (error) {
      // Well, this is quite the pickle.
      // `fn` received a callback and called it (thus continuing the pipeline),
      // but later also threw an error.
      // We’re not about to restart the pipeline again, so the only thing left
      // to do is to throw the thing instead.
      if (callback && called) {
        throw error
      }

      return done(error)
    }

    if (!callback) {
      if (result && typeof result.then === 'function') {
        result.then(then, done)
      } else if (result instanceof Error) {
        done(result)
      } else {
        then(result)
      }
    }
  }

  // Call `next`, only once.
  function done() {
    if (!called) {
      called = true
      callback(...arguments)
    }
  }

  // Call `done` with one value.
  // Tracks if an error is passed, too.
  function then(value) {
    done(null, value)
  }
}
