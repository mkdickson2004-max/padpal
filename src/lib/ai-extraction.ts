import { z } from 'zod';

const billSchema = z.object({
  vendor: z.string().describe('The utility company or vendor name'),
  totalAmount: z.number().positive().describe('The total bill amount in dollars'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The due date in YYYY-MM-DD format'),
  billType: z.enum(['electric', 'gas', 'internet', 'water', 'rent', 'other']).describe('Type of bill'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the extraction'),
});

export type ExtractedBill = z.infer<typeof billSchema>;

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

If you cannot find a field, use your best judgment. Set confidence based on how clearly the information was found.

Email content:
`;

export async function extractBillFromEmail(
  emailSubject: string,
  emailBody: string,
  emailFrom: string
): Promise<ExtractedBill | null> {
  try {
    // Use the API route instead of direct OpenAI call
    const response = await fetch('/api/parse-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailSubject,
        emailBody,
        emailFrom,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error extracting bill:', error);
      return null;
    }

    const data = await response.json();
    
    if (data.bill && data.bill.confidence < 0.5) {
      console.warn('Low confidence in bill extraction:', data.bill);
      return null;
    }

    return data.bill;
  } catch (error) {
    console.error('Error extracting bill from email:', error);
    return null;
  }
}

export function isUtilityEmail(from: string, subject: string): boolean {
  const utilityKeywords = [
    'electric', 'gas', 'utility', 'internet', 'water', 'bill', 'invoice',
    'payment due', 'statement', 'balance', 'duke energy', 'con edison',
    'comcast', 'verizon', 'att', 'spectrum', 'pg&e', 'national grid'
  ];
  
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  
  return utilityKeywords.some(keyword => 
    lowerFrom.includes(keyword) || lowerSubject.includes(keyword)
  );
}
