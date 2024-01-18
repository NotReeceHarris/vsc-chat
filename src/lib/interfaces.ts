import {Memento, Uri, Webview} from 'vscode';

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

interface EjsData {
    globalState: Memento;
    githubClient: string;
    language: string;
    translation: Translation;
    appComponentPath: string;
    loginComponentPath: string;
    scriptUri: Uri;
    styleMain: Uri;
    styleVSCodeUri: Uri;
    webview: Webview;
    nonce: string;
}

interface Translation {
    [key: string]: string;
}

export {authenticationResponse, EjsData, Translation};