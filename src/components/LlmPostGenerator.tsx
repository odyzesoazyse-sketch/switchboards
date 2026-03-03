import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Match {
  round: string;
  position: number;
  dancer_left_name: string;
  dancer_right_name: string;
  winner_name: string | null;
}

interface LlmPostGeneratorProps {
  battleName: string;
  nominationName: string;
  matches: Match[];
  date: string;
}

export default function LlmPostGenerator({
  battleName,
  nominationName,
  matches,
  date,
}: LlmPostGeneratorProps) {
  const { toast } = useToast();
  const [post, setPost] = useState("");
  const [copied, setCopied] = useState(false);

  const generatePost = () => {
    const completed = matches.filter(m => m.winner_name);
    const rounds = [...new Set(completed.map(m => m.round))];

    let text = `🔥 ${battleName}\n`;
    text += `📋 ${nominationName}\n`;
    text += `📅 ${date}\n\n`;

    rounds.forEach(round => {
      const roundMatches = completed.filter(m => m.round === round);
      text += `🏆 ${round}\n`;
      roundMatches.forEach(m => {
        const isLeft = m.winner_name === m.dancer_left_name;
        text += `  ${isLeft ? "✅" : "❌"} ${m.dancer_left_name} vs ${m.dancer_right_name} ${!isLeft ? "✅" : "❌"}\n`;
      });
      text += "\n";
    });

    // Find final winner
    const finals = completed.filter(m => m.round.toLowerCase().includes("final") || m.round.toLowerCase().includes("финал"));
    if (finals.length > 0) {
      const finalWinner = finals[finals.length - 1].winner_name;
      text += `🥇 Champion: ${finalWinner} 👑\n\n`;
    }

    text += `⚡ Powered by SWITCHBOARD\n`;
    text += `#${battleName.replace(/\s+/g, "")} #DanceBattle #Switchboard`;

    setPost(text);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(post);
    setCopied(true);
    toast({ title: "Copied!", description: "Post copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <Button onClick={generatePost} variant="outline" className="w-full gap-2">
        <Sparkles className="w-4 h-4" />
        Generate Social Post
      </Button>

      {post && (
        <div className="space-y-2">
          <Textarea
            value={post}
            onChange={(e) => setPost(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <Button onClick={copyToClipboard} className="w-full gap-2" size="sm">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
        </div>
      )}
    </div>
  );
}
