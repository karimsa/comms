const BJSON = require('../../')
const randomobj = require('../utils/random')

const MAX_OBJECTS = parseInt(process.env.MAX_OBJECTS || '100', 10)

/**
 * Tests the time required to compress a JSON object using Parser.
 * 
 * @param {Parser} parser a parser object that is built with static mappings
 * @param {Object} object the actual object that needs to be compressed
 * @returns {Promise} a promise that returns the time taken to compress and the size after compression
 */
const testParser = async (model, object) => {
  const start = Date.now()
  const buffer = BJSON.stringify(object, model)
  
  return {
    time: Date.now() - start,
    size: buffer.length
  }
}

/**
 * Tests the time required to compress a JSON object using JSON.stringify().
 * 
 * @param {Object} object the actual object that needs to be compressed
 * @returns {Promise} a promise that returns the time taken to compress and the size after compression
 */
const testNative = async (object) => {
  const start = Date.now()
  const string = JSON.stringify(object)
  
  return {
    time: Date.now() - start,
    size: string.length
  }
}

Promise.all([... new Array(MAX_OBJECTS)].map(() => {
  const [map, object] = randomobj()

  return Promise.all([
    testParser(map, object),
    testNative(object)
  ])
})).then(results => {
  console.log('')

  // create sums
  results = results.reduce(([ parserStats, nativeStats, ratio ], [ a, b ]) => {
    parserStats.time += a.time
    parserStats.size += a.size

    nativeStats.time += b.time
    nativeStats.size += b.size

    return [ parserStats, nativeStats, ratio + ((b.size - a.size) / b.size) ]
  }, [
    { time: 0, size: 0 },
    { time: 0, size: 0 },
    0
  ])

  // average it out
  results[0].time /= MAX_OBJECTS
  results[0].size /= MAX_OBJECTS

  results[1].time /= MAX_OBJECTS
  results[1].size /= MAX_OBJECTS

  results[2] /= MAX_OBJECTS

  // display stats
  console.log('Parser statistics:')
  console.log('  Average time to compress: %sms', results[0].time)
  console.log('  Average size of compression: %s bytes', results[0].size)
  console.log('')
  console.log('JSON.* statistics:')
  console.log('  Average time to compress: %sms', results[1].time)
  console.log('  Average size of compression: %s bytes', results[1].size)
  console.log('')
  console.log('Average compression ratio: %s% saved.', Math.round(results[2] * 10000) / 100)
}, err => console.log(err))
