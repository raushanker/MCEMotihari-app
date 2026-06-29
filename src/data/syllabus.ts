export interface SemesterSyllabus {
  semester: string;
  subjects: string[];
}

export interface BranchSyllabus {
  id: string;
  branchName: string;
  icon: string; // Ionicons name
  semesters: SemesterSyllabus[];
}

export interface SubjectDetail {
  name: string;
  code: string;
  credits: string;
  description: string;
  modules: string[];
}

export interface SemesterDetail {
  semester: string;
  subjects: SubjectDetail[];
}

// ─── HIGH-LEVEL HIGH-SCHOOL & BRANCH SELECTIONS ───
export const BRANCHES_SYLLABUS: BranchSyllabus[] = [
  {
    id: 'first-year',
    branchName: 'First Year (Common)',
    icon: 'school-outline',
    semesters: [
      {
        semester: 'Semester 1',
        subjects: [
          'Engineering Physics',
          'Engineering Chemistry',
          'Engineering Mathematics-I',
          'Communicative English',
          'Programming for Problem Solving (C Language)',
          'Engineering Graphics & Design',
          'Basic Electronics Engineering',
          'Basic Electrical Engineering',
          'Workshop / IT Workshop',
          'Sports / NCC / NSS',
          'Engineering Physics Lab',
          'Engineering Chemistry Lab',
          'Programming Lab',
          'Workshop Lab'
        ]
      },
      {
        semester: 'Semester 2',
        subjects: [
          'Engineering Mathematics-II',
          'Python Programming',
          'Introduction to Web Design',
          'Engineering Mechanics',
          'Elements of Mechanical Engineering',
          'Swachha Bharat Mission',
          'Communicative English Lab',
          'Python Lab',
          'Basic Electronics Lab',
          'Engineering Graphics Lab'
        ]
      }
    ]
  },
  {
    id: 'cse',
    branchName: 'Computer Science & Engineering',
    icon: 'code-slash-outline',
    semesters: [
      {
        semester: 'Semester 3',
        subjects: [
          'Data Structures & Algorithms',
          'Object Oriented Programming (C++)',
          'Discrete Mathematics',
          'Digital Electronics',
          'Computer Organization & Architecture',
          'IT Workshop'
        ]
      },
      {
        semester: 'Semester 4',
        subjects: [
          'Operating Systems',
          'Design & Analysis of Algorithms',
          'Database Management Systems (DBMS)',
          'Theory of Computation',
          'Environmental Science',
          'Java Programming'
        ]
      },
      {
        semester: 'Semester 5',
        subjects: [
          'Computer Networks',
          'Software Engineering',
          'Artificial Intelligence',
          'Compiler Design',
          'Microprocessors & Interfaces',
          'Elective-I'
        ]
      },
      {
        semester: 'Semester 6',
        subjects: [
          'Machine Learning',
          'Cloud Computing',
          'Web Technologies',
          'Cryptography & Network Security',
          'Mobile Computing',
          'Elective-II'
        ]
      },
      {
        semester: 'Semester 7',
        subjects: [
          'Big Data Analytics',
          'Internet of Things (IoT)',
          'Data Science',
          'Minor Project',
          'Industrial Training',
          'Open Elective'
        ]
      },
      {
        semester: 'Semester 8',
        subjects: [
          'Major Project',
          'Internship',
          'Professional Ethics',
          'Entrepreneurship Development',
          'Open Elective-II'
        ]
      }
    ]
  },
  {
    id: 'cse-ai',
    branchName: 'CSE (Artificial Intelligence)',
    icon: 'hardware-chip-outline',
    semesters: [
      {
        semester: 'Semester 3',
        subjects: [
          'Data Structures using Python',
          'Discrete Mathematics',
          'Artificial Intelligence Fundamentals',
          'Digital Logic Design',
          'Probability & Statistics'
        ]
      },
      {
        semester: 'Semester 4',
        subjects: [
          'Machine Learning Basics',
          'Database Systems',
          'Computer Organization',
          'Operating Systems',
          'Python for AI'
        ]
      },
      {
        semester: 'Semester 5',
        subjects: [
          'Deep Learning',
          'Natural Language Processing',
          'Computer Vision',
          'Software Engineering',
          'Data Mining'
        ]
      },
      {
        semester: 'Semester 6',
        subjects: [
          'Neural Networks',
          'Cloud AI Services',
          'AI Ethics',
          'Big Data for AI',
          'Elective-I'
        ]
      },
      {
        semester: 'Semester 7',
        subjects: [
          'Generative AI',
          'Advanced Machine Learning',
          'Minor Project',
          'Industrial Internship'
        ]
      },
      {
        semester: 'Semester 8',
        subjects: [
          'Major Project',
          'AI Research Seminar',
          'Professional Ethics'
        ]
      }
    ]
  },
  {
    id: 'civil',
    branchName: 'Civil Engineering',
    icon: 'construct-outline',
    semesters: [
      {
        semester: 'Semester 3',
        subjects: [
          'Engineering Mechanics',
          'Surveying & Geomatics',
          'Fluid Mechanics',
          'Engineering Geology',
          'Biology for Engineers',
          'Mathematics-III'
        ]
      },
      {
        semester: 'Semester 4',
        subjects: [
          'Strength of Materials',
          'Structural Analysis-I',
          'Soil Mechanics',
          'Hydrology & Water Resources',
          'Environmental Engineering-I'
        ]
      },
      {
        semester: 'Semester 5',
        subjects: [
          'RCC Design',
          'Transportation Engineering-I',
          'Structural Analysis-II',
          'Geotechnical Engineering-II',
          'Open Elective'
        ]
      },
      {
        semester: 'Semester 6',
        subjects: [
          'Steel Structure Design',
          'Transportation Engineering-II',
          'Construction Management',
          'Environmental Engineering-II',
          'Estimation & Costing'
        ]
      },
      {
        semester: 'Semester 7',
        subjects: [
          'Bridge Engineering',
          'Earthquake Engineering',
          'Metro & Smart Infrastructure',
          'Minor Project',
          'Industrial Training'
        ]
      },
      {
        semester: 'Semester 8',
        subjects: [
          'Major Project',
          'Internship',
          'Professional Practice & Ethics'
        ]
      }
    ]
  },
  {
    id: 'civil_ca',
    branchName: 'Civil Engineering with Computer Application',
    icon: 'laptop-outline',
    semesters: [
      {
        semester: 'Semester 3',
        subjects: [
          'Engineering Mechanics',
          'Surveying & Geomatics',
          'Fluid Mechanics',
          'Engineering Geology',
          'Computer Application in Civil Eng.',
          'Mathematics-III'
        ]
      },
      {
        semester: 'Semester 4',
        subjects: [
          'Strength of Materials',
          'Structural Analysis-I',
          'Soil Mechanics',
          'Computer-Aided Civil Drawing',
          'Environmental Engineering-I'
        ]
      },
      {
        semester: 'Semester 5',
        subjects: [
          'RCC Design',
          'Transportation Engineering-I',
          'Structural Analysis-II',
          'Geotechnical Engineering-II',
          'Open Elective'
        ]
      },
      {
        semester: 'Semester 6',
        subjects: [
          'Steel Structure Design',
          'Transportation Engineering-II',
          'Construction Management',
          'Environmental Engineering-II',
          'Estimation & Costing'
        ]
      },
      {
        semester: 'Semester 7',
        subjects: [
          'Bridge Engineering',
          'Earthquake Engineering',
          'Metro & Smart Infrastructure',
          'Minor Project',
          'Industrial Training'
        ]
      },
      {
        semester: 'Semester 8',
        subjects: [
          'Major Project',
          'Internship',
          'Professional Practice & Ethics'
        ]
      }
    ]
  },
  {
    id: 'mechanical',
    branchName: 'Mechanical Engineering',
    icon: 'settings-outline',
    semesters: [
      {
        semester: 'Semester 3',
        subjects: [
          'Engineering Thermodynamics',
          'Manufacturing Process',
          'Engineering Mechanics',
          'Materials Engineering',
          'Basic Electronics'
        ]
      },
      {
        semester: 'Semester 4',
        subjects: [
          'Fluid Mechanics & Machines',
          'Strength of Materials',
          'Kinematics of Machinery',
          'Applied Thermodynamics',
          'Manufacturing Technology'
        ]
      },
      {
        semester: 'Semester 5',
        subjects: [
          'Heat Transfer',
          'Dynamics of Machinery',
          'Machine Design-I',
          'Industrial Engineering',
          'Elective-I'
        ]
      },
      {
        semester: 'Semester 6',
        subjects: [
          'Machine Design-II',
          'Internal Combustion Engines',
          'Refrigeration & Air Conditioning',
          'Operations Research',
          'Elective-II'
        ]
      },
      {
        semester: 'Semester 7',
        subjects: [
          'CAD/CAM',
          'Robotics',
          'Automation in Manufacturing',
          'Minor Project',
          'Industrial Internship'
        ]
      },
      {
        semester: 'Semester 8',
        subjects: [
          'Major Project',
          'Professional Ethics',
          'Entrepreneurship',
          'Open Elective'
        ]
      }
    ]
  },
  {
    id: 'eee',
    branchName: 'Electrical & Electronics Engineering',
    icon: 'flash-outline',
    semesters: [
      {
        semester: 'Semester 3',
        subjects: [
          'Electrical Machines-I',
          'Circuit Theory',
          'Network Analysis',
          'Electronic Devices',
          'Mathematics-III'
        ]
      },
      {
        semester: 'Semester 4',
        subjects: [
          'Electrical Machines-II',
          'Analog Electronics',
          'Signals & Systems',
          'Power Generation',
          'Control Systems'
        ]
      },
      {
        semester: 'Semester 5',
        subjects: [
          'Power Systems-I',
          'Microprocessors',
          'Power Electronics',
          'Digital Electronics',
          'Elective-I'
        ]
      },
      {
        semester: 'Semester 6',
        subjects: [
          'Power Systems-II',
          'Electrical Drives',
          'Renewable Energy Systems',
          'Protection & Switchgear',
          'Elective-II'
        ]
      },
      {
        semester: 'Semester 7',
        subjects: [
          'Smart Grid Technology',
          'Industrial Automation',
          'Embedded Systems',
          'Minor Project',
          'Industrial Training'
        ]
      },
      {
        semester: 'Semester 8',
        subjects: [
          'Major Project',
          'Internship',
          'Professional Ethics'
        ]
      }
    ]
  },
  {
    id: 'nptel',
    branchName: 'NPTEL / MOOC Mandates',
    icon: 'ribbon-outline',
    semesters: [
      {
        semester: '2nd & 3rd Year Requirements (2 Credits)',
        subjects: [
          'Mandatory 8-12 Week Online MOOC Course',
          'Humanities & Social Sciences (HSS)',
          'Business, Ethics & Management Courses',
          'Core Engineering Specialization Courses',
          'Weekly Online Assignment Submissions',
          'In-Person Proctored NPTEL Exam',
          'Minimum 50% Score Required to Qualify',
          '2-Credit Academic Transfer (All Branches)'
        ]
      }
    ]
  },
  {
    id: 'common-labs',
    branchName: 'Common Labs & Skills',
    icon: 'beaker-outline',
    semesters: [
      {
        semester: 'Skill Modules & Labs',
        subjects: [
          'Programming Labs',
          'Python Labs',
          'Workshop Practice',
          'Engineering Graphics Labs',
          'Communication Skill Labs',
          'Mini Projects',
          'Major Projects',
          'Industrial Internship',
          'Seminars & Viva'
        ]
      }
    ]
  }
];

