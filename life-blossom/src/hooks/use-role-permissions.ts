"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { RolePermission } from "@/lib/api-types";

/**
 * Hook to load and check the current user's module permissions.
 * Usage: const { loading, canView, canCreate, canEdit, canDelete } = useRolePermissions();
 */
export function useRolePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.role || user.role === "patient") {
      setLoading(false);
      return;
    }
    fetch(`/api/role-permissions?role=${encodeURIComponent(user.role)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setPermissions(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.role]);

  const findPerm = useCallback(
    (module: string) => permissions.find((p) => p.module === module),
    [permissions],
  );

  const canView = useCallback((module: string) => findPerm(module)?.can_view ?? false, [findPerm]);
  const canCreate = useCallback((module: string) => findPerm(module)?.can_create ?? false, [findPerm]);
  const canEdit = useCallback((module: string) => findPerm(module)?.can_edit ?? false, [findPerm]);
  const canDelete = useCallback((module: string) => findPerm(module)?.can_delete ?? false, [findPerm]);

  return { loading, permissions, canView, canCreate, canEdit, canDelete };
}
