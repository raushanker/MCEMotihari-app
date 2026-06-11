export interface Department {
  id: string;
  name: string;
  icon: string;
  intake: string;
  description?: string;
  hodName?: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 'cse', name: 'Computer Science and Engineering', icon: 'code-slash-outline', intake: '60 Students Intake', description: 'Focuses on software development, algorithms, and computing systems.', hodName: 'Dr. Vivek Tiwari' },
  { id: 'cse_ai', name: 'Computer Science & Engineering (AI)', icon: 'hardware-chip-outline', intake: '60 Students Intake', description: 'Specialized in Artificial Intelligence, Machine Learning, and Data Science.', hodName: 'Dr. Vivek Tiwari' },
  { id: 'civil', name: 'Civil Engineering', icon: 'construct-outline', intake: '60 Students Intake', description: 'Core structural engineering, surveying, and construction management.', hodName: 'Prof. Balendu Singh' },
  { id: 'civil_ca', name: 'Civil Engineering with Computer Application', icon: 'laptop-outline', intake: '60 Students Intake', description: 'Modern civil engineering integrated with CAD and computational methods.', hodName: 'Prof. Balendu Singh' },
  { id: 'eee', name: 'Electrical and Electronics Engineering', icon: 'flash-outline', intake: '60 Students Intake', description: 'Study of electrical machines, power systems, and electronic circuits.', hodName: 'Dr. Pallavi' },
  { id: 'mechanical', name: 'Mechanical Engineering', icon: 'settings-outline', intake: '60 Students Intake', description: 'Deals with thermodynamics, manufacturing, and mechanical systems.', hodName: 'Dr. Ashwani Kumar' },
  { id: 'humanities', name: 'Humanities and Sciences', icon: 'library-outline', intake: 'B.Tech Foundational', description: 'Foundational subjects including Physics, Chemistry, Mathematics and English.' }
];
