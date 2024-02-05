/**
 * @typedef {import('trough').Callback} Callback
 */

import assert from 'node:assert/strict'
import process from 'node:process'
import test from 'node:test'
import {trough} from 'trough'

test('trough', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('trough')).sort(), [
      'trough',
      'wrap'
    ])
  })
})

test('use()', async function (t) {
  await t.test('should throw without `fn`', async function () {
    const p = trough()

    assert.throws(function () {
      // @ts-expect-error: check how missing value is handled.
      p.use()
    }, /Expected `middelware` to be a function, not undefined/)
  })

  await t.test('should return self', async function () {
    const p = trough()

    assert.equal(
      p.use(function () {}),
      p
    )
  })
})

test('synchronous middleware', async function (t) {
  await t.test('should pass returned errors to `done`', async function () {
    const value = new Error('Foo')
    let calls = 0

    trough()
      .use(function () {
        return value
      })
      .run(
        /**
         * @param {unknown} [error]
         * @returns {undefined}
         */
        function (error) {
          assert.equal(error, value)
          calls++
        }
      )

    assert.equal(calls, 1)
  })

  await t.test('should pass thrown errors to `done`', async function () {
    const value = new Error('Foo')
    let calls = 0

    trough()
      .use(function () {
        throw value
      })
      .run(
        /**
         * @param {unknown} [error]
         * @returns {undefined}
         */
        function (error) {
          assert.equal(error, value)
          calls++
        }
      )

    assert.equal(calls, 1)
  })

  await t.test('should pass values to `fn`s and `done`', async function () {
    let calls = 0

    trough()
      .use(
        /**
         * @param {unknown} value
         * @returns {undefined}
         */
        function (value) {
          assert.equal(value, 'some')
        }
      )
      .run(
        'some',
        /**
         * @param {unknown} [error]
         * @param {unknown} [value]
         * @returns {undefined}
         */
        function (error, value) {
          assert.ifError(error)
          assert.equal(value, 'some')
          calls++
        }
      )

    assert.equal(calls, 1)
  })

  await t.test(
    'should pass modified values to `fn`s and `done`',
    async function () {
      let calls = 0

      trough()
        .use(
          /**
           * @param {unknown} [value]
           * @returns {string}
           */
          function (value) {
            assert.equal(value, 'some')
            return value + 'thing'
          }
        )
        .use(
          /**
           * @param {unknown} [value]
           * @returns {string}
           */ function (value) {
            assert.equal(value, 'something')
            return value + ' more'
          }
        )
        .run(
          'some',
          /**
           * @param {unknown} [error]
           * @param {unknown} [value]
           * @returns {undefined}
           */
          function (error, value) {
            assert.ifError(error)
            assert.equal(value, 'something more')
            calls++
          }
        )

      assert.equal(calls, 1)
    }
  )
})

test('promise middleware', async function (t) {
  await t.test('should pass rejected errors to `done`', async function () {
    const value = new Error('Foo')
    let calls = 0

    /** @type {Promise<unknown>} */
    const promise = new Promise(function (resolve) {
      trough()
        .use(function () {
          return new Promise(function (_, reject) {
            reject(value)
          })
        })
        .run(
          /**
           * @param {unknown} [error]
           * @returns {undefined}
           */
          function (error) {
            assert.equal(error, value)
            calls++
            resolve(undefined)
          }
        )
    })

    assert.equal(calls, 0)

    await promise

    assert.equal(calls, 1)
  })

  await t.test('should pass values to `fn`s and `done`', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {unknown} value
           * @returns {Promise<undefined>}
           */
          function (value) {
            assert.equal(value, 'some')

            return new Promise(function (resolve) {
              resolve(undefined)
            })
          }
        )
        .run(
          'some',
          /**
           * @param {unknown} [error]
           * @param {unknown} [value]
           * @returns {undefined}
           */
          function (error, value) {
            assert.ifError(error)
            assert.equal(value, 'some')
            resolve(undefined)
          }
        )
    })
  })

  await t.test(
    'should pass modified values to `fn`s and `done`',
    async function () {
      await new Promise(function (resolve) {
        trough()
          .use(
            /**
             * @param {unknown} [value]
             * @returns {Promise<string>}
             */
            function (value) {
              assert.equal(value, 'some')

              return new Promise(function (resolve) {
                resolve(value + 'thing')
              })
            }
          )
          .use(
            /**
             * @param {unknown} [value]
             * @returns {Promise<string>}
             */
            function (value) {
              assert.equal(value, 'something')

              return new Promise(function (resolve) {
                resolve(value + ' more')
              })
            }
          )
          .run(
            'some',
            /**
             * @param {unknown} [error]
             * @param {unknown} [value]
             * @returns {undefined}
             */
            function (error, value) {
              assert.ifError(error)
              assert.equal(value, 'something more')
              resolve(undefined)
            }
          )
      })
    }
  )

  await t.test('should support thenables', async function () {
    // See: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables>
    let calls = 0

    /** @type {Promise<unknown>} */
    const promise = new Promise(function (resolve) {
      trough()
        .use(function () {
          return {
            /**
             * @param {(value: unknown) => void} resolve
             */
            // eslint-disable-next-line unicorn/no-thenable
            then(resolve) {
              setTimeout(function () {
                resolve(42)
              })
            }
          }
        })
        .run(
          /**
           * @param {unknown} [error]
           * @param {unknown} [value]
           * @returns {undefined}
           */
          function (error, value) {
            assert.equal(error, null)
            assert.equal(value, 42)
            calls++
            resolve(undefined)
          }
        )
    })

    assert.equal(calls, 0)

    await promise

    assert.equal(calls, 1)
  })
})

