import { Button } from "@/components/ui/button";
import { Download } from "lucide-react"; // Added ArrowUp icon
import { useState } from "react";

interface FileDownloaderProps {
  fileKeys: string[];
}

export default function FileDownloader({ fileKeys }: FileDownloaderProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Example array of file URLs
  const fileUrls = fileKeys.map((key) => `https://utfs.io/f/${key}`);

  const downloadFile = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`
      );
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = url.split("/").pop() || "download"; // Provide fallback filename
    link.click();
  };

  const downloadAllFiles = async () => {
    setIsDownloading(true);
    fileUrls.map((url) => downloadFile(url));
  };

  return (
    <Button onClick={downloadAllFiles} disabled={isDownloading}>
      <Download className="w-4 h-4 mr-2" />
      {isDownloading ? "Downloading..." : "Download All Files"}
    </Button>
  );
}
