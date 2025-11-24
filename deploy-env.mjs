#!/usr/bin/env node

/**
 * Deploy .env.local to VPS
 * Uses Node.js SSH2 library to transfer the environment file
 */

import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VPS_CONFIG = {
  host: '147.182.236.138',
  port: 22,
  username: 'root',
  password: 'dstreet280'
};

const LOCAL_ENV_PATH = resolve('F:/web-clients/joseph-sardella/jpsrealtor/.env.local');
const REMOTE_ENV_PATH = '/var/www/payload/current/.env';

async function deployEnvFile() {
  console.log('🚀 Deploying .env.local to VPS...\n');

  const conn = new Client();

  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✓ SSH connection established');

      // Read local .env file
      let envContent;
      try {
        envContent = readFileSync(LOCAL_ENV_PATH, 'utf8');
        console.log(`✓ Read local .env file (${envContent.length} bytes)`);
      } catch (err) {
        conn.end();
        reject(new Error(`Failed to read local .env file: ${err.message}`));
        return;
      }

      // Write to remote server
      const command = `cat > ${REMOTE_ENV_PATH} << 'EOF'\n${envContent}\nEOF`;

      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(new Error(`Failed to execute command: ${err.message}`));
          return;
        }

        let stderr = '';

        stream.on('close', (code, signal) => {
          conn.end();

          if (code === 0) {
            console.log(`✓ Successfully deployed .env file to ${VPS_CONFIG.host}:${REMOTE_ENV_PATH}`);
            console.log('\n✅ Deployment complete!\n');
            resolve();
          } else {
            reject(new Error(`Command failed with code ${code}: ${stderr}`));
          }
        }).on('data', (data) => {
          console.log('STDOUT:', data.toString());
        }).stderr.on('data', (data) => {
          stderr += data.toString();
          console.error('STDERR:', data.toString());
        });
      });
    }).on('error', (err) => {
      reject(new Error(`SSH connection failed: ${err.message}`));
    }).connect(VPS_CONFIG);
  });
}

// Run deployment
deployEnvFile().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
