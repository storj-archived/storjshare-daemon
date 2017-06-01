FROM microsoft/windowsservercore
MAINTAINER Storj Labs (bill@storj.io)
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

ENV NPM_CONFIG_LOGLEVEL info
ENV NODE_VERSION 6.10.3
ENV MINGIT_VERSION 2.12.2

RUN	[Environment]::SetEnvironmentVariable('DOCKER_BUILD_DATE', $(Get-Date), 'Machine'); \
	$env:DOCKER_BUILD_DATE = [System.Environment]::GetEnvironmentVariable('DOCKER_BUILD_DATE','Machine'); \
    \
    Write-Host '=============================================='; \
	Write-Host 'Performing Storj Labs storjshare-daemon Image Build'; \
	Write-Host 'Github Site: https://github.com/Storj/storjshare-daemon'; \
	Write-Host ''; \
	Write-Host ('Docker Image Build Date: {0} PST' -f $env:DOCKER_BUILD_DATE); \
	Write-Host ''; \
	Write-Host 'Loading Recommended Versions of Software'; \
	Write-Host ('Node.js: {0}' -f $env:NODE_VERSION); \
	Write-Host ('MinGit: {0}' -f $env:MINGIT_VERSION); \
	Write-Host ''; \
	Write-Host 'Loading Storj Labs Tools'; \
	Write-Host ('windows-build-tools: Latest Version'); \
	Write-Host ('storjshare-daemon: Latest Version'); \
	Write-Host '=============================================='; \
    \
    Write-Host ('Downloading node.js {0} ...' -f $env:NODE_VERSION); \
	Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
	\
	Write-Host 'Extracting node.js ...'; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
	\
	Write-Host 'Extracting node.js and setting up C:\nodejs ...'; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs' ; \
    New-Item $($env:APPDATA + '\npm') ; \
	\
	Write-Host 'Adding npm to Environment Path'; \
    $env:PATH = 'C:\nodejs;{0}\npm;{1}' -f $env:APPDATA, $env:PATH ; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH ; \
	\
	Write-Host 'Testing Node Install'; \
	Write-Host npm --version; npm --version; \
	\
	Write-Host 'Cleaning up'; \
    Remove-Item -Path node.zip; \
	\
	Write-Host 'Completed node.js Installation Successfully'; \
    \
    Write-Host ('Downloading MinGit {0} ...' -f $env:MINGIT_VERSION); \
	Invoke-WebRequest $('https://github.com/git-for-windows/git/releases/download/v{0}.windows.1/MinGit-{0}-64-bit.zip' -f $env:MINGIT_VERSION) -OutFile 'mingit.zip' -UseBasicParsing ; \
	\
	Write-Host 'Extracting MinGit and setting up C:\mingit ...'; \
    Expand-Archive mingit.zip -DestinationPath C:\mingit ; \
	\
	Write-Host 'Adding git to Environment Path'; \
    $env:PATH = 'C:\mingit\cmd;{0}' -f $env:PATH ; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH ; \
	\
	Write-Host 'Testing MinGit Install'; \
	Write-Host git version; git version; \
	\
	Write-Host 'Cleaning up'; \
    Remove-Item -Path mingit.zip; \
	\
	Write-Host 'Completed MinGit Installation Successfully'; \
    \
    Write-Host ('Installing windows-build-tools - Latest Version'); \
	Write-Host npm install --global windows-build-tools; npm install --global windows-build-tools; \
    \
	Write-Host 'Completed windows-build-tools Installation Successfully'; \
    \
    Write-Host ('Installing storjshare-daemon - Latest Version'); \
	Write-Host npm install --global storjshare-daemon; npm install --global storjshare-daemon; \
	\
	Write-Host 'Testing Storjshare-daemon Install'; \
	Write-Host storjshare --version; storjshare --version; \
	\
	Write-Host 'Completed storjshare-daemon Installation Successfully';

ADD motd.txt motd.txt
ADD Microsoft.PowerShell_profile.ps1 Microsoft.PowerShell_profile.ps1

RUN New-item -type file -force $profile; \
	Set-Content $Profile (Get-Content Microsoft.PowerShell_profile.ps1); \
    \
	Write-Host 'Cleaning up...'; \
	Remove-Item *.log -Force; \
	Remove-Item *.ps1 -Force;

CMD []
ENTRYPOINT ["powershell"]
