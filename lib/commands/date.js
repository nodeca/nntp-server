// https://tools.ietf.org/html/rfc3977#section-7.1
//
'use strict';


const status = require('../status');


// 1 -> 01
function pad2(value) {
  return value < 10 ? '0' + value : '' + value;
}


module.exports = {
  head:     'DATE',
  validate: /^DATE$/i,
  pipeline: true,

  run() {
    let now = new Date();

    return [
      status._111_DATE,
      ' ',
      now.getUTCFullYear(),
      pad2(now.getUTCMonth() + 1),
      pad2(now.getUTCDate()),
      pad2(now.getUTCHours()),
      pad2(now.getUTCMinutes()),
      pad2(now.getUTCSeconds())
    ].join('');
  }
};
