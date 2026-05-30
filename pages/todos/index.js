const Storage = require('../../utils/storage');
const AIAPI = require('../../utils/ai-api');

Page({
  data: {
    todos: [],
    categories: [],
    currentCategory: '全部',
    newTodoTitle: '',
    newTodoCategory: '全部',
    stats: {
      total: 0,
      completed: 0,
      pending: 0
    },
    darkMode: false,
    aiSuggestion: '',
    showAISuggestion: false,
    useSmartSort: true,
    aiLoading: false
  },

  onLoad() {
    this.loadCategories();
    this.loadTodos();
    this.loadStats();
    this.loadDarkMode();
    this.runAIAnalysis();
  },

  onShow() {
    this.loadTodos();
    this.loadStats();
    this.loadDarkMode();
    this.runAIAnalysis();
  },

  loadDarkMode() {
    const app = getApp();
    this.setData({ darkMode: app.globalData.darkMode });
  },

  loadCategories() {
    const categories = Storage.getCategories();
    const categoryIndex = categories.indexOf(this.data.newTodoCategory);
    this.setData({ 
      categories,
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 0
    });
  },

  async loadTodos() {
    const { currentCategory, useSmartSort } = this.data;
    let todos;

    if (useSmartSort) {
      // 使用 AI 智能排序
      const allTodos = Storage.filterTodosByCategory(currentCategory);
      todos = await this.smartSortWithAI(allTodos);
    } else {
      todos = Storage.filterTodosByCategory(currentCategory);
    }

    this.setData({ todos });
  },

  async smartSortWithAI(todos) {
    if (!Array.isArray(todos) || todos.length === 0) return [];
    
    this.setData({ aiLoading: true });
    
    try {
      // 为每个待办调用 AI 分析优先级
      const analyzedTodos = await Promise.all(
        todos.map(async (todo) => {
          try {
            const analysis = await AIAPI.analyzePriority(todo);
            return {
              ...todo,
              aiAnalysis: analysis
            };
          } catch (e) {
            console.error('AI 分析待办失败:', e);
            return {
              ...todo,
              aiAnalysis: {
                urgency: 5,
                importance: 5,
                priorityLevel: '中',
                reason: '普通任务',
                priorityScore: 50
              }
            };
          }
        })
      );
      
      this.setData({ aiLoading: false });
      
      // 排序规则：
      // 1. 未完成的优先于已完成的
      // 2. 置顶的优先（在未完成的里面）
      // 3. AI 优先级分数高的在前
      // 4. 创建时间新的在前
      return analyzedTodos.sort((a, b) => {
        // 1. 未完成的优先
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        // 已完成的按完成时间倒序
        if (a.completed && b.completed) {
          return (b.completedTime || 0) - (a.completedTime || 0);
        }
        
        // 2. 置顶的优先（在未完成的里面）
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        
        // 3. AI 优先级分数高的在前
        const scoreDiff = (b.aiAnalysis?.priorityScore || 0) - (a.aiAnalysis?.priorityScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        
        // 4. 创建时间新的在前
        return (b.createTime || 0) - (a.createTime || 0);
      });
    } catch (e) {
      console.error('智能排序失败:', e);
      this.setData({ aiLoading: false });
      return todos;
    }
  },

  loadStats() {
    const stats = Storage.getTodoStats();
    this.setData({ stats });
  },

  async runAIAnalysis() {
    const allTodos = Storage.getTodos();
    
    this.setData({ aiLoading: true });
    
    try {
      const analysis = await AIAPI.analyzeTodos(allTodos);
      this.setData({
        aiSuggestion: analysis.suggestion,
        showAISuggestion: analysis.pending > 0,
        aiLoading: false
      });
    } catch (e) {
      console.error('AI 分析失败:', e);
      this.setData({ aiLoading: false });
      
      // 降级到本地统计
      const pending = allTodos.filter(t => !t.completed).length;
      this.setData({
        aiSuggestion: pending > 0 ? `你有 ${pending} 个待办任务等待完成。` : '暂无待办事项，享受当下吧！',
        showAISuggestion: pending > 0
      });
    }
  },

  toggleSmartSort() {
    const newValue = !this.data.useSmartSort;
    this.setData({ useSmartSort: newValue }, () => {
      this.loadTodos();
      wx.showToast({
        title: newValue ? '已开启智能排序' : '已关闭智能排序',
        icon: 'none'
      });
    });
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ 
      currentCategory: category
    }, () => {
      this.loadTodos();
    });
  },

  onInputChange(e) {
    this.setData({ newTodoTitle: e.detail.value });
  },

  onAddCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    this.setData({ 
      newTodoCategory: category,
      categoryIndex: index
    });
  },

  selectQuickCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ newTodoCategory: category });
  },

  addTodo() {
    const title = this.data.newTodoTitle.trim();
    if (!title) {
      wx.showToast({
        title: '请输入待办内容',
        icon: 'none'
      });
      return;
    }

    const { newTodoCategory } = this.data;
    Storage.addTodo({ 
      title,
      category: newTodoCategory
    });
    this.setData({ newTodoTitle: '' });
    this.loadTodos();
    this.loadStats();
    this.runAIAnalysis();

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  toggleComplete(e) {
    const id = e.currentTarget.dataset.id;
    Storage.toggleTodoComplete(id);
    this.loadTodos();
    this.loadStats();
    this.runAIAnalysis();
  },

  togglePin(e) {
    const id = e.currentTarget.dataset.id;
    Storage.togglePinTodo(id);
    this.loadTodos();
  },

  deleteTodo(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个待办事项吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          Storage.deleteTodo(id);
          this.loadTodos();
          this.loadStats();
          this.runAIAnalysis();
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  },

  deleteCompleted() {
    const allTodos = Storage.getTodos();
    const completedCount = allTodos.filter(t => t.completed).length;
    if (completedCount === 0) {
      wx.showToast({ title: '暂无已完成的待办', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '清除已完成',
      content: `确定要删除 ${completedCount} 个已完成的待办吗？`,
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          const remaining = allTodos.filter(t => !t.completed);
          Storage.saveTodos(remaining);
          this.loadTodos();
          this.loadStats();
          this.runAIAnalysis();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  }
});
