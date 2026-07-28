'use client';

import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  parseVideoUrl,
  getThumbnailUrl,
  fetchVideoMetadata,
  type VideoSource,
} from '@/lib/video-providers';
import type { VersionActionsConfig, VideoData } from '@/components/video-page/types';
import { uploadVideoMultipart } from '@/lib/uploads/multipart-video-upload';

interface UseVersionActionsParams extends VersionActionsConfig {
  setVideo: Dispatch<SetStateAction<VideoData | null>>;
  activeVersionId: string | null;
  setActiveVersionId: Dispatch<SetStateAction<string | null>>;
}

export function useVersionActions({
  projectId,
  videoId,
  bunnyUploadsEnabled = true,
  setVideo,
  activeVersionId,
  setActiveVersionId,
}: UseVersionActionsParams) {
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [newVersionUrl, setNewVersionUrl] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionSource, setNewVersionSource] = useState<VideoSource | null>(null);
  const [newVersionUrlError, setNewVersionUrlError] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const versionUploadAbortRef = useRef<AbortController | null>(null);
  const [newVersionMode, setNewVersionMode] = useState<'url' | 'file'>('url');
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionUploadProgress, setNewVersionUploadProgress] = useState(0);
  const [newVersionUploadStatus, setNewVersionUploadStatus] = useState('');

  const [showDeleteVersionDialog, setShowDeleteVersionDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);

  const handleNewVersionUrlChange = (url: string) => {
    setNewVersionUrl(url);
    setNewVersionUrlError('');
    if (!url.trim()) {
      setNewVersionSource(null);
      return;
    }
    const source = parseVideoUrl(url);
    if (source) {
      setNewVersionSource(source);
    } else {
      setNewVersionSource(null);
      if (url.length > 10) setNewVersionUrlError('Unsupported URL');
    }
  };

  const handleCreateVersion = async () => {
    if (!projectId) return;
    setIsCreatingVersion(true);
    setNewVersionUploadStatus('');
    setNewVersionUploadProgress(0);

    try {
      let finalVideoUrl = '';
      let finalProviderId = '';
      let finalProviderVideoId = '';
      let finalThumbnailUrl: string | null = null;
      let finalDuration: number | null = null;

      if (newVersionMode === 'url') {
        if (!newVersionSource) throw new Error('Invalid URL');
        const meta = await fetchVideoMetadata(newVersionSource);
        finalVideoUrl = newVersionSource.originalUrl;
        finalProviderId = newVersionSource.providerId;
        finalProviderVideoId = newVersionSource.videoId;
        finalThumbnailUrl = getThumbnailUrl(newVersionSource, 'large');
        finalDuration = meta?.duration || null;
      } else {
        if (!newVersionFile) throw new Error('No file selected');

        const abortController = new AbortController();
        versionUploadAbortRef.current = abortController;

        const uploadResult = await uploadVideoMultipart({
          signal: abortController.signal,
          projectId,
          file: newVersionFile,

          onProgress: ({ percentage }) => {
            setNewVersionUploadProgress(percentage);
          },

          onStatus: (status) => {
            setNewVersionUploadStatus(status);
          },
        });

        finalVideoUrl = uploadResult.url;
        finalProviderId = uploadResult.providerId;
        finalProviderVideoId = uploadResult.videoId;
        finalThumbnailUrl = null;
      }

      const res = await fetch(`/api/projects/${projectId}/videos/${videoId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: finalVideoUrl,
          providerId: finalProviderId,
          providerVideoId: finalProviderVideoId,
          versionLabel: newVersionLabel.trim() || null,
          thumbnailUrl: finalThumbnailUrl,
          duration: finalDuration,
          setActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create version');
      }

      const versionData = await res.json();
      let newVersion = versionData.data;

      // Direct file uploads do not have a thumbnail yet.
      // The version was created with setActive: true, so the existing
      // thumbnail endpoint will generate a thumbnail for this revision.
      if (newVersionMode === 'file' && finalProviderId === 'direct') {
        setNewVersionUploadStatus('Creating thumbnail...');

        try {
          const thumbnailResponse = await fetch(
            `/api/projects/${projectId}/videos/${videoId}/thumbnail`,
            { method: 'POST' }
          );

          if (thumbnailResponse.ok) {
            const thumbnailPayload = await thumbnailResponse.json();
            const generatedThumbnailUrl =
              thumbnailPayload?.data?.thumbnailUrl || null;

            if (generatedThumbnailUrl) {
              newVersion = {
                ...newVersion,
                thumbnailUrl: generatedThumbnailUrl,
              };
            }
          } else {
            const thumbnailPayload = await thumbnailResponse
              .json()
              .catch(() => null);

            console.error(
              'Version created, but thumbnail generation failed:',
              thumbnailPayload?.error || thumbnailResponse.status
            );
          }
        } catch (thumbnailError) {
          console.error(
            'Version created, but thumbnail generation failed:',
            thumbnailError
          );
        }
      }

      setVideo((prev) => {
        if (!prev) return prev;
        const updatedVersions = prev.versions.map((v) => ({ ...v, isActive: false }));
        updatedVersions.unshift({
          ...newVersion,
          comments: [],
        });
        return { ...prev, versions: updatedVersions };
      });
      setActiveVersionId(newVersion.id);
      setShowVersionDialog(false);
      setNewVersionUrl('');
      setNewVersionLabel('');
      setNewVersionSource(null);
      setNewVersionFile(null);
      setNewVersionUploadStatus('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setNewVersionUploadStatus('Upload cancelled');
        return;
      }

      const errorObj = err as Error;
      console.error('Failed to create version:', errorObj);
      toast.error(errorObj.message || 'Failed to create version');
    } finally {
      versionUploadAbortRef.current = null;
      setIsCreatingVersion(false);
    }
  };

  const cancelVersionUpload = () => {
    versionUploadAbortRef.current?.abort();
  };

  const resetVersionDialog = () => {
    if (versionUploadAbortRef.current) {
      versionUploadAbortRef.current.abort();
      versionUploadAbortRef.current = null;
    }

    setNewVersionUrl('');
    setNewVersionLabel('');
    setNewVersionSource(null);
    setNewVersionUrlError('');
    setNewVersionMode('url');
    setNewVersionFile(null);
    setNewVersionUploadProgress(0);
    setNewVersionUploadStatus('');
    setIsCreatingVersion(false);
  };

  const handleVersionDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isCreatingVersion) return;
      resetVersionDialog();
    }

    setShowVersionDialog(open);
  };

  const handleDeleteVersion = async () => {
    if (!versionToDelete || !projectId) return;
    setIsDeletingVersion(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/videos/${videoId}/versions/${versionToDelete}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setVideo((prev) => {
          if (!prev) return prev;
          const remaining = prev.versions.filter((v) => v.id !== versionToDelete);
          return { ...prev, versions: remaining };
        });

        if (activeVersionId === versionToDelete) {
          setVideo((prev) => {
            if (!prev) return prev;
            const remaining = prev.versions.filter((v) => v.id !== versionToDelete);
            if (remaining.length > 0) {
              setActiveVersionId(remaining[0].id);
            } else {
              setActiveVersionId(null);
            }
            return prev;
          });
        }

        setShowDeleteVersionDialog(false);
        setVersionToDelete(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete version');
      }
    } catch {
      toast.error('Failed to delete version');
    } finally {
      setIsDeletingVersion(false);
    }
  };

  return {
    showVersionDialog,
    setShowVersionDialog: handleVersionDialogOpenChange,
    newVersionUrl,
    newVersionLabel,
    setNewVersionLabel,
    newVersionSource,
    newVersionUrlError,
    isCreatingVersion,
    newVersionMode,
    setNewVersionMode,
    newVersionFile,
    setNewVersionFile,
    newVersionUploadProgress,
    newVersionUploadStatus,
    handleNewVersionUrlChange,
    handleCreateVersion,
    cancelVersionUpload,

    showDeleteVersionDialog,
    setShowDeleteVersionDialog,
    versionToDelete,
    setVersionToDelete,
    isDeletingVersion,
    handleDeleteVersion,
  };
}