// ─── PREMIUM CIVIL ENGINEERING FULL DATASET (SEMESTERS 1-7) ───
export const CIVIL_SYLLABUS_DETAILED: SemesterDetail[] = [
  {
    semester: 'Sem 1',
    subjects: [
      {
        name: 'Physics (Mechanics & Mechanics of Solids)',
        code: '101101',
        credits: '5.5',
        description: 'Fundamental physics governing solid bodies, rotational equations, potential fields, and stress-strain analysis.',
        modules: ['Vector Mechanics', 'Newton’s Laws', 'Friction & Constraints', 'Potential Energy', 'Rotational Motion', 'Elasticity', 'Mechanics of Solids']
      },
      {
        name: 'Mathematics-I',
        code: '101102',
        credits: '4',
        description: 'Advanced calculus covering derivatives, multi-variable integrations, linear algebra, and matrices properties.',
        modules: ['Differential Calculus', 'Integration', 'Multivariable Calculus', 'Matrices', 'Eigen Values', 'Linear Algebra']
      },
      {
        name: 'Basic Electrical Engineering',
        code: '100101',
        credits: '5',
        description: 'DC circuit laws, AC transients, single-phase transformers, and basic rotating machines operations.',
        modules: ['Circuit Laws', 'AC/DC Circuits', 'Transformers', 'Electrical Machines', 'Measurement Systems']
      },
      {
        name: 'Engineering Graphics & Design',
        code: '100102',
        credits: '3',
        description: 'Orthographic projections, isometric drawing projections, and basic AutoCAD drafting techniques.',
        modules: ['Engineering Drawing', 'Orthographic Projection', 'Isometric Drawing', 'CAD Basics']
      }
    ]
  },
  {
    semester: 'Sem 2',
    subjects: [
      {
        name: 'Chemistry',
        code: '100203',
        credits: '5.5',
        description: 'Atomic spectra, chemical bonding, water analysis treatments, corrosion inhibitors, and nano-synthesis.',
        modules: ['Atomic Structure', 'Molecular Orbital Theory', 'Spectroscopy', 'Water Chemistry', 'Corrosion', 'Nanomaterials']
      },
      {
        name: 'Mathematics-II',
        code: '101202',
        credits: '4',
        description: 'Differential equations, Laplace transforms, Fourier series representations, and partial differential systems.',
        modules: ['Differential Equations', 'Laplace Transform', 'Fourier Series', 'Partial Differential Equations']
      },
      {
        name: 'Programming for Problem Solving',
        code: '100204',
        credits: '5',
        description: 'Introductory C Programming concepts covering decision loops, arrays, structures, pointers, and file operations.',
        modules: ['C Programming', 'Loops', 'Functions', 'Arrays', 'Pointers', 'File Handling']
      },
      {
        name: 'Workshop Manufacturing Practices',
        code: '100205',
        credits: '3',
        description: 'Practical fittings shop, manual carpentry joinery, welding assemblies, and machining operations.',
        modules: ['Welding', 'Carpentry', 'Sheet Metal', 'Machine Shop', 'Manufacturing Basics']
      },
      {
        name: 'English',
        code: '100206',
        credits: '3',
        description: 'Effective technical reporting, grammar corrections, presentations etiquette, and professional communications.',
        modules: ['Technical Communication', 'Grammar', 'Presentation Skills', 'Professional Writing']
      }
    ]
  },
  {
    semester: 'Sem 3',
    subjects: [
      {
        name: 'Basic Electronics',
        code: 'ESC 202',
        credits: '2',
        description: 'Semiconductor diode operations, BJT transistors biasing, amplifiers design, and operational logic gates.',
        modules: ['Semiconductors', 'Diodes', 'Transistor Biasing', 'Amplifiers', 'Operational Amplifiers', 'Logic Gates']
      },
      {
        name: 'Biology for Engineers',
        code: 'BSC 109',
        credits: '3',
        description: 'Biological systems structures, genetics foundations, biomolecules functions, and bioinformatics applications.',
        modules: ['Biomolecules', 'Genetics', 'Cellular Systems', 'Enzymes', 'Metabolism', 'Bioinformatics']
      },
      {
        name: 'Computer-Aided Civil Engineering Drawing',
        code: 'ESC 203',
        credits: '2',
        description: '2D CAD drawings, building plans layouts, elevation projections, and structural drafting standards.',
        modules: ['CAD Interface', 'Plan Drawing', 'Section & Elevations', 'Structural Drafting']
      },
      {
        name: 'Engineering Mechanics',
        code: 'ESC 205',
        credits: '4',
        description: 'Static equilibrium, vector forces systems, trusses analysis, centroids calculation, and moments of inertia.',
        modules: ['Force Systems', 'Static Equilibrium', 'Truss Analysis', 'Centroids & Friction', 'Moment of Inertia']
      },
      {
        name: 'Surveying & Geomatics',
        code: 'PCC CE 206',
        credits: '3',
        description: 'Linear distance measurements, compass surveying, leveling methods, contouring, and modern GIS/GPS sensors.',
        modules: ['Linear Measurements', 'Compass Surveying', 'Leveling', 'Theodolite', 'Contouring', 'GPS & GIS']
      },
      {
        name: 'Mathematics-III',
        code: 'BSC 201',
        credits: '2',
        description: 'Numerical methods, root-finding calculators, statistical distributions, and variance computations.',
        modules: ['Numerical Integration', 'Interpolation', 'Probability Distributions', 'Sampling Theory']
      },
      {
        name: 'Humanities-I',
        code: 'HSMC 201',
        credits: '3',
        description: 'Socio-economic studies, industrial relations, human values foundations, and constitutional frameworks.',
        modules: ['Social Studies', 'Human Values', 'Economics Foundations', 'Constitutional Rights']
      },
      {
        name: 'Introduction to Civil Engineering',
        code: 'HSMC 251',
        credits: '2',
        description: 'History of civil engineering infrastructures, prominent global structures, and future smart cities concepts.',
        modules: ['History & Scope', 'Infrastructures', 'Smart Materials', 'Sustainable Building']
      },
      {
        name: 'Internship',
        code: 'INTC 201',
        credits: '4',
        description: 'Practical industrial training exposure on live site projects under supervision. Requires report submissions.',
        modules: ['Site Observation', 'Planning & Schedules', 'Quality Auditing', 'Technical Report']
      }
    ]
  },
  {
    semester: 'Sem 4',
    subjects: [
      {
        name: 'Mechanical Engineering',
        code: 'ESC 209',
        credits: '3',
        description: 'Thermodynamic cycles, internal combustion engines operations, fluid pumps, and heat transfer principles.',
        modules: ['Thermodynamics', 'IC Engines', 'Pumps & Compressors', 'Heat Transfer']
      },
      {
        name: 'Engineering Geology',
        code: 'PCC CE 202',
        credits: '3',
        description: 'Mineral structures study, rock classification weathering, fold and fault systems, and geological mapping.',
        modules: ['Mineralogy', 'Petrology', 'Structural Geology', 'Hydrogeology', 'Site Investigations']
      },
      {
        name: 'Disaster Preparedness & Planning',
        code: 'PCC CE 203',
        credits: '2',
        description: 'Natural hazards audits, seismic risk assessment, mitigation policies, and emergency disaster response systems.',
        modules: ['Hazards & Risks', 'Seismic Mitigation', 'Flood Management', 'Disaster Response']
      },
      {
        name: 'Introduction to Fluid Mechanics',
        code: 'PCC CE 204',
        credits: '4',
        description: 'Fluid statics buoyancy, continuity equation dynamics, viscous flow in pipes, and boundary layer systems.',
        modules: ['Fluid Properties', 'Hydrostatics', 'Fluid Kinematics', 'Pipe Flow', 'Boundary Layer']
      },
      {
        name: 'Introduction to Solid Mechanics',
        code: 'PCC CE 205',
        credits: '3',
        description: 'Direct stress and strain relationships, shear force bending moment calculations, and beam deflections.',
        modules: ['Stress & Strain', 'Shear Force & Bending Moment', 'Bending Stresses', 'Torsion', 'Deflection of Beams']
      },
      {
        name: 'Structural Analysis',
        code: 'PCC CE 208',
        credits: '4',
        description: 'Determinacy of trusses, deflection calculation, slope deflection equations, and moment distribution methods.',
        modules: ['Structural Determinacy', 'Energy Methods', 'Slope Deflection', 'Moment Distribution', 'Influence Lines']
      },
      {
        name: 'Materials Testing & Evaluation',
        code: 'PCC CE 207',
        credits: '3',
        description: 'Destructive tensile compression testing, aggregate soundness, and cement properties.',
        modules: ['Tensile & Compressive Tests', 'Hardness Tests', 'Cement Properties', 'Aggregates Evaluation']
      },
      {
        name: 'Civil Engineering – Societal & Global Impact',
        code: 'HSMC 252',
        credits: '2',
        description: 'Environmental footprint audits, infrastructure sustainability, green building designs, and renewable integrations.',
        modules: ['Environmental Footprint', 'Sustainable Design', 'Infrastructure Economics', 'Green Projects']
      }
    ]
  },
  {
    semester: 'Sem 5',
    subjects: [
      {
        name: 'Mechanics of Materials',
        code: 'PCC CE 301',
        credits: '3',
        description: 'Analysis of combined loading stresses, Mohr\'s stress circle, thin cylinders, and column buckling formulae.',
        modules: ['Combined Stresses', 'Mohr\'s Circle', 'Thin Cylinders', 'Column Buckling']
      },
      {
        name: 'Hydraulic Engineering',
        code: 'PCC CE 302',
        credits: '3',
        description: 'Uniform open channel flows, hydraulic jumps calculation, water turbines efficiency, and centrifugal pumps.',
        modules: ['Open Channel Flow', 'Hydraulic Jump', 'Water Turbines', 'Centrifugal Pumps']
      },
      {
        name: 'Analysis & Design of Concrete Structures',
        code: 'PCC CE 303',
        credits: '3',
        description: 'Working stress method, limit state design parameters, beams bending, and single-way slabs reinforcement.',
        modules: ['Limit State Design', 'Beams Bending Reinforcement', 'One-way Slabs', 'Columns Detailing']
      },
      {
        name: 'Geotechnical Engineering-I',
        code: 'PCC CE 304',
        credits: '4',
        description: 'Soil indices classifications, soil compaction curves, permeability, and soil consolidation equations.',
        modules: ['Soil Index Properties', 'Permeability & Seepage', 'Soil Compaction', 'Consolidation Theory']
      },
      {
        name: 'Hydrology & Water Resources Engineering',
        code: 'PCC CE 305',
        credits: '3',
        description: 'Hydrological cycle elements, run-off calculations, unit hydrograph, and reservoirs planning operations.',
        modules: ['Precipitation & Losses', 'Run-off & Hydrographs', 'Flood Routing', 'Groundwater Hydrology']
      },
      {
        name: 'Environmental Engineering-I',
        code: 'PCC CE 306',
        credits: '4',
        description: 'Water supply demands, water treatment filtration methods, primary disinfection, and water distribution networks.',
        modules: ['Water Supply Planning', 'Water Treatment Processes', 'Filtration & Disinfection', 'Distribution Networks']
      },
      {
        name: 'Transportation Engineering',
        code: 'PCC CE 307',
        credits: '4',
        description: 'Highway alignment geometry, sight distance calculation, aggregate properties testing, and traffic signals layout.',
        modules: ['Highway Geometric Design', 'Pavement Materials', 'Traffic Engineering', 'Railway & Airport Basics']
      },
      {
        name: 'Environmental Science',
        code: 'MC 401',
        credits: '0',
        description: 'Ecosystem pathways, biodiversity conservation plans, environmental pollution mitigation, and audit laws.',
        modules: ['Ecosystems & Biodiversity', 'Air & Water Pollution', 'Solid Waste Management', 'Environmental Policy']
      }
    ]
  },
  {
    semester: 'Sem 6',
    subjects: [
      {
        name: 'Construction Engineering & Management',
        code: 'PCC CE 308',
        credits: '3',
        description: 'Network schedules CPM/PERT, construction contract agreements, aggregates inventory, and labor safety laws.',
        modules: ['Network Scheduling (CPM/PERT)', 'Contracts & Tenders', 'Material Control', 'Construction Equipment', 'Safety Auditing']
      },
      {
        name: 'Design of Steel Structure',
        code: 'PCC CE 303',
        credits: '3',
        description: 'Bolted and welded joints detailing, tension members design, compression columns, and welded plate girders.',
        modules: ['Bolted & Welded Connections', 'Tension Members', 'Compression Members', 'Welded Plate Girders']
      },
      {
        name: 'Engineering Economics, Estimation & Costing',
        code: 'PCC CE 309',
        credits: '3',
        description: 'Detailed measurement specifications, item rate estimations, rate analysis calculators, and valuation studies.',
        modules: ['Detailed Estimation', 'Rate Analysis', 'Tendering Specifications', 'Valuation Methods']
      },
      {
        name: 'Environmental Engineering-II',
        code: 'PCC CE 306',
        credits: '3',
        description: 'Sewage characteristics, biochemical oxygen demand BOD, septic tanks detailing, and activated sludge process.',
        modules: ['Sewage Characteristics', 'BOD & COD Kinetics', 'Primary Sewage Treatment', 'Activated Sludge Process', 'Sewage Disposal']
      },
      {
        name: 'Geotechnical Engineering-II',
        code: 'PCC CE 304',
        credits: '3',
        description: 'Earth pressure calculations, shallow foundations bearing, plate load aggregate tests, and pile group detailing.',
        modules: ['Earth Pressure Theory', 'Shallow Foundations', 'Deep Pile Foundations', 'Soil Exploration']
      },
      {
        name: 'Industrial Visit',
        code: 'N/A',
        credits: '1',
        description: 'Field exposure visits to active construction sites, bridges, dams, or water treatment plants. Requires logs reports.',
        modules: ['Industrial Site Logs', 'Structural Observations', 'Safety Inspection', 'Technical Report']
      },
      {
        name: 'MOOCs / SWAYAM / NPTEL',
        code: 'N/A',
        credits: '2',
        description: 'Mandatory online certification courses on advanced topics to expand engineering skills.',
        modules: ['Course Choice Approval', 'Weekly Assignment Scores', 'Proctored Exam Passing', 'Credit Transfer Verification']
      }
    ]
  },
  {
    semester: 'Sem 7',
    subjects: [
      {
        name: 'Professional Practice, Law & Ethics',
        code: '101701',
        credits: '2',
        description: 'Engineering contract frameworks, professional liability rules, safety regulations, and professional code of ethics.',
        modules: ['Contracts Law', 'Liability Audits', 'Intellectual Property Rights', 'Professional Ethics']
      },
      {
        name: 'Project-I',
        code: '100709',
        credits: '6',
        description: 'Literature survey, research problem identification, data modeling computations, and preliminary project layout.',
        modules: ['Problem Framing', 'Literature Review', 'Design Methodology', 'Preliminary Work']
      },
      {
        name: 'Graduate Employability Skills & Competitive Courses',
        code: '100705',
        credits: '0',
        description: 'Quantitative aptitude practice, logical reasoning modules, mock interviews, and group discussions preparation.',
        modules: ['Quantitative Aptitude', 'Logical Reasoning', 'Interview Etiquettes', 'Verbal Communication']
      },
      {
        name: 'Open Elective-I',
        code: 'N/A',
        credits: '3',
        description: 'Inter-disciplinary courses to expand breadth of knowledge in non-core engineering streams.',
        modules: ['Subject Selection', 'Interdisciplinary Studies', 'Application Seminars']
      },
      {
        name: 'Program Elective-II',
        code: 'N/A',
        credits: '3',
        description: 'Advanced specialized elective course inside structural, environmental, water, or geotech engineering.',
        modules: ['Specialization Choice', 'Advanced Concepts', 'Case Study Reviews']
      },
      {
        name: 'Program Elective-III',
        code: 'N/A',
        credits: '3',
        description: 'Advanced specialized elective course detailing advanced structural dynamics, concrete, or transportation designs.',
        modules: ['Topic Detailing', 'Modeling & Simulation', 'Final Projects']
      }
    ]
  },
  {
    semester: 'Sem 8',
    subjects: [
      {
        name: 'Major Project',
        code: 'PCC CE 402',
        credits: '12',
        description: 'Comprehensive final year project implementation, detailed software modeling, prototypes fabrication, or detailed academic research thesis.',
        modules: ['Project Implementation', 'System Modeling & Prototype', 'Performance Evaluation', 'Thesis Submission & Viva']
      },
      {
        name: 'Internship / Industrial Training',
        code: 'INTC 401',
        credits: '4',
        description: 'Full semester industrial training or corporate internship in an active civil engineering firm under supervisor guidance.',
        modules: ['Site/Corporate Internship', 'Operational/Project Logs', 'Organizational Audits', 'Internship Report & Presentation']
      },
      {
        name: 'Professional Practice, Law & Ethics',
        code: 'HSMC 401',
        credits: '2',
        description: 'Engineering contract frameworks, professional liability rules, safety regulations, and professional code of ethics.',
        modules: ['Contracts & Arbitration', 'Tendering Legislation', 'Intellectual Property & IP Law', 'Professional Ethics & Code of Conduct']
      }
    ]
  }
];

