// https://tools.ietf.org/html/rfc3977#section-7.6.6
//
'use strict';


const status     = require('../status');
const wildmat_re = require('../wildmat');
const { Readable, Transform, pipeline } = require('stream');


const CMD_RE = /^LIST NEWSGROUPS( ([^\s]+))?$/i;


module.exports = {
  head:     'LIST NEWSGROUPS',
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

    if (Array.isArray(groups)) groups = Readable.from(groups);

    let stream = new Transform({
      objectMode: true,
      transform(group, encoding, callback) {
        this.push(`${group.name}\t${group.description || ''}`);
        callback();
      }
    });

    pipeline(groups, stream, () => {});

    return [
      status._215_INFO_FOLLOWS,
      stream,
      '.'
    ];
  },

  capability(session, report) {
    report.push([ 'LIST', 'NEWSGROUPS' ]);
  }
};
