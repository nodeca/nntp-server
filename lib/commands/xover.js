// Alias for OVER
//
// Actually, ALL clients still use XOVER instead of OVER.
//
'use strict';

const over = require('./over');

module.exports = {
  head:     'XOVER',
  validate: over.validate,
  run:      over.run
};
