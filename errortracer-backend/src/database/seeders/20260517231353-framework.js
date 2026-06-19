'use strict';

const { v4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'frameworks',
      [
        {
          id: v4(),
          name: 'Next.js',
        },
        {
          id: v4(),
          name: 'Express.js',
        },
        {
          id: v4(),
          name: 'Nest.js',
        },
        {
          id: v4(),
          name: 'Node.js',
        },
        {
          id: v4(),
          name: 'React.js',
        },
        {
          id: v4(),
          name: 'Vue.js',
        },
        {
          id: v4(),
          name: 'Angular',
        },
        {
          id: v4(),
          name: 'Svelte',
        },
        {
          id: v4(),
          name: 'Django',
        },
        {
          id: v4(),
          name: 'Flask',
        },
        {
          id: v4(),
          name: 'Ruby on Rails',
        },
        {
          id: v4(),
          name: 'Laravel',
        },
        {
          id: v4(),
          name: 'Spring Boot',
        },
        {
          id: v4(),
          name: 'ASP.NET Core',
        },
        {
          id: v4(),
          name: 'Flutter',
        },
        {
          id: v4(),
          name: 'React Native',
        },
        {
          id: v4(),
          name: 'Ionic',
        },

        {
          id: v4(),
          name: 'Electron',
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
