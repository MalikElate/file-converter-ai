import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from 'lucide-react'
import { useState } from 'react'

export default function FileConverterAI() {
  const [files, setFiles] = useState<File[]>([])
  const [prompt, setPrompt] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove))
  }

  const handleSubmit = () => {
    console.log('Files:', files)
    console.log('Prompt:', prompt)
    // Here you would typically send the files and prompt to your AI service
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
        <Input
          type="file"
          onChange={handleFileChange}
          multiple
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {files.map((file, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square bg-gray-200 rounded flex items-center justify-center text-sm">
              {file.name}
            </div>
            <button
              onClick={() => removeFile(file)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex space-x-4 mb-6">
        <Input
          placeholder="Enter your prompt here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-grow"
        />
        <Button onClick={handleSubmit}>Send Prompt</Button>
      </div>
    </div>
  )
}
