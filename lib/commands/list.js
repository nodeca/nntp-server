// https://tools.ietf.org/html/rfc3977#section-7.1
//
'use strict';


const status = require('../status');

const CMD_RE = /^LIST( (.+))?$/i;


module.exports = {
  head:     'LIST',
  validate: CMD_RE,
  pipeline: true,

  async* run(session, cmd) {
    // Reject all params. All extentions are in separate files
    // and detected before this one.
    if (cmd.match(CMD_RE)[2]) return yield status._501_SYNTAX_ERROR;

    yield status._215_INFO_FOLLOWS;

    for await (let group of session.server._getGroups(session)) {
      yield `${group.name} ${group.max_index} ${group.min_index} n`;
    }

    yield '.';
  }
};
