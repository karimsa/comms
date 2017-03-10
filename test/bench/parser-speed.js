const Benchmark = require('benchmark')
const compression = new Benchmark.Suite()
const decompression = new Benchmark.Suite()

const Parser = require('../../lib/parser')
const [
  randomMap,
  randomObj
] = require('../utils/random')()
const parser = new Parser(randomMap)

const buffer = parser.compress(randomObj)
const randomObjStr = JSON.stringify(randomObj)

compression.add('Parser#compress', () => {
  parser.compress(randomObj)
}).add('JSON#stringify', () => {
  JSON.stringify(randomObj)
}).on('cycle', function(event) {
  console.log(String(event.target))
}).on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'))

  decompression.add('Parser#decompress', () => {
    parser.decompress(buffer)
  }).add('JSON#parse', () => {
    JSON.parse(randomObjStr)
  }).on('cycle', function(event) {
    console.log(String(event.target))
  }).on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  }).run({ 'async': true })
}).run({ 'async': true })
