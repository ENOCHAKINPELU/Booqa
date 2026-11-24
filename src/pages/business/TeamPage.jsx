import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import WorkspaceShell, { PageTitle, useWorkspace } from '../../components/business/WorkspaceShell';
import { biz, errorMessage } from '../../services/businessApi';
import { useAuth } from '../../context/AuthContext';
import { inputCls } from './bizFormat';

const ROLE_INFO = {
  requester: 'Can request accommodation',
  approver: 'Can also approve options and cancel requests',
  admin: 'Can also manage the team',
};

function Content() {
  const { org } = useWorkspace();
  const { guest } = useAuth();
  const [members, setMembers] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('requester');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { biz.team().then(setMembers).catch((err) => setError(errorMessage(err))); }, []);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { setMembers(await fn()); return true; } catch (err) { setError(errorMessage(err)); return false; } finally { setBusy(false); }
  };

  if (org?.role !== 'admin') return <p className="text-gray-600">Only your company admin can manage the team.</p>;

  return (
    <div className="max-w-3xl">
      <PageTitle title="Team" subtitle={`People at ${org.org_name} who can use Booqa.`} />

      <form onSubmit={async (e) => { e.preventDefault(); if (await run(() => biz.addMember({ email, role }))) setEmail(''); }}
        className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-sm font-medium text-gray-800 mb-1.5">Colleague's email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@company.com" required />
        </label>
        <label>
          <span className="block text-sm font-medium text-gray-800 mb-1.5">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option value="requester">Requester</option>
            <option value="approver">Approver</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button disabled={busy} className="inline-flex items-center gap-2 bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5">
          <UserPlus className="w-4 h-4" /> Add
        </button>
        <p className="w-full text-xs text-gray-500">Your colleague needs a Booqa account with this email first. They can sign up at booqa.vercel.app/signup.</p>
      </form>

      {error && <p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}

      {!members ? (
        <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <ul className="mt-6 rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium text-gray-950">{m.full_name}{m.id === guest?.id && <span className="text-gray-400 font-normal"> (you)</span>}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              <div>
                <select value={m.role} disabled={busy} onChange={(e) => run(() => biz.updateMember(m.id, { role: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm" aria-label={`Role for ${m.full_name}`}>
                  <option value="requester">Requester</option>
                  <option value="approver">Approver</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">{ROLE_INFO[m.role]}</p>
              </div>
              {m.id !== guest?.id && (
                <button onClick={() => run(() => biz.removeMember(m.id))} disabled={busy} aria-label={`Remove ${m.full_name}`} className="p-2 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TeamPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
