export type MessageType = 'text' | 'image' | 'document' | 'location' | 'note';
export type DeliveryStatus = 'sent' | 'delivered' | 'read';
export type ConversationStatus = 'open' | 'assigned' | 'pending' | 'resolved';
export type Language = 'en' | 'id' | 'th' | 'vi' | 'ta' | 'hi' | 'bn';

export interface Message {
  id: string;
  type: MessageType;
  direction: 'in' | 'out' | 'note';
  content: string;
  timestamp: string;
  delivery?: DeliveryStatus;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  authorName?: string;
  translated?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  status: string;
  date: string;
  amount: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  language: Language;
  email?: string;
  location: string;
  platform: string;
  totalConversations: number;
  avgCsat: number;
  orders: OrderItem[];
  tags: string[];
}

export interface Conversation {
  id: string;
  contact: Contact;
  status: ConversationStatus;
  assignedAgent?: string;
  assignedAgentInitials?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  language: Language;
  aiSuggestion?: boolean;
  messages: Message[];
  priority?: 'high' | 'normal';
  waitingTime?: string;
}

export const languageLabels: Record<Language, string> = {
  en: 'EN',
  id: 'ID',
  th: 'TH',
  vi: 'VI',
  ta: 'TA',
  hi: 'HI',
  bn: 'BN',
};

export const languageFlagClasses: Record<Language, string> = {
  en: 'language-badge-en',
  id: 'language-badge-id',
  th: 'language-badge-th',
  vi: 'language-badge-vi',
  ta: 'language-badge-ta',
  hi: 'language-badge-hi',
  bn: 'language-badge-bn',
};

export const agents = [
  { id: 'agent-001', name: 'Priya Nair', initials: 'PN', color: 'bg-purple-100 text-purple-700' },
  { id: 'agent-002', name: 'Arif Wibowo', initials: 'AW', color: 'bg-blue-100 text-blue-700' },
  { id: 'agent-003', name: 'Thanh Nguyen', initials: 'TN', color: 'bg-green-100 text-green-700' },
  { id: 'agent-004', name: 'Kavitha Rajan', initials: 'KR', color: 'bg-orange-100 text-orange-700' },
  { id: 'agent-005', name: 'Marco Santos', initials: 'MS', color: 'bg-pink-100 text-pink-700' },
];

