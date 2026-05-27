export interface Department {
  id: string;
  name: string;
  icon: string;
  intake: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 'cse', name: 'Computer Science and Engineering', icon: 'code-slash-outline', intake: '60 Students Intake' },
  { id: 'cse_ai', name: 'Computer Science & Engineering (AI)', icon: 'hardware-chip-outline', intake: '60 Students Intake' },
  { id: 'civil', name: 'Civil Engineering', icon: 'construct-outline', intake: '60 Students Intake' },
  { id: 'civil_ca', name: 'Civil Engineering with Computer Application', icon: 'laptop-outline', intake: '60 Students Intake' },
  { id: 'eee', name: 'Electrical and Electronics Engineering', icon: 'flash-outline', intake: '60 Students Intake' },
  { id: 'mechanical', name: 'Mechanical Engineering', icon: 'settings-outline', intake: '60 Students Intake' },
  { id: 'humanities', name: 'Humanities and Sciences', icon: 'library-outline', intake: 'B.Tech Foundational' }
];
