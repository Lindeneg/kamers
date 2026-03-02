<script setup lang="ts">
import {ref, computed} from "vue";
import {PERMISSIONS} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useShipmentsStore} from "../stores/shipments";
import {usePaginatedResource} from "../composables/usePaginatedRoute";
import type {Shipment} from "../api/shipments";
import type {ValidationFailure} from "../api/wrap";
import type {FieldDef} from "../components/base/EntityFormDialog.vue";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import BaseDialog from "../components/base/BaseDialog.vue";
import EntityFormDialog from "../components/base/EntityFormDialog.vue";
import PaginationControls from "../components/base/PaginationControls.vue";

const auth = useAuthStore();
const canWrite = computed(() => auth.can(PERMISSIONS.SHIPMENTS_WRITE));

const columns = computed<TableColumn[]>(() => {
    const cols: TableColumn[] = [
        {key: "referenceNumber", label: "Reference"},
        {key: "origin", label: "Origin"},
        {key: "destination", label: "Destination"},
        {key: "estimatedArrival", label: "ETA"},
        {key: "status", label: "Status"},
    ];
    if (canWrite.value) cols.push({key: "actions", label: ""});
    return cols;
});

const store = useShipmentsStore();
const {page, pageSize, onPageChange, onPageSizeChange, refetch} = usePaginatedResource(store);

const statusOptions = [
    {value: "pending", label: "Pending"},
    {value: "in_transit", label: "In Transit"},
    {value: "delivered", label: "Delivered"},
    {value: "customs_hold", label: "Customs Hold"},
    {value: "cancelled", label: "Cancelled"},
];

const fields: FieldDef[] = [
    {key: "referenceNumber", label: "Reference Number", type: "text", required: true, placeholder: "SHP-2024-001"},
    {key: "origin", label: "Origin", type: "text", required: true, placeholder: "Shanghai"},
    {key: "destination", label: "Destination", type: "text", required: true, placeholder: "Rotterdam"},
    {key: "status", label: "Status", type: "select", options: statusOptions, placeholder: "Select status"},
    {key: "estimatedArrival", label: "Estimated Arrival", type: "date"},
];

// Create dialog
const showCreate = ref(false);
const createLoading = ref(false);
const createError = ref("");
const createFieldErrors = ref<Record<string, string>>({});

async function handleCreate(data: Record<string, string>) {
    createError.value = "";
    createFieldErrors.value = {};
    createLoading.value = true;
    const result = await store.create({
        referenceNumber: data.referenceNumber ?? "",
        origin: data.origin ?? "",
        destination: data.destination ?? "",
        status: data.status,
        estimatedArrival: data.estimatedArrival ?? null,
    });
    if (result.ok) {
        showCreate.value = false;
        refetch();
    } else {
        const err = result.ctx as ValidationFailure;
        createError.value = err.msg;
        createFieldErrors.value = err.fieldErrors ?? {};
    }
    createLoading.value = false;
}

// Edit dialog
const showEdit = ref(false);
const editTarget = ref<Shipment | null>(null);
const editLoading = ref(false);
const editError = ref("");
const editFieldErrors = ref<Record<string, string>>({});

function openEditDialog(shipment: Shipment) {
    editTarget.value = {
        ...shipment,
        estimatedArrival: shipment.estimatedArrival
            ? new Date(shipment.estimatedArrival).toISOString().slice(0, 10)
            : "",
    } as any;
    editError.value = "";
    editFieldErrors.value = {};
    showEdit.value = true;
}

async function handleEdit(data: Record<string, string>) {
    if (!editTarget.value) return;
    editError.value = "";
    editFieldErrors.value = {};
    editLoading.value = true;
    const result = await store.update(editTarget.value.id, {
        referenceNumber: data.referenceNumber,
        origin: data.origin,
        destination: data.destination,
        status: data.status,
        estimatedArrival: data.estimatedArrival ?? null,
    });
    if (result.ok) {
        showEdit.value = false;
        editTarget.value = null;
        refetch();
    } else {
        const err = result.ctx as ValidationFailure;
        editError.value = err.msg;
        editFieldErrors.value = err.fieldErrors ?? {};
    }
    editLoading.value = false;
}

// Delete dialog
const showDelete = ref(false);
const deleteTarget = ref<Shipment | null>(null);
const deleteLoading = ref(false);
const deleteError = ref("");

function openDeleteDialog(shipment: Shipment) {
    deleteTarget.value = shipment;
    deleteError.value = "";
    showDelete.value = true;
}

