import { safeStorage } from 'electron';

export function encryptPassword(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption not available');
  }
  return safeStorage.encryptString(plain).toString('base64');
}

export function decryptPassword(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption not available');
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64')).toString();
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}