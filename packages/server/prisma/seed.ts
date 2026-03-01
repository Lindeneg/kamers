import bcrypt from "bcrypt";
import {loadEnv, unwrap, PERMISSIONS} from "@kamers/shared";
import EnvService from "../src/services/env-service";
import DataService from "../src/services/data-service";

loadEnv("seed", process.argv);

const env = unwrap(EnvService.make(process.env));
const db = new DataService(env);
const prisma = db.p;

async function main() {
    console.log("Seeding database...");

    // ── Permissions ──────────────────────────────────────────────
    const permissionSlugs = Object.values(PERMISSIONS);
    for (const slug of permissionSlugs) {
        await prisma.permission.upsert({
            where: {slug},
            update: {},
            create: {slug},
        });
    }
    console.log(`Seeded ${permissionSlugs.length} permissions`);

    // ── Demo Tenant ──────────────────────────────────────────────
    const tenant = await prisma.tenant.upsert({
        where: {id: "demo-tenant"},
        update: {},
        create: {
            id: "demo-tenant",
            name: "Demo Shipping Co",
            domains: {
                create: [{domain: "demo.com"}],
            },
        },
    });
    console.log(`Seeded tenant: ${tenant.name}`);

    // ── Super Admin User ─────────────────────────────────────────
    const passwordHash = await bcrypt.hash("admin123", 12);

    const superAdmin = await prisma.user.upsert({
        where: {email: "admin@demo.com"},
        update: {},
        create: {
            email: "admin@demo.com",
            name: "Super Admin",
            passwordHash,
            isSuperAdmin: true,
            tenantId: tenant.id,
        },
    });
    console.log(`Seeded super admin: ${superAdmin.email} (password: admin123)`);

    // ── Assign all permissions to super admin ────────────────────
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
        await prisma.userPermission.upsert({
            where: {userId_permissionId: {userId: superAdmin.id, permissionId: perm.id}},
            update: {},
            create: {userId: superAdmin.id, permissionId: perm.id},
        });
    }
    console.log(`Assigned ${allPermissions.length} permissions to super admin`);

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
