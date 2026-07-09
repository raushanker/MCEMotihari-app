/**
 * Shared Chat Rooms registry used by:
 * - community.tsx (renders room list)
 * - ForwardSheet.tsx (room picker for forwarding)
 *
 * To add a new room in future: just add an entry here.
 */

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'department';
  color: string;
  icon: string;
  guidelines: string;
}

export const CHAT_ROOMS: ChatRoom[] = [
  {
    id: 'sports',
    name: 'Sports Lobby',
    description: 'Talk about games, events, tournaments, and sports updates publicly.',
    type: 'public',
    color: '#10B981',
    icon: 'football',
    guidelines: 'Welcome to Sports Lobby! 🏆\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Keep discussions civil, positive, and sports-related.\n3. No spamming, abusive language, or unrelated links.\n4. Faculty and Admins can pin important announcements.\n5. Repeated violations may lead to a temporary ban.'
  },
  {
    id: 'cse_ai',
    name: 'CSE / AI Room',
    description: 'Official information and notices for CSE and AI departments.',
    type: 'department',
    color: '#3B82F6',
    icon: 'code-working',
    guidelines: 'CSE / AI Department Room 💻\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share academic queries, notices, projects, and tech discussions.\n3. No spam, memes, or off-topic content.\n4. Only Faculty and Admins can pin important notices.\n5. Be respectful to all members of the community.'
  },
  {
    id: 'civil_ca',
    name: 'Civil / CA Room',
    description: 'Official notices, schedules, and alerts for Civil & CA departments.',
    type: 'department',
    color: '#8B5CF6',
    icon: 'business',
    guidelines: 'Civil / CA Department Room 🏗️\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Use this room for academic discussions, notices, and department updates.\n3. Avoid off-topic, abusive, or misleading content.\n4. Only Faculty and Admins can pin important notices.\n5. Maintain discipline and professionalism.'
  },
  {
    id: 'mech',
    name: 'Mechanical Room',
    description: 'Official announcements and notices for Mechanical engineering.',
    type: 'department',
    color: '#64748B',
    icon: 'construct',
    guidelines: 'Mechanical Department Room ⚙️\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Discuss lab sessions, practicals, exams, and academic topics.\n3. No spam, memes, or content unrelated to academics.\n4. Only Faculty and Admins can pin announcements.\n5. Report any misuse to the admin team.'
  },
  {
    id: 'ee',
    name: 'EEE Room',
    description: 'Official notices, lab schedules, and events for EEE department.',
    type: 'department',
    color: '#F59E0B',
    icon: 'flash',
    guidelines: 'EEE Department Room ⚡\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share class schedules, lab updates, and exam-related information.\n3. No spam or off-topic messages.\n4. Only Faculty and Admins can pin notices.\n5. Keep the room clean and productive.'
  },
  {
    id: 'humanities',
    name: 'NSS / Yoga / Health',
    description: 'Discussions related to NSS, Yoga, and Mental Health.',
    type: 'department',
    color: '#F43F5E',
    icon: 'heart',
    guidelines: 'NSS / Yoga / Health Room 🧘\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share NSS events, yoga sessions, health tips, and wellness content.\n3. Be kind, supportive, and sensitive to others\' health topics.\n4. No negativity, bullying, or inappropriate content.\n5. This is a safe space — respect everyone.'
  },
  {
    id: 'startup',
    name: 'Startup/Idea discussion',
    description: 'Discuss startups, pitch innovative business ideas, and find co-founders.',
    type: 'public',
    color: '#EC4899',
    icon: 'rocket',
    guidelines: 'Startup / Idea Discussion Room 🚀\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share your startup ideas, find co-founders, and collaborate on projects.\n3. Respect others\' intellectual property — do not steal ideas.\n4. No spam, self-promotion without context, or unrelated content.\n5. Constructive criticism is welcome; personal attacks are not.'
  },
  {
    id: 'gate',
    name: 'GATE Discussion',
    description: 'Discuss GATE exam syllabus, share notes, preparation tips, and study resources.',
    type: 'public',
    color: '#06B6D4',
    icon: 'school',
    guidelines: 'GATE Discussion Room 📚\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share GATE study notes, PYQs, preparation tips, and resources.\n3. Discuss subject-wise topics and help each other prepare.\n4. No spam or content unrelated to GATE/competitive exams.\n5. Keep it focused and helpful for all aspirants.'
  },
  {
    id: 'alumni_network',
    name: 'Alumni Network',
    description: 'Connect with MCE alumni, share experiences, job opportunities, and campus memories.',
    type: 'public',
    color: '#F97316',
    icon: 'people',
    guidelines: 'Alumni Network Room 🎓\n\n1. Everyone can post messages here — students, faculty, staff, and alumni!\n2. Use this space for networking, career guidance, and sharing opportunities.\n3. Be respectful and professional in your interactions.\n4. No spam, irrelevant promotions, or abusive language.\n5. Keep the MCE spirit alive!'
  }
];
