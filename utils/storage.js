const STORAGE_KEYS = {
  NOTES: 'notes_data',
  TODOS: 'todos_data',
  USER_INFO: 'user_info',
  DARK_MODE: 'dark_mode',
  CATEGORIES: 'note_categories'
};

const DEFAULT_CATEGORIES = ['全部', '工作', '生活', '学习'];

class Storage {
  // 通用方法
  static get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key);
      return data !== undefined ? data : defaultValue;
    } catch (e) {
      console.error(`获取存储失败: ${key}`, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.error(`设置存储失败: ${key}`, e);
      return false;
    }
  }

  static remove(key) {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (e) {
      console.error(`删除存储失败: ${key}`, e);
      return false;
    }
  }

  // 生成唯一ID
  static generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 获取时间戳
  static now() {
    return Date.now();
  }

  // 格式化时间显示
  static formatTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)}小时前`;
    if (diff < week) return `${Math.floor(diff / day)}天前`;

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day_num = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day_num}`;
  }

  // ========== 笔记相关 ==========
  static getNotes() {
    const data = this.get(STORAGE_KEYS.NOTES, []);
    return Array.isArray(data) ? data : [];
  }

  static saveNotes(notes) {
    return this.set(STORAGE_KEYS.NOTES, notes);
  }

  static addNote(noteData) {
    const notes = this.getNotes();
    const newNote = {
      id: this.generateId(),
      title: noteData.title || '无标题',
      content: noteData.content || '',
      isPinned: noteData.isPinned || false,
      pinnedTime: noteData.isPinned ? this.now() : 0,
      updateTime: this.now(),
      category: noteData.category || '全部'
    };
    notes.unshift(newNote);
    this.saveNotes(notes);
    return newNote;
  }

  static updateNote(id, updateData) {
    const notes = this.getNotes();
    const index = notes.findIndex(note => note.id === id);
    if (index === -1) return null;

    const note = notes[index];
    const updatedNote = {
      ...note,
      ...updateData,
      updateTime: this.now()
    };

    if (updateData.isPinned !== undefined) {
      updatedNote.pinnedTime = updateData.isPinned ? this.now() : 0;
    }

    notes[index] = updatedNote;
    this.saveNotes(notes);
    return updatedNote;
  }

  static deleteNote(id) {
    const notes = this.getNotes();
    const filtered = notes.filter(note => note.id !== id);
    this.saveNotes(filtered);
    return filtered.length < notes.length;
  }

  static togglePinNote(id) {
    const notes = this.getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return null;
    return this.updateNote(id, { isPinned: !note.isPinned });
  }

  static sortNotes(notes) {
    return notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return b.isPinned - a.isPinned;
      }
      return b.updateTime - a.updateTime;
    });
  }

  static searchNotes(keyword) {
    const notes = this.getNotes();
    if (!keyword.trim()) return this.sortNotes(notes);
    const filtered = notes.filter(note =>
      note.title.toLowerCase().includes(keyword.toLowerCase()) ||
      note.content.toLowerCase().includes(keyword.toLowerCase())
    );
    return this.sortNotes(filtered);
  }

  static filterNotesByCategory(category) {
    const notes = this.getNotes();
    if (category === '全部') return this.sortNotes(notes);
    const filtered = notes.filter(note => note.category === category);
    return this.sortNotes(filtered);
  }

  // ========== 待办相关 ==========
  static getTodos() {
    const data = this.get(STORAGE_KEYS.TODOS, []);
    return Array.isArray(data) ? data : [];
  }

  static saveTodos(todos) {
    return this.set(STORAGE_KEYS.TODOS, todos);
  }

  static addTodo(todoData) {
    const todos = this.getTodos();
    const newTodo = {
      id: this.generateId(),
      title: todoData.title || '',
      completed: false,
      isPinned: todoData.isPinned || false,
      pinnedTime: todoData.isPinned ? this.now() : 0,
      createTime: this.now(),
      dueDate: todoData.dueDate || null,
      category: todoData.category || '全部'
    };
    todos.unshift(newTodo);
    this.saveTodos(todos);
    return newTodo;
  }

  static updateTodo(id, updateData) {
    const todos = this.getTodos();
    const index = todos.findIndex(todo => todo.id === id);
    if (index === -1) return null;

    const todo = todos[index];
    const updatedTodo = { ...todo, ...updateData };

    if (updateData.isPinned !== undefined) {
      updatedTodo.pinnedTime = updateData.isPinned ? this.now() : 0;
    }

    todos[index] = updatedTodo;
    this.saveTodos(todos);
    return updatedTodo;
  }

  static deleteTodo(id) {
    const todos = this.getTodos();
    const filtered = todos.filter(todo => todo.id !== id);
    this.saveTodos(filtered);
    return filtered.length < todos.length;
  }

  static toggleTodoComplete(id) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return null;
    return this.updateTodo(id, { completed: !todo.completed });
  }

  static togglePinTodo(id) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return null;
    return this.updateTodo(id, { isPinned: !todo.isPinned });
  }

  static sortTodos(todos) {
    return todos.sort((a, b) => {
      const aPriority = (a.isPinned && !a.completed) ? 2 : (!a.completed ? 1 : 0);
      const bPriority = (b.isPinned && !b.completed) ? 2 : (!b.completed ? 1 : 0);
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.createTime - a.createTime;
    });
  }

  static getTodoStats() {
    const todos = this.getTodos();
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }

  static filterTodosByCategory(category) {
    const todos = this.getTodos();
    if (category === '全部') return this.sortTodos(todos);
    const filtered = todos.filter(todo => (todo.category || '全部') === category);
    return this.sortTodos(filtered);
  }

  // ========== 分类相关 ==========
  static getCategories() {
    const data = this.get(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    return Array.isArray(data) ? data : DEFAULT_CATEGORIES;
  }

  static addCategory(category) {
    const categories = this.getCategories();
    if (!categories.includes(category)) {
      categories.push(category);
      this.set(STORAGE_KEYS.CATEGORIES, categories);
    }
    return categories;
  }

  // ========== 用户相关 ==========
  static getUserInfo() {
    return this.get(STORAGE_KEYS.USER_INFO, null);
  }

  static setUserInfo(userInfo) {
    return this.set(STORAGE_KEYS.USER_INFO, userInfo);
  }

  // ========== 深色模式 ==========
  static getDarkMode() {
    return this.get(STORAGE_KEYS.DARK_MODE, false);
  }

  static setDarkMode(isDark) {
    return this.set(STORAGE_KEYS.DARK_MODE, isDark);
  }
}

module.exports = Storage;
