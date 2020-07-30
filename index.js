// NNTP server template. Configure commands & methods for your needs
//
'use strict';


const net     = require('net');
const tls     = require('tls');
const url     = require('url');
const Session = require('./lib/session');


const commands = [
  require('./lib/commands/article'),
  require('./lib/commands/authinfo_pass'),
  require('./lib/commands/authinfo_user'),
  require('./lib/commands/body'),
  require('./lib/commands/capabilities'),
  require('./lib/commands/date'),
  require('./lib/commands/group'),
  require('./lib/commands/hdr'),
  require('./lib/commands/head'),
  require('./lib/commands/help'),
  require('./lib/commands/list'),
  require('./lib/commands/list_active'),
  require('./lib/commands/list_newsgroups'),
  require('./lib/commands/list_overview_fmt'),
  require('./lib/commands/listgroup'),
  require('./lib/commands/mode'),
  require('./lib/commands/mode_reader'),
  require('./lib/commands/newgroups'),
  require('./lib/commands/newnews'),
  require('./lib/commands/over'),
  require('./lib/commands/quit'),
  require('./lib/commands/stat'),
  require('./lib/commands/xhdr'),
  require('./lib/commands/xover')
].reduce((obj, cmd) => {
  obj[cmd.head] = cmd; return obj;
}, {});


const DEFAULT_OPTIONS = {
  // Use `false` if you don't need authentication
  requireAuth: false,
  // Is connection secure by default? Set `true` if you use external SSL
  // proxy or use built-in NTTPS. Default server on 119 port is not secure,
  // and AUTHINFO will require to upgrade connection via STARTSSL.
  secure: false,
  // TLS/SSL options (see node.js TLS documentation).
  tls: null,
  session: Session,
  commands
};


function Nntp(options) {
  this.options = Object.assign({}, DEFAULT_OPTIONS, options || {});

  this.commands = this.options.commands;
}


Nntp.prototype.listen = function (address) {
  let host, port;
  let parsed = url.parse(address);

  let listener = connection => {
    this.options.session.create(this, connection);
  };

  host = parsed.hostname || 'localhost';

  if (parsed.protocol === 'nntps:') {
    this.server = tls.createServer(this.options.tls, listener);

    port = parsed.port !== null ? parsed.port : 563;
  } else {
    this.server = net.createServer(listener);

    port = parsed.port !== null ? parsed.port : 119;
  }

  return new Promise((resolve, reject) => {
    let on_listening, on_error;

    on_listening = () => {
      this.server.removeListener('listening', on_listening);
      this.server.removeListener('error', on_error);
      resolve();
    };

    on_error = err => {
      this.server.removeListener('listening', on_listening);
      this.server.removeListener('error', on_error);
      reject(err);
    };

    this.server.on('listening', on_listening);
    this.server.on('error', on_error);
    this.server.listen(port, host);
  });
};


Nntp.prototype.close = function () {
  return new Promise(resolve => this.server.close(resolve));
};

////////////////////////////////////////////////////////////////////////////////

//
// Override methods below for your needs
//


/**
 * Return "true" if client should be authenticated prior to running a specific
 * command. By default a minimal set of commands is whitelisted.
 */
Nntp.prototype._needAuth = function (session, command) {
  if (!this.options.requireAuth ||
     session.authenticated ||
     /^(MODE|AUTHINFO|STARTTLS|CAPABILITIES|DATE)\b/i.test(command)) {
    return false;
  }

  return true;
};


/*
 * Authenticate user based on credentials stored in `session.authinfo_user`
 * and `session.authinfo_pass`.
 *
 * Should return `true` on success, and `false` on failure.
 */
Nntp.prototype._authenticate = function (/*session*/) {
  return Promise.resolve(false);
};


/*
 * Return message object or `null`.
 *
 * - message_id: number-like string or '<message_identifier>'
 */
Nntp.prototype._getArticle = function (/*session, message_id*/) {
  throw new Error('method `nntp._getArticle` is not implemented');
};


/*
 * Get list of message numbers current group in given interval.
 *
 * Returns an array/stream of articles that could be used later
 * with `build*` methods.
 */
Nntp.prototype._getRange = function (/*session, first, last, options*/) {
  throw new Error('method `nntp._getRange` is not implemented');
};


/*
 * Try to select group by name. Returns `true` on success
 * and fill `session.group` data with:
 *
 *   - min_index       (Number) - low water mark
 *   - max_index       (Number) - high water mark
 *   - total           (Number) - an amount of messages in the group
 *   - name            (Number) - group name, e.g. 'misc.test'
 *   - description     (String) - group description (optional)
 *   - current_article (Number) - usually equals to min_index, can be modified
 *                                by the server later, 0 means invalid
 */
Nntp.prototype._selectGroup = function (/*session, name*/) {
  throw new Error('method `nntp._selectGroup` is not implemented');
};


/*
 * Get visible groups list
 *
 * - time (optional)    - minimal last update time
 * - wildmat (optional) - name filter RegExp
 *
 * Returns an array/stream of articles that could be used later
 * with `build*` methods.
 */
Nntp.prototype._getGroups = function (/*session, time, wildmat*/) {
  throw new Error('method `nntp._getGroups` is not implemented');
};


/*
 * Generate message headers
 */
Nntp.prototype._buildHead = function (/*session, message*/) {
  throw new Error('method `nntp._buildHead` is not implemented');
};


/*
 * Generate message body
 */
Nntp.prototype._buildBody = function (/*session, message*/) {
  throw new Error('method `nntp._buildBody` is not implemented');
};


/*
 * Generate header content
 *
 * NNTP server user may request any field using HDR command,
 * and in addition to that the following fields are used internally by
 * nntp-server:
 *
 *  - subject
 *  - from
 *  - date
 *  - message-id
 *  - references
 *  - :bytes
 *  - :lines
 *  - xref
 */
Nntp.prototype._buildHeaderField = function (/*session, message, field*/) {
  throw new Error('method `nntp._buildHeaderField` is not implemented');
};


/*
 * Get fields for OVER and LIST OVERVIEW.FMT commands.
 *
 * First 7 fields (up to :lines) are mandatory and should not be changed,
 * you can remove Xref or add any field supported by buildHeaderField after
 * that.
 *
 * Format matches LIST OVERVIEW.FMT, ':full' means header includes header
 * name itself (which is mandatory for custom fields).
 */
Nntp.prototype._getOverviewFmt = function (/*session*/) {
  return [
    'Subject:',
    'From:',
    'Date:',
    'Message-ID:',
    'References:',
    ':bytes',
    ':lines',
    'Xref:full'
  ];
};


/*
 * Get list of messages newer than specified timestamp
 * in NNTP groups selected by a wildcard.
 *
 * - time    - minimal last update time
 * - wildmat - name filter RegExp
 *
 * Returns an array/stream of articles that could be used later
 * with `build*` methods.
 */
Nntp.prototype._getNewNews = function (/*session, time, wildmat*/) {
  throw new Error('method `nntp._getNewNews` is not implemented');
};


/*
 * Called when an internal error is occured in any of the commands
 */
Nntp.prototype._onError = function (/*error*/) {
};


module.exports = Nntp;
module.exports.commands = commands;
module.exports.Session  = Session;
