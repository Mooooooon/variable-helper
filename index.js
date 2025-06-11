// 变量助手扩展 - 主脚本
// 提供更自然的变量语法：@变量名 = 值 和 @变量名
// 新增条件判断功能：@if(变量名 > 值): 内容 和 @if(条件): 内容 @else: 内容

// 导入必要的模块
import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

// 扩展配置
const extensionName = 'variable-helper';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 默认设置
const defaultSettings = {
  enabled: true,
  debug: false,
  conditionalEnabled: true,
};

/**
 * 加载扩展设置
 */
async function loadSettings() {
  // 创建设置对象如果不存在
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // 更新UI
  $('#variable_helper_enabled').prop('checked', extension_settings[extensionName].enabled).trigger('input');
  $('#variable_helper_debug').prop('checked', extension_settings[extensionName].debug).trigger('input');
  $('#variable_helper_conditional')
    .prop('checked', extension_settings[extensionName].conditionalEnabled)
    .trigger('input');
}

/**
 * 启用/禁用变量助手
 */
function onEnabledChange(event) {
  const value = Boolean($(event.target).prop('checked'));
  extension_settings[extensionName].enabled = value;
  saveSettingsDebounced();

  if (extension_settings[extensionName].debug) {
    console.log(`变量助手已${value ? '启用' : '禁用'}`);
  }
}

/**
 * 调试模式开关
 */
function onDebugChange(event) {
  const value = Boolean($(event.target).prop('checked'));
  extension_settings[extensionName].debug = value;
  saveSettingsDebounced();
}

/**
 * 条件判断功能开关
 */
function onConditionalChange(event) {
  const value = Boolean($(event.target).prop('checked'));
  extension_settings[extensionName].conditionalEnabled = value;
  saveSettingsDebounced();

  if (extension_settings[extensionName].debug) {
    console.log(`条件判断功能已${value ? '启用' : '禁用'}`);
  }
}

/**
 * 处理条件判断语法
 * @param {string} text 原始文本
 * @param {Object} currentVariables 当前的变量状态
 * @returns {string} 处理后的文本
 */
