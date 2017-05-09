Get-Content C:\motd.txt
Write-Host '=============================================='
Write-Host '          Storj Lab | Docker Image'
Write-Host ''
Write-Host ('Windows OS Name: {0}' -f ((Get-WmiObject Win32_OperatingSystem).Name.Split('|')[0]))
Write-Host ('Windows OS Version: {0}' -f (Get-CimInstance Win32_OperatingSystem).version)
Write-Host ('Docker Image Build Date: {0} PST' -f $env:DOCKER_BUILD_DATE)
Write-Host '';
Write-Host 'Software Dependencies Loaded'
Write-Host ('Node.js: {0}' -f $env:NODE_VERSION)
Write-Host ('MinGit: {0}' -f $env:MINGIT_VERSION)
Write-Host '=============================================='
Write-Host ''
