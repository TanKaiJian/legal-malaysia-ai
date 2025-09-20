import { defineFunction } from "@aws-amplify/backend";

export const assessRisks = defineFunction({
  name: "assess-risks",
  entry: "./handler.ts"
});