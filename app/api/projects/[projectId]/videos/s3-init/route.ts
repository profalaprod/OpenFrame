import { NextRequest } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { auth, checkProjectAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiErrors, successResponse, withCacheControl } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';
import {
  createPublicR2Client,
  ensureR2BucketExists,
  getR2PublicObjectUrl,
  R2_BUCKET_NAME,
} from '@/lib/r2';
import { logError } from '@/lib/logger';
import { enforceStorageQuota } from '@/lib/storage-quota';

type RouteParams = { params: Promise<{ projectId: string }> };

const DEFAULT_MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

function getMaxVideoBytes(): number {
  const configured = Number(process.env.OPENFRAME_MAX_VIDEO_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_VIDEO_BYTES;
}

function sanitizeExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || 'mp4';
  return /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'mp4';
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const limited = await rateLimit(request, 'mutate');
    if (limited) return limited;

    const session = await auth();
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { projectId } = await params;

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        workspaceId: true,
        visibility: true,
        workspace: { select: { ownerId: true } },
      },
    });

    if (!project) return apiErrors.notFound('Project');

    const access = await checkProjectAccess(project, session.user.id, {
      intent: 'manage',
    });

    if (!access.canEdit) return apiErrors.forbidden('Access denied');

    if (process.env.OPENFRAME_ENABLE_S3_VIDEO_UPLOADS !== 'true') {
      return apiErrors.badRequest('S3 video uploads are disabled');
    }

    const body = await request.json().catch(() => null);
    const filename =
      typeof body?.filename === 'string' ? body.filename.trim() : '';
    const contentType =
      typeof body?.contentType === 'string'
        ? body.contentType.trim()
        : 'video/mp4';
    const size = Number(body?.size);

    if (!filename || !Number.isFinite(size) || size <= 0) {
      return apiErrors.badRequest('Valid filename and file size are required');
    }

    if (!contentType.startsWith('video/')) {
      return apiErrors.badRequest('Only video files are allowed');
    }

    if (size > getMaxVideoBytes()) {
      return apiErrors.badRequest('Video exceeds the maximum upload size');
    }

    const quotaError = await enforceStorageQuota(
      project.workspace.ownerId,
      BigInt(size)
    );
    if (quotaError) return quotaError;

    await ensureR2BucketExists();

    const extension = sanitizeExtension(filename);
    const objectId = crypto.randomUUID();
    const key = `videos/${projectId}/${objectId}.${extension}`;

    const publicClient = createPublicR2Client();

    const uploadUrl = await getSignedUrl(
      publicClient,
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 3600 }
    );

    publicClient.destroy();

    const response = successResponse({
      uploadUrl,
      videoUrl: getR2PublicObjectUrl(key),
      videoId: key,
    });

    return withCacheControl(response, 'private, no-store');
  } catch (error) {
    logError('Error initializing S3 video upload:', error);
    return apiErrors.internalError('Failed to initialize video upload');
  }
}
