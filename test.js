/**
 * @typedef {import('./index.js').Callback} Callback
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {trough} from './index.js'

test('trough()', function () {
  assert.equal(typeof trough, 'function', 'should be a function')
  assert.equal(typeof trough(), 'object', 'should return an object')
})

test('use()', function () {
  let p = trough()

  assert.throws(
    () => {
      // @ts-expect-error missing value.
      p.use()
    },
    /Expected `middelware` to be a function, not undefined/,
    'should throw without `fn`'
  )

  p = trough()

  assert.equal(
    p.use(() => {}),
    p,
    'should return self'
  )
})

test('synchronous middleware', async function () {
  const value = new Error('Foo')

  await new Promise((resolve) => {
    trough()
      .use(() => {
        return value
      })
      .run((/** @type {Error} */ error) => {
        assert.equal(error, value, 'should pass returned errors to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use(() => {
        throw value
      })
      .run((/** @type {Error} */ error) => {
        assert.equal(error, value, 'should pass thrown errors to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(value, 'some', 'should pass values to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')
        return value + 'thing'
      })
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'something', 'should modify values')
        return value + ' more'
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(
          value,
          'something more',
          'should pass modified values to `done`'
        )
        resolve(undefined)
      })
  })
})

test('promise middleware', async function () {
  const value = new Error('Foo')

  await new Promise((resolve) => {
    trough()
      .use(() => {
        return new Promise((_, reject) => {
          reject(value)
        })
      })
      .run((/** @type {Error} */ error) => {
        assert.equal(error, value, 'should pass rejected errors to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')

        return new Promise((resolve) => {
          resolve(undefined)
        })
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(value, 'some', 'should pass values to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')

        /**
         * @callback resolveCallback
         * @param {string} value
         */
        return {
          then: (/** @type {resolveCallback} */ resolve) => {
            resolve(value + 'thing')
          }
        }
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(value, 'something', 'should pass values to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')

        return {
          then: 'something'
        }
      })
      .run(
        'some',
        (/** @type {void} */ error, /** @type {{ then: string }} */ value) => {
          assert.ifError(error)
          assert.equal(value.then, 'something', 'should pass values to `done`')
          resolve(undefined)
        }
      )
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')

        return new Promise((resolve) => {
          resolve(value + 'thing')
        })
      })
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'something', 'should modify values')

        return new Promise((resolve) => {
          resolve(value + ' more')
        })
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(
          value,
          'something more',
          'should pass modified values to `done`'
        )
        resolve(undefined)
      })
  })
})

test('asynchronous middleware', async function () {
  const value = new Error('Foo')

  await new Promise((resolve) => {
    trough()
      .use((/** @type {Callback} */ next) => {
        next(value)
      })
      .run((/** @type {Error} */ error) => {
        assert.equal(error, value, 'should pass given errors to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {Callback} */ next) => {
        setImmediate(() => {
          next(value)
        })
      })
      .run((/** @type {Error} */ error) => {
        assert.equal(error, value, 'should pass async given errors to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {Callback} */ next) => {
        next(value)
        next(new Error('Other'))
      })
      .run((/** @type {Error} */ error) => {
        assert.equal(error, value, 'should ignore multiple sync `next` calls')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
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
        assert.equal(error, value, 'should ignore multiple async `next` calls')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')
        setImmediate(next)
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(value, 'some', 'should pass values to `done`')
        resolve(undefined)
      })
  })

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
        assert.equal(value, 'some', 'should pass values to `fn`s')

        setImmediate(() => {
          next(null, value + 'thing')
        })
      })
      .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
        assert.equal(value, 'something', 'should modify values')

        setImmediate(() => {
          next(null, value + ' more')
        })
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(
          value,
          'something more',
          'should pass modified values to `done`'
        )
        resolve(undefined)
      })
  })
})

