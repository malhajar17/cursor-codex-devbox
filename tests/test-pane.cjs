'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPane, rightLayout, VIEW } = require('../companion/pane.cjs');

function fixture(options = {}) {
  let clock = 0, listener, disposed = false;
  const calls = [], logs = [], states = [], documents = [], settings = { ...options.settings };
  const groups = options.groups ?? [{ viewColumn: 1, tabs: [] }];
  const readyCommands = ['chatgpt.newCodexPanel', 'aichat.close-sidebar', 'workbench.action.closePanel'];
  const vscode = {
    Uri: { from: uri => ({ ...uri }) },
    workspace: {
      isTrusted: options.trusted ?? true,
      workspaceFolders: options.folders ?? [{}],
      getConfiguration: () => ({ get: (key, fallback) => settings[key] ?? fallback }),
      async openTextDocument(options) { const doc = { options, uri: { scheme: 'untitled', path: '/Untitled-1' } }; documents.push(doc); return doc; }
    },
    window: {
      tabGroups: { all: groups, onDidChangeTabs(fn) { listener = fn; return { dispose() { disposed = true; } }; } },
      async showTextDocument(document, options) { groups.find(g => g.viewColumn === options.viewColumn).tabs.push({ input: { uri: document.uri } }); }
    },
    commands: {
      async getCommands() { return options.available === false || clock < (options.readyAt ?? 0) ? [] : readyCommands; },
      async executeCommand(command, ...args) {
        calls.push([command, ...args]);
        await options.onCommand?.(command, options);
        if (command === 'vscode.getEditorLayout') return options.layout ?? { orientation: 0, groups: [{}] };
        if (command === 'vscode.setEditorLayout') {
          const count = node => node.groups?.length ? node.groups.reduce((sum, group) => sum + count(group), 0) : 1;
          for (let i = groups.length; i < count(args[0]); i++) groups.push({ viewColumn: i + 1, tabs: [] });
        }
        if (command === 'vscode.openWith') {
          await options.onOpen?.();
          const column = options.wrongColumn ?? args[2].viewColumn;
          const group = groups.find(g => g.viewColumn === column) ?? { viewColumn: column, tabs: [] };
          if (!groups.includes(group)) groups.push(group);
          for (const old of groups) old.tabs = old.tabs.filter(tab => tab.input?.uri !== args[0]);
          group.tabs.push({ isActive: true, input: { uri: args[0], viewType: VIEW } });
        }
      }
    }
  };
  const pane = createPane(vscode, { info: message => logs.push(message) }, {
    now: () => clock, settle: 20, poll: 10, timeout: 100, onState: state => states.push(state),
    async delay(ms) { clock += ms; await options.onTick?.({ clock, groups, settings, changeTabs: () => listener() }); }
  });
  return { pane, calls, groups, settings, logs, states, documents, vscode, isDisposed: () => disposed,
    opens: () => calls.filter(([command]) => command === 'vscode.openWith') };
}

const tab = path => ({ isActive: true, input: { viewType: VIEW, uri: { scheme: 'openai-codex', authority: 'route', path } } });

test('waits for remote Codex; opens once and does not submit a prompt', async () => {
  const f = fixture({ readyAt: 40 });
  await f.pane.start();
  await f.pane.start();
  assert.equal(f.opens().length, 1);
  assert.equal(f.opens()[0][1].path, '/extension/panel/new');
  assert.deepEqual(f.opens()[0][3], { viewColumn: 2, preserveFocus: true, preview: false });
  assert.deepEqual(f.calls.map(c => c[0]), ['aichat.close-sidebar', 'vscode.getEditorLayout', 'vscode.setEditorLayout', 'workbench.action.focusLastEditorGroup', 'vscode.openWith', 'workbench.action.closePanel']);
});

test('waits for restored tabs and reuses their exact conversation URI', async () => {
  const restored = tab('/local/existing-conversation');
  const f = fixture({ onTick({ clock, groups, changeTabs }) {
    if (clock === 20) { groups[0].tabs.push(restored); changeTabs(); }
  } });
  await f.pane.start();
  assert.equal(f.opens()[0][1], restored.input.uri);
  assert.match(f.logs.at(-1), /^Reused/);
});

test('prefers the existing right-hand conversation and preserves both chats', async () => {
  const left = tab('/local/left'), right = tab('/local/right');
  const f = fixture({ layout: { orientation: 0, groups: [{}, {}] }, groups: [
    { viewColumn: 1, tabs: [left] }, { viewColumn: 2, tabs: [right] }
  ] });
  await f.pane.start();
  assert.equal(f.opens()[0][1], right.input.uri);
  assert.equal(f.groups.flatMap(g => g.tabs).length, 2);
  assert.ok(!f.calls.some(c => c[0] === 'vscode.setEditorLayout'));
});

test('a restoring text tab with the Codex scheme is reused', async () => {
  const restored = tab('/local/restoring');
  delete restored.input.viewType;
  const f = fixture({ groups: [{ viewColumn: 1, tabs: [restored] }] });
  await f.pane.start();
  assert.equal(f.opens()[0][1], restored.input.uri);
});

test('does not reopen when the user closes it during the session', async () => {
  const f = fixture();
  await f.pane.start();
  f.groups.forEach(group => { group.tabs = []; });
  await f.pane.start();
  assert.equal(f.opens().length, 1);
  await f.pane.open();
  assert.equal(f.opens().length, 2);
  assert.equal(f.opens()[1][3].preserveFocus, false);
});

test('missing Codex has a bounded wait without layout changes', async () => {
  const f = fixture({ available: false });
  await f.pane.start();
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.pane.open(), error => error.code === 'CODEX_UNAVAILABLE');
  assert.equal(f.states.at(-1), 'unavailable');
});

