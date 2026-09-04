import { expect, test } from "@playwright/test";

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
});

test("public share card hides member identity", async ({ page }) => {
  await page.goto("/share/demo-f1");
  await expect(page.getByRole("heading", { name: "铁板鸡排饭" })).toBeVisible();
  await expect(page.getByText("小林")).not.toBeVisible();
  await expect(page.getByText(/不会显示姓名和原始评价/)).toBeVisible();
});
