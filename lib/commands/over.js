// https://tools.ietf.org/html/rfc3977#section-8.3
//
'use strict';


const status = require('../status');


const CMD_RE = /^X?OVER(?: (?:(\d{1,15})(-(\d{1,15})?)?|(<[^\s<>]+>))?)?$/i;

module.exports = {
  head:     'OVER',
  validate: CMD_RE,

  async* run(session, cmd) {
    let [ , first, dash, last, message_id ] = cmd.match(CMD_RE);

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
      let result;

      if (typeof message_id !== 'undefined') {
        result = '0';
      } else {
        result = msg.index.toString();
      }

      let fields = session.server._getOverviewFmt(session);

      for (let spec of fields) {
        let [ , field, full ] = spec.match(/^(.+?)(?::(|full))?$/i);

        let content = session.server._buildHeaderField(session, msg, field.toLowerCase()) || '';

        // unfolding + replacing invalid characters, see RFC 3977 section 8.3.2
        content = content.replace(/\r?\n/g, '').replace(/[\0\t\r\n]/g, ' ');

        if (full && content) content = field + ': ' + content;

        result += '\t' + content;
      }

      return result;
    }

    if (article_stream) {
      let count = 0;
      for await (let article of article_stream) {
        if (!count++) yield status._224_OVERVIEW_INFO;
        yield transform(article);
      }
      if (count === 0) yield status._423_NO_ARTICLE_BY_NUM;
      else yield '.';
      return;
    }

    yield status._224_OVERVIEW_INFO;
    yield transform(article);
    yield '.';
  },

  capability(session, report) {
    report.push('OVER');
  }
};
