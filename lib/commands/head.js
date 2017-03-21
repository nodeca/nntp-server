// https://tools.ietf.org/html/rfc3977#section-6.2.2
//
'use strict';


const status = require('../status');


const CMD_RE = /^HEAD( (\d{1,15}|<[^\s<>]+>))?$/i;


module.exports = {
  head:     'HEAD',
  validate: CMD_RE,
  pipeline: true,

  run(session, cmd) {
    let match = cmd.match(CMD_RE);
    let id;

    if (!match[1]) {
      let cursor = session.group.current_article;

      if (cursor <= 0) return status._420_ARTICLE_NOT_SLCTD;

      id = cursor.toString();
    } else {
      id = match[2];
    }

    let by_identifier = id[0] === '<';

    if (!by_identifier && !session.group.name) {
      return status._412_GRP_NOT_SLCTD;
    }

    return session.server._getArticle(session, id)
      .then(msg => {
        if (!msg) {
          if (by_identifier) return status._430_NO_ARTICLE_BY_ID;
          return status._423_NO_ARTICLE_BY_NUM;
        }

        if (!by_identifier) session.group.current_article = msg.index;

        let msg_id = session.server._buildHeaderField(session, msg, 'message-id');
        let msg_index = by_identifier ? 0 : id;

        return [
          `${status._221_HEAD_FOLLOWS} ${msg_index} ${msg_id}`,
          session.server._buildHead(session, msg),
          '.'
        ];
      });
  }
};
