import React, { useState, useEffect } from 'react';
import { CheckCircle, User, Calendar, AlertTriangle, Plus, Settings, Send, Search, X, Edit2, Trash2, Users, BarChart3, LogOut } from 'lucide-react';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API Helper
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
      throw new Error('Требуется авторизация');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Ошибка сервера');
    }

    return data;
  },

  // Auth
  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
  },

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async getMe() {
    return this.request('/auth/me');
  },

  // Employees
  async getEmployees() {
    return this.request('/employees');
  },

  async createEmployee(data) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateEmployee(id, data) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteEmployee(id) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE'
    });
  },

  // Tasks
  async getTasks() {
    return this.request('/tasks');
  },

  async createTask(data) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTask(id, data) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  // Config
  async getConfig() {
    return this.request('/config');
  },

  async updateConfig(data) {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async testTelegram(botToken, chatId) {
    return this.request('/config/test-telegram', {
      method: 'POST',
      body: JSON.stringify({ botToken, chatId })
    });
  },

  // Stats
  async getStats() {
    return this.request('/stats');
  }
};

// Main App Component
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const data = await api.getMe();
        setUser(data.user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const handleRegister = async (email, password, name) => {
    const data = await api.register(email, password, name);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-amber-400 text-2xl font-light animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return <TaskManager user={user} onLogout={handleLogout} />;
};

// Auth Screen
const AuthScreen = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(formData.email, formData.password);
      } else {
        if (!formData.name) {
          setError('Введите ваше имя');
          setLoading(false);
          return;
        }
        await onRegister(formData.email, formData.password, formData.name);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Playfair+Display:wght@400;700&display=swap');
        * { font-family: 'JetBrains Mono', monospace; }
        .title-font { font-family: 'Playfair Display', serif; }
      `}</style>
      
      <div className="glass-card rounded-2xl p-8 max-w-md w-full" style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(251, 191, 36, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 title-font mb-2">TaskFlow</h1>
          <p className="text-slate-400 text-sm">Управление задачами команды</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isLogin ? 'bg-amber-500 text-white' : 'bg-slate-800/50 text-slate-400'
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isLogin ? 'bg-amber-500 text-white' : 'bg-slate-800/50 text-slate-400'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2">Ваше имя</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                placeholder="Иван Иванов"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">Пароль</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
            }}
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
      </div>
    </div>
  );
};

// Task Manager (основной интерфейс)
const TaskManager = ({ user, onLogout }) => {
  const [view, setView] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [config, setConfig] = useState({ botToken: '', chatId: '' });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, employeesData, configData, statsData] = await Promise.all([
        api.getTasks(),
        api.getEmployees(),
        api.getConfig(),
        api.getStats()
      ]);

      setTasks(tasksData);
      setEmployees(employeesData);
      setConfig(configData);
      setStats(statsData);
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const saveTask = async (taskData) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask._id, taskData);
        showNotification('Задача обновлена');
      } else {
        await api.createTask(taskData);
        showNotification('Задача создана');
      }
      
      await loadData();
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const updateTaskStatus = async (taskId, newStatus, result = '') => {
    try {
      await api.updateTask(taskId, { status: newStatus, result, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined });
      showNotification('Статус обновлен');
      await loadData();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Удалить эту задачу?')) return;
    try {
      await api.deleteTask(taskId);
      showNotification('Задача удалена');
      await loadData();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const saveEmployee = async (employeeData) => {
    try {
      if (editingEmployee) {
        await api.updateEmployee(editingEmployee._id, employeeData);
        showNotification('Сотрудник обновлён');
      } else {
        await api.createEmployee(employeeData);
        showNotification('Сотрудник добавлен');
      }
      
      await loadData();
      setShowEmployeeModal(false);
      setEditingEmployee(null);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const deleteEmployee = async (employeeId) => {
    if (!confirm('Удалить этого сотрудника?')) return;
    try {
      await api.deleteEmployee(employeeId);
      showNotification('Сотрудник удалён');
      await loadData();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const saveConfig = async (configData) => {
    try {
      await api.updateConfig(configData);
      setConfig(configData);
      showNotification('Настройки сохранены');
      setShowConfigModal(false);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesEmployee = filterEmployee === 'all' || task.employeeId._id === filterEmployee;
    return matchesSearch && matchesStatus && matchesEmployee;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-amber-400 text-2xl font-light animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Playfair+Display:wght@400;700&display=swap');
        * { font-family: 'JetBrains Mono', monospace; }
        .title-font { font-family: 'Playfair Display', serif; }
        .glass-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(251, 191, 36, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .glass-card:hover {
          border-color: rgba(251, 191, 36, 0.3);
          box-shadow: 0 12px 48px rgba(251, 191, 36, 0.1);
          transition: all 0.3s ease;
        }
        .btn-primary {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slideIn 0.4s ease-out; }
      `}</style>

      {notification && (
        <div className={`fixed top-4 right-4 z-50 glass-card rounded-lg p-4 flex items-center gap-3 animate-slide-in border-${notification.type === 'success' ? 'green' : notification.type === 'error' ? 'red' : 'blue'}-500/30`}>
          <div className={`w-2 h-2 rounded-full bg-${notification.type === 'success' ? 'green' : notification.type === 'error' ? 'red' : 'blue'}-500`}></div>
          <span className="text-slate-200 text-sm">{notification.message}</span>
        </div>
      )}

      <header className="glass-card border-b border-amber-500/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 title-font">TaskFlow</h1>
            <p className="text-slate-400 text-xs mt-1">Добро пожаловать, {user.name}</p>
          </div>
          
          <nav className="flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-lg transition-all ${view === 'dashboard' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <BarChart3 size={18} className="inline mr-2" />
              Дашборд
            </button>
            <button onClick={() => setView('tasks')} className={`px-4 py-2 rounded-lg transition-all ${view === 'tasks' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <CheckCircle size={18} className="inline mr-2" />
              Задачи
            </button>
            <button onClick={() => setView('employees')} className={`px-4 py-2 rounded-lg transition-all ${view === 'employees' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <Users size={18} className="inline mr-2" />
              Сотрудники
            </button>
            <button onClick={() => setShowConfigModal(true)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/50 rounded-lg transition-all" title="Настройки">
              <Settings size={20} />
            </button>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-all" title="Выход">
              <LogOut size={20} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'dashboard' && <DashboardView stats={stats} tasks={tasks} employees={employees} setEditingTask={setEditingTask} setShowTaskModal={setShowTaskModal} />}
        {view === 'tasks' && <TasksView tasks={filteredTasks} employees={employees} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterEmployee={filterEmployee} setFilterEmployee={setFilterEmployee} updateTaskStatus={updateTaskStatus} deleteTask={deleteTask} setEditingTask={setEditingTask} setShowTaskModal={setShowTaskModal} />}
        {view === 'employees' && <EmployeesView employees={employees} tasks={tasks} setEditingEmployee={setEditingEmployee} setShowEmployeeModal={setShowEmployeeModal} deleteEmployee={deleteEmployee} />}
      </main>

      {showTaskModal && <TaskModal task={editingTask} employees={employees} onSave={saveTask} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} />}
      {showEmployeeModal && <EmployeeModal employee={editingEmployee} onSave={saveEmployee} onClose={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} />}
      {showConfigModal && <ConfigModal config={config} onSave={saveConfig} onClose={() => setShowConfigModal(false)} />}
    </div>
  );
};

// Остальные компоненты (DashboardView, TasksView, etc) остаются такими же как в предыдущей версии
// Но теперь они работают с данными из API

export default App;