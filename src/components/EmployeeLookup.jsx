import React, { useState } from 'react';
import { Search, UserRoundCheck, AlertCircle } from 'lucide-react';
import { api } from '@/api/http';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Resolve matrícula through PHP; never trusts client-provided name or department.
export default function EmployeeLookup({
  registration,
  onRegistrationChange,
  employee,
  onEmployeeChange,
  label = 'Matrícula do funcionário',
  required = false,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lookup = async () => {
    setError('');
    if (!registration?.trim()) {
      onEmployeeChange(null);
      if (required) setError('Informe a matrícula.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('employees', {
        params: { registration: registration.trim() },
      });
      if (result.status !== 'active') throw new Error('Funcionário inativo.');
      onEmployeeChange(result);
    } catch (e) {
      onEmployeeChange(null);
      setError(e.message || 'Matrícula não encontrada.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <Label className="block text-xs font-medium text-slate-600">
        {label} {required ? '*' : '(opcional)'}
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder="Digite a matrícula"
          value={registration || ''}
          onChange={(e) => {
            onRegistrationChange(e.target.value);
            onEmployeeChange(null);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              lookup();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={lookup}
          disabled={busy}
        >
          <Search className="h-4 w-4 mr-1" />
          {busy ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-rose-700 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {employee && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
            <UserRoundCheck className="h-4 w-4" />
            {employee.full_name}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-2 text-slate-700">
            <span>
              <b>Função:</b> {employee.job_title}
            </span>
            <span>
              <b>Setor:</b> {employee.department}
            </span>
            <span>
              <b>Unidade:</b> {employee.unit_name}
            </span>
            <span>
              <b>Centro de custo:</b>{' '}
              {employee.cost_center_code || 'Não atribuído'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
