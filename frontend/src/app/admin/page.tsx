/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
} from 'lucide-react';

interface ReportUser {
  id: string;
  email: string;
  status: string;
}

interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: ReportUser;
  reported: ReportUser;
}

export default function AdminPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchReports = useCallback(async (authToken: string) => {
    setTimeout(() => {
      setLoading(true);
      setError('');
    }, 0);
    try {
      const baseUrl = 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/reports`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access Forbidden. You must be an administrator or moderator.');
        }
        throw new Error('Failed to load tickets queue.');
      }

      const data = await response.json() as Report[];
      setReports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (!storedToken) {
      router.push('/auth');
      return;
    }
    fetchReports(storedToken);
  }, [router, fetchReports]);

  const resolveTicket = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    setError('');
    setSuccess('');
    try {
      const storedToken = localStorage.getItem('accessToken') || '';
      const baseUrl = 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/reports/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve report.');
      }

      setSuccess(`Report ticket resolved to ${status.toLowerCase()} successfully.`);
      fetchReports(storedToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resolving ticket.');
    }
  };

  const suspendUser = async (userId: string) => {
    setError('');
    setSuccess('');
    try {
      const storedToken = localStorage.getItem('accessToken') || '';
      const baseUrl = 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/reports/moderate/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'SUSPENDED' }),
      });

      if (!response.ok) {
        const errData = await response.json() as Record<string, unknown>;
        throw new Error(String(errData.message || 'Failed to suspend user account.'));
      }

      setSuccess('User account suspended successfully. All access revoked.');
      fetchReports(storedToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error suspending account.');
    }
  };

  const activeReportsCount = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#09090b]">
      {/* Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-purple-500/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Main container */}
      <div className="w-full max-w-7xl mx-auto px-6 py-8 relative z-10 flex-1 flex flex-col">
        {/* Navigation Header */}
        <header className="flex items-center justify-between border-b border-white/5 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/deck"
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-['Outfit'] text-2xl font-bold flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-purple-400" />
                Moderator Dashboard
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                MatchNova trust, safety, and content policy center.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-3xl bg-[#0d0d12]/30">
            <XCircle className="w-12 h-12 text-red-500 mb-4 animate-pulse" />
            <h3 className="font-bold text-lg text-zinc-200">Unauthorized Access</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-2 mb-6">
              {error}
            </p>
            <Link
              href="/deck"
              className="px-6 py-3 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 transition-colors"
            >
              Return to Deck
            </Link>
          </div>
        ) : (
          <>
            {/* Status Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="p-6 rounded-2xl glass-panel flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    Pending Tickets
                  </span>
                  <h3 className="text-3xl font-extrabold mt-2 font-['Outfit']">
                    {loading ? '--' : activeReportsCount}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="p-6 rounded-2xl glass-panel flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    Total Incidents Logged
                  </span>
                  <h3 className="text-3xl font-extrabold mt-2 font-['Outfit']">
                    {loading ? '--' : reports.length}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-[#ff4b72]">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="p-6 rounded-2xl glass-panel flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    Moderator Status
                  </span>
                  <h3 className="text-sm font-bold text-emerald-400 mt-2.5 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVE GATEWAY
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {success && (
              <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Incident Reports Table */}
            <div className="flex-1 rounded-2xl glass-panel overflow-hidden border border-white/5 bg-[#0d0d12]/30 flex flex-col">
              <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="font-bold text-sm text-zinc-300 uppercase tracking-wider">
                  Report Queue
                </h3>
              </div>

              <div className="flex-1 overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-[#ff4b72]"></div>
                    <span className="text-xs text-zinc-500">Retrieving tickets...</span>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-20 px-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                    <p className="text-xs text-zinc-400">
                      All report tickets have been resolved. Excellent work!
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-400 font-semibold bg-white/[0.005]">
                        <th className="p-4">Reporter</th>
                        <th className="p-4">Reported Target</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                          <td className="p-4 font-semibold text-zinc-200">{report.reporter?.email}</td>
                          <td className="p-4">
                            <span className="font-semibold text-zinc-200">{report.reported?.email}</span>
                            <span className={`block text-[10px] mt-0.5 font-bold ${
                              report.reported?.status === 'SUSPENDED' ? 'text-red-400' : 'text-zinc-500'
                            }`}>
                              {report.reported?.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                              <AlertTriangle className="w-3 h-3" />
                              {report.reason}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-400 max-w-xs truncate">{report.details || 'None provided.'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              report.status === 'PENDING'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : report.status === 'RESOLVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            }`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            {report.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => resolveTicket(report.id, 'RESOLVED')}
                                  className="px-3 py-1.5 rounded-lg font-bold border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 transition-colors cursor-pointer"
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={() => resolveTicket(report.id, 'DISMISSED')}
                                  className="px-3 py-1.5 rounded-lg font-bold border border-white/5 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </>
                            )}
                            {report.reported?.status !== 'SUSPENDED' && (
                              <button
                                onClick={() => suspendUser(report.reportedId)}
                                className="px-3 py-1.5 rounded-lg font-bold border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer"
                              >
                                Suspend Account
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
