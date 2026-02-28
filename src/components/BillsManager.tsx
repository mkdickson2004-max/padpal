import { useState, useEffect } from 'react';
import { supabase, type Bill, type BillSplit, type User } from '@/lib/supabase';
import { 
  getBillsByHouse, 
  getBillSplits, 
  markSplitAsPaid, 
  checkAndUpdateBillStatus,
  createBill,
  type CreateBillInput 
} from '@/lib/bills';
import { generateBillSplitLinks, getVenmoLink, type BillSplitVenmoData } from '@/lib/venmo';
import { extractBillFromEmail, isUtilityEmail, type ExtractedBill } from '@/lib/ai-extraction';
import { 
  Receipt, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface BillsManagerProps {
  houseId: string;
  members: Array<User & { id: string }>;
  currentUserId: string;
}

interface BillWithSplits extends Bill {
  splits: Array<BillSplit & { user?: User }>;
  venmoData?: BillSplitVenmoData[];
}

export default function BillsManager({ houseId, members, currentUserId }: BillsManagerProps) {
  const [bills, setBills] = useState<BillWithSplits[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailParseModal, setShowEmailParseModal] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  
  // Create bill form state
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [billType, setBillType] = useState('other');
  const [creating, setCreating] = useState(false);
  
  // Email parse state
  const [emailContent, setEmailContent] = useState('');
  const [parsingEmail, setParsingEmail] = useState(false);
  const [parsedBill, setParsedBill] = useState<ExtractedBill | null>(null);

  useEffect(() => {
    loadBills();
  }, [houseId]);

  const loadBills = async () => {
    setLoading(true);
    const billsData = await getBillsByHouse(houseId);
    
    // Load splits for each bill
    const billsWithSplits = await Promise.all(
      billsData.map(async (bill) => {
        const splits = await getBillSplits(bill.id);
        // Generate venmo links for splits
        const memberData = members.map(m => ({
          id: m.id,
          name: m.name,
          venmo_handle: m.venmo_handle,
        }));
        const venmoData = generateBillSplitLinks(
          `${bill.vendor} - ${bill.bill_type || 'bill'}`,
          memberData,
          bill.total_amount
        );
        return { ...bill, splits, venmoData };
      })
    );
    
    setBills(billsWithSplits);
    setLoading(false);
  };

  const handleCreateBill = async () => {
    if (!vendor || !amount || !dueDate) return;
    
    setCreating(true);
    const totalAmount = parseFloat(amount);
    const splitAmount = totalAmount / members.length;
    
    const venmoData = generateBillSplitLinks(
      `${vendor} - ${billType}`,
      members.map(m => ({ id: m.id, name: m.name, venmo_handle: m.venmo_handle })),
      totalAmount
    );
    
    const input: CreateBillInput = {
      houseId,
      vendor,
      totalAmount,
      dueDate,
      billType,
      splits: members.map((member, idx) => ({
        userId: member.id,
        amount: splitAmount,
        venmoLink: venmoData[idx]?.webLink || '',
      })),
    };
    
    await createBill(input);
    setCreating(false);
    setShowCreateModal(false);
    resetForm();
    loadBills();
  };

  const handleParseEmail = async () => {
    if (!emailContent.trim()) return;
    
    setParsingEmail(true);
    // Extract from: and subject: lines if present
    const lines = emailContent.split('\n');
    let fromLine = '';
    let subjectLine = '';
    let bodyStart = 0;
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].toLowerCase().startsWith('from:')) {
        fromLine = lines[i].substring(5).trim();
      } else if (lines[i].toLowerCase().startsWith('subject:')) {
        subjectLine = lines[i].substring(8).trim();
        bodyStart = i + 1;
        break;
      }
    }
    
    const body = lines.slice(bodyStart).join('\n');
    
    const extracted = await extractBillFromEmail(subjectLine, body, fromLine || 'unknown@sender.com');
    setParsedBill(extracted);
    setParsingEmail(false);
    
    if (extracted) {
      setVendor(extracted.vendor);
      setAmount(extracted.totalAmount.toString());
      setDueDate(extracted.dueDate);
      setBillType(extracted.billType);
    }
  };

  const handleMarkAsPaid = async (splitId: string, billId: string) => {
    const success = await markSplitAsPaid(splitId);
    if (success) {
      await checkAndUpdateBillStatus(billId);
      loadBills();
    }
  };

  const resetForm = () => {
    setVendor('');
    setAmount('');
    setDueDate('');
    setBillType('other');
    setEmailContent('');
    setParsedBill(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowEmailParseModal(true)}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          <Mail size={20} />
          Parse Email Bill
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Manual Split
        </button>
      </div>

      {/* Bills List */}
      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="font-bold text-lg mb-2">No Bills Yet</h3>
          <p className="text-gray-500 text-sm">
            Forward a utility email or create a manual split to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => {
            const daysUntil = getDaysUntilDue(bill.due_date);
            const isExpanded = expandedBill === bill.id;
            const userSplit = bill.splits.find(s => s.user_id === currentUserId);
            const paidCount = bill.splits.filter(s => s.status === 'paid').length;
            const totalSplits = bill.splits.length;
            
            return (
              <div key={bill.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Bill Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        bill.status === 'settled' 
                          ? 'bg-green-100 text-green-600' 
                          : daysUntil < 0 
                            ? 'bg-red-100 text-red-600'
                            : daysUntil < 3
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-blue-100 text-blue-600'
                      }`}>
                        {bill.status === 'settled' ? (
                          <CheckCircle size={20} />
                        ) : (
                          <Receipt size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold">{bill.vendor}</h3>
                        <p className="text-sm text-gray-500 capitalize">{bill.bill_type || 'bill'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(bill.total_amount)}</p>
                      <p className={`text-xs ${
                        daysUntil < 0 ? 'text-red-500' : daysUntil < 3 ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {daysUntil < 0 
                          ? `${Math.abs(daysUntil)} days overdue` 
                          : daysUntil === 0 
                            ? 'Due today'
                            : `${daysUntil} days left`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {paidCount}/{totalSplits} paid
                      </span>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(paidCount / totalSplits) * 100}%` }}
                        />
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Splits */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-3">
                    {bill.splits.map((split, idx) => {
                      const member = members.find(m => m.id === split.user_id);
                      const venmoLink = bill.venmoData?.[idx];
                      const isCurrentUser = split.user_id === currentUserId;
                      
                      return (
                        <div key={split.id} className={`flex items-center justify-between p-3 rounded-xl ${
                          isCurrentUser ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {member?.name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{member?.name || 'Unknown'}</p>
                              {split.status === 'paid' ? (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle size={12} /> Paid
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">{formatCurrency(split.amount)}</span>
                              )}
                            </div>
                          </div>
                          
                          {split.status === 'paid' ? (
                            <span className="text-xs text-green-600 font-medium">✓ Settled</span>
                          ) : isCurrentUser ? (
                            <div className="flex gap-2">
                              {member?.venmo_handle && venmoLink && (
                                <a
                                  href={venmoLink.webLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition"
                                >
                                  <CreditCard size={14} />
                                  Pay
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              <button
                                onClick={() => handleMarkAsPaid(split.id, bill.id)}
                                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                              >
                                Mark Paid
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-yellow-600">Pending</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Bill Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create Bill Split</h3>
              <button 
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vendor / What for?</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g., Electric Company, Pizza"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Bill Type</label>
                <select
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="electric">Electric</option>
                  <option value="gas">Gas</option>
                  <option value="water">Water</option>
                  <option value="internet">Internet</option>
                  <option value="rent">Rent</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {amount && members.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="text-sm text-blue-800">
                    Each person pays: <span className="font-bold">
                      {formatCurrency(parseFloat(amount || '0') / members.length)}
                    </span>
                  </p>
                </div>
              )}
              
              <button
                onClick={handleCreateBill}
                disabled={!vendor || !amount || !dueDate || creating}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                {creating ? 'Creating...' : 'Create Split'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Parse Modal */}
      {showEmailParseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Parse Bill from Email</h3>
              <button 
                onClick={() => { setShowEmailParseModal(false); resetForm(); }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Paste the content of your utility bill email below. AI will extract the vendor, amount, and due date.
              </p>
              
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="From: utility@company.com\nSubject: Your bill is ready\n\nYour bill amount is $150.00 due on 03/15/2024..."
                rows={6}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
              />
              
              <button
                onClick={handleParseEmail}
                disabled={!emailContent.trim() || parsingEmail}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {parsingEmail ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                {parsingEmail ? 'Parsing...' : 'Extract Bill Info'}
              </button>
              
              {parsedBill && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="font-semibold text-green-800">Bill Extracted!</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><span className="font-medium">Vendor:</span> {parsedBill.vendor}</p>
                    <p><span className="font-medium">Amount:</span> {formatCurrency(parsedBill.totalAmount)}</p>
                    <p><span className="font-medium">Due Date:</span> {parsedBill.dueDate}</p>
                    <p><span className="font-medium">Type:</span> {parsedBill.billType}</p>
                  </div>
                </div>
              )}
              
              {parsedBill && (
                <button
                  onClick={() => { setShowEmailParseModal(false); setShowCreateModal(true); }}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Create This Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
