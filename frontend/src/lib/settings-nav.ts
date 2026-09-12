import {
  Eye,
  KeyRound,
  Link2,
  Lock,
  Monitor,
  Send,
  ShieldCheck,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";

export type SettingsTone = "blue" | "green" | "orange" | "purple" | "cyan" | "red" | "slate";

export type SettingsNavItem = {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: SettingsTone;
};

export type SettingsNavGroup = {
  id: string;
  label: string | null;
  items: SettingsNavItem[];
};

export const settingsNavGroups: SettingsNavGroup[] = [
  {
    id: "account",
    label: null,
    items: [
      {
        to: "/settings/profile",
        label: "My profile",
        hint: "Photo, status, share",
        icon: User,
        tone: "blue",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    items: [
      {
        to: "/settings/passkeys",
        label: "Passkeys",
        hint: "Devices and authenticators",
        icon: KeyRound,
        tone: "green",
      },
      {
        to: "/settings/two-factor",
        label: "Two-factor",
        hint: "Authenticator app",
        icon: ShieldCheck,
        tone: "purple",
      },
      {
        to: "/settings/password",
        label: "Password",
        hint: "Change password",
        icon: Lock,
        tone: "orange",
      },
      {
        to: "/settings/sessions",
        label: "Sessions",
        hint: "Active devices",
        icon: Monitor,
        tone: "slate",
      },
    ],
  },
  {
    id: "connections",
    label: "Connections",
    items: [
      {
        to: "/settings/accounts",
        label: "Connected accounts",
        hint: "Google, GitHub, Telegram",
        icon: Link2,
        tone: "cyan",
      },
      {
        to: "/settings/telegram",
        label: "Telegram",
        hint: "Bot linking and OTP",
        icon: Send,
        tone: "blue",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    items: [
      {
        to: "/settings/privacy",
        label: "Privacy",
        hint: "Last seen and device",
        icon: Eye,
        tone: "purple",
      },
    ],
  },
  {
    id: "danger",
    label: "Account",
    items: [
      {
        to: "/settings/danger",
        label: "Delete account",
        hint: "Permanent",
        icon: Trash2,
        tone: "red",
      },
    ],
  },
];
