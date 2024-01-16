import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    constructor(private readonly _extensionUri: vscode.Uri, private readonly githubClient:string, private readonly globalState:vscode.Memento) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "onInfo": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onError": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });

    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {

        const styleVSCodeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
        );

        const styleMain = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "media", "style.min.css")
        );

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "scripts", "sidebar.js")
        );

        const nonce = getNonce();

        const loginHtml = `
        <div class="w-full h-full flex items-center place-content-center">
            <a href="https://github.com/login/oauth/authorize?client_id=${this.githubClient}" class="drop-shadow-lg w-full h-fit max-w-[240px] flex gap-3 tet-sm place-items-center p-4 bg-black !text-white hover:bg-black/[0.8] text-center justify-center rounded-md">
                <svg class="w-6 h-6" width="98" height="96" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#fff"/></svg>    
                Sign in with Github
            </a>
        </div>
        `

        const loggedInHtml = `
        <div>
            <div>
                ${this.globalState.get('githubCode')} test
            </div>
        </div>
        `

        return `
            <!DOCTYPE html>
			<html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <link nonce="${nonce}" href="${styleVSCodeUri}" rel="stylesheet">
                    <link nonce="${nonce}" href="${styleMain}" rel="stylesheet">
                    <script nonce="${nonce}" src="${scriptUri}"></script>

                    <script nonce="${nonce}">
                        const tsvscode = acquireVsCodeApi();
                    </script>

                </head>

                <body class="h-[90vh] min-width-[240px] p-3">

                    ${this.globalState.get('githubCode') == undefined ? loginHtml : loggedInHtml}

                </body>

			</html>
        `;
    }
}

function getNonce(): string {
    const possible:string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length:number = 32;

    return Array.from({ length }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
}