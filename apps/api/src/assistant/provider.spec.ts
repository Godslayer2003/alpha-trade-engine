import { AssistantService } from './assistant.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiEngineClient } from '../ai-engine/ai-engine-client.service';
describe('OpenAI REST responses', () => {
  const service = new AssistantService({} as PrismaService, {} as AiEngineClient);
  const originalKey = process.env.OPENAI_API_KEY, originalModel = process.env.OPENAI_MODEL;
  let fetchMock: jest.SpyInstance;
  beforeEach(() => { process.env.OPENAI_API_KEY = 'disposable-fixture'; process.env.OPENAI_MODEL = 'fixture-model'; fetchMock = jest.spyOn(globalThis, 'fetch'); });
  afterEach(() => { fetchMock.mockRestore(); });
  afterAll(() => { if(originalKey===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=originalKey; if(originalModel===undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL=originalModel; });
  it('reads actual output message blocks, ignores reasoning and disables response storage', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ output: [{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text:'A simulated trade uses practice funds.'}]}],usage:{input_tokens:4,output_tokens:8} }), { status:200 }));
    const result=await service['chatWithOpenAI']('Explain trading',[], 'Guide', 'Practice app');
    expect(result.reply).toBe('A simulated trade uses practice funds.');
    expect(result.inputTokens).toBe(4);
    const [,options]=fetchMock.mock.calls[0]; expect(JSON.parse(options.body)).toMatchObject({store:false,max_output_tokens:1024});
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it('does not expose provider error text or grant a successful empty response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({error:{message:'private upstream diagnostic'}}),{status:429}));
    await expect(service['chatWithOpenAI']('Hi',[],'Guide','App')).rejects.toThrow('OpenAI AI Guide is temporarily unavailable');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({output:[]}),{status:200}));
    await expect(service['chatWithOpenAI']('Hi',[],'Guide','App')).rejects.toThrow('OpenAI AI Guide is temporarily unavailable');
  });
});
