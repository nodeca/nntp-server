// https://tools.ietf.org/html/rfc3977#section-6.1.1
//
'use strict';


const status = require('../status');


const CMD_RE = /^GROUP ([^\s]+)$/i;


module.exports = {
  head:     'GROUP',
  validate: CMD_RE,

  async* run(session, cmd) {
    let name = cmd.match(CMD_RE)[1];

    let ok = await session.server._selectGroup(session, name);

    if (!ok) return yield status._411_GRP_NOT_FOUND;

    let g = session.group;

    yield `${status._211_GRP_SELECTED} ${g.total} ${g.min_index} ${g.max_index} ${name}`;
  }
};
