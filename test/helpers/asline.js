// Stream test runner
//
'use strict';


const assert   = require('assert');
const pipeline = require('stream').pipeline;
const split2   = require('split2');
const util     = require('util');


class AsLine {
  constructor(stream, options = {}) {
    this._promise   = Promise.resolve();
    this._input     = split2();
    this._output    = stream;
    this._timeout   = options.timeout;
    this._linebreak = options.linebreak || '\r\n';

    pipeline(stream, this._input, () => {});
  }


  send(str) {
    this._promise = this._promise.then(() => new Promise((resolve, reject) => {
      this._output.write(str + '\n', err => {
        if (err) setImmediate(() => reject(err));
        else setImmediate(() => resolve());
      });
    }));

    return this;
  }


  // reads input line-by-line until `fn` returns true
  _read(fn) {
    let on_readable;
    let buffer = [];

    this._promise = this._promise.then(() => {
      let promise = new Promise(resolve => {
        on_readable = () => {
          let data;

          while ((data = this._input.read()) !== null) {
            buffer.push(data);

            if (fn(data)) {
              this._input.removeListener('readable', on_readable);
              resolve(buffer.join(this._linebreak));
              break;
            }
          }
        };

        this._input.on('readable', on_readable);
        on_readable();
      });

      if (Number.isFinite(this._timeout) && this._timeout > 0) {
        promise = Promise.race([
          promise,
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (on_readable) this._input.removeListener('readable', on_readable);
              reject(new Error('Operation timed out, buffer:\n' + buffer.join('\n')));
            }, this._timeout);
          })
        ]);
      }

      return promise;
    });

    return this;
  }


  expect(stop, match) {
    if (arguments.length < 2) {
      match = stop;
      stop = 1;
    }

    let read_fn;

    if (typeof stop === 'function') {
      // regular function
      read_fn = stop;
    } else if (typeof stop.test === 'function') {
      // regexp
      read_fn = buf => stop.test(buf);
    } else if (typeof stop === 'string') {
      // string
      read_fn = buf => (buf === stop);
    } else if (typeof stop === 'number') {
      // number of lines
      let lines = stop;
      read_fn = () => (--lines <= 0);
    }

    this._promise = this._read(read_fn)._promise.then(actual => {
      if (typeof match === 'function') {
        assert.strictEqual(match(actual), true, util.inspect(actual));
      } else if (typeof match.test === 'function') {
        assert.strictEqual(match.test(actual), true, `${util.inspect(match)} ~ ${util.inspect(actual)}`);
      } else {
        assert.strictEqual(actual, match);
      }

      return actual;
    });

    return this;
  }


  skip(lines = 1) {
    this._promise = this._read(() => (--lines <= 0))._promise.then(() => {});

    return this;
  }


  // Closes stream
  //
  end() {
    this._promise = this._promise.then(() => {
      this._input.end();
      this._output.end();
    });

    return this;
  }


  then(...args) {
    this._promise = this._promise.then(...args);

    return this;
  }


  catch(...args) {
    this._promise = this._promise.catch(...args);

    return this;
  }
}


module.exports = (...args) => new AsLine(...args);
