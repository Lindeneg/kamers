<script setup lang="ts">
import {ref, computed, onMounted} from "vue";
import {PERMISSIONS} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useContainersStore} from "../stores/containers";
import {usePaginatedResource} from "../composables/usePaginatedRoute";
import {listShipments, type Shipment} from "../api/shipments";
import type {Container} from "../api/containers";
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
const canWrite = computed(() => auth.can(PERMISSIONS.CONTAINERS_WRITE));

const columns = computed<TableColumn[]>(() => {
    const cols: TableColumn[] = [
        {key: "containerNumber", label: "Container #"},
        {key: "type", label: "Type"},
        {key: "shipmentId", label: "Shipment"},
        {key: "status", label: "Status"},
    ];
    if (canWrite.value) cols.push({key: "actions", label: ""});
    return cols;
});

const store = useContainersStore();
const {page, pageSize, onPageChange, onPageSizeChange, refetch} = usePaginatedResource(store);

// Load shipments for the select dropdown
const shipments = ref<Shipment[]>([]);

onMounted(async () => {
    const result = await listShipments({page: 1, pageSize: 100});
    if (result.ok) shipments.value = result.data.data;
});

const shipmentOptions = computed(() =>
    shipments.value.map((s) => ({value: s.id, label: `${s.referenceNumber} (${s.origin} → ${s.destination})`}))
);

const shipmentLookup = computed(() => {
    const map = new Map<string, Shipment>();
    for (const s of shipments.value) map.set(s.id, s);
    return map;
});

const typeOptions = [
    {value: "20ft", label: "20ft"},
    {value: "40ft", label: "40ft"},
    {value: "40ft_hc", label: "40ft HC"},
];

const statusOptions = [
    {value: "empty", label: "Empty"},
    {value: "loaded", label: "Loaded"},
    {value: "in_transit", label: "In Transit"},
    {value: "delivered", label: "Delivered"},
];

const fields = computed<FieldDef[]>(() => [
    {key: "shipmentId", label: "Shipment", type: "select", required: true, options: shipmentOptions.value, placeholder: "Select shipment"},
    {key: "containerNumber", label: "Container Number", type: "text", required: true, placeholder: "MSCU1234567"},
    {key: "type", label: "Type", type: "select", required: true, options: typeOptions, placeholder: "Select type"},
    {key: "status", label: "Status", type: "select", options: statusOptions, placeholder: "Select status"},
]);

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
        shipmentId: data.shipmentId ?? "",
        containerNumber: data.containerNumber ?? "",
        type: data.type ?? "",
        status: data.status,
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
const editTarget = ref<Container | null>(null);
const editLoading = ref(false);
const editError = ref("");
const editFieldErrors = ref<Record<string, string>>({});

function openEditDialog(container: Container) {
    editTarget.value = container;
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
        containerNumber: data.containerNumber,
        type: data.type,
        status: data.status,
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
const deleteTarget = ref<Container | null>(null);
const deleteLoading = ref(false);
const deleteError = ref("");

function openDeleteDialog(container: Container) {
    deleteTarget.value = container;
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
            <h1>Containers</h1>
            <BaseButton v-if="canWrite" variant="secondary" @click="showCreate = true">Create container</BaseButton>
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
                    <template #cell-containerNumber="{value}">
                        <span class="cell-mono">{{ value }}</span>
                    </template>
                    <template #cell-shipmentId="{value}">
                        <span class="cell-mono">{{ shipmentLookup.get(value as string)?.referenceNumber ?? value }}</span>
                    </template>
                    <template #cell-status="{value}">
                        <span class="badge" :class="value as string">
                            {{ (value as string).replace('_', ' ') }}
                        </span>
                    </template>
                    <template v-if="canWrite" #cell-actions="{row}">
                        <div class="actions">
                            <BaseButton variant="ghost" size="sm" @click="openEditDialog(row as Container)">
                                Edit
                            </BaseButton>
                            <BaseButton variant="ghost" size="sm" class="btn-delete" @click="openDeleteDialog(row as Container)">
                                Delete
                            </BaseButton>
                        </div>
                    </template>
                </BaseTable>
            </BaseCard>
            </PaginationControls>

            <BaseCard v-else-if="store.items && store.items.totalPages === 0">
                <p class="empty-state">No containers found. Create one to get started.</p>
            </BaseCard>
        </template>

        <!-- Create dialog -->
        <EntityFormDialog
            :open="showCreate"
            title="Create Container"
            :fields="fields"
            :loading="createLoading"
            :error="createError"
            :field-errors="createFieldErrors"
            @confirm="handleCreate"
            @cancel="showCreate = false" />

        <!-- Edit dialog -->
        <EntityFormDialog
            :open="showEdit"
            title="Edit Container"
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
            title="Delete Container"
            confirm-label="Delete"
            confirm-variant="danger"
            :loading="deleteLoading"
            @confirm="handleDelete"
            @cancel="showDelete = false">
            <p>Are you sure you want to delete container <strong>{{ deleteTarget?.containerNumber }}</strong>? This action cannot be undone.</p>
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

.badge.empty {
    background: var(--color-neutral-weakest-bg);
    color: var(--color-neutral-weak-text);
}

.badge.loaded {
    background: var(--color-info-weak-bg);
    color: var(--color-info);
}

.badge.in_transit {
    background: var(--color-warning-weak-bg);
    color: var(--color-warning-text);
}

.badge.delivered {
    background: var(--color-success-weak-bg);
    color: var(--color-success);
}
</style>
