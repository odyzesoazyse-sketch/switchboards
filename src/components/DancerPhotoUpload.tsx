import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, User } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const fileExt = file.name.split('.').pop();
      const fileName = `${dancerId}-${Date.now()}.${fileExt}`;
      const filePath = `dancers/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('dancer-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dancer-photos')
        .getPublicUrl(filePath);

      // Update dancer record
      const { error: updateError } = await supabase
        .from('dancers')
        .update({ photo_url: publicUrl })
        .eq('id', dancerId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onPhotoUpdated(publicUrl);

      toast({
        title: "Photo uploaded",
        description: "Dancer photo has been updated",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
      <div className="relative group">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div 
          className={`
            w-10 h-10 rounded-full overflow-hidden cursor-pointer
            bg-gradient-to-br from-primary to-primary/60 
            flex items-center justify-center
            ${uploading ? 'animate-pulse' : ''}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={dancerName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-primary-foreground" />
          )}
        </div>
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex items-center gap-3">
        <div 
          className={`
            w-16 h-16 rounded-xl overflow-hidden cursor-pointer relative group
            bg-gradient-to-br from-primary/20 to-secondary/20 
            flex items-center justify-center border-2 border-dashed border-muted
            ${uploading ? 'animate-pulse' : ''}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt={dancerName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </>
          ) : (
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Photo</span>
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
            {previewUrl ? 'Change' : 'Upload'}
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
    </div>
  );
}
