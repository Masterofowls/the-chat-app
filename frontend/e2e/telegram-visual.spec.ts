import { expect, test, type Page } from "@playwright/test";

async function openE2e(page: Page, path = "/") {
  await page.addInitScript(() => {
    localStorage.setItem("relay-e2e", "1");
    localStorage.setItem("relay-theme", "dark");
  });
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}e2e=1`);
  await page.waitForSelector(".app-shell, .auth-screen", { timeout: 20_000 });
}

test.describe("Telegram shell visuals", () => {
  test("sign-in screen", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("relay-e2e");
      localStorage.setItem("relay-theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /sign in to relay/i })).toBeVisible();
    await expect(page).toHaveScreenshot("signin-dark.png", { fullPage: true });
  });

  test("chat list and empty pane", async ({ page }, testInfo) => {
    await openE2e(page, "/");
    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(page.getByText("Alice")).toBeVisible();

    if (testInfo.project.name.startsWith("mobile")) {
      await expect(page.locator(".sidebar")).toBeVisible();
      await expect(page.locator(".main-pane")).toBeHidden();
    } else {
      await expect(page.getByText(/select a chat to start messaging/i)).toBeVisible();
    }

    await expect(page).toHaveScreenshot("inbox.png");
  });

  test("open conversation", async ({ page }, testInfo) => {
    await openE2e(page, "/");
    await page.getByRole("button", { name: /alice/i }).first().click();
    await expect(page).toHaveURL(/\/chat\/e2e-conversation/);
    const thread = page.getByRole("region", { name: /conversation with alice/i });
    await expect(thread.locator("#msg-e2e-message-1")).toContainText("Hey — welcome to Relay");
    await expect(thread.locator("#msg-e2e-message-2")).toContainText("Thanks @alice! Looks like Telegram.");

    if (testInfo.project.name.startsWith("mobile")) {
      await expect(page.getByRole("button", { name: /back to chats/i })).toBeVisible();
      await expect(page.locator(".sidebar")).toBeHidden();
    }

    await expect(page).toHaveScreenshot("conversation.png");
  });

  test("settings overview", async ({ page }, testInfo) => {
    await openE2e(page, "/settings");
    await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
    await expect(page.getByText("My profile").first()).toBeVisible();

    if (testInfo.project.name.startsWith("mobile")) {
      await expect(page.locator(".settings-nav")).toBeVisible();
    } else {
      await expect(page.locator(".settings-panel")).toBeVisible();
    }

    await expect(page).toHaveScreenshot("settings.png");
  });

  test("profile settings page", async ({ page }) => {
    await openE2e(page, "/settings/profile");
    await expect(page.getByRole("heading", { name: /my profile|relay demo/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("@relaydemo")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(page).toHaveScreenshot("profile.png");
  });
});

test.describe("Telegram interactions", () => {
  test("mobile back returns to list", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "mobile only");
    await openE2e(page, "/chat/e2e-conversation");
    const thread = page.getByRole("region", { name: /conversation with alice/i });
    await expect(thread.locator("#msg-e2e-message-1")).toBeVisible();
    await page.getByRole("button", { name: /back to chats/i }).click();
    await expect(page).toHaveURL(/\/(\?|$)/);
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.getByText("Alice")).toBeVisible();
  });

  test("unknown chat is not a mobile trap", async ({ page }, testInfo) => {
    await openE2e(page, "/chat/missing-conversation");
    if (testInfo.project.name.startsWith("mobile")) {
      await expect(page.locator(".sidebar")).toBeVisible();
      await expect(page.getByText("Alice")).toBeVisible();
    } else {
      await expect(page.getByText(/this chat isn't available/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /back to chats/i })).toBeVisible();
    }
  });

  test("mention opens a profile", async ({ page }) => {
    await openE2e(page, "/chat/e2e-conversation");
    await page.getByRole("button", { name: "@alice" }).click();
    await expect(page).toHaveURL(/\/profile\/e2e-peer/);
    await expect(page.getByRole("heading", { name: "Alice" })).toBeVisible();
  });

  test("composer appends a message in e2e", async ({ page }) => {
    await openE2e(page, "/chat/e2e-conversation");
    await page.getByLabel("Message").fill("Playwright ping");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Playwright ping")).toBeVisible();
  });
});
