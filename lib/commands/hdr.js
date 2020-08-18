// https://tools.ietf.org/html/rfc3977#section-8.5
//
'use strict';


const status = require('../status');


const CMD_RE = /^X?HDR ([^\s]+)(?: (?:(\d{1,15})(-(\d{1,15})?)?|(<[^\s<>]+>))?)?$/i;

module.exports = {
  head:     'HDR',
  validate: CMD_RE,

  async* run(session, cmd) {
    let [ , field, first, dash, last, message_id ] = cmd.match(CMD_RE);

    field = field.toLowerCase();

    let article;
    let article_stream;

    if (typeof message_id !== 'undefined') {
      article = await session.server._getArticle(session, message_id);

      if (!article) return yield status._430_NO_ARTICLE_BY_ID;

    } else if (typeof first !== 'undefined') {
      first = +first;

      if (!dash) {
        last = first;
      } else {
        last = typeof last === 'undefined' ? session.group.max_index : +last;
      }

      if (!session.group.name) return yield status._412_GRP_NOT_SLCTD;

      article_stream = await session.server._getRange(session, first, last);

    } else {
      if (session.group.current_article <= 0) return yield status._420_ARTICLE_NOT_SLCTD;

      article = await session.server._getArticle(session, String(session.group.current_article));

      if (!article) return yield status._420_ARTICLE_NOT_SLCTD;
    }

    function transform(msg) {
      let index;

      if (typeof message_id !== 'undefined') {
        index = '0';
      } else {
        index = msg.index.toString();
      }

      let content = (session.server._buildHeaderField(session, msg, field) || '');

      // unfolding + replacing invalid characters, see RFC 3977 section 8.3.2
      content = content.replace(/\r?\n/g, '').replace(/[\0\t\r\n]/g, ' ');

      return index + ' ' + content;
    }

    if (article_stream) {
      let count = 0;
      for await (let article of article_stream) {
        if (!count++) yield status._225_HEADERS_FOLLOW;
        yield transform(article);
      }
      if (count === 0) yield status._423_NO_ARTICLE_BY_NUM;
      else yield '.';
      return;
    }

    yield status._225_HEADERS_FOLLOW;
    yield transform(article);
    yield '.';
  },

  capability(session, report) {
    report.push('HDR');
  }
};
