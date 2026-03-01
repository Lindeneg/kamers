/**
 * Permission constants used across client and server.
 * Format: "resource.action"
 */
// TODO not great having this in code, rather have a db table and then an admin panel
// so we can CRUD permissions without having to rebuild the project.
export const PERMISSIONS = {
    SHIPMENTS_READ: "shipments.read",
    SHIPMENTS_WRITE: "shipments.write",

    BOOKINGS_READ: "bookings.read",
    BOOKINGS_WRITE: "bookings.write",

    CONTAINERS_READ: "containers.read",
    CONTAINERS_WRITE: "containers.write",

    USERS_READ: "users.read",
    USERS_WRITE: "users.write",

    AUDIT_READ: "audit.read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if a list of granted permissions satisfies a required permission.
 */
export function hasPermission(granted: Permission[], required: Permission): boolean {
    return granted.includes(required);
}

/**
 * Check if a list of granted permissions satisfies ALL required permissions.
 */
export function hasAllPermissions(granted: Permission[], required: Permission[]): boolean {
    return required.every((p) => granted.includes(p));
}

/**
 * Check if a list of granted permissions satisfies ANY of the required permissions.
 */
export function hasAnyPermission(granted: Permission[], required: Permission[]): boolean {
    return required.some((p) => granted.includes(p));
}

/**
 * Group permissions by their resource prefix (e.g. "shipments.read" → "shipments").
 */
export function groupPermissionsByResource(perms: Permission[]): Record<string, Permission[]> {
    const groups: Record<string, Permission[]> = {};
    for (const perm of perms) {
        const resource = perm.split(".")[0];
        if (!resource) continue;
        if (!groups[resource]) groups[resource] = [];
        groups[resource].push(perm);
    }
    return groups;
}
