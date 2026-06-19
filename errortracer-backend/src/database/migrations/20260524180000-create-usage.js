'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();

    if (!existingTables.includes('usage')) {
      await queryInterface.createTable('usage', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        applicationId: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        totalErrorBytes: {
          type: Sequelize.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        totalErrorCount: {
          type: Sequelize.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }

    const columns = await queryInterface.describeTable('usage');

    if (columns.totalErrorBytes && columns.totalErrorCount && columns.userId) {
      await ensureIndexes(queryInterface);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usage');
  },
};

async function ensureIndexes(queryInterface) {
  const indexes = await queryInterface.showIndex('usage');
  const names = new Set(indexes.map((index) => index.name));

  if (!names.has('usage_user_id_idx')) {
    await queryInterface.addIndex('usage', ['userId'], {
      name: 'usage_user_id_idx',
    });
  }

  if (!names.has('usage_application_id_unique')) {
    await queryInterface.addIndex('usage', ['applicationId'], {
      name: 'usage_application_id_unique',
      unique: true,
    });
  }

  if (!names.has('usage_user_application_idx')) {
    await queryInterface.addIndex('usage', ['userId', 'applicationId'], {
      name: 'usage_user_application_idx',
    });
  }

  if (!names.has('usage_created_at_idx')) {
    await queryInterface.addIndex('usage', ['createdAt'], {
      name: 'usage_created_at_idx',
    });
  }
}
