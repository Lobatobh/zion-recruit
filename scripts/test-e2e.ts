/**
 * End-to-end test: Test LLMService with real credential from DB
 */
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../src/lib/encryption';
import { db } from '../src/lib/db';

const OPENROUTER_MODELS = [
  'deepseek/deepseek-chat',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-001',
];

async function test() {
  // 1. Load credential from DB
  const credential = await db.apiCredential.findFirst({
    where: { isActive: true },
  });

  if (!credential) {
    console.error('❌ No active credential found');
    process.exit(1);
  }

  let apiKey: string;
  try {
    apiKey = decrypt(credential.apiKey);
    if (typeof apiKey === 'string') {
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    } else {
      apiKey = String(apiKey);
    }
  } catch (e) {
    console.error('❌ Failed to decrypt:', (e as Error).message);
    process.exit(1);
  }

  console.log('✅ Credential loaded:', credential.name, '/', credential.provider);
  console.log('   Key prefix:', apiKey.substring(0, 15) + '...');

  // 2. Auto-detect provider
  const detectedProvider = apiKey.startsWith('sk-or-') ? 'OPENROUTER'
    : apiKey.startsWith('sk-ant-') ? 'ANTHROPIC'
    : apiKey.startsWith('AI') ? 'GEMINI'
    : apiKey.startsWith('sk-') ? 'OPENAI'
    : credential.provider;

  console.log('   Detected provider:', detectedProvider);

  if (detectedProvider !== credential.provider) {
    console.warn('⚠️  Provider mismatch! DB says', credential.provider, 'but key is', detectedProvider);
  }

  // 3. Test API call with each model
  for (const model of OPENROUTER_MODELS) {
    console.log(`\n🔄 Testing model: ${model}`);
    try {
      const startTime = Date.now();
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://zion-recruit.app',
          'X-Title': 'Zion Recruit ATS',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Retorne APENAS JSON válido.' },
            { role: 'user', content: 'Analise esta vaga e retorne JSON: {"skills":["java","python"],"seniority":"Pleno","discProfile":{"D":60,"I":40,"S":50,"C":70}}' },
          ],
          max_tokens: 100,
          response_format: { type: 'json_object' },
        }),
      });

      const elapsed = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ ${response.status} in ${elapsed}ms`);
        console.log('   Content:', data.choices?.[0]?.message?.content?.substring(0, 80));
        console.log('   Tokens:', data.usage?.total_tokens);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ ${response.status} in ${elapsed}ms:`, errorText.substring(0, 100));
      }
    } catch (e) {
      console.log('   ❌ Error:', (e as Error).message);
    }
  }

  console.log('\n✅ Test complete!');
  process.exit(0);
}

test();
