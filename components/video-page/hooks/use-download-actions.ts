'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type {
  BunnyDownloadPreference,
  Comment,
  DownloadTarget,
  Version,
  VideoData,
} from '@/components/video-page/types';

interface UseDownloadActionsParams {
  activeVersion: (Version & { comments: Comment[] }) | undefined;
  video: VideoData | null;
}

export function useDownloadActions({ activeVersion, video }: UseDownloadActionsParams) {
  const [activeDownloadTarget, setActiveDownloadTarget] = useState<DownloadTarget | null>(null);
  const isDownloadingVideo = activeDownloadTarget !== null;

  const startDownload = useCallback(
    async (preference: BunnyDownloadPreference = 'compressed') => {
      if (!activeVersion || !video || isDownloadingVideo) return;
      if (!video.canDownload) {
        toast.error('Download is disabled for this shared link');
        return;
      }
      if (activeVersion.providerId !== 'bunny' && activeVersion.providerId !== 'direct') {
        toast.error('This video source does not support direct download');
        return;
      }

      const target: DownloadTarget = activeVersion.providerId === 'bunny' ? preference : 'direct';
      setActiveDownloadTarget(target);
      try {
        let downloadUrl: string | null = null;

        if (activeVersion.providerId === 'bunny') {
          const prepareRes = await fetch(
            `/api/versions/${activeVersion.id}/download?source=${preference}&prepare=1`,
            {
              cache: 'no-store',
            }
          );

          if (!prepareRes.ok) {
            const prepareBody = await prepareRes.json().catch(() => null);
            const fallbackError =
              preference === 'original'
                ? 'Original file is not available for this video'
                : 'Compressed file is not available for this video';
            const errorMessage =
              typeof prepareBody?.error === 'string' ? prepareBody.error : fallbackError;
            throw new Error(errorMessage);
          }

          downloadUrl = `/api/versions/${activeVersion.id}/download?source=${preference}`;
        } else {
          downloadUrl = `/api/versions/${activeVersion.id}/download`;
        }

        if (!downloadUrl) {
          throw new Error('Missing download URL');
        }

        const a = document.createElement('a');
        a.href = downloadUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (error) {
        console.error('Failed to start video download:', error);
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error('Failed to start download');
        }
      } finally {
        setActiveDownloadTarget(null);
      }
    },
    [activeVersion, video, isDownloadingVideo]
  );

  return {
    activeDownloadTarget,
    isDownloadingVideo,
    startDownload,
  };
}
