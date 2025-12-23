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
    const configFile = path.resolve(process.cwd(), "mermaid.json"); // Optional config
    const puppeteerConfig = path.resolve(process.cwd(), "puppeteer-config.json");

    try {
        // 1. Write mermaid code to temp file
        // Ensure proper graph declaration if missing or just wrap code
        // For now, assume code is valid mermaid
        await writeFileAsync(inputPath, code, "utf8");

        // 2. Execute mmdc
        // npx is safest in dev, but in prod we might need direct path.
        // Assuming npm install @mermaid-js/mermaid-cli was run locally.
        // We use 'npx -y' to ensure it runs even if not perfectly linked, or direct path.
        // Better: use the local bin path if possible.
        const mmdcPath = path.resolve(process.cwd(), "node_modules", ".bin", "mmdc");
        const cmd = `"${mmdcPath}" -i "${inputPath}" -o "${outputPath}" -b transparent --scale 2 -p "${puppeteerConfig}"`;

        console.log(`Executing Mermaid: ${cmd}`);

        // Timeout to prevent hanging
        const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
        if (stderr) console.warn("Mermaid CLI Stderr:", stderr);

        // 3. Read the output image
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
        // 4. Cleanup
        try {
            if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
            if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
        } catch (e) {
            // ignore cleanup errors
        }
    }
}
