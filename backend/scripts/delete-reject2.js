#!/usr/bin/env node

/**
 * Delete "Reject 2" by Conway from the database
 * This record was stored locally but has no market data,
 * so it should be removed to fetch fresh from Discogs
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function deleteReject2() {
  try {
    console.log('Deleting "Reject 2" by Conway from database...');

    const result = await prisma.release.deleteMany({
      where: {
        title: {
          contains: 'Reject',
          mode: 'insensitive',
        },
        artist: {
          contains: 'Conway',
          mode: 'insensitive',
        },
      },
    });

    console.log(`✅ Deleted ${result.count} record(s)`);

    if (result.count > 0) {
      console.log('Next search for "Reject 2" will fetch fresh data from Discogs');
    }
  } catch (error) {
    console.error('❌ Error deleting record:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteReject2();
