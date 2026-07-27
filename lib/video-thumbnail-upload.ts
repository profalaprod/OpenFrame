export async function createAndUploadVideoThumbnail(
  file: File,
  videoId?: string
): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
      const video = document.createElement('video');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeAttribute('src');
        video.load();
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Could not load video for thumbnail'));
      };

      video.onloadedmetadata = () => {
        const targetTime =
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(1, video.duration / 2)
            : 0;

        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;

        if (!sourceWidth || !sourceHeight) {
          cleanup();
          reject(new Error('Video has no readable dimensions'));
          return;
        }

        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / sourceWidth);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sourceWidth * scale);
        canvas.height = Math.round(sourceHeight * scale);

        const context = canvas.getContext('2d');

        if (!context) {
          cleanup();
          reject(new Error('Could not create thumbnail canvas'));
          return;
        }

        context.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(
          (blob) => {
            cleanup();

            if (!blob) {
              reject(new Error('Could not generate thumbnail'));
              return;
            }

            resolve(blob);
          },
          'image/jpeg',
          0.85
        );
      };

      video.src = objectUrl;
    });

    const thumbnailFile = new File(
      [thumbnailBlob],
      `${file.name.replace(/\.[^.]+$/, '')}-thumbnail.jpg`,
      { type: 'image/jpeg' }
    );

    const formData = new FormData();
    formData.append('image', thumbnailFile);

    if (videoId) {
      formData.append('videoId', videoId);
    }

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as {
      data?: {
        url?: string;
      };
      error?: string;
    } | null;

    if (!response.ok || !payload?.data?.url) {
      throw new Error(
        payload?.error || 'Thumbnail upload failed'
      );
    }

    return payload.data.url;
  } catch (error) {
    console.error('Video thumbnail generation failed:', error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
