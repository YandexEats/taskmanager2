const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB подключена'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// Schemas
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'manager' },
    createdAt: { type: Date, default: Date.now }
});

const EmployeeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    position: String,
    telegramTag: String,
    createdAt: { type: Date, default: Date.now }
});

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    deadline: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['new', 'in_progress', 'completed'], default: 'new' },
    result: String,
    completedAt: Date,
    history: [{
        timestamp: { type: Date, default: Date.now },
        action: String,
        changes: Object
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    botToken: String,
    chatId: String
});

// Models
const User = mongoose.model('User', UserSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);
const Task = mongoose.model('Task', TaskSchema);
const Config = mongoose.model('Config', ConfigSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware для проверки токена
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Неверный токен' });
    }
};

// Telegram Helper
const sendTelegramNotification = async (botToken, chatId, message) => {
    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        return { success: true };
    } catch (error) {
        console.error('Telegram error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.description || error.message };
    }
};

// ============= AUTH ROUTES =============

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Проверка существования пользователя
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email уже зарегистрирован' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const user = new User({
            email,
            password: hashedPassword,
            name,
            role: 'manager'
        });

        await user.save();

        // Генерация токена
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Поиск пользователя
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Генерация токена
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Проверка токена
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role
        }
    });
});

// ============= EMPLOYEE ROUTES =============

// Получить всех сотрудников
app.get('/api/employees', authMiddleware, async (req, res) => {
    try {
        const employees = await Employee.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения сотрудников' });
    }
});

// Создать сотрудника
app.post('/api/employees', authMiddleware, async (req, res) => {
    try {
        const employee = new Employee({
            ...req.body,
            userId: req.user._id
        });
        await employee.save();
        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка создания сотрудника' });
    }
});

// Обновить сотрудника
app.put('/api/employees/:id', authMiddleware, async (req, res) => {
    try {
        const employee = await Employee.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true }
        );
        
        if (!employee) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка обновления сотрудника' });
    }
});

// Удалить сотрудника
app.delete('/api/employees/:id', authMiddleware, async (req, res) => {
    try {
        // Проверка наличия задач
        const taskCount = await Task.countDocuments({ 
            userId: req.user._id,
            employeeId: req.params.id 
        });

        if (taskCount > 0) {
            return res.status(400).json({ error: 'Нельзя удалить сотрудника с активными задачами' });
        }

        const employee = await Employee.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!employee) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json({ message: 'Сотрудник удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления сотрудника' });
    }
});

// ============= TASK ROUTES =============

// Получить все задачи
app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id })
            .populate('employeeId')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения задач' });
    }
});

// Создать задачу
app.post('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const task = new Task({
            ...req.body,
            userId: req.user._id,
            history: []
        });
        
        await task.save();
        await task.populate('employeeId');

        // Отправка уведомления в Telegram
        const config = await Config.findOne({ userId: req.user._id });
        if (config && config.botToken && config.chatId) {
            const employee = task.employeeId;
            const message = `🆕 <b>Новая задача</b>

👤 Исполнитель: ${employee.telegramTag ? '@' + employee.telegramTag : employee.name}
📋 Задача: ${task.title}
📝 Описание: ${task.description}
⏰ Срок: ${new Date(task.deadline).toLocaleDateString('ru-RU')}
🔥 Приоритет: ${task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}

#задача #${employee.telegramTag || employee.name.replace(/\s/g, '')}`;

            await sendTelegramNotification(config.botToken, config.chatId, message);
        }

        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Ошибка создания задачи' });
    }
});

// Обновить задачу
app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const oldTask = await Task.findOne({ _id: req.params.id, userId: req.user._id });
        
        if (!oldTask) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }

        // Добавление в историю
        const historyEntry = {
            timestamp: new Date(),
            action: 'updated',
            changes: req.body
        };

        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            {
                ...req.body,
                updatedAt: new Date(),
                $push: { history: historyEntry }
            },
            { new: true }
        ).populate('employeeId');

        // Уведомление при завершении
        if (req.body.status === 'completed' && oldTask.status !== 'completed') {
            const config = await Config.findOne({ userId: req.user._id });
            if (config && config.botToken && config.chatId) {
                const employee = task.employeeId;
                const message = `✅ <b>Задача выполнена</b>

👤 Исполнитель: ${employee.telegramTag ? '@' + employee.telegramTag : employee.name}
📋 Задача: ${task.title}
✨ Результат: ${task.result || 'Не указан'}

#выполнено #${employee.telegramTag || employee.name.replace(/\s/g, '')}`;

                await sendTelegramNotification(config.botToken, config.chatId, message);
            }
        }

        res.json(task);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Ошибка обновления задачи' });
    }
});

// Удалить задачу
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!task) {
            return res.status(404).json({ error: 'Задача не найдена' });
        }

        res.json({ message: 'Задача удалена' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления задачи' });
    }
});

// ============= CONFIG ROUTES =============

// Получить конфигурацию
app.get('/api/config', authMiddleware, async (req, res) => {
    try {
        let config = await Config.findOne({ userId: req.user._id });
        
        if (!config) {
            config = new Config({ userId: req.user._id, botToken: '', chatId: '' });
            await config.save();
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения конфигурации' });
    }
});

// Обновить конфигурацию
app.put('/api/config', authMiddleware, async (req, res) => {
    try {
        let config = await Config.findOne({ userId: req.user._id });

        if (!config) {
            config = new Config({
                userId: req.user._id,
                ...req.body
            });
        } else {
            config.botToken = req.body.botToken;
            config.chatId = req.body.chatId;
        }

        await config.save();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка обновления конфигурации' });
    }
});

// Тестирование Telegram
app.post('/api/config/test-telegram', authMiddleware, async (req, res) => {
    try {
        const { botToken, chatId } = req.body;

        if (!botToken || !chatId) {
            return res.status(400).json({ error: 'Укажите токен бота и ID чата' });
        }

        const result = await sendTelegramNotification(
            botToken,
            chatId,
            '🎉 <b>Тестовое сообщение</b>\n\nИнтеграция Telegram работает корректно!'
        );

        if (result.success) {
            res.json({ message: 'Сообщение отправлено успешно!' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
});

// ============= STATS ROUTE =============

app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id });
        const now = new Date();

        const stats = {
            total: tasks.length,
            new: tasks.filter(t => t.status === 'new').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            overdue: tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < now).length
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'TaskFlow API работает' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});