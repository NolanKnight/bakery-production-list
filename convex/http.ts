import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { handleSquareOrderCreatedWebhook } from "./retailOrders";

const http = httpRouter();

// CORS handling is required for client side frameworks
authComponent.registerRoutes(http, createAuth, { cors: true });
http.route({
  path: "/webhooks/square/order-created",
  method: "POST",
  handler: handleSquareOrderCreatedWebhook,
});

export default http;
