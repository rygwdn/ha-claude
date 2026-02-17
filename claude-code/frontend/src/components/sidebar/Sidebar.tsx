import { FileBrowser } from "./FileBrowser";
import { GitPanel } from "./GitPanel";

interface Props {
  visible: boolean;
  onInjectPrompt: (text: string) => void;
}

export function Sidebar({ visible, onInjectPrompt }: Props) {
  if (!visible) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-section" style={{ flex: 2 }}>
        <FileBrowser onInjectPrompt={onInjectPrompt} />
      </div>
      <div className="sidebar-section" style={{ flex: 1, borderTop: "1px solid var(--border)" }}>
        <GitPanel />
      </div>
    </div>
  );
}
