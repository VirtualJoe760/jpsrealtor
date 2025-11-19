// src/lib/chat-logger.ts
// Local file-based chat logging for debugging

import { writeFile, appendFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'local-logs', 'chat-records');
const SESSION_FILE = path.join(LOG_DIR, `session-${Date.now()}.json`);
const SUMMARY_FILE = path.join(LOG_DIR, 'chat-summary.txt');

export interface ChatLogEntry {
  timestamp: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    [key: string]: any; // Allow any additional metadata properties
  };
}

class ChatLogger {
  private sessionId: string;
  private logs: ChatLogEntry[] = [];
  private initialized: boolean = false;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Create directory if it doesn't exist
      if (!existsSync(LOG_DIR)) {
        await mkdir(LOG_DIR, { recursive: true });
      }

      // Initialize session file
      await writeFile(SESSION_FILE, JSON.stringify({
        sessionId: this.sessionId,
        startTime: new Date().toISOString(),
        logs: []
      }, null, 2));

      this.initialized = true;
      console.log('📝 Chat logger initialized:', SESSION_FILE);
    } catch (error) {
      console.error('Failed to initialize chat logger:', error);
    }
  }

  async log(entry: Omit<ChatLogEntry, 'timestamp' | 'sessionId'>) {
    if (!this.initialized) {
      await this.init();
    }

    const logEntry: ChatLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    this.logs.push(logEntry);

    try {
      // Write to session file
      const sessionData = {
        sessionId: this.sessionId,
        startTime: this.logs[0]?.timestamp || new Date().toISOString(),
        messageCount: this.logs.length,
        logs: this.logs
      };

      await writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2));

      // Append to summary file for easy reading
      const summaryLine = `[${logEntry.timestamp}] ${logEntry.role.toUpperCase()}: ${logEntry.content.substring(0, 100)}${logEntry.content.length > 100 ? '...' : ''}\n`;
      await appendFile(SUMMARY_FILE, summaryLine).catch(() => {
        // If file doesn't exist, create it
        writeFile(SUMMARY_FILE, summaryLine);
      });

      console.log('✅ Logged:', logEntry.role, logEntry.content.substring(0, 50));
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  async getSession() {
    try {
      const data = await readFile(SESSION_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  getSessionId() {
    return this.sessionId;
  }

  getLogs() {
    return this.logs;
  }
}

// Export singleton instance
export const chatLogger = new ChatLogger();

// Helper function to log messages easily
export async function logChatMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  userId: string,
  metadata?: ChatLogEntry['metadata']
) {
  await chatLogger.log({
    userId,
    role,
    content,
    metadata
  });
}
