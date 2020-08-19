// Transform stream that concatenates and unfolds all strings in input
//
// Each input element could be either:
//
//  - String
//  - Stream of strings in object mode (strings only; null and arrays are not allowed)
//  - null (ends the stream)
//  - Array with any combinations of the above
//
// This stream inserts CRLF after each string/buffer, each array element and
// each chunk in the nested object stream.
//
'use strict';


const Denque  = require('denque');
const stream  = require('stream');
const util    = require('util');

const STATE_IDLE    = 0; // no data in queue
const STATE_WRITE   = 1; // writing a string to the output
const STATE_FLOWING = 2; // piping one of input streams to the output
const STATE_PAUSED  = 3; // output stream does not accept more data


function FlattenStream(options) {
  if (!(this instanceof FlattenStream)) return new FlattenStream(options);

  this.queue              = new Denque();
  this.state              = STATE_IDLE;
  this.top_chunk_stream   = null;
  this.top_chunk_callback = null;
  this.top_chunk_read_fn  = null;
  this.stream_ended       = false;

  stream.Duplex.call(this, Object.assign({}, options, {
    writableObjectMode: true,
    readableObjectMode: false,
    allowHalfOpen:      false
  }));
}

util.inherits(FlattenStream, stream.Duplex);


// Recursive function to add data to internal queue
//
function add_data(data, fn) {
  if (Array.isArray(data)) {
    // Flatten any arrays, callback is called when last element is processed
    data.forEach((el, idx) => add_data.call(this, el, (idx === data.length - 1 ? fn : null)));
    return;
  }

  this.queue.push([ data, fn ]);
}


FlattenStream.prototype._write = function (data, encoding, callback) {
  add_data.call(this, data, callback);

  if (this.state === STATE_IDLE) this._read();
};


FlattenStream.prototype.destroy = function () {
  if (this.stream_ended) return;

  this.stream_ended = true;
  this.push(null);

  if (this.top_chunk_stream && typeof this.top_chunk_stream.destroy === 'function') {
    this.top_chunk_stream.destroy();
  }

  while (!this.queue.isEmpty()) {
    let data = this.queue.shift()[0];

    if (data && typeof data.destroy === 'function') data.destroy();
  }
};


FlattenStream.prototype._read = function () {
  for (;;) {
    if (this.state === STATE_WRITE) {
      if (this.top_chunk_callback) {
        this.top_chunk_callback();
      }

      this.state = STATE_IDLE;
      this.top_chunk_callback = null;
    } else if (this.state === STATE_FLOWING) {
      this.top_chunk_read_fn();
      return;
    } else if (this.state === STATE_PAUSED) {
      this.state = STATE_FLOWING;
      this.top_chunk_read_fn();
      return;
    }

    if (this.queue.isEmpty()) break;

    let [ data, callback ] = this.queue.shift();

    if (data && typeof data.on === 'function') {
      // looks like data is a stream
      this.state = STATE_FLOWING;
      this.top_chunk_stream = data;
      this.top_chunk_callback = callback;

      this.top_chunk_read_fn = () => {
        if (this.state !== STATE_FLOWING) return;

        for (;;) {
          let chunk = data.read();

          if (chunk === null) {
            // no more data is available yet
            break;
          }

          if (this.stream_ended) break;
          if (!this.push(String(chunk) + '\r\n')) {
            this.state = STATE_PAUSED;
            break;
          }
        }
      };

      data.on('readable', this.top_chunk_read_fn);
      this.top_chunk_read_fn();

      stream.finished(data, err => {
        data.removeListener('readable', this.top_chunk_read_fn);

        if (err) {
          this.destroy();
          return;
        }

        if (this.top_chunk_callback) {
          this.top_chunk_callback();
        }

        this.state = STATE_IDLE;
        this.top_chunk_stream = null;
        this.top_chunk_callback = null;
        this.top_chunk_read_fn = null;
        this._read();
      });
      break;

    } else {
      // regular data chunk (null, string, buffer)
      this.state = STATE_WRITE;
      this.top_chunk_callback = callback;

      if (data === null) {
        // signal to end this stream
        this.destroy();
        break;

      } else {
        /* eslint-disable no-lonely-if */
        // string (or mistakenly pushed numbers and such)
        if (!this.push(String(data) + '\r\n')) break;
      }
    }
  }
};


module.exports = FlattenStream;
