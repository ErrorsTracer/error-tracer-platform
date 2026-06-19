'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingColumns = await queryInterface.describeTable('errors-logs');
    const columns = {
      environment: Sequelize.STRING,
      framework: Sequelize.STRING,
      language: Sequelize.STRING,
      runtime: Sequelize.STRING,
      level: Sequelize.STRING,
      name: Sequelize.STRING,
      fingerprint: Sequelize.STRING,
      handled: Sequelize.BOOLEAN,
      timestamp: Sequelize.DATE,
      release: Sequelize.STRING,
      url: Sequelize.TEXT,
      transaction: Sequelize.STRING,
      user: Sequelize.JSONB,
      request: Sequelize.JSONB,
      tags: Sequelize.JSONB,
      extra: Sequelize.JSONB,
      breadcrumbs: Sequelize.JSONB,
      contexts: Sequelize.JSONB,
    };

    for (const [columnName, type] of Object.entries(columns)) {
      if (!existingColumns[columnName]) {
        await queryInterface.addColumn('errors-logs', columnName, {
          type,
          allowNull: true,
        });
      }
    }

    const indexes = await queryInterface.showIndex('errors-logs');
    const indexedColumns = new Set(
      indexes.flatMap((index) => index.fields.map((field) => field.attribute)),
    );

    for (const columnName of [
      'applicationId',
      'environment',
      'level',
      'timestamp',
      'createdAt',
      'fingerprint',
      'framework',
    ]) {
      if (!indexedColumns.has(columnName)) {
        await queryInterface.addIndex('errors-logs', [columnName]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('errors-logs', ['framework']);
    await queryInterface.removeIndex('errors-logs', ['fingerprint']);
    await queryInterface.removeIndex('errors-logs', ['createdAt']);
    await queryInterface.removeIndex('errors-logs', ['timestamp']);
    await queryInterface.removeIndex('errors-logs', ['level']);
    await queryInterface.removeIndex('errors-logs', ['environment']);
    await queryInterface.removeIndex('errors-logs', ['applicationId']);

    await queryInterface.removeColumn('errors-logs', 'contexts');
    await queryInterface.removeColumn('errors-logs', 'breadcrumbs');
    await queryInterface.removeColumn('errors-logs', 'extra');
    await queryInterface.removeColumn('errors-logs', 'tags');
    await queryInterface.removeColumn('errors-logs', 'request');
    await queryInterface.removeColumn('errors-logs', 'user');
    await queryInterface.removeColumn('errors-logs', 'transaction');
    await queryInterface.removeColumn('errors-logs', 'url');
    await queryInterface.removeColumn('errors-logs', 'release');
    await queryInterface.removeColumn('errors-logs', 'timestamp');
    await queryInterface.removeColumn('errors-logs', 'handled');
    await queryInterface.removeColumn('errors-logs', 'fingerprint');
    await queryInterface.removeColumn('errors-logs', 'name');
    await queryInterface.removeColumn('errors-logs', 'level');
    await queryInterface.removeColumn('errors-logs', 'runtime');
    await queryInterface.removeColumn('errors-logs', 'language');
    await queryInterface.removeColumn('errors-logs', 'framework');
    await queryInterface.removeColumn('errors-logs', 'environment');
  },
};
