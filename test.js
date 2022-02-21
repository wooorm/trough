/**
 * @typedef {import('./index.js').Callback} Callback
 */

import process from 'node:process'
import test from 'tape'
import {trough} from './index.js'

test('trough()', (t) => {
  t.equal(typeof trough, 'function', 'should be a function')
  t.equal(typeof trough(), 'object', 'should return an object')

  t.end()
})

test('use()', (t) => {
  let p = trough()

  t.throws(
    () => {
      // @ts-ignore expected.
      p.use()
    },
    /Expected `middelware` to be a function, not undefined/,
    'should throw without `fn`'
  )

  p = trough()

  t.equal(
    p.use(() => {}),
    p,
    'should return self'
  )

  t.end()
})

test('synchronous middleware', (t) => {
  const value = new Error('Foo')

  t.plan(9)

  trough()
    .use(() => {
      return value
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should pass returned errors to `done`')
    })

  trough()
    .use(() => {
      throw value
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should pass thrown errors to `done`')
    })

  trough()
    .use((/** @type {string} */ value) => {
      t.equal(value, 'some', 'should pass values to `fn`s')
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'some', 'should pass values to `done`')
    })

  trough()
    .use((/** @type {string} */ value) => {
      t.equal(value, 'some', 'should pass values to `fn`s')
      return value + 'thing'
    })
    .use((/** @type {string} */ value) => {
      t.equal(value, 'something', 'should modify values')
      return value + ' more'
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'something more', 'should pass modified values to `done`')
    })
})

test('promise middleware', (t) => {
  const value = new Error('Foo')

  t.plan(8)

  trough()
    .use(() => {
      return new Promise((resolve, reject) => {
        reject(value)
      })
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should pass rejected errors to `done`')
    })

  trough()
    .use((/** @type {string} */ value) => {
      t.equal(value, 'some', 'should pass values to `fn`s')

      return new Promise((resolve) => {
        resolve()
      })
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'some', 'should pass values to `done`')
    })

  trough()
    .use((/** @type {string} */ value) => {
      t.equal(value, 'some', 'should pass values to `fn`s')

      return new Promise((resolve) => {
        resolve(value + 'thing')
      })
    })
    .use((/** @type {string} */ value) => {
      t.equal(value, 'something', 'should modify values')

      return new Promise((resolve) => {
        resolve(value + ' more')
      })
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'something more', 'should pass modified values to `done`')
    })
})

test('asynchronous middleware', (t) => {
  const value = new Error('Foo')

  t.plan(11)

  trough()
    .use((/** @type {Callback} */ next) => {
      next(value)
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should pass given errors to `done`')
    })

  trough()
    .use((/** @type {Callback} */ next) => {
      setImmediate(() => {
        next(value)
      })
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should pass async given errors to `done`')
    })

  trough()
    .use((/** @type {Callback} */ next) => {
      next(value)
      next(new Error('Other'))
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should ignore multiple sync `next` calls')
    })

  trough()
    .use((/** @type {Callback} */ next) => {
      setImmediate(() => {
        next(value)
        setImmediate(() => {
          next(new Error('Other'))
        })
      })
    })
    .run((/** @type {Error} */ error) => {
      t.equal(error, value, 'should ignore multiple async `next` calls')
    })

  trough()
    .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
      t.equal(value, 'some', 'should pass values to `fn`s')
      setImmediate(next)
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'some', 'should pass values to `done`')
    })

  trough()
    .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
      t.equal(value, 'some', 'should pass values to `fn`s')

      setImmediate(() => {
        next(null, value + 'thing')
      })
    })
    .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
      t.equal(value, 'something', 'should modify values')

      setImmediate(() => {
        next(null, value + ' more')
      })
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'something more', 'should pass modified values to `done`')
    })
})

test('run()', (t) => {
  t.plan(13)

  t.throws(
    () => {
      // @ts-ignore expected.
      trough().run()
    },
    /^TypeError: Expected function as last argument, not undefined$/,
    'should throw if `done` is not a function'
  )

  trough()
    .use((/** @type {string} */ value) => {
      t.equal(value, 'some', 'input')

      return value + 'thing'
    })
    .use((/** @type {string} */ value) => {
      t.equal(value, 'something', 'sync')

      return new Promise((resolve) => {
        resolve(value + ' more')
      })
    })
    .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
      t.equal(value, 'something more', 'promise')

      setImmediate(() => {
        next(null, value + '.')
      })
    })
    .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
      t.ifErr(error)
      t.equal(value, 'something more.', 'async')
    })

  t.test('should throw errors thrown from `done` (#1)', (st) => {
    st.plan(1)

    st.throws(() => {
      trough().run(() => {
        throw new Error('alpha')
      })
    }, /^Error: alpha$/)
  })

  t.test('should throw errors thrown from `done` (#2)', (st) => {
    st.plan(1)

    process.once('uncaughtException', (error) => {
      st.equal(String(error), 'Error: bravo')
    })

    trough()
      .use((/** @type {Callback} */ next) => {
        setImmediate(next)
      })
      .run(() => {
        throw new Error('bravo')
      })
  })

  t.test('should rethrow errors thrown from `done` (#1)', (st) => {
    st.plan(1)

    process.once('uncaughtException', (error) => {
      st.equal(String(error), 'Error: bravo')
    })

    trough()
      .use((/** @type {Callback} */ next) => {
        setImmediate(() => {
          next(new Error('bravo'))
        })
      })
      .run((/** @type {Error} */ error) => {
        throw error
      })
  })

  t.test('should rethrow errors thrown from `done` (#2)', (st) => {
    st.plan(1)

    process.once('uncaughtException', (error) => {
      st.equal(String(error), 'Error: bravo')
    })

    trough()
      .use(() => {
        throw new Error('bravo')
      })
      .run((/** @type {Error} */ error) => {
        throw error
      })
  })

  t.test('should not swallow uncaught exceptions (#1)', (st) => {
    st.plan(1)

    process.once('uncaughtException', (error) => {
      st.equal(String(error), 'Error: charlie')
    })

    trough()
      .use((/** @type {Callback} */ next) => {
        setImmediate(next)
      })
      .run(() => {
        setImmediate(() => {
          throw new Error('charlie')
        })
      })
  })

  t.test('should not swallow uncaught exceptions (#2)', (st) => {
    st.plan(1)

    process.once('uncaughtException', (error) => {
      st.equal(String(error), 'Error: charlie')
    })

    trough()
      .use((/** @type {Callback} */ next) => {
        setImmediate(() => {
          next(new Error('charlie'))
        })
      })
      .run((/** @type {Error} */ error) => {
        setImmediate(() => {
          throw error
        })
      })
  })

  t.test('should not swallow errors in the `done` handler', (st) => {
    const value = new Error('hotel')

    st.plan(1)

    process.once('uncaughtException', (error) => {
      st.equal(error, value, 'should pass the error')
    })

    trough()
      .use((/** @type {Callback} */ next) => {
        next(value)
      })
      .run((/** @type {Error} */ error) => {
        throw error
      })
  })
})
