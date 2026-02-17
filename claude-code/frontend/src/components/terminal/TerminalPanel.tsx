import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import type { TerminalWebSocket } from "../../services/websocket";
import "@xterm/xterm/css/xterm.css";

interface Props {
  websocket: TerminalWebSocket | null;
}

export function TerminalPanel({ websocket }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && termRef.current) {
      fitAddonRef.current.fit();
      if (websocket) {
        websocket.resize(termRef.current.cols, termRef.current.rows);
      }
    }
  }, [websocket]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Menlo", "Monaco", "Courier New", monospace',
      theme: {
        background: "#1c1c1c",
        foreground: "#e1e1e1",
        cursor: "#e1e1e1",
        selectionBackground: "#4a9eff44",
        black: "#1c1c1c",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#4a9eff",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e1e1e1",
        brightBlack: "#666666",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#5eadff",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      allowTransparency: false,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(new SearchAddon());

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send input to WebSocket
    term.onData((data) => {
      if (websocket) {
        websocket.send(data);
      }
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        if (websocket && term.cols && term.rows) {
          websocket.resize(term.cols, term.rows);
        }
      });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle WebSocket messages
  useEffect(() => {
    if (!websocket || !termRef.current) return;

    const cleanup = websocket.onMessage((msg) => {
      if (msg.type === "output" && msg.data) {
        termRef.current?.write(msg.data);
      } else if (msg.type === "exit") {
        termRef.current?.write(
          `\r\n\x1b[33m[Session exited with code ${msg.exitCode}]\x1b[0m\r\n`
        );
      } else if (msg.type === "destroyed") {
        termRef.current?.write(
          "\r\n\x1b[31m[Session destroyed]\x1b[0m\r\n"
        );
      }
    });

    // Initial resize
    handleResize();

    return cleanup;
  }, [websocket, handleResize]);

  // Window resize handler
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return <div ref={containerRef} className="terminal-container" />;
}
