const brand = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  accent: '#FF6D00',
};

export const ExpiryColors = {
  fresh: '#4CAF50',
  expiringSoon: '#FFC107',
  expiringToday: '#FF9800',
  expired: '#F44336',
  frozen: '#2196F3',
};

export default {
  brand,
  light: {
    text: '#1a1a1a',
    textSecondary: '#666666',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    tint: brand.primary,
    tabIconDefault: '#9E9E9E',
    tabIconSelected: brand.primary,
    border: '#E0E0E0',
    card: '#FFFFFF',
    danger: '#D32F2F',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#121212',
    backgroundSecondary: '#1E1E1E',
    tint: brand.primaryLight,
    tabIconDefault: '#687076',
    tabIconSelected: brand.primaryLight,
    border: '#333333',
    card: '#1E1E1E',
    danger: '#EF5350',
  },
};
