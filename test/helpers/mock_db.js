
'use strict';

const fs     = require('fs');
const yaml   = require('js-yaml');
const { Readable } = require('stream');


module.exports = function mock_db(nntp, fixture_path) {

  let { groups, messages } = yaml.safeLoad(fs.readFileSync(fixture_path));

  nntp._getGroups = function (session, ts, wildmat) {
    let result = groups
      .filter(g => !ts || g.create_ts > ts)
      .filter(g => (wildmat ? wildmat.test(g.name) : true));

    return Readable.from(result);
  };

  nntp._selectGroup = function (session, group_id) {
    let grp = groups.filter(g => g.name === group_id)[0];

    if (grp) {
      session.group = Object.assign({}, grp);
      session.group.current_article = grp.total ? grp.min_index : 0;

      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  };

  nntp._getArticle = function (session, message_id) {
    let match, msg;

    match = message_id.match(/^<([^<>]+)>$/);

    if (match) {
      let id = match[1];
      msg = messages.filter(m => m.id === id)[0];

    } else {
      match = message_id.match(/^(\d+)$/);

      if (match) {
        let index = Number(match[1]);

        msg = messages
          .filter(m => m.group === session.group.name)
          .filter(m => m.index === index)[0];
      }
    }

    // Yaml data can have unnecesary tail
    if (msg) {
      msg.head = msg.head.trimRight();
      msg.body = msg.body.trimRight();
    }

    return Promise.resolve(msg || null);
  };

  nntp._getRange = function (session, first, last) {
    let result = messages
      .filter(m => m.group === session.group.name)
      .filter(m => m.index >= first && m.index <= last);

    return Readable.from(result);
  };

  nntp._getNewNews = function (session, ts, wildmat) {
    let result = messages
      .filter(msg => !ts || msg.ts > ts)
      .filter(msg => (wildmat ? wildmat.test(msg.group) : true));

    return Readable.from(result);
  };

  nntp._buildHead = function (session, msg) { return msg.head; };

  nntp._buildBody = function (session, msg) { return msg.body; };

  nntp._buildHeaderField = function (session, msg, field) {
    switch (field) {
      case ':lines':
        return msg.body.split('\n').length.toString();

      case ':bytes':
        return Buffer.byteLength(msg.body).toString();

      case 'message-id':
        return '<' + msg.id + '>';

      default:
        let match = msg.head
          .split('\n')
          .map(str => str.match(/^(.*?):\s*(.*)$/))
          .filter(m => m && m[1].toLowerCase() === field);

        return match.length ? match[0][2] : null;
    }
  };

  nntp._authenticate = function (session) {
    return Promise.resolve(
      session.authinfo_user === 'foo' &&
      session.authinfo_pass === 'bar'
    );
  };

  nntp._onError = function (err) {
    // make tests fail; we can't just throw error because node.js
    // does not yet abort on unhandled exceptions
    /* eslint-disable no-console */
    console.log(err);
    process.exit(1);
  };

  return nntp;
};
