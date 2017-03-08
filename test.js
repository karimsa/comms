const assert = require('assert')
const Parser = require('./lib/parser')
const compress = (map, val) => {
  let parser = new Parser(map)
  let buffer = parser.compress(val)

  console.log(
    '(%s%) compressed form is %s bytes, stringified form is %s bytes',
    Math.round(10000 * (1 - (buffer.length / JSON.stringify(val).length))) / 100,
    buffer.length,
    JSON.stringify(val).length
  )

  let object = parser.parse(buffer)

  console.log('\n%j <=> %j\n', val, object)
  assert.deepEqual(val, object)
}

compress(
  {
    x: 'UInt16BE',
    y: 'UInt16BE'
  },
  {
    x: 10,
    y: 10
  }
)