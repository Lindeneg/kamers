import bcrypt from "bcrypt";
import {loadEnv, unwrap, PERMISSIONS} from "@kamers/shared";
import EnvService from "../src/services/env-service";
import DataService from "../src/services/data-service";

loadEnv("seed", process.argv);

const env = unwrap(EnvService.make(process.env));
const db = new DataService(env);
const prisma = db.p;

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "admin@kamers.dev";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "admin123";

interface SeedUser {
    email: string;
    password: string;
    name: string;
    isSuperAdmin?: boolean;
    isTenantAdmin?: boolean;
    permissions: string[];
}

interface SeedTenant {
    id: string;
    name: string;
    domains: string[];
    users: SeedUser[];
}

const allPermissions = Object.values(PERMISSIONS);
const readPermissions = allPermissions.filter((p) => p.endsWith(".read"));

const tenants: SeedTenant[] = [
    {
        id: "system-tenant",
        name: "System",
        domains: ["kamers.dev"],
        users: [
            {
                email: SUPER_ADMIN_EMAIL,
                password: SUPER_ADMIN_PASSWORD,
                name: "Super Admin",
                isSuperAdmin: true,
                permissions: allPermissions,
            },
        ],
    },
    {
        id: "acme-tenant",
        name: "Acme Logistics",
        domains: ["acme.com"],
        users: [
            {
                email: "alice@acme.com",
                password: "password123",
                name: "Alice Johnson",
                isTenantAdmin: true,
                permissions: allPermissions,
            },
            {
                email: "bob@acme.com",
                password: "password123",
                name: "Bob Smith",
                permissions: ["shipments.read", "bookings.read"],
            },
        ],
    },
    {
        id: "globalfreight-tenant",
        name: "Global Freight Inc",
        domains: ["globalfreight.com"],
        users: [
            {
                email: "carol@globalfreight.com",
                password: "password123",
                name: "Carol Williams",
                isTenantAdmin: true,
                permissions: allPermissions,
            },
            {
                email: "dave@globalfreight.com",
                password: "password123",
                name: "Dave Brown",
                permissions: ["shipments.read", "shipments.write"],
            },
            {
                email: "eve@globalfreight.com",
                password: "password123",
                name: "Eve Davis",
                permissions: readPermissions,
            },
        ],
    },
];

async function main() {
    console.log("Seeding database...\n");

    // ── Permissions ──────────────────────────────────────────────
    const permissionSlugs = Object.values(PERMISSIONS);
    for (const slug of permissionSlugs) {
        await prisma.permission.upsert({
            where: {slug},
            update: {},
            create: {slug},
        });
    }
    console.log(`Seeded ${permissionSlugs.length} permissions\n`);

    // ── Tenants & Users ──────────────────────────────────────────
    const allPermsFromDb = await prisma.permission.findMany();
    const permBySlug = new Map(allPermsFromDb.map((p) => [p.slug, p.id]));

    const summaryRows: string[][] = [];

    for (const t of tenants) {
        const tenant = await prisma.tenant.upsert({
            where: {id: t.id},
            update: {},
            create: {
                id: t.id,
                name: t.name,
                domains: {
                    create: t.domains.map((domain) => ({domain})),
                },
            },
        });

        for (const u of t.users) {
            const passwordHash = await bcrypt.hash(u.password, 12);

            const user = await prisma.user.upsert({
                where: {email: u.email},
                update: {},
                create: {
                    email: u.email,
                    name: u.name,
                    passwordHash,
                    isSuperAdmin: u.isSuperAdmin ?? false,
                    isTenantAdmin: u.isTenantAdmin ?? false,
                    tenantId: tenant.id,
                },
            });

            // Assign permissions
            for (const slug of u.permissions) {
                const permId = permBySlug.get(slug);
                if (!permId) continue;
                await prisma.userPermission.upsert({
                    where: {userId_permissionId: {userId: user.id, permissionId: permId}},
                    update: {},
                    create: {userId: user.id, permissionId: permId},
                });
            }

            summaryRows.push([
                t.name,
                u.email,
                u.password,
                u.isTenantAdmin ? "Yes" : u.isSuperAdmin ? "Super" : "No",
                u.permissions.length === allPermissions.length
                    ? "ALL"
                    : u.permissions.join(", "),
            ]);
        }
    }

    // ── Summary Table ────────────────────────────────────────────
    const headers = ["Tenant", "Email", "Password", "Admin", "Permissions"];
    const colWidths = headers.map((h, i) =>
        Math.max(h.length, ...summaryRows.map((r) => (r[i] ?? "").length))
    );

    function padRow(row: string[]): string {
        return "| " + row.map((cell, i) => cell.padEnd(colWidths[i]!)).join(" | ") + " |";
    }

    const separator = "+" + colWidths.map((w) => "-".repeat(w + 2)).join("+") + "+";

    console.log(separator);
    console.log(padRow(headers));
    console.log(separator);
    for (const row of summaryRows) {
        console.log(padRow(row));
    }
    console.log(separator);

    console.log("\nSeeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
