const Storage = require('../../utils/storage');
const AIAPI = require('../../utils/ai-api');

Page({
  data: {
    generateType: 'todo',
    prompt: '',
    isGenerating: false,
    showResult: false,
    generatedTitle: '',
    generatedContent: '',
    generatedCategory: '全部',
    isPinned: false,
    categories: [],
    history: [],
    showHistory: false,
    darkMode: false
  },

  onLoad() {
    this.loadCategories();
    this.loadHistory();
    this.loadDarkMode();
  },

  onShow() {
    this.loadDarkMode();
  },

  loadDarkMode() {
    const app = getApp();
    this.setData({ darkMode: app.globalData.darkMode });
  },

  loadCategories() {
    const categories = Storage.getCategories();
    this.setData({ categories });
  },

  loadHistory() {
    const history = Storage.get('ai_write_history') || [];
    this.setData({ history: history.slice(0, 10) });
  },

  saveHistory(history) {
    Storage.set('ai_write_history', history.slice(0, 20));
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      generateType: type,
      showResult: false,
      generatedTitle: '',
      generatedContent: '',
      generatedCategory: '全部',
      isPinned: false
    });
  },

  onPromptInput(e) {
    this.setData({ prompt: e.detail.value });
  },

  async generateContent() {
    const { prompt, generateType } = this.data;

    if (!prompt.trim()) {
      wx.showToast({ title: '请先描述你的需求', icon: 'none' });
      return;
    }

    this.setData({ isGenerating: true });

    try {
      let result;
      if (generateType === 'note') {
        result = await this.generateNote(prompt);
      } else {
        result = await this.generateTodo(prompt);
      }

      console.log('AI生成结果:', result);
      console.log('内容长度:', result.content ? result.content.length : 0);
      
      this.setData({
        generatedTitle: result.title,
        generatedContent: result.content,
        generatedCategory: result.category,
        isPinned: result.isPinned,
        showResult: true,
        isGenerating: false
      });

      // 添加到历史记录
      this.addToHistory(generateType, result);
    } catch (e) {
      console.error('生成失败:', e);
      this.setData({ isGenerating: false });
      const errorMsg = e.message || '生成失败，请重试';
      wx.showToast({ title: errorMsg.length > 20 ? errorMsg.substring(0, 20) + '...' : errorMsg, icon: 'none', duration: 3000 });
    }
  },

  async generateNote(userInput) {
    const prompt = `请根据以下描述生成一个笔记，返回 JSON 格式：

描述：${userInput}

请返回以下格式的 JSON：
{
  "title": "笔记标题",
  "content": "笔记内容",
  "category": "工作/生活/学习"
}

注意：
1. 标题要简洁明了，不超过20个字
2. 内容必须完整输出，不要省略任何信息，不要截断
3. 分类只能从"工作"、"生活"、"学习"中选择
4. 只返回 JSON，不要其他内容`;

    const response = await AIAPI.chat(prompt, '你是一个专业的笔记助手，擅长根据用户描述生成结构清晰的笔记。输出必须完整，不能截断。');
    console.log('AI原始响应长度:', response.length);
    console.log('AI原始响应:', response.substring(0, 500) + '...');

    // 解析 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('JSON匹配成功，长度:', jsonMatch[0].length);
      const data = JSON.parse(jsonMatch[0]);
      console.log('解析后content长度:', data.content ? data.content.length : 0);
      return {
        title: data.title || '未命名笔记',
        content: data.content || '',
        category: ['工作', '生活', '学习'].includes(data.category) ? data.category : '全部',
        isPinned: false
      };
    }

    throw new Error('解析失败');
  },

  async generateTodo(userInput) {
    const prompt = `请根据以下描述生成一个待办事项，返回 JSON 格式：

描述：${userInput}

请返回以下格式的 JSON：
{
  "title": "待办标题",
  "category": "工作/生活/学习"
}

注意：
1. 标题要简洁明了，包含关键信息
2. 分类只能从"工作"、"生活"、"学习"中选择
3. 只返回 JSON，不要其他内容`;

    const response = await AIAPI.chat(prompt, '你是一个专业的任务管理助手，擅长根据用户描述生成清晰的待办事项。');

    // 解析 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        title: data.title || '未命名待办',
        content: '',
        category: ['工作', '生活', '学习'].includes(data.category) ? data.category : '全部',
        isPinned: false
      };
    }

    throw new Error('解析失败');
  },

  onTitleInput(e) {
    this.setData({ generatedTitle: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ generatedContent: e.detail.value });
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ generatedCategory: category });
  },

  togglePin() {
    this.setData({ isPinned: !this.data.isPinned });
  },

  regenerate() {
    this.generateContent();
  },

  copyResult() {
    const { generatedTitle, generatedContent } = this.data;
    const text = `${generatedTitle}\n\n${generatedContent}`;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  },

  saveResult() {
    const { generateType, generatedTitle, generatedContent, generatedCategory, isPinned } = this.data;

    if (!generatedTitle.trim()) {
      wx.showToast({ title: '标题不能为空', icon: 'none' });
      return;
    }

    if (generateType === 'note') {
      Storage.addNote({
        title: generatedTitle,
        content: generatedContent,
        category: generatedCategory,
        isPinned: isPinned
      });
      wx.showToast({ title: '笔记保存成功', icon: 'success' });
    } else {
      Storage.addTodo({
        title: generatedTitle,
        category: generatedCategory,
        isPinned: isPinned
      });
      wx.showToast({ title: '待办保存成功', icon: 'success' });
    }

    // 清空输入
    this.setData({
      prompt: '',
      showResult: false,
      generatedTitle: '',
      generatedContent: '',
      generatedCategory: '全部',
      isPinned: false
    });

    // 延迟后跳转到对应页面
    setTimeout(() => {
      wx.switchTab({
        url: generateType === 'note' ? '/pages/notes/index' : '/pages/todos/index'
      });
    }, 1000);
  },

  toggleHistory() {
    this.setData({ showHistory: true });
  },

  closeHistory() {
    this.setData({ showHistory: false });
  },

  preventClose() {
    // 阻止事件冒泡，防止点击面板关闭弹窗
  },

  addToHistory(type, result) {
    const history = this.data.history;
    const newItem = {
      id: Date.now(),
      type,
      title: result.title,
      category: result.category,
      time: this.formatTime(Date.now())
    };

    history.unshift(newItem);
    const newHistory = history.slice(0, 20);

    this.setData({ history: newHistory });
    this.saveHistory(newHistory);
  },

  useHistory(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.history[index];

    this.setData({
      generateType: item.type,
      prompt: `基于历史：${item.title}`,
      showResult: false,
      showHistory: false
    });
  },

  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: [] });
          Storage.remove('ai_write_history');
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  }
});
