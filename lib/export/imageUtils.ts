/**
 * Fetches an image from a URL or local path and returns it as a Buffer.
 */
export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        return null;
    } catch (error) {
        console.error(`[ImageUtils] Failed to fetch image from ${url}:`, error);
        return null;
    }
}

/**
 * Gets dimensions of an image buffer.
 * Supports PNG and basic JPEG parsing.
 */
export function getImageDimensions(buffer: Buffer): { width: number; height: number } {
    try {
        // PNG detection
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            return { width, height };
        }

        // JPEG detection (SOI marker FF D8)
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            let offset = 2;
            while (offset < buffer.length) {
                const marker = buffer.readUInt16BE(offset);
                offset += 2;
                if (marker === 0xFFC0 || marker === 0xFFC2) { // SOF0 or SOF2
                    offset += 3; // skip length and precision
                    const height = buffer.readUInt16BE(offset);
                    const width = buffer.readUInt16BE(offset + 2);
                    return { width, height };
                }
                offset += buffer.readUInt16BE(offset);
            }
        }

        return { width: 600, height: 400 }; // Fallback
    } catch (error) {
        console.error("[ImageUtils] Failed to get image dimensions:", error);
        return { width: 600, height: 400 };
    }
}
