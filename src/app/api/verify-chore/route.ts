import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const CHORE_DESCRIPTIONS: Record<string, string> = {
  trash: 'a full trash bag that has been taken out, or trash bins being emptied',
  dishes: 'clean dishes, a dishwasher being loaded/unloaded, or a sink full of washed dishes',
  bathroom: 'a clean bathroom, toilet, shower, or sink that has been recently cleaned',
  vacuum: 'someone vacuuming, a vacuum cleaner, or freshly vacuumed carpets/floors',
  groceries: 'grocery bags, groceries being put away, or a fridge stocked with food',
  beer: 'beer, alcoholic beverages, or a fridge with drinks'
}

export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { 
          status: 'pending',
          confidence: 0,
          reasoning: 'AI verification not configured. Set OPENAI_API_KEY environment variable.'
        },
        { status: 200 }
      );
    }

    const { photoUrl, choreType } = await request.json()

    if (!photoUrl || !choreType) {
      return NextResponse.json(
        { message: 'Missing photoUrl or choreType' },
        { status: 400 }
      )
    }

    const choreDescription = CHORE_DESCRIPTIONS[choreType] || choreType

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a chore verification system. Analyze photos to determine if they show a completed chore. Be fair but accurate. Look for visual evidence that the chore was actually done.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Does this photo show ${choreDescription} completed? 

Respond in this exact format:
VERDICT: [YES or NO]
CONFIDENCE: [0-100]
REASONING: [brief explanation]

Be realistic - if someone shows a dishwasher half-loaded, that's probably not "completed". But don't be overly strict either. The goal is to prevent fake check-ins while being fair to roommates.`
            },
            {
              type: 'image_url',
              image_url: {
                url: photoUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    // Parse the response
    const verdictMatch = content.match(/VERDICT:\s*(YES|NO)/i)
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i)
    const reasoningMatch = content.match(/REASONING:\s*([\s\S]+)/i)

    const verdict = verdictMatch?.[1]?.toUpperCase()
    const confidence = parseInt(confidenceMatch?.[1] || '0', 10)
    const reasoning = reasoningMatch?.[1]?.trim()

    // Determine status based on confidence thresholds
    let status: 'verified' | 'pending' | 'rejected'
    if (verdict === 'YES' && confidence > 70) {
      status = 'verified'
    } else if (verdict === 'YES' && confidence >= 50) {
      status = 'pending'
    } else if (verdict === 'NO' && confidence > 70) {
      status = 'rejected'
    } else {
      status = 'pending'
    }

    return NextResponse.json({
      status,
      confidence,
      reasoning
    })

  } catch (error: any) {
    console.error('AI verification error:', error)
    
    return NextResponse.json(
      { 
        status: 'pending',
        confidence: 0,
        reasoning: 'AI verification failed, manual review needed'
      },
      { status: 200 } // Return 200 so client doesn't error
    )
  }
}
