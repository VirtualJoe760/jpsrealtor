import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createChatCompletion, GROQ_MODELS, GroqTool } from '@/lib/groq';

// Increase timeout for AI generation (30 seconds)
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    console.log('[Email Generation] Starting email generation...');

    const session = await getServerSession(authOptions);

    // Require authentication
    if (!session?.user) {
      console.error('[Email Generation] Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[Email Generation] Request body:', JSON.stringify(body, null, 2));

    const { prompt, tone, context } = body;

    if (!prompt) {
      console.error('[Email Generation] Missing required field: prompt');
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    console.log('[Email Generation] Validated input:', { prompt, tone, hasContext: !!context });

    // Define tools for email generation
    const tools: GroqTool[] = [
      {
        type: "function",
        function: {
          name: "generate_email",
          description: "Generate a professional email with subject and body content",
          parameters: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description: "Email subject line (SHORT and concise, max 50 chars)"
              },
              body: {
                type: "string",
                description: "Email body content in HTML format using <p> and <br> tags. Professional, clear, and action-oriented. NO signature block. NO closing line. Use single <br> between paragraphs. End with last content paragraph."
              }
            },
            required: ["subject", "body"]
          }
        }
      }
    ];

    // Create system prompt
    const systemPrompt = `You are a professional email assistant for Joseph Sardella, a real estate agent specializing in the Coachella Valley market (Palm Desert, La Quinta, Indian Wells, Rancho Mirage).

SUBJECT LINE:
- Keep it SHORT and concise (max 50 characters)
- Clear and specific
- No clickbait or excessive punctuation
- Action-oriented when appropriate

WRITING STYLE:
- Professional yet personable tone
- Clear and concise
- Action-oriented
- Appropriate for real estate business communication
- Include proper greeting and closing

EMAIL STRUCTURE:
1. Greeting - Use "Hi {first-name}," for personalization (the system will replace {first-name} with actual name)
2. Opening line (context or reference)
3. Main message (2-3 short paragraphs max)
4. Call to action (if applicable)
5. NO closing line (no "Best regards," etc.)
6. NO signature block

PERSONALIZATION VARIABLES (use these in greetings):
- {first-name} - Recipient's first name
- {last-name} - Recipient's last name
- {full-name} - Recipient's full name
Example greeting: "Hi {first-name}," or "Hello {first-name},"

FORMATTING - VERY IMPORTANT:
- Use HTML <p> tags for paragraphs
- Use single <br> for spacing between paragraphs (NOT <br><br>)
- Keep paragraphs SHORT (2-3 sentences max)
- NO closing line at the end
- NO signature block at the end
- Just end with the last paragraph of content
- Structure example:

<p>Hi {first-name},</p>
<br>
<p>First paragraph here with 2-3 sentences.</p>
<br>
<p>Second paragraph with more details.</p>

TONE OPTIONS:
- Professional: Formal business communication
- Friendly: Warm but professional
- Urgent: Time-sensitive matters
- Informative: Educational content
- Follow-up: Checking in on previous communication

CRITICAL RULES:
- NO signature block (name, title, phone, email)
- NO closing line (no "Best regards," "Thanks," etc.)
- Subject must be under 50 characters
- Use single <br> between paragraphs (NOT <br><br>)
- Keep it concise and scannable
- End with the last content paragraph

Use the generate_email tool to create the email.`;

    const userPrompt = `${prompt}
${tone ? `Tone: ${tone}` : 'Tone: professional'}
${context ? `Context: ${context}` : ''}

Create a professional email following all guidelines.`;

    // Call Groq with retry logic
    console.log('[Email Generation] Generating email with AI...');
    const startTime = Date.now();

    const generateWithRetry = async (retries = 2) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`[Email Generation] Attempt ${attempt}/${retries}...`);

          const completion = await Promise.race([
            createChatCompletion({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              model: GROQ_MODELS.PREMIUM,
              temperature: 0.7,
              maxTokens: 1500,
              tools,
              tool_choice: { type: "function", function: { name: "generate_email" } }
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timed out')), 25000)
            )
          ]) as any;

          return completion;
        } catch (error: any) {
          console.error(`[Email Generation] Attempt ${attempt} failed:`, error.message);

          if (attempt === retries) {
            throw error;
          }

          const waitTime = attempt * 1000;
          console.log(`[Email Generation] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    };

    const completion = await generateWithRetry();

    const duration = Date.now() - startTime;
    console.log(`[Email Generation] Email generated successfully in ${duration}ms`);

    const message = completion.choices[0]?.message;

    if (!message?.tool_calls || message.tool_calls.length === 0) {
      return NextResponse.json(
        { error: 'No email generated. Please try again.' },
        { status: 500 }
      );
    }

    const toolCall = message.tool_calls[0];
    const emailData = JSON.parse(toolCall.function.arguments);
    console.log('[Email Generation] Generated email:', JSON.stringify(emailData, null, 2));

    // Return the email
    return NextResponse.json({
      success: true,
      email: {
        subject: emailData.subject,
        body: emailData.body
      }
    });

  } catch (error: any) {
    console.error('[Email Generation] ERROR:', error);
    console.error('[Email Generation] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to generate email', details: error.message },
      { status: 500 }
    );
  }
}
