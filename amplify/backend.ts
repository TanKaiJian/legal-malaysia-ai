import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";
import { sayHello } from "./functions/say-hello/resource";
import { analyzeDocument } from "./functions/analyze-document/resource";
import { extractClauses } from "./functions/extract-clauses/resource";
import { assessRisks } from "./functions/assess-risks/resource";

export const backend = defineBackend({
  data,
  sayHello,
  analyzeDocument,
  extractClauses,
  assessRisks,
});