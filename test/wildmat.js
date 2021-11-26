'use strict';


const assert  = require('assert');
const wildmat = require('../lib/wildmat');


describe('wildmat', function () {
  it('should not match empty string', function () {
    assert.strictEqual(wildmat('*').test(''), false);
  });

  it('should perform exact match', function () {
    assert.strictEqual(wildmat('foo,!bar,baz').test('foo'), true);
    assert.strictEqual(wildmat('foo,!bar,baz').test('bar'), false);
    assert.strictEqual(wildmat('foo,!bar,baz').test('baz'), true);
  });

  it('should return rightmost match taking into account negate', function () {
    assert.strictEqual(wildmat('foo,!foo,foo').test('foo'), true);
    assert.strictEqual(wildmat('foo,!foo,bar').test('foo'), false);
    assert.strictEqual(wildmat('foo,!foo,foo,!foo').test('foo'), false);
  });

  it('should pass RFC3977 examples', function () {
    assert.strictEqual(wildmat('a*,!*b,*c*').test('aaa'), true);
    assert.strictEqual(wildmat('a*,!*b,*c*').test('abb'), false);
    assert.strictEqual(wildmat('a*,!*b,*c*').test('ccb'), true);
    assert.strictEqual(wildmat('a*,!*b,*c*').test('xxx'), false);
  });

  it('should work with astral characters', function () {
    assert.strictEqual(wildmat('𐌀?𐌂').test('𐌀𐌁𐌂'), true);
    assert.strictEqual(wildmat('???').test('𐌀𐌁𐌂'), true);
  });

  it('should perform wildcard match', function () {
    assert.strictEqual(wildmat('foo*bar').test('foobar'), true);
    assert.strictEqual(wildmat('foo**bar').test('foobar'), true);
    assert.strictEqual(wildmat('f*r').test('foobar'), true);
    assert.strictEqual(wildmat('*foobar*').test('foobar'), true);
    assert.strictEqual(wildmat('f????r').test('foobar'), true);
    assert.strictEqual(wildmat('*').test('foobar'), true);
    assert.strictEqual(wildmat('foo?bar').test('foobar'), false);
    assert.strictEqual(wildmat('foo??*bar').test('foobar'), false);
    assert.strictEqual(wildmat('?').test('foobar'), false);
    assert.strictEqual(wildmat('z*z').test('foobar'), false);
  });

  it('should generate correct regexps for wildcards', function () {
    assert.strictEqual(wildmat('*').source, '^(.+)$');
    assert.strictEqual(wildmat('?').source, '^(.)$');
    assert.strictEqual(wildmat('?*').source, '^(..*)$');
    assert.strictEqual(wildmat('**').source, '^(.+)$');
    assert.strictEqual(wildmat('????').source, '^(....)$');
    assert.strictEqual(wildmat('?*?*?').source, '^(..*..*.)$');
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
