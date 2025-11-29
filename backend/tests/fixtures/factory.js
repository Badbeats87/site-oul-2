import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../src/utils/passwordUtils.js';

/**
 * Factory functions for creating test entities
 * These help maintain consistent test data structure
 */

/**
 * Create a test user object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test user object
 */
export function createTestUser(overrides = {}) {
  return {
    id: uuidv4(),
    email: 'buyer@example.com',
    name: 'Test Buyer',
    role: 'BUYER',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a seller user object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test seller object
 */
export function createTestSeller(overrides = {}) {
  return createTestUser({
    email: 'seller@example.com',
    name: 'Test Seller',
    role: 'SELLER',
    ...overrides,
  });
}

/**
 * Create an admin user object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test admin object
 */
export function createTestAdmin(overrides = {}) {
  return createTestUser({
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'ADMIN',
    ...overrides,
  });
}

/**
 * Create a test release (vinyl record) object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test release object
 */
export function createTestRelease(overrides = {}) {
  return {
    id: uuidv4(),
    title: 'Test Album',
    artist: 'Test Artist',
    releaseYear: 2023,
    format: 'LP',
    condition: 'MINT',
    price: 29.99,
    description: 'A test vinyl record',
    catalogNumber: 'CAT-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple test releases
 * @param {number} count - Number of releases to create
 * @param {Object} overrides - Properties to override defaults
 * @returns {Array} - Array of test releases
 */
export function createTestReleases(count = 5, overrides = {}) {
  return Array.from({ length: count }, (_, i) =>
    createTestRelease({
      id: uuidv4(),
      title: `Test Album ${i + 1}`,
      artist: `Test Artist ${i + 1}`,
      price: 20 + i * 5,
      ...overrides,
    })
  );
}

/**
 * Create a test release submission object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test submission object
 */
export function createTestSubmission(overrides = {}) {
  return {
    id: uuidv4(),
    userId: uuidv4(),
    title: 'Test Album for Review',
    artist: 'Test Artist',
    releaseYear: 2023,
    format: 'LP',
    condition: 'NEAR_MINT',
    estimatedPrice: 25.0,
    notes: 'Test submission notes',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test pricing policy object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test pricing policy object
 */
export function createTestPricingPolicy(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Standard Pricing',
    description: 'Standard pricing policy for all releases',
    isActive: true,
    rules: {
      baseMultiplier: 1.0,
      conditionMultipliers: {
        MINT: 2.0,
        NEAR_MINT: 1.8,
        VERY_GOOD_PLUS: 1.5,
        VERY_GOOD: 1.3,
        GOOD_PLUS: 1.1,
        GOOD: 1.0,
        FAIR: 0.8,
        POOR: 0.5,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create test inventory item object
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test inventory item object
 */
export function createTestInventoryItem(overrides = {}) {
  return {
    id: uuidv4(),
    releaseId: uuidv4(),
    quantity: 10,
    reserved: 0,
    available: 10,
    warehouseLocation: 'A1-01',
    lastRecount: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test registration request payload
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test registration payload
 */
export function createTestRegistrationPayload(overrides = {}) {
  return {
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    name: 'New Test User',
    role: 'BUYER',
    ...overrides,
  };
}

/**
 * Create a test login request payload
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test login payload
 */
export function createTestLoginPayload(overrides = {}) {
  return {
    email: 'test@example.com',
    password: 'TestPassword123!',
    ...overrides,
  };
}

/**
 * Create a test create release payload
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test create release payload
 */
export function createTestCreateReleasePayload(overrides = {}) {
  return {
    title: 'New Test Album',
    artist: 'New Test Artist',
    releaseYear: 2024,
    format: 'LP',
    condition: 'MINT',
    price: 34.99,
    description: 'A new test vinyl record',
    ...overrides,
  };
}

/**
 * Create a test update release payload
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} - Test update release payload
 */
export function createTestUpdateReleasePayload(overrides = {}) {
  return {
    title: 'Updated Album Title',
    artist: 'Updated Artist Name',
    price: 29.99,
    ...overrides,
  };
}
