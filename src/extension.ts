import * as vscode from 'vscode';
import { panelProvider } from './panel';

const githubClient:string = '912edb61a73a1b6553dc';
const serverUrl:string = 'http://localhost:3000';
const webSocketUrl:string = 'ws://localhost:7071';

interface authenticationResponse {
    success: boolean
	error?: string
	user? : {
		id: number
		name: string
		username: string
		token: string
		pfp: string
		sessionToken: string
	}
	websocket?: string
}

export async function activate(context: vscode.ExtensionContext) {

	if (await context.globalState.get(`user`) !== undefined) {

		const user = await context.globalState.get(`user`) as authenticationResponse['user'];

		const response = await fetch(`${serverUrl}/authenticate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				session: user?.sessionToken || 'notoken'
			})
		});

		const authJson = await response.json() as authenticationResponse;

		console.log(authJson)

		if (authJson.success === false) {

			await context.globalState.update(`user`, undefined);
			await context.globalState.update(`websocket`, undefined);
			vscode.window.showErrorMessage(authJson?.error || 'Unknown error occured');

		} else {

			await context.globalState.update(`user`, authJson.user);
			await context.globalState.update(`websocket`, authJson.websocket === undefined ? webSocketUrl : authJson.websocket);
			vscode.window.showInformationMessage(`Welcome ${authJson.user?.name}, you are now logged in as ${authJson.user?.username}`);
		
		}
		
	}

	const panel = new panelProvider(context.extensionUri, githubClient, context.globalState);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"vsc-chat.panel",
			panel,
		)
	);

	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri: async (uri: vscode.Uri) => {		
				const queryParams = new URLSearchParams(uri.query);
				if (queryParams.has('code')) {
					
					const response = await fetch(`${serverUrl}/authenticate`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							code: queryParams.get('code')
						})
					});

					const authJson = await response.json() as authenticationResponse;

					if (authJson.success === false) {
						vscode.window.showErrorMessage(authJson?.error || 'Unknown error occured');
						return;
					}

					await context.globalState.update(`user`, authJson.user);
					await context.globalState.update(`websocket`, authJson.websocket === undefined ? webSocketUrl : authJson.websocket);
					
					vscode.window.showInformationMessage(`Welcome ${authJson.user?.name}, you are now logged in as ${authJson.user?.username}`);
					panel.reloadWebview();
				}
			}
		})
	);

	vscode.commands.registerCommand('vsc-chat.logout', async () => {
		await context.globalState.update(`user`, undefined);
		await context.globalState.update(`websocket`, undefined);
		panel.reloadWebview();
	});

}

export function deactivate() {}
