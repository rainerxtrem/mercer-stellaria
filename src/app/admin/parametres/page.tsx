"use client";

import { SectionBlock } from "@/components/dashboard/section-block";
import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { PermissionResourceType, RouteMatchType } from "@/generated/prisma/enums";
import { useEffect, useMemo, useState } from "react";

type Grade = {
  id: string;
  code: string;
  name: string;
  rank: number;
  isSystem?: boolean;
};

type UserRow = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: "PUBLIC" | "CLIENT" | "COLLABORATOR" | "ADMIN";
  isActive: boolean;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  userGrades: Array<{
    assignedAt: string;
    grade: Grade;
  }>;
};

type PermissionResource = {
  id: string;
  key: string;
  label: string;
  type: PermissionResourceType;
  description: string | null;
};

type GradePermission = {
  gradeId: string;
  resourceId: string;
};

type RouteBinding = {
  id: string;
  pattern: string;
  matchType: RouteMatchType;
  isEnabled: boolean;
  resourceId: string;
  resource: {
    key: string;
    label: string;
  };
};

type PermissionsPayload = {
  grades: Grade[];
  resources: PermissionResource[];
  permissions: GradePermission[];
  routeBindings: RouteBinding[];
};

type NewResourceForm = {
  key: string;
  label: string;
  type: PermissionResourceType;
  description: string;
};

type NewRouteForm = {
  pattern: string;
  matchType: RouteMatchType;
  resourceId: string;
};

function sortGrades(values: Grade[]) {
  return [...values].sort((a, b) => a.rank - b.rank);
}

