const { Client } = require('pg');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const data = JSON.parse(event.body || '{}');
  const { name, size, crop, plantingDate, notes, status, coordinates } = data;

  if (!name || !size || !crop) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' })
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query(
      'INSERT INTO fields (name, size, crop, plantingDate, notes, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, size, crop, plantingDate, notes, status]
    );
    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ field: result.rows[0] })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
