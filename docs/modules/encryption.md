# Módulo de Criptografia

> **Arquivo principal:** `src/lib/encryption.ts`
> **Algoritmo:** AES-256-GCM
> **Formato criptografado:** `iv:authTag:encrypted` (todos hex-encoded)

---

## Visão Geral

O módulo de criptografia fornece funcionalidades robustas de criptografia simétrica, hashing seguro e geração de tokens para a plataforma Zion Recruit. Utiliza o algoritmo **AES-256-GCM** (Galois/Counter Mode) como padrão, oferecendo tanto confidencialidade quanto integridade dos dados, além de suporte total à compatibilidade com o formato legado.

---

## Funções Exportadas

### `encrypt(plaintext: string, key?: string): Promise<EncryptionResult>`

Criptografa um texto plano utilizando AES-256-GCM.

- **Parâmetros:**
  - `plaintext` — Texto a ser criptografado
  - `key` (opcional) — Chave de criptografia. Se não fornecida, utiliza a chave derivada da variável de ambiente `ENCRYPTION_KEY`
- **Retorno:** `Promise<EncryptionResult>` contendo:
  - `encrypted` — Texto criptografado no formato `iv:authTag:ciphertext` (hex-encoded)
  - `algorithm` — Identificador do algoritmo utilizado (`'aes-256-gcm'`)

```typescript
const result = await encrypt('senha-secreta');
// result.encrypted = "a1b2c3d4:e5f6a7b8:c9d0e1f2..."
// result.algorithm = "aes-256-gcm"
```

### `decrypt(encryptedData: string, key?: string): Promise<DecryptionResult>`

Descriptografa dados previamente criptografados. Detecta automaticamente o formato (AES-256-GCM ou legado) e processa conforme necessário.

- **Parâmetros:**
  - `encryptedData` — Dados criptografados (formato novo ou legado)
  - `key` (opcional) — Chave de criptografia
- **Retorno:** `Promise<DecryptionResult>` contendo:
  - `decrypted` — Texto descriptografado
  - `algorithm` — Algoritmo detectado durante a descriptografia

```typescript
const result = await decrypt('a1b2c3d4:e5f6a7b8:c9d0e1f2...');
// result.decrypted = "senha-secreta"
// result.algorithm = "aes-256-gcm"
```

### `hash(data: string, algorithm?: string): Promise<string>`

Gera um hash unidirecional utilizando o algoritmo SHA-256 (padrão).

- **Parâmetros:**
  - `data` — Dados para gerar o hash
  - `algorithm` — Algoritmo de hash (padrão: `'sha256'`)
- **Retorno:** Hash em formato hexadecimal

### `hmacHash(data: string, key: string, algorithm?: string): Promise<string>`

Gera um HMAC (Hash-based Message Authentication Code) para verificação de integridade.

- **Parâmetros:**
  - `data` — Dados para o HMAC
  - `key` — Chave secreta para o HMAC
  - `algorithm` — Algoritmo (padrão: `'sha256'`)
- **Retorno:** HMAC em formato hexadecimal

### `generateSecureToken(length?: number): Promise<string>`

Gera um token criptograficamente seguro utilizando valores aleatórios.

- **Parâmetros:**
  - `length` — Comprimento do token em bytes (padrão: `32`)
- **Retorno:** Token em formato hexadecimal

```typescript
const token = await generateSecureToken(32);
// "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
```

### `generateSecureString(length?: number): Promise<string>`

Gera uma string segura utilizando caracteres alfanuméricos.

- **Parâmetros:**
  - `length` — Comprimento desejado (padrão: `32`)
- **Retorno:** String alfanumérica segura

### `secureCompare(a: string, b: string): boolean`

Compara duas strings em tempo constante para evitar ataques de timing.

- **Parâmetros:**
  - `a` — Primeira string
  - `b` — Segunda string
- **Retorno:** `true` se as strings são idênticas

> ⚠️ **Importante:** Sempre utilize `secureCompare` ao verificar senhas, tokens ou secrets. Nunca utilize o operador `===` para comparações sensíveis.

### `isAESEncrypted(data: string): boolean`

Verifica se os dados estão no formato AES-256-GCM (`iv:authTag:ciphertext`).

- **Parâmetros:**
  - `data` — Dados a verificar
- **Retorno:** `true` se os dados seguem o formato AES-256-GCM

### `generateEncryptionKey(): Promise<string>`

Gera uma nova chave de criptografia de 256 bits.

- **Retorno:** Chave em formato hexadecimal (64 caracteres)

### `clearCachedKey(): void`

Limpa a chave de criptografia em cache, forçando uma nova derivação no próximo uso.

### `checkEncryptionStatus(): Promise<{ configured: boolean; algorithm: string; keyLength: number } | null>`

Verifica o status da configuração de criptografia.

- **Retorno:** Status da criptografia ou `null` se não configurada

---

## Tipos

### `EncryptionResult`

```typescript
interface EncryptionResult {
  encrypted: string;   // Dados criptografados (iv:authTag:ciphertext)
  algorithm: 'aes-256-gcm';
}
```

### `DecryptionResult`

