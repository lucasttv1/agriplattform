// netlify/functions/getFields.js
const { Client } = require('pg');

exports.handler = async function (event, context) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query('SELECT * FROM fields ORDER BY id');
    await client.end();
    const fields = result.rows.map(row => ({
      ...row,
      coordinates: row.coordinates ? JSON.parse(row.coordinates) : null
    }));
    return {
      statusCode: 200,
      body: JSON.stringify({ fields })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
