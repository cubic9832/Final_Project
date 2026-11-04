import client from '../../shared/api/client';

export async function sendChatMessage(message, signal) {
  const response = await client.post('/chat-messages', { message }, {
    timeout: 45000,
    signal,
  });
  return response.data.data;
}

export async function getChatHistory(signal, beforeId) {
  const response = await client.get('/chat-messages', { signal, params: { beforeId } });
  return response.data.data;
}

export async function sendChatGuide(guideId, signal, source = 'QUICK_QUESTION') {
  const response = await client.post('/chat-messages/guides', { guideId, source }, { signal });
  return response.data.data;
}

export async function clearChatHistory() {
  await client.delete('/chat-messages');
}

export async function rateChatAnswer(answerId, rating) {
  if (rating === null) await client.delete(`/chat-messages/${answerId}/feedback`);
  else await client.put(`/chat-messages/${answerId}/feedback`, { rating });
}

export async function getAdminChatbotExchanges(rating, page, signal, keyword = '', sort = '', direction = 'ASC', promptVersionId = null) {
  const response = await client.get('/admin/chatbot-exchanges', { params: { rating, page, keyword, sort, direction, promptVersionId }, signal });
  return response.data.data;
}

export async function getAdminChatbotMessages(conversationId, beforeId, signal) {
  const response = await client.get(`/admin/chatbot-conversations/${conversationId}/messages`, { params: { beforeId }, signal });
  return response.data.data;
}

export async function getAdminChatbotPrompts(signal) {
  const response = await client.get('/admin/chatbot-prompt-versions', { signal });
  return response.data.data;
}

export async function createAdminChatbotPrompt(prompt) {
  const response = await client.post('/admin/chatbot-prompt-versions', prompt);
  return response.data.data;
}

export async function activateAdminChatbotPrompt(promptVersionId) {
  const response = await client.put('/admin/chatbot-active-prompt', { promptVersionId });
  return response.data.data;
}
