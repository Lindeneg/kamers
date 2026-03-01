<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";
import type {Paginated, AuditLogEntry} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useApiCall} from "../composables/useApiCall";
import {usePagination} from "../composables/usePagination";
import {listAuditLogs} from "../api/audit-logs";
import {listTenants, type Tenant} from "../api/tenants";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import BaseDialog from "../components/base/BaseDialog.vue";
import FormSelect from "../components/form/FormSelect.vue";
import PaginationControls from "../components/base/PaginationControls.vue";

const auth = useAuthStore();

const columns: TableColumn[] = [
    {key: "createdAt", label: "Timestamp"},
    {key: "user", label: "User"},
    {key: "action", label: "Action"},
    {key: "entity", label: "Entity"},
    {key: "details", label: "Details"},
];

const selectedTenantId = ref("");
const pag = usePagination({defaultPageSize: 20});

const {data: logs, loading, error, execute: fetchLogs} = useApiCall<Paginated<AuditLogEntry>>(
    () => listAuditLogs({
        ...pag.params.value,
        ...(selectedTenantId.value && {tenantId: selectedTenantId.value}),
    })
);

const {data: tenants, execute: fetchTenants} = useApiCall<Paginated<Tenant>>(listTenants);

const tenantOptions = computed(() =>
    (tenants.value?.data ?? []).map((t) => ({value: t.id, label: t.name}))
);

async function fetch() {
    await fetchLogs();
    if (logs.value) pag.setFromResponse(logs.value);
}

onMounted(() => {
    if (auth.isSuperAdmin) fetchTenants();
});

watch(selectedTenantId, () => {
    pag.resetPage();
});

watch([pag.params, selectedTenantId], fetch, {immediate: true});

function formatTimestamp(date: Date | string): string {
    return new Date(date).toLocaleString();
}

// Inspect details dialog
const inspectDetails = ref<Record<string, unknown> | null>(null);

function openInspect(raw: string) {
    try {
        inspectDetails.value = JSON.parse(raw);
    } catch {
        inspectDetails.value = {raw};
    }
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
                        <BaseButton
                            v-if="value"
                            variant="ghost"
                            size="sm"
                            @click="openInspect(value as string)">
                            Inspect
                        </BaseButton>
                        <span v-else class="cell-secondary">&mdash;</span>
                    </template>
                </BaseTable>
            </BaseCard>

            <PaginationControls
                v-model:page="pag.page.value"
                v-model:page-size="pag.pageSize.value"
                :total-pages="pag.totalPages.value"
                :total="pag.total.value" />
        </template>
        <div v-else class="empty-state">No audit logs found.</div>

        <!-- Inspect details dialog -->
        <BaseDialog
            :open="inspectDetails !== null"
            title="Inspect Details"
            confirm-label="Done"
            confirm-variant="secondary"
            @confirm="inspectDetails = null"
            @cancel="inspectDetails = null">
            <dl v-if="inspectDetails" class="inspect-list">
                <template v-for="(val, key) in inspectDetails" :key="key">
                    <dt class="inspect-key">{{ key }}</dt>
                    <dd class="inspect-value">{{ typeof val === 'object' ? JSON.stringify(val) : val }}</dd>
                </template>
            </dl>
        </BaseDialog>
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

.inspect-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    margin: 0;
}

.inspect-key {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    color: var(--color-neutral-text);
}

.inspect-value {
    margin: 0;
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
    word-break: break-all;
}
</style>
