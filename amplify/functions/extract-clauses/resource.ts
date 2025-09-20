import { defineFunction } from "@aws-amplify/backend";

export const extractClauses = defineFunction({
  name: "extract-clauses",
  entry: "./handler.ts"
});