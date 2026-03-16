'use client'

import { useEffect, useState, useCallback } from 'react'
import { todosApi } from '@/lib/api'
import { CheckSquare, Plus, Circle, CheckCircle2 } from 'lucide-react'
import TodoForm from '@/components/crm/TodoForm'

interface Todo {
  id: string; title: string; description?: string | null; status: string
  priority: string; dueDate?: string | null; completedAt?: string | null
  linkedContactId?: string | null; linkedLeadId?: string | null; linkedOrderId?: string | null
  contact?: { id: string; name: string } | null
  lead?: { id: string; title: string } | null
  order?: { id: string; title: string } | null
}

interface Grouped { overdue: Todo[]; today: Todo[]; upcoming: Todo[]; done: Todo[] }

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-400', MEDIUM: 'bg-orange-400', LOW: 'bg-slate-300',
}
const PRIORITY_LABEL: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

export default function TodosPage() {
  const [grouped, setGrouped] = useState<Grouped>({ overdue: [], today: [], upcoming: [], done: [] })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const fetchTodos = useCallback(async () => {
    try {
      const res = await todosApi.list()
      setGrouped(res.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const toggleTodo = async (todo: Todo) => {
    if (toggling) return
    setToggling(todo.id)
    try {
      const newStatus = todo.status === 'DONE' ? 'PENDING' : 'DONE'
      await todosApi.update(todo.id, { status: newStatus })
      fetchTodos()
    } catch {}
    finally { setToggling(null) }
  }

  const totalPending = grouped.overdue.length + grouped.today.length + grouped.upcoming.length

  const TodoCard = ({ todo }: { todo: Todo }) => (
    <div className={`bg-white rounded-xl border p-3 flex items-start gap-3 transition-all ${
      todo.status === 'DONE' ? 'border-slate-50 opacity-60' : 'border-slate-100'
    }`}>
      <button onClick={() => toggleTodo(todo)} disabled={!!toggling}
        className="mt-0.5 flex-shrink-0">
        {todo.status === 'DONE'
          ? <CheckCircle2 className="w-5 h-5 text-teal-500" />
          : <Circle className="w-5 h-5 text-slate-300 hover:text-teal-400 transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-sm font-medium flex-1 ${todo.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {todo.title}
          </p>
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[todo.priority]}`} title={PRIORITY_LABEL[todo.priority]} />
        </div>
        {todo.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{todo.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {todo.dueDate && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              todo.status !== 'DONE' && new Date(todo.dueDate) < new Date()
                ? 'bg-red-50 text-red-600'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {new Date(todo.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {todo.contact && <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded-full">👤 {todo.contact.name}</span>}
          {todo.lead && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">📈 {todo.lead.title.slice(0, 20)}</span>}
          {todo.order && <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full">📦 {todo.order.title.slice(0, 20)}</span>}
        </div>
      </div>
    </div>
  )

  const Section = ({ title, todos, className }: { title: string; todos: Todo[]; className?: string }) =>
    todos.length === 0 ? null : (
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${className ?? 'text-slate-400'}`}>{title} ({todos.length})</p>
        <div className="space-y-2">
          {todos.map(t => <TodoCard key={t.id} todo={t} />)}
        </div>
      </div>
    )

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="sticky top-14 z-40 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-teal-600" />
        <h1 className="text-lg font-bold text-slate-800 flex-1">To-do List</h1>
        {totalPending > 0 && (
          <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-semibold">{totalPending} pending</span>
        )}
      </header>

      <div className="px-4 py-4 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 animate-pulse h-14" />)}
          </div>
        ) : totalPending === 0 && grouped.done.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">All clear!</h3>
            <p className="text-sm text-slate-400 mb-4">Add tasks and link them to contacts, leads, or orders</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium">+ Add Task</button>
          </div>
        ) : (
          <>
            <Section title="⚠ Overdue" todos={grouped.overdue} className="text-red-500" />
            <Section title="Today" todos={grouped.today} className="text-slate-700" />
            <Section title="Upcoming" todos={grouped.upcoming} />

            {grouped.done.length > 0 && (
              <div>
                <button onClick={() => setShowDone(v => !v)}
                  className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                  ✓ Done ({grouped.done.length}) {showDone ? '▴' : '▾'}
                </button>
                {showDone && (
                  <div className="space-y-2">
                    {grouped.done.map(t => <TodoCard key={t.id} todo={t} />)}
                  </div>
                )}
              </div>
            )}

            {totalPending === 0 && (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm font-semibold text-slate-600">All pending tasks done!</p>
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 active:scale-95 transition-all hover:bg-teal-700">
        <Plus className="w-6 h-6" />
      </button>

      {showForm && <TodoForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchTodos() }} />}
    </div>
  )
}
