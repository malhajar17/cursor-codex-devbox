'use strict';

const vscode = require('vscode');
const { createPane } = require('./pane.cjs');

function activate(context) {
  const log = vscode.window.createOutputChannel('Codex Pane for Cursor', { log: true });
  const pane = createPane(vscode, log);
  const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  button.text = '$(layout-sidebar-right) Codex';
  button.tooltip = 'Open Codex on the right';
  button.command = 'cursorCodex.openOnRight';
  button.show();
  context.subscriptions.push(log, pane, button,
    vscode.commands.registerCommand('cursorCodex.openOnRight', async () => {
      try { await pane.open(); }
      catch (error) {
        log.error(error);
        vscode.window.showWarningMessage(`Codex Pane: ${error.message}`);
      }
    }));
  pane.start().catch(error => log.error(error));
}

module.exports = { activate };
