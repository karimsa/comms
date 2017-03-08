/**
 * test/test-parser-init.js - comms
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const expect = require('expect')
const compress = require('./utils/compress')

describe('Parser#compress & Parser#decompress', () => {
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
})