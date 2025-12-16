import { pathToRegexp } from "path-to-regexp";

interface RouteInfo {
  path: string;
  methods: string[];
  basePath?: string;
}

function collectRoutes(stack: any[], basePath = ""): RouteInfo[] {
  const routes: RouteInfo[] = [];

  if (!Array.isArray(stack)) {
    return routes;
  }

  for (const layer of stack) {
    // Skip internal Express layers
    if (!layer.route && layer.name !== "router") {
      continue;
    }

    if (layer.route) {
      // Direct route handler
      const path = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());

      if (methods.length > 0) {
        routes.push({
          path,
          methods,
          basePath: basePath || undefined,
        });
      }
    } else if (layer.name === "router" && layer.handle?.stack) {
      // Nested router
      const nextBasePath = basePath + (layer.regexp?.source || "");
      const nestedRoutes = collectRoutes(layer.handle.stack, nextBasePath);
      routes.push(...nestedRoutes);
    }
  }

  return routes;
}

export function runRouteSelfTest(appOrRouter: any, label: string): void {
  let stack: any[] | undefined;

  // Get the stack from app or router
  if (appOrRouter._router?.stack) {
    stack = appOrRouter._router.stack; // Express app
  } else if (appOrRouter.stack) {
    stack = appOrRouter.stack; // Router object
  }

  if (!stack) {
    console.warn(`[${label}] No route stack found to validate`);
    return;
  }

  const routes = collectRoutes(stack);

  if (routes.length === 0) {
    console.log(`[${label}] No routes found to validate`);
    return;
  }

  const errors: Array<{
    path: string;
    methods: string[];
    error: Error;
  }> = [];

  for (const route of routes) {
    // Skip RegExp patterns (Express internal routes)
    if (route.path instanceof RegExp) {
      continue;
    }

    try {
      // Validate the route path
      pathToRegexp(route.path);
    } catch (error) {
      errors.push({
        path: route.path,
        methods: route.methods,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  if (errors.length > 0) {
    console.error(`\n[${label}] Invalid route patterns detected:\n`);

    for (const { path, methods, error } of errors) {
      console.error(`  Route: ${path}`);
      console.error(`  Methods: ${methods.join(", ")}`);
      console.error(`  Error: ${error.message}`);
      console.error(`  Stack: ${error.stack}\n`);
    }

    throw new Error(
      `Invalid route pattern detected: ${errors[0].path}\n` +
        `Found ${errors.length} invalid route(s). See logs above for details.`
    );
  }

  console.log(
    `[${label}] Route validation passed - ${routes.length} route(s) valid`
  );
}

export function wrapRouter(router: any): void {
  const methods = ["get", "post", "put", "delete", "patch", "all", "use"];
  const originalMethods: Record<string, any> = {};

  for (const method of methods) {
    if (typeof router[method] !== "function") {
      continue;
    }

    originalMethods[method] = router[method];

    router[method] = function (...args: any[]) {
      const path = args[0];

      // Only validate string paths (skip middleware functions, RegExp, etc.)
      if (typeof path === "string") {
        try {
          pathToRegexp(path);
        } catch (error) {
          console.error(
            `[wrapRouter] Failed to register route with ${method.toUpperCase()} ${path}`
          );
          console.error(
            `  Error: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
      }

      return originalMethods[method].apply(this, args);
    };
  }
}
