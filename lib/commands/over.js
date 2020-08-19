// https://tools.ietf.org/html/rfc3977#section-8.3
//
'use strict';


const status     = require('../status');
const { Readable, Transform, pipeline } = require('stream');


const CMD_RE = /^X?OVER(?: (?:(\d{1,15})(-(\d{1,15})?)?|(<[^\s<>]+>))?)?$/i;

module.exports = {
  head:     'OVER',
  validate: CMD_RE,

  async run(session, cmd) {
    let [ , first, dash, last, message_id ] = cmd.match(CMD_RE);

    let article;
    let article_stream;

    if (typeof message_id !== 'undefined') {
      article = await session.server._getArticle(session, message_id);

      if (!article) return status._430_NO_ARTICLE_BY_ID;

    } else if (typeof first !== 'undefined') {
      first = +first;

      if (!dash) {
        last = first;
      } else {
        last = typeof last === 'undefined' ? session.group.max_index : +last;
      }

      if (!session.group.name) return status._412_GRP_NOT_SLCTD;

      article_stream = await session.server._getRange(session, first, last);

      if (Array.isArray(article_stream)) article_stream = Readable.from(article_stream);

    } else {
      if (session.group.current_article <= 0) return status._420_ARTICLE_NOT_SLCTD;

      article = await session.server._getArticle(session, String(session.group.current_article));

      if (!article) return status._420_ARTICLE_NOT_SLCTD;
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

      let stream = new Transform({
        objectMode: true,
        transform(article, encoding, callback) {
          if (count === 0) this.push(status._224_OVERVIEW_INFO);
          count++;
          this.push(transform(article));
          callback();
        },
        flush(callback) {
          if (count === 0) this.push(status._423_NO_ARTICLE_BY_NUM);
          else this.push('.');
          callback();
        }
      });

      pipeline(article_stream, stream, () => {});

      return stream;
    }

    return [
      status._224_OVERVIEW_INFO,
      transform(article),
      '.'
    ];
  },

  capability(session, report) {
    report.push('OVER');
  }
};
