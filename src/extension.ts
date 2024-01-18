import * as vscode from 'vscode';
import { panelProvider } from './providers/panel';
import {authenticationResponse} from './lib/interfaces';
import {isLoggedIn, hasSessionToken, getSessionToken} from './lib/misc';

const GITHUB_CLIENT:string = '912edb61a73a1b6553dc';
const SERVER_URL:string = 'https://octopus-app-wbtyc.ondigitalocean.app';
const WEBSOCKET_URL:string = 'wss://octopus-app-wbtyc.ondigitalocean.app';

/* const GITHUB_CLIENT:string = '912edb61a73a1b6553dc';
const SERVER_URL:string = 'http://localhost';
const WEBSOCKET_URL:string = 'ws://localhost'; */

const USER_KEY:string = 'user';
const WEBSOCKET_KEY:string = 'websocket';
const PANEL_ID:string = 'vsc-chat.panel';
const LOGOUT_COMMAND:string = 'vsc-chat.logout';

async function authenticate(codeOrSession: string, isSession: boolean): Promise<authenticationResponse> {
    const response = await fetch(`${SERVER_URL}/authenticate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(isSession ? {session: codeOrSession} : {code: codeOrSession})
    });

    return await response.json() as authenticationResponse;
}

async function handleAuthenticationResponse(globalState: vscode.Memento, authJson: authenticationResponse) {
    if (authJson.success === false) {
        await clearSession(globalState);
        vscode.window.showErrorMessage(authJson?.error || 'Unknown error occured');
    } else {
        console.log('Received WebSocket URL: ', authJson.websocket);
        const websocket = authJson.websocket === undefined ? WEBSOCKET_URL : authJson.websocket;
        await globalState.update(USER_KEY, authJson.user);
        await globalState.update(WEBSOCKET_KEY, websocket);
        vscode.window.showInformationMessage(`Welcome ${authJson.user?.name}, you are now logged in as ${authJson.user?.username}`);
    }
}

async function clearSession(globalState: vscode.Memento) {
	await globalState.update(USER_KEY, undefined);
	await globalState.update(WEBSOCKET_KEY, undefined);
}

export async function activate(context: vscode.ExtensionContext) {

	if (await isLoggedIn(context.globalState) && await hasSessionToken(context.globalState)) {
        const session = await getSessionToken(context.globalState);
        const authJson = await authenticate(session, true);
        await handleAuthenticationResponse(context.globalState, authJson);
    }

    const panel = new panelProvider(context.extensionUri, GITHUB_CLIENT, context.globalState);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            PANEL_ID,
            panel,
        )
    );

    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {        
                const queryParams = new URLSearchParams(uri.query);
                if (queryParams.has('code')) {
                    const code = queryParams.get('code');
                    const authJson = await authenticate(code!, false);
                    await handleAuthenticationResponse(context.globalState, authJson);
                    panel.reloadWebview();
                } else {
                    vscode.window.showErrorMessage('No auth code provided');
                }
            }
        })
    );

	vscode.commands.registerCommand(LOGOUT_COMMAND, async () => {
		await clearSession(context.globalState);
		panel.reloadWebview();
	});
}

export async function deactivate(context: vscode.ExtensionContext) {
	await clearSession(context.globalState);
}