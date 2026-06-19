'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();

    if (!existingTables.includes('auth_sessions')) {
      await queryInterface.createTable('auth_sessions', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        refreshTokenHash: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        revokedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
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

    const indexes = await queryInterface.showIndex('auth_sessions');
    const hasUserIndex = indexes.some((index) =>
      index.fields.some((field) => field.attribute === 'userId'),
    );

    if (!hasUserIndex) {
      await queryInterface.addIndex('auth_sessions', ['userId']);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auth_sessions');
  },
};
