import { NextResponse } from 'next/server';

export async function GET() {
    const spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "P402 Router API",
            "version": "1.0.0",
            "description": "Payment-aware AI orchestration router compatible with OpenAI API."
        },
        "servers": [
            {
                "url": "https://www.p402.io/api"
            }
        ],
        "paths": {
            "/v2/chat/completions": {
                "post": {
                    "operationId": "createChatCompletion",
                    "summary": "Create a chat completion",
                    "requestBody": {
                        "required": true,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "model": {
                                            "type": "string",
                                            "description": "ID of the model to use."
                                        },
                                        "messages": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "role": {
                                                        "type": "string",
                                                        "enum": ["system", "user", "assistant"]
                                                    },
                                                    "content": {
                                                        "type": "string"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Successful response",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "id": { "type": "string" },
                                            "choices": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "message": {
                                                            "type": "object",
                                                            "properties": {
                                                                "role": { "type": "string" },
                                                                "content": { "type": "string" }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    return NextResponse.json(spec);
}
