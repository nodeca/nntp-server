// https://tools.ietf.org/html/rfc3977#section-6.2.3
//
'use strict';


const status = require('../status');


const CMD_RE = /^BODY( (\d{1,15}|<[^\s<>]+>))?$/i;


module.exports = {
  head:     'BODY',
  validate: CMD_RE,
  pipeline: true,

  async* run(session, cmd) {
    let match = cmd.match(CMD_RE);
    let id;

    if (!match[1]) {
      let cursor = session.group.current_article;

      if (cursor <= 0) return yield status._420_ARTICLE_NOT_SLCTD;

      id = cursor.toString();
    } else {
      id = match[2];
    }

    let by_identifier = id[0] === '<';

    if (!by_identifier && !session.group.name) {
      return yield status._412_GRP_NOT_SLCTD;
    }

    let msg = await session.server._getArticle(session, id);

    if (!msg) {
      if (by_identifier) return yield status._430_NO_ARTICLE_BY_ID;
      return yield status._423_NO_ARTICLE_BY_NUM;
    }

    if (!by_identifier) session.group.current_article = msg.index;

    let msg_id = session.server._buildHeaderField(session, msg, 'message-id');
    let msg_index = by_identifier ? 0 : id;

    yield `${status._222_BODY_FOLLOWS} ${msg_index} ${msg_id}`;
    yield session.server._buildBody(session, msg);
    yield '.';
  }
};
