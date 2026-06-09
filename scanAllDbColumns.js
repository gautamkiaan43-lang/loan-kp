const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all tables in the database...');
  // Find all tables using raw query on information_schema
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
  `;

  console.log(`Found ${tables.length} tables. Scanning columns...`);
  
  for (const t of tables) {
    const tableName = t.TABLE_NAME || t.table_name;
    // Get columns for this table
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = '${tableName}'
    `);

    for (const col of columns) {
      const colName = col.COLUMN_NAME || col.column_name;
      const dataType = col.DATA_TYPE || col.data_type;

      // Only scan character/text/JSON columns
      if (['varchar', 'text', 'longtext', 'json', 'char', 'mediumtext'].includes(dataType.toLowerCase())) {
        // Run query to find rows containing '$' in this column
        // Skip user.password to avoid bcrypt hashes containing '$'
        if (tableName.toLowerCase() === 'user' && colName.toLowerCase() === 'password') {
          continue;
        }

        try {
          const rows = await prisma.$queryRawUnsafe(`
            SELECT * FROM \`${tableName}\` 
            WHERE \`${colName}\` LIKE '%$%'
          `);

          if (rows.length > 0) {
            console.log(`Found ${rows.length} matches in table "${tableName}", column "${colName}":`);
            rows.forEach((row, idx) => {
              // Print a subset of the row
              console.log(`  Row ${idx+1}: ID=${row.id || 'N/A'}, Value=${String(row[colName]).slice(0, 100)}`);
            });
          }
        } catch (err) {
          // JSON columns might fail standard LIKE queries, handle separately if needed
          if (dataType.toLowerCase() === 'json') {
            try {
              const allRows = await prisma.$queryRawUnsafe(`SELECT * FROM \`${tableName}\``);
              allRows.forEach((row, idx) => {
                const str = JSON.stringify(row[colName]);
                if (str && str.includes('$')) {
                  console.log(`Found match in JSON table "${tableName}", column "${colName}":`);
                  console.log(`  Row ${idx+1}: ID=${row.id || 'N/A'}, Value=${str.slice(0, 100)}`);
                }
              });
            } catch (jsonErr) {
              // Ignore
            }
          }
        }
      }
    }
  }
  console.log('Database scan completed.');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
