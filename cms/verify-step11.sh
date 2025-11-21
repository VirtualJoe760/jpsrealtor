#!/bin/bash
# Step 11 Verification Script
# Run this on your VPS to verify the server preparation is complete

echo "=========================================="
echo "Payload CMS - Step 11 Verification"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check directory structure
echo "1. Checking directory structure..."
if [ -d "/var/www/payload" ]; then
    check_pass "Base directory exists: /var/www/payload"
else
    check_fail "Missing: /var/www/payload"
fi

if [ -d "/var/www/payload/logs" ]; then
    check_pass "Logs directory exists"
else
    check_fail "Missing: /var/www/payload/logs"
fi

if [ -d "/var/www/payload/shared" ]; then
    check_pass "Shared directory exists"
else
    check_fail "Missing: /var/www/payload/shared"
fi

if [ -d "/var/www/payload/releases" ]; then
    check_pass "Releases directory exists"
else
    check_fail "Missing: /var/www/payload/releases"
fi

echo ""

# 2. Check Node.js version
echo "2. Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js installed: $NODE_VERSION"

    # Extract major version
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        check_pass "Node.js version is 18 or higher"
    else
        check_warn "Node.js version is below 18 (Payload requires 18+)"
    fi
else
    check_fail "Node.js not installed"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not installed"
fi

echo ""

# 3. Check PM2
echo "3. Checking PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    check_pass "PM2 installed: $PM2_VERSION"
else
    check_fail "PM2 not installed"
fi

echo ""

# 4. Check Nginx
echo "4. Checking Nginx..."
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
    check_pass "Nginx installed: $NGINX_VERSION"

    # Check if running
    if systemctl is-active --quiet nginx; then
        check_pass "Nginx is running"
    else
        check_warn "Nginx is installed but not running"
    fi
else
    check_fail "Nginx not installed"
fi

echo ""

# 5. Check Nginx config
echo "5. Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-available/payload" ]; then
    check_pass "Nginx config exists: /etc/nginx/sites-available/payload"
else
    check_fail "Missing: /etc/nginx/sites-available/payload"
fi

if [ -L "/etc/nginx/sites-enabled/payload" ]; then
    check_pass "Nginx config is enabled"
else
    check_fail "Nginx config not enabled (missing symlink)"
fi

# Test nginx config
if nginx -t &> /dev/null; then
    check_pass "Nginx configuration is valid"
else
    check_warn "Nginx configuration has errors"
    nginx -t
fi

echo ""

# 6. Check environment file
echo "6. Checking environment file..."
if [ -f "/var/www/payload/shared/.env" ]; then
    check_pass "Environment file exists"

    # Check permissions
    PERMS=$(stat -c "%a" /var/www/payload/shared/.env)
    if [ "$PERMS" = "600" ]; then
        check_pass "Environment file has secure permissions (600)"
    else
        check_warn "Environment file permissions: $PERMS (should be 600)"
    fi
else
    check_fail "Missing: /var/www/payload/shared/.env"
fi

echo ""

# 7. Check PM2 ecosystem config
echo "7. Checking PM2 ecosystem config..."
if [ -f "/var/www/payload/ecosystem.config.js" ]; then
    check_pass "PM2 ecosystem config exists"
else
    check_fail "Missing: /var/www/payload/ecosystem.config.js"
fi

echo ""

# 8. Check system dependencies
echo "8. Checking system dependencies..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    check_pass "git installed: $GIT_VERSION"
else
    check_warn "git not installed (needed for deployment)"
fi

if command -v gcc &> /dev/null; then
    check_pass "build-essential installed (gcc found)"
else
    check_warn "build-essential may not be installed"
fi

echo ""

# 9. Check firewall (if ufw is installed)
echo "9. Checking firewall..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        check_pass "UFW firewall is active"

        # Check if required ports are allowed
        if ufw status | grep -q "Nginx Full"; then
            check_pass "Nginx Full profile allowed"
        elif ufw status | grep -q "80"; then
            check_pass "Port 80 allowed"
        else
            check_warn "Port 80 may not be allowed in firewall"
        fi

        if ufw status | grep -q "OpenSSH"; then
            check_pass "OpenSSH allowed"
        else
            check_warn "OpenSSH may not be allowed in firewall"
        fi
    else
        check_warn "UFW is installed but not active"
    fi
else
    check_warn "UFW not installed (firewall not configured)"
fi

echo ""

# 10. Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Directory Structure:"
ls -la /var/www/payload/ 2>/dev/null || echo "Directory not accessible"
echo ""

echo "Nginx Sites Enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep payload || echo "No payload site enabled"
echo ""

echo "Environment Variables in .env:"
if [ -f "/var/www/payload/shared/.env" ]; then
    grep -v "^#" /var/www/payload/shared/.env | grep -v "^$" | cut -d'=' -f1 || echo "File is empty or not readable"
else
    echo "File does not exist"
fi
echo ""

echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
