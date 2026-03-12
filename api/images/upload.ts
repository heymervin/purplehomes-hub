import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const contentType = (req.headers['content-type'] as string) || 'image/jpeg';
  const filename = (req.headers['x-filename'] as string) || `property-image-${Date.now()}.jpg`;

  const blob = await put(filename, req, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return res.status(200).json({ url: blob.url });
}

export const config = { api: { bodyParser: false } };
