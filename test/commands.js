
'use strict';

const net          = require('net');
const join         = require('path').join;
const asline       = require('./helpers').asline;
const mock_db      = require('./helpers').mock_db;
const Server       = require('..');


describe('commands', function () {
  let nntp, port, socket, client;

  before(function () {
    // Disable default channel ecryption check
    nntp = new Server({ secure: true });
    mock_db(nntp, join(__dirname, 'fixtures/db.yml'));

    // listen on random port
    return nntp.listen('nntp://localhost:0').then(() => {
      port = nntp.server.address().port;
    });
  });


  after(function () {
    return nntp.close();
  });


  beforeEach(function (callback) {
    socket = net.connect(port, err => {
      client = asline(socket, { timeout: 2000 }).expect(/^201/);
      callback(err);
    });
  });


  afterEach(function () {
    return client.end();
  });


  describe('ARTICLE/BODY/HEAD/STAT', function () {

    it('ARTICLE should return current article', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('ARTICLE')
        .expect('.', /first message in first group/);
    });

    it('ARTICLE should fail in empty group', function () {
      return client
        .send('GROUP test.groups.empty')
        .expect(/^211 /)
        .send('ARTICLE')
        .expect(/^420 /);
    });

    it('ARTICLE should fail without a group selected', function () {
      return client
        .send('ARTICLE 1')
        .expect(/^412 /);
    });

    it('ARTICLE should fail if no article found by id', function () {
      return client
        .send('ARTICLE <not-found@lists.example.org>')
        .expect(/^430 /);
    });

    it('ARTICLE should retrieve an article by id', function () {
      return client
        .send('ARTICLE <d417dea0c7a3@lists.example.org>')
        .expect('.', /second message in first group/);
    });

    it('ARTICLE should retrieve an article by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('ARTICLE 2')
        .expect('.', /second message in first group/);
    });

    it('ARTICLE should fail if no article found by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('ARTICLE 123456')
        .expect(/^423 /);
    });


    it('BODY should return current article', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('BODY')
        .expect('.', /first message in first group/);
    });

    it('BODY should fail in empty group', function () {
      return client
        .send('GROUP test.groups.empty')
        .expect(/^211 /)
        .send('BODY')
        .expect(/^420 /);
    });

    it('BODY should fail without a group selected', function () {
      return client
        .send('BODY 1')
        .expect(/^412 /);
    });

    it('BODY should fail if no article found by id', function () {
      return client
        .send('BODY <not-found@lists.example.org>')
        .expect(/^430 /);
    });

    it('BODY should retrieve an article body by id', function () {
      return client
        .send('BODY <d417dea0c7a3@lists.example.org>')
        .expect('.', /second message in first group/);
    });

    it('BODY should retrieve an article body by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('BODY 2')
        .expect('.', /second message in first group/);
    });

    it('BODY should fail if no article found by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('BODY 123456')
        .expect(/^423 /);
    });


    it('HEAD should return current article', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HEAD')
        .expect('221 1 <4c51f95eda05@lists.example.org>')
        .expect(/^From: /)
        .expect(/^Xref: /)
        .expect('.');
    });

    it('HEAD should fail in empty group', function () {
      return client
        .send('GROUP test.groups.empty')
        .expect(/^211 /)
        .send('HEAD')
        .expect(/^420 /);
    });

    it('HEAD should fail without a group selected', function () {
      return client
        .send('HEAD 1')
        .expect(/^412 /);
    });

    it('HEAD should fail if no article found by id', function () {
      return client
        .send('HEAD <not-found@lists.example.org>')
        .expect(/^430 /);
    });

    it('HEAD should retrieve an article header by id', function () {
      return client
        .send('HEAD <d417dea0c7a3@lists.example.org>')
        .expect('221 0 <d417dea0c7a3@lists.example.org>')
        .expect(/^From: /)
        .expect('.');
    });

    it('HEAD should retrieve an article header by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('HEAD 2')
        .expect('221 2 <d417dea0c7a3@lists.example.org>')
        .expect(/^From: /)
        .expect('.');
    });

    it('HEAD should fail if no article found by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('HEAD 123456')
        .expect(/^423 /);
    });


    it('STAT should return current article', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('STAT')
        .expect('223 1 <4c51f95eda05@lists.example.org>');
    });

    it('STAT should fail in empty group', function () {
      return client
        .send('GROUP test.groups.empty')
        .expect(/^211 /)
        .send('STAT')
        .expect(/^420 /);
    });

    it('STAT should fail without a group selected', function () {
      return client
        .send('STAT 1')
        .expect(/^412 /);
    });

    it('STAT should fail if no article found by id', function () {
      return client
        .send('STAT <not-found@lists.example.org>')
        .expect(/^430 /);
    });

    it('STAT should retrieve an article info by id', function () {
      return client
        .send('STAT <d417dea0c7a3@lists.example.org>')
        .expect('223 0 <d417dea0c7a3@lists.example.org>');
    });

    it('STAT should retrieve an article info by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('STAT 2')
        .expect('223 2 <d417dea0c7a3@lists.example.org>');
    });

    it('STAT should fail if no article found by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/)
        .send('STAT 123456')
        .expect(/^423 /);
    });
  });

  describe('CAPABILITIES', function () {
    it('should return info', function () {
      return client
        .send('CAPABILITIES')
        .expect('.', /^VERSION 2$/m);
    });
  });

  describe('AUTHINFO', function () {

    it('should success', function () {
      return client
        .send('AUTHINFO USER foo')
        .expect(/^381/)
        .send('AUTHINFO PASS bar')
        .expect(/^281/);
    });

    it('should fail', function () {
      return client
        .send('AUTHINFO USER foo')
        .expect(/^381/)
        .send('AUTHINFO PASS baddddd')
        .expect(/^481/);
    });

    it('AUTHINFO PASS out of order', function () {
      return client
        .send('AUTHINFO PASS kkk')
        .expect(/^482/);
    });

    it('not allowed twice', function () {
      return client
        .send('AUTHINFO USER foo')
        .expect(/^381/)
        .send('AUTHINFO PASS bar')
        .expect(/^281/)
        .send('AUTHINFO USER foo')
        .expect(/^502/)
        .send('AUTHINFO PASS bar')
        .expect(/^502/);
    });

    it('should announce capability', function () {
      return client
        .send('CAPABILITIES')
        .expect('.', /^AUTHINFO USER/m)
        .send('AUTHINFO USER foo')
        .expect(/^381/)
        .send('AUTHINFO PASS bar')
        .expect(/^281/)
        .send('CAPABILITIES')
        .expect('.', caps => caps.indexOf('AUTHINFO') === -1);
    });

  });


  it('DATE', function () {
    return client
      .send('DATE')
      .expect(/^111 \d{14}$/);
  });


  describe('GROUP', function () {

    it('should be ok on existing', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211/);
    });

    it('should fail on not existing', function () {
      return client
        .send('GROUP test.groups.not.exists')
        .expect(/^411/);
    });

    it('should select first message on enter', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('STAT') // check that current article is 1
        .expect(/^223 1 /)
        .send('STAT 2') // set current article to 2
        .expect(/^223 2 /)
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('STAT') // check that current article is 1
        .expect(/^223 1 /);
    });

  });


  it('HELP', function () {
    return client
      .send('HELP')
      .expect(/^100 /)
      .expect('.');
  });


  describe('LIST', function () {

    it('should announce capabilities', function () {
      return client
        .send('CAPABILITIES')
        .expect('.', /^LIST ACTIVE NEWSGROUPS/m);
    });

    it('should return active groups', function () {
      return client
        .send('LIST')
        .expect(/^215 /)
        .expect('test.groups.foo 2 1 n')
        .expect('test.groups.bar 3 1 n')
        .expect('test.groups.empty 0 0 n')
        .expect('.');
    });

    it('should fail on wrong subcommand', function () {
      return client
        .send('LIST BADSUBCOMMAND')
        .expect(/^501 /);
    });

    it('LIST ACTIVE should return groups as LIST', function () {
      return client
        .send('LIST ACTIVE')
        .expect(/^215 /)
        .expect('test.groups.foo 2 1 n')
        .expect('test.groups.bar 3 1 n')
        .expect('test.groups.empty 0 0 n')
        .expect('.');
    });

    it('LIST ACTIVE with wildmat "*.foo,*.empty"', function () {
      return client
        .send('LIST ACTIVE *.foo,*.empty')
        .expect(/^215 /)
        .expect('test.groups.foo 2 1 n')
        .expect('test.groups.empty 0 0 n')
        .expect('.');
    });

    it('LIST ACTIVE with bad wildmat', function () {
      return client
        .send('LIST ACTIVE !bad')
        .expect(/^501 /);
    });

    it('LIST NEWSGROUPS should return groups as LIST', function () {
      return client
        .send('LIST NEWSGROUPS')
        .expect(/^215 /)
        .expect('test.groups.foo\tTest newsgroup')
        .expect('test.groups.bar\t')
        .expect('test.groups.empty\tEmpty newsgroup')
        .expect('.');
    });

    it('LIST NEWSGROUPS with wildmat "*.foo,*.empty"', function () {
      return client
        .send('LIST NEWSGROUPS *.foo,*.empty')
        .expect(/^215 /)
        .expect('test.groups.foo\tTest newsgroup')
        .expect('test.groups.empty\tEmpty newsgroup')
        .expect('.');
    });

    it('LIST NEWSGROUPS with bad wildmat', function () {
      return client
        .send('LIST NEWSGROUPS !bad')
        .expect(/^501 /);
    });

    it('LIST OVERVIEW.FMT', function () {
      return client
        .send('LIST OVERVIEW.FMT')
        .expect(/^215 /)
        .expect('.', /^Subject:\r\nFrom:\r\nDate:\r\nMessage-ID:\r\nReferences:\r\n:bytes\r\n:lines\r\n/);
    });

  });


  describe('LISTGROUP', function () {

    it('should be ok on existing', function () {
      return client
        .send('LISTGROUP test.groups.foo')
        .expect(/^211 2 1 2 test.groups.foo/)
        .expect('1')
        .expect('2')
        .expect('.');
    });

    it('should fail on not existing', function () {
      return client
        .send('LISTGROUP test.groups.not.exists')
        .expect(/^411 /);
    });

    it('should fail if group not selected', function () {
      return client
        .send('LISTGROUP')
        .expect(/^412 /);
    });

    it('should be ok for current groups', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('LISTGROUP')
        .expect(/^211 2 1 2 test.groups.foo/)
        .expect('1')
        .expect('2')
        .expect('.');
    });

    it('should filter head by xxx range', function () {
      return client
        .send('LISTGROUP test.groups.foo 1')
        .expect(/^211 2 1 2 test.groups.foo/)
        .expect('1')
        .expect('.');
    });

    it('should filter head by xxx-yyy range', function () {
      return client
        .send('LISTGROUP test.groups.foo 2-5')
        .expect(/^211 2 1 2 test.groups.foo/)
        .expect('2')
        .expect('.');
    });

    it('should filter tail by xxx-yyy range', function () {
      return client
        .send('LISTGROUP test.groups.foo 0-1')
        .expect(/^211 2 1 2 test.groups.foo/)
        .expect('1')
        .expect('.');
    });

    it('should filter by xxx- range', function () {
      return client
        .send('LISTGROUP test.groups.foo 2-')
        .expect(/^211 2 1 2 test.groups.foo/)
        .expect('2')
        .expect('.');
    });

    it('should select first message on enter', function () {
      return client
        .send('LISTGROUP test.groups.foo')
        .expect('.', /^211 /)
        .send('STAT') // check that current article is 1
        .expect(/^223 1 /)
        .send('STAT 2') // set current article to 2
        .expect(/^223 2 /)
        .send('LISTGROUP test.groups.foo')
        .expect('.', /^211 /)
        .send('STAT') // check that current article is 1
        .expect(/^223 1 /);
    });

  });


  describe('HDR', function () {

    it('should get headers by message id', function () {
      return client
        .send('HDR From <4c51f95eda05@lists.example.org>')
        .expect(/^225 /)
        .expect('0 John Doe <j.doe@example.org>')
        .expect('.');
    });

    it('should get headers by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HDR From 2')
        .expect(/^225 /)
        .expect('2 Richard Roe <r.roe@example.org>')
        .expect('.');
    });

    it('should get headers by open range', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HDR From 1-')
        .expect(/^225 /)
        .expect('1 John Doe <j.doe@example.org>')
        .expect('2 Richard Roe <r.roe@example.org>')
        .expect('.');
    });

    it('should get headers by closed range', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HDR From 1-5')
        .expect(/^225 /)
        .expect('1 John Doe <j.doe@example.org>')
        .expect('2 Richard Roe <r.roe@example.org>')
        .expect('.');
    });

    it('should get headers for current message', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HDR From')
        .expect(/^225 /)
        .expect('1 John Doe <j.doe@example.org>')
        .expect('.');
    });

    it('should fail to get headers for non-existent message id', function () {
      return client
        .send('HDR From <not-found@lists.example.org>')
        .expect(/^430 /);
    });

    it('should fail to get headers for non-existent range', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HDR From 100-102')
        .expect(/^423 /);
    });

    it('should require newsgroup to be selected for range', function () {
      return client
        .send('HDR From 1-2')
        .expect(/^412 /);
    });

    it('should return non-existent headers as blanks', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('HDR References 1-5')
        .expect(/^225 /)
        .expect('1 ')
        .expect('2 ')
        .expect('.');
    });

    it('should be aliased to XHDR', function () {
      return client
        .send('XHDR From <4c51f95eda05@lists.example.org>')
        .expect(/^225 /)
        .expect('0 John Doe <j.doe@example.org>')
        .expect('.');
    });

  });


  describe('OVER', function () {
    /* eslint-disable max-len */
    let over_1_re_by_num = /^0\t\tJohn Doe <j\.doe@example\.org>\t\t<4c51f95eda05@lists\.example\.org>\t\t\d+\t\d+\tXref: localhost test.groups.foo:1$/;
    let over_1_re = /^1\t\tJohn Doe <j\.doe@example\.org>\t\t<4c51f95eda05@lists\.example\.org>\t\t\d+\t\d+\tXref: localhost test.groups.foo:1$/;
    let over_2_re = /^2\t\tRichard Roe <r\.roe@example\.org>\t\t<d417dea0c7a3@lists\.example\.org>\t\t\d+\t\d+\t$/;
    /* eslint-enable max-len */

    it('should get overview by message id', function () {
      return client
        .send('OVER <4c51f95eda05@lists.example.org>')
        .expect(/^224 /)
        .expect(over_1_re_by_num)
        .expect('.');
    });

    it('should get overview by number', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('OVER 2')
        .expect(/^224 /)
        .expect(over_2_re)
        .expect('.');
    });

    it('should get overview by open range', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('OVER 1-')
        .expect(/^224 /)
        .expect(over_1_re)
        .expect(over_2_re)
        .expect('.');
    });

    it('should get overview by closed range', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('OVER 1-5')
        .expect(/^224 /)
        .expect(over_1_re)
        .expect(over_2_re)
        .expect('.');
    });

    it('should get overview for current message', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('OVER')
        .expect(/^224 /)
        .expect(over_1_re)
        .expect('.');
    });

    it('should fail to get overview for non-existent message id', function () {
      return client
        .send('OVER <not-found@lists.example.org>')
        .expect(/^430 /);
    });

    it('should fail to get overview for non-existent range', function () {
      return client
        .send('GROUP test.groups.foo')
        .expect(/^211 /)
        .send('OVER 100-102')
        .expect(/^423 /);
    });

    it('should require newsgroup to be selected for range', function () {
      return client
        .send('OVER 1-2')
        .expect(/^412 /);
    });

    it('should be aliased to XOVER', function () {
      return client
        .send('XOVER <4c51f95eda05@lists.example.org>')
        .expect(/^224 /)
        .expect(over_1_re_by_num)
        .expect('.');
    });

  });


  describe('MODE', function () {

    it('should announce capability', function () {
      return client
        .send('CAPABILITIES')
        .expect('.', /^READER$/m);
    });

    it('MODE READER', function () {
      return client
        .send('MODE READER')
        .expect(/^201 /);
    });

    it('MODE POSTER', function () {
      return client
        .send('MODE POSTER')
        .expect('501 Unknown MODE option');
    });
  });


  describe('NEWGROUPS', function () {

    it('2-digits year (previous century)', function () {
      return client
        .send('NEWGROUPS 990101 000000')
        .expect(/^215 /)
        .expect('test.groups.foo 2 1 n')
        .expect('test.groups.bar 3 1 n')
        .expect('.');
    });

    it('2-digits year (current century)', function () {
      return client
        .send('NEWGROUPS 110101 000000')
        .expect(/^215 /)
        .expect('test.groups.bar 3 1 n')
        .expect('.');
    });

    it('4-digits year', function () {
      return client
        .send('NEWGROUPS 19990101 000000')
        .expect(/^215 /)
        .expect('test.groups.foo 2 1 n')
        .expect('test.groups.bar 3 1 n')
        .expect('.');
    });

  });


  describe('NEWNEWS', function () {

    it('bad wildmat', function () {
      return client
        .send('NEWNEWS !bad 19990101 000000')
        .expect(/^501 /);
    });

    it('2-digits year (previous century)', function () {
      return client
        .send('NEWNEWS * 990101 000000')
        .expect(/^230 /)
        .expect('<d417dea0c7a3@lists.example.org>')
        .expect('<1ce0bf1e35b4@lists.example.org>')
        .expect('<535b279b4bb9@lists.example.org>')
        .expect('.');
    });

    it('2-digits year (current century)', function () {
      return client
        .send('NEWNEWS * 160101 000000')
        .expect(/^230 /)
        .expect('<d417dea0c7a3@lists.example.org>')
        .expect('<1ce0bf1e35b4@lists.example.org>')
        .expect('<535b279b4bb9@lists.example.org>')
        .expect('.');
    });

    it('4-digits year', function () {
      return client
        .send('NEWNEWS * 19990101 000000')
        .expect(/^230 /)
        .expect('<d417dea0c7a3@lists.example.org>')
        .expect('<1ce0bf1e35b4@lists.example.org>')
        .expect('<535b279b4bb9@lists.example.org>')
        .expect('.');
    });

    it('limit by a wildmat', function () {
      return client
        .send('NEWNEWS *foo 19990101 000000')
        .expect(/^230 /)
        .expect('<d417dea0c7a3@lists.example.org>')
        .expect('.');
    });

  });


  it('QUIT', function () {
    let wait_for_close = new Promise(resolve => {
      socket.on('close', resolve);
    });

    return client
      .send('QUIT')
      .expect(/^205 /)
      .then(() => wait_for_close);
  });


  it('should fail on unknown command', function () {
    return client
      .send('qwerty')
      .expect(/^500 /);
  });
});
