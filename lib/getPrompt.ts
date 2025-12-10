import connectDB from "@/lib/db";
import PromptTemplate from "@/models/PromptTemplate";
import PromptVersion from "@/models/PromptVersion";

interface GetPromptOptions {
    key: string;
    variables?: Record<string, string>;
    userId?: string; // For user-consistent A/B testing
}

interface PromptResult {
    template: string;
    interpolated: string;
    version: number;
    isABTest: boolean;
}

/**
 * Fetch a prompt by key, handle A/B testing, and interpolate variables.
 */
export async function getPrompt(options: GetPromptOptions): Promise<PromptResult | null> {
    await connectDB();

    const prompt = await PromptTemplate.findOne({ key: options.key });
    if (!prompt) {
        console.info(`Prompt not found: ${options.key}, will fallback to default template if provided.`);
        return null;
    }

    let template = prompt.template;
    let version = prompt.current_version;
    let isABTest = false;

    // Handle A/B Testing
    if (prompt.ab_testing?.enabled && prompt.ab_testing.versions.length > 0) {
        isABTest = true;
        const selectedVersion = selectABVersion(
            prompt.ab_testing.versions,
            options.userId
        );

        if (selectedVersion) {
            const versionDoc = await PromptVersion.findOne({
                prompt_id: prompt._id,
                version: selectedVersion,
            });

            if (versionDoc) {
                template = versionDoc.template;
                version = selectedVersion;
            }
        }
    }

    // Interpolate variables
    let interpolated = template;
    if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
            interpolated = interpolated.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, "g"),
                value
            );
        }
    }

    return {
        template,
        interpolated,
        version,
        isABTest,
    };
}

/**
 * Select a version based on A/B test weights.
 * If userId is provided, uses consistent hashing for same-user experience.
 */
function selectABVersion(
    versions: { version: number; weight: number }[],
    userId?: string
): number | null {
    if (versions.length === 0) return null;

    // Normalize weights to ensure they sum to 100
    const totalWeight = versions.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return versions[0].version;

    // Generate random or user-consistent value
    let random: number;
    if (userId) {
        // Simple hash for consistent user experience
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash |= 0;
        }
        random = Math.abs(hash) % 100;
    } else {
        random = Math.random() * 100;
    }

    // Weighted random selection
    let cumulative = 0;
    for (const v of versions) {
        cumulative += (v.weight / totalWeight) * 100;
        if (random < cumulative) {
            return v.version;
        }
    }

    return versions[versions.length - 1].version;
}

/**
 * Simple interpolation helper if you already have the template.
 */
export function interpolateTemplate(
    template: string,
    variables: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return result;
}
