import {
  commands,
  ExtensionContext,
  languages,
  StatusBarAlignment,
  window,
  workspace
} from 'vscode'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import * as vscode from 'vscode'

//====================
import { streamFromSpark } from './fuzzy_test/test_spark'
//===================

import { CompletionProvider } from './extension/providers/completion'
import { SidebarProvider } from './extension/providers/sidebar'
import { SessionManager } from './extension/session-manager'
import { EmbeddingDatabase } from './extension/embeddings'
import {
  delayExecution,
  getTerminal,
  getSanitizedCommitMessage
} from './extension/utils'
import { setContext } from './extension/context'
import {
  EXTENSION_CONTEXT_NAME,
  EXTENSION_NAME,
  EVENT_NAME,
  WEBUI_TABS,
  TWINNY_COMMAND_NAME,
  FUZZY_COMMAND_NAME
} from './common/constants'
import { TemplateProvider } from './extension/template-provider'
import { ProjectData, ServerMessage, TemplateData } from './common/types'
import { FileInteractionCache } from './extension/file-interaction'
import { getLineBreakCount } from './webview/utils'
import { FullScreenProvider } from './extension/providers/panel'
import { FuzzyProvider } from './extension/create-project'
import { generateProjectWithOllama } from './fuzzy_test/test_create_project'
import { error } from 'console'
import { WriteOptions } from '@lancedb/lancedb'

