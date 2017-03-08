/**
 * test/compress.js - comms
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const Parser = require('../lib/parser')
const expect = require('expect')

const compress = module.exports = (map, val) => {
  let parser = new Parser(map)
  let buffer = parser.compress(val)
  let object = parser.decompress(buffer)

  expect(buffer).toBeA(Buffer)
  expect(object).toBeA('object')
  expect(object).toEqual(val)
}

module.exports.fail = (map, val, error) => {
  expect(() => {
    compress(map, val)
  }).toThrow(error)
}