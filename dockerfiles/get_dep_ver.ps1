$uri = 'https://github.com/git-for-windows/git/releases/latest'

if($(invoke-webrequest $uri -DisableKeepAlive -UseBasicParsing -Method head).BaseResponse.ResponseUri) {
    $url = $(invoke-webrequest $uri -DisableKeepAlive -UseBasicParsing -Method head).BaseResponse.ResponseUri.ToString()
    Write-Host $url
}

if($(invoke-webrequest $uri -DisableKeepAlive -UseBasicParsing -Method head).BaseResponse.RequestMessage) {
    $url = $(invoke-webrequest $uri -DisableKeepAlive -UseBasicParsing -Method head).BaseResponse.RequestMessage.RequestUri.ToString();
    Write-Host $url
}

$version = $url.Substring(0,$url.Length-".windows.1".Length)
$pos = $version.IndexOf("v")
$version = $version.Substring($pos+1)

Write-Host "Found Latest Version of Git for Windows - ${version}"
$env:MINGIT_VERSION = "${version}"

$node_base_ver = 8
$arch_ver = "-x64"
$uri = "https://nodejs.org/dist/latest-v${node_base_ver}.x/"
$site = invoke-webrequest $uri -DisableKeepAlive -UseBasicParsing

$found=0
$site.Links | Foreach {
    $url_items = $_.href

    if($url_items -like "*${arch_ver}.msi") {
        $filename=$url_items
        $found=1
    }
}

if($found -ne 1) {
    Write-Host "Unable to gather Node.js Version";
}

$url="${url}$filename"
$version = $filename.Substring(0,$filename.Length-"${arch_ver}.msi".Length)
$pos = $version.IndexOf("v")
$version = $version.Substring($pos+1)

Write-Host "Found Latest Version of Node - ${version}"
$env:NODE_VERSION = "${version}"
