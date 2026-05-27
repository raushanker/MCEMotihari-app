export interface Holiday {
  id: number;
  title: string;
  titleEn: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  day: string;
  category: 'National' | 'Festival' | 'Religious' | 'Academic' | 'Vacation';
  duration: string;
  description: string;
  isVacation: boolean;
  isImportant: boolean;
}

export const HOLIDAYS_DATA: Holiday[] = [
  {
    id: 1,
    title: 'नववर्ष आरम्भ',
    titleEn: 'New Year Day',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    day: 'गुरुवार',
    category: 'Academic',
    duration: '01 Day',
    description: 'Beginning of the new calendar year 2026. Academic recess day.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 2,
    title: 'मकर संक्रांति',
    titleEn: 'Makar Sankranti',
    startDate: '2026-01-14',
    endDate: '2026-01-14',
    day: 'बुधवार',
    category: 'Festival',
    duration: '01 Day',
    description: 'Traditional harvest festival marking the transit of the sun into Capricorn.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 3,
    title: 'बसंत पंचमी / सरस्वती पूजा',
    titleEn: 'Basant Panchami / Saraswati Puja',
    startDate: '2026-01-23',
    endDate: '2026-01-23',
    day: 'शुक्रवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Worship of Goddess Saraswati, the deity of knowledge, music, arts and science. Major campus celebration.',
    isVacation: false,
    isImportant: true
  },
  {
    id: 4,
    title: 'गणतंत्र दिवस',
    titleEn: 'Republic Day',
    startDate: '2026-01-26',
    endDate: '2026-01-26',
    day: 'सोमवार',
    category: 'National',
    duration: '01 Day',
    description: 'National holiday celebrating the date on which the Constitution of India came into effect.',
    isVacation: false,
    isImportant: true
  },
  {
    id: 5,
    title: 'संत रविदास जयंती',
    titleEn: 'Sant Ravidas Jayanti',
    startDate: '2026-02-01',
    endDate: '2026-02-01',
    day: 'रविवार',
    category: 'Religious',
    duration: 'Sunday Recess',
    description: 'Birth anniversary of Guru Ravidas, notable Bhakti movement philosopher.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 6,
    title: 'शब-ए-बरात',
    titleEn: 'Shab-e-Barat',
    startDate: '2026-02-04',
    endDate: '2026-02-04',
    day: 'बुधवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Night of Fortune and Forgiveness. Observance in Islamic communities.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 7,
    title: 'महाशिवरात्रि',
    titleEn: 'Mahashivratri',
    startDate: '2026-02-15',
    endDate: '2026-02-15',
    day: 'रविवार',
    category: 'Religious',
    duration: 'Sunday Recess',
    description: 'Great night of Shiva, observed with prayers, fasting, and meditation.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 8,
    title: 'होलिकादहन / होली',
    titleEn: 'Holi Break',
    startDate: '2026-03-02',
    endDate: '2026-03-04',
    day: 'सोमवार से बुधवार',
    category: 'Festival',
    duration: '03 Days',
    description: 'Festival of colors, marking the arrival of spring and victory of good over evil.',
    isVacation: true,
    isImportant: true
  },
  {
    id: 9,
    title: 'इद-उल-फितर (ईद)',
    titleEn: 'Eid-ul-Fitr',
    startDate: '2026-03-21',
    endDate: '2026-03-21',
    day: 'शनिवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Festival of breaking the fast, concluding the holy month of Ramadan.',
    isVacation: false,
    isImportant: true
  },
  {
    id: 10,
    title: 'बिहार दिवस',
    titleEn: 'Bihar Diwas',
    startDate: '2026-03-22',
    endDate: '2026-03-22',
    day: 'रविवार',
    category: 'Academic',
    duration: 'Sunday Recess',
    description: 'Day commemorating the formation of the state of Bihar in 1912.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 11,
    title: 'सम्राट अशोक जयंती',
    titleEn: 'Samrat Ashok Jayanti',
    startDate: '2026-03-26',
    endDate: '2026-03-26',
    day: 'गुरुवार',
    category: 'Academic',
    duration: '01 Day',
    description: 'Birth anniversary celebration of Emperor Ashoka the Great.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 12,
    title: 'रामनवमी',
    titleEn: 'Ram Navami',
    startDate: '2026-03-27',
    endDate: '2026-03-27',
    day: 'शुक्रवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Spring Hindu festival celebrating the birth of Lord Rama.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 13,
    title: 'महावीर जयंती',
    titleEn: 'Mahavir Jayanti',
    startDate: '2026-03-31',
    endDate: '2026-03-31',
    day: 'मंगलवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Most important religious holiday for Jains, celebrating the birth of Lord Mahavira.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 14,
    title: 'गुड फ्राइडे',
    titleEn: 'Good Friday',
    startDate: '2026-04-03',
    endDate: '2026-04-03',
    day: 'शुक्रवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Christian holiday commemorating the crucifixion of Jesus Christ and his death at Calvary.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 15,
    title: 'डॉ० भीम राव आंबेडकर जयंती',
    titleEn: 'Dr. B.R. Ambedkar Jayanti',
    startDate: '2026-04-14',
    endDate: '2026-04-14',
    day: 'मंगलवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Birth anniversary of Dr. B. R. Ambedkar, father of the Indian Constitution.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 16,
    title: 'वीर कुँवर सिंह जयंती',
    titleEn: 'Veer Kunwar Singh Jayanti',
    startDate: '2026-04-23',
    endDate: '2026-04-23',
    day: 'गुरुवार',
    category: 'Academic',
    duration: '01 Day',
    description: 'Commemoration of the victories of Veer Kunwar Singh, dynamic leader of 1857 freedom struggle from Bihar.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 17,
    title: 'जानकी नवमी',
    titleEn: 'Janaki Navami',
    startDate: '2026-04-25',
    endDate: '2026-04-25',
    day: 'शनिवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Birth anniversary of Goddess Sita, observed with prayers and fasting.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 18,
    title: 'मई दिवस / श्रम दिवस / बुद्ध पूर्णिमा',
    titleEn: 'Labour Day / Buddha Purnima',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    day: 'शुक्रवार',
    category: 'Academic',
    duration: '01 Day',
    description: 'International Workers Day and celebration of the birth and enlightenment of Gautama Buddha.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 19,
    title: 'इद-उल-जोहा (बकरीद)',
    titleEn: 'Eid-ul-Adha (Bakrid)',
    startDate: '2026-05-28',
    endDate: '2026-05-28',
    day: 'गुरुवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Islamic festival of sacrifice, commemorating the willingness of Ibrahim to sacrifice his son.',
    isVacation: false,
    isImportant: true
  },
  {
    id: 20,
    title: 'ग्रीष्मावकाश / मुहर्रम / कबीर जयंती',
    titleEn: 'Summer Vacation Break',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    day: 'सोमवार से मंगलवार',
    category: 'Vacation',
    duration: '30 Days',
    description: 'Official academic summer recess recess for teachers and resident campus engineering students.',
    isVacation: true,
    isImportant: true
  },
  {
    id: 21,
    title: 'चेहल्लुम',
    titleEn: 'Chehallum',
    startDate: '2026-08-04',
    endDate: '2026-08-04',
    day: 'मंगलवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Observance of Arbaeen, forty days after the martyrdom of Imam Hussain.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 22,
    title: 'स्वतंत्रता दिवस',
    titleEn: 'Independence Day',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    day: 'शनिवार',
    category: 'National',
    duration: '01 Day',
    description: 'National holiday commemorating the nation\'s independence from the United Kingdom in 1947.',
    isVacation: false,
    isImportant: true
  },
  {
    id: 23,
    title: 'हजरत मोहम्मद साहब का जन्म दिवस',
    titleEn: 'Prophet Birth (Eid-e-Milad)',
    startDate: '2026-08-26',
    endDate: '2026-08-26',
    day: 'बुधवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Observance of the birth anniversary of Islamic Prophet Muhammad.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 24,
    title: 'रक्षाबंधन',
    titleEn: 'Raksha Bandhan',
    startDate: '2026-08-28',
    endDate: '2026-08-28',
    day: 'शुक्रवार',
    category: 'Festival',
    duration: '01 Day',
    description: 'Traditional Hindu festival celebrating the sacred bond between brothers and sisters.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 25,
    title: 'श्री कृष्ण जन्माष्टमी',
    titleEn: 'Shri Krishna Janmashtami',
    startDate: '2026-09-04',
    endDate: '2026-09-04',
    day: 'शुक्रवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Hindu festival celebrating the birth anniversary of Lord Krishna.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 26,
    title: 'महात्मा गाँधी जयंती',
    titleEn: 'Gandhi Jayanti',
    startDate: '2026-10-02',
    endDate: '2026-10-02',
    day: 'शुक्रवार',
    category: 'National',
    duration: '01 Day',
    description: 'National holiday marking the birth anniversary of Mahatma Gandhi, Father of the Nation.',
    isVacation: false,
    isImportant: true
  },
  {
    id: 27,
    title: 'दुर्गा पूजा',
    titleEn: 'Durga Puja Break',
    startDate: '2026-10-17',
    endDate: '2026-10-20',
    day: 'शनिवार से मंगलवार',
    category: 'Festival',
    duration: '04 Days',
    description: 'Major regional festival celebrating the victory of Goddess Durga over Mahishasura.',
    isVacation: true,
    isImportant: true
  },
  {
    id: 28,
    title: 'दीपावली / चित्रगुप्त पूजा / भाई दूज एवं छठ पूजा',
    titleEn: 'Diwali & Chhath Puja Recess',
    startDate: '2026-11-08',
    endDate: '2026-11-16',
    day: 'रविवार से सोमवार',
    category: 'Festival',
    duration: '09 Days',
    description: 'Grand festival block including Diwali (festival of lights) and Bihar\'s biggest festival, Chhath Puja.',
    isVacation: true,
    isImportant: true
  },
  {
    id: 29,
    title: 'गुरुनानक जयंती / कार्तिक पूर्णिमा',
    titleEn: 'Guru Nanak Jayanti',
    startDate: '2026-11-24',
    endDate: '2026-11-24',
    day: 'मंगलवार',
    category: 'Religious',
    duration: '01 Day',
    description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism, and sacred Kartik Purnima day.',
    isVacation: false,
    isImportant: false
  },
  {
    id: 30,
    title: 'क्रिसमस / शीतकालीन अवकाश',
    titleEn: 'Christmas & Winter Break',
    startDate: '2026-12-25',
    endDate: '2026-12-31',
    day: 'शुक्रवार से गुरुवार',
    category: 'Vacation',
    duration: '07 Days',
    description: 'Winter break starting on Christmas Day and extending till the end of the academic calendar year.',
    isVacation: true,
    isImportant: true
  }
];

export function getHolidayStatus(holiday: Holiday, currentDateStr: string = '2026-05-24'): 'past' | 'ongoing' | 'upcoming' {
  const current = new Date(currentDateStr);
  const start = new Date(holiday.startDate);
  const end = new Date(holiday.endDate);
  
  current.setHours(0,0,0,0);
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

  if (current.getTime() > end.getTime()) {
    return 'past';
  } else if (current.getTime() >= start.getTime() && current.getTime() <= end.getTime()) {
    return 'ongoing';
  } else {
    return 'upcoming';
  }
}

export function getDaysUntilHoliday(holiday: Holiday, currentDateStr: string = '2026-05-24'): number {
  const current = new Date(currentDateStr);
  const start = new Date(holiday.startDate);
  
  current.setHours(0,0,0,0);
  start.setHours(0,0,0,0);

  const diffTime = start.getTime() - current.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