export const CSE_SYLLABUS_DETAILED: SemesterDetail[] = [
  {
    semester: 'Sem 1',
    subjects: [
      {
        name: 'Chemistry',
        code: '100103',
        credits: '5.5',
        description: 'Comprehensive study of atomic & molecular structures, spectroscopic techniques, thermodynamics, and stereochemistry.',
        modules: ['Atomic & Molecular Structure', 'Spectroscopic Techniques', 'Intermolecular Forces', 'Water Chemistry', 'Thermodynamics & Free Energy', 'Periodic Properties', 'Stereochemistry']
      },
      {
        name: 'Mathematics-I (Calculus & Linear Algebra)',
        code: '100102',
        credits: '4',
        description: 'Advanced calculus, partial derivatives, linear matrices, eigenvectors, and vector space algebra.',
        modules: ['Differential Calculus', 'Matrices & Determinants', 'Eigen Values & Eigen Vectors', 'Vector Spaces', 'Linear Transformations', 'Differential Equations']
      },
      {
        name: 'Programming for Problem Solving',
        code: '100104',
        credits: '5',
        description: 'Introduction to computer programming, syntax loops in C, recursive functions, pointers, and custom file handling.',
        modules: ['Introduction to C Programming', 'Variables & Data Types', 'Operators & Control Statements', 'Arrays & Strings', 'Functions & Recursion', 'Structures & Pointers', 'File Handling']
      },
      {
        name: 'Workshop Manufacturing Practices',
        code: '100105',
        credits: '3',
        description: 'Practical training covering carpentry, welding joints, manual fittings, casting, and workshop safety guidelines.',
        modules: ['Carpentry', 'Welding', 'Fitting Shop', 'Casting', 'Smithy', 'Electrical Workshop', 'Safety Practices']
      },
      {
        name: 'English',
        code: '100106',
        credits: '3',
        description: 'Improving technical presentation, professional resume writing, group discussions, and job interviews etiquettes.',
        modules: ['Technical Communication', 'Grammar & Vocabulary', 'Presentation Skills', 'Group Discussion', 'Professional Writing', 'Interview Communication']
      }
    ]
  },
  {
    semester: 'Sem 2',
    subjects: [
      {
        name: 'Physics (Semiconductor Physics)',
        code: '100201',
        credits: '5.5',
        description: 'Physics of solid semiconductors, LED and laser technology, solar cells operations, and quantum devices.',
        modules: ['Semiconductor Fundamentals', 'LEDs & Lasers', 'Photodetectors', 'Solar Cells', 'Optoelectronics', 'Quantum Devices']
      },
      {
        name: 'Mathematics-II (Probability & Statistics)',
        code: '100202',
        credits: '4',
        description: 'Calculus probability distributions, random variables, hypothesis testing, sampling theory, and statistical modeling.',
        modules: ['Probability Theory', 'Random Variables', 'Probability Distributions', 'Correlation & Regression', 'Statistical Testing', 'Sampling Theory']
      },
      {
        name: 'Basic Electrical Engineering',
        code: '100203',
        credits: '5',
        description: 'Circuit analysis theorems, single-phase transformers, rotating motor operations, and grid measuring instrumentation.',
        modules: ['Circuit Laws', 'AC & DC Circuits', 'Transformers', 'Electrical Machines', 'Power Systems', 'Measuring Instruments']
      },
      {
        name: 'Engineering Graphics & Design',
        code: '100204',
        credits: '3',
        description: 'Basic isometric and orthographic projections, custom dimensions, curves, and computer-aided design (CAD) tools.',
        modules: ['Orthographic Projection', 'Isometric Projection', 'Engineering Curves', 'Dimensioning', 'CAD Basics', 'Sectional Views']
      }
    ]
  },
  {
    semester: 'Sem 3',
    subjects: [
      {
        name: 'Analog Circuits',
        code: 'ESC 301',
        credits: '5',
        description: 'Operational characteristics of diodes, BJT amplifiers, operational amplifier (Op-Amp) linear and non-linear designs.',
        modules: ['Diode Circuits', 'BJT Amplifiers', 'MOSFET Circuits', 'Operational Amplifiers', 'Linear Applications', 'Nonlinear Applications']
      },
      {
        name: 'Data Structures & Algorithms',
        code: 'PCC-CS 301',
        credits: '5',
        description: 'Foundations of data storage structures: arrays, linked lists, stacks, queues, trees, complex sorting, and search algorithms.',
        modules: ['Arrays & Linked Lists', 'Stack & Queue', 'Trees & Graphs', 'Searching & Sorting', 'Hashing', 'Algorithm Complexity']
      },
      {
        name: 'Object Oriented Programming using C++',
        code: 'PCC-CS 302',
        credits: '5',
        description: 'Core OOP guidelines: classes and objects, method overloading, virtual inheritance, exception safeguards, and C++ file I/O.',
        modules: ['Classes & Objects', 'Constructors & Destructors', 'Inheritance', 'Polymorphism', 'Exception Handling', 'File Handling in C++']
      },
      {
        name: 'Mathematics-III (Differential Calculus)',
        code: 'BSC 301',
        credits: '2',
        description: 'Partial differential calculus, vector operators, Fourier series expansion, and Laplace transformation constants.',
        modules: ['Partial Differentiation', 'Multiple Integrals', 'Vector Calculus', 'Fourier Series', 'Laplace Transform']
      },
      {
        name: 'Technical Writing',
        code: 'HSMC 301',
        credits: '3',
        description: 'Preparing detailed technical proposals, formal email communications, and academic research templates.',
        modules: ['Report Writing', 'Technical Documentation', 'Resume Writing', 'Formal Communication', 'Research Paper Basics']
      },
      {
        name: 'Summer Industry Internship-I',
        code: 'INT-CS 301',
        credits: '4',
        description: 'First practical industry exposure or technical projects. Requires technical report submissions.',
        modules: ['Industry Exposure', 'Technical Skills', 'Professional Ethics', 'Project Work']
      }
    ]
  },
  {
    semester: 'Sem 4',
    subjects: [
      {
        name: 'Discrete Mathematics',
        code: 'PCC-CS 401',
        credits: '4',
        description: 'Set structures, Boolean logic gates, relations, algebraic groups, tree parsing, and combinatorics calculations.',
        modules: ['Sets & Relations', 'Functions', 'Logic & Proofs', 'Algebraic Structures', 'Graph Theory', 'Trees & Combinatorics']
      },
      {
        name: 'Computer Organization & Architecture',
        code: 'PCC-CS 402',
        credits: '5',
        description: 'CPU register pathways, arithmetic logic unit design, memory hierarchy, cache configurations, pipelining, and instruction sets.',
        modules: ['Number Systems', 'Processor Architecture', 'Memory Organization', 'Input/Output Systems', 'Pipelining', 'Instruction Set Architecture']
      },
      {
        name: 'Operating Systems',
        code: 'PCC-CS 403',
        credits: '5',
        description: 'Multi-threading scheduler, deadlock recovery algorithms, virtual memory paging, UNIX Linux terminal commands, and file systems.',
        modules: ['Process Management', 'CPU Scheduling', 'Deadlocks', 'Memory Management', 'File Systems', 'Linux Basics']
      },
      {
        name: 'Design & Analysis of Algorithms',
        code: 'PCC-CS 404',
        credits: '5',
        description: 'Asymptotic complexity analysis, divide-and-conquer, greedy designs, dynamic programming, backtracking, and NP-completeness.',
        modules: ['Divide & Conquer', 'Greedy Algorithms', 'Dynamic Programming', 'Backtracking', 'NP Completeness', 'Graph Algorithms']
      },
      {
        name: 'Digital Electronics',
        code: 'ESC 401',
        credits: '5',
        description: 'Combinational logic systems, custom counters, flip-flop registers, and sequential state machines.',
        modules: ['Boolean Algebra', 'Logic Gates', 'Flip Flops', 'Counters', 'Registers', 'Sequential Circuits']
      },
      {
        name: 'Human Resource Development & Organizational Behaviour',
        code: 'HSMC 402',
        credits: '3',
        description: 'Study of organizational behaviors, leadership, corporate ethics, and conflict management.',
        modules: ['Organizational Structure', 'Leadership', 'Team Building', 'Motivation', 'Conflict Management', 'Workplace Ethics']
      },
      {
        name: 'Environmental Science',
        code: 'MC 401',
        credits: '0',
        description: 'Biological ecosystems, greenhouse gas emissions, waste disposal, and sustainable development principles.',
        modules: ['Ecosystem', 'Pollution', 'Climate Change', 'Sustainable Development', 'Waste Management']
      }
    ]
  },
  {
    semester: 'Sem 5',
    subjects: [
      {
        name: 'Database Management Systems',
        code: 'PCC-CS 501',
        credits: '5',
        description: 'Entity-relationship (ER) models, structured query language (SQL), B+ tree indices, normalization, and ACID transactions.',
        modules: ['ER Model', 'SQL', 'Normalization', 'Transactions', 'Indexing', 'Database Security']
      },
      {
        name: 'Formal Language & Automata Theory',
        code: 'PCC-CS 502',
        credits: '4',
        description: 'Deterministic finite automata (DFA), context-free grammars (CFG), Turing machines, and decidability limits.',
        modules: ['Finite Automata', 'Regular Expressions', 'CFG', 'PDA', 'Turing Machines', 'Computability']
      },
      {
        name: 'Artificial Intelligence',
        code: 'PCC-CS 503',
        credits: '3',
        description: 'Search heuristics, knowledge representation models, neural network layers, and expert systems logic.',
        modules: ['Intelligent Agents', 'Search Algorithms', 'Knowledge Representation', 'Expert Systems', 'Machine Learning Basics', 'Neural Networks']
      },
      {
        name: 'Software Engineering',
        code: 'PCC-CS 504',
        credits: '3',
        description: 'Waterfall and Agile methodologies, UML diagram designs, testing validation, and software project management.',
        modules: ['SDLC', 'Agile Model', 'Requirement Engineering', 'Software Testing', 'UML Diagrams', 'Project Management']
      },
      {
        name: 'Professional Skill Development',
        code: 'HSMC 501',
        credits: '3',
        description: 'Corporate ethics, corporate interview setups, quantitative reasoning, and career presentation grooming.',
        modules: ['Aptitude', 'Communication Skills', 'Interview Preparation', 'Personality Development', 'Corporate Ethics']
      },
      {
        name: 'Software Training',
        code: 'INT-CS 501',
        credits: '0',
        description: 'Practical industry-oriented software training bootcamp or development exercises.',
        modules: ['Industry Specific Skills', 'Practical Projects', 'Mock Interviews']
      },
      {
        name: 'MOOCs / NPTEL / SWAYAM',
        code: 'MC 501',
        credits: '3',
        description: 'Mandatory online certificate courses for academic credit transfers.',
        modules: ['Online Learning', 'Weekly Assignments', 'Proctored Exam']
      },
      {
        name: 'Summer Entrepreneurship-II',
        code: 'ENT-CS 501',
        credits: '6',
        description: 'Incubation training on startup planning, business structures, and prototype scaling pitches.',
        modules: ['Startup Basics', 'Business Pitch', 'Funding Models']
      },
      {
        name: 'Seminar',
        code: 'SEM 501',
        credits: '1',
        description: 'Presentation on a selected technical topic with comprehensive research paper reviews.',
        modules: ['Technical Presentation', 'Topic Defense', 'Literature Review']
      }
    ]
  },
  {
    semester: 'Sem 6',
    subjects: [
      {
        name: 'Computer Networks',
        code: 'PCC-CS 601',
        credits: '5',
        description: 'OSI TCP/IP layer protocols, routing routers operations, transport UDP TCP traffic, and security principles.',
        modules: ['OSI Model', 'TCP/IP', 'Routing Protocols', 'Network Security', 'Wireless Networks', 'Transport Layer']
      },
      {
        name: 'Compiler Design',
        code: 'PCC-CS 602',
        credits: '5',
        description: 'Lexical analyzer, LL LR parser systems, intermediate code trees generation, and CPU instruction code optimization.',
        modules: ['Lexical Analysis', 'Syntax Analysis', 'Parsing', 'Intermediate Code Generation', 'Optimization', 'Code Generation']
      },
      {
        name: 'Machine Learning',
        code: 'PCC-CS 603',
        credits: '4',
        description: 'Supervised and unsupervised models: linear regression, decision trees, K-means, SVM, and validation models.',
        modules: ['Supervised Learning', 'Unsupervised Learning', 'Regression', 'Classification', 'Clustering', 'Model Evaluation']
      },
      {
        name: 'Web Technology',
        code: 'PCC-CS 604',
        credits: '4',
        description: 'Front-end layouts using HTML/CSS, Javascript DOM manipulations, and server-side REST API bindings.',
        modules: ['HTML/CSS', 'JavaScript', 'React Basics', 'Backend APIs', 'Authentication', 'Responsive Design']
      },
      {
        name: 'Cyber Security',
        code: 'PCC-CS 605',
        credits: '3',
        description: 'Cryptography ciphers, malware, ethical security threat analysis, and Indian cyber laws guidelines.',
        modules: ['Cryptography', 'Ethical Hacking', 'Malware', 'Network Security', 'Cyber Laws', 'Authentication Systems']
      },
      {
        name: 'Mini Project',
        code: 'PROJ-CS 601',
        credits: '2',
        description: 'Small development project demonstrating clean design, testing, and documentation principles.',
        modules: ['Problem Statement', 'Design & Coding', 'Testing', 'Project Report']
      },
      {
        name: 'Internship-II / Industrial Training',
        code: 'INT-CS 601',
        credits: '4',
        description: 'Second mandatory professional internship inside corporate workspace setups.',
        modules: ['Corporate Training', 'Live Projects', 'Work Documentation']
      }
    ]
  },
  {
    semester: 'Sem 7',
    subjects: [
      {
        name: 'Biology for Engineers',
        code: 'BSC 701',
        credits: '3',
        description: 'Genetics, biomolecule chemical properties, cell modeling, and computational bioinformatics algorithms.',
        modules: ['Classification', 'Genetics', 'Biomolecules', 'Biotechnology', 'Human Physiology', 'Bioinformatics']
      },
      {
        name: 'Open Elective-I',
        code: 'OEC 701',
        credits: '3',
        description: 'Inter-disciplinary elective course to widen non-core engineering competencies.',
        modules: ['Interdisciplinary Studies', 'Special Topics', 'Practical Applications']
      },
      {
        name: 'Open Elective-II',
        code: 'OEC 702',
        credits: '3',
        description: 'Advanced inter-disciplinary concepts covering other branch designs.',
        modules: ['Elective Subject Concepts', 'Project-based Studies']
      },
      {
        name: 'Program Elective-III',
        code: 'PEC-CS 701',
        credits: '3',
        description: 'Specialization elective courses: Cloud Computing, Blockchain, IoT, Data Science, or Big Data.',
        modules: ['Specialization Choice', 'Advanced Concepts', 'Case Study Reviews']
      },
      {
        name: 'Project-I',
        code: 'PROJ-CS 701',
        credits: '6',
        description: 'Phase 1 of final year project: literature study, system analysis, and mock designs.',
        modules: ['Problem Framing', 'System Design', 'Midterm Review']
      },
      {
        name: 'Summer Entrepreneurship-III',
        code: 'ENT-CS 701',
        credits: '8',
        description: 'Final incubation training, investor business pitching, and scaling logistics.',
        modules: ['Advanced Business Pitch', 'Venture Funding', 'Scaling Up']
      },
      {
        name: 'Professional Elective Lab-II',
        code: 'PEC-CS 701L',
        credits: '1',
        description: 'Practical lab simulation and system modeling of elective course concepts.',
        modules: ['Lab Experiments', 'Advanced Simulation', 'Lab Records']
      }
    ]
  },
  {
    semester: 'Sem 8',
    subjects: [
      {
        name: 'Project-II',
        code: 'PROJ-CS 801',
        credits: '12',
        description: 'Phase 2 final year project: complete prototype implementation, validation testing, and thesis defense.',
        modules: ['Project Implementation', 'System Modeling & Prototype', 'Performance Evaluation', 'Thesis Submission & Viva']
      },
      {
        name: 'Industrial Internship / Major Training',
        code: 'INT-CS 801',
        credits: '6',
        description: 'Full semester major industry corporate training or research internship under guidance.',
        modules: ['Site/Corporate Internship', 'Operational/Project Logs', 'Organizational Audits', 'Internship Report & Presentation']
      },
      {
        name: 'Program Elective-IV',
        code: 'PEC-CS 802',
        credits: '3',
        description: 'Advanced specialized computer electives: Deep Learning, ANN, DevOps, AR/VR, or Distributed Systems.',
        modules: ['Topic Detailing', 'Modeling & Simulation', 'Final Projects']
      },
      {
        name: 'Open Elective-III',
        code: 'OEC 803',
        credits: '3',
        description: 'Final Year inter-disciplinary seminar studies and applications.',
        modules: ['Subject Selection', 'Interdisciplinary Studies', 'Application Seminars']
      },
      {
        name: 'Seminar & Technical Presentation',
        code: 'SEM 801',
        credits: '2',
        description: 'Presenting technical study details and research defense vivas.',
        modules: ['Seminar Topic Selection', 'PPT Preparation', 'Viva Voce']
      }
    ]
  }
];

export const BEU_PORTAL_URL = 'https://beu-bih.ac.in/academics/Syllabus/B.Tech';
