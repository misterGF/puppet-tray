const {app, Menu, Tray} = require('electron')

let tray = null

app.on('ready', () => {
  var icons = ['icons/complete.png', 'icons/failing.png', 'icons/pending.png']
  var item = 0

  // Init tray icon
  tray = new Tray(icons[item])
  tray.setToolTip('Puppet Tray')

  // TODO: Set some type of context icon here as well.
  // Check for update every minute.
  var refreshId = setInterval(() => {
    // TODO: Check the puppet file to see which icon it should show.
    if (item === 0) {
      item = 1
    } else if (item === 1) {
      item = 2
    } else {
      item = 0
    }

    // Update the icon
    tray.setImage(icons[item])
  }, 1000)
})
