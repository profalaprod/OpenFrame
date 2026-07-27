import { NextRequest } from 'next/server';
import { auth, checkProjectAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiErrors } from '@/lib/api-response';

type RouteParams = { params: Promise<{ projectId: string }> };

async function authorize(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

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

  if (!project) return null;

  const access = await checkProjectAccess(
    project,
    session.user.id,
    { intent: 'manage' }
  );

  return access.canEdit ? project : null;
}

import crypto from 'crypto';
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import {
  ensureR2BucketExists,
  getR2PublicObjectUrl,
  r2Client,
  R2_BUCKET_NAME,
} from '@/lib/r2';

const MAX_BYTES = 5 * 1024 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params;
  const project = await authorize(projectId);

  if (!project) return apiErrors.forbidden('Access denied');

  const body = await request.json().catch(() => null);
  const filename =
    typeof body?.filename === 'string' ? body.filename : '';
  const contentType =
    typeof body?.contentType === 'string'
      ? body.contentType
      : 'video/mp4';
  const size = Number(body?.size);

  if (
    !filename ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_BYTES
  ) {
    return apiErrors.badRequest('Invalid video size');
  }

  if (!contentType.startsWith('video/')) {
    return apiErrors.badRequest('Only video files are allowed');
  }

  await ensureR2BucketExists();

  const extension =
    filename.split('.').pop()?.toLowerCase() || 'mp4';

  const safeExtension =
    /^[a-z0-9]{2,5}$/.test(extension)
      ? extension
      : 'mp4';

  const key =
    `videos/${projectId}/${crypto.randomUUID()}.${safeExtension}`;

  const result = await r2Client.send(
    new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
  );

  if (!result.UploadId) {
    return apiErrors.internalError(
      'Failed to initialize multipart upload'
    );
  }

  return Response.json({
    data: {
      uploadId: result.UploadId,
      key,
      videoId: key,
      videoUrl: getR2PublicObjectUrl(key),
    },
  });
}
