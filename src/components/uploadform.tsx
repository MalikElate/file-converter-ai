import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, X } from "lucide-react"; // Added ArrowUp icon
// import { ArrowUp, Check, Minus, Plus, X } from "lucide-react"; // Added ArrowUp icon
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import FileDownloader from "./download-button";
// import Loader from "@/components/loader/loader";
import { LoadingSpinner } from "@/components/loader/loader";
import HowToCollapsible from "./HowToCollapsible";
import { cx } from "class-variance-authority";
import { toast } from "sonner";

// Move formatFileSize outside the component
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Move getImageDimensions outside the component as well
const getImageDimensions = (file: File): Promise<{ width: number; height: number; fileName: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        fileName: file.name,
      });
    };
    img.src = URL.createObjectURL(file);
  });
};

export default function FileConverterAI() {
  // All hooks at the top level
  const [files, setFiles] = useState<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<Array<{ key: string; filename: string }>>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageDetails, setImageDetails] = useState<Record<string, { dimensions: string; fileName: string }>>({});
  const [conversionCount, setConversionCount] = useState<number>(0);
  const [showAlert, setShowAlert] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add useEffect to initialize conversion count from localStorage
  useEffect(() => {
    const storedCount = localStorage.getItem("conversionCount");
    // Initialize count to 0 if not found
    const count = storedCount ? parseInt(storedCount) : 0;

    setConversionCount(count);
    setShowAlert(count >= 5);

    // Initialize localStorage if not set
    if (!storedCount) {
      localStorage.setItem("conversionCount", "0");
    }
  }, []);

  // Add useEffect for initial height adjustment
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  // Add height adjustment function
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  // Modify the textarea onChange handler
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    adjustHeight();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prevFiles) => [...prevFiles, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  const removeStagedFile = (keyToRemove: string) => {
    setStagedFiles(stagedFiles.filter((file) => file.key !== keyToRemove));
  };

  const handleSubmit = async () => {
    if (files.length === 0 && prompt.trim() === "") {
      toast.error("Please upload at least one file and enter a prompt before submitting");
      return;
    }
    if (files.length === 0) {
      toast.error("Please upload at least one file before submitting");
      return;
    }
    if (prompt.trim() === "") {
      toast.error("Please enter a prompt before submitting");
      return;
    }


    if (conversionCount >= 5) {
      setShowAlert(true);
      return;
    }

    setLoading(true);
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
      setStagedFiles(
        responseData.map((item: any) => ({
          key: item.key,
          filename: item.filename || "Untitled",
        }))
      );
      console.log("stagedFiles", stagedFiles);
      console.log(responseData);

    
    } catch (error) {
      console.error("Error submitting files and prompt:", error);
    } finally {
      setLoading(false);
      // Increment conversion count
      const newCount = conversionCount + 1;
      setConversionCount(newCount);
      localStorage.setItem("conversionCount", newCount.toString());
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      {showAlert && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Heads up!</AlertTitle>
          You have reached the maximum number of free conversions. Please
          purchase credits or sign up for the pro plan to continue using the
          app.
        </Alert>
      )}
      <HowToCollapsible />
      <FileInput
        type="file"   
        onChange={handleFileChange}
        multiple
        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
      />
      {stagedFiles.length > 0 && files.length > 0 && (
        <div className="flex items-center mb-2 text-sm">
          <span className="font-semibold">Original File(s)</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file: File, index: number) => (
          <div key={index} className="group relative">
            <button
              onClick={() => removeFile(file)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              className="aspect-square bg-gray-200 rounded flex items-center justify-center text-sm"
              src={URL.createObjectURL(file)}
              alt={file.name}
              onLoad={async (e) => {
                const img = e.target as HTMLImageElement;
                const dimensions = await getImageDimensions(file);
                const fileInfoElement =
                  img.parentElement?.querySelector(".file-info");
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
      {stagedFiles.length > 0 && (
        <div className="flex items-center mb-2">
          <span className="font-semibold text-sm">Edited File(s)</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stagedFiles.map(
          (file: { key: string; filename: string }, index: number) => (
            <div key={index} className="group relative">
              <button
                onClick={() => removeStagedFile(file.key)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                className="aspect-square bg-gray-200 rounded flex items-center justify-center text-sm"
                src={`https://utfs.io/f/${file.key}`}
                alt={file.filename}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;

                  setImageDetails((prev) => ({
                    ...prev,
                    [file.key]: {
                      dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
                      fileName: file.filename,
                    },
                  }));
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm space-y-1">
                <div>{imageDetails[file.key]?.fileName || "Loading..."}</div>
                <div className="flex justify-between text-xs">
                  <span data-filesize="Loading..."></span>
                  <span>
                    {imageDetails[file.key]?.dimensions || "Loading..."}
                  </span>
                </div>
              </div>
            </div>
          )
        )}
      </div>
      {loading && (
        <span className="flex items-center">
          <LoadingSpinner className="w-4 h-4" />
          <p className="text-sm text-muted-foreground ml-2">Loading</p>
        </span>
      )}
      <div className="flex space-x-4 mb-6">
        <Textarea
          ref={textareaRef}
          placeholder="How can I help?"
          value={prompt}
          onChange={handlePromptChange}
          className={cx(
            "min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl text-base bg-muted",
          )}
          rows={3}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!loading) {
                handleSubmit();
              }
            }
          }}
        />
        <Button className="px-3 py-1.5" onClick={handleSubmit}>
          <ArrowUp className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge
          className="cursor-pointer hover:bg-accent"
          variant="outline"
          onClick={() => setPrompt("Create a 100px by 100px copy")}
        >
          100px Square
        </Badge>
        <Badge
          className="cursor-pointer hover:bg-accent"
          variant="outline"
          onClick={() => setPrompt("Convert to PNG")}
        >
          PNG
        </Badge>
        <Badge
          className="cursor-pointer hover:bg-accent"
          variant="outline"
          onClick={() => setPrompt("Resize to 200px by 200px")}
        >
          200px Square
        </Badge>
        <Badge
          className="cursor-pointer hover:bg-accent"
          variant="outline"
          onClick={() => setPrompt("Compress image")}
        >
          Compress
        </Badge>
      </div>
      <FileDownloader
        fileKeys={stagedFiles.map((file: { key: string }) => file.key)}
      />
    </div>
  );
}