export default function AdminSettingsPage() {
  const [status, setStatus] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userForm, setUserForm] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "CLIENT" as UserRow["role"],
    isActive: true,
    gradeIds: [] as string[],
  });

  const [permissionsData, setPermissionsData] = useState<PermissionsPayload>({
    grades: [],
    resources: [],
    permissions: [],
    routeBindings: [],
  });
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const [newResourceForm, setNewResourceForm] = useState<NewResourceForm>({
    key: "",
    label: "",
    type: PermissionResourceType.FEATURE,
    description: "",
  });

  const [newRouteForm, setNewRouteForm] = useState<NewRouteForm>({
    pattern: "",
    matchType: RouteMatchType.PREFIX,
    resourceId: "",
  });

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [users, selectedUserId]);

  const gradePermissionSet = useMemo(() => {
    const entries = permissionsData.permissions
      .filter((permission) => permission.gradeId === selectedGradeId)
      .map((permission) => permission.resourceId);

    return new Set(entries);
  }, [permissionsData.permissions, selectedGradeId]);

  async function loadUsersRoles() {
    const response = await fetch("/api/admin/settings/users-roles");
    if (!response.ok) {
      throw new Error("Impossible de charger les utilisateurs.");
    }

    const payload = await response.json();
    const data = payload?.data;
    const nextUsers = Array.isArray(data?.users) ? (data.users as UserRow[]) : [];
    const nextGrades = Array.isArray(data?.grades) ? (data.grades as Grade[]) : [];

    setUsers(nextUsers);
    setGrades(sortGrades(nextGrades));

    if (!selectedUserId && nextUsers.length > 0) {
      hydrateUserForm(nextUsers[0]);
      setSelectedUserId(nextUsers[0].id);
    }
  }

  async function loadPermissions() {
    const response = await fetch("/api/admin/settings/permissions");
    if (!response.ok) {
      throw new Error("Impossible de charger les permissions.");
    }

    const payload = await response.json();
    const data = payload?.data as PermissionsPayload;

    const nextData: PermissionsPayload = {
      grades: sortGrades(Array.isArray(data?.grades) ? data.grades : []),
      resources: Array.isArray(data?.resources) ? data.resources : [],
      permissions: Array.isArray(data?.permissions) ? data.permissions : [],
      routeBindings: Array.isArray(data?.routeBindings) ? data.routeBindings : [],
    };

    setPermissionsData(nextData);

    if (!selectedGradeId && nextData.grades.length > 0) {
      setSelectedGradeId(nextData.grades[0].id);
    }

    if (!newRouteForm.resourceId && nextData.resources.length > 0) {
      setNewRouteForm((prev) => ({ ...prev, resourceId: nextData.resources[0].id }));
    }
  }

  async function loadAll() {
    await Promise.all([loadUsersRoles(), loadPermissions()]);
  }

  useEffect(() => {
    loadAll().catch(() => setStatus("Erreur de chargement des paramètres."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hydrateUserForm(user: UserRow) {
    setUserForm({
      fullName: user.fullName,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      isActive: user.isActive,
      gradeIds: user.userGrades.map((item) => item.grade.id),
    });
  }

  async function saveUser() {
    if (!selectedUserId) {
      setStatus("Sélectionnez un utilisateur.");
      return;
    }

    const response = await fetch("/api/admin/settings/users-roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        fullName: userForm.fullName,
        firstName: userForm.firstName || null,
        lastName: userForm.lastName || null,
        email: userForm.email,
        phone: userForm.phone || null,
        role: userForm.role,
        isActive: userForm.isActive,
        gradeIds: userForm.gradeIds,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus(payload?.error ?? "Impossible de mettre à jour l'utilisateur.");
      return;
    }

    setStatus("Utilisateur mis à jour.");
    await loadUsersRoles();
  }

  async function togglePermission(resourceId: string, enabled: boolean) {
    if (!selectedGradeId) {
      setStatus("Sélectionnez un grade.");
      return;
    }

    const response = await fetch("/api/admin/settings/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "grade-permission",
        gradeId: selectedGradeId,
        resourceId,
        enabled,
      }),
    });

    if (!response.ok) {
      setStatus("Mise à jour de permission impossible.");
      return;
    }

    await loadPermissions();
    setStatus("Permissions mises à jour.");
  }

  async function createResource() {
    const response = await fetch("/api/admin/settings/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "resource",
        key: newResourceForm.key,
        label: newResourceForm.label,
        resourceType: newResourceForm.type,
        description: newResourceForm.description || undefined,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus(payload?.error ?? "Création de ressource impossible.");
      return;
    }

    setNewResourceForm({ key: "", label: "", type: PermissionResourceType.FEATURE, description: "" });
    setStatus("Ressource créée.");
    await loadPermissions();
  }

  async function createRouteBinding() {
    const response = await fetch("/api/admin/settings/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "route",
        pattern: newRouteForm.pattern,
        matchType: newRouteForm.matchType,
        resourceId: newRouteForm.resourceId,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus(payload?.error ?? "Création de règle route impossible.");
      return;
    }

    setNewRouteForm((prev) => ({ ...prev, pattern: "" }));
    setStatus("Règle de route ajoutée.");
    await loadPermissions();
  }

  async function toggleRouteBinding(binding: RouteBinding) {
    const response = await fetch("/api/admin/settings/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "route",
        id: binding.id,
        isEnabled: !binding.isEnabled,
      }),
    });

    if (!response.ok) {
      setStatus("Mise à jour de règle impossible.");
      return;
    }

    setStatus("Règle mise à jour.");
    await loadPermissions();
  }

  return (
    <main className="brand-shell workspace-shell flex flex-1 justify-center px-6 py-8">
      <div className="workspace-grid mx-auto grid w-full max-w-7xl gap-6">
        {status ? (
          <div className="fixed right-5 top-5 z-[80] w-full max-w-sm" aria-live="polite">
            <div className="rounded-xl border border-ms-navy/15 bg-white/95 px-4 py-3 text-sm font-semibold text-ms-navy shadow-lg backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <p>{status}</p>
                <button
                  type="button"
                  aria-label="Fermer la notification"
                  className="rounded-md px-1 py-0.5 text-xs font-bold opacity-70 hover:opacity-100"
                  onClick={() => setStatus("")}
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <RoleSwitcher currentPath="/admin/parametres" />

        <header className="workspace-hero">
          <p className="workspace-kicker">Espace Direction</p>
          <h1 className="workspace-title">Paramètres RBAC</h1>
          <p className="workspace-subtitle">Gestion centralisée des utilisateurs, grades cumulables et permissions dynamiques.</p>
        </header>

        <SectionBlock title="Utilisateurs & Rôles" subtitle="Fiche utilisateur, activation et attribution multi-grades">
          <div className="grid gap-6 xl:grid-cols-[1.35fr,1fr]">
            <div className="overflow-x-auto rounded-2xl border border-ms-navy/10 bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-ms-cream/40 text-ms-navy-soft">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">Grades</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="text-ms-ink/85">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`cursor-pointer border-t border-ms-navy/10 ${selectedUserId === user.id ? "bg-ms-gold/10" : "hover:bg-ms-cream/35"}`}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        hydrateUserForm(user);
                      }}
                    >
                      <td className="px-4 py-3 font-semibold text-ms-navy">{user.fullName} ({user.email})</td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">{sortGrades(user.userGrades.map((item) => item.grade)).map((grade) => grade.name).join(" • ") || "-"}</td>
                      <td className="px-4 py-3">{user.isActive ? "Actif" : "Désactivé"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 rounded-2xl border border-ms-navy/10 bg-white p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">Fiche utilisateur</p>
              {selectedUser ? (
                <>
                  <input
                    className="w-full rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={userForm.fullName}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Nom complet"
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                      value={userForm.firstName}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
                      placeholder="Prénom"
                    />
                    <input
                      className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                      value={userForm.lastName}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
                      placeholder="Nom"
                    />
                  </div>
                  <input
                    className="w-full rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={userForm.email}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                  />
                  <input
                    className="w-full rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={userForm.phone}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Téléphone"
                  />

                  <div className="grid gap-2 md:grid-cols-2">
                    <select
                      className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                      value={userForm.role}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value as UserRow["role"] }))}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="CLIENT">Client</option>
                      <option value="COLLABORATOR">Collaborateur</option>
                      <option value="ADMIN">Direction</option>
                    </select>

                    <select
                      className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                      value={userForm.isActive ? "active" : "inactive"}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))}
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Désactivé</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-ms-navy/10 bg-ms-cream/30 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">Grades cumulables</p>
                    <div className="grid max-h-56 gap-2 overflow-auto">
                      {sortGrades(grades).map((grade) => {
                        const checked = userForm.gradeIds.includes(grade.id);
                        return (
                          <label key={grade.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setUserForm((prev) => ({
                                  ...prev,
                                  gradeIds: event.target.checked
                                    ? [...prev.gradeIds, grade.id]
                                    : prev.gradeIds.filter((value) => value !== grade.id),
                                }));
                              }}
                            />
                            <span>{grade.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-fit rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white"
                    onClick={() => void saveUser()}
                  >
                    Enregistrer les modifications
                  </button>
                </>
              ) : (
                <p className="text-ms-ink/70">Sélectionnez un utilisateur dans la liste.</p>
              )}
            </div>
          </div>
        </SectionBlock>

        <SectionBlock title="Permissions" subtitle="Matrice dynamique grade × ressources et contrôle des routes">
          <div className="grid gap-6 xl:grid-cols-[1.3fr,1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">Matrice des permissions</p>
                  <select
                    className="rounded-full border border-ms-navy/15 bg-white px-3 py-1.5 text-sm"
                    value={selectedGradeId}
                    onChange={(event) => setSelectedGradeId(event.target.value)}
                  >
                    {permissionsData.grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-[28rem] overflow-auto rounded-xl border border-ms-navy/10">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-ms-cream/40 text-ms-navy-soft">
                      <tr>
                        <th className="px-4 py-3">Clé</th>
                        <th className="px-4 py-3">Libellé</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Autorisé</th>
                      </tr>
                    </thead>
                    <tbody className="text-ms-ink/85">
                      {permissionsData.resources.map((resource) => {
                        const enabled = gradePermissionSet.has(resource.id);
                        return (
                          <tr key={resource.id} className="border-t border-ms-navy/10">
                            <td className="px-4 py-3 font-mono text-xs">{resource.key}</td>
                            <td className="px-4 py-3">{resource.label}</td>
                            <td className="px-4 py-3">{resource.type}</td>
                            <td className="px-4 py-3">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(event) => void togglePermission(resource.id, event.target.checked)}
                                />
                                <span>{enabled ? "Oui" : "Non"}</span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">Ressource de permission</p>
                <div className="grid gap-2">
                  <input
                    className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={newResourceForm.key}
                    onChange={(event) => setNewResourceForm((prev) => ({ ...prev, key: event.target.value }))}
                    placeholder="Ex: feature:contracts.bulk-sign"
                  />
                  <input
                    className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={newResourceForm.label}
                    onChange={(event) => setNewResourceForm((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="Libellé"
                  />
                  <select
                    className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={newResourceForm.type}
                    onChange={(event) =>
                      setNewResourceForm((prev) => ({
                        ...prev,
                        type: event.target.value as PermissionResourceType,
                      }))
                    }
                  >
                    <option value={PermissionResourceType.SPACE}>SPACE</option>
                    <option value={PermissionResourceType.PAGE}>PAGE</option>
                    <option value={PermissionResourceType.MODULE}>MODULE</option>
                    <option value={PermissionResourceType.ACTION}>ACTION</option>
                    <option value={PermissionResourceType.FEATURE}>FEATURE</option>
                  </select>
                  <input
                    className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                    value={newResourceForm.description}
                    onChange={(event) => setNewResourceForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Description (optionnel)"
                  />
                  <button
                    type="button"
                    className="w-fit rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white"
                    onClick={() => void createResource()}
                  >
                    Ajouter la ressource
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-ms-navy/10 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-ms-navy-soft">Règles routes dynamiques</p>
              <div className="grid gap-2">
                <input
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                  value={newRouteForm.pattern}
                  onChange={(event) => setNewRouteForm((prev) => ({ ...prev, pattern: event.target.value }))}
                  placeholder="Ex: /admin/documents"
                />
                <select
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                  value={newRouteForm.matchType}
                  onChange={(event) =>
                    setNewRouteForm((prev) => ({
                      ...prev,
                      matchType: event.target.value as RouteMatchType,
                    }))
                  }
                >
                  <option value={RouteMatchType.PREFIX}>PREFIX</option>
                  <option value={RouteMatchType.EXACT}>EXACT</option>
                  <option value={RouteMatchType.REGEXP}>REGEXP</option>
                </select>
                <select
                  className="rounded-xl border border-ms-navy/15 bg-white px-4 py-2.5"
                  value={newRouteForm.resourceId}
                  onChange={(event) => setNewRouteForm((prev) => ({ ...prev, resourceId: event.target.value }))}
                >
                  {permissionsData.resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.label} ({resource.key})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="w-fit rounded-full bg-ms-navy px-4 py-2.5 font-semibold text-white"
                  onClick={() => void createRouteBinding()}
                >
                  Ajouter la règle
                </button>
              </div>

              <div className="mt-4 max-h-[25rem] space-y-2 overflow-auto rounded-xl border border-ms-navy/10 p-3">
                {permissionsData.routeBindings.map((binding) => (
                  <article key={binding.id} className="rounded-xl border border-ms-navy/10 bg-ms-cream/30 p-3 text-sm">
                    <p className="font-semibold text-ms-navy">{binding.matchType} {binding.pattern}</p>
                    <p className="text-xs text-ms-ink/70">{binding.resource.label} ({binding.resource.key})</p>
                    <button
                      type="button"
                      className="mt-2 rounded-full border border-ms-navy/20 px-3 py-1 text-xs font-semibold text-ms-navy"
                      onClick={() => void toggleRouteBinding(binding)}
                    >
                      {binding.isEnabled ? "Désactiver" : "Activer"}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </SectionBlock>
      </div>
    </main>
  );
}
