import React, { useState, useEffect } from "react";
import { Key } from "lucide-react";

interface PermissionDetails {
  name: string;
  description: string;
}

export const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionDetails[]>([]);

  useEffect(() => {
    setPermissions([
      { name: "users.create", description: "Register new staff credentials" },
      { name: "users.read", description: "Access directory logs of active users" },
      { name: "users.edit", description: "Modify active staff configuration and status" },
      { name: "users.delete", description: "Revoke user profiles via soft deletes" },
      { name: "patients.manage", description: "Register patients and save medical notes" },
      { name: "appointments.manage", description: "Reserve slots and schedule consult hours" },
      { name: "campaigns.manage", description: "Design broadcast messaging lists" },
      { name: "knowledge.manage", description: "Configure FAQ answers and sheets" },
      { name: "settings.manage", description: "Modify system and branding configurations" },
    ]);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Permissions
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          List of functional scopes mapped across patient care, AI, and configurations.
        </p>
      </div>

      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-1/3">Permission Key</th>
              <th className="py-3.5 px-4">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {permissions.map((item) => (
              <tr key={item.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary flex items-center gap-2">
                  <Key className="h-3.5 w-3.5" />
                  {item.name}
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default PermissionManagement;
