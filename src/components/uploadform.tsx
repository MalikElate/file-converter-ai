import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Check, Minus, Plus, X } from "lucide-react"; // Added ArrowUp icon
import { useState } from "react";
import FileDownloader from "./download-button";

export default function FileConverterAI() {
  const [files, setFiles] = useState<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [ prompt, setPrompt] = useState("");
  const [changesAccepted, setChangesAccepted] = useState(false);

  const handleAccept = () => {
    changesAccepted || setChangesAccepted(true);
    let newFiles = stagedFiles.map((file) => new File([file], file, { type: "image/png" }));
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

  const handleDownload = () => {
    stagedFiles.forEach((file) => {
      const link = document.createElement("a");
      link.href = `/${file}`;
      link.download = file;
      link.click();
    });
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

      <div className={`p-4 rounded-lg mb-6 ${stagedFiles.length > 0 ? 'bg-red-100 dark:bg-red-950/50' : ''}`}>
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
              />
            </div>
          ))}  
        </div>
      </div>

      <div className={`p-4 rounded-lg mb-6 ${stagedFiles.length > 0 ? 'bg-green-100 dark:bg-green-950/50' : ''}`}>
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
              />
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
                e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
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
      <FileDownloader fileKeys={stagedFiles} />
    </div>
  );
}