export const conversations: Conversation[] = [
  {
    id: 'conv-001',
    status: 'assigned',
    assignedAgent: 'Priya Nair',
    assignedAgentInitials: 'PN',
    lastMessage: 'Saya mau tanya soal pesanan saya yang belum datang',
    lastMessageTime: '2 min ago',
    unread: 3,
    language: 'id',
    aiSuggestion: true,
    priority: 'high',
    waitingTime: '18 min',
    contact: {
      id: 'contact-001',
      name: 'Siti Rahayu',
      phone: '+62 812-3456-7890',
      language: 'id',
      email: 'siti.rahayu@gmail.com',
      location: 'Jakarta, Indonesia',
      platform: 'Shopee',
      totalConversations: 4,
      avgCsat: 4.2,
      tags: ['repeat-buyer', 'vip'],
      orders: [
        { id: 'ord-SH-8821', name: 'Batik Tulis Premium', status: 'In Transit', date: '7 May 2026', amount: 'Rp 285,000' },
        { id: 'ord-SH-7743', name: 'Kain Songket Set', status: 'Delivered', date: '22 Apr 2026', amount: 'Rp 540,000' },
      ],
    },
    messages: [
      { id: 'msg-001-1', type: 'text', direction: 'in', content: 'Halo, saya mau tanya soal pesanan saya', timestamp: '09:14', delivery: 'read' },
      { id: 'msg-001-2', type: 'text', direction: 'in', content: 'Pesanan SH-8821 sudah 5 hari belum sampai', timestamp: '09:14', delivery: 'read', translated: 'Order SH-8821 has not arrived after 5 days' },
      { id: 'msg-001-3', type: 'text', direction: 'out', content: 'Halo Siti! Terima kasih sudah menghubungi kami. Saya cek dulu ya pesanannya.', timestamp: '09:16', delivery: 'read' },
      { id: 'msg-001-4', type: 'note', direction: 'note', content: 'Checked Shopee API — order SH-8821 is stuck at JNE sorting hub in Bekasi since May 5. Need to file a claim.', timestamp: '09:17', authorName: 'Priya Nair' },
      { id: 'msg-001-5', type: 'text', direction: 'out', content: 'Pesanan Anda sedang dalam proses pengiriman. Ada keterlambatan di hub JNE Bekasi.', timestamp: '09:18', delivery: 'delivered' },
      { id: 'msg-001-6', type: 'image', direction: 'in', content: 'Ini screenshot tracking yang saya punya', timestamp: '09:22', delivery: 'read', mediaUrl: 'https://placehold.co/300x200/F1F5F9/64748B?text=Tracking+Screenshot' },
      { id: 'msg-001-7', type: 'text', direction: 'in', content: 'Saya mau tanya soal pesanan saya yang belum datang', timestamp: '09:31', delivery: 'read', translated: 'I want to ask about my order that hasn\'t arrived' },
    ],
  },
  {
    id: 'conv-002',
    status: 'open',
    lastMessage: 'สอบถามเรื่องการคืนสินค้าครับ',
    lastMessageTime: '5 min ago',
    unread: 1,
    language: 'th',
    aiSuggestion: true,
    priority: 'high',
    waitingTime: '5 min',
    contact: {
      id: 'contact-002',
      name: 'Somchai Petcharat',
      phone: '+66 81 234 5678',
      language: 'th',
      location: 'Bangkok, Thailand',
      platform: 'Lazada',
      totalConversations: 2,
      avgCsat: 3.8,
      tags: ['return-request'],
      orders: [
        { id: 'ord-LZ-4421', name: 'Wireless Earbuds Pro', status: 'Delivered', date: '3 May 2026', amount: '฿1,290' },
      ],
    },
    messages: [
      { id: 'msg-002-1', type: 'text', direction: 'in', content: 'สวัสดีครับ', timestamp: '10:02', delivery: 'read', translated: 'Hello' },
      { id: 'msg-002-2', type: 'text', direction: 'in', content: 'สอบถามเรื่องการคืนสินค้าครับ', timestamp: '10:03', delivery: 'read', translated: 'I want to ask about returning a product' },
    ],
  },
  {
    id: 'conv-003',
    status: 'assigned',
    assignedAgent: 'Thanh Nguyen',
    assignedAgentInitials: 'TN',
    lastMessage: 'Tôi cần hỗ trợ về đơn hàng #VN-9920',
    lastMessageTime: '12 min ago',
    unread: 0,
    language: 'vi',
    aiSuggestion: false,
    contact: {
      id: 'contact-003',
      name: 'Nguyen Thi Lan',
      phone: '+84 90 123 4567',
      language: 'vi',
      location: 'Ho Chi Minh City, Vietnam',
      platform: 'Shopify',
      totalConversations: 7,
      avgCsat: 4.7,
      tags: ['vip', 'repeat-buyer'],
      orders: [
        { id: 'ord-VN-9920', name: 'Áo Dài Lụa Cao Cấp', status: 'Processing', date: '8 May 2026', amount: '₫850,000' },
        { id: 'ord-VN-8811', name: 'Túi Xách Da Thật', status: 'Delivered', date: '1 May 2026', amount: '₫1,200,000' },
      ],
    },
    messages: [
      { id: 'msg-003-1', type: 'text', direction: 'in', content: 'Xin chào, tôi cần hỗ trợ', timestamp: '09:45', delivery: 'read', translated: 'Hello, I need support' },
      { id: 'msg-003-2', type: 'text', direction: 'in', content: 'Tôi cần hỗ trợ về đơn hàng #VN-9920', timestamp: '09:46', delivery: 'read', translated: 'I need support for order #VN-9920' },
      { id: 'msg-003-3', type: 'text', direction: 'out', content: 'Xin chào Lan! Tôi sẽ kiểm tra đơn hàng của bạn ngay.', timestamp: '09:52', delivery: 'read' },
      { id: 'msg-003-4', type: 'document', direction: 'in', content: 'Order confirmation.pdf', timestamp: '09:54', delivery: 'read', fileName: 'order-VN-9920-confirmation.pdf', fileSize: '124 KB' },
    ],
  },
  {
    id: 'conv-004',
    status: 'pending',
    assignedAgent: 'Kavitha Rajan',
    assignedAgentInitials: 'KR',
    lastMessage: 'என் ஆர்டர் எங்கே உள்ளது?',
    lastMessageTime: '28 min ago',
    unread: 2,
    language: 'ta',
    aiSuggestion: true,
    priority: 'high',
    waitingTime: '28 min',
    contact: {
      id: 'contact-004',
      name: 'Meena Krishnamurthy',
      phone: '+91 98765 43210',
      language: 'ta',
      location: 'Chennai, India',
      platform: 'Flipkart',
      totalConversations: 3,
      avgCsat: 4.0,
      tags: ['escalated'],
      orders: [
        { id: 'ord-FK-3301', name: 'Silk Saree Kanchipuram', status: 'Delayed', date: '2 May 2026', amount: '₹3,499' },
      ],
    },
    messages: [
      { id: 'msg-004-1', type: 'text', direction: 'in', content: 'என் ஆர்டர் எங்கே உள்ளது?', timestamp: '09:15', delivery: 'read', translated: 'Where is my order?' },
      { id: 'msg-004-2', type: 'text', direction: 'out', content: 'நாங்கள் உங்கள் ஆர்டர் பார்க்கிறோம்.', timestamp: '09:18', delivery: 'read' },
      { id: 'msg-004-3', type: 'note', direction: 'note', content: 'Order FK-3301 delayed due to logistics issue in Chennai hub. Customer is frustrated — escalating to lead.', timestamp: '09:20', authorName: 'Kavitha Rajan' },
    ],
  },
  {
    id: 'conv-005',
    status: 'open',
    lastMessage: 'मुझे अपना ऑर्डर कैंसिल करना है',
    lastMessageTime: '35 min ago',
    unread: 1,
    language: 'hi',
    aiSuggestion: false,
    contact: {
      id: 'contact-005',
      name: 'Rahul Verma',
      phone: '+91 97654 32109',
      language: 'hi',
      location: 'Mumbai, India',
      platform: 'Meesho',
      totalConversations: 1,
      avgCsat: 0,
      tags: ['new-customer'],
      orders: [
        { id: 'ord-ME-7712', name: 'Kurta Set Cotton', status: 'Confirmed', date: '9 May 2026', amount: '₹899' },
      ],
    },
    messages: [
      { id: 'msg-005-1', type: 'text', direction: 'in', content: 'नमस्ते', timestamp: '09:08', delivery: 'read', translated: 'Hello' },
      { id: 'msg-005-2', type: 'text', direction: 'in', content: 'मुझे अपना ऑर्डर कैंसिल करना है', timestamp: '09:09', delivery: 'read', translated: 'I want to cancel my order' },
    ],
  },
  {
    id: 'conv-006',
    status: 'resolved',
    assignedAgent: 'Arif Wibowo',
    assignedAgentInitials: 'AW',
    lastMessage: 'Terima kasih atas bantuannya!',
    lastMessageTime: '1 hr ago',
    unread: 0,
    language: 'id',
    aiSuggestion: false,
    contact: {
      id: 'contact-006',
      name: 'Budi Santoso',
      phone: '+62 813-9876-5432',
      language: 'id',
      location: 'Surabaya, Indonesia',
      platform: 'Tokopedia',
      totalConversations: 12,
      avgCsat: 4.9,
      tags: ['vip', 'loyal'],
      orders: [
        { id: 'ord-TK-5519', name: 'Batik Printing Set', status: 'Delivered', date: '5 May 2026', amount: 'Rp 420,000' },
      ],
    },
    messages: [
      { id: 'msg-006-1', type: 'text', direction: 'in', content: 'Halo, pesanan sudah sampai!', timestamp: '08:45', delivery: 'read' },
      { id: 'msg-006-2', type: 'text', direction: 'out', content: 'Terima kasih Budi! Senang bisa membantu.', timestamp: '08:47', delivery: 'read' },
      { id: 'msg-006-3', type: 'text', direction: 'in', content: 'Terima kasih atas bantuannya!', timestamp: '08:48', delivery: 'read' },
    ],
  },
  {
    id: 'conv-007',
    status: 'open',
    lastMessage: 'Hello, I need help with my subscription',
    lastMessageTime: '42 min ago',
    unread: 1,
    language: 'en',
    aiSuggestion: true,
    contact: {
      id: 'contact-007',
      name: 'Angela Cruz',
      phone: '+63 917 123 4567',
      language: 'en',
      location: 'Manila, Philippines',
      platform: 'Shopify',
      totalConversations: 2,
      avgCsat: 4.1,
      tags: [],
      orders: [
        { id: 'ord-SH-6632', name: 'Monthly Subscription Box', status: 'Active', date: '1 May 2026', amount: '$29.99' },
      ],
    },
    messages: [
      { id: 'msg-007-1', type: 'text', direction: 'in', content: 'Hello, I need help with my subscription', timestamp: '08:51', delivery: 'read' },
      { id: 'msg-007-2', type: 'text', direction: 'in', content: 'I was charged twice this month', timestamp: '08:52', delivery: 'read' },
    ],
  },
  {
    id: 'conv-008',
    status: 'assigned',
    assignedAgent: 'Marco Santos',
    assignedAgentInitials: 'MS',
    lastMessage: 'আমার প্রোডাক্ট ফেরত দিতে চাই',
    lastMessageTime: '1.5 hr ago',
    unread: 0,
    language: 'bn',
    aiSuggestion: false,
    contact: {
      id: 'contact-008',
      name: 'Farhan Ahmed',
      phone: '+880 17 1234 5678',
      language: 'bn',
      location: 'Dhaka, Bangladesh',
      platform: 'WooCommerce',
      totalConversations: 5,
      avgCsat: 3.5,
      tags: ['return-request'],
      orders: [
        { id: 'ord-WC-2241', name: 'Traditional Jamdani Saree', status: 'Return Requested', date: '28 Apr 2026', amount: '৳3,200' },
      ],
    },
    messages: [
      { id: 'msg-008-1', type: 'text', direction: 'in', content: 'আমার প্রোডাক্ট ফেরত দিতে চাই', timestamp: '07:30', delivery: 'read', translated: 'I want to return my product' },
      { id: 'msg-008-2', type: 'text', direction: 'out', content: 'আমরা আপনার রিটার্ন রিকোয়েস্ট প্রসেস করব।', timestamp: '07:45', delivery: 'read' },
      { id: 'msg-008-3', type: 'image', direction: 'in', content: 'Product damage photo', timestamp: '07:50', delivery: 'read', mediaUrl: 'https://placehold.co/300x200/FEE2E2/991B1B?text=Damaged+Item' },
    ],
  },
  {
    id: 'conv-009',
    status: 'open',
    lastMessage: 'When will my order ship?',
    lastMessageTime: '2 hr ago',
    unread: 0,
    language: 'en',
    aiSuggestion: true,
    contact: {
      id: 'contact-009',
      name: 'Preethi Subramaniam',
      phone: '+65 9123 4567',
      language: 'en',
      location: 'Singapore',
      platform: 'Shopify',
      totalConversations: 8,
      avgCsat: 4.6,
      tags: ['vip'],
      orders: [
        { id: 'ord-SH-9901', name: 'Designer Handbag', status: 'Processing', date: '8 May 2026', amount: 'SGD 189' },
      ],
    },
    messages: [
      { id: 'msg-009-1', type: 'text', direction: 'in', content: 'Hi, when will my order ship?', timestamp: '07:15', delivery: 'read' },
      { id: 'msg-009-2', type: 'text', direction: 'in', content: 'Order SH-9901 placed 2 days ago', timestamp: '07:15', delivery: 'read' },
    ],
  },
  {
    id: 'conv-010',
    status: 'resolved',
    assignedAgent: 'Priya Nair',
    assignedAgentInitials: 'PN',
    lastMessage: 'ขอบคุณมากครับ ได้รับแล้ว',
    lastMessageTime: '3 hr ago',
    unread: 0,
    language: 'th',
    aiSuggestion: false,
    contact: {
      id: 'contact-010',
      name: 'Nattaporn Chaiyasit',
      phone: '+66 89 876 5432',
      language: 'th',
      location: 'Chiang Mai, Thailand',
      platform: 'Lazada',
      totalConversations: 3,
      avgCsat: 5.0,
      tags: ['loyal'],
      orders: [
        { id: 'ord-LZ-3312', name: 'Thai Silk Scarf', status: 'Delivered', date: '6 May 2026', amount: '฿890' },
      ],
    },
    messages: [
      { id: 'msg-010-1', type: 'text', direction: 'in', content: 'ขอบคุณมากครับ ได้รับแล้ว', timestamp: '06:30', delivery: 'read', translated: 'Thank you very much, received it' },
    ],
  },
];