import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  try {
    // Hash password for admin user
    // Password: Admin123!
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    // Seed admin user
    const admin = await prisma.adminUser.upsert({
      where: { email: 'admin@vinylcatalog.com' },
      update: {},
      create: {
        email: 'admin@vinylcatalog.com',
        name: 'System Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });
    console.log('✅ Admin user created:', admin.email);
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

    for (const releaseData of releases) {
      const release = await prisma.release.upsert({
        where: { id: `release-${releaseData.barcode}` },
        update: {},
        create: {
          ...releaseData,
          id: `release-${releaseData.barcode}`,
        },
      });
      console.log(`✅ Release created: ${release.title} by ${release.artist}`);
    }

    // Seed sample market snapshots
    const firstRelease = await prisma.release.findFirst();
    if (firstRelease) {
      const snapshot = await prisma.marketSnapshot.create({
        data: {
          releaseId: firstRelease.id,
          source: 'DISCOGS',
          statLow: 50.0,
          statMedian: 100.0,
          statHigh: 200.0,
          sampleSize: 15,
          fetchedAt: new Date(),
        },
      });
      console.log(`✅ Market snapshot created for ${firstRelease.title}`);
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
