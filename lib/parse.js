/**
 * lib/parser.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const chalk = require('chalk')
const assert = require('assert')
const getType = require('type-detect')
const debug = require('debug')('fldsmdfr')

const TYPES = require('./types')

/**
 * Decompresses a buffer object into a JSON object.
 * 
 * @param {Buffer} buffer a buffer of the compressed JSON object
 * @returns {Object} final JSON object constructed from buffer
 */
module.exports = function decompress (buffer, model) {
  assert(buffer instanceof Buffer, 'Decompress must be passed a buffer.')
  assert(typeof model === 'object', 'You must provide a type mapping to decompress objects with fldsmdfr.')

  const object = {}

  for (const key of Object.keys(model).sort()) {
    let value, _buffer

    if (typeof model[key] === 'string') {
      const type = TYPES.getReal(model[key])

      // verify that there is a compressor function available for this
      // particular type
      if (!TYPES.supported(model[key])) {
        throw new Error(`Key "${key}" has unsupported type "${model[key]}".`)
      }

      // warning for types that are dynamically typed, since
      // these will be slow
      if (TYPES.slowType(model[key])) {
        console.warn('%s: %s is a slow type.', chalk.yellow('warning'), model[key])
      }

      // decompress using defined decompressor
      [value, _buffer] = TYPES[type].decompress(buffer)
    } else {
      // TODO: support for nested objects
    }

    debug('decompressed [%s]: %s [%sb]\n', key, value, buffer.length - _buffer.length)

    object[key] = value
    buffer = _buffer
  }

  return object
}