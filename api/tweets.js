// api/tweets.js - Vercel Serverless Function

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { protocol } = req.query;
  const protocolName = protocol || 'Selected protocol';

  return res.status(200).json({
    tweets: [
      { id: '1', text: `${protocolName} is gaining momentum across the Mantle ecosystem 🚀`, date: '1h ago', sentiment: 'positive' },
      { id: '2', text: `${protocolName} TVL just hit a new high! DeFi summer on Mantle is real.`, date: '3h ago', sentiment: 'positive' },
    ],
    discordUpdates: [
      { id: '1', content: `Official update from ${protocolName}: New audit completed.`, date: '2h ago', channel: '#announcements' },
    ],
    overallSentiment: 82,
  });
}
