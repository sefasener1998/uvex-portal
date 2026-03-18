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
    const { email, type, pwHash, tempPw, portalUrl } = JSON.parse(event.body);

    if (!email || !type || !pwHash || !tempPw) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, message: 'Fehlende Pflichtfelder.' }) };
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check user exists
    const existing = await sql`
      SELECT id, name FROM users
      WHERE LOWER(email) = LOWER(${email}) AND type = ${type}
      LIMIT 1
    `;

    if (existing.length === 0) {
      // Return success anyway (security: don't reveal if email exists)
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // Update password hash in Neon
    await sql`
      UPDATE users
      SET pw_hash = ${pwHash}
      WHERE LOWER(email) = LOWER(${email}) AND type = ${type}
    `;

    // Send email via Make webhook (fire & forget)
    const userName = existing[0].name || email;
    fetch('https://hook.eu1.make.com/gp6741htb42abcggv11qhpi2lfbu1cxm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:     'password_reset',
        email,
        name:      userName,
        tempPw,
        type,
        portalUrl: portalUrl || 'https://glistening-pika-00f3a9.netlify.app'
      })
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    console.error('Reset password error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, message: 'Serverfehler. Bitte erneut versuchen.' })
    };
  }
};
