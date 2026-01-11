
export const CapabilityManifestV1_0_0 = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://p402.io/schemas/p402.capability-manifest.v1.0.0.json",
    title: "p402.capability-manifest.v1.0.0",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "display", "endpoints"],
    properties: {
        schemaVersion: {
            type: "string",
            const: "1.0.0"
        },
        facilitatorKey: { type: "string" },
        display: {
            type: "object",
            additionalProperties: false,
            properties: {
                name: { type: "string" },
                website: { type: "string", format: "uri" },
                docs: { type: "string", format: "uri" },
                supportEmail: { type: "string", format: "email" }
            }
        },
        endpoints: {
            type: "object",
            additionalProperties: false,
            properties: {
                baseUrl: { type: "string", format: "uri" },
                verifyPath: { type: "string" },
                settlePath: { type: "string" },
                supportedPath: { type: "string" },
                statsPath: { type: "string" }
            }
        },
        auth: {
            type: "object",
            additionalProperties: false,
            properties: {
                mode: { type: "string", enum: ["none", "apiKey", "bearer", "hmac"] },
                headerName: { type: "string" },
                tokenEnv: { type: "string" },
                scopes: { type: "array", items: { type: "string" } }
            }
        },
        protocol: {
            type: "object",
            additionalProperties: false,
            properties: {
                x402Version: { type: "array", items: { type: "integer" } },
                requestHeaderMode: { type: "string" },
                legacyHeaderBlocked: { type: "boolean" }
            }
        },
        networks: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    network: { type: "string" },
                    networkAliases: { type: "array", items: { type: "string" } },
                    schemes: { type: "array", items: { type: "string" } },
                    assets: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                symbol: { type: "string" },
                                address: { type: "string" },
                                decimals: { type: "integer" },
                                supportsEip3009: { type: "boolean" }
                            }
                        }
                    }
                }
            }
        },
        limits: {
            type: "object",
            properties: {
                maxAmountUsd: { type: "string" },
                minAmountUsd: { type: "string" },
                rpmSoft: { type: "integer" },
                rpmHard: { type: "integer" }
            }
        },
        features: {
            type: "object",
            properties: {
                kytOfac: { type: "boolean" },
                gasless: { type: "boolean" },
                multiToken: { type: "boolean" },
                multiNetwork: { type: "boolean" },
                webhooks: { type: "boolean" }
            }
        },
        health: {
            type: "object",
            properties: {
                status: { type: "string", enum: ["healthy", "degraded", "down"] },
                successRate: { type: "number" },
                p95VerifyMs: { type: "integer" },
                p95SettleMs: { type: "integer" },
                lastCheckedAt: { type: "string", format: "date-time" },
                lastError: {
                    type: "object",
                    properties: {
                        code: { type: "string" },
                        message: { type: "string" },
                        at: { type: "string", format: "date-time" }
                    }
                }
            }
        }
    }
}
