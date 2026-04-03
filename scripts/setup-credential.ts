import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function setup() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('No tenant found');
    process.exit(1);
  }
  console.log('Tenant:', tenant.id, tenant.name);

  // Clean up existing credentials
  const existing = await prisma.apiCredential.findMany();
  for (const c of existing) {
    await prisma.apiCredential.delete({ where: { id: c.id } });
    console.log('Deleted:', c.name);
  }

  // Encrypt the OpenRouter key
  const apiKey = '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';
  const encrypted = encrypt(apiKey);
  console.log('Encrypted key length:', encrypted.length);

  // Verify round-trip
  const decrypted = decrypt(encrypted);
  console.log('Round-trip OK:', decrypted === apiKey);

  // Create credential
  const cred = await prisma.apiCredential.create({
    data: {
      tenantId: tenant.id,
      provider: 'OPENROUTER',
      name: 'OpenRouter Principal',
      description: 'Credencial OpenRouter para IA (deepseek, claude, gemini)',
      apiKey: encrypted,
      defaultModel: 'deepseek/deepseek-chat',
      isActive: true,
      isDefault: true,
    },
  });
  console.log('Created:', cred.name, cred.id, cred.provider);

  await prisma.$disconnect();
}

setup().catch((e) => {
  console.error(e);
  process.exit(1);
});
