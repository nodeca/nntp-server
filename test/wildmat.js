'use strict';


const assert  = require('assert');
const wildmat = require('../lib/wildmat');


describe('wildmat', function () {
  it('should not match empty string', function () {
    assert(!wildmat('*').test(''));
  });

  it('should perform exact match', function () {
    assert(wildmat('foo,!bar,baz').test('foo'));
    assert(!wildmat('foo,!bar,baz').test('bar'));
    assert(wildmat('foo,!bar,baz').test('baz'));
  });

  it('should return rightmost match taking into account negate', function () {
    assert(wildmat('foo,!foo,foo').test('foo'));
    assert(!wildmat('foo,!foo,bar').test('foo'));
    assert(!wildmat('foo,!foo,foo,!foo').test('foo'));
  });

  it('should pass RFC3977 examples', function () {
    assert(wildmat('a*,!*b,*c*').test('aaa'));
    assert(!wildmat('a*,!*b,*c*').test('abb'));
    assert(wildmat('a*,!*b,*c*').test('ccb'));
    assert(!wildmat('a*,!*b,*c*').test('xxx'));
  });

  it('should work with astral characters', function () {
    assert(wildmat('𐌀?𐌂').test('𐌀𐌁𐌂'));
    assert(wildmat('???').test('𐌀𐌁𐌂'));
  });

  it('should perform wildcard match', function () {
    assert(wildmat('foo*bar').test('foobar'));
    assert(wildmat('foo**bar').test('foobar'));
    assert(wildmat('f*r').test('foobar'));
    assert(wildmat('*foobar*').test('foobar'));
    assert(wildmat('f????r').test('foobar'));
    assert(wildmat('*').test('foobar'));
    assert(!wildmat('foo?bar').test('foobar'));
    assert(!wildmat('foo??*bar').test('foobar'));
    assert(!wildmat('?').test('foobar'));
    assert(!wildmat('z*z').test('foobar'));
  });

  it('should generate correct regexps for wildcards', function () {
    assert.equal(wildmat('*').source, '^(.+)$');
    assert.equal(wildmat('?').source, '^(.)$');
    assert.equal(wildmat('?*').source, '^(..*)$');
    assert.equal(wildmat('**').source, '^(.+)$');
    assert.equal(wildmat('????').source, '^(....)$');
    assert.equal(wildmat('?*?*?').source, '^(..*..*.)$');
  });

  it('should throw on invalid wildmat', function () {
    assert.throws(() => wildmat('[foo-bar]'));
    assert.throws(() => { wildmat(''); });
    assert.throws(() => { wildmat(','); });
    assert.throws(() => { wildmat('foo,,bar'); });
    assert.throws(() => { wildmat('['); });
    assert.throws(() => { wildmat(']'); });
    assert.throws(() => { wildmat('!'); });
    assert.throws(() => { wildmat('!foo'); });
  });

  it('should not allow computation-heavy patterns', function () {
    // /.*?a.*?a.*?a.*?a.*?!/.test('a'.repeat(100)) hangs up,
    // so we should limit an amount of asterisks somehow
    //
    assert.throws(() => wildmat('*a*a*a*a*a*!'));
    assert.throws(() => wildmat('***'));
  });
});
