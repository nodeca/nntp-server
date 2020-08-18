// https://tools.ietf.org/html/rfc4643
//
'use strict';


const status = require('../status');


const CMD_RE = /^AUTHINFO USER (.+)$/i;


module.exports = {
  head:     'AUTHINFO USER',
  validate: CMD_RE,

  async* run(session, cmd) {
    if (session.authenticated) return yield status._502_CMD_UNAVAILABLE;

    if (!session.server.options.secure &&
        !session.secure) {
      return yield status._483_NOT_SECURE;
    }

    session.authinfo_user = cmd.match(CMD_RE)[1];

    yield status._381_AUTH_NEED_PASS;
  },

  capability(session, report) {
    if (!session.authenticated &&
        (session.server.options.secure || session.secure)) {
      report.push([ 'AUTHINFO', 'USER' ]);
    }
  }
};
