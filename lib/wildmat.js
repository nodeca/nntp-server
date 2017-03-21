// https://tools.ietf.org/html/rfc3977#section-4.1
//
// Create RegExp from wildmat patterns
//
'use strict';


// Escape RE without * and ?
// (full escape uses /([.?*+^$[\]\\(){}|-])/)
//
function escape(src) {
  return String(src).replace(/([.+^$[\]\\(){}|-])/g, '\\$1');
}


module.exports = function wildmat(wm) {
  // Since rules are simple, use simple replace
  // steps instead of scanner.

  if (!wm) throw new Error('empty wildmat not allowed');

  if (/^,|,$/.test(wm)) throw new Error('"," not allowed at start/end of wildmat');
  if (/,,/.test(wm))    throw new Error('",," not allowed in wildmat');

  // Split by "," and mark negative
  let patterns = wm.split(',').map(p => ({
    match: p[0] === '!' ? p.slice(1) : p,
    neg:   p[0] === '!'
  }));

  patterns.forEach(p => {
    if (/[\\[\]]/.test(p.match)) {
      throw new Error('"\\", "[" and "]" not allowed in wildmat');
    }

    if (p.neg && !p.match) {
      throw new Error('empty negative condition not allowed');
    }

    if (/\*.*\*.*\*/.test(p.match)) {
      throw new Error('too many asteriscs');
    }

    p.match = p.match.replace(/\*+/g, '*');

    if (p.match === '*') {
      // Special case, should not match empty string
      p.match = '.+';
    } else {
      p.match = escape(p.match)
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    }
  });

  // Remove heading negative conditions (should be ignored)
  while (patterns.length && patterns[0].neg) patterns.shift();

  if (!patterns.length) {
    throw new Error('wildmat should have positive condition');
  }

  // compose full RE from parts
  //
  // pos,neg => ^(?!neg$)(pos)$

  let res_head = '^(';
  let res_tail = ')$';

  for (let i = patterns.length - 1; i >= 0; i--) {
    let p = patterns[i];

    if (p.neg) {
      // negative pattern
      res_head += `((?!${p.match}$)(`;
      res_tail = '))' + res_tail;
    } else {
      // positive pattern
      res_head += p.match;
      if (i > 0) res_head += '|';
    }
  }

  return new RegExp(res_head + res_tail, 'u');
};
