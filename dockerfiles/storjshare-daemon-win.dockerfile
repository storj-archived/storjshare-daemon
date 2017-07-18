FROM microsoft/windowsservercore
MAINTAINER Storj Labs (www.storj.io)
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

ENV NPM_CONFIG_LOGLEVEL info

ADD https://raw.githubusercontent.com/Storj/storjshare-daemon/master/dockerfiles/get_dep_ver.ps1 get_dep_ver.ps1

RUN .\get_dep_ver.ps1; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs' ; \
    New-Item $($env:APPDATA + '\npm') ; \
    $env:PATH = 'C:\nodejs;{0}\npm;{1}' -f $env:APPDATA, $env:PATH ; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH ; \
    Remove-Item -Path node.zip; \
    \
    Invoke-WebRequest $('https://github.com/git-for-windows/git/releases/download/v{0}.windows.1/MinGit-{0}-64-bit.zip' -f $env:MINGIT_VERSION) -OutFile 'mingit.zip' -UseBasicParsing ; \
    Expand-Archive mingit.zip -DestinationPath C:\mingit ; \
    $keepPath = $env:PATH; \
    $env:PATH = 'C:\mingit\cmd;{0}' -f $env:PATH ; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH ; \
    Remove-Item -Path mingit.zip; \
    \
    Write-Host npm install --global windows-build-tools; npm install --global windows-build-tools; \
    Write-Host npm install --global storjshare-daemon --unsafe-perm; npm install --global storjshare-daemon --unsafe-perm; \
    Write-Host npm uninstall --global windows-build-tools; npm uninstall --global windows-build-tools; \
    Remove-Item -Path C:\mingit -Recurse -Force; \
    $env:PATH = $keepPath; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH ; \
    Remove-Item *.log -Force; \
    Remove-Item *.ps1 -Force; \
    Remove-Item -recurse -force "C:\Windows\Temp\*.*"; \
    Get-Childitem "$env:Temp" -Recurse | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }; \
    Remove-Item -recurse -force "$env:UserProfile\.node-gyp"; \
    Remove-Item -recurse -force "$env:UserProfile\.windows-build-tools"; \
    Write-Host npm --version; npm --version; \
    Write-Host storjshare --version; storjshare --version;

EXPOSE 4000
EXPOSE 4001
EXPOSE 4002
EXPOSE 4003
CMD [""]
ENTRYPOINT ["powershell"]
