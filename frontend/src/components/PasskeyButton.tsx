type PasskeyButtonProps = {
  label: string;
  onClick: () => void;
  busy?: boolean;
};

export function PasskeyButton({ label, onClick, busy = false }: PasskeyButtonProps) {
  return (
    <button className="ghost-btn" type="button" onClick={onClick} disabled={busy}>
      {busy ? "Waiting for passkey…" : label}
    </button>
  );
}
