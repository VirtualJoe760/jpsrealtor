#!/bin/bash

# Deploy .env.local to VPS
# This script copies the local .env.local file to the PayloadCMS directory on the VPS

VPS_IP="147.182.236.138"
VPS_USER="root"
VPS_PASSWORD="dstreet280"
VPS_PATH="/var/www/payload/current/.env"
LOCAL_ENV_FILE="F:/web-clients/joseph-sardella/jpsrealtor/.env.local"

echo "Deploying .env.local to VPS..."
echo "Target: $VPS_USER@$VPS_IP:$VPS_PATH"
echo ""

# Method 1: Using sshpass (if available)
if command -v sshpass &> /dev/null; then
    echo "Using sshpass..."
    sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$LOCAL_ENV_FILE" "$VPS_USER@$VPS_IP:$VPS_PATH"
    if [ $? -eq 0 ]; then
        echo "✓ Successfully deployed .env file to VPS"
        exit 0
    fi
fi

# Method 2: Using SSH with cat pipe
echo "Using SSH pipe method..."
cat "$LOCAL_ENV_FILE" | ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cat > $VPS_PATH"

if [ $? -eq 0 ]; then
    echo "✓ Successfully deployed .env file to VPS"
else
    echo "✗ Failed to deploy .env file"
    echo ""
    echo "Manual deployment command:"
    echo "scp \"$LOCAL_ENV_FILE\" $VPS_USER@$VPS_IP:$VPS_PATH"
    exit 1
fi
