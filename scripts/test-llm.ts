import { PrismaClient } from '@prisma/client';
import { decrypt } from '../src/lib/encryption';
import { db } from '../src/lib/db';

const prisma = new PrismaClient();

async function test() {
  // Verify credential
  const cred = await prisma.apiCredential.findFirst({
    where: { isActive: true, isDefault: true },
  });
  if (!cred) {
    console.error('No active credential');
    process.exit(1);
  }

  const apiKey = decrypt(cred.apiKey);
  console.log('Credential:', cred.name, cred.provider);
  console.log('Key prefix:', (apiKey as string).substring(0, 15) + '...');

  // Test direct API call
  console.log('\nTesting OpenRouter API call...');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://zion-recruit.app',
      'X-Title': 'Zion Recruit ATS',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: 'Return JSON only' },
        { role: 'user', content: 'Retorne JSON: {"status":"ok","mensagem":"funcionando"}' },
      ],
      max_tokens: 50,
      response_format: { type: 'json_object' },
    }),
  });

  console.log('HTTP Status:', response.status);
  const data = await response.json();
  if (data.choices) {
    console.log('SUCCESS! Response:', data.choices[0]?.message?.content);
  } else {
    console.log('ERROR:', JSON.stringify(data));
  }

  await prisma.$disconnect();
}

test().catch(console.error);
