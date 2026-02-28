import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { splitId, billId } = body;

    if (!splitId) {
      return NextResponse.json(
        { error: 'splitId is required' },
        { status: 400 }
      );
    }

    // Mark split as paid
    const { error: updateError } = await supabase
      .from('bill_splits')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', splitId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update split', details: updateError },
        { status: 500 }
      );
    }

    // Check if all splits are paid and update bill status
    if (billId) {
      const { data: splits, error: splitsError } = await supabase
        .from('bill_splits')
        .select('status')
        .eq('bill_id', billId);

      if (!splitsError && splits) {
        const allPaid = splits.every((s) => s.status === 'paid');
        
        if (allPaid) {
          await supabase
            .from('bills')
            .update({ status: 'settled' })
            .eq('id', billId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating split:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
