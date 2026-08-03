import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Parse a Cloudinary CDN URL into its parts
function parseCloudinaryUrl(url: string) {
  const m = url.match(
    /res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:s--[^-]+--)?\/?(?:v(\d+)\/)?(.+)/,
  );
  if (!m) return null;
  const filePart = m[4]; // e.g. "abc123.pdf"
  const dot = filePart.lastIndexOf('.');
  return {
    cloudName:    m[1],
    resourceType: m[2] as 'image' | 'video' | 'raw',
    version:      m[3] || '',
    publicId:     dot >= 0 ? filePart.slice(0, dot) : filePart,
    format:       dot >= 0 ? filePart.slice(dot + 1) : '',
  };
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // If credentials are missing just attempt a direct proxy (fallback)
  if (!apiKey || !apiSecret) {
    const r = await fetch(rawUrl);
    return new NextResponse(r.body, {
      headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/octet-stream' },
    });
  }

  const info = parseCloudinaryUrl(rawUrl);
  if (!info) {
    // Non-Cloudinary URL — proxy directly
    const r = await fetch(rawUrl);
    return new NextResponse(r.body, {
      headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/octet-stream' },
    });
  }

  const { cloudName, resourceType, publicId, format } = info;

  // Build a Cloudinary private_download signed URL.
  // resource_type goes in the URL path and is NOT included in the signed string.
  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams: Record<string, string> = {
    attachment: 'false',
    public_id:  publicId,
    timestamp:  String(timestamp),
    type:       'upload',
  };
  const toSign =
    Object.keys(signedParams)
      .sort()
      .map(k => `${k}=${signedParams[k]}`)
      .join('&') + apiSecret;

  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  const qs = new URLSearchParams({
    ...signedParams,
    resource_type: resourceType,
    api_key:       apiKey,
    signature,
  });
  const signedDownload = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/download?${qs}`;

  // Fetch from Cloudinary (server-to-server — no CDN token required)
  const r = await fetch(signedDownload, { redirect: 'follow' });
  if (!r.ok) {
    console.error('[/api/file] Cloudinary error', r.status, await r.text().catch(() => ''));
    return NextResponse.json({ error: `Upstream error ${r.status}` }, { status: r.status });
  }

  const contentType = r.headers.get('Content-Type') ?? (format === 'pdf' ? 'application/pdf' : 'application/octet-stream');
  return new NextResponse(r.body, {
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': `inline; filename="${publicId}.${format}"`,
      'Cache-Control':       'private, max-age=3600',
    },
  });
}
