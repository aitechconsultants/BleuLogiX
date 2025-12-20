export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  video: "/video",
  videoCreate: "/video/create",
  videoHistory: "/video/history",
  accountHub: "/accounts",
  adminAudit: "/admin/audit",
  adminPolicies: "/admin/policies",
  adminUsers: "/admin/users",
} as const;

export type RouteKey = keyof typeof ROUTES;
