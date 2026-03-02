import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// ============================================
// HOUSE CHAT / AI COMPANION SCREEN
// ============================================

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'roommate' | 'ai';
  senderName: string;
  timestamp: string;
  avatar?: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Hey everyone! Dont forget to take out the trash tonight 🗑️',
    sender: 'roommate',
    senderName: 'Sarah',
    timestamp: '2:30 PM',
    avatar: '👩🏻',
  },
  {
    id: '2',
    text: 'Got it! Ill handle it after dinner 👍',
    sender: 'me',
    senderName: 'You',
    timestamp: '2:32 PM',
  },
  {
    id: '3',
    text: '🤖 Aurelius here! Reminder: Kitchen cleanup is due tomorrow. Jake, its your turn on the rotation!',
    sender: 'ai',
    senderName: 'Aurelius',
    timestamp: '2:45 PM',
  },
  {
    id: '4',
    text: 'Thanks Aurelius! Ill knock it out first thing in the morning 🧽',
    sender: 'roommate',
    senderName: 'Jake',
    timestamp: '2:47 PM',
    avatar: '👨🏽',
  },
  {
    id: '5',
    text: 'Anyone want to split a pizza tonight? 🍕',
    sender: 'roommate',
    senderName: 'Mike',
    timestamp: '3:15 PM',
    avatar: '👨🏼',
  },
  {
    id: '6',
    text: 'Count me in! Pepperoni please 😋',
    sender: 'me',
    senderName: 'You',
    timestamp: '3:16 PM',
  },
];

const roommates = [
  { id: '1', name: 'Sarah', avatar: '👩🏻', isOnline: true },
  { id: '2', name: 'Jake', avatar: '👨🏽', isOnline: true },
  { id: '3', name: 'Mike', avatar: '👨🏼', isOnline: false },
  { id: '4', name: 'You', avatar: '😎', isOnline: true },
];

