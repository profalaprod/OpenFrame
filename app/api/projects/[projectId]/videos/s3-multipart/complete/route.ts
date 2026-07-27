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

import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import {
  getR2PublicObjectUrl,
  r2Client,
  R2_BUCKET_NAME,
} from '@/lib/r2';

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params;

  if (!(await authorize(projectId))) {
    return apiErrors.forbidden('Access denied');
  }

  const body = await request.json().catch(() => null);

  const key =
    typeof body?.key === 'string' ? body.key : '';

  const uploadId =
    typeof body?.uploadId === 'string'
      ? body.uploadId
      : '';

  const parts: Array<{
    etag?: unknown;
    partNumber?: unknown;
  }> = Array.isArray(body?.parts)
    ? body.parts
    : [];

  if (
    !key.startsWith(`videos/${projectId}/`) ||
    !uploadId ||
    parts.length === 0
  ) {
    return apiErrors.badRequest(
      'Invalid multipart completion data'
    );
  }

  const normalizedParts = parts
    .map((part) => ({
      ETag:
        typeof part?.etag === 'string'
          ? part.etag
          : '',
      PartNumber: Number(part?.partNumber),
    }))
    .filter(
      (part) =>
        part.ETag &&
        Number.isInteger(part.PartNumber) &&
        part.PartNumber > 0
    )
    .sort(
      (a, b) =>
        a.PartNumber - b.PartNumber
    );

  if (normalizedParts.length !== parts.length) {
    return apiErrors.badRequest(
      'Invalid uploaded parts'
    );
  }

  await r2Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: normalizedParts,
      },
    })
  );

  return Response.json({
    data: {
      videoId: key,
      videoUrl: getR2PublicObjectUrl(key),
    },
  });
}
