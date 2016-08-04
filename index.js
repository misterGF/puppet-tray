/* global */
// Load Node modules
const path = require('path')
const events = require('events')
// const fs = require('fs')

// Load electron modules
const {app, Tray, BrowserWindow} = require('electron')

// Load helpers
const Positioner = require('electron-positioner')
const extend = require('extend')

// Create our menubar variable
var menubar = new events.EventEmitter()
menubar.app = app
menubar.opts = {
  dir: app.getAppPath(),
  index: null, // Defaults to index.html
  showDockIcon: false,
  width: 400,
  height: 400,
  tooltip: 'Puppet Tray',
  icon: 'icons/pending.png',
  windowPosition: 'trayBottomCenter',
  icons: ['icons/complete.png', 'icons/failing.png', 'icons/pending.png'],
  showOnRightClick: false,
  alwaysOnTop: false
}

// Clicked Function
menubar.clicked = function (e, bounds) {
  // Clicked functions
  if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
    this.emit('hiding-window')
    return this.hideWindow() // Hide window when these keys are clicked
  }

  if (this.window) {
    this.emit('clear-window')
    return this.windowClear() // Hide menu if it is open
  }

  let cachedBounds = bounds || cachedBounds
  this.showWindow(cachedBounds)
}.bind(menubar)

// Show window function
menubar.showWindow = function (trayPos) {
  if (!this.window) {
    this.createWindow()
  }

  this.emit('showing-window')
  let cachedBounds

  if (trayPos && trayPos.x !== 0) {
    // Cache the bounds
    cachedBounds = trayPos
  } else if (cachedBounds) {
    // Cached value will be used if showWindow is called without bounds data
    trayPos = cachedBounds
  } else if (this.tray.getBounds) {
    // Get the current tray bounds
    trayPos = this.tray.getBounds()
  }

  // Default the window to the right if `trayPos` bounds are undefined or null.
  var noBoundsPosition = null
  if ((trayPos === undefined || trayPos.x === 0) && this.opts.windowPosition.substr(0, 4) === 'tray') {
    noBoundsPosition = (process.platform === 'win32') ? 'bottomRight' : 'topRight'
  }

  var position = this.positioner.calculate(noBoundsPosition || this.opts.windowPosition, trayPos)

  var x = (this.opts.x !== undefined) ? this.opts.x : position.x
  var y = (this.opts.y !== undefined) ? this.opts.y : position.y

  this.window.setPosition(x, y)
  this.window.show()
  this.emit('after-show')
}.bind(menubar)

// Create window function
menubar.createWindow = function () {
  this.emit('create-window')
  var defaults = {
    show: false,
    frame: false
  }

  var winOpts = extend(defaults, this.opts)
  this.window = new BrowserWindow(winOpts)

  this.positioner = new Positioner(this.window)

  this.window.on('blur', function () {
    this.opts.alwaysOnTop ? this.emitBlur() : this.hideWindow()
  }.bind(this))

  if (this.opts.showOnAllWorkspaces !== false) {
    this.window.setVisibleOnAllWorkspaces(true)
  }

  this.window.on('close', this.windowClear)
  this.window.loadURL(this.opts.index)
  this.emit('after-create-window')
}.bind(menubar)

// Hide window function
menubar.hideWindow = function () {
  if (!this.window) return

  this.emit('hide')
  this.window.hide()
  this.emit('after-hide')
}.bind(menubar)

// Clear window function
menubar.windowClear = function () {
  delete this.window
  this.emit('after-close')
}.bind(menubar)

// Emit blur event
menubar.emitBlur = function () {
  this.emit('focus-lost')
}.bind(menubar)

// Ready function
menubar.app.on('ready', function () {
  // Set our icon
  let item = 0
  this.tray = new Tray(this.opts.icons[item])

  // Disable dock icon
  if (app.dock && !this.opts.showDockIcon) app.dock.hide()

  // Ensure proper path
  if (!(path.isAbsolute(this.opts.dir))) {
    this.opts.dir = path.resolve(this.opts.dir)
  }

  if (!this.opts.index) {
    this.opts.index = 'file://' + path.join(this.opts.dir, 'index.html')
    this.emit('file-set', this.opts.index)
  }
  // Define click events
  var defaultClickEvent = this.opts.showOnRightClick ? 'right-click' : 'click'

  // Register events
  this.tray.setToolTip(this.opts.tooltip)
  this.tray.on(defaultClickEvent, this.clicked)
  this.tray.on('double-click', this.clicked)

  // TODO: Set some type of context icon here as well.
  // Check for update every minute.

  setInterval(() => {
    // TODO: Check the puppet file to see which icon it should show.
    if (item === 0) {
      item = 1
    } else if (item === 1) {
      item = 2
    } else {
      item = 0
    }

    // Update the icon
    this.tray.setImage(this.opts.icons[item])
  }, 1000)
}.bind(menubar))

// Handle events
menubar.on('hiding-window', (e) => {
  console.log('Event triggered: Hiding window:', e)
})
menubar.on('showing-window', (e) => {
  console.log('Event triggered: Showing window:', e)
})

menubar.on('file-set', (e) => {
  console.log('File changed!: ', e)
})
