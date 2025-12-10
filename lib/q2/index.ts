export {
    Q2_FORM_SCHEMA,
    EDUCATION_THEORIES,
    normalizeQ2FormData,
    buildQ2GenerationInput,
    computeTheoryFitScore,
    extractQ2Keywords,
    type Q2FormData,
} from "./q2FormConfig";

export {
    Q2_PROMPT_KEY,
    Q2_PROMPT_TEMPLATE,
    Q2_PROMPT_METADATA,
} from "./q2PromptTemplate";

export {
    Q2GenerationService,
    q2GenerationService,
    type Q2GenerationRequest,
    type Q2GenerationResult,
} from "./q2GenerationService";
