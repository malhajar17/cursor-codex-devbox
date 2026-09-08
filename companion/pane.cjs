'use strict';

const VIEW = 'chatgpt.conversationEditor';
const READY_COMMAND = 'chatgpt.newCodexPanel';

class CodexUnavailableError extends Error {
  constructor() {
    super('Codex did not start in this workspace. Install or enable the official Codex extension in this SSH workspace, then reload the window. If it is already installed, check its extension activation log.');
    this.code = 'CODEX_UNAVAILABLE';
  }
}

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
  let manualRequested = false;
  let tabsChangedAt = now();
  const tabsListener = vscode.window.tabGroups.onDidChangeTabs(() => { tabsChangedAt = now(); });
  const config = () => vscode.workspace.getConfiguration('cursorCodex');
  const enabled = () => vscode.workspace.isTrusted && !!vscode.workspace.workspaceFolders?.length;
  const state = value => { if (!disposed) options.onState?.(value); };

  async function waitForLayout(predicate) {
    for (let attempt = 0; attempt < 40 && !disposed; attempt++) {
      if (predicate()) return true;
      await delay(50);
    }
    return false;
  }

  async function ready(automatic) {
    const deadline = now() + (options.timeout ?? 120000);
    while (!disposed && now() < deadline) {
      if (!enabled() || (automatic && !manualRequested && !config().get('autoOpen', true))) return 'cancelled';
      const commands = await vscode.commands.getCommands(true);
      if (commands.includes(READY_COMMAND) && now() - tabsChangedAt >= (options.settle ?? 2000)) return 'ready';
      await delay(options.poll ?? 1000);
    }
    return disposed ? 'cancelled' : 'timeout';
  }

  async function place(automatic) {
    if (disposed || !enabled()) return;
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(READY_COMMAND)) throw new CodexUnavailableError();

    // Cursor can implement Agents as an editor group. Hide it before choosing
    // a target, otherwise its close command can remove Codex's new group too.
    if (config().get('hideCursorAgents', true) && commands.includes('aichat.close-sidebar')) {
      await vscode.commands.executeCommand('aichat.close-sidebar');
    }

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
    const first = vscode.window.tabGroups.all.find(group => group.viewColumn === 1);
    if (first && first.tabs.every(tab => tab === selected?.tab) && selected?.group.viewColumn !== target.column) {
      // Cursor collapses an empty editor group when a custom editor opens.
      // A clean untitled preview keeps a place for code; no disk file is made.
      const document = await vscode.workspace.openTextDocument({ language: 'plaintext' });
      await vscode.window.showTextDocument(document, { viewColumn: 1, preserveFocus: true, preview: true });
    }
    if (target.layout) await vscode.commands.executeCommand('vscode.setEditorLayout', target.layout);
    // Cursor's set-layout command returns before tab-group notifications arrive.
    if (!await waitForLayout(() => vscode.window.tabGroups.all.some(group => group.viewColumn === target.column))) {
      if (disposed) return;
      throw new Error('Cursor did not create the right-hand editor group. Reload the window and try again.');
    }
    // Fresh custom editors can follow the active group in Cursor. Select the
    // target explicitly; it is always the full-height last group in our plan.
    await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW, {
      viewColumn: target.column, preserveFocus: automatic, preview: false
    });
    if (disposed) return;
    if (config().get('fullHeight', true) && commands.includes('workbench.action.closePanel')) {
      await vscode.commands.executeCommand('workbench.action.closePanel');
    }
    if (!await waitForLayout(() => codexTabs(vscode.window.tabGroups.all).some(({ group, tab }) =>
      group.viewColumn === target.column && tab.input.uri.toString() === uri.toString()))) {
      if (disposed) return;
      throw new Error('Codex opened, but Cursor did not keep it in the right-hand editor group.');
    }
    log.info(`${selected ? 'Reused' : 'Opened'} Codex in editor column ${target.column}.`);
  }

  function open(automatic = false) {
    if (!automatic) manualRequested = true;
    if (running) return running;
    running = (async () => {
      if (!enabled() || disposed) return;
      state('waiting');
      const result = await ready(automatic);
      if (result === 'cancelled') { state('idle'); return; }
      if (result === 'timeout') throw new CodexUnavailableError();
      await place(automatic && !manualRequested);
      if (!disposed) {
        handled = true;
        state('ready');
      }
    })().catch(error => {
      state(error.code === 'CODEX_UNAVAILABLE' ? 'unavailable' : 'error');
      throw error;
    }).finally(() => { running = undefined; manualRequested = false; });
    return running;
  }

  return {
    async start() {
      if (handled || !enabled() || !config().get('autoOpen', true)) return;
      log.info('Waiting for Codex and restored editor tabs.');
      try { await open(true); }
      catch (error) {
        if (error.code !== 'CODEX_UNAVAILABLE') throw error;
        log.info('Codex commands unavailable after waiting. Check the official extension in this workspace; the pane companion alone is not Codex.');
      }
    },
    open,
    dispose() { disposed = true; tabsListener.dispose(); }
  };
}

module.exports = { createPane, rightLayout, codexTabs, VIEW };
