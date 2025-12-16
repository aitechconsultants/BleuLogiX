export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  generator: "/generator",
  videoGenerator: "/video-generator",
  videoGeneratorCreate: "/video-generator/create",
  videoGeneratorHistory: "/video-generator/history",
  accountHub: "/accounts",
  adminAudit: "/admin/audit",
} as const;

export type RouteKey = keyof typeof ROUTES;