test('asynchronous middleware', async function (t) {
  const value = new Error('Foo')

  await t.test('should pass given errors to `done`', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {Callback} next
           * @returns {undefined}
           */
          function (next) {
            next(value)
          }
        )
        .run(
          /**
           * @param {unknown} [error]
           * @returns {undefined}
           */
          function (error) {
            assert.equal(error, value)
            resolve(undefined)
          }
        )
    })
  })

  await t.test('should pass async given errors to `done`', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {Callback} next
           * @returns {undefined}
           */
          function (next) {
            setImmediate(function () {
              next(value)
            })
          }
        )
        .run(
          /**
           * @param {unknown} [error]
           * @returns {undefined}
           */
          function (error) {
            assert.equal(error, value)
            resolve(undefined)
          }
        )
    })
  })

  await t.test('should ignore multiple sync `next` calls', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {Callback} next
           * @returns {undefined}
           */
          function (next) {
            next(value)
            next(new Error('Other'))
          }
        )
        .run(
          /**
           * @param {unknown} [error]
           * @returns {undefined}
           */
          function (error) {
            assert.equal(error, value)
            resolve(undefined)
          }
        )
    })
  })

  await t.test('should ignore multiple async `next` calls', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {Callback} next
           * @returns {undefined}
           */
          function (next) {
            setImmediate(function () {
              next(value)
              setImmediate(function () {
                next(new Error('Other'))
              })
            })
          }
        )
        .run(
          /**
           * @param {unknown} [error]
           * @returns {undefined}
           */
          function (error) {
            assert.equal(error, value)
            resolve(undefined)
          }
        )
    })
  })

  await t.test('should pass values to `fn`s and `done`', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {unknown} value
           * @param {Callback} next
           * @returns {undefined}
           */
          function (value, next) {
            assert.equal(value, 'some')
            setImmediate(next)
          }
        )
        .run(
          'some',
          /**
           * @param {unknown} [error]
           * @param {unknown} [value]
           * @returns {undefined}
           */
          function (error, value) {
            assert.ifError(error)
            assert.equal(value, 'some')
            resolve(undefined)
          }
        )
    })
  })

  await t.test(
    'should pass modified values to `fn`s and `done`',
    async function () {
      await new Promise(function (resolve) {
        trough()
          .use(
            /**
             * @param {unknown} value
             * @param {Callback} next
             * @returns {undefined}
             */
            function (value, next) {
              assert.equal(value, 'some')

              setImmediate(function () {
                next(undefined, value + 'thing')
              })
            }
          )
          .use(
            /**
             * @param {unknown} value
             * @param {Callback} next
             * @returns {undefined}
             */
            function (value, next) {
              assert.equal(value, 'something')

              setImmediate(function () {
                next(undefined, value + ' more')
              })
            }
          )
          .run(
            'some',
            /**
             * @param {unknown} [error]
             * @param {unknown} [value]
             * @returns {undefined}
             */
            function (error, value) {
              assert.ifError(error)
              assert.equal(value, 'something more')
              resolve(undefined)
            }
          )
      })
    }
  )
})