function parseConditionalSyntax(text, currentVariables = {}) {
  if (!text || !extension_settings[extensionName].conditionalEnabled) return text;

  const debug = extension_settings[extensionName].debug;
  let processedText = text;

  // 修复：正确匹配操作符，确保>=、<=在>、<之前匹配
  const conditionPattern = /([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)\s*(>=|<=|==|!=|>|<)\s*(.+)/;

  // 辅助函数：获取变量值
  const getVariableValue = varName => {
    let value = currentVariables[varName];
    if (value === undefined) {
      value = getSTVariableValue(varName);
    }
    return value;
  };

  // 优先处理多行条件：@if(条件): 内容 @end（从内到外处理，避免嵌套问题）
  // 使用非贪婪匹配，且不跨越其他@if或@end
  let hasMultilineChanges = true;
  while (hasMultilineChanges) {
    hasMultilineChanges = false;
    const multiLineIfRegex = /@if\s*\(\s*([^)]+)\s*\):\s*((?:(?!@if|@end)[\s\S])*?)@end/g;

    processedText = processedText.replace(multiLineIfRegex, (match, condition, content) => {
      hasMultilineChanges = true;

      if (debug) {
        console.log(`变量助手: 处理多行条件 - 条件: "${condition}", 内容: "${content}"`);
      }

      const conditionMatch = condition.match(conditionPattern);
      if (!conditionMatch) {
        if (debug) {
          console.log(`变量助手: 无法解析条件表达式: ${condition}`);
        }
        return match;
      }

      const [, varName, operator, compareValue] = conditionMatch;
      const currentValue = getVariableValue(varName);

      if (debug) {
        console.log(`变量助手: 多行条件评估 - 变量 ${varName}(${currentValue}) ${operator} ${compareValue.trim()}`);
      }

      // 如果变量不存在，条件为假，返回空字符串
      if (currentValue === null || currentValue === undefined) {
        if (debug) {
          console.log(`变量助手: 变量 ${varName} 不存在，多行条件为假`);
        }
        return '';
      }

      // 直接评估条件并返回结果
      const conditionResult = evaluateCondition(currentValue, operator, compareValue.trim());

      if (debug) {
        console.log(`变量助手: 多行条件结果: ${conditionResult ? '真' : '假'}`);
      }

      return conditionResult ? content.trim() : '';
    });
  }

  // 处理if-else条件：@if(条件): 内容1 @else: 内容2
  const ifElseRegex = /@if\s*\(\s*([^)]+)\s*\):\s*([^@]+?)\s*@else:\s*([^@\n\r]+)/g;
  processedText = processedText.replace(ifElseRegex, (match, condition, thenContent, elseContent) => {
    if (debug) {
      console.log(`变量助手: 处理if-else条件 - 条件: "${condition}", then: "${thenContent}", else: "${elseContent}"`);
    }

    const conditionMatch = condition.match(conditionPattern);
    if (!conditionMatch) {
      if (debug) {
        console.log(`变量助手: 无法解析条件表达式: ${condition}`);
      }
      return match;
    }

    const [, varName, operator, compareValue] = conditionMatch;
    const currentValue = getVariableValue(varName);

    if (debug) {
      console.log(`变量助手: if-else条件评估 - 变量 ${varName}(${currentValue}) ${operator} ${compareValue.trim()}`);
    }

    // 如果变量不存在，使用else分支
    if (currentValue === null || currentValue === undefined) {
      if (debug) {
        console.log(`变量助手: 变量 ${varName} 不存在，使用else分支`);
      }
      return elseContent.trim();
    }

    // 直接评估条件并返回对应分支
    const conditionResult = evaluateCondition(currentValue, operator, compareValue.trim());

    if (debug) {
      console.log(`变量助手: if-else条件结果: ${conditionResult ? 'then分支' : 'else分支'}`);
    }

    return conditionResult ? thenContent.trim() : elseContent.trim();
  });

  // 最后处理简单单行条件：@if(条件): 内容
  const singleIfRegex = /@if\s*\(\s*([^)]+)\s*\):\s*([^@\n\r]+?)(?=\s*(?:@\w+|$|\n|\r))/g;
  processedText = processedText.replace(singleIfRegex, (match, condition, content) => {
    if (debug) {
      console.log(`变量助手: 处理单行条件 - 条件: "${condition}", 内容: "${content}"`);
    }

    const conditionMatch = condition.match(conditionPattern);
    if (!conditionMatch) {
      if (debug) {
        console.log(`变量助手: 无法解析条件表达式: ${condition}`);
      }
      return match;
    }

    const [, varName, operator, compareValue] = conditionMatch;
    const currentValue = getVariableValue(varName);

    if (debug) {
      console.log(`变量助手: 单行条件评估 - 变量 ${varName}(${currentValue}) ${operator} ${compareValue.trim()}`);
    }

    // 如果变量不存在，条件为假，返回空字符串
    if (currentValue === null || currentValue === undefined) {
      if (debug) {
        console.log(`变量助手: 变量 ${varName} 不存在，单行条件为假`);
      }
      return '';
    }

    // 直接评估条件并返回结果
    const conditionResult = evaluateCondition(currentValue, operator, compareValue.trim());

    if (debug) {
      console.log(`变量助手: 单行条件结果: ${conditionResult ? '真' : '假'}`);
    }

    return conditionResult ? content.trim() : '';
  });

  return processedText;
}

/**
 * 获取SillyTavern中的变量值
 * @param {string} varName 变量名
 * @returns {any} 变量值
 */
function getSTVariableValue(varName) {
  try {
    // 尝试从SillyTavern的上下文获取变量值
    const context = SillyTavern.getContext();

    // SillyTavern的变量存储在chat metadata中
    if (context && context.chat && context.chat.length > 0) {
      // 查找最新的变量设置
      for (let i = context.chat.length - 1; i >= 0; i--) {
        const message = context.chat[i];
        if (message && message.mes) {
          // 检查消息中是否包含该变量的设置
          const setVarRegex = new RegExp(`\\{\\{setvar::${varName}::([^}]+)\\}\\}`, 'g');
          const match = setVarRegex.exec(message.mes);
          if (match) {
            return match[1];
          }
        }
      }
    }

    // 如果在chat中没找到，尝试从extension_settings中获取
    if (extension_settings.variables && extension_settings.variables[varName] !== undefined) {
      return extension_settings.variables[varName];
    }

    return null;
  } catch (error) {
    console.log(`变量助手: 获取变量 ${varName} 时出错:`, error);
    return null;
  }
}

