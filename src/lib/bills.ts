import { supabase } from './supabase';
import type { Bill, BillSplit } from './supabase';

export interface CreateBillInput {
  houseId: string;
  vendor: string;
  totalAmount: number;
  dueDate: string;
  billType: string;
  splits: Array<{
    userId: string;
    amount: number;
    venmoLink: string;
  }>;
}

export async function createBill(input: CreateBillInput): Promise<Bill | null> {
  // Create the bill
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      house_id: input.houseId,
      vendor: input.vendor,
      total_amount: input.totalAmount,
      due_date: input.dueDate,
      status: 'open',
      bill_type: input.billType,
    })
    .select()
    .single();

  if (billError || !bill) {
    console.error('Error creating bill:', billError);
    return null;
  }

  // Create splits
  const splitsData = input.splits.map((split) => ({
    bill_id: bill.id,
    user_id: split.userId,
    amount: split.amount,
    venmo_link: split.venmoLink,
    status: 'requested' as const,
  }));

  const { error: splitsError } = await supabase
    .from('bill_splits')
    .insert(splitsData);

  if (splitsError) {
    console.error('Error creating bill splits:', splitsError);
    // Could rollback here, but for now we'll continue
  }

  return bill;
}

export async function getBillsByHouse(houseId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('house_id', houseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bills:', error);
    return [];
  }

  return data || [];
}

export async function getBillSplits(billId: string): Promise<BillSplit[]> {
  const { data, error } = await supabase
    .from('bill_splits')
    .select('*, users(*)')
    .eq('bill_id', billId);

  if (error) {
    console.error('Error fetching bill splits:', error);
    return [];
  }

  return data || [];
}

export async function markSplitAsPaid(splitId: string): Promise<boolean> {
  const { error } = await supabase
    .from('bill_splits')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', splitId);

  if (error) {
    console.error('Error marking split as paid:', error);
    return false;
  }

  return true;
}

export async function checkAndUpdateBillStatus(billId: string): Promise<void> {
  // Get all splits for this bill
  const { data: splits, error } = await supabase
    .from('bill_splits')
    .select('status')
    .eq('bill_id', billId);

  if (error || !splits) return;

  // Check if all splits are paid
  const allPaid = splits.every((s) => s.status === 'paid');

  if (allPaid) {
    await supabase
      .from('bills')
      .update({ status: 'settled' })
      .eq('id', billId);
  }
}

export async function getPendingBillsForUser(userId: string): Promise<Array<Bill & { split: BillSplit }>> {
  const { data, error } = await supabase
    .from('bill_splits')
    .select('*, bills(*)')
    .eq('user_id', userId)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending bills:', error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row.bills,
    split: row,
  }));
}
