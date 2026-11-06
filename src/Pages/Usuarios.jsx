import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/http';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Loader2, Shield, Pencil, Power } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/permissions';
import { MODULES, MODULE_LABELS } from '@/lib/modules';
import { formatDate } from '@/lib/estoque';
import { toast } from 'sonner';

const ROLE_BADGE = {
  master: 'bg-purple-100 text-purple-700',
  admin: 'bg-indigo-100 text-indigo-700',
  comum: 'bg-slate-100 text-slate-600',
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.AppUser.list(null, 500)
      .then(setUsers)
      .catch(() => toast.error('Erro ao carregar usuários.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api('org/units', { warehouse: false })
      .then(setUnits)
      .catch(() => {});
  }, []);

  const handleToggle = async () => {
    try {
      const newStatus =
        confirmToggle.status === 'active' ? 'inactive' : 'active';
      await base44.entities.AppUser.update(confirmToggle.id, {
        status: newStatus,
      });
      toast.success(
        newStatus === 'active' ? 'Usuário reativado.' : 'Usuário inativado.',
      );
      setConfirmToggle(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Erro ao alterar status.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Usuários e Permissões"
        subtitle="Gerencie quem acessa o sistema e suas permissões"
        icon={Users}
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Usuário</th>
                <th className="text-left px-4 py-2.5">Permissão</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Criado em</th>
                <th className="text-right px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {u.display_name || '—'}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-slate-400">
                          (você)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                      {u.username}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(u.role === 'master'
                          ? MODULES.map((m) => m.key)
                          : u.module_keys || []
                        ).map((k) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.5 text-[10px] rounded border bg-slate-50 text-slate-600"
                          >
                            {MODULE_LABELS[k]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                      >
                        {u.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {u.created_date ? formatDate(u.created_date) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(u);
                            setDialogOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setConfirmToggle(u)}
                            className={`p-1.5 rounded ${u.status === 'active' ? 'hover:bg-rose-50 text-rose-500' : 'hover:bg-emerald-50 text-emerald-500'}`}
                            title={
                              u.status === 'active' ? 'Inativar' : 'Reativar'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 space-y-1.5">
        <div className="font-medium text-slate-700 flex items-center gap-1.5 mb-1">
          <Shield className="w-4 h-4" /> Permissões por nível
        </div>
        <p>
          <strong className="text-purple-700">Master:</strong> Acesso total +
          criar e gerenciar usuários.
        </p>
        <p>
          <strong className="text-indigo-700">Administrador:</strong> Tudo,
          exceto gerenciar usuários.
        </p>
        <p>
          <strong className="text-slate-600">Comum:</strong> Acessa somente os
          módulos liberados, respeitando os limites de operação do perfil.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Os módulos definem a área acessível; o perfil e a unidade definem o
          nível de operação e os dados visíveis.
        </p>
      </div>

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        existingUsers={users}
        units={units}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        onConfirm={handleToggle}
        title={
          confirmToggle?.status === 'active'
            ? 'Inativar Usuário'
            : 'Reativar Usuário'
        }
        message={
          confirmToggle?.status === 'active'
            ? `Inativar "${confirmToggle?.display_name || confirmToggle?.username}"? O usuário não poderá acessar o sistema.`
            : `Reativar "${confirmToggle?.display_name || confirmToggle?.username}"? O usuário voltará a poder acessar o sistema.`
        }
        confirmLabel={
          confirmToggle?.status === 'active' ? 'Inativar' : 'Reativar'
        }
        destructive={confirmToggle?.status === 'active'}
      />
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  user,
  existingUsers,
  units,
  onSaved,
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        user
          ? {
              display_name: user.display_name || '',
              username: user.username || '',
              password: '',
              role: user.role || 'comum',
              unit_ids: user.unit_ids || [],
              module_keys: user.module_keys || [],
              status: user.status || 'active',
            }
          : {
              display_name: '',
              username: '',
              password: '',
              role: 'comum',
              unit_ids: [],
              module_keys: ['estoque'],
              status: 'active',
            },
      );
      setError('');
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!form.username.trim()) {
      setError('Usuário é obrigatório.');
      return;
    }
    if (!form.display_name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    if (!user && !form.password.trim()) {
      setError('Senha é obrigatória.');
      return;
    }

    const dup = existingUsers.find(
      (u) =>
        u.username.toLowerCase() === form.username.trim().toLowerCase() &&
        u.id !== user?.id,
    );
    if (dup) {
      setError('Já existe um usuário com este nome de usuário.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        display_name: form.display_name.trim(),
        username: form.username.trim(),
        role: form.role,
        status: form.status,
        unit_ids: form.unit_ids || [],
        module_keys:
          form.role === 'master'
            ? MODULES.map((m) => m.key)
            : form.module_keys || [],
      };
      if (form.password.trim()) {
        data.password = form.password.trim();
      }
      if (user) {
        await base44.entities.AppUser.update(user.id, data);
        toast.success('Usuário atualizado.');
      } else {
        data.password = form.password.trim();
        await base44.entities.AppUser.create(data);
        toast.success('Usuário criado.');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err.message || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Unidades autorizadas</Label>
            <p className="text-xs text-slate-500">
              O perfil Master acessa todas. Para os demais, selecione sede e/ou
              obras.
            </p>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
              {units.map((unit) => (
                <label
                  key={unit.id}
                  className="flex items-center gap-2 text-sm p-1"
                >
                  <input
                    type="checkbox"
                    disabled={form.role === 'master'}
                    checked={
                      form.role === 'master' ||
                      (form.unit_ids || []).includes(unit.id)
                    }
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        unit_ids: e.target.checked
                          ? [...(v.unit_ids || []), unit.id]
                          : (v.unit_ids || []).filter((id) => id !== unit.id),
                      }))
                    }
                  />
                  {unit.name} ({unit.kind === 'sede' ? 'Sede' : 'Obra'})
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={form.display_name || ''}
              onChange={(e) =>
                setForm({ ...form, display_name: e.target.value })
              }
              placeholder="Nome completo"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input
              value={form.username || ''}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="usuário"
            />
          </div>
          <div className="space-y-2">
            <Label>{user ? 'Nova Senha' : 'Senha'}</Label>
            <Input
              type="password"
              value={form.password || ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={user ? 'Deixe em branco para manter' : '••••••••'}
            />
          </div>
          <div className="space-y-2">
            <Label>Módulos autorizados</Label>
            <p className="text-xs text-slate-500">
              Selecione quais áreas aparecem após o login. O Master possui todos
              os módulos.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label
                  key={m.key}
                  className="flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={
                      form.role === 'master' ||
                      (m.key === 'adm' && form.role === 'comum')
                    }
                    checked={
                      form.role === 'master' ||
                      (form.module_keys || []).includes(m.key)
                    }
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        module_keys: e.target.checked
                          ? [...(f.module_keys || []), m.key]
                          : (f.module_keys || []).filter((k) => k !== m.key),
                      }))
                    }
                  />
                  {m.short}
                </label>
              ))}
            </div>
            <p className="text-xs text-amber-700">
              ADM permite visualizar a área administrativa; gerenciamento de
              usuários permanece exclusivo do Master.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Permissão</Label>
            <select
              value={form.role || 'comum'}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value,
                  module_keys:
                    e.target.value === 'comum'
                      ? (form.module_keys || []).filter((k) => k !== 'adm')
                      : form.module_keys,
                })
              }
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="comum">Comum — Entrada/Saída/Visualização</option>
              <option value="admin">
                Administrador — Tudo, exceto usuários
              </option>
              <option value="master">Master — Acesso total</option>
            </select>
          </div>
          {user && (
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={form.status || 'active'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
