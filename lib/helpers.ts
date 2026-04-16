import { ExpiryColors } from '@/constants/Colors';
import type { InventoryStatus } from '@/lib/types';

export function getExpiryStatus(expiryDate: string): InventoryStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays === 0) return 'expiring_today';
  if (diffDays <= 3) return 'expiring_soon';
  return 'fresh';
}

export function getExpiryColor(status: InventoryStatus): string {
  switch (status) {
    case 'fresh': return ExpiryColors.fresh;
    case 'expiring_soon': return ExpiryColors.expiringSoon;
    case 'expiring_today': return ExpiryColors.expiringToday;
    case 'expired': return ExpiryColors.expired;
    case 'frozen_to_save': return ExpiryColors.frozen;
    default: return '#999999';
  }
}

export function getExpiryLabel(expiryDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Expired ${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Expires today';
  if (diffDays === 1) return 'Expires tomorrow';
  if (diffDays <= 7) return `${diffDays} days left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
  return `${Math.ceil(diffDays / 30)} months left`;
}

export function getFreshnessPercent(expiryDate: string, originalDate: string): number {
  const now = new Date().getTime();
  const expiry = new Date(expiryDate).getTime();
  const original = new Date(originalDate).getTime();
  const totalSpan = expiry - original;
  if (totalSpan <= 0) return 0;
  const remaining = expiry - now;
  return Math.max(0, Math.min(100, (remaining / totalSpan) * 100));
}

export function formatStorageLocation(location: string): string {
  return location
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatTimeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
