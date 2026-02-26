/**
 * src/config/swagger.js — Swagger/OpenAPI spec configuration.
 */
import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CycleLink API",
      version: "1.0.0",
      description:
        "RESTful API for CycleLink — cycling rewards platform with cyclist, partner, and admin roles.",
    },
    servers: [
      { url: "http://localhost:5000/api", description: "Local Development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            role: { type: "string", enum: ["cyclist", "partner", "admin"] },
            shopName: { type: "string" },
            shopImage: { type: "string" },
            profileImage: { type: "string" },
            tokens: { type: "integer", example: 150 },
            totalDistance: { type: "number", example: 42.5 },
            co2Saved: { type: "number", example: 8.93 },
            totalRides: { type: "integer", example: 12 },
            isVerified: { type: "boolean" },
            isBlocked: { type: "boolean" },
            bankDetails: { $ref: "#/components/schemas/BankDetails" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Ride: {
          type: "object",
          properties: {
            _id: { type: "string" },
            cyclistId: { type: "string" },
            routeId: { type: "string", nullable: true },
            startLocation: { type: "string" },
            endLocation: { type: "string" },
            distance: { type: "number", example: 5.2 },
            durationMinutes: { type: "number", nullable: true },
            durationText: { type: "string" },
            tokensEarned: { type: "integer" },
            co2Saved: { type: "number" },
            status: { type: "string", enum: ["active", "paused", "completed", "cancelled"] },
            startedAt: { type: "string", format: "date-time" },
            endedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        Reward: {
          type: "object",
          properties: {
            _id: { type: "string" },
            partnerId: { type: "string" },
            title: { type: "string", example: "Free Coffee" },
            description: { type: "string" },
            tokenCost: { type: "integer", example: 50 },
            expiryDate: { type: "string", format: "date-time", nullable: true },
            active: { type: "boolean" },
          },
        },
        Hazard: {
          type: "object",
          properties: {
            _id: { type: "string" },
            lat: { type: "number", example: 6.9271 },
            lng: { type: "number", example: 79.8612 },
            type: { type: "string", enum: ["pothole", "construction", "accident", "flooding", "other"] },
            description: { type: "string" },
            reportedBy: { type: "string" },
            active: { type: "boolean" },
            status: { type: "string", enum: ["reported", "verified", "resolved", "invalid"] },
            verifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  status: { type: "string", enum: ["exists", "resolved", "spam"] },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
            existsCount: { type: "integer" },
            resolvedCount: { type: "integer" },
            spamCount: { type: "integer" },
          },
        },
        Route: {
          type: "object",
          properties: {
            _id: { type: "string" },
            creatorId: { type: "string" },
            startLocation: { type: "string", example: "Colombo Fort" },
            endLocation: { type: "string", example: "Galle Face" },
            path: { type: "array", items: { $ref: "#/components/schemas/PathPoint" } },
            distance: { type: "string", example: "3.5 km" },
            duration: { type: "string" },
            weatherCondition: { type: "string" },
            status: { type: "string", enum: ["pending", "approved", "rejected"] },
            ratings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
            averageRating: { type: "number" },
            ratingCount: { type: "integer" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            transactionId: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string", example: "lkr" },
            status: { type: "string", enum: ["Success", "Pending"] },
            productName: { type: "string" },
          },
        },
        Payout: {
          type: "object",
          properties: {
            _id: { type: "string" },
            partnerId: { type: "string" },
            month: { type: "string", example: "2025-01" },
            totalTokens: { type: "integer" },
            totalAmount: { type: "number" },
            status: { type: "string", enum: ["Pending", "Paid"] },
            transactionId: { type: "string" },
            adjustmentAmount: { type: "number" },
            adjustmentNote: { type: "string" },
          },
        },
        PayoutRequest: {
          type: "object",
          properties: {
            _id: { type: "string" },
            partnerId: { type: "string" },
            amount: { type: "number" },
            status: { type: "string", enum: ["Pending", "Paid", "Rejected"] },
            transactionId: { type: "string" },
            rejectionReason: { type: "string" },
          },
        },
        Redemption: {
          type: "object",
          properties: {
            _id: { type: "string" },
            partnerId: { type: "string" },
            cyclistId: { type: "string" },
            tokens: { type: "integer" },
            transactionId: { type: "string", nullable: true },
            itemName: { type: "string", nullable: true },
          },
        },
        BankDetails: {
          type: "object",
          properties: {
            bankName: { type: "string", example: "Bank of Ceylon" },
            branchName: { type: "string", example: "Colombo Main" },
            accountNo: { type: "string", example: "0012345678" },
            accountHolderName: { type: "string", example: "John Doe" },
          },
        },
        PathPoint: {
          type: "object",
          properties: {
            lat: { type: "number", example: 6.9271 },
            lng: { type: "number", example: 79.8612 },
          },
          required: ["lat", "lng"],
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Success" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "array", items: {} },
            pagination: {
              type: "object",
              properties: {
                total: { type: "integer" },
                page: { type: "integer" },
                limit: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
      },
      parameters: {
        pathId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Resource ID",
        },
        queryPage: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        queryLimit: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          description: "Items per page",
        },
        queryPeriod: {
          name: "period",
          in: "query",
          schema: { type: "string", enum: ["week", "month", "3months"] },
          description: "Time period filter",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
});

export default swaggerSpec;
