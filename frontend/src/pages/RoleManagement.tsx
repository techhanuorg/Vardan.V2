import React, { useState, useEffect } from "react";
import { Shield, Check } from "lucide-react";

interface RoleDetails {
  name: string;
  description: string;
  permissions: string[];
}

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleDetails[]>([]);

  useEffect(() => {
    // Seed system role profiles for representation
    setRoles([
      {
        name: "Owner",
        description: "Full workspace configuration access, financial audit logs, and keys setup.",
        permissions: ["users.create", "users.read", "users.edit", "users.delete", "settings.manage", "billing.read"],
      },
      {
        name: "Doctor",
        description: "Assigned to medical practitioners to manage patient consultations, triage records, and clinical sheets.",
        permissions: ["patients.manage", "appointments.manage", "knowledge.manage"],
      },
      {
        name: "Receptionist",
        description: "Responsible for appointment schedules, queues registration, and phone intake pipelines.",
        permissions: ["patients.manage", "appointments.manage"],
      },
    ]);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Role Access Matrix
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Review system roles and operational access rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.name}
            className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                {role.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                {role.description}
              </p>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Permissions Included
                </span>
                <ul className="space-y-1.5">
                  {role.permissions.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RoleManagement;
