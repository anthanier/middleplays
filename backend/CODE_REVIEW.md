# 🔍 Code Review Report - Marketplace Backend

**Tanggal Review:** $(date)  
**Status:** Setengah Jadi (Work in Progress)

---

## ✅ **POIN POSITIF**

### 1. **Struktur Project Bagus**
- ✅ Folder structure rapi dan terorganisir dengan baik
- ✅ Separation of concerns jelas (modules, libs, middlewares, plugins)
- ✅ Menggunakan TypeScript dengan strict mode
- ✅ Path aliases sudah dikonfigurasi dengan baik

### 2. **Security Practices**
- ✅ Password hashing menggunakan Argon2id (sangat bagus!)
- ✅ Credentials encryption menggunakan AES-256-GCM dengan auth tag
- ✅ JWT dengan access & refresh token pattern
- ✅ Environment variables validation
- ✅ Rate limiting sudah diimplementasi
- ✅ CORS sudah dikonfigurasi

### 3. **Database Design**
- ✅ Schema design bagus dengan proper relations
- ✅ Indexes sudah didefinisikan dengan baik
- ✅ Foreign keys dengan cascade/restrict sudah tepat
- ✅ Menggunakan enums untuk status values
- ✅ JSONB untuk flexible data (game details)

### 4. **Error Handling**
- ✅ Global error handler sudah ada
- ✅ Error logging dengan logger yang proper
- ✅ Graceful shutdown handlers

---

## ⚠️ **ISSUES & POTENSI BUG**

### 🔴 **CRITICAL ISSUES**

#### 1. **Race Condition di Rate Limiting** 
**File:** `src/plugins/rate-limit.ts:19-23`
```typescript
const current = await redis.incr(redisKey)

if (current === 1) {
  await redis.expire(redisKey, window)
}
```
**Masalah:** Ada race condition antara `incr` dan `expire`. Jika 2 request datang bersamaan, bisa jadi `expire` tidak ter-set dengan benar.

**Solusi:** Gunakan atomic operation atau gunakan `SET` dengan `NX` dan `EX`:
```typescript
const current = await redis.incr(redisKey)
if (current === 1) {
  await redis.expire(redisKey, window)
}
// Atau lebih baik lagi, gunakan script Lua untuk atomic operation
```

#### 2. **Non-null Assertion Berbahaya di Seed**
**File:** `src/db/seed.ts:49-53`
```typescript
const mlGame = gamesData.find((g) => g.slug === 'mobile-legends')!
```
**Masalah:** Jika game tidak ditemukan, akan throw runtime error. Tidak ada error handling.

**Solusi:** 
```typescript
const mlGame = gamesData.find((g) => g.slug === 'mobile-legends')
if (!mlGame) {
  throw new Error('Mobile Legends game not found after insert')
}
```

#### 3. **Missing Transaction Handling**
**File:** `src/db/index.ts` dan seluruh modules
**Masalah:** Tidak ada penggunaan database transactions untuk operasi yang perlu atomicity (contoh: create transaction + update balance).

**Solusi:** Implementasi transaction wrapper:
```typescript
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(callback)
}
```

#### 4. **Potential SQL Injection via JSONB**
**File:** `src/db/schema.ts:143`
**Masalah:** Meskipun menggunakan JSONB, perlu validasi input untuk mencegah malicious JSON structures.

**Solusi:** Validasi schema JSONB sebelum insert.

---

### 🟡 **MEDIUM PRIORITY ISSUES**

#### 5. **Inconsistent Error Handling di Redis**
**File:** `src/libs/redis.ts:47-50`
```typescript
async getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}
```
**Masalah:** `JSON.parse` bisa throw error jika data corrupt. Tidak ada try-catch.

**Solusi:**
```typescript
async getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    logger.warn('Failed to parse cache data', { key, error })
    return null
  }
}
```

#### 6. **Missing Input Validation**
**File:** `src/libs/crypto.ts:36-41`
**Masalah:** `decryptCredentials` hanya check length, tidak validate format hex.

**Solusi:** Tambahkan hex validation:
```typescript
function isValidHex(str: string): boolean {
  return /^[0-9a-f]+$/i.test(str)
}
```

#### 7. **Double Graceful Shutdown Handlers**
**File:** `src/index.ts:78-88` dan `src/db/index.ts:26-29`
**Masalah:** Ada duplicate SIGINT/SIGTERM handlers di beberapa file. Bisa conflict.

**Solusi:** Consolidate ke satu tempat atau gunakan event emitter pattern.

#### 8. **Hardcoded Values**
**File:** `src/db/schema.ts:159`
```typescript
expiresAt: timestamp('expires_at').notNull().default(sql`NOW() + INTERVAL '30 days'`)
```
**Masalah:** 30 days hardcoded. Sebaiknya bisa dikonfigurasi.

**Solusi:** Pindahkan ke env variable atau config.

