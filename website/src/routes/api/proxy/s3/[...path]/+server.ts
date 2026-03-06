import { PUBLIC_B2_BUCKET } from "$env/static/public";
import { s3Client } from "$lib/server/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
    const path = params.path;

    if (!path) {
        throw error(400, 'Path is required');
    }

    try {
        const s3Response = await s3Client.send(new GetObjectCommand({ Bucket: PUBLIC_B2_BUCKET, Key: path }));

        const contentType = s3Response.ContentType || 'application/octet-stream';
        const buffer = await s3Response.Body?.transformToByteArray();

        if (!buffer) {
            throw error(404, 'Object not found');
        }

        let cacheControl: string;

        if (path.includes('/coin/') || path.includes('coin-icon')) {
            cacheControl = 'public, max-age=31536000, immutable';
        } else if (path.includes('/avatars/') || path.includes('profile-') || path.includes('avatar')) {
            cacheControl = 'public, max-age=60';
        } else {
            cacheControl = 'public, max-age=86400';
        }

        return new Response(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    } catch (e) {
        console.error('Proxy error:', e);
        throw error(500, 'Failed to proxy S3 request');
    }
}
