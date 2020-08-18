
'use strict';


const assert   = require('assert');
const net      = require('net');
const stream   = require('stream');
const asline   = require('./helpers').asline;
const Server   = require('..');


describe('pipeline', function () {
  let port, socket, client, nntp;

  before(function () {
    // Disable default channel encryption check
    nntp = new Server({ secure: true });

    // listen on random port
    return nntp.listen('nntp://localhost:0').then(() => {
      port = nntp.server.address().port;
    });
  });


  after(function () {
    return nntp.close();
  });


  function not_implemented() { throw new Error('not implemented'); }
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function throw_err(err) {
    // make tests fail; we can't just throw error because node.js
    // does not yet abort on unhandled exceptions
    /* eslint-disable no-console */
    console.log(err);
    process.exit(1);
  }

  beforeEach(function (callback) {
    nntp._getGroups        = not_implemented;
    nntp._selectGroup      = not_implemented;
    nntp._getArticle       = not_implemented;
    nntp._getRange         = not_implemented;
    nntp._getNewNews       = not_implemented;
    nntp._buildHead        = not_implemented;
    nntp._buildBody        = not_implemented;
    nntp._buildHeaderField = not_implemented;
    nntp._authenticate     = not_implemented;
    nntp._onError          = throw_err;

    socket = net.connect(port, err => {
      client = asline(socket, { timeout: 2000 }).expect(/^201/);
      callback(err);
    });
  });


  afterEach(function () {
    return client.end();
  });


  it('should execute commands sequentially', function () {
    let log = [];

    nntp._selectGroup = async function (session, name) {
      let result;
      log.push('start ' + name);

      switch (name) {
        case 'a':
          await delay(10);
          session.group = { name: 'a', min_index: 1, max_index: 2, total: 2 };
          result = true;
          break;

        case 'b':
          await delay(10);
          result = false;
          break;

        case 'c':
          await delay(10);
          session.group = { name: 'c', min_index: 1, max_index: 2, total: 2 };
          result = true;
          break;
      }

      log.push('stop ' + name);
      return result;
    };

    return client
      .send('GROUP a\r\nGROUP b\r\nGROUP c')
      .expect(/^211 .*? a$/)
      .expect(/^411 /)
      .expect(/^211 .*? c$/)
      .then(() => {
        assert.deepEqual(log, [ 'start a', 'stop a', 'start b', 'stop b', 'start c', 'stop c' ]);
      });
  });


  it('should stop executing commands when connection is closed', function () {
    let log = [];
    let close_fn;
    let on_close = new Promise(resolve => { close_fn = resolve; });

    nntp._selectGroup = async function (session, name) {
      let result;
      log.push('start ' + name);

      switch (name) {
        case 'a':
          session.group = { name: 'a', min_index: 1, max_index: 2, total: 2 };
          result = true;
          break;

        case 'b':
          await on_close;
          result = false;
          break;

        case 'c':
          throw new Error('should never be called');
      }

      log.push('stop ' + name);
      return result;
    };

    return client
      .send('GROUP a\r\nGROUP b\r\nGROUP c')
      .expect(/^211 .*? a$/)
      .then(() => { assert.deepEqual(log, [ 'start a', 'stop a', 'start b' ]); })
      .end()
      .then(() => delay(10))
      .then(() => { close_fn(); })
      .then(() => delay(10))
      .then(() => { assert.deepEqual(log, [ 'start a', 'stop a', 'start b', 'stop b' ]); });
  });


  it('should report error when command fails', function () {
    let error;

    nntp._onError = function (err) {
      if (error) throw new Error('onError called twice');
      error = err;
    };

    nntp._selectGroup = async function () {
      let err = new Error('a bug is here');
      err.code = 'ETEST';
      throw err;
    };

    return client
      .send('GROUP foobar')
      .expect(/^403 /)
      .then(() => {
        assert.equal(error.code, 'ETEST');
        assert.equal(error.nntp_command, 'GROUP foobar');
      });
  });


  it('should handle errors from streams', function () {
    let error;

    nntp._onError = function (err) {
      if (error) throw new Error('onError called twice');
      error = err;
    };

    nntp._getGroups = async function () {
      return new stream.Readable({
        read() {
          let err = new Error('Test stream error');
          err.code = 'ETEST';
          this.emit('error', err);
        },
        objectMode: true
      });
    };

    let wait_for_close = new Promise(resolve => {
      socket.on('close', resolve);
    });

    return client
      .send('LIST')
      .then(() => wait_for_close)
      .expect(/^215 /)
      .end();
  });
});
