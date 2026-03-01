import bcrypt from "bcrypt";
import {PERMISSIONS} from "@kamers/shared";
import type DataService from "../../services/data-service";
import type AuthService from "../../services/auth-service";

const allPermissions = Object.values(PERMISSIONS);

const PASSWORD = "TestPass123!";

export interface TestWorld {
    tenantA: {id: string};
    tenantB: {id: string};
    superAdmin: {id: string; email: string; password: string; tenantId: string};
    adminA: {id: string; email: string; password: string; tenantId: string};
    userA: {id: string; email: string; password: string; tenantId: string};
    adminB: {id: string; email: string; password: string; tenantId: string};
    userB: {id: string; email: string; password: string; tenantId: string};
    inactiveA: {id: string; email: string; password: string; tenantId: string};
    invitedA: {id: string; email: string; inviteToken: string; tenantId: string};
}

export async function seedTestWorld(
    dataService: DataService,
    authService: AuthService
): Promise<TestWorld> {
    const prisma = dataService.p;

    // Clear all data from previous test runs (order matters for FK constraints)
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.userPermission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenantDomain.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.permission.deleteMany();

    const passwordHash = await bcrypt.hash(PASSWORD, 1);

    // Seed permissions
    for (const slug of allPermissions) {
        await prisma.permission.upsert({
            where: {slug},
            update: {},
            create: {slug},
        });
    }

    const allPermsFromDb = await prisma.permission.findMany();
    const permBySlug = new Map(allPermsFromDb.map((p) => [p.slug, p.id]));

    // Tenant A
    const tenantA = await prisma.tenant.create({
        data: {
            id: "tenant-a",
            name: "Acme Corp",
            domains: {create: [{domain: "acme.com"}]},
        },
    });

    // Tenant B
    const tenantB = await prisma.tenant.create({
        data: {
            id: "tenant-b",
            name: "Other Corp",
            domains: {create: [{domain: "other.com"}]},
        },
    });

    // Super admin (in tenant A)
    const superAdmin = await prisma.user.create({
        data: {
            email: "super@kamers.dev",
            name: "Super Admin",
            passwordHash,
            isSuperAdmin: true,
            tenantId: tenantA.id,
        },
    });
    await assignPermissions(prisma, superAdmin.id, allPermissions, permBySlug);

    // Tenant A admin
    const adminA = await prisma.user.create({
        data: {
            email: "admin@acme.com",
            name: "Admin Acme",
            passwordHash,
            isTenantAdmin: true,
            tenantId: tenantA.id,
        },
    });
    await assignPermissions(prisma, adminA.id, allPermissions, permBySlug);

    // Tenant A regular user (limited perms)
    const userA = await prisma.user.create({
        data: {
            email: "user@acme.com",
            name: "User Acme",
            passwordHash,
            tenantId: tenantA.id,
        },
    });
    await assignPermissions(prisma, userA.id, ["shipments.read", "bookings.read"], permBySlug);

    // Tenant B admin
    const adminB = await prisma.user.create({
        data: {
            email: "admin@other.com",
            name: "Admin Other",
            passwordHash,
            isTenantAdmin: true,
            tenantId: tenantB.id,
        },
    });
    await assignPermissions(prisma, adminB.id, allPermissions, permBySlug);

    // Tenant B regular user
    const userB = await prisma.user.create({
        data: {
            email: "user@other.com",
            name: "User Other",
            passwordHash,
            tenantId: tenantB.id,
        },
    });
    await assignPermissions(prisma, userB.id, ["shipments.read"], permBySlug);

    // Inactive user (tenant A)
    const inactiveA = await prisma.user.create({
        data: {
            email: "inactive@acme.com",
            name: "Inactive User",
            passwordHash,
            isActive: false,
            tenantId: tenantA.id,
        },
    });
    await assignPermissions(prisma, inactiveA.id, allPermissions, permBySlug);

    // Invited user (tenant A) — no password, has invite token
    const inviteToken = authService.generateOpaqueToken();
    const invitedA = await prisma.user.create({
        data: {
            email: "invited@acme.com",
            name: "Invited User",
            tenantId: tenantA.id,
            inviteToken,
            inviteTokenExpiry: authService.getInviteTokenExpiry(),
        },
    });

    return {
        tenantA: {id: tenantA.id},
        tenantB: {id: tenantB.id},
        superAdmin: {id: superAdmin.id, email: superAdmin.email, password: PASSWORD, tenantId: tenantA.id},
        adminA: {id: adminA.id, email: adminA.email, password: PASSWORD, tenantId: tenantA.id},
        userA: {id: userA.id, email: userA.email, password: PASSWORD, tenantId: tenantA.id},
        adminB: {id: adminB.id, email: adminB.email, password: PASSWORD, tenantId: tenantB.id},
        userB: {id: userB.id, email: userB.email, password: PASSWORD, tenantId: tenantB.id},
        inactiveA: {id: inactiveA.id, email: inactiveA.email, password: PASSWORD, tenantId: tenantA.id},
        invitedA: {id: invitedA.id, email: invitedA.email, inviteToken, tenantId: tenantA.id},
    };
}

async function assignPermissions(
    prisma: DataService["p"],
    userId: string,
    slugs: string[],
    permBySlug: Map<string, string>
) {
    for (const slug of slugs) {
        const permId = permBySlug.get(slug);
        if (!permId) continue;
        await prisma.userPermission.create({
            data: {userId, permissionId: permId},
        });
    }
}