/**
 * 评估条件表达式
 * @param {any} leftValue 左侧值
 * @param {string} operator 操作符
 * @param {any} rightValue 右侧值
 * @returns {boolean} 比较结果
 */
function evaluateCondition(leftValue, operator, rightValue) {
  // 首先尝试数字比较
  const leftNum = parseFloat(String(leftValue));
  const rightNum = parseFloat(String(rightValue));

  const isLeftNumber = !isNaN(leftNum) && isFinite(leftNum);
  const isRightNumber = !isNaN(rightNum) && isFinite(rightNum);

  // 如果两边都是数字，使用数字比较
  if (isLeftNumber && isRightNumber) {
    switch (operator) {
      case '==':
        return leftNum === rightNum;
      case '!=':
        return leftNum !== rightNum;
      case '>':
        return leftNum > rightNum;
      case '<':
        return leftNum < rightNum;
      case '>=':
        return leftNum >= rightNum;
      case '<=':
        return leftNum <= rightNum;
      default:
        return false;
    }
  }

  // 否则使用字符串比较
  const leftStr = String(leftValue);
  const rightStr = String(rightValue);

  switch (operator) {
    case '==':
      return leftStr === rightStr;
    case '!=':
      return leftStr !== rightStr;
    case '>':
      return leftStr > rightStr;
    case '<':
      return leftStr < rightStr;
    case '>=':
      return leftStr >= rightStr;
    case '<=':
      return leftStr <= rightStr;
    default:
      return false;
  }
}

/**
 * 解析自然语言变量语法
 * @param {string} text 原始文本
 * @param {Object} currentVariables 当前的变量状态
 * @returns {string} 转换后的文本
 */
