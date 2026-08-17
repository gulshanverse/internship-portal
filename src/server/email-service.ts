export type EmailTemplate='APPLICATION_CONFIRMATION'|'ASSESSMENT_AVAILABLE'|'APPLICATION_STATUS'|'SELECTION'|'MENTOR_ASSIGNMENT'|'PROJECT_ASSIGNMENT'|'DEADLINE_REMINDER'|'FEEDBACK'|'COMPLETION'|'DOCUMENT_AVAILABLE';
export type EmailMessage={to:string;template:EmailTemplate;variables:Record<string,string>};
export interface EmailProvider{send(message:EmailMessage):Promise<{delivered:boolean;providerMessageId?:string}>}
export class DisabledEmailProvider implements EmailProvider{async send(_message:EmailMessage){return {delivered:false};}}
export function getEmailProvider():EmailProvider{return process.env.EMAIL_PROVIDER_API_KEY?new DisabledEmailProvider():new DisabledEmailProvider();}
