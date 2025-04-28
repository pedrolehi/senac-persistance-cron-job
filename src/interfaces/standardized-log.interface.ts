export interface IStandardizedLog {
  conversation_id: string;
  user: {
    session_id: string;
    chapa?: string;
    emplid?: string;
  };
  context: Record<string, any>;
  input: string;
  intents: any[];
  entities: any[];
  output?: Record<string, any> | null;
  timestamp: string | Date;
}
