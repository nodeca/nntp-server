// https://tools.ietf.org/html/rfc3977#section-7.1
//
'use strict';


const from2      = require('from2');
const pump       = require('pump');
const through2   = require('through2');
const status     = require('../status');
const wildmat_re = require('../wildmat');


const CMD_RE = /^LIST ACTIVE( ([^\s]+))?$/i;


module.exports = {
  head:     'LIST ACTIVE',
  validate: CMD_RE,
  pipeline: true,

  async run(session, cmd) {
    let wildmat = null;

    if (cmd.match(CMD_RE)[2]) {
      try {
        wildmat = wildmat_re(cmd.match(CMD_RE)[2]);
      } catch (err) {
        return `501 ${err.message}`;
      }
    }

    let groups = await session.server._getGroups(session, 0, wildmat);

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
  },

  capability(session, report) {
    report.push([ 'LIST', 'ACTIVE' ]);
  }
};
