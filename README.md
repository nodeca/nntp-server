nntp-server
===========

[![Build Status](https://img.shields.io/travis/nodeca/nntp-server/master.svg?style=flat)](https://travis-ci.org/nodeca/nntp-server)
[![NPM version](https://img.shields.io/npm/v/nntp-server.svg?style=flat)](https://www.npmjs.org/package/nntp-server)
[![Coverage Status](https://coveralls.io/repos/github/nodeca/nntp-server/badge.svg?branch=master)](https://coveralls.io/github/nodeca/nntp-server?branch=master)

> NNTP server for readers.

Demo: [news://dev.nodeca.com](news://dev.nodeca.com)

This project is intended to build NNTP interface for internet forums and
similars.

- It implements all commands, required by popular
  [usenet newsreaders](https://en.wikipedia.org/wiki/List_of_Usenet_newsreaders).
- It implements commands pipelining to reduce responses latency.
- You should only add database access methods and output templates.


Install
-------

```sh
npm install nntp-server --save
```


API
---

Until better docs/examples provided, we sugget

1. Dig [nntp-server source](https://github.com/nodeca/nntp-server/blob/master/index.js).
   You should override all `._*` methods (via monkeypatching or subclassing). All data in/out described in each method header.
2. See [tests](https://github.com/nodeca/nntp-server/tree/master/test)
   for more examples.

### new nntp-server(address, options)

```js
const Server = require('nntp-server');
const nntp = new Server('nntp://localhost', { requireAuth: true });
```

Address has "standard" format to define everything in one string:
`nttp(s)://hostname:port/?option1=value1&option2=value2`. For example:

- `nntp://example.com` - listen on 119 port
- `nntps://example.com` - listen on 563 port, encrypted

options:

- `key` - tls secret key, optional.
- `cert` - tls cert, optional.
- `pfx` - tls key+cert together, optional.
- `requireAuth` (false) - set `true` if user should be authenticated.
- `secure` - "false" for `nntp://`, "true" for `nntps://`. Set `true`
  if you use `nntp://` with external SSL proxy and connection is secure.
  If connection is not secure client will be requested to upgrade via
  STARTTLS after AUTHINFO command.
- `session` - override default `Session` class if needed, optional.
- `commands` - your own configuration of supported commands, optional.
  For example you may wish to drop AUTHINFO commands, been enabled by default.


### .listen(address) -> Promise

Bind server to given addres, format is `protocol://host[:port]`:

- 'nntps://localhost' - bind to 127.0.0.1:563 via SSL/TLS
- 'nntp://localhost' - bind to 127.0.0.1:119 without encryption.

Returns Promise, resolved on success or fail.


### .close() -> Promise

Stop accepting new connections and wait until existing ones will be finished.


Bind server to given addres, format is `protocol://host[:port]`:

- 'nntps://localhost' - bind to 127.0.0.1:563 via SSL/TLS
- 'nntp://localhost' - bind to 127.0.0.1:119 without encryption.

Returns Promise, resolved on success or fail.


### exports.commands

```js
{
  'LIST OVERVIEW.FMT': ...,
  'XOVER': ...,
  ...
}
```

Object with command configurations. Use it to create your own and apply
modifications. Don't forget to clone objects prior to modify. Keep default
ones immutable.


### exports.Session

This class contains client connection logic. Probably, you will not
need to extend it.
