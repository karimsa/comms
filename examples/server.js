const comms = require('../')
const server = comms()

server.on('error', console.log)

server.model('message', { message: 'string' })
server.on('message', ({ message }, who) => console.log('%s says "%s"', who, message))

server.listen(8080, () => console.log('Listening :8080'))