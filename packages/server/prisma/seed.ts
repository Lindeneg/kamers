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

    // ── Shipments, Bookings & Containers ────────────────────────
    interface SeedShipment {
        id: string;
        referenceNumber: string;
        origin: string;
        destination: string;
        status: string;
        estimatedArrival?: Date;
        tenantId: string;
    }

    const now = new Date();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

    const seedShipments: SeedShipment[] = [
        // Acme Logistics
        {id: "shp-acme-001", referenceNumber: "SHP-2024-001", origin: "Shanghai", destination: "Rotterdam", status: "in_transit", estimatedArrival: daysFromNow(12), tenantId: "acme-tenant"},
        {id: "shp-acme-002", referenceNumber: "SHP-2024-002", origin: "Busan", destination: "Los Angeles", status: "pending", estimatedArrival: daysFromNow(25), tenantId: "acme-tenant"},
        {id: "shp-acme-003", referenceNumber: "SHP-2024-003", origin: "Singapore", destination: "Felixstowe", status: "delivered", tenantId: "acme-tenant"},
        {id: "shp-acme-004", referenceNumber: "SHP-2024-004", origin: "Hamburg", destination: "Dubai", status: "customs_hold", estimatedArrival: daysFromNow(5), tenantId: "acme-tenant"},
        {id: "shp-acme-005", referenceNumber: "SHP-2024-005", origin: "Ningbo", destination: "Savannah", status: "in_transit", estimatedArrival: daysFromNow(18), tenantId: "acme-tenant"},
        {id: "shp-acme-006", referenceNumber: "SHP-2024-006", origin: "Antwerp", destination: "Colombo", status: "pending", tenantId: "acme-tenant"},
        // Global Freight Inc
        {id: "shp-gf-001", referenceNumber: "GF-SHP-001", origin: "Yokohama", destination: "Long Beach", status: "in_transit", estimatedArrival: daysFromNow(8), tenantId: "globalfreight-tenant"},
        {id: "shp-gf-002", referenceNumber: "GF-SHP-002", origin: "Piraeus", destination: "Valencia", status: "delivered", tenantId: "globalfreight-tenant"},
        {id: "shp-gf-003", referenceNumber: "GF-SHP-003", origin: "Kaohsiung", destination: "Algeciras", status: "pending", estimatedArrival: daysFromNow(30), tenantId: "globalfreight-tenant"},
        {id: "shp-gf-004", referenceNumber: "GF-SHP-004", origin: "Tanjung Pelepas", destination: "Hamburg", status: "cancelled", tenantId: "globalfreight-tenant"},
        {id: "shp-gf-005", referenceNumber: "GF-SHP-005", origin: "Qingdao", destination: "Rotterdam", status: "in_transit", estimatedArrival: daysFromNow(14), tenantId: "globalfreight-tenant"},
    ];

    for (const s of seedShipments) {
        await prisma.shipment.upsert({
            where: {id: s.id},
            update: {},
            create: s,
        });
    }
    console.log(`Seeded ${seedShipments.length} shipments`);

    const seedBookings = [
        // Acme bookings
        {id: "bk-acme-001", shipmentId: "shp-acme-001", customerName: "John Chen", customerEmail: "john.chen@example.com", status: "confirmed", tenantId: "acme-tenant"},
        {id: "bk-acme-002", shipmentId: "shp-acme-001", customerName: "Sara Kim", customerEmail: "sara.kim@example.com", status: "pending", tenantId: "acme-tenant"},
        {id: "bk-acme-003", shipmentId: "shp-acme-002", customerName: "Mike Torres", customerEmail: "mike.t@example.com", status: "confirmed", tenantId: "acme-tenant"},
        {id: "bk-acme-004", shipmentId: "shp-acme-003", customerName: "Lisa Wang", customerEmail: "lisa.wang@example.com", status: "confirmed", tenantId: "acme-tenant"},
        {id: "bk-acme-005", shipmentId: "shp-acme-004", customerName: "Tom Anderson", customerEmail: "tom.a@example.com", status: "pending", tenantId: "acme-tenant"},
        {id: "bk-acme-006", shipmentId: "shp-acme-005", customerName: "Emma Davis", customerEmail: "emma.d@example.com", status: "confirmed", tenantId: "acme-tenant"},
        {id: "bk-acme-007", shipmentId: "shp-acme-005", customerName: "Alex Park", customerEmail: "alex.p@example.com", status: "cancelled", tenantId: "acme-tenant"},
        // Global Freight bookings
        {id: "bk-gf-001", shipmentId: "shp-gf-001", customerName: "Yuki Tanaka", customerEmail: "yuki.t@example.com", status: "confirmed", tenantId: "globalfreight-tenant"},
        {id: "bk-gf-002", shipmentId: "shp-gf-001", customerName: "Hans Mueller", customerEmail: "hans.m@example.com", status: "confirmed", tenantId: "globalfreight-tenant"},
        {id: "bk-gf-003", shipmentId: "shp-gf-002", customerName: "Maria Garcia", customerEmail: "maria.g@example.com", status: "confirmed", tenantId: "globalfreight-tenant"},
        {id: "bk-gf-004", shipmentId: "shp-gf-003", customerName: "Wei Zhang", customerEmail: "wei.z@example.com", status: "pending", tenantId: "globalfreight-tenant"},
        {id: "bk-gf-005", shipmentId: "shp-gf-005", customerName: "Pierre Dubois", customerEmail: "pierre.d@example.com", status: "confirmed", tenantId: "globalfreight-tenant"},
    ];

    for (const b of seedBookings) {
        await prisma.booking.upsert({
            where: {id: b.id},
            update: {},
            create: b,
        });
    }
    console.log(`Seeded ${seedBookings.length} bookings`);

    const seedContainers = [
        // Acme containers
        {id: "ct-acme-001", shipmentId: "shp-acme-001", containerNumber: "MSCU1234567", type: "40ft", status: "in_transit", tenantId: "acme-tenant"},
        {id: "ct-acme-002", shipmentId: "shp-acme-001", containerNumber: "MSCU1234568", type: "20ft", status: "in_transit", tenantId: "acme-tenant"},
        {id: "ct-acme-003", shipmentId: "shp-acme-002", containerNumber: "HLCU9876543", type: "40ft_hc", status: "loaded", tenantId: "acme-tenant"},
        {id: "ct-acme-004", shipmentId: "shp-acme-003", containerNumber: "EISU5551234", type: "20ft", status: "delivered", tenantId: "acme-tenant"},
        {id: "ct-acme-005", shipmentId: "shp-acme-003", containerNumber: "EISU5551235", type: "40ft", status: "delivered", tenantId: "acme-tenant"},
        {id: "ct-acme-006", shipmentId: "shp-acme-004", containerNumber: "CMAU7773210", type: "40ft_hc", status: "loaded", tenantId: "acme-tenant"},
        {id: "ct-acme-007", shipmentId: "shp-acme-005", containerNumber: "OOLU8884321", type: "20ft", status: "in_transit", tenantId: "acme-tenant"},
        {id: "ct-acme-008", shipmentId: "shp-acme-006", containerNumber: "TCLU6665432", type: "40ft", status: "empty", tenantId: "acme-tenant"},
        // Global Freight containers
        {id: "ct-gf-001", shipmentId: "shp-gf-001", containerNumber: "NYKU3334567", type: "40ft", status: "in_transit", tenantId: "globalfreight-tenant"},
        {id: "ct-gf-002", shipmentId: "shp-gf-001", containerNumber: "NYKU3334568", type: "40ft_hc", status: "in_transit", tenantId: "globalfreight-tenant"},
        {id: "ct-gf-003", shipmentId: "shp-gf-002", containerNumber: "SUDU2224567", type: "20ft", status: "delivered", tenantId: "globalfreight-tenant"},
        {id: "ct-gf-004", shipmentId: "shp-gf-003", containerNumber: "YMLU4445678", type: "40ft", status: "empty", tenantId: "globalfreight-tenant"},
        {id: "ct-gf-005", shipmentId: "shp-gf-005", containerNumber: "CSQU1112345", type: "40ft_hc", status: "in_transit", tenantId: "globalfreight-tenant"},
        {id: "ct-gf-006", shipmentId: "shp-gf-005", containerNumber: "CSQU1112346", type: "20ft", status: "in_transit", tenantId: "globalfreight-tenant"},
    ];

    for (const c of seedContainers) {
        await prisma.container.upsert({
            where: {id: c.id},
            update: {},
            create: c,
        });
    }
    console.log(`Seeded ${seedContainers.length} containers\n`);

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
