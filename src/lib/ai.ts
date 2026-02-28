export type ChoreType = 'trash' | 'dishes' | 'bathroom' | 'vacuum' | 'groceries' | 'beer'

export interface AIVerificationResult {
  status: 'verified' | 'pending' | 'rejected'
  confidence: number
  reasoning?: string
}

const CHORE_DESCRIPTIONS: Record<ChoreType, string> = {
  trash: 'a full trash bag that has been taken out, or trash bins being emptied',
  dishes: 'clean dishes, a dishwasher being loaded/unloaded, or a sink full of washed dishes',
  bathroom: 'a clean bathroom, toilet, shower, or sink that has been recently cleaned',
  vacuum: 'someone vacuuming, a vacuum cleaner, or freshly vacuumed carpets/floors',
  groceries: 'grocery bags, groceries being put away, or a fridge stocked with food',
  beer: 'beer, alcoholic beverages, or a fridge with drinks'
}

/**
 * Verify if a photo shows a completed chore using server-side AI
 */
export async function verifyChorePhoto(
  photoUrl: string,
  choreType: ChoreType
): Promise<AIVerificationResult> {
  try {
    const response = await fetch('/api/verify-chore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photoUrl,
        choreType,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Verification failed')
    }

    const result = await response.json()
    return result

  } catch (error: any) {
    console.error('AI verification error:', error)
    
    // Return pending if AI fails - don't block the user
    return {
      status: 'pending',
      confidence: 0,
      reasoning: 'AI verification failed, manual review needed'
    }
  }
}

/**
 * Get human-readable description of chore type
 */
export function getChoreDescription(choreType: ChoreType): string {
  return CHORE_DESCRIPTIONS[choreType] || choreType
}