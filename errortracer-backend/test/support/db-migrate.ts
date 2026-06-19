import { createTestSequelize } from './database';

export async function migrateTestDatabase() {
  const sequelize = createTestSequelize();

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrateTestDatabase().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
