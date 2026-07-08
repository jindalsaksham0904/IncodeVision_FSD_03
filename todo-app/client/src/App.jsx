import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { format, isPast, isToday } from 'date-fns';
import { 
  Trash2, Edit2, Plus, Calendar, Wand2, BarChart2, 
  Sun, Moon, Inbox, CheckCircle2, ListPlus
} from 'lucide-react';

// Axios instance to point to our local API during dev
const api = axios.create({ baseURL: '/api' });

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState({ visible: false, taskId: null });
  const [stats, setStats] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme to HTML tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/tasks/stats');
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleToggleStats = () => {
    if (!showStats) fetchStats();
    setShowStats(!showStats);
  };

  // CREATE
  const handleAddTask = async (newTaskData) => {
    try {
      const tempId = Date.now().toString();
      const optimisticTask = { ...newTaskData, _id: tempId, completed: false, createdAt: new Date().toISOString() };
      setTasks([optimisticTask, ...tasks]);

      const res = await api.post('/tasks', newTaskData);
      setTasks(prev => prev.map(t => t._id === tempId ? res.data : t));
    } catch (error) {
      fetchTasks();
    }
  };

  // AI BREAKDOWN
  const handleAiBreakdown = async (goal) => {
    setIsAiLoading(true);
    try {
      const res = await api.post('/tasks/breakdown', { goal });
      setTasks(prev => [...res.data, ...prev]);
    } catch (error) {
      alert("Failed to break down goal. Make sure your GEMINI_API_KEY is configured.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // TOGGLE COMPLETE
  const handleToggle = async (id) => {
    const task = tasks.find(t => t._id === id);
    if (!task) return;
    
    const wasCompleted = task.completed;
    setTasks(tasks.map(t => t._id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t));
    
    // Confetti logic
    const activeTasksCount = tasks.filter(t => !t.completed && t._id !== id).length;
    if (!wasCompleted && activeTasksCount === 0 && tasks.length > 0) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    try {
      await api.patch(`/tasks/${id}/toggle`);
    } catch (error) {
      fetchTasks();
    }
  };

  // SOFT DELETE
  const handleDelete = async (id) => {
    setTasks(tasks.filter(t => t._id !== id));
    
    setToast({ visible: true, taskId: id });
    setTimeout(() => setToast(prev => prev.taskId === id ? { ...prev, visible: false } : prev), 5000);

    try {
      await api.delete(`/tasks/${id}`);
    } catch (error) {
      fetchTasks();
    }
  };

  // RESTORE (UNDO)
  const handleRestore = async (id) => {
    setToast({ visible: false, taskId: null });
    try {
      const res = await api.patch(`/tasks/${id}/restore`);
      setTasks([res.data, ...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      fetchTasks();
    }
  };

  // EDIT
  const handleEdit = async (id, updatedText) => {
    setTasks(tasks.map(t => t._id === id ? { ...t, text: updatedText } : t));
    try {
      await api.put(`/tasks/${id}`, { text: updatedText });
    } catch (error) {
      fetchTasks();
    }
  };

  // CLEAR COMPLETED
  const handleClearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    setTasks(tasks.filter(t => !t.completed));
    for (const t of completedTasks) {
      try {
        await api.delete(`/tasks/${t._id}`);
      } catch(e) {}
    }
  };

  const activeCount = tasks.filter(t => !t.completed).length;
  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <>
      <div className="ambient-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="app-container">
        <header className="header">
          <div className="header-text">
            <h1>To-Do App</h1>
            <p>{activeCount} task{activeCount !== 1 ? 's' : ''} left</p>
          </div>
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle theme"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        <div className="surface">
          <AddTaskBar onAdd={handleAddTask} onBreakdown={handleAiBreakdown} isAiLoading={isAiLoading} />
          
          <FilterTabs currentFilter={filter} onSetFilter={setFilter} />

          <ul className="task-list">
            <AnimatePresence initial={false} mode="wait">
              {filteredTasks.length === 0 ? (
                <EmptyState key="empty-state" filter={filter} totalTasks={tasks.length} />
              ) : (
                filteredTasks.map((task) => (
                  <TaskItem 
                    key={task._id} 
                    task={task} 
                    onToggle={() => handleToggle(task._id)}
                    onDelete={() => handleDelete(task._id)}
                    onEdit={(newText) => handleEdit(task._id, newText)}
                  />
                ))
              )}
            </AnimatePresence>
          </ul>

          <footer className="footer">
            <button className="stats-toggle" onClick={handleToggleStats}>
              <BarChart2 size={16} /> {showStats ? 'Hide Stats' : '📊 Stats'}
            </button>
            <button className="clear-btn" onClick={handleClearCompleted}>
              Clear Completed
            </button>
          </footer>

          <AnimatePresence>
            {showStats && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="stats-panel"
              >
                <StatsWidget stats={stats} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {toast.visible && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 50, opacity: 0 }}
              className="toast-container"
            >
              <div className="toast">
                <span>Task deleted</span>
                <button className="undo-btn" onClick={() => handleRestore(toast.taskId)}>Undo</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}


// --- Add Task Bar ---
function AddTaskBar({ onAdd, onBreakdown, isAiLoading }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text, priority, dueDate: dueDate || null });
    setText('');
    setDueDate('');
    setPriority('medium');
  };

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <input 
          type="text" 
          placeholder="What needs to be done? Or type a big goal..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="controls-row">
        <select 
          className="select-control" 
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <input 
          type="date" 
          className="date-control" 
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={isAiLoading || !text.trim()}>
          <Plus size={18} /> Add
        </button>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={(e) => { e.preventDefault(); onBreakdown(text); setText(''); }}
          disabled={isAiLoading || !text.trim()}
          title="Break down goal with AI"
        >
          <Wand2 size={18} /> {isAiLoading ? 'Thinking...' : 'AI'}
        </button>
      </div>
    </form>
  );
}


