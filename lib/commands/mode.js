// https://tools.ietf.org/html/rfc3977#section-3.4.2
//
// Just a stub to not return errors on "MODE READER"
//
'use strict';


module.exports = {
  head:     'MODE',
  validate: /^MODE( [^\s]+)$/i,

  // All supported params are defined in separate files
  run() {
    return '501 Unknown MODE option';
  }
};
