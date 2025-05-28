# Quick script to enable phone access
# Run as Administrator after starting your dev server

$wslIP = bash.exe -c "hostname -I | awk '{print `$1}'"
$windowsIP = "192.168.1.85"  # Your home network IP

Write-Host "Setting up phone access..." -ForegroundColor Green
Write-Host "WSL2 IP: $wslIP" -ForegroundColor Yellow

# Remove old and add new forwarding
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=$windowsIP 2>$null
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=$windowsIP connectport=3000 connectaddress=$wslIP

Write-Host "`n✅ Phone access enabled!" -ForegroundColor Green
Write-Host "📱 Access your site at: https://$windowsIP:3000" -ForegroundColor Cyan
Write-Host "`nCurrent port forwarding:" -ForegroundColor Yellow
netsh interface portproxy show all