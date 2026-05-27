export interface Faculty {
  id: string;
  name: string;
  department: string;
  designation: string;
  phone: string;
  email?: string;
  profileUrl: string;
  isHod?: boolean;
  sharedDepartments?: string[];
}

export const FACULTY_DATA: Faculty[] = [
  // ─── CIVIL ENGINEERING (7 Members, shared with civil_ca) ───
  {
    id: 'civil-anil',
    name: 'ANIL KUMAR',
    department: 'civil',
    designation: 'Assistant Professor (Civil Engineering)',
    phone: '8789360173',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/anil-kumar/',
    sharedDepartments: ['civil', 'civil_ca']
  },
  {
    id: 'civil-arman',
    name: 'Dr. Md Arman Ali',
    department: 'civil',
    designation: 'HoD (Civil CA)',
    phone: '9588218761',
    email: 'hodceca.armanmce2018@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/md-arman-ali/',
    isHod: true,
    sharedDepartments: ['civil', 'civil_ca']
  },
  {
    id: 'civil-anil-chhotu',
    name: 'Dr. ANIL KUMAR CHHOTU',
    department: 'civil',
    designation: 'HOD (Civil Engineering) & Assistant Professor',
    phone: '7667052676',
    email: 'anil04.dst@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/anil-kumar-chhotu/',
    isHod: true,
    sharedDepartments: ['civil', 'civil_ca']
  },
  {
    id: 'civil-ghausul',
    name: 'GHAUSUL AZAM ANSARI',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '8638578983',
    email: 'ghausulazam1039@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ghausul-azam-ansari/',
    sharedDepartments: ['civil', 'civil_ca']
  },
  {
    id: 'civil-niraj',
    name: 'DR. NIRAJ KUMAR',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '7204896553',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/niraj-kumar/',
    sharedDepartments: ['civil', 'civil_ca']
  },
  {
    id: 'civil-sushant',
    name: 'SUSHANT KUMAR',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '8210116757',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/sushant-kumar/',
    sharedDepartments: ['civil', 'civil_ca']
  },
  {
    id: 'civil-ashish-pathak',
    name: 'ASHISH KUMAR PATHAK',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '8825283570',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ashish-kumar-pathak/',
    sharedDepartments: ['civil', 'civil_ca']
  },

  // ─── COMPUTER SCIENCE & ENGINEERING (6 Members, shared with cse_ai) ───
  {
    id: 'cse-vijay',
    name: 'Vijay Kumar',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '6200087889',
    email: 'vijay.mit04it@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/vijay-kumar/',
    sharedDepartments: ['cse', 'cse_ai']
  },
  {
    id: 'cse-krishana',
    name: 'Krishana Karak',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '9006730222',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/krishana-karak/',
    sharedDepartments: ['cse', 'cse_ai']
  },
  {
    id: 'cse-juhi',
    name: 'Juhi Kumari',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '7903345717',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ms-juhi-kumari/',
    sharedDepartments: ['cse', 'cse_ai']
  },
  {
    id: 'cse-ravi',
    name: 'Ravi Kumar',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '8210421370',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/mr-ravi-kumar/',
    sharedDepartments: ['cse', 'cse_ai']
  },
  {
    id: 'cse-aknan',
    name: 'Mohammad Aknan',
    department: 'cse',
    designation: 'HOD (CSE) & Assistant Professor',
    phone: '8879068355',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/aknan/',
    isHod: true,
    sharedDepartments: ['cse', 'cse_ai']
  },
  {
    id: 'cse-kahkashan',
    name: 'Dr. Kahkashan Kouser',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '9835501027',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-kahkashan-kouser/',
    sharedDepartments: ['cse', 'cse_ai']
  },

  // ─── ELECTRICAL & ELECTRONICS ENGINEERING (10 Members) ───
  {
    id: 'eee-chandra',
    name: 'Chandra Shekhar Singh Chandal',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '6203989398',
    email: 'chandrashekhar.mce@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/chandra-shekhar-singh-chandal/'
  },
  {
    id: 'eee-suryadeo',
    name: 'Dr. Surya Deo Choudhary',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '9470577493',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-aditya-kumar-singh/'
  },
  {
    id: 'eee-saket',
    name: 'SAKET KUMAR SINGH',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '7709570234',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/saket-kumar-singh/'
  },
  {
    id: 'eee-kanhaiya',
    name: 'Dr. KANHAIYA KUMAR',
    department: 'eee',
    designation: 'HOD & Assistant Professor (EEE)',
    phone: '8789896398',
    email: 'kanhaiya.dst@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/kanhaiya-kumar/',
    isHod: true
  },
  {
    id: 'eee-tabrez',
    name: 'Dr. Md. Tabrez',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8002320880',
    email: 'md.tabrez1988@gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/md-tabrez/'
  },
  {
    id: 'eee-rashmi',
    name: 'RASHMI PRIYA',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8271318904',
    email: 'rashmipriya.mce@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/rashmi-priya/'
  },
  {
    id: 'eee-ranjeet',
    name: 'RANJEET KUMAR',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '9399468728',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ranjeet-kumar/'
  },
  {
    id: 'eee-dileep',
    name: 'Dr. Dileep Kumar',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '6350459590',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-dileep-kumar/'
  },
  {
    id: 'eee-deobarat',
    name: 'Deobarat Kumar Chandan',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8789446961',
    email: 'deobaratkumarchandan123@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/deobarat-kumar-chandan/'
  },
  {
    id: 'eee-ekrama',
    name: 'Md. Ekrama Arshad',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8130878502',
    email: 'mdekramaarshad@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/md-ekrama-arshad/'
  },

  // ─── MECHANICAL ENGINEERING (9 Members) ───
  {
    id: 'mech-satish',
    name: 'SATISH KUMAR JHA',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '9931420386',
    email: 'satish.kumar.jha58@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/satish-kumar-jha/'
  },
  {
    id: 'mech-ashutosh',
    name: 'ASHUTOSH KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '6201451158',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ashutosh-kumar/'
  },
  {
    id: 'mech-shailesh',
    name: 'Dr. SHAILESH RANJAN KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '7979094103',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/shailesh-ranjankumar/'
  },
  {
    id: 'mech-ravi',
    name: 'Dr. RAVI KUMAR',
    department: 'mechanical',
    designation: 'HOD (ME) & Assistant Professor',
    phone: '7979098267',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ravi-kumar/',
    isHod: true
  },
  {
    id: 'mech-birendra',
    name: 'Dr. BIRENDRA KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '7667803303',
    email: 'bk.11pg010@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/birendra-kumar/'
  },
  {
    id: 'mech-amit',
    name: 'AMIT KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '8407819966',
    email: 'tiwaryamit25@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/184533/'
  },
  {
    id: 'mech-ashfaque',
    name: 'ASHFAQUE AHMAD',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '7070338765',
    email: 'ashfaqmce@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ashafque-ahmad/'
  },
  {
    id: 'mech-azeem',
    name: 'AZEEM ALAM',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '8505996303',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/azeem-alam/'
  },
  {
    id: 'mech-navneet',
    name: 'Prof. (Dr.) Navneet Kumar',
    department: 'mechanical',
    designation: 'Principal Incharge & Professor',
    phone: '9431425123',
    email: 'mcemotihari4@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/prof-dr-navneet-kumar/'
  },

  // ─── HUMANITIES & SCIENCES (8 Members) ───
  {
    id: 'hum-abhay',
    name: 'Dr. Abhay Kumar Jha',
    department: 'humanities',
    designation: 'Assistant Professor & Ex-Principal',
    phone: '9431811171',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/prof-dr-abhay-kumar-jha/'
  },
  {
    id: 'hum-aditya',
    name: 'Dr. Aditya Kumar Singh',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '6201403672',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-aditya-kumar-singh-2/'
  },
  {
    id: 'hum-puja',
    name: 'Dr. Puja Priyadarshini',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9386354774',
    email: 'pujapriya@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-puja-priyadarshini/'
  },
  {
    id: 'hum-sumeet',
    name: 'Dr. Sumeet Kumar',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9140929941',
    email: 'sumeet92.dstte@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-sumeet-kumar/'
  },
  {
    id: 'hum-ramsingh',
    name: 'Ramsingh Yadav',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '6388443376',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ramsingh-yadav/'
  },
  {
    id: 'hum-ashish',
    name: 'Ashish Kumar',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9716646727',
    email: 'ashishkumariitd99@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/mr-ashish-kumar/'
  },
  {
    id: 'hum-santosh',
    name: 'Dr. Santosh Upadhyay',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9934012256',
    email: 'santopadhyay20@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-santosh-upadhay/'
  },
  {
    id: 'hum-alokita',
    name: 'Dr. Alokita Kashyap',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9471624926',
    email: 'alokita@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-alokita-kashyap/'
  }
];

export const getFacultyForDepartment = (deptId: string): Faculty[] => {
  return FACULTY_DATA.filter(
    (fac) =>
      fac.department === deptId ||
      (fac.sharedDepartments && fac.sharedDepartments.includes(deptId))
  );
};
