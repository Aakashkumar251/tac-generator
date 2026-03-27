import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Navbar } from '@/components/Navbar';
import { CodeEditor } from '@/components/CodeEditor';
import { OutputPanel } from '@/components/OutputPanel';
import { StatusBar } from '@/components/StatusBar';

const Index = () => {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={30}>
            <CodeEditor />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border" />
          <ResizablePanel defaultSize={50} minSize={30}>
            <OutputPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <StatusBar />
    </div>
  );
};

export default Index;
