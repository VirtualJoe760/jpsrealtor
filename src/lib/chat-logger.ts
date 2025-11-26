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
      // Only attempt file logging in development (not in serverless environments)
      if (process.env.NODE_ENV === 'development') {
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

        console.log('📝 Chat logger initialized:', SESSION_FILE);
      } else {
        console.log('📝 Chat logger: Using console-only mode (serverless environment)');
      }

      this.initialized = true;
    } catch (error) {
      // Silently fail in production - logging shouldn't break the app
      console.warn('Chat logger initialization failed (non-critical):', error instanceof Error ? error.message : 'Unknown error');
      this.initialized = true; // Mark as initialized anyway to prevent retry loops
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
      // Console logging always works (both dev and production)
      console.log('✅ Chat logged:', logEntry.role, logEntry.content.substring(0, 50));

      // Only attempt file writing in development
      if (process.env.NODE_ENV === 'development') {
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
      }
    } catch (error) {
      // Silently fail - logging shouldn't break the app in production
      console.warn('Chat log write failed (non-critical):', error instanceof Error ? error.message : 'Unknown error');
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
