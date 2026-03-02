<script setup lang="ts">
import {ref} from "vue";
import {useTenantsStore} from "../stores/tenants";
import {usePaginatedResource} from "../composables/usePaginatedRoute";
import {createTenant, deleteTenant} from "../api/tenants";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import BaseDialog from "../components/base/BaseDialog.vue";
import FormInput from "../components/form/FormInput.vue";
import PaginationControls from "../components/base/PaginationControls.vue";

const columns: TableColumn[] = [
    {key: "name", label: "Organization"},
    {key: "domains", label: "Domains"},
    {key: "actions", label: ""},
];

const store = useTenantsStore();
const {page, pageSize, onPageChange, onPageSizeChange, refetch} = usePaginatedResource(store);

// Create tenant dialog
const showCreate = ref(false);
const tenantName = ref("");
const domainsInput = ref("");
const adminEmail = ref("");
const adminName = ref("");
const createLoading = ref(false);
const createError = ref("");
const createSuccess = ref<{email: string} | null>(null);

// Delete tenant dialog
const showDelete = ref(false);
const deleteTarget = ref<{id: string; name: string} | null>(null);
const deleteLoading = ref(false);
const deleteError = ref("");

function resetCreateForm() {
    tenantName.value = "";
    domainsInput.value = "";
    adminEmail.value = "";
    adminName.value = "";
    createError.value = "";
    createSuccess.value = null;
}

async function handleCreate() {
    createError.value = "";
    const domains = domainsInput.value
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

    if (domains.length === 0) {
        createError.value = "At least one domain is required";
        return;
    }

    createLoading.value = true;
    const result = await createTenant({
        name: tenantName.value,
        domains,
        adminEmail: adminEmail.value,
        adminName: adminName.value,
    });
    if (result.ok) {
        createSuccess.value = {email: result.data.adminUser.email};
        refetch();
    } else {
        createError.value = result.ctx;
    }
    createLoading.value = false;
}

function closeCreate() {
    showCreate.value = false;
    resetCreateForm();
}

function handleConfirm() {
    if (createSuccess.value) {
        closeCreate();
    } else {
        handleCreate();
    }
}

function openDeleteDialog(row: {id: string; name: string}) {
    deleteTarget.value = row;
    deleteError.value = "";
    showDelete.value = true;
}

async function handleDelete() {
    if (!deleteTarget.value) return;
    deleteError.value = "";
    deleteLoading.value = true;
    const result = await deleteTenant(deleteTarget.value.id);
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
            <h1>Tenants</h1>
            <BaseButton variant="secondary" @click="showCreate = true">Create tenant</BaseButton>
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
                    <template #cell-name="{row}">
                        <span class="cell-name">{{ row.name }}</span>
                    </template>
                    <template #cell-domains="{row}">
                        <span
                            v-for="d in row.domains"
                            :key="d.id"
                            class="domain-tag">
                            {{ d.domain }}
                        </span>
                    </template>
                    <template #cell-actions="{row}">
                        <div class="actions">
                            <BaseButton
                                class="btn-delete"
                                variant="ghost"
                                size="sm"
                                @click="openDeleteDialog(row)">
                                Delete
                            </BaseButton>
                        </div>
                    </template>
                </BaseTable>
            </BaseCard>
            </PaginationControls>
        </template>

        <!-- Create tenant dialog -->
        <BaseDialog
            :open="showCreate"
            title="Create tenant"
            :confirm-label="createSuccess ? 'Done' : 'Create'"
            confirm-variant="secondary"
            :loading="createLoading"
            @confirm="handleConfirm"
            @cancel="closeCreate">
            <div class="dialog-fields">
                <template v-if="createSuccess">
                    <BaseAlert variant="success">
                        Tenant created. Admin invite email sent to <strong>{{ createSuccess.email }}</strong>.
                    </BaseAlert>
                </template>
                <template v-else>
                    <FormInput id="tenant-name" v-model="tenantName" label="Organization name" required />
                    <FormInput
                        id="tenant-domains"
                        v-model="domainsInput"
                        label="Domains"
                        placeholder="example.com, other.com"
                        required />
                    <FormInput id="admin-email" v-model="adminEmail" label="Admin email" type="email" required />
                    <FormInput id="admin-name" v-model="adminName" label="Admin name" required />
                    <BaseAlert v-if="createError" variant="error">{{ createError }}</BaseAlert>
                </template>
            </div>
        </BaseDialog>

        <!-- Delete tenant dialog -->
        <BaseDialog
            :open="showDelete"
            title="Delete tenant"
            confirm-label="Delete"
            confirm-variant="danger"
            :loading="deleteLoading"
            @confirm="handleDelete"
            @cancel="showDelete = false">
            <div class="dialog-fields">
                <p>
                    Are you sure you want to delete
                    <strong>{{ deleteTarget?.name }}</strong>?
                </p>
                <p class="delete-warning">
                    This will deactivate all users in this tenant and they will no longer be able to log in.
                </p>
                <BaseAlert v-if="deleteError" variant="error">{{ deleteError }}</BaseAlert>
            </div>
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

.cell-name {
    font-weight: var(--font-weight-medium);
}

.domain-tag {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    margin-right: var(--space-1);
    background: var(--color-neutral-weakest-bg);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    color: var(--color-neutral-weak-text);
}

.empty-state {
    text-align: center;
    padding: var(--space-12) var(--space-4);
    color: var(--color-neutral-weak-text);
}

.dialog-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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

.delete-warning {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-error);
}
</style>
