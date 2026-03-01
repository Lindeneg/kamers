<script setup lang="ts">
import {ref, onMounted} from "vue";
import type {Paginated} from "@kamers/shared";
import {useApiCall} from "../composables/useApiCall";
import {listTenants, createTenant, type Tenant} from "../api/tenants";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import BaseDialog from "../components/base/BaseDialog.vue";
import FormInput from "../components/form/FormInput.vue";

const columns: TableColumn[] = [
    {key: "name", label: "Organization"},
    {key: "domains", label: "Domains"},
];

const {data: tenants, loading, error, execute: fetchTenants} = useApiCall<Paginated<Tenant>>(listTenants);

onMounted(fetchTenants);

// Create tenant dialog
const showCreate = ref(false);
const tenantName = ref("");
const domainsInput = ref("");
const adminEmail = ref("");
const adminName = ref("");
const createLoading = ref(false);
const createError = ref("");
const createSuccess = ref<{email: string} | null>(null);

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
    try {
        const res = await createTenant({
            name: tenantName.value,
            domains,
            adminEmail: adminEmail.value,
            adminName: adminName.value,
        });
        createSuccess.value = {email: res.data.adminUser.email};
        await fetchTenants();
    } catch (e: any) {
        createError.value = e.response?.data?.msg ?? "Failed to create tenant";
    } finally {
        createLoading.value = false;
    }
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
</script>

<template>
    <div>
        <div class="page-header">
            <h1>Tenants</h1>
            <BaseButton variant="secondary" @click="showCreate = true">Create tenant</BaseButton>
        </div>

        <div v-if="loading" class="empty-state">Loading...</div>
        <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
        <BaseCard v-else-if="tenants?.data.length">
            <BaseTable
                :columns="columns"
                :rows="(tenants.data as unknown as Record<string, unknown>[])"
                row-key="id">
                <template #cell-name="{row}">
                    <span class="cell-name">{{ (row as unknown as Tenant).name }}</span>
                </template>
                <template #cell-domains="{row}">
                    <span
                        v-for="d in (row as unknown as Tenant).domains"
                        :key="d.id"
                        class="domain-tag">
                        {{ d.domain }}
                    </span>
                </template>
            </BaseTable>
        </BaseCard>
        <div v-else class="empty-state">No tenants found.</div>

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
</style>
