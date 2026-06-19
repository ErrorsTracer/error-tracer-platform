'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();

    if (!existingTables.includes('usage')) {
      return;
    }

    const columns = await queryInterface.describeTable('usage');

    if (columns.totalErrorBytes && columns.totalErrorCount && columns.userId) {
      await ensureIndexes(queryInterface);
      return;
    }

    if (!columns.payloadSizeBytes) {
      throw new Error('Cannot aggregate usage rows without byte data.');
    }

    if (!columns.applicationId && !columns.errorId && !columns.appKey) {
      throw new Error('Cannot aggregate usage rows without application data.');
    }

    let applicationIdExpression = 'u."applicationId"';
    let legacyJoins = '';

    if (!columns.applicationId && columns.errorId && columns.appKey) {
      applicationIdExpression =
        'COALESCE(e."applicationId", env."applicationId")';
      legacyJoins = `
        LEFT JOIN "errors-logs" AS e ON e.id = u."errorId"
        LEFT JOIN environments AS env ON env."appKey" = u."appKey"
      `;
    } else if (!columns.applicationId && columns.errorId) {
      applicationIdExpression = 'e."applicationId"';
      legacyJoins = `
        LEFT JOIN "errors-logs" AS e ON e.id = u."errorId"
      `;
    } else if (!columns.applicationId) {
      applicationIdExpression = 'env."applicationId"';
      legacyJoins = `
        LEFT JOIN environments AS env ON env."appKey" = u."appKey"
      `;
    }

    const [unmatchedRows] = await queryInterface.sequelize.query(`
      SELECT COUNT(*)::integer AS count
      FROM usage AS u
      ${legacyJoins}
      WHERE ${applicationIdExpression} IS NULL
    `);

    if (Number(unmatchedRows[0].count) > 0) {
      throw new Error(
        'Unable to aggregate usage rows that cannot be associated with an application.',
      );
    }

    await queryInterface.createTable('usage_aggregate_next', {
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

    await queryInterface.sequelize.query(`
      INSERT INTO usage_aggregate_next (
        id,
        "userId",
        "applicationId",
        "totalErrorBytes",
        "totalErrorCount",
        "createdAt",
        "updatedAt"
      )
      SELECT
        MIN(u.id::text)::uuid,
        a."ownerId",
        ${applicationIdExpression},
        SUM(u."payloadSizeBytes"::bigint),
        COUNT(*)::bigint,
        MIN(u."createdAt"),
        MAX(u."updatedAt")
      FROM usage AS u
      ${legacyJoins}
      INNER JOIN applications AS a ON a.id = ${applicationIdExpression}
      GROUP BY a."ownerId", ${applicationIdExpression}
    `);

    await queryInterface.dropTable('usage');
    await queryInterface.renameTable('usage_aggregate_next', 'usage');
    await ensureIndexes(queryInterface);
  },

  async down() {
    throw new Error(
      'Aggregate usage cannot be expanded back into per-error usage rows.',
    );
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
