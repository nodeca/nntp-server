// https://tools.ietf.org/html/rfc3977#section-7.6.6
//
'use strict';


const status     = require('../status');
const wildmat_re = require('../wildmat');


const CMD_RE = /^LIST NEWSGROUPS( ([^\s]+))?$/i;


module.exports = {
  head:     'LIST NEWSGROUPS',
  validate: CMD_RE,
  pipeline: true,

  async* run(session, cmd) {
    let wildmat = null;

    if (cmd.match(CMD_RE)[2]) {
      try {
        wildmat = wildmat_re(cmd.match(CMD_RE)[2]);
      } catch (err) {
        return yield `501 ${err.message}`;
      }
    }

    yield status._215_INFO_FOLLOWS;

    for await (let group of session.server._getGroups(session, 0, wildmat)) {
      yield `${group.name}\t${group.description || ''}`;
    }

    yield '.';
  },

  capability(session, report) {
    report.push([ 'LIST', 'NEWSGROUPS' ]);
  }
};
