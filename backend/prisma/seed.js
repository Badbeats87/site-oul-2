import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  try {
    // Hash password for admin user
    // Password: Admin123!
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    // Seed admin user (create if not exists, update password if exists)
    const admin = await prisma.adminUser.upsert({
      where: { email: 'admin@vinylcatalog.com' },
      update: { passwordHash },
      create: {
        email: 'admin@vinylcatalog.com',
        name: 'System Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });
    console.log('✅ Admin user ensured:', admin.email);
    console.log('   Email: admin@vinylcatalog.com');
    console.log('   Password: Admin123!');

    // Seed sample releases
    const releases = [
      {
        title: 'Kind of Blue',
        artist: 'Miles Davis',
        label: 'Columbia',
        catalogNumber: 'CS 8163',
        barcode: '886977382620',
        releaseYear: 1959,
        genre: 'Jazz',
        coverArtUrl: 'https://example.com/kind-of-blue.jpg',
        description: 'A landmark album in jazz history',
      },
      {
        title: 'The Dark Side of the Moon',
        artist: 'Pink Floyd',
        label: 'Harvest',
        catalogNumber: 'SHVL 804',
        barcode: '5099962173421',
        releaseYear: 1973,
        genre: 'Progressive Rock',
        coverArtUrl: 'https://example.com/dark-side.jpg',
        description: 'One of the best-selling albums of all time',
      },
      {
        title: 'Abbey Road',
        artist: 'The Beatles',
        label: 'Apple',
        catalogNumber: 'PCS 7088',
        barcode: '5099963381627',
        releaseYear: 1969,
        genre: 'Rock',
        coverArtUrl: 'https://example.com/abbey-road.jpg',
        description: 'The Beatles final recorded album',
      },
      {
        title: 'Rumours',
        artist: 'Fleetwood Mac',
        label: 'Reprise',
        catalogNumber: 'MSK 2225',
        barcode: '075992222518',
        releaseYear: 1977,
        genre: 'Rock',
        coverArtUrl: 'https://example.com/rumours.jpg',
        description: 'A masterpiece of pop-rock perfection',
      },
      {
        title: 'Nevermind',
        artist: 'Nirvana',
        label: 'DGC',
        catalogNumber: 'DGC-24425',
        barcode: '075992442521',
        releaseYear: 1991,
        genre: 'Grunge',
        coverArtUrl: 'https://example.com/nevermind.jpg',
        description: 'Changed the landscape of rock music',
      },
    ];

    const createdReleases = [];
    for (const releaseData of releases) {
      // Check if release already exists by barcode
      let release = await prisma.release.findFirst({
        where: { barcode: releaseData.barcode },
      });

      if (!release) {
        release = await prisma.release.create({
          data: {
            id: uuidv4(),
            ...releaseData,
          },
        });
      }
      createdReleases.push(release);
      console.log(`✅ Release: ${release.title} by ${release.artist}`);
    }

    // Seed sample market snapshots for all releases
    const marketData = [
      { releaseId: 0, statLow: 50.0, statMedian: 100.0, statHigh: 200.0, sampleSize: 15 },
      { releaseId: 1, statLow: 75.0, statMedian: 150.0, statHigh: 300.0, sampleSize: 22 },
      { releaseId: 2, statLow: 60.0, statMedian: 125.0, statHigh: 250.0, sampleSize: 18 },
      { releaseId: 3, statLow: 40.0, statMedian: 90.0, statHigh: 180.0, sampleSize: 12 },
      { releaseId: 4, statLow: 30.0, statMedian: 70.0, statHigh: 150.0, sampleSize: 10 },
    ];

    for (const market of marketData) {
      const release = createdReleases[market.releaseId];
      if (!release) continue;

      // Check if snapshot already exists
      const existingSnapshot = await prisma.marketSnapshot.findFirst({
        where: {
          releaseId: release.id,
          source: 'DISCOGS',
        },
      });

      if (!existingSnapshot) {
        await prisma.marketSnapshot.create({
          data: {
            id: uuidv4(),
            releaseId: release.id,
            source: 'DISCOGS',
            statLow: market.statLow,
            statMedian: market.statMedian,
            statHigh: market.statHigh,
            sampleSize: market.sampleSize,
            fetchedAt: new Date(),
            createdAt: new Date(),
          },
        });
        console.log(`✅ Market snapshot created for ${release.title}`);
      }
    }

    // Seed default BUYER pricing policy
    const existingBuyerPolicy = await prisma.pricingPolicy.findFirst({
      where: { scope: 'BUYER' },
    });

    if (!existingBuyerPolicy) {
      await prisma.pricingPolicy.create({
        data: {
          id: uuidv4(),
          scope: 'BUYER',
          name: 'Global Buyer Policy',
          version: 1,
          buyFormula: {
            percentage: 0.55,
            weights: {
              media: 0.6,
              sleeve: 0.4,
            },
          },
          sellFormula: {
            percentage: 0.0,
            weights: {
              media: 0.6,
              sleeve: 0.4,
            },
          },
          conditionCurve: {
            MINT: 1.1,
            NM: 1.0,
            VG_PLUS: 0.85,
            VG: 0.6,
            VG_MINUS: 0.45,
            G: 0.3,
            FAIR: 0.2,
            POOR: 0.1,
          },
          description:
            'Global buyer pricing - we buy records for 55% of median market price',
          isActive: true,
          offerExpiryDays: 30,
          createdAt: new Date(),
        },
      });
      console.log('✅ Default BUYER pricing policy created');
    }

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
