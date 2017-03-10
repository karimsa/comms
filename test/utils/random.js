/**
 * test/utils/random.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const crypto = require('crypto')
const randomstring = require('randomstring')

/**
 * Configuration for generation.
 */
const MAX_FIELDS_PER_TYPE = 6
const MIN_FIELDS_PER_TYPE = 2
const KEY_LENGTH = 5
const MAX_NUMBER = 9007199254740991

/**
 * Randomly generates -1 or 1.
 */
const neg = () => Math.random() > 0.5 ? 1 : -1

/**
 * Generates a random integer of given size.
 * 
 * @param {Integer} size the byte size of the random integer
 * @param {Boolean} signed whether or not to sign the integer
 * @returns {Integer} a signed or unsigned integer
 */
const int = (size, signed, suffix) =>
  crypto.randomBytes(size)['read' + (signed ? '' : 'U') + 'Int' + (size * 4) + (suffix || '')]()

/**
 * Random generators for all supported data types.
 */
const random = {
  string: () => randomstring.generate(Math.pow(Math.random() * KEY_LENGTH, 2) | 0),
  number: () => Math.pow(Math.random(), 2) * MAX_NUMBER,
  boolean: () => Math.random() > .5,
  Date: () => new Date((Math.random() * Date.now())|0),

  Int8: () => int(2, true),
  UInt8: () => int(2, false),

  Int16BE: () => int(4, true, 'BE'),
  UInt16BE: () => int(4, false, 'BE'),

  Int16LE: () => int(4, true, 'LE'),
  UInt16LE: () => int(4, false, 'LE'),

  Int32BE: () => int(8, true, 'BE'),
  UInt32BE: () => int(8, false, 'BE'),

  Int32LE: () => int(8, true, 'LE'),
  UInt32LE: () => int(8, false, 'LE'),
}

/**
 * Generates a full JSON object with some entropy
 * and some pre-configured settings.
 * @returns {Object} a random JSON object for compression
 */
module.exports = () => {
  let map = {}
  let val = {}

  for (let type of Object.keys(random)) {
    let fields = ((Math.random() * (MAX_FIELDS_PER_TYPE - MIN_FIELDS_PER_TYPE)) + MIN_FIELDS_PER_TYPE)|0

    for (let i = 0; i < fields; ++ i) {
      let key = randomstring.generate(KEY_LENGTH)

      map[key] = type
      val[key] = random[type]()
    }
  }

  return [map, val]
}
