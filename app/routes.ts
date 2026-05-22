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
      route("tickets", "routes/admin/tickets.tsx"),
      route("billing", "routes/admin/billing.tsx"),
    ]),
  ]),

  // Client portal
  ...prefix("client", [
    layout("routes/client/_layout.tsx", [
      index("routes/client/dashboard.tsx"),
      route("tickets", "routes/client/tickets.tsx"),
      route("tickets/new", "routes/client/tickets.new.tsx"),
      route("billing", "routes/client/billing.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
