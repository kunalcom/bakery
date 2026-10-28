export const ROLE_PERMISSIONS = {
  owner: [
    "users:manage",
    "products:read",
    "products:manage",
    "inventory:read",
    "inventory:manage",
    "sales:read",
    "sales:manage",
    "sales:create",
    "sales:read_own",
    "production:read",
    "production:manage",
    "reports:read",
  ],
  office_staff: [
    "products:read",
    "inventory:read",
    "sales:read",
    "sales:manage",
    "reports:read",
  ],
  salesman: [
    "products:read",
    "sales:create",
    "sales:read_own",
  ],
  factory_manager: [
    "products:read",
    "inventory:read",
    "production:read",
    "production:manage",
  ],
  store_keeper: [
    "products:read",
    "inventory:read",
    "inventory:manage",
  ],
};
