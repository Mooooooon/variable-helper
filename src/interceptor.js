import { extension_settings } from '../../../../extensions.js';
import { extensionName } from './constants.js';
import { extractVariablesFromText, parseVariableSyntax } from './parser.js';

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
export async function variableHelperInterceptor(chat, contextSize, abort, type) {
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
}
