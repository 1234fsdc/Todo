/**
 * 阿里云大模型 API 服务
 * 基于通义千问 / Qwen 系列模型
 */

const API_KEY = 'sk-2e92f11567dc487daee346e1924175f8';
const API_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

class AIAPI {
  /**
   * 检查网络状态
   * @returns {Promise<boolean>} 是否联网
   */
  static checkNetwork() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none' && res.networkType !== 'offline';
          resolve(isConnected);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 调用阿里云大模型 API
   * @param {string} prompt 用户提示词
   * @param {string} systemPrompt 系统提示词
   * @returns {Promise<string>} AI 回复内容
   */
  static async chat(prompt, systemPrompt = '') {
    // 先检查网络
    const isConnected = await this.checkNetwork();
    if (!isConnected) {
      throw new Error('网络未连接，请检查网络设置');
    }

    return new Promise((resolve, reject) => {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      wx.request({
        url: `${API_BASE_URL}/services/aigc/text-generation/generation`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
         data: {
           model: 'qwen-plus',
           input: {
             messages: messages
           },
           parameters: {
             result_format: 'message',
             max_tokens: 2000,
             temperature: 0.7,
             top_p: 0.9
           }
         },
        success: (res) => {
          if (res.statusCode === 200 && res.data.output) {
            const content = res.data.output.choices[0].message.content;
            resolve(content);
          } else {
            console.error('API 调用失败:', res);
            let errorMsg = 'API 调用失败';
            if (res.statusCode === 403) {
              errorMsg = '请求被拦截：请在小程序后台配置服务器域名 https://dashscope.aliyuncs.com';
            } else if (res.statusCode === 404) {
              errorMsg = 'API 地址不存在';
            } else if (res.statusCode >= 500) {
              errorMsg = '阿里云服务器错误，请稍后重试';
            }
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          console.error('请求失败:', err);
          let errorMsg = '网络请求失败';
          if (err.errMsg && err.errMsg.includes('fail url not in domain list')) {
            errorMsg = '域名未配置：请在小程序后台「开发设置」→「服务器域名」中添加 https://dashscope.aliyuncs.com';
          } else if (err.errMsg && err.errMsg.includes('fail timeout')) {
            errorMsg = '请求超时，请检查网络';
          } else if (err.errMsg && err.errMsg.includes('fail ssl')) {
            errorMsg = 'SSL证书错误';
          }
          reject(new Error(errorMsg));
        }
      });
    });
  }

  // ========== 笔记 AI 功能 ==========

  /**
   * 生成笔记摘要
   * @param {string} content 笔记内容
   * @returns {Promise<string>} 摘要
   */
  static async generateSummary(content) {
    const prompt = `请为以下笔记内容生成一个简短的摘要（不超过50个字）：

${content}

注意：
1. 只总结内容本身，不要涉及标题
2. 直接输出摘要内容，不要添加"摘要："等前缀
3. 不要添加任何解释`;

    try {
      const summary = await this.chat(prompt, '你是一个专业的笔记助手，擅长提取文本核心内容。');
      return summary.trim();
    } catch (e) {
      console.error('生成摘要失败:', e);
      return content.substring(0, 50) + '...';
    }
  }

  /**
   * 推荐笔记分类
   * @param {string} title 标题
   * @param {string} content 内容
   * @returns {Promise<string>} 分类（工作/生活/学习）
   */
  static async recommendCategory(title, content) {
    const prompt = `请分析以下笔记，判断它属于哪个分类。只能从"工作"、"生活"、"学习"中选择一个。

标题：${title}
内容：${content}

请只输出分类名称，不要添加任何其他内容。`;

    try {
      const category = await this.chat(prompt, '你是一个智能分类助手，擅长根据内容判断分类。');
      const validCategories = ['工作', '生活', '学习'];
      const result = category.trim();
      return validCategories.includes(result) ? result : '全部';
    } catch (e) {
      console.error('推荐分类失败:', e);
      return '全部';
    }
  }

  /**
   * 提取关键词
   * @param {string} content 内容
   * @returns {Promise<string[]>} 关键词数组
   */
  static async extractKeywords(content) {
    const prompt = `请从以下文本中提取3-5个关键词，用逗号分隔：

${content}

请只输出关键词，用逗号分隔，不要添加其他内容。`;

    try {
      const result = await this.chat(prompt, '你是一个关键词提取专家。');
      return result.split(/[,，]/).map(k => k.trim()).filter(k => k.length > 0).slice(0, 5);
    } catch (e) {
      console.error('提取关键词失败:', e);
      return [];
    }
  }

  // ========== 待办 AI 功能 ==========

  /**
   * 分析任务优先级
   * @param {Object} todo 待办对象
   * @returns {Promise<Object>} 优先级分析
   */
  static async analyzePriority(todo) {
    const prompt = `请分析以下待办任务的优先级。

任务：${todo.title}
${todo.dueDate ? '截止时间：' + todo.dueDate : ''}
${todo.isPinned ? '已置顶' : ''}

请从以下维度分析，并返回 JSON 格式：
{
  "urgency": 1-10,
  "importance": 1-10,
  "priorityLevel": "紧急/高/中/低",
  "reason": "简短说明原因"
}

请只输出 JSON，不要添加其他内容。`;

    try {
      const result = await this.chat(prompt, '你是一个任务管理专家，擅长分析任务优先级。');
      // 解析 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          urgency: analysis.urgency || 5,
          importance: analysis.importance || 5,
          priorityLevel: analysis.priorityLevel || '中',
          reason: analysis.reason || '普通任务',
          priorityScore: (analysis.urgency || 5) * 5 + (analysis.importance || 5) * 5
        };
      }
    } catch (e) {
      console.error('分析优先级失败:', e);
    }
    