export function HouseChatScreen() {
  const [inputText, setInputText] = useState('');

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender === 'me';
    const isAI = item.sender === 'ai';

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMe && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{isAI ? '🤖' : item.avatar}</Text>
            {item.sender !== 'ai' && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
        )}
        <View style={styles.messageContent}>
          {!isMe && (
            <Text style={styles.senderName}>
              {item.senderName} {isAI && '⚡'}
            </Text>
          )}
          <View
            style={[
              styles.messageBubble,
              isMe
                ? styles.myBubble
                : isAI
                ? styles.aiBubble
                : styles.otherBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.otherMessageText,
                isAI && styles.aiMessageText,
              ]}
            >
              {item.text}
            </Text>
          </View>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏠 House Chat</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.roommatesScroll}
        >
          {roommates.map((roommate) => (
            <View key={roommate.id} style={styles.roommateItem}>
              <View style={styles.roommateAvatar}>
                <Text style={styles.roommateEmoji}>{roommate.avatar}</Text>
                {roommate.isOnline && <View style={styles.onlineDot} />}
              </View>
              <Text style={styles.roommateName}>{roommate.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* AI Status Card */}
      <View style={styles.aiStatusCard}>
        <View style={styles.aiStatusIcon}>
          <Text style={styles.aiStatusEmoji}>🤖</Text>
        </View>
        <View style={styles.aiStatusContent}>
          <Text style={styles.aiStatusTitle}>Aurelius is watching</Text>
          <Text style={styles.aiStatusText}>
            Ill drop chore reminders & keep things organized!
          </Text>
        </View>
        <View style={styles.aiActiveBadge}>
          <Text style={styles.aiActiveText}>ON ⚡</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={mockMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollScrollIndicator={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Message your house..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// BILLS & EXPENSES SCREEN
// ============================================

interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  owedBy: string;
  owedAmount: number;
  date: string;
  category: string;
  icon: string;
  isPaid: boolean;
  receipt?: boolean;
}

const mockExpenses: Expense[] = [
  {
    id: '1',
    title: 'Electric Bill',
    amount: 145.0,
    paidBy: 'Sarah',
    owedBy: 'You',
    owedAmount: 36.25,
    date: 'Mar 1',
    category: 'Utilities',
    icon: '⚡',
    isPaid: false,
    receipt: true,
  },
  {
    id: '2',
    title: 'Groceries - Trader Joes',
    amount: 89.5,
    paidBy: 'Mike',
    owedBy: 'You',
    owedAmount: 22.38,
    date: 'Feb 28',
    category: 'Food',
    icon: '🛒',
    isPaid: false,
    receipt: true,
  },
  {
    id: '3',
    title: 'Internet Bill',
    amount: 79.99,
    paidBy: 'You',
    owedBy: 'Jake',
    owedAmount: 20.0,
    date: 'Feb 25',
    category: 'Utilities',
    icon: '🌐',
    isPaid: true,
    receipt: true,
  },
  {
    id: '4',
    title: 'Toiletries & Cleaning',
    amount: 34.67,
    paidBy: 'Jake',
    owedBy: 'You',
    owedAmount: 8.67,
    date: 'Feb 22',
    category: 'Supplies',
    icon: '🧼',
    isPaid: false,
  },
  {
    id: '5',
    title: 'Pizza Night',
    amount: 48.0,
    paidBy: 'Sarah',
    owedBy: 'You',
    owedAmount: 12.0,
    date: 'Feb 20',
    category: 'Food',
    icon: '🍕',
    isPaid: true,
  },
];

const balanceSummary = {
  youOwe: 67.3,
  owedToYou: 20.0,
  netBalance: -47.3,
};

export function BillsExpensesScreen() {
  const [expenses, setExpenses] = useState(mockExpenses);

  const togglePaid = (id: string) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, isPaid: !exp.isPaid } : exp))
    );
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseIconContainer}>
          <Text style={styles.expenseIcon}>{item.icon}</Text>
        </View>
        <View style={styles.expenseTitleContainer}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <Text style={styles.expenseCategory}>{item.category}</Text>
        </View>
        <View style={styles.expenseAmountContainer}>
          <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
          <Text style={styles.expenseDate}>{item.date}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.expenseDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>💰 Paid by</Text>
          <Text style={styles.detailValue}>{item.paidBy}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🫵 You owe</Text>
          <Text
            style={[
              styles.detailValue,
              styles.oweAmount,
              item.isPaid && styles.paidAmount,
            ]}
          >
            ${item.owedAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.expenseActions}>
        {item.receipt && (
          <TouchableOpacity style={styles.receiptButton}>
            <Text style={styles.receiptIcon}>📄</Text>
            <Text style={styles.receiptText}>View Receipt</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.payButton, item.isPaid && styles.paidButton]}
          onPress={() => togglePaid(item.id)}
        >
          <Text style={styles.payButtonText}>
            {item.isPaid ? '✅ Paid' : '💸 Mark Paid'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.billsHeader}>
        <Text style={styles.billsHeaderTitle}>💳 Bills & Expenses</Text>
        <Text style={styles.billsHeaderSubtitle}>Track shared costs & settle up</Text>
      </View>

      {/* Balance Summary Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Your Balance</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>You Owe</Text>
            <Text style={styles.balanceNegative}>
              -${balanceSummary.youOwe.toFixed(2)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Owed to You</Text>
            <Text style={styles.balancePositive}>
              +${balanceSummary.owedToYou.toFixed(2)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Net</Text>
            <Text
              style={[
                styles.balanceNet,
                balanceSummary.netBalance < 0
                  ? styles.balanceNegative
                  : styles.balancePositive,
              ]}
            >
              {balanceSummary.netBalance < 0 ? '-' : '+'}
              ${Math.abs(balanceSummary.netBalance).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Upload Receipt Card */}
      <TouchableOpacity style={styles.uploadCard}>
        <View style={styles.uploadIconContainer}>
          <Text style={styles.uploadIcon}>📤</Text>
        </View>
        <View style={styles.uploadContent}>
          <Text style={styles.uploadTitle}>Upload Receipt</Text>
          <Text style={styles.uploadText}>
            Scan or upload a receipt to split with roommates
          </Text>
        </View>
        <Text style={styles.uploadArrow}>→</Text>
      </TouchableOpacity>

      {/* Expenses List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>Recent Expenses</Text>
        <TouchableOpacity>
          <Text style={styles.filterText}>Filter 🔽</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses List */}
      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.expensesList}
      />

      {/* Settle Up Button */}
      <TouchableOpacity style={styles.settleButton}>
        <Text style={styles.settleIcon}>💰</Text>
        <Text style={styles.settleText}>Settle Up - Send $67.30</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // ===== Common =====
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },

  // ===== House Chat Styles =====
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  roommatesScroll: {
    flexGrow: 0,
  },
  roommateItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  roommateAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roommateEmoji: {
    fontSize: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roommateName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
  },

  // AI Status Card
  aiStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  aiStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiStatusEmoji: {
    fontSize: 24,
  },
  aiStatusContent: {
    flex: 1,
    marginLeft: 12,
  },
  aiStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  aiStatusText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  aiActiveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Messages
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FAFBFC',
  },
  messageContent: {
    maxWidth: '80%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  myBubble: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderBottomLeftRadius: 4,
    borderStyle: 'dashed',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  otherMessageText: {
    color: '#1E293B',
    fontWeight: '500',
  },
  aiMessageText: {
    color: '#166534',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attachIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ===== Bills & Expenses Styles =====
  billsHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  billsHeaderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },
  billsHeaderSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  balanceNegative: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EF4444',
  },
  balancePositive: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22C55E',
  },
  balanceNet: {
    fontSize: 22,
    fontWeight: '800',
  },

  // Upload Card
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  uploadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 24,
  },
  uploadContent: {
    flex: 1,
    marginLeft: 14,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  uploadArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // List Header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Expense Cards
  expensesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIcon: {
    fontSize: 24,
  },
  expenseTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  expenseCategory: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  expenseDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  expenseDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  oweAmount: {
    color: '#EF4444',
  },
  paidAmount: {
    color: '#22C55E',
    textDecorationLine: 'line-through',
  },
  expenseActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  receiptIcon: {
    fontSize: 16,
  },
  receiptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  paidButton: {
    backgroundColor: '#22C55E',
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Settle Button
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  settleIcon: {
    fontSize: 20,
  },
  settleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 40,
  },
});
