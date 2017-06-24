// https://tools.ietf.org/html/rfc3977#section-5.2
//
'use strict';


const status = require('../status');


module.exports = {
  head:     'CAPABILITIES',
  // Param is not used, but spec requires to support it.
  validate: /^CAPABILITIES( ([a-zA-Z\-_0-9]+))?$/i,

  run(session) {
    let report = [
      [ 'VERSION', 2 ]
    ];

    // Collect
    Object.keys(session.server.options.commands).forEach(name => {
      let conf = session.server.options.commands[name];

      if (!conf.capability) return;

      conf.capability(session, report);
    });

    let uniq = {};

    // Flatten options for duplicated names
    report.forEach(feature => {
      if (typeof feature === 'string') {
        uniq[feature] = [];
      } else {
        let name = feature[0];
        if (!uniq[name]) uniq[name] = [];
        uniq[name] = uniq[name].concat(feature.slice(1));
      }
    });

    return [ status._101_CAPABILITY_LIST ]
      .concat(Object.keys(uniq).map(k => [ k ].concat(uniq[k]).join(' ')))
      .concat([ '.' ]);
  }
};
