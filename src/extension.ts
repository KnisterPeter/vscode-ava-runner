'use strict';
import { exists } from 'fs';
import { join, resolve } from 'path';
import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as ansiregex from 'ansi-regex';

let avaProcess: ChildProcess;
let channel: vscode.OutputChannel;
let bar: vscode.StatusBarItem;

function output(data: string): void {
  data.split('\n').forEach(line => {
    const output = line
      .replace(/^\s+$/, '')
      .replace(ansiregex(), '');
    channel.appendLine(output);
    if (output !== '') {
      bar.text = output;
      bar.show();
    }
  });
}

function startAva() {
  if (vscode.workspace.rootPath) {
    console.log('Starting...', vscode.workspace.rootPath);
    const avaPath = resolve(vscode.workspace.rootPath, './node_modules/.bin/ava');
    exists(avaPath, exists => {
      if (exists) {
        try {
          avaProcess = spawn(avaPath, ['--watch'], {
            cwd: vscode.workspace.rootPath
          });
          avaProcess.stdout.on('data', (data: Buffer) => output(data.toString()));
          avaProcess.stderr.on('data', (data: Buffer) => output(data.toString()));
          avaProcess.on('exit', code => console.log(`Exited AVA with ${code}`));
          console.log(`Started AVA process [pid=${avaProcess.pid}]`);
        } catch (e) {
          vscode.window.showErrorMessage((e as Error).message);
        }
      } else {
        vscode.window.showWarningMessage('ava binary not found');
      }
    });
  }
}

function stopAva() {
  console.log('Stopping...');
  if (avaProcess) {
    try {
      avaProcess.kill();
      avaProcess = undefined;

      channel.hide();
      bar.hide();
    } catch (e) {
      vscode.window.showErrorMessage((e as Error).message);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.startAva', () => {
    startAva();
  });
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand('extension.stopAva', () => {
    stopAva();
  });
  context.subscriptions.push(disposable);

  channel = vscode.window.createOutputChannel('AVA')
  context.subscriptions.push(channel);
  disposable = vscode.commands.registerCommand('extension.openAvaOutput', () => {
    channel.show(true);
  });
  context.subscriptions.push(disposable);

  bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  bar.command = 'extension.openAvaOutput';
  context.subscriptions.push(bar);
}

export function deactivate() {
  stopAva();
}
