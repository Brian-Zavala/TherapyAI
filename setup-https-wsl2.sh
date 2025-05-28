#!/bin/bash

# HTTPS Setup for WSL2 - Complete Guide
# This script helps set up HTTPS for local development and remote access from phones

echo "🔒 HTTPS Setup for WSL2 Development"
echo "==================================="
echo ""

# Function to install mkcert
install_mkcert() {
    if ! command -v mkcert &> /dev/null; then
        echo "📦 Installing mkcert..."
        sudo apt update
        sudo apt install -y libnss3-tools wget
        wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
        chmod +x mkcert
        sudo mv mkcert /usr/local/bin/
        mkcert -install
        echo "✅ mkcert installed!"
    else
        echo "✅ mkcert is already installed"
    fi
}

# Function to generate basic certificates
generate_basic_certs() {
    echo ""
    echo "📜 Generating basic certificates for localhost..."
    mkcert localhost 127.0.0.1 ::1
    echo "✅ Basic certificates generated!"
}

# Function to generate certificates for remote access
generate_remote_certs() {
    echo ""
    echo "📱 Setting up certificates for remote access..."
    echo ""
    echo "To access from your phone, we need your Windows IP address."
    echo "Steps to find it:"
    echo "1. Open Windows PowerShell"
    echo "2. Run: ipconfig"
    echo "3. Look for 'IPv4 Address' under your WiFi/Ethernet adapter"
    echo ""
    read -p "Enter your Windows IPv4 address (e.g., 192.168.1.100): " WINDOWS_IP
    
    if [[ ! $WINDOWS_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        echo "❌ Invalid IP address format"
        return 1
    fi
    
    echo ""
    echo "📜 Generating certificates including $WINDOWS_IP..."
    mkcert localhost 127.0.0.1 ::1 $WINDOWS_IP
    
    # Create PowerShell script for port forwarding
    cat > setup-port-forward.ps1 << 'EOF'
# Run this in Windows PowerShell as Administrator
$wslIP = bash.exe -c "hostname -I | awk '{print \$1}'"
$port = 3000

Write-Host "Setting up port forwarding..." -ForegroundColor Green
netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIP
New-NetFirewallRule -DisplayName "WSL2 Dev Server" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -ErrorAction SilentlyContinue
Write-Host "✅ Port forwarding configured!" -ForegroundColor Green
Write-Host "Access your app at: https://YOUR_WINDOWS_IP:$port" -ForegroundColor Cyan
EOF
    
    echo ""
    echo "✅ Remote access setup complete!"
    echo ""
    echo "📋 Next steps for phone access:"
    echo "1. Run PowerShell as Administrator"
    echo "2. Navigate to: cd \\\\wsl\$\\Ubuntu$(pwd)"
    echo "3. Run: .\\setup-port-forward.ps1"
    echo "4. Start server: npm run dev:https"
    echo "5. On phone: https://$WINDOWS_IP:3000"
}

# Main menu
echo "Choose setup option:"
echo "1) Basic setup (localhost only)"
echo "2) Full setup (localhost + phone access)"
echo ""
read -p "Enter choice (1 or 2): " choice

cd "$(dirname "$0")"

case $choice in
    1)
        install_mkcert
        generate_basic_certs
        ;;
    2)
        install_mkcert
        generate_remote_certs
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Don't forget to:"
echo "- Add USE_HTTPS=true to your .env.local file"
echo "- Run: npm run dev:https"