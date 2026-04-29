const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '12345678',
  database: 'lazy_budget'
};

async function removeConstraint() {
  try {
    const connection = await mysql.createConnection(dbConfig);

    console.log('Connected to database');

    // Check if constraint exists
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'lazy_budget'
      AND TABLE_NAME = 'records'
      AND CONSTRAINT_NAME = 'ck_records_amount_positive'
    `);

    if (constraints.length > 0) {
      console.log('Found constraint ck_records_amount_positive');

      // Remove the constraint
      await connection.execute('ALTER TABLE records DROP CONSTRAINT ck_records_amount_positive');
      console.log('Successfully removed ck_records_amount_positive constraint');
    } else {
      console.log('Constraint ck_records_amount_positive not found');
    }

    await connection.end();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error removing constraint:', error.message);
    process.exit(1);
  }
}

removeConstraint();