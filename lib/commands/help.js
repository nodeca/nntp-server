// https://tools.ietf.org/html/rfc3977#section-7.2
//
'use strict';


const status = require('../status');


module.exports = {
  head:     'HELP',
  validate: /^HELP$/i,
  pipeline: true,

  * run() {
    yield status._100_HELP_FOLLOWS;
    yield '.';
  }
};
