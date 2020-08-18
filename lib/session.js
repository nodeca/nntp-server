// Client session. Contains all info about current connection state.
//
'use strict';


const crypto         = require('crypto');
const debug_err      = require('debug')('nntp-server.error');
const debug_net      = require('debug')('nntp-server.network');
const serializeError = require('serialize-error').serializeError;
const status         = require('./status');

// same as lodash.escapeRegExp
function escape_regexp(str) {
  return str.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

async function* split_lines(stream) {
  let buffer = '';

  for await (let data of stream) {
    let re = /\r?\n/g;
    let match;
    let start = 0;
    buffer += data;

    while ((match = re.exec(buffer)) !== null) {
      if (match.index - start + match[0].length > 512) {
        throw new Error('command too long');
      }

      yield buffer.slice(start, match.index);
      start = match.index + match[0].length;
    }

    if (start) buffer = buffer.slice(start);

    if (buffer.length > 512) {
      throw new Error('command too long');
    }
  }
}


function Session(server) {
  this.server     = server;

  // Could be just {}, but this is more clean
  // if this.groups.name is not set, group is not selected
  this.group = {
    min_index:       0,
    max_index:       0,
    total:           0,
    name:            null,
    description:     '',
    current_article: 0
  };

  this.debug_mark = crypto.pseudoRandomBytes(3).toString('hex');

  // Random string used to track connection in logs
  debug_net('    [%s] %s', this.debug_mark, 'new connection');

  // Create RE to search command name. Longest first (for subcommands)
  let commands = Object.keys(this.server.commands).sort().reverse();

  this.__search_cmd_re = RegExp(`^(${commands.map(escape_regexp).join('|')})`, 'i');
}

// By default connection is not secure
Session.prototype.secure = false;
// Default mode is "reader"
Session.prototype.reader = true;

Session.prototype.authenticated = false;
Session.prototype.authinfo_user = null;
Session.prototype.authinfo_pass = null;

Session.prototype.current_group = null;

// Write welcome message and execute incoming commands
//
Session.prototype.run = async function* (input) {
  yield status._201_SRV_READY_RO;

  for await (let line of split_lines(input)) {
    yield* this._parseCommand(line);
  }
};


// Parse client commands and push into pipeline
//
Session.prototype._parseCommand = async function* (input) {
  // Command not recognized
  if (!this.__search_cmd_re.test(input)) {
    return yield status._500_CMD_UNKNOWN;
  }

  let cmd = input.match(this.__search_cmd_re)[1].toUpperCase();

  // Command looks known, but whole validation failed -> bad params
  if (!this.server.commands[cmd].validate.test(input)) {
    return yield status._501_SYNTAX_ERROR;
  }

  // Command require auth, but it was not done yet
  // Force secure connection if needed
  if (this.server._needAuth(this, cmd)) {
    return yield this.secure ? status._480_AUTH_REQUIRED : status._483_NOT_SECURE;
  }

  try {
    yield* this.server.commands[cmd].run(this, input);
  } catch (err) {
    err.nntp_command = input;
    debug_err('ERROR: %O', serializeError(err));
    this.server._onError(err);
    yield status._403_FUCKUP;
    yield null; // close connection on any internal error
  }
};


module.exports = Session;

module.exports.create = async function (server, stream) {
  stream.setEncoding('utf8');

  let session = new Session(server);
  let runner = session.run(stream);

  stream.on('close', () => runner.return());

  try {
    for await (let output of runner) {
      if (output === null) break;
      await new Promise(resolve => stream.write(`${output}\r\n`, 'utf8', resolve));
    }
  } catch (err) {
    server._onError(err);
  } finally {
    stream.destroy();
  }
};
