import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const POLICY_ID = 'd0592202-5400-4526-ab2c-8f48cb3de154';

async function main() {
  console.log('========================================');
  console.log('Pricing Policy Update Script');
  console.log('========================================\n');

  try {
    // 1. Fetch the current policy
    console.log('Fetching current policy...');
    const currentPolicy = await prisma.pricingPolicy.findUnique({
      where: { id: POLICY_ID },
    });

    if (!currentPolicy) {
      console.error(`❌ Policy with ID ${POLICY_ID} not found!`);
      process.exit(1);
    }

    console.log('\n📋 BEFORE UPDATE:');
    console.log('================');
    console.log(`Policy ID: ${currentPolicy.id}`);
    console.log(`Name: ${currentPolicy.name}`);
    console.log(`Scope: ${currentPolicy.scope}`);
    console.log(`Active: ${currentPolicy.isActive}`);
    console.log(`Version: ${currentPolicy.version}`);
    console.log('\nCurrent buyFormula:');
    console.log(JSON.stringify(currentPolicy.buyFormula, null, 2));
    console.log('\nCurrent sellFormula:');
    console.log(JSON.stringify(currentPolicy.sellFormula, null, 2));
    console.log('\nCurrent conditionCurve:');
    console.log(JSON.stringify(currentPolicy.conditionCurve, null, 2));

    // 2. Prepare updated buyFormula
    const updatedBuyFormula = {
      ...currentPolicy.buyFormula,
      buyPercentage: 0.9,
      priceStatistic: 'LOW',
    };

    console.log('\n\n🔄 APPLYING UPDATES:');
    console.log('===================');
    console.log('Changes to buyFormula:');
    console.log(`  - buyPercentage: ${currentPolicy.buyFormula.buyPercentage} → 0.9`);
    console.log(`  - priceStatistic: ${currentPolicy.buyFormula.priceStatistic} → LOW`);

    // 3. Update the policy
    const updatedPolicy = await prisma.pricingPolicy.update({
      where: { id: POLICY_ID },
      data: {
        buyFormula: updatedBuyFormula,
        version: currentPolicy.version + 1,
        updatedAt: new Date(),
      },
    });

    console.log('\n✅ Policy updated successfully!');

    // 4. Display the updated policy
    console.log('\n\n📋 AFTER UPDATE:');
    console.log('===============');
    console.log(`Policy ID: ${updatedPolicy.id}`);
    console.log(`Name: ${updatedPolicy.name}`);
    console.log(`Scope: ${updatedPolicy.scope}`);
    console.log(`Active: ${updatedPolicy.isActive}`);
    console.log(`Version: ${updatedPolicy.version}`);
    console.log('\nUpdated buyFormula:');
    console.log(JSON.stringify(updatedPolicy.buyFormula, null, 2));
    console.log('\nSellFormula (unchanged):');
    console.log(JSON.stringify(updatedPolicy.sellFormula, null, 2));
    console.log('\nConditionCurve (unchanged):');
    console.log(JSON.stringify(updatedPolicy.conditionCurve, null, 2));

    console.log('\n========================================');
    console.log('Update completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error updating pricing policy:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
