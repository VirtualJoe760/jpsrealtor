// src/lib/vps-ssh.ts
// SSH connection to VPS for launching Claude Code sessions

import { Client } from "ssh2";

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

const VPS_CONFIG: SSHConfig = {
  host: process.env.VPS_HOST || "147.182.236.138",
  port: parseInt(process.env.VPS_PORT || "22"),
  username: process.env.VPS_USERNAME || "root",
  password: process.env.VPS_PASSWORD || "dstreet280",
};

/**
 * Execute a command on the VPS via SSH
 */
export async function executeVPSCommand(
  command: string,
  options: {
    workingDir?: string;
    timeout?: number;
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error("SSH command timeout"));
    }, options.timeout || 30000);

    conn
      .on("ready", () => {
        const workingDir = options.workingDir || "/root/jpsrealtor";
        const fullCommand = `cd ${workingDir} && ${command}`;

        conn.exec(fullCommand, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            reject(err);
            return;
          }

          stream
            .on("close", (code: number) => {
              clearTimeout(timeout);
              conn.end();
              resolve({
                stdout,
                stderr,
                exitCode: code,
              });
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString();
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString();
            });
        });
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .connect(VPS_CONFIG);
  });
}

/**
 * Launch Claude Code on VPS with a specific prompt
 */
export async function launchClaudeOnVPS(
  prompt: string,
  options: {
    articleId?: string;
    category?: string;
    mode?: "create" | "edit" | "review";
  } = {}
): Promise<{
  sessionId: string;
  command: string;
  message: string;
}> {
  const { articleId, category, mode = "create" } = options;

  // Build the context for Claude
  let claudePrompt = "";

  switch (mode) {
    case "create":
      claudePrompt = `You are helping draft a new article for JPSRealtor.com.

**Task:** ${prompt}

**Category:** ${category || "articles"}

**Instructions:**
1. Review existing articles in /root/jpsrealtor/src/posts/ to match our tone and style
2. Draft a new article in MDX format
3. Save it to the MongoDB database using the Article model
4. Include proper frontmatter with SEO fields
5. Upload featured image to Cloudinary (use existing credentials in .env)

**Output:**
Create the article and save it to the database, then provide the article ID and preview URL.`;
      break;

    case "edit":
      claudePrompt = `You are helping edit an existing article for JPSRealtor.com.

**Task:** ${prompt}

**Article ID:** ${articleId}

**Instructions:**
1. Fetch the article from MongoDB (Article.findById("${articleId}"))
2. Make the requested changes
3. Save the updated article back to the database
4. Maintain the existing style and tone

**Output:**
Update the article and confirm the changes made.`;
      break;

    case "review":
      claudePrompt = `You are reviewing articles for JPSRealtor.com to learn the writing style and tone.

**Task:** ${prompt}

**Instructions:**
1. Read articles from /root/jpsrealtor/src/posts/
2. Analyze the writing style, tone, and structure
3. Note key characteristics:
   - Tone (professional vs casual)
   - Sentence structure
   - Use of data and statistics
   - Call-to-action patterns
   - SEO optimization techniques
4. Summarize the style guide

**Output:**
Provide a detailed style analysis that will guide future article creation.`;
      break;
  }

  // Create a temporary file with the prompt
  const promptFile = `/tmp/claude-prompt-${Date.now()}.txt`;
  const createPromptCommand = `echo "${claudePrompt.replace(/"/g, '\\"')}" > ${promptFile}`;

  try {
    // Create the prompt file
    await executeVPSCommand(createPromptCommand);

    // Launch Claude Code with the prompt
    const claudeCommand = `nohup claude --prompt "$(cat ${promptFile})" > /tmp/claude-session-${Date.now()}.log 2>&1 &`;

    const result = await executeVPSCommand(claudeCommand, {
      workingDir: "/root/jpsrealtor",
      timeout: 5000,
    });

    // Extract session/process info
    const sessionId = `claude-${Date.now()}`;

    return {
      sessionId,
      command: claudeCommand,
      message: "Claude Code session launched on VPS",
    };
  } catch (error) {
    console.error("Failed to launch Claude on VPS:", error);
    throw new Error("Failed to launch Claude Code on VPS");
  }
}

/**
 * Check if Claude Code is installed on VPS
 */
export async function checkClaudeInstallation(): Promise<{
  installed: boolean;
  version?: string;
  path?: string;
}> {
  try {
    const result = await executeVPSCommand("which claude && claude --version", {
      timeout: 5000,
    });

    if (result.exitCode === 0) {
      const lines = result.stdout.trim().split("\n");
      return {
        installed: true,
        path: lines[0],
        version: lines[1],
      };
    }

    return {
      installed: false,
    };
  } catch (error) {
    return {
      installed: false,
    };
  }
}

/**
 * Get active Claude sessions on VPS
 */
export async function getActiveClaudeSessions(): Promise<
  Array<{
    pid: string;
    command: string;
    startTime: string;
  }>
> {
  try {
    const result = await executeVPSCommand(
      "ps aux | grep '[c]laude' | grep -v grep"
    );

    if (result.exitCode !== 0 || !result.stdout.trim()) {
      return [];
    }

    const lines = result.stdout.trim().split("\n");
    return lines.map((line) => {
      const parts = line.split(/\s+/);
      return {
        pid: parts[1],
        startTime: `${parts[8]} ${parts[9]}`,
        command: parts.slice(10).join(" "),
      };
    });
  } catch (error) {
    console.error("Failed to get Claude sessions:", error);
    return [];
  }
}

/**
 * Kill a Claude session on VPS
 */
export async function killClaudeSession(pid: string): Promise<boolean> {
  try {
    const result = await executeVPSCommand(`kill ${pid}`);
    return result.exitCode === 0;
  } catch (error) {
    console.error("Failed to kill Claude session:", error);
    return false;
  }
}
