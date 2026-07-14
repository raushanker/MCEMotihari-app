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
  imageUrl?: string;
  qualifications?: string;
  subjectExpertise?: string;
  professionalExperience?: string;
  areaOfResearch?: string;
  publications?: string;
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
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192480/faculty/civil-anil.png',
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `M.Tech in Structural Engineering, IIT Roorkee. B.Tech in Civil Engineering, HIT,Haldia.`,
    subjectExpertise: `Structural Analysis, Reinforced concrete design,Mechanics of Solids, Structural dynamics`,
    professionalExperience: `3 years experience as a structural engineer`
  },
  {
    id: 'civil-arman',
    name: 'Dr. Md Arman Ali',
    department: 'civil',
    designation: 'HoD (Civil CA)',
    phone: '9588218761',
    email: 'hodceca.armanmce2018@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/md-arman-ali/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192482/faculty/civil-arman.jpg',
    isHod: true,
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `M.Tech (Civil Engineering with specialization in Hydraulic Structures) from AMU, 2012 - 2014\nPh.D(Civil Engineering with specialization in Water Resources Engineering) from NIT Patna, (July-Dec)2019 - March 2025`,
    subjectExpertise: `Hydraulic Structures, Irrigation Engineering, Engineering Hydrology, Fluid Mechanics, Soil Mechanics, CPM/PERT, River Engineering, Dam Design, Solid Mechanics, etc.`,
    professionalExperience: `1.5 years of teaching experience as Assistant Professor at SIIT and Poornima University, Jaipur, Rajasthan.\nFrom 2018 to present (around 8 years) working as Assistant Professor at Motihari College of Engineering, Motihari`,
    areaOfResearch: `Hydraulic Structures, Scouring, Sediment Transport, Water Resources Engineering, Remote Sensing & GIS, Land Cover Changes, etc.`,
    publications: `1. Ali et. al. (2023)Finite Element Modelling of Corroded RC Flexural Elements, International Journal of Engineering Trends and Technology 2. Ali et. al. (2023) SUSTAINABLE DEVELOPMENT AND SOLAR ENERGY TECHNOLOGIES, International Journal of Applied Engineering & Technology 3. Ali & Roy (2023) Muzaffarpur city land changes and impact on urban runoff and water quality of the river Burhi Gandak, International Journal of Environmental Science and Technology 4. Ali (2024) Analysis of socioeconomic and environmental growth of Muzaffarpur city using a novel rainfall and flood forecasting model, Soft Computing 5. Ali & Roy (2024)Dual-path multi-scale attention guided network based changes in land use/land cover classification, International Journal of Sustainable Building Technology and Urban Development`
  },
  {
    id: 'civil-anil-chhotu',
    name: 'Dr. ANIL KUMAR CHHOTU',
    department: 'civil',
    designation: 'HOD (Civil Engineering) & Assistant Professor',
    phone: '7667052676',
    email: 'anil04.dst@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/anil-kumar-chhotu/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192483/faculty/civil-anil-chhotu.jpg',
    isHod: true,
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `M tech from IIT Kharagpur in Infrastructure design and Management B.E.in Civil Engineering from Jadavpur University Kolkata`,
    subjectExpertise: `Transportation Engineering,Project management, Design of Steel and Concrete structures`,
    professionalExperience: `5 year`,
    areaOfResearch: `Trafiic Management and Road safety,New construction materials`,
    publications: `1.Chhotu, A.K,Kumar,C,"Willingness to pay for better safety on State Highways,"International Journal of Civil engineering ResearchVolume-6,407-410(2013)\n2.Priyadarshee, A.,Chhotu, A.K.,Kumar V."A Review on mathematical models to evaluate the properties of fiber reinforced soil,"Journal of Civil Engineering and Environmental Technology,Volume-1,9-14(2013)\n3.Priyadarshee, A.,Chhotu, A.K.,Kumar V,"Use of bamboo in low volume rigid pavement as reinforcement material:A review,"\n4.Priyadarshee, A.,Chhotu, A.K.,Kumar V."Effect of fiber properties on strength of fiber reinforced soil: A review`
  },
  {
    id: 'civil-ghausul',
    name: 'GHAUSUL AZAM ANSARI',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '8638578983',
    email: 'ghausulazam1039@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ghausul-azam-ansari/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192486/faculty/civil-ghausul.jpg',
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `M.Tech in Geotechnical Engineering, MNNIT ALLAHABAD\nB.Tech in Civil Engineering, INTEGRAL UNIVERSITY LUCKNOW`,
    subjectExpertise: `Geotechnical Engineering\nEngineering Geology\nContracts, Specification and Estimation\nRailway Engineering\nFoundation Engineering`,
    professionalExperience: `3 years work in Military Engineering Service as a Junior Engineering`,
    areaOfResearch: `Soil Liquafication\nSoil improvement techniques\nSoil Structure Interaction`
  },
  {
    id: 'civil-niraj',
    name: 'DR. NIRAJ KUMAR',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '7204896553',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/niraj-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192488/faculty/civil-niraj.png',
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `B.E. [Dayananda Sagar College of Engineering, Bangalore (VTU Karnataka)], 2010-2014\nM.Tech. [National Institute of Technology Patna (NIT Patna)], 2014-2016\nPh. D. [National Institute of Technology Patna (NIT Patna)], 2018-2024`,
    subjectExpertise: `Fluid Mechanics\nHydraulic Engineering\nIrrigation Engineering\nGeo informatics\nSolid Mechanics\nEnvironmental Engineering`,
    professionalExperience: `Worked as an Assistant Engineer (Civil) in Water Resources Department, Govt. of Bihar from 2022 to 2023\nWorked as an Assistant Professor at MIT Muzaffarpur from 2018 to 2022\nWorked as Young Professional (Technical) in NHAI from 2017 to 2018\nWorked as an Assistant Engineer (Civil) in National Projects Construction Corporation (NPCC) in 2017`,
    areaOfResearch: `Morphometric Analysis\nFlood Risk Assessment\nFlood Inundation\nProbabilistic Modeling\nWater Quality Modelling`,
    publications: `Priyadarshee A, Rahul AK, Kumar V, Kumar A and Kumar N (2024) Spatial variation in water quality of the Burhi Gandak River: a multi-location assessment. Front. Environ. Sci. 12:1487469. doi: 10.3389/fenvs.2024.1487469\nN. Kumar and R. Jha, “GIS-based Flood Risk Mapping: The Case Study of Kosi River Basin, Bihar, India”, Eng. Technol. Appl. Sci. Res., vol. 13, no. 1, pp. 9830–9836, Feb. 2023. https://doi.org/10.48084/etasr.5377\nNiraj Kumar, Ramakar Jha , "Flood Frequency Analysis for Kosi River Basin, Bihar, India using Statistical Methods," Civil Engineering and Architecture, Vol. 12, No. 2, pp. 991 - 999, 2024. DOI: 10.13189/cea.2024.120223.\nN. Kumar and R. Jha, "Morphometric Analysis of Kosi River Basin, Bihar, India Using Remote Sensing and GIS Techniques," in Climate Change Impacts on Water Resources: Hydraulics, Water Resources and Coastal Engineering, R. Jha, V. P. Singh, V. Singh, L. B. Roy, and R. Thendiyath, Eds. Cham: Springer International Publishing, 2021, pp. 469–481. DOI: https://doi.org/10.1007/978-3-030-64202-0_40\nA. K. Chhotu, A. Kumar, A. Priyadarshee, G. A. Ansari, and N. Kumar, “An Interpretation of the Cumulative Impact of FASTag on the Reduction of Environmental Pollution and Traffic Delays at Toll Booths: A Case Study”, Eng. Technol. Appl. Sci. Res., vol. 15, no. 1, pp. 20395–20400, Feb. 2025.\nA. Kumar, . Rajkishor, N. Kumar, A. K. Chhotu, and B. Kumar, “Effect of Ground Granulated Blast Slag and Temperature Curing on the Strength of Fly Ash-based Geopolymer Concrete”, Eng. Technol. Appl. Sci. Res., vol. 14, no. 2, pp. 13319–13323, Apr. 2024.\nSantosh Kumar, Shiwanshu Shekhar, Akash Priyadarshee, Niraj Kumar, Pranav Kumar and Vijay Kumar: Road Safety Issues in Muzaffarpur Region of Bihar: A Review; Journal of Civil Engineering and Environmental Technology p-ISSN: 2349-8404; e-ISSN: 2349-879X; Volume 6, Issue 7; October-December, 2019, pp. 469-471\nVikash Kumar, Shiwanshu Shekhar, Santosh Kumar, Akash Priyadarshee and Niraj Kumar: A Study on Soil Stabilisation using Bio-Enzyme; Journal of Civil Engineering and Environmental Technology p-ISSN: 2349-8404; e-ISSN: 2349-879X; Volume 6, Issue 7; October-December, 2019, pp. 472-475\nNiraj Kumar, Santosh Kumar, Shiwanshu Shekhar, Pranav Kumar and Abhishek Kumar Choudhary; Quantitative morphometric analysis using remote sensing and GIS: A case study of Burhi Gandak river Bihar India; ICRESET 2020\nPranav Kumar, A. K. Sinha, Niraj Kumar and Maniranjan Kumar; Rapid Visual Screening of Existing Buildings using Android Application; International Journal of Scientific & Engineering Research Volume 11, Issue 12, December-2020; ISSN 2229-5518; https://www.ijser.org/researchpaper/RAPID-VISUAL-SCREENING-OF-EXISTING-BUILDINGS-USING-ANDROID-APPLICATION.pdf`
  },
  {
    id: 'civil-sushant',
    name: 'SUSHANT KUMAR',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '8210116757',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/sushant-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192489/faculty/civil-sushant.jpg',
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `M. Tech in Transportation Engineering (NIT PATNA), 2014-2016`,
    subjectExpertise: `Transportation Engineering, Geotechnical Engineering, Material Testing & Evaluation`,
    professionalExperience: `Junior Research Fellow (NIT PATNA), 2017-2019`,
    areaOfResearch: `Soil stabilization using locally avilable materials.`
  },
  {
    id: 'civil-ashish-pathak',
    name: 'ASHISH KUMAR PATHAK',
    department: 'civil',
    designation: 'Assistant Professor',
    phone: '8825283570',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ashish-kumar-pathak/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192491/faculty/civil-ashish-pathak.jpg',
    sharedDepartments: ['civil', 'civil_ca'],
    qualifications: `M.tech in soil Mechanics & foundation engineering from BIT SINDRI, JHARKHAND\nB.tech in civil engineering from SSBT COET JALGAON, MAHARASHTRA`,
    subjectExpertise: `Soil Mechanics\nFoundation Engineering\nEnvironmental Engineering\nBuilding science & Materials\nHighways Engineering`,
    professionalExperience: `Teaching Experience - 6\nConstruction Experience - 5`,
    areaOfResearch: `Soil stabilization by using GGBS\nConcrete properties by using Fibre`
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
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192493/faculty/cse-vijay.jpg',
    sharedDepartments: ['cse', 'cse_ai'],
    qualifications: `M Tech (Computer Science and Engineering) Specialization in Information Security`,
    subjectExpertise: `Information Security, Cryptography, Computer Architecture`,
    areaOfResearch: `Information Security , Security Protocol`
  },
  {
    id: 'cse-krishana',
    name: 'Krishana Karak',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '9006730222',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/krishana-karak/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192495/faculty/cse-krishana.jpg',
    sharedDepartments: ['cse', 'cse_ai']
  },
  {
    id: 'cse-juhi',
    name: 'Juhi Kumari',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '7903345717',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ms-juhi-kumari/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192496/faculty/cse-juhi.jpg',
    sharedDepartments: ['cse', 'cse_ai'],
    qualifications: `MTECH (CSE)\nUGC-NET`,
    professionalExperience: `Solution Engineer at Nokia\nSoftware Developer (Fullstack) at Johnson Control`
  },
  {
    id: 'cse-ravi',
    name: 'Ravi Kumar',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '8210421370',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/mr-ravi-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192498/faculty/cse-ravi.jpg',
    sharedDepartments: ['cse', 'cse_ai'],
    qualifications: `Pursuing Ph.D (BEU, Patna)\nM.TECH (Computer Technology), National Institute of Technology, Raipur (C.G)\nB.TECH (Computer Science & Engg.), Birla Institute of Technology, Mesra, Ranchi (Jharkhand)`,
    subjectExpertise: `Automata Theory, Compiler Design, Emerging Web Technology, Wireless Sensor Network`,
    professionalExperience: `1.5 yrs: JRF (CSE), IIT (ISM), Dhanbad (Jharkhand)\n1.5 yrs: Assistant Professor (CSE), RVSCET, Jamshedpur (Jharkhand)\n7 yrs: IT MANAGER, ENERGY DEPARTMENT, GOVT. OF BIHAR`
  },
  {
    id: 'cse-aknan',
    name: 'Mohammad Aknan',
    department: 'cse',
    designation: 'HOD (CSE) & Assistant Professor',
    phone: '8879068355',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/aknan/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192499/faculty/cse-aknan.jpg',
    isHod: true,
    sharedDepartments: ['cse', 'cse_ai'],
    qualifications: `B. Tech. : Ajay Kumar Garg Engineering College Ghaziabad\nM. Tech : N.I.T. Rourkela\nPhD (Pursuing) : N.I.T. Patna\nGATE 2011,2012,2015,2016,2017\nUGC NET JRF June 2013`,
    subjectExpertise: `Database System, Information Security, Computer Architecture, Digital Logic, Computer Network, Operating System, Cryptography, Cloud Computing, IoT`,
    professionalExperience: `4 Year Industry experience.\nAssistant Professor CSE in SIT Sitamarhi from June 2018 to August 2020.\nAssistant Professor CSE in GCE Gaya from September 2020 to June 2022.\nAssistant Professor - Senior Grade CSE in GCE Gaya from June 2022 to November 2024`,
    areaOfResearch: `Cloud Computing, Edge Computing, IoT`,
    publications: `1. Aknan, Mohammad, et al. "Analyzing Hybrid C4. 5 Algorithm for Sentiment Extraction over Lexical and Semantic Interpretation." Journal of Information Technology Management 15.Special Issue: EIntelligent and Security for Communication, Computing Application (ISCCA-2022) (2023): 57-79. (SCOPUS)\n2. Aknan, Mohammad, Maheshwari Prasad Singh, and Rajeev Arya. "AI and Blockchain Assisted Framework for Offloading and Resource Allocation in Fog Computing." Journal of Grid Computing 21.4 (2023): 74. (SCI)\n3. Aknan, Mohammad, et al. "A Diabetic Retinopathy Classification and Analysis Towards the Development of a Computer-Aided Medical Decision Support System." SN Computer Science 4.6 (2023): 783. (SCOPUS)`
  },
  {
    id: 'cse-kahkashan',
    name: 'Dr. Kahkashan Kouser',
    department: 'cse',
    designation: 'Assistant Professor',
    phone: '9835501027',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-kahkashan-kouser/',
    sharedDepartments: ['cse', 'cse_ai'],
    professionalExperience: `12 years`
  },

  // ─── ELECTRICAL & ELECTRONICS ENGINEERING (10 Members) ───
  {
    id: 'eee-chandra',
    name: 'Chandra Shekhar Singh Chandal',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '6203989398',
    email: 'chandrashekhar.mce@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/chandra-shekhar-singh-chandal/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192501/faculty/eee-chandra.jpg',
    qualifications: `Ph.D (Pursuing)\nM.Tech in Power Electronics & ASIC Design\nB. Tech. in Electrical & Electronics Engineering`,
    subjectExpertise: `Electrical Machine\nElectrical Drives\nBasic Electrical Engineering\nNetwork Analysis and Synthesis`,
    professionalExperience: `9 Years of Teaching and Research Experience`,
    areaOfResearch: `Electrical Derives\nPower Electronics Converters`,
    publications: `1. CS Singh, RK Tripathi "Maximum constant boost control of switch inductor quasi Z-source inverter" Maximum constant boost control of switch inductor quasi Z-source inverter CS Singh, RK Tripathi 2013 Students Conference on Engineering and Systems (SCES).\n2. SN Shukla, CS Singh, JK Dwivedi, "Improvement of voltage profile using static VAR compensation for Arc welding" 2016 11th International Conference on Industrial and Information Systems (ICIIS)\n3. Chandra Shekhar Singh and Malay Bhunia "CLOSED LOOP CONTROL OF MAXIMUM CONSTANT BOOST CONTROL OF SWITCH INDUCTOR QUASI Z-SOURCE INVERTER"Electrical Systems & Energy Technologies (ESET-2013)`
  },
  {
    id: 'eee-suryadeo',
    name: 'Dr. Surya Deo Choudhary',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '9470577493',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-aditya-kumar-singh/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192503/faculty/eee-suryadeo.jpg',
    qualifications: `PhD in Electronics and Communication Engineering\nM.Tech in Control System\nB. Sc. Engineering in Electronics and Communication Engineering`,
    subjectExpertise: `Basic Electronics\nAnalog Electronic Circuits\nSignals and Systems\nPrinciples of Communication\nAntennas and Microwaves\nElectromagnetic Waves`,
    professionalExperience: `11 Years of Teaching and Research Experience`,
    areaOfResearch: `Microstrip Antennas\nMicrowave Passive Circuits and Networks\nSemiconductor Organic Materials.`,
    publications: `Surya Deo Choudhary, Shilpee Patil, Alka Verma and Binod Kumar Kanaujia “Design of Dual-Polarized Triple-Band Concentric Annular-Ring Microstrip Patch Antenna for GPS Applications” International Journal of Microwave and Wireless Technologies, Cambridge ISSN: 1759-0795, Volume-, Issue-, Page: 1-9, January 2022. https://doi.org/10.1017/S1759078721001756 [SCI]\nPankaj Kumar, Niraj Agrawal, Vijay Kumar Pandey, Anil Kumar Gautam, Sanjay Kumar Sharma, Surya Deo Choudhary “Highly-efficient OLED with Cesium Fluoride Electron Injection Layer” Solid State Electronics, Elsevier, ISSN: 0038-1101, Volume-183, September 2021. https://doi.org/10.1016/j.sse.2021.108031 [SCI]\nSurya Deo Choudhary, Abhiruchi Srivastava, Manish Kumar “Design of Single-Fed Dual-Polarized Dual-Band Slotted Patch Antenna for GPS and SDARS Applications” Microwave and Optical Technology Letters, Wiley ISSN: 1098-2760, Volume-63, Issue-01, Page: 353-360, January 2021. DOI: 10.1002/mop.32597 [SCI]\nVinay Mohan, A.K. Gautam, S.D. Choudhary, M. K. Mariam Bee, R. Puviarasi, S. Saranya, and Niraj Agrawal “Enhanced Performance Organic Light Emitting Diode with CuI:CuPC Composite Hole Transport Layer” IEEE Transactions on Nanotechnology, ISSN: 1941-0085, Volume-19, Page: 699-703, October 2020. DOI: 10.1109/TNANO.2020.3019096 [SCI]\nPankaj Kumar, Niraj Agrawal, Surya Deo Choudhary, A. K. Gautam “Highly-Efficient Solution Processed Yellow Organic Light Emitting Diode with Tungsten Trioxide Hole Injection/Transport Layer” IEEE Transactions on Nanotechnology, ISSN: 1941-0085, Volume-19,Issue-01,Page: 61-66,December 2019.DOI: 10.1109/TNANO.2019.2959884 [SCI]\nAbhiruchi Srivastava, Surya Deo Choudhary, Karamjeet Sharma, Shreyansh Jha, Kamlesh kumar, Taha Butul and Vinod M Kapse “Design of Microstrip Rectangular Patch Antenna using Coplanar Parasitic Rod Elements with Substrate Integrated Feeding Line Technique” (ISSN 1927-5307), J. Math. Comput. Sci, SCIK, Volume-, No-, June 2021. [SCOPUS]\nDhananjay Singh, Surya Deo Choudhary, B. Mohapatra “Design of Microstrip Patch Antenna for Ka-Band (26.5-40 GHz) Applications” (ISSN 2214-7853), Materialstoday: Proceedings, Elsevier, Volume-45, Part-2, May 2021, P. 2828-2832, https://doi.org/10.1016/j.matpr.2020.11.805 [SCOPUS]\nPankaj Kumar, S. K. Singh, Surya Deo Choudhary “Reliability prediction analysis of aspect-oriented application using soft computing techniques” (ISSN 2214-7853), Materialstoday: Proceedings, Volume-45, Part-2, May 2021, P. 2660-2665, https://doi.org/10.1016/j.matpr.2020.11.518 [SCOPUS]\nDhananjay Singh, Surya Deo Choudhary, B. Mohapatra “Design and Fabrication of Millimeter Wave Microstrip Antenna for NGN Applications” (ISSN 1553-0396), International Journal of Microwave and Optical Technology, IAMOT, USA, Volume-16, Issue-3, May 2021, P. 279-285 [SCOPUS]\nPankaj Kumar, Renuka Sharma, Surya Deo Choudhary, S. K. Singh, Vinod M. Kapse “Predictive analysis of novel coronavirus using machine learning model - a graph mining approach” (ISSN 1927-5307), J. Math. Comput. Sci, SCIK, Volume-11, No-3, May 2021, P. 3647-3662 [SCOPUS]\nDhananjay Singh, Surya Deo Choudhary, B. Mohapatra “Design of rectangular C-slot patch antenna at 2.95 GHz and 4.32 GHz for next generation network” (ISSN 1927-5307), J. Math. Comput. Sci, SCIK, Volume-11, No-2, March 2021, P. 2123-2135 [SCOPUS]\nVineet Shekher, Surya Deo Choudhary, Pankaj Kumar, Neel Kamal “Design and Implementation of Real Time Integer Order PID Controller for Infrared Heater” (ISSN 2277-3878), International Journal of Recent Technology and Engineering, Volume 7, issue 6S5, May 2019, P. 5052-5057 [SCOPUS]\nPooja Singh Gautam, Dhananjay Singh, Surya Deo Choudhary, B. Mohapatra “Design & Fabrication of DGS Microstrip Patch Antenna for S, C & X Band Applications” (ISSN 2277-3878), International Journal of Recent Technology and Engineering, Volume 8, Issue 2, July 2019, P. 141-144 [SCOPUS]\nSurya Deo Choudhary, Gaurav Arora, Sandeep Singh, Vineet Shekher “Microstrip Patch Antenna for GPS/WiMAX/WLAN Applications” (ISSN 2277-3878), International Journal of Recent Technology and Engineering, Volume 8, Issue 2, July 2019, P. 26-28 [SCOPUS]\nSurya Deo Chaudhary, Jitendra Kumar Saroj “Design of Bipolar Signal Integrator Using Voltage to Frequency Converter”, International Journal of Scientific & Technology Research, October 2019, ISSN: 2277-8616, Volume-8, Issue-10, October 2019, P. 168-177 [SCOPUS]\nRashmi Mishra, Surya Deo Chaudhary, Pankaj Tyagi “Implementation of digital signal processing for monitoring plant health”, International Journal of Innovative Technology and Exploring Engineering (IJITEE), ISSN: 2278-3075, Volume-8, Issue-12, October 2019, P. 3480-3482 [SCOPUS]\nSurya Deo Chaudhary, Alka Singh, Ashutosh Kumar Singh “Shopping System based on RFID Technology”, International Journal of Recent Technology and Engineering (IJRTE), ISSN: 2277-3878, Volume-8, Issue-2S11, September 2019 [SCOPUS]\nSurya Deo Chaudhary, Jitendra Saroj “Circular Patch FSS Microstrip Antenna for C band applications”, International Journal of Recent Technology and Engineering (IJRTE), ISSN: 2277-3878, Volume-8, Issue-2S11, September 2019, P. 5851-5859 [SCOPUS]\nSurya Deo Chaudhary, Ashish Pathak “TCAD Simulation of nano-crystal floating gate EEPROM”, International Journal of Recent Technology and Engineering (IJRTE), ISSN: 2277-3878, Volume-8, Issue-2S11, September 2019, P. 2156-2157 [SCOPUS]\nSurya Deo Chaudhary, Alka Singh, Kanika Jindal “RFID based traffic offence fining system”, International Journal of Recent Technology and Engineering (IJRTE), ISSN: 2277-3878, Volume-8, Issue-2S11, September 2019, P. 2150-2151 [SCOPUS]\nAnjali Gupta, Surya Deo Chaudhary “Method of generating maximum power generation from piezoelectric system”, International Journal of Recent Technology and Engineering (IJRTE), ISSN: 2277-3878, Volume-8, Issue-2S11, September 2019 [SCOPUS]\nVineet Shekher, Pankaj Kumar, Surya Deo Chaudhary “Computational Analysis and Simulation of Fractional Order PID Controller for Ceramic Infrared Heater” (ISSN 2277-3878), International Journal of Recent Technology and Engineering, Volume 7, issue 6S5, May 2019, P. 2254-2260 [SCOPUS]\nSurya Deo Choudhary, Manish Kumar, Neel Kamal, Vineet Shekher “Microstrip Patch Antenna with Defected Ground Structure for X-Band Applications” (ISSN 2278-3075), International Journal of Innovative Technology and Exploring Engineering, Volume 8, Issue 8, June 2019, P. 2880-2882 [SCOPUS]\nSwarnima, Nidhi Sharma, Surya Deo Choudhary, “Design of QC LDPC Code Encoder Using Dual Diagonal Matrix” (ISSN: 2454-9150), International Journal for Research in Engineering Application & Management, June 2018, Vol. No. 04, Issue No. 03, P. 768-773.\nRavi Kumar, Nidhi Sharma, Surya Deo Choudhary, “Design and Simulation of 12T SRAM Cell Using Transmission Gate As Access Transistor On 45 nm Technology” (ISSN 2319-8354), International Journal of Advance Research in Science and Engineering, September 2017, Vol. No. 06, Issue No. 09, P. 1216-1220.\nMateshwar Singh, Surya Deo Choudhary, Ashutosh kr. Singh” Design & Simulation of Half Adder Circuit Using AVL technique based on CMOS Technology” (ISSN 2319-8354), International Research Journal of Engineering and Technology (IRJET) , August 2017, Vol. No. 04, Issue No. 08, P. 1630-1635.\nPradumn Kumar Gupta, Surya Deo Choudhary, Anshuman Singh, “Design of Compact Monopole Antenna loaded with SRR for WiMAX/Wi-Fi/Satellite Communication” (ISSN 2229-712X), Elixir International Journal, June 2017,106, P. 46729-46732.\nPurushotam Kumar, Prabhakar Kumar Prabhat, Surya Deo Choudhary, Pankaj Kumar “Speed Control of DC Motor using PID & Smart Controller” (ISSN 2229-5518) in International Journal of Scientific and Engineering Research, Volume 5, Issue 12, December 2014.\nDileep Kumar, Surya Deo Choudhary, Md Tabrej, Afida Ayob, and Molla Shahadat Hossain Lipu “Model Antiseptic Control Scheme to Torque Ripple Mitigation for DC-DC Converter-Based BLDC Motor Drives” Energies, MDPI, ISSN: 1996-1073, Volume-15, Issue-21, October 2022. https://doi.org/10.3390/en15217823.`
  },
  {
    id: 'eee-saket',
    name: 'SAKET KUMAR SINGH',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '7709570234',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/saket-kumar-singh/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192506/faculty/eee-saket.jpg',
    qualifications: `M.Tech in Power System\nB.Tech in Electrical and Electronics Engineering`,
    subjectExpertise: `Network Theory\nBasic Electrical Engineering\nPower System\nSignals and Systems`,
    professionalExperience: `11 Years of Teaching Experience`,
    areaOfResearch: `Renewable Energy`
  },
  {
    id: 'eee-kanhaiya',
    name: 'Dr. KANHAIYA KUMAR',
    department: 'eee',
    designation: 'HOD & Assistant Professor (EEE)',
    phone: '8789896398',
    email: 'kanhaiya.dst@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/kanhaiya-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192507/faculty/eee-kanhaiya.jpg',
    isHod: true,
    qualifications: `M.Tech (Power System Engineering) from IIT Roorkee\nPhD from IIT Roorkee`,
    subjectExpertise: `Power system design\nPower system protection and switchgear`,
    professionalExperience: `Assistant Electrical Engineer at South Bihar Power Distribution corporation Limited\nAssistant Professor at MEFGI Rajkot`,
    areaOfResearch: `Distribution system analysis\nCurrent transformer\nDistribution transformer loss of life evaluation`,
    publications: `K. Kumar, B. G. Kumbhar, and S. Satsangi, “Assessment of effect ofload models on loss-of-life calculation of a transformer using a pointestimation method,”Electric Power Components and Systems, pp. 1–12,2018.\nK. Kumar, B. G. Kumbhar, and S. Satsangi, "Extension of life of distribution transformer using Volt-VAr optimisation in a distribution system", IET Generation, Transmission & Distribution, volume 13, pp 1777-1785, 2019\nK. Kumar, S. Satsangi and G. B. Kumbhar, "Extension of Distribution Transformer Life in the Presence of Smart Inverter-based Distributed Solar Photovoltaic Systems," in CSEE Journal of Power and Energy Systems, vol. 10, no. 1, pp. 88-95, January 2024, doi: 10.17775/CSEEJPES.2022.06060`
  },
  {
    id: 'eee-tabrez',
    name: 'Dr. Md. Tabrez',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8002320880',
    email: 'md.tabrez1988@gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/md-tabrez/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192509/faculty/eee-tabrez.jpg',
    qualifications: `PhD (IIT-ISM, Dhanbad)\nM.Tech\nB.Tech`,
    subjectExpertise: `Power System, Drives, Electrical Machines`,
    professionalExperience: `Nov 2012-March 2015 Electrical Supervising Engineer at Najran Airport with Saudi Services co ltd (KSA gov. company)  Involved in Saudi government owned GACA project  Job Responsibility is to supervise and monitor all electrical related activities at Najran airport including LV, HV, instrumentation, control, operation, preventive and corrective maintenance of transformers, substations, switch gears, ATS, HV cables, lighting systems, cooling systems, water plant and sewage plant firefighting and related panels.  Did so many successful projects, one of them was solving power outage due to Multiple HV LLG and LLLG fault at Najran airport and returning normal SECO power`,
    areaOfResearch: `Multiphase Power\nPower Electronics\nBiomedical Engineering`,
    publications: `Rafiuddin, Nidal; Tabrez, Md; Khan, Yusuf Uzzaman; Farooq, Omar; ,Wavelet packet-based classification of brain states during English and mother tongue script writing,International Journal of Biomedical Engineering and Technology,22,4,325-337,2016,Inderscience Publishers (IEL)\nTabrez, M; Sadhu, PK; Iqbal, A; ,A Novel Three Phase to Seven Phase Conversion Technique Using Transformer Winding Connections,"Engineering, Technology & Applied Science Research",7,5,1953-1961,2017,\nTabrez, Md; Hasan, Md Asif; Rafiuddin, Nidal; Bakhsh, Farhad Ilahi; ,Upgrading cars running on Indian roads: Analyzing its impact on environment using ANN,2017 International Conference on Computing Methodologies and Communication (ICCMC),,,1156-1160,2017,IEEE\nTabrez, Md; Bakhsh, Farhad Ilahi; Hassan, Mahboob; Shamganth, K; Al-Ghnimi, Sami; ,A comparative simulation study of different sensorless permanent magnet synchronous motor drives using neural network and fuzzy logic,Journal of Intelligent & Fuzzy Systems,35,5,5177-5184,2018,IOS Press\nSuman Kumar Laha, Md Tabrez Pradip, Kumar Sahu, Atif Iqbal, Ankur Ganguli & Ashok Kumar Naskar; ,Solar Induction Heating Syatem using High Frequency Hybrid Resonant Inverter under CSI Mode,,,,,2018,"IN Patent App. 201,731,040,411"\nTabrez, Md; Sadhu, Pradip Kumar; Iqbal, Atif; Bakhsh, Farhad I; ,Analysis of a three-phase to seven-phase transformer under unbalanced input,Microsystem Technologies,26,8,2507-2516,2020,Springer Berlin Heidelberg\nTabrez, Md; Raj, Priyansu; Raj, Rahul; Gupta, Anubhav; Singh, Saket Kumar; ,Study of Solar Photovoltaic System with Utility Backup of an Educational Institute,"Energy Systems, Drives and Automations",,,443-448,2020,Springer\nBakhsh, Farhad Ilahi; Tabrez, Md; Hameed, Salman; ,Input Voltage and Slip Power Control Schemes Based Performance Optimization of Grid-Connected Induction Generator,Metaheuristic and Evolutionary Computation: Algorithms and Applications,,,585-594,2021,"Springer, Singapore"\nTabrez, Md; Sadhu, Pradip Kumar; Iqbal, Atif; Husain, Mohammed Aslam; Bakhsh, Farhad Ilahi; Singh, SP; ,Equivalent circuit modelling of a three-phase to seven-phase transformer using PSO and GA,Journal of Intelligent & Fuzzy Systems,42,2,689-698,2022,IOS Press\nTabrez, Md; Sadhu, Pradip Kumar; Hossain Lipu, Molla Shahadat; Iqbal, Atif; Husain, Mohammed Aslam; Ansari, Shaheer; ,"Power conversion techniques using multi-phase transformer: Configurations, applications, issues and recommendations",Machines,10,1,13,2021,MDPI\nTabrez, Md; Sadhu, Pradip Kumar; Iqbal, Atif; Baksh, Farhad Ilahi; ,A Three-phase to Seven-phase Energy Transformation under Unbalanced Supply Voltage,Preprints,,,,2018,MDPI AG\nAlShidani, Shadan; Alshabibi, Salim; Tabrez, Md; Kumar, Kanak; Bakhsh, Farhad Ilahi; ,Applications of 555 Timer for Development of Low-Cost System,Advanced Energy and Control Systems,,,207-216,2022,"Springer, Singapore"\nHusain, Mohammed Aslam; Singh, SP; Tabrez, Md; ,Intelligent Approach for Performance Investigation of Direct-Drive Generator-Based Wind Energy Conversion System Under Variable Speed Operation,Intelligent Data Analytics for Power and Energy Systems,,,471-483,2022,"Springer, Singapore"\nHusain, Mohammed Aslam; Rajput, Ritik; Gupta, Maneesh Kumar; Tabrez, Md; Ahmad, Md Waseem; Bakhsh, Farhad Ilahi; ,Design and Implementation of Different Drive Topologies for Control of Induction Motor for Electric Vehicle Application,Distributed Generation & Alternative Energy Journal,,,999–1026-999–1026,2022,\nPandey, Yudhishthir; Hasan, Naimul; Husain, Mohammed Aslam; Khan, Ahmad Neyaz; Bakhsh, Farhad Ilahi; Minai, Ahmad Faiz; Tabrez, Md; ,An Environment Friendly Energy-Saving Dispatch Using Mixed Integer Linear Programming Relaxation in the Smart Grid with Renewable Energy Sources,Distributed Generation & Alternative Energy Journal,,,1239–1258-1239–1258,2022,\nTabrez, Md; Bakhsh, Farhad Ilahi; Husain, Mohammad Aslam; Singh, S.P.; Iqbal, Atif; Sadhu, Pradip Kumar; ,A Novel three-phase to seven-phase transformer,,,,,2021,"AU Patent 2,021,106,022"\nKumar, Dileep; Choudhary, Surya Deo; Tabrez, Md; Ayob, Afida; Hossain Lipu, Molla Shahadat; ,Model Antiseptic Control Scheme to Torque Ripple Mitigation for DC-DC Converter-Based BLDC Motor Drives,Energies,15,21,7823,2022,MDPI\nHusain, Mohamed Aslam; Tabrez, Md; Bakhsh, Farhad Ilahi; Nat, Aslam; Mahmood, Farhad Muhsin; ,Simulation and experimental study of power flow in a seven‐phase transformer under fault conditions,"IET Generation, Transmission & Distribution",,,,2022,`
  },
  {
    id: 'eee-rashmi',
    name: 'RASHMI PRIYA',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8271318904',
    email: 'rashmipriya.mce@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/rashmi-priya/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192510/faculty/eee-rashmi.jpg',
    qualifications: `PhD in Electrical Engineering (Pursuing )\nM.Tech in Power System\nB.Tech in Electrical and Electronics Engineering`,
    subjectExpertise: `Power System\nUtilization of Electric Power\nPersonnel Management and Industrial Relation\nDigital Electronics\nBasic Electrical Engineering`,
    professionalExperience: `3 Years in M.I.T Muzaffarpur as a Guest Assistant Professor.`,
    areaOfResearch: `Distributed Generation\nSmart Grid\nRenewable Energy`
  },
  {
    id: 'eee-ranjeet',
    name: 'RANJEET KUMAR',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '9399468728',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ranjeet-kumar/',
  },
  {
    id: 'eee-dileep',
    name: 'Dr. Dileep Kumar',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '6350459590',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-dileep-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192514/faculty/eee-dileep.png',
    qualifications: `Ph.D. in Power Electronics and Drives from MNIT Jaipur\nM.Tech. in Power Electronics and Drives from MNIT Jaipur\nB.Tech. in Electrical Engineering from RTU Kota`,
    subjectExpertise: `Power Electronics, Machines, Analog and Digital, Control System, Power System, Measurement`,
    areaOfResearch: `Power Electronics, Machine, Renewable Energy Sources`,
    publications: `1. D. Kumar and R. A. Gupta, “A Comprehensive Review on BLDC Motor and Its Control,” International Journal of Power Electronics, InderScience. https://doi.org/10.1504/IJPELEC.2021.117523\n2. D. Kumar, H. P. Tiwari and R. A. Gupta, “Mitigation of Commutation Current Ripple in the BLDC Motor Drive Based on DC-DC Converter using PR Compensator,” International Journal of Emerging Electric Power Systems (IJEEPS) Vol. 20, no. 6, pp. 1-20, 2019. DOI: https://doi.org/10.1515/ijeeps-2019-0069.\n3. D. Kumar, H. P. Tiwari and R. A. Gupta, “A Novel High Voltage Gain SEPIC Converter Based on Hybrid Split-Inductor for Renewable Application,” IETE Journal of Research, Taylor & Francis, May 2020. DOI.org/10.1080/03772063.2020.1768904.\n4. D. Kumar, H. P. Tiwari and R. A. Gupta, “Front-End Zeta Converter Based BLDCM Drive for Efficient Reduction of Commutation Current Ripple Using Notch-Filter,” International Transactions on Electrical Energy Systems, Wiley, May 2020, DOI: 10.1002/2050-7038.12508.\n5. D. Kumar, R. A. Gupta and N. Gupta, “Modeling and simulation of four switch three-phase BLDC motor using anti-windup PI controller,” Innovations in Power and Advanced Computing Technologies (I-PACT), pp. 1-6, April 2017.\n6. D. Kumar, R. A. Gupta and N. Gupta, “Minimization of current ripple and overshoot in four switch three-phase inverter fed BLDC motor using tracking anti-windup PI controller,” IEEE International Conference on Signal Processing, Informatics, Communication and Energy Systems (SPICES), pp. 1-6, Aug. 2017.\n7. D. Kumar and R. A. Gupta, “ Mitigation of Torque Ripple in BLDC Motor using Modified SEPIC Converter,” 8th IEEE India International Conference on Power Electronics (IICPE), pp. 1-6, Dec. 2018.\n8. D. Kumar, H. P. Tiwari and R. A. Gupta, “ Elimination of Current Ripple in the BLDC Motor Drives Based on SEPIC Converter using PR-Compensator,” IEEE International Conference on Power Electronics, Smart Grid and Renewable Energy (PESGRE), pp. 1-6, Jan. 2020.`
  },
  {
    id: 'eee-deobarat',
    name: 'Deobarat Kumar Chandan',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8789446961',
    email: 'deobaratkumarchandan123@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/deobarat-kumar-chandan/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192516/faculty/eee-deobarat.jpg',
    qualifications: `M.tech- N.I.T Hamirpur,Himachal Pradesh`,
    subjectExpertise: `Signal System, Control system,Power electronics`,
    professionalExperience: `Three years work experience as assistant professor in G.E.C Sheohar.`,
    areaOfResearch: `Facial emotion recognition, detection of voltage and frequency at bus due to synchrozation failure, Non linear control system`
  },
  {
    id: 'eee-ekrama',
    name: 'Md. Ekrama Arshad',
    department: 'eee',
    designation: 'Assistant Professor',
    phone: '8130878502',
    email: 'mdekramaarshad@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/md-ekrama-arshad/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192517/faculty/eee-ekrama.jpg',
    qualifications: `B. Tech. in Electrical Engineering from Jamia Millia Islamia, New Delhi\nM. Tech. in Electrical Power System Management from Jamia Millia Islamia, New Delhi\nPh.D. (pursuing) from National Institute of Technology, Patna`,
    subjectExpertise: `Electrical Machines\nPower Electronics\nElectrical Drives\nPower System\nElectrical Circuit Analysis\nBasic Electrical Engineering`,
    areaOfResearch: `Multilevel Inverters\nSolid State Transformers`
  },

  // ─── MECHANICAL ENGINEERING (9 Members) ───
  {
    id: 'mech-satish',
    name: 'SATISH KUMAR JHA',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '9931420386',
    email: 'satish.kumar.jha58@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/satish-kumar-jha/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192519/faculty/mech-satish.jpg',
    qualifications: `M.Sc (Thermal Engineering)\nB.Tech (Mechanical Engineering)`,
    subjectExpertise: `Thermal Engineering,`,
    areaOfResearch: `Heat and Mass Transfer`
  },
  {
    id: 'mech-ashutosh',
    name: 'ASHUTOSH KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '6201451158',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ashutosh-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192521/faculty/mech-ashutosh.jpg',
    qualifications: `Ph.D (Pursuing), NIT Patna\nM.Tech, NIT Nagpur\nB.Tech (Mechanical Engineering)`,
    subjectExpertise: `Operation Research\nProduction Technology\nMachine Tool & Machinery\nIndustrial Economics & Accountancy\nWorkshop Technology\nHeat and Mass Transfer\nRefrigeration and Air Conditioning`,
    professionalExperience: `4 Year of Teaching Experience at UG(B.Tech) & PG(M.Tech) level`,
    areaOfResearch: `Composite Materials, PRODUCTION AND INDUSTRIAL ENGINEERING, ERGONOMICS, TIME AND MOTION STUDY, OPERATION RESEARCH`,
    publications: `Evaluation of Alternate Material for Lathe Bed, International Journal of Futuristic Trends in Engineering and Technology ISSN: 2348-5264 (Print), ISSN: 2348-4071 (Online)\nProductivity Improvement of Manufacturing Process of Diesel Engine by Time and Motion Study Method (M.O.S.T. Technique), International Journal of Advance Engineering and Research Development Volume 2, Issue 6, June -2015\nA Review on Improvement of Workflow and Productivity through Application of Time and Motion Study Technique, IJSRD - International Journal for Scientific Research & Development| Vol. 2, Issue 10, 2014 | ISSN (online): 2321-0613\n2023 Experimental Study of Solar Air Heater Equipped with Longitudinal Fins aiming Thermal Performance Improvement, International Journal of Engineering Trends and Technology 2023 | Journal article DOI: 10.14445/22315381/IJETT-V71I2P233 EID: 2-s2.0-85149341751 Part of ISSN: 22315381 23490918 CONTRIBUTORS: Kumar, B.; Kumar, A.; Kumar, S.R.; Kumar, R.; Chandal, C.S.S.; Singh, S.K.; Kumar, M.\n2023 Finite Element Modelling of Corroded RC Flexural Elements, International Journal of Engineering Trends and Technology Volume 71 Issue 4, 462-473, April 2023 ISSN: 2231–5381 / https://doi.org/10.14445/22315381/IJETT-V71I4P239\n2024 Numerical and experimental investigation of heat transfer of longitudinal fin with varying pitch length in flat plate solar air heater, Proc IMechE Part E: J Process Mechanical Engineering 1–10`
  },
  {
    id: 'mech-shailesh',
    name: 'Dr. SHAILESH RANJAN KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '7979094103',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/shailesh-ranjankumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192522/faculty/mech-shailesh.jpg',
    qualifications: `M.Tech. (Thermal Sciences, Distinction)\nPh.D. (pursuing)`,
    subjectExpertise: `Heat Transfer\nClassical Thermodynamics\nRefrigeration and Air-Conditioning`,
    professionalExperience: `Assistant Professor at N.I.T.s and Govt. of Uttarakhand owned Autonomous Institute.`,
    areaOfResearch: `Microchannel Heat Exchanger\nConvective heat transfer`
  },
  {
    id: 'mech-ravi',
    name: 'Dr. RAVI KUMAR',
    department: 'mechanical',
    designation: 'HOD (ME) & Assistant Professor',
    phone: '7979098267',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ravi-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192525/faculty/mech-ravi.jpg',
    isHod: true,
    qualifications: `M.Tech Engineerig Material , MANIT BHOPAL\nP.hd. From N.I.T Patna`,
    subjectExpertise: `Additive Manufacturing\nMANUFACTURING PROCESSES\nEngineering Materials`,
    professionalExperience: `2014-2017 , work at Military Engineering Service OTA Gaya\n2018 Onward , Assistant professor , Motihari College of Engineering , Motihari`,
    areaOfResearch: `3-D Printing or Additive manufacturing application in the medical field.\nRecycling of PV solar panel`,
    publications: `Microstructural analysis, micro hardness and tensile strength of silicon carbide and zirconium silicate dual reinforced particle ADC-12 alloy composite SK Patel, R Kumar, R Nateriya Int J Appl Sci Eng Res 3 (3), 723-733\nDesign, Applications, and Challenges of 3D-Printed Custom Orthotics Aids: A Review January 2022 DOI: 10.1007/978-3-030-73495-4_22 In book: Proceedings of the International Conference on Industrial and Manufacturing Systems (CIMS-2020)\n3D-Printed Orthosis: A Review on Design Process and Material Selection for Fused Deposition Modeling Process June 2021 DOI: 10.1007/978-981-16-0909-1_55 In book: Advances in Materials Processing and Manufacturing Applications\nOn the enhanced mechanical characteristics of 3D printed architected spiderweb lattice structures through overall density variation Engineering Research Express 2023-09-01 | Journal article DOI: 10.1088/2631-8695/acf981 Part of ISSN: 2631-8695 Contributors: Ravi Kumar; Saroj Kumar Sarangi\n3D Printed customized diabetic foot insoles with architecture designed lattice structures – a case study Biomedical Physics & Engineering Express 2024-01-01 | Journal article DOI: 10.1088/2057-1976/ad1732 Part of ISSN: 2057-1976 Contributors: Ravi Kumar; Saroj Kumar Sarangi\nExperimental Study of Solar Air Heater Equipped with Longitudinal Fins aiming Thermal Performance Improvement International Journal of Engineering Trends and Technology 2023-02-28 | Journal article DOI: 10.14445/22315381/ijett-v71i2p233 Part of ISSN: 2231-5381 Contributors: Birendra Kumar; Ashutosh Kumar; Shailesh Ranjan Kumar; Ravi Kumar; Chandra Shekhar Singh Chandal; Saket Kumar Singh; Manoj Kumar\nNumerical and experimental investigation of heat transfer of longitudinal fin with varying pitch length in flat plate solar air heater. Proceedings of the Institution of Mechanical Engineers Part E Journal of Process Mechanical Engineering`
  },
  {
    id: 'mech-birendra',
    name: 'Dr. BIRENDRA KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '7667803303',
    email: 'bk.11pg010@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/birendra-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192527/faculty/mech-birendra.jpg',
    qualifications: `Ph.D. IIT(ISM), Dhanbad\nM.Tech (Machine Design)\nB.Tech (Mechanical Engineering)`,
    subjectExpertise: `Machine design, Workshop Manufacturing Practice, Engineering Mechanics, Mechanics of Solid, Nonconventional Energy Resources and Machine Design.`,
    professionalExperience: `7 Years of Teaching Experience at the UG(B.Tech) level`,
    areaOfResearch: `Renewable Energy, Machine Design, Hydraulic Dynamics`,
    publications: `1. Birendra Kumar, R. K. Nayak and S. N. Singh, 2018 “Experimental Analysis of the Thermo-Hydraulic Performance on a Cylindrical Parabolic Concentrating Solar Water Heater with Twisted Tape Inserts in an Absorber Tube” Zeitschrift für Naturforschung A ZNA A Journal of Physical Sciences, SCI ), Vol.73(5), 431-439.\n2. Amit Kumar Bhakta, Birendra Kumar and S. N. 2016 “Investigation on the Performance of a Cylindrical Parabolic Concentrating Solar Water Heater” Indian Journal of Science and Technology, SCOPUS ,Vol 9(48)\n3. Birendra Kumar, Ashutosh Kumar, Shailesh Ranjan Kumar, Ravi Kumar, Chandra Shekhar Singh Chandal, Saket Kumar Singh, and Manoj Kumar, Experimental Study of Solar Air Heater Equipped with Longitudinal Fins aiming Thermal Performance improvement, Volume 71 Issue 2, 315 322, February, 2023, SCOPUS https://doi.org/10.14445/22315381/IJETT-V71I2P233.\n4. Birendra Kumar and Mohd Ateeque "An Analytical Results Based on Solar Water Heater Geser" NeuroQuantology, Volume 18(6): 89-95, Scopus, DOI Number: 10.48047/nq.2020.18.6.NQ20188\n5. Mohd Ateeque and Birendra Kumar " Mechanical Footstep Power Generation: Design and Fabrication" NeuroQuantology, Volume 19(12): 672-677, Scopus, DOI Number: 10.48047/nq.2021.19.12.NQ211268\n6. Birendra Kumar et al. " The Effect of Welding Parameters in Micro Plasma Arc Welding of Titanium Thin Sheets" Tuijin Jishu/Journal of Propulsion Technology, SCOPUS, Vol. 44 No. 6 (2023), ISSN: 1001-4055, doi.org/10.52783/tjjpt.v44.i6.3808\n7. Birendra et al. " The Effect of Welding Parameters in Micro Plasma arc Welding of Stainless Steel 304 Thin Sheets" Tuijin Jishu/Journal of Propulsion Technology, SCOPUS , Vol.45 No. 1 (2024), doi.org/10.52783/tjjpt.v45.i01.3944\n8. Birendra et al.'' Numerical and experimental investigation of heat transfer of longitudinal fin with varying pitch length in flat plate solar air heater'' (SCI) DOI: 10.1177/09544089241288070, Proc IMechE Part E: J Process Mechanical Engineering`
  },
  {
    id: 'mech-amit',
    name: 'AMIT KUMAR',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '8407819966',
    email: 'tiwaryamit25@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/184533/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192528/faculty/mech-amit.jpg',
    qualifications: `M.TECH.(IIT Patna)\nB.TECH. (Guru Ghasidas Vishwavidyalaya, Bilaspur)`,
    subjectExpertise: `Materials Science, Composite Material`,
    professionalExperience: `Assistant Professor ( Mechanical Engineering) from 18th sep 2018 to 31st March 2023 in M.I.T Muzaffarpur`,
    publications: `Design of a New Curve-Shaped Fin and Natural Convection Analysis Using CFD 2023 | Book chapter DOI: 10.1007/978-981-19-3410-0_9 CONTRIBUTORS: Md Quamar Alam; Amit Kumar; Md Zishanur Rahman`
  },
  {
    id: 'mech-ashfaque',
    name: 'ASHFAQUE AHMAD',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '7070338765',
    email: 'ashfaqmce@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ashafque-ahmad/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192529/faculty/mech-ashfaque.jpg',
    qualifications: `M-Tech(Thermal engineering) Jamia Millia Islamia,New Delhi.`,
    subjectExpertise: `Thermodynamics, HMT,RAC,Fluid Mechanics,Fluid Machinery.`
  },
  {
    id: 'mech-azeem',
    name: 'AZEEM ALAM',
    department: 'mechanical',
    designation: 'Assistant Professor',
    phone: '8505996303',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/azeem-alam/',
  },
  {
    id: 'mech-navneet',
    name: 'Prof. (Dr.) Navneet Kumar',
    department: 'mechanical',
    designation: 'Principal Incharge & Professor',
    phone: '9431425123',
    email: 'mcemotihari4@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/prof-dr-navneet-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192537/faculty/mech-navneet.png'
  },

  // ─── HUMANITIES & SCIENCES (8 Members) ───
  {
    id: 'hum-abhay',
    name: 'Dr. Abhay Kumar Jha',
    department: 'humanities',
    designation: 'Assistant Professor & Ex-Principal',
    phone: '9431811171',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/prof-dr-abhay-kumar-jha/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192537/faculty/hum-abhay.png',
    qualifications: `Ph.D (Mathematics)\nNET JRF`,
    subjectExpertise: `Fluid Dynamics`,
    professionalExperience: `20 Year Teaching Experience`,
    areaOfResearch: `Fluid Dynamics`,
    publications: `Total Publication - 42 International-32 National -11`
  },
  {
    id: 'hum-aditya',
    name: 'Dr. Aditya Kumar Singh',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '6201403672',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-aditya-kumar-singh-2/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192539/faculty/hum-aditya.jpg',
    qualifications: `Ph. D, Birla Institute of Technology, Mesra, Ranchi`,
    subjectExpertise: `Engineering Mathematics for all semester`,
    professionalExperience: `Fourteen years of teaching in Engineering College`,
    areaOfResearch: `Mathematical Modelling and Simulation on Cyber Attack and Defense`,
    publications: `Supervised one Ph. D student of Ranchi University, Ranchi, 12 international publications`
  },
  {
    id: 'hum-puja',
    name: 'Dr. Puja Priyadarshini',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9386354774',
    email: 'pujapriya@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-puja-priyadarshini/',
  },
  {
    id: 'hum-sumeet',
    name: 'Dr. Sumeet Kumar',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9140929941',
    email: 'sumeet92.dstte@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-sumeet-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192544/faculty/hum-sumeet.jpg',
    qualifications: `PhD (University of Lucknow), M.Sc. (IIT Madras), NET+JRF, SRF, GATE, IIT JAM`,
    subjectExpertise: `Pure and Applied Mathematics`,
    professionalExperience: `M. S. College Motihari, Dr. S. K. S. Women's College Motihari`,
    areaOfResearch: `Differential Geometry of Manifolds (Riemannian and semi-Riemannian geometry)`
  },
  {
    id: 'hum-ramsingh',
    name: 'Ramsingh Yadav',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '6388443376',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/ramsingh-yadav/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192546/faculty/hum-ramsingh.png',
    qualifications: `1) M.Sc in Mathematics & Scientific Computing from MNNIT ALLAHABAD 2) CSIR- NET`,
    subjectExpertise: `Real Analysis, Linear & Abstract Algebra`
  },
  {
    id: 'hum-ashish',
    name: 'Ashish Kumar',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9716646727',
    email: 'ashishkumariitd99@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/mr-ashish-kumar/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192548/faculty/hum-ashish.jpg',
    qualifications: `M.Sc. in Mathematics (IIT Delhi), NET+JRF and GATE ,two times Qualified B.Sc. in Mathematics (University Of Delhi)\nHindustan Coaching Scholarship Holder`,
    subjectExpertise: `Pure and Applied Mathematics`,
    professionalExperience: `1.Worked as an Assistant Professor at Kalindi College, University of Delhi\n2.Worked as an Assistant Professor at M.S.College ,Motihari\n3.Worked as an Assistant Professor at R.N. College, Hajipur\n4.Worked as an Assistant Professor at R.L.S.Y. College, Bettiah`
  },
  {
    id: 'hum-santosh',
    name: 'Dr. Santosh Upadhyay',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9934012256',
    email: 'santopadhyay20@gmail.com',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-santosh-upadhay/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192549/faculty/hum-santosh.jpg',
    qualifications: `Ph.D`
  },
  {
    id: 'hum-alokita',
    name: 'Dr. Alokita Kashyap',
    department: 'humanities',
    designation: 'Assistant Professor',
    phone: '9471624926',
    email: 'alokita@bihar.gov.in',
    profileUrl: 'https://www.mcemotihari.ac.in/faculty/dr-alokita-kashyap/',
    imageUrl: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto,w_400,h_400,c_fill/v1781192551/faculty/hum-alokita.png',
    qualifications: `M.Sc, Patna University, Patna\nB.Ed, St Xavier's College of Education, Patna\nPh.D, Patna University, Patna`,
    subjectExpertise: `Organic Chemistry`,
    professionalExperience: `10 Years of Teaching Experience at Government Inter College\n2 Years of Teaching Experience as Guest Faculty at Patna Women's College, Patna`,
    areaOfResearch: `Organic & Medicinal Chemistry`,
    publications: `10 research papers published in Journals of National and International repute.`
  }
];

export const getFacultyForDepartment = (deptId: string): Faculty[] => {
  return FACULTY_DATA.filter(
    (fac) =>
      fac.department === deptId ||
      (fac.sharedDepartments && fac.sharedDepartments.includes(deptId))
  );
};
