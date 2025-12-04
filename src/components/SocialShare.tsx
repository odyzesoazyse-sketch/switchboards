import {
  TwitterShareButton,
  FacebookShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  TwitterIcon,
  FacebookIcon,
  WhatsappIcon,
  TelegramIcon,
} from "react-share";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Copy, Check, Link } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
}

export default function SocialShare({ url, title, description }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = description || `Join ${title} on SWITCHBOARD - the fair breakdance battle judging platform!`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Share {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Social buttons */}
          <div className="flex justify-center gap-4">
            <TwitterShareButton url={url} title={shareText}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <TwitterIcon size={48} round />
                <span className="text-xs text-muted-foreground">Twitter</span>
              </div>
            </TwitterShareButton>

            <FacebookShareButton url={url} hashtag="#SWITCHBOARD">
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <FacebookIcon size={48} round />
                <span className="text-xs text-muted-foreground">Facebook</span>
              </div>
            </FacebookShareButton>

            <WhatsappShareButton url={url} title={shareText}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <WhatsappIcon size={48} round />
                <span className="text-xs text-muted-foreground">WhatsApp</span>
              </div>
            </WhatsappShareButton>

            <TelegramShareButton url={url} title={shareText}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                <TelegramIcon size={48} round />
                <span className="text-xs text-muted-foreground">Telegram</span>
              </div>
            </TelegramShareButton>
          </div>

          {/* Copy link */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg overflow-hidden">
              <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">{url}</span>
            </div>
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}