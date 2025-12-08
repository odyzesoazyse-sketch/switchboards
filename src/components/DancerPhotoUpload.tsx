import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, User, RotateCcw, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DancerPhotoUploadProps {
  dancerId: string;
  currentPhotoUrl: string | null;
  dancerName: string;
  onPhotoUpdated: (newUrl: string) => void;
  compact?: boolean;
}

export default function DancerPhotoUpload({ 
  dancerId, 
  currentPhotoUrl, 
  dancerName,
  onPhotoUpdated,
  compact = false 
}: DancerPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processAndUploadFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Create a unique file name
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${dancerId}-${Date.now()}.${fileExt}`;
      const filePath = `dancers/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('dancer-photos')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dancer-photos')
        .getPublicUrl(filePath);

      // Add cache buster to URL
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update dancer record
      const { error: updateError } = await supabase
        .from('dancers')
        .update({ photo_url: urlWithCacheBuster })
        .eq('id', dancerId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setPreviewUrl(urlWithCacheBuster);
      onPhotoUpdated(urlWithCacheBuster);

      toast({
        title: "Photo uploaded",
        description: `${dancerName}'s photo has been updated`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAndUploadFile(file);
    }
  }, [dancerId]);

  const removePhoto = async () => {
    try {
      setUploading(true);

      // Update dancer record to remove photo
      const { error } = await supabase
        .from('dancers')
        .update({ photo_url: null })
        .eq('id', dancerId);

      if (error) throw error;

      setPreviewUrl(null);
      onPhotoUpdated('');

      toast({
        title: "Photo removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (compact) {
    return (
      <>
        <div className="relative group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div 
            className={`
              w-10 h-10 rounded-full overflow-hidden cursor-pointer
              bg-gradient-to-br from-primary to-primary/60 
              flex items-center justify-center
              transition-all duration-200
              ${uploading ? 'animate-pulse' : 'hover:scale-105'}
              ${dragActive ? 'ring-2 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => previewUrl ? setShowPreview(true) : fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt={dancerName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  setPreviewUrl(null);
                }}
              />
            ) : (
              <User className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          <div 
            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Photo Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{dancerName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt={dancerName}
                  className="w-full rounded-lg object-cover max-h-80"
                />
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowPreview(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Change
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    removePhoto();
                    setShowPreview(false);
                  }}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex items-center gap-3">
        <div 
          className={`
            w-16 h-16 rounded-xl overflow-hidden cursor-pointer relative group
            bg-gradient-to-br from-primary/20 to-secondary/20 
            flex items-center justify-center border-2 border-dashed
            transition-all duration-200
            ${uploading ? 'animate-pulse border-primary' : 'border-muted hover:border-primary/50'}
            ${dragActive ? 'border-primary bg-primary/10 scale-105' : ''}
          `}
          onClick={() => previewUrl ? setShowPreview(true) : fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt={dancerName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  setPreviewUrl(null);
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-white" />
              </div>
            </>
          ) : (
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {dragActive ? 'Drop here' : 'Photo'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1"
          >
            <Camera className="w-3 h-3" />
            {uploading ? 'Uploading...' : (previewUrl ? 'Change' : 'Upload')}
          </Button>
          
          {previewUrl && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={removePhoto}
              disabled={uploading}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <X className="w-3 h-3" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dancerName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt={dancerName}
                className="w-full rounded-lg object-cover max-h-80"
              />
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowPreview(false);
                  fileInputRef.current?.click();
                }}
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Change Photo
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  removePhoto();
                  setShowPreview(false);
                }}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
