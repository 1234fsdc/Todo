/**
 * AI 服务模块
 * 提供笔记摘要、分类推荐、待办优先级分析等功能
 * 基于本地规则引擎 + 模拟 AI 响应
 */

class AIService {
  // ========== 笔记 AI 功能 ==========

  /**
   * 生成笔记摘要
   * @param {string} content 笔记内容
   * @param {number} maxLength 最大长度
   * @returns {string} 摘要
   */
  static generateSummary(content, maxLength = 50) {
    if (!content || content.length <= maxLength) return content;
    
    // 智能摘要：提取关键句
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim());
    if (sentences.length === 0) return content.substring(0, maxLength) + '...';
    
    // 取第一句作为摘要基础
    let summary = sentences[0].trim();
    
    // 如果第一句太短，补充第二句
    if (summary.length < 20 && sentences.length > 1) {
      summary += '，' + sentences[1].trim();
    }
    
    // 截断到最大长度
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }

  /**
   * 推荐笔记分类
   * @param {string} title 标题
   * @param {string} content 内容
   * @returns {string} 推荐分类
   */
  static recommendCategory(title = '', content = '') {
    const text = (title + ' ' + content).toLowerCase();
    
    // 关键词映射表
    const categoryKeywords = {
      '工作': [
        '项目', '会议', '报告', '客户', '需求', '开发', '代码', 'bug', '测试',
        '上线', '评审', 'kpi', '绩效', '汇报', '邮件', '合同', '商务', '产品',
        '设计', '文档', '计划', '进度', '任务', '团队', '领导', '同事', '加班',
        '工资', '薪资', '面试', '招聘', '离职', '入职', '培训', '考核'
      ],
      '生活': [
        '购物', '超市', '买菜', '做饭', '洗衣', '打扫', '整理', '收纳',
        '旅行', '旅游', '机票', '酒店', '景点', '餐厅', '美食', '电影',
        '健身', '运动', '跑步', '瑜伽', '游泳', '医院', '医生', '药品',
        '家庭', '家人', '父母', '孩子', '宠物', '朋友', '聚会', '约会',
        '房租', '水电', '物业', '维修', '装修', '搬家', '快递', '外卖'
      ],
      '学习': [
        '课程', '学习', '考试', '复习', '预习', '作业', '论文', '毕业',
        '读书', '阅读', '笔记', '知识', '技能', '培训', '考证', '雅思',
        '托福', 'gre', '考研', '考公', '考编', '驾照', '语言', '英语',
        '日语', '韩语', '法语', '编程', '算法', '数据结构', '设计模式',
        '在线课程', '视频教程', '学习资料', '参考书', '教材', '实验'
      ]
    };
    
    // 计算每个分类的匹配分数
    const scores = {};
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      scores[category] = keywords.filter(keyword => text.includes(keyword)).length;
    }
    
    // 找出最高分
    let maxScore = 0;
    let bestCategory = '全部';
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }
    
    // 如果没有匹配到关键词，根据内容长度和结构判断
    if (maxScore === 0) {
      if (text.includes('TODO') || text.includes('待办') || text.includes('计划')) {
        bestCategory = '工作';
      } else if (text.length > 200 && text.includes('。')) {
        bestCategory = '学习';
      }
    }
    
    return bestCategory;
  }

  /**
   * 提取关键词标签
   * @param {string} content 内容
   * @returns {string[]} 关键词数组
   */
  static extractKeywords(content) {
    if (!content) return [];
    
    // 常见停用词
    const stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'
    ]);
    
    // 提取2-4字词组
    const words = [];
    for (let i = 0; i < content.length - 1; i++) {
      for (let len = 2; len <= 4 && i + len <= content.length; len++) {
        const word = content.substring(i, i + len);
        if (!stopWords.has(word) && word.length >= 2) {
          words.push(word);
        }
      }
    }
    
    // 统计词频
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });
    
    // 返回高频词（前3个）
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  // ========== 待办 AI 功能 ==========

  /**
   * 分析任务优先级
   * @param {Object} todo 待办对象
   * @returns {Object} 优先级分析结果
   */
  static analyzePriority(todo) {
    const title = (todo.title || '').toLowerCase();
    let urgency = 0; // 紧急度 0-10
    let importance = 0; // 重要性 0-10
    
    // 紧急关键词
    const urgentKeywords = [
      { word: '马上', score: 9 },
      { word: '立即', score: 9 },
      { word: '紧急', score: 10 },
      { word: ' urgent', score: 10 },
      { word: '尽快', score: 7 },
      { word: '今天', score: 8 },
      { word: '明天', score: 6 },
      { word: '今晚', score: 7 },
      { word: '截止', score: 8 },
      { word: ' deadline', score: 8 },
      { word: '最后期限', score: 9 },
      { word: '逾期', score: 10 },
      { word: '过期', score: 9 }
    ];
    
    // 重要关键词
    const importantKeywords = [
      { word: '重要', score: 9 },
      { word: '关键', score: 10 },
      { word: '核心', score: 9 },
      { word: '必须', score: 8 },
      { word: '必要', score: 7 },
      { word: '项目', score: 7 },
      { word: '客户', score: 8 },
      { word: '汇报', score: 7 },
      { word: '考试', score: 9 },
      { word: '面试', score: 8 },
      { word: '交付', score: 8 },
      { word: '上线', score: 9 }
    ];
    
    // 计算紧急度
    urgentKeywords.forEach(({ word, score }) => {
      if (title.includes(word)) urgency = Math.max(urgency, score);
    });
    
    // 计算重要性
    importantKeywords.forEach(({ word, score }) => {
      if (title.includes(word)) importance = Math.max(importance, score);
    });
    
    // 根据截止时间计算额外紧急度
    if (todo.dueDate) {
      const due = new Date(todo.dueDate);
      const now = new Date();
      const diffHours = (due - now) / (1000 * 60 * 60);
      
      if (diffHours < 0) urgency = Math.max(urgency, 10); // 已逾期
      else if (diffHours < 24) urgency = Math.max(urgency, 9); // 24小时内
      else if (diffHours < 72) urgency = Math.max(urgency, 7); // 3天内
      else if (diffHours < 168) urgency = Math.max(urgency, 5); // 一周内
    }
    
    // 置顶任务增加重要性
    if (todo.isPinned) {
      importance = Math.max(importance, 7);
    }
    
    // 计算综合优先级分数 (0-100)
    const priorityScore = urgency * 5 + importance * 5;
    
    // 确定优先级等级
    let priorityLevel = '低';
    if (priorityScore >= 80) priorityLevel = '紧急';
    else if (priorityScore >= 60) priorityLevel = '高';
    else if (priorityScore >= 40) priorityLevel = '中';
    
    return {
      urgency,
      importance,
      priorityScore,
      priorityLevel,
      reason: this.generatePriorityReason(urgency, importance, todo)
    };
  }

  /**
   * 生成优先级原因
   */
  static generatePriorityReason(urgency, importance, todo) {
    const reasons = [];
    
    if (urgency >= 8) reasons.push('时间紧迫');
    else if (urgency >= 5) reasons.push('有时间限制');
    
    if (importance >= 8) reasons.push('非常重要');
    else if (importance >= 5) reasons.push('比较重要');
    
    if (todo.isPinned) reasons.push('已置顶');
    
    return reasons.join('，') || '普通任务';
  }

  /**
   * 智能排序待办列表
   * @param {Array} todos 待办数组
   * @returns {Array} 排序后的待办数组
   */
  static smartSortTodos(todos) {
    if (!Array.isArray(todos) || todos.length === 0) return [];
    
    // 为每个待办计算优先级
    const analyzedTodos = todos.map(todo => ({
      ...todo,
      aiAnalysis: this.analyzePriority(todo)
    }));
    
    // 排序规则：
    // 1. 未完成的优先于已完成的
    // 2. 优先级分数高的在前
    // 3. 置顶的在前
    // 4. 创建时间新的在前
    return analyzedTodos.sort((a, b) => {
      // 完成状态
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 如果都已完成，按完成时间倒序
      if (a.completed && b.completed) {
        return (b.completedTime || 0) - (a.completedTime || 0);
      }
      
      // 优先级分数
      const scoreDiff = b.aiAnalysis.priorityScore - a.aiAnalysis.priorityScore;
      if (scoreDiff !== 0) return scoreDiff;
      
      // 置顶状态
      if (a.isPinned !== b.isPinned) {
        return b.isPinned ? 1 : -1;
      }
      
      // 创建时间
      return (b.createTime || 0) - (a.createTime || 0);
    });
  }

  /**
   * 分析待办列表，提供建议
   * @param {Array} todos 待办数组
   * @returns {Object} 分析建议
   */
  static analyzeTodos(todos) {
    if (!Array.isArray(todos) || todos.length === 0) {
      return {
        total: 0,
        urgent: 0,
        high: 0,
        suggestion: '暂无待办事项，享受当下吧！'
      };
    }
    
    const pendingTodos = todos.filter(t => !t.completed);
    const analyzed = pendingTodos.map(todo => this.analyzePriority(todo));
    
    const urgent = analyzed.filter(a => a.priorityLevel === '紧急').length;
    const high = analyzed.filter(a => a.priorityLevel === '高').length;
    const medium = analyzed.filter(a => a.priorityLevel === '中').length;
    
    let suggestion = '';
    if (urgent > 0) {
      suggestion = `你有 ${urgent} 个紧急任务需要优先处理，建议立即开始！`;
    } else if (high > 0) {
      suggestion = `有 ${high} 个重要任务等待完成，建议今天处理。`;
    } else if (medium > 0) {
      suggestion = `有 ${medium} 个中等优先级任务，可以抽空完成。`;
    } else {
      suggestion = '当前任务都比较轻松，保持节奏即可。';
    }
    
    return {
      total: todos.length,
      pending: pendingTodos.length,
      completed: todos.filter(t => t.completed).length,
      urgent,
      high,
      medium,
      suggestion
    };
  }

  /**
   * 智能任务拆解
   * @param {string} taskTitle 任务标题
   * @returns {string[]} 子任务数组
   */
  static breakDownTask(taskTitle) {
    const title = taskTitle.toLowerCase();
    
    // 常见任务拆解模板
    const templates = {
      '会议': ['确定会议议题', '准备会议材料', '预定会议室', '发送会议邀请', '准备演示设备'],
      '报告': ['收集数据资料', '整理分析内容', '撰写报告正文', '制作图表', '检查格式并提交'],
      '旅行': ['确定目的地', '查询交通方式', '预订机票/车票', '预订酒店', '制定行程计划', '准备行李'],
      '购物': ['列出购物清单', '比较价格', '选择购买渠道', '下单购买', '确认收货'],
      '学习': ['确定学习目标', '收集学习资料', '制定学习计划', '开始学习', '复习巩固', '测试成果'],
      '项目': ['需求分析', '制定计划', '分配任务', '开发实现', '测试验收', '上线部署'],
      '面试': ['了解公司背景', '准备自我介绍', '复习专业知识', '准备常见问题', '准备面试服装', '规划路线'],
      '健身': ['制定健身计划', '准备运动装备', '热身运动', '正式训练', '拉伸放松', '记录训练数据']
    };
    
    // 匹配模板
    for (const [keyword, steps] of Object.entries(templates)) {
      if (title.includes(keyword)) {
        return steps;
      }
    }
    
    // 默认拆解
    return [
      '分析任务需求',
      '制定执行计划',
      '准备所需资源',
      '开始执行任务',
      '检查完成质量'
    ];
  }
}

module.exports = AIService;
