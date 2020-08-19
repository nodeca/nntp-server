// https://tools.ietf.org/html/rfc3977#section-7.1
//
'use strict';


const status     = require('../status');
const { Readable, Transform, pipeline } = require('stream');

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

    if (Array.isArray(groups)) groups = Readable.from(groups);

    let stream = new Transform({
      objectMode: true,
      transform(group, encoding, callback) {
        this.push(`${group.name} ${group.max_index} ${group.min_index} n`);
        callback();
      }
    });

    pipeline(groups, stream, () => {});

    return [
      status._215_INFO_FOLLOWS,
      stream,
      '.'
    ];
  }
};
