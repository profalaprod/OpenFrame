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

import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createPublicR2Client,
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

  const partNumber = Number(body?.partNumber);

  if (
    !key.startsWith(`videos/${projectId}/`) ||
    !uploadId ||
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > 10000
  ) {
    return apiErrors.badRequest(
      'Invalid multipart upload data'
    );
  }

  const client = createPublicR2Client();

  const uploadUrl = await getSignedUrl(
    client,
    new UploadPartCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 3600 }
  );

  client.destroy();

  return Response.json({
    data: { uploadUrl },
  });
}
