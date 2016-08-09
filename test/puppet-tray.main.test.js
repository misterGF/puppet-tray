/* global describe:true it:true beforeEach:true afterEach:true */
// Load in requirements
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const Application = require('spectron').Application

// Load in chai plugins

// Setup needed variables

describe('Test Suite', function () {
  this.timeout(10000)

  beforeEach(function () {
    this.app = new Application({
      path: "node_modules\\electron-prebuilt\\dist\\electron.exe c:\\code\\tray\\index.js"
    })
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it('Show initial window', function () {
    return this.app.client.getWindowCount().then(function (count) {
      assert.equal(count, 1)
    })
  })
})
