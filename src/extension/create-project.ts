import { FuzzyProjectTarget, ProjectData, RequestBodyBase, StreamRequestOptions } from '../common/types'
import { TwinnyProvider } from './provider-manager'
import { createBlockRequestBodyCreateProject } from './provider-options'
import { TemplateProvider } from './template-provider'
import * as vscode from 'vscode'
import {blockResponse} from './block'
import { ACTIVE_FIM_PROVIDER_STORAGE_KEY, FUZZY_COMMAND_NAME } from '../common/constants'
import path from 'path'
import fs from 'fs'

// �ṩ��Ŀ���ɹ���
export class FuzzyProvider{
  // ��������
  private _config = vscode.workspace.getConfiguration('twinny')
  private _keepAlive = this._config.get('keepAlive') as string | number
  private _numPredictChat = this._config.get('numPredictChat') as number
  private _temperature = this._config.get('temperature') as number

  // ģ���ṩ��
  private _templateProvider : TemplateProvider
  private _templateDir : string | undefined
  public _extensionContext: vscode.ExtensionContext

  // ��Ϣ
  private target: FuzzyProjectTarget | undefined

  constructor(
    templateDir: string,
    context: vscode.ExtensionContext
  ){
    this._extensionContext = context

    // ��ʼ��ģ�幤��
    this._templateDir = templateDir
    this._templateProvider = new TemplateProvider(templateDir)
  }

  private getProvider = () => {
    return this._extensionContext.globalState.get<TwinnyProvider>(
      ACTIVE_FIM_PROVIDER_STORAGE_KEY
    )
  }

  // �����ļ�
  public async onCreateProjectWithOllama(target: FuzzyProjectTarget){
    vscode.window.showInformationMessage(`begin to create Project to -${target.path}`)
    this.target = target
    const description = target.description
    // generateProjectWithOllama()
    const request = await this.buildBlockRequest(description)
    if(!request){
      console.log('Failed to bulid create project request')
      vscode.commands.executeCommand(FUZZY_COMMAND_NAME.showErrorMessage, 'Failed to build create project request')
      return
    }
    const {requestBody, requestOptions} = request
    // console.log(request)
    this.sendBlockResponse({requestBody, requestOptions})
  }

  // ��ȡ��Ŀ����ģ��
  public async loadTemplate(description: string){
    const template = await this._templateProvider.readTemplate<ProjectData>('create_project',{description: description})
    if(template) return template
    return
  }

  // ��������
  private async buildBlockRequest(description : string){
    const prompt = await this.loadTemplate(description)
    if(!prompt) return
    const provider = this.getProvider()
    if(!provider) return


    const requestOptions: StreamRequestOptions = {
      hostname: provider.apiHostname,
      port: Number(provider.apiPort),
      path: provider.apiPath,
      protocol: provider.apiProtocol,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`
      }
    }

    const requestBody = createBlockRequestBodyCreateProject(provider.provider,prompt,{
      model: provider.modelName,
      numPredictChat: this._numPredictChat,
      temperature: this._temperature,
      keepAlive: this._keepAlive
    })

    return {requestBody, requestOptions}
  }

  private sendBlockResponse({
    requestBody,
    requestOptions,
  }:{
    requestBody: RequestBodyBase
    requestOptions: StreamRequestOptions
  }){
    return blockResponse({
      body: requestBody,
      options: requestOptions,
      onComplete: (data: unknown) => this.onComplete(data),
      onStart: this.onStart,
      onError: this.onError
    })
  }

  // ��Ӧ��ɻص�������resposne�����ļ���
  private onComplete(data: unknown) {
    try {
      if (!this.target || !this.target.path) return;

      let rootPath = this.target.path; // ��Ŀ¼·��

      const typeData = data as { response: string };
      const jsonString = typeData.response.match(/<PROJECT>(.*?)<\/PROJECT>/s)?.[1].trim();  //  ��ȡjson
      if (!jsonString) throw new Error('Invalid project structure');
      console.log(jsonString)
      const projectData = JSON.parse(jsonString); // ���� JSON

      console.log(`Creating project in: ${rootPath}`);

      rootPath = rootPath + '\\' +projectData.project_name

      projectData.files.forEach((file: { path: string; content: string }) => {
        const filePath = path.join(rootPath, file.path);
        const dir = path.dirname(filePath);

        fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(filePath, file.content);
        console.log(`Created file: ${filePath}`);
      });

      const descriptionPath = path.join(rootPath, 'description.txt')
      const descriptionDir = path.dirname(descriptionPath)

      fs.mkdirSync(descriptionDir,{recursive: true})
      fs.writeFileSync(descriptionPath, projectData.description)

      console.log('Project created successfully!');
      vscode.commands.executeCommand(FUZZY_COMMAND_NAME.openProject,rootPath)
      .then(()=>{
        console.log('open project successfully')
      })
    } catch (error) {
      vscode.commands.executeCommand(FUZZY_COMMAND_NAME.showErrorMessage, error as string)
      console.error('Error occurred:', error);
    }
  }

  // ����ʼ�ص�
  private onStart(){
    console.log('begin create')
    return
  }

  // ���ִ���ص�
  private onError(){
    console.log('an error happened')
    return
  }
}
