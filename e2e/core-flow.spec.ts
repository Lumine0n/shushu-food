import { expect, test } from "@playwright/test";

test("guest can draw a food but must log in to change the list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /今天吃点什么/ })).toBeVisible();
  await page.getByRole("button", { name: "看看现在吃什么" }).click();
  await expect(page.getByText("先看这三个")).toBeVisible();
  await page.getByRole("button", { name: "就吃这个" }).first().click();
  await expect(page.getByText(/这次就吃/)).toBeVisible();
  await page.getByRole("button", { name: "收藏", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login\?next=/);

  await page.goto("/record");
  await expect(page.getByRole("heading", { name: "登录后修改美食清单" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存这道食物" })).not.toBeVisible();
  await page.getByRole("link", { name: "去登录" }).click();
  await page.getByRole("button", { name: "进入演示模式" }).click();
  await expect(page).toHaveURL(/\/record$/);
  await expect(page.getByRole("button", { name: "保存这道食物" })).toBeVisible();
});

test("guest login gates preserve personal and share destinations", async ({ page }) => {
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "登录后查看个人清单" })).toBeVisible();
  await page.getByRole("link", { name: "去登录" }).click();
  await page.getByRole("button", { name: "进入演示模式" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("heading", { name: /的饭桌/ })).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await page.goto("/food/f1");
  await page.getByRole("button", { name: "分享" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Ffood%2Ff1$/);
  await page.getByRole("button", { name: "进入演示模式" }).click();
  await expect(page).toHaveURL(/\/food\/f1$/);
  await expect(page.getByRole("heading", { name: "白斩鸡" })).toBeVisible();
});

test("guest recovers from malformed local demo storage", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("shushu-food-demo-v2", "{not-json"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /今天吃点什么/ })).toBeVisible();
  await page.getByRole("button", { name: "看看现在吃什么" }).click();
  await expect(page.getByText("先看这三个")).toBeVisible();
});

test("demo user can decide, choose and leave feedback", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "进入演示模式" }).click();
  await expect(page.getByRole("heading", { name: /今天吃点什么/ })).toBeVisible();
  await page.getByRole("button", { name: "看看现在吃什么" }).click();
  await expect(page.getByText("先看这三个")).toBeVisible();
  await page.getByRole("button", { name: "就吃这个" }).first().click();
  await page.reload();
  await expect(page.getByText(/上次选了/)).toBeVisible();
  await page.getByRole("button", { name: "好吃，还会点" }).click();
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page.getByText(/上次选了/)).not.toBeVisible();
  await page.goto("/me");
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/不用登录就能抽食物/)).toBeVisible();
});

test("public share card hides member identity", async ({ page }) => {
  await page.goto("/share/demo-f1");
  await expect(page.getByRole("heading", { name: "白斩鸡" })).toBeVisible();
  await expect(page.getByText("小林")).not.toBeVisible();
  await expect(page.getByText(/不会显示姓名和原始评价/)).toBeVisible();
  await page.getByRole("link", { name: "免登录抽食物" }).click();
  await expect(page.getByRole("heading", { name: /今天吃点什么/ })).toBeVisible();
});
