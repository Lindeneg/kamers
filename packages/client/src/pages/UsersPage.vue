<script setup lang="ts">
import {ref, computed, onMounted} from "vue";
import {PERMISSIONS, groupPermissionsByResource, type Permission, type Paginated} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useUsersStore} from "../stores/users";
import {useApiCall} from "../composables/useApiCall";
import {usePaginatedResource} from "../composables/usePaginatedRoute";
import type {User} from "../api/users";
import {listTenants, type Tenant} from "../api/tenants";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import BaseDialog from "../components/base/BaseDialog.vue";
import FormInput from "../components/form/FormInput.vue";
import FormSelect from "../components/form/FormSelect.vue";
import PaginationControls from "../components/base/PaginationControls.vue";

const auth = useAuthStore();
const store = useUsersStore();
const {page, pageSize, getFilter, onPageChange, onPageSizeChange, onFilterChange, refetch} =
    usePaginatedResource(store, {filterKeys: ["tenantId"]});
const allPermissions = Object.values(PERMISSIONS);
const permissionGroups = computed(() => groupPermissionsByResource(allPermissions));

const columns: TableColumn[] = [
    {key: "name", label: "Name"},
    {key: "email", label: "Email"},
    {key: "status", label: "Status"},
    {key: "actions", label: ""},
];

const selectedTenantId = computed(() => getFilter("tenantId"));

const {data: tenants, execute: fetchTenants} = useApiCall<Paginated<Tenant>>(listTenants);

const tenantOptions = computed(() =>
    (tenants.value?.data ?? []).map((t) => ({value: t.id, label: t.name}))
);

onMounted(() => {
    if (auth.isSuperAdmin) fetchTenants();
});

const isCurrentUserTenantAdmin = computed(() =>
    store.items?.data.some((u) => u.id === auth.user?.id && u.isTenantAdmin) ?? false
);

// Invite dialog
const showInvite = ref(false);
const inviteEmail = ref("");
const inviteName = ref("");
const inviteLoading = ref(false);
const inviteError = ref("");

async function handleInvite() {
    inviteError.value = "";
    inviteLoading.value = true;
    const result = await store.invite(inviteEmail.value, inviteName.value);
    if (result.ok) {
        showInvite.value = false;
        inviteEmail.value = "";
        inviteName.value = "";
        refetch();
    } else {
        inviteError.value = result.ctx;
    }
    inviteLoading.value = false;
}

// Permissions editing dialog
const showPermissions = ref(false);
const readOnlyPermissions = ref(false);
const editingUser = ref<User | null>(null);
const selectedPermissions = ref<Permission[]>([]);
const permissionsLoading = ref(false);
const permissionsError = ref("");

const allSelected = computed(() =>
    allPermissions.every((p) => selectedPermissions.value.includes(p))
);

function toggleAll() {
    if (allSelected.value) {
        selectedPermissions.value = [];
    } else {
        selectedPermissions.value = [...allPermissions];
    }
}

function togglePermission(perm: Permission) {
    const idx = selectedPermissions.value.indexOf(perm);
    if (idx === -1) {
        selectedPermissions.value.push(perm);
    } else {
        selectedPermissions.value.splice(idx, 1);
    }
}

function isPermissionsReadOnly(user: User): boolean {
    return user.id === auth.user?.id || !!selectedTenantId.value || user.isTenantAdmin;
}

function openPermissionsDialog(user: User) {
    editingUser.value = user;
    readOnlyPermissions.value = isPermissionsReadOnly(user);
    selectedPermissions.value = [...user.permissions];
    permissionsError.value = "";
    showPermissions.value = true;
}

async function handleUpdatePermissions() {
    if (readOnlyPermissions.value) {
        showPermissions.value = false;
        editingUser.value = null;
        return;
    }
    if (!editingUser.value) return;
    permissionsError.value = "";
    permissionsLoading.value = true;
    const result = await store.updatePermissions(editingUser.value.id, selectedPermissions.value);
    if (result.ok) {
        showPermissions.value = false;
        editingUser.value = null;
        refetch();
    } else {
        permissionsError.value = result.ctx;
    }
    permissionsLoading.value = false;
}

// Deactivate / Delete
const toggleActiveLoading = ref(false);

