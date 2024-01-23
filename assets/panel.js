const escapeHtml = unsafe => unsafe.replace(/[&<"']/g, match => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#39;' }[match]));
let messagingUser;

const connectToServer = async () => {
    const ws = new WebSocket(webSocketUrl);

    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            if (ws.readyState === 1) {
                clearInterval(timer);
                resolve(ws);
            } else if (ws.readyState === 3) {
                clearInterval(timer);
                console.log(ws)
                reject(new Error('WebSocket failed to connect'));
            }
        }, 10);
    });
};

const sendMessage = (ws, type, message, to) => {
    const messageBody = { type, message, session, to };
    ws.send(JSON.stringify(messageBody));
};

const toggleVisibility = (elementId, className, action) => {
    document.getElementById(elementId).classList[action](className);
};

const clearSearchResults = () => {
    document.getElementById('search-user-results').innerHTML = '';
    toggleVisibility('search-user-results', 'hidden', 'add');
    toggleVisibility('search-user-label', 'hidden', 'add');
    toggleVisibility('search-button', 'hidden', 'remove');
    toggleVisibility('clear-search', 'hidden', 'add');
};

const handleSendMessage = (ws, evt) => {
    evt.preventDefault();

    if (messagingUser !== undefined) {
        const input = document.querySelector('#send');

        if (input.innerText.trim() !== '') {
            sendMessage(ws, 'message', input.innerText.trim(), messagingUser);
            input.innerText = '';
            document.getElementById('send-placeholder').classList.remove('hidden');
        }
    }
};

const handleSearchUser = (ws, evt) => {
    evt.preventDefault();
    const input = evt.target.querySelector('input');
    if (input.value.trim() !== '') {
        sendMessage(ws, 'search-user', input.value.trim());
        input.value = '';
        toggleVisibility('search-user-results', 'hidden', 'remove');
        toggleVisibility('search-user-label', 'hidden', 'remove');
        toggleVisibility('search-button', 'hidden', 'add');
        toggleVisibility('clear-search', 'hidden', 'remove');
    }
};

const handleClearSearch = (evt) => {
    evt.preventDefault();
    clearSearchResults();
};

const handleSearchUserInput = (evt) => {
    toggleVisibility('search-button', 'hidden', 'remove');
    toggleVisibility('clear-search', 'hidden', 'add');
};

const handleSendInput = function(e) {
    // Get the input value
    const inputValue = document.getElementById('send').innerText.trim();

    if (inputValue.length >= 1) {
        document.getElementById('send-placeholder').classList.add('hidden');
    } else {
        document.getElementById('send-placeholder').classList.remove('hidden');
    }

    if (inputValue.length >= 1000) {
        document.getElementById('send').innerText = inputValue.substring(0, 1000);
    }
};

const handleSendEnter = function(ws, event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        handleSendMessage(ws, event);
        event.preventDefault();
    };
};

function extractContentBetweenBackticks(inputString) {
    const regex = /```([\s\S]+?)```/g;
    const matches = inputString.match(regex);

    if (matches) {
        // Extract content between backticks from each match
        const result = matches.map(match => match.slice(3, -3));
        return result;
    } else {
        return [];
    }
}

