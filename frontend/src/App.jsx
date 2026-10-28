
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AuthPage from './components/AuthPage';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://agile-bug-tracker-backend.onrender.com'
).replace(/\/+$/, '');

const API_URL = `${API_BASE_URL}/api`;

const STATUSES = ['Open', 'In Progress', 'In Review', 'Resolved'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('all');

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketProjectId, setTicketProjectId] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const authConfig = useCallback(() => ({
    headers: {
      'x-auth-token': localStorage.getItem('token')
    }
  }), []);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const fetchProjects = useCallback(async () => {
    const response = await axios.get(
      `${API_URL}/projects`,
      authConfig()
    );

    setProjects(response.data);
    return response.data;
  }, [authConfig]);

  const fetchTickets = useCallback(async (projectId = 'all') => {
    setLoading(true);
    setErrorMessage('');

    try {
      const url = projectId !== 'all'
        ? `${API_URL}/tickets?projectId=${encodeURIComponent(projectId)}`
        : `${API_URL}/tickets`;

      const response = await axios.get(url, authConfig());
      setTickets(response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
        'Could not load tickets. Check your backend connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [authConfig]);

  // Load accessible projects when the user signs in.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadWorkspace() {
      setErrorMessage('');

      try {
        const response = await axios.get(
          `${API_URL}/projects`,
          authConfig()
        );

        if (cancelled) return;

        setProjects(response.data);

        const savedProjectId = activeProjectId;
        const projectStillExists =
          savedProjectId === 'all' ||
          response.data.some((project) => project._id === savedProjectId);

        if (!projectStillExists) {
          setActiveProjectId('all');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error.response?.data?.error ||
            'Could not load your projects.'
          );
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [user, authConfig]);

  // Fetch tickets whenever the selected workspace changes.
  useEffect(() => {
    if (user) {
      fetchTickets(activeProjectId);
    }
  }, [user, activeProjectId, fetchTickets]);

  const activeProject = projects.find(
    (project) => project._id === activeProjectId
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = (ticket.title || '')
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'All' || ticket.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'Open').length,
    progress: tickets.filter((ticket) => ticket.status === 'In Progress').length,
    review: tickets.filter((ticket) => ticket.status === 'In Review').length,
    resolved: tickets.filter((ticket) => ticket.status === 'Resolved').length
  }), [tickets]);

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!projectName.trim()) {
      setErrorMessage('Enter a project name.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const response = await axios.post(
        `${API_URL}/projects`,
        {
          name: projectName.trim(),
          description: projectDescription.trim()
        },
        authConfig()
      );

      const project = response.data;

      setProjects((current) => [
        project,
        ...current.filter((item) => item._id !== project._id)
      ]);

      setActiveProjectId(project._id);
      setTicketProjectId(project._id);
      setProjectName('');
      setProjectDescription('');
      setProjectModalOpen(false);

      showNotice(`Project "${project.name}" created.`);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 'Could not create project.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (!ticketTitle.trim()) {
      setErrorMessage('Enter a ticket title.');
      return;
    }

    if (!ticketProjectId) {
      setErrorMessage('Choose a project before creating a ticket.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      await axios.post(
        `${API_URL}/tickets`,
        {
          title: ticketTitle.trim(),
          priority: ticketPriority,
          projectId: ticketProjectId
        },
        authConfig()
      );

      setTicketTitle('');
      setTicketPriority('Medium');
      setTicketModalOpen(false);

      setActiveProjectId(ticketProjectId);
      await fetchTickets(ticketProjectId);

      showNotice('Ticket created successfully.');
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 'Could not create ticket.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (ticketId, nextStatus) => {
    setErrorMessage('');

    try {
      const response = await axios.put(
        `${API_URL}/tickets/${ticketId}/status`,
        { status: nextStatus },
        authConfig()
      );

      setTickets((current) =>
        current.map((ticket) =>
          ticket._id === ticketId ? response.data : ticket
        )
      );

      showNotice(`Ticket moved to ${nextStatus}.`);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 'Could not update ticket status.'
      );
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Delete this ticket permanently?')) return;

    setErrorMessage('');

    try {
      await axios.delete(
        `${API_URL}/tickets/${ticketId}`,
        authConfig()
      );

      setTickets((current) =>
        current.filter((ticket) => ticket._id !== ticketId)
      );

      showNotice('Ticket deleted.');
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 'Could not delete ticket.'
      );
    }
  };

  const openTicketModal = () => {
    setErrorMessage('');

    const defaultProject =
      activeProjectId !== 'all'
        ? activeProjectId
        : projects[0]?._id || '';

    setTicketProjectId(defaultProject);
    setTicketTitle('');
    setTicketPriority('Medium');
    setTicketModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    setProjects([]);
    setTickets([]);
    setActiveProjectId('all');
    setErrorMessage('');
  };

  if (!user) {
    return (
      <AuthPage
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="flex w-full flex-col justify-between bg-slate-950 p-5 text-white md:min-h-screen md:w-64">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold">
              IF
            </div>
            <div>
              <div className="text-xl font-bold">
                IssueFlow<span className="text-indigo-400">.</span>
              </div>
              <div className="text-xs tracking-widest text-slate-400">
                TEAM WORKSPACE
              </div>
            </div>
          </div>

          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </div>

          <button
            className={`mb-2 w-full rounded-lg px-3 py-2.5 text-left text-sm ${
              activeProjectId === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-900'
            }`}
            onClick={() => setActiveProjectId('all')}
          >
            ▦ &nbsp; All tickets
          </button>

          <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Your projects
          </div>

          <div className="space-y-1">
            {projects.map((project) => (
              <button
                key={project._id}
                title={project.name}
                onClick={() => setActiveProjectId(project._id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                  activeProjectId === project._id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold">
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setErrorMessage('');
              setProjectModalOpen(true);
            }}
            className="mt-3 w-full rounded-lg border border-dashed border-slate-700 px-3 py-2.5 text-left text-sm text-slate-300 hover:border-indigo-400 hover:text-white"
          >
            ＋ Create project
          </button>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 font-semibold">
              {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {user.name || 'Team member'}
              </div>
              <div className="truncate text-xs text-slate-400">
                {user.email || 'Signed in'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-red-950 hover:text-red-300"
          >
            ↪ &nbsp; Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-9">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="mb-1 text-sm text-slate-500">
              Workspace / {activeProject?.name || 'Overview'}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {activeProject?.name || 'Workspace overview'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeProject?.description ||
                'Organize projects, track bugs, and move work forward.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setProjectModalOpen(true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
            >
              ＋ Project
            </button>

            <button
              onClick={openTicketModal}
              disabled={projects.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ＋ New ticket
            </button>
          </div>
        </header>

        {notice && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ {notice}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              aria-label="Dismiss error"
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {projects.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              ▦
            </div>
            <h2 className="text-xl font-bold">Create your first project</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Projects keep related bugs together. Create a workspace before
              logging a project ticket.
            </p>
            <button
              onClick={() => setProjectModalOpen(true)}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              ＋ Create a project
            </button>
          </section>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Total tickets', stats.total, 'text-indigo-600'],
                ['Open', stats.open, 'text-slate-700'],
                ['In progress', stats.progress, 'text-blue-600'],
                ['In review', stats.review, 'text-amber-600'],
                ['Resolved', stats.resolved, 'text-emerald-600']
              ].map(([label, value, color]) => (
                <article
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="text-sm font-medium text-slate-500">
                    {label}
                  </div>
                  <div className={`mt-3 text-3xl font-bold ${color}`}>
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {activeProjectId === 'all'
                      ? 'Across accessible tickets'
                      : 'In this project'}
                  </div>
                </article>
              ))}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Ticket queue</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredTickets.length} ticket
                      {filteredTickets.length === 1 ? '' : 's'} displayed
                    </p>
                  </div>
                  <button
                    onClick={() => fetchTickets(activeProjectId)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tickets..."
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="All">All statuses</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="All">All priorities</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  Loading tickets...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-lg font-semibold text-slate-700">
                    No tickets found
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Create a ticket or adjust your search and filters.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTickets.map((ticket) => (
                    <article
                      key={ticket._id}
                      className="flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50 lg:flex-row lg:items-center"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-900">
                          {ticket.title}
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ticket.priority === 'Critical' || ticket.priority === 'High'
                              ? 'bg-red-50 text-red-700'
                              : ticket.priority === 'Medium'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                          }`}>
                            {ticket.priority || 'Medium'} priority
                          </span>

                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ticket.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ticket.status === 'In Review'
                                ? 'bg-amber-50 text-amber-700'
                                : ticket.status === 'In Progress'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                          }`}>
                            {ticket.status || 'Open'}
                          </span>

                          {ticket.projectId && (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                              {projects.find(
                                (project) => project._id === ticket.projectId
                              )?.name || 'Project ticket'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Change status for ${ticket.title}`}
                          value={ticket.status || 'Open'}
                          onChange={(event) =>
                            handleStatusChange(ticket._id, event.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDeleteTicket(ticket._id)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          title="Delete ticket"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="project-modal-title" className="text-xl font-bold">
                  Create project
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set up a workspace for related tickets.
                </p>
              </div>
              <button
                onClick={() => setProjectModalOpen(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="project-name" className="mb-1 block text-sm font-medium">
                  Project name
                </label>
                <input
                  id="project-name"
                  required
                  maxLength={100}
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="E-Commerce Mobile App"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="project-description" className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="project-description"
                  maxLength={1000}
                  rows={3}
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="What is this project about?"
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="ticket-modal-title" className="text-xl font-bold">
                  Create ticket
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Record a bug in one of your projects.
                </p>
              </div>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label htmlFor="ticket-title" className="mb-1 block text-sm font-medium">
                  Ticket title
                </label>
                <input
                  id="ticket-title"
                  required
                  maxLength={200}
                  value={ticketTitle}
                  onChange={(event) => setTicketTitle(event.target.value)}
                  placeholder="Fix checkout validation"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="ticket-project" className="mb-1 block text-sm font-medium">
                  Project
                </label>
                <select
                  id="ticket-project"
                  required
                  value={ticketProjectId}
                  onChange={(event) => setTicketProjectId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                >
                  <option value="">Choose a project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ticket-priority" className="mb-1 block text-sm font-medium">
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  value={ticketPriority}
                  onChange={(event) => setTicketPriority(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || projects.length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create ticket'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
