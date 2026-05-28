// ChatRole 是发送给大模型的消息角色。
// system 用来告诉模型“你应该怎么回答”，user 是用户问题，assistant 是模型历史回复。
export type ChatRole = "system" | "user" | "assistant";

export type ChatProviderMessage = {
  role: ChatRole;
  content: string;
};

// Provider 接口是一层“适配规范”：不管底层接 OpenAI、DeepSeek 还是通义千问，
// 对 /api/chat 来说，只要能调用 generate(messages) 拿到字符串回答就可以。
// 这样后续换模型供应商时，主要改 Provider 实现，不需要重写聊天接口和前端页面。
export interface ChatModelProvider {
  generate(messages: ChatProviderMessage[]): Promise<string>;
}
