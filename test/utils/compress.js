/**
 * test/compress.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const expect = require('expect')

const compress = module.exports = (map, val) => {
  const buffer = BJSON.stringify(val, map)
  const object = BJSON.parse(buffer, map)

  expect(buffer).toBeA(Buffer)
  expect(object).toBeA('object')
  expect(object).toEqual(val)
}

module.exports.fail = (map, val, error) => {
  expect(() => {
    compress(map, val)
  }).toThrow(error)
}
