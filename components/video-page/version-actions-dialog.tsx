'use client';

import { memo, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Link as LinkIcon,
  Loader2,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VideoSource } from '@/lib/video-providers';

interface VersionActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bunnyUploadsEnabled: boolean;
  newVersionMode: 'url' | 'file';
  onNewVersionModeChange: (mode: 'url' | 'file') => void;
  newVersionUrl: string;
  onNewVersionUrlChange: (url: string) => void;
  newVersionUrlError: string;
  newVersionSource: VideoSource | null;
  newVersionFile: File | null;
  onNewVersionFileChange: (file: File | null) => void;
  newVersionLabel: string;
  onNewVersionLabelChange: (label: string) => void;
  newVersionUploadStatus: string;
  newVersionUploadProgress: number;
  isCreatingVersion: boolean;
  versionsCount: number;
  onCreateVersion: () => void;
  onCancelUpload: () => void;
}

export const VersionActionsDialog = memo(function VersionActionsDialog({
  open,
  onOpenChange,
  bunnyUploadsEnabled,
  newVersionMode,
  onNewVersionModeChange,
  newVersionUrl,
  onNewVersionUrlChange,
  newVersionUrlError,
  newVersionSource,
  newVersionFile,
  onNewVersionFileChange,
  newVersionLabel,
  onNewVersionLabelChange,
  newVersionUploadStatus,
  newVersionUploadProgress,
  isCreatingVersion,
  versionsCount,
  onCreateVersion,
  onCancelUpload,
}: VersionActionsDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!newVersionFile) {
      setThumbnailUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(newVersionFile);
    setThumbnailUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [newVersionFile]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isCreatingVersion) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Version
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Version</DialogTitle>
          <DialogDescription>
            Upload a new version of this video. The new version will become active.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Tabs
            value={newVersionMode}
            onValueChange={(v) => onNewVersionModeChange(v as 'url' | 'file')}
            className="mb-2"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">Link URL</TabsTrigger>
              <TabsTrigger value="file">Direct Upload</TabsTrigger>
            </TabsList>
          </Tabs>

          {newVersionMode === 'url' ? (
            <div className="space-y-2">
              <Label>Video URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={newVersionUrl}
                  onChange={(e) => onNewVersionUrlChange(e.target.value)}
                  className="pl-10"
                  disabled={isCreatingVersion}
                />
              </div>
              {newVersionUrlError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {newVersionUrlError}
                </p>
              )}
              {newVersionSource && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {newVersionSource.providerId.charAt(0).toUpperCase() +
                    newVersionSource.providerId.slice(1)}{' '}
                  video detected
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="versionFile">Video File</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="versionFile"
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (!isCreatingVersion) setIsDragging(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                    if (!isCreatingVersion) setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();

                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setIsDragging(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);

                    if (isCreatingVersion) return;

                    const file = event.dataTransfer.files?.[0];

                    if (file && file.type.startsWith('video/')) {
                      onNewVersionFileChange(file);
                    } else {
                      toast.error('Please drop a valid video file');
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center w-full h-44 overflow-hidden border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/15 ring-2 ring-primary/30 scale-[1.01]'
                      : newVersionFile
                        ? 'border-primary bg-muted/30'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  {thumbnailUrl && (
                    <>
                      <video
                        src={thumbnailUrl}
                        muted
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover"
                        onLoadedMetadata={(event) => {
                          event.currentTarget.currentTime = Math.min(
                            1,
                            event.currentTarget.duration || 0,
                          );
                        }}
                      />
                      <div className="absolute inset-0 bg-background/65 backdrop-blur-[1px]" />
                    </>
                  )}

                  {isDragging && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-[2px]">
                      <UploadCloud className="mb-2 h-10 w-10 text-primary animate-bounce" />
                      <p className="font-semibold text-primary">Drop video here</p>
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
                    {newVersionFile ? (
                      <>
                        <FileVideo className="w-8 h-8 mb-2 text-primary" />
                        <p className="mb-1 text-sm text-foreground font-medium truncate max-w-[260px]">
                          {newVersionFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(newVersionFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Click or drop another video to replace
                        </p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-1 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">MP4, WebM, or OGG</p>
                      </>
                    )}
                  </div>

                  <input
                    id="versionFile"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file && file.type.startsWith('video/')) {
                        onNewVersionFileChange(file);
                      } else if (file) {
                        toast.error('Please select a valid video file');
                      }
                    }}
                    disabled={isCreatingVersion}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Version Label (optional)</Label>
            <Input
              placeholder="e.g. Final Cut, Review Round 2"
              value={newVersionLabel}
              onChange={(e) => onNewVersionLabelChange(e.target.value)}
              disabled={isCreatingVersion}
            />
          </div>

          {newVersionUploadStatus && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{newVersionUploadStatus}</p>
              {newVersionUploadProgress > 0 && newVersionUploadProgress < 100 && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${newVersionUploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {isCreatingVersion && (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancelUpload}
            >
              Cancel Upload
            </Button>
          )}
          <Button
            onClick={onCreateVersion}
            disabled={
              (newVersionMode === 'url' && !newVersionSource) ||
              (newVersionMode === 'file' && !newVersionFile) ||
              isCreatingVersion
            }
            className="w-full"
          >
            {isCreatingVersion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Version {versionsCount + 1}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
