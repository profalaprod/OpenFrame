import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';
import {
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import { auth, checkProjectAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getR2PublicObjectUrl,
  r2Client,
  R2_BUCKET_NAME,
} from '@/lib/r2';
import {
  apiErrors,
  successResponse,
  withCacheControl,
} from '@/lib/api-response';
import { logError } from '@/lib/logger';

type RouteParams = {
  params: Promise<{
    projectId: string;
    videoId: string;
  }>;
};

async function streamToBuffer(
  body: unknown
): Promise<Buffer> {
  if (
    body &&
    typeof body === 'object' &&
    'transformToByteArray' in body &&
    typeof (body as {
      transformToByteArray?: unknown;
    }).transformToByteArray === 'function'
  ) {
    const bytes = await (
      body as {
        transformToByteArray: () => Promise<Uint8Array>;
      }
    ).transformToByteArray();

    return Buffer.from(bytes);
  }

  throw new Error('Storage response body cannot be converted to a buffer');
}

async function runFfmpeg(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      '1',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=min(1280\\,iw):-2',
      '-q:v',
      '3',
      outputPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', reject);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `FFmpeg exited with code ${code}: ${stderr.slice(-2000)}`
        )
      );
    });
  });
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  let workDir: string | null = null;

  try {
    const session = await auth();
    const { projectId, videoId } = await params;

    console.log('[THUMBNAIL] Route called', {
      projectId,
      videoId,
      hasSession: !!session?.user?.id,
    });

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const video = await db.video.findFirst({
      where: {
        id: videoId,
        projectId,
      },
      include: {
        project: true,
        versions: {
          where: {
            isActive: true,
          },
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!video) {
      console.error('[THUMBNAIL] Video not found', {
        projectId,
        videoId,
      });
      return apiErrors.notFound('Video');
    }

    console.log('[THUMBNAIL] Video found', {
      videoId: video.id,
      versions: video.versions.length,
    });

    const access = await checkProjectAccess(
      video.project,
      session.user.id,
      { intent: 'manage' }
    );

    if (!access.canEdit) {
      console.error('[THUMBNAIL] Access denied', {
        videoId,
        userId: session.user.id,
      });
      return apiErrors.forbidden('Access denied');
    }

    console.log('[THUMBNAIL] Access granted');

    const activeVersion = video.versions[0];

    if (!activeVersion) {
      return apiErrors.badRequest(
        'Video has no active version'
      );
    }

    if (activeVersion.providerId !== 'direct') {
      return apiErrors.badRequest(
        'Thumbnail generation is only supported for direct uploads'
      );
    }

    /*
     * For direct uploads, videoId normally contains the MinIO object key:
     * videos/<projectId>/<uuid>.mp4
     *
     * Older records may contain a complete public URL instead.
     */
    let objectKey = activeVersion.videoId.trim();

    if (
      objectKey.startsWith('http://') ||
      objectKey.startsWith('https://')
    ) {
      const parsedUrl = new URL(objectKey);
      const bucketPrefix = `/${R2_BUCKET_NAME}/`;

      if (parsedUrl.pathname.startsWith(bucketPrefix)) {
        objectKey = parsedUrl.pathname.slice(
          bucketPrefix.length
        );
      } else {
        objectKey = parsedUrl.pathname.replace(/^\/+/, '');
      }
    }

    if (!objectKey.startsWith('videos/')) {
      console.error('[THUMBNAIL] Invalid storage key', {
        objectKey,
      });
      return apiErrors.badRequest(
        'Could not determine video storage key'
      );
    }

    console.log('[THUMBNAIL] Reading video from storage', {
      bucket: R2_BUCKET_NAME,
      objectKey,
    });

    const object = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
      })
    );

    if (!object.Body) {
      throw new Error('Video object has no response body');
    }

    const videoBuffer = await streamToBuffer(object.Body);

    console.log('[THUMBNAIL] Video downloaded', {
      bytes: videoBuffer.length,
    });

    workDir = join(
      tmpdir(),
      `openframe-thumbnail-${randomUUID()}`
    );

    await mkdir(workDir, {
      recursive: true,
    });

    const inputPath = join(workDir, 'input.mp4');
    const outputPath = join(workDir, 'thumbnail.jpg');

    await writeFile(inputPath, videoBuffer);

    console.log('[THUMBNAIL] Starting FFmpeg');

    await runFfmpeg(inputPath, outputPath);

    console.log('[THUMBNAIL] FFmpeg completed');

    const thumbnailBuffer = await readFile(outputPath);

    console.log('[THUMBNAIL] Thumbnail generated', {
      bytes: thumbnailBuffer.length,
    });
    const thumbnailFilename = `${randomUUID()}.jpg`;
    const thumbnailKey = `images/${thumbnailFilename}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      })
    );

    /*
     * Use the existing authenticated image proxy instead of exposing
     * a separate direct storage URL in the database.
     */
    const thumbnailUrl =
      `/api/upload/image/${thumbnailFilename}`;

    await db.videoVersion.update({
      where: {
        id: activeVersion.id,
      },
      data: {
        thumbnailUrl,
      },
    });

    console.log('[THUMBNAIL] SUCCESS', {
      videoId,
      versionId: activeVersion.id,
      thumbnailUrl,
      thumbnailKey,
    });

    const response = successResponse({
      thumbnailUrl,
      storageUrl: getR2PublicObjectUrl(thumbnailKey),
    });

    return withCacheControl(
      response,
      'private, no-store'
    );
  } catch (error) {
    logError(
      'Server thumbnail generation failed:',
      error
    );

    return apiErrors.internalError(
      'Failed to generate video thumbnail'
    );
  } finally {
    if (workDir) {
      await rm(workDir, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
    }
  }
}