    // 降级到本地规则
    return this.fallbackAnalyzePriority(todo);
  }

  /**
   * 分析待办列表并给出建议
   * @param {Array} todos 待办数组
   * @returns {Promise<Object>} 分析结果
   */
  static async analyzeTodos(todos) {
    const pendingTodos = todos.filter(t => !t.completed);
    if (pendingTodos.length === 0) {
      return {
        total: todos.length,
        pending: 0,
        completed: todos.filter(t => t.completed).length,
        urgent: 0,
        high: 0,
        medium: 0,
        suggestion: '暂无待办事项，享受当下吧！'
      };
    }

    const todoList = pendingTodos.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    
    const prompt = `请分析以下待办列表，给出处理建议：

${todoList}

请给出简短的建议（不超过50字），帮助用户合理安排时间。`;

    try {
      const suggestion = await this.chat(prompt, '你是一个时间管理专家。');
      
      // 统计优先级
      const analyzed = await Promise.all(
        pendingTodos.map(todo => this.analyzePriority(todo))
      );
      
      const urgent = analyzed.filter(a => a.priorityLevel === '紧急').length;
      const high = analyzed.filter(a => a.priorityLevel === '高').length;
      const medium = analyzed.filter(a => a.priorityLevel === '中').length;
      
      return {
        total: todos.length,
        pending: pendingTodos.length,
        completed: todos.filter(t => t.completed).length,
        urgent,
        high,
        medium,
        suggestion: suggestion.trim()
      };
    } catch (e) {
      console.error('分析待办列表失败:', e);
      return this.fallbackAnalyzeTodos(todos);
    }
  }

  /**
   * 智能任务拆解
   * @param {string} taskTitle 任务标题
   * @returns {Promise<string[]>} 子任务数组
   */
  static async breakDownTask(taskTitle) {
    const prompt = `请将以下任务拆解为具体的子任务步骤：

任务：${taskTitle}

请输出子任务列表，每行一个，不要添加编号或其他格式。`;

    try {
      const result = await this.chat(prompt, '你是一个任务规划专家。');
      return result.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (e) {
      console.error('任务拆解失败:', e);
      return ['分析任务需求', '制定执行计划', '开始执行任务'];
    }
  }

  // ========== 降级方案（本地规则） ==========

  static fallbackAnalyzePriority(todo) {
    const title = (todo.title || '').toLowerCase();
    let urgency = 5;
    let importance = 5;

    const urgentKeywords = ['紧急', '马上', '立即', '今天', '截止', '逾期'];
    const importantKeywords = ['重要', '关键', '项目', '客户', '考试', '面试'];

    urgentKeywords.forEach(word => {
      if (title.includes(word)) urgency = Math.max(urgency, 8);
    });

    importantKeywords.forEach(word => {
      if (title.includes(word)) importance = Math.max(importance, 8);
    });

    if (todo.isPinned) importance = Math.max(importance, 7);

    const score = urgency * 5 + importance * 5;
    let level = '低';
    if (score >= 80) level = '紧急';
    else if (score >= 60) level = '高';
    else if (score >= 40) level = '中';

    return {
      urgency,
      importance,
      priorityLevel: level,
      reason: '基于关键词分析',
      priorityScore: score
    };
  }

  static fallbackAnalyzeTodos(todos) {
    const pending = todos.filter(t => !t.completed).length;
    return {
      total: todos.length,
      pending,
      completed: todos.filter(t => t.completed).length,
      urgent: 0,
      high: 0,
      medium: pending,
      suggestion: pending > 0 ? `你有 ${pending} 个待办任务等待完成。` : '暂无待办事项，享受当下吧！'
    };
  }
}

module.exports = AIAPI;
