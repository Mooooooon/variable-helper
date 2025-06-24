// 变量助手扩展 - 主脚本
// 通过导入模块化的功能来初始化扩展

import { extension_settings } from '../../../extensions.js';
import { extensionFolderPath, extensionName } from './src/constants.js';
import { variableHelperInterceptor } from './src/interceptor.js';
import { loadSettings, onConditionalChange, onDebugChange, onEnabledChange } from './src/settings.js';
import { testVariableParsing } from './src/test.js';

// 注册全局拦截器
globalThis.variableHelperInterceptor = variableHelperInterceptor;

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

    if (extension_settings[extensionName]?.debug) {
      console.log('变量助手: 调试模式已启用');
    }
  } catch (error) {
    console.error('变量助手扩展加载失败:', error);
  }
});
