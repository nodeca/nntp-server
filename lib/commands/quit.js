// https://tools.ietf.org/html/rfc3977#section-5.4
//
'use strict';


const status = require('../status');


module.exports = {
  head:     'QUIT',
  validate: /^QUIT$/i,
  pipeline: true,

  run() {
    return [
      status._205_QUIT,
      null // signal to close connection
    ];
  }
};
