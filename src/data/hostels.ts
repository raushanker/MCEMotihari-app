export interface FacilityInfo {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface Hostel {
  id: string;
  name: string;
  type: 'Boys' | 'Girls';
  capacity: string;
  availableSeats: string;
  image: any;
  description: string;
  facilities: string[];
  features: string[];
  rules: string[];
  messTimings: string;
  wardenName: string;
  wardenPhone: string;
}

export const FACILITIES_DICTIONARY: Record<string, FacilityInfo> = {
  gym: { id: 'gym', title: 'Separate Gym', subtitle: 'Modern workout machines', icon: 'barbell-outline' },
  green_campus: { id: 'green_campus', title: 'Green Campus', subtitle: 'Eco-friendly lush lawns', icon: 'leaf-outline' },
  volleyball: { id: 'volleyball', title: 'Volleyball Court', subtitle: 'Outdoor sports arena', icon: 'football-outline' },
  wifi: { id: 'wifi', title: 'High-Speed Wi-Fi', subtitle: '24/7 campus-wide access', icon: 'wifi-outline' },
  mess: { id: 'mess', title: 'Mess Facility', subtitle: 'Hygienic vegetarian meals', icon: 'restaurant-outline' },
  security_24x7: { id: 'security_24x7', title: '24x7 Security', subtitle: 'Guarded gate access', icon: 'shield-checkmark-outline' },
  cctv: { id: 'cctv', title: 'CCTV Surveillance', subtitle: 'Continuous hallway monitoring', icon: 'videocam-outline' },
  maintenance: { id: 'maintenance', title: 'Maintenance Staff', subtitle: 'On-call electric & plumbing', icon: 'build-outline' },
  ro_water: { id: 'ro_water', title: 'RO Drinking Water', subtitle: 'Purified mineral water plants', icon: 'water-outline' },
  power_backup: { id: 'power_backup', title: 'Power Backup', subtitle: 'High capacity generator setups', icon: 'flash-outline' },
  clean_washrooms: { id: 'clean_washrooms', title: 'Clean Washrooms', subtitle: 'Daily deep-sanitation rounds', icon: 'sparkles-outline' },
  study_env: { id: 'study_env', title: 'Study Environment', subtitle: 'Dedicated silent study rooms', icon: 'book-outline' },
  parking: { id: 'parking', title: 'Parking Area', subtitle: 'Covered spots for bicycles', icon: 'car-outline' },
  common_area: { id: 'common_area', title: 'Common Area', subtitle: 'TV, carrom, and chess rooms', icon: 'tv-outline' },
  laundry: { id: 'laundry', title: 'Laundry Support', subtitle: 'Washing machines access', icon: 'shirt-outline' },
  night_security: { id: 'night_security', title: 'Night Security', subtitle: 'Active night patrolling guards', icon: 'moon-outline' },
  connectivity: { id: 'connectivity', title: 'Campus Connectivity', subtitle: '5 mins walk to academic blocks', icon: 'git-network-outline' },
  lift: { id: 'lift', title: 'Elevator/Lift', subtitle: 'High capacity passenger lift', icon: 'chevron-up-circle-outline' },
  badminton: { id: 'badminton', title: 'Badminton Court', subtitle: 'Standard playing court', icon: 'fitness-outline' },
  guest_room: { id: 'guest_room', title: 'Guest Rooms', subtitle: 'Comfortable housing for visitors', icon: 'business-outline' },
};

export const HOSTELS_DATA: Hostel[] = [
  {
    id: 'obh',
    name: 'Old Boys Hostel (OBH)',
    type: 'Boys',
    capacity: '100 Bed',
    availableSeats: 'Few Seats Left',
    image: require('../../assets/images/OBH.jpg'),
    description: 'OBH stands as the legacy housing structure at MCE Motihari campus, delivering comfortable and secure accommodations for engineering students. Features spacious layouts, immediate proximity to academic departments, and rich campus living heritage.',
    facilities: ['wifi', 'mess', 'security_24x7', 'ro_water', 'clean_washrooms', 'power_backup', 'connectivity', 'parking', 'maintenance'],
    features: ['Legacy Campus', 'Student Friendly', 'Wi-Fi Enabled', 'Mess Hall', '24x7 Security'],
    rules: [
      'In-time for residents is strictly 8:00 PM.',
      'Visitors are allowed only in the common area with prior warden permission.',
      'Ragging is strictly prohibited and legally punishable.',
      'Electric appliances like heaters or induction stoves are not permitted inside rooms.'
    ],
    messTimings: 'Breakfast: 8:00 AM - 9:30 AM | Lunch: 1:00 PM - 2:30 PM | Dinner: 8:00 PM - 9:30 PM',
    wardenName: '',
    wardenPhone: ''
  },
  {
    id: 'nbh',
    name: 'New Boys Hostel (NBH)',
    type: 'Boys',
    capacity: '90+ Bed',
    availableSeats: 'Admission Open',
    image: require('../../assets/images/NBH.webp'),
    description: 'NBH features modern, double-sharing study rooms overlooking green open spaces. Equipped with high-speed internet backbones, modern washrooms, and comprehensive recreational common areas for holistic peer learning.',
    facilities: ['wifi', 'mess', 'security_24x7', 'ro_water', 'clean_washrooms', 'power_backup', 'connectivity', 'study_env', 'common_area', 'maintenance'],
    features: ['Modern Rooms', 'Student Focused', 'Lush Greenery', '24x7 Security', 'Common TV Room'],
    rules: [
      'Night attendance is taken at 8:30 PM daily.',
      'Cleanliness of rooms must be maintained by the occupants.',
      'Prior written approval is needed to leave the campus after college hours.',
      'Quiet hours are enforced from 10:00 PM to 6:00 AM.'
    ],
    messTimings: 'Breakfast: 7:30 AM - 9:00 AM | Lunch: 1:30 PM - 2:30 PM | Dinner: 8:15 PM - 9:30 PM',
    wardenName: '',
    wardenPhone: ''
  },
  {
    id: 'nnbh',
    name: 'Vikram Sarabhai Boys Hostel (NNBH)',
    type: 'Boys',
    capacity: '300 Bed + Guest Room',
    availableSeats: 'Booking Open',
    image: require('../../assets/images/NNBH.webp'),
    description: 'Vikram Sarabhai Boys Hostel (NNBH) is a state-of-the-art student accommodation featuring premium living conditions, modern elevator lifts, and comfortable visitor guest rooms. Built with elite infrastructure, it includes high-speed Wi-Fi, a fully-equipped gym, mess facilities, dedicated study environments, a TV common room, standard badminton & volleyball courts, and round-the-clock security surveillance.',
    facilities: ['wifi', 'mess', 'security_24x7', 'ro_water', 'clean_washrooms', 'power_backup', 'connectivity', 'gym', 'volleyball', 'badminton', 'lift', 'guest_room', 'cctv', 'laundry', 'study_env', 'common_area', 'parking', 'maintenance', 'night_security'],
    features: ['Elite Living', 'Elevator/Lift', 'Separate Gym', 'Badminton & Volleyball', 'Guest Rooms', 'CCTV Secured'],
    rules: [
      'Campus gate locks at 9:00 PM.',
      'Gym usage timings must be strictly followed (5:00 AM - 8:00 AM & 5:00 PM - 8:00 PM).',
      'Cooking inside rooms is strictly prohibited.',
      'Any damage to hostel property will be heavily fined.'
    ],
    messTimings: 'Breakfast: 7:30 AM - 9:00 AM | Lunch: 1:00 PM - 2:30 PM | Dinner: 8:00 PM - 9:30 PM',
    wardenName: '',
    wardenPhone: ''
  },
  {
    id: 'ogh',
    name: 'Old Girls Hostel (OGH)',
    type: 'Girls',
    capacity: '80+ Bed',
    availableSeats: 'Admission Open',
    image: require('../../assets/images/OGH.avif'),
    description: 'OGH provides extremely safe, highly secured, and comfortable student housing for girls at MCE Motihari. Includes continuous multi-layered security gates, internal reading halls, eco-friendly green gardens, and dedicated student support cells.',
    facilities: ['wifi', 'mess', 'security_24x7', 'ro_water', 'clean_washrooms', 'power_backup', 'connectivity', 'study_env', 'night_security', 'maintenance'],
    features: ['Extremely Safe', 'Green Lawns', 'Quiet Study Area', '24x7 Guard Locks'],
    rules: [
      'In-time for residents is strictly 6:30 PM.',
      'Parents/Guardians are allowed to visit on weekends (10:00 AM - 5:00 PM) in visitor lobbies.',
      'Prior warden permission is mandatory for leaving station/campus.',
      'Strict silence hours begin at 9:30 PM.'
    ],
    messTimings: 'Breakfast: 8:00 AM - 9:15 AM | Lunch: 1:15 PM - 2:30 PM | Dinner: 7:30 PM - 9:00 PM',
    wardenName: '',
    wardenPhone: ''
  },
  {
    id: 'ngh',
    name: 'New Girls Hostel (NGH)',
    type: 'Girls',
    capacity: '120+ Bed',
    availableSeats: 'Few Seats Left',
    image: require('../../assets/images/NGH.avif'),
    description: 'NGH offers state-of-the-art modern living amenities for girls, built with high-quality architecture. Features CCTV surveillance, clean individual washrooms, common recreation halls (TV, indoor games), laundry support, on-call maintenance support, and high-speed campus connectivity.',
    facilities: ['wifi', 'mess', 'security_24x7', 'ro_water', 'clean_washrooms', 'power_backup', 'connectivity', 'cctv', 'common_area', 'laundry', 'study_env', 'maintenance', 'night_security'],
    features: ['Modern Amenities', 'Recreational Hall', 'CCTV Secured', 'Laundry Support', 'Safe Environment'],
    rules: [
      'Gate locking attendance is strictly registered at 7:00 PM.',
      'No guest is allowed to stay overnight under any circumstances.',
      'Electronic cooking appliances are forbidden in rooms.',
      'Daily upkeep and sanitization of personal desk space is encouraged.'
    ],
    messTimings: 'Breakfast: 7:45 AM - 9:00 AM | Lunch: 1:00 PM - 2:15 PM | Dinner: 7:45 PM - 9:00 PM',
    wardenName: '',
    wardenPhone: ''
  }
];
