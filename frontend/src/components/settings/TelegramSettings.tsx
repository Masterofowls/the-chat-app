import { TelegramLink } from "../TelegramLink";
import { TelegramOtpForm } from "../TelegramOtpForm";

export function TelegramSettings() {
  return (
    <div className="settings-page">
      <p className="kicker">Telegram</p>
      <h2 className="serif">OTP linking</h2>
      <p className="muted">
        Link the bot for OTP delivery. Use Connected accounts for native Telegram Login Widget.
      </p>
      <div className="stack" style={{ marginTop: 20 }}>
        <TelegramLink />
        <TelegramOtpForm />
      </div>
    </div>
  );
}
