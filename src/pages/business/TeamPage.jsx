import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2, Mail, CheckCircle2 } from 'lucide-react';
import WorkspaceShell, { PageTitle, useWorkspace } from '../../components/business/WorkspaceShell';
import { biz, errorMessage } from '../../services/businessApi';
import { useAuth } from '../../context/AuthContext';
import { inputCls, shortDate } from './bizFormat';

const ROLE_INFO = {
  requester: 'Can request and book accommodation',
  admin: 'Can also cancel any booking and manage the team',
};
const ROLE_LABEL = { requester: 'Member', admin: 'Admin' };

function Content() {
  const { org } = useWorkspace();
  const { guest } = useAuth();
  const [team, setTeam] = useState(null); // { members, invites }
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('requester');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { biz.team().then(setTeam).catch((err) => setError(errorMessage(err))); }, []);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setNotice('');
    try { const next = await fn(); setTeam(next); return next; } catch (err) { setError(errorMessage(err)); return null; } finally { setBusy(false); }
  };

  const add = async (e) => {
    e.preventDefault();
    const sent = email.trim();
    const next = await run(() => biz.addMember({ email: sent, role }));
    if (!next) return;
    setEmail('');
    setNotice(next.result === 'invited'
      ? `Invitation sent to ${sent}. They'll join your team once they sign up and verify their email.`
      : `${sent} has been added to your team.`);
  };

  if (org?.role !== 'admin') return <p className="text-gray-600">Only your company admin can manage the team.</p>;

  return (
    <div className="max-w-3xl">
      <PageTitle title="Team" subtitle={`People at ${org.org_name} who can book on Booqa.`} />

      <form onSubmit={add} className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-sm font-medium text-gray-800 mb-1.5">Colleague's email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@company.com" required />
        </label>
        <label>
          <span className="block text-sm font-medium text-gray-800 mb-1.5">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option value="requester">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button disabled={busy} className="inline-flex items-center gap-2 bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5">
          <UserPlus className="w-4 h-4" /> Add
        </button>
        <p className="w-full text-xs text-gray-500">If they don't have a Booqa account yet, we'll email them an invitation.</p>
      </form>

      {notice && <p className="mt-4 flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 rounded-xl px-4 py-3" role="status"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {notice}</p>}
      {error && <p className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}

      {!team ? (
        <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          <ul className="mt-6 rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100">
            {team.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-gray-950">{m.full_name}{m.id === guest?.id && <span className="text-gray-400 font-normal"> (you)</span>}</p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>
                <div>
                  <select value={m.role} disabled={busy} onChange={(e) => run(() => biz.updateMember(m.id, { role: e.target.value }))}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm" aria-label={`Role for ${m.full_name}`}>
                    <option value="requester">Member</option>
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

          {team.invites.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Invited, not joined yet</h2>
              <ul className="rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100">
                {team.invites.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 px-5 py-3.5">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{i.email}</p>
                      <p className="text-xs text-gray-500">{ROLE_LABEL[i.role]} · invited {shortDate(i.created_at)}</p>
                    </div>
                    <button onClick={() => run(() => biz.cancelInvite(i.id))} disabled={busy} className="text-sm font-medium text-gray-500 hover:text-red-600">
                      Cancel invite
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function TeamPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
