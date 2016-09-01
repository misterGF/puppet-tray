#Requires -version 3.0
<#
  Build process for puppet-tray.
  This is a simple script that will ensure puppet-tray is installed and runs on startup.

  Author: Gil Ferreira
#>

$ErrorActionPreference = "STOP"

try {
  $ScriptPath = Split-Path -parent $PSCommandPath
  Set-Location $ScriptPath

  # Run sanity check on where the script is. Should have puppet-tray locally
  if (Get-Item 'puppet-tray.exe') {
    # Copy content over to program files folder
    Copy-Item -Path . -Destination 'c:\program files\puppet-tray' -Recurse

    # Create shortcut file & move file into startup folder
    $TargetFile = 'C:\Program Files\puppet-tray\puppet-tray.exe'
    $ShortcutFile = 'C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp\puppet-tray.lnk'
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutFile)
    $Shortcut.TargetPath = $TargetFile
    $Shortcut.Save()

    # Enable notifications area to always show
    invoke-expression {  TrayManager.exe -t "Puppet Tray" 2 }

    Write-Output 'Setup complete!'
  }
} catch {
  if ($_ -like "Cannot find path *puppet-tray.exe' because it does not exist.") {
    Write-Output "ERROR: The script should run from the unzipped file that contains puppet-tray.exe."
  } else {
    Write-Output "ERROR: $_"
  }
}
