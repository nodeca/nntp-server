// Alias for HDR
//
// Actually, ALL clients still use XHDR instead of HDR.
//
'use strict';

const hdr = require('./hdr');

module.exports = {
  head:     'XHDR',
  validate: hdr.validate,
  run:      hdr.run
};
