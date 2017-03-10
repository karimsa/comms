/**
 * test/compress.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const Parser = require('../../lib/parser')
const TYPES = require('../../lib/types')
const expect = require('expect')

const compress = module.exports = (map, val) => {
  let parser = new Parser(map)
  let buffer = parser.compress(val)
  let object = parser.decompress(buffer)

  // verify that toJSON works properly
  let testJSON = (obj, mp) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') expect(TYPES.typeCheck(mp[key], obj[key])).toBe(true)
        else testJSON(obj[key], mp[key])
      }
    }
  }
  testJSON(parser.toJSON(), map)

  expect(buffer).toBeA(Buffer)
  expect(object).toBeA('object')
  expect(object).toEqual(val)
}

module.exports.fail = (map, val, error) => {
  expect(() => {
    compress(map, val)
  }).toThrow(error)
}