```typescript
interface DecryptionResult {
  decrypted: string;   // Texto descriptografado
  algorithm: string;   // Algoritmo detectado ('aes-256-gcm' ou 'legacy')
}
```

---

## Algoritmo AES-256-GCM

### Por que AES-256-GCM?

| Característica | Descrição |
|---|---|
| **Confidencialidade** | Criptografia AES com chave de 256 bits |
| **Integridade** | Tag de autenticação de 128 bits (GCM) |
| **Performance** | Acelerado por hardware (AES-NI) na maioria dos processadores |
| **Composição** | IV aleatório de 96 bits por operação |

### Formato Criptografado

```
iv:authTag:encrypted
```

| Componente | Tamanho | Formato | Descrição |
|---|---|---|---|
| `iv` | 12 bytes | hex-encoded (24 chars) | Vetor de inicialização aleatório |
| `authTag` | 16 bytes | hex-encoded (32 chars) | Tag de autenticação GCM |
| `encrypted` | Variável | hex-encoded | Ciphertext resultante |

### Formato Legado (Backward Compatible)

```
enc:base64EncodedData
```

O módulo detecta automaticamente o formato legado durante a descriptografia e converte para o novo formato quando possível. A migração em massa pode ser realizada através do script de migração.

---

## Derivação de Chave (PBKDF2)

A chave de criptografia é derivada a partir da variável de ambiente `ENCRYPTION_KEY` utilizando **PBKDF2**:

| Parâmetro | Valor |
|---|---|
| **Algoritmo** | PBKDF2 com HMAC-SHA256 |
| **Iterações** | 100.000 |
| **Comprimento da chave** | 256 bits (32 bytes) |
| **Salt** | `"zion-recruit-encryption-salt-v1"` (fixo por tenant) |
| **Entrada** | Valor da variável `ENCRYPTION_KEY` |

> 📌 **Ambiente de desenvolvimento:** Se a variável `ENCRYPTION_KEY` não estiver definida, o sistema gera automaticamente uma chave de desenvolvimento e a armazena em cache. **Nunca utilize isso em produção.**

---

## Segurança

| Funcionalidade | Implementação |
|---|---|
| **Comprimento da chave** | 256 bits (segurança de nível militar) |
| **Tag de autenticação** | 128 bits (proteção contra adulteração) |
| **Comparação constante** | `secureCompare()` previne ataques de timing |
| **IV único por operação** | IV aleatório de 96 bits para cada criptografia |
| **Compatibilidade retroativa** | Detecta e processa formato legado automaticamente |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ENCRYPTION_KEY` | Sim (produção) | Chave mestra para derivação. Mínimo 32 caracteres recomendado. |

---

## Migração de Credenciais

### Script de Migração

**Arquivo:** `src/lib/migrate-credentials.ts`

Script para migrar credenciais armazenadas no formato legado (base64 com prefixo `enc:`) para o novo formato AES-256-GCM.

```typescript
import { migrateCredentials } from '@/lib/migrate-credentials';

// Executa a migração de todas as credenciais legadas
await migrateCredentials();
```

### Processo de migração

1. Busca todas as credenciais no banco de dados
2. Identifica valores no formato legado (`enc:...`)
3. Descriptografa com o algoritmo legado
4. Recriptografa com AES-256-GCM
5. Atualiza o registro no banco de dados
6. Registra log de auditoria da migração

---

## Exemplos de Uso

### Criptografar dados sensíveis

```typescript
import { encrypt, decrypt } from '@/lib/encryption';

// Criptografar uma API key
const apiKey = 'sk-1234567890abcdef';
const { encrypted } = await encrypt(apiKey);
// Armazene 'encrypted' no banco de dados

// Descriptografar quando necessário
const { decrypted } = await decrypt(encrypted);
console.log(decrypted); // 'sk-1234567890abcdef'
```

### Gerar token seguro

```typescript
import { generateSecureToken, generateSecureString } from '@/lib/encryption';

// Token para links de convite
const inviteToken = await generateSecureToken(32);

// String para secrets de webhook
const webhookSecret = await generateSecureString(48);
```

### Comparação segura

```typescript
import { secureCompare } from '@/lib/encryption';

// Verificar token de webhook recebido
const receivedToken = req.headers['x-webhook-token'];
const storedToken = webhook.token;

if (!secureCompare(receivedToken, storedToken)) {
  return res.status(401).json({ error: 'Token inválido' });
}
```

### Verificar status da criptografia

```typescript
import { checkEncryptionStatus, clearCachedKey } from '@/lib/encryption';

// Verificar se a criptografia está configurada
const status = await checkEncryptionStatus();
if (!status) {
  console.warn('Criptografia não configurada');
}

// Limpar cache (ex: após rotação de chave)
clearCachedKey();
```

---

## Considerações de Produção

1. **Chave forte:** Utilize uma chave `ENCRYPTION_KEY` com no mínimo 32 caracteres gerados aleatoriamente
2. **Rotação:** Implemente rotação periódica da chave com processo de recriptografia
3. **Backup:** Mantenha backup seguro da chave — sem ela, os dados são irrecuperáveis
4. **Monitoramento:** Utilize `checkEncryptionStatus()` em health checks da aplicação
5. **Migração:** Execute `migrateCredentials()` após atualizar para o novo formato
