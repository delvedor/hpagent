'use strict'

const http = require('http')
const https = require('https')
const test = require('ava')
const { testCaseMatrix, createServer, createProxy, SERVER_HOSTNAME, PROXY_HOSTNAME } = require('./utils')

function request (secureServer, opts) {
  return new Promise((resolve, reject) => {
    const req = (secureServer ? https : http).request(opts, resolve)
    req.on('error', reject)
    req.end(opts.body)
  })
}

testCaseMatrix.forEach(({ description, AgentUnderTest, secureServer, secureProxy }) => {
  test(`${description} - Basic`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })

  test(`${description} - Connection header (keep-alive)`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    proxy.authenticate = function (req, fn) {
      t.is(req.headers.connection, 'keep-alive')
      fn(null, true)
    }

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })

  test(`${description} -  Connection header (close)`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    proxy.authenticate = function (req, fn) {
      t.is(req.headers.connection, 'close')
      fn(null, true)
    }

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: false,
        keepAliveMsecs: 1000,
        maxSockets: Infinity,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })

  test(`${description} -  Proxy authentication (empty)`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    proxy.authenticate = function (req, fn) {
      fn(null, req.headers['proxy-authorization'] === undefined)
    }

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })

  test(`${description} -  Proxy authentication`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    proxy.authenticate = function (req, fn) {
      fn(null, req.headers['proxy-authorization'] === `Basic ${Buffer.from('hello:world').toString('base64')}`)
    }

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://hello:world@${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })

  test(`${description} -  Configure the agent to reuse sockets`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    let count = 0
    proxy.on('connection', () => {
      count += 1
      t.is(count, 1)
    })

    const agent = new AgentUnderTest({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
    })

    let response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent
    })

    let body = ''
    response.setEncoding('utf8')
    for await (const chunk of response) {
      body += chunk
    }

    t.is(body, 'ok')
    t.is(response.statusCode, 200)

    response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent
    })

    body = ''
    response.setEncoding('utf8')
    for await (const chunk of response) {
      body += chunk
    }

    t.is(body, 'ok')
    t.is(response.statusCode, 200)

    server.close()
    proxy.close()
  })

  test(`${description} -  Configure the agent to NOT reuse sockets`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    const ports = []
    proxy.on('connection', socket => {
      t.false(ports.includes(socket.remotePort))
      ports.push(socket.remotePort)
    })

    const agent = new AgentUnderTest({
      keepAlive: false,
      keepAliveMsecs: 1000,
      maxSockets: Infinity,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
    })

    let response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent
    })

    let body = ''
    response.setEncoding('utf8')
    for await (const chunk of response) {
      body += chunk
    }

    t.is(body, 'ok')
    t.is(response.statusCode, 200)

    response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent
    })

    body = ''
    response.setEncoding('utf8')
    for await (const chunk of response) {
      body += chunk
    }

    t.is(body, 'ok')
    t.is(response.statusCode, 200)

    server.close()
    proxy.close()
  })

  test(`${description} -  Test Host Header`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    proxy.authenticate = function (req, fn) {
      t.is(req.headers.host, `${SERVER_HOSTNAME}:${server.address().port}`)
      fn(null, true)
    }

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })

  test(`${description} -  Timeout`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    try {
      await request(secureServer, {
        method: 'GET',
        hostname: SERVER_HOSTNAME,
        port: server.address().port,
        path: '/',
        timeout: 1,
        agent: new AgentUnderTest({
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          scheduling: 'lifo',
          proxy: `${secureProxy ? 'https' : 'http'}://${PROXY_HOSTNAME}:${proxy.address().port}`
        })
      })
      t.fail('Should throw')
    } catch (err) {
      t.is(err.message, 'Proxy timeout')
    }

    server.close()
    proxy.close()
  })

  test(`${description} -  Username and password should not be encoded`, async t => {
    const server = await createServer(secureServer)
    const proxy = await createProxy(secureProxy)
    server.on('request', (req, res) => res.end('ok'))

    proxy.authenticate = function (req, fn) {
      fn(null, req.headers['proxy-authorization'] === `Basic ${Buffer.from('username_with_=:password_with_=').toString('base64')}`)
    }

    const response = await request(secureServer, {
      method: 'GET',
      hostname: SERVER_HOSTNAME,
      port: server.address().port,
      path: '/',
      agent: new AgentUnderTest({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 256,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        proxy: `${secureProxy ? 'https' : 'http'}://username_with_=:password_with_=@${PROXY_HOSTNAME}:${proxy.address().port}`
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
    proxy.close()
  })
})
