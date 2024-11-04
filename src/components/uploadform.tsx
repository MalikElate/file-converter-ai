import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Check, Minus, Plus, X } from "lucide-react"; // Added ArrowUp icon
import { useState } from "react";
import FileDownloader from "./download-button";
import { Badge } from "@/components/ui/badge";

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = URL.createObjectURL(file);
  });
};

export default function FileConverterAI() {
  const [files, setFiles] = useState<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [changesAccepted, setChangesAccepted] = useState(false);

  const handleAccept = () => {
    changesAccepted || setChangesAccepted(true);
    let newFiles = stagedFiles.map(
      (file) => new File([file], file, { type: "image/png" })
    );
    setFiles(newFiles);
    setStagedFiles([]);
  };

  const handleReject = () => {
    setStagedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prevFiles) => [...prevFiles, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  const removeStagedFile = (fileToRemove: string) => {
    setStagedFiles(stagedFiles.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
      formData.append("prompt", prompt);
      setPrompt("");

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Server response was not ok: ${response.status} ${response.statusText}`
        );
      }
      const responseData = await response.json();
      setStagedFiles(responseData);
      console.log(responseData);
    } catch (error) {
      console.error("Error submitting files and prompt:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <FileInput
        type="file"
        onChange={handleFileChange}
        multiple
        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
      />

      <div
        className={`p-4 rounded-lg mb-6 ${
          stagedFiles.length > 0 ? "bg-red-100 dark:bg-red-950/50" : ""
        }`}
      >
        {stagedFiles.length > 0 && (
          <div className="flex items-center mb-2">
            <Minus className="w-4 h-4 mr-2 text-red-600" />
            <span className="font-semibold">Remove</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={index} className="group relative">
              <button
                onClick={() => removeFile(file)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                className="aspect-square bg-gray-200 rounded flex items-center justify-center text-sm"
                src={changesAccepted ? `https://utfs.io/f/${file.name}` : URL.createObjectURL(file)}
                alt={file.name}
                onLoad={async (e) => {
                  const img = e.target as HTMLImageElement;
                  const dimensions = await getImageDimensions(file);
                  const fileInfoElement = img.parentElement?.querySelector('.file-info');
                  if (fileInfoElement) {
                    fileInfoElement.textContent = `${dimensions.width}x${dimensions.height}`;
                  }
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm space-y-1">
                <div>{file.name}</div>
                <div className="flex justify-between text-xs">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="file-info" data-dimensions="Loading..."></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`p-4 rounded-lg mb-6 ${
          stagedFiles.length > 0 ? "bg-green-100 dark:bg-green-950/50" : ""
        }`}
      >
        {stagedFiles.length > 0 && (
          <div className="flex items-center mb-2">
            <Plus className="w-4 h-4 mr-2 text-green-600" />
            <span className="font-semibold">Keep</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stagedFiles.map((file, index) => (
            <div key={index} className="group relative">
              <button
                onClick={() => removeStagedFile(file)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                className="aspect-square bg-gray-200 rounded flex items-center justify-center text-sm"
                src={`https://utfs.io/f/${file}`}
                alt={file}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  const fileInfoElement = img.parentElement?.querySelector('.file-info');
                  if (fileInfoElement) {
                    fileInfoElement.textContent = `${img.naturalWidth}x${img.naturalHeight}`;
                  }
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm space-y-1">
                <div>Name coming soon</div>
                <div className="flex justify-between text-xs">
                  <span data-filesize="Loading..."></span>
                  <span data-dimensions="Loading..."></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {stagedFiles.length > 0 && (
        <div className="flex justify-end space-x-2">
          <Button onClick={() => handleAccept()} variant="outline">
            <Check className="w-4 h-4 mr-2" />
            Accept All Changes
          </Button>
          <Button onClick={() => handleReject()} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Reject All Changes
          </Button>
        </div>
      )}

      <div className="flex space-x-4 mb-6">
        <Textarea
          placeholder="How can File Converter help you today?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-grow h-10 min-h-[40px] resize-none py-1.5 transition-height duration-200"
          style={{ height: "40px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                // Allow new lines with Shift+Enter
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height =
                  e.currentTarget.scrollHeight + "px";
              } else {
                // Prevent default to avoid new line
                e.preventDefault();
                handleSubmit();
              }
            }
          }}
        />
        <Button className="px-3 py-1.5" onClick={handleSubmit}>
          <ArrowUp className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex gap-2 ">
        <Badge
          variant="outline"
          onClick={() => setPrompt("Create a 100px by 100px copy")}
        >
          Create a 100px by 100px copy
        </Badge>
        <Badge variant="outline" onClick={() => setPrompt("Convert to PNG")}>
          Convert to PNG
        </Badge>
        <Badge
          variant="outline"
          onClick={() => setPrompt("Resize to 200px by 200px")}
        >
          Resize to 200px by 200px
        </Badge>
        <Badge variant="outline" onClick={() => setPrompt("Compress image")}>
          Compress image
        </Badge>
      </div>
      <FileDownloader fileKeys={stagedFiles} />
    </div>
  );
}