async function connect () {

    let ws = await connectToServer().catch(async err => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        connect();
    });

    ws.send(JSON.stringify({ type: 'command', session, message: 'getconnections' }));

    document.getElementById('send').addEventListener('input', evt => handleSendInput(evt));
    document.getElementById('send').addEventListener('keydown', evt => handleSendEnter(ws, evt));
    document.getElementById('message').addEventListener('submit', evt => handleSendMessage(ws, evt));
    document.getElementById('search-user').addEventListener('submit', evt => handleSearchUser(ws, evt));
    document.getElementById('clear-search').addEventListener('click', evt => handleClearSearch(evt));
    document.getElementById('search-user-input').addEventListener('input', evt => handleSearchUserInput(evt));

    ws.onclose = async () => {
        console.log('WebSocket closed, reconnecting...');

        document.getElementById('send').removeEventListener('input', evt => handleSendInput(evt));
        document.getElementById('send').removeEventListener('keydown', evt => handleSendEnter(ws, evt));
        document.getElementById('message').removeEventListener('submit', evt => handleSendMessage(ws, evt));
        document.getElementById('search-user').removeEventListener('submit', evt => handleSearchUser(ws, evt));
        document.getElementById('clear-search').removeEventListener('click', evt => handleClearSearch(evt));
        document.getElementById('search-user-input').removeEventListener('input', evt => handleSearchUserInput(evt));

        await new Promise(resolve => setTimeout(resolve, 1000));
        connect();
    };

    ws.onerror = (error) => {
        console.log(`WebSocket error:`, error);
    };

    // Send ping every 30 seconds
    setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping', session }));
    }, 30000);

    ws.onmessage = (webSocketMessage) => {
        const messageBody = JSON.parse(webSocketMessage.data);
        
        if (messageBody.type === 'message') {

            if (messageBody.sender === messagingUser || messageBody.to === messagingUser) {
                const messagesContainer = document.getElementById('messages');

                var spanElement = document.createElement('span');
                spanElement.textContent = messageBody.message;
                let secureText = spanElement.outerHTML.replaceAll('```\n', '```');

                extractContentBetweenBackticks(secureText).forEach((code) => {
                    const highlightedCode = hljs.highlightAuto(code).value;
                    secureText = secureText.replace('```' + code + '```', '<code class="p-2 rounded-sm w-full block text-nowrap overflow-x-auto">' + highlightedCode + '</code>');
                });

                let formattedText = secureText.replace(/\n/g, '<br>');

                messagesContainer.innerHTML += `
                <div class="flex flex-col gap-3 pl-3 pt-4">
                    <div class="flex gap-2 place-items-center">
                        <img class="w-6 h-6 rounded-full" src="https://avatars.githubusercontent.com/u/${messageBody.sender}?v=4">
                        <span>${messageBody.senderUsername}</span>
                    </div>
                    <div class="break-words font-light opacity-80">
                        ${formattedText}
                    </div>
                </div>
                `;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            return;

        }

        if (messageBody.type === 'connections') {
            const connections = messageBody.connections;

            document.getElementById('connections').innerHTML = '';

            for (let i = 0; i < connections.length; i++) {
                const connection = connections[i];

                // bg-green-400
                // bg-red-400

                const connectionsContainer = document.getElementById('connections');
                const connectionDiv = document.createElement('div');

                connectionDiv.setAttribute('title', `${connection.username} | ${connection.online ? translation['state-online'] : translation['state-offline']}`);
                connectionDiv.classList.add('cursor-pointer', 'relative');

                const imgElement = document.createElement('img');
                imgElement.classList.add('w-7', 'h-7', 'rounded-full');
                imgElement.src = `https://avatars.githubusercontent.com/u/${connection.id}?v=4`;

                const statusDiv = document.createElement('div');
                statusDiv.classList.add('bg-' + (connection.online ? 'green-400' : 'red-400'), 'border-4', 'border-bg', 'w-4', 'h-4', 'rounded-full', 'absolute', 'bottom-[-4px]', 'right-[-4px]', 'border-sidebar');


                connectionDiv.appendChild(imgElement);
                connectionDiv.appendChild(statusDiv);

                connectionDiv.onclick = () => {

                    document.getElementById('messages').innerHTML = '';
                    document.getElementById('send-placeholder').innerText = `${translation['send-message-placeholder']} @${connection.username}`;

                    messagingUser = connection.id;

                    if (document.getElementById('send').attributes.getNamedItem('disabled') !== null) {
                        document.getElementById('send').attributes.removeNamedItem('disabled');
                    }
                };

                connectionsContainer.appendChild(connectionDiv);
            }

            if (connections.length !== 0) {
                document.getElementById('connections').classList.remove('hidden');
                document.getElementById('connections').classList.add('flex');
                document.getElementById('connections-label').classList.remove('hidden');
                document.getElementById('connections-label').classList.add('flex');
            }

            return;

        }

        if (messageBody.type === 'search-user') {
            const users = messageBody.users;

            document.getElementById('search-user-results').innerHTML = '';

            if (users.length === 0) {
                const searchsContainer = document.getElementById('search-user-results');
                const searchDiv = document.createElement('div');
                searchDiv.classList.add('text-center', 'w-full', 'opacity-60');
                searchDiv.innerText = translation['no-users-found'] + ' :(';
                searchsContainer.appendChild(searchDiv);
            }

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                const searchsContainer = document.getElementById('search-user-results');
                const searchDiv = document.createElement('div');

                const sanitizedUsername = escapeHtml(user.username);

                searchDiv.setAttribute('title', `${sanitizedUsername}`);
                searchDiv.classList.add('cursor-pointer', 'relative');

                const imgElement = document.createElement('img');
                imgElement.classList.add('w-7', 'h-7', 'rounded-full');
                imgElement.src = `https://avatars.githubusercontent.com/u/${user.id}?v=4`;

                searchDiv.appendChild(imgElement);

                searchDiv.onclick = () => {

                    document.getElementById('messages').innerHTML = '';
                    document.getElementById('send-placeholder').innerText = `${translation['send-message-placeholder']} @${user.username}`;
                    messagingUser = user.id;

                    if (document.getElementById('send').attributes.getNamedItem('disabled') !== null) {
                        document.getElementById('send').attributes.removeNamedItem('disabled');
                    }

                    clearSearchResults();
                };

                searchsContainer.appendChild(searchDiv);

            }

            document.getElementById('search-user-results').classList.remove('hidden');
            document.getElementById('search-user-results').classList.add('flex');
            document.getElementById('search-user-label').classList.remove('hidden');
            document.getElementById('search-user-label').classList.add('flex');

            return;

        }

    };

}

document.addEventListener('DOMContentLoaded', () => {
    connect();
});