async function handleDelete() {
    if (!deleteTarget.value) return;
    deleteError.value = "";
    deleteLoading.value = true;
    const result = await store.remove(deleteTarget.value.id);
    if (result.ok) {
        showDelete.value = false;
        deleteTarget.value = null;
        refetch();
    } else {
        deleteError.value = result.ctx;
    }
    deleteLoading.value = false;
}
</script>

<template>
    <div>
        <div class="page-header">
            <h1>Shipments</h1>
            <BaseButton v-if="canWrite" variant="secondary" @click="showCreate = true">Create shipment</BaseButton>
        </div>

        <BaseAlert v-if="store.error" variant="error">{{ store.error }}</BaseAlert>
        <template v-else>
            <PaginationControls
                v-if="store.items && store.items.totalPages > 0"
                :page="page"
                :total-pages="store.items.totalPages"
                :total="store.items.total"
                :page-size="pageSize"
                @update:page="onPageChange"
                @update:page-size="onPageSizeChange">

            <BaseCard>
                <BaseTable
                    :columns="columns"
                    :rows="store.items?.data ?? []"
                    :loading="store.loading"
                    :expected-count="pageSize"
                    row-key="id">
                    <template #cell-referenceNumber="{value}">
                        <span class="cell-mono">{{ value }}</span>
                    </template>
                    <template #cell-estimatedArrival="{value}">
                        <span v-if="value">{{ new Date(value as string).toLocaleDateString() }}</span>
                        <span v-else class="cell-muted">—</span>
                    </template>
                    <template #cell-status="{value}">
                        <span class="badge" :class="value as string">
                            {{ (value as string).replace('_', ' ') }}
                        </span>
                    </template>
                    <template v-if="canWrite" #cell-actions="{row}">
                        <div class="actions">
                            <BaseButton variant="ghost" size="sm" @click="openEditDialog(row as Shipment)">
                                Edit
                            </BaseButton>
                            <BaseButton variant="ghost" size="sm" class="btn-delete" @click="openDeleteDialog(row as Shipment)">
                                Delete
                            </BaseButton>
                        </div>
                    </template>
                </BaseTable>
            </BaseCard>
            </PaginationControls>

            <BaseCard v-else-if="store.items && store.items.totalPages === 0">
                <p class="empty-state">No shipments found. Create one to get started.</p>
            </BaseCard>
        </template>

        <!-- Create dialog -->
        <EntityFormDialog
            :open="showCreate"
            title="Create Shipment"
            :fields="fields"
            :loading="createLoading"
            :error="createError"
            :field-errors="createFieldErrors"
            @confirm="handleCreate"
            @cancel="showCreate = false" />

        <!-- Edit dialog -->
        <EntityFormDialog
            :open="showEdit"
            title="Edit Shipment"
            :fields="fields"
            :entity="editTarget"
            :loading="editLoading"
            :error="editError"
            :field-errors="editFieldErrors"
            @confirm="handleEdit"
            @cancel="showEdit = false" />

        <!-- Delete confirmation -->
        <BaseDialog
            :open="showDelete"
            title="Delete Shipment"
            confirm-label="Delete"
            confirm-variant="danger"
            :loading="deleteLoading"
            @confirm="handleDelete"
            @cancel="showDelete = false">
            <p>Are you sure you want to delete shipment <strong>{{ deleteTarget?.referenceNumber }}</strong>? This action cannot be undone.</p>
            <BaseAlert v-if="deleteError" variant="error">{{ deleteError }}</BaseAlert>
        </BaseDialog>
    </div>
</template>

<style scoped>
.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
}

.page-header h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
}

.cell-muted {
    color: var(--color-neutral-weak-text);
}

.cell-mono {
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
}

.actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
}

.btn-delete {
    color: var(--color-error);
    border-color: var(--color-error);
}

.btn-delete:hover:not(:disabled) {
    background: var(--color-error-weak-bg);
}

.empty-state {
    text-align: center;
    padding: var(--space-12) var(--space-4);
    color: var(--color-neutral-weak-text);
}

.badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: capitalize;
}

.badge.in_transit {
    background: var(--color-info-weak-bg);
    color: var(--color-info);
}

.badge.delivered {
    background: var(--color-success-weak-bg);
    color: var(--color-success);
}

.badge.pending {
    background: var(--color-warning-weak-bg);
    color: var(--color-warning-text);
}

.badge.customs_hold {
    background: var(--color-error-weak-bg);
    color: var(--color-error);
}

.badge.cancelled {
    background: var(--color-neutral-weakest-bg);
    color: var(--color-neutral-weak-text);
}
</style>
