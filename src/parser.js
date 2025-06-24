import { extension_settings } from '../../../../extensions.js';
import { extensionName } from './constants.js';
import { evaluateCondition, getSTVariableValue } from './utils.js';

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

  // 逻辑操作符解析函数
  const parseLogicalCondition = (condition, getVariableValue, debug) => {
    if (debug) {
      console.log(`变量助手: 解析逻辑条件: "${condition}"`);
    }

    // 处理非（NOT）操作符：!(条件) 或 非(条件) 或 不是(条件)
    const notMatch = condition.match(/^(?:!|非|不是)\s*\(\s*(.+)\s*\)$/);
    if (notMatch) {
      const innerCondition = notMatch[1];
      const innerResult = parseLogicalCondition(innerCondition, getVariableValue, debug);
      if (debug) {
        console.log(`变量助手: 非操作 - 内部条件"${innerCondition}"结果: ${innerResult}, 非操作后: ${!innerResult}`);
      }
      return !innerResult;
    }

    // 处理与（AND）操作符：条件1 && 条件2 或 条件1 且 条件2 或 条件1 并且 条件2
    const andMatch = condition.match(/^(.+?)\s*(?:&&|且|并且)\s*(.+)$/);
    if (andMatch) {
      const [, leftCondition, rightCondition] = andMatch;
      const leftResult = parseLogicalCondition(leftCondition.trim(), getVariableValue, debug);
      const rightResult = parseLogicalCondition(rightCondition.trim(), getVariableValue, debug);
      const finalResult = leftResult && rightResult;
      if (debug) {
        console.log(
          `变量助手: 与操作 - 左条件"${leftCondition.trim()}"(${leftResult}) && 右条件"${rightCondition.trim()}"(${rightResult}) = ${finalResult}`,
        );
      }
      return finalResult;
    }

    // 处理或（OR）操作符：条件1 || 条件2 或 条件1 或 条件2 或 条件1 或者 条件2
    const orMatch = condition.match(/^(.+?)\s*(?:\|\||或|或者)\s*(.+)$/);
    if (orMatch) {
      const [, leftCondition, rightCondition] = orMatch;
      const leftResult = parseLogicalCondition(leftCondition.trim(), getVariableValue, debug);
      const rightResult = parseLogicalCondition(rightCondition.trim(), getVariableValue, debug);
      const finalResult = leftResult || rightResult;
      if (debug) {
        console.log(
          `变量助手: 或操作 - 左条件"${leftCondition.trim()}"(${leftResult}) || 右条件"${rightCondition.trim()}"(${rightResult}) = ${finalResult}`,
        );
      }
      return finalResult;
    }

    // 处理括号：(条件)
    const parenthesesMatch = condition.match(/^\s*\(\s*(.+)\s*\)\s*$/);
    if (parenthesesMatch) {
      return parseLogicalCondition(parenthesesMatch[1], getVariableValue, debug);
    }

    // 处理基本条件：变量名 操作符 值
    const basicMatch = condition.match(conditionPattern);
    if (basicMatch) {
      const [, varName, operator, compareValue] = basicMatch;
      const currentValue = getVariableValue(varName);

      if (debug) {
        console.log(`变量助手: 基本条件评估 - 变量 ${varName}(${currentValue}) ${operator} ${compareValue.trim()}`);
      }

      // 如果变量不存在，条件为假
      if (currentValue === null || currentValue === undefined) {
        if (debug) {
          console.log(`变量助手: 变量 ${varName} 不存在，条件为假`);
        }
        return false;
      }

      const result = evaluateCondition(currentValue, operator, compareValue.trim());
      if (debug) {
        console.log(`变量助手: 基本条件结果: ${result}`);
      }
      return result;
    }

    // 无法解析的条件，返回false
    if (debug) {
      console.log(`变量助手: 无法解析条件"${condition}"，返回false`);
    }
    return false;
  };

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

    // 处理多行if-elseif-else结构：@if(条件1): 内容1 @elseif(条件2): 内容2 @else: 内容3 @end
    const multiLineIfElseIfRegex = /@if\s*\([^)]+\)[^@]*?(?:@elseif[^@]*?)*(?:@else[^@]*?)?@end/g;

    processedText = processedText.replace(multiLineIfElseIfRegex, match => {
      hasMultilineChanges = true;

      if (debug) {
        console.log(`变量助手: 处理多行if-elseif-else结构: "${match}"`);
      }

      // 手动解析整个结构
      const parseMultilineConditions = text => {
        // 先找到主if条件和内容
        const ifMatch = text.match(/@if\s*\(\s*([^)]+)\s*\):\s*([\s\S]*?)(?=@elseif|@else|@end)/);
        if (ifMatch) {
          const [, condition, content] = ifMatch;
          const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);
          if (conditionResult) {
            if (debug) {
              console.log(`变量助手: 多行if条件为真，返回内容: "${content.trim()}"`);
            }
            return content.trim();
          }
        }

        // 查找所有elseif条件
        const elseifMatches = [...text.matchAll(/@elseif\s*\(\s*([^)]+)\s*\):\s*([\s\S]*?)(?=@elseif|@else|@end)/g)];
        for (const elseifMatch of elseifMatches) {
          const [, condition, content] = elseifMatch;
          const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);
          if (conditionResult) {
            if (debug) {
              console.log(`变量助手: 多行elseif条件为真，返回内容: "${content.trim()}"`);
            }
            return content.trim();
          }
        }

        // 查找else部分
        const elseMatch = text.match(/@else:\s*([\s\S]*?)@end/);
        if (elseMatch) {
          if (debug) {
            console.log(`变量助手: 多行所有条件为假，返回else内容: "${elseMatch[1].trim()}"`);
          }
          return elseMatch[1].trim();
        }

        // 如果没有else且所有条件为假
        if (debug) {
          console.log(`变量助手: 多行所有条件为假且无else分支，返回空字符串`);
        }
        return '';
      };

      return parseMultilineConditions(match);
    });

    // 处理简单多行if-else结构：@if(条件): 内容1 @else: 内容2 @end
    const multiLineIfElseRegex =
      /@if\s*\(\s*([^)]+)\s*\):\s*((?:(?!@if|@else|@end)[\s\S])*?)@else:\s*((?:(?!@if|@else|@end)[\s\S])*?)@end/g;

    processedText = processedText.replace(multiLineIfElseRegex, (match, condition, thenContent, elseContent) => {
      hasMultilineChanges = true;

      if (debug) {
        console.log(`变量助手: 处理多行if-else - 条件: "${condition}", then: "${thenContent}", else: "${elseContent}"`);
      }

      // 使用新的逻辑条件解析函数
      const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);

      if (debug) {
        console.log(`变量助手: 多行if-else条件结果: ${conditionResult ? 'then分支' : 'else分支'}`);
      }

      return conditionResult ? thenContent.trim() : elseContent.trim();
    });

    // 处理简单多行if：@if(条件): 内容 @end
    const multiLineIfRegex = /@if\s*\(\s*([^)]+)\s*\):\s*((?:(?!@if|@end)[\s\S])*?)@end/g;

    processedText = processedText.replace(multiLineIfRegex, (match, condition, content) => {
      hasMultilineChanges = true;

      if (debug) {
        console.log(`变量助手: 处理多行条件 - 条件: "${condition}", 内容: "${content}"`);
      }

      // 使用新的逻辑条件解析函数
      const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);

      if (debug) {
        console.log(`变量助手: 多行条件结果: ${conditionResult ? '真' : '假'}`);
      }

      return conditionResult ? content.trim() : '';
    });
  }

  // 处理单行if-elseif-else条件：@if(条件1): 内容1 @elseif(条件2): 内容2 @else: 内容3
  const ifElseIfRegex =
    /@if\s*\([^)]+\)[^@]*?(?:@elseif\s*\([^)]+\)[^@]*?)*(?:@else[^@\n\r]*?)?(?=\s*(?:@\w+|$|\n|\r))/g;
  processedText = processedText.replace(ifElseIfRegex, match => {
    if (debug) {
      console.log(`变量助手: 处理单行if-elseif-else结构: "${match}"`);
    }

    // 解析主if条件
    const ifMatch = match.match(/@if\s*\(\s*([^)]+)\s*\):\s*([^@]+?)(?=\s*@(?:elseif|else)|$)/);
    if (ifMatch) {
      const [, condition, content] = ifMatch;

      // 使用新的逻辑条件解析函数
      const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);
      if (conditionResult) {
        if (debug) {
          console.log(`变量助手: if条件为真，返回内容: "${content.trim()}"`);
        }
        return content.trim();
      }
    }

    // 解析elseif条件
    const elseIfMatches = [...match.matchAll(/@elseif\s*\(\s*([^)]+)\s*\):\s*([^@]+?)(?=\s*@(?:elseif|else)|$)/g)];
    for (const elseIfMatch of elseIfMatches) {
      const [, condition, content] = elseIfMatch;

      // 使用新的逻辑条件解析函数
      const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);
      if (conditionResult) {
        if (debug) {
          console.log(`变量助手: elseif条件为真，返回内容: "${content.trim()}"`);
        }
        return content.trim();
      }
    }

    // 解析else部分
    const elseMatch = match.match(/@else:\s*([^@\n\r]+?)(?=\s*(?:@\w+|$|\n|\r)|$)/);
    if (elseMatch) {
      if (debug) {
        console.log(`变量助手: 单行所有条件为假，返回else内容: "${elseMatch[1].trim()}"`);
      }
      return elseMatch[1].trim();
    }

    // 如果没有else部分且所有条件为假，返回空字符串
    if (debug) {
      console.log(`变量助手: 单行所有条件为假且无else分支，返回空字符串`);
    }
    return '';
  });

  // 处理简单if-else条件：@if(条件): 内容1 @else: 内容2
  const ifElseRegex = /@if\s*\(\s*([^)]+)\s*\):\s*([^@]+?)\s*@else:\s*([^@\n\r]+)/g;
  processedText = processedText.replace(ifElseRegex, (match, condition, thenContent, elseContent) => {
    if (debug) {
      console.log(`变量助手: 处理if-else条件 - 条件: "${condition}", then: "${thenContent}", else: "${elseContent}"`);
    }

    // 使用新的逻辑条件解析函数
    const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);

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

    // 使用新的逻辑条件解析函数
    const conditionResult = parseLogicalCondition(condition, getVariableValue, debug);

    if (debug) {
      console.log(`变量助手: 单行条件结果: ${conditionResult ? '真' : '假'}`);
    }

    return conditionResult ? content.trim() : '';
  });

  return processedText;
}

/**
 * 解析自然语言变量语法
 * @param {string} text 原始文本
 * @param {Object} currentVariables 当前的变量状态
 * @returns {string} 转换后的文本
 */
export function parseVariableSyntax(text, currentVariables = {}) {
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
  const getterRegex = /@([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)(?!\s*[=\(]|else\b|end\b|if\b|elseif\b)/g;
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
export function extractVariablesFromText(text) {
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
