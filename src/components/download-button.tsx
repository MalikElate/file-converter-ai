import { Button } from "@/components/ui/button";
import { Download } from "lucide-react"; // Added ArrowUp icon
import { useState } from "react";

interface FileDownloaderProps {
  fileKeys: string[];
}

export default function FileDownloader({ fileKeys }: FileDownloaderProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAllFiles = async () => {
    setIsDownloading(true);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileKeys),
      });

      if (!response?.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download files. Please try again.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "edited-images.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert(error instanceof Error ? error.message : "Error downloading files. Please try again later.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      onClick={downloadAllFiles} 
      disabled={isDownloading || fileKeys.length === 0}
    >
      <Download className="w-4 h-4 mr-2" />
      {isDownloading ? "Downloading..." : "Download All Files"}
    </Button>
  );
}
