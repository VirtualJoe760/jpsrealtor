import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert email writer for a real estate professional. Generate professional, well-formatted HTML emails based on the user's request.

Guidelines:
- Use proper HTML formatting with paragraphs (<p>), line breaks (<br>), and styling
- Keep the tone professional but friendly
- Include appropriate greetings and sign-offs
- Format the email for readability
- Do not include subject lines or recipient information - only the email body
- Use inline styles for formatting when needed

Return ONLY the HTML email body content, no additional text or explanations.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Using Groq's fast model
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[AI Email Generation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate email' },
      { status: 500 }
    );
  }
}
