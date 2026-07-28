import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import db from '@/lib/db';
import { logError } from '@/lib/logger';
import { getR2PublicObjectUrl, R2_BUCKET_NAME, r2Client } from '@/lib/r2';

function getObjectKey(url: string): string {
  const parsed = new URL(url);
  const pathname = decodeURIComponent(parsed.pathname);

  const bucketPrefix = `/${R2_BUCKET_NAME}/`;

  if (pathname.startsWith(bucketPrefix)) {
    return pathname.slice(bucketPrefix.length);
  }

  return pathname.replace(/^\/+/, '');
}

function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      [
        '-y',
        '-i',
        inputPath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-vf',
        "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '21',
        '-maxrate',
        '6M',
        '-bufsize',
        '12M',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
      }
    );

    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();

      // Prevent unbounded memory use on unusually long jobs.
      if (stderr.length > 20_000) {
        stderr = stderr.slice(-20_000);
      }
    });

    child.once('error', reject);

    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-4000)}`));
    });
  });
}

export async function processDirectPlayback(versionId: string): Promise<void> {
  const version = await db.videoVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      providerId: true,
      originalUrl: true,
      videoParentId: true,
      playbackStatus: true,
    },
  });

  if (!version) {
    throw new Error(`Video version ${versionId} not found`);
  }

  if (version.providerId !== 'direct') {
    return;
  }

  if (version.playbackStatus === 'PROCESSING' || version.playbackStatus === 'READY') {
    return;
  }

  await db.videoVersion.update({
    where: { id: version.id },
    data: {
      playbackStatus: 'PROCESSING',
      playbackError: null,
    },
  });

  const workDir = path.join(tmpdir(), `frame-playback-${randomUUID()}`);
  const inputPath = path.join(workDir, 'original');
  const outputPath = path.join(workDir, 'playback.mp4');

  try {
    await mkdir(workDir, { recursive: true });

    const sourceKey = getObjectKey(version.originalUrl);

    const source = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: sourceKey,
      })
    );

    if (!source.Body) {
      throw new Error('Storage object has no body');
    }

    await pipeline(
      source.Body as NodeJS.ReadableStream,
      createWriteStream(inputPath)
    );

    await runFfmpeg(inputPath, outputPath);

    const playbackKey =
      `playback/${version.videoParentId}/${version.id}.mp4`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: playbackKey,
        Body: createReadStream(outputPath),
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const playbackUrl = getR2PublicObjectUrl(playbackKey);

    await db.videoVersion.update({
      where: { id: version.id },
      data: {
        playbackUrl,
        playbackStatus: 'READY',
        playbackError: null,
      },
    });
  } catch (error) {
    logError(`Playback processing failed for version ${version.id}`, error);

    const message =
      error instanceof Error ? error.message.slice(0, 4000) : 'Playback processing failed';

    await db.videoVersion
      .update({
        where: { id: version.id },
        data: {
          playbackStatus: 'FAILED',
          playbackError: message,
        },
      })
      .catch((updateError) => {
        logError(`Failed to mark playback ${version.id} as FAILED`, updateError);
      });

    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
