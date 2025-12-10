export {
    Q8_FORM_SCHEMA,
    FRAMEWORK_OPTIONS,
    DOC_STYLE_OPTIONS,
    normalizeQ8FormData,
    buildQ8GenerationInput,
    computeStructureScore,
    extractQ8Keywords,
    type Q8FormData,
} from "./q8FormConfig";

export {
    Q8_PROMPT_KEY,
    Q8_PROMPT_TEMPLATE,
    Q8_PROMPT_METADATA,
} from "./q8PromptTemplate";

export {
    Q8GenerationService,
    q8GenerationService,
    type Q8GenerationRequest,
    type Q8GenerationResult,
} from "./q8GenerationService";
