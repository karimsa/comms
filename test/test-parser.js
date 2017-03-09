/**
 * test/test-parser-init.js - comms
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const expect = require('expect')
const Parser = require('../lib/parser')
const compress = require('./utils/compress')

describe('Parser#compress & Parser#decompress', () => {
  it('init should fail on invalid type', () => {
    expect(() => {
      new Parser({ test: 'not-a-type' })
    }).toThrow(/invalid type/i)
  })

  it('init should fail on non-string type', () => {
    expect(() => {
      new Parser({ test: 0 })
    }).toThrow(/invalid/i)
  })

  it('should error out on compress of non-object', () => {
    expect(() => {
      new Parser({ test: 'string' }).compress(0)
    }).toThrow(/object/)
  })

  it('should error out on decompress of non-buffer', () => {
    expect(() => {
      new Parser({ test: 'string' }).decompress(null)
    }).toThrow(/buffer/)
  })

  describe('type strings', () => {
    it('should compress a simple string', () =>
      compress(
        { test: 'string' },
        { test: 'Hello, world.' }
      )
    )

    it('should compress an empty string', () =>
      compress(
        { test: 'string' },
        { test: '' }
      )
    )

    for (let value of [
      null, undefined, 0, true, {}, []
    ]) {
      it('should fail to compress ' + JSON.stringify(value), () => {
        compress.fail(
          { test: 'string' },
          { test: value },
          /expected string/
        )
      })
    }

    it('should fail to compress string without EOT', () => {
      let parser = new Parser({ test: 'string' })
      let buffer = parser.compress({ test: 'a' })
      buffer = buffer.slice(0, buffer.length - 1)
      
      expect(() =>
        parser.decompress(buffer)
      ).toThrow(/end of string/)
    })
  })

  describe('number type', () => {
    it('should compress a positive integer', () =>
      compress(
        { test: 'number' },
        { test: 10 }
      )
    )

    it('should compress a negative integer', () =>
      compress(
        { test: 'number' },
        { test: -10 }
      )
    )

    for (let value of [
      null, undefined, '', true, {}, []
    ]) {
      it('should fail to compress ' + JSON.stringify(value), () => {
        compress.fail(
          { test: 'number' },
          { test: value },
          /expected number/
        )
      })
    }
  })

  describe('boolean type', () => {
    it('should compress true', () =>
      compress(
        { test: 'boolean' },
        { test: true }
      )
    )

    it('should compress false', () =>
      compress(
        { test: 'boolean' },
        { test: false }
      )
    )

    for (let value of [
      null, undefined, '', 0, {}, []
    ]) {
      it('should fail to compress ' + JSON.stringify(value), () => {
        compress.fail(
          { test: 'boolean' },
          { test: value },
          /expected boolean/
        )
      })
    }
  })

  describe('RegEx type', () => {
    it('should compress /[a-z]/ as RegExp', () =>
      compress(
        { test: 'RegExp' },
        { test: /[a-z]/ }
      )
    )

    it('should compress /[a-z]/ as regex', () =>
      compress(
        { test: 'regex' },
        { test: /[a-z]/ }
      )
    )

    it('should compress with flags', () =>
      compress(
        { test: 'RegExp' },
        { test: /[a-z]/gi }
      )
    )

    for (let value of [
      null, undefined, '', 0, {}, []
    ]) {
      it('should fail to compress ' + JSON.stringify(value), () => {
        compress.fail(
          { test: 'RegExp' },
          { test: value },
          /expected RegExp/
        )
      })
    }
  })
})