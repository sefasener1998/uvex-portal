const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, message: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, pwHash, type } = body;

    if (!email || !pwHash || !type) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, message: 'Fehlende Pflichtfelder.' }) };
    }

    const sql = neon(process.env.DATABASE_URL);

    // Find user by email + pwHash + type
    const result = await sql`
      SELECT id, rec_id, email, name, type, dealer_id, dealer_ref, ba_id, date, created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
        AND pw_hash = ${pwHash}
        AND type = ${type}
      LIMIT 1
    `;

    if (result.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'invalid_credentials', message: 'E-Mail oder Passwort falsch.' })
      };
    }

    const user = result[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        recId:     user.rec_id,
        name:      user.name,
        email:     user.email,
        type:      user.type,
        dealerId:  user.dealer_id,
        dealerRef: user.dealer_ref,
        baId:      user.ba_id,
        date:      user.date
      })
    };

  } catch (err) {
    console.error('Login error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, message: 'Serverfehler. Bitte erneut versuchen.' })
    };
  }
};
