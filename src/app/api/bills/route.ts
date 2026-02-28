import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { generateBillSplitLinks } from '@/lib/venmo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { houseId, vendor, totalAmount, dueDate, billType, members } = body;

    if (!houseId || !vendor || !totalAmount || !dueDate || !members?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        house_id: houseId,
        vendor,
        total_amount: totalAmount,
        due_date: dueDate,
        status: 'open',
        bill_type: billType || 'other',
      })
      .select()
      .single();

    if (billError || !bill) {
      return NextResponse.json(
        { error: 'Failed to create bill', details: billError },
        { status: 500 }
      );
    }

    // Generate Venmo links
    const memberData = members.map((m: any) => ({
      id: m.id,
      name: m.name,
      venmo_handle: m.venmo_handle,
    }));

    const venmoData = generateBillSplitLinks(
      `${vendor} - ${billType || 'bill'}`,
      memberData,
      totalAmount
    );

    // Create splits
    const splitAmount = totalAmount / members.length;
    const splitsData = members.map((member: any, idx: number) => ({
      bill_id: bill.id,
      user_id: member.id,
      amount: splitAmount,
      venmo_link: venmoData[idx]?.webLink || '',
      status: 'requested',
    }));

    const { error: splitsError } = await supabase
      .from('bill_splits')
      .insert(splitsData);

    if (splitsError) {
      return NextResponse.json(
        { error: 'Failed to create bill splits', details: splitsError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, bill });
  } catch (error) {
    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('houseId');

    if (!houseId) {
      return NextResponse.json(
        { error: 'houseId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: bills, error } = await supabase
      .from('bills')
      .select('*, bill_splits(*)')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bills', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ bills });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
