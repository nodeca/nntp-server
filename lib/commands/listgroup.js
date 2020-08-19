// https://tools.ietf.org/html/rfc3977#section-6.1.2
//
'use strict';


const status     = require('../status');
const { Readable, Transform, pipeline } = require('stream');


const CMD_RE = /^LISTGROUP( ([^\s]+)( (\d{1,15})((-)(\d{1,15})?)?)?)?$/i;


module.exports = {
  head:     'LISTGROUP',
  validate: CMD_RE,

  async run(session, cmd) {
    // [2] -> name, [4] -> first, [5] -> last
    let match = cmd.match(CMD_RE);

    let name  = match[2],
        first = match[4],
        dash  = match[6],
        last  = match[7];

    if (name) {
      // try to select groups
      let ok = await session.server._selectGroup(session, match[2]);

      if (!ok) return status._411_GRP_NOT_FOUND;
    } else {
      // check current group
      if (!session.group.name) return status._412_GRP_NOT_SLCTD;

      name = session.group.name;
    }

    let g = session.group;

    //
    // Now group selected, need to fetch range
    //
    if (typeof first === 'undefined') {
      first = g.min_index;
      last  = g.max_index;
    } else {
      first = +first;
      if (!dash) {
        last = first;
      } else {
        last = typeof last === 'undefined' ? g.max_index : +last;
      }
    }

    let articles = await session.server._getRange(session, first, last);

    if (Array.isArray(articles)) articles = Readable.from(articles);

    let stream = new Transform({
      objectMode: true,
      transform(article, encoding, callback) {
        this.push(article.index.toString());
        callback();
      }
    });

    pipeline(articles, stream, () => {});

    return [
      `${status._211_GRP_SELECTED} ${g.total} ${g.min_index} ${g.max_index} ${name} list follows`,
      stream,
      '.'
    ];
  }
};
