import axios from 'axios';

export async function fetchFromMessari(assetSlug: string) {
  const apiKey = import.meta.env.MESSARI_API_KEY || '';
  if (!apiKey) throw new Error('Messari API Key missing');

  try {
    const res = await axios.get(
      `https://data.messari.io/api/v1/assets/${assetSlug}/profile`,
      { headers: { 'x-messari-api-key': apiKey } }
    );

    const data = res.data?.data;
    if (!data) throw new Error('Invalid response profile from Messari');

    return {
      tvl: 'N/A',
      fees24h: 'N/A',
      isAudited: !!data.profile?.governance?.security?.audits?.length,
    };
  } catch (err: any) {
    throw new Error(`Messari failed: ${err.message}`);
  }
}
