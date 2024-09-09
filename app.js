const openaiApiKey = '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';

let conversationId = null;

function endConversation() {
    // Clear the chat messages
    document.getElementById('messages').innerHTML = '';

    // Log the conversation end
    console.log('Conversation ended.');

    // Optionally save the end of conversation in the database
    db.collection('conversations').add({
        userMessage: 'Conversation Ended',
        botReply: '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })
    .then(() => {
        console.log('Conversation end saved successfully!');
    })
    .catch((error) => {
        console.error('Error saving conversation end: ', error);
    });
}


document.getElementById('end-conversation-btn').addEventListener('click', () => {
    if (conversationId) {
        // Finalize conversation
        db.collection('conversations').doc(conversationId).update({
            endTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        }).then(() => {
            console.log('Conversation ended.');
            conversationId = null; // Reset conversation ID
        }).catch((error) => {
            console.error('Error ending conversation: ', error);
        });
    }
});

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;

    if (!userInput) {
        alert('Please enter a message');
        return;
    }

    document.getElementById('messages').innerHTML += `<p class="user-message">User: ${userInput}</p>`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: userInput }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            const botReply = data.choices[0].message.content;
            document.getElementById('messages').innerHTML += `<p class="bot-message">Bot: ${botReply}</p>`;
            saveConversation(userInput, botReply);
        } else {
            throw new Error('No bot reply found');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to get a response. Check console for details.');
    }

    document.getElementById('user-input').value = '';
}

function saveConversation(userMessage, botReply) {
    if (!conversationId) {
        // Start a new conversation
        db.collection('conversations').add({
            messages: [
                { role: 'user', content: userMessage },
                { role: 'assistant', content: botReply },
            ],
            startTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            endTimestamp: null,
        }).then((docRef) => {
            conversationId = docRef.id;
            console.log('Conversation started with ID: ', conversationId);
        }).catch((error) => {
            console.error('Error starting conversation: ', error);
        });
    } else {
        // Continue existing conversation
        db.collection('conversations').doc(conversationId).update({
            messages: firebase.firestore.FieldValue.arrayUnion({ role: 'user', content: userMessage }),
            messages: firebase.firestore.FieldValue.arrayUnion({ role: 'assistant', content: botReply }),
        }).catch((error) => {
            console.error('Error updating conversation: ', error);
        });
    }
}
