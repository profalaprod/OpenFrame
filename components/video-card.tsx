'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  MessageSquare,
  Clock,
  MoreVertical,
  Loader2,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Share2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  parseVideoUrl,
  fetchVideoMetadata,
  getThumbnailUrl,
  type VideoSource,
} from '@/lib/video-providers';
import { resolvePublicBunnyCdnHostname } from '@/lib/bunny-cdn';
import { uploadVideoMultipart } from '@/lib/uploads/multipart-video-upload';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnailUrl: string;
    currentVersion: number;
    latestVersion: number;
    newRevisionVersion: number | null;
    commentCount: number;
    duration: string;
    lastUpdated: string;
  };
  projectId: string;
  canManage: boolean;
  onDeleted?: (videoId: string) => void;
}

export function VideoCard({ video, projectId, canManage, onDeleted }: VideoCardProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState(video.title);
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Add Version dialog
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionUrl, setVersionUrl] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [versionSource, setVersionSource] = useState<VideoSource | null>(null);
  const [versionUrlError, setVersionUrlError] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [versionMode, setVersionMode] = useState<'url' | 'file'>('file');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionUploadProgress, setVersionUploadProgress] = useState(0);
  const [versionUploadStatus, setVersionUploadStatus] = useState('');
  const versionUploadAbortRef = useRef<AbortController | null>(null);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const bunnyCdnHostname = useMemo(() => resolvePublicBunnyCdnHostname(), []);
  const resolvedThumbnailUrl = useMemo(() => {
    if (!video.thumbnailUrl) return '';
    try {
      const parsed = new URL(video.thumbnailUrl);
      if (parsed.hostname === 'vz-thumbnail.b-cdn.net' && bunnyCdnHostname) {
        parsed.hostname = bunnyCdnHostname;
        return parsed.toString();
      }
      return parsed.toString();
    } catch {
      return video.thumbnailUrl;
    }
  }, [video.thumbnailUrl, bunnyCdnHostname]);

  const handleEdit = async () => {
    setIsSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || 'Failed to update video');
        return;
      }
      setShowEditDialog(false);
      router.refresh();
    } catch {
      setEditError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVersionUrlChange = (url: string) => {
    setVersionUrl(url);
    setVersionUrlError('');
    if (!url.trim()) {
      setVersionSource(null);
      return;
    }
    const source = parseVideoUrl(url);
    if (source) {
      setVersionSource(source);
    } else {
      setVersionSource(null);
      if (url.length > 10) setVersionUrlError('Unsupported URL');
    }
  };

  const handleCreateVersion = async () => {
    setIsCreatingVersion(true);
    setVersionUploadProgress(0);
    setVersionUploadStatus('');

    try {
      let finalVideoUrl = '';
      let finalProviderId = '';
      let finalProviderVideoId = '';
      let finalThumbnailUrl: string | null = null;
      let finalDuration: number | null = null;

      if (versionMode === 'url') {
        if (!versionSource) throw new Error('Invalid URL');

        const meta = await fetchVideoMetadata(versionSource);

        finalVideoUrl = versionSource.originalUrl;
        finalProviderId = versionSource.providerId;
        finalProviderVideoId = versionSource.videoId;
        finalThumbnailUrl = getThumbnailUrl(versionSource, 'large');
        finalDuration = meta?.duration || null;
      } else {
        if (!versionFile) throw new Error('No file selected');

        const abortController = new AbortController();
        versionUploadAbortRef.current = abortController;

        const uploadResult = await uploadVideoMultipart({
          signal: abortController.signal,
          projectId,
          file: versionFile,
          onProgress: ({ percentage }) => {
            setVersionUploadProgress(percentage);
          },
          onStatus: (status) => {
            setVersionUploadStatus(status);
          },
        });

        finalVideoUrl = uploadResult.url;
        finalProviderId = uploadResult.providerId;
        finalProviderVideoId = uploadResult.videoId;
      }

      const res = await fetch(`/api/projects/${projectId}/videos/${video.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: finalVideoUrl,
          providerId: finalProviderId,
          providerVideoId: finalProviderVideoId,
          versionLabel: versionLabel.trim() || null,
          thumbnailUrl: finalThumbnailUrl,
          duration: finalDuration,
          setActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create version');
      }

      if (versionMode === 'file' && finalProviderId === 'direct') {
        setVersionUploadStatus('Creating thumbnail...');

        try {
          const thumbnailResponse = await fetch(
            `/api/projects/${projectId}/videos/${video.id}/thumbnail`,
            { method: 'POST' }
          );

          if (!thumbnailResponse.ok) {
            const thumbnailPayload = await thumbnailResponse.json().catch(() => null);
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

      setShowVersionDialog(false);
      setVersionUrl('');
      setVersionLabel('');
      setVersionSource(null);
      setVersionFile(null);
      setVersionUploadProgress(0);
      setVersionUploadStatus('');
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setVersionUploadStatus('Upload cancelled');
        return;
      }

      console.error('Failed to create version:', err);
      setVersionUploadStatus(
        err instanceof Error ? err.message : 'Failed to create version'
      );
    } finally {
      versionUploadAbortRef.current = null;
      setIsCreatingVersion(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/videos/${video.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setShowDeleteDialog(false);
        onDeleted?.(video.id);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to delete video:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Card
          className={`group overflow-hidden transition-colors hover:bg-accent/50 cursor-pointer ${
            isDeleting ? 'pointer-events-none opacity-70' : ''
          }`}
        >
          <Link href={`/projects/${projectId}/videos/${video.id}`}>
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted overflow-hidden">
              {imgError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Processing thumbnail...
                  </span>
                  <span className="text-[11px] text-muted-foreground/90">
                    Video may already be playable
                  </span>
                </div>
              ) : resolvedThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${resolvedThumbnailUrl}${retryKey ? `?t=${retryKey}` : ''}`}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={() => {
                    setImgError(true);
                    // Check again after 10 seconds in case Bunny is still processing
                    setTimeout(() => {
                      setRetryKey(Date.now());
                      setImgError(false);
                    }, 10000);
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 text-xs text-muted-foreground font-medium">
                  Thumbnail unavailable
                </div>
              )}
              {!imgError && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-12 w-12 text-white" fill="white" />
                </div>
              )}
            </div>
          </Link>

          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/projects/${projectId}/videos/${video.id}`} className="min-w-0 flex-1">
                <h3 className="font-medium truncate">{video.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      v{video.currentVersion}
                    </Badge>
                    {video.newRevisionVersion !== null && (
                      <Badge variant="default" className="text-xs">
                        New · v{video.newRevisionVersion}
                      </Badge>
                    )}
                    <span className="text-xs">{video.duration}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {video.commentCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {video.lastUpdated}
                  </span>
                </div>
              </Link>

              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isDeleting}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${projectId}/videos/${video.id}/share`}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowEditDialog(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowVersionDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Version
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {isDeleting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Deleting...
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>Update the video title and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                disabled={isSaving}
              />
            </div>
            {editError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {editError}
              </p>
            )}
            <Button
              onClick={handleEdit}
              disabled={!editTitle.trim() || isSaving}
              className="w-full"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Version Dialog */}
      <Dialog
        open={showVersionDialog}
        onOpenChange={(open) => {
          if (!open && isCreatingVersion) return;

          setShowVersionDialog(open);

          if (!open) {
            versionUploadAbortRef.current?.abort();
            versionUploadAbortRef.current = null;
            setVersionUrl('');
            setVersionLabel('');
            setVersionSource(null);
            setVersionUrlError('');
            setVersionMode('file');
            setVersionFile(null);
            setVersionUploadProgress(0);
            setVersionUploadStatus('');
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Version</DialogTitle>
            <DialogDescription>
              Upload a new version of &quot;{video.title}&quot;. The new version will become active.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={versionMode === 'file' ? 'default' : 'outline'}
                onClick={() => setVersionMode('file')}
                disabled={isCreatingVersion}
              >
                Direct Upload
              </Button>

              <Button
                type="button"
                variant={versionMode === 'url' ? 'default' : 'outline'}
                onClick={() => setVersionMode('url')}
                disabled={isCreatingVersion}
              >
                Video URL
              </Button>
            </div>

            {versionMode === 'file' ? (
              <div className="space-y-2">
                <Label>Video File</Label>

                <label
                  className={`flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                    versionFile
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  } ${isCreatingVersion ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={isCreatingVersion}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setVersionFile(file);
                      setVersionUploadProgress(0);
                      setVersionUploadStatus('');
                    }}
                  />

                  {versionFile ? (
                    <>
                      <CheckCircle2 className="mb-2 h-6 w-6 text-green-600" />
                      <span className="max-w-full truncate text-sm font-medium">
                        {versionFile.name}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {(versionFile.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">Choose video file</span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        Tap to select a video from your device
                      </span>
                    </>
                  )}
                </label>

                {(isCreatingVersion || versionUploadProgress > 0) && (
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${versionUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {versionUploadStatus || `Uploading ${versionUploadProgress}%`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Video URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={versionUrl}
                    onChange={(e) => handleVersionUrlChange(e.target.value)}
                    className="pl-10"
                    disabled={isCreatingVersion}
                  />
                </div>

                {versionUrlError && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {versionUrlError}
                  </p>
                )}

                {versionSource && (
                  <p className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {versionSource.providerId.charAt(0).toUpperCase() +
                      versionSource.providerId.slice(1)}{' '}
                    video detected
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Version Label (optional)</Label>
              <Input
                placeholder="e.g. Final Cut, Review Round 2"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                disabled={isCreatingVersion}
              />
            </div>

            {versionUploadStatus && !isCreatingVersion && (
              <p className="text-sm text-muted-foreground">
                {versionUploadStatus}
              </p>
            )}

            <Button
              onClick={handleCreateVersion}
              disabled={
                isCreatingVersion ||
                (versionMode === 'file' ? !versionFile : !versionSource)
              }
              className="w-full"
            >
              {isCreatingVersion && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isCreatingVersion
                ? versionUploadStatus || 'Adding Version...'
                : `Add Version ${video.latestVersion + 1}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{video.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this video, all its versions, and all comments. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
