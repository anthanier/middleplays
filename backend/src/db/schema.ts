import { pgTable, uuid, varchar, text, timestamp, boolean, decimal, integer, jsonb, pgEnum, index, serial, primaryKey } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { Type as t } from '@sinclair/typebox'

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role', ['user', 'verified_seller', 'admin'])

export const kycStatusEnum = pgEnum('kyc_status', ['pending', 'approved', 'rejected'])

export const postingStatusEnum = pgEnum('posting_status', ['active', 'sold', 'expired', 'deleted'])

export const loginMethodEnum = pgEnum('login_method', [
  'moonton',
  'google', 
  'facebook',
  'vk',
  'apple',
  'email'
])

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'paid',
  'processing',
  'completed',
  'disputed',
  'refunded',
  'cancelled'
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'expired'
])

export const disputeStatusEnum = pgEnum('dispute_status', [
  'open',
  'investigating',
  'resolved',
  'closed'
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'new_sale',
  'purchase_complete',
  'payment_received',
  'posting_expired',
  'dispute_opened',
  'dispute_resolved',
  'kyc_approved',
  'kyc_rejected'
])

// ==================== USERS ====================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email)
}))

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: text('avatar_url'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  totalSales: integer('total_sales').notNull().default(0),
  totalPurchases: integer('total_purchases').notNull().default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('email_tokens_user_id_idx').on(table.userId),
}))

// ==================== KYC VERIFICATION ====================

export const kycVerifications = pgTable('kyc_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ktpNumber: varchar('ktp_number', { length: 16 }).notNull().unique(),
  ktpImageUrl: text('ktp_image_url').notNull(),
  selfieImageUrl: text('selfie_image_url').notNull(),
  verificationStatus: kycStatusEnum('verification_status').notNull().default('pending'),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: index('kyc_user_id_idx').on(table.userId),
  statusIdx: index('kyc_status_idx').on(table.verificationStatus)
}))

// ==================== GAMES ====================

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  iconUrl: text('icon_url'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  slugIdx: index('games_slug_idx').on(table.slug)
}))

// ==================== GAME FIELD DEFINITIONS (Dynamic Fields) ====================

export const gameFieldDefinitions = pgTable('game_field_definitions', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  fieldName: varchar('field_name', { length: 100 }).notNull(), // level, rank, total_skins
  fieldLabel: varchar('field_label', { length: 100 }).notNull(), // "Level", "Rank"
  fieldType: varchar('field_type', { length: 20 }).notNull(), // text, number, select, textarea
  fieldOptions: jsonb('field_options'), // For dropdown options: ["Warrior", "Elite", "Master"]
  isRequired: boolean('is_required').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  gameFieldIdx: index('game_field_game_id_idx').on(table.gameId)
}))

// ==================== GAME ACCOUNT POSTINGS ====================

export const gameAccounts = pgTable('game_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'restrict' }),
  
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  
  // Dynamic details (JSONB for flexibility)
  details: jsonb('details').notNull(), // { level: 50, rank: "Mythic", total_skins: 120 }
  
  // Encrypted credentials
  credentialsEncrypted: text('credentials_encrypted').notNull(),
  loginMethod: loginMethodEnum('login_method').notNull(),
  
  // Images (array of URLs)
  images: jsonb('images').notNull().default('[]'), // ["url1", "url2"]
  
  // Status & metrics
  status: postingStatusEnum('status').notNull().default('active'),
  viewsCount: integer('views_count').notNull().default(0),
  favoritesCount: integer('favorites_count').notNull().default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull().default(sql`NOW() + INTERVAL '30 days'`),
  soldAt: timestamp('sold_at')
}, (table) => ({
  sellerIdx: index('game_accounts_seller_idx').on(table.sellerId),
  gameIdx: index('game_accounts_game_idx').on(table.gameId),
  statusIdx: index('game_accounts_status_idx').on(table.status),
  expiresIdx: index('game_accounts_expires_idx').on(table.expiresAt),
  createdIdx: index('game_accounts_created_idx').on(table.createdAt)
}))

