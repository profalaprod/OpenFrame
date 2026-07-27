export interface MultipartUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

interface MultipartUploadResult {
  videoId: string;
  providerId: 'direct';
  url: string;
}

interface MultipartUploadOptions {
  projectId: string;
  file: File;
  onProgress?: (
    progress: MultipartUploadProgress
  ) => void;
  onStatus?: (status: string) => void;
}

const PART_SIZE = 50 * 1024 * 1024;

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function uploadPart(
  uploadUrl: string,
  blob: Blob,
  onProgress: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            `Storage upload failed (${xhr.status})`
          )
        );
        return;
      }

      const etag = xhr.getResponseHeader('ETag');

      if (!etag) {
        reject(
          new Error(
            'Storage did not return an ETag'
          )
        );
        return;
      }

      resolve(etag);
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Could not reach video storage'
        )
      );
    };

    xhr.onabort = () => {
      reject(
        new Error('Upload cancelled')
      );
    };

    xhr.send(blob);
  });
}

export async function uploadVideoMultipart({
  projectId,
  file,
  onProgress,
  onStatus,
}: MultipartUploadOptions): Promise<MultipartUploadResult> {
  onStatus?.('Initializing multipart upload...');

  const initResponse = await fetch(
    `/api/projects/${projectId}/videos/s3-multipart/init`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType:
          file.type || 'video/mp4',
        size: file.size,
      }),
    }
  );

  const initPayload = await readJson(initResponse);

  if (!initResponse.ok || !initPayload?.data) {
    throw new Error(
      initPayload?.error ||
        'Failed to initialize multipart upload'
    );
  }

  const {
    uploadId,
    key,
    videoId,
    videoUrl,
  } = initPayload.data;

  const partCount = Math.ceil(
    file.size / PART_SIZE
  );

  const completedParts: Array<{
    etag: string;
    partNumber: number;
  }> = [];

  let completedBytes = 0;

  for (
    let partNumber = 1;
    partNumber <= partCount;
    partNumber++
  ) {
    const start =
      (partNumber - 1) * PART_SIZE;

    const end = Math.min(
      start + PART_SIZE,
      file.size
    );

    const part = file.slice(start, end);

    onStatus?.(
      `Uploading part ${partNumber} of ${partCount}...`
    );

    const signResponse = await fetch(
      `/api/projects/${projectId}/videos/s3-multipart/part`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          key,
          uploadId,
          partNumber,
        }),
      }
    );

    const signPayload =
      await readJson(signResponse);

    if (
      !signResponse.ok ||
      !signPayload?.data?.uploadUrl
    ) {
      throw new Error(
        signPayload?.error ||
          `Failed to prepare part ${partNumber}`
      );
    }

    const etag = await uploadPart(
      signPayload.data.uploadUrl,
      part,
      (partUploadedBytes) => {
        const uploadedBytes =
          completedBytes +
          partUploadedBytes;

        const percentage = Number(
          (
            (uploadedBytes /
              file.size) *
            100
          ).toFixed(1)
        );

        onProgress?.({
          uploadedBytes,
          totalBytes: file.size,
          percentage,
        });
      }
    );

    completedParts.push({
      etag,
      partNumber,
    });

    completedBytes += part.size;

    onProgress?.({
      uploadedBytes: completedBytes,
      totalBytes: file.size,
      percentage: Number(
        (
          (completedBytes /
            file.size) *
          100
        ).toFixed(1)
      ),
    });
  }

  onStatus?.('Completing upload...');

  const completeResponse = await fetch(
    `/api/projects/${projectId}/videos/s3-multipart/complete`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        key,
        uploadId,
        parts: completedParts,
      }),
    }
  );

  const completePayload =
    await readJson(completeResponse);

  if (
    !completeResponse.ok ||
    !completePayload?.data
  ) {
    throw new Error(
      completePayload?.error ||
        'Failed to complete multipart upload'
    );
  }

  onStatus?.('Saving video...');

  return {
    videoId:
      completePayload.data.videoId ||
      videoId,
    providerId: 'direct',
    url:
      completePayload.data.videoUrl ||
      videoUrl,
  };
}
