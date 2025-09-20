import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { sayHello } from "../functions/say-hello/resource";
import { analyzeDocument } from "../functions/analyze-document/resource";
import { extractClauses } from "../functions/extract-clauses/resource";
import { assessRisks } from "../functions/assess-risks/resource";

const schema = a.schema({
  sayHello: a
    .query()
    .arguments({ name: a.string() })
    .returns(a.string())
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(sayHello)),

  analyzeDocument: a
    .query()
    .arguments({ 
      fileName: a.string(), 
      fileBase64: a.string() 
    })
    .returns(a.json())
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(analyzeDocument)),

  extractClauses: a
    .query()
    .arguments({ 
      text: a.string(), 
      fileBase64: a.string() 
    })
    .returns(a.json())
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(extractClauses)),

  assessRisks: a
    .query()
    .arguments({ 
      text: a.string(), 
      fileBase64: a.string() 
    })
    .returns(a.json())
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(assessRisks)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam",
  },
});