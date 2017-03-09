/**
 * lib/types.js - comms
 * 
 * Licensed under MIT license.
 * Copyright (C) 2017 Karim Alibhai.
 */

/**
 * Map of types and type compressors.
 */
const TYPES = {
  /**
   * Strings should be converted to a buffer
   * as expected (where utf-8 is the encoding).
   */
  string: {
    compress: value => Buffer.concat([
      Buffer.from(value, 'utf8'),
      Buffer.from([ 0x02 ])
    ]),

    decompress: buffer => {
      for (let i = 0; i < buffer.length; i += 1) {
        if (buffer[i] === 0x02) {
          return [
            buffer.slice(0, i).toString('utf8'),
            buffer.slice(i + 1)
          ]
        }
      }

      throw new Error('Unable to find end of string.')
    }
  },

  /**
   * A boolean value should just be 0 or 1.
   */
  boolean: {
    compress: value => Buffer.from([ +!!value ]),

    decompress: buffer => [
      buffer[0] === 0x01,
      buffer.slice(1)
    ]
  },

  /**
   * Regular expressions can be casted to strings.
   */
  RegExp: {
    compress: value => TYPES.string.compress(String(value)),

    decompress: buffer => {
      let [string, _buffer] = TYPES.string.decompress(buffer)
      let lastSlash = string.lastIndexOf('/')

      return [
        new RegExp(
          string.substr(1, lastSlash - 1),
          string.substr(lastSlash + 1)
        ),
        _buffer
      ]
    }
  },

  /**
   * Dates are saved as timestamps (which are just numbers).
   */
  Date: {
    compress: value => TYPES.DoubleBE.compress(value),

    decompress: buffer => {
      let [ts, _buffer] = TYPES.DoubleBE.decompress(buffer)
      return [new Date(ts), _buffer]
    }
  }
}

/**
 * List of types that can be coerced to super type.
 */
const TYPE_ALIASES = {
  'DoubleBE': [ 'number', 'Number' ],
  'Array': [ 'Arguments' ],
  'RegExp': [ 'regex' ]
}

/**
 * Adds a type based on Buffer method.
 */
function addBufferType(type, size) {
  TYPES[type] = {
    compress: value => {
      let buffer = Buffer.alloc(size)
      buffer['write' + type](value)
      return buffer
    },

    decompress: buffer => {
      return [
        buffer['read' + type](),
        buffer.slice(size)
      ]
    }
  }

  // if alias list already exists, we want to maintain it
  TYPE_ALIASES[type] = TYPE_ALIASES[type] || []

  // if number alias does not exist, we should add it
  if (TYPE_ALIASES[type].indexOf('number') === -1) {
    TYPE_ALIASES[type].push('number')
  }
}

/**
 * Add all buffer types.
 */
addBufferType('Int8', 1)
addBufferType('UInt8', 1)

addBufferType('Int16BE', 2)
addBufferType('Int16LE', 2)

addBufferType('UInt16BE', 2)
addBufferType('UInt16LE', 2)

addBufferType('Int32BE', 4)
addBufferType('Int32LE', 4)

addBufferType('UInt32BE', 4)
addBufferType('UInt32LE', 4)

addBufferType('DoubleBE', 8)
addBufferType('DoubleLE', 8)

/**
 * Flatten alias map into list of possible
 * aliases.
 */
const ALIASES = Object.keys(TYPE_ALIASES)
  .map(key => TYPE_ALIASES[key])
  .reduce((a, b) => a.concat(b), [])

/**
 * Total list of supported types.
 */
TYPES._all = ALIASES.concat(Object.keys(TYPES).filter(key =>
  typeof TYPES[key] === 'object'
))

/**
 * Check for type support.
 */
TYPES.supported = type =>
  type !== 'supported' &&
  type !== 'slowType' &&
  type !== 'typeCheck' &&
  (
    TYPES.hasOwnProperty(type) ||
    ALIASES.indexOf(type) !== -1
  )

/**
 * Convert a type into its super type.
 */
TYPES.getReal = type => {
  for (let key in TYPE_ALIASES) {
    if (TYPE_ALIASES.hasOwnProperty(key) && TYPE_ALIASES[key].indexOf(type) !== -1) {
      return key
    }
  }

  return type
}

/**
 * Warn about slow types.
 */
TYPES.slowType = type =>
  [
    'array',
    'Array',
    'Object'
  ].indexOf(type) !== -1

/**
 * Verifies that given type matches expected type.
 */
TYPES.typeCheck = (given, expected) =>
  expected === given ||
  (TYPE_ALIASES[expected] || []).indexOf(given) !== -1

// expose
module.exports = TYPES