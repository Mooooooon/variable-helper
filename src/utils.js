import { extension_settings } from '../../../extensions.js';

/**
 * 获取SillyTavern中的变量值
 * @param {string} varName 变量名
 * @returns {any} 变量值
 */
export function getSTVariableValue(varName) {
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
export function evaluateCondition(leftValue, operator, rightValue) {
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
