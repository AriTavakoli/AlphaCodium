import { z } from "zod";

export const codeGenSchema = z.object({
  solutions: z
    .array(
      z.object({
          code: z.string().describe("The generated code"),
          imports: z.string().describe("The required imports"),
          prefix: z.string().describe("The code description"),
        })
      )
      .describe("Array of different solution approaches"),
  });

export const testCaseSchema = z.object({
  testCases: z
    .array(
      z.object({
        testCode: z.string().describe("The generated test code"),
        prefix: z.string().describe("The test case description"),
      })
    )
    .describe("Array of different test case approaches"),
});
  
  