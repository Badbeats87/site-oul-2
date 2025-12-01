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

    // Seed sample releases - expanded catalog with popular vinyl
    const releases = [
      // Hip-Hop / Rap
      { title: 'Alfredo', artist: 'The Alchemist & Boldy James', label: 'Drumwork', barcode: '748252078928', releaseYear: 2020, genre: 'Hip-Hop' },
      { title: 'Piñata', artist: 'Madvillain', label: 'Metal Face', barcode: '013929922821', releaseYear: 2004, genre: 'Hip-Hop' },
      { title: 'Illmatic', artist: 'Nas', label: 'Columbia', barcode: '5099749206821', releaseYear: 1994, genre: 'Hip-Hop' },
      { title: 'The Chronic', artist: 'Dr. Dre', label: 'Death Row', barcode: '12300000206821', releaseYear: 1992, genre: 'Hip-Hop' },
      { title: 'All Eyez on Me', artist: '2Pac', label: 'Death Row', barcode: '0788003582621', releaseYear: 1996, genre: 'Hip-Hop' },
      { title: 'Ready to Die', artist: 'Biggie Smalls', label: 'Bad Boy', barcode: '78612005622', releaseYear: 1994, genre: 'Hip-Hop' },
      { title: 'Reasonable Doubt', artist: 'Jay-Z', label: 'Roc-A-Fella', barcode: '999999999999', releaseYear: 1996, genre: 'Hip-Hop' },
      { title: 'Doggystyle', artist: 'Snoop Dogg', label: 'Death Row', barcode: '075992442523', releaseYear: 1993, genre: 'Hip-Hop' },
      { title: 'Aquemini', artist: 'Outkast', label: 'LaFace', barcode: '074646868824', releaseYear: 1998, genre: 'Hip-Hop' },
      { title: 'Liquid Swords', artist: 'GZA', label: 'Geffen', barcode: '078221450621', releaseYear: 1995, genre: 'Hip-Hop' },
      // Westside Gunn (as requested)
      { title: 'Hitler Wears Hermes', artist: 'Westside Gunn', label: 'Def Jam', barcode: '888072002626', releaseYear: 2015, genre: 'Hip-Hop' },
      { title: 'Pray for Paris', artist: 'Westside Gunn', label: 'Shady Records', barcode: '888072050720', releaseYear: 2020, genre: 'Hip-Hop' },
      { title: 'Gorilla Monsoon', artist: 'Westside Gunn', label: 'Griselda', barcode: '888072007627', releaseYear: 2017, genre: 'Hip-Hop' },
      { title: 'Supreme Blientele', artist: 'Your Old Droog', label: 'Mello Music', barcode: '888072008627', releaseYear: 2014, genre: 'Hip-Hop' },
      // Rock Classics
      { title: 'Kind of Blue', artist: 'Miles Davis', label: 'Columbia', barcode: '886977382620', releaseYear: 1959, genre: 'Jazz' },
      { title: 'The Dark Side of the Moon', artist: 'Pink Floyd', label: 'Harvest', barcode: '5099962173421', releaseYear: 1973, genre: 'Rock' },
      { title: 'Abbey Road', artist: 'The Beatles', label: 'Apple', barcode: '5099963381627', releaseYear: 1969, genre: 'Rock' },
      { title: 'Rumours', artist: 'Fleetwood Mac', label: 'Reprise', barcode: '075992222518', releaseYear: 1977, genre: 'Rock' },
      { title: 'Nevermind', artist: 'Nirvana', label: 'DGC', barcode: '075992442521', releaseYear: 1991, genre: 'Grunge' },
      { title: 'Led Zeppelin IV', artist: 'Led Zeppelin', label: 'Atlantic', barcode: '075992113321', releaseYear: 1971, genre: 'Rock' },
      { title: 'Bohemian Rhapsody', artist: 'Queen', label: 'EMI', barcode: '099925631221', releaseYear: 1975, genre: 'Rock' },
      { title: 'The Wall', artist: 'Pink Floyd', label: 'Harvest', barcode: '007361925323', releaseYear: 1979, genre: 'Rock' },
      { title: 'Hotel California', artist: 'Eagles', label: 'Asylum', barcode: '075992552321', releaseYear: 1976, genre: 'Rock' },
      { title: 'Rumours', artist: 'Fleetwood Mac', label: 'Reprise', barcode: '075992223321', releaseYear: 1977, genre: 'Pop' },
      // Pop / Other Genres
      { title: 'Thriller', artist: 'Michael Jackson', label: 'Epic', barcode: '074646849821', releaseYear: 1982, genre: 'Pop' },
      { title: 'Purple Rain', artist: 'Prince', label: 'Warner Bros', barcode: '075992441121', releaseYear: 1984, genre: 'Funk' },
      { title: 'Born to Run', artist: 'Bruce Springsteen', label: 'Columbia', barcode: '074646999821', releaseYear: 1975, genre: 'Rock' },
      { title: 'The Joshua Tree', artist: 'U2', label: 'Island', barcode: '042284444421', releaseYear: 1987, genre: 'Rock' },
      { title: 'Like a Prayer', artist: 'Madonna', label: 'Sire', barcode: '075992555821', releaseYear: 1989, genre: 'Pop' },
      { title: 'Who\'s Next', artist: 'The Who', label: 'Decca', barcode: '075992888821', releaseYear: 1971, genre: 'Rock' },
      { title: 'Boston', artist: 'Boston', label: 'Epic', barcode: '074646111121', releaseYear: 1976, genre: 'Rock' },
      { title: 'Appetite for Destruction', artist: 'Guns N\' Roses', label: 'Geffen', barcode: '075992223221', releaseYear: 1987, genre: 'Rock' },
      { title: 'The Beatles (White Album)', artist: 'The Beatles', label: 'Apple', barcode: '5099963381428', releaseYear: 1968, genre: 'Rock' },
      { title: 'Sgt. Pepper\'s', artist: 'The Beatles', label: 'Parlophone', barcode: '5099963381125', releaseYear: 1967, genre: 'Rock' },
      { title: 'A Night at the Opera', artist: 'Queen', label: 'EMI', barcode: '099925631429', releaseYear: 1975, genre: 'Rock' },
      { title: 'Rubber Soul', artist: 'The Beatles', label: 'Parlophone', barcode: '5099963381826', releaseYear: 1965, genre: 'Rock' },
      { title: 'Blood on the Tracks', artist: 'Bob Dylan', label: 'Columbia', barcode: '074646666821', releaseYear: 1975, genre: 'Folk' },
      { title: 'Harvest Moon', artist: 'Neil Young', label: 'Reprise', barcode: '075992999821', releaseYear: 1992, genre: 'Rock' },
      { title: 'Blue', artist: 'Joni Mitchell', label: 'Reprise', barcode: '075992111221', releaseYear: 1971, genre: 'Folk' },
      { title: 'Physical Graffiti', artist: 'Led Zeppelin', label: 'Swan Song', barcode: '075992224421', releaseYear: 1975, genre: 'Rock' },
      { title: 'Sticky Fingers', artist: 'Rolling Stones', label: 'Rolling Stones', barcode: '074646777821', releaseYear: 1971, genre: 'Rock' },
      { title: 'Exile Main St.', artist: 'Rolling Stones', label: 'Rolling Stones', barcode: '074646888821', releaseYear: 1972, genre: 'Rock' },
      { title: 'Let It Bleed', artist: 'Rolling Stones', label: 'Decca', barcode: '074646999921', releaseYear: 1969, genre: 'Rock' },
      { title: 'Live at Folsom Prison', artist: 'Johnny Cash', label: 'Columbia', barcode: '074646333321', releaseYear: 1968, genre: 'Country' },
      { title: 'Workingonit', artist: 'The Band', label: 'Capitol', barcode: '075992444521', releaseYear: 1969, genre: 'Rock' },
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

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
