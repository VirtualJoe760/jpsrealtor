#!/bin/bash

###############################################################################
# VPS Cron Setup Script for Claude Article Writer
#
# This script sets up a cron job to automatically poll for article requests
# and launch Claude Code to write articles.
#
# Usage: ./setup-vps-cron-enhanced.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ VPS Claude Article Writer - Cron Setup                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect current directory
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo -e "${BLUE}📁 Project directory: ${CURRENT_DIR}${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "${CURRENT_DIR}/package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found in ${CURRENT_DIR}${NC}"
  echo -e "${RED}   Are you sure this is the jpsrealtor project directory?${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Project directory confirmed${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Error: Node.js is not installed${NC}"
  echo -e "${RED}   Please install Node.js first: https://nodejs.org/${NC}"
  exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} detected${NC}"

# Check if the polling script exists
POLLING_SCRIPT="${CURRENT_DIR}/scripts/check-article-requests-simple.js"
if [ ! -f "${POLLING_SCRIPT}" ]; then
  echo -e "${RED}❌ Error: Polling script not found at ${POLLING_SCRIPT}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Polling script found${NC}"

# Make polling script executable
chmod +x "${POLLING_SCRIPT}"
echo -e "${GREEN}✅ Polling script is executable${NC}"
echo ""

# Check if .env file exists
if [ ! -f "${CURRENT_DIR}/.env" ]; then
  echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
  echo -e "${YELLOW}   Make sure you have MONGODB_URI configured${NC}"
fi

# Create log directory
LOG_DIR="/var/log"
if [ ! -d "${LOG_DIR}" ]; then
  echo -e "${YELLOW}⚠️  Creating log directory: ${LOG_DIR}${NC}"
  mkdir -p "${LOG_DIR}"
fi

LOG_FILE="${LOG_DIR}/claude-article-writer.log"
echo -e "${BLUE}📝 Log file: ${LOG_FILE}${NC}"
echo ""

# Define cron job
CRON_JOB="*/5 * * * * cd ${CURRENT_DIR} && /usr/bin/node ${POLLING_SCRIPT} >> ${LOG_FILE} 2>&1"

# Check if cron job already exists
echo -e "${BLUE}🔍 Checking for existing cron job...${NC}"
if crontab -l 2>/dev/null | grep -F "${POLLING_SCRIPT}" > /dev/null; then
  echo -e "${YELLOW}⚠️  Cron job already exists!${NC}"
  echo ""
  echo -e "${YELLOW}Current cron job:${NC}"
  crontab -l 2>/dev/null | grep -F "${POLLING_SCRIPT}"
  echo ""

  read -p "Do you want to replace it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}ℹ️  Keeping existing cron job${NC}"
    exit 0
  fi

  # Remove old cron job
  echo -e "${BLUE}🗑️  Removing old cron job...${NC}"
  crontab -l 2>/dev/null | grep -vF "${POLLING_SCRIPT}" | crontab -
  echo -e "${GREEN}✅ Old cron job removed${NC}"
fi

# Add new cron job
echo -e "${BLUE}➕ Adding new cron job...${NC}"
(crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -
echo -e "${GREEN}✅ Cron job added successfully!${NC}"
echo ""

# Display cron job details
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ Cron Job Configuration                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Schedule:${NC}       Every 5 minutes"
echo -e "${GREEN}Script:${NC}         ${POLLING_SCRIPT}"
echo -e "${GREEN}Log file:${NC}       ${LOG_FILE}"
echo -e "${GREEN}Working dir:${NC}    ${CURRENT_DIR}"
echo ""

# Show current crontab
echo -e "${BLUE}📋 Current crontab entries:${NC}"
crontab -l 2>/dev/null
echo ""

# Test the script
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ Testing the Polling Script                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Do you want to run a test now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}🧪 Running test...${NC}"
  echo ""
  cd "${CURRENT_DIR}" && node "${POLLING_SCRIPT}"
  echo ""
  echo -e "${GREEN}✅ Test completed${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ ✅ Setup Complete!                                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📖 Next steps:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Monitor logs:"
echo -e "     ${GREEN}tail -f ${LOG_FILE}${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Test manually:"
echo -e "     ${GREEN}cd ${CURRENT_DIR} && node ${POLLING_SCRIPT}${NC}"
echo ""
echo -e "  ${YELLOW}3.${NC} Create a test article request:"
echo -e "     ${GREEN}Go to https://jpsrealtor.com/admin/articles${NC}"
echo -e "     ${GREEN}Click 'Request Article from Claude'${NC}"
echo ""
echo -e "  ${YELLOW}4.${NC} Wait 2-5 minutes for Claude to process it"
echo ""
echo -e "${BLUE}🔧 Management commands:${NC}"
echo ""
echo -e "  ${YELLOW}•${NC} View cron jobs:    ${GREEN}crontab -l${NC}"
echo -e "  ${YELLOW}•${NC} Edit cron jobs:    ${GREEN}crontab -e${NC}"
echo -e "  ${YELLOW}•${NC} Remove this job:   ${GREEN}crontab -e${NC} (delete the line)"
echo -e "  ${YELLOW}•${NC} View logs:         ${GREEN}tail -f ${LOG_FILE}${NC}"
echo -e "  ${YELLOW}•${NC} Clear logs:        ${GREEN}sudo truncate -s 0 ${LOG_FILE}${NC}"
echo ""
echo -e "${GREEN}🎉 The system is ready to automatically create articles!${NC}"
echo ""
