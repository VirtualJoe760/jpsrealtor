@echo off
cd /d F:\web-clients\joseph-sardella\jpsrealtor
"C:\Program Files\nodejs\node.exe" scripts\migrate-date-fields.js --execute >> scripts\logs\date-migration.log 2>&1

