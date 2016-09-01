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
const minimist = require('minimist')

// Parse for any passed in values
let passedArgs = minimist(process.argv.slice(2))
const devMode = (passedArgs.devMode) ? passedArgs.devMode : false

if (devMode) {
  console.log('In Dev Mode')
}

// Create our menubar variable
var menubar = new events.EventEmitter()
menubar.window = null
menubar.app = app
menubar.opts = {
  dir: app.getAppPath(),
  index: null, // Defaults to index.html
  refreshRate: 60000, // One minute
  showDockIcon: false,
  width: 600,
  height: 400,
  tooltip: 'Puppet Tray',
  icon: path.join(__dirname, 'icons/puppet-tray.png'),
  windowPosition: 'trayBottomCenter',
  icons: [path.join(__dirname, 'icons/complete.png'), path.join(__dirname, 'icons/failing.png'), path.join(__dirname, 'icons/pending.png')],
  puppetFile: (devMode) ? 'data\\last_run_summary.yaml' : 'C:\\ProgramData\\PuppetLabs\\puppet\\cache\\state\\last_run_summary.yaml',
  showOnRightClick: false,
  alwaysOnTop: (devMode)
}

// Clicked Function
menubar.clicked = function (e, bounds) {
  // this is equal to Tray object.

  if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
    menubar.emit('hiding-window')
  } else if (menubar.window) {
    menubar.emit('clear-window', 'from clicked')
  } else {
    let cachedBounds = bounds || cachedBounds
    menubar.emit('create-window', cachedBounds)
  }
}

// Ready function
menubar.app.on('ready', function () {
  // this is equal to app here.
  // Set our icon
  this.tray = new Tray(menubar.opts.icon)

  // Disable dock icon
  if (app.dock && !menubar.opts.showDockIcon) app.dock.hide()

  // Ensure proper path
  if (!(path.isAbsolute(menubar.opts.dir))) {
    menubar.opts.dir = path.resolve(menubar.opts.dir)
  }

  if (!menubar.opts.index) {
    menubar.opts.index = 'file://' + path.join(menubar.opts.dir, 'index.html')
    menubar.emit('file-set', menubar.opts.index)
  }
  // Define click events
  var defaultClickEvent = menubar.opts.showOnRightClick ? 'right-click' : 'click'

  // Register events
  this.tray.setToolTip(menubar.opts.tooltip)
  this.tray.on(defaultClickEvent, menubar.clicked)
  this.tray.on('double-click', menubar.clicked)

  // Add tray to menubar
  menubar.tray = this.tray

  // Grab latest
  menubar.emit('get-latest')

  // Schedule our updates
  setInterval(function () {
    menubar.emit('get-latest')
  }, menubar.opts.refreshRate)
})

// Handle events
menubar.on('create-window', function (cachedBounds) {
  console.log('Event: Creating window.')
  this.emit('show-window', cachedBounds)
})

menubar.on('show-window', function (trayPos) {
  // Create window if it doesn't exist
  if (!this.window) {
    var defaults = {
      show: false,
      frame: false,
      autoHideMenuBar: true
    }

    var winOpts = extend(defaults, this.opts)
    this.window = new BrowserWindow(winOpts)
    this.positioner = new Positioner(this.window)

    this.window.on('blur', function () {
      menubar.opts.alwaysOnTop ? menubar.emit('log-message', 'Lost focus') : menubar.emit('hiding-window', 'from blur')
    })

    if (this.opts.showOnAllWorkspaces !== false) {
      this.window.setVisibleOnAllWorkspaces(true)
    }

    this.window.on('close', function () {
      menubar.emit('clear-window', 'from close')
    })

    this.window.loadURL(this.opts.index)
  }

  // Prepare window to be shown
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

  // Window shown
  this.emit('after-show')
})

menubar.on('hiding-window', function () {
  console.log('Event: Hiding window.')

  if (!this.window) return

  this.window.hide()
  this.emit('after-hide')
})

menubar.on('clear-window', function (from) {
  delete this.window
  console.log(`Event: Window cleared - ${from}`)
})

menubar.on('get-latest', function () {
  // Define some defaults
  let item = 2
  let status = null

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
    if (this.summary.resources.failed) {
      item = 1
      status = 'failing'
    } else if (this.summary.resources.changed || this.summary.resources.out_of_sync || this.summary.resources.skipped || this.summary.resources.scheduled) {
      item = 2
      status = 'pending'
    } else {
      item = 0
      status = 'synced'
    }

    this.summary.icon = this.opts.icons[item]
    this.summary.status = status

    // Send data to Browser
    global.summary = this.summary
  } catch (e) {
    item = 1 // failed
    status = 'failing'

    if (e.message && e.message.indexOf('ENOENT:') === 0) {
      // File doesnt exist
      console.log('File does not exist', new Date())
      global.summary = { error: `File does not exist. Looking for ${this.opts.puppetFile}.`, fileNotFound: true, icon: this.opts.icons[item] }
    } else {
      // Unaccounted for error
      console.log('Caught Error:', e)
      global.summary = {
        error: (e.message) ? e.message : e,
        icon: this.opts.icons[item]
      }
    }
  }

  // Update the icon
  this.tray.setImage(this.opts.icons[item])
})

// Info events
menubar.on('showing-window', function () {
  console.log('Event: Showing window.')
})

menubar.on('after-show', function () {
  console.log('Event: Window shown.')
})

menubar.on('file-set', function (e) {
  console.log('Event: File changed - ', e)
})

menubar.on('after-hide', function (e) {
  console.log('Event: Window hidden')
})

menubar.on('log-message', function (message) {
  console.log(`Event: Message - ${message}`)
})
