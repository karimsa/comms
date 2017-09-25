const Benchmark = require('benchmark')
const compression = new Benchmark.Suite()
const decompression = new Benchmark.Suite()

const BJSON = require('../../')
const [
  randomMap,
  randomObj
] = require('../utils/random')()

const buffer = BJSON.stringify(randomObj, randomMap)
const randomObjStr = JSON.stringify(randomObj)

compression.add('stringify', () => {
  BJSON.stringify(randomObj, randomMap)
}).add('JSON#stringify', () => {
  JSON.stringify(randomObj)
}).on('cycle', function(event) {
  console.log(String(event.target))
}).on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'))

  decompression.add('parse', () => {
    BJSON.parse(buffer, randomMap)
  }).add('JSON#parse', () => {
    JSON.parse(randomObjStr)
  }).on('cycle', function(event) {
    console.log(String(event.target))
  }).on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  }).run({ 'async': true })
}).run({ 'async': true })
