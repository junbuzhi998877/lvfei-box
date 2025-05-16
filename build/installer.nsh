!macro customInit
  # 安装前检查应用是否在运行并关闭
  ExecWait 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Sleep 2000
!macroend

!macro customUnInit
  # 卸载前关闭应用
  ExecWait 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Sleep 2000
!macroend 