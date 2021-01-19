'use strict'

var slice = [].slice

module.exports = wrap

// Wrap `fn`.
// Can be sync or async; return a promise, receive a completion handler, return
// new values and errors.
function wrap(fn, callback) {
  var called

  return wrapped

  function wrapped() {
    var parameters = slice.call(arguments, 0)
    var callback = fn.length > parameters.length
    var result

    if (callback) {
      parameters.push(done)
    }

    try {
      result = fn.apply(null, parameters)
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
      callback.apply(null, arguments)
    }
  }

  // Call `done` with one value.
  // Tracks if an error is passed, too.
  function then(value) {
    done(null, value)
  }
}
