import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  // Root — redirects based on auth/role
  index("routes/home.tsx"),

  // Auth
  route("login", "routes/auth/login.tsx"),

  // Admin section
  ...prefix("admin", [
    layout("routes/admin/_layout.tsx", [
      index("routes/admin/dashboard.tsx"),
      route("clients", "routes/admin/clients.tsx"),
      route("clients/new", "routes/admin/clients.new.tsx"),
      route("clients/:clientId", "routes/admin/clients.$clientId.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
