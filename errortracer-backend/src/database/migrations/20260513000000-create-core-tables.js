'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const tables = new Set(existingTables.map(normalizeTableName));

    if (!tables.has('users')) {
      await queryInterface.createTable('users', {
        id: uuidPrimaryKey(Sequelize),
        firstName: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        avatar: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'default.png',
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        provider: {
          type: Sequelize.ENUM('local', 'google', 'github'),
          allowNull: false,
          defaultValue: 'local',
        },
        isSuspended: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isVerified: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdAt: timestamp(Sequelize),
        updatedAt: timestamp(Sequelize),
      });
    }

    await addIndexIfMissing(queryInterface, 'users', 'users_is_verified_idx', [
      'isVerified',
    ]);

    if (!tables.has('frameworks')) {
      await queryInterface.createTable('frameworks', {
        id: uuidPrimaryKey(Sequelize),
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        about: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
      });
    }

    if (!tables.has('applications')) {
      await queryInterface.createTable('applications', {
        id: uuidPrimaryKey(Sequelize),
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        about: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('active', 'suspended'),
          allowNull: false,
          defaultValue: 'active',
        },
        allowNotifications: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ownerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        frameworkId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'frameworks',
            key: 'id',
          },
          onUpdate: 'CASCADE',
        },
        createdAt: timestamp(Sequelize),
        updatedAt: timestamp(Sequelize),
      });
    }

    await addIndexIfMissing(
      queryInterface,
      'applications',
      'applications_owner_name_unique',
      ['ownerId', 'name'],
      { unique: true },
    );
    await addIndexIfMissing(
      queryInterface,
      'applications',
      'applications_status_idx',
      ['status'],
    );
    await addIndexIfMissing(
      queryInterface,
      'applications',
      'applications_owner_id_idx',
      ['ownerId'],
    );
    await addIndexIfMissing(
      queryInterface,
      'applications',
      'applications_framework_id_idx',
      ['frameworkId'],
    );

    if (!tables.has('application_memberships')) {
      await queryInterface.createTable('application_memberships', {
        id: uuidPrimaryKey(Sequelize),
        status: {
          type: Sequelize.ENUM(
            'active',
            'invited',
            'suspended',
            'revoked',
            'left',
          ),
          allowNull: false,
          defaultValue: 'active',
        },
        role: {
          type: Sequelize.ENUM('owner', 'admin', 'member'),
          allowNull: false,
          defaultValue: 'member',
        },
        joinedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        applicationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'applications',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
        },
        invitedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        createdAt: timestamp(Sequelize),
        updatedAt: timestamp(Sequelize),
      });
    }

    await addIndexIfMissing(
      queryInterface,
      'application_memberships',
      'application_memberships_application_id_idx',
      ['applicationId'],
    );
    await addIndexIfMissing(
      queryInterface,
      'application_memberships',
      'application_memberships_user_id_idx',
      ['userId'],
    );
    await addIndexIfMissing(
      queryInterface,
      'application_memberships',
      'application_memberships_invited_by_idx',
      ['invitedBy'],
    );

    if (!tables.has('environments')) {
      await queryInterface.createTable('environments', {
        id: uuidPrimaryKey(Sequelize),
        appKey: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true,
        },
        envName: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        isEnabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        applicationId: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: 'applications',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        createdAt: timestamp(Sequelize),
        updatedAt: timestamp(Sequelize),
      });
    }

    if (!tables.has('notifications')) {
      await queryInterface.createTable('notifications', {
        id: uuidPrimaryKey(Sequelize),
        type: {
          type: Sequelize.ENUM('application_invite'),
          allowNull: false,
        },
        message: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        isRead: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
        applicationId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'applications',
            key: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        createdAt: timestamp(Sequelize),
        updatedAt: timestamp(Sequelize),
      });
    }

    await addIndexIfMissing(
      queryInterface,
      'notifications',
      'notifications_user_id_idx',
      ['userId'],
    );
    await addIndexIfMissing(
      queryInterface,
      'notifications',
      'notifications_application_id_idx',
      ['applicationId'],
    );

    if (!tables.has('errors-logs')) {
      await queryInterface.createTable('errors-logs', {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
        },
        error: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        stack: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        additionalData: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        href: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        host: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        client: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        repeated: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 1,
        },
        clientAgent: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        clientPlatform: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        applicationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'applications',
            key: 'id',
          },
          onUpdate: 'CASCADE',
        },
        createdAt: timestamp(Sequelize),
        updatedAt: timestamp(Sequelize),
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('errors-logs');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('environments');
    await queryInterface.dropTable('application_memberships');
    await queryInterface.dropTable('applications');
    await queryInterface.dropTable('frameworks');
    await queryInterface.dropTable('users');

    await dropEnumTypes(queryInterface, [
      'enum_notifications_type',
      'enum_application_memberships_role',
      'enum_application_memberships_status',
      'enum_applications_status',
      'enum_users_provider',
    ]);
  },
};

function uuidPrimaryKey(Sequelize) {
  return {
    type: Sequelize.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  };
}

function timestamp(Sequelize) {
  return {
    type: Sequelize.DATE,
    allowNull: false,
  };
}

function normalizeTableName(table) {
  return typeof table === 'string' ? table : table.tableName;
}

async function addIndexIfMissing(
  queryInterface,
  tableName,
  indexName,
  fields,
  options = {},
) {
  const indexes = await queryInterface.showIndex(tableName);

  if (indexes.some((index) => index.name === indexName)) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, {
    ...options,
    name: indexName,
  });
}

async function dropEnumTypes(queryInterface, enumTypes) {
  for (const enumType of enumTypes) {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${enumType}";`);
  }
}