async function handleToggleActive(user: User) {
    toggleActiveLoading.value = true;
    await store.toggleActive(user.id, !user.isActive);
    toggleActiveLoading.value = false;
    refetch();
}

const showDelete = ref(false);
const deleteTarget = ref<User | null>(null);
const deleteLoading = ref(false);
const deleteError = ref("");

function openDeleteDialog(user: User) {
    deleteTarget.value = user;
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

function formatAction(perm: string): string {
    return perm.split(".")[1]!;
}

// Transfer ownership
const showTransfer = ref(false);
const transferTarget = ref<User | null>(null);
const transferLoading = ref(false);
const transferError = ref("");

function openTransferDialog(user: User) {
    transferTarget.value = user;
    transferError.value = "";
    showTransfer.value = true;
}

async function handleTransfer() {
    if (!transferTarget.value) return;
    transferError.value = "";
    transferLoading.value = true;
    const result = await store.transfer(transferTarget.value.id);
    if (result.ok) {
        showTransfer.value = false;
        transferTarget.value = null;
        refetch();
        await auth.fetchMe();
    } else {
        transferError.value = result.ctx;
    }
    transferLoading.value = false;
}
</script>

<template>
    <div>
        <div class="page-header">
            <h1>Users</h1>
            <BaseButton variant="secondary" @click="showInvite = true">Invite user</BaseButton>
        </div>

        <div v-if="auth.isSuperAdmin && tenantOptions.length" class="tenant-filter">
            <FormSelect
                id="tenant-select"
                :model-value="selectedTenantId"
                label="Tenant"
                :options="tenantOptions"
                placeholder="Your tenant"
                @update:model-value="(v: string) => onFilterChange('tenantId', v)" />
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
                        <span v-if="row.isTenantAdmin" class="badge admin">Admin</span>
                    </template>
                    <template #cell-status="{row}">
                        <span v-if="row.hasPendingInvite" class="badge pending">
                            Pending
                        </span>
                        <span
                            v-else
                            class="badge"
                            :class="{active: row.isActive, inactive: !row.isActive}">
                            {{ row.isActive ? "Active" : "Inactive" }}
                        </span>
                    </template>
                    <template #cell-actions="{row}">
                        <div class="actions">
                            <BaseButton
                                variant="ghost"
                                size="sm"
                                @click="openPermissionsDialog(row)">
                                {{ isPermissionsReadOnly(row) ? "View" : "Permissions" }}
                            </BaseButton>
                            <BaseButton
                                v-if="isCurrentUserTenantAdmin && !row.isTenantAdmin && row.id !== auth.user?.id"
                                variant="secondary"
                                size="sm"
                                @click="openTransferDialog(row)">
                                Transfer
                            </BaseButton>
                            <BaseButton
                                v-if="!row.isTenantAdmin && row.id !== auth.user?.id && !selectedTenantId"
                                :class="row.isActive ? 'btn-deactivate' : 'btn-activate'"
                                variant="ghost"
                                size="sm"
                                :loading="toggleActiveLoading"
                                @click="handleToggleActive(row)">
                                {{ row.isActive ? "Deactivate" : "Activate" }}
                            </BaseButton>
                            <BaseButton
                                v-if="!row.isTenantAdmin && row.id !== auth.user?.id && !selectedTenantId"
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

        <!-- Invite dialog -->
        <BaseDialog
            :open="showInvite"
            title="Invite user"
            confirm-label="Send invite"
            confirm-variant="secondary"
            :loading="inviteLoading"
            @confirm="handleInvite"
            @cancel="showInvite = false">
            <div class="dialog-fields">
                <FormInput
                    id="invite-email"
                    v-model="inviteEmail"
                    label="Email"
                    type="email"
                    required />
                <FormInput id="invite-name" v-model="inviteName" label="Name" required />
                <BaseAlert v-if="inviteError" variant="error">{{ inviteError }}</BaseAlert>
            </div>
        </BaseDialog>

        <!-- Edit/View permissions dialog -->
        <BaseDialog
            :open="showPermissions"
            :title="readOnlyPermissions ? 'View permissions' : 'Edit permissions'"
            :confirm-label="readOnlyPermissions ? 'Done' : 'Save'"
            :confirm-variant="readOnlyPermissions ? 'secondary' : 'primary'"
            :loading="permissionsLoading"
            @confirm="handleUpdatePermissions"
            @cancel="showPermissions = false">
            <div class="dialog-fields">
                <p v-if="editingUser" class="permissions-subtitle">
                    {{ readOnlyPermissions ? "Permissions for" : "Editing permissions for" }}
                    <strong>{{ editingUser.name }}</strong>
                </p>

                <label v-if="!readOnlyPermissions" class="grant-all-option" @click.prevent="toggleAll">
                    <input type="checkbox" :checked="allSelected" @change="toggleAll" />
                    <span class="grant-all-label">Grant all permissions</span>
                </label>

                <div class="permissions-grid">
                    <div
                        v-for="(perms, resource) in permissionGroups"
                        :key="resource"
                        class="permission-group">
                        <span class="resource-name">{{ resource }}</span>
                        <div class="action-toggles">
                            <label
                                v-for="perm in perms"
                                :key="perm"
                                class="action-toggle"
                                :class="{checked: selectedPermissions.includes(perm)}">
                                <input
                                    type="checkbox"
                                    :checked="selectedPermissions.includes(perm)"
                                    :disabled="readOnlyPermissions"
                                    @change="togglePermission(perm)" />
                                <span>{{ formatAction(perm) }}</span>
                            </label>
                        </div>
                    </div>
                </div>

                <BaseAlert v-if="permissionsError" variant="error">{{
                    permissionsError
                }}</BaseAlert>
            </div>
        </BaseDialog>

        <!-- Transfer ownership dialog -->
        <BaseDialog
            :open="showTransfer"
            title="Transfer ownership"
            confirm-label="Transfer"
            confirm-variant="danger"
            :loading="transferLoading"
            @confirm="handleTransfer"
            @cancel="showTransfer = false">
            <div class="dialog-fields">
                <p>
                    Are you sure you want to transfer tenant admin ownership to
                    <strong>{{ transferTarget?.name }}</strong>?
                </p>
                <p class="transfer-warning">
                    You will lose your tenant admin status and cannot undo this action yourself.
                </p>
                <BaseAlert v-if="transferError" variant="error">{{ transferError }}</BaseAlert>
            </div>
        </BaseDialog>

        <!-- Delete user dialog -->
        <BaseDialog
            :open="showDelete"
            title="Delete user"
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
                <p class="transfer-warning">
                    This user will be deactivated and removed from the users list. They will no longer be able to log in.
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

.tenant-filter {
    max-width: 300px;
    margin-bottom: var(--space-6);
}

.cell-name {
    font-weight: var(--font-weight-medium);
}

.badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
}