// --- Filter Tabs ---
function FilterTabs({ currentFilter, onSetFilter }) {
  const tabs = ['all', 'active', 'completed'];

  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button 
          key={tab}
          className={`tab ${currentFilter === tab ? 'active' : ''}`}
          onClick={() => onSetFilter(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
          {currentFilter === tab && (
            <motion.div layoutId="underline" className="tab-indicator" style={{ width: '100%', left: 0 }} />
          )}
        </button>
      ))}
    </div>
  );
}


// --- Task Item ---
function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== task.text) onEdit(editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleEditSubmit();
    else if (e.key === 'Escape') {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  const isTaskOverdue = task.dueDate && !task.completed && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <motion.li 
      layout
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      className="task-item"
    >
      <input 
        type="checkbox" 
        className="custom-checkbox" 
        checked={task.completed} 
        onChange={onToggle}
      />
      
      <div className="task-content">
        {isEditing ? (
          <input 
            type="text" 
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            style={{ padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
          />
        ) : (
          <span className={`task-text ${task.completed ? 'completed' : ''}`}>
            {task.text}
          </span>
        )}
        
        <div className="task-meta">
          <span className={`priority-dot ${task.priority}`} title={`Priority: ${task.priority}`}></span>
          {task.dueDate && (
            <span className={`due-badge ${isTaskOverdue ? 'overdue' : ''}`}>
              <Calendar size={12} />
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
      
      <div className="task-actions">
        {!isEditing && (
          <button className="btn-icon" onClick={() => setIsEditing(true)}><Edit2 size={16} /></button>
        )}
        <button className="btn-icon delete" onClick={onDelete}><Trash2 size={16} /></button>
      </div>
    </motion.li>
  );
}

// --- Empty State ---
function EmptyState({ filter, totalTasks }) {
  let content = {
    icon: <ListPlus size={48} className="empty-state-svg" />,
    title: "Nothing here yet",
    desc: "Add your first task above."
  };

  if (totalTasks > 0) {
    if (filter === 'active') {
      content = {
        icon: <CheckCircle2 size={48} className="empty-state-svg" style={{color: 'var(--priority-low)'}} />,
        title: "All caught up 🎉",
        desc: "You have no active tasks. Take a break!"
      };
    } else if (filter === 'completed') {
      content = {
        icon: <Inbox size={48} className="empty-state-svg" />,
        title: "No completed tasks",
        desc: "When you finish tasks, they'll show up here."
      };
    }
  }

  return (
    <motion.li 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="empty-state"
    >
      {content.icon}
      <div>
        <h3>{content.title}</h3>
        <p>{content.desc}</p>
      </div>
    </motion.li>
  );
}

// --- Stats Widget ---
function StatsWidget({ stats }) {
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return format(d, 'yyyy-MM-dd');
  });

  const maxCount = Math.max(...stats.map(s => s.count), 1);

  return (
    <div>
      <h3>Last 7 Days Activity</h3>
      <div className="chart">
        {last7Days.map((dateStr, idx) => {
          const statData = stats.find(s => s._id === dateStr);
          const count = statData ? statData.count : 0;
          const heightPercent = Math.max((count / maxCount) * 100, 2);
          
          return (
            <div key={dateStr} className="bar-container">
              {count > 0 && <span className="bar-value">{count}</span>}
              <motion.div 
                className="bar" 
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              />
              <span className="bar-label">{format(new Date(dateStr), 'eee')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
