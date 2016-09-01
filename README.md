# Puppet Tray
---
This electron task bar app is meant to give you a quick glimpse of where Puppet is at with its provisioning.
The color of the icon will tell you if it is completed, pending or failed.

Click on the icon and you will get more information.

![Puppet tray screenshot](http://res.cloudinary.com/gatec21/image/upload/v1470756092/puppet-tray_jichun.png)

The information is pulled from

```bash
  C:\ProgramData\PuppetLabs\puppet\cache\state\last_run_summary.yaml
```

Currently only supported on windows.
You can download the executable [here](https://github.com/misterGF/puppet-tray/releases).
To install/configure unzip the file and run the build.ps1 PowerShell script. 
---

## Contribute
Pull requests are welcome. Make sure you have Electron installed.

```bash
  npm i -g electron-prebuilt
```

- JavaScript Standard Code Style required.
- Mocha test required for new features.
