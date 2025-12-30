import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);

/**
 * Render Mermaid code to a PNG buffer using @mermaid-js/mermaid-cli (mmdc)
 */
export async function renderMermaidToBuffer(code: string): Promise<Buffer | null> {
    const tmpDir = os.tmpdir();
    const id = Math.random().toString(36).substring(2, 10);
    const inputPath = path.join(tmpDir, `mermaid-${id}.mmd`);
    const outputPath = path.join(tmpDir, `mermaid-${id}.png`);
    const puppeteerConfigPath = path.join(tmpDir, `puppeteer-config-${id}.json`);

    try {
        // 1. Write mermaid code to temp file
        await writeFileAsync(inputPath, code, "utf8");

        // 2. Generate puppeteer config dynamically
        // This allows using system Chromium in Docker via PUPPETEER_EXECUTABLE_PATH env var
        const puppeteerConfig: Record<string, unknown> = {
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        };

        // Use system Chromium if PUPPETEER_EXECUTABLE_PATH is set (e.g., in Docker)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        await writeFileAsync(puppeteerConfigPath, JSON.stringify(puppeteerConfig), "utf8");

        // 3. Execute mmdc
        // Try local node_modules first, then fallback to global command
        let mmdcPath = path.resolve(process.cwd(), "node_modules", ".bin", "mmdc");
        let cmdExecutor = "";
        
        if (fs.existsSync(mmdcPath)) {
            // Local install
            cmdExecutor = `"${mmdcPath}"`;
        } else {
            // Fallback to global path or PATH resolution
            // In Docker with npm -g, it should be in PATH
            mmdcPath = "mmdc"; 
            cmdExecutor = "mmdc";
        }

        const cmd = `${cmdExecutor} -i "${inputPath}" -o "${outputPath}" -b transparent --scale 2 -p "${puppeteerConfigPath}"`;

        console.log(`Executing Mermaid: ${cmd}`);

        // Timeout to prevent hanging
        const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
        if (stderr) console.warn("Mermaid CLI Stderr:", stderr);

        // 4. Read the output image
        if (fs.existsSync(outputPath)) {
            const buffer = await readFileAsync(outputPath);
            return buffer;
        } else {
            console.error("Mermaid CLI failed to generate output file.");
            return null;
        }

    } catch (error) {
        console.error("Mermaid Render Error:", error);
        return null;
    } finally {
        // 5. Cleanup
        try {
            if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
            if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
            if (fs.existsSync(puppeteerConfigPath)) await unlinkAsync(puppeteerConfigPath);
        } catch (e) {
            // ignore cleanup errors
        }
    }
}
