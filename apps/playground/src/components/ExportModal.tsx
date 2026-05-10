import { Code, FileJson, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { exportMarkdown } from '@namelesserlx/editor';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: TiptapEditor | null;
}

export function ExportModal({ isOpen, onClose, editor }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'json' | 'html'>('markdown');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!isOpen || !editor) return;

    if (activeTab === 'html') {
      setContent(editor.getHTML());
    } else if (activeTab === 'json') {
      setContent(JSON.stringify(editor.getJSON(), null, 2));
    } else if (activeTab === 'markdown') {
      const result = exportMarkdown(editor.getJSON());
      setContent(result.value);
    }
  }, [isOpen, activeTab, editor]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-5xl sm:max-w-5xl md:max-w-6xl flex flex-col h-[85vh] p-0 gap-0 border-slate-200">
        <VisuallyHidden>
          <DialogTitle>View Source Code</DialogTitle>
          <DialogDescription>View document content as markdown, json, or html</DialogDescription>
        </VisuallyHidden>

        <Tabs
          defaultValue="markdown"
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="flex flex-col h-full overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <TabsList className="bg-slate-100/80 p-1">
              <TabsTrigger value="markdown" className="flex items-center space-x-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-800">
                <FileText className="w-4 h-4" />
                <span>Markdown</span>
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center space-x-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-800">
                <Code className="w-4 h-4" />
                <span>HTML</span>
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center space-x-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-800">
                <FileJson className="w-4 h-4" />
                <span>JSON</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50 p-4">
            <TabsContent value={activeTab} className="h-full m-0 data-[state=active]:flex flex-col outline-none">
              <pre className="text-[13px] text-slate-700 font-mono whitespace-pre-wrap word-break">
                {content || 'Empty content'}
              </pre>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
