import { useEffect } from "react";

const SITE = "https://messaging-app-frontend-five.vercel.app";
const DEFAULT_DESCRIPTION =
  "Relay is private realtime messaging with passkeys, 2FA, Telegram OTP, and OAuth.";

type DocumentMetaOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", rel);
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

export function useDocumentMeta({
  title = "Relay",
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = `${SITE}/favicon.svg`,
  noIndex = false,
}: DocumentMetaOptions = {}) {
  useEffect(() => {
    const url = path.startsWith("http") ? path : `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "Relay");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
    upsertLink("canonical", url);
  }, [title, description, path, image, noIndex]);
}
