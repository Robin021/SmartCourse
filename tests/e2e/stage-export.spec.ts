import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@demo.com", password: "password" };

test.describe("Stage navigation and export (auth)", () => {
    test("admin can create project, navigate stages, and export via UI with format selection", async ({ request, browser, baseURL }) => {
        const server = baseURL || "http://localhost:3000";

        // Seed data to ensure users/config exist
        await request.get(`${server}/api/seed`);

        // Login as admin
        const loginRes = await request.post(`${server}/api/auth/login`, {
            data: ADMIN,
        });
        expect(loginRes.ok()).toBeTruthy();

        const storageState = await request.storageState();
        const context = await browser.newContext({ baseURL: server, storageState });
        const page = await context.newPage();

        // Create a fresh project via API
        const projectName = `E2E Export ${Date.now()}`;
        const createRes = await request.post(`${server}/api/projects`, {
            data: { name: projectName },
        });
        expect(createRes.ok()).toBeTruthy();
        const createJson = await createRes.json();
        const projectId = createJson.project?._id || createJson.project?.id;
        expect(projectId).toBeTruthy();

        // Open project detail page and navigate via cards
        await page.goto(`/project/${projectId}`);
        await expect(page.getByText(projectName, { exact: false })).toBeVisible();
        await expect(page.getByText("Project Stages")).toBeVisible();
        const q2Link = page.getByRole("link", { name: /Q2/i });
        await expect(q2Link).toBeVisible();
        await q2Link.click();
        await expect(page).toHaveURL(/Q2/);
        await expect(page.getByText(/教育哲学|Education Philosophy/i)).toBeVisible();
        await page.goto(`/project/${projectId}`); // back to detail

        // Trigger export via UI button (ExportPanel)
        const formats: Array<{ value: string; ext: string }> = [
            { value: "docx", ext: "docx" },
            { value: "pdf", ext: "pdf" },
            { value: "pptx", ext: "pptx" },
        ];

        for (const fmt of formats) {
            await page.selectOption('select', fmt.value);
            const [download] = await Promise.all([
                page.waitForEvent("download"),
                page.getByRole("button", { name: "导出" }).click(),
            ]);
            const filename = download.suggestedFilename();
            expect(filename).toMatch(new RegExp(`\\.${fmt.ext}$`));
            const stream = await download.createReadStream();
            let size = 0;
            if (stream) {
                for await (const chunk of stream) {
                    size += chunk.length;
                }
            }
            expect(size).toBeGreaterThan(200);
        }

        // Trigger export via API (docx) to verify backend path still works
        const exportRes = await request.get(`${server}/api/project/${projectId}/export?format=docx`);
        expect(exportRes.ok()).toBeTruthy();
        expect(exportRes.headers()["content-type"]).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        const buf = Buffer.from(await exportRes.body());
        expect(buf.byteLength).toBeGreaterThan(200);

        await context.close();
    });
});
