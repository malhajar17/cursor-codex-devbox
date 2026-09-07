'use strict';

const VIEW = 'chatgpt.conversationEditor';
const READY_COMMAND = 'chatgpt.newCodexPanel';

function codexTabs(groups) {
  return groups.flatMap(group => group.tabs.map(tab => ({ group, tab })))
    .filter(({ tab }) => tab.input?.uri?.scheme === 'openai-codex' &&
      (!tab.input.viewType || tab.input.viewType === VIEW));
}

function leafCount(node) {
  return node.groups?.length ? node.groups.reduce((n, child) => n + leafCount(child), 0) : 1;
}

// Keep every existing group. Reuse a full-height rightmost leaf or append one.
function rightLayout(layout) {
  if (!layout || !Array.isArray(layout.groups) || !layout.groups.length) {
    throw new Error('Cursor did not provide an editor layout.');
  }
  const count = leafCount(layout);
  if (count > 1 && layout.orientation === 0 && !layout.groups.at(-1).groups?.length) {
    return { column: count };
  }
  if (count >= 9) throw new Error('All nine editor columns are in use.');
  if (count === 1) {
    return { column: 2, layout: { orientation: 0, groups: [{ size: 0.62 }, { size: 0.38 }] } };
  }
  if (layout.orientation === 0) {
    const total = layout.groups.reduce((n, group) => n + (group.size ?? 1), 0);
    return { column: count + 1, layout: { orientation: 0, groups: [
      ...layout.groups.map(group => ({ ...group, size: (group.size ?? 1) / total * 0.62 })),
      { size: 0.38 }
    ] } };
  }
  return { column: count + 1, layout: { orientation: 0, groups: [
    { size: 0.62, groups: layout.groups }, { size: 0.38 }
  ] } };
}

function createPane(vscode, log, options = {}) {
  const now = options.now ?? Date.now;
  const delay = options.delay ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let disposed = false;
  let handled = false;
  let running;
  let tabsChangedAt = now();
  const tabsListener = vscode.window.tabGroups.onDidChangeTabs(() => { tabsChangedAt = now(); });
  const config = () => vscode.workspace.getConfiguration('cursorCodex');
  const enabled = () => vscode.workspace.isTrusted && !!vscode.workspace.workspaceFolders?.length;

  async function ready(automatic) {
    const deadline = now() + (options.timeout ?? 120000);
    while (!disposed && now() < deadline) {
      if (!enabled() || (automatic && (handled || !config().get('autoOpen', true)))) return false;
      const commands = await vscode.commands.getCommands(true);
      if (commands.includes(READY_COMMAND) && now() - tabsChangedAt >= (options.settle ?? 2000)) return true;
      await delay(options.poll ?? 1000);
    }
    return false;
  }

  async function place(automatic) {
    if (disposed || !enabled()) return;
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(READY_COMMAND)) throw new Error('Codex is still connecting or is not installed in this workspace.');

    // The URI is the same new-agent route used by the verified Codex extension.
    // Opening a custom editor does not submit a prompt or start a model request.
    const currentLayout = await vscode.commands.executeCommand('vscode.getEditorLayout');
    const target = rightLayout(currentLayout);
    const existing = codexTabs(vscode.window.tabGroups.all);
    const selected = existing.find(({ group, tab }) => group.viewColumn === target.column && tab.isActive) ??
      existing.find(({ group }) => group.viewColumn === target.column) ?? existing.at(-1);
    if (!selected && vscode.window.tabGroups.all.some(group => group.tabs.some(tab => tab.input?.viewType === 'chatgpt.panelView'))) {
      throw new Error('A legacy Codex pane is already open. Keep that conversation and open a current Codex editor when ready.');
    }
    const uri = selected?.tab.input.uri ?? vscode.Uri.from({ scheme: 'openai-codex', authority: 'route', path: '/extension/panel/new' });
    if (disposed) return;
    if (target.layout) await vscode.commands.executeCommand('vscode.setEditorLayout', target.layout);
    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW, {
      viewColumn: target.column, preserveFocus: automatic, preview: false
    });
    if (disposed) return;
    if (config().get('hideCursorAgents', true) && commands.includes('aichat.close-sidebar')) {
      await vscode.commands.executeCommand('aichat.close-sidebar');
    }
    if (config().get('fullHeight', true) && commands.includes('workbench.action.closePanel')) {
      await vscode.commands.executeCommand('workbench.action.closePanel');
    }
    log.info(`${selected ? 'Reused' : 'Opened'} Codex in editor column ${target.column}.`);
  }

  function open(automatic = false) {
    if (running) return running;
    handled = true;
    running = place(automatic).finally(() => { running = undefined; });
    return running;
  }

  return {
    async start() {
      if (!enabled() || !config().get('autoOpen', true)) return;
      log.info('Waiting for Codex and restored editor tabs.');
      if (await ready(true)) await open(true);
      else if (!disposed && !handled) log.info('Automatic opening skipped. Use the Codex status bar button after connecting.');
    },
    open,
    dispose() { disposed = true; tabsListener.dispose(); }
  };
}

module.exports = { createPane, rightLayout, codexTabs, VIEW };
