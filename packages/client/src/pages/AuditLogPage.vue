<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";
import type {Paginated, AuditLogEntry} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useApiCall} from "../composables/useApiCall";
import {listAuditLogs} from "../api/audit-logs";
import {listTenants, type Tenant} from "../api/tenants";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import FormSelect from "../components/form/FormSelect.vue";

const auth = useAuthStore();

const columns: TableColumn[] = [
    {key: "createdAt", label: "Timestamp"},
    {key: "user", label: "User"},
    {key: "action", label: "Action"},
    {key: "entity", label: "Entity"},
    {key: "details", label: "Details"},
];

const selectedTenantId = ref("");
const page = ref(1);
const pageSize = 20;

const {data: logs, loading, error, execute: fetchLogs} = useApiCall<Paginated<AuditLogEntry>>(
    () => listAuditLogs({
        page: page.value,
        pageSize,
        ...(selectedTenantId.value && {tenantId: selectedTenantId.value}),
    })
);

const {data: tenants, execute: fetchTenants} = useApiCall<Paginated<Tenant>>(listTenants);

const tenantOptions = computed(() =>
    (tenants.value?.data ?? []).map((t) => ({value: t.id, label: t.name}))
);

onMounted(() => {
    fetchLogs();
    if (auth.isSuperAdmin) fetchTenants();
});

watch(selectedTenantId, () => {
    page.value = 1;
    fetchLogs();
});

function prevPage() {
    if (page.value > 1) {
        page.value--;
        fetchLogs();
    }
}

function nextPage() {
    if (logs.value && page.value < logs.value.totalPages) {
        page.value++;
        fetchLogs();
    }
}

function formatTimestamp(date: Date | string): string {
    return new Date(date).toLocaleString();
}
</script>

<template>
    <div>
        <div class="page-header">
            <h1>Audit Log</h1>
        </div>

        <div v-if="auth.isSuperAdmin && tenantOptions.length" class="tenant-filter">
            <FormSelect
                id="tenant-select"
                v-model="selectedTenantId"
                label="Tenant"
                :options="tenantOptions"
                placeholder="Your tenant" />
        </div>

        <div v-if="loading" class="empty-state">Loading...</div>
        <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
        <template v-else-if="logs?.data.length">
            <BaseCard>
                <BaseTable
                    :columns="columns"
                    :rows="(logs.data as unknown as Record<string, unknown>[])"
                    row-key="id">
                    <template #cell-createdAt="{row}">
                        <span class="cell-mono">
                            {{ formatTimestamp((row as unknown as AuditLogEntry).createdAt) }}
                        </span>
                    </template>
                    <template #cell-user="{row}">
                        <template v-if="(row as unknown as AuditLogEntry).user">
                            {{ (row as unknown as AuditLogEntry).user!.name }}
                            <span class="cell-secondary">{{ (row as unknown as AuditLogEntry).user!.email }}</span>
                        </template>
                        <span v-else class="cell-secondary">System</span>
                    </template>
                    <template #cell-action="{value}">
                        <span class="action-tag">{{ value }}</span>
                    </template>
                    <template #cell-details="{value}">
                        <span v-if="value" class="cell-mono cell-secondary">{{ value }}</span>
                        <span v-else class="cell-secondary">&mdash;</span>
                    </template>
                </BaseTable>
            </BaseCard>

            <div v-if="logs.totalPages > 1" class="pagination">
                <button class="page-btn" :disabled="page <= 1" @click="prevPage">&larr; Prev</button>
                <span class="page-info">Page {{ logs.page }} of {{ logs.totalPages }}</span>
                <button class="page-btn" :disabled="page >= logs.totalPages" @click="nextPage">Next &rarr;</button>
            </div>
        </template>
        <div v-else class="empty-state">No audit logs found.</div>
    </div>
</template>

<style scoped>
.page-header {
    margin-bottom: var(--space-6);
}

.page-header h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
}

.tenant-filter {
    max-width: 300px;
    margin-bottom: var(--space-6);
}

.cell-mono {
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    font-size: var(--font-size-xs);
}

.cell-secondary {
    color: var(--color-neutral-weakest-text);
    font-size: var(--font-size-xs);
}

.action-tag {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    background: var(--color-neutral-weakest-bg);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
}

.empty-state {
    text-align: center;
    padding: var(--space-12) var(--space-4);
    color: var(--color-neutral-weak-text);
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    margin-top: var(--space-6);
}

.page-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-neutral-bg);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
    background: var(--color-neutral-weak-bg);
}

.page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.page-info {
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
}
</style>
