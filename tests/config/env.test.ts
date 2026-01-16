import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { substituteEnvVars } from "../../src/config/env.js";

describe("substituteEnvVars", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of env with test variables
    process.env = {
      ...originalEnv,
      TEST_VAR: "test-value",
      API_KEY: "secret123",
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("string substitution", () => {
    it("should substitute defined env var in string", () => {
      const result = substituteEnvVars("Value is ${TEST_VAR}");
      expect(result).toBe("Value is test-value");
    });

    it("should substitute multiple env vars in same string", () => {
      const result = substituteEnvVars("${TEST_VAR} and ${API_KEY}");
      expect(result).toBe("test-value and secret123");
    });

    it("should keep original if env var undefined", () => {
      const result = substituteEnvVars("Value is ${UNDEFINED_VAR}");
      expect(result).toBe("Value is ${UNDEFINED_VAR}");
    });

    it("should handle string with no env vars", () => {
      const result = substituteEnvVars("plain string");
      expect(result).toBe("plain string");
    });

    it("should handle empty string", () => {
      const result = substituteEnvVars("");
      expect(result).toBe("");
    });
  });

  describe("object substitution", () => {
    it("should substitute in nested objects", () => {
      const result = substituteEnvVars({
        key: "${TEST_VAR}",
        nested: {
          value: "${API_KEY}",
          deep: {
            another: "${TEST_VAR}",
          },
        },
      });
      expect(result).toEqual({
        key: "test-value",
        nested: {
          value: "secret123",
          deep: {
            another: "test-value",
          },
        },
      });
    });

    it("should handle objects with non-string values", () => {
      const result = substituteEnvVars({
        string: "${TEST_VAR}",
        number: 123,
        boolean: true,
        nullValue: null,
      });
      expect(result).toEqual({
        string: "test-value",
        number: 123,
        boolean: true,
        nullValue: null,
      });
    });

    it("should handle empty object", () => {
      const result = substituteEnvVars({});
      expect(result).toEqual({});
    });
  });

  describe("array substitution", () => {
    it("should substitute in arrays", () => {
      const result = substituteEnvVars([
        "${TEST_VAR}",
        "literal",
        "${API_KEY}",
      ]);
      expect(result).toEqual(["test-value", "literal", "secret123"]);
    });

    it("should substitute in nested arrays", () => {
      const result = substituteEnvVars([
        "${TEST_VAR}",
        ["nested", "${API_KEY}"],
        [["deep", "${TEST_VAR}"]],
      ]);
      expect(result).toEqual([
        "test-value",
        ["nested", "secret123"],
        [["deep", "test-value"]],
      ]);
    });

    it("should handle arrays with mixed types", () => {
      const result = substituteEnvVars(["${TEST_VAR}", 123, true, null]);
      expect(result).toEqual(["test-value", 123, true, null]);
    });

    it("should handle empty array", () => {
      const result = substituteEnvVars([]);
      expect(result).toEqual([]);
    });
  });

  describe("primitive values", () => {
    it("should pass through numbers unchanged", () => {
      expect(substituteEnvVars(123)).toBe(123);
      expect(substituteEnvVars(0)).toBe(0);
      expect(substituteEnvVars(-456)).toBe(-456);
      expect(substituteEnvVars(3.14)).toBe(3.14);
    });

    it("should pass through booleans unchanged", () => {
      expect(substituteEnvVars(true)).toBe(true);
      expect(substituteEnvVars(false)).toBe(false);
    });

    it("should pass through null unchanged", () => {
      expect(substituteEnvVars(null)).toBe(null);
    });

    it("should pass through undefined unchanged", () => {
      expect(substituteEnvVars(undefined)).toBe(undefined);
    });
  });

  describe("complex nested structures", () => {
    it("should handle deeply nested mixed structures", () => {
      const result = substituteEnvVars({
        mcp: {
          "server-1": {
            command: "npx",
            args: ["-y", "${TEST_VAR}"],
            env: {
              KEY: "${API_KEY}",
              LITERAL: "value",
            },
          },
          "server-2": {
            url: "https://example.com/${TEST_VAR}",
            headers: {
              Authorization: "Bearer ${API_KEY}",
            },
          },
        },
        skills: {
          paths: ["~/.taal/${TEST_VAR}", "./skills"],
        },
      });

      expect(result).toEqual({
        mcp: {
          "server-1": {
            command: "npx",
            args: ["-y", "test-value"],
            env: {
              KEY: "secret123",
              LITERAL: "value",
            },
          },
          "server-2": {
            url: "https://example.com/test-value",
            headers: {
              Authorization: "Bearer secret123",
            },
          },
        },
        skills: {
          paths: ["~/.taal/test-value", "./skills"],
        },
      });
    });
  });
});
