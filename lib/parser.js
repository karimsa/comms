/**
 * lib/parser.js - fldsmdfr
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

const chalk = require('chalk')
const getType = require('type-detect')
const debug = require('util').debuglog('fldsmdfr')

const TYPES = require('./types')

module.exports = class Parser {
  constructor (model) {
    model = JSON.parse(JSON.stringify(model))
    this._given = JSON.parse(JSON.stringify(model))

    for (let key in model) {
      if (model.hasOwnProperty(key)) {
        if (typeof model[key] === 'string') {
          model[key] = TYPES.getReal(model[key])

          if (!TYPES.supported(model[key])) {
            throw new Error(`Key "${key}" has invalid type "${model[key]}".`)
          }

          // warning for types that are dynamically typed, since
          // these will be slow
          if (TYPES.slowType(model[key])) {
            console.warn('%s: %s is a slow type.', chalk.yellow('warning'), model[key])
          }
        } else if (typeof model[key] === 'object') {
          // TODO: support for nested objects
        } else {
          throw new Error(`Type of "${typeof model[key]}" is invalid.`)
        }
      }
    }

    this._model = model
    this._keys = Object.keys(model)
  }

  /**
   * Compressed a JSON object into a buffer.
   * 
   * @param {Object} data the object that needs to be compressed in object form
   * @returns {Buffer} the compressed JSON object in a binary buffer
   */
  compress (data) {
    if (typeof data !== 'object') {
      throw new Error('You can only compress objects.')
    }

    let buffers = []

    for (let key of this._keys) {
      let value

      if (typeof this._model[key] === 'string') {
        let type = getType(data[key])
        if (!TYPES.typeCheck(type, this._model[key])) {
          throw new Error(`Value "${key}" is of type ${type} (expected ${this._given[key]}).`)
        }

        value = TYPES[this._model[key]].compress(data[key])
      } else {
        // TODO: support for nested values
      }

      debug('(%j)[%s] = %j', this._model, key, value)
      buffers.push(value)
    }

    // concat all values
    return Buffer.concat(buffers)
  }

  /**
   * Decompresses a buffer object into a JSON object.
   * 
   * @param {Buffer} buffer a buffer of the compressed JSON object
   * @returns {Object} final JSON object constructed from buffer
   */
  decompress (buffer) {
    if (!(buffer instanceof Buffer)) {
      throw new Error('Decompress must be passed a buffer.')
    }

    let object = {}

    for (let key of this._keys) {
      let value, _buffer

      debug('decompressing "%s"', key)

      if (typeof this._model[key] === 'string') {
        [value, _buffer] = TYPES[this._model[key]].decompress(buffer)
      } else {
        // TODO: support for nested objects
      }

      debug('decompressed %s bytes\n', buffer.length - _buffer.length)
      object[key] = value
      buffer = _buffer
    }

    return object
  }

  /**
   * @returns {Object} a map representing the parser config
   */
  toJSON () {
    return Object.assign({}, this._model)
  }
}
