// lib/schemas/p402.ts

export const FacilitatorManifestSchema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "P402 Facilitator Capability Manifest",
    "type": "object",
    "required": ["schemaVersion", "facilitator", "capabilities", "endpoints"],
    "properties": {
        "schemaVersion": { "type": "string", "pattern": "^1\\.0\\.0$" },
        "facilitator": {
            "type": "object",
            "required": ["id", "name", "operator", "website"],
            "properties": {
                "id": { "type": "string", "minLength": 3, "maxLength": 64 },
                "name": { "type": "string", "minLength": 2, "maxLength": 80 },
                "operator": { "type": "string", "minLength": 2, "maxLength": 80 },
                "website": { "type": "string" }
            }
        },
        "capabilities": {
            "type": "object",
            "required": ["networks", "assets", "schemes", "features"],
            "properties": {
                "networks": {
                    "type": "array",
                    "items": { "type": "string", "pattern": "^[a-z0-9]+:[0-9]+$" }
                },
                "assets": {
                    "type": "array",
                    "items": { "type": "string", "minLength": 2, "maxLength": 10 }
                },
                "schemes": {
                    "type": "array",
                    "items": { "type": "string", "enum": ["exact", "max"] }
                },
                "features": {
                    "type": "object",
                    "required": ["replayProtection", "amountToleranceBps", "supportsLegacyXPayment"],
                    "properties": {
                        "replayProtection": { "type": "boolean" },
                        "amountToleranceBps": { "type": "integer", "minimum": 0, "maximum": 5000 },
                        "supportsLegacyXPayment": { "type": "boolean" }
                    }
                }
            }
        },
        "endpoints": {
            "type": "object",
            "required": ["verify", "settle", "health"],
            "properties": {
                "verify": { "type": "string" },
                "settle": { "type": "string" },
                "health": { "type": "string" }
            }
        },
        "limits": {
            "type": "object",
            "properties": {
                "maxRequestsPerMinute": { "type": "integer", "minimum": 1 },
                "maxBodyBytes": { "type": "integer", "minimum": 1024 }
            }
        }
    }
};

export const BazaarListingSchema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "P402 Bazaar Listing",
    "type": "object",
    "required": ["schemaVersion", "provider", "resources"],
    "properties": {
        "schemaVersion": { "type": "string", "pattern": "^1\\.0\\.0$" },
        "provider": {
            "type": "object",
            "required": ["providerId", "name"],
            "properties": {
                "providerId": { "type": "string", "minLength": 3, "maxLength": 64 },
                "name": { "type": "string", "minLength": 2, "maxLength": 80 },
                "website": { "type": "string" }
            }
        },
        "resources": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["routeId", "method", "path", "title", "pricing", "payment"],
                "properties": {
                    "routeId": { "type": "string", "minLength": 3, "maxLength": 64 },
                    "method": { "type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                    "path": { "type": "string", "minLength": 1, "maxLength": 256 },
                    "title": { "type": "string", "minLength": 2, "maxLength": 80 },
                    "description": { "type": "string", "maxLength": 500 },
                    "tags": { "type": "array", "items": { "type": "string", "maxLength": 32 } },
                    "pricing": {
                        "type": "object",
                        "required": ["unit", "amountUsd"],
                        "properties": {
                            "unit": { "type": "string", "minLength": 2, "maxLength": 16 },
                            "amountUsd": { "type": "string", "pattern": "^\\d*\\.?\\d+$" }
                        }
                    },
                    "payment": {
                        "type": "object",
                        "required": ["network", "asset", "scheme"],
                        "properties": {
                            "network": { "type": "string", "pattern": "^[a-z0-9]+:[0-9]+$" },
                            "asset": { "type": "string", "minLength": 2, "maxLength": 10 },
                            "scheme": { "type": "string", "enum": ["exact", "max"] }
                        }
                    }
                }
            }
        }
    }
};
