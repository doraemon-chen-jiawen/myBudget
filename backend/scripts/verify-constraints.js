const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '12345678',
  database: 'lazy_budget'
};

async function verifyConstraints() {
  try {
    const connection = await mysql.createConnection(dbConfig);

    console.log('Checking constraints on records table...\n');

    // Check all constraints on the records table
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'lazy_budget'
      AND TABLE_NAME = 'records'
    `);

    console.log('Current constraints:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.CONSTRAINT_NAME} (${constraint.CONSTRAINT_TYPE})`);
    });

    // Specifically check for amount constraints
    const [checkConstraints] = await connection.execute(`
      SELECT CHECK_CLAUSE
      FROM information_schema.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = 'lazy_budget'
      AND CONSTRAINT_NAME LIKE '%records%'
    `);

    if (checkConstraints.length > 0) {
      console.log('\nCheck constraints found:');
      checkConstraints.forEach(constraint => {
        console.log(`  - ${constraint.CHECK_CLAUSE}`);
      });
    } else {
      console.log('\nNo check constraints found (amount can be negative)');
    }

    // Check records table structure
    console.log('\nRecords table structure:');
    const [structure] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'lazy_budget'
      AND TABLE_NAME = 'records'
    `);

    structure.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${col.IS_NULLABLE} ${col.COLUMN_DEFAULT || ''}`);
    });

    await connection.end();
    console.log('\n✓ Verification complete');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyConstraints();