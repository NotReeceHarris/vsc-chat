import {Memento} from 'vscode';
import {authenticationResponse} from './interfaces';

const isLoggedIn = async (globalState: Memento) => {
	return await globalState.get(`user`) !== undefined;
};

const hasSessionToken = async (globalState: Memento) => {
	return (await getUser(globalState))!.sessionToken !== undefined;
};

const getUser = async (globalState: Memento) => {
	return await globalState.get(`user`) as authenticationResponse['user'];
};

const getSessionToken = async (globalState: Memento) => {
	return (await getUser(globalState))!.sessionToken;
};

export {
    isLoggedIn,
    hasSessionToken,
    getUser,
    getSessionToken
};