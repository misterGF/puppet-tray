/* global */
// Load Node modules
const path = require('path')
const events = require('events')
const fs = require('fs')

// Load electron modules
const {app, Tray, BrowserWindow} = require('electron')

// Load helpers
const Positioner = require('electron-positioner')
const extend = require('extend')
const yaml = require('js-yaml')
const devMode = true

// Create our menubar variable
var menubar = new events.EventEmitter()
menubar.app = app
menubar.opts = {
  dir: app.getAppPath(),
  index: null, // Defaults to index.html
  showDockIcon: false,
  width: 600,
  height: 400,
  tooltip: 'Puppet Tray',
  icon: 'icons/pending.png',
  windowPosition: 'trayBottomCenter',
  icons: ['icons/complete.png', 'icons/failing.png', 'icons/pending.png'],
  puppetFile: (devMode) ? 'data\\last_run_summary.yaml' : 'C:\\ProgramData\\PuppetLabs\\puppet\\cache\\state\\last_run_summary.yaml',
  showOnRightClick: false,
  alwaysOnTop: (devMode)
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
    frame: false,
    autoHideMenuBar: true
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
  let item = 2
  let status = 'pending'
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

  // Grab latest
  setInterval(() => {
    try {
      this.yaml = yaml.safeLoad(fs.readFileSync(this.opts.puppetFile, 'utf8'))
      let timestamp = new Date(this.yaml.time.last_run * 1000)
      let lastRun = timestamp.toLocaleString()

      this.summary = {
        lastRun: lastRun,
        resources: {
          changed: this.yaml.resources.changed,
          failed: this.yaml.resources.failed,
          out_of_sync: this.yaml.resources.out_of_sync,
          skipped: this.yaml.resources.skipped,
          scheduled: this.yaml.resources.scheduled,
          total: this.yaml.resources.total
        }
      }

      // Determine proper icon
      if (this.summary.resources.changed || this.summary.resources.out_of_sync || this.summary.resources.skipped) {
        item = 2
        status = 'pending'
      } else if (this.summary.resources.failed) {
        item = 1
        status = 'failing'
      } else {
        item = 0
        status = 'synced'
      }
    } catch (e) {
      item = 1 // failed
      status = 'failing'

      if (e.message.indexOf('ENOENT:') === 0) {
        // File doesnt exist
        console.log('File does not exist')
        global.summary = { error: `File does not exist. Looking for ${this.opts.puppetFile}.`, fileNotFound: true }
      } else {
        // Unaccounted for error
        console.log('Caught Error:', e.message)
        global.summary = { error: e.message }
      }
    }

    // Update the icon
    this.tray.setImage(this.opts.icons[item])

    // Send data to Browser
    this.summary.icon = this.opts.icons[item]
    this.summary.status = status
    global.summary = this.summary
  }, 1000) // TODO: Change to a minute 60000
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
