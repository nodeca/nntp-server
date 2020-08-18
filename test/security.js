
'use strict';

const fs           = require('fs');
const net          = require('net');
const join         = require('path').join;
const tls          = require('tls');
const asline       = require('./helpers').asline;
const Server       = require('..');


describe('security', function () {
  let port_plain, client_plain, socket_plain, nntp_plain;
  let port_tls, client_tls, socket_tls, nntp_tls;

  before(function () {
    nntp_plain = new Server({ secure: false });

    // listen on random port
    return nntp_plain.listen('nntp://localhost:0').then(() => {
      port_plain = nntp_plain.server.address().port;
    });
  });


  after(function () {
    return nntp_plain.close();
  });


  beforeEach(function (callback) {
    socket_plain = net.connect(port_plain, err => {
      client_plain = asline(socket_plain, { timeout: 2000 }).expect(/^201/);
      callback(err);
    });
  });


  afterEach(function () {
    return client_plain.end();
  });


  before(function () {
    nntp_tls = new Server({
      secure: true,
      tls: {
        key:  fs.readFileSync(join(__dirname, 'fixtures', 'server-key.pem')),
        cert: fs.readFileSync(join(__dirname, 'fixtures', 'server-cert.pem'))
      }
    });

    // listen on random port
    return nntp_tls.listen('nntps://localhost:0').then(() => {
      port_tls = nntp_tls.server.address().port;
    });
  });


  after(function () {
    return nntp_tls.close();
  });


  beforeEach(function (callback) {
    socket_tls = tls.connect(port_tls, {
      ca: [ fs.readFileSync(join(__dirname, 'fixtures', 'server-cert.pem')) ]
    }, err => {
      client_tls = asline(socket_tls, { timeout: 2000 }).expect(/^201/);
      callback(err);
    });
  });


  afterEach(function () {
    return client_tls.end();
  });


  it('should allow auth over secure channel only', function () {
    return Promise.resolve()
      .then(() => client_plain
        .send('AUTHINFO USER test')
        .expect(/^483 /))
      .then(() => client_tls
        .send('AUTHINFO USER test')
        .expect(/^381 /));
  });
});