.badge.active {
    background: var(--color-success-weak-bg);
    color: var(--color-success);
}

.badge.inactive {
    background: var(--color-error-weak-bg);
    color: var(--color-error);
}

.badge.pending {
    background: var(--color-warning-weak-bg);
    color: var(--color-warning-text);
}

.badge.admin {
    margin-left: var(--space-2);
    background: var(--color-primary-weak-bg, rgba(66, 176, 213, 0.15));
    color: var(--color-primary, #42b0d5);
}

.actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    align-items: center;
}

.btn-activate {
    color: var(--color-success);
    border-color: var(--color-success);
}

.btn-activate:hover:not(:disabled) {
    background: var(--color-success-weak-bg);
}

.btn-deactivate {
    color: var(--color-warning-text);
    border-color: var(--color-warning-text);
}

.btn-deactivate:hover:not(:disabled) {
    background: var(--color-warning-weak-bg);
}

.btn-delete {
    color: var(--color-error);
    border-color: var(--color-error);
}

.btn-delete:hover:not(:disabled) {
    background: var(--color-error-weak-bg);
}

.dialog-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.permissions-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
}

.grant-all-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--transition-fast);
}

.grant-all-option:hover {
    background: var(--color-neutral-weakest-bg);
}

.grant-all-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
}

.permissions-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.permission-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
}

.resource-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    text-transform: capitalize;
}

.action-toggles {
    display: flex;
    gap: var(--space-3);
}

.action-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    cursor: pointer;
    font-size: var(--font-size-xs);
    text-transform: capitalize;
    color: var(--color-neutral-weak-text);
}

.action-toggle.checked {
    color: var(--color-neutral-text);
    font-weight: var(--font-weight-medium);
}

.transfer-warning {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-error);
}
</style>
