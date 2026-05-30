const Storage = require('../../utils/storage');
const AIAPI = require('../../utils/ai-api');

Page({
  data: {
    note: {
      title: '',
      content: '',
      isPinned: false,
      category: '全部'
    },
    categories: [],
    categoryIndex: 0,
    isEdit: false,
    noteId: null,
    formattedTime: '',
    darkMode: false,
    aiSummary: '',
    aiCategory: '',
    showAIRecommend: false,
    aiKeywords: [],
    aiLoading: false,
    aiPolishedContent: '',
    showPolishBtn: false
  },

  onLoad(options) {
    this.loadCategories();
    this.loadDarkMode();

    if (options.id) {
      this.loadNote(options.id);
    }
  },

  loadDarkMode() {
    const app = getApp();
    this.setData({ darkMode: app.globalData.darkMode });
  },

  loadCategories() {
    const categories = Storage.getCategories();
    this.setData({ categories });
  },

  loadNote(id) {
    const notes = Storage.getNotes();
    const note = notes.find(n => n.id === id);
    if (note) {
      const categoryIndex = this.data.categories.indexOf(note.category);
      this.setData({
        note: {
          title: note.title,
          content: note.content,
          isPinned: note.isPinned,
          category: note.category
        },
        isEdit: true,
        noteId: id,
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
        formattedTime: Storage.formatTime(note.updateTime)
      });
    }
  },

  onTitleInput(e) {
    this.setData({
      'note.title': e.detail.value
    });
    this.triggerAIRecommend();
  },

  onContentInput(e) {
    this.setData({
      'note.content': e.detail.value
    });
    this.triggerAIRecommend();
  },

  triggerAIRecommend() {
    const { title, content } = this.data.note;
    if (!title.trim() && !content.trim()) {
      this.setData({ showAIRecommend: false, showPolishBtn: false });
      return;
    }

    // 立即显示AI区域（带loading状态）
    this.setData({ 
      showAIRecommend: true,
      aiLoading: true,
      showPolishBtn: content.length > 10 // 内容超过10字显示修饰按钮
    });

    // 使用更短的防抖时间（500ms）
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.aiTimer = setTimeout(() => {
      this.runAIRecommend();
    }, 500);
  },

  async runAIRecommend() {
    const { title, content } = this.data.note;
    if (!title.trim() && !content.trim()) return;

    try {
      // 并行调用多个 AI 接口
      const [aiCategory, aiSummary, aiKeywords] = await Promise.all([
        AIAPI.recommendCategory(title, content),
        AIAPI.generateSummary(content || title),
        AIAPI.extractKeywords(content || title)
      ]);

      this.setData({
        aiCategory,
        aiSummary,
        aiKeywords,
        aiLoading: false
      });
    } catch (e) {
      console.error('AI 分析失败:', e);
      this.setData({ 
        aiLoading: false,
        aiError: e.message || 'AI分析失败'
      });
    }
  },

  // AI 修饰总结功能
  async polishContent() {
    const { content, title } = this.data.note;
    if (!content.trim()) {
      wx.showToast({ title: '请先输入内容', icon: 'none' });
      return;
    }

    this.setData({ aiLoading: true });

    try {
      const prompt = `请对以下内容进行修饰和总结，使其更加清晰、有条理。保持原意不变，优化表达：

${content}

注意：
1. 只返回修饰后的内容正文，不要包含标题
2. 不要添加"标题："、"内容："等前缀
3. 直接返回优化后的文本`;

      const polishedContent = await AIAPI.chat(prompt, '你是一位专业的文字编辑，擅长优化和润色文本。');
      
      this.setData({
        aiPolishedContent: polishedContent.trim(),
        aiLoading: false
      });
    } catch (e) {
      console.error('AI 修饰失败:', e);
      this.setData({ aiLoading: false });
      const errorMsg = e.message || '修饰失败，请重试';
      wx.showToast({ title: errorMsg.length > 20 ? errorMsg.substring(0, 20) + '...' : errorMsg, icon: 'none', duration: 3000 });
    }
  },

  // 应用修饰后的内容
  applyPolishedContent() {
    const { aiPolishedContent } = this.data;
    if (!aiPolishedContent) return;

    this.setData({
      'note.content': aiPolishedContent,
      aiPolishedContent: ''
    });

    wx.showToast({ title: '已应用修饰内容', icon: 'success' });
    
    // 重新触发AI分析
    this.triggerAIRecommend();
  },

  // 取消修饰
  cancelPolish() {
    this.setData({ aiPolishedContent: '' });
  },

  applyAICategory() {
    const { aiCategory, categories } = this.data;
    const categoryIndex = categories.indexOf(aiCategory);
    if (categoryIndex >= 0) {
      this.setData({
        'note.category': aiCategory,
        categoryIndex
      });
      wx.showToast({ title: '已应用AI推荐分类', icon: 'success' });
    }
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    this.setData({
      'note.category': category,
      categoryIndex: index
    });
  },

  togglePin() {
    this.setData({
      'note.isPinned': !this.data.note.isPinned
    });
  },

  saveNote() {
    const { note, isEdit, noteId } = this.data;

    if (!note.title.trim() && !note.content.trim()) {
      wx.showToast({
        title: '标题和内容不能都为空',
        icon: 'none'
      });
      return;
    }

    if (isEdit) {
      Storage.updateNote(noteId, note);
      wx.showToast({ title: '更新成功', icon: 'success' });
    } else {
      Storage.addNote(note);
      wx.showToast({ title: '创建成功', icon: 'success' });
    }

    setTimeout(() => {
      wx.navigateBack();
    }, 800);
  },

  deleteNote() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          Storage.deleteNote(this.data.noteId);
          wx.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 800);
        }
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
