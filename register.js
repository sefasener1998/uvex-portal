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
    const { email, pwHash, name, type, recId, dealerId, dealerRef, baId, date } = body;

    if (!email || !pwHash || !name || !type || !recId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, message: 'Fehlende Pflichtfelder.' }) };
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check if email already exists for this type
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) AND type = ${type} LIMIT 1
    `;

    if (existing.length > 0) {
      return { statusCode: 409, headers, body: JSON.stringify({ ok: false, error: 'email_exists', message: 'E-Mail bereits registriert.' }) };
    }

    // Insert new user
    const result = await sql`
      INSERT INTO users (rec_id, email, pw_hash, name, type, dealer_id, dealer_ref, ba_id, date)
      VALUES (${recId}, ${email.toLowerCase()}, ${pwHash}, ${name}, ${type}, ${dealerId || null}, ${dealerRef || null}, ${baId || null}, ${date || null})
      RETURNING id, rec_id, email, name, type, dealer_id, dealer_ref, ba_id, date, created_at
    `;

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
    console.error('Register error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, message: 'Serverfehler. Bitte erneut versuchen.' })
    };
  }
};
