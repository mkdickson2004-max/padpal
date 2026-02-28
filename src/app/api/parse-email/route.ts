import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const EXTRACTION_PROMPT = `Extract bill information from the following email content. 

Look for:
- Vendor/Company name (utility company, landlord, etc.)
- Total amount due (just the number, no $ sign)
- Due date (convert to YYYY-MM-DD format)
- Bill type (electric, gas, internet, water, rent, or other)

Return ONLY a valid JSON object with these exact keys:
{
  "vendor": "string",
  "totalAmount": number,
  "dueDate": "YYYY-MM-DD",
  "billType": "electric|gas|internet|water|rent|other",
  "confidence": number between 0 and 1
}

Set confidence based on how clearly the information was found (1 = very clear, 0 = couldn't find).

Email content:
`;

export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI not configured. Set OPENAI_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { emailSubject, emailBody, emailFrom } = body;

    if (!emailBody) {
      return NextResponse.json(
        { error: 'Email body is required' },
        { status: 400 }
      );
    }

    const fullContent = `From: ${emailFrom || 'unknown@sender.com'}\nSubject: ${emailSubject || ''}\n\n${emailBody}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts bill information from emails. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: EXTRACTION_PROMPT + fullContent,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Could not extract bill information from email' },
        { status: 422 }
      );
    }

    const extractedBill = JSON.parse(content);

    return NextResponse.json({ 
      success: true, 
      bill: extractedBill 
    });
  } catch (error) {
    console.error('Error parsing email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
