/**
 * Migration Utility for API Credentials Encryption
 * 
 * Migrates credentials from legacy base64 encoding to AES-256-GCM encryption.
 * This script should be run once when upgrading to the new encryption system.
 * 
 * Usage:
 *   - As a module: import { migrateCredentials } from '@/lib/migrate-credentials'
 *   - CLI: npx tsx src/lib/migrate-credentials.ts
 */

import { db } from '@/lib/db';
import { encrypt, decrypt, isAESEncrypted } from '@/lib/encryption';

// Types
interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: Array<{ id: string; provider: string; name: string; error: string }>;
}

interface CredentialRecord {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  apiSecret: string | null;
  projectKey: string | null;
}

/**
 * Check if a value is legacy-encoded (base64 with 'enc:' prefix)
 */
function isLegacyEncrypted(value: string): boolean {
  return value.startsWith('enc:');
}

/**
 * Decrypt a legacy-encoded value
 */
function decryptLegacy(encrypted: string): string {
  if (!isLegacyEncrypted(encrypted)) {
    return encrypted;
  }
  const base64Part = encrypted.slice(4);
  return Buffer.from(base64Part, 'base64').toString('utf8');
}

/**
 * Migrate a single credential record
 */
async function migrateCredential(credential: CredentialRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Record<string, string> = {};

    // Check and migrate apiKey
    if (credential.apiKey) {
      if (isLegacyEncrypted(credential.apiKey)) {
        const decrypted = decryptLegacy(credential.apiKey);
        updates.apiKey = encrypt(decrypted);
      } else if (!isAESEncrypted(credential.apiKey)) {
        // Plain text - encrypt it
        updates.apiKey = encrypt(credential.apiKey);
      }
    }

    // Check and migrate apiSecret
    if (credential.apiSecret) {
      if (isLegacyEncrypted(credential.apiSecret)) {
        const decrypted = decryptLegacy(credential.apiSecret);
        updates.apiSecret = encrypt(decrypted);
      } else if (!isAESEncrypted(credential.apiSecret)) {
        updates.apiSecret = encrypt(credential.apiSecret);
      }
    }

    // Check and migrate projectKey
    if (credential.projectKey) {
      if (isLegacyEncrypted(credential.projectKey)) {
        const decrypted = decryptLegacy(credential.projectKey);
        updates.projectKey = encrypt(decrypted);
      } else if (!isAESEncrypted(credential.projectKey)) {
        updates.projectKey = encrypt(credential.projectKey);
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await db.apiCredential.update({
        where: { id: credential.id },
        data: updates,
      });
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Migrate all credentials from legacy encoding to AES-256-GCM
 * 
 * @param dryRun - If true, only report what would be migrated without making changes
 * @returns Migration result with statistics
 */
export async function migrateCredentials(dryRun: boolean = false): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  console.log('🔐 Starting credential migration...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  console.log('');

  try {
    // Fetch all credentials
    const credentials = await db.apiCredential.findMany({
      select: {
        id: true,
        provider: true,
        name: true,
        apiKey: true,
        apiSecret: true,
        projectKey: true,
      },
    });

    result.total = credentials.length;
    console.log(`📋 Found ${credentials.length} credential(s) to process`);
    console.log('');

    for (const credential of credentials) {
      const needsMigration =
        (credential.apiKey && isLegacyEncrypted(credential.apiKey)) ||
        (credential.apiSecret && isLegacyEncrypted(credential.apiSecret)) ||
        (credential.projectKey && isLegacyEncrypted(credential.projectKey));

      if (!needsMigration) {
        result.skipped++;
        console.log(`   ⏭️  [${credential.provider}] ${credential.name} - Already using AES encryption or no sensitive data`);
        continue;
      }

      console.log(`   🔄 [${credential.provider}] ${credential.name} - ${dryRun ? 'Would migrate' : 'Migrating'}...`);

      if (dryRun) {
        result.migrated++;
        continue;
      }

      const migrationResult = await migrateCredential(credential);

      if (migrationResult.success) {
        result.migrated++;
        console.log(`   ✅ [${credential.provider}] ${credential.name} - Migrated successfully`);
      } else {
        result.errors.push({
          id: credential.id,
          provider: credential.provider,
          name: credential.name,
          error: migrationResult.error || 'Unknown error',
        });
        console.log(`   ❌ [${credential.provider}] ${credential.name} - Failed: ${migrationResult.error}`);
      }
    }

    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   Total credentials: ${result.total}`);
    console.log(`   ${dryRun ? 'Would migrate' : 'Migrated'}: ${result.migrated}`);
    console.log(`   Skipped (already migrated): ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      result.errors.forEach((err) => {
        console.log(`   - [${err.provider}] ${err.name}: ${err.error}`);
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration failed:', message);
    throw new Error(`Migration failed: ${message}`);
  }
}

/**
 * Verify migration by decrypting and checking credentials
 */
export async function verifyMigration(): Promise<{
  total: number;
  verified: number;
  errors: Array<{ id: string; provider: string; name: string; error: string }>;
}> {
  const result = {
    total: 0,
    verified: 0,
    errors: [] as Array<{ id: string; provider: string; name: string; error: string }>,
  };

  console.log('🔍 Verifying credential encryption...');

  try {
    const credentials = await db.apiCredential.findMany({
      select: {
        id: true,
        provider: true,
        name: true,
        apiKey: true,
        apiSecret: true,
        projectKey: true,
      },
    });

    result.total = credentials.length;

    for (const credential of credentials) {
      try {
        // Try to decrypt each field
        if (credential.apiKey) {
          decrypt(credential.apiKey);
        }
        if (credential.apiSecret) {
          decrypt(credential.apiSecret);
        }
        if (credential.projectKey) {
          decrypt(credential.projectKey);
        }

        result.verified++;
        console.log(`   ✅ [${credential.provider}] ${credential.name} - Verified`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          id: credential.id,
          provider: credential.provider,
          name: credential.name,
          error: message,
        });
        console.log(`   ❌ [${credential.provider}] ${credential.name} - Failed: ${message}`);
      }
    }

    console.log('');
    console.log('📊 Verification Summary:');
    console.log(`   Total: ${result.total}`);
    console.log(`   Verified: ${result.verified}`);
    console.log(`   Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Verification failed:', message);
    throw new Error(`Verification failed: ${message}`);
  }
}

/**
 * Rollback migration (re-encrypt with legacy base64 encoding)
 * WARNING: This is less secure and should only be used if absolutely necessary
 */
export async function rollbackMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  console.log('⏪ Rolling back credential encryption to legacy format...');
  console.log('⚠️  WARNING: Legacy format is NOT secure!');
  console.log('');

  try {
    const credentials = await db.apiCredential.findMany({
      select: {
        id: true,
        provider: true,
        name: true,
        apiKey: true,
        apiSecret: true,
        projectKey: true,
      },
    });

    result.total = credentials.length;

    for (const credential of credentials) {
      const updates: Record<string, string> = {};

      try {
        // Decrypt AES and re-encode with legacy format
        if (credential.apiKey && isAESEncrypted(credential.apiKey)) {
          const decrypted = decrypt(credential.apiKey);
          updates.apiKey = `enc:${Buffer.from(decrypted).toString('base64')}`;
        }

        if (credential.apiSecret && isAESEncrypted(credential.apiSecret)) {
          const decrypted = decrypt(credential.apiSecret);
          updates.apiSecret = `enc:${Buffer.from(decrypted).toString('base64')}`;
        }

        if (credential.projectKey && isAESEncrypted(credential.projectKey)) {
          const decrypted = decrypt(credential.projectKey);
          updates.projectKey = `enc:${Buffer.from(decrypted).toString('base64')}`;
        }

        if (Object.keys(updates).length > 0) {
          await db.apiCredential.update({
            where: { id: credential.id },
            data: updates,
          });
          result.migrated++;
          console.log(`   ✅ [${credential.provider}] ${credential.name} - Rolled back`);
        } else {
          result.skipped++;
          console.log(`   ⏭️  [${credential.provider}] ${credential.name} - Already in legacy format`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          id: credential.id,
          provider: credential.provider,
          name: credential.name,
          error: message,
        });
        console.log(`   ❌ [${credential.provider}] ${credential.name} - Failed: ${message}`);
      }
    }

    console.log('');
    console.log('📊 Rollback Summary:');
    console.log(`   Total: ${result.total}`);
    console.log(`   Rolled back: ${result.migrated}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Rollback failed:', message);
    throw new Error(`Rollback failed: ${message}`);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  const dryRun = args.includes('--dry-run');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Zion Recruit - Credential Encryption Migration         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    switch (command) {
      case 'migrate':
        await migrateCredentials(dryRun);
        break;
      case 'verify':
        await verifyMigration();
        break;
      case 'rollback':
        console.log('⚠️  WARNING: This will downgrade encryption security!');
        await rollbackMigration();
        break;
      case 'dry-run':
        await migrateCredentials(true);
        break;
      default:
        console.log('Usage:');
        console.log('  npx tsx src/lib/migrate-credentials.ts migrate      - Migrate to AES-256-GCM');
        console.log('  npx tsx src/lib/migrate-credentials.ts migrate --dry-run  - Preview migration');
        console.log('  npx tsx src/lib/migrate-credentials.ts verify       - Verify encryption');
        console.log('  npx tsx src/lib/migrate-credentials.ts rollback     - Rollback to legacy format');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main();
}

export default migrateCredentials;