test('run()', async function (t) {
  assert.throws(
    () => {
      trough().run()
    },
    /^TypeError: Expected function as last argument, not undefined$/,
    'should throw if `done` is not a function'
  )

  await new Promise((resolve) => {
    trough()
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'some', 'input')

        return value + 'thing'
      })
      .use((/** @type {string} */ value) => {
        assert.equal(value, 'something', 'sync')

        return new Promise((resolve) => {
          resolve(value + ' more')
        })
      })
      .use((/** @type {string} */ value, /** @type {Callback} */ next) => {
        assert.equal(value, 'something more', 'promise')

        setImmediate(() => {
          next(null, value + '.')
        })
      })
      .run('some', (/** @type {void} */ error, /** @type {string} */ value) => {
        assert.ifError(error)
        assert.equal(value, 'something more.', 'async')
        resolve(undefined)
      })
  })

  await t.test('should throw errors thrown from `done` (#1)', () => {
    assert.throws(() => {
      trough().run(() => {
        throw new Error('alpha')
      })
    }, /^Error: alpha$/)
  })

  // To do: Node test runner doesn’t like this case (in `tape` it was fine).
  // Maybe they’ll fix that in the future?
  // await t.test('should throw errors thrown from `done` (#2)', async () => {
  //   await new Promise((resolve) => {
  //     process.once('uncaughtException', (error) => {
  //       assert.equal(String(error), 'Error: bravo', 'zzz')
  //       resolve(undefined)
  //     })

  //     trough()
  //       .use((/** @type {Callback} */ next) => {
  //         setImmediate(next)
  //       })
  //       .run(() => {
  //         throw new Error('bravo')
  //       })
  //   })
  // })

  // To do: Node test runner doesn’t like this case (in `tape` it was fine).
  // Maybe they’ll fix that in the future?
  // await t.test('should rethrow errors thrown from `done` (#1)', async () => {
  //   await new Promise((resolve) => {
  //     process.once('uncaughtException', (error) => {
  //       assert.equal(String(error), 'Error: bravo')
  //       resolve(undefined)
  //     })

  //     trough()
  //       .use((/** @type {Callback} */ next) => {
  //         setImmediate(() => {
  //           next(new Error('bravo'))
  //         })
  //       })
  //       .run((/** @type {Error} */ error) => {
  //         throw error
  //       })
  //   })
  // })

  await t.test('should rethrow errors thrown from `done` (#2)', async () => {
    try {
      await new Promise(() => {
        trough()
          .use(() => {
            throw new Error('bravo')
          })
          .run((/** @type {Error} */ error) => {
            throw error
          })
      })
    } catch (error) {
      assert.equal(String(error), 'Error: bravo')
    }
  })

  // To do: Node test runner doesn’t like this case (in `tape` it was fine).
  // Maybe they’ll fix that in the future?
  // await t.test('should not swallow uncaught exceptions (#1)', async () => {
  //   await new Promise((resolve) => {
  //     process.once('uncaughtException', (error) => {
  //       assert.equal(String(error), 'Error: charlie')
  //       resolve(undefined)
  //     })

  //     trough()
  //       .use((/** @type {Callback} */ next) => {
  //         setImmediate(next)
  //       })
  //       .run(() => {
  //         setImmediate(() => {
  //           throw new Error('charlie')
  //         })
  //       })
  //   })
  // })

  // To do: Node test runner doesn’t like this case (in `tape` it was fine).
  // Maybe they’ll fix that in the future?
  // await t.test('should not swallow uncaught exceptions (#2)', async () => {
  //   await new Promise((resolve) => {
  //     process.once('uncaughtException', (error) => {
  //       assert.equal(String(error), 'Error: charlie')
  //       resolve(undefined)
  //     })

  //     trough()
  //       .use((/** @type {Callback} */ next) => {
  //         setImmediate(() => {
  //           next(new Error('charlie'))
  //         })
  //       })
  //       .run((/** @type {Error} */ error) => {
  //         setImmediate(() => {
  //           throw error
  //         })
  //       })
  //   })
  // })

  await t.test('should not swallow errors in the `done` handler', async () => {
    const value = new Error('hotel')

    try {
      await new Promise(() => {
        trough()
          .use((/** @type {Callback} */ next) => {
            next(value)
          })
          .run((/** @type {Error} */ error) => {
            throw error
          })
      })
    } catch (error) {
      assert.equal(error, value, 'should pass the error')
    }
  })
})
