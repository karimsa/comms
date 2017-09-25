/**
 * lib/stringify.js - fldsmdfr
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
 * Compressed a JSON object into a buffer.
 * 
 * @param {Object} data the object that needs to be compressed in object form
 * @returns {Buffer} the compressed JSON object in a binary buffer
 */
module.exports = function compress (data, model) {
  assert(typeof data === 'object', 'You can only compress objects.')
  assert(typeof model === 'object', 'You must provide a type mapping to compress objects with fldsmdfr.')

  const buffers = []

  for (const key of Object.keys(model).sort()) {
    let value

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

      const dataType = getType(data[key])
      if (!TYPES.typeCheck(dataType, type)) {
        throw new Error(`Value "${key}" is of type ${dataType} (expected ${type}).`)
      }

      value = TYPES[type].compress(data[key])
    } else if (typeof model[key] === 'object') {
      // TODO: support for nested objects
    } else {
      throw new Error(`Invalid value at key: ${key}.`)
    }

    debug('stringified [%s]: %s => %j', key, data[key], value)
    buffers.push(value)
  }

  // concat all values
  return Buffer.concat(buffers)
}