import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { defaultSettings, extensionName } from './constants.js';

/**
 * 加载扩展设置
 */
export async function loadSettings() {
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
export function onEnabledChange(event) {
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
export function onDebugChange(event) {
  const value = Boolean($(event.target).prop('checked'));
  extension_settings[extensionName].debug = value;
  saveSettingsDebounced();
}

/**
 * 条件判断功能开关
 */
export function onConditionalChange(event) {
  const value = Boolean($(event.target).prop('checked'));
  extension_settings[extensionName].conditionalEnabled = value;
  saveSettingsDebounced();

  if (extension_settings[extensionName].debug) {
    console.log(`条件判断功能已${value ? '启用' : '禁用'}`);
  }
}
