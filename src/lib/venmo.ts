export interface VenmoLinkParams {
  recipientHandle: string;
  amount: number;
  note: string;
}

export function generateVenmoDeepLink({
  recipientHandle,
  amount,
  note,
}: VenmoLinkParams): string {
  // Clean up the handle (remove @ if present)
  const cleanHandle = recipientHandle.replace(/^@/, '');
  const encodedNote = encodeURIComponent(note);
  
  return `venmo://paycharge?txn=pay&recipients=${cleanHandle}&amount=${amount.toFixed(2)}&note=${encodedNote}`;
}

export function generateVenmoWebLink({
  recipientHandle,
  amount,
  note,
}: VenmoLinkParams): string {
  const cleanHandle = recipientHandle.replace(/^@/, '');
  const encodedNote = encodeURIComponent(note);
  
  return `https://venmo.com/?txn=pay&audience=friends&recipients=${cleanHandle}&amount=${amount.toFixed(2)}&note=${encodedNote}`;
}

export function detectMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android/.test(userAgent);
}

export function getVenmoLink(params: VenmoLinkParams): string {
  return detectMobileDevice() 
    ? generateVenmoDeepLink(params)
    : generateVenmoWebLink(params);
}

export interface BillSplitVenmoData {
  userId: string;
  userName: string;
  venmoHandle: string | null;
  amount: number;
  deepLink: string;
  webLink: string;
}

export function generateBillSplitLinks(
  billDescription: string,
  members: Array<{ id: string; name: string; venmo_handle: string | null }>,
  totalAmount: number
): BillSplitVenmoData[] {
  const memberCount = members.length;
  const splitAmount = totalAmount / memberCount;
  
  return members.map((member) => {
    const note = `${billDescription} - Split ${memberCount} ways`;
    const params = {
      recipientHandle: member.venmo_handle || '',
      amount: splitAmount,
      note,
    };
    
    return {
      userId: member.id,
      userName: member.name,
      venmoHandle: member.venmo_handle,
      amount: splitAmount,
      deepLink: generateVenmoDeepLink(params),
      webLink: generateVenmoWebLink(params),
    };
  });
}
