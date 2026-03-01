import {describe, it, expect} from "vitest";
import {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    groupPermissionsByResource,
    type Permission,
} from "../permissions.js";

const granted: Permission[] = ["shipments.read", "bookings.read", "bookings.write"];

describe("hasPermission", () => {
    it("returns true when permission is granted", () => {
        expect(hasPermission(granted, "shipments.read")).toBe(true);
    });

    it("returns false when permission is not granted", () => {
        expect(hasPermission(granted, "containers.read")).toBe(false);
    });
});

describe("hasAllPermissions", () => {
    it("returns true when all permissions are granted", () => {
        expect(hasAllPermissions(granted, ["shipments.read", "bookings.read"])).toBe(true);
    });

    it("returns false when some permissions are missing", () => {
        expect(hasAllPermissions(granted, ["shipments.read", "containers.read"])).toBe(false);
    });

    it("returns true for empty required list", () => {
        expect(hasAllPermissions(granted, [])).toBe(true);
    });
});

describe("hasAnyPermission", () => {
    it("returns true when at least one permission is granted", () => {
        expect(hasAnyPermission(granted, ["containers.read", "bookings.read"])).toBe(true);
    });

    it("returns false when no permissions match", () => {
        expect(hasAnyPermission(granted, ["containers.read", "users.write"])).toBe(false);
    });

    it("returns false for empty required list", () => {
        expect(hasAnyPermission(granted, [])).toBe(false);
    });
});

describe("groupPermissionsByResource", () => {
    it("groups permissions by resource prefix", () => {
        const result = groupPermissionsByResource(granted);
        expect(result).toEqual({
            shipments: ["shipments.read"],
            bookings: ["bookings.read", "bookings.write"],
        });
    });
});
