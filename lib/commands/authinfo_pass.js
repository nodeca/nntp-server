// https://tools.ietf.org/html/rfc4643
//
'use strict';


const status = require('../status');


const CMD_RE = /^AUTHINFO PASS (.+)$/i;


module.exports = {
  head:     'AUTHINFO PASS',
  validate: CMD_RE,

  run(session, cmd) {
    if (session.authenticated) return status._502_CMD_UNAVAILABLE;

    if (!session.authinfo_user) return status._482_AUTH_OUT_OF_SEQ;

    session.authinfo_pass = cmd.match(CMD_RE)[1];

    return session.server._authenticate(session)
      .then(success => {
        if (!success) {
          session.authinfo_user = null;
          session.authinfo_pass = null;
          return status._481_AUTH_REJECTED;
        }

        session.authenticated = true;
        return status._281_AUTH_ACCEPTED;
      });
  }
};
