; Custom NSIS script for Media Downloader

; Make sure the application is not running during uninstallation
!macro customUnInstall
  ; Call the cleanup function in the app before uninstalling
  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --cleanup'
  
  ; Kill any remaining processes
  nsProcess::_FindProcess "${APP_EXECUTABLE_FILENAME}"
  Pop $R0
  ${If} $R0 == 0
    nsProcess::_KillProcess "${APP_EXECUTABLE_FILENAME}"
    Sleep 2000
  ${EndIf}
!macroend

; Make sure the application is not running during installation
!macro customInit
  ; Kill any running instances before installing
  nsProcess::_FindProcess "${APP_EXECUTABLE_FILENAME}"
  Pop $R0
  ${If} $R0 == 0
    nsProcess::_KillProcess "${APP_EXECUTABLE_FILENAME}"
    Sleep 2000
  ${EndIf}
!macroend

; Make sure app is properly terminated after installation
!macro customInstall
  ; Do nothing special for now
!macroend