test('run()', async function (t) {
  // Remove the crash handlers by the test runner.
  const before = process.listeners('uncaughtException')

  for (const listener of before) {
    process.off('uncaughtException', listener)
  }

  await t.test('should throw if `done` is not a function', async function () {
    assert.throws(function () {
      trough().run()
    }, /^TypeError: Expected function as last argument, not undefined$/)
  })

  await t.test('should work all together', async function () {
    await new Promise(function (resolve) {
      trough()
        .use(
          /**
           * @param {unknown} [value]
           * @returns {string}
           */
          function (value) {
            assert.equal(value, 'some')

            return value + 'thing'
          }
        )
        .use(
          /**
           * @param {unknown} [value]
           * @returns {Promise<string>}
           */
          function (value) {
            assert.equal(value, 'something')

            return new Promise(function (resolve) {
              resolve(value + ' more')
            })
          }
        )
        .use(
          /**
           * @param {unknown} value
           * @param {Callback} next
           * @returns {undefined}
           */
          function (value, next) {
            assert.equal(value, 'something more')

            setImmediate(function () {
              next(undefined, value + '.')
            })
          }
        )
        .run(
          'some',
          /**
           * @param {unknown} [error]
           * @param {unknown} [value]
           * @returns {undefined}
           */
          function (error, value) {
            assert.ifError(error)
            assert.equal(value, 'something more.')
            resolve(undefined)
          }
        )
    })
  })

  await t.test('should throw errors thrown from `done` (#1)', function () {
    assert.throws(function () {
      trough().run(function () {
        throw new Error('alpha')
      })
    }, /^Error: alpha$/)
  })

  await t.test(
    'should throw errors thrown from `done` (#2)',
    async function () {
      await new Promise(function (resolve) {
        process.once('uncaughtException', function (error) {
          assert.equal(String(error), 'Error: bravo')
          resolve(undefined)
        })

        trough()
          .use(
            /**
             * @param {Callback} next
             * @returns {undefined}
             */
            function (next) {
              setImmediate(next)
            }
          )
          .run(function () {
            throw new Error('bravo')
          })
      })
    }
  )

  await t.test(
    'should rethrow errors thrown from `done` (#1)',
    async function () {
      await new Promise(function (resolve) {
        process.once('uncaughtException', function (error) {
          assert.equal(String(error), 'Error: bravo')
          resolve(undefined)
        })

        trough()
          .use(
            /**
             * @param {Callback} next
             * @returns {undefined}
             */
            function (next) {
              setImmediate(function () {
                next(new Error('bravo'))
              })
            }
          )
          .run(
            /**
             * @param {unknown} [error]
             * @returns {undefined}
             */
            function (error) {
              throw error
            }
          )
      })
    }
  )

  await t.test(
    'should rethrow errors thrown from `done` (#2)',
    async function () {
      try {
        await new Promise(function () {
          trough()
            .use(function () {
              throw new Error('bravo')
            })
            .run(
              /**
               * @param {unknown} [error]
               * @returns {undefined}
               */
              function (error) {
                throw error
              }
            )
        })
      } catch (error) {
        assert.equal(String(error), 'Error: bravo')
      }
    }
  )

  await t.test(
    'should not swallow uncaught exceptions (#1)',
    async function () {
      await new Promise(function (resolve) {
        process.once('uncaughtException', function (error) {
          assert.equal(String(error), 'Error: charlie')
          resolve(undefined)
        })
        trough()
          .use(
            /**
             * @param {Callback} next
             * @returns {undefined}
             */
            function (next) {
              setImmediate(next)
            }
          )
          .run(function () {
            setImmediate(function () {
              throw new Error('charlie')
            })
          })
      })
    }
  )

  await t.test(
    'should not swallow uncaught exceptions (#2)',
    async function () {
      await new Promise(function (resolve) {
        process.once('uncaughtException', function (error) {
          assert.equal(String(error), 'Error: charlie')
          resolve(undefined)
        })
        trough()
          .use(
            /**
             * @param {Callback} next
             * @returns {undefined}
             */
            function (next) {
              setImmediate(function () {
                next(new Error('charlie'))
              })
            }
          )
          .run(
            /**
             * @param {unknown} [error]
             * @returns {undefined}
             */
            function (error) {
              setImmediate(function () {
                throw error
              })
            }
          )
      })
    }
  )

  await t.test(
    'should not swallow errors in the `done` handler',
    async function () {
      const value = new Error('hotel')

      try {
        await new Promise(function () {
          trough()
            .use(
              /**
               * @param {Callback} next
               * @returns {undefined}
               */
              function (next) {
                next(value)
              }
            )
            .run(
              /**
               * @param {unknown} [error]
               * @returns {undefined}
               */
              function (error) {
                throw error
              }
            )
        })
      } catch (error) {
        assert.equal(error, value, 'should pass the error')
      }
    }
  )

  // Add the test runner listeners.
  for (const listener of before) {
    process.on('uncaughtException', listener)
  }
})
