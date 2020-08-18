// https://tools.ietf.org/html/rfc3977#section-8.4
//
'use strict';


const status = require('../status');


const CMD_RE = /^LIST OVERVIEW\.FMT$/i;


module.exports = {
  head:     'LIST OVERVIEW.FMT',
  validate: CMD_RE,
  pipeline: true,

  async* run(session/*, cmd*/) {
    yield status._215_INFO_FOLLOWS;
    yield* session.server._getOverviewFmt(session);
    yield '.';
  },

  capability(session, report) {
    report.push([ 'LIST', 'OVERVIEW.FMT' ]);
  }
};
