// https://tools.ietf.org/html/rfc3977#section-7.1
//
'use strict';


const from2      = require('from2');
const pump       = require('pump');
const through2   = require('through2');
const status     = require('../status');


const CMD_RE = /^LIST( (.+))?$/i;


module.exports = {
  head:     'LIST',
  validate: CMD_RE,
  pipeline: true,

  async run(session, cmd) {
    // Reject all params. All extentions are in separate files
    // and detected before this one.
    if (cmd.match(CMD_RE)[2]) return status._501_SYNTAX_ERROR;

    let groups = await session.server._getGroups(session);

    if (Array.isArray(groups)) groups = from2.obj(groups);

    let stream = through2.obj(function (group, encoding, callback) {
      this.push(`${group.name} ${group.max_index} ${group.min_index} n`);
      callback();
    });

    pump(groups, stream);

    return [
      status._215_INFO_FOLLOWS,
      stream,
      '.'
    ];
  }
};
