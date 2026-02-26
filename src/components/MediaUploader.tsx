import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, X, Loader2 } from "lucide-react";

interface MediaUploaderProps {
    onUploadSelect: (url: string | null, type: 'photo' | 'video' | null) => void;
    existingUrl?: string | null;
    existingType?: 'photo' | 'video' | null;
    bucket?: string;
}

export function MediaUploader({
    onUploadSelect,
    existingUrl = null,
    existingType = null,
    bucket = "media"
}: MediaUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl);
    const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(existingType);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({
                title: "File too large",
                description: "Please select a file smaller than 10MB",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsUploading(true);

            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const isVideo = ['mp4', 'webm', 'mov'].includes(fileExt || '');
            const type = isVideo ? 'video' : 'photo';

            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            setPreviewUrl(publicUrl);
            setMediaType(type);
            onUploadSelect(publicUrl, type);

        } catch (error: any) {
            toast({
                title: "Upload Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeMedia = () => {
        setPreviewUrl(null);
        setMediaType(null);
        onUploadSelect(null, null);
    };

    return (
        <div className="w-full">
            {!previewUrl ? (
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-background/50 hover:bg-muted/10 transition-colors relative h-32">
                    {isUploading ? (
                        <div className="flex flex-col items-center text-primary">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-sm font-medium">Uploading...</span>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                <span className="text-primary font-medium hover:underline cursor-pointer">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG, GIF, MP4, WebM (Max 10MB)</p>
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept="image/*,video/mp4,video/webm"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </>
                    )}
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden border border-border/50 bg-background/50 group h-32 flex items-center justify-center">
                    {mediaType === 'video' ? (
                        <video
                            src={previewUrl}
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    )}

                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={removeMedia}
                            className="gap-2"
                        >
                            <X className="w-4 h-4" /> Remove
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