export async function activate(context: ExtensionContext) {
  setContext(context)
  const config = workspace.getConfiguration('twinny')
  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right)
  const templateDir = path.join(os.homedir(), '.twinny/templates') as string
  const templateProvider = new TemplateProvider(templateDir)
  const fileInteractionCache = new FileInteractionCache()
  const sessionManager = new SessionManager()
  const fullScreenProvider = new FullScreenProvider(
    context,
    templateDir,
    statusBarItem
  )

  const homeDir = os.homedir()
  const dbDir = path.join(homeDir, '.twinny/embeddings')
  let db

  if (workspace.name) {
    const dbPath = path.join(dbDir, workspace.name as string)

    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    db = new EmbeddingDatabase(dbPath, context)
    await db.connect()
  }

  const sidebarProvider = new SidebarProvider(
    statusBarItem,
    context,
    templateDir,
    db,
    sessionManager
  )

  const completionProvider = new CompletionProvider(
    statusBarItem,
    fileInteractionCache,
    templateProvider,
    context
  )

  // ��ʼ��С�Ժ�provider
  const fuzzyProvider = new FuzzyProvider(
    templateDir,
    context
  )

  templateProvider.init()

  context.subscriptions.push(
    languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      completionProvider
    ),
    // ===============================================================
    commands.registerCommand(FUZZY_COMMAND_NAME.showErrorMessage, async(errorMessage)=>{
      if(typeof errorMessage !== 'string') return
      vscode.window.showErrorMessage(errorMessage)
    }),
    commands.registerCommand(FUZZY_COMMAND_NAME.openProject, async(path)=>{
        if(typeof path !== 'string') return
        const uri = vscode.Uri.file(path)
        try {
          await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
        } catch (error: unknown) {
          vscode.window.showErrorMessage('Failed to open folder');
      }
    }),
    // �����������
    commands.registerCommand(FUZZY_COMMAND_NAME.testConsole, async () => {
      const template = templateProvider.readTemplate<ProjectData>('create_project',{description: 'make a game with python'})
      console.log(template)
    })
    ,
    // �����ǻ�ģ������
    commands.registerCommand(FUZZY_COMMAND_NAME.testSpark, () => {
        streamFromSpark()
    }),
    // ������Ŀ����
    commands.registerCommand(FUZZY_COMMAND_NAME.createProject,async () => {
      try {
        const desktopPath = path.join(os.homedir(), 'Desktop');

        const options = [
          {label: 'desktop', description: desktopPath},
          {label: 'others', description: 'f**k the desktop'}
        ]

        const selectedOption = await vscode.window.showQuickPick(options,{
          placeHolder: 'select the root path'
        })

        if(!selectedOption) return

        let filePath;

        if(selectedOption.label === 'desktop'){
          filePath = desktopPath
        }else{
          filePath = await vscode.window.showInputBox({
            prompt: 'file path',
            placeHolder: path.join(desktopPath, 'your_project_folder'),
            validateInput: (input) => input.trim() === '' ? 'the path should not be empty' : null
          });
        }
        if (!filePath) {
          return;
        }
        const fileDescription = await vscode.window.showInputBox({
          prompt: 'input description of the project',
          placeHolder: 'make a game with python',
          validateInput: (input) => input.trim() === '' ? 'description should not be empty' : null
        });
        if (!fileDescription) {
          return;
        }
        fuzzyProvider.onCreateProjectWithOllama({path: filePath, description: fileDescription})
      } catch (err) {
        vscode.commands.executeCommand(FUZZY_COMMAND_NAME.showErrorMessage,`an error happen when creating the project -${err}`)
      }
    }),
    commands.registerCommand(FUZZY_COMMAND_NAME.testCreateProject,async ()=>{
        generateProjectWithOllama()
    }),
    // ===============================================================
    commands.registerCommand(TWINNY_COMMAND_NAME.enable, () => {
      statusBarItem.show()
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.disable, () => {
      statusBarItem.hide()
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.explain, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
      delayExecution(() => sidebarProvider?.streamTemplateCompletion('explain'))
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.addTypes, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
      delayExecution(() =>
        sidebarProvider?.streamTemplateCompletion('add-types')
      )
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.refactor, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
      delayExecution(() =>
        sidebarProvider?.streamTemplateCompletion('refactor')
      )
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.generateDocs, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
      delayExecution(() =>
        sidebarProvider?.streamTemplateCompletion('generate-docs')
      )
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.addTests, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
      delayExecution(() =>
        sidebarProvider?.streamTemplateCompletion('add-tests')
      )
    }),
    commands.registerCommand(
      TWINNY_COMMAND_NAME.templateCompletion,
      (template: string) => {
        commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
        delayExecution(() =>
          sidebarProvider?.streamTemplateCompletion(template)
        )
      }
    ),
    commands.registerCommand(TWINNY_COMMAND_NAME.stopGeneration, () => {
      completionProvider.onError()
      sidebarProvider.destroyStream()
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.templates, async () => {
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(templateDir),
        true
      )
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.manageProviders, async () => {
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyManageProviders,
        true
      )
      sidebarProvider.webView?.postMessage({
        type: EVENT_NAME.twinnySetTab,
        value: {
          data: WEBUI_TABS.providers
        }
      } as ServerMessage<string>)
    }),
    commands.registerCommand(
      TWINNY_COMMAND_NAME.twinnySymmetryTab,
      async () => {
        commands.executeCommand(
          'setContext',
          EXTENSION_CONTEXT_NAME.twinnySymmetryTab,
          true
        )
        sidebarProvider.webView?.postMessage({
          type: EVENT_NAME.twinnySetTab,
          value: {
            data: WEBUI_TABS.symmetry
          }
        } as ServerMessage<string>)
      }
    ),
    commands.registerCommand(
      TWINNY_COMMAND_NAME.conversationHistory,
      async () => {
        commands.executeCommand(
          'setContext',
          EXTENSION_CONTEXT_NAME.twinnyConversationHistory,
          true
        )
        sidebarProvider.webView?.postMessage({
          type: EVENT_NAME.twinnySetTab,
          value: {
            data: WEBUI_TABS.history
          }
        } as ServerMessage<string>)
      }
    ),
    commands.registerCommand(TWINNY_COMMAND_NAME.review, async () => {
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyReviewTab,
        true
      )
      sidebarProvider.webView?.postMessage({
        type: EVENT_NAME.twinnySetTab,
        value: {
          data: WEBUI_TABS.review
        }
      } as ServerMessage<string>)
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.manageTemplates, async () => {
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyManageTemplates,
        true
      )
      sidebarProvider.webView?.postMessage({
        type: EVENT_NAME.twinnySetTab,
        value: {
          data: WEBUI_TABS.settings
        }
      } as ServerMessage<string>)
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.hideBackButton, () => {
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyManageTemplates,
        false
      )
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyConversationHistory,
        false
      )
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnySymmetryTab,
        false
      )
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyManageProviders,
        false
      )
      commands.executeCommand(
        'setContext',
        EXTENSION_CONTEXT_NAME.twinnyReviewTab,
        false
      )
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.openChat, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.hideBackButton)
      sidebarProvider.webView?.postMessage({
        type: EVENT_NAME.twinnySetTab,
        value: {
          data: WEBUI_TABS.chat
        }
      } as ServerMessage<string>)
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.settings, () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        EXTENSION_NAME
      )
    }),
    commands.registerCommand(
      TWINNY_COMMAND_NAME.sendTerminalText,
      async (commitMessage: string) => {
        const terminal = await getTerminal()
        terminal?.sendText(getSanitizedCommitMessage(commitMessage), false)
      }
    ),
    commands.registerCommand(TWINNY_COMMAND_NAME.getGitCommitMessage, () => {
      commands.executeCommand(TWINNY_COMMAND_NAME.focusSidebar)
      sidebarProvider.conversationHistory?.resetConversation()
      delayExecution(() => sidebarProvider.getGitCommitMessage(), 400)
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.newConversation, () => {
      sidebarProvider.conversationHistory?.resetConversation()
      sidebarProvider.newConversation()
      sidebarProvider.webView?.postMessage({
        type: EVENT_NAME.twinnyStopGeneration
      } as ServerMessage<string>)
    }),
    commands.registerCommand(TWINNY_COMMAND_NAME.openPanelChat, () => {
      commands.executeCommand('workbench.action.closeSidebar');
      fullScreenProvider.createOrShowPanel()
    }),
    workspace.onDidCloseTextDocument((document) => {
      const filePath = document.uri.fsPath
      fileInteractionCache.endSession()
      fileInteractionCache.delete(filePath)
    }),
    workspace.onDidOpenTextDocument((document) => {
      const filePath = document.uri.fsPath
      fileInteractionCache.startSession(filePath)
      fileInteractionCache.incrementVisits()
    }),
    workspace.onDidChangeTextDocument((e) => {
      const changes = e.contentChanges[0]
      if (!changes) return
      const lastCompletion = completionProvider.lastCompletionText
      const isLastCompltionMultiline = getLineBreakCount(lastCompletion) > 1
      completionProvider.setAcceptedLastCompletion(
        !!(
          changes.text &&
          lastCompletion &&
          changes.text === lastCompletion &&
          isLastCompltionMultiline
        )
      )
      const currentLine = changes.range.start.line
      const currentCharacter = changes.range.start.character
      fileInteractionCache.incrementStrokes(currentLine, currentCharacter)
    }),
    workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('twinny')) return
      completionProvider.updateConfig()
    }),
    window.registerWebviewViewProvider('twinny.sidebar', sidebarProvider),
    statusBarItem
  )

  window.onDidChangeTextEditorSelection(() => {
    completionProvider.abortCompletion()
    delayExecution(() => {
      completionProvider.setAcceptedLastCompletion(false)
    }, 200)
  })

  if (config.get('enabled')) statusBarItem.show()

  statusBarItem.text = '$(code)'
}
