import { useState, useEffect, useCallback } from "react";
import { getFiles, type FileEntry } from "../../services/ha-api";

interface Props {
  onInjectPrompt: (text: string) => void;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  expanded?: boolean;
  loaded?: boolean;
}

export function FileBrowser({ onInjectPrompt }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDirectory("").then((entries) => {
      setTree(entries.map((e) => ({ ...e, expanded: false, loaded: false })));
      setLoading(false);
    });
  }, []);

  const loadDirectory = async (path: string): Promise<FileEntry[]> => {
    try {
      return await getFiles(path);
    } catch {
      return [];
    }
  };

  const toggleDir = useCallback(
    async (node: TreeNode) => {
      if (node.type !== "directory") return;

      if (!node.loaded) {
        const children = await loadDirectory(node.path);
        node.children = children.map((c) => ({
          ...c,
          expanded: false,
          loaded: false,
        }));
        node.loaded = true;
      }

      node.expanded = !node.expanded;
      setTree([...tree]);
    },
    [tree]
  );

  const handleClick = useCallback(
    (node: TreeNode) => {
      if (node.type === "directory") {
        toggleDir(node);
      } else {
        // Inject file path into terminal for Claude to reference
        onInjectPrompt(`Look at the file /homeassistant/${node.path}\n`);
      }
    },
    [toggleDir, onInjectPrompt]
  );

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const indent = depth * 16;
    const isDir = node.type === "directory";

    return (
      <div key={node.path}>
        <div
          className={`file-entry ${isDir ? "directory" : ""}`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => handleClick(node)}
        >
          <span className="icon">
            {isDir ? (node.expanded ? "\u25BE" : "\u25B8") : "\u25AA"}
          </span>
          <span>{node.name}</span>
        </div>
        {isDir && node.expanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="sidebar-section-header">Files</div>
      <div className="sidebar-section-content">
        {loading ? (
          <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
            Loading...
          </div>
        ) : tree.length === 0 ? (
          <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
            No files found
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
    </>
  );
}
