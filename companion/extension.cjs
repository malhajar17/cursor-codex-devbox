'use strict';

const vscode = require('vscode');
const { createPane } = require('./pane.cjs');

function activate(context) {
  const log = vscode.window.createOutputChannel('Codex Pane for Cursor', { log: true });
  const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  button.text = '$(layout-sidebar-right) Codex';
  button.tooltip = 'Open Codex on the right';
  button.command = 'cursorCodex.openOnRight';
  button.show();
  const pane = createPane(vscode, log, { onState(state) {
    button.text = state === 'waiting' ? '$(sync~spin) Codex connecting' :
      state === 'unavailable' ? '$(warning) Codex setup' : '$(layout-sidebar-right) Codex';
    button.tooltip = state === 'waiting' ? 'Waiting for Codex in this workspace; click to focus it when ready' :
      state === 'unavailable' ? 'Codex did not start. Install or enable the official Codex extension in this workspace, then reload.' :
        'Open Codex on the right';
  } });
  context.subscriptions.push(log, pane, button,
    vscode.commands.registerCommand('cursorCodex.openOnRight', async () => {
      try { await pane.open(); }
      catch (error) {
        log.error(error);
        const action = await vscode.window.showWarningMessage(`Codex Pane: ${error.message}`, 'Open Extensions', 'Reload Window');
        if (action === 'Open Extensions') await vscode.commands.executeCommand('workbench.extensions.search', '@id:openai.chatgpt');
        if (action === 'Reload Window') await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    }));
  pane.start().catch(error => log.error(error));
}

module.exports = { activate };
