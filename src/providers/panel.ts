import * as vscode from "vscode";
import crypto from 'crypto';
import ejs from 'ejs';
import fs from 'fs';

import {EjsData, Translation} from '../lib/interfaces';

const ASSETS_PATH = "assets";
const COMPONENTS_PATH = "components";
const TRANSLATIONS_PATH = "translations.json";

enum MessageType {
    OnInfo = "onInfo",
    OnError = "onError"
}

export class panelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    private _styleVSCodeUri?:vscode.Uri;
    private _styleMain?:vscode.Uri;
    private _scriptUri?:vscode.Uri;

    private _appComponentPath?:string;
    private _loginComponentPath?:string;

    private _mainComponent?:string;

    private _language: string = vscode.env.language;
    private _translation?: Translation;

    constructor(private readonly _extensionUri: vscode.Uri, private readonly githubClient: string, private readonly globalState: vscode.Memento) { 
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.reloadWebview();
            }
        }, null, []);
    }

    private _initializePaths(webviewView: vscode.WebviewView) {
        this._styleVSCodeUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ASSETS_PATH, "vscode.css"));
        this._styleMain = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ASSETS_PATH, "style.min.css"));
        this._scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ASSETS_PATH, "panel.js"));
    }

    private _initializeComponents() {
        this._appComponentPath = vscode.Uri.joinPath(this._extensionUri, COMPONENTS_PATH, "app.ejs").fsPath;
        this._loginComponentPath = vscode.Uri.joinPath(this._extensionUri, COMPONENTS_PATH, "login.ejs").fsPath;
        this._mainComponent = fs.readFileSync(vscode.Uri.joinPath(this._extensionUri, COMPONENTS_PATH, "main.ejs").fsPath, "utf-8");
    }

    private _initializeTranslations() {
        const translations = require(vscode.Uri.joinPath(this._extensionUri, TRANSLATIONS_PATH).fsPath);
        this._translation = translations[this._language] || translations['en'];
    }

    private _setWebviewOptions(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
    }

    private _setWebviewMessageHandler(webviewView: vscode.WebviewView) {
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case MessageType.OnInfo: {
                    if (!data.value) { return; }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case MessageType.OnError: {
                    if (!data.value) { return; }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }

    private _generateWebviewContent(webview: vscode.Webview) {
        const nonce:string = crypto.randomBytes(64).toString('hex');

        if (!this._mainComponent) {
            throw new Error("Main component is not initialized");
        }

        const data: EjsData = {
            globalState: this.globalState,
            githubClient: this.githubClient,

            language: this._language,  
            translation: this._translation!, 

            appComponentPath: this._appComponentPath!,
            loginComponentPath: this._loginComponentPath!,

            scriptUri: this._scriptUri!,
            styleMain: this._styleMain!,
            styleVSCodeUri: this._styleVSCodeUri!,

            webview,
            nonce
        };

        try {
            return ejs.render(this._mainComponent, data);
        } catch (error) {
            console.error("Failed to render the main component", error);
            return "";
        }
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        this._initializePaths(webviewView);
        this._initializeComponents();
        this._initializeTranslations();

        webviewView.webview.html = this._generateWebviewContent(webviewView.webview);

        this._setWebviewOptions(webviewView);
        this._setWebviewMessageHandler(webviewView);
    }

    public reloadWebview() {
        if (this._view) {
            this.resolveWebviewView(this._view);
        }
    }
}