test('disabled startup, welcome windows and untrusted projects are skipped', async () => {
  for (const options of [{ settings: { autoOpen: false } }, { folders: [] }, { trusted: false }]) {
    const f = fixture(options);
    await f.pane.start();
    assert.equal(f.calls.length, 0);
  }
});

test('turning off automatic opening while connecting cancels pending work', async () => {
  const f = fixture({ readyAt: 50, onTick({ settings }) { settings.autoOpen = false; } });
  await f.pane.start();
  assert.equal(f.calls.length, 0);
});

test('disposal cancels pending work and releases the tab listener', async () => {
  const f = fixture({ readyAt: 50, onTick() { f.pane.dispose(); } });
  await f.pane.start();
  assert.equal(f.calls.length, 0);
  assert.equal(f.isDisposed(), true);
});

test('concurrent button clicks create only one editor', async () => {
  const f = fixture();
  await Promise.all([f.pane.open(), f.pane.open(), f.pane.start()]);
  assert.equal(f.opens().length, 1);
});

test('clicking during automatic startup joins its wait instead of cancelling it', async () => {
  let clicked;
  const f = fixture({ readyAt: 60, onTick({ clock }) {
    if (clock === 10) clicked = f.pane.open();
  } });
  await f.pane.start();
  await clicked;
  assert.equal(f.opens().length, 1);
  assert.equal(f.opens()[0][3].preserveFocus, false);
  assert.deepEqual(f.states, ['waiting', 'ready']);
});

test('a manual open waits for a slow remote extension even with automatic startup off', async () => {
  const f = fixture({ readyAt: 70, settings: { autoOpen: false } });
  await f.pane.open();
  assert.equal(f.opens().length, 1);
  assert.equal(f.states.at(-1), 'ready');
});

test('a failed attempt does not prevent opening after the extension is installed', async () => {
  const options = { available: false };
  const f = fixture(options);
  await f.pane.start();
  options.available = true;
  await f.pane.open();
  assert.equal(f.opens().length, 1);
  assert.equal(f.states.at(-1), 'ready');
});

test('respects settings that keep Agents and the bottom panel visible', async () => {
  const f = fixture({ settings: { hideCursorAgents: false, fullHeight: false } });
  await f.pane.start();
  assert.ok(!f.calls.some(c => c[0].includes('close')));
});

test('hides Cursor Agents before choosing a group that its close command could remove', async () => {
  const f = fixture({ layout: { orientation: 0, groups: [{}, {}] }, onCommand(command, options) {
    if (command === 'aichat.close-sidebar') options.layout = { orientation: 0, groups: [{}] };
  } });
  await f.pane.start();
  assert.equal(f.opens()[0][3].viewColumn, 2);
  assert.ok(f.calls.some(c => c[0] === 'vscode.setEditorLayout'));
  assert.ok(f.calls.findIndex(c => c[0] === 'aichat.close-sidebar') < f.calls.findIndex(c => c[0] === 'vscode.getEditorLayout'));
});

test('an empty workspace retains a clean blank editor to the left of Codex', async () => {
  const f = fixture();
  await f.pane.start();
  assert.equal(f.documents.length, 1);
  assert.deepEqual(f.documents[0].options, { language: 'plaintext' });
  assert.equal(f.groups[0].tabs[0].input.uri.scheme, 'untitled');
  assert.equal(f.groups[1].tabs[0].input.uri.scheme, 'openai-codex');
});

test('does not add a blank editor when the user already has code open', async () => {
  const code = { input: { uri: { scheme: 'vscode-remote', path: '/project/main.py' } } };
  const f = fixture({ groups: [{ viewColumn: 1, tabs: [code] }] });
  await f.pane.start();
  assert.equal(f.documents.length, 0);
  assert.equal(f.groups[0].tabs[0], code);
});

test('does not report success when Cursor places Codex in the wrong group', async () => {
  const f = fixture({ wrongColumn: 1 });
  await assert.rejects(f.pane.start(), /did not keep it/);
  assert.equal(f.states.at(-1), 'error');
  assert.ok(!f.logs.some(message => message.startsWith('Opened')));
});

test('does not replace a legacy webview conversation', async () => {
  const f = fixture({ groups: [{ viewColumn: 1, tabs: [{ input: { viewType: 'chatgpt.panelView' } }] }] });
  await assert.rejects(f.pane.start(), /legacy Codex pane/);
  assert.equal(f.opens().length, 0);
  assert.ok(!f.calls.some(c => c[0] === 'vscode.setEditorLayout'));
});

test('retains stacked groups and appends a full-height right column', () => {
  const layout = { orientation: 1, groups: [{ size: 0.3 }, { size: 0.7 }] };
  const target = rightLayout(layout);
  assert.equal(target.column, 3);
  assert.equal(target.layout.orientation, 0);
  assert.deepEqual(target.layout.groups[0].groups, layout.groups);
  assert.equal(layout.orientation, 1);
});

test('retains a complex layout and its proportions rather than flattening it', () => {
  const layout = { orientation: 0, groups: [{ size: 0.4 }, { size: 0.6, groups: [{ size: 0.2 }, { size: 0.8 }] }] };
  const target = rightLayout(layout);
  assert.equal(target.column, 4);
  assert.deepEqual(target.layout.groups[1].groups, layout.groups[1].groups);
  assert.ok(Math.abs(target.layout.groups[0].size / target.layout.groups[1].size - 0.4 / 0.6) < 1e-12);
});

test('invalid or overfull layouts fail before opening or closing anything', () => {
  assert.throws(() => rightLayout(null), /layout/);
  assert.throws(() => rightLayout({ orientation: 1, groups: Array.from({ length: 9 }, () => ({})) }), /nine/);
});
