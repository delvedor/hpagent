'use strict'

const http = require('http')
const test = require('ava')
const { createServer } = require('./utils')
const { HttpProxyAgent } = require('../')

function request (opts) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, resolve)
    req.on('error', reject)
    req.end(opts.body)
  })
}

test('Use noProxy basic exception', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: `${server.address().address}`
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
})

test('noProxy should allow multiple exceptions split by comma', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: `someaddress.com,${server.address().address}, *addresstwo.info`
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
})

test('noProxy should allow wildcard at the end of an address', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/test',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: `${server.address().address}*`
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
})

test('noProxy should allow wildcard at the beginning of an address', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/test',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: `*:${server.address().port}`
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
})

test('noProxy should allow wildcard allowing to no proxy any request', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/test',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: '*'
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
})

test('NO_PROXY environment variable', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))
  process.env.NO_PROXY = `${server.address().address}`

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: `${server.address().address}`
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
  process.env.NO_PROXY = undefined
})

test('no_proxy environment variable', async t => {
  const server = await createServer()
  server.on('request', (req, res) => res.end('ok'))
  process.env.no_proxy = `${server.address().address}`

  const response = await request({
    method: 'GET',
    hostname: server.address().address,
    port: server.address().port,
    path: '/',
    agent: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      // never mind it won't be called
      proxy: 'http://localhost:1234',
      noProxy: `${server.address().address}`
    })
  })

  let body = ''
  response.setEncoding('utf8')
  for await (const chunk of response) {
    body += chunk
  }

  t.is(body, 'ok')
  t.is(response.statusCode, 200)

  server.close()
  process.env.no_proxy = undefined
})