function parseVariableSyntax(text, currentVariables = {}) {
  if (!text) return text;

  let processedText = text;
  const debug = extension_settings[extensionName].debug;

  // 直接处理条件判断语法（不再需要中间宏步骤）
  processedText = parseConditionalSyntax(processedText, currentVariables);

  // 匹配变量赋值：@变量名 = 值
  const assignmentRegex = /@([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)\s*=\s*([^@\n\r]+)/g;
  processedText = processedText.replace(assignmentRegex, (match, varName, value) => {
    const processedValue = value.trim();
    const replacement = `{{setvar::${varName}::${processedValue}}}`;

    if (debug) {
      console.log(`变量助手: 转换赋值 "${match}" -> "${replacement}"`);
    }

    return replacement;
  });

  // 匹配变量获取：@变量名（不包括 @if 和 @else 等关键字）
  const getterRegex = /@([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)(?!\s*[=\(]|else|end)/g;
  processedText = processedText.replace(getterRegex, (match, varName) => {
    const replacement = `{{getvar::${varName}}}`;

    if (debug) {
      console.log(`变量助手: 转换获取 "${match}" -> "${replacement}"`);
    }

    return replacement;
  });

  return processedText;
}

/**
 * 从文本中提取变量值的映射表
 * @param {string} text 文本内容
 * @returns {Object} 变量名到值的映射
 */
function extractVariablesFromText(text) {
  const variables = {};

  // 匹配变量赋值：@变量名 = 值
  const assignmentRegex = /@([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)\s*=\s*([^@\n\r]+)/g;
  let match;

  while ((match = assignmentRegex.exec(text)) !== null) {
    const [, varName, value] = match;
    variables[varName] = value.trim();
  }

  return variables;
}

/**
 * 处理消息对象的变量语法
 * @param {Object} message 消息对象
 * @param {Object} allChatVariables 所有聊天中的变量
 */
function processMessageVariables(message, allChatVariables = {}) {
  if (!message || !message.mes) return;

  const originalText = message.mes;

  // 首先提取当前消息中的变量
  const currentVariables = extractVariablesFromText(originalText);

  // 合并到全局变量表中
  Object.assign(allChatVariables, currentVariables);

  // 处理变量语法，传入当前的变量状态
  const processedText = parseVariableSyntax(originalText, allChatVariables);

  if (originalText !== processedText) {
    message.mes = processedText;

    if (extension_settings[extensionName].debug) {
      console.log('变量助手: 处理了消息中的变量语法');
      console.log('变量助手: 当前变量状态:', allChatVariables);
    }
  }
}

/**
 * Prompt Interceptor 函数 - 在生成前拦截和处理聊天内容
 * @param {Array} chat 聊天消息数组
 * @param {number} contextSize 上下文大小
 * @param {Function} abort 终止函数
 * @param {string} type 生成类型
 */
globalThis.variableHelperInterceptor = async function (chat, contextSize, abort, type) {
  // 检查是否启用
  if (!extension_settings[extensionName] || !extension_settings[extensionName].enabled) {
    return;
  }

  const debug = extension_settings[extensionName].debug;

  if (debug) {
    console.log(`变量助手: 拦截到${type}类型的生成请求，处理${chat.length}条消息`);
  }

  // 维护整个聊天过程中的变量状态
  const allChatVariables = {};

  // 处理每条消息中的变量语法
  for (let i = 0; i < chat.length; i++) {
    if (chat[i] && chat[i].mes) {
      processMessageVariables(chat[i], allChatVariables);
    }
  }

  if (debug) {
    console.log('变量助手: 最终变量状态:', allChatVariables);
  }
};

/**
 * 测试变量解析功能
 */
function testVariableParsing() {
  const testCases = [
    // 基础变量
    '@好感度 = 100',
    '@名字 = 小明',
    '你好，@名字！你的好感度是@好感度。',

    // 单个条件测试
    '@if(好感度 > 80): 角色会对用户表白',
    '@if(等级 >= 10): 你已经是高级玩家了！',
    '@if(名字 == 小明): 你好，小明同学！',

    // if-else测试
    '@if(好感度 > 90): 关系很好 @else: 关系一般',
    '@if(等级 >= 10): 高级玩家 @else: 新手玩家',

    // 多行条件测试
    '@if(关系状态 == 恋人): 亲爱的，今天过得怎么样？ 想要一起吃晚饭吗？ @end',

    // 复合测试
    '@好感度 = 100 @if(好感度 > 80): 角色会表白',

    // 分离的条件（避免冲突）
    '@等级 = 15',
    '@if(等级 >= 10): 你是高级玩家',
    '@if(生命值 <= 20): 状态不佳',
  ];

  console.log('变量助手测试开始（包含条件判断）：');
  console.log('=========================================');

  testCases.forEach((testCase, index) => {
    // 创建测试用的变量状态
    const testVariables = { 好感度: '100', 名字: '小明', 等级: '5', 生命值: '30' };
    const result = parseVariableSyntax(testCase, testVariables);
    console.log(`测试 ${index + 1}:`);
    console.log(`  输入: ${testCase}`);
    console.log(`  输出: ${result}`);
    console.log('');
  });

  // 显示提示
  toastr.success('测试结果已输出到控制台（F12）', '变量助手测试完成');
}

/**
 * 扩展初始化
 */
jQuery(async () => {
  try {
    // 加载设置界面HTML
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    $('#extensions_settings2').append(settingsHtml);

    // 绑定事件监听器
    $('#variable_helper_enabled').on('input', onEnabledChange);
    $('#variable_helper_debug').on('input', onDebugChange);
    $('#variable_helper_conditional').on('input', onConditionalChange);
    $('#test_variable_parsing').on('click', testVariableParsing);

    // 加载设置
    await loadSettings();

    console.log('变量助手扩展已加载（含条件判断功能）');

    if (extension_settings[extensionName].debug) {
      console.log('变量助手: 调试模式已启用');
    }
  } catch (error) {
    console.error('变量助手扩展加载失败:', error);
  }
});