// ==================== TRANSACTIONS ====================

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  gameAccountId: uuid('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'restrict' }),
  
  // Pricing breakdown
  itemPrice: decimal('item_price', { precision: 15, scale: 2 }).notNull(),
  paymentGatewayFee: decimal('payment_gateway_fee', { precision: 15, scale: 2 }).notNull().default('0'),
  platformFeePercentage: decimal('platform_fee_percentage', { precision: 5, scale: 2 }).notNull().default('3.00'),
  platformFeeAmount: decimal('platform_fee_amount', { precision: 15, scale: 2 }).notNull(),
  disbursementFee: decimal('disbursement_fee', { precision: 15, scale: 2 }).notNull().default('2500'),
  
  totalBuyerPaid: decimal('total_buyer_paid', { precision: 15, scale: 2 }).notNull(),
  sellerReceived: decimal('seller_received', { precision: 15, scale: 2 }),
  
  // Payment details
  paymentMethod: varchar('payment_method', { length: 50 }), // gopay, ovo, bank_transfer
  paymentGatewayRef: varchar('payment_gateway_ref', { length: 255 }), // Xendit payment ID
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  
  // Transaction flow
  status: transactionStatusEnum('status').notNull().default('pending'),
  
  // Payment expiry
  expiresAt: timestamp('expires_at'),
  
  // Credentials delivery
  credentialsDeliveredAt: timestamp('credentials_delivered_at'),
  
  // Completion
  completedAt: timestamp('completed_at'),
  autoCompleted: boolean('auto_completed').notNull().default(false),
  
  // Disbursement
  disbursedAt: timestamp('disbursed_at'),
  disbursementRef: varchar('disbursement_ref', { length: 255 }), // Xendit disbursement ID
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  buyerIdx: index('transactions_buyer_idx').on(table.buyerId),
  sellerIdx: index('transactions_seller_idx').on(table.sellerId),
  statusIdx: index('transactions_status_idx').on(table.status),
  createdIdx: index('transactions_created_idx').on(table.createdAt)
}))

// ==================== DISPUTES ====================

export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  raisedBy: uuid('raised_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  reason: text('reason').notNull(),
  status: disputeStatusEnum('status').notNull().default('open'),
  resolution: text('resolution'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  txIdx: index('disputes_tx_idx').on(table.transactionId),
  statusIdx: index('disputes_status_idx').on(table.status)
}))

// ==================== FAVORITES / WISHLIST ====================

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameAccountId: uuid('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.gameAccountId] }),
  userIdx: index('favorites_user_idx').on(table.userId)
}))

// ==================== NOTIFICATIONS ====================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: text('link'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userReadIdx: index('notifications_user_read_idx').on(table.userId, table.isRead),
  createdIdx: index('notifications_created_idx').on(table.createdAt)
}))

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  kycVerification: one(kycVerifications, {
    fields: [users.id],
    references: [kycVerifications.userId]
  }),
  emailVerificationToken: one(emailVerificationTokens, {
    fields: [users.id],
    references: [emailVerificationTokens.userId]
  }),
  postings: many(gameAccounts),
  purchases: many(transactions, { relationName: 'buyer' }),
  sales: many(transactions, { relationName: 'seller' }),
  favorites: many(favorites),
  notifications: many(notifications)
}))

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id]
  }),
}));

export const gameAccountsRelations = relations(gameAccounts, ({ one, many }) => ({
  seller: one(users, {
    fields: [gameAccounts.sellerId],
    references: [users.id]
  }),
  game: one(games, {
    fields: [gameAccounts.gameId],
    references: [games.id]
  }),
  transaction: one(transactions),
  favorites: many(favorites)
}))

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  buyer: one(users, {
    fields: [transactions.buyerId],
    references: [users.id],
    relationName: 'buyer'
  }),
  seller: one(users, {
    fields: [transactions.sellerId],
    references: [users.id],
    relationName: 'seller'
  }),
  gameAccount: one(gameAccounts, {
    fields: [transactions.gameAccountId],
    references: [gameAccounts.id]
  }),
  disputes: many(disputes)
}))


// Insert schemas (for validation)
export const insertUserSchema = createInsertSchema(users)
export const insertUserProfileSchema = createInsertSchema(userProfiles)
export const insertGameAccountSchema = createInsertSchema(gameAccounts)
export const insertTransactionSchema = createInsertSchema(transactions)

// Select schemas (for responses)
export const selectUserSchema = createSelectSchema(users)
export const selectGameAccountSchema = createSelectSchema(gameAccounts)
export const selectTransactionSchema = createSelectSchema(transactions)

// Types for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type GameAccount = typeof gameAccounts.$inferSelect
export type Transaction = typeof transactions.$inferSelect