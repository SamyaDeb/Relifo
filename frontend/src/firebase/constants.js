export const SUPER_ADMIN_ADDRESS = import.meta.env.VITE_SUPER_ADMIN_ADDRESS;
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Relifo';

export const ROLES = {
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  BENEFICIARY: 'beneficiary',
  DONOR: 'donor',
  MERCHANT: 'merchant'
};

export const USER_ROLES = ROLES; // Alias for backwards compatibility

export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const VERIFICATION_STATUS = USER_STATUS; // Alias for backwards compatibility

export const CAMPAIGN_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CLOSED: 'closed'
};

export const DISASTER_TYPES = {
  FLOOD: 'flood',
  EARTHQUAKE: 'earthquake',
  CYCLONE: 'cyclone',
  FIRE: 'fire',
  LANDSLIDE: 'landslide',
  OTHER: 'other'
};

export const MERCHANT_CATEGORIES = {
  FOOD: 'Food',
  MEDICINE: 'Medicine',
  SHELTER: 'Shelter Materials',
  CLOTHING: 'Clothing',
  EDUCATION: 'Education Supplies',
  WATER: 'Clean Water',
  HYGIENE: 'Hygiene Products',
  OTHER: 'Other Essentials'
};
