export const DOMAIN_CONFIG = {
  fees: {
    id: 'fees',
    label: 'Fees & Finance',
    department: 'The Fees Department',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    icon: 'DollarSign',
  },
  examination: {
    id: 'examination',
    label: 'Examination & Academics',
    department: 'The Examination Department',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    icon: 'GraduationCap',
  },
  it: {
    id: 'it',
    label: 'IT & Tech Support',
    department: 'The IT Department',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    icon: 'Laptop',
  },
  facilities: {
    id: 'facilities',
    label: 'Estate & Facilities',
    department: 'Estate & Facilities',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    icon: 'Building2',
  },
  career_services: {
    id: 'career_services',
    label: 'Career & Placements',
    department: 'The Placement Cell',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    icon: 'Briefcase',
  },
  general: {
    id: 'general',
    label: 'Campus Assistant',
    department: 'Campus Support',
    color: '#475569',
    bgColor: '#f8fafc',
    borderColor: '#e2e8f0',
    icon: 'HelpCircle',
  },
};

export function getDomainConfig(domain) {
  if (!domain) return DOMAIN_CONFIG.general;
  const key = String(domain).toLowerCase().trim().replace(/[\s&-]+/g, '_');
  if (DOMAIN_CONFIG[key]) return DOMAIN_CONFIG[key];
  if (key.includes('fee')) return DOMAIN_CONFIG.fees;
  if (key.includes('exam') || key.includes('academic')) return DOMAIN_CONFIG.examination;
  if (key.includes('it') || key.includes('tech') || key.includes('wifi')) return DOMAIN_CONFIG.it;
  if (key.includes('facilit') || key.includes('hostel') || key.includes('housing')) return DOMAIN_CONFIG.facilities;
  if (key.includes('career') || key.includes('place')) return DOMAIN_CONFIG.career_services;
  return DOMAIN_CONFIG.general;
}

export const QUICK_SUGGESTIONS = [
  'How do I pay my semester tuition fees?',
  'Where can I download my examination hall ticket?',
  'Wi-Fi connection is not working in the hostel',
  'How do I register for campus placement drives?',
  'What is the procedure for hostel room allotment?',
];