#### 9. **Missing Index untuk Composite Queries**
**File:** `src/db/schema.ts`
**Masalah:** Beberapa query mungkin perlu composite index, contoh:
- `gameAccounts`: `(status, expiresAt)` untuk query expired postings
- `transactions`: `(status, createdAt)` untuk query pending transactions

**Solusi:** Tambahkan composite indexes sesuai kebutuhan query.

#### 10. **Rate Limit Fail-Open Behavior**
**File:** `src/plugins/rate-limit.ts:35-40`
**Masalah:** Jika Redis fail, rate limit di-bypass. Ini bisa berbahaya di production.

**Solusi:** Consider fail-closed untuk production atau monitoring alert.

---

### 🟢 **LOW PRIORITY / IMPROVEMENTS**

#### 11. **Console.log Instead of Logger**
**File:** `src/libs/redis.ts:18-31`
**Masalah:** Menggunakan `console.log` langsung, bukan logger utility.

**Solusi:** Ganti dengan `logger.info()`.

#### 12. **Missing Type Safety di Redis Helpers**
**File:** `src/libs/redis.ts:43`
```typescript
async setCache(key: string, value: any, ttlSeconds = 3600)
```
**Masalah:** `any` type mengurangi type safety.

**Solusi:** Gunakan generic atau constraint type.

#### 13. **Missing Validation di Auth Middleware**
**File:** `src/middlewares/auth.ts:23`
**Masalah:** Type assertion `as unknown as JWTPayload` bisa berbahaya jika payload tidak sesuai.

**Solusi:** Validasi payload structure sebelum assertion.

#### 14. **Missing Database Connection Error Handling**
**File:** `src/db/index.ts:12-16`
**Masalah:** Tidak ada error handling jika connection pool gagal.

**Solusi:** Tambahkan error handler dan retry logic.

#### 15. **Missing Redis Keys Pattern**
**File:** `src/libs/redis.ts:56-60`
**Masalah:** `redis.keys()` bisa blocking di production dengan banyak keys.

**Solusi:** Gunakan `SCAN` untuk iterasi keys.

#### 16. **Missing Environment Variable Validation untuk Optional Fields**
**File:** `src/configs/env.ts`
**Masalah:** Beberapa optional fields (XENDIT_SECRET_KEY, KYC_API_KEY) tidak divalidasi meskipun mungkin diperlukan di production.

**Solusi:** Tambahkan conditional validation berdasarkan NODE_ENV.

#### 17. **Missing Request ID/Tracing**
**Masalah:** Tidak ada request ID untuk tracing di logs. Sulit debug di production.

**Solusi:** Tambahkan request ID middleware.

#### 18. **Missing Health Check untuk Redis & DB**
**File:** `src/index.ts:44-48`
**Masalah:** Health check hanya return static, tidak check actual connection status.

**Solusi:** 
```typescript
.get('/health', async () => {
  const dbOk = await checkDbConnection()
  const redisOk = await checkRedisConnection()
  return {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    db: dbOk,
    redis: redisOk,
    timestamp: new Date().toISOString()
  }
})
```

---

## 📋 **REKOMENDASI PERBAIKAN**

### Priority 1 (Harus Fix Sebelum Production):
1. ✅ Fix race condition di rate limiting
2. ✅ Implementasi database transactions untuk critical operations
3. ✅ Fix error handling di Redis cache parsing
4. ✅ Tambahkan input validation untuk decrypt credentials
5. ✅ Fix seed file error handling

### Priority 2 (Sebaiknya Fix):
6. ✅ Consolidate graceful shutdown handlers
7. ✅ Tambahkan composite indexes
8. ✅ Ganti console.log dengan logger
9. ✅ Tambahkan health check yang proper
10. ✅ Tambahkan request ID tracing

### Priority 3 (Nice to Have):
11. ✅ Improve type safety di Redis helpers
12. ✅ Add monitoring/alerting untuk rate limit failures
13. ✅ Optimize Redis keys pattern dengan SCAN
14. ✅ Add request validation middleware

---

## 🎯 **KESIMPULAN**

**Overall Score: 7.5/10**

Kode kamu **sudah cukup bagus** untuk tahap setengah jadi! Struktur project rapi, security practices sudah baik, dan database design solid. 

**Yang perlu diperhatikan:**
- Ada beberapa race condition dan error handling yang perlu diperbaiki
- Missing transaction handling untuk operasi critical
- Beberapa improvement untuk production readiness

**Rekomendasi:** Fix critical issues dulu sebelum lanjut development, terutama race condition dan transaction handling. Setelah itu baru lanjut ke improvements.

---

**Catatan:** Beberapa file masih kosong (modules, jobs, libs) - ini normal untuk project setengah jadi. Pastikan saat implementasi, ikuti pattern yang sudah ada dan perhatikan issues di atas.
