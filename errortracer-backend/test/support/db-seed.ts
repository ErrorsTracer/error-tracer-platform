import { readdirSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import * as SequelizeCore from 'sequelize';
import { createTestSequelize } from './database';

type SequelizeSeeder = {
  up: (queryInterface: unknown, sequelize: unknown) => Promise<void>;
};

export async function seedTestDatabase() {
  const sequelize = createTestSequelize();
  const seedersPath = join(__dirname, '../../src/database/seeders');
  const requireSeeder = createRequire(__filename);

  try {
    const queryInterface = sequelize.getQueryInterface();
    const seeders = readdirSync(seedersPath)
      .filter((file) => file.endsWith('.js'))
      .sort();

    for (const seederFile of seeders) {
      const seeder = requireSeeder(
        join(seedersPath, seederFile),
      ) as SequelizeSeeder;
      await seeder.up(queryInterface, SequelizeCore);
    }
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seedTestDatabase().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
