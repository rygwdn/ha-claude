interface Props {
  onInjectPrompt: (text: string) => void;
}

const ACTIONS = [
  { label: "Check Config", prompt: "ha-check\n" },
  { label: "Backup", prompt: 'ha-backup create "pre-changes"\n' },
  {
    label: "Restart HA",
    prompt:
      "Please check the Home Assistant configuration with ha-check, and if it's valid, restart HA with ha-api call homeassistant.restart\n",
  },
  {
    label: "New Dashboard",
    prompt:
      "Create a new Lovelace dashboard. First run ha-ws dashboards list to see existing ones, then help me design a new one.\n",
  },
  {
    label: "Fix Issues",
    prompt:
      "Check the Home Assistant logs with ha-api logs --lines 100 and help me identify and fix any errors or warnings.\n",
  },
];

export function QuickActions({ onInjectPrompt }: Props) {
  return (
    <div className="quick-actions">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          className="btn btn-small"
          onClick={() => onInjectPrompt(action.prompt)}
          title={action.prompt.trim()}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
