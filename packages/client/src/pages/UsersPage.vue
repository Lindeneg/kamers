<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";
import {PERMISSIONS, type Permission, type Paginated} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useApiCall} from "../composables/useApiCall";
import {usePagination} from "../composables/usePagination";
import {listUsers, inviteUser, updateUserPermissions, transferOwnership, type User} from "../api/users";
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
const allPermissions = Object.values(PERMISSIONS);

// Group permissions by resource (e.g. "shipments" -> ["shipments.read", "shipments.write"])
const permissionGroups = computed(() => {
    const groups: Record<string, Permission[]> = {};
    for (const perm of allPermissions) {
        const resource = perm.split(".")[0];
        if (!resource) continue;
        if (!groups[resource]) groups[resource] = [];
        groups[resource].push(perm);
    }
    return groups;
});

const columns: TableColumn[] = [
    {key: "name", label: "Name"},
    {key: "email", label: "Email"},
    {key: "status", label: "Status"},
    {key: "actions", label: ""},
];

const selectedTenantId = ref("");
const pag = usePagination();

const {data: users, loading, error, execute: fetchUsers} = useApiCall<Paginated<User>>(
    () => listUsers({
        ...pag.params.value,
        ...(selectedTenantId.value && {tenantId: selectedTenantId.value}),
    })
);

const {data: tenants, execute: fetchTenants} = useApiCall<Paginated<Tenant>>(listTenants);

const tenantOptions = computed(() =>
    (tenants.value?.data ?? []).map((t) => ({value: t.id, label: t.name}))
);

async function fetch() {
    await fetchUsers();
    if (users.value) pag.setFromResponse(users.value);
}

onMounted(() => {
    if (auth.isSuperAdmin) fetchTenants();
});

watch(selectedTenantId, () => {
    pag.resetPage();
});

watch([pag.params, selectedTenantId], fetch, {immediate: true});

const isCurrentUserTenantAdmin = computed(() =>
    users.value?.data.some((u) => u.id === auth.user?.id && u.isTenantAdmin) ?? false
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
    try {
        await inviteUser(inviteEmail.value, inviteName.value);
        showInvite.value = false;
        inviteEmail.value = "";
        inviteName.value = "";
        await fetch();
    } catch (e: any) {
        inviteError.value = e.response?.data?.msg ?? "Failed to invite user";
    } finally {
        inviteLoading.value = false;
    }
}

// Permissions editing dialog
const showPermissions = ref(false);
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

function openPermissionsDialog(user: User) {
    editingUser.value = user;
    selectedPermissions.value = [...user.permissions];
    permissionsError.value = "";
    showPermissions.value = true;
}

async function handleUpdatePermissions() {
    if (!editingUser.value) return;
    permissionsError.value = "";
    permissionsLoading.value = true;
    try {
        await updateUserPermissions(editingUser.value.id, selectedPermissions.value);
        showPermissions.value = false;
        editingUser.value = null;
        await fetch();
    } catch (e: any) {
        permissionsError.value = e.response?.data?.msg ?? "Failed to update permissions";
    } finally {
        permissionsLoading.value = false;
    }
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
    try {
        await transferOwnership(transferTarget.value.id);
        showTransfer.value = false;
        transferTarget.value = null;
        await fetch();
        await auth.fetchMe();
    } catch (e: any) {
        transferError.value = e.response?.data?.msg ?? "Failed to transfer ownership";
    } finally {
        transferLoading.value = false;
    }
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
                v-model="selectedTenantId"
                label="Tenant"
                :options="tenantOptions"
                placeholder="Your tenant" />
        </div>

        <div v-if="loading" class="empty-state">Loading...</div>
        <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
        <template v-else-if="users?.data.length">
            <BaseCard>
                <BaseTable
                    :columns="columns"
                    :rows="users.data as unknown as Record<string, unknown>[]"
                    row-key="id">
                    <template #cell-name="{row}">
                        <span class="cell-name">{{ (row as unknown as User).name }}</span>
                        <span v-if="(row as unknown as User).isTenantAdmin" class="badge admin">Admin</span>
                    </template>
                    <template #cell-status="{row}">
                        <span v-if="(row as unknown as User).hasPendingInvite" class="badge pending">
                            Pending
                        </span>
                        <span
                            v-else
                            class="badge"
                            :class="{
                                active: (row as unknown as User).isActive,
                                inactive: !(row as unknown as User).isActive,
                            }">
                            {{ (row as unknown as User).isActive ? "Active" : "Inactive" }}
                        </span>
                    </template>
                    <template #cell-actions="{row}">
                        <div class="actions">
                            <BaseButton
                                v-if="!(row as unknown as User).isTenantAdmin"
                                variant="ghost"
                                size="sm"
                                @click="openPermissionsDialog(row as unknown as User)">
                                Edit permissions
                            </BaseButton>
                            <BaseButton
                                v-if="
                                    isCurrentUserTenantAdmin &&
                                    !(row as unknown as User).isTenantAdmin &&
                                    (row as unknown as User).id !== auth.user?.id
                                "
                                variant="ghost"
                                size="sm"
                                @click="openTransferDialog(row as unknown as User)">
                                Transfer ownership
                            </BaseButton>
                        </div>
                    </template>
                </BaseTable>
            </BaseCard>

            <PaginationControls
                v-model:page="pag.page.value"
                v-model:page-size="pag.pageSize.value"
                :total-pages="pag.totalPages.value"
                :total="pag.total.value" />
        </template>
        <div v-else class="empty-state">No users found.</div>

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

        <!-- Edit permissions dialog -->
        <BaseDialog
            :open="showPermissions"
            title="Edit permissions"
            confirm-label="Save"
            confirm-variant="primary"
            :loading="permissionsLoading"
            @confirm="handleUpdatePermissions"
            @cancel="showPermissions = false">
            <div class="dialog-fields">
                <p v-if="editingUser" class="permissions-subtitle">
                    Editing permissions for <strong>{{ editingUser.name }}</strong>
                </p>

                <label class="grant-all-option" @click.prevent="toggleAll">
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
