import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export default function HowToCollapsible() {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('instructionsOpen')
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('instructionsOpen', JSON.stringify(isInstructionsOpen))
    }
  }, [isInstructionsOpen])

  return (
    <Collapsible
      open={isInstructionsOpen}
      onOpenChange={setIsInstructionsOpen}
      className="bg-muted p-4 rounded-lg"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">How to use File Converter AI</h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isInstructionsOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-2 space-y-2">
        <p className="text-sm">1. Upload up to 10 files using the Choose Files button</p>
        <p className="text-sm">2. Explain below how you want your files converted</p>
        <p className="text-sm">3. Click Download All Files to get your converted files.</